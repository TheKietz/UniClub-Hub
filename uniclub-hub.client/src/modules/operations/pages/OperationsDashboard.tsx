import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  LayoutDashboard, Layers, Calendar, BarChart2,
  Activity, AlertTriangle, CheckSquare, Clock, ListTodo, TrendingUp,
} from 'lucide-react'
import { getTasks, getSprints, getEvents } from '../services/operationsApi'
import type { TaskItem, SprintItem, EventItem, TaskStatus, SprintStatus, EventStatus } from '../services/operations.types'

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  Todo:  'Chưa làm',
  Doing: 'Đang làm',
  Done:  'Hoàn thành',
}

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  Planning:  'Lên kế hoạch',
  Active:    'Đang chạy',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

const EVENT_STATUS_BADGE: Record<EventStatus, { label: string; className: string }> = {
  Draft:      { label: 'Nháp',         className: 'bg-gray-100 text-gray-600' },
  InProgress: { label: 'Đang diễn ra', className: 'bg-blue-100 text-blue-700' },
  Completed:  { label: 'Hoàn thành',   className: 'bg-green-100 text-green-700' },
  Cancelled:  { label: 'Đã hủy',       className: 'bg-red-100 text-red-700' },
}

const NAV_CARDS = [
  { label: 'Kanban',   path: '/operations/kanban',    icon: LayoutDashboard, color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Sprints',  path: '/operations/sprints',   icon: Layers,          color: 'bg-violet-50 text-violet-600' },
  { label: 'Sự kiện', path: '/operations/events',    icon: Calendar,        color: 'bg-blue-50 text-blue-600' },
  { label: 'Phân công',path: '/operations/workload',  icon: BarChart2,       color: 'bg-amber-50 text-amber-600' },
  { label: 'Gantt',    path: '/operations/gantt',     icon: Activity,        color: 'bg-teal-50 text-teal-600' },
  { label: 'Cảnh báo',path: '/operations/deadlines', icon: AlertTriangle,   color: 'bg-red-50 text-red-600' },
]

export default function OperationsDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [sprints, setSprints] = useState<SprintItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getTasks({ clubId, pageSize: 500 }),
      getSprints({ clubId, pageSize: 20 }),
      getEvents({ clubId, pageSize: 20 }),
    ])
      .then(([taskData, sprintData, eventData]) => {
        setTasks(taskData.items)
        setSprints(sprintData.items)
        setEvents(eventData.items)
      })
      .catch(() => toast.error('Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [clubId])

  const tasksByStatus = (s: TaskStatus) => tasks.filter(t => t.status === s).length
  const overdueCount = tasks.filter(t =>
    t.status !== 'Done' && t.deadline && new Date(t.deadline) < new Date()
  ).length

  const activeSprint = sprints.find(s => s.status === 'Active') ?? null
  const activeSprintTasks = activeSprint ? tasks.filter(t => t.sprintId === activeSprint.id) : []
  const activeSprintDone = activeSprintTasks.filter(t => t.status === 'Done').length
  const activeSprintProgress = activeSprintTasks.length
    ? Math.round((activeSprintDone / activeSprintTasks.length) * 100)
    : 0

  const upcomingEvents = events
    .filter(e => e.status !== 'Cancelled' && e.status !== 'Completed')
    .sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : Infinity
      const bTime = b.startTime ? new Date(b.startTime).getTime() : Infinity
      return aTime - bTime
    })
    .slice(0, 3)

  const formatDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  const withClub = (path: string) => `${path}?clubId=${clubId}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan vận hành</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng hợp hoạt động của câu lạc bộ</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Đang tải...</div>
      ) : (
        <>
          {/* Task summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {([
              { label: 'Tổng công việc', value: tasks.length,         icon: ListTodo,     cls: 'bg-indigo-50 text-indigo-600' },
              { label: 'Chưa làm',       value: tasksByStatus('Todo'), icon: Clock,        cls: 'bg-gray-100 text-gray-600' },
              { label: 'Đang làm',       value: tasksByStatus('Doing'),icon: TrendingUp,   cls: 'bg-amber-50 text-amber-600' },
              { label: 'Hoàn thành',     value: tasksByStatus('Done'), icon: CheckSquare,  cls: 'bg-green-50 text-green-600' },
            ] as const).map(({ label, value, icon: Icon, cls }) => (
              <div key={label} className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500 truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {overdueCount > 0 && (
            <div
              className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => navigate(withClub('/operations/deadlines'))}
            >
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700">
                {overdueCount} công việc đã quá hạn — nhấn để xem chi tiết
              </p>
            </div>
          )}

          {/* Active sprint + upcoming events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Active sprint */}
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Layers size={16} className="text-violet-500" /> Sprint đang chạy
              </h2>
              {!activeSprint ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  Không có sprint nào đang chạy
                </p>
              ) : (
                <>
                  <p className="font-semibold text-gray-800 mb-1">{activeSprint.name}</p>
                  {activeSprint.goal && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{activeSprint.goal}</p>
                  )}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {activeSprintDone} / {activeSprintTasks.length} công việc hoàn thành
                      </span>
                      <span className="text-xs font-semibold text-indigo-600">{activeSprintProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${activeSprintProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-indigo-600 font-medium hover:underline"
                    onClick={() => navigate(`/operations/kanban?clubId=${clubId}&sprintId=${activeSprint.id}`)}
                  >
                    Xem Kanban →
                  </button>
                </>
              )}
            </div>

            {/* Upcoming events */}
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Sự kiện sắp tới
              </h2>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">Không có sự kiện sắp tới</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(ev => {
                    const badge = EVENT_STATUS_BADGE[ev.status]
                    return (
                      <div key={ev.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{ev.name}</p>
                          {ev.startTime && (
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(ev.startTime)}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick nav */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {NAV_CARDS.map(({ label, path, icon: Icon, color }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(withClub(path))}
                className="bg-white rounded-xl border p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
