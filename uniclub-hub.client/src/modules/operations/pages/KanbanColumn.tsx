import { Plus } from 'lucide-react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import TaskCard from './TaskCard'
import type { TaskItem, TaskStatus } from '../services/operations.types'

const COLUMN_STYLE: Record<TaskStatus, { label: string; accent: string; bg: string }> = {
  Todo:  { label: 'Chưa làm', accent: '#6366f1', bg: '#f5f3ff' },
  Doing: { label: 'Đang làm', accent: '#f59e0b', bg: '#fffbeb' },
  Done:  { label: 'Hoàn thành', accent: '#10b981', bg: '#f0fdf4' },
}

interface Props {
  status: TaskStatus
  tasks: TaskItem[]
  onAdd: () => void
  onEdit: (task: TaskItem) => void
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void
}

export default function KanbanColumn({ status, tasks, onAdd, onEdit, onStatusChange }: Props) {
  const col = COLUMN_STYLE[status]

  return (
    <div className="flex-1 min-w-[280px] max-w-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-xl"
        style={{ background: col.bg, borderBottom: `2px solid ${col.accent}` }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.accent }} />
          <span className="font-semibold text-sm text-gray-700">{col.label}</span>
          <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white" onClick={onAdd}>
          <Plus size={14} />
        </Button>
      </div>

      {/* Cards */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-b-xl p-3 flex flex-col gap-3 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-50' : 'bg-gray-50'
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-300 py-8">
                Không có công việc
              </div>
            )}
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TaskCard
                      task={task}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
