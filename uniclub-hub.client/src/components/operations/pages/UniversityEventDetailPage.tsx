import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Calendar, MapPin, ArrowLeft, Plus, ChevronDown, Paperclip, X, FileText,
  Trash2, Pencil, Users, CalendarClock, Wallet, UserPlus2, Tag, CalendarDays,
} from 'lucide-react'
import {
  getEventById, createAssignment, getAssignmentsByEvent, deleteAssignment,
  updateEvent, deleteEvent,
  addEventSession, deleteEventSession,
  getEventRegistrations, updateEventAttendance,
} from '../services/operationsApi'
import type {
  EventItem, AssignmentItem, TaskPriority, UpdateEventDto, EventStatus,
  CreateEventSessionDto, EventRegistrationItem, AttendanceStatus,
} from '../services/operations.types'
import { getClubs } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import EventAttachmentsSection from '../components/event/EventAttachmentsSection'
import { EventStatusBadge } from '../../shared/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  red: '#ef4444',
  indigo: '#4f46e5',
  amber: '#f59e0b',
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

const PRIORITY_MAP: Record<TaskPriority, { label: string; bg: string; color: string }> = {
  Low:    { label: 'Thấp', bg: '#f3f4f6', color: '#6b7280' },
  Medium: { label: 'Vừa',  bg: '#fef9c3', color: '#a16207' },
  High:   { label: 'Cao',  bg: '#fee2e2', color: '#dc2626' },
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  Pending:    { label: 'Chờ xử lý',  bg: '#fef9c3', color: '#a16207' },
  InProgress: { label: 'Đang xử lý', bg: '#dbeafe', color: '#1d4ed8' },
  Done:       { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d' },
}

const ATTENDANCE_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string }> = {
  Pending:   { label: 'Chờ xác nhận', bg: '#f3f4f6', text: '#374151' },
  CheckedIn: { label: 'Đã điểm danh', bg: '#d1fae5', text: '#065f46' },
  Absent:    { label: 'Vắng mặt',     bg: '#fee2e2', text: '#991b1b' },
}

const ALLOWED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.rar'

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatVnd(amount?: number): string {
  if (amount == null) return 'Chưa xác định'
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '')) return '🖼️'
  if (['zip', 'rar'].includes(ext ?? '')) return '🗜️'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext ?? '')) return '📝'
  if (['xls', 'xlsx'].includes(ext ?? '')) return '📊'
  return '📎'
}

/* ─── Edit Modal ─────────────────────────────────────────────────────────── */
type EventForm = {
  name: string; description: string; location: string
  startTime: string; endTime: string; status: EventStatus
  budget?: number; category: string; summary: string
}

function EditModal({ open, event, onClose, onSaved }: {
  open: boolean; event: EventItem; onClose: () => void; onSaved: (u: EventItem) => void
}) {
  const [form, setForm] = useState<EventForm>({
    name: '', description: '', location: '', startTime: '', endTime: '', status: 'Draft', category: '', summary: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({
      name: event.name,
      description: event.description ?? '',
      location: event.location ?? '',
      startTime: event.startTime ? event.startTime.slice(0, 16) : '',
      endTime: event.endTime ? event.endTime.slice(0, 16) : '',
      maxParticipants: event.maxParticipants,
      status: event.status,
      budget: event.budget,
      category: event.category ?? '',
      summary: event.summary ?? '',
    } as unknown as EventForm)
  }, [open, event])

  const set = (field: keyof EventForm, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    setSaving(true)
    try {
      const dto: UpdateEventDto = {
        name: form.name, description: form.description, location: form.location,
        startTime: form.startTime || undefined, endTime: form.endTime || undefined,
        maxParticipants: (form as unknown as { maxParticipants?: number }).maxParticipants,
        status: form.status, budget: form.budget,
        category: form.category || undefined, summary: form.summary || undefined,
      }
      const updated = await updateEvent(event.id, dto)
      toast.success('Đã cập nhật sự kiện'); onSaved(updated); onClose()
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 520, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16, fontWeight: 900, color: D.ink }}>Chỉnh sửa sự kiện</DialogTitle>
        </DialogHeader>
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
            <div>
              <label style={labelStyle}>Số người tối đa</label>
              <input style={inputStyle} type="number" min={1}
                value={(form as unknown as { maxParticipants?: number }).maxParticipants ?? ''}
                onChange={e => set('maxParticipants' as keyof EventForm, e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Không giới hạn" />
            </div>
            <div><label style={labelStyle}>Danh mục</label><input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Văn hoá, Học thuật..." /></div>
          </div>
          <div><label style={labelStyle}>Ngân sách (VNĐ)</label><input style={inputStyle} type="number" min={0} value={form.budget ?? ''} onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)} placeholder="Chưa xác định" /></div>
          <div>
            <label style={labelStyle}>Kết quả / Tổng kết</label>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: 80 }} rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Ghi lại kết quả, số lượng tham dự thực tế..." />
          </div>
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

/* ─── Add Session Modal ──────────────────────────────────────────────────── */
function AddSessionModal({ open, eventId, onClose, onAdded }: {
  open: boolean; eventId: number; onClose: () => void; onAdded: () => void
}) {
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

/* ─── File Picker ────────────────────────────────────────────────────────── */
function FilePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  function remove(i: number) { onChange(files.filter((_, idx) => idx !== i)) }
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    onChange([...files, ...picked])
    if (ref.current) ref.current.value = ''
  }
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: D.inkMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tài liệu đính kèm</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {files.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 7, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#4f46e5' }}>
            <span>{fileIcon(f.name)}</span>
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, lineHeight: 1 }}><X size={10} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => ref.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: D.inkMuted, background: 'none', border: '1.5px dashed #ccc', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
        <Paperclip size={12} /> Đính kèm file
      </button>
      <input ref={ref} type="file" multiple accept={ALLOWED_TYPES} onChange={pick} style={{ display: 'none' }} />
    </div>
  )
}

/* ─── Assign Task Panel ──────────────────────────────────────────────────── */
interface AssignForm {
  title: string; clubId: number | null; priority: TaskPriority; deadline: string; description: string
}

function AssignTaskPanel({ eventId, clubs, onCreated }: {
  eventId: number; clubs: ClubListItem[]; onCreated: (a: AssignmentItem) => void
}) {
  const [form, setForm] = useState<AssignForm>({ title: '', clubId: null, priority: 'Medium', deadline: '', description: '' })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const pi: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 600,
    border: D.border, borderRadius: 8, outline: 'none',
    background: D.card, color: D.ink, boxSizing: 'border-box',
  }
  const pl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 800, color: D.inkMuted,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em',
  }

  async function submit() {
    if (!form.title.trim()) { toast.error('Nhập tên phiếu giao việc'); return }
    if (!form.clubId) { toast.error('Chọn CLB để giao việc'); return }
    setSaving(true)
    try {
      const a = await createAssignment(eventId, form.clubId,
        { title: form.title.trim(), priority: form.priority, deadline: form.deadline || undefined, description: form.description || undefined },
        files.length > 0 ? files : undefined)
      toast.success('Đã tạo phiếu giao việc cho CLB')
      setForm({ title: '', clubId: null, priority: 'Medium', deadline: '', description: '' })
      setFiles([])
      onCreated(a)
    } catch { toast.error('Không thể tạo phiếu giao việc') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: D.bg, border: D.border, borderRadius: D.radius, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: D.ink }}>Tạo phiếu giao việc cho CLB</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={pl}>Tên công việc *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={pi} placeholder="Nhập tên công việc..." /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={pl}>CLB nhận việc *</label>
            <select value={form.clubId ?? ''} onChange={e => setForm(f => ({ ...f, clubId: Number(e.target.value) || null }))} style={{ ...pi, cursor: 'pointer' }}>
              <option value="">Chọn CLB...</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={pl}>Độ ưu tiên</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))} style={{ ...pi, cursor: 'pointer' }}>
              <option value="Low">Thấp</option><option value="Medium">Vừa</option><option value="High">Cao</option>
            </select>
          </div>
          <div><label style={pl}>Deadline</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={pi} /></div>
        </div>
        <div><label style={pl}>Mô tả / Yêu cầu chi tiết</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...pi, resize: 'vertical' }} /></div>
        <FilePicker files={files} onChange={setFiles} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={submit} disabled={saving} style={{ padding: '8px 22px', fontSize: 13, fontWeight: 800, border: D.border, borderRadius: 8, background: D.ink, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: D.shadow() }}>
            {saving ? 'Đang giao...' : 'Tạo phiếu giao việc'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Assignment Card ────────────────────────────────────────────────────── */
function AssignmentCard({ assignment, onDelete }: { assignment: AssignmentItem; onDelete?: () => void }) {
  const pr = PRIORITY_MAP[assignment.priority]
  const st = STATUS_MAP[assignment.status] ?? STATUS_MAP.Pending
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: D.pill, padding: '1px 8px' }}>
              {assignment.clubName ?? `CLB #${assignment.clubId}`}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: pr.bg, color: pr.color, borderRadius: D.pill, padding: '1px 7px' }}>{pr.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, borderRadius: D.pill, padding: '1px 7px' }}>{st.label}</span>
            {assignment.deadline && (
              <span style={{ fontSize: 10, color: D.inkMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <CalendarDays size={10} />{fmtDate(assignment.deadline)}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.ink }}>{assignment.title}</p>
          {assignment.description && <p style={{ margin: '4px 0 0', fontSize: 12, color: D.inkMuted, lineHeight: 1.5 }}>{assignment.description}</p>}
          {assignment.attachmentUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {assignment.attachmentUrls.map((url, i) => {
                const name = url.split('/').pop() ?? `file-${i + 1}`
                return (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#4f46e5', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 6, padding: '2px 7px', textDecoration: 'none' }}>
                    <FileText size={10} />{name}
                  </a>
                )
              })}
            </div>
          )}
        </div>
        {onDelete && (
          <button type="button" onClick={onDelete} title="Xóa phiếu" style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Assignments by Club ────────────────────────────────────────────────── */
function AssignmentsByClub({ assignments, onDelete }: { assignments: AssignmentItem[]; onDelete?: (id: number) => void }) {
  const grouped = assignments.reduce<Record<number, AssignmentItem[]>>((acc, a) => {
    if (!acc[a.clubId]) acc[a.clubId] = []
    acc[a.clubId].push(a)
    return acc
  }, {})

  if (assignments.length === 0) {
    return (
      <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Users size={28} style={{ color: '#c4bfb0' }} />
        <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Chưa có phiếu giao việc nào</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(grouped).map(([clubIdStr, items]) => {
        const cid = Number(clubIdStr)
        return (
          <div key={cid} style={{ border: D.border, borderRadius: D.radius, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: D.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{items[0].clubName ?? `CLB #${cid}`}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>{items.length} phiếu</span>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: D.bg }}>
              {items.map(a => <AssignmentCard key={a.id} assignment={a} onDelete={onDelete ? () => onDelete(a.id) : undefined} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function UniversityEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false

  const [event, setEvent]                 = useState<EventItem | null>(null)
  const [assignments, setAssignments]     = useState<AssignmentItem[]>([])
  const [clubs, setClubs]                 = useState<ClubListItem[]>([])
  const [registrations, setRegistrations] = useState<EventRegistrationItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [showAssign, setShowAssign]       = useState(false)
  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [editOpen, setEditOpen]           = useState(false)
  const [deleteOpen, setDeleteOpen]       = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [updatingAttendance, setUpdatingAttendance] = useState<string | null>(null)

  const loadEvent = async () => {
    if (!id) return
    const ev = await getEventById(Number(id))
    setEvent(ev)
  }

  const loadAssignments = async (eventId: number) => {
    try { setAssignments(await getAssignmentsByEvent(eventId)) } catch { /* non-fatal */ }
  }

  const loadRegistrations = async (eventId: number) => {
    try { setRegistrations(await getEventRegistrations(eventId)) } catch { /* non-fatal */ }
  }

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      try {
        const [ev, clubList, regs] = await Promise.all([
          getEventById(Number(id)),
          isSuperAdmin ? getClubs() : Promise.resolve([] as ClubListItem[]),
          getEventRegistrations(Number(id)),
        ])
        setEvent(ev); setClubs(clubList); setRegistrations(regs)
        await loadAssignments(Number(id))
      } catch { toast.error('Không thể tải thông tin sự kiện') }
      finally { setLoading(false) }
    }
    load()
  }, [id, isSuperAdmin])

  async function handleDeleteAssignment(assignmentId: number) {
    if (!confirm('Xóa phiếu giao việc này?')) return
    try {
      await deleteAssignment(assignmentId)
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      toast.success('Đã xóa phiếu giao việc')
    } catch { toast.error('Không thể xóa') }
  }

  async function handleDeleteSession(sessionId: number) {
    if (!event) return
    try { await deleteEventSession(event.id, sessionId); toast.success('Đã xóa mục lịch trình'); await loadEvent() }
    catch { toast.error('Không thể xóa mục này') }
  }

  async function handleDeleteEvent() {
    if (!event) return
    setDeleting(true)
    try { await deleteEvent(event.id); toast.success('Đã xóa sự kiện'); navigate('/admin/events') }
    catch { toast.error('Không thể xóa sự kiện này'); setDeleting(false); setDeleteOpen(false) }
  }

  async function handleUpdateAttendance(userId: string, attendance: AttendanceStatus) {
    if (!event) return
    setUpdatingAttendance(userId)
    try { await updateEventAttendance(event.id, userId, { attendance }); await loadRegistrations(event.id) }
    catch { toast.error('Không thể cập nhật điểm danh') }
    finally { setUpdatingAttendance(null) }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Đang tải...</div>
  if (!event) return <div style={{ padding: 60, textAlign: 'center', color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Không tìm thấy sự kiện.</div>

  const sessions  = event.sessions ?? []
  const backPath  = isSuperAdmin ? '/admin/events' : '/dashboard'
  const outlineBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    fontSize: 12, fontWeight: 700, border: D.border, borderRadius: D.pill,
    background: D.card, color: D.inkDim, cursor: 'pointer',
    boxShadow: D.shadow(2, 2), fontFamily: "'Be Vietnam Pro', sans-serif",
  }
  const cardStyle: React.CSSProperties = {
    background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20,
  }

  return (
    <div style={{ padding: '28px 32px', background: D.bg, minHeight: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Back */}
      <button type="button" onClick={() => navigate(backPath)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Quay lại
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: D.pill, padding: '3px 10px', letterSpacing: '.04em', flexShrink: 0 }}>
              TOÀN TRƯỜNG
            </span>
            <EventStatusBadge status={event.status} />
            {event.category && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkMuted, background: D.bg, border: D.borderLight, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                <Tag size={9} /> {event.category}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: D.ink, margin: 0, letterSpacing: '-.025em' }}>{event.name}</h1>
        </div>
        {isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={() => setDeleteOpen(true)} style={{ ...outlineBtn, color: D.red, borderColor: '#fca5a5' }}>
              <Trash2 size={13} /> Xóa
            </button>
            <button type="button" onClick={() => setEditOpen(true)} style={{ ...outlineBtn, background: D.ink, color: '#facc15', boxShadow: D.shadow() }}>
              <Pencil size={13} /> Chỉnh sửa
            </button>
          </div>
        )}
      </div>

      {/* 2-column body */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Thông tin tổng quan */}
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
                <p style={{ margin: '8px 0 0', color: D.inkMuted, lineHeight: 1.6, paddingTop: 12, borderTop: D.borderLight, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {event.description}
                </p>
              )}
              {event.summary && (
                <div style={{ margin: '10px 0 0', paddingTop: 12, borderTop: D.borderLight }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 6px' }}>Kết quả / Tổng kết</p>
                  <p style={{ fontSize: 13, color: D.inkDim, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{event.summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lịch trình hoạt động */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={13} style={{ color: D.indigo }} />
                Lịch trình hoạt động
                {sessions.length > 0 && <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{sessions.length}</span>}
              </h2>
              {isSuperAdmin && (
                <button type="button" onClick={() => setAddSessionOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Plus size={12} /> Thêm mục
                </button>
              )}
            </div>
            {sessions.length === 0 ? (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={28} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>
                  {isSuperAdmin ? 'Chưa có lịch trình — nhấn "Thêm mục" để bắt đầu' : 'Chưa có lịch trình hoạt động'}
                </p>
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
                      {isSuperAdmin && (
                        <button type="button" aria-label="Xóa mục lịch trình" onClick={() => handleDeleteSession(s.id)}
                          style={{ padding: 4, color: D.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
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

        {/* Right sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={12} style={{ color: D.amber }} /> Ngân sách phân bổ
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
        </div>
      </div>

      {/* Phân công công việc theo CLB (full width) */}
      <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: D.indigo }} />
            Phân công công việc theo CLB
            {assignments.length > 0 && <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{assignments.length}</span>}
          </h2>
          {isSuperAdmin && (
            <button type="button" onClick={() => setShowAssign(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 11, fontWeight: 800, border: D.border, borderRadius: 8, background: showAssign ? D.ink : D.card, color: showAssign ? '#fff' : D.ink, cursor: 'pointer', boxShadow: D.shadow(2, 2), fontFamily: 'inherit' }}>
              {showAssign ? <><ChevronDown size={12} /> Thu gọn</> : <><Plus size={12} /> Tạo phiếu giao việc</>}
            </button>
          )}
        </div>
        <div style={{ padding: 20 }}>
          {showAssign && isSuperAdmin && (
            <AssignTaskPanel eventId={event.id} clubs={clubs} onCreated={async a => {
              setAssignments(prev => [a, ...prev])
              setShowAssign(false)
              await loadAssignments(event.id)
            }} />
          )}
          <AssignmentsByClub assignments={assignments} onDelete={isSuperAdmin ? handleDeleteAssignment : undefined} />
        </div>
      </div>

      {/* Tài liệu đính kèm */}
      <EventAttachmentsSection eventId={event.id} isManager={isSuperAdmin} />

      {/* Danh sách người tham gia */}
      <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: D.borderLight }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus2 size={14} style={{ color: '#10b981' }} />
            Danh sách người tham gia
            {registrations.length > 0 && <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{registrations.length}</span>}
          </h2>
        </div>
        {registrations.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
            <UserPlus2 size={28} style={{ color: '#c4bfb0' }} />
            <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Chưa có người tham gia nào đăng ký</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: D.bg }}>
                  {['Người tham gia', 'Email', 'Ngày đăng ký', 'Điểm danh'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => {
                  const att = ATTENDANCE_CONFIG[reg.attendance] ?? ATTENDANCE_CONFIG.Pending
                  return (
                    <tr key={reg.id} style={{ borderBottom: D.borderLight }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#065f46', flexShrink: 0, overflow: 'hidden', border: D.borderLight }}>
                            {reg.avatarUrl ? <img src={reg.avatarUrl} alt={reg.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : reg.userName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, color: D.ink }}>{reg.userName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: D.inkMuted, fontSize: 12 }}>{reg.email ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: D.inkMuted, fontSize: 12 }}>{new Date(reg.registeredAt).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isSuperAdmin ? (
                          <select aria-label="Điểm danh" disabled={updatingAttendance === reg.userId} value={reg.attendance}
                            onChange={e => handleUpdateAttendance(reg.userId, e.target.value as AttendanceStatus)}
                            style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, border: '1.5px solid #c4bfb0', background: att.bg, color: att.text, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                            <option value="Pending">Chờ xác nhận</option>
                            <option value="CheckedIn">Đã điểm danh</option>
                            <option value="Absent">Vắng mặt</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: att.bg, color: att.text }}>{att.label}</span>
                        )}
                      </td>
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

      <AlertDialog open={deleteOpen} onOpenChange={v => !v && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Sự kiện <span style={{ fontWeight: 700, color: D.ink }}>"{event.name}"</span> sẽ bị xóa vĩnh viễn cùng toàn bộ phiếu giao việc liên quan. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deleting ? 'Đang xóa...' : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
