import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getEvents } from '../services/operationsApi'
import type { EventItem, EventStatus } from '../services/operations.types'

const STATUS_STYLE: Record<EventStatus, { bar: string; text: string; label: string; dot: string }> = {
  Draft:      { bar: '#e5e7eb', text: '#374151', label: 'Nháp',         dot: '#9ca3af' },
  InProgress: { bar: '#bfdbfe', text: '#1d4ed8', label: 'Đang diễn ra', dot: '#3b82f6' },
  Completed:  { bar: '#a7f3d0', text: '#065f46', label: 'Hoàn thành',   dot: '#10b981' },
  Cancelled:  { bar: '#fecaca', text: '#991b1b', label: 'Đã hủy',       dot: '#ef4444' },
}

const MS_PER_DAY = 86_400_000
const DAY_PX = 30
const ROW_H = 44

interface ParsedEvent {
  ev: EventItem
  start: Date
  end: Date
}

function parseEvents(events: EventItem[]): ParsedEvent[] {
  return events
    .filter(e => e.startTime && e.endTime)
    .map(e => ({ ev: e, start: new Date(e.startTime!), end: new Date(e.endTime!) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

function getMonthMarkers(startMs: number, endMs: number, toPx: (d: Date) => number) {
  const markers: { label: string; leftPx: number }[] = []
  const d = new Date(startMs)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  while (d.getTime() <= endMs) {
    markers.push({
      label: d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
      leftPx: Math.max(0, toPx(d)),
    })
    d.setMonth(d.getMonth() + 1)
  }
  return markers
}

function getWeekTicks(startMs: number, endMs: number, toPx: (d: Date) => number) {
  const ticks: { leftPx: number; label: string }[] = []
  const d = new Date(startMs)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  while (d.getTime() <= endMs) {
    const px = toPx(d)
    if (px >= 0) ticks.push({ leftPx: px, label: `${d.getDate()}` })
    d.setDate(d.getDate() + 7)
  }
  return ticks
}

export default function GanttPage() {
  const [searchParams] = useSearchParams()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('')
  const [tooltip, setTooltip] = useState<{ ev: EventItem; x: number; y: number } | null>(null)

  const load = () => {
    setLoading(true)
    getEvents({ clubId, pageSize: 200 })
      .then(r => setEvents(r.items))
      .catch(() => toast.error('Không thể tải sự kiện'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [clubId])

  const filtered = statusFilter
    ? events.filter(e => e.status === statusFilter)
    : events

  const parsed = parseEvents(filtered)
  const noDateCount = filtered.length - parsed.length

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Date range
  const allMs = parsed.flatMap(p => [p.start.getTime(), p.end.getTime()])
  const rangeStartMs = (allMs.length ? Math.min(...allMs, today.getTime()) : today.getTime()) - 4 * MS_PER_DAY
  const rangeEndMs   = (allMs.length ? Math.max(...allMs, today.getTime()) : today.getTime()) + 10 * MS_PER_DAY
  const totalDays = Math.ceil((rangeEndMs - rangeStartMs) / MS_PER_DAY)
  const chartWidth = totalDays * DAY_PX

  const toPx = (d: Date) => ((d.getTime() - rangeStartMs) / MS_PER_DAY) * DAY_PX
  const todayPx = toPx(today)

  const months = getMonthMarkers(rangeStartMs, rangeEndMs, toPx)
  const weeks  = getWeekTicks(rangeStartMs, rangeEndMs, toPx)

  const STATUS_OPTIONS: Array<EventStatus | ''> = ['', 'Draft', 'InProgress', 'Completed', 'Cancelled']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gantt — Sự kiện</h1>
          <p className="text-sm text-gray-500 mt-1">{parsed.length} sự kiện có ngày</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {s ? STATUS_STYLE[s].label : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {Object.entries(STATUS_STYLE).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: v.bar, border: `1px solid ${v.dot}` }} />
            {v.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-2">
          <span className="w-px h-3 bg-red-400 inline-block" />
          Hôm nay
        </div>
      </div>

      {/* Gantt card */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Đang tải...</div>
        ) : parsed.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
            {filtered.length === 0 ? 'Chưa có sự kiện nào' : 'Sự kiện chưa có ngày bắt đầu/kết thúc'}
          </div>
        ) : (
          <div className="flex">
            {/* Left name column */}
            <div className="w-52 shrink-0 border-r border-gray-100 z-10 bg-white">
              {/* Month header spacer */}
              <div style={{ height: ROW_H }} className="border-b border-gray-100 flex items-end pb-1 px-3">
                <span className="text-xs text-gray-400 font-medium">Sự kiện</span>
              </div>
              {/* Week sub-header spacer */}
              <div style={{ height: 24 }} className="border-b border-gray-100" />
              {/* Event rows */}
              {parsed.map(({ ev }) => (
                <div
                  key={ev.id}
                  style={{ height: ROW_H }}
                  className="border-b border-gray-50 flex items-center px-3 gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: STATUS_STYLE[ev.status].dot }}
                  />
                  <span className="text-xs text-gray-700 truncate leading-tight">{ev.name}</span>
                </div>
              ))}
            </div>

            {/* Right scrollable chart */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: chartWidth, position: 'relative' }}>
                {/* Month header */}
                <div style={{ height: ROW_H }} className="relative border-b border-gray-100 flex items-end">
                  {months.map(m => (
                    <div
                      key={m.label}
                      style={{ position: 'absolute', left: m.leftPx }}
                      className="border-l border-gray-200 pl-2 pb-1 h-full flex items-end"
                    >
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{m.label}</span>
                    </div>
                  ))}
                  {/* Today in header */}
                  <div
                    style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 1 }}
                    className="bg-red-300 z-10"
                  />
                </div>

                {/* Week ticks sub-header */}
                <div style={{ height: 24 }} className="relative border-b border-gray-100 bg-gray-50/50">
                  {weeks.map(w => (
                    <div
                      key={w.leftPx}
                      style={{ position: 'absolute', left: w.leftPx }}
                      className="border-l border-gray-100 pl-1 h-full flex items-center"
                    >
                      <span className="text-[10px] text-gray-400">{w.label}</span>
                    </div>
                  ))}
                  <div
                    style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 1 }}
                    className="bg-red-300 z-10"
                  />
                </div>

                {/* Event bar rows */}
                {parsed.map(({ ev, start, end }) => {
                  const barLeft = toPx(start)
                  const barWidth = Math.max(DAY_PX * 0.8, toPx(end) - toPx(start))
                  const style = STATUS_STYLE[ev.status]

                  return (
                    <div
                      key={ev.id}
                      style={{ height: ROW_H, position: 'relative' }}
                      className="border-b border-gray-50"
                    >
                      {/* Today line */}
                      <div
                        style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 1 }}
                        className="bg-red-300 z-10"
                      />
                      {/* Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: barLeft,
                          width: barWidth,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: style.bar,
                          color: style.text,
                          height: 26,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 8,
                          paddingRight: 8,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => setTooltip({ ev, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-xs font-medium truncate">{ev.name}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {noDateCount > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-t text-xs text-amber-700">
            {noDateCount} sự kiện không có ngày đầy đủ và không hiển thị trên biểu đồ.
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: STATUS_STYLE[tooltip.ev.status].dot }}
            />
            <p className="font-semibold text-gray-800">{tooltip.ev.name}</p>
          </div>
          <p className="text-xs font-medium px-1.5 py-0.5 rounded mb-2 inline-block"
            style={{ background: STATUS_STYLE[tooltip.ev.status].bar, color: STATUS_STYLE[tooltip.ev.status].text }}
          >
            {STATUS_STYLE[tooltip.ev.status].label}
          </p>
          {(tooltip.ev.startTime || tooltip.ev.endTime) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Calendar size={11} />
              {tooltip.ev.startTime
                ? new Date(tooltip.ev.startTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '?'
              }
              {' → '}
              {tooltip.ev.endTime
                ? new Date(tooltip.ev.endTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '?'
              }
            </div>
          )}
          {tooltip.ev.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={11} />
              {tooltip.ev.location}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
