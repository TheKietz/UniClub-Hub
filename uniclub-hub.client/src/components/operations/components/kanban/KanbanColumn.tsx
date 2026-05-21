import { Plus } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { TaskItem, TaskStatus } from "../../services/operations.types";

const COL: Record<
  TaskStatus,
  { label: string; dotClass: string; bgClass: string; dragClass: string }
> = {
  Todo: {
    label: "Cần làm",
    dotClass: "bg-gray-400",
    bgClass: "bg-gray-200",
    dragClass: "bg-gray-400",
  },
  Doing: {
    label: "Đang làm",
    dotClass: "bg-blue-500",
    bgClass: "bg-blue-100",
    dragClass: "bg-blue-200",
  },
  Done: {
    label: "Hoàn thành",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-100",
    dragClass: "bg-emerald-200",
  },
};

interface Props {
  status: TaskStatus;
  tasks: TaskItem[];
  onAdd: () => void;
  onEdit: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
}

export default function KanbanColumn({
  status,
  tasks,
  onAdd,
  onEdit,
  onStatusChange,
}: Props) {
  const c = COL[status];

  return (
    <div className="flex-1 min-w-[280px] max-w-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} />
          <span className="text-sm font-semibold text-gray-700">{c.label}</span>
          <span className="text-xs font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          title={`Thêm vào ${c.label}`}
          onClick={onAdd}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Droppable card area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-2xl p-3 flex flex-col gap-3 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? c.dragClass : c.bgClass
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-300 py-10">
                Không có công việc
              </div>
            )}

            {tasks.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={String(task.id)}
                index={index}
              >
                {(prov) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
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
  );
}
