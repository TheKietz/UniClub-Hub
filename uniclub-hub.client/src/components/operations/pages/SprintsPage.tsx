import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Layers, CheckCircle2, Users, Zap } from "lucide-react";
import {
  getSprints,
  createSprint,
  deleteSprint,
  getTasks,
} from "../services/operationsApi";
import type {
  SprintItem,
  SprintStatus,
  CreateSprintDto,
} from "../services/operations.types";
/* ── Components ─────────────────────────────────────────────────────── */
import PageHeader from "../../shared/PageHeader";
import StatCard from "../components/StatCard";
import FilterBar from "../../shared/FilterBar";
import SprintCard from "../components/sprint/SprintCard";
import type { SprintCardData } from "../components/sprint/SprintCard";
import AddSprintCard from '../components/sprint/AddSprintCard';
import CreateSprintModal from "../components/sprint/CreateSprintModal";
import SkeletonCard, { SkeletonStatCard } from "../../shared/Skeleton";
import EmptyState from "../../shared/EmptyState";

/* ── Status config ──────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { key: "", label: "Tất cả" },
  { key: "Planning", label: "Planning" },
  { key: "Active", label: "Active" },
  { key: "Completed", label: "Completed" },
  { key: "Cancelled", label: "Cancelled" },
];

function toCard(s: SprintItem): SprintCardData {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    goal: s.goal,
    progress: 0,
    taskCount: s.taskCount,
    members: [],
  };
}

export default function SprintsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubId = Number(searchParams.get("clubId") ?? 1);

  /* ── State ──────────────────────────────────────────────────────────── */
  const [sprints, setSprints] = useState<SprintCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SprintItem | null>(null);

  /* ── Data fetching ──────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSprints({ clubId, pageSize: 100 }),
      getTasks({ clubId, status: "Done", pageSize: 1 }),
    ])
      .then(([sprintResult, doneResult]) => {
        setSprints(sprintResult.items.map(toCard));
        setCompletedTasksCount(doneResult.totalCount);
      })
      .catch(() => toast.error("Không thể tải danh sách sprint"))
      .finally(() => setLoading(false));
  }, [clubId]);

  /* ── Filtered + searched data ───────────────────────────────────────── */
  const displayed = useMemo(() => {
    let result = sprints;
    if (statusFilter) result = result.filter((s) => s.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.goal?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [sprints, statusFilter, searchQuery]);

  /* ── Stats ──────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const byStatus = (s: SprintStatus) =>
      sprints.filter((sp) => sp.status === s).length;
    const totalTasks = sprints.reduce((acc, s) => acc + s.taskCount, 0);
    return {
      total: sprints.length,
      active: byStatus("Active"),
      completedTasks: completedTasksCount,
      totalTasks,
    };
  }, [sprints, completedTasksCount]);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleCreate = async (data: CreateSprintDto) => {
    try {
      await createSprint(clubId, data);
      toast.success("Tạo sprint thành công");
      const r = await getSprints({ clubId, pageSize: 100 });
      setSprints(r.items.map(toCard));
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
      throw new Error("Failed to create sprint");
    }
  };

  const handleEdit = (id: number) => {
    const sprint = sprints.find((s) => s.id === id);
    if (sprint) {
      setEditTarget({
        id: sprint.id,
        clubId,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
        createdAt: "",
        taskCount: sprint.taskCount,
      });
      setModalOpen(true);
    }
  };

  const handleDelete = async (id: number) => {
    const sprint = sprints.find((s) => s.id === id);
    if (!sprint) return;
    if (!confirm(`Xóa sprint "${sprint.name}"?`)) return;
    try {
      await deleteSprint(id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      toast.success("Đã xóa sprint");
    } catch {
      toast.error("Không thể xóa sprint này");
    }
  };

  const handleViewKanban = (id: number) => {
    navigate(`/operations/kanban?clubId=${clubId}&sprintId=${id}`);
  };

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumbs={[
          { label: "Tasks", href: `/operations/kanban?clubId=${clubId}` },
          { label: "Sprint Management" },
        ]}
        title="Quản lý Sprint"
        description="Lập kế hoạch và theo dõi các chu kỳ làm việc Agile. Chia nhỏ các dự án lớn thành các giai đoạn ngắn hạn để tăng hiệu suất và độ minh bạch cho câu lạc bộ."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm
              bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] hover:from-[#0d2f4f] hover:to-[#1f4570]
              transition-all duration-200 hover:shadow-md"
          >
            <Plus size={16} />
            Tạo Sprint mới
          </button>
        }
      />

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={Layers}
              iconBg="#eef2ff"
              iconColor="#4f46e5"
              value={stats.total.toString().padStart(2, "0")}
              label="Tổng số Sprint"
            />
            <StatCard
              icon={Zap}
              iconBg="#fef3c7"
              iconColor="#d97706"
              value={stats.active.toString().padStart(2, "0")}
              label="Sprint Đang chạy"
              subtitle="Đang dùng tiến độ"
            />
            <StatCard
              icon={CheckCircle2}
              iconBg="#d1fae5"
              iconColor="#059669"
              value={stats.completedTasks.toString()}
              label="Việc đã hoàn thành"
            />
            <StatCard
              icon={Users}
              iconBg="#e0e7ff"
              iconColor="#4338ca"
              value={stats.totalTasks.toString()}
              label="Tổng công việc"
            />
          </>
        )}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm sprint theo tên..."
        statusOptions={STATUS_OPTIONS}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
        sortLabel="Mới nhất"
      />

      {/* ── Sprint Grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Layers size={32} />}
          title="Chưa có sprint nào"
          description="Tạo sprint đầu tiên để bắt đầu quản lý công việc theo chu kỳ Agile."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              + Tạo sprint mới
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayed.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewKanban={handleViewKanban}
            />
          ))}
          <AddSprintCard onClick={openCreate} />
        </div>
      )}

      {/* ── Floating action button (mobile) ─────────────────────────── */}
      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#0A2540] text-white shadow-xl
          flex items-center justify-center hover:bg-[#0d2f4f] transition-all
          hover:scale-105 active:scale-95 lg:hidden z-40"
        aria-label="Tạo sprint mới"
      >
        <Plus size={24} />
      </button>

      {/* ── Create/Edit Modal ───────────────────────────────────────── */}
      <CreateSprintModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleCreate}
        editData={
          editTarget
            ? {
                id: editTarget.id,
                name: editTarget.name,
                goal: editTarget.goal,
                startDate: editTarget.startDate,
                endDate: editTarget.endDate,
                status: editTarget.status,
              }
            : undefined
        }
      />
    </div>
  );
}
