import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ListTodo,
  Clock,
  CheckSquare,
  AlertTriangle,
  Calendar,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "../components/StatCard";
import FilterBar from "../../shared/FilterBar";
import AvatarGroup from "../../shared/AvatarGroup";
import TaskModal from "../components/task/TaskModal";
import type { TaskStatus, TaskPriority } from "../services/operations.types";

/* ── Mock data ─────────────────────────────────────────────────────────────── */

interface MyTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  progress: number;
  deadline?: string;
  sprintName: string;
  subTaskCount: number;
  assignees: Array<{ name: string }>;
}

const MOCK_MY_TASKS: MyTask[] = [
  {
    id: 101,
    title: "Finalize Sponsorship Proposal",
    status: "Doing",
    priority: "High",
    tags: ["Marketing", "Q4 Budget"],
    progress: 65,
    deadline: "2024-10-25",
    sprintName: "Sprint 12",
    subTaskCount: 3,
    assignees: [{ name: "Minh Thư" }, { name: "Hoàng Nam" }],
  },
  {
    id: 102,
    title: "Speaker Outreach Create",
    status: "Doing",
    priority: "Medium",
    tags: ["Event", "PR"],
    progress: 30,
    deadline: "2024-10-27",
    sprintName: "Sprint 12",
    subTaskCount: 2,
    assignees: [{ name: "Minh Thư" }],
  },
  {
    id: 103,
    title: "Quarterly Financial Review",
    status: "Todo",
    priority: "Low",
    tags: ["Finance", "Review"],
    progress: 20,
    deadline: "2024-11-05",
    sprintName: "Sprint 13",
    subTaskCount: 0,
    assignees: [{ name: "Minh Thư" }, { name: "Kim Chi" }],
  },
  {
    id: 104,
    title: "Thiết kế banner chào mừng CLB",
    status: "Done",
    priority: "Medium",
    tags: ["Design", "Branding"],
    progress: 100,
    deadline: "2024-10-20",
    sprintName: "Sprint 11",
    subTaskCount: 1,
    assignees: [{ name: "Minh Thư" }],
  },
  {
    id: 105,
    title: "Chuẩn bị tài liệu tổng kết Q3",
    status: "Done",
    priority: "High",
    tags: ["Report", "Q3"],
    progress: 100,
    deadline: "2024-09-30",
    sprintName: "Sprint 11",
    subTaskCount: 0,
    assignees: [{ name: "Minh Thư" }, { name: "Anh Tuấn" }],
  },
  {
    id: 106,
    title: "Lập kế hoạch tuyển thành viên Gen 10",
    status: "Todo",
    priority: "High",
    tags: ["Planning", "HR"],
    progress: 0,
    deadline: "2024-11-10",
    sprintName: "Sprint 13",
    subTaskCount: 4,
    assignees: [{ name: "Minh Thư" }],
  },
];

/* ── Config maps ───────────────────────────────────────────────────────────── */

const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    barClass: string;
    progressClass: string;
    textClass: string;
    badge: string;
    label: string;
  }
> = {
  High: {
    barClass: "bg-red-500",
    progressClass: "bg-red-500",
    textClass: "text-red-500",
    badge: "bg-red-50 text-red-600",
    label: "Cao",
  },
  Medium: {
    barClass: "bg-amber-400",
    progressClass: "bg-amber-400",
    textClass: "text-amber-500",
    badge: "bg-amber-50 text-amber-600",
    label: "Vừa",
  },
  Low: {
    barClass: "bg-emerald-500",
    progressClass: "bg-emerald-500",
    textClass: "text-emerald-500",
    badge: "bg-emerald-50 text-emerald-600",
    label: "Thấp",
  },
};

const STATUS_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "Todo", label: "Chưa làm" },
  { key: "Doing", label: "Đang làm" },
  { key: "Done", label: "Hoàn thành" },
];

/* ── Sub-components ────────────────────────────────────────────────────────── */

function TaskListCard({ task }: { task: MyTask }) {
  const p = PRIORITY_CONFIG[task.priority];
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "Done";

  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex group cursor-pointer">
      {/* Priority bar */}
      <div className={`w-1.5 shrink-0 ${p.barClass}`} />

      <div className="flex-1 p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {task.sprintName}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.badge}`}
            >
              {p.label}
            </span>
          </div>
          <button
            type="button"
            title="Tùy chọn"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 shrink-0"
          >
            <MoreHorizontal size={15} className="text-gray-400" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-1">
          {task.title}
        </h3>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Tiến độ</span>
            <span className={`text-xs font-semibold ${p.textClass}`}>
              {task.progress}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${p.progressClass}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarGroup avatars={task.assignees} max={3} size="sm" />
            {task.subTaskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Link2 size={11} />
                <span>{task.subTaskCount}</span>
              </div>
            )}
          </div>
          {deadlineStr && (
            <span
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${
                isOverdue
                  ? "bg-red-50 text-red-500"
                  : "bg-gray-50 text-gray-500"
              }`}
            >
              <Calendar size={11} />
              {deadlineStr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CircularProgress({
  value,
  size = 88,
}: {
  value: number;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - value / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#4f46e5"
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        className="[transition:stroke-dashoffset_0.6s_ease]"
      />
    </svg>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function MyTasksPage() {
  const [searchParams] = useSearchParams();
  const clubId = Number(searchParams.get("clubId") ?? 1);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const stats = useMemo(() => {
    const t = MOCK_MY_TASKS;
    const now = new Date();
    return {
      total: t.length,
      doing: t.filter((x) => x.status === "Doing").length,
      done: t.filter((x) => x.status === "Done").length,
      overdue: t.filter(
        (x) => x.deadline && new Date(x.deadline) < now && x.status !== "Done",
      ).length,
    };
  }, []);

  const filteredTasks = useMemo(() => {
    return MOCK_MY_TASKS.filter((t) => {
      const matchTab = activeTab === "all" || t.status === activeTab;
      const matchSearch = t.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [activeTab, searchQuery]);

  const upcomingDeadline = useMemo(() => {
    return MOCK_MY_TASKS.filter((t) => t.deadline && t.status !== "Done").sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
    )[0];
  }, []);

  const weeklyHours = 3.2;
  const weeklyProgress = 82;

  const hour = new Date().getHours();
  const timeGreet =
    hour < 12 ? "buổi sáng" : hour < 18 ? "buổi chiều" : "buổi tối";
  const firstName = user?.fullName?.trim().split(" ").pop() ?? "bạn";

  const tabCounts: Record<string, number> = {
    all: stats.total,
    Todo: MOCK_MY_TASKS.filter((t) => t.status === "Todo").length,
    Doing: stats.doing,
    Done: stats.done,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Chào {timeGreet}, {firstName}!
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Hãy bắt đầu một ngày làm việc hiệu quả.
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ListTodo}
          iconBg="#eef2ff"
          iconColor="#4f46e5"
          value={stats.total}
          label="Tổng công việc"
        />
        <StatCard
          icon={Clock}
          iconBg="#fef3c7"
          iconColor="#d97706"
          value={stats.doing}
          label="Đang thực hiện"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="#fee2e2"
          iconColor="#dc2626"
          value={stats.overdue}
          label="Quá hạn"
          trend={
            stats.overdue > 0
              ? { value: "Cần chú ý", positive: false }
              : undefined
          }
        />
        <StatCard
          icon={CheckSquare}
          iconBg="#d1fae5"
          iconColor="#059669"
          value={stats.done}
          label="Hoàn thành"
          trend={
            stats.total > 0
              ? {
                  value: `${Math.round((stats.done / stats.total) * 100)}%`,
                  positive: true,
                }
              : undefined
          }
        />
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <div className="mb-5">
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm công việc..."
          statusOptions={STATUS_TABS.map((t) => ({
            key: t.key,
            label: `${t.label} (${tabCounts[t.key]})`,
          }))}
          activeStatus={activeTab}
          onStatusChange={setActiveTab}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Task list — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <p className="text-gray-400 text-sm">
                Không có công việc nào phù hợp
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskListCard key={task.id} task={task} />
            ))
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Upcoming deadline */}
          {upcomingDeadline && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Sắp đến hạn
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-red-500 leading-none">
                    {new Date(upcomingDeadline.deadline!).getDate()}
                  </span>
                  <span className="text-[10px] font-medium text-red-400">
                    Th{new Date(upcomingDeadline.deadline!).getMonth() + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                    {upcomingDeadline.title}
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                      PRIORITY_CONFIG[upcomingDeadline.priority].badge
                    }`}
                  >
                    {PRIORITY_CONFIG[upcomingDeadline.priority].label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Focus */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Weekly Focus
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <CircularProgress value={weeklyProgress} size={88} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-gray-900">
                    {weeklyProgress}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {weeklyHours}h
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Giờ đã làm tuần này
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-xs text-gray-500">
                    Đang tiến triển tốt
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────── */}
      <TaskModal
        clubId={clubId}
        task={null}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
      />
    </div>
  );
}
