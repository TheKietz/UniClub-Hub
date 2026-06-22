import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Calendar, MapPin, Users, Pencil, Trash2, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/operationsApi'
import type { EventItem, CreateEventDto, UpdateEventDto, EventStatus } from '../services/operations.types'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const D = {
  border: '1.5px solid var(--c-ink)',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  pill: 999,
  ink: 'var(--c-ink)',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: 'var(--c-bg)',
  card: '#ffffff',
  indigo: '#4f46e5',
  red: '#ef4444',
}

/* ─── Config ──────────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<EventStatus, { label: string; bg: string; text: string }> = {
  Draft:      { label: 'Nháp',         bg: '#f3f4f6', text: '#374151' },
  InProgress: { label: 'Đang diễn ra', bg: '#dbeafe', text: '#1d4ed8' },
  Completed:  { label: 'Hoàn thành',   bg: '#d1fae5', text: '#065f46' },
  Cancelled:  { label: 'Đã hủy',       bg: '#fee2e2', text: '#991b1b' },
}

const STATUS_ORDER = ['', 'Draft', 'InProgress', 'Completed', 'Cancelled']

const EMPTY_FORM: CreateEventDto = { name: '', description: '', location: '', startTime: '', endTime: '', budget: undefined, category: '' }

/* ─── Form input helpers ──────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
  border: '1.5px solid #c4bfb0', borderRadius: 8, outline: 'none',
  background: '#fff', color: 'var(--c-ink)', fontFamily: "'Be Vietnam Pro', sans-serif",
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: '#4a4651',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em',
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function EventListPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const clubId = Number(clubIdParam ?? 1)
  const isManageContext = location.pathname.includes('/manage/')

  const { isSuperAdmin, getClubRole } = useAuth()
  const canManage = isSuperAdmin || getClubRole(clubId) === CLUB_ROLES.CLUB_ADMIN

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EventItem | null>(null)
  const [form, setForm] = useState<CreateEventDto>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getEvents({ clubId, status: statusFilter || undefined, search: search || undefined, pageSize: 100 })
      .then(r => setEvents(r.items))
      .catch(() => toast.error('Không thể tải danh sách sự kiện'))
      .finally(() => setLoading(false))
  }, [clubId, statusFilter, search, refreshKey])

  const categories = useMemo(
    () => [...new Set(events.map(e => e.category).filter((c): c is string => !!c))],
    [events]
  )

  const displayed = useMemo(
    () => categoryFilter ? events.filter(e => e.category === categoryFilter) : events,
    [events, categoryFilter]
  )

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (ev: EventItem) => {
    setEditTarget(ev)
    setForm({ name: ev.name, description: ev.description ?? '', location: ev.location ?? '', startTime: ev.startTime ? ev.startTime.slice(0, 16) : '', endTime: ev.endTime ? ev.endTime.slice(0, 16) : '', maxParticipants: ev.maxParticipants, budget: ev.budget, category: ev.category ?? '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    setSaving(true)
    try {
      if (editTarget) { await updateEvent(editTarget.id, { ...form, status: editTarget.status } as UpdateEventDto); toast.success('Cập nhật thành công') }
      else { await createEvent(clubId, form); toast.success('Tạo sự kiện thành công') }
      setModalOpen(false); setRefreshKey(k => k + 1)
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteEvent(deleteTarget.id); toast.success('Đã xóa sự kiện'); setDeleteTarget(null); setRefreshKey(k => k + 1) }
    catch { toast.error('Không thể xóa sự kiện này') }
    finally { setDeleting(false) }
  }

  const set = (field: keyof CreateEventDto, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const filterPillStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
    border: D.border, borderRadius: D.pill,
    background: active ? D.ink : D.card,
    color: active ? '#facc15' : D.inkDim,
    boxShadow: active ? D.shadow(2, 2) : 'none',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Sự kiện</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{displayed.length} sự kiện</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
              background: D.ink, color: '#facc15', border: D.border,
              boxShadow: D.shadow(), borderRadius: D.pill,
              fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={15} /> Tạo sự kiện
          </button>
        )}
      </div>

      {/* Search */}
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

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUS_ORDER.map(s => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} style={filterPillStyle(statusFilter === s)}>
            {s ? STATUS_BADGE[s as EventStatus]?.label : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Category filter */}
      {categories.length >= 2 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setCategoryFilter('')} style={filterPillStyle(categoryFilter === '')}>Tất cả danh mục</button>
          {categories.map(cat => (
            <button key={cat} type="button" onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)} style={filterPillStyle(categoryFilter === cat)}>{cat}</button>
          ))}
        </div>
      )}

      {/* Event grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: D.inkMuted, padding: '80px 0' }}>Đang tải...</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', color: D.inkMuted, padding: '80px 0' }}>
          {search ? 'Không tìm thấy sự kiện nào' : 'Chưa có sự kiện nào'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {displayed.map(ev => {
            const badge = STATUS_BADGE[ev.status] ?? STATUS_BADGE.Draft
            return (
              <EventCard
                key={ev.id}
                ev={ev}
                badge={badge}
                canManage={canManage}
                onOpen={() => navigate(isManageContext ? `/clubs/${clubId}/manage/events/${ev.id}` : `/clubs/${clubId}/events/${ev.id}`)}
                onEdit={e => { e.stopPropagation(); openEdit(ev) }}
                onDelete={e => { e.stopPropagation(); setDeleteTarget(ev) }}
              />
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent style={{ maxWidth: 520, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 900, color: D.ink }}>
              {editTarget ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0', maxHeight: '65vh', overflowY: 'auto' }}>
            <div>
              <label style={labelStyle}>Tên sự kiện <span style={{ color: D.red }}>*</span></label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên sự kiện..." />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 64 }} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Địa điểm</label>
              <input style={inputStyle} value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Địa điểm tổ chức..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Bắt đầu</label>
                <input style={inputStyle} type="datetime-local" value={form.startTime ?? ''} onChange={e => set('startTime', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Kết thúc</label>
                <input style={inputStyle} type="datetime-local" value={form.endTime ?? ''} onChange={e => set('endTime', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Số người tối đa</label>
              <input style={inputStyle} type="number" min={1} value={form.maxParticipants ?? ''} onChange={e => set('maxParticipants', e.target.value ? Number(e.target.value) : undefined)} placeholder="Không giới hạn" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Ngân sách (VNĐ)</label>
                <input style={inputStyle} type="number" min={0} value={form.budget ?? ''} onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)} placeholder="Chưa xác định" />
              </div>
              <div>
                <label style={labelStyle}>Danh mục</label>
                <input style={inputStyle} value={form.category ?? ''} onChange={e => set('category', e.target.value)} placeholder="VD: Văn hoá, Học thuật..." />
              </div>
            </div>
          </div>
          <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>
              Hủy
            </button>
            <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: saving ? '#6b7280' : D.ink, color: '#facc15', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
              {saving ? 'Đang lưu...' : editTarget ? 'Lưu thay đổi' : 'Tạo sự kiện'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  ev, badge, canManage, onOpen, onEdit, onDelete,
}: {
  ev: EventItem
  badge: { label: string; bg: string; text: string }
  canManage: boolean
  onOpen: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: badge.bg, color: badge.text }}>
            {badge.label}
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
    </div>
  )
}
