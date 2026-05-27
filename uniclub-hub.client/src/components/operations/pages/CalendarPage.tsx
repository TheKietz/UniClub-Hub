import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { getEvents, getTasks } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import type { EventItem, TaskItem, TaskPriority } from '../services/operations.types'

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

const PRIORITY_PILL: Record<TaskPriority, string> = {
  High:   'bg-red-50 text-red-600 border-red-300',
  Medium: 'bg-amber-50 text-amber-700 border-amber-300',
  Low:    'bg-emerald-50 text-emerald-600 border-emerald-300',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  High: 'Cao', Medium: 'Vừa', Low: 'Thấp',
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthGrid(date: Date): Date[][] {
  const year = date.getFullYear()
  const month = date.getMonth()

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
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function startOfWeek(d: Date): Date {
  const result = new Date(d)
  const dow = d.getDay()
  result.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  result.setHours(0, 0, 0, 0)
  return result
}

function getWeekDays(date: Date): Date[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
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
  pillClass: string
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function CalendarPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()

  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })
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
      setEvents(evResult.items)
      setTasks(tkResult.items)
    } catch {
      toast.error('Không thể tải dữ liệu lịch')
    } finally {
      setLoading(false)
    }
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

  /* ─── Derived ─────────────────────────────────────────────────────────── */

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
          result.push({
            type: 'event',
            label: ev.name,
            sub: ev.location,
            time: ev.startTime ? formatTime(ev.startTime) : undefined,
            pillClass: '',
          })
        }
      }
    }
    if (showDeadlines) {
      for (const t of tasks) {
        if (t.deadline?.slice(0, 10) === dateStr && t.status !== 'Done') {
          result.push({
            type: 'deadline',
            label: t.title,
            sub: t.assigneeName,
            pillClass: PRIORITY_PILL[t.priority],
          })
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

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50 p-6">
      <div className="flex items-start gap-4">

        {/* ── Calendar panel ──────────────────────────────────────────── */}
        <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden">

          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Tháng/Tuần trước"
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <h2 className="text-base font-bold text-gray-800 min-w-[180px] text-center select-none">
                {title}
              </h2>

              <button
                type="button"
                title="Tháng/Tuần sau"
                onClick={() => navigate(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setCurrentDate(d) }}
                className="ml-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
              >
                Hôm nay
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['month', 'week'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    view === v ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v === 'month' ? 'Tháng' : 'Tuần'}
                </button>
              ))}
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {DAY_LABELS.map(label => (
              <div key={label} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Đang tải...</div>
          ) : view === 'month' ? (

            /* ── Month view ────────────────────────────────────────────── */
            <div>
              {monthGrid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b last:border-0">
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
                        className={`min-h-[96px] p-1.5 border-r last:border-0 ${
                          !isCurrentMonth ? 'bg-gray-50/60' : ''
                        }`}
                      >
                        <div className="flex justify-start mb-1">
                          <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                            isToday
                              ? 'bg-indigo-600 text-white font-bold'
                              : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                          }`}>
                            {day.getDate()}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          {shown.map((entry, ei) => (
                            <div
                              key={ei}
                              title={entry.label}
                              className={`text-[11px] px-1.5 py-0.5 rounded truncate leading-tight font-medium ${
                                entry.type === 'event'
                                  ? 'bg-indigo-600 text-white'
                                  : `border ${entry.pillClass}`
                              }`}
                            >
                              {entry.label}
                            </div>
                          ))}
                          {extra > 0 && (
                            <div className="text-[10px] text-gray-400 font-medium pl-1">+{extra} thêm</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

          ) : (

            /* ── Week view ─────────────────────────────────────────────── */
            <div className="grid grid-cols-7">
              {weekDays.map((day, di) => {
                const ds = toDateStr(day)
                const isToday = ds === todayStr
                const entries = getEntriesForDate(ds)

                return (
                  <div key={di} className={`border-r last:border-0 ${isToday ? 'bg-indigo-50/30' : ''}`}>
                    {/* Day number */}
                    <div className={`py-3 text-center border-b ${isToday ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                      <p className={`text-2xl font-bold leading-none ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </p>
                      <p className={`text-[11px] mt-0.5 font-semibold uppercase ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>
                        {DAY_LABELS[di]}
                      </p>
                    </div>

                    {/* Entries */}
                    <div className="p-2 space-y-1.5 min-h-[440px]">
                      {entries.map((entry, ei) => (
                        <div
                          key={ei}
                          className={`text-xs px-2 py-1.5 rounded-lg leading-tight ${
                            entry.type === 'event'
                              ? 'bg-indigo-600 text-white'
                              : `border ${entry.pillClass}`
                          }`}
                        >
                          {entry.time && (
                            <p className="text-[10px] opacity-75 mb-0.5 font-medium">{entry.time}</p>
                          )}
                          <p className="font-semibold truncate">{entry.label}</p>
                          {entry.sub && (
                            <p className="text-[10px] opacity-70 truncate mt-0.5">{entry.sub}</p>
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

        {/* ── Right sidebar ────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 flex flex-col gap-4">

          {/* Legend & filter */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Chú giải & Bộ lọc</h3>

            <label className="flex items-center gap-2.5 cursor-pointer mb-2.5">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={e => setShowEvents(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="w-3.5 h-3.5 rounded-sm bg-indigo-600 shrink-0" />
              <span className="text-sm text-gray-700">Sự kiện (Events)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeadlines}
                onChange={e => setShowDeadlines(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 shrink-0" />
              <span className="text-sm text-gray-700">Hạn chót (Deadlines)</span>
            </label>
          </div>

          {/* Today's highlights */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-700">Tiêu điểm hôm nay</h3>
            </div>

            {todayEvents.length === 0 && todayDeadlines.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">
                Không có sự kiện hay hạn chót hôm nay
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {todayEvents.map(ev => {
                  const startStr = ev.startTime ? formatTime(ev.startTime) : null
                  const endStr   = ev.endTime   ? formatTime(ev.endTime)   : null
                  const timeStr  = startStr && endStr ? `${startStr} - ${endStr}` : (startStr ?? '')

                  return (
                    <div key={ev.id} className="rounded-xl border-l-4 border-l-indigo-500 bg-indigo-50/60 px-3 py-2.5">
                      {timeStr && (
                        <p className="text-[11px] font-bold text-indigo-500 mb-0.5">{timeStr}</p>
                      )}
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{ev.name}</p>
                      {ev.location && (
                        <p className="text-xs text-gray-500 mt-0.5">{ev.location}</p>
                      )}
                    </div>
                  )
                })}

                {todayDeadlines.map(t => (
                  <div key={t.id} className="rounded-xl border-l-4 border-l-emerald-500 bg-emerald-50/60 px-3 py-2.5">
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${PRIORITY_PILL[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{t.title}</p>
                    {t.assigneeName && (
                      <p className="text-xs text-gray-500 mt-0.5">{t.assigneeName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
