import './gantt.css'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTasks, getEvents } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import type { TaskItem, EventItem, TaskStatus } from '../services/operations.types'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { D } from '@/components/shared/managementTheme'

/* ─── Types & constants ───────────────────────────────────────────────────── */

type ZoomLevel  = 'Day' | 'Week' | 'Month'
type FilterMode = 'all' | 'no-event' | 'club-event' | 'school-event'

const ZOOM_DAY_PX: Record<ZoomLevel, number>  = { Day: 36, Week: 14, Month: 4  }
const WIN_WEEKS_MAP: Record<ZoomLevel, number> = { Day: 4,  Week: 8,  Month: 24 }
const NAV_STEP: Record<ZoomLevel, number>      = { Day: 1,  Week: 2,  Month: 4  }

const STATUS_DOT: Record<TaskStatus, string> = {
  Todo: '#9ca3af', Doing: '#3b82f6', Reviewing: '#8b5cf6', Done: D.emerald,
}
const PRIORITY_COLOR: Record<string, string> = {
  High: '#ef4444', Medium: '#f59e0b', Low: D.indigo,
}
const FILTER_LABEL: Record<FilterMode, string> = {
  all:          'Tất cả (đang thực hiện)',
  'no-event':   'Công việc CLB',
  'club-event': 'Event CLB',
  'school-event': 'Event trường',
}
const FILTER_OPTIONS = (Object.keys(FILTER_LABEL) as FilterMode[]).map(k => ({
  value: k, label: FILTER_LABEL[k],
}))

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function startOf(t: TaskItem): Date {
  const d = new Date(t.startDate ?? t.createdAt); d.setHours(0, 0, 0, 0); return d
}
function endOf(t: TaskItem): Date {
  if (t.deadline) return new Date(t.deadline)
  const d = startOf(t); d.setDate(d.getDate() + 7); return d
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
    const label = new Date(weekMs).toLocaleDateString('vi-VN', { day: '2-digit', month: 'numeric' })
    weeks.push({ label, startMs: weekMs, days })
  }
  return weeks
}

/* ─── Avatar ──────────────────────────────────────────────────────────────── */

const PALETTE = ['#1d4ed8', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']
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

  /* ── State ──────────────────────────────────────────────────────────── */
  const [tasks, setTasks]           = useState<TaskItem[]>([])
  const [events, setEvents]         = useState<EventItem[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selEventId, setSelEventId] = useState<number | null>(null)
  const [loading, setLoading]       = useState(true)
  const [zoom, setZoom]             = useState<ZoomLevel>('Week')
  const [weekOffset, setWeekOffset] = useState(0)

  /* ── Load ────────────────────────────────────────────────────────────── */
  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getEvents({ clubId, pageSize: 100 }),    // club events (ClubId == clubId)
      getEvents({ pageSize: 100 }),             // school events (ClubId IS NULL)
      getTasks({ clubId, departmentId, pageSize: 500 }),
    ]).then(([clubEvRes, schoolEvRes, tkRes]) => {
      setEvents([...clubEvRes.items, ...schoolEvRes.items])
      setTasks(tkRes.items)
    }).catch(() => toast.error('Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

  /* ── Event buckets ────────────────────────────────────────────────────── */
  const clubEvents   = useMemo(() => events.filter(e => e.clubId !== null), [events])
  const schoolEvents = useMemo(() => events.filter(e => e.clubId === null), [events])

  /* ── Auto-select first event when mode switches ─────────────────────── */
  useEffect(() => {
    if (filterMode === 'club-event')   setSelEventId(clubEvents[0]?.id   ?? null)
    else if (filterMode === 'school-event') setSelEventId(schoolEvents[0]?.id ?? null)
    else setSelEventId(null)
    setWeekOffset(0)
  }, [filterMode, clubEvents, schoolEvents])

  /* ── Event options for the sub-selector ─────────────────────────────── */
  const eventOptions = useMemo(() => {
    const src = filterMode === 'club-event' ? clubEvents : schoolEvents
    return src.map(e => ({ value: String(e.id), label: e.name }))
  }, [filterMode, clubEvents, schoolEvents])

  /* ── Task filtering ──────────────────────────────────────────────────── */
  const filteredTasks = useMemo((): TaskItem[] => {
    const active = (t: TaskItem) => t.status === 'Todo' || t.status === 'Doing'
    switch (filterMode) {
      case 'all':
        return tasks.filter(active)
      case 'no-event':
        return tasks.filter(t => !t.eventId && active(t))
      case 'club-event':
      case 'school-event':
        return selEventId ? tasks.filter(t => t.eventId === selEventId) : []
    }
  }, [tasks, filterMode, selEventId])

  /* ── Zoom-based metrics ───────────────────────────────────────────────── */
  const DAY_PX   = ZOOM_DAY_PX[zoom]
  const WIN_WEEKS = WIN_WEEKS_MAP[zoom]
  const NAV      = NAV_STEP[zoom]
  const showDayNumbers = DAY_PX >= 12

  /* ── Timeline window ─────────────────────────────────────────────────── */
  const { rangeStartMs, rangeEndMs } = useMemo(() => {
    const allMs = filteredTasks.flatMap(t => [startOf(t).getTime(), endOf(t).getTime()])
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return {
      rangeStartMs: (allMs.length ? Math.min(...allMs) : today.getTime()) - 3 * 86_400_000,
      rangeEndMs:   (allMs.length ? Math.max(...allMs) : today.getTime()) + 7 * 86_400_000,
    }
  }, [filteredTasks])

  const weeks        = useMemo(() => getWeeks(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])
  const maxOffset    = Math.max(0, weeks.length - WIN_WEEKS)
  const clampedOff   = Math.min(weekOffset, maxOffset)
  const visibleWeeks = weeks.slice(clampedOff, clampedOff + WIN_WEEKS)
  const visStart     = visibleWeeks[0]?.startMs ?? rangeStartMs
  const lastWeek     = visibleWeeks[visibleWeeks.length - 1]
  const visEnd       = (lastWeek?.days.at(-1)?.getTime() ?? rangeEndMs) + 86_400_000
  const chartWidth   = Math.ceil((visEnd - visStart) / 86_400_000) * DAY_PX
  const toPx         = (ms: number) => ((ms - visStart) / 86_400_000) * DAY_PX
  const todayMs      = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
  const todayPx      = toPx(todayMs)

  /* ── Nav button style ────────────────────────────────────────────────── */
  const navBtn = (disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, border: D.border, borderRadius: 8,
    background: D.card, cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? D.inkMuted : D.inkDim, opacity: disabled ? 0.4 : 1,
  })

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="mgmt-page">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>

        {/* Filter mode */}
        <FilterSelect
          value={filterMode}
          onChange={v => setFilterMode(v as FilterMode)}
          options={FILTER_OPTIONS}
          style={{ width: 210 }}
          maxMenuHeight={260}
        />

        {/* Event sub-selector */}
        {(filterMode === 'club-event' || filterMode === 'school-event') && (
          eventOptions.length > 0 ? (
            <FilterSelect
              value={selEventId?.toString() ?? ''}
              onChange={v => { setSelEventId(Number(v)); setWeekOffset(0) }}
              options={eventOptions}
              style={{ width: 220 }}
              maxMenuHeight={260}
            />
          ) : (
            <span style={{ fontSize: 12, color: D.inkMuted, padding: '0 4px' }}>Không có sự kiện nào</span>
          )
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
          {(['Day', 'Week', 'Month'] as const).map(z => (
            <button
              key={z} type="button"
              onClick={() => { setZoom(z); setWeekOffset(0) }}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: zoom === z ? D.ink : D.card,
                color: zoom === z ? '#ffffff' : D.inkDim,
                border: 'none', borderRight: z !== 'Month' ? D.borderLight : 'none',
                fontFamily: 'inherit',
              }}
            >{z}</button>
          ))}
        </div>

        {/* Refresh */}
        <button type="button" onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 4, border: D.border,
          borderRadius: 8, padding: '6px 10px', background: D.card, color: D.inkDim,
          cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, opacity: loading ? 0.6 : 1,
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Summary strip ────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 11 }}>
          <span style={{
            padding: '3px 10px', border: D.borderLight, borderRadius: D.pill,
            background: D.card, color: D.inkDim, fontWeight: 700, fontSize: 11,
          }}>
            {FILTER_LABEL[filterMode]}
            {selEventId && (filterMode === 'club-event' || filterMode === 'school-event')
              ? ` · ${events.find(e => e.id === selEventId)?.name ?? ''}`
              : ''}
          </span>
          <span style={{ color: D.inkMuted }}>{filteredTasks.length} công việc</span>
          <span style={{ color: '#e8e3d6' }}>|</span>
          <span style={{ color: '#3b82f6' }}>{filteredTasks.filter(t => t.status === 'Doing').length} đang làm</span>
          <span style={{ color: '#e8e3d6' }}>|</span>
          <span style={{ color: D.inkMuted }}>{filteredTasks.filter(t => t.status === 'Todo').length} cần làm</span>
          {(filterMode === 'club-event' || filterMode === 'school-event') && (
            <>
              <span style={{ color: '#e8e3d6' }}>|</span>
              <span style={{ color: D.emerald }}>{filteredTasks.filter(t => t.status === 'Done').length} hoàn thành</span>
            </>
          )}
        </div>
      )}

      {/* ── Gantt table ──────────────────────────────────────────────────── */}
      <div className="mgmt-table-scroll" style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow() }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: D.inkMuted, gap: 8 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, color: D.inkMuted, gap: 8 }}>
            <span style={{ fontSize: 28 }}>◎</span>
            <span style={{ fontSize: 13 }}>
              {filterMode === 'all'      ? 'Không có công việc đang thực hiện' :
               filterMode === 'no-event' ? 'Không có công việc nội bộ nào đang thực hiện' :
               eventOptions.length === 0 ? 'Không có sự kiện nào trong danh mục này' :
               'Sự kiện này chưa có công việc'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex' }}>

            {/* ── Left panel: task list ──────────────────────────────────── */}
            <div style={{ width: 320, flexShrink: 0, borderRight: D.borderLight, background: D.card, zIndex: 10 }}>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', height: 48, borderBottom: D.borderLight, background: D.bg }}>
                {(['Công việc', 'TT', 'NV'] as const).map((h, i) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: i > 0 ? 'center' : 'flex-start', padding: i === 0 ? '0 16px' : 0, fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</div>
                ))}
              </div>

              {/* Spacer row aligned with day-number row */}
              {showDayNumbers && <div style={{ height: 28, borderBottom: D.borderLight }} />}

              {/* Task rows */}
              {filteredTasks.map(task => (
                <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', height: 48, borderBottom: D.borderLight }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', minWidth: 0 }}>
                    <span style={{ fontSize: 10, color: D.inkMuted, flexShrink: 0 }}>⠿⠿</span>
                    <span
                      style={{ fontSize: 13, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}
                      title={task.title}
                    >{task.title}</span>
                    {/* Show event badge when in "all" or "no-event" mode so context is visible */}
                    {task.eventName && filterMode === 'all' && (
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#ede9fe', color: '#6d28d9', flexShrink: 0, fontWeight: 700 }}>
                        {task.eventName}
                      </span>
                    )}
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
              ))}
            </div>

            {/* ── Right: scrollable chart ────────────────────────────────── */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
              <div
                className="gantt-area relative"
                style={{ '--chart-w': `${chartWidth}px`, '--day-px': `${DAY_PX}px` } as React.CSSProperties}
              >
                {/* Week header row */}
                <div style={{ display: 'flex', height: 48, borderBottom: D.borderLight, background: D.bg }}>
                  {visibleWeeks.map(w => (
                    <div
                      key={w.startMs}
                      className="gantt-week-cell border-l border-gray-200 flex items-center px-2 shrink-0"
                      style={{ '--days': w.days.length, '--day-px': `${DAY_PX}px` } as React.CSSProperties}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, whiteSpace: 'nowrap' }}>{w.label}</span>
                    </div>
                  ))}
                </div>

                {/* Day-number row (hidden at Month zoom) */}
                {showDayNumbers && (
                  <div style={{ display: 'flex', height: 28, borderBottom: D.borderLight }}>
                    {visibleWeeks.flatMap(w => w.days).map(day => (
                      <div
                        key={day.getTime()}
                        style={{
                          width: DAY_PX, flexShrink: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: DAY_PX >= 24 ? 10 : 9,
                          borderLeft: D.borderLight,
                          color:      day.getTime() === todayMs ? '#2563eb' : D.inkMuted,
                          fontWeight: day.getTime() === todayMs ? 900 : 400,
                        }}
                      >
                        {day.getDate()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Task bar rows */}
                <div style={{ position: 'relative' }}>
                  {filteredTasks.map(task => {
                    const barLeft  = toPx(startOf(task).getTime())
                    const barRight = toPx(endOf(task).getTime())
                    const barW     = Math.max(DAY_PX * 0.8, barRight - barLeft)
                    const pct      = task.progress
                    const barColor = PRIORITY_COLOR[task.priority] ?? D.indigo
                    return (
                      <div key={task.id} style={{ position: 'relative', height: 48, borderBottom: D.borderLight }}>
                        {todayPx >= 0 && todayPx <= chartWidth && (
                          <div
                            className="gantt-today-line absolute top-0 bottom-0 w-px bg-blue-400/50 z-10 pointer-events-none"
                            style={{ '--today-px': `${todayPx}px` } as React.CSSProperties}
                          />
                        )}
                        <div
                          className="gantt-bar-wrap absolute top-1/2 -translate-y-1/2 h-7 rounded-lg overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                          style={{
                            '--bar-left':  `${barLeft}px`,
                            '--bar-w':     `${barW}px`,
                            '--bar-color': barColor,
                            '--bar-pct':   `${pct}%`,
                          } as React.CSSProperties}
                          title={`${task.title} — ${pct}% | ${task.priority} | ${fmtShort(startOf(task))} → ${fmtShort(endOf(task))}`}
                        >
                          <div className="gantt-bar-bg absolute inset-0 rounded-lg opacity-20" />
                          <div className="gantt-bar-fill absolute left-0 top-0 bottom-0 rounded-lg" />
                          {barW > 44 && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>
                                {pct}%
                              </span>
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
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, fontSize: 11, color: D.inkMuted, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 1, height: 16, borderLeft: '2px dashed #93c5fd' }} /> Hôm nay
        </div>
        {(['High', 'Medium', 'Low'] as const).map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="gantt-dot w-3 h-3 rounded-sm" style={{ '--dot-color': PRIORITY_COLOR[p] } as React.CSSProperties} />
            {p === 'High' ? 'Cao' : p === 'Medium' ? 'Vừa' : 'Thấp'}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT.Doing, display: 'inline-block' }} /> Đang làm
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT.Todo, display: 'inline-block' }} /> Cần làm
        </div>
      </div>
    </div>
  )
}
