import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard, Calendar, Activity,
  AlertTriangle, CheckSquare, Clock, ListTodo, Zap,
  Users, ArrowUpRight, Plus, ArrowRightLeft, Trash2,
  TrendingUp, CalendarClock, MapPin, PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getTasks, getSprints, getEvents, getAuditLogs, getAtRiskTasks,
} from "../services/operationsApi";
import type {
  SprintItem, EventItem, AuditLogItem, TaskItem, AtRiskTaskItem,
} from "../services/operations.types";
import { useTasks } from "../context/TasksContext";
import StatCard from "../components/StatCard";
import ExportReportButton from "../components/ExportReportButton";
import { D } from '@/components/shared/managementTheme'

/* ── Design tokens ─────────────────────────────────────────────────────────── */

const ACTION_ICON: Record<string, React.ReactNode> = {
  Create: <Plus size={13} style={{ color: D.emerald }} />,
  Update: <ArrowRightLeft size={13} style={{ color: '#2563eb' }} />,
  Delete: <Trash2 size={13} style={{ color: D.red }} />,
}
const ACTION_BG: Record<string, string> = {
  Create: '#d1fae5', Update: '#dbeafe', Delete: '#fee2e2',
}
const MODULE_LABEL: Record<string, string> = {
  Tasks: 'công việc', Events: 'sự kiện', Sprints: 'sprint',
}

const SPRINT_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  Planning:  { bg: '#eef2ff', color: D.indigo,  label: 'Lên kế hoạch' },
  Active:    { bg: '#d1fae5', color: '#065f46', label: 'Đang chạy' },
  Completed: { bg: '#f3f4f6', color: D.inkDim,  label: 'Hoàn thành' },
  Cancelled: { bg: '#fee2e2', color: D.red,      label: 'Đã hủy' },
}

const EVENT_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  Draft:      { bg: '#f3f4f6', color: '#374151', label: 'Nháp' },
  InProgress: { bg: '#dbeafe', color: '#1d4ed8', label: 'Đang diễn ra' },
  Completed:  { bg: '#d1fae5', color: '#065f46', label: 'Hoàn thành' },
  Cancelled:  { bg: '#fee2e2', color: D.red,      label: 'Đã hủy' },
}

function formatLogTime(iso: string): string {
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (diffMin < 1) return "Vừa xong"
  if (diffMin < 60) return `${diffMin} phút trước`
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

/* ── Chart helpers ─────────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  'Chưa làm': D.inkMuted,
  'Đang làm': D.amber,
  'Đang duyệt': D.violet,
  'Hoàn thành': D.emerald,
}

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

interface TrendPoint { label: string; created: number; done: number }

/** Build a 7-day series (oldest → today) counting tasks created vs completed each day. */
function buildTrend(tasks: TaskItem[]): TrendPoint[] {
  const days: TrendPoint[] = []
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const buckets = new Map<string, TrendPoint>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const pt: TrendPoint = { label: DOW[d.getDay()], created: 0, done: 0 }
    buckets.set(keyOf(d), pt)
    days.push(pt)
  }
  for (const t of tasks) {
    if (t.createdAt) {
      const b = buckets.get(keyOf(new Date(t.createdAt)))
      if (b) b.created++
    }
    if (t.completedAt) {
      const b = buckets.get(keyOf(new Date(t.completedAt)))
      if (b) b.done++
    }
  }
  return days
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '8px 12px', fontSize: 12 }}>
      <p style={{ fontWeight: 800, color: D.ink, margin: 0 }}>
        {payload[0].name}: <span style={{ color: STATUS_COLOR[payload[0].name] ?? D.indigo }}>{payload[0].value}</span>
      </p>
    </div>
  )
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '10px 14px', fontSize: 12 }}>
      <p style={{ fontWeight: 800, color: D.ink, margin: '0 0 4px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontWeight: 700 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

/* ── Derived types ─────────────────────────────────────────────────────────── */

interface SprintProgress {
  sprint: SprintItem
  todo: number
  doing: number
  done: number
  total: number
  progress: number
}

function buildSprintProgress(sprint: SprintItem, tasks: TaskItem[]): SprintProgress {
  const sts = tasks.filter(t => t.sprintId === sprint.id)
  const todo  = sts.filter(t => t.status === "Todo").length
  const doing = sts.filter(t => t.status === "Doing" || t.status === "Reviewing").length
  const done  = sts.filter(t => t.status === "Done").length
  const total = todo + doing + done
  return { sprint, todo, doing, done, total, progress: total > 0 ? Math.round((done / total) * 100) : 0 }
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function OperationsDashboard() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()

  const [loading, setLoading] = useState(true)
  const [taskStats, setTaskStats] = useState({ total: 0, todo: 0, doing: 0, reviewing: 0, done: 0, overdue: 0 })
  const [activeSprints, setActiveSprints] = useState<SprintProgress[]>([])
  const [sprintCount, setSprintCount] = useState(0)
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([])
  const [eventCount, setEventCount] = useState(0)
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([])
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [atRiskTasks, setAtRiskTasks] = useState<AtRiskTaskItem[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getTasks({ clubId, departmentId, pageSize: 500 }),
      getSprints({ clubId, departmentId, pageSize: 50 }),
      getEvents({ clubId, pageSize: 50 }),
      getAuditLogs({ clubId, pageSize: 6 }),
      getAtRiskTasks({ clubId, departmentId }).catch(() => [] as AtRiskTaskItem[]),
    ])
      .then(([taskData, sprintData, eventData, auditData, atRisk]) => {
        setAtRiskTasks(atRisk)
        const tasks = taskData.items
        setTaskStats({
          total:     taskData.totalCount,
          todo:      tasks.filter(t => t.status === "Todo").length,
          doing:     tasks.filter(t => t.status === "Doing").length,
          reviewing: tasks.filter(t => t.status === "Reviewing").length,
          done:      tasks.filter(t => t.status === "Done").length,
          overdue:   tasks.filter(t => t.status !== "Done" && t.deadline && new Date(t.deadline) < new Date()).length,
        })

        // Up to 3 active sprints, each with its own progress
        const actives = sprintData.items.filter(s => s.status === "Active")
        setActiveSprints(actives.slice(0, 3).map(s => buildSprintProgress(s, tasks)))
        setSprintCount(actives.length)

        // Up to 3 upcoming events: not done/cancelled, soonest first
        const now = Date.now()
        const upcoming = eventData.items
          .filter(e => e.status !== "Cancelled" && e.status !== "Completed")
          .sort((a, b) => {
            const ta = a.startTime ? new Date(a.startTime).getTime() : Infinity
            const tb = b.startTime ? new Date(b.startTime).getTime() : Infinity
            return ta - tb
          })
        setUpcomingEvents(upcoming.slice(0, 3))
        setEventCount(upcoming.filter(e => !e.startTime || new Date(e.startTime).getTime() >= now).length || upcoming.length)

        setTrendData(buildTrend(tasks))

        setRecentLogs(auditData.items)
      })
      .catch(() => toast.error("Không thể tải dữ liệu"))
      .finally(() => setLoading(false))
  }, [clubId, departmentId])

  const withClub = (sub: string) => `/clubs/${clubId}/operations?view=${sub}`

  const completionRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0
  const inProgress = taskStats.doing + taskStats.reviewing

  // Status distribution segments
  const distTotal = taskStats.todo + taskStats.doing + taskStats.reviewing + taskStats.done
  const distSegments = [
    { label: 'Chưa làm',   count: taskStats.todo,      color: D.inkMuted },
    { label: 'Đang làm',   count: taskStats.doing,     color: D.amber },
    { label: 'Đang duyệt', count: taskStats.reviewing, color: D.violet },
    { label: 'Hoàn thành', count: taskStats.done,      color: D.emerald },
  ]
  const distData = distSegments.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }))

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
            Tổng quan Câu lạc bộ
          </h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            Theo dõi tiến độ công việc, sự kiện và hoạt động của câu lạc bộ trong thời gian thực.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ExportReportButton clubId={clubId} variant="tasks" />
          <button type="button" onClick={() => navigate(withClub("board"))}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
              color: '#fff', background: D.ink, border: D.border, borderRadius: D.radius,
              boxShadow: D.shadow(2, 2), padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <LayoutDashboard size={15} /> Mở bảng Kanban
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20, height: 120 }} />
          ))
        ) : (
          <>
            <StatCard icon={ListTodo}     iconBg="#eef2ff" iconColor={D.indigo}  value={taskStats.total}  label="Tổng công việc"
              subtitle={`${taskStats.todo} chưa bắt đầu`} />
            <StatCard icon={Clock}        iconBg="#fef3c7" iconColor={D.amber}   value={inProgress}  label="Đang xử lý"
              subtitle={`${taskStats.reviewing} đang duyệt`} />
            <StatCard icon={CheckSquare}  iconBg="#d1fae5" iconColor={D.emerald} value={taskStats.done}   label="Hoàn thành"
              trend={{ value: `${completionRate}%`, positive: true }} />
            <StatCard icon={AlertTriangle} iconBg="#fee2e2" iconColor={D.red}    value={taskStats.overdue} label="Quá hạn"
              trend={taskStats.overdue > 0 ? { value: `${taskStats.overdue}`, positive: false } : undefined} />
          </>
        )}
      </div>

      {/* ── At-risk tasks (deadline forecast) ─────────────────────────── */}
      {atRiskTasks.length > 0 && (
        <div style={{ background: '#fff7ed', border: '2px solid #f97316', borderRadius: D.radius, boxShadow: D.shadow(), padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <AlertTriangle size={16} style={{ color: '#f97316' }} />
              Công việc có nguy cơ trễ ({atRiskTasks.length})
            </h2>
            <button type="button" onClick={() => navigate(withClub('deadlines'))}
              style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              Xem tất cả <ArrowUpRight size={13} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {atRiskTasks.slice(0, 4).map(t => (
              <div key={t.taskId} onClick={() => navigate(withClub('board'))}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#fff', border: '1px solid #fed7aa', borderRadius: 10, cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>
                    {t.assigneeName ?? 'Chưa giao'} · Tiến độ {t.progress}% / kỳ vọng {Math.round(t.expectedProgress)}%
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#c2410c', background: '#ffedd5', border: '1px solid #fdba74', borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  {t.daysRemaining <= 0 ? 'Quá hạn' : `Còn ${Math.ceil(t.daysRemaining)} ngày`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts row ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>

        {/* Donut — task status distribution */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '16px 24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
            <PieChartIcon size={16} style={{ color: D.indigo }} />
            Phân bố công việc
          </h2>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
          ) : distTotal === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic' }}>Chưa có công việc</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', width: 160, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} strokeWidth={1.5} stroke="var(--c-ink)">
                      {distData.map(d => <Cell key={d.name} fill={STATUS_COLOR[d.name] ?? D.inkMuted} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: D.ink, lineHeight: 1 }}>{completionRate}%</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>hoàn thành</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {distSegments.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: D.inkMuted, flex: 1 }}>{s.label}</span>
                    <strong style={{ fontSize: 13, color: D.ink }}>{s.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Area — 7-day created vs completed trend */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <TrendingUp size={16} style={{ color: D.emerald }} />
              Xu hướng 7 ngày qua
            </h2>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 11, color: D.inkMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: D.indigo, display: 'inline-block' }} /> Tạo mới
              </span>
              <span style={{ fontSize: 11, color: D.inkMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: D.emerald, display: 'inline-block' }} /> Hoàn thành
              </span>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={D.indigo} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={D.indigo} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={D.emerald} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={D.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: D.inkMuted }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: D.inkMuted }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: D.inkMuted, strokeWidth: 1 }} />
                <Area type="monotone" dataKey="created" name="Tạo mới" stroke={D.indigo} strokeWidth={2} fill="url(#gCreated)" />
                <Area type="monotone" dataKey="done" name="Hoàn thành" stroke={D.emerald} strokeWidth={2} fill="url(#gDone)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Overdue alert ────────────────────────────────────────────── */}
      {!loading && taskStats.overdue > 0 && (
        <div
          onClick={() => navigate(withClub("deadlines"))}
          style={{
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', background: '#fee2e2',
            border: '1.5px solid #fca5a5', borderRadius: D.radius,
            boxShadow: D.shadow(2, 2), cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fecaca'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fee2e2'}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={16} style={{ color: D.red }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', flex: 1, margin: 0 }}>
            <strong>{taskStats.overdue}</strong> công việc đã quá hạn — nhấn để xem chi tiết
          </p>
          <ArrowUpRight size={16} style={{ color: '#f87171', flexShrink: 0 }} />
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>

        {/* Active Sprints (up to 3) */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Zap size={16} style={{ color: D.amber }} />
              Sprint đang chạy
              {!loading && sprintCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: D.indigo, background: '#eef2ff', border: D.borderLight, borderRadius: D.pill, padding: '1px 8px' }}>
                  {sprintCount}
                </span>
              )}
            </h2>
            <button type="button" onClick={() => navigate(withClub("sprints"))}
              style={{ fontSize: 12, fontWeight: 600, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>

          {loading ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
          ) : activeSprints.length === 0 ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic' }}>Không có sprint nào đang chạy</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activeSprints.map(({ sprint, todo, doing, done, progress }) => {
                const badge = SPRINT_STATUS_BADGE[sprint.status]
                const left = daysUntil(sprint.endDate)
                return (
                  <div
                    key={sprint.id}
                    onClick={() => navigate(withClub("sprints"))}
                    style={{ background: D.bg, border: D.borderLight, borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = D.shadow(2, 2)}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          border: D.borderLight, borderRadius: 0,
                          background: badge.bg, color: badge.color,
                          textTransform: 'uppercase', letterSpacing: '.04em',
                        }}>
                          {badge.label}
                        </span>
                      )}
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: D.ink, margin: 0, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sprint.name}</h3>
                      {left !== null && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: left < 0 ? D.red : left <= 3 ? D.amber : D.inkMuted, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          <CalendarClock size={12} />
                          {left < 0 ? `Trễ ${-left} ngày` : left === 0 ? 'Hôm nay' : `Còn ${left} ngày`}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: D.inkMuted }}>
                        {sprint.taskCount} công việc · {todo} chưa làm · {doing} đang làm · {done} xong
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: D.indigo }}>{progress}%</span>
                    </div>
                    <div style={{ height: 8, background: '#e8e3d6', borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc' }}>
                      <div style={{ height: '100%', background: D.indigo, width: `${progress}%`, transition: 'width .4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Activity size={16} style={{ color: '#2563eb' }} />
              Nhật ký hoạt động
            </h2>
            <button type="button" onClick={() => navigate(withClub("activity"))}
              style={{ fontSize: 12, fontWeight: 600, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
            ) : recentLogs.length === 0 ? (
              <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Chưa có hoạt động nào</p>
            ) : recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: ACTION_BG[log.action] ?? D.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: D.borderLight, marginTop: 2,
                }}>
                  {ACTION_ICON[log.action]}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 12, color: D.inkDim, lineHeight: 1.4, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    <strong style={{ fontWeight: 700, color: D.ink }}>{log.userName}</strong>
                    {' '}{log.action === "Create" ? "tạo" : log.action === "Delete" ? "xóa" : "cập nhật"}{' '}
                    {MODULE_LABEL[log.module] ?? log.module}
                    {log.entityTitle && (
                      <span style={{ fontWeight: 600, color: D.indigo }}> "{log.entityTitle}"</span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>{formatLogTime(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upcoming Events (up to 3) ─────────────────────────────────── */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Calendar size={16} style={{ color: '#2563eb' }} />
            Sự kiện sắp tới
            {!loading && eventCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: D.borderLight, borderRadius: D.pill, padding: '1px 8px' }}>
                {eventCount}
              </span>
            )}
          </h2>
          <button type="button" onClick={() => navigate(withClub("events"))}
            style={{ fontSize: 12, fontWeight: 600, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            Xem tất cả <ArrowUpRight size={12} />
          </button>
        </div>
        {loading ? (
          <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
        ) : upcomingEvents.length === 0 ? (
          <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Không có sự kiện sắp tới</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {upcomingEvents.map(ev => {
              const evBadge = EVENT_STATUS_BADGE[ev.status] ?? EVENT_STATUS_BADGE.Draft
              const left = daysUntil(ev.startTime)
              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/clubs/${clubId}/events/${ev.id}`)}
                  style={{
                    padding: '14px 16px', borderRadius: D.radius,
                    border: D.border, background: D.bg, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = D.shadow(3, 3); (e.currentTarget as HTMLElement).style.background = D.card }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.background = D.bg }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', border: D.borderLight,
                      borderRadius: 0, background: evBadge.bg, color: evBadge.color,
                      textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>
                      {evBadge.label}
                    </span>
                    {left !== null && left >= 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: left <= 3 ? D.amber : D.inkMuted }}>
                        {left === 0 ? 'Hôm nay' : `Còn ${left} ngày`}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: D.ink, marginBottom: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {ev.name}
                  </h3>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarClock size={11} />
                    {ev.startTime
                      ? new Date(ev.startTime).toLocaleDateString("vi-VN", { day: "2-digit", month: "long" })
                      : "Chưa có ngày"}
                  </p>
                  {ev.location && (
                    <p style={{ fontSize: 11, color: D.inkMuted, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      <MapPin size={11} style={{ flexShrink: 0 }} /> {ev.location}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} style={{ color: D.inkMuted }} />
                    <span style={{ fontSize: 11, color: D.inkMuted }}>
                      {ev.participantCount}{ev.maxParticipants ? `/${ev.maxParticipants}` : ''} người tham gia
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
