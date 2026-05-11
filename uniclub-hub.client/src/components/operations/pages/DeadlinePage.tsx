import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, AlertTriangle, Clock, CheckCircle, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTasks } from '../services/operationsApi'
import type { TaskItem, TaskStatus } from '../services/operations.types'

const MS_PER_DAY = 86_400_000

const STATUS_LABEL: Record<TaskStatus, string> = {
  Todo:  'Chưa làm',
  Doing: 'Đang làm',
  Done:  'Hoàn thành',
}
const STATUS_PILL: Record<TaskStatus, string> = {
  Todo:  'bg-gray-100 text-gray-600',
  Doing: 'bg-blue-100 text-blue-700',
  Done:  'bg-green-100 text-green-700',
}

type RiskLevel = 'behind' | 'at-risk' | 'on-track' | 'unknown'

function getRisk(task: TaskItem): RiskLevel {
  if (!task.deadline || !task.createdAt || task.status === 'Done') return 'unknown'
  const now = Date.now()
  const start = new Date(task.createdAt).getTime()
  const end   = new Date(task.deadline).getTime()
  const total = end - start
  if (total <= 0) return 'unknown'
  const elapsed = now - start
  const expected = Math.min(100, (elapsed / total) * 100)
  const gap = expected - task.progress
  if (gap > 30) return 'behind'
  if (gap > 10) return 'at-risk'
  return 'on-track'
}

const RISK_BADGE: Record<RiskLevel, { label: string; className: string; icon: React.ReactNode }> = {
  behind:   { label: 'Chậm tiến độ', className: 'bg-red-50 text-red-600',    icon: <TrendingDown size={11} /> },
  'at-risk':{ label: 'Có rủi ro',    className: 'bg-amber-50 text-amber-600', icon: <AlertTriangle size={11} /> },
  'on-track':{ label: 'Đúng hạn',   className: 'bg-green-50 text-green-700', icon: <CheckCircle size={11} /> },
  unknown:  { label: '',             className: '',                             icon: <Minus size={11} /> },
}

interface TaskRow {
  task: TaskItem
  daysOverdue: number | null
  daysLeft: number | null
  risk: RiskLevel
}

function classify(tasks: TaskItem[]): {
  overdue: TaskRow[]
  today: TaskRow[]
  week: TaskRow[]
  upcoming: TaskRow[]
} {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const pending = tasks.filter(t => t.status !== 'Done' && t.deadline)

  const toRow = (t: TaskItem): TaskRow => {
    const dl = new Date(t.deadline!); dl.setHours(0, 0, 0, 0)
    const diff = Math.round((dl.getTime() - now.getTime()) / MS_PER_DAY)
    return {
      task: t,
      daysOverdue: diff < 0 ? -diff : null,
      daysLeft:    diff >= 0 ? diff : null,
      risk: getRisk(t),
    }
  }

  const overdue:  TaskRow[] = []
  const today:    TaskRow[] = []
  const week:     TaskRow[] = []
  const upcoming: TaskRow[] = []

  for (const t of pending) {
    const row = toRow(t)
    if (row.daysOverdue !== null)        overdue.push(row)
    else if (row.daysLeft === 0)         today.push(row)
    else if (row.daysLeft! <= 7)         week.push(row)
    else if (row.daysLeft! <= 30)        upcoming.push(row)
  }

  overdue.sort((a, b) => b.daysOverdue! - a.daysOverdue!)
  week.sort((a, b) => a.daysLeft! - b.daysLeft!)
  upcoming.sort((a, b) => a.daysLeft! - b.daysLeft!)

  return { overdue, today, week, upcoming }
}

function TaskRow({ row }: { row: TaskRow }) {
  const { task, daysOverdue, daysLeft, risk } = row
  const rb = RISK_BADGE[risk]

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors">
      {/* Title + assignee */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
        {task.assigneeName && (
          <p className="text-xs text-gray-400 mt-0.5">{task.assigneeName}</p>
        )}
      </div>

      {/* Progress */}
      <div className="w-24 shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-gray-500">{task.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-400"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Risk */}
      {risk !== 'unknown' && (
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${rb.className}`}>
          {rb.icon}{rb.label}
        </span>
      )}

      {/* Status */}
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_PILL[task.status]}`}>
        {STATUS_LABEL[task.status]}
      </span>

      {/* Days label */}
      <div className="w-24 shrink-0 text-right">
        {daysOverdue !== null && (
          <span className="text-xs font-semibold text-red-600">
            Trễ {daysOverdue} ngày
          </span>
        )}
        {daysLeft === 0 && (
          <span className="text-xs font-semibold text-amber-600">Hôm nay</span>
        )}
        {daysLeft !== null && daysLeft > 0 && (
          <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
            Còn {daysLeft} ngày
          </span>
        )}
      </div>
    </div>
  )
}

function Section({
  title, rows, icon, emptyText, accent,
}: {
  title: string
  rows: TaskRow[]
  icon: React.ReactNode
  emptyText: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-4">
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${accent}`}>
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        <span className="ml-auto text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6 italic">{emptyText}</p>
      ) : (
        rows.map(r => <TaskRow key={r.task.id} row={r} />)
      )}
    </div>
  )
}

export default function DeadlinePage() {
  const [searchParams] = useSearchParams()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTasks({ clubId, pageSize: 500 })
      setTasks(result.items)
    } catch {
      toast.error('Không thể tải dữ liệu công việc')
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => { load() }, [load])

  const { overdue, today, week, upcoming } = classify(tasks)

  const totalAlerts = overdue.length + today.length + week.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cảnh báo Deadline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalAlerts > 0
              ? `${totalAlerts} công việc cần chú ý`
              : 'Không có cảnh báo nào'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-red-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{overdue.length}</p>
            <p className="text-xs text-gray-500">Quá hạn</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{today.length}</p>
            <p className="text-xs text-gray-500">Hết hạn hôm nay</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Clock size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{week.length}</p>
            <p className="text-xs text-gray-500">Trong 7 ngày tới</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Đang tải...</div>
      ) : (
        <>
          <Section
            title="Quá hạn"
            rows={overdue}
            icon={<AlertTriangle size={16} className="text-red-500" />}
            emptyText="Không có công việc quá hạn"
            accent="bg-red-50 text-red-700"
          />
          <Section
            title="Hết hạn hôm nay"
            rows={today}
            icon={<Clock size={16} className="text-amber-500" />}
            emptyText="Không có công việc hết hạn hôm nay"
            accent="bg-amber-50 text-amber-700"
          />
          <Section
            title="Trong 7 ngày tới"
            rows={week}
            icon={<Clock size={16} className="text-blue-500" />}
            emptyText="Không có công việc sắp đến hạn"
            accent="bg-blue-50 text-blue-700"
          />
          <Section
            title="Trong 30 ngày tới"
            rows={upcoming}
            icon={<Clock size={16} className="text-gray-400" />}
            emptyText="Không có công việc nào trong 30 ngày"
            accent="bg-gray-50 text-gray-600"
          />
        </>
      )}
    </div>
  )
}
