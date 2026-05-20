import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Users, CheckSquare, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { getTasks, getSprints } from '../services/operationsApi'
import type { TaskItem, SprintItem, SprintStatus } from '../services/operations.types'

const STATUS_COLORS = {
  Todo:  '#6366f1',
  Doing: '#f59e0b',
  Done:  '#10b981',
}
const STATUS_LABELS = { Todo: 'Chưa làm', Doing: 'Đang làm', Done: 'Hoàn thành' }

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  Planning:  'Lên kế hoạch',
  Active:    'Đang chạy',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

const UNASSIGNED = 'Chưa phân công'

interface WorkloadRow {
  name: string
  Todo: number
  Doing: number
  Done: number
  total: number
}

function buildWorkload(tasks: TaskItem[]): WorkloadRow[] {
  const map = new Map<string, WorkloadRow>()

  for (const task of tasks) {
    const key = task.assigneeName ?? UNASSIGNED
    if (!map.has(key)) map.set(key, { name: key, Todo: 0, Doing: 0, Done: 0, total: 0 })
    const row = map.get(key)!
    row[task.status]++
    row.total++
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-gray-600">{STATUS_LABELS[p.name as keyof typeof STATUS_LABELS]}:</span>
          <span className="font-medium text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkloadPage() {
  const [searchParams] = useSearchParams()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sprints, setSprints] = useState<SprintItem[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTasks({
        clubId,
        sprintId: selectedSprintId ?? undefined,
        pageSize: 500,
      })
      setTasks(result.items)
    } catch {
      toast.error('Không thể tải dữ liệu công việc')
    } finally {
      setLoading(false)
    }
  }, [clubId, selectedSprintId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getSprints({ clubId, pageSize: 100 })
      .then(r => setSprints(r.items))
      .catch(() => {})
  }, [clubId])

  const data = buildWorkload(tasks)
  const assignedTasks = tasks.filter(t => t.assigneeName)
  const uniqueMembers = new Set(tasks.filter(t => t.assigneeName).map(t => t.assigneeName)).size
  const busiest = data.find(r => r.name !== UNASSIGNED)

  const barHeight = Math.max(data.length * 56, 200)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Phân công công việc</h1>
          <p className="text-sm text-gray-500 mt-1">Phân bổ khối lượng theo thành viên</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Sprint filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedSprintId(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedSprintId === null
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          Tất cả sprint
        </button>
        {sprints.map(sprint => (
          <button
            key={sprint.id}
            type="button"
            onClick={() => setSelectedSprintId(sprint.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSprintId === sprint.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {sprint.name}
            <span className={`ml-1.5 text-xs ${selectedSprintId === sprint.id ? 'text-indigo-200' : 'text-gray-400'}`}>
              {SPRINT_STATUS_LABEL[sprint.status]}
            </span>
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <CheckSquare size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{tasks.length}</p>
            <p className="text-xs text-gray-500">Tổng công việc</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Users size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{uniqueMembers}</p>
            <p className="text-xs text-gray-500">Thành viên có việc</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{busiest?.total ?? 0}</p>
            <p className="text-xs text-gray-500 truncate">
              {busiest ? `Nhiều nhất: ${busiest.name}` : 'Chưa có dữ liệu'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          Khối lượng theo thành viên
          {assignedTasks.length < tasks.length && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({tasks.length - assignedTasks.length} chưa phân công)
            </span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
            Chưa có công việc nào
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 12, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-gray-600">
                    {STATUS_LABELS[value as keyof typeof STATUS_LABELS]}
                  </span>
                )}
              />
              <Bar dataKey="Todo" stackId="a" fill={STATUS_COLORS.Todo} radius={[0, 0, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS.Todo} fillOpacity={entry.name === UNASSIGNED ? 0.5 : 1} />
                ))}
              </Bar>
              <Bar dataKey="Doing" stackId="a" fill={STATUS_COLORS.Doing}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS.Doing} fillOpacity={entry.name === UNASSIGNED ? 0.5 : 1} />
                ))}
              </Bar>
              <Bar dataKey="Done" stackId="a" fill={STATUS_COLORS.Done} radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS.Done} fillOpacity={entry.name === UNASSIGNED ? 0.5 : 1} />
                ))}
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
