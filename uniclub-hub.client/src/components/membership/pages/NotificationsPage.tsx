import { useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Check, CheckCircle2, ClipboardCheck, Clock, FileText, ListTodo, Megaphone, Star, Trash2, UserPlus } from 'lucide-react'
import { deleteNotification, getNotifications, getNotificationUnreadCount, markAllNotificationsRead, markNotificationRead } from '@/components/membership/services/notificationApi'
import type { NotificationItem, NotificationType } from '@/components/membership/services/notificationApi'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { D } from '@/components/shared/managementTheme'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import type { UserMembership } from '@/types/auth'

type FilterKey = 'all' | 'unread' | 'application' | 'task' | 'event' | 'system'

const TYPE_META: Record<NotificationType, { label: string; color: string; Icon: typeof Star }> = {
  Application: { label: 'Duyệt đơn', color: '#8b3ff2', Icon: ClipboardCheck },
  Task: { label: 'Nhiệm vụ', color: '#1d4ed8', Icon: ListTodo },
  Event: { label: 'Sự kiện', color: '#f59e0b', Icon: CalendarDays },
  System: { label: 'Hệ thống', color: '#10b981', Icon: Megaphone },
  TaskAssigned: { label: 'Được giao việc', color: '#4f46e5', Icon: UserPlus },
  TaskStatusUpdated: { label: 'Cập nhật việc', color: '#4f46e5', Icon: ListTodo },
  DeadlineReminder: { label: 'Sắp đến hạn', color: '#f97316', Icon: Clock },
  AssignmentReceived: { label: 'Phiếu giao việc', color: '#8b3ff2', Icon: ClipboardCheck },
  AssignmentCancelled: { label: 'Phiếu bị hủy', color: '#dc2626', Icon: Trash2 },
  TaskUpdated: { label: 'Nội dung việc', color: '#0d9488', Icon: FileText },
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

function deriveLink(type: NotificationType, memberships: UserMembership[]): string | null {
  const adminMembership = memberships.find(
    m => (m.clubRole === CLUB_ROLES.CLUB_ADMIN || m.clubRole === CLUB_ROLES.DEPT_LEAD)
      && (m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)
  )
  const clubId = adminMembership?.clubId
  if (type === 'Application') return clubId ? `/clubs/${clubId}/manage/applications` : '/dashboard'
  if (type === 'Task') return clubId ? `/clubs/${clubId}/operations` : '/dashboard'
  if (type === 'Event') return clubId ? `/clubs/${clubId}/manage/events` : '/dashboard'
  return null
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')

  useDeferredEffect((isCancelled) => {
    setLoading(true)
    Promise.all([getNotifications(1), getNotificationUnreadCount()])
      .then(([list, count]) => {
        if (isCancelled()) return
        setItems(list.items ?? [])
        setTotal(list.totalCount ?? 0)
        setUnreadCount(count)
        setPage(1)
      })
      .catch(() => { if (!isCancelled()) { setItems([]); setTotal(0) } })
      .finally(() => { if (!isCancelled()) setLoading(false) })
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
      const list = await getNotifications(nextPage)
      setItems(prev => [...prev, ...(list.items ?? [])])
      setTotal(list.totalCount ?? total)
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

  async function markAllRead() {
    await markAllNotificationsRead().catch(() => {})
    setItems(prev => prev.map(item => ({ ...item, isRead: true })))
    setUnreadCount(0)
  }

  async function markRead(item: NotificationItem) {
    if (item.isRead) return
    await markNotificationRead(item.id).catch(() => {})
    setItems(prev => prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function handleOpen(item: NotificationItem) {
    await markRead(item)
    const link = item.navigationUrl ?? item.link ?? deriveLink(item.type, user?.memberships ?? [])
    if (link) navigate(link)
  }

  async function removeNotification(item: NotificationItem) {
    await deleteNotification(item.id).catch(() => {})
    setItems(prev => prev.filter(n => n.id !== item.id))
    setTotal(prev => Math.max(0, prev - 1))
    if (!item.isRead) setUnreadCount(prev => Math.max(0, prev - 1))
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
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(item)}
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

                <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {!item.isRead ? (
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: '#ff563f' }} />
                  ) : (
                    <CheckCircle2 size={16} color={D.inkMuted} style={{ opacity: 0.65 }} />
                  )}
                  <button
                    type="button"
                    aria-label="Xóa thông báo"
                    onClick={e => { e.stopPropagation(); removeNotification(item) }}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      background: 'transparent', color: D.inkMuted, cursor: 'pointer',
                      display: 'grid', placeItems: 'center', fontFamily: 'inherit',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="mgmt-page">
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
