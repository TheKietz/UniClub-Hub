import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Layers,
  Calendar,
  BarChart2,
  Activity,
  AlertTriangle,
  CheckSquare,
  Clock,
  ListTodo,
  Zap,
  Users,
  ArrowUpRight,
  Plus,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import {
  getTasks,
  getSprints,
  getEvents,
  getAuditLogs,
} from "../services/operationsApi";
import type {
  SprintItem,
  EventItem,
  AuditLogItem,
} from "../services/operations.types";

/* ── Components ─────────────────────────────────────────────────────── */
import PageHeader from "../../shared/PageHeader";
import StatCard from "../components/StatCard";
import ProgressBar from "../../shared/ProgressBar";
import { SprintStatusBadge, EventStatusBadge } from "../../shared/StatusBadge";
import { SkeletonStatCard } from "../../shared/Skeleton";

const NAV_CARD_DEFS = [
  { label: "Kanban",    sub: "kanban",    icon: LayoutDashboard, color: "#4f46e5", bg: "#eef2ff" },
  { label: "Sprints",   sub: "sprints",   icon: Layers,          color: "#7c3aed", bg: "#f5f3ff" },
  { label: "Sự kiện",  sub: "events",    icon: Calendar,        color: "#2563eb", bg: "#eff6ff" },
  { label: "Phân công", sub: "workload",  icon: BarChart2,       color: "#d97706", bg: "#fffbeb" },
  { label: "Gantt",     sub: "gantt",     icon: Activity,        color: "#0d9488", bg: "#f0fdfa" },
  { label: "Cảnh báo", sub: "deadlines", icon: AlertTriangle,   color: "#dc2626", bg: "#fef2f2" },
];

const ACTION_ICON: Record<string, React.ReactNode> = {
  Create: <Plus size={13} className="text-emerald-600" />,
  Update: <ArrowRightLeft size={13} className="text-blue-600" />,
  Delete: <Trash2 size={13} className="text-red-500" />,
};
const ACTION_BG: Record<string, string> = {
  Create: "bg-emerald-50",
  Update: "bg-blue-50",
  Delete: "bg-red-50",
};
const MODULE_LABEL: Record<string, string> = {
  Tasks: "công việc",
  Events: "sự kiện",
  Sprints: "sprint",
};

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function OperationsDashboard() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const clubId = Number(clubIdParam ?? 1);

  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    todo: 0,
    doing: 0,
    done: 0,
    overdue: 0,
  });
  const [activeSprint, setActiveSprint] = useState<SprintItem | null>(null);
  const [sprintTasks, setSprintTasks] = useState({
    todo: 0,
    doing: 0,
    done: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTasks({ clubId, pageSize: 500 }),
      getSprints({ clubId, pageSize: 20 }),
      getEvents({ clubId, pageSize: 20 }),
      getAuditLogs({ clubId, pageSize: 5 }),
    ])
      .then(([taskData, sprintData, eventData, auditData]) => {
        const tasks = taskData.items;
        setTaskStats({
          total: taskData.totalCount,
          todo: tasks.filter((t) => t.status === "Todo").length,
          doing: tasks.filter((t) => t.status === "Doing").length,
          done: tasks.filter((t) => t.status === "Done").length,
          overdue: tasks.filter(
            (t) =>
              t.status !== "Done" &&
              t.deadline &&
              new Date(t.deadline) < new Date(),
          ).length,
        });
        const active =
          sprintData.items.find((s) => s.status === "Active") ?? null;
        setActiveSprint(active);
        if (active) {
          const sts = tasks.filter((t) => t.sprintId === active.id);
          setSprintTasks({
            todo: sts.filter((t) => t.status === "Todo").length,
            doing: sts.filter((t) => t.status === "Doing").length,
            done: sts.filter((t) => t.status === "Done").length,
          });
        }
        setUpcomingEvents(
          eventData.items.filter((e) => e.status !== "Cancelled").slice(0, 3),
        );
        setRecentLogs(auditData.items);
      })
      .catch(() => toast.error("Không thể tải dữ liệu"))
      .finally(() => setLoading(false));
  }, [clubId]);

  const withClub = (sub: string) => `/clubs/${clubId}/${sub}`;

  const sprintTotal = sprintTasks.todo + sprintTasks.doing + sprintTasks.done;
  const sprintProgress =
    sprintTotal > 0 ? Math.round((sprintTasks.done / sprintTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Tổng quan Câu lạc bộ"
        description="Theo dõi tiến độ công việc, sự kiện và hoạt động của câu lạc bộ trong thời gian thực."
      />

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={ListTodo}
              iconBg="#eef2ff"
              iconColor="#4f46e5"
              value={taskStats.total}
              label="Tổng công việc"
            />
            <StatCard
              icon={Clock}
              iconBg="#fef3c7"
              iconColor="#d97706"
              value={taskStats.doing}
              label="Đang thực hiện"
            />
            <StatCard
              icon={CheckSquare}
              iconBg="#d1fae5"
              iconColor="#059669"
              value={taskStats.done}
              label="Hoàn thành"
              trend={{
                value: `${taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0}%`,
                positive: true,
              }}
            />
            <StatCard
              icon={AlertTriangle}
              iconBg="#fee2e2"
              iconColor="#dc2626"
              value={taskStats.overdue}
              label="Quá hạn"
              trend={
                taskStats.overdue > 0
                  ? { value: `${taskStats.overdue}`, positive: false }
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* ── Overdue alert ───────────────────────────────────────── */}
      {!loading && taskStats.overdue > 0 && (
        <div
          className="mb-6 flex items-center gap-3 px-5 py-3.5 bg-red-50 border border-red-100 rounded-2xl cursor-pointer hover:bg-red-100 transition-colors group"
          onClick={() => navigate(withClub("deadlines"))}
        >
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-red-700 flex-1">
            <strong>{taskStats.overdue}</strong> công việc đã quá hạn — nhấn để
            xem chi tiết
          </p>
          <ArrowUpRight
            size={16}
            className="text-red-400 group-hover:text-red-600 transition-colors"
          />
        </div>
      )}

      {/* ── Main content grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Active Sprint — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Sprint đang chạy
            </h2>
            <button
              type="button"
              onClick={() => navigate(withClub("sprints"))}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              Đang tải...
            </div>
          ) : !activeSprint ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-sm text-gray-400 italic">
                Không có sprint nào đang chạy
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SprintStatusBadge status={activeSprint.status} />
                <h3 className="text-lg font-bold text-gray-900">
                  {activeSprint.name}
                </h3>
              </div>
              {activeSprint.goal && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {activeSprint.goal}
                </p>
              )}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <ProgressBar
                  value={sprintProgress}
                  label={`${activeSprint.taskCount} công việc`}
                  color="#4f46e5"
                  size="md"
                />
              </div>
              <div className="flex items-center gap-4">
                {(
                  [
                    {
                      label: "Chưa làm",
                      count: sprintTasks.todo,
                      dot: "bg-gray-400",
                    },
                    {
                      label: "Đang làm",
                      count: sprintTasks.doing,
                      dot: "bg-amber-400",
                    },
                    {
                      label: "Hoàn thành",
                      count: sprintTasks.done,
                      dot: "bg-emerald-400",
                    },
                  ] as const
                ).map(({ label, count, dot }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs text-gray-500">
                      {label}:{" "}
                      <strong className="text-gray-700">{count}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Nhật ký hoạt động
            </h2>
            <button
              type="button"
              onClick={() => navigate(withClub("activity"))}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                Đang tải...
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">
                Chưa có hoạt động nào
              </p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg ${ACTION_BG[log.action] ?? "bg-gray-50"} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    {ACTION_ICON[log.action]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 leading-snug line-clamp-2">
                      <strong className="font-semibold text-gray-900">
                        {log.userName}
                      </strong>{" "}
                      {log.action === "Create"
                        ? "tạo"
                        : log.action === "Delete"
                          ? "xóa"
                          : "cập nhật"}{" "}
                      {MODULE_LABEL[log.module] ?? log.module}
                      {log.entityTitle && (
                        <span className="font-medium text-indigo-600">
                          {" "}
                          "{log.entityTitle}"
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatLogTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Upcoming Events ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" />
            Sự kiện sắp tới
          </h2>
          <button
            type="button"
            onClick={() => navigate(withClub("events"))}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            Xem tất cả <ArrowUpRight size={12} />
          </button>
        </div>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
            Đang tải...
          </div>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            Không có sự kiện sắp tới
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() =>
                  navigate(`/clubs/${clubId}/events/${ev.id}`)
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <EventStatusBadge status={ev.status} />
                  <ArrowUpRight
                    size={14}
                    className="text-gray-300 group-hover:text-indigo-400 transition-colors"
                  />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-1">
                  {ev.name}
                </h3>
                <p className="text-xs text-gray-400">
                  {ev.startTime
                    ? new Date(ev.startTime).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "long",
                      })
                    : "Chưa có ngày"}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <Users size={11} />
                  <span>{ev.participantCount} người tham gia</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Nav Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {NAV_CARD_DEFS.map(({ label, sub, icon: Icon, color, bg }) => (
          <button
            key={sub}
            type="button"
            onClick={() => navigate(withClub(sub))}
            className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2.5 shadow-sm
              hover:shadow-md hover:border-indigo-100 transition-all duration-200 cursor-pointer group"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: bg }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
