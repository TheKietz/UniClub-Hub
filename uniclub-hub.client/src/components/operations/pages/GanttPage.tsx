import './gantt.css'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTasks, getEvents, getSprints, getTaskDependencies } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import type { TaskItem, EventItem, SprintItem, TaskStatus, EventStatus } from '../services/operations.types'

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
  emerald: '#10b981',
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
type GanttMode = 'task' | 'event'
type ZoomLevel = 'Day' | 'Week' | 'Month'

const ZOOM_DAY_PX: Record<ZoomLevel, number> = { Day: 36, Week: 14, Month: 4 }
const WIN_WEEKS_MAP: Record<ZoomLevel, number> = { Day: 4, Week: 8, Month: 24 }
const NAV_STEP: Record<ZoomLevel, number> = { Day: 1, Week: 2, Month: 4 }

const STATUS_DOT: Record<TaskStatus, string> = { Todo: '#9ca3af', Doing: '#3b82f6', Reviewing: '#8b5cf6', Done: D.emerald }
const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: D.indigo }

const EVENT_STATUS_META: Record<EventStatus, { bar: string; bg: string; text: string; label: string }> = {
  Draft:      { bar: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Chuẩn bị'      },
  InProgress: { bar: '#3b82f6', bg: '#dbeafe', text: '#1e40af', label: 'Đang diễn ra' },
  Completed:  { bar: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Đã hoàn thành'},
  Cancelled:  { bar: '#9ca3af', bg: '#f3f4f6', text: '#6b7280', label: 'Đã huỷ'        },
}

// Tránh việc ép kiểu phức tạp inline trong JSX gây lỗi cho parser oxc
const GANTT_MODES: { value: GanttMode; label: string }[] = [
  { value: 'event', label: '◈ Lộ trình Sự kiện' },
  { value: 'task', label: '↗ Tiến độ Công việc' }
]

const ZOOM_LEVELS: ZoomLevel[] = ['Day', 'Week', 'Month']
const PRIORITY_LEVELS: ('High' | 'Medium' | 'Low')[] = ['High', 'Medium', 'Low']

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function startOf(t: TaskItem): Date {
  const d = new Date(t.startDate ?? t.createdAt); d.setHours(0, 0, 0, 0); return d
}
function endOf(t: TaskItem): Date {
  if (t.deadline) return new Date(t.deadline)
  const d = startOf(t); d.setDate(d.getDate() + 7); return d
}
function evStart(e: EventItem): Date {
  if (e.startTime) { const d = new Date(e.startTime); d.setHours(0, 0, 0, 0); return d }
  const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0); return d
}
function evEnd(e: EventItem): Date {
  if (e.endTime) return new Date(e.endTime)
  const d = evStart(e); d.setDate(d.getDate() + 3); return d
}
function fmtShort(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
function getWeeks(startMs: number, endMs: number) {
  const weeks: { label: string; startMs: number; days: Date[] }[] = []
  const d = new Date(startMs); const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); d.setHours(0, 0, 0, 0)
  while (d.getTime() <= endMs) {
    const days: Date[] = []; const weekMs = d.getTime()
    for (let i = 0; i < 7; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
    const mo = new Date(weekMs).toLocaleDateString('vi-VN', { month: 'short' })
    const wn = Math.ceil(new Date(weekMs).getDate() / 7)
    weeks.push({ label: `T${wn} ${mo}`, startMs: weekMs, days })
  }
  return weeks
}

/* ─── Feature 2: Client-side deadline risk ────────────────────────────────── */
function computeTaskRisk(task: TaskItem): 'high' | 'none' {
  if (task.status === 'Done') return 'none'
  if (!task.deadline || !task.estimatedHours) return 'none'
  const timeLeftHours = (new Date(task.deadline).getTime() - Date.now()) / 3_360_000
  const timeNeededHours = task.estimatedHours * (100 - task.progress) / 100
  return timeLeftHours < timeNeededHours ? 'high' : 'none'
}

/* ─── Avatar ──────────────────────────────────────────────────────────────── */
const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']
function avatarBg(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function initials(name: string) { return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() }

function GanttAvatar({ name }: { name: string }) {
  return (
    <div
      className="gantt-avatar w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white shrink-0"
      style={{ '--avatar-bg': avatarBg(name) } as React.CSSProperties}
      title={name}
    >
      {initials(name)}
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function GanttPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()
  const { user, getClubRole } = useAuth()

  const clubRole = getClubRole(clubId)
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false
  const canSeeEventMode = clubRole === CLUB_ROLES.CLUB_ADMIN || isSuperAdmin

  /* ── View state ──────────────────────────────────────────────────────── */
  const [mode, setMode]         = useState<GanttMode>('task')
  const [zoom, setZoom]         = useState<ZoomLevel>('Week')
  const [weekOffset, setWeekOffset] = useState(0)

  /* ── Data state ──────────────────────────────────────────────────────── */
  const [tasks, setTasks]       = useState<TaskItem[]>([])
  const [allTasks, setAllTasks] = useState<TaskItem[]>([])   // club-wide; for event progress
  const [events, setEvents]     = useState<EventItem[]>([])
  const [sprints, setSprints]   = useState<SprintItem[]>([])
  const [selSprintId, setSelSprintId] = useState<number | null>(null)
  const [loading, setLoading]   = useState(true)
  const [depMap, setDepMap]     = useState<{ from: number; to: number }[]>([])

  /* ── Primary loader ───────────────────────────────────────────────────── */
  const load = useCallback(() => {
    setLoading(true)
    if (mode === 'event') {
      Promise.all([
        getEvents({ clubId, pageSize: 100 }),
        getTasks({ clubId, pageSize: 500 }),
      ]).then(([evRes, tkRes]) => {
        setEvents(evRes.items)
        setAllTasks(tkRes.items)
      }).catch(() => toast.error('Không thể tải dữ liệu'))
        .finally(() => setLoading(false))
    } else {
      getSprints({ clubId, departmentId, pageSize: 50 })
        .then(async spRes => {
          setSprints(spRes.items)
          const spId = spRes.items.find(s => s.status === 'Active')?.id
            ?? spRes.items[0]?.id
            ?? null
          setSelSprintId(spId)
          const tkRes = await getTasks({ clubId, departmentId, sprintId: spId ?? undefined, pageSize: 500 })
          setTasks(tkRes.items)
        })
        .catch(() => toast.error('Không thể tải dữ liệu'))
        .finally(() => setLoading(false))
    }
  }, [clubId, departmentId, mode])

  useEffect(() => { load() }, [load])

  /* ── Sprint switch (user interaction) ────────────────────────────────── */
  function handleSprintChange(spId: number) {
    setSelSprintId(spId)
    setWeekOffset(0)
    setLoading(true)
    getTasks({ clubId, departmentId, sprintId: spId, pageSize: 500 })
      .then(r => setTasks(r.items))
      .catch(() => toast.error('Không thể tải công việc'))
      .finally(() => setLoading(false))
  }

  /* ── Dependency fetch (after tasks load) ─────────────────────────────── */
  useEffect(() => {
    if (mode !== 'task' || tasks.length === 0) { setDepMap([]); return }
    const blocked = tasks.filter(t => t.isBlocked)
    if (!blocked.length) { setDepMap([]); return }
    Promise.all(
      blocked.map(t =>
        getTaskDependencies(t.id)
          .then(deps => deps.map(d => ({ from: d.dependsOnTaskId, to: t.id })))
          .catch((): { from: number; to: number }[] => [])
      )
    ).then(res => setDepMap(res.flat()))
  }, [tasks, mode])

  /* ── Task tree (parent rows, then indented children) ─────────────────── */
  const taskRows = useMemo(() => {
    const parents = tasks.filter(t => !t.parentId)
    const childMap = new Map<number, TaskItem[]>()
    for (const t of tasks) {
      if (t.parentId) {
        if (!childMap.has(t.parentId)) childMap.set(t.parentId, [])
        childMap.get(t.parentId)!.push(t)
      }
    }
    const rows: { task: TaskItem; level: number; rowIndex: number }[] = []
    for (const p of parents) {
      rows.push({ task: p, level: 0, rowIndex: rows.length })
      for (const c of childMap.get(p.id) ?? []) {
        rows.push({ task: c, level: 1, rowIndex: rows.length })
      }
    }
    const knownParentIds = new Set(parents.map(t => t.id))
    for (const t of tasks) {
      if (t.parentId && !knownParentIds.has(t.parentId)) {
        rows.push({ task: t, level: 1, rowIndex: rows.length })
      }
    }
    return rows
  }, [tasks])

  const rowIndexById = useMemo(() => {
    const m = new Map<number, number>()
    taskRows.forEach(r => m.set(r.task.id, r.rowIndex))
    return m
  }, [taskRows])

  /* ── Timeline calculations ────────────────────────────────────────────── */
  const DAY_PX  = ZOOM_DAY_PX[zoom]
  const WIN_WKS = WIN_WEEKS_MAP[zoom]
  const NAV     = NAV_STEP[zoom]

  const { rangeStartMs, rangeEndMs } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const t0 = today.getTime()
    if (mode === 'event') {
      const ms = events.flatMap(e => [evStart(e).getTime(), evEnd(e).getTime()])
      return { rangeStartMs: (ms.length ? Math.min(...ms) : t0) - 7 * 86400000,
               rangeEndMs:   (ms.length ? Math.max(...ms) : t0) + 14 * 86400000 }
    }
    const ms = taskRows.flatMap(r => [startOf(r.task).getTime(), endOf(r.task).getTime()])
    return { rangeStartMs: (ms.length ? Math.min(...ms) : t0) - 3 * 86400000,
             rangeEndMs:   (ms.length ? Math.max(...ms) : t0) + 7 * 86400000 }
  }, [mode, events, taskRows])

  const weeks       = useMemo(() => getWeeks(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])
  const maxOffset   = Math.max(0, weeks.length - WIN_WKS)
  const clampedOff   = Math.min(weekOffset, maxOffset)
  const visWeeks    = weeks.slice(clampedOff, clampedOff + WIN_WKS)
  const visStart    = visWeeks[0]?.startMs ?? rangeStartMs
  const lastWeek    = visWeeks[visWeeks.length - 1]
  const visEnd      = (lastWeek?.days.at(-1)?.getTime() ?? rangeEndMs) + 86400000
  const totalVisDays = Math.ceil((visEnd - visStart) / 86400000)
  const chartWidth   = totalVisDays * DAY_PX
  const toPx = (ms: number) => ((ms - visStart) / 86400000) * DAY_PX
  const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
  const todayPx = toPx(todayMs)

  /* ── Event progress (% of tasks with status Done per event) ──────────── */
  const eventProgress = useMemo(() => {
    const m = new Map<number, number>()
    for (const ev of events) {
      const evTasks = allTasks.filter(t => t.eventId === ev.id)
      m.set(ev.id, evTasks.length
        ? Math.round(evTasks.filter(t => t.status === 'Done').length / evTasks.length * 100)
        : 0)
    }
    return m
  }, [events, allTasks])

  /* ── Dependency arrows (computed inline; depends on toPx) ────────────── */
  const depArrows = depMap.flatMap(({ from, to }) => {
    const fi = rowIndexById.get(from); const ti = rowIndexById.get(to)
    if (fi == null || ti == null) return []
    const ft = taskRows[fi]?.task; const tt = taskRows[ti]?.task
    if (!ft || !tt) return []
    const ROW_H = 48
    return [{ x1: toPx(endOf(ft).getTime()), y1: fi * ROW_H + ROW_H / 2,
              x2: toPx(startOf(tt).getTime()), y2: ti * ROW_H + ROW_H / 2,
              key: `${from}-${to}` }]
  })

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  const selSprint = sprints.find(s => s.id === selSprintId)

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, border: D.border, borderRadius: 8,
    background: D.card, cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? D.inkMuted : D.inkDim, opacity: disabled ? 0.4 : 1,
  })

  const TodayLine = () => todayPx >= 0 && todayPx <= chartWidth ? (
    <div
      className="gantt-today-line absolute top-0 bottom-0 w-px bg-blue-400/50 z-10 pointer-events-none"
      style={{ '--today-px': `${todayPx}px` } as React.CSSProperties}
    />
  ) : null

  /* ─── Shared chart header (week cols + day row) ────────────────────────── */
  const ChartHeader = () => (
    <>
      <div style={{ display: 'flex', height: 48, borderBottom: D.borderLight, background: D.bg }}>
        {visWeeks.map(w => (
          <div
            key={w.startMs}
            className="gantt-week-cell border-l border-gray-200 flex items-center px-2 shrink-0"
            style={{ '--days': w.days.length, '--day-px': `${DAY_PX}px` } as React.CSSProperties}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, whiteSpace: 'nowrap' }}>{w.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', height: 28, borderBottom: D.borderLight }}>
        {visWeeks.flatMap(w => w.days).map(day => (
          <div
            key={day.getTime()}
            style={{
              width: DAY_PX, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: DAY_PX >= 14 ? 10 : 0, borderLeft: D.borderLight, overflow: 'hidden',
              color: day.getTime() === todayMs ? '#2563eb' : D.inkMuted,
              fontWeight: day.getTime() === todayMs ? 900 : 400,
            }}
          >
            {DAY_PX >= 14 ? day.getDate() : null}
          </div>
        ))}
      </div>
    </>
  )

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '24px 28px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>

        {/* Mode toggle – admin only */}
        {canSeeEventMode && (
          <div style={{ display: 'flex', border: D.border, borderRadius: 8, overflow: 'hidden', boxShadow: D.shadow(2, 2) }}>
            {GANTT_MODES.map(({ value: m, label }) => (
              <button
                key={m} type="button"
                onClick={() => { setMode(m); setWeekOffset(0) }}
                style={{
                  padding: '7px 14px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  background: mode === m ? D.ink : D.card,
                  color: mode === m ? '#facc15' : D.inkDim,
                  border: 'none', borderRight: m === 'event' ? D.borderLight : 'none',
                  fontFamily: 'inherit', letterSpacing: '.06em', textTransform: 'uppercase',
                }}
              >{label}</button>
            ))}
          </div>
        )}

        {/* Sprint selector – task mode */}
        {mode === 'task' && sprints.length > 0 && (
          <select
            aria-label="Chọn Sprint"
            value={selSprintId ?? ''}
            onChange={e => handleSprintChange(Number(e.target.value))}
            style={{
              fontSize: 12, border: D.border, borderRadius: 8, padding: '6px 10px',
              background: D.card, color: D.inkDim, cursor: 'pointer',
              fontFamily: 'inherit', outline: 'none', boxShadow: D.shadow(2, 2),
            }}
          >
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Navigation */}
        <button type="button" title="Lùi" onClick={() => setWeekOffset(o => Math.max(0, o - NAV))} disabled={clampedOff === 0} style={navBtn(clampedOff === 0)}>
          <ChevronLeft size={14} />
        </button>
        <button type="button" title="Tiến" onClick={() => setWeekOffset(o => Math.min(maxOffset, o + NAV))} disabled={clampedOff >= maxOffset} style={navBtn(clampedOff >= maxOffset)}>
          <ChevronRight size={14} />
        </button>

        {/* Zoom */}
        <div style={{ display: 'flex', border: D.border, borderRadius: 8, overflow: 'hidden' }}>
          {ZOOM_LEVELS.map(z => (
            <button key={z} type="button" onClick={() => { setZoom(z); setWeekOffset(0) }}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: zoom === z ? D.ink : D.card,
                color: zoom === z ? '#facc15' : D.inkDim,
                border: 'none', borderRight: z !== 'Month' ? D.borderLight : 'none',
                fontFamily: 'inherit',
              }}
            >{z}</button>
          ))}
        </div>

        {/* Refresh */}
        <button type="button" onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 4, border: D.border, borderRadius: 8,
          padding: '6px 10px', background: D.card, color: D.inkDim,
          cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, opacity: loading ? 0.6 : 1,
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Sprint info chip (task mode) ─────────────────────────────────── */}
      {mode === 'task' && selSprint && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12,
          background: D.card, border: D.border, borderRadius: D.pill,
          padding: '5px 14px', boxShadow: D.shadow(2, 2), fontSize: 12,
        }}>
          <span style={{ fontWeight: 900, color: D.ink }}>{selSprint.name}</span>
          <span style={{ color: D.inkMuted }}>{fmtShort(new Date(selSprint.startDate))} → {fmtShort(new Date(selSprint.endDate))}</span>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: D.pill,
            background: selSprint.status === 'Active' ? '#d1fae5' : selSprint.status === 'Planning' ? '#fef3c7' : '#f3f4f6',
            color:      selSprint.status === 'Active' ? '#065f46' : selSprint.status === 'Planning' ? '#92400e' : '#6b7280',
          }}>{selSprint.status}</span>
          {mode === 'task' && (
            <span style={{ color: D.inkMuted }}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {tasks.filter(t => t.status === 'Done').length} done
            </span>
          )}
        </div>
      )}

      {/* ── Gantt table ──────────────────────────────────────────────────── */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: D.inkMuted, fontSize: 13, gap: 8 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải...
          </div>

        ) : mode === 'event' ? (
          /* ═══════════════════════════════ EVENT MODE ══════════════════════════════ */
          events.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: D.inkMuted, fontSize: 13 }}>
              Chưa có sự kiện nào
            </div>
          ) : (
            <div style={{ display: 'flex' }}>
              {/* Left panel: event list */}
              <div style={{ width: 300, flexShrink: 0, borderRight: D.borderLight, background: D.card, zIndex: 10 }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', height: 48, borderBottom: D.borderLight, background: D.bg }}>
                  <ColHeader label="Sự kiện" align="left" />
                  <ColHeader label="Tiến độ" align="center" />
                </div>
                {/* Spacer row (aligns with day-number row) */}
                <div style={{ height: 28, borderBottom: D.borderLight, background: D.bg }} />
                {/* Rows */}
                {events.map(ev => {
                  const meta = EVENT_STATUS_META[ev.status] ?? EVENT_STATUS_META.Draft
                  const pct  = eventProgress.get(ev.id) ?? 0
                  return (
                    <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', height: 48, borderBottom: D.borderLight }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', minWidth: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4, flexShrink: 0, background: meta.bg, color: meta.text }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 12, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }} title={ev.name}>
                          {ev.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <div style={{ width: 34, height: 5, background: '#e8e3d6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: meta.bar, borderRadius: 3, transition: 'width .6s ease' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: D.inkDim, minWidth: 26 }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Right: scrollable chart */}
              <div style={{ flex: 1, overflowX: 'auto' }}>
                <div className="gantt-area relative" style={{ '--chart-w': `${chartWidth}px` } as React.CSSProperties}>
                  <ChartHeader />
                  {/* Event bars */}
                  <div style={{ position: 'relative' }}>
                    {events.map(ev => {
                      const meta     = EVENT_STATUS_META[ev.status] ?? EVENT_STATUS_META.Draft
                      const barLeft  = toPx(evStart(ev).getTime())
                      const barRight = toPx(evEnd(ev).getTime())
                      const barW     = Math.max(DAY_PX * 2, barRight - barLeft)
                      const pct      = eventProgress.get(ev.id) ?? 0
                      return (
                        <div key={ev.id} style={{ position: 'relative', height: 48, borderBottom: D.borderLight }}>
                          <TodayLine />
                          <div
                            className="gantt-bar-wrap absolute top-1/2 -translate-y-1/2 h-7 rounded-lg overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                            style={{ '--bar-left': `${barLeft}px`, '--bar-w': `${barW}px`, '--bar-color': meta.bar, '--bar-pct': `${pct}%` } as React.CSSProperties}
                            title={`${ev.name} | ${fmtShort(evStart(ev))} → ${fmtShort(evEnd(ev))} | ${pct}% hoàn thành`}
                          >
                            <div className="gantt-bar-bg absolute inset-0 rounded-lg opacity-20" />
                            <div className="gantt-bar-fill absolute left-0 top-0 bottom-0 rounded-lg" />
                            {barW > 60 && (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {ev.name}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.8)', flexShrink: 0 }}>{pct}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )

        ) : (
          /* ════════════════════════════════ TASK MODE ══════════════════════════════ */
          taskRows.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, color: D.inkMuted, gap: 6 }}>
              <span style={{ fontSize: 32 }}>◎</span>
              <span style={{ fontSize: 13 }}>{selSprintId ? 'Sprint này chưa có công việc' : 'Chưa có sprint nào'}</span>
            </div>
          ) : (
            <div style={{ display: 'flex' }}>
              {/* Left panel: task tree */}
              <div style={{ width: 320, flexShrink: 0, borderRight: D.borderLight, background: D.card, zIndex: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', height: 48, borderBottom: D.borderLight, background: D.bg }}>
                  <ColHeader label="Công việc" align="left" />
                  <ColHeader label="TT" align="center" />
                  <ColHeader label="NV" align="center" />
                </div>
                <div style={{ height: 28, borderBottom: D.borderLight, background: D.bg }} />
                {taskRows.map(({ task, level }) => {
                  const taskRisk = computeTaskRisk(task)
                  return (
                  <div
                    key={task.id}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', height: 48, borderBottom: D.borderLight, background: level === 1 ? '#fafaf8' : D.card, borderLeft: taskRisk === 'high' ? '3px solid #f59e0b' : '3px solid transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: `0 10px 0 ${10 + level * 18}px`, minWidth: 0 }}>
                      {level === 1 && <span style={{ color: D.inkMuted, fontSize: 11, flexShrink: 0, lineHeight: 1 }}>└</span>}
                      {level === 0 && <span style={{ fontSize: 10, color: D.inkMuted, flexShrink: 0 }}>⠿⠿</span>}
                      <span
                        style={{ fontSize: level === 0 ? 13 : 12, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: level === 0 ? 600 : 400 }}
                        title={task.title}
                      >{task.title}</span>
                      {task.isBlocked && <span title="Đang bị chặn bởi task khác" style={{ fontSize: 10, flexShrink: 0 }}>🔗</span>}
                      {taskRisk === 'high' && <span title="Nguy cơ trễ deadline" style={{ fontSize: 10, flexShrink: 0 }}>⚠️</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT[task.status], display: 'inline-block' }} title={task.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {task.assigneeName
                        ? <GanttAvatar name={task.assigneeName} />
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', background: D.bg }} />
                      }
                    </div>
                  </div>
                  )
                })}
              </div>

              {/* Right: scrollable chart */}
              <div style={{ flex: 1, overflowX: 'auto' }}>
                <div className="gantt-area relative" style={{ '--chart-w': `${chartWidth}px` } as React.CSSProperties}>
                  <ChartHeader />
                  {/* Task bars */}
                  <div style={{ position: 'relative' }}>
                    {taskRows.map(({ task, level }) => {
                      const barLeft  = toPx(startOf(task).getTime())
                      const barRight = toPx(endOf(task).getTime())
                      const barW     = Math.max(DAY_PX * 0.8, barRight - barLeft)
                      const pct      = task.progress
                      const barRisk  = computeTaskRisk(task)
                      const barColor = barRisk === 'high' ? '#ef4444' : (PRIORITY_COLOR[task.priority] ?? D.indigo)
                      return (
                        <div key={task.id} style={{ position: 'relative', height: 48, borderBottom: D.borderLight, background: level === 1 ? '#fafaf8' : 'transparent' }}>
                          <TodayLine />
                          <div
                            className="gantt-bar-wrap absolute top-1/2 -translate-y-1/2 overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                            style={{
                              '--bar-left': `${barLeft}px`, '--bar-w': `${barW}px`,
                              '--bar-color': barColor, '--bar-pct': `${pct}%`,
                              height: level === 1 ? 22 : 28, borderRadius: 8,
                              outline: barRisk === 'high' ? '2px solid #f59e0b' : 'none',
                              outlineOffset: 1,
                            } as React.CSSProperties}
                            title={`${task.title} — ${pct}% | ${task.priority}${barRisk === 'high' ? ' ⚠️ Nguy cơ trễ hạn' : ''}`}
                          >
                            <div className="gantt-bar-bg absolute inset-0 opacity-20" style={{ borderRadius: 8 }} />
                            <div className="gantt-bar-fill absolute left-0 top-0 bottom-0" style={{ borderRadius: 8 }} />
                            {barW > 44 && (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 7px', gap: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>{pct}%</span>
                                {barRisk === 'high' && <span style={{ fontSize: 10 }}>⚠️</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Dependency arrows */}
                    {depArrows.length > 0 && (
                      <svg
                        className="gantt-dep-svg absolute inset-0 pointer-events-none"
                        style={{ '--svg-w': `${chartWidth}px`, '--svg-h': `${taskRows.length * 48}px` } as React.CSSProperties}
                      >
                        <defs>
                          <marker id="gantt-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L6,3 Z" fill="#6366f1" />
                          </marker>
                        </defs>
                        {depArrows.map(({ x1, y1, x2, y2, key }) => (
                          <path
                            key={key}
                            d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
                            fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2"
                            markerEnd="url(#gantt-arr)"
                          />
                        ))}
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, fontSize: 11, color: D.inkMuted, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 1, height: 16, borderLeft: '2px dashed #93c5fd' }} /> Hôm nay
        </div>

        {mode === 'task' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="22" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="18" y2="4" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>
              Phụ thuộc
            </div>
            {PRIORITY_LEVELS.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div className="gantt-dot w-3 h-3 rounded-sm" style={{ '--dot-color': PRIORITY_COLOR[p] } as React.CSSProperties} />
                {p === 'High' ? 'Cao' : p === 'Medium' ? 'Vừa' : 'Thấp'}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12 }}>🔗</span> Bị chặn
            </div>
          </>
        )}

        {mode === 'event' && Object.entries(EVENT_STATUS_META).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: v.bar }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Mini helper component ───────────────────────────────────────────────── */
function ColHeader({ label, align }: { label: string; align: 'left' | 'center' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: align === 'center' ? 'center' : 'flex-start',
      padding: align === 'left' ? '0 12px' : 0,
      fontSize: 10, fontWeight: 800, color: '#918c99',
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>{label}</div>
  )
}