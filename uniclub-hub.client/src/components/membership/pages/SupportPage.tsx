import { useEffect, useState } from 'react'
import { getSupportTickets, submitSupportRequest } from '@/components/membership/services/userApi'
import type { SupportTicket } from '@/components/membership/services/userApi'
import { toast } from 'sonner'
import { Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Open:       { label: 'Đang chờ',      bg: '#fef3c7', text: '#b45309', icon: Clock },
  InProgress: { label: 'Đang xử lý',   bg: '#dbeafe', text: '#1d4ed8', icon: Loader2 },
  Resolved:   { label: 'Đã giải quyết', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
}

const inputS: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: D.borderLight, padding: '0 12px',
  fontSize: 13, color: D.ink, outline: 'none', background: D.bg,
  fontFamily: 'inherit', boxSizing: 'border-box', height: 36,
}
const labelS: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4 }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  function load() {
    getSupportTickets()
      .then(setTickets)
      .catch(() => toast.error('Không thể tải danh sách yêu cầu.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) { toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung.'); return }
    setSending(true)
    try {
      await submitSupportRequest(subject.trim(), message.trim())
      toast.success('Đã gửi yêu cầu hỗ trợ.')
      setSubject(''); setMessage('')
      load()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gửi thất bại.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mgmt-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Yêu cầu hỗ trợ</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Gửi yêu cầu tới quản trị viên khi cần hỗ trợ</p>
      </div>

      {/* Form */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '12px 18px', borderBottom: D.borderLight, background: D.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>◉</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>Gửi yêu cầu mới</span>
        </div>
        <form onSubmit={handleSend} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelS}>Tiêu đề <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Mô tả ngắn gọn vấn đề..." disabled={sending} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Nội dung <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Mô tả chi tiết vấn đề bạn gặp phải..." disabled={sending}
              style={{ ...inputS, height: 'auto', padding: '10px 12px', resize: 'none', opacity: sending ? 0.6 : 1 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={sending} style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2, 2), padding: '8px 18px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {sending ? '⟳ Đang gửi...' : '→ Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>

      {/* Ticket list */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: D.inkDim, marginBottom: 12 }}>Lịch sử yêu cầu ({tickets.length})</p>
        {loading ? (
          <div style={{ background: D.card, border: D.border, borderRadius: D.radius, padding: '32px', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
        ) : tickets.length === 0 ? (
          <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '40px 20px', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
            Bạn chưa gửi yêu cầu hỗ trợ nào.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map(t => {
              const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Open
              const Icon = cfg.icon
              const isOpen = expanded === t.id
              return (
                <div key={t.id} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(isOpen ? null : t.id)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: D.pill, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.text, flexShrink: 0 }}>
                      <Icon size={10} />{cfg.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                      <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>{fmtDate(t.createdAt)}</p>
                    </div>
                    <span style={{ color: D.inkMuted, fontSize: 12, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: D.borderLight, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Nội dung</p>
                        <p style={{ fontSize: 13, color: D.inkDim, whiteSpace: 'pre-wrap', margin: 0 }}>{t.message}</p>
                      </div>
                      {t.adminNote && (
                        <div style={{ background: '#eef2ff', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: D.indigo, marginBottom: 4 }}>Phản hồi từ quản trị viên</p>
                          <p style={{ fontSize: 13, color: '#3730a3', whiteSpace: 'pre-wrap', margin: 0 }}>{t.adminNote}</p>
                        </div>
                      )}
                      {t.resolvedAt && <p style={{ fontSize: 11, color: D.inkMuted }}>Giải quyết lúc {fmtDate(t.resolvedAt)}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
