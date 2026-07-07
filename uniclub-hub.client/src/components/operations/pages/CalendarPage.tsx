import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { getEvents, getTasks } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import type { EventItem, TaskItem, TaskPriority } from '../services/operations.types'
import { D } from '@/components/shared/managementTheme'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  High:   { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Low:    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
}

const PRIORITY_LABEL: Record<TaskPriority, string> = { High: 'Cao', Medium: 'Vừa', Low: 'Thấp' }

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthGrid(date: Date): Date[][] {
  const year = date.getFullYear(); const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const dow = firstDay.getDay()
  const startDate = new Date(year, month, 1 - (dow === 0 ? 6 : dow - 1))
  const lastDay = new Date(year, month + 1, 0)
  const lastDow = lastDay.getDay()
  const endDate = new Date(year, month + 1, 0 + (lastDow === 0 ? 0 : 7 - lastDow))
  const weeks: Date[][] = []
  const cur = new Date(startDate)
  while (cur <= endDate) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    weeks.push(week)
  }
  return weeks
}

function startOfWeek(d: Date): Date {
  const result = new Date(d); const dow = d.getDay()
  result.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); result.setHours(0, 0, 0, 0); return result
}

function getWeekDays(date: Date): Date[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/* ─── Entry type ──────────────────────────────────────────────────────────── */

interface CalEntry {
  type: 'event' | 'deadline'
  label: string
  sub?: string
  time?: string
  priority?: TaskPriority
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function CalendarPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()

  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [events, setEvents] = useState<EventItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [showDeadlines, setShowDeadlines] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evResult, tkResult] = await Promise.all([
        getEvents({ clubId, pageSize: 200 }),
        getTasks({ clubId, departmentId, pageSize: 500 }),
      ])
      setEvents(evResult.items); setTasks(tkResult.items)
    } catch { toast.error('Không thể tải dữ liệu lịch') }
    finally { setLoading(false) }
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  const navigate = (dir: 1 | -1) => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      if (view === 'month') next.setMonth(next.getMonth() + dir)
      else next.setDate(next.getDate() + dir * 7)
      return next
    })
  }

  const getEntriesForDate = (dateStr: string): CalEntry[] => {
    const result: CalEntry[] = []
    if (showEvents) {
      for (const ev of events) {
        if (ev.startTime?.slice(0, 10) === dateStr) {
          result.push({ type: 'event', label: ev.name, sub: ev.location, time: ev.startTime ? formatTime(ev.startTime) : undefined })
        }
      }
    }
    if (showDeadlines) {
      for (const t of tasks) {
        if (t.deadline?.slice(0, 10) === dateStr && t.status !== 'Done') {
          result.push({ type: 'deadline', label: t.title, sub: t.assigneeName, priority: t.priority })
        }
      }
    }
    return result
  }

  const todayEvents    = events.filter(ev => ev.startTime?.slice(0, 10) === todayStr)
  const todayDeadlines = tasks.filter(t  => t.deadline?.slice(0, 10) === todayStr && t.status !== 'Done')
  const monthGrid = getMonthGrid(currentDate)
  const weekDays  = getWeekDays(currentDate)

  const title = view === 'month'
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const wk = getWeekDays(currentDate)
        const s = wk[0]; const e = wk[6]
        return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`
      })()

  const navBtnStyle: React.CSSProperties = {
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: D.borderLight, borderRadius: 8, background: D.card,
    cursor: 'pointer', color: D.inkDim,
  }

  return (
    <div className="mgmt-page ops-calendar-layout">

      {/* ── Calendar panel ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: D.borderLight }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" title="Trước" onClick={() => navigate(-1)} style={navBtnStyle}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, minWidth: 180, textAlign: 'center', userSelect: 'none', margin: 0 }}>
              {title}
            </h2>
            <button type="button" title="Sau" onClick={() => navigate(1)} style={navBtnStyle}>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setCurrentDate(d) }}
              style={{
                marginLeft: 4, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                border: D.borderLight, borderRadius: 6, background: D.bg,
                color: D.inkDim, cursor: 'pointer',
              }}
            >
              Hôm nay
            </button>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: D.bg, border: D.borderLight, borderRadius: 8, padding: 3, gap: 2 }}>
            {(['month', 'week'] as const).map(v => (
              <button
                key={v} type="button" onClick={() => setView(v)}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6,
                  border: view === v ? D.border : 'none',
                  background: view === v ? D.card : 'transparent',
                  boxShadow: view === v ? '2px 2px 0 #0a2f6e' : 'none',
                  color: view === v ? D.ink : D.inkMuted, cursor: 'pointer',
                }}
              >
                {v === 'month' ? 'Tháng' : 'Tuần'}
              </button>
            ))}
          </div>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: D.bg, borderBottom: D.borderLight }}>
          {DAY_LABELS.map(label => (
            <div key={label} style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
        ) : view === 'month' ? (

          /* Month view */
          <div>
            {monthGrid.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < monthGrid.length - 1 ? D.borderLight : 'none' }}>
                {week.map((day, di) => {
                  const ds = toDateStr(day)
                  const isToday = ds === todayStr
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  const entries = getEntriesForDate(ds)
                  const MAX_SHOW = 3
                  const shown = entries.slice(0, MAX_SHOW)
                  const extra = entries.length - MAX_SHOW

                  return (
                    <div
                      key={di}
                      style={{
                        minHeight: 96, padding: 6,
                        borderRight: di < 6 ? D.borderLight : 'none',
                        background: isCurrentMonth ? D.card : D.bg,
                      }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26, fontSize: 12, fontWeight: 700,
                          borderRadius: '50%',
                          background: isToday ? D.indigo : 'transparent',
                          color: isToday ? '#fff' : isCurrentMonth ? D.inkDim : D.inkMuted,
                          border: isToday ? 'none' : 'none',
                        }}>
                          {day.getDate()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {shown.map((entry, ei) => (
                          <div
                            key={ei}
                            title={entry.label}
                            style={{
                              fontSize: 10, padding: '1px 5px', borderRadius: 4,
                              fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              background: entry.type === 'event' ? D.indigo : (entry.priority ? PRIORITY_COLORS[entry.priority].bg : D.bg),
                              color: entry.type === 'event' ? '#fff' : (entry.priority ? PRIORITY_COLORS[entry.priority].text : D.inkDim),
                              border: entry.type === 'event' ? 'none' : `1px solid ${entry.priority ? PRIORITY_COLORS[entry.priority].border : D.borderLight}`,
                            }}
                          >
                            {entry.label}
                          </div>
                        ))}
                        {extra > 0 && (
                          <div style={{ fontSize: 10, color: D.inkMuted, fontWeight: 600, paddingLeft: 4 }}>+{extra} thêm</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

        ) : (

          /* Week view */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((day, di) => {
              const ds = toDateStr(day)
              const isToday = ds === todayStr
              const entries = getEntriesForDate(ds)

              return (
                <div key={di} style={{ borderRight: di < 6 ? D.borderLight : 'none', background: isToday ? '#f5f3ff' : D.card }}>
                  <div style={{
                    padding: '12px 0', textAlign: 'center', borderBottom: D.borderLight,
                    background: isToday ? '#ede9fe' : D.bg,
                  }}>
                    <p style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, margin: 0, color: isToday ? D.indigo : D.ink }}>{day.getDate()}</p>
                    <p style={{ fontSize: 10, marginTop: 2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: isToday ? '#7c3aed' : D.inkMuted }}>
                      {DAY_LABELS[di]}
                    </p>
                  </div>
                  <div style={{ padding: 8, minHeight: 440, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entries.map((entry, ei) => (
                      <div
                        key={ei}
                        style={{
                          fontSize: 11, padding: '6px 8px', borderRadius: 8, lineHeight: 1.4,
                          background: entry.type === 'event' ? D.indigo : (entry.priority ? PRIORITY_COLORS[entry.priority].bg : D.bg),
                          color: entry.type === 'event' ? '#fff' : (entry.priority ? PRIORITY_COLORS[entry.priority].text : D.inkDim),
                          border: entry.type === 'event' ? D.border : `1px solid ${entry.priority ? PRIORITY_COLORS[entry.priority].border : D.borderLight}`,
                        }}
                      >
                        {entry.time && (
                          <p style={{ fontSize: 9, opacity: .8, marginBottom: 2, fontWeight: 700, margin: '0 0 2px' }}>{entry.time}</p>
                        )}
                        <p style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{entry.label}</p>
                        {entry.sub && (
                          <p style={{ fontSize: 10, opacity: .7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, margin: '2px 0 0' }}>{entry.sub}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right sidebar ─────────────────────────────────────────────────── */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Legend & filter */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>Chú giải & Bộ lọc</h3>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)} style={{ width: 14, height: 14, accentColor: D.indigo }} />
            <span style={{ width: 14, height: 14, borderRadius: 3, background: D.indigo, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: D.inkDim, fontWeight: 600 }}>Sự kiện</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showDeadlines} onChange={e => setShowDeadlines(e.target.checked)} style={{ width: 14, height: 14, accentColor: D.emerald }} />
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${D.emerald}`, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: D.inkDim, fontWeight: 600 }}>Deadlines</span>
          </label>
        </div>

        {/* Today's highlights */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Bell size={14} style={{ color: D.indigo }} />
            <h3 style={{ fontSize: 11, fontWeight: 800, color: D.inkDim, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>Tiêu điểm hôm nay</h3>
          </div>

          {todayEvents.length === 0 && todayDeadlines.length === 0 ? (
            <p style={{ fontSize: 11, color: D.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '20px 0', margin: 0 }}>
              Không có sự kiện hay hạn chót hôm nay
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayEvents.map(ev => {
                const startStr = ev.startTime ? formatTime(ev.startTime) : null
                const endStr   = ev.endTime   ? formatTime(ev.endTime)   : null
                const timeStr  = startStr && endStr ? `${startStr} - ${endStr}` : (startStr ?? '')
                return (
                  <div key={ev.id} style={{ borderRadius: 8, borderLeft: `4px solid ${D.indigo}`, background: '#ede9fe', padding: '8px 10px' }}>
                    {timeStr && <p style={{ fontSize: 10, fontWeight: 800, color: D.indigo, margin: '0 0 2px' }}>{timeStr}</p>}
                    <p style={{ fontSize: 12, fontWeight: 700, color: D.ink, margin: 0 }}>{ev.name}</p>
                    {ev.location && <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>{ev.location}</p>}
                  </div>
                )
              })}

              {todayDeadlines.map(t => (
                <div key={t.id} style={{ borderRadius: 8, borderLeft: `4px solid ${D.emerald}`, background: '#d1fae5', padding: '8px 10px' }}>
                  <span style={{
                    display: 'inline-block', fontSize: 9, fontWeight: 800,
                    padding: '1px 6px', borderRadius: 4, marginBottom: 4,
                    background: PRIORITY_COLORS[t.priority].bg,
                    color: PRIORITY_COLORS[t.priority].text,
                    border: `1px solid ${PRIORITY_COLORS[t.priority].border}`,
                  }}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: D.ink, margin: 0 }}>{t.title}</p>
                  {t.assigneeName && <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>{t.assigneeName}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
