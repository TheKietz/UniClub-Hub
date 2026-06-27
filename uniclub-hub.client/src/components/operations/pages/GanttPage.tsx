import './gantt.css'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTasks, getEvents } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import type { TaskItem, EventItem, TaskStatus } from '../services/operations.types'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { D } from '@/components/shared/managementTheme'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DAY_PX = 36
const WIN_WEEKS = 4

const STATUS_DOT: Record<TaskStatus, string> = { Todo: '#9ca3af', Doing: '#3b82f6', Reviewing: '#8b5cf6', Done: D.emerald }
const PRIORITY_BAR_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: D.indigo }

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function startOf(task: TaskItem): Date {
  const d = new Date(task.createdAt); d.setHours(0, 0, 0, 0); return d
}
function endOf(task: TaskItem): Date {
  return task.deadline ? new Date(task.deadline) : (() => { const d = startOf(task); d.setDate(d.getDate() + 7); return d })()
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
    weeks.push({ label: `W${wn} - ${mo}`, startMs: weekMs, days })
  }
  return weeks
}

/* ─── Avatar ──────────────────────────────────────────────────────────────── */

const PALETTE = ['#1d4ed8', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']
function avatarBg(name: string): string {
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

  const [tasks, setTasks]     = useState<TaskItem[]>([])
  const [events, setEvents]   = useState<EventItem[]>([])
  const [selEventId, setSelEventId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom]       = useState<'Day' | 'Week' | 'Month'>('Week')
  const [weekOffset, setWeekOffset] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getEvents({ clubId, pageSize: 50 }), getTasks({ clubId, departmentId, pageSize: 200 })])
      .then(([evRes, tkRes]) => {
        setEvents(evRes.items); setTasks(tkRes.items)
        if (evRes.items.length) setSelEventId(evRes.items[0].id)
      })
      .catch(() => toast.error('Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

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

  const weeks       = useMemo(() => getWeeks(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])
  const maxOffset   = Math.max(0, weeks.length - WIN_WEEKS)
  const clampedOff  = Math.min(weekOffset, maxOffset)
  const visibleWeeks = weeks.slice(clampedOff, clampedOff + WIN_WEEKS)
  const visStart    = visibleWeeks[0]?.startMs ?? rangeStartMs
  const lastWeek    = visibleWeeks[visibleWeeks.length - 1]
  const visEnd      = (lastWeek?.days.at(-1)?.getTime() ?? rangeEndMs) + 86_400_000
  const totalVisDays = Math.ceil((visEnd - visStart) / 86_400_000)
  const chartWidth  = totalVisDays * DAY_PX
  const toPx = (ms: number) => ((ms - visStart) / 86_400_000) * DAY_PX
  const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
  const todayPx = toPx(todayMs)
  const overallProgress = filteredTasks.length
    ? Math.round(filteredTasks.filter(t => t.status === 'Done').length / filteredTasks.length * 100)
    : 0
  const depArrows: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, border: D.border, borderRadius: 8,
    background: D.card, cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? D.inkMuted : D.inkDim, opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Event header */}
      {selEvent && (
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', padding: '2px 8px', borderRadius: 4, background: D.ink, color: '#ffffff', textTransform: 'uppercase' }}>EVENT</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: D.pill,
                background: '#d1fae5', color: '#065f46',
              }}>
                {selEvent.status === 'InProgress' ? 'In Progress' : selEvent.status}
              </span>
              <h1 style={{ fontSize: 18, fontWeight: 900, color: D.ink, margin: 0 }}>{selEvent.name}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <FilterSelect
                value={selEventId?.toString() ?? ''}
                onChange={value => setSelEventId(Number(value))}
                options={events.map(ev => ({ value: ev.id.toString(), label: ev.name }))}
                style={{ width: 220 }}
                maxMenuHeight={260}
              />
              <button
                type="button"
                onClick={load}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  border: D.border, borderRadius: 8, padding: '6px 10px',
                  background: D.card, color: D.inkDim, cursor: 'pointer', fontSize: 12,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 4px' }}>Timeline</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: D.inkDim, margin: 0 }}>
                {selEvent.startTime ? fmtShort(new Date(selEvent.startTime)) : '—'} → {selEvent.endTime ? fmtShort(new Date(selEvent.endTime)) : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 4px' }}>Owner</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selEvent.createdBy && <GanttAvatar name={selEvent.createdBy} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: D.inkDim }}>{selEvent.createdBy ?? 'Chưa xác định'}</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>Overall Progress</p>
                <span style={{ fontSize: 13, fontWeight: 900, color: D.ink }}>{overallProgress}%</span>
              </div>
              <div style={{ height: 6, background: '#dce6f4', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  className="gantt-progress-fill"
                  style={{ '--bar-color': D.indigo, '--bar-pct': `${overallProgress}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" title="Tuần trước" onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={clampedOff === 0} style={navBtnStyle(clampedOff === 0)}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" title="Tuần sau" onClick={() => setWeekOffset(o => Math.min(maxOffset, o + 1))} disabled={clampedOff >= maxOffset} style={navBtnStyle(clampedOff >= maxOffset)}>
            <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', border: D.border, borderRadius: 8, overflow: 'hidden' }}>
            {(['Day', 'Week', 'Month'] as const).map(z => (
              <button
                key={z} type="button" onClick={() => setZoom(z)}
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
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              border: D.border, borderRadius: 8, background: D.ink, color: '#ffffff',
              fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: D.shadow(2, 2),
              fontFamily: 'inherit',
            }}
          >
            <Plus size={13} /> Add Task
          </button>
        </div>
      </div>

      {/* Gantt table */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: D.inkMuted }}>Đang tải...</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: D.inkMuted, fontSize: 13 }}>Chưa có công việc</div>
        ) : (
          <div style={{ display: 'flex' }}>
            {/* Left fixed columns */}
            <div style={{ width: 320, flexShrink: 0, borderRight: D.borderLight, background: D.card, zIndex: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', height: 48, borderBottom: D.borderLight, background: D.bg }}>
                {['Task Name', 'Status', 'Owner'].map((h, i) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: i > 0 ? 'center' : 'flex-start', padding: i === 0 ? '0 16px' : 0, fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</div>
                ))}
              </div>
              <div style={{ height: 28, borderBottom: D.borderLight }} />
              {filteredTasks.map(task => (
                <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', height: 48, borderBottom: D.borderLight }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: D.inkMuted, flexShrink: 0, cursor: 'grab', userSelect: 'none' }}>⠿⠿</span>
                    <span style={{ fontSize: 13, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{task.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT[task.status], display: 'inline-block' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {task.assigneeName ? <GanttAvatar name={task.assigneeName} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: D.bg }} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Right scrollable chart */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
              <div className="gantt-area relative" style={{ '--chart-w': `${chartWidth}px` } as React.CSSProperties}>
                {/* Week header */}
                <div style={{ display: 'flex', height: 48, borderBottom: D.borderLight, background: D.bg }}>
                  {visibleWeeks.map(w => (
                    <div
                      key={w.startMs}
                      className="gantt-week-cell border-l border-gray-200 flex items-center px-2 shrink-0"
                      style={{ '--days': w.days.length } as React.CSSProperties}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, whiteSpace: 'nowrap' }}>{w.label}</span>
                    </div>
                  ))}
                </div>
                {/* Day numbers row */}
                <div style={{ display: 'flex', height: 28, borderBottom: D.borderLight }}>
                  {visibleWeeks.flatMap(w => w.days).map(day => (
                    <div
                      key={day.getTime()}
                      style={{
                        width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, borderLeft: D.borderLight,
                        color: day.getTime() === todayMs ? '#2563eb' : D.inkMuted,
                        fontWeight: day.getTime() === todayMs ? 900 : 400,
                      }}
                    >
                      {day.getDate()}
                    </div>
                  ))}
                </div>
                {/* Task bar rows */}
                <div style={{ position: 'relative' }}>
                  {filteredTasks.map((task, idx) => {
                    const barLeft  = toPx(startOf(task).getTime())
                    const barRight = toPx(endOf(task).getTime())
                    const barW     = Math.max(DAY_PX * 0.8, barRight - barLeft)
                    const pct      = task.progress
                    const barColor = PRIORITY_BAR_COLOR[task.priority] ?? D.indigo

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
                          title={`${task.title} (${idx + 1}) — ${pct}%`}
                        >
                          <div className="gantt-bar-bg absolute inset-0 rounded-lg opacity-20" />
                          <div className="gantt-bar-fill absolute left-0 top-0 bottom-0 rounded-lg" />
                          {barW > 44 && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>{pct}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {depArrows.length > 0 && (
                    <svg
                      className="gantt-dep-svg absolute inset-0 pointer-events-none"
                      style={{ '--svg-w': `${chartWidth}px`, '--svg-h': `${filteredTasks.length * 48}px` } as React.CSSProperties}
                    >
                      <defs>
                        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L6,3 Z" fill="#6366f1" />
                        </marker>
                      </defs>
                      {depArrows.map(({ x1, y1, x2, y2, key }) => (
                        <path key={key} d={`M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`} fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2" markerEnd="url(#arr)" />
                      ))}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16, fontSize: 11, color: D.inkMuted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 1, height: 16, borderLeft: '2px dashed #93c5fd' }} />
          Hôm nay
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="24" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          Phụ thuộc
        </div>
        {(['High', 'Medium', 'Low'] as const).map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="gantt-dot w-3 h-3 rounded-sm" style={{ '--dot-color': PRIORITY_BAR_COLOR[p] } as React.CSSProperties} />
            {p === 'High' ? 'Cao' : p === 'Medium' ? 'Vừa' : 'Thấp'}
          </div>
        ))}
      </div>
    </div>
  )
}
