import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronsRight, Plus, Trash2, CalendarDays, ExternalLink, X, FileText, Paperclip, ClipboardList, Inbox, ChevronDown } from 'lucide-react'
import { getInboxAssignments, createTask, updateAssignmentStatus, uploadTaskAttachmentFile, getTasks, updateTaskStatus } from '../services/operationsApi'
import type { AssignmentItem, TaskItem, TaskPriority, TaskStatus, UpdateTaskStatusDto } from '../services/operations.types'
import { getDepartments } from '@/components/membership/services/clubApi'
import type { DepartmentItem } from '@/components/membership/services/club.types'

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const D = {
  border: '1.5px solid var(--c-ink)',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  pill: 999,
  ink: 'var(--c-ink)',
  inkMuted: '#918c99',
  bg: 'var(--c-bg)',
  card: '#ffffff',
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'High', label: 'Cao' },
  { value: 'Medium', label: 'Vừa' },
  { value: 'Low', label: 'Thấp' },
]

const PRIORITY_MAP: Record<TaskPriority, { label: string; bg: string; color: string }> = {
  Low:    { label: 'Thấp', bg: '#f3f4f6', color: '#6b7280' },
  Medium: { label: 'Vừa',  bg: '#fef9c3', color: '#a16207' },
  High:   { label: 'Cao',  bg: '#fee2e2', color: '#dc2626' },
}

const TASK_STATUS_MAP: Record<TaskStatus, { label: string; bg: string; color: string; border: string }> = {
  Todo:      { label: 'Cần làm',    bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  Doing:     { label: 'Đang làm',   bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  Reviewing: { label: 'Đang duyệt', bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  Done:      { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
}

const TASK_STATUS_ORDER: TaskStatus[] = ['Todo', 'Doing', 'Reviewing', 'Done']

const ALLOWED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp'

interface SubTaskForm {
  title: string
  departmentId: number | ''
  priority: TaskPriority
  deadline: string
  files: File[]
}

function emptyRow(): SubTaskForm {
  return { title: '', departmentId: '', priority: 'Medium', deadline: '', files: [] }
}

function fmtDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fileExt(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png','jpg','jpeg','webp'].includes(ext ?? '')) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['doc','docx'].includes(ext ?? '')) return '📝'
  return '📎'
}

/* ─── Assignment Detail Modal ────────────────────────────────────────────── */
function AssignmentDetailModal({ assignment, onClose }: { assignment: AssignmentItem; onClose: () => void }) {
  const pr = PRIORITY_MAP[assignment.priority]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(21,19,26,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 540, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(6, 6), fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: D.ink }}>Chi tiết phiếu giao việc</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Nội dung</span>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800, color: D.ink }}>{assignment.title}</p>
          </div>
          {assignment.description && (
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Mô tả / Yêu cầu</span>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: D.ink, lineHeight: 1.6 }}>{assignment.description}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: pr.bg, color: pr.color, borderRadius: D.pill, padding: '3px 10px' }}>{pr.label}</span>
            {assignment.eventId && (
              <Link to={`/events/university/${assignment.eventId}`} target="_blank" style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#ede9fe', borderRadius: D.pill, padding: '3px 10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={10} />{assignment.eventName ?? `Sự kiện #${assignment.eventId}`}
              </Link>
            )}
            {assignment.deadline && (
              <span style={{ fontSize: 11, color: D.inkMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CalendarDays size={11} />Deadline: {fmtDate(assignment.deadline)}
              </span>
            )}
          </div>
          {assignment.attachmentUrls.length > 0 && (
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tài liệu đính kèm</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {assignment.attachmentUrls.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 7, padding: '4px 10px', textDecoration: 'none' }}>
                    <FileText size={11} />{att.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Row File Picker ────────────────────────────────────────────────────── */
function RowFilePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  function remove(i: number) { onChange(files.filter((_, idx) => idx !== i)) }
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    onChange([...files, ...picked])
    if (ref.current) ref.current.value = ''
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => ref.current?.click()} title="Đính kèm file" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: D.border, borderRadius: 6, background: files.length > 0 ? '#ede9fe' : D.card, color: files.length > 0 ? '#7c3aed' : D.inkMuted, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <Paperclip size={12} />
      </button>
      {files.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 5, padding: '1px 5px', fontSize: 10 }}>
          <span>{fileExt(f.name)}</span>
          <span style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#4f46e5', fontWeight: 600 }}>{f.name}</span>
          <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, lineHeight: 1 }}><X size={8} /></button>
        </div>
      ))}
      <input ref={ref} type="file" multiple accept={ALLOWED_TYPES} onChange={pick} style={{ display: 'none' }} />
    </div>
  )
}

/* ─── Decompose Panel ────────────────────────────────────────────────────── */
function CreateSubTaskPanel({
  assignment,
  depts,
  clubId,
  onSubmitted,
  onCancel,
}: {
  assignment: AssignmentItem
  depts: DepartmentItem[]
  clubId: number
  onSubmitted: (subTasks: TaskItem[]) => void
  onCancel: () => void
}) {
  const [rows, setRows] = useState<SubTaskForm[]>([emptyRow()])
  const [saving, setSaving] = useState(false)

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 12, fontWeight: 600,
    border: D.border, borderRadius: 7, outline: 'none',
    background: D.card, color: D.ink, width: '100%', boxSizing: 'border-box',
  }

  function addRow() { setRows(rs => [...rs, emptyRow()]) }
  function removeRow(i: number) { setRows(rs => rs.filter((_, idx) => idx !== i)) }
  function updateRow(i: number, patch: Partial<SubTaskForm>) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  async function handleSubmit() {
    for (const r of rows) {
      if (!r.title.trim()) { toast.error('Mỗi công việc cần có tên'); return }
      if (!r.departmentId) { toast.error('Mỗi công việc cần chọn Ban phụ trách'); return }
    }
    setSaving(true)
    try {
      const created: TaskItem[] = []
      for (const r of rows) {
        const task = await createTask(clubId, {
          title: r.title.trim(),
          priority: r.priority,
          deadline: r.deadline || undefined,
          eventId: assignment.eventId,
          departmentId: r.departmentId as number,
        })
        // Upload files for this task
        for (const file of r.files) {
          try { await uploadTaskAttachmentFile(task.id, file) } catch { /* non-fatal */ }
        }
        created.push(task)
      }
      toast.success(`Đã gửi ${created.length} công việc về các Ban. Trưởng ban đã được thông báo.`)
      onSubmitted(created)
    } catch {
      toast.error('Không thể tạo công việc')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#faf5ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <ChevronsRight size={14} color="#7c3aed" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>
          Tạo Task từ phiếu: <em style={{ fontStyle: 'normal', color: D.ink }}>{assignment.title}</em>
        </span>
      </div>

      <div className="rsp-xscroll">
      <div style={{ minWidth: 620 }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 80px 120px auto 32px', gap: 6, marginBottom: 4 }}>
        {['Tên công việc', 'Ban phụ trách', 'Ưu tiên', 'Deadline', 'File đính kèm', ''].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
        ))}
      </div>

      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 80px 120px auto 32px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input value={row.title} onChange={e => updateRow(i, { title: e.target.value })} style={inputStyle} placeholder="Tên công việc..." />
          <select value={row.departmentId} onChange={e => updateRow(i, { departmentId: Number(e.target.value) || '' })} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Chọn Ban...</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={row.priority} onChange={e => updateRow(i, { priority: e.target.value as TaskPriority })} style={{ ...inputStyle, cursor: 'pointer' }}>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input type="date" value={row.deadline} onChange={e => updateRow(i, { deadline: e.target.value })} style={inputStyle} />
          <RowFilePicker files={row.files} onChange={f => updateRow(i, { files: f })} />
          <button
            type="button"
            onClick={() => removeRow(i)}
            disabled={rows.length === 1}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: 6, background: rows.length === 1 ? 'transparent' : '#fee2e2', color: rows.length === 1 ? 'transparent' : '#dc2626', cursor: rows.length === 1 ? 'default' : 'pointer', padding: 0 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <button
          type="button"
          onClick={addRow}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'none', border: '1.5px dashed #c4b5fd', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}
        >
          <Plus size={12} /> Thêm dòng
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onCancel} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, border: D.border, borderRadius: 7, background: D.card, color: D.ink, cursor: 'pointer' }}>
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', fontSize: 12, fontWeight: 800, border: '1.5px solid #7c3aed', borderRadius: 7, background: '#7c3aed', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '3px 3px 0 #5b21b6' }}
          >
            <ChevronsRight size={13} /> Gửi về Ban
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Assignment Row ─────────────────────────────────────────────────────── */
function InboxAssignmentRow({
  assignment,
  depts,
  clubId,
  onDecomposed,
  onStatusChanged,
}: {
  assignment: AssignmentItem
  depts: DepartmentItem[]
  clubId: number
  onDecomposed: () => void
  onStatusChanged: (id: number, status: string) => void
}) {
  const [showPanel, setShowPanel] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const pr = PRIORITY_MAP[assignment.priority]
  const dl = fmtDate(assignment.deadline)
  const isOverdue = assignment.deadline ? new Date(assignment.deadline) < new Date() : false
  const isDone = assignment.status === 'Done'

  async function markDone() {
    try {
      await updateAssignmentStatus(assignment.id, 'Done')
      onStatusChanged(assignment.id, 'Done')
      toast.success('Đã đánh dấu hoàn thành')
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    }
  }

  return (
    <div style={{ background: isDone ? '#f0fdf4' : D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), opacity: isDone ? 0.75 : 1 }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: pr.bg, color: pr.color, borderRadius: D.pill, padding: '2px 8px' }}>{pr.label}</span>
            {assignment.eventId && (
              <span style={{ fontSize: 10, fontWeight: 800, background: '#ede9fe', color: '#4f46e5', borderRadius: D.pill, padding: '2px 8px' }}>
                {assignment.eventName ?? `Sự kiện #${assignment.eventId}`}
              </span>
            )}
            {assignment.attachmentUrls.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0369a1', borderRadius: D.pill, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Paperclip size={9} />{assignment.attachmentUrls.length} file
              </span>
            )}
            {isDone && (
              <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#15803d', borderRadius: D.pill, padding: '2px 8px' }}>Hoàn thành</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: D.ink }}>{assignment.title}</p>
          {dl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: isOverdue ? '#dc2626' : D.inkMuted, marginTop: 4 }}>
              <CalendarDays size={11} />Deadline: {dl}{isOverdue && ' · Quá hạn'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button
            type="button"
            title="Xem chi tiết phiếu"
            onClick={() => setShowDetail(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 11, fontWeight: 700, border: D.border, borderRadius: 8, background: D.card, color: D.ink, cursor: 'pointer', boxShadow: D.shadow(), whiteSpace: 'nowrap' }}
          >
            <ExternalLink size={11} /> Xem chi tiết
          </button>
          {assignment.eventId && (
            <Link
              to={`/events/university/${assignment.eventId}`}
              title="Xem chi tiết sự kiện"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 11, fontWeight: 700, border: '1.5px solid #4f46e5', borderRadius: 8, background: '#ede9fe', color: '#4f46e5', textDecoration: 'none', boxShadow: '3px 3px 0 #c7d2fe', whiteSpace: 'nowrap' }}
            >
              <ExternalLink size={11} /> Xem sự kiện
            </Link>
          )}
          {!isDone && (
            <>
              <button
                type="button"
                onClick={() => setShowPanel(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 11, fontWeight: 800, border: '1.5px solid #7c3aed', borderRadius: 8, background: showPanel ? '#7c3aed' : '#faf5ff', color: showPanel ? '#fff' : '#7c3aed', cursor: 'pointer', boxShadow: '3px 3px 0 #c4b5fd', whiteSpace: 'nowrap' }}
              >
                <ChevronsRight size={11} /> Tạo Task
              </button>
              <button
                type="button"
                onClick={markDone}
                title="Đánh dấu hoàn thành"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: D.border, borderRadius: 8, background: '#dcfce7', color: '#15803d', cursor: 'pointer', padding: 0, boxShadow: D.shadow() }}
              >
                ✓
              </button>
            </>
          )}
        </div>
      </div>

      {/* Decompose panel */}
      {showPanel && (
        <div style={{ padding: '0 16px 16px' }}>
          <CreateSubTaskPanel
            assignment={assignment}
            depts={depts}
            clubId={clubId}
            onSubmitted={() => {
              setShowPanel(false)
              onDecomposed()
            }}
            onCancel={() => setShowPanel(false)}
          />
        </div>
      )}

      {/* Detail modal */}
      {showDetail && (
        <AssignmentDetailModal assignment={assignment} onClose={() => setShowDetail(false)} />
      )}
    </div>
  )
}

/* ─── Event Task Row ─────────────────────────────────────────────────────── */
function EventTaskRow({ task, depts, onStatusChange }: {
  task: TaskItem
  depts: DepartmentItem[]
  onStatusChange: (id: number, status: TaskStatus) => void
}) {
  const [updating, setUpdating] = useState(false)
  const [open, setOpen] = useState(false)
  const st = TASK_STATUS_MAP[task.status]
  const pr = PRIORITY_MAP[task.priority]
  const deptName = depts.find(d => d.id === task.departmentId)?.name
  const isOverdue = task.deadline ? new Date(task.deadline) < new Date() && task.status !== 'Done' : false

  async function changeStatus(next: TaskStatus) {
    if (next === task.status) { setOpen(false); return }
    setUpdating(true)
    try {
      const dto: UpdateTaskStatusDto = { status: next, progress: next === 'Done' ? 100 : next === 'Doing' ? 50 : next === 'Reviewing' ? 80 : 0 }
      await updateTaskStatus(task.id, dto)
      onStatusChange(task.id, next)
      toast.success('Đã cập nhật trạng thái')
    } catch { toast.error('Không thể cập nhật') }
    finally { setUpdating(false); setOpen(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: D.borderLight, background: task.status === 'Done' ? '#f0fdf4' : 'transparent' }}>
      {/* Priority dot */}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pr.color, flexShrink: 0 }} />

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {deptName && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', borderRadius: 4, padding: '1px 6px' }}>{deptName}</span>
          )}
          {task.assigneeName && (
            <span style={{ fontSize: 10, color: D.inkMuted }}>→ {task.assigneeName}</span>
          )}
          {task.deadline && (
            <span style={{ fontSize: 10, color: isOverdue ? '#dc2626' : D.inkMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
              <CalendarDays size={9} />{fmtDate(task.deadline)}{isOverdue && ' · Quá hạn'}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      {task.progress > 0 && task.status !== 'Done' && (
        <span style={{ fontSize: 10, fontWeight: 700, color: D.inkMuted, flexShrink: 0 }}>{task.progress}%</span>
      )}

      {/* Status dropdown */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          disabled={updating}
          onClick={() => setOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1.5px solid ${st.border}`, borderRadius: D.pill, cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1 }}
        >
          {st.label} <ChevronDown size={10} />
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
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Event Tasks Section ────────────────────────────────────────────────── */
function EventTasksSection({ clubId, depts, assignments }: {
  clubId: number
  depts: DepartmentItem[]
  assignments: AssignmentItem[]
}) {
  const [tasksByEvent, setTasksByEvent] = useState<Record<number, TaskItem[]>>({})
  const [eventNames, setEventNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const eventIds = [...new Set(assignments.map(a => a.eventId))]
    const names: Record<number, string> = {}
    assignments.forEach(a => { names[a.eventId] = a.eventName ?? `Sự kiện #${a.eventId}` })
    setEventNames(names)

    if (!eventIds.length) { setLoading(false); return }
    setLoading(true)
    Promise.all(
      eventIds.map(eid => getTasks({ clubId, eventId: eid, pageSize: 200 }).then(r => ({ eid, items: r.items })))
    )
      .then(results => {
        const map: Record<number, TaskItem[]> = {}
        results.forEach(({ eid, items }) => { map[eid] = items })
        setTasksByEvent(map)
      })
      .catch(() => toast.error('Không thể tải danh sách công việc'))
      .finally(() => setLoading(false))
  }, [clubId, assignments])

  function handleStatusChange(eventId: number, taskId: number, status: TaskStatus) {
    setTasksByEvent(prev => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).map(t => t.id === taskId ? { ...t, status } : t),
    }))
  }

  const totalTasks = Object.values(tasksByEvent).flat().length
  const doneTasks = Object.values(tasksByEvent).flat().filter(t => t.status === 'Done').length

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải công việc...</div>

  if (!totalTasks) return (
    <div style={{ border: D.border, borderRadius: D.radius, background: D.card, boxShadow: D.shadow(), padding: '40px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
      <ClipboardList size={28} style={{ color: '#c4bfb0', display: 'block', margin: '0 auto 8px' }} />
      Chưa có task nào được triển khai từ phiếu giao việc.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow() }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: '#10b981', width: `${totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0}%`, transition: 'width .3s' }} />
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: D.ink, flexShrink: 0 }}>
          {doneTasks}/{totalTasks} hoàn thành ({totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0}%)
        </span>
      </div>

      {/* Task groups by event */}
      {Object.entries(tasksByEvent).map(([eidStr, tasks]) => {
        const eid = Number(eidStr)
        if (!tasks.length) return null
        const isCollapsed = collapsed[eid]
        const eventDone = tasks.filter(t => t.status === 'Done').length
        const statusCounts = TASK_STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
          acc[s] = tasks.filter(t => t.status === s).length
          return acc
        }, {})

        return (
          <div key={eid} style={{ border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), background: D.card }}>
            {/* Group header */}
            <button
              type="button"
              onClick={() => setCollapsed(c => ({ ...c, [eid]: !c[eid] }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: D.ink, border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: isCollapsed ? D.radius : `${D.radius}px ${D.radius}px 0 0` }}
            >
              <Link
                to={`/events/university/${eid}`}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 13, fontWeight: 800, color: '#facc15', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {eventNames[eid] ?? `Sự kiện #${eid}`}
              </Link>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {TASK_STATUS_ORDER.filter(s => statusCounts[s] > 0).map(s => {
                  const c = TASK_STATUS_MAP[s]
                  return (
                    <span key={s} style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, borderRadius: D.pill, padding: '1px 7px' }}>
                      {statusCounts[s]} {c.label}
                    </span>
                  )
                })}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>
                  {eventDone}/{tasks.length}
                </span>
                <ChevronDown size={14} color="rgba(255,255,255,0.7)" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }} />
              </div>
            </button>

            {/* Task list */}
            {!isCollapsed && (
              <div>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 10, padding: '6px 14px', borderBottom: D.borderLight, background: D.bg }}>
                  {['', 'Công việc', 'Trạng thái'].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</span>
                  ))}
                </div>
                {tasks.map(task => (
                  <EventTaskRow
                    key={task.id}
                    task={task}
                    depts={depts}
                    onStatusChange={(id, status) => handleStatusChange(eid, id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function InboxPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const cid = Number(clubId ?? 0)

  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [depts, setDepts] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inbox' | 'tasks'>('inbox')

  useEffect(() => {
    if (!cid) return
    setLoading(true)
    Promise.all([getInboxAssignments(cid), getDepartments(cid)])
      .then(([list, deptList]) => {
        setAssignments(list)
        setDepts(deptList)
      })
      .catch(() => toast.error('Không thể tải hộp thư công việc'))
      .finally(() => setLoading(false))
  }, [cid])

  function handleStatusChanged(id: number, status: string) {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: status as AssignmentItem['status'] } : a))
  }

  const pending = assignments.filter(a => a.status !== 'Done')
  const done = assignments.filter(a => a.status === 'Done')

  const tabBtn = (tab: 'inbox' | 'tasks', icon: React.ReactNode, label: string, count?: number): React.ReactNode => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', fontSize: 13, fontWeight: 800, border: D.border, borderRadius: D.pill, background: activeTab === tab ? D.ink : D.card, color: activeTab === tab ? '#facc15' : D.ink, cursor: 'pointer', boxShadow: activeTab === tab ? D.shadow() : 'none', fontFamily: "'Be Vietnam Pro', sans-serif" }}
    >
      {icon} {label}
      {count != null && count > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, background: activeTab === tab ? 'rgba(255,255,255,0.2)' : '#fef9c3', color: activeTab === tab ? '#fff' : '#a16207', borderRadius: D.pill, padding: '0 6px' }}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="rsp-page" style={{ padding: '28px 32px', background: D.bg, minHeight: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: D.ink, margin: 0 }}>Hộp thư công việc</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
          Phiếu giao việc từ sự kiện cấp trường — đọc yêu cầu, tạo Task về các Ban.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabBtn('inbox', <Inbox size={13} />, 'Phiếu giao việc', pending.length)}
        {tabBtn('tasks', <ClipboardList size={13} />, 'Task đã triển khai')}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
      ) : activeTab === 'inbox' ? (
        assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, border: D.border, borderRadius: D.radius, background: D.card, boxShadow: D.shadow(), color: D.inkMuted, fontSize: 13 }}>
            Hộp thư trống. Chưa có phiếu giao việc nào từ Admin trường. 🎉
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Chờ xử lý
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#a16207', borderRadius: D.pill, padding: '1px 8px' }}>{pending.length}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pending.map(a => (
                    <InboxAssignmentRow
                      key={a.id}
                      assignment={a}
                      depts={depts}
                      clubId={cid}
                      onDecomposed={() => {}}
                      onStatusChanged={handleStatusChanged}
                    />
                  ))}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: D.inkMuted, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Đã xử lý
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d', borderRadius: D.pill, padding: '1px 8px' }}>{done.length}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {done.map(a => (
                    <InboxAssignmentRow
                      key={a.id}
                      assignment={a}
                      depts={depts}
                      clubId={cid}
                      onDecomposed={() => {}}
                      onStatusChanged={handleStatusChanged}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <EventTasksSection clubId={cid} depts={depts} assignments={assignments} />
      )}
    </div>
  )
}
