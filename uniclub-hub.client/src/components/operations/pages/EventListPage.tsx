import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Calendar, CalendarDays, MapPin, Users, Pencil, Trash2, Search } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import { getEvents, getUniversityEvents, createEvent, updateEvent, deleteEvent } from '../services/operationsApi'
import EventFormModal from '../components/event/EventFormModal'
import { formatDateShort } from '../components/event/eventShared'
import type { EventItem, CreateEventDto, UpdateEventDto, EventStatus } from '../services/operations.types'
import { D } from '@/components/shared/managementTheme'

/* ─── Config ──────────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<EventStatus, { label: string; bg: string; text: string }> = {
  Draft:      { label: 'Nháp',         bg: '#f3f4f6', text: '#374151' },
  InProgress: { label: 'Đang diễn ra', bg: '#dbeafe', text: '#1d4ed8' },
  Completed:  { label: 'Hoàn thành',   bg: '#d1fae5', text: '#065f46' },
  Cancelled:  { label: 'Đã hủy',       bg: '#fee2e2', text: '#991b1b' },
}

const STATUS_ORDER = ['', 'Draft', 'InProgress', 'Completed', 'Cancelled']

/** University-level events keep their own status palette (as the old UniversityEventsPage). */
const UNIVERSITY_STATUS_MAP: Record<EventStatus, { label: string; bg: string; color: string }> = {
  Draft:      { label: 'Nháp',        bg: '#f3f4f6', color: '#6b7280' },
  InProgress: { label: 'Đang diễn ra', bg: '#dcfce7', color: '#15803d' },
  Completed:  { label: 'Đã kết thúc', bg: '#ede9fe', color: '#4f46e5' },
  Cancelled:  { label: 'Đã hủy',      bg: '#fee2e2', color: '#dc2626' },
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

/**
 * Unified event list page. The mode is derived from the route:
 *   - with a `:clubId` param  → club events (getEvents(clubId), status/category
 *     filters, create/edit/delete gated by canManage)
 *   - without a `:clubId`     → university-level events (getEvents(null), search
 *     only, super-admin create). Route guards are unchanged and still enforce access.
 */
export default function EventListPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const universityMode = clubIdParam == null
  const navigate = useNavigate()
  const location = useLocation()
  const clubId = Number(clubIdParam ?? 1)
  const isManageContext = location.pathname.includes('/manage/')

  const { isSuperAdmin, getClubRole } = useAuth()
  const canManage = universityMode
    ? isSuperAdmin
    : isSuperAdmin || getClubRole(clubId) === CLUB_ROLES.CLUB_ADMIN

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EventItem | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const request = universityMode
      ? getUniversityEvents({ search: search || undefined, pageSize: 100 })
      : getEvents({ clubId, status: statusFilter || undefined, search: search || undefined, pageSize: 100 })
    request
      .then(r => setEvents(r.items))
      .catch(() => toast.error('Không thể tải danh sách sự kiện'))
      .finally(() => setLoading(false))
  }, [universityMode, clubId, statusFilter, search, refreshKey])

  const categories = useMemo(
    () => [...new Set(events.map(e => e.category).filter((c): c is string => !!c))],
    [events]
  )

  const displayed = useMemo(
    () => categoryFilter ? events.filter(e => e.category === categoryFilter) : events,
    [events, categoryFilter]
  )

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (ev: EventItem) => { setEditTarget(ev); setModalOpen(true) }

  const editInitial: CreateEventDto | undefined = editTarget
    ? { name: editTarget.name, description: editTarget.description ?? '', location: editTarget.location ?? '', startTime: editTarget.startTime ? editTarget.startTime.slice(0, 16) : '', endTime: editTarget.endTime ? editTarget.endTime.slice(0, 16) : '', maxParticipants: editTarget.maxParticipants, budget: editTarget.budget, category: editTarget.category ?? '' }
    : undefined

  const submitEvent = async (form: CreateEventDto) => {
    try {
      if (editTarget) {
        await updateEvent(editTarget.id, { ...form, status: editTarget.status } as UpdateEventDto)
        toast.success('Cập nhật thành công')
        setModalOpen(false); setRefreshKey(k => k + 1)
      } else if (universityMode) {
        const created = await createEvent(null, { ...form, name: form.name.trim() })
        toast.success('Đã tạo sự kiện cấp trường')
        setModalOpen(false); navigate(`/admin/events/${created.id}`)
      } else {
        await createEvent(clubId, form)
        toast.success('Tạo sự kiện thành công')
        setModalOpen(false); setRefreshKey(k => k + 1)
      }
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại'); throw new Error('save-failed') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteEvent(deleteTarget.id); toast.success('Đã xóa sự kiện'); setDeleteTarget(null); setRefreshKey(k => k + 1) }
    catch { toast.error('Không thể xóa sự kiện này') }
    finally { setDeleting(false) }
  }

  const openDetail = (ev: EventItem) => {
    if (universityMode) { navigate(`/admin/events/${ev.id}`); return }
    navigate(isManageContext ? `/clubs/${clubId}/manage/events/${ev.id}` : `/clubs/${clubId}/events/${ev.id}`)
  }

  const filterPillStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
    border: D.border, borderRadius: D.pill,
    background: active ? D.ink : D.card,
    color: active ? '#ffffff' : D.inkDim,
    boxShadow: active ? D.shadow(2, 2) : 'none',
    fontFamily: 'inherit',
  })

  return (
    <div className="mgmt-page">
      {/* Header */}
      <div className="mgmt-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
            {universityMode ? 'Sự kiện cấp Trường' : 'Sự kiện'}
          </h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            {universityMode ? `${events.length} sự kiện · Quản lý bởi Admin trường` : `${displayed.length} sự kiện`}
          </p>
        </div>
        {canManage && (
          universityMode ? (
            <button
              type="button"
              onClick={openCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 800,
                color: D.card, background: D.ink, border: D.border, borderRadius: 10,
                cursor: 'pointer', boxShadow: D.shadow(3, 3),
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.shadow(5, 5) }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.shadow(3, 3) }}
            >
              <Plus size={14} /> Tạo sự kiện
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                background: D.ink, color: '#ffffff', border: D.border,
                boxShadow: D.shadow(), borderRadius: D.pill,
                fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={15} /> Tạo sự kiện
            </button>
          )
        )}
      </div>

      {/* Search */}
      {universityMode ? (
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 24 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.inkMuted }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm sự kiện..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: 13, border: D.border, borderRadius: 10, outline: 'none', background: D.card, color: D.ink, boxSizing: 'border-box' }}
          />
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: D.card, border: D.border, borderRadius: D.radius,
          boxShadow: D.shadow(), padding: '10px 14px', marginBottom: 16,
        }}>
          <Search size={14} style={{ color: D.inkMuted, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên sự kiện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: D.ink, background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {/* Status + category filters — club events only */}
      {!universityMode && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {STATUS_ORDER.map(s => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)} style={filterPillStyle(statusFilter === s)}>
                {s ? STATUS_BADGE[s as EventStatus]?.label : 'Tất cả'}
              </button>
            ))}
          </div>

          {categories.length >= 2 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setCategoryFilter('')} style={filterPillStyle(categoryFilter === '')}>Tất cả danh mục</button>
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)} style={filterPillStyle(categoryFilter === cat)}>{cat}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Event grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: D.inkMuted, padding: '80px 0' }}>Đang tải...</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', color: D.inkMuted, padding: '80px 0' }}>
          {search
            ? (universityMode ? 'Không tìm thấy sự kiện phù hợp.' : 'Không tìm thấy sự kiện nào')
            : (universityMode ? 'Chưa có sự kiện cấp trường nào. Tạo sự kiện đầu tiên!' : 'Chưa có sự kiện nào')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {displayed.map(ev => (
            <EventCard
              key={ev.id}
              ev={ev}
              universityMode={universityMode}
              canManage={canManage}
              onOpen={() => openDetail(ev)}
              onEdit={e => { e.stopPropagation(); openEdit(ev) }}
              onDelete={e => { e.stopPropagation(); setDeleteTarget(ev) }}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <EventFormModal
        open={modalOpen}
        mode={editTarget ? 'edit' : 'create'}
        title={editTarget ? 'Chỉnh sửa sự kiện' : universityMode ? 'Tạo sự kiện cấp trường' : 'Tạo sự kiện mới'}
        initial={editInitial}
        showCategory={!universityMode}
        onClose={() => setModalOpen(false)}
        onSubmit={submitEvent}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Sự kiện <span style={{ fontWeight: 700, color: D.ink }}>"{deleteTarget?.name}"</span> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deleting ? 'Đang xóa...' : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ─── Event card sub-component ───────────────────────────────────────────── */

function EventCard({
  ev, universityMode, canManage, onOpen, onEdit, onDelete,
}: {
  ev: EventItem
  universityMode: boolean
  canManage: boolean
  onOpen: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const clubBadge = STATUS_BADGE[ev.status] ?? STATUS_BADGE.Draft
  const uniSt = UNIVERSITY_STATUS_MAP[ev.status] ?? UNIVERSITY_STATUS_MAP.Draft
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: D.card, border: D.border, borderRadius: D.radius,
        padding: 20, cursor: 'pointer',
        boxShadow: hovered ? D.shadow(5, 5) : D.shadow(),
        transform: hovered ? 'translate(-2px,-2px)' : 'none',
        transition: 'box-shadow .15s, transform .15s',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {universityMode ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: D.pill, padding: '2px 8px', letterSpacing: '.04em' }}>
              TOÀN TRƯỜNG
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: uniSt.bg, color: uniSt.color, borderRadius: D.pill, padding: '2px 8px' }}>{uniSt.label}</span>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: D.ink, margin: '0 0 8px', lineHeight: 1.3 }}>{ev.name}</h3>
          {ev.description && (
            <p style={{ fontSize: 12, color: D.inkMuted, margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {ev.description}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ev.startTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted }}>
                <CalendarDays size={12} />{formatDateShort(ev.startTime)}{ev.endTime ? ` – ${formatDateShort(ev.endTime)}` : ''}
              </div>
            )}
            {ev.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted }}>
                <MapPin size={12} />{ev.location}
              </div>
            )}
            {ev.participantCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted }}>
                <Users size={12} />{ev.participantCount} người đăng ký
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mgmt-page-header" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: clubBadge.bg, color: clubBadge.text }}>
                {clubBadge.label}
              </span>
              {ev.category && (
                <span style={{ fontSize: 10, color: D.inkMuted, background: D.bg, border: D.borderLight, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  {ev.category}
                </span>
              )}
            </div>
            {canManage && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button style={{ padding: 4, border: 'none', background: 'transparent', color: D.inkMuted, cursor: 'pointer', borderRadius: 4 }} onClick={onEdit}><Pencil size={13} /></button>
                <button style={{ padding: 4, border: 'none', background: 'transparent', color: D.inkMuted, cursor: 'pointer', borderRadius: 4 }} onClick={onDelete}><Trash2 size={13} /></button>
              </div>
            )}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 800, color: D.ink, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {ev.name}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ev.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: D.inkMuted }}>
                <MapPin size={10} /> {ev.location}
              </span>
            )}
            {ev.startTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: D.inkMuted }}>
                <Calendar size={10} />
                {new Date(ev.startTime).toLocaleDateString('vi-VN')}
                {ev.endTime && ` – ${new Date(ev.endTime).toLocaleDateString('vi-VN')}`}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: D.inkMuted }}>
              <Users size={10} /> {ev.participantCount} người tham gia{ev.maxParticipants && ` / ${ev.maxParticipants}`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
