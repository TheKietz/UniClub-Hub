import { useEffect, useState } from 'react'
import api from '@/lib/axiosInstance'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  lemon: '#facc15',
  indigo: '#4f46e5',
  emerald: '#10b981',
  sky: '#38bdf8',
  red: '#ef4444',
}

interface Ticket {
  id: number
  subject: string
  message: string
  status: string
  adminNote?: string
  createdAt: string
  resolvedAt?: string
  userId: string
  userFullName: string
  userEmail: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  Open:       { label: 'Đang chờ',      bg: '#fef3c7', text: '#b45309' },
  InProgress: { label: 'Đang xử lý',   bg: '#dbeafe', text: '#1d4ed8' },
  Resolved:   { label: 'Đã giải quyết', bg: '#d1fae5', text: '#065f46' },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'Open', label: 'Đang chờ' },
  { value: 'InProgress', label: 'Đang xử lý' },
  { value: 'Resolved', label: 'Đã giải quyết' },
]

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [hoverTicket, setHoverTicket] = useState<number | null>(null)

  function load() {
    setLoading(true)
    api.get<{ data: Ticket[] }>('/support')
      .then(r => setTickets(r.data.data))
      .catch(() => toast.error('Không thể tải danh sách yêu cầu.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleUpdate(newStatus: string) {
    if (!selected) return
    setSaving(true)
    try {
      await api.patch(`/support/${selected.id}`, { status: newStatus, adminNote: adminNote || null })
      toast.success('Đã cập nhật trạng thái.')
      setSelected(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  function openTicket(t: Ticket) {
    setSelected(t)
    setAdminNote(t.adminNote ?? '')
  }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    const matchStatus = !statusFilter || t.status === statusFilter
    const matchSearch = !q || t.subject.toLowerCase().includes(q) || t.userFullName.toLowerCase().includes(q) || t.userEmail.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Yêu cầu hỗ trợ</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{tickets.length} yêu cầu tổng cộng</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {STATUS_TABS.map(tab => {
          const active = statusFilter === tab.value
          const c = tab.value ? (counts[tab.value] ?? 0) : tickets.length
          return (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '7px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 700,
                border: D.border, cursor: 'pointer', fontFamily: 'inherit',
                background: active ? D.ink : D.card,
                color: active ? D.lemon : D.ink,
                boxShadow: active ? 'none' : D.shadow(2, 2),
                transform: active ? 'translate(2px,2px)' : 'none',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .12s',
              }}>
              {tab.label}
              {c > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: D.pill, fontWeight: 800,
                  background: active ? 'rgba(255,255,255,.2)' : D.bg,
                  color: active ? D.lemon : D.inkMuted,
                }}>{c}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="⌕  Tìm theo tiêu đề, tên, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, height: 36, borderRadius: 8, border: D.borderLight, padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none', background: D.bg, fontFamily: 'inherit' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ padding: '4px 8px', borderRadius: 6, border: D.borderLight, background: D.card, color: D.inkMuted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            ✕
          </button>
        )}
        <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{filtered.length}/{tickets.length}</span>
      </div>

      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0', fontSize: 13 }}>Đang tải...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: '48px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎫</p>
            <p style={{ fontSize: 13, color: D.inkMuted }}>Không có yêu cầu hỗ trợ nào.</p>
          </div>
        ) : filtered.map(t => {
          const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Open
          const isHover = hoverTicket === t.id
          return (
            <button key={t.id} onClick={() => openTicket(t)}
              onMouseEnter={() => setHoverTicket(t.id)}
              onMouseLeave={() => setHoverTicket(null)}
              style={{
                width: '100%', background: isHover ? D.bg : D.card,
                borderRadius: D.radius, border: isHover ? D.border : D.border,
                boxShadow: isHover ? D.shadow() : D.shadow(2,2),
                padding: '14px 18px', display: 'flex', alignItems: 'center',
                gap: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'box-shadow .1s',
              }}>
              <span style={{
                display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10,
                fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                background: cfg.bg, color: cfg.text, flexShrink: 0,
              }}>
                {cfg.label}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                <p style={{ fontSize: 11, color: D.inkMuted, margin: 0, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.userFullName} · {t.userEmail}</p>
              </div>
              <p style={{ fontSize: 11, color: D.inkMuted, flexShrink: 0 }}>
                {new Date(t.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </button>
          )
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 16 }}>
              🎫 {selected?.subject}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10,
                  fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                  background: STATUS_CONFIG[selected.status]?.bg, color: STATUS_CONFIG[selected.status]?.text,
                }}>
                  {STATUS_CONFIG[selected.status]?.label}
                </span>
                <span style={{ fontSize: 12, color: D.inkDim }}>{selected.userFullName} · {selected.userEmail}</span>
              </div>

              <div style={{ background: D.bg, borderRadius: 10, padding: '12px 16px', border: D.borderLight }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Nội dung yêu cầu</p>
                <p style={{ fontSize: 13, color: D.inkDim, whiteSpace: 'pre-wrap', margin: 0 }}>{selected.message}</p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4 }}>Ghi chú phản hồi</label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Nhập phản hồi cho người dùng (tuỳ chọn)..."
                  style={{ width: '100%', border: D.borderLight, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: D.ink, background: D.bg, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {selected.status !== 'InProgress' && selected.status !== 'Resolved' && (
                  <button onClick={() => handleUpdate('InProgress')} disabled={saving}
                    style={{ background: D.card, color: '#1d4ed8', border: '1.5px solid #bfdbfe', boxShadow: D.shadow(2,2), padding: '7px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                    ⟳ Đang xử lý
                  </button>
                )}
                {selected.status !== 'Resolved' && (
                  <button onClick={() => handleUpdate('Resolved')} disabled={saving}
                    style={{ background: D.emerald, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '7px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                    ✓ {saving ? 'Đang lưu...' : 'Đã giải quyết'}
                  </button>
                )}
                {selected.status === 'Resolved' && (
                  <button onClick={() => handleUpdate('Open')} disabled={saving}
                    style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '7px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    Mở lại
                  </button>
                )}
              </div>
            </div>
          )}

          <DialogFooter style={{ paddingTop: 8 }}>
            <button onClick={() => setSelected(null)}
              style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
