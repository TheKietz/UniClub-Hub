import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import KanbanColumn from "../components/kanban/KanbanColumn";
import TaskModal from "../components/task/TaskModal";
import {
  getTasks,
  updateTaskStatus,
  getSprints,
} from "../services/operationsApi";
import type {
  TaskItem,
  TaskStatus,
  SprintItem,
  SprintStatus,
} from "../services/operations.types";
import { createKanbanConnection } from "@/lib/kanbanHub";
import { SIGNALR_EVENTS, HUB_METHODS } from "@/lib/signalrEvents";

const COLUMNS: TaskStatus[] = ["Todo", "Doing", "Done"];

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  Planning: "Lên kế hoạch",
  Active: "Đang chạy",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};
const SPRINT_STATUS_COLOR: Record<SprintStatus, string> = {
  Planning: "text-indigo-500",
  Active: "text-green-600",
  Completed: "text-gray-500",
  Cancelled: "text-red-500",
};
const SPRINT_STATUS_BG: Record<SprintStatus, string> = {
  Planning: "bg-indigo-50 text-indigo-700",
  Active: "bg-green-50 text-green-700",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-50 text-red-600",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });

export default function KanbanPage() {
  const [searchParams] = useSearchParams();
  const clubId = Number(searchParams.get("clubId") ?? 1);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTasks({
        clubId,
        sprintId: selectedSprintId ?? undefined,
        pageSize: 200,
      });
      setTasks(result.items);
    } catch {
      toast.error("Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  }, [clubId, selectedSprintId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    getSprints({ clubId, pageSize: 100 })
      .then((r) => setSprints(r.items))
      .catch(() => {});
  }, [clubId]);

  useEffect(() => {
    const conn = createKanbanConnection();

    conn.on(SIGNALR_EVENTS.TASK_STATUS_UPDATED, (updated: TaskItem) =>
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t))),
    );
    conn.on(SIGNALR_EVENTS.TASK_CREATED, (created: TaskItem) =>
      setTasks((prev) => [...prev, created]),
    );
    conn.on(SIGNALR_EVENTS.TASK_DELETED, (deletedId: number) =>
      setTasks((prev) => prev.filter((t) => t.id !== deletedId)),
    );

    conn
      .start()
      .then(() => conn.invoke(HUB_METHODS.JOIN_CLUB, clubId))
      .catch(() => {
        /* hub optional — REST still works */
      });

    return () => {
      conn.invoke(HUB_METHODS.LEAVE_CLUB, clubId).catch(() => {});
      conn.stop();
    };
  }, [clubId]);

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    const progress =
      newStatus === "Done"
        ? 100
        : newStatus === "Doing"
          ? Math.max(task.progress, 10)
          : task.progress;
    try {
      const updated = await updateTaskStatus(task.id, {
        status: newStatus,
        progress,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const openCreate = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId as TaskStatus;
    const task = tasks.find((t) => t.id === Number(draggableId));
    if (!task || task.status === newStatus) return;

    if (task.isBlocked && (newStatus === "Doing" || newStatus === "Done")) {
      toast.error(
        `Bị chặn bởi ${task.blockingCount} công việc chưa hoàn thành`,
      );
      return;
    }

    handleStatusChange(task, newStatus);
  };

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quản Lý Công Việc
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bảng Kanban dự án hiện tại · {tasks.length} công việc
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => openCreate()}
          >
            + Tạo công việc
          </Button>
        </div>
      </div>

      {/* Sprint filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedSprintId(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedSprintId === null
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 border hover:bg-gray-50"
          }`}
        >
          Tất cả
        </button>
        {sprints.map((sprint) => (
          <button
            key={sprint.id}
            type="button"
            onClick={() => setSelectedSprintId(sprint.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSprintId === sprint.id
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            {sprint.name}
            <span
              className={`ml-1.5 text-xs ${
                selectedSprintId === sprint.id
                  ? "text-indigo-200"
                  : SPRINT_STATUS_COLOR[sprint.status]
              }`}
            >
              {SPRINT_STATUS_LABEL[sprint.status]}
            </span>
          </button>
        ))}
      </div>

      {/* Sprint info banner */}
      {selectedSprint && (
        <div className="mb-4 px-4 py-3 bg-white border rounded-xl flex items-center gap-4 text-sm text-gray-600 shadow-sm">
          <span className="font-semibold text-gray-800">
            {selectedSprint.name}
          </span>
          {selectedSprint.goal && (
            <span className="text-gray-500 truncate">
              {selectedSprint.goal}
            </span>
          )}
          <span className="ml-auto shrink-0 text-gray-400">
            {formatDate(selectedSprint.startDate)} →{" "}
            {formatDate(selectedSprint.endDate)}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SPRINT_STATUS_BG[selectedSprint.status]}`}
          >
            {SPRINT_STATUS_LABEL[selectedSprint.status]}
          </span>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Đang tải...
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 items-start overflow-x-auto pb-4">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus(status)}
                onAdd={() => openCreate()}
                onEdit={openEdit}
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
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
