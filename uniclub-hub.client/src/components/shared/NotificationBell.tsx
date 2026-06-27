import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Star } from 'lucide-react'
import api from '@/lib/axiosInstance'
import { useNotificationSignalR } from '@/lib/useNotificationSignalR'

interface Notif {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  navigationUrl?: string | null
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

const TYPE_COLORS: Record<string, string> = {
  Application: '#8b3ff2',
  Task: '#4f46e5',
  Event: '#f59e0b',
  System: '#10b981',
}

function notificationColor(type: string) {
  return TYPE_COLORS[type] ?? '#4f46e5'
}

export default function NotificationBell() {
  const navigate = useNavigate()
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

  // Realtime: bump the badge instantly; refresh the list if the dropdown is open.
  // (The 60s poll above remains as a fallback when the socket is down.)
  useNotificationSignalR(() => {
    setUnreadCount(c => c + 1)
    if (open) {
      api.get('/notifications?pageSize=15')
        .then(res => setItems(res.data.data.items ?? []))
        .catch(() => {})
    }
  })

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
      const width = Math.min(320, window.innerWidth - 24)
      setDropPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.min(Math.max(12, rect.right - width + 40), window.innerWidth - width - 12),
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

  async function handleItemClick(n: Notif) {
    if (!n.isRead) await markRead(n.id)
    if (n.navigationUrl) {
      setOpen(false)
      navigate(n.navigationUrl)
    }
  }

  return (
    <>
      <style>{`
        .notification-popover-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(21, 19, 26, .14) transparent;
        }
        .notification-popover-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .notification-popover-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .notification-popover-scroll::-webkit-scrollbar-thumb {
          background: rgba(21, 19, 26, .14);
          border-radius: 999px;
        }
        .notification-popover-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(21, 19, 26, .24);
        }
      `}</style>
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
            width: 'min(320px, calc(100vw - 24px))',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '10px 10px 26px rgba(0,0,0,.13)',
            border: '2px solid var(--c-ink)',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 13px', borderBottom: '1px solid #e8e3d6' }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--c-ink)', letterSpacing: '-.02em' }}>Thông báo</span>
            <button
              onClick={markAllRead}
              disabled={items.length === 0}
              style={{
                fontSize: 12, fontWeight: 800, color: '#4f46e5',
                background: 'none', border: 'none',
                cursor: items.length === 0 ? 'default' : 'pointer',
                opacity: items.length === 0 ? 0.45 : 1,
                fontFamily: 'inherit',
              }}
            >
              Đánh dấu đã đọc
            </button>
          </div>

          <div className="notification-popover-scroll" style={{ maxHeight: 260, overflowY: 'auto', background: '#f7f7fb' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <div style={{ width: 18, height: 18, border: '2px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : items.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 14, color: '#918c99', padding: '38px 16px', margin: 0 }}>Không có thông báo nào</p>
            ) : items.map(n => (
              <div key={n.id} onClick={() => handleItemClick(n)}
                style={{ padding: '12px 18px', borderBottom: '1px solid #e8e3d6', cursor: 'pointer', background: '#f7f7fb', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f2f1f7')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f7f7fb')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: '2px solid var(--c-ink)',
                    background: notificationColor(n.type),
                    display: 'grid', placeItems: 'center',
                    flexShrink: 0,
                  }}>
                    <Star size={18} fill="#fff" color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 900, color: 'var(--c-ink)',
                      margin: 0, lineHeight: 1.28, letterSpacing: '-.02em',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                    }}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p style={{
                        fontSize: 11, color: '#6b7280', marginTop: 3, lineHeight: 1.35,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                      }}>
                        {n.message}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#918c99', marginTop: 4 }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff563f', flexShrink: 0, marginTop: 7 }} />}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/notifications')
            }}
            style={{
              width: '100%', height: 42, border: 'none',
              borderTop: '1px solid #e8e3d6', background: '#fff',
              color: '#4f46e5', fontSize: 14, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Xem tất cả thông báo →
          </button>
        </div>
      )}
    </>
  )
}
