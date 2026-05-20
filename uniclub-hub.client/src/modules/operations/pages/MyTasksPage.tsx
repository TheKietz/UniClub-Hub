import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { DragDropContext } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import KanbanColumn from './KanbanColumn'
import TaskModal from './TaskModal'
import { getTasks, updateTaskStatus } from '../services/operationsApi'
import type { TaskItem, TaskStatus } from '../services/operations.types'
import { useAuth } from '@/contexts/AuthContext'

const COLUMNS: TaskStatus[] = ['Todo', 'Doing', 'Done']

export default function MyTasksPage() {
  const [searchParams] = useSearchParams()
  const clubId = Number(searchParams.get('clubId') ?? 1)
  const { user } = useAuth()

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<TaskItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTasks({
        clubId,
        assignedTo: user?.id,
        pageSize: 200,
      })
      setTasks(result.items)
    } catch {
      toast.error('Không thể tải danh sách công việc')
    } finally {
      setLoading(false)
    }
  }, [clubId, user?.id])

  useEffect(() => { load() }, [load, refreshKey])

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    const progress = newStatus === 'Done' ? 100 : newStatus === 'Doing' ? Math.max(task.progress, 10) : task.progress
    try {
      const updated = await updateTaskStatus(task.id, { status: newStatus, progress })
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    }
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    const newStatus = destination.droppableId as TaskStatus
    const task = tasks.find(t => t.id === Number(draggableId))
    if (!task || task.status === newStatus) return
    if (task.isBlocked && (newStatus === 'Doing' || newStatus === 'Done')) {
      toast.error(`Bị chặn bởi ${task.blockingCount} công việc chưa hoàn thành`)
      return
    }
    handleStatusChange(task, newStatus)
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Task của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">{tasks.length} công việc được giao</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => { setEditTask(null); setModalOpen(true) }}
          >
            + Tạo công việc
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Đang tải...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 items-start overflow-x-auto pb-4">
            {COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus(status)}
                onAdd={() => { setEditTask(null); setModalOpen(true) }}
                onEdit={task => { setEditTask(task); setModalOpen(true) }}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      <TaskModal
        clubId={clubId}
        task={editTask}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
    </div>
  )
}
