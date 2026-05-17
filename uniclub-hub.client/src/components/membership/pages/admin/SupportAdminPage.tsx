import { useEffect, useState } from 'react'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LifeBuoy, Clock, Loader2, CheckCircle2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Open:       { label: 'Đang chờ',     bg: '#fef3c7', text: '#b45309', icon: Clock },
  InProgress: { label: 'Đang xử lý',  bg: '#dbeafe', text: '#1d4ed8', icon: Loader2 },
  Resolved:   { label: 'Đã giải quyết', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
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

  function load() {
    setLoading(true)
    api.get<{ data: Ticket[] }>(`/support${statusFilter ? `?status=${statusFilter}` : ''}`)
      .then(r => setTickets(r.data.data))
      .catch(() => toast.error('Không thể tải danh sách yêu cầu.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

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
    return !q || t.subject.toLowerCase().includes(q) || t.userFullName.toLowerCase().includes(q) || t.userEmail.toLowerCase().includes(q)
  })

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="px-6 pb-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Yêu cầu hỗ trợ</h1>
        <p className="text-sm text-gray-400 mt-0.5">{tickets.length} yêu cầu tổng cộng</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
            {tab.value && counts[tab.value] ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{counts[tab.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Tìm theo tiêu đề, tên, email..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={14} />
          </button>
        )}
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length}/{tickets.length}</span>
      </div>

      {/* Ticket list */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Đang tải...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <LifeBuoy size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Không có yêu cầu hỗ trợ nào.</p>
          </div>
        ) : filtered.map(t => {
          const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Open
          const Icon = cfg.icon
          return (
            <button key={t.id} onClick={() => openTicket(t)}
              className="w-full bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 hover:border-indigo-200 transition-all">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                style={{ background: cfg.bg, color: cfg.text }}>
                <Icon size={11} />
                {cfg.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{t.userFullName} · {t.userEmail}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">
                {new Date(t.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </button>
          )
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy size={17} className="text-indigo-500" />
              {selected?.subject}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-1">
              {/* Info */}
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: STATUS_CONFIG[selected.status]?.bg, color: STATUS_CONFIG[selected.status]?.text }}>
                  {STATUS_CONFIG[selected.status]?.label}
                </span>
                <span>{selected.userFullName} · {selected.userEmail}</span>
              </div>

              {/* Message */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Nội dung yêu cầu</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Admin note */}
              <div className="space-y-1.5">
                <Label>Ghi chú phản hồi</Label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Nhập phản hồi cho người dùng (tuỳ chọn)..."
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {selected.status !== 'InProgress' && selected.status !== 'Resolved' && (
                  <Button variant="outline" onClick={() => handleUpdate('InProgress')} disabled={saving}
                    className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Loader2 size={13} /> Đang xử lý
                  </Button>
                )}
                {selected.status !== 'Resolved' && (
                  <Button onClick={() => handleUpdate('Resolved')} disabled={saving}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 size={13} /> {saving ? 'Đang lưu...' : 'Đánh dấu đã giải quyết'}
                  </Button>
                )}
                {selected.status === 'Resolved' && (
                  <Button variant="outline" onClick={() => handleUpdate('Open')} disabled={saving}>
                    Mở lại
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
