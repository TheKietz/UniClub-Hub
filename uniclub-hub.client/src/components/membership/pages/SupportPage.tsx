import { useEffect, useState } from 'react'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LifeBuoy, Send, Clock, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Ticket {
  id: number
  subject: string
  message: string
  status: string
  adminNote?: string
  createdAt: string
  resolvedAt?: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Open:       { label: 'Đang chờ',    bg: '#fef3c7', text: '#b45309', icon: Clock },
  InProgress: { label: 'Đang xử lý', bg: '#dbeafe', text: '#1d4ed8', icon: Loader2 },
  Resolved:   { label: 'Đã giải quyết', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  function load() {
    api.get<{ data: Ticket[] }>('/support/me')
      .then(r => setTickets(r.data.data))
      .catch(() => toast.error('Không thể tải danh sách yêu cầu.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung.')
      return
    }
    setSending(true)
    try {
      await api.post('/support', { subject: subject.trim(), message: message.trim() })
      toast.success('Đã gửi yêu cầu hỗ trợ. Quản trị viên sẽ phản hồi sớm.')
      setSubject('')
      setMessage('')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gửi thất bại.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="px-6 pb-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Yêu cầu hỗ trợ</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gửi yêu cầu tới quản trị viên khi cần hỗ trợ</p>
      </div>

      {/* Form gửi ticket */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <LifeBuoy size={15} className="text-indigo-500" />
          <p className="text-sm font-semibold text-gray-900">Gửi yêu cầu mới</p>
        </div>
        <form onSubmit={handleSend} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Mô tả ngắn gọn vấn đề của bạn..."
              disabled={sending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nội dung <span className="text-red-500">*</span></Label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
              disabled={sending}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={sending} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
          </div>
        </form>
      </div>

      {/* Lịch sử ticket */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Lịch sử yêu cầu ({tickets.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Đang tải...</p>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <LifeBuoy size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Bạn chưa gửi yêu cầu hỗ trợ nào.</p>
          </div>
        ) : tickets.map(t => {
          const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Open
          const Icon = cfg.icon
          const isOpen = expanded === t.id
          return (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : t.id)}
                className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ background: cfg.bg, color: cfg.text }}>
                  <Icon size={11} />
                  {cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(t.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Nội dung</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.message}</p>
                  </div>
                  {t.adminNote && (
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-indigo-600 mb-1">Phản hồi từ quản trị viên</p>
                      <p className="text-sm text-indigo-900 whitespace-pre-wrap">{t.adminNote}</p>
                    </div>
                  )}
                  {t.resolvedAt && (
                    <p className="text-xs text-gray-400">
                      Giải quyết lúc {new Date(t.resolvedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
