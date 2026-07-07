import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Calendar, MapPin, ArrowLeft, Plus, ChevronDown, Paperclip, X, FileText,
  Trash2, Pencil, Users, CalendarClock, Wallet, Tag, CalendarDays,
  Mail,
} from 'lucide-react'
import {
  getEventById, createAssignment, getAssignmentsByEvent, deleteAssignment,
  deleteEvent, updateAssignment,
  deleteEventSession,
  getTasks,
  getEventRegistrations, updateEventAttendance,
  addAssignmentAttachments, removeAssignmentAttachment,
} from '../services/operationsApi'
import type {
  EventItem, AssignmentItem, TaskPriority,
  EventRegistrationItem, AttendanceStatus,
  AssignmentAttachment,
} from '../services/operations.types'
import { getClubs, getClubMembers } from '@/components/membership/services/clubApi'
import type { ClubListItem, MemberItem } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import EventAttachmentsSection from '../components/event/EventAttachmentsSection'
import RegistrationLinkCard from '../components/event/RegistrationLinkCard'
import EditEventModal from '../components/event/EditEventModal'
import AddEventSessionModal from '../components/event/AddEventSessionModal'
import { formatDate, formatVnd, inputStyle, labelStyle } from '../components/event/eventShared'
import { D } from '@/components/shared/managementTheme'
import { EventStatusBadge } from '../../shared/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

const ALLOWED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.rar'

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

function clubOverallStatus(items: AssignmentItem[]): string {
  if (items.every(a => a.status === 'Done')) return 'Done'
  if (items.some(a => a.status === 'InProgress' || a.status === 'Done')) return 'InProgress'
  return 'Pending'
}

function clubProgress(items: AssignmentItem[]): number {
  if (!items.length) return 0
  const score = items.reduce((s, a) => s + (a.status === 'Done' ? 100 : a.status === 'InProgress' ? 50 : 0), 0)
  return Math.round(score / items.length)
}

/* ─── File Picker ────────────────────────────────────────────────────────── */
function FilePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  function remove(i: number) { onChange(files.filter((_, idx) => idx !== i)) }
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    onChange([...files, ...Array.from(e.target.files ?? [])])
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

/* ─── Deadline helpers ───────────────────────────────────────────────────── */
function toDateInput(iso?: string): string {
  return iso ? iso.slice(0, 10) : ''
}

function deadlineHint(minDate?: string, maxDate?: string): string | null {
  if (!minDate && !maxDate) return null
  if (minDate && maxDate) return `Từ ${fmtDate(minDate)} đến ${fmtDate(maxDate)}`
  if (minDate) return `Từ ${fmtDate(minDate)} trở đi`
  return `Trước ${fmtDate(maxDate)}`
}

/* ─── Assign Task Panel ──────────────────────────────────────────────────── */
interface AssignForm { title: string; clubId: number | null; priority: TaskPriority; deadline: string; description: string }

function AssignTaskPanel({ eventId, clubs, eventStart, eventEnd, onCreated }: {
  eventId: number; clubs: ClubListItem[]; eventStart?: string; eventEnd?: string; onCreated: (a: AssignmentItem) => void
}) {
  const [form, setForm] = useState<AssignForm>({ title: '', clubId: null, priority: 'Medium', deadline: '', description: '' })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const minDate = toDateInput(eventStart)
  const maxDate = toDateInput(eventEnd)
  const hint = deadlineHint(minDate || undefined, maxDate || undefined)

  const pi: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 600, border: D.border, borderRadius: 8, outline: 'none', background: D.card, color: D.ink, boxSizing: 'border-box' }
  const pl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: D.inkMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }

  async function submit() {
    if (!form.title.trim()) { toast.error('Nhập tên phiếu giao việc'); return }
    if (!form.clubId) { toast.error('Chọn CLB để giao việc'); return }
    if (form.deadline) {
      if (minDate && form.deadline < minDate) { toast.error(`Deadline không được trước ngày bắt đầu sự kiện (${fmtDate(minDate)})`); return }
      if (maxDate && form.deadline > maxDate) { toast.error(`Deadline không được sau ngày kết thúc sự kiện (${fmtDate(maxDate)})`); return }
    }
    setSaving(true)
    try {
      const a = await createAssignment(eventId, form.clubId,
        { title: form.title.trim(), priority: form.priority, deadline: form.deadline || undefined, description: form.description || undefined },
        files.length > 0 ? files : undefined)
      toast.success('Đã tạo phiếu giao việc cho CLB')
      setForm({ title: '', clubId: null, priority: 'Medium', deadline: '', description: '' }); setFiles([])
      onCreated(a)
    } catch { toast.error('Không thể tạo phiếu giao việc') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: D.bg, border: D.border, borderRadius: D.radius, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: D.ink }}>Tạo phiếu giao việc cho CLB</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={pl}>Nội dung công việc *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={pi} placeholder="Mô tả công việc cần CLB thực hiện..." /></div>
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
          <div>
            <label style={pl}>Deadline {hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: D.indigo }}>({hint})</span>}</label>
            <input
              type="date"
              value={form.deadline}
              min={minDate || undefined}
              max={maxDate || undefined}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              style={{ ...pi, colorScheme: 'light' }}
            />
          </div>
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

/* ─── Edit Assignment Modal ──────────────────────────────────────────────── */
function EditAssignmentModal({ open, assignment, eventStart, eventEnd, onClose, onSaved }: {
  open: boolean; assignment: AssignmentItem; eventStart?: string; eventEnd?: string
  onClose: () => void; onSaved: (updated: AssignmentItem) => void
}) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' as TaskPriority, deadline: '' })
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [removingUrl, setRemovingUrl] = useState<string | null>(null)

  const minDate = toDateInput(eventStart)
  const maxDate = toDateInput(eventEnd)
  const hint = deadlineHint(minDate || undefined, maxDate || undefined)

  useEffect(() => {
    if (open) {
      setForm({
        title: assignment.title,
        description: assignment.description ?? '',
        priority: assignment.priority,
        deadline: assignment.deadline ? assignment.deadline.slice(0, 10) : '',
      })
      setAttachments(assignment.attachmentUrls)
      setNewFiles([])
      setRemovingUrl(null)
    }
  }, [open, assignment])

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  async function handleRemoveAttachment(url: string) {
    setRemovingUrl(url)
    try {
      const updated = await removeAssignmentAttachment(assignment.id, url)
      setAttachments(updated.attachmentUrls)
      onSaved(updated)
    } catch { toast.error('Không thể xóa file') }
    finally { setRemovingUrl(null) }
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Tên không được để trống'); return }
    if (form.deadline) {
      if (minDate && form.deadline < minDate) { toast.error(`Deadline không được trước ngày bắt đầu sự kiện (${fmtDate(minDate)})`); return }
      if (maxDate && form.deadline > maxDate) { toast.error(`Deadline không được sau ngày kết thúc sự kiện (${fmtDate(maxDate)})`); return }
    }
    setSaving(true)
    try {
      let updated = await updateAssignment(assignment.id, {
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        deadline: form.deadline || undefined,
      })
      if (newFiles.length > 0) {
        updated = await addAssignmentAttachments(assignment.id, newFiles)
      }
      toast.success('Đã cập nhật phiếu giao việc')
      onSaved(updated)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Không thể cập nhật')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 520, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Chỉnh sửa phiếu giao việc</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0', maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <label style={labelStyle}>Nội dung công việc <span style={{ color: D.red }}>*</span></label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Mô tả công việc cần CLB thực hiện..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Độ ưu tiên</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="Low">Thấp</option>
                <option value="Medium">Vừa</option>
                <option value="High">Cao</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                Deadline{hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: D.indigo, marginLeft: 4 }}>({hint})</span>}
              </label>
              <input type="date" value={form.deadline} min={minDate || undefined} max={maxDate || undefined}
                onChange={e => set('deadline', e.target.value)} style={{ ...inputStyle, colorScheme: 'light' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Mô tả / Yêu cầu chi tiết</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} placeholder="Mô tả chi tiết yêu cầu..." />
          </div>

          {/* ─── Attachments ─── */}
          <div>
            <label style={labelStyle}>
              Tệp đính kèm
              {attachments.length > 0 && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: D.inkMuted, marginLeft: 4 }}>({attachments.length})</span>}
            </label>
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {attachments.map((att, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 8, padding: '6px 10px' }}>
                    <FileText size={12} style={{ color: D.indigo, flexShrink: 0 }} />
                    <a href={att.url} target="_blank" rel="noreferrer"
                      style={{ flex: 1, fontSize: 12, fontWeight: 600, color: D.indigo, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </a>
                    <button type="button" onClick={() => handleRemoveAttachment(att.url)}
                      disabled={removingUrl === att.url}
                      title="Xóa file"
                      style={{ background: 'none', border: 'none', cursor: removingUrl === att.url ? 'not-allowed' : 'pointer', color: '#dc2626', padding: 2, flexShrink: 0, opacity: removingUrl === att.url ? 0.4 : 1 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <FilePicker files={newFiles} onChange={setNewFiles} />
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

/* ─── Assignment Card ────────────────────────────────────────────────────── */
function AssignmentCard({ assignment, onDelete, onEdit }: {
  assignment: AssignmentItem; onDelete?: () => void; onEdit?: () => void
}) {
  const pr = PRIORITY_MAP[assignment.priority]
  const st = STATUS_MAP[assignment.status] ?? STATUS_MAP.Pending
  const isOverdue = assignment.deadline && assignment.status !== 'Done'
    ? new Date(assignment.deadline) < new Date() : false

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
              <span style={{ fontSize: 10, color: isOverdue ? D.red : D.inkMuted, fontWeight: isOverdue ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>
                <CalendarDays size={10} />{fmtDate(assignment.deadline)}{isOverdue && ' · Quá hạn'}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.ink }}>{assignment.title}</p>
          {assignment.description && <p style={{ margin: '4px 0 0', fontSize: 12, color: D.inkMuted, lineHeight: 1.5 }}>{assignment.description}</p>}
          {assignment.attachmentUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {assignment.attachmentUrls.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#4f46e5', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 6, padding: '2px 7px', textDecoration: 'none' }}>
                  <FileText size={10} />{att.name}
                </a>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {onEdit && (
            <button type="button" onClick={onEdit} title="Chỉnh sửa phiếu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.indigo, padding: 4 }}>
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} title="Xóa phiếu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Assignments by Club (panel view) ───────────────────────────────────── */
function AssignmentsByClub({ assignments, onDelete, onEdit }: {
  assignments: AssignmentItem[]; onDelete?: (id: number) => void; onEdit?: (a: AssignmentItem) => void
}) {
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
              {items.map(a => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  onDelete={onDelete ? () => onDelete(a.id) : undefined}
                  onEdit={onEdit ? () => onEdit(a) : undefined}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── CLB Summary Table ──────────────────────────────────────────────────── */
interface ClubSummaryRowProps {
  clubId: number
  clubName: string
  logoUrl?: string
  items: AssignmentItem[]
  focal: MemberItem | null
  taskCount: number
}

function ClubSummaryRow({ clubId, clubName, logoUrl, items, focal, taskCount }: ClubSummaryRowProps) {
  const overallStatus = clubOverallStatus(items)
  const progress = clubProgress(items)
  const st = STATUS_MAP[overallStatus]
  const initials = clubName.slice(0, 2).toUpperCase()

  return (
    <tr style={{ borderBottom: D.borderLight }}>
      {/* CLB */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: D.borderLight, flexShrink: 0, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {logoUrl
              ? <img src={logoUrl} alt={clubName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 11, fontWeight: 900, color: D.indigo }}>{initials}</span>}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: D.ink }}>{clubName}</p>
            <p style={{ margin: '1px 0 0', fontSize: 10, color: D.inkMuted }}>CLB #{clubId}</p>
          </div>
        </div>
      </td>

      {/* Focal point */}
      <td style={{ padding: '14px 16px' }}>
        {focal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: D.indigo, flexShrink: 0, overflow: 'hidden', border: D.borderLight }}>
              {focal.avatarUrl
                ? <img src={focal.avatarUrl} alt={focal.fullName ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (focal.fullName ?? focal.email).charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{focal.fullName ?? focal.email}</p>
              {focal.email && (
                <a href={`mailto:${focal.email}`} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: D.indigo, textDecoration: 'none', marginTop: 1 }}>
                  <Mail size={9} /> {focal.email}
                </a>
              )}
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: D.inkMuted, fontStyle: 'italic' }}>Chưa có</span>
        )}
      </td>

      {/* Đầu việc lớn */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_MAP[a.priority].color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: D.inkDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{a.title}</span>
            </div>
          ))}
        </div>
      </td>

      {/* Việc con */}
      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: taskCount > 0 ? D.indigo : D.inkMuted }}>
          {taskCount > 0 ? taskCount : '—'}
        </span>
      </td>

      {/* Tiến độ */}
      <td style={{ padding: '14px 16px', minWidth: 120 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: progress === 100 ? '#10b981' : D.indigo, width: `${progress}%`, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: progress === 100 ? '#059669' : D.inkDim }}>{progress}%</span>
        </div>
      </td>

      {/* Tình trạng */}
      <td style={{ padding: '14px 16px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, borderRadius: D.pill, padding: '3px 10px', whiteSpace: 'nowrap' }}>
          {st.label}
        </span>
      </td>
    </tr>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function UniversityEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false

  const [event, setEvent]               = useState<EventItem | null>(null)
  const [assignments, setAssignments]   = useState<AssignmentItem[]>([])
  const [clubs, setClubs]               = useState<ClubListItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAssign, setShowAssign]     = useState(false)
  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [editOpen, setEditOpen]         = useState(false)
  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleting, setDeleting]         = useState(false)

  // Edit assignment
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null)

  // Per-club details: focal point and task count
  const [focalPoints, setFocalPoints]   = useState<Record<number, MemberItem | null>>({})
  const [taskCounts, setTaskCounts]     = useState<Record<number, number>>({})

  // Registrations / attendance
  const [registrations, setRegistrations] = useState<EventRegistrationItem[]>([])
  const [loadingRegs, setLoadingRegs]     = useState(false)

  const loadEvent = async () => {
    if (!id) return
    const ev = await getEventById(Number(id))
    setEvent(ev)
  }

  const loadAssignments = async (eventId: number) => {
    try { return await getAssignmentsByEvent(eventId) } catch { return [] }
  }

  const loadClubDetails = async (eventId: number, clubIds: number[]) => {
    if (!clubIds.length) return
    const [focalResults, taskResults] = await Promise.all([
      Promise.all(clubIds.map(async cid => {
        try {
          const members = await getClubMembers(cid)
          return { cid, focal: members.find(m => m.clubRole === 'CLUB_ADMIN') ?? null }
        } catch { return { cid, focal: null } }
      })),
      Promise.all(clubIds.map(async cid => {
        try {
          const result = await getTasks({ clubId: cid, eventId, pageSize: 1 })
          return { cid, count: result.totalCount }
        } catch { return { cid, count: 0 } }
      })),
    ])
    const fp: Record<number, MemberItem | null> = {}
    focalResults.forEach(({ cid, focal }) => { fp[cid] = focal })
    setFocalPoints(fp)
    const tc: Record<number, number> = {}
    taskResults.forEach(({ cid, count }) => { tc[cid] = count })
    setTaskCounts(tc)
  }

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      setLoadingRegs(true)
      try {
        const [ev, clubList] = await Promise.all([
          getEventById(Number(id)),
          isSuperAdmin ? getClubs() : Promise.resolve([] as ClubListItem[]),
        ])
        setEvent(ev); setClubs(clubList)
        const [asns, regs] = await Promise.all([
          loadAssignments(Number(id)),
          getEventRegistrations(Number(id)).catch(() => []),
        ])
        setAssignments(asns)
        setRegistrations(regs)
        setLoadingRegs(false)
        const uniqueClubIds = [...new Set(asns.map(a => a.clubId))]
        await loadClubDetails(Number(id), uniqueClubIds)
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
  async function handleUpdateAttendance(userId: string, status: AttendanceStatus) {
    if (!event) return
    try {
      await updateEventAttendance(event.id, userId, { attendance: status })
      setRegistrations(prev => prev.map(r => r.userId === userId ? { ...r, attendance: status } : r))
    } catch { toast.error('Không thể cập nhật điểm danh') }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Đang tải...</div>
  if (!event) return <div style={{ padding: 60, textAlign: 'center', color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Không tìm thấy sự kiện.</div>

  const sessions = event.sessions ?? []
  const backPath = isSuperAdmin ? '/admin/events' : '/dashboard'

  // Group assignments by club for the summary table
  const grouped = assignments.reduce<Record<number, AssignmentItem[]>>((acc, a) => {
    if (!acc[a.clubId]) acc[a.clubId] = []
    acc[a.clubId].push(a)
    return acc
  }, {})

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
    <div className="mgmt-page">

      {/* Back */}
      <button type="button" onClick={() => navigate(backPath)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Quay lại
      </button>

      {/* Header */}
      <div className="mgmt-page-header" style={{ marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: D.pill, padding: '3px 10px', letterSpacing: '.04em', flexShrink: 0 }}>TOÀN TRƯỜNG</span>
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
            <button type="button" onClick={() => setDeleteOpen(true)} style={{ ...outlineBtn, color: D.red, borderColor: '#fca5a5' }}><Trash2 size={13} /> Xóa</button>
            <button type="button" onClick={() => setEditOpen(true)} style={{ ...outlineBtn, background: D.ink, color: '#facc15', boxShadow: D.shadow() }}><Pencil size={13} /> Chỉnh sửa</button>
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
                <p style={{ margin: '8px 0 0', color: D.inkMuted, lineHeight: 1.6, paddingTop: 12, borderTop: D.borderLight, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{event.description}</p>
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
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ngân sách */}
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

          {/* Registration form link */}
          <RegistrationLinkCard
            eventId={event.id}
            canManage={isSuperAdmin}
            value={event.registrationLink ?? ''}
            onChange={link => setEvent(prev => prev ? { ...prev, registrationLink: link || undefined } : prev)}
          />
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
            <AssignTaskPanel
              eventId={event.id}
              clubs={clubs}
              eventStart={event.startTime}
              eventEnd={event.endTime}
              onCreated={async a => {
              const next = [a, ...assignments]
              setAssignments(next)
              setShowAssign(false)
              const newIds = [...new Set(next.map(x => x.clubId))]
              await loadClubDetails(event.id, newIds)
            }} />
          )}
          <AssignmentsByClub
            assignments={assignments}
            onDelete={isSuperAdmin ? handleDeleteAssignment : undefined}
            onEdit={isSuperAdmin ? setEditingAssignment : undefined}
          />
        </div>
      </div>

      {/* Tài liệu đính kèm */}
      <EventAttachmentsSection eventId={event.id} isManager={isSuperAdmin} />

      {/* Danh sách CLB gánh vác */}
      <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: D.borderLight }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: '#10b981' }} />
            Danh sách CLB tham chiến
            {Object.keys(grouped).length > 0 && (
              <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                {Object.keys(grouped).length} CLB
              </span>
            )}
          </h2>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
            <Users size={28} style={{ color: '#c4bfb0' }} />
            <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Chưa có CLB nào được phân công</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: D.bg }}>
                  {['Câu lạc bộ gánh vác', 'Đại diện đầu mối', 'Đầu việc lớn được giao', 'Việc con tự rã', 'Tiến độ', 'Tình trạng'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([clubIdStr, items]) => {
                  const cid = Number(clubIdStr)
                  const clubInfo = clubs.find(c => c.id === cid)
                  return (
                    <ClubSummaryRow
                      key={cid}
                      clubId={cid}
                      clubName={items[0].clubName ?? clubInfo?.name ?? `CLB #${cid}`}
                      logoUrl={clubInfo?.logoUrl}
                      items={items}
                      focal={focalPoints[cid] ?? null}
                      taskCount={taskCounts[cid] ?? 0}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
{/* Danh sách đăng ký & Điểm danh */}
      <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: D.borderLight, display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: '#10b981' }} />
            Danh sách đăng ký &amp; Điểm danh
          </h2>
          {registrations.length > 0 && (
            <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
              {registrations.length} người
            </span>
          )}
        </div>

        {loadingRegs ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: D.inkMuted, fontSize: 12 }}>Đang tải...</div>
        ) : registrations.length === 0 ? (
          <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Users size={28} style={{ color: '#c4bfb0' }} />
            <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Chưa có người đăng ký</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: D.bg }}>
                  {['Người tham gia', 'Email', 'Thời gian đăng ký', 'Điểm danh'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => {
                  const attColor = reg.attendance === 'CheckedIn'
                    ? { bg: '#d1fae5', color: '#065f46' }
                    : reg.attendance === 'Absent'
                    ? { bg: '#fee2e2', color: '#991b1b' }
                    : { bg: '#fef9c3', color: '#a16207' }
                  const attLabel = reg.attendance === 'CheckedIn' ? 'Đã điểm danh' : reg.attendance === 'Absent' ? 'Vắng mặt' : 'Chờ xác nhận'
                  return (
                    <tr key={reg.id} style={{ borderBottom: D.borderLight }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', border: D.borderLight, flexShrink: 0, overflow: 'hidden', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: D.indigo }}>
                            {reg.avatarUrl
                              ? <img src={reg.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : reg.userName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, color: D.ink }}>{reg.userName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: D.inkMuted, fontSize: 12 }}>{reg.email ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: D.inkMuted, fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(reg.registeredAt)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isSuperAdmin ? (
                          <select
                            value={reg.attendance}
                            onChange={e => handleUpdateAttendance(reg.userId, e.target.value as AttendanceStatus)}
                            style={{ fontSize: 11, fontWeight: 700, border: `1.5px solid ${attColor.color}40`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', background: attColor.bg, color: attColor.color, outline: 'none', fontFamily: 'inherit' }}
                          >
                            <option value="Pending">Chờ xác nhận</option>
                            <option value="CheckedIn">Đã điểm danh</option>
                            <option value="Absent">Vắng mặt</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: D.pill, background: attColor.bg, color: attColor.color }}>{attLabel}</span>
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
      {editOpen && <EditEventModal open={editOpen} event={event} onClose={() => setEditOpen(false)} onSaved={updated => setEvent(updated)} />}
      <AddEventSessionModal open={addSessionOpen} eventId={event.id} onClose={() => setAddSessionOpen(false)} onAdded={loadEvent} />
      {editingAssignment && (
        <EditAssignmentModal
          open={!!editingAssignment}
          assignment={editingAssignment}
          eventStart={event.startTime}
          eventEnd={event.endTime}
          onClose={() => setEditingAssignment(null)}
          onSaved={updated => {
            setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a))
            setEditingAssignment(null)
          }}
        />
      )}

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
