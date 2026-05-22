import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  RefreshCw,
  AlertTriangle,
  Users,
  Activity,
  Download,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import AvatarGroup from "../../shared/AvatarGroup";
import { getTasks } from "../services/operationsApi";
import type { TaskItem } from "../services/operations.types";

const OVERLOAD_THRESHOLD = 5;

type Capacity = "Quá tải" | "Bình thường" | "Sẵn sàng";

const CAPACITY_CONFIG: Record<
  Capacity,
  { badge: string; bar: string; actionClass: string; action: string }
> = {
  "Quá tải": {
    badge: "bg-red-50 text-red-600 border border-red-200",
    bar: "#ef4444",
    actionClass: "bg-red-50 text-red-600 hover:bg-red-100",
    action: "Điều chuyển",
  },
  "Bình thường": {
    badge: "bg-amber-50 text-amber-600 border border-amber-200",
    bar: "#f59e0b",
    actionClass: "bg-gray-50 text-gray-600 hover:bg-gray-100",
    action: "Xem chi tiết",
  },
  "Sẵn sàng": {
    badge: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    bar: "#10b981",
    actionClass: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
    action: "+Giao task",
  },
};

const MOCK_DEPTS = [
  "Ban Nội dung",
  "Ban Kỹ thuật",
  "Ban Truyền thông",
  "Ban Sự kiện",
];

function getDept(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MOCK_DEPTS[Math.abs(h) % MOCK_DEPTS.length];
}

function getCapacity(active: number): Capacity {
  if (active > OVERLOAD_THRESHOLD) return "Quá tải";
  if (active >= 2) return "Bình thường";
  return "Sẵn sàng";
}

interface WorkloadRow {
  name: string;
  active: number;
  done: number;
  capacity: Capacity;
  dept: string;
}

function buildWorkload(tasks: TaskItem[]): WorkloadRow[] {
  const map = new Map<string, { active: number; done: number }>();
  for (const t of tasks) {
    if (!t.assigneeName) continue;
    if (!map.has(t.assigneeName))
      map.set(t.assigneeName, { active: 0, done: 0 });
    const row = map.get(t.assigneeName)!;
    if (t.status === "Done") row.done++;
    else row.active++;
  }
  return Array.from(map.entries())
    .map(([name, counts]) => ({
      name,
      active: counts.active,
      done: counts.done,
      capacity: getCapacity(counts.active),
      dept: getDept(name),
    }))
    .sort((a, b) => b.active - a.active);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-gray-600">
        Task đang chạy:{" "}
        <span className="font-bold text-gray-900">{payload[0].value}</span>
      </p>
      {payload[0].value > OVERLOAD_THRESHOLD && (
        <p className="text-red-500 text-xs mt-1">
          Vượt ngưỡng {OVERLOAD_THRESHOLD} task
        </p>
      )}
    </div>
  );
}

export default function WorkloadPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const clubId = Number(clubIdParam ?? 1);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTasks({ clubId, pageSize: 500 });
      setTasks(result.items);
    } catch {
      toast.error("Không thể tải dữ liệu công việc");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  const data = buildWorkload(tasks);
  const activeTasks = tasks.filter((t) => t.status !== "Done").length;
  const members = data;
  const avgPerPerson = members.length
    ? (activeTasks / members.length).toFixed(1)
    : "0";
  const overloaded = data.filter((r) => r.capacity === "Quá tải");
  const available = data.filter((r) => r.capacity === "Sẵn sàng");
  const barHeight = Math.max(data.length * 52, 200);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Phân bổ Công việc
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi khối lượng và phát hiện thành viên quá tải để điều phối lại
            nhân sự
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600">
            <SlidersHorizontal size={14} />
            Lọc phòng ban
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600">
            <Download size={14} />
            Xuất báo cáo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Activity}
          iconBg="#ede9fe"
          iconColor="#7c3aed"
          value={activeTasks}
          label="Tổng Task Đang Chạy"
          trend={{ value: "+12%", positive: true }}
        />
        <StatCard
          icon={Users}
          iconBg="#dbeafe"
          iconColor="#2563eb"
          value={avgPerPerson}
          label="Trung Bình Task / Người"
          subtitle={`${members.length} thành viên có việc`}
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="#fee2e2"
          iconColor="#dc2626"
          value={overloaded.length}
          label={`Cảnh Báo Quá Tải >${OVERLOAD_THRESHOLD} Tasks`}
          trend={
            overloaded.length > 0
              ? { value: "Cần xử lý", positive: false }
              : undefined
          }
        />
      </div>

      {/* Chart + suggestions */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Horizontal bar chart */}
        <div className="col-span-2 bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Khối lượng công việc đang chạy
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="inline-block w-5 border-t-2 border-dashed border-red-400" />
              Ngưỡng quá tải ({OVERLOAD_THRESHOLD} task)
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Đang tải...
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                barSize={18}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, "dataMax + 2"]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "#f8fafc" }}
                />
                <ReferenceLine
                  x={OVERLOAD_THRESHOLD}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Bar dataKey="active" radius={[0, 4, 4, 0]}>
                  {data.map((row) => (
                    <Cell
                      key={row.name}
                      fill={CAPACITY_CONFIG[row.capacity].bar}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Suggestions panel */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Gợi ý Điều chỉnh
          </h2>

          {overloaded.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 text-sm py-8 gap-2">
              <CheckCircle size={32} className="text-emerald-400" />
              <p>Không có thành viên quá tải</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto">
              {overloaded.map((member, idx) => {
                const target = available[idx % Math.max(available.length, 1)];
                return (
                  <div
                    key={member.name}
                    className="rounded-xl border border-red-100 bg-red-50/40 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AvatarGroup
                        avatars={[{ name: member.name }]}
                        max={1}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {member.name}
                        </p>
                        <p className="text-[10px] text-red-500">
                          {member.active} task đang chạy
                        </p>
                      </div>
                    </div>
                    {available.length > 0 && target && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-wrap">
                        <span>Điều chuyển sang</span>
                        <ArrowRight size={10} />
                        <span className="font-medium text-emerald-600">
                          {target.name}
                        </span>
                        <span className="text-gray-400">
                          ({target.active} task)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Member detail table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Chi tiết thành viên
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-1/3">
                  Thành viên
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phòng ban
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                  Task đang chạy
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                  Tình trạng
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => {
                const cfg = CAPACITY_CONFIG[row.capacity];
                return (
                  <tr
                    key={row.name}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarGroup
                          avatars={[{ name: row.name }]}
                          max={1}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-gray-800">
                            {row.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {row.done} task hoàn thành
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-sm">
                      {row.dept}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-gray-900">
                        {row.active}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}
                      >
                        {row.capacity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${cfg.actionClass}`}
                      >
                        {cfg.action}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-400 text-sm"
                  >
                    {loading ? "Đang tải..." : "Chưa có dữ liệu thành viên"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
