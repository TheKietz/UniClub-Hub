import type {
  SprintStatus,
  TaskStatus,
  EventStatus,
} from "../operations/services/operations.types";

/* ── Sprint ─────────────────────────────────────────────────────────── */
const SPRINT_STATUS_CONFIG: Record<
  SprintStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  Planning: {
    label: "PLANNING",
    bg: "#eef2ff",
    text: "#4338ca",
    border: "#a5b4fc",
    dot: "#6366f1",
  },
  Active: {
    label: "ACTIVE",
    bg: "#ecfdf5",
    text: "#047857",
    border: "#6ee7b7",
    dot: "#10b981",
  },
  Completed: {
    label: "COMPLETED",
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#86efac",
    dot: "#22c55e",
  },
  Cancelled: {
    label: "CANCELLED",
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fca5a5",
    dot: "#ef4444",
  },
};

/* ── Task ───────────────────────────────────────────────────────────── */
const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string }
> = {
  Todo: { label: "Chưa làm", bg: "#f3f4f6", text: "#374151" },
  Doing: { label: "Đang làm", bg: "#dbeafe", text: "#1d4ed8" },
  Done: { label: "Hoàn thành", bg: "#d1fae5", text: "#065f46" },
};

/* ── Event ──────────────────────────────────────────────────────────── */
const EVENT_STATUS_CONFIG: Record<
  EventStatus,
  { label: string; bg: string; text: string }
> = {
  Draft: { label: "Nháp", bg: "#f3f4f6", text: "#374151" },
  InProgress: { label: "Đang diễn ra", bg: "#dbeafe", text: "#1d4ed8" },
  Completed: { label: "Hoàn thành", bg: "#d1fae5", text: "#065f46" },
  Cancelled: { label: "Đã hủy", bg: "#fee2e2", text: "#991b1b" },
};

/* ── Components ─────────────────────────────────────────────────────── */

export function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const c = SPRINT_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const c = TASK_STATUS_CONFIG[status];
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const c = EVENT_STATUS_CONFIG[status];
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

export { SPRINT_STATUS_CONFIG, TASK_STATUS_CONFIG, EVENT_STATUS_CONFIG };
