import { MoreVertical, CalendarDays, ArrowRight } from "lucide-react";
import { useState } from "react";
import { SprintStatusBadge } from "../../../shared/StatusBadge";
import ProgressBar from "../../../shared/ProgressBar";
import AvatarGroup from "../../../shared/AvatarGroup";
import type { SprintStatus } from "../../services/operations.types";

export interface SprintCardData {
  id: number;
  name: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  goal?: string;
  progress: number;
  taskCount: number;
  leadName?: string;
  members: Array<{ name: string; imageUrl?: string }>;
}

interface SprintCardProps {
  sprint: SprintCardData;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onViewKanban: (id: number) => void;
}

export default function SprintCard({
  sprint,
  onEdit,
  onDelete,
  onViewKanban,
}: SprintCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const progressColor =
    sprint.status === "Completed"
      ? "#22c55e"
      : sprint.progress >= 60
        ? "#4f46e5"
        : sprint.progress >= 30
          ? "#f59e0b"
          : "#6366f1";

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 relative">
      {/* Top row: status + menu */}
      <div className="flex items-start justify-between mb-3">
        <SprintStatusBadge status={sprint.status} />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Sprint options"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 bg-white border border-gray-100 rounded-xl shadow-xl py-1 w-36 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(sprint.id);
                  }}
                >
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    onViewKanban(sprint.id);
                  }}
                >
                  Xem Kanban
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(sprint.id);
                  }}
                >
                  Xóa sprint
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sprint name */}
      <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2 leading-snug">
        {sprint.name}
      </h3>

      {/* Date range */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
        <CalendarDays size={12} />
        <span>
          {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <ProgressBar
          value={sprint.progress}
          label="Tiến độ"
          color={progressColor}
          size="md"
        />
      </div>

      {/* Footer: task count + lead + members */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">
            {sprint.taskCount}
            <span className="text-gray-400 font-normal ml-0.5">TASKS</span>
          </span>

          {sprint.leadName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-gray-300">|</span>
              <span className="font-medium">LEAD</span>
              <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white text-[9px] font-bold flex items-center justify-center">
                {sprint.leadName[0]}
              </div>
              <span className="text-gray-700">{sprint.leadName}</span>
            </div>
          )}
        </div>

        {sprint.members.length > 0 && (
          <AvatarGroup avatars={sprint.members} max={3} />
        )}
      </div>

      {/* Hover action link */}
      <button
        type="button"
        onClick={() => onViewKanban(sprint.id)}
        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-3 hover:text-indigo-800 transition-colors group/link"
      >
        Xem Kanban
        <ArrowRight
          size={12}
          className="transition-transform group-hover/link:translate-x-0.5"
        />
      </button>
    </div>
  );
}
