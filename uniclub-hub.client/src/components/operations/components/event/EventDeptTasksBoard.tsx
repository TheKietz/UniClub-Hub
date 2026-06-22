import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Grid2x2, Plus, Briefcase } from 'lucide-react'
import { getDepartments } from '@/components/membership/services/clubApi'
import type { DepartmentItem } from '@/components/membership/services/club.types'
import { getTasks, createTask } from '../../services/operationsApi'
import type { TaskItem, TaskPriority } from '../../services/operations.types'
import { TaskStatusBadge } from '../../../shared/StatusBadge'

/* ─── Design tokens (mirror EventDetailPage) ──────────────────────────────── */

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
  amber: '#f59e0b',
  red: '#ef4444',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
  border: '1.5px solid #c4bfb0', borderRadius: 8, outline: 'none',
  background: '#fff', color: D.ink, fontFamily: "'Be Vietnam Pro', sans-serif",
  boxSizing: 'border-box',
}

const PRIORITY_PILL: Record<string, { label: string; bg: string; text: string }> = {
  High:   { label: 'Cao',        bg: '#fee2e2', text: '#991b1b' },
  Medium: { label: 'Trung bình', bg: '#fef3c7', text: '#92400e' },
  Low:    { label: 'Thấp',       bg: '#dbeafe', text: '#1e40af' },
}

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface EventDeptTasksBoardProps {
  eventId: number
  clubId: number
  isManager: boolean
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function EventDeptTasksBoard({ eventId, clubId, isManager }: EventDeptTasksBoardProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [tasks, setTasks]             = useState<TaskItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)
  const [form, setForm]               = useState<{ title: string; priority: TaskPriority; deadline: string }>({ title: '', priority: 'Medium', deadline: '' })
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)

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

  const tasksByDept = useMemo(() => {
    const map = new Map<number | null, TaskItem[]>()
    for (const t of tasks) {
      const key = t.departmentId ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const openForm = (deptId: number) => {
    setActiveDeptId(deptId)
    setForm({ title: '', priority: 'Medium', deadline: '' })
    setFormError(null)
  }

  const handleCreate = async (deptId: number) => {
    if (!form.title.trim()) { setFormError('Tên công việc không được để trống'); return }
    setSaving(true)
    setFormError(null)
    try {
      await createTask(clubId, {
        title: form.title.trim(),
        priority: form.priority,
        deadline: form.deadline || undefined,
        eventId,
        departmentId: deptId,
      })
      toast.success('Đã tạo công việc')
      setActiveDeptId(null)
      setForm({ title: '', priority: 'Medium', deadline: '' })
      const r = await getTasks({ clubId, eventId, pageSize: 200 })
      setTasks(r.items)
    } catch {
      toast.error('Không thể tạo công việc')
    } finally {
      setSaving(false)
    }
  }

  const primaryBtnStyle: React.CSSProperties = {
    padding: '7px 16px', fontSize: 12, fontWeight: 900, border: D.border,
    borderRadius: D.pill, background: D.ink, color: '#facc15',
    cursor: saving ? 'not-allowed' : 'pointer',
    boxShadow: saving ? 'none' : D.shadow(2, 2),
    fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
  }
  const outlineBtnStyle: React.CSSProperties = {
    padding: '7px 14px', fontSize: 12, fontWeight: 700, border: D.border,
    borderRadius: D.pill, background: D.card, color: D.inkDim,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  const orphanTasks = tasksByDept.get(null) ?? []

  return (
    <div
      style={{
        marginTop: 20,
        background: D.card,
        border: D.border,
        borderRadius: D.radius,
        boxShadow: D.shadow(),
        overflow: 'hidden',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Grid2x2 size={14} style={{ color: D.indigo }} />
          Phân công công việc theo ban
          {tasks.length > 0 && (
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
              {tasks.length} việc
            </span>
          )}
        </h2>
        <span style={{ fontSize: 11, color: D.inkMuted }}>
          Tạo task từ đây → tự hiển thị trên Board
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: D.inkMuted, fontSize: 13 }}>
          Đang tải...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>

          {/* ── No departments ── */}
          {departments.length === 0 && (
            <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Briefcase size={24} style={{ color: '#c4bfb0' }} />
              <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>Câu lạc bộ chưa có ban nào. Vui lòng tạo ban trước.</p>
            </div>
          )}

          {/* ── Department cards ── */}
          {departments.map(dept => {
            const deptTasks = tasksByDept.get(dept.id) ?? []
            const isActive  = activeDeptId === dept.id

            return (
              <div
                key={dept.id}
                style={{ border: D.border, borderRadius: D.radius, background: D.card, boxShadow: D.shadow(2, 2), overflow: 'hidden' }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: D.borderLight, background: '#fafaf9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: D.ink, whiteSpace: 'nowrap' }}>{dept.name}</span>
                    {dept.deptLeadName && (
                      <span style={{ fontSize: 11, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        • {dept.deptLeadName}
                      </span>
                    )}
                    <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                      {deptTasks.length} việc
                    </span>
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
                {deptTasks.length === 0 && !isActive ? (
                  <div style={{ padding: '16px 20px', color: D.inkMuted, fontSize: 12, fontStyle: 'italic' }}>
                    Chưa có công việc nào được giao cho ban này trong sự kiện.
                  </div>
                ) : (
                  <div>
                    {deptTasks.map(t => {
                      const pri = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Medium
                      return (
                        <div
                          key={t.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: D.borderLight, fontSize: 13 }}
                        >
                          <span style={{ flex: 1, fontWeight: 600, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          <TaskStatusBadge status={t.status} />
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: pri.bg, color: pri.text, whiteSpace: 'nowrap' }}>{pri.label}</span>
                          <span style={{ fontSize: 11, color: D.inkMuted, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                            {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}
                          </span>
                          <span style={{ fontSize: 11, color: D.inkDim, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                            {t.assigneeName ?? '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Inline quick-create form */}
                {isActive && (
                  <div style={{ padding: '14px 16px', background: D.bg, borderTop: D.borderLight }}>
                    {formError && (
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: D.red, fontWeight: 600 }}>{formError}</p>
                    )}
                    <input
                      autoFocus
                      placeholder="Tên công việc *"
                      value={form.title}
                      onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(dept.id) }}
                      style={inputStyle}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <select
                        aria-label="Mức độ ưu tiên"
                        value={form.priority}
                        onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="Low">Ưu tiên: Thấp</option>
                        <option value="Medium">Ưu tiên: Trung bình</option>
                        <option value="High">Ưu tiên: Cao</option>
                      </select>
                      <input
                        type="date"
                        aria-label="Deadline"
                        value={form.deadline}
                        onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setActiveDeptId(null)} style={outlineBtnStyle}>Hủy</button>
                      <button type="button" disabled={saving} onClick={() => handleCreate(dept.id)} style={primaryBtnStyle}>
                        {saving ? 'Đang tạo...' : 'Tạo việc'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Orphan tasks (no department) ── */}
          {orphanTasks.length > 0 && (
            <div style={{ border: D.border, borderRadius: D.radius, background: D.card, boxShadow: D.shadow(2, 2), overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: D.borderLight, background: '#fafaf9' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: D.inkDim }}>Chưa phân ban</span>
                <span style={{ fontSize: 10, background: '#f3f4f6', color: D.inkMuted, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                  {orphanTasks.length} việc
                </span>
              </div>
              {orphanTasks.map(t => {
                const pri = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Medium
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: D.borderLight, fontSize: 13 }}>
                    <span style={{ flex: 1, fontWeight: 600, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    <TaskStatusBadge status={t.status} />
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: pri.bg, color: pri.text, whiteSpace: 'nowrap' }}>{pri.label}</span>
                    <span style={{ fontSize: 11, color: D.inkMuted, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: D.inkDim, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                      {t.assigneeName ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
