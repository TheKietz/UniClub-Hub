import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, AlertTriangle, Clock, CheckCircle, TrendingDown, Minus } from 'lucide-react'
import { getTasks } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import type { TaskItem, TaskStatus } from '../services/operations.types'
import { D } from '@/components/shared/managementTheme'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

/* ─── Logic ──────────────────────────────────────────────────────────────── */

const MS_PER_DAY = 86_400_000

const STATUS_LABEL: Record<TaskStatus, string> = { Todo: 'Chưa làm', Doing: 'Đang làm', Done: 'Hoàn thành' }
const STATUS_COLORS: Record<TaskStatus, { bg: string; color: string }> = {
  Todo:  { bg: '#f3f4f6', color: D.inkDim },
  Doing: { bg: '#dbeafe', color: '#1e40af' },
  Done:  { bg: '#d1fae5', color: '#065f46' },
}

type RiskLevel = 'behind' | 'at-risk' | 'on-track' | 'unknown'

function getRisk(task: TaskItem): RiskLevel {
  if (!task.deadline || !task.createdAt || task.status === 'Done') return 'unknown'
  const now = Date.now(); const start = new Date(task.createdAt).getTime(); const end = new Date(task.deadline).getTime()
  const total = end - start; if (total <= 0) return 'unknown'
  const gap = Math.min(100, ((now - start) / total) * 100) - task.progress
  if (gap > 30) return 'behind'
  if (gap > 10) return 'at-risk'
  return 'on-track'
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  behind:    { label: 'Chậm tiến độ', bg: '#fee2e2', color: D.red,    icon: <TrendingDown size={11} /> },
  'at-risk': { label: 'Có rủi ro',    bg: '#fef3c7', color: '#92400e', icon: <AlertTriangle size={11} /> },
  'on-track':{ label: 'Đúng hạn',     bg: '#d1fae5', color: '#065f46', icon: <CheckCircle size={11} /> },
  unknown:   { label: '',              bg: '',         color: '',        icon: <Minus size={11} /> },
}

interface TaskRow { task: TaskItem; daysOverdue: number | null; daysLeft: number | null; risk: RiskLevel }

function classify(tasks: TaskItem[]) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const pending = tasks.filter(t => t.status !== 'Done' && t.deadline)
  const toRow = (t: TaskItem): TaskRow => {
    const dl = new Date(t.deadline!); dl.setHours(0, 0, 0, 0)
    const diff = Math.round((dl.getTime() - now.getTime()) / MS_PER_DAY)
    return { task: t, daysOverdue: diff < 0 ? -diff : null, daysLeft: diff >= 0 ? diff : null, risk: getRisk(t) }
  }
  const overdue: TaskRow[] = []; const today: TaskRow[] = []; const week: TaskRow[] = []; const upcoming: TaskRow[] = []
  for (const t of pending) {
    const row = toRow(t)
    if (row.daysOverdue !== null) overdue.push(row)
    else if (row.daysLeft === 0) today.push(row)
    else if (row.daysLeft! <= 7) week.push(row)
    else if (row.daysLeft! <= 30) upcoming.push(row)
  }
  overdue.sort((a, b) => b.daysOverdue! - a.daysOverdue!)
  week.sort((a, b) => a.daysLeft! - b.daysLeft!)
  upcoming.sort((a, b) => a.daysLeft! - b.daysLeft!)
  return { overdue, today, week, upcoming }
}

/* ─── Row ────────────────────────────────────────────────────────────────── */

function TaskRowItem({ row }: { row: TaskRow }) {
  const [hovered, setHovered] = useState(false)
  const { task, daysOverdue, daysLeft, risk } = row
  const rb = RISK_CONFIG[risk]
  const sc = STATUS_COLORS[task.status]

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
        borderBottom: D.borderLight, background: hovered ? D.bg : D.card, transition: 'background .1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        {task.assigneeName && <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>{task.assigneeName}</p>}
      </div>

      <div style={{ width: 88, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 10, color: D.inkMuted }}>{task.progress}%</span>
        </div>
        <div style={{ height: 4, background: '#dce6f4', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${task.progress}%`, background: D.indigo, borderRadius: 2 }} />
        </div>
      </div>

      {risk !== 'unknown' && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4, flexShrink: 0,
          background: rb.bg, color: rb.color, border: '1px solid currentColor',
        }}>
          {rb.icon}{rb.label}
        </span>
      )}

      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
        background: sc.bg, color: sc.color,
      }}>
        {STATUS_LABEL[task.status]}
      </span>

      <div style={{ width: 88, flexShrink: 0, textAlign: 'right' }}>
        {daysOverdue !== null && <span style={{ fontSize: 11, fontWeight: 800, color: D.red }}>Trễ {daysOverdue} ngày</span>}
        {daysLeft === 0 && <span style={{ fontSize: 11, fontWeight: 800, color: D.amber }}>Hôm nay</span>}
        {daysLeft !== null && daysLeft > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: daysLeft <= 3 ? D.amber : D.inkMuted }}>Còn {daysLeft} ngày</span>
        )}
      </div>
    </div>
  )
}

/* ─── Section ────────────────────────────────────────────────────────────── */

function Section({
  title, rows, icon, emptyText, accentBg, accentColor,
}: {
  title: string; rows: TaskRow[]; icon: React.ReactNode; emptyText: string; accentBg: string; accentColor: string
}) {
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden', marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: D.borderLight,
        background: accentBg,
      }}>
        {icon}
        <span style={{ fontWeight: 800, fontSize: 13, color: accentColor }}>{title}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 800, padding: '2px 8px',
          borderRadius: D.pill, background: 'rgba(255,255,255,0.7)', color: accentColor,
          border: '1px solid currentColor',
        }}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12, color: D.inkMuted, textAlign: 'center', padding: '20px 0', fontStyle: 'italic', margin: 0 }}>{emptyText}</p>
      ) : (
        rows.map(r => <TaskRowItem key={r.task.id} row={r} />)
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function DeadlinePage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { const result = await getTasks({ clubId, departmentId, pageSize: 500 }); setTasks(result.items) }
    catch { toast.error('Không thể tải dữ liệu công việc') }
    finally { setLoading(false) }
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

  const { overdue, today, week, upcoming } = classify(tasks)
  const totalAlerts = overdue.length + today.length + week.length

  const statCardStyle = (borderColor: string): React.CSSProperties => ({
    background: D.card, border: `1.5px solid ${borderColor}`,
    borderRadius: D.radius, padding: 16,
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: `3px 3px 0 ${borderColor}`,
  })

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Cảnh báo Deadline</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            {totalAlerts > 0 ? `${totalAlerts} công việc cần chú ý` : 'Không có cảnh báo nào'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: D.card, color: D.inkDim, border: D.border,
            boxShadow: D.shadow(2, 2), padding: '8px 12px',
            borderRadius: D.pill, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={statCardStyle('#fca5a5')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} style={{ color: D.red }} />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 900, color: D.ink, margin: 0 }}>{overdue.length}</p>
            <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Quá hạn</p>
          </div>
        </div>
        <div style={statCardStyle('#fcd34d')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} style={{ color: D.amber }} />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 900, color: D.ink, margin: 0 }}>{today.length}</p>
            <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Hết hạn hôm nay</p>
          </div>
        </div>
        <div style={statCardStyle('#93c5fd')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', border: '1.5px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 900, color: D.ink, margin: 0 }}>{week.length}</p>
            <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Trong 7 ngày tới</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: D.inkMuted }}>Đang tải...</div>
      ) : (
        <>
          <Section title="Quá hạn" rows={overdue} icon={<AlertTriangle size={15} style={{ color: D.red }} />} emptyText="Không có công việc quá hạn" accentBg="#fee2e2" accentColor="#991b1b" />
          <Section title="Hết hạn hôm nay" rows={today} icon={<Clock size={15} style={{ color: D.amber }} />} emptyText="Không có công việc hết hạn hôm nay" accentBg="#fef3c7" accentColor="#92400e" />
          <Section title="Trong 7 ngày tới" rows={week} icon={<Clock size={15} style={{ color: '#2563eb' }} />} emptyText="Không có công việc sắp đến hạn" accentBg="#dbeafe" accentColor="#1e40af" />
          <Section title="Trong 30 ngày tới" rows={upcoming} icon={<Clock size={15} style={{ color: D.inkMuted }} />} emptyText="Không có công việc nào trong 30 ngày" accentBg={D.bg} accentColor={D.inkDim} />
        </>
      )}
    </div>
  )
}
