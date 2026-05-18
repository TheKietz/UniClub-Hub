import './gantt.css'
import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTasks, getEvents } from '../services/operationsApi'
import type { TaskItem, EventItem, TaskStatus } from '../services/operations.types'
/* ── Constants ─────────────────────────────────────────────────────────────── */

const DAY_PX = 36          // keep in sync with gantt.css calc(var(--days)*36px)
const WIN_WEEKS = 4        // visible week window

const STATUS_DOT: Record<TaskStatus, string> = {
  Todo:  'bg-gray-400',
  Doing: 'bg-blue-500',
  Done:  'bg-emerald-500',
}
const PRIORITY_BAR_COLOR: Record<string, string> = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#4f46e5',
}

/* ── Helpers ────────────────────────────────────────────────────────────────*/

function startOf(task: TaskItem): Date {
  const d = new Date(task.createdAt)
  d.setHours(0, 0, 0, 0)
  return d
}
function endOf(task: TaskItem): Date {
  return task.deadline ? new Date(task.deadline) : (() => {
    const d = startOf(task); d.setDate(d.getDate() + 7); return d
  })()
}
function fmtShort(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function getWeeks(startMs: number, endMs: number) {
  const weeks: { label: string; startMs: number; days: Date[] }[] = []
  const d = new Date(startMs)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(0, 0, 0, 0)
  while (d.getTime() <= endMs) {
    const days: Date[] = []
    const weekMs = d.getTime()
    for (let i = 0; i < 7; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
    const mo = new Date(weekMs).toLocaleDateString('vi-VN', { month: 'short' })
    const wn = Math.ceil(new Date(weekMs).getDate() / 7)
    weeks.push({ label: `W${wn} - ${mo}`, startMs: weekMs, days })
  }
  return weeks
}

/* ── Avatar ─────────────────────────────────────────────────────────────────*/

const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']
function avatarBg(name: string): string {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()
}

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

/* ══════════════════════════════════════════════════════════════════════════ */

export default function GanttPage() {
  const [searchParams] = useSearchParams()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [tasks, setTasks]     = useState<TaskItem[]>([])
  const [events, setEvents]   = useState<EventItem[]>([])
  const [selEventId, setSelEventId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom]       = useState<'Day' | 'Week' | 'Month'>('Week')
  const [weekOffset, setWeekOffset] = useState(0)

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const load = () => {
    setLoading(true)
    Promise.all([getEvents({ clubId, pageSize: 50 }), getTasks({ clubId, pageSize: 200 })])
      .then(([evRes, tkRes]) => {
        setEvents(evRes.items); setTasks(tkRes.items)
        if (evRes.items.length) setSelEventId(evRes.items[0].id)
      })
      .catch(() => toast.error('Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [clubId])  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const selEvent = events.find(e => e.id === selEventId) ?? events[0] ?? null

  const filteredTasks = useMemo(() => {
    if (!selEvent) return tasks
    const byEvent = tasks.filter(t => t.eventId === selEvent.id)
    return byEvent.length ? byEvent : tasks
  }, [tasks, selEvent])

  const { rangeStartMs, rangeEndMs } = useMemo(() => {
    const allMs = filteredTasks.flatMap(t => [startOf(t).getTime(), endOf(t).getTime()])
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return {
      rangeStartMs: (allMs.length ? Math.min(...allMs) : today.getTime()) - 3 * 86_400_000,
      rangeEndMs:   (allMs.length ? Math.max(...allMs) : today.getTime()) + 7 * 86_400_000,
    }
  }, [filteredTasks])

  const weeks = useMemo(() => getWeeks(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])

  const maxOffset    = Math.max(0, weeks.length - WIN_WEEKS)
  const clampedOff   = Math.min(weekOffset, maxOffset)
  const visibleWeeks = weeks.slice(clampedOff, clampedOff + WIN_WEEKS)

  const visStart   = visibleWeeks[0]?.startMs ?? rangeStartMs
  const lastWeek   = visibleWeeks[visibleWeeks.length - 1]
  const visEnd     = (lastWeek?.days.at(-1)?.getTime() ?? rangeEndMs) + 86_400_000
  const totalVisDays = Math.ceil((visEnd - visStart) / 86_400_000)
  const chartWidth   = totalVisDays * DAY_PX

  const toPx = (ms: number) => ((ms - visStart) / 86_400_000) * DAY_PX

  const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
  const todayPx = toPx(todayMs)

  const overallProgress = filteredTasks.length
    ? Math.round(filteredTasks.filter(t => t.status === 'Done').length / filteredTasks.length * 100)
    : 0

  /* ── Dependency arrows (real deps require per-task API calls — omitted for overview) */
  const depArrows: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []

  /* ════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">

      {/* ── Event header ──────────────────────────────────────────────── */}
      {selEvent && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-600 text-white uppercase">EVENT</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                {selEvent.status === 'InProgress' ? 'In Progress' : selEvent.status}
              </span>
              <h1 className="text-xl font-bold text-gray-900">{selEvent.name}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Chọn sự kiện"
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                value={selEventId ?? ''}
                onChange={e => setSelEventId(Number(e.target.value))}
              >
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Timeline</p>
              <p className="text-sm font-medium text-gray-700">
                {selEvent.startTime ? fmtShort(new Date(selEvent.startTime)) : '—'}
                {' → '}
                {selEvent.endTime ? fmtShort(new Date(selEvent.endTime)) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Owner</p>
              <div className="flex items-center gap-2">
                {selEvent.createdBy && <GanttAvatar name={selEvent.createdBy} />}
                <span className="text-sm font-medium text-gray-700">
                  {selEvent.createdBy ?? 'Chưa xác định'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Overall Progress</p>
                <span className="text-sm font-bold text-[#1a3a6c]">{overallProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="gantt-progress-fill"
                  style={{ '--bar-color': '#1a3a6c', '--bar-pct': `${overallProgress}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Tuần trước"
            onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
            disabled={clampedOff === 0}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 transition"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            title="Tuần sau"
            onClick={() => setWeekOffset(o => Math.min(maxOffset, o + 1))}
            disabled={clampedOff >= maxOffset}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 transition"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            {(['Day', 'Week', 'Month'] as const).map(z => (
              <button
                key={z} type="button" onClick={() => setZoom(z)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  zoom === z ? 'bg-[#1a3a6c] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >{z}</button>
            ))}
          </div>
          <Button size="sm" className="bg-[#1a3a6c] hover:bg-[#152f59] text-white gap-1.5">
            <Plus size={14} /> Add Task
          </Button>
        </div>
      </div>

      {/* ── Gantt table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-60 text-gray-400">Đang tải...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-gray-300 text-sm">Chưa có công việc</div>
        ) : (
          <div className="flex">
            {/* Left fixed columns */}
            <div className="w-[320px] shrink-0 border-r border-gray-100 bg-white z-10">
              {/* Header */}
              <div className="grid grid-cols-[1fr_48px_48px] h-12 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Task Name</div>
                <div className="flex items-center justify-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</div>
                <div className="flex items-center justify-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Owner</div>
              </div>
              {/* Sub-header spacer */}
              <div className="h-7 border-b border-gray-100" />
              {/* Rows */}
              {filteredTasks.map(task => (
                <div key={task.id} className="grid grid-cols-[1fr_48px_48px] h-12 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2 px-3 min-w-0">
                    <span className="text-gray-300 text-xs shrink-0 cursor-grab select-none">⠿⠿</span>
                    <span className="text-sm text-gray-800 truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[task.status]}`} />
                  </div>
                  <div className="flex items-center justify-center">
                    {task.assigneeName
                      ? <GanttAvatar name={task.assigneeName} />
                      : <div className="w-6 h-6 rounded-full bg-gray-100" />
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Right scrollable chart */}
            <div className="flex-1 overflow-x-auto">
              <div
                className="gantt-area relative"
                style={{ '--chart-w': `${chartWidth}px` } as React.CSSProperties}
              >
                {/* Week header */}
                <div className="flex h-12 border-b border-gray-100 bg-gray-50/60">
                  {visibleWeeks.map(w => (
                    <div
                      key={w.startMs}
                      className="gantt-week-cell border-l border-gray-200 flex items-center px-2 shrink-0"
                      style={{ '--days': w.days.length } as React.CSSProperties}
                    >
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{w.label}</span>
                    </div>
                  ))}
                </div>

                {/* Day numbers row */}
                <div className="flex h-7 border-b border-gray-100">
                  {visibleWeeks.flatMap(w => w.days).map(day => (
                    <div
                      key={day.getTime()}
                      className={`w-9 shrink-0 flex items-center justify-center text-[10px] border-l border-gray-50 ${
                        day.getTime() === todayMs ? 'text-blue-600 font-bold' : 'text-gray-400'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  ))}
                </div>

                {/* Task bar rows */}
                <div className="relative">
                  {filteredTasks.map((task, idx) => {
                    const barLeft  = toPx(startOf(task).getTime())
                    const barRight = toPx(endOf(task).getTime())
                    const barW     = Math.max(DAY_PX * 0.8, barRight - barLeft)
                    const pct      = task.progress
                    const barColor = PRIORITY_BAR_COLOR[task.priority] ?? '#4f46e5'

                    return (
                      <div key={task.id} className="relative h-12 border-b border-gray-50">
                        {/* Today marker */}
                        {todayPx >= 0 && todayPx <= chartWidth && (
                          <div
                            className="gantt-today-line absolute top-0 bottom-0 w-px bg-blue-400/50 z-10 pointer-events-none"
                            style={{ '--today-px': `${todayPx}px` } as React.CSSProperties}
                          />
                        )}

                        {/* Bar */}
                        <div
                          className="gantt-bar-wrap absolute top-1/2 -translate-y-1/2 h-7 rounded-lg overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                          style={{
                            '--bar-left':  `${barLeft}px`,
                            '--bar-w':     `${barW}px`,
                            '--bar-color': barColor,
                            '--bar-pct':   `${pct}%`,
                          } as React.CSSProperties}
                          title={`${task.title} (${idx + 1}) — ${pct}%`}
                        >
                          <div className="gantt-bar-bg absolute inset-0 rounded-lg opacity-20" />
                          <div className="gantt-bar-fill absolute left-0 top-0 bottom-0 rounded-lg" />
                          {barW > 44 && (
                            <div className="absolute inset-0 flex items-center px-2">
                              <span className="text-[11px] font-semibold text-white drop-shadow-sm whitespace-nowrap">
                                {pct}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Dependency arrows SVG */}
                  {depArrows.length > 0 && (
                    <svg
                      className="gantt-dep-svg absolute inset-0 pointer-events-none"
                      style={{
                        '--svg-w': `${chartWidth}px`,
                        '--svg-h': `${filteredTasks.length * 48}px`,
                      } as React.CSSProperties}
                    >
                      <defs>
                        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L6,3 Z" fill="#6366f1" />
                        </marker>
                      </defs>
                      {depArrows.map(({ x1, y1, x2, y2, key }) => (
                        <path
                          key={key}
                          d={`M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                          markerEnd="url(#arr)"
                        />
                      ))}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mt-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 border-l-2 border-dashed border-blue-400/70" />
          Hôm nay
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          Phụ thuộc
        </div>
        {(['High', 'Medium', 'Low'] as const).map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <div
              className="gantt-dot w-3 h-3 rounded-sm"
              style={{ '--dot-color': PRIORITY_BAR_COLOR[p] } as React.CSSProperties}
            />
            {p === 'High' ? 'Cao' : p === 'Medium' ? 'Vừa' : 'Thấp'}
          </div>
        ))}
      </div>
    </div>
  )
}
