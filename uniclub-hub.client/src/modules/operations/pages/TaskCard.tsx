import { ChevronRight, ChevronLeft, Calendar, User, Layers, Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TaskItem, TaskStatus } from '../services/operations.types'

const PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Low:    { bg: '#f0fdf4', text: '#16a34a', label: 'Thấp' },
  Medium: { bg: '#fffbeb', text: '#d97706', label: 'Trung bình' },
  High:   { bg: '#fef2f2', text: '#dc2626', label: 'Cao' },
}

const STATUS_ORDER: TaskStatus[] = ['Todo', 'Doing', 'Done']

interface Props {
  task: TaskItem
  onEdit: (task: TaskItem) => void
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void
}

export default function TaskCard({ task, onEdit, onStatusChange }: Props) {
  const p = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.Medium
  const currentIdx = STATUS_ORDER.indexOf(task.status)
  const canMovePrev = currentIdx > 0
  const canMoveNext = currentIdx < STATUS_ORDER.length - 1

  const now = new Date()
  const deadline = task.deadline ? new Date(task.deadline) : null
  const isOverdue = !!deadline && task.status !== 'Done' && deadline < now
  const daysUntilDue = deadline && !isOverdue
    ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
    : null
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 3

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-200' : 'border-gray-100'
      }`}
      onClick={() => onEdit(task)}
    >
      {/* Priority + status badges row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.text }}>
            {p.label}
          </span>
          {isOverdue && (
            <span className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={10} /> Quá hạn
            </span>
          )}
          {isDueSoon && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              Còn {daysUntilDue === 0 ? 'hôm nay' : `${daysUntilDue} ngày`}
            </span>
          )}
          {task.isBlocked && (
            <span className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              <Lock size={10} /> Bị chặn
            </span>
          )}
        </div>
        {task.subTaskCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Layers size={12} /> {task.subTaskCount}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-800 leading-snug mb-3 line-clamp-2">{task.title}</p>

      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{task.progress}%</p>
        </div>
      )}

      {/* Assignee & deadline */}
      <div className="flex flex-col gap-1 text-xs text-gray-500 mb-3">
        {task.assigneeName && (
          <span className="flex items-center gap-1">
            <User size={11} /> {task.assigneeName}
          </span>
        )}
        {task.deadline && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : isDueSoon ? 'text-amber-600 font-medium' : ''}`}>
            <Calendar size={11} />
            {new Date(task.deadline).toLocaleDateString('vi-VN')}
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div className="flex gap-1 mt-1" onClick={e => e.stopPropagation()}>
        {canMovePrev && (
          <Button
            variant="outline" size="sm"
            className="h-6 px-2 text-xs flex items-center gap-1"
            onClick={() => onStatusChange(task, STATUS_ORDER[currentIdx - 1])}
          >
            <ChevronLeft size={12} /> {STATUS_ORDER[currentIdx - 1]}
          </Button>
        )}
        {canMoveNext && (
          <Button
            size="sm"
            disabled={task.isBlocked}
            title={task.isBlocked ? `Bị chặn bởi ${task.blockingCount} công việc chưa hoàn thành` : undefined}
            className="h-6 px-2 text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onStatusChange(task, STATUS_ORDER[currentIdx + 1])}
          >
            {STATUS_ORDER[currentIdx + 1]} <ChevronRight size={12} />
          </Button>
        )}
      </div>
    </div>
  )
}
