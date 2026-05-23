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
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dropPos, setDropPos] = useState({ bottom: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function fetchCount() {
      api.get('/notifications/unread-count')
        .then(res => setUnreadCount(res.data.data?.count ?? 0))
        .catch(() => {})
    }
    fetchCount()
    const timer = setInterval(fetchCount, 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        btnRef.current && btnRef.current.contains(e.target as Node)
      ) return
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get('/notifications?pageSize=15')
      .then(res => {
        const fetched: Notif[] = res.data.data.items ?? []
        setItems(fetched)
        setUnreadCount(fetched.filter(n => !n.isRead).length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.right - 300),
      })
    }
    setOpen(v => !v)
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all').catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  async function markRead(id: number) {
    await api.patch(`/notifications/${id}/read`).catch(() => {})
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{ position: 'relative', width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)' }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            bottom: dropPos.bottom,
            left: dropPos.left,
            width: 300,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 -4px 24px rgba(0,0,0,.18)',
            border: '1.5px solid #15131a',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e8e3d6' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#15131a' }}>Thông báo</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <CheckCheck size={12} /> Đọc tất cả
              </button>
            )}
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <div style={{ width: 18, height: 18, border: '2px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : items.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 12, color: '#918c99', padding: '32px 16px' }}>Không có thông báo nào</p>
            ) : items.map(n => (
              <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: !n.isRead ? '#f5f3ff' : 'transparent', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f6f1')}
                onMouseLeave={e => (e.currentTarget.style.background = !n.isRead ? '#f5f3ff' : 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: !n.isRead ? 700 : 500, color: '#15131a', margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{n.message}</p>
                    <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', flexShrink: 0, marginTop: 4 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
