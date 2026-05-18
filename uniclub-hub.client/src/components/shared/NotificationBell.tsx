import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import api from '@/lib/axiosInstance'

interface Notif {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = items.filter(n => !n.isRead).length

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get('/notifications?pageSize=15')
      .then(res => setItems(res.data.data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  async function markAllRead() {
    await api.patch('/notifications/read-all').catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  async function markRead(id: number) {
    await api.patch(`/notifications/${id}/read`).catch(() => {})
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5"
            style={{ background: '#ef4444' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm" style={{ color: '#111827' }}>Thông báo</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: '#4f46e5' }}
              >
                <CheckCheck size={13} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-sm py-10" style={{ color: '#9ca3af' }}>
                Không có thông báo nào
              </p>
            ) : items.map(n => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`px-4 py-3 border-b border-gray-50 transition-colors cursor-pointer hover:bg-gray-50 ${!n.isRead ? 'bg-indigo-50/50' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold' : 'font-medium'}`} style={{ color: '#111827' }}>
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#6b7280' }}>{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#4f46e5' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
