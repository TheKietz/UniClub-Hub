import { useState, useMemo, useEffect } from "react";
import {
  ListTodo, Clock, CheckSquare, AlertTriangle, Calendar, Link2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "../context/TasksContext";
import StatCard from "../components/StatCard";
import FilterBar from "../../shared/FilterBar";
import TaskDetailModal from "../components/task/TaskDetailModal";
import { getKanbanColumns } from "../services/operationsApi";
import type { TaskItem, KanbanColumnItem } from "../services/operations.types";

/* ── Config maps ───────────────────────────────────────────────────────────── */

const PRIORITY_CONFIG = {
  High:   { barClass: "bg-red-500",     progressClass: "bg-red-500",     textClass: "text-red-500",     badge: "bg-red-50 text-red-600",     label: "Cao"  },
  Medium: { barClass: "bg-amber-400",   progressClass: "bg-amber-400",   textClass: "text-amber-500",   badge: "bg-amber-50 text-amber-600", label: "Vừa"  },
  Low:    { barClass: "bg-emerald-500", progressClass: "bg-emerald-500", textClass: "text-emerald-500", badge: "bg-emerald-50 text-emerald-600", label: "Thấp" },
} as const;

const STATUS_TABS = [
  { key: "all",   label: "Tất cả"     },
  { key: "Todo",  label: "Chưa làm"   },
  { key: "Doing", label: "Đang làm"   },
  { key: "Done",  label: "Hoàn thành" },
];

/* ── Sub-components ────────────────────────────────────────────────────────── */

function TaskListCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const p = PRIORITY_CONFIG[task.priority];
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "Done";

  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick()}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex group cursor-pointer"
    >
      {/* Priority bar */}
      <div className={`w-1.5 shrink-0 ${p.barClass}`} />

      <div className="flex-1 p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.badge}`}>
            {p.label}
          </span>
          {task.sprintId && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
              Sprint #{task.sprintId}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 mb-3 line-clamp-2">
          {task.title}
        </h3>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Tiến độ</span>
            <span className={`text-xs font-semibold ${p.textClass}`}>{task.progress}%</span>
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
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {task.subTaskCount > 0 && (
              <span className="flex items-center gap-1">
                <Link2 size={11} />
                {task.subTaskCount}
              </span>
            )}
          </div>
          {deadlineStr && (
            <span
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${
                isOverdue ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"
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

function CircularProgress({ value, size = 88 }: { value: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#4f46e5" strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        className="[transition:stroke-dashoffset_0.6s_ease]"
      />
    </svg>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function MyTasksPage() {
  const { user } = useAuth();
  const { tasks, tasksLoading, reloadTasks } = useTasks();

  const myTasks = useMemo(
    () => tasks.filter(t => t.assignedTo === user?.id),
    [tasks, user?.id],
  );

  const [activeTab, setActiveTab]   = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [columns, setColumns]       = useState<KanbanColumnItem[]>([]);

  // Fetch kanban columns for the modal (use clubId from first task or skip)
  const clubId = myTasks[0]?.clubId ?? tasks[0]?.clubId ?? 0;
  useEffect(() => {
    if (!clubId) return;
    getKanbanColumns(clubId).then(setColumns).catch(() => {});
  }, [clubId]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total:  myTasks.length,
      doing:  myTasks.filter(t => t.status === "Doing").length,
      done:   myTasks.filter(t => t.status === "Done").length,
      overdue: myTasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== "Done").length,
    };
  }, [myTasks]);

  const filteredTasks = useMemo(() => myTasks.filter(t => {
    const matchTab    = activeTab === "all" || t.status === activeTab;
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  }), [myTasks, activeTab, searchQuery]);

  const upcomingDeadline = useMemo(() =>
    myTasks
      .filter(t => t.deadline && t.status !== "Done")
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0],
    [myTasks],
  );

  const tabCounts: Record<string, number> = {
    all:   stats.total,
    Todo:  myTasks.filter(t => t.status === "Todo").length,
    Doing: stats.doing,
    Done:  stats.done,
  };

  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? "buổi sáng" : hour < 18 ? "buổi chiều" : "buổi tối";
  const firstName = user?.fullName?.trim().split(" ").pop() ?? "bạn";

  function openTask(task: TaskItem) {
    setSelectedTask(task);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Chào {timeGreet}, {firstName}!
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {tasksLoading ? "Đang tải công việc..." : "Hãy bắt đầu một ngày làm việc hiệu quả."}
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ListTodo}      iconBg="#eef2ff" iconColor="#4f46e5" value={stats.total}  label="Tổng công việc" />
        <StatCard icon={Clock}         iconBg="#fef3c7" iconColor="#d97706" value={stats.doing}  label="Đang thực hiện" />
        <StatCard
          icon={AlertTriangle} iconBg="#fee2e2" iconColor="#dc2626"
          value={stats.overdue} label="Quá hạn"
          trend={stats.overdue > 0 ? { value: "Cần chú ý", positive: false } : undefined}
        />
        <StatCard
          icon={CheckSquare} iconBg="#d1fae5" iconColor="#059669"
          value={stats.done} label="Hoàn thành"
          trend={stats.total > 0 ? { value: `${Math.round((stats.done / stats.total) * 100)}%`, positive: true } : undefined}
        />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="mb-5">
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm công việc..."
          statusOptions={STATUS_TABS.map(t => ({ key: t.key, label: `${t.label} (${tabCounts[t.key]})` }))}
          activeStatus={activeTab}
          onStatusChange={setActiveTab}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Task list — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          {tasksLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <p className="text-gray-400 text-sm">Đang tải...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <p className="text-gray-400 text-sm">Không có công việc nào phù hợp</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskListCard key={task.id} task={task} onClick={() => openTask(task)} />
            ))
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {upcomingDeadline && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Sắp đến hạn
              </h3>
              <div
                role="button"
                tabIndex={0}
                onClick={() => openTask(upcomingDeadline)}
                onKeyDown={e => e.key === "Enter" && openTask(upcomingDeadline)}
                className="flex items-center gap-3 cursor-pointer"
              >
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
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${PRIORITY_CONFIG[upcomingDeadline.priority].badge}`}>
                    {PRIORITY_CONFIG[upcomingDeadline.priority].label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Progress ring */}
          {stats.total > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Tiến độ cá nhân
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <CircularProgress value={Math.round((stats.done / stats.total) * 100)} size={88} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-bold text-gray-900">
                      {Math.round((stats.done / stats.total) * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.done}/{stats.total}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Công việc hoàn thành</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-xs text-gray-500">{stats.doing} đang thực hiện</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Task detail modal ─────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          clubId={selectedTask.clubId}
          task={selectedTask}
          open={modalOpen}
          columns={columns}
          onClose={() => setModalOpen(false)}
          onSaved={async () => { setModalOpen(false); await reloadTasks(); }}
        />
      )}
    </div>
  );
}
