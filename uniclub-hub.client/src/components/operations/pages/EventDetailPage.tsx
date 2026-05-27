import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Pencil, Share2, Calendar, MapPin, Users, CalendarClock,
  Wallet, UserCheck, CheckSquare, ChevronRight, Plus, Trash2, Tag,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  getEventById, updateEvent, deleteEvent, getTasks,
  addEventSession, deleteEventSession, assignEventStaff, removeEventStaff,
} from '../services/operationsApi'
import { getClubMembers } from '@/components/membership/services/clubApi'
import { EventStatusBadge, TaskStatusBadge } from '../../shared/StatusBadge'
import ProgressBar from '../../shared/ProgressBar'
import type {
  EventItem, TaskItem, UpdateEventDto, EventStatus,
  CreateEventSessionDto, AssignEventStaffDto,
} from '../services/operations.types'
import type { MemberItem } from '@/components/membership/services/club.types'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  indigo: '#4f46e5',
  amber: '#f59e0b',
  red: '#ef4444',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
  border: '1.5px solid #c4bfb0', borderRadius: 8, outline: 'none',
  background: '#fff', color: D.ink, fontFamily: "'Be Vietnam Pro', sans-serif",
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: D.inkDim,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em',
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatVnd(amount?: number): string {
  if (amount == null) return 'Chưa xác định'
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

const PRIORITY_PILL: Record<string, { label: string; bg: string; text: string }> = {
  High:   { label: 'Cao',      bg: '#fee2e2', text: '#991b1b' },
  Medium: { label: 'Trung bình', bg: '#fef3c7', text: '#92400e' },
  Low:    { label: 'Thấp',     bg: '#dbeafe', text: '#1e40af' },
}
const ROLE_LABEL: Record<string, string> = { Lead: 'Trưởng ban', Staff: 'Nhân sự' }

/* ─── Edit modal ──────────────────────────────────────────────────────────── */

type EventForm = { name: string; description: string; location: string; startTime: string; endTime: string; maxParticipants?: number; status: EventStatus; budget?: number; category: string }

function EditModal({ open, event, onClose, onSaved }: { open: boolean; event: EventItem; onClose: () => void; onSaved: (u: EventItem) => void }) {
  const [form, setForm] = useState<EventForm>({ name: '', description: '', location: '', startTime: '', endTime: '', status: 'Draft', category: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: event.name, description: event.description ?? '', location: event.location ?? '', startTime: event.startTime ? event.startTime.slice(0, 16) : '', endTime: event.endTime ? event.endTime.slice(0, 16) : '', maxParticipants: event.maxParticipants, status: event.status, budget: event.budget, category: event.category ?? '' })
  }, [open, event])

  const set = (field: keyof EventForm, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    setSaving(true)
    try {
      const dto: UpdateEventDto = { name: form.name, description: form.description, location: form.location, startTime: form.startTime || undefined, endTime: form.endTime || undefined, maxParticipants: form.maxParticipants, status: form.status, budget: form.budget, category: form.category || undefined }
      const updated = await updateEvent(event.id, dto)
      toast.success('Đã cập nhật sự kiện'); onSaved(updated); onClose()
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 520, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader><DialogTitle style={{ fontSize: 16, fontWeight: 900, color: D.ink }}>Chỉnh sửa sự kiện</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0', maxHeight: '65vh', overflowY: 'auto' }}>
          <div><label style={labelStyle}>Tên sự kiện <span style={{ color: D.red }}>*</span></label><input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Trạng thái</label>
            <select aria-label="Trạng thái" style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value as EventStatus)}>
              <option value="Draft">Nháp</option><option value="InProgress">Đang diễn ra</option>
              <option value="Completed">Hoàn thành</option><option value="Cancelled">Đã hủy</option>
            </select>
          </div>
          <div><label style={labelStyle}>Mô tả</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 72 }} rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div><label style={labelStyle}>Địa điểm</label><input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Bắt đầu</label><input style={inputStyle} type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
            <div><label style={labelStyle}>Kết thúc</label><input style={inputStyle} type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Số người tối đa</label><input style={inputStyle} type="number" min={1} value={form.maxParticipants ?? ''} onChange={e => set('maxParticipants', e.target.value ? Number(e.target.value) : undefined)} placeholder="Không giới hạn" /></div>
            <div><label style={labelStyle}>Danh mục</label><input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Văn hoá, Học thuật..." /></div>
          </div>
          <div><label style={labelStyle}>Ngân sách (VNĐ)</label><input style={inputStyle} type="number" min={0} value={form.budget ?? ''} onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)} placeholder="Chưa xác định" /></div>
        </div>
        <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: saving ? '#6b7280' : D.ink, color: '#facc15', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Add session modal ───────────────────────────────────────────────────── */

function AddSessionModal({ open, eventId, onClose, onAdded }: { open: boolean; eventId: number; onClose: () => void; onAdded: () => void }) {
  const BLANK: CreateEventSessionDto = { title: '', startTime: '', endTime: '', description: '', location: '' }
  const [form, setForm] = useState<CreateEventSessionDto>(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(BLANK) }, [open])

  const set = (field: keyof CreateEventSessionDto, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Tên phiên không được để trống'); return }
    if (!form.startTime || !form.endTime) { toast.error('Vui lòng nhập giờ bắt đầu và kết thúc'); return }
    setSaving(true)
    try { await addEventSession(eventId, form); toast.success('Đã thêm phiên'); onAdded(); onClose() }
    catch { toast.error('Có lỗi xảy ra') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 440, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader><DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Thêm mục lịch trình</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div><label style={labelStyle}>Tên mục <span style={{ color: D.red }}>*</span></label><input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Khai mạc, Phát biểu..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Giờ bắt đầu <span style={{ color: D.red }}>*</span></label><input style={inputStyle} type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
            <div><label style={labelStyle}>Giờ kết thúc <span style={{ color: D.red }}>*</span></label><input style={inputStyle} type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Địa điểm</label><input style={inputStyle} value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Phòng họp, Sân trường..." /></div>
          <div><label style={labelStyle}>Mô tả</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 56 }} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: saving ? '#6b7280' : D.ink, color: '#facc15', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
            {saving ? 'Đang lưu...' : 'Thêm mục'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Assign staff modal ──────────────────────────────────────────────────── */

function AssignStaffModal({ open, eventId, members, onClose, onAssigned }: { open: boolean; eventId: number; members: MemberItem[]; onClose: () => void; onAssigned: () => void }) {
  const [form, setForm] = useState<AssignEventStaffDto>({ userId: '', role: 'Staff' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm({ userId: '', role: 'Staff' }) }, [open])

  const handleSave = async () => {
    if (!form.userId) { toast.error('Vui lòng chọn thành viên'); return }
    setSaving(true)
    try { await assignEventStaff(eventId, form); toast.success('Đã phân công thành viên'); onAssigned(); onClose() }
    catch { toast.error('Thành viên này đã được phân công hoặc có lỗi xảy ra') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 360, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader><DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Phân công nhân sự</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div>
            <label style={labelStyle}>Thành viên <span style={{ color: D.red }}>*</span></label>
            <select aria-label="Chọn thành viên" style={{ ...inputStyle, cursor: 'pointer' }} value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
              <option value="">-- Chọn thành viên --</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.fullName ?? m.email}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Vai trò</label>
            <select aria-label="Vai trò" style={{ ...inputStyle, cursor: 'pointer' }} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="Lead">Trưởng ban</option>
              <option value="Staff">Nhân sự</option>
            </select>
          </div>
        </div>
        <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: saving ? '#6b7280' : D.ink, color: '#facc15', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
            {saving ? 'Đang lưu...' : 'Phân công'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function EventDetailPage() {
  const { id, clubId: clubIdParam } = useParams<{ id: string; clubId: string }>()
  const navigate = useNavigate()
  const clubId = Number(clubIdParam ?? 1)

  const { isSuperAdmin, getClubRole } = useAuth()
  const canManage = isSuperAdmin || getClubRole(clubId) === CLUB_ROLES.CLUB_ADMIN

  const [event, setEvent]   = useState<EventItem | null>(null)
  const [tasks, setTasks]   = useState<TaskItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [assignStaffOpen, setAssignStaffOpen] = useState(false)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<string | null>(null)
  const [deletingStaff, setDeletingStaff] = useState(false)

  const loadEvent = async () => {
    if (!id) return
    const ev = await getEventById(Number(id))
    setEvent(ev)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getEventById(Number(id)), getTasks({ clubId, eventId: Number(id), pageSize: 100 }), getClubMembers(clubId)])
      .then(([ev, taskResult, memberList]) => { setEvent(ev); setTasks(taskResult.items); setMembers(memberList) })
      .catch(() => toast.error('Không thể tải thông tin sự kiện'))
      .finally(() => setLoading(false))
  }, [id, clubId])

  const handleDeleteSession = async (sessionId: number) => {
    if (!event) return
    try { await deleteEventSession(event.id, sessionId); toast.success('Đã xóa mục lịch trình'); await loadEvent() }
    catch { toast.error('Không thể xóa mục này') }
  }

  const confirmRemoveStaff = async () => {
    if (!event || !staffDeleteTarget) return
    setDeletingStaff(true)
    try { await removeEventStaff(event.id, staffDeleteTarget); toast.success('Đã xóa nhân sự'); setStaffDeleteTarget(null); await loadEvent() }
    catch { toast.error('Không thể xóa nhân sự này') }
    finally { setDeletingStaff(false) }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    setDeletingEvent(true)
    try { await deleteEvent(event.id); toast.success('Đã xóa sự kiện'); navigate(`/clubs/${clubId}/events`) }
    catch { toast.error('Không thể xóa sự kiện này'); setDeletingEvent(false); setDeleteEventOpen(false) }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Đã sao chép liên kết'))
      .catch(() => toast.error('Không thể sao chép liên kết'))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <span style={{ color: D.inkMuted, fontSize: 13 }}>Đang tải...</span>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <p style={{ color: D.inkMuted }}>Không tìm thấy sự kiện</p>
        <button type="button" onClick={() => navigate(`/clubs/${clubId}/events`)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.pill, background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2) }}>
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const doneTasks = tasks.filter(t => t.status === 'Done').length
  const sessions  = event.sessions ?? []
  const staff     = event.staff ?? []

  const outlineBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    fontSize: 12, fontWeight: 700, border: D.border, borderRadius: D.pill,
    background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2), fontFamily: 'inherit',
  }
  const cardStyle: React.CSSProperties = {
    background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20,
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted, marginBottom: 16 }}>
        <Link to="/operations" style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Vận hành</Link>
        <ChevronRight size={12} />
        <Link to={`/clubs/${clubId}/events`} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Sự kiện</Link>
        <ChevronRight size={12} />
        <span style={{ color: D.ink, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{event.name}</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <button type="button" onClick={() => navigate(`/clubs/${clubId}/events`)} style={{ marginTop: 2, padding: 6, borderRadius: 8, border: D.borderLight, background: D.card, color: D.inkMuted, cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: D.ink, margin: 0, letterSpacing: '-.025em' }}>{event.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <EventStatusBadge status={event.status} />
              {event.category && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkMuted, background: D.bg, border: D.borderLight, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  <Tag size={9} /> {event.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={handleShare} style={outlineBtnStyle}><Share2 size={13} /> Chia sẻ</button>
          {canManage && (
            <>
              <button type="button" onClick={() => setDeleteEventOpen(true)} style={{ ...outlineBtnStyle, color: D.red, borderColor: '#fca5a5' }}>
                <Trash2 size={13} /> Xóa
              </button>
              <button type="button" onClick={() => setEditOpen(true)} style={{ ...outlineBtnStyle, background: D.ink, color: '#facc15', boxShadow: D.shadow() }}>
                <Pencil size={13} /> Chỉnh sửa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Event info */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 14px' }}>Thông tin tổng quan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: D.inkDim }}>
              {event.startTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={14} style={{ color: D.indigo, flexShrink: 0 }} />
                  <span>{formatDate(event.startTime)}{event.endTime && <> &mdash; {formatDate(event.endTime)}</>}</span>
                </div>
              )}
              {event.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} style={{ color: D.red, flexShrink: 0 }} />
                  <span>{event.location}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>{event.participantCount} người tham gia{event.maxParticipants ? ` / tối đa ${event.maxParticipants}` : ''}</span>
              </div>
              {event.description && (
                <p style={{ margin: '8px 0 0', color: D.inkMuted, lineHeight: 1.6, paddingTop: 12, borderTop: D.borderLight }}>{event.description}</p>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={13} style={{ color: D.indigo }} />
                Lịch trình hoạt động
                {sessions.length > 0 && (
                  <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{sessions.length}</span>
                )}
              </h2>
              {canManage && (
                <button type="button" onClick={() => setAddSessionOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Plus size={12} /> Thêm mục
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={28} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Chưa có lịch trình — nhấn "Thêm mục" để bắt đầu</p>
              </div>
            ) : (
              <div>
                {sessions.map((s, idx) => (
                  <div key={s.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 52, textAlign: 'right', fontSize: 11, color: D.inkMuted, paddingTop: 2, flexShrink: 0, lineHeight: 1.4 }}>
                      <div>{s.startTime}</div><div style={{ color: '#c4bfb0' }}>{s.endTime}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.indigo, marginTop: 3, flexShrink: 0 }} />
                      {idx < sessions.length - 1 && <div style={{ width: 1, flex: 1, background: '#e8e3d6', margin: '3px 0' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 16, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{s.title}</p>
                        {s.location && <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} /> {s.location}</p>}
                        {s.description && <p style={{ fontSize: 11, color: D.inkMuted, margin: '4px 0 0' }}>{s.description}</p>}
                      </div>
                      {canManage && (
                        <button type="button" aria-label="Xóa mục lịch trình" onClick={() => handleDeleteSession(s.id)} style={{ padding: 4, color: D.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task progress */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>Tiến độ công việc</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: D.inkDim }}>Hoàn thành</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: D.ink }}>{doneTasks} / {tasks.length}</span>
            </div>
            <ProgressBar value={tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0} showLabel={false} size="md" color={D.indigo} />
          </div>

          {/* Budget */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={12} style={{ color: D.amber }} />Ngân sách phân bổ
            </h2>
            {event.budget != null ? (
              <p style={{ fontSize: 20, fontWeight: 900, color: D.ink, margin: 0 }}>{formatVnd(event.budget)}</p>
            ) : (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Wallet size={20} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 11, color: D.inkMuted, margin: 0, textAlign: 'center' }}>Chưa xác định ngân sách</p>
              </div>
            )}
          </div>

          {/* Staff */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <UserCheck size={12} style={{ color: '#7c3aed' }} />
                Nhân sự phụ trách
                {staff.length > 0 && <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{staff.length}</span>}
              </h2>
              {canManage && (
                <button type="button" onClick={() => setAssignStaffOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Plus size={11} /> Phân công
                </button>
              )}
            </div>

            {staff.length === 0 ? (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <UserCheck size={20} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 11, color: D.inkMuted, margin: 0, textAlign: 'center' }}>Chưa có nhân sự được phân công</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {staff.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: D.indigo, flexShrink: 0, overflow: 'hidden', border: D.borderLight }}>
                      {s.avatarUrl ? <img src={s.avatarUrl} alt={s.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.userName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.userName}</p>
                      <p style={{ fontSize: 10, color: D.inkMuted, margin: 0 }}>{ROLE_LABEL[s.role] ?? s.role}</p>
                    </div>
                    {canManage && (
                      <button type="button" aria-label="Xóa nhân sự" onClick={() => setStaffDeleteTarget(s.userId)} style={{ padding: 4, color: D.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks table */}
      <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={14} style={{ color: D.indigo }} />
            Công việc liên quan
            {tasks.length > 0 && <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{tasks.length}</span>}
          </h2>
        </div>
        {tasks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: D.inkMuted, fontSize: 13 }}>
            Chưa có công việc nào liên kết với sự kiện này
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: D.bg }}>
                  {['Tiêu đề', 'Trạng thái', 'Ưu tiên', 'Người thực hiện', 'Deadline'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const pri = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Medium
                  return (
                    <tr key={t.id} style={{ borderBottom: D.borderLight }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: D.ink }}>{t.title}</td>
                      <td style={{ padding: '12px 16px' }}><TaskStatusBadge status={t.status} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: pri.bg, color: pri.text }}>{pri.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: D.inkDim }}>{t.assigneeName ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: D.inkMuted }}>{t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {editOpen && <EditModal open={editOpen} event={event} onClose={() => setEditOpen(false)} onSaved={updated => setEvent(updated)} />}
      <AddSessionModal open={addSessionOpen} eventId={event.id} onClose={() => setAddSessionOpen(false)} onAdded={loadEvent} />
      <AssignStaffModal open={assignStaffOpen} eventId={event.id} members={members} onClose={() => setAssignStaffOpen(false)} onAssigned={loadEvent} />

      <AlertDialog open={deleteEventOpen} onOpenChange={v => !v && setDeleteEventOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Sự kiện <span style={{ fontWeight: 700, color: D.ink }}>"{event.name}"</span> sẽ bị xóa vĩnh viễn cùng toàn bộ lịch trình và nhân sự liên quan. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEvent}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={deletingEvent} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deletingEvent ? 'Đang xóa...' : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!staffDeleteTarget} onOpenChange={v => !v && setStaffDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhân sự</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn xóa nhân sự này khỏi sự kiện không?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingStaff}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveStaff} disabled={deletingStaff} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deletingStaff ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

