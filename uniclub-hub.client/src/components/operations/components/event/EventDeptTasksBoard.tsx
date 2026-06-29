import { useEffect, useState, useMemo, useRef } from 'react'
import { createKanbanConnection } from '@/lib/kanbanHub'
import { SIGNALR_EVENTS, HUB_METHODS } from '@/lib/signalrEvents'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Grid2x2, Plus, Briefcase, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { getDepartments } from '@/components/membership/services/clubApi'
import type { DepartmentItem } from '@/components/membership/services/club.types'
import { getTasks, createTask, updateTask, deleteTask, updateTaskStatus } from '../../services/operationsApi'
import type { TaskItem, TaskPriority, TaskStatus, UpdateTaskDto, UpdateTaskStatusDto } from '../../services/operations.types'
import { TaskStatusBadge } from '../../../shared/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { D } from '@/components/shared/managementTheme'

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

const PRIORITY_PILL: Record<string, { label: string; bg: string; text: string }> = {
  High:   { label: 'Cao',  bg: '#fee2e2', text: '#991b1b' },
  Medium: { label: 'Vừa', bg: '#fef3c7', text: '#92400e' },
  Low:    { label: 'Thấp', bg: '#dbeafe', text: '#1e40af' },
}

const TASK_STATUS_MAP: Record<TaskStatus, { label: string; bg: string; color: string; border: string }> = {
  Todo:      { label: 'Cần làm',    bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  Doing:     { label: 'Đang làm',   bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  Reviewing: { label: 'Đang duyệt', bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  Done:      { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
}
const TASK_STATUS_ORDER: TaskStatus[] = ['Todo', 'Doing', 'Reviewing', 'Done']

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function toDateInput(iso?: string): string {
  return iso ? iso.slice(0, 10) : ''
}
function deadlineHint(min?: string, max?: string): string | null {
  if (!min && !max) return null
  if (min && max) return `${fmtDate(min)} → ${fmtDate(max)}`
  if (min) return `Từ ${fmtDate(min)}`
  return `Đến ${fmtDate(max)}`
}

/* ─── Edit Task Modal ────────────────────────────────────────────────────── */
function EditTaskModal({ open, task, minDate, maxDate, onClose, onSaved }: {
  open: boolean; task: TaskItem; minDate?: string; maxDate?: string
  onClose: () => void; onSaved: (updated: TaskItem) => void
}) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' as TaskPriority, deadline: '' })
  const [saving, setSaving] = useState(false)
  const hint = deadlineHint(minDate, maxDate)

  useEffect(() => {
    if (open) setForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      deadline: task.deadline ? task.deadline.slice(0, 10) : '',
    })
  }, [open, task])

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Tên không được để trống'); return }
    if (form.deadline) {
      if (minDate && form.deadline < minDate) { toast.error(`Deadline không được trước ngày bắt đầu sự kiện (${fmtDate(minDate)})`); return }
      if (maxDate && form.deadline > maxDate) { toast.error(`Deadline không được sau ngày kết thúc sự kiện (${fmtDate(maxDate)})`); return }
    }
    setSaving(true)
    try {
      const dto: UpdateTaskDto = {
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        deadline: form.deadline || undefined,
      }
      const updated = await updateTask(task.id, dto)
      toast.success('Đã cập nhật công việc')
      onSaved(updated); onClose()
    } catch {
      toast.error('Không thể cập nhật')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 460, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Chỉnh sửa công việc</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div>
            <label style={labelStyle}>Tên công việc <span style={{ color: D.red }}>*</span></label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Độ ưu tiên</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)}>
                <option value="Low">Thấp</option>
                <option value="Medium">Vừa</option>
                <option value="High">Cao</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                Deadline{hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: D.indigo, marginLeft: 4 }}>({hint})</span>}
              </label>
              <input
                type="date"
                value={form.deadline}
                min={minDate}
                max={maxDate}
                onChange={e => set('deadline', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'light' }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Mô tả</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              placeholder="Yêu cầu chi tiết, ghi chú..."
            />
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

/* ─── Inline Status Dropdown ─────────────────────────────────────────────── */
function TaskStatusDropdown({ task, isManager, onChange }: {
  task: TaskItem; isManager: boolean; onChange: (id: number, status: TaskStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const st = TASK_STATUS_MAP[task.status]

  if (!isManager) return <TaskStatusBadge status={task.status} />

  async function changeStatus(next: TaskStatus) {
    if (next === task.status) { setOpen(false); return }
    setUpdating(true)
    try {
      const dto: UpdateTaskStatusDto = {
        status: next,
        progress: next === 'Done' ? 100 : next === 'Reviewing' ? 80 : next === 'Doing' ? 50 : 0,
      }
      await updateTaskStatus(task.id, dto)
      onChange(task.id, next)
      toast.success('Đã cập nhật trạng thái')
    } catch { toast.error('Không thể cập nhật') }
    finally { setUpdating(false); setOpen(false) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={updating}
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1.5px solid ${st.border}`, borderRadius: D.pill, cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1, whiteSpace: 'nowrap' }}
      >
        {st.label} <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 50, background: D.card, border: D.border, borderRadius: 10, boxShadow: D.shadow(), overflow: 'hidden', minWidth: 130 }}>
            {TASK_STATUS_ORDER.map(s => {
              const c = TASK_STATUS_MAP[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 700, background: s === task.status ? c.bg : 'transparent', color: c.color, border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  {c.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface EventDeptTasksBoardProps {
  eventId: number
  clubId: number
  isManager: boolean
  eventStart?: string
  eventEnd?: string
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function EventDeptTasksBoard({ eventId, clubId, isManager, eventStart, eventEnd }: EventDeptTasksBoardProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [tasks, setTasks]             = useState<TaskItem[]>([])
  const [loading, setLoading]         = useState(true)

  // Create form
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)
  const [form, setForm] = useState<{ title: string; description: string; priority: TaskPriority; deadline: string }>
    ({ title: '', description: '', priority: 'Medium', deadline: '' })
  const [saving, setSaving]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Edit modal
  const [editTask, setEditTask] = useState<TaskItem | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TaskItem | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const minDate = toDateInput(eventStart)
  const maxDate = toDateInput(eventEnd)
  const hint = deadlineHint(minDate || undefined, maxDate || undefined)

  const loadData = async (cancelled?: { v: boolean }) => {
    setLoading(true)
    try {
      const [depts, taskResult] = await Promise.all([
        getDepartments(clubId),
        getTasks({ clubId, eventId, pageSize: 200 }),
      ])
      if (cancelled?.v) return
      setDepartments(depts)
      setTasks(taskResult.items)
    } catch {
      toast.error('Không thể tải dữ liệu phân công')
    } finally {
      if (!cancelled?.v) setLoading(false)
    }
  }

  useEffect(() => {
    const cancelled = { v: false }
    loadData(cancelled)
    return () => { cancelled.v = true }
  }, [clubId, eventId])

  // SignalR — reload when backend cascade-deletes tasks for this event
  const hubRef = useRef<ReturnType<typeof createKanbanConnection> | null>(null)
  useEffect(() => {
    const conn = createKanbanConnection()
    hubRef.current = conn

    conn.on(SIGNALR_EVENTS.EVENT_TASKS_CLEANED, (clubIdReceived: number, eventIdReceived: number) => {
      if (clubIdReceived === clubId && eventIdReceived === eventId) {
        setTasks([])
        toast.info('Sự kiện đã chuyển trạng thái — toàn bộ công việc đã bị xóa.')
      }
    })

    conn.start()
      .then(() => conn.invoke(HUB_METHODS.JOIN_CLUB, clubId))
      .catch(() => {/* non-fatal — offline or dev */ })

    return () => {
      conn.invoke(HUB_METHODS.LEAVE_CLUB, clubId).catch(() => {})
      conn.stop()
    }
  }, [clubId, eventId])

  const tasksByDept = useMemo(() => {
    const map = new Map<number | null, TaskItem[]>()
    for (const t of tasks) {
      const key = t.departmentId ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const doneTasks  = tasks.filter(t => t.status === 'Done').length
  const totalTasks = tasks.length

  // ── Handlers ────────────────────────────────────────────────────────────

  const openForm = (deptId: number) => {
    setActiveDeptId(deptId)
    setForm({ title: '', description: '', priority: 'Medium', deadline: '' })
    setFormError(null)
  }

  const handleCreate = async (deptId: number) => {
    if (!form.title.trim()) { setFormError('Tên công việc không được để trống'); return }
    if (form.deadline) {
      if (minDate && form.deadline < minDate) { setFormError(`Deadline không được trước ngày bắt đầu sự kiện (${fmtDate(minDate)})`); return }
      if (maxDate && form.deadline > maxDate) { setFormError(`Deadline không được sau ngày kết thúc sự kiện (${fmtDate(maxDate)})`); return }
    }
    setSaving(true); setFormError(null)
    try {
      const created = await createTask(clubId, {
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        deadline: form.deadline || undefined,
        eventId,
        departmentId: deptId,
      })
      toast.success('Đã tạo công việc')
      setTasks(prev => [created, ...prev])
      setActiveDeptId(null)
      setForm({ title: '', description: '', priority: 'Medium', deadline: '' })
    } catch {
      toast.error('Không thể tạo công việc')
    } finally { setSaving(false) }
  }

  const handleStatusChange = (taskId: number, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
  }

  const handleTaskSaved = (updated: TaskItem) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTask(deleteTarget.id)
      setTasks(prev => prev.filter(t => t.id !== deleteTarget.id))
      toast.success('Đã xóa công việc')
      setDeleteTarget(null)
    } catch {
      toast.error('Không thể xóa công việc')
    } finally { setDeleting(false) }
  }

  // ── Styles ──────────────────────────────────────────────────────────────

  const primaryBtnStyle: React.CSSProperties = {
    padding: '7px 16px', fontSize: 12, fontWeight: 900, border: D.border,
    borderRadius: D.pill, background: D.ink, color: D.lemon,
    cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2),
    fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
  }
  const outlineBtnStyle: React.CSSProperties = {
    padding: '7px 14px', fontSize: 12, fontWeight: 700, border: D.border,
    borderRadius: D.pill, background: D.card, color: D.inkDim,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  const orphanTasks = tasksByDept.get(null) ?? []

  return (
    <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Grid2x2 size={14} style={{ color: D.indigo }} />
          Phân công công việc theo Ban
          {totalTasks > 0 && (
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
              {totalTasks} việc
            </span>
          )}
        </h2>
        {totalTasks > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100, height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: '#10b981', width: `${Math.round(doneTasks / totalTasks * 100)}%`, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, whiteSpace: 'nowrap' }}>
              {doneTasks}/{totalTasks} hoàn thành
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: D.inkMuted, fontSize: 13 }}>
          Đang tải...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>

          {departments.length === 0 && (
            <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Briefcase size={24} style={{ color: '#c4bfb0' }} />
              <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>Câu lạc bộ chưa có ban nào. Vui lòng tạo ban trước.</p>
            </div>
          )}

          {departments.map(dept => {
            const deptTasks = tasksByDept.get(dept.id) ?? []
            const isActive  = activeDeptId === dept.id
            const deptDone  = deptTasks.filter(t => t.status === 'Done').length

            return (
              <div key={dept.id} style={{ border: D.border, borderRadius: D.radius, background: D.card, boxShadow: D.shadow(2, 2) }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: deptTasks.length > 0 || isActive ? D.borderLight : 'none', background: '#fafaf9', borderRadius: isActive || deptTasks.length > 0 ? `${D.radius}px ${D.radius}px 0 0` : D.radius }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: D.ink, whiteSpace: 'nowrap' }}>{dept.name}</span>
                    {dept.deptLeadName && (
                      <span style={{ fontSize: 11, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        · {dept.deptLeadName}
                      </span>
                    )}
                    <span style={{ fontSize: 10, background: deptTasks.length > 0 ? '#ede9fe' : '#f3f4f6', color: deptTasks.length > 0 ? D.indigo : D.inkMuted, padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                      {deptTasks.length} việc
                    </span>
                    {deptTasks.length > 0 && (
                      <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {deptDone} xong
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Link
                      to={`/clubs/${clubId}/operations?view=board&deptId=${dept.id}`}
                      style={{ fontSize: 11, fontWeight: 700, color: D.indigo, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      → Xem Board
                    </Link>
                    {isManager && !isActive && (
                      <button
                        type="button"
                        onClick={() => openForm(dept.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Plus size={11} /> Giao việc
                      </button>
                    )}
                  </div>
                </div>

                {/* Task rows */}
                {deptTasks.length > 0 && (
                  <div>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 72px 100px auto', gap: 8, padding: '6px 16px', background: D.bg, borderBottom: D.borderLight }}>
                      {['Công việc', 'Trạng thái', 'Ưu tiên', 'Deadline', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</span>
                      ))}
                    </div>
                    {deptTasks.map(t => {
                      const pri = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Medium
                      const isOverdue = t.deadline && t.status !== 'Done' ? new Date(t.deadline) < new Date() : false
                      return (
                        <div
                          key={t.id}
                          style={{ display: 'grid', gridTemplateColumns: '1fr 130px 72px 100px auto', gap: 8, alignItems: 'center', padding: '9px 16px', borderBottom: D.borderLight, background: t.status === 'Done' ? '#f0fdf4' : 'transparent', fontSize: 13 }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 600, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                            {t.description && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                            )}
                            {t.assigneeName && (
                              <p style={{ margin: '2px 0 0', fontSize: 10, color: D.inkMuted }}>→ {t.assigneeName}</p>
                            )}
                          </div>
                          <TaskStatusDropdown task={t} isManager={isManager} onChange={handleStatusChange} />
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: pri.bg, color: pri.text, whiteSpace: 'nowrap', justifySelf: 'start' }}>{pri.label}</span>
                          <span style={{ fontSize: 11, color: isOverdue ? D.red : D.inkMuted, fontWeight: isOverdue ? 700 : 400, whiteSpace: 'nowrap' }}>
                            {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}
                            {isOverdue && ' ⚠'}
                          </span>
                          {isManager ? (
                            <div style={{ display: 'flex', gap: 2, justifySelf: 'end' }}>
                              <button type="button" onClick={() => setEditTask(t)} title="Chỉnh sửa" style={{ padding: 4, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Pencil size={12} />
                              </button>
                              <button type="button" onClick={() => setDeleteTarget(t)} title="Xóa" style={{ padding: 4, color: D.red, background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : <span />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty dept message (only when form is not active) */}
                {deptTasks.length === 0 && !isActive && (
                  <div style={{ padding: '14px 20px', color: D.inkMuted, fontSize: 12, fontStyle: 'italic' }}>
                    Chưa có công việc nào được giao trong sự kiện này.
                  </div>
                )}

                {/* Inline create form */}
                {isActive && (
                  <div style={{ padding: '14px 16px', background: D.bg, borderTop: deptTasks.length > 0 ? D.borderLight : 'none' }}>
                    {formError && (
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: D.red, fontWeight: 600 }}>{formError}</p>
                    )}
                    <input
                      autoFocus
                      placeholder="Tên công việc *"
                      value={form.title}
                      onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(null) }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleCreate(dept.id) }}
                      style={inputStyle}
                    />
                    <textarea
                      placeholder="Mô tả / Yêu cầu chi tiết (tùy chọn)"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', marginTop: 8 }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <select
                        aria-label="Mức độ ưu tiên"
                        value={form.priority}
                        onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="Low">Ưu tiên: Thấp</option>
                        <option value="Medium">Ưu tiên: Vừa</option>
                        <option value="High">Ưu tiên: Cao</option>
                      </select>
                      <div>
                        {hint && <div style={{ fontSize: 10, color: D.indigo, fontWeight: 600, marginBottom: 3 }}>{hint}</div>}
                        <input
                          type="date"
                          aria-label="Deadline"
                          value={form.deadline}
                          min={minDate || undefined}
                          max={maxDate || undefined}
                          onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                          style={{ ...inputStyle, colorScheme: 'light' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setActiveDeptId(null)} style={outlineBtnStyle}>Hủy</button>
                      <button type="button" disabled={saving} onClick={() => handleCreate(dept.id)} style={primaryBtnStyle}>
                        {saving ? 'Đang tạo...' : 'Giao việc'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Orphan tasks */}
          {orphanTasks.length > 0 && (
            <div style={{ border: D.border, borderRadius: D.radius, background: D.card, boxShadow: D.shadow(2, 2) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: D.borderLight, background: '#fafaf9', borderRadius: `${D.radius}px ${D.radius}px 0 0` }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: D.inkDim }}>Chưa phân ban</span>
                <span style={{ fontSize: 10, background: '#f3f4f6', color: D.inkMuted, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{orphanTasks.length} việc</span>
              </div>
              {orphanTasks.map(t => {
                const pri = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Medium
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: D.borderLight, fontSize: 13 }}>
                    <span style={{ flex: 1, fontWeight: 600, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    <TaskStatusDropdown task={t} isManager={isManager} onChange={handleStatusChange} />
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: pri.bg, color: pri.text, whiteSpace: 'nowrap' }}>{pri.label}</span>
                    <span style={{ fontSize: 11, color: D.inkMuted, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}
                    </span>
                    {isManager && (
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button type="button" onClick={() => setEditTask(t)} style={{ padding: 4, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={12} /></button>
                        <button type="button" onClick={() => setDeleteTarget(t)} style={{ padding: 4, color: D.red, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editTask && (
        <EditTaskModal
          open={!!editTask}
          task={editTask}
          minDate={minDate || undefined}
          maxDate={maxDate || undefined}
          onClose={() => setEditTask(null)}
          onSaved={updated => { handleTaskSaved(updated); setEditTask(null) }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa công việc</AlertDialogTitle>
            <AlertDialogDescription>
              Công việc <span style={{ fontWeight: 700 }}>"{deleteTarget?.title}"</span> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
