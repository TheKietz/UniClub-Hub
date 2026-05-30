import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, CheckCircle2, ClipboardCheck, FileText, ListTodo, Megaphone, Star } from 'lucide-react'
import api from '@/lib/axiosInstance'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'

type NotificationType = 'Task' | 'Event' | 'Application' | 'System'
type FilterKey = 'all' | 'unread' | 'application' | 'task' | 'event' | 'system'

interface NotificationItem {
  id: number
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  createdAt: string
}

interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  lemon: '#facc15',
  indigo: '#4f46e5',
}

const TYPE_META: Record<NotificationType, { label: string; color: string; Icon: typeof Star }> = {
  Application: { label: 'Duyệt đơn', color: '#8b3ff2', Icon: ClipboardCheck },
  Task: { label: 'Nhiệm vụ', color: '#4f46e5', Icon: ListTodo },
  Event: { label: 'Sự kiện', color: '#f59e0b', Icon: CalendarDays },
  System: { label: 'Hệ thống', color: '#10b981', Icon: Megaphone },
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'application', label: 'Duyệt đơn' },
  { key: 'task', label: 'Nhiệm vụ' },
  { key: 'event', label: 'Sự kiện' },
  { key: 'system', label: 'Hệ thống' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

function matchesFilter(item: NotificationItem, filter: FilterKey) {
  if (filter === 'all') return true
  if (filter === 'unread') return !item.isRead
  return item.type.toLowerCase() === filter
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<{ data: PagedResult<NotificationItem> }>('/notifications', { params: { page: 1, pageSize: 20 } }),
      api.get<{ data: { count: number } }>('/notifications/unread-count'),
    ])
      .then(([listRes, countRes]) => {
        setItems(listRes.data.data.items ?? [])
        setTotal(listRes.data.data.totalCount ?? 0)
        setUnreadCount(countRes.data.data?.count ?? 0)
        setPage(1)
      })
      .catch(() => {
        setItems([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => items.filter(item => matchesFilter(item, filter)),
    [items, filter]
  )

  const today = filtered.filter(item => isToday(item.createdAt))
  const earlier = filtered.filter(item => !isToday(item.createdAt))

  function filterCount(key: FilterKey) {
    if (key === 'all') return items.length
    if (key === 'unread') return unreadCount
    return items.filter(item => matchesFilter(item, key)).length
  }

  async function loadMore() {
    if (items.length >= total || loadingMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res = await api.get<{ data: PagedResult<NotificationItem> }>('/notifications', {
        params: { page: nextPage, pageSize: 20 },
      })
      setItems(prev => [...prev, ...(res.data.data.items ?? [])])
      setTotal(res.data.data.totalCount ?? total)
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all').catch(() => {})
    setItems(prev => prev.map(item => ({ ...item, isRead: true })))
    setUnreadCount(0)
  }

  async function markRead(item: NotificationItem) {
    if (item.isRead) return
    await api.patch(`/notifications/${item.id}/read`).catch(() => {})
    setItems(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  function renderGroup(label: string, groupItems: NotificationItem[]) {
    if (groupItems.length === 0) return null

    return (
      <section style={{ marginTop: 18 }}>
        <h2 style={{
          fontSize: 12, fontWeight: 900, color: D.inkMuted,
          textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 10px',
        }}>
          {label}
        </h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {groupItems.map(item => {
            const meta = TYPE_META[item.type] ?? TYPE_META.System
            const Icon = meta.Icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 16, border: D.border,
                  boxShadow: D.shadow(3, 3), background: item.isRead ? '#fbfaf7' : D.card,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: 46, height: 46, borderRadius: 12, border: D.border,
                  background: meta.color, display: 'grid', placeItems: 'center',
                  color: '#fff', flexShrink: 0,
                }}>
                  <Icon size={22} strokeWidth={2.6} />
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', height: 18,
                      padding: '0 9px', borderRadius: 5,
                      background: meta.color, color: '#fff',
                      fontSize: 10, fontWeight: 900, letterSpacing: '.06em',
                      textTransform: 'uppercase',
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600 }}>{timeAgo(item.createdAt)}</span>
                  </span>
                  <span style={{
                    display: 'block', color: D.ink, fontSize: 15,
                    fontWeight: 900, lineHeight: 1.25, letterSpacing: '-.015em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </span>
                  {item.message && (
                    <span style={{
                      display: 'block', color: D.inkDim, fontSize: 13,
                      lineHeight: 1.35, marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.message}
                    </span>
                  )}
                </span>

                {!item.isRead ? (
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: '#ff563f', flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={16} color={D.inkMuted} style={{ flexShrink: 0, opacity: 0.65 }} />
                )}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div style={{
      minHeight: '100%', background: D.bg, padding: '32px 42px',
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: D.ink, letterSpacing: '-.035em', margin: 0 }}>
              Thông báo
            </h1>
            <p style={{ fontSize: 14, color: D.inkMuted, margin: '4px 0 0' }}>
              {unreadCount} thông báo chưa đọc
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            style={{
              padding: '9px 18px', borderRadius: D.pill, border: D.border,
              boxShadow: unreadCount === 0 ? 'none' : D.shadow(2, 2),
              background: D.card, color: D.indigo,
              fontSize: 13, fontWeight: 900, cursor: unreadCount === 0 ? 'default' : 'pointer',
              opacity: unreadCount === 0 ? 0.45 : 1, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Check size={15} /> Đánh dấu tất cả đã đọc
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {FILTERS.map(tab => {
            const active = filter === tab.key
            const count = filterCount(tab.key)
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '7px 14px', borderRadius: D.pill,
                  background: active ? D.ink : D.card,
                  color: active ? D.lemon : D.ink,
                  border: D.border,
                  boxShadow: active ? 'none' : D.shadow(2, 2),
                  transform: active ? 'translate(2px,2px)' : 'none',
                  fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all .12s', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {tab.label}
                {(tab.key === 'unread' || count > 0) && (
                  <span style={{
                    padding: '1px 6px', borderRadius: D.pill, fontSize: 10, fontWeight: 900,
                    background: active ? 'rgba(255,255,255,.2)' : D.bg,
                    color: active ? D.lemon : D.inkMuted,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ border: D.border, borderRadius: 16, background: D.card, boxShadow: D.shadow(), padding: '52px 0', textAlign: 'center', color: D.inkMuted }}>
            Đang tải thông báo...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ border: D.border, borderRadius: 16, background: D.card, boxShadow: D.shadow(), padding: '52px 18px', textAlign: 'center' }}>
            <FileText size={30} color={D.inkMuted} />
            <p style={{ margin: '10px 0 0', color: D.inkMuted, fontSize: 14 }}>Không có thông báo phù hợp.</p>
          </div>
        ) : (
          <>
            {renderGroup('Hôm nay', today)}
            {renderGroup('Trước đó', earlier)}
            <LoadMoreBar shown={items.length} total={total} loading={loadingMore} onLoadMore={loadMore} label="thông báo" />
          </>
        )}
      </div>
    </div>
  )
}
