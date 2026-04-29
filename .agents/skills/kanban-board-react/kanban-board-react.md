---
name: kanban-board-react
description: Build the Kanban board UI for the Operations module using @dnd-kit.
  Use when implementing drag-and-drop task cards between status columns, optimistic
  updates on drag, and SignalR sync for multi-user boards.
---

# Kanban Board — @dnd-kit (UniClub Hub)

## When to Use

- Building the Kanban board view in the Operations module
- Implementing drag-and-drop for task cards between status columns (Todo → Doing → Done)
- Handling multi-user sync via SignalR when another user moves a card

## When Not to Use

- List views without drag-and-drop → plain `TaskList` component
- Gantt chart or timeline → different component (D3 or Bryntum)

## Stack

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Do NOT use `react-beautiful-dnd` — it is unmaintained and does not support React 18+ StrictMode.

---

## Workflow

### Step 1: Understand the data model

The Kanban board groups tasks by `status`. Columns are fixed: `Todo`, `Doing`, `Done`, `Cancelled`.
Each column contains tasks filtered by that status.

```typescript
// src/features/operations/types/kanban.ts

export const KANBAN_COLUMNS = ["Todo", "Doing", "Done", "Cancelled"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export interface KanbanTask {
  id: string;
  title: string;
  priority: "Low" | "Medium" | "High";
  deadline?: string;
  assignedToMemberName?: string;
  status: KanbanColumn;
  activityId: string;
}
```

---

### Step 2: Build the KanbanBoard component

```typescript
// src/features/operations/components/KanbanBoard.tsx
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useState, useCallback } from "react";
import { KanbanColumn, KANBAN_COLUMNS, KanbanTask } from "../types/kanban";
import { KanbanColumnView } from "./KanbanColumnView";
import { TaskCard } from "./TaskCard";
import { useTasksByActivity } from "../hooks/useTasks";
import { useUpdateTaskStatus } from "../hooks/useTasks";
import { useActivityRealtime } from "../hooks/useActivityRealtime";

interface KanbanBoardProps {
  activityId: string;
}

export function KanbanBoard({ activityId }: KanbanBoardProps) {
  const { data, isLoading } = useTasksByActivity(activityId);
  const { mutate: updateStatus } = useUpdateTaskStatus();
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  // Connect SignalR for multi-user sync
  useActivityRealtime(activityId);

  // PointerSensor with activation constraint — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,  // Must move 8px before drag starts
      },
    })
  );

  const tasksByColumn = useCallback(
    (column: KanbanColumn): KanbanTask[] =>
      data?.data.filter((t) => t.status === column) ?? [],
    [data]
  );

  function handleDragStart(event: DragStartEvent) {
    const task = data?.data.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as KanbanColumn;

    // Don't update if dropped in the same column
    const currentTask = data?.data.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    // Optimistic update handled inside useUpdateTaskStatus (see react-query skill)
    updateStatus({ taskId, status: newStatus });
  }

  if (isLoading) return <KanbanSkeleton />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", gap: "16px", overflowX: "auto", padding: "16px 0" }}>
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumnView
            key={column}
            column={column}
            tasks={tasksByColumn(column)}
          />
        ))}
      </div>

      {/* DragOverlay renders the card being dragged — prevents layout shift */}
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

---

### Step 3: Build the droppable Column component

```typescript
// src/features/operations/components/KanbanColumnView.tsx
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanColumn, KanbanTask } from "../types/kanban";
import { SortableTaskCard } from "./SortableTaskCard";

const COLUMN_LABELS: Record<KanbanColumn, string> = {
  Todo: "To Do",
  Doing: "In Progress",
  Done: "Done",
  Cancelled: "Cancelled",
};

interface KanbanColumnViewProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
}

export function KanbanColumnView({ column, tasks }: KanbanColumnViewProps) {
  // useDroppable makes this column a valid drop target
  const { setNodeRef, isOver } = useDroppable({ id: column });

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: "280px",
        background: isOver ? "var(--color-background-info)" : "var(--color-background-secondary)",
        borderRadius: "8px",
        padding: "12px",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontWeight: 500 }}>{COLUMN_LABELS[column]}</span>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
          {tasks.length}
        </span>
      </div>

      {/* SortableContext enables sorting within the column */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minHeight: "60px" }}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

---

### Step 4: Build the draggable TaskCard

```typescript
// src/features/operations/components/SortableTaskCard.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanTask } from "../types/kanban";
import { TaskCard } from "./TaskCard";

interface SortableTaskCardProps {
  task: KanbanTask;
}

export function SortableTaskCard({ task }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,  // Ghost effect — fades the original card while dragging
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}

// src/features/operations/components/TaskCard.tsx
interface TaskCardProps {
  task: KanbanTask;
  isDragging?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  High:   "var(--color-background-danger)",
  Medium: "var(--color-background-warning)",
  Low:    "var(--color-background-success)",
};

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: "8px",
        padding: "12px",
        cursor: isDragging ? "grabbing" : "grab",
        boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4 }}>
          {task.title}
        </span>
        <span
          style={{
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "4px",
            background: PRIORITY_COLORS[task.priority],
            whiteSpace: "nowrap",
          }}
        >
          {task.priority}
        </span>
      </div>

      {task.deadline && (
        <div
          style={{
            fontSize: "12px",
            marginTop: "8px",
            color: isOverdue ? "var(--color-text-danger)" : "var(--color-text-secondary)",
          }}
        >
          Due: {new Date(task.deadline).toLocaleDateString()}
        </div>
      )}

      {task.assignedToMemberName && (
        <div style={{ fontSize: "12px", marginTop: "4px", color: "var(--color-text-secondary)" }}>
          {task.assignedToMemberName}
        </div>
      )}
    </div>
  );
}
```

---

## Validation Checklist

- [ ] `@dnd-kit/core` used — not `react-beautiful-dnd`
- [ ] `PointerSensor` has `activationConstraint.distance` to prevent accidental drags
- [ ] `DragOverlay` renders a copy of the card while dragging
- [ ] Original card has `opacity: 0.4` while `isDragging` — ghost effect
- [ ] Column uses `useDroppable` with `id` matching the status string
- [ ] `SortableContext` wraps cards inside each column
- [ ] Status update uses `useUpdateTaskStatus` with optimistic update (see `react-query-api-integration`)
- [ ] `useActivityRealtime` is called at board level for SignalR sync

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `react-beautiful-dnd` | Broken in React 18 StrictMode | Use `@dnd-kit` |
| No `activationConstraint` | Clicks trigger drag — bad UX | Add `distance: 8` constraint |
| No `DragOverlay` | Card disappears during drag, layout collapses | Always use `DragOverlay` |
| API call in `onDragEnd` without optimistic update | Visible lag between drop and UI update | Use optimistic update in `useUpdateTaskStatus` |
| Column `id` and task `status` value mismatch | Drop targets never activate | Ensure `useDroppable({ id: column })` matches exact status strings |
