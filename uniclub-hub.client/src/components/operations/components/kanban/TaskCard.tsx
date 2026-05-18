import {
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";
import AvatarGroup from "../../../shared/AvatarGroup";
import type { TaskItem, TaskStatus } from "../../services/operations.types";

const PRIORITY: Record<
  string,
  { label: string; badge: string; border: string }
> = {
  Low: {
    label: "Thấp",
    badge: "bg-sky-50 text-sky-700",
    border: "border-l-sky-400",
  },
  Medium: {
    label: "Trung bình",
    badge: "bg-amber-50 text-amber-700",
    border: "border-l-amber-400",
  },
  High: {
    label: "Cao",
    badge: "bg-red-50 text-red-700",
    border: "border-l-red-500",
  },
};

interface Props {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
}

export default function TaskCard({ task, onEdit }: Props) {
  const p = PRIORITY[task.priority] ?? PRIORITY.Medium;
  const isDone = task.status === "Done";
  const now = new Date();
  const dl = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = !!dl && !isDone && dl < now;
  const isToday = !!dl && !isDone && dl.toDateString() === now.toDateString();

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-[3px] p-4 cursor-pointer hover:shadow-md transition-all group ${p.border}`}
      onClick={() => onEdit(task)}
    >
      {/* Top row: priority badge + icons */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-md ${p.badge}`}
        >
          {p.label}
        </span>
        <div className="flex items-center gap-1">
          {isDone && <CheckCircle2 size={14} className="text-emerald-500" />}
          {task.isBlocked && <Lock size={12} className="text-red-400" />}
          <button
            type="button"
            title="Tùy chọn"
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Title */}
      <p
        className={`text-sm font-semibold leading-snug mb-3 line-clamp-2 ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}
      >
        {task.title}
      </p>

      {/* Bottom row: date + assignee */}
      <div className="flex items-center justify-between">
        {dl ? (
          <div
            className={`flex items-center gap-1 text-xs ${
              isOverdue
                ? "text-red-500 font-medium"
                : isToday
                  ? "text-amber-600 font-medium"
                  : "text-gray-400"
            }`}
          >
            {isOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
            <span>{isToday ? "Hôm nay" : fmtDate(dl)}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {task.subTaskCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-300">
              <Layers size={10} />
              {task.subTaskCount}
            </span>
          )}
          {task.assigneeName && (
            <AvatarGroup
              avatars={[{ name: task.assigneeName }]}
              max={1}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
