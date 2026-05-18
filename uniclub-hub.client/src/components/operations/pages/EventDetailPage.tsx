import { useEffect, useState } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Calendar,
  MapPin,
  Users,
  CalendarClock,
  Wallet,
  UserCheck,
  CheckSquare,
  ChevronRight,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getEventById,
  updateEvent,
  getTasks,
  addEventSession,
  deleteEventSession,
  assignEventStaff,
  removeEventStaff,
} from "../services/operationsApi";
import { getClubMembers } from "@/components/membership/services/clubApi";
import { EventStatusBadge, TaskStatusBadge } from "../../shared/StatusBadge";
import ProgressBar from "../../shared/ProgressBar";
import type {
  EventItem,
  TaskItem,
  UpdateEventDto,
  EventStatus,
  CreateEventSessionDto,
  AssignEventStaffDto,
} from "../services/operations.types";
import type { MemberItem } from "@/components/membership/services/club.types";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVnd(amount?: number): string {
  if (amount == null) return "Chưa xác định";
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

const PRIORITY_PILL: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  High: { label: "Cao", bg: "#fee2e2", text: "#991b1b" },
  Medium: { label: "Trung bình", bg: "#fef3c7", text: "#92400e" },
  Low: { label: "Thấp", bg: "#dbeafe", text: "#1e40af" },
};

const ROLE_LABEL: Record<string, string> = {
  Lead: "Trưởng ban",
  Staff: "Nhân sự",
};

/* ─── Edit modal ────────────────────────────────────────────────────────── */

type EventForm = {
  name: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  maxParticipants?: number;
  status: EventStatus;
  budget?: number;
  category: string;
};

function EditModal({
  open,
  event,
  onClose,
  onSaved,
}: {
  open: boolean;
  event: EventItem;
  onClose: () => void;
  onSaved: (updated: EventItem) => void;
}) {
  const [form, setForm] = useState<EventForm>({
    name: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    maxParticipants: undefined,
    status: "Draft",
    budget: undefined,
    category: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: event.name,
        description: event.description ?? "",
        location: event.location ?? "",
        startTime: event.startTime ? event.startTime.slice(0, 16) : "",
        endTime: event.endTime ? event.endTime.slice(0, 16) : "",
        maxParticipants: event.maxParticipants,
        status: event.status,
        budget: event.budget,
        category: event.category ?? "",
      });
    }
  }, [open, event]);

  const set = (field: keyof EventForm, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Tên sự kiện không được để trống");
      return;
    }
    setSaving(true);
    try {
      const dto: UpdateEventDto = {
        name: form.name,
        description: form.description,
        location: form.location,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        maxParticipants: form.maxParticipants,
        status: form.status,
        budget: form.budget,
        category: form.category || undefined,
      };
      const updated = await updateEvent(event.id, dto);
      toast.success("Đã cập nhật sự kiện");
      onSaved(updated);
      onClose();
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa sự kiện</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Label>
              Tên sự kiện <span className="text-red-500">*</span>
            </Label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <Label>Trạng thái</Label>
            <select
              aria-label="Trạng thái"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.status}
              onChange={(e) => set("status", e.target.value as EventStatus)}
            >
              <option value="Draft">Nháp</option>
              <option value="InProgress">Đang diễn ra</option>
              <option value="Completed">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
          <div>
            <Label>Mô tả</Label>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div>
            <Label>Địa điểm</Label>
            <Input
              className="mt-1"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bắt đầu</Label>
              <Input
                className="mt-1"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div>
              <Label>Kết thúc</Label>
              <Input
                className="mt-1"
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Số người tối đa</Label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={form.maxParticipants ?? ""}
                onChange={(e) =>
                  set(
                    "maxParticipants",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                placeholder="Không giới hạn"
              />
            </div>
            <div>
              <Label>Danh mục</Label>
              <Input
                className="mt-1"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Văn hoá, Học thuật..."
              />
            </div>
          </div>
          <div>
            <Label>Ngân sách (VNĐ)</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              value={form.budget ?? ""}
              onChange={(e) =>
                set(
                  "budget",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="Chưa xác định"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Add session modal ─────────────────────────────────────────────────── */

function AddSessionModal({
  open,
  eventId,
  onClose,
  onAdded,
}: {
  open: boolean;
  eventId: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const BLANK: CreateEventSessionDto = {
    title: "",
    startTime: "",
    endTime: "",
    description: "",
    location: "",
  };
  const [form, setForm] = useState<CreateEventSessionDto>(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(BLANK);
  }, [open]);

  const set = (field: keyof CreateEventSessionDto, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Tên phiên không được để trống");
      return;
    }
    if (!form.startTime || !form.endTime) {
      toast.error("Vui lòng nhập giờ bắt đầu và kết thúc");
      return;
    }
    setSaving(true);
    try {
      await addEventSession(eventId, form);
      toast.success("Đã thêm phiên");
      onAdded();
      onClose();
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm mục lịch trình</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>
              Tên mục <span className="text-red-500">*</span>
            </Label>
            <Input
              className="mt-1"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="VD: Khai mạc, Phát biểu..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Giờ bắt đầu <span className="text-red-500">*</span>
              </Label>
              <Input
                className="mt-1"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Giờ kết thúc <span className="text-red-500">*</span>
              </Label>
              <Input
                className="mt-1"
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Địa điểm</Label>
            <Input
              className="mt-1"
              value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Phòng họp, Sân trường..."
            />
          </div>
          <div>
            <Label>Mô tả</Label>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? "Đang lưu..." : "Thêm mục"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Assign staff modal ────────────────────────────────────────────────── */

function AssignStaffModal({
  open,
  eventId,
  members,
  onClose,
  onAssigned,
}: {
  open: boolean;
  eventId: number;
  members: MemberItem[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [form, setForm] = useState<AssignEventStaffDto>({
    userId: "",
    role: "Staff",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ userId: "", role: "Staff" });
  }, [open]);

  const handleSave = async () => {
    if (!form.userId) {
      toast.error("Vui lòng chọn thành viên");
      return;
    }
    setSaving(true);
    try {
      await assignEventStaff(eventId, form);
      toast.success("Đã phân công thành viên");
      onAssigned();
      onClose();
    } catch {
      toast.error("Thành viên này đã được phân công hoặc có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Phân công nhân sự</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>
              Thành viên <span className="text-red-500">*</span>
            </Label>
            <select
              aria-label="Chọn thành viên"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.userId}
              onChange={(e) =>
                setForm((f) => ({ ...f, userId: e.target.value }))
              }
            >
              <option value="">-- Chọn thành viên --</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName ?? m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Vai trò</Label>
            <select
              aria-label="Vai trò"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="Lead">Trưởng ban</option>
              <option value="Staff">Nhân sự</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? "Đang lưu..." : "Phân công"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubId = Number(searchParams.get("clubId") ?? 1);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [assignStaffOpen, setAssignStaffOpen] = useState(false);

  const loadEvent = async () => {
    if (!id) return;
    const ev = await getEventById(Number(id));
    setEvent(ev);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getEventById(Number(id)),
      getTasks({ clubId, eventId: Number(id), pageSize: 100 }),
      getClubMembers(clubId),
    ])
      .then(([ev, taskResult, memberList]) => {
        setEvent(ev);
        setTasks(taskResult.items);
        setMembers(memberList);
      })
      .catch(() => toast.error("Không thể tải thông tin sự kiện"))
      .finally(() => setLoading(false));
  }, [id, clubId]);

  const handleDeleteSession = async (sessionId: number) => {
    if (!event) return;
    try {
      await deleteEventSession(event.id, sessionId);
      toast.success("Đã xóa mục lịch trình");
      await loadEvent();
    } catch {
      toast.error("Không thể xóa mục này");
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!event) return;
    if (!confirm("Xóa nhân sự này khỏi sự kiện?")) return;
    try {
      await removeEventStaff(event.id, userId);
      toast.success("Đã xóa nhân sự");
      await loadEvent();
    } catch {
      toast.error("Không thể xóa nhân sự này");
    }
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Đã sao chép liên kết"))
      .catch(() => toast.error("Không thể sao chép liên kết"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Đang tải...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Không tìm thấy sự kiện</p>
        <Button
          variant="outline"
          onClick={() => navigate(`/operations/events?clubId=${clubId}`)}
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const sessions = event.sessions ?? [];
  const staff = event.staff ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
        <Link
          to="/operations"
          className="hover:text-indigo-600 transition-colors"
        >
          Vận hành
        </Link>
        <ChevronRight size={14} className="text-gray-400" />
        <Link
          to={`/operations/events?clubId=${clubId}`}
          className="hover:text-indigo-600 transition-colors"
        >
          Sự kiện
        </Link>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="text-gray-800 font-medium truncate max-w-[240px]">
          {event.name}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/operations/events?clubId=${clubId}`)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {event.name}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <EventStatusBadge status={event.status} />
              {event.category && (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Tag size={10} /> {event.category}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleShare}
          >
            <Share2 size={14} /> Chia sẻ
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={14} /> Chỉnh sửa
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-5 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Event info card */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Thông tin tổng quan
            </h2>
            <div className="space-y-2.5 text-sm text-gray-600">
              {event.startTime && (
                <div className="flex items-center gap-2.5">
                  <Calendar size={15} className="text-indigo-400 shrink-0" />
                  <span>
                    {formatDate(event.startTime)}
                    {event.endTime && <> &mdash; {formatDate(event.endTime)}</>}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin size={15} className="text-rose-400 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Users size={15} className="text-emerald-400 shrink-0" />
                <span>
                  {event.participantCount} người tham gia
                  {event.maxParticipants
                    ? ` / tối đa ${event.maxParticipants}`
                    : ""}
                </span>
              </div>
              {event.description && (
                <p className="text-gray-500 mt-2 leading-relaxed border-t pt-3">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {/* Agenda / Sessions */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarClock size={15} className="text-indigo-400" />
                Lịch trình hoạt động
                {sessions.length > 0 && (
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {sessions.length}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setAddSessionOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Plus size={13} /> Thêm mục
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-8 flex flex-col items-center gap-2">
                <CalendarClock size={28} className="text-gray-200" />
                <p className="text-sm text-gray-400">
                  Chưa có lịch trình — nhấn "Thêm mục" để bắt đầu
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {sessions.map((s, idx) => (
                  <div key={s.id} className="flex gap-3 group">
                    <div className="w-14 text-right text-xs text-gray-400 pt-1.5 shrink-0 leading-tight">
                      <div>{s.startTime}</div>
                      <div className="text-gray-300">{s.endTime}</div>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      {idx < sessions.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {s.title}
                      </p>
                      {s.location && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} /> {s.location}
                        </p>
                      )}
                      {s.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Xóa mục lịch trình"
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Task progress */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Tiến độ công việc
            </h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Hoàn thành</span>
              <span className="text-sm font-semibold text-gray-800">
                {doneTasks} / {tasks.length}
              </span>
            </div>
            <ProgressBar
              value={
                tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0
              }
              showLabel={false}
              size="md"
              color="#6366f1"
            />
          </div>

          {/* Budget */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Wallet size={13} className="text-amber-400" />
              Ngân sách phân bổ
            </h2>
            {event.budget != null ? (
              <p className="text-2xl font-bold text-gray-900">
                {formatVnd(event.budget)}
              </p>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 py-5 flex flex-col items-center gap-1.5">
                <Wallet size={22} className="text-gray-200" />
                <p className="text-xs text-gray-400 text-center">
                  Chưa xác định ngân sách
                </p>
              </div>
            )}
          </div>

          {/* Staff */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck size={13} className="text-violet-400" />
                Nhân sự phụ trách
                {staff.length > 0 && (
                  <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">
                    {staff.length}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setAssignStaffOpen(true)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5"
              >
                <Plus size={12} /> Phân công
              </button>
            </div>

            {staff.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-5 flex flex-col items-center gap-1.5">
                <UserCheck size={22} className="text-gray-200" />
                <p className="text-xs text-gray-400 text-center">
                  Chưa có nhân sự được phân công
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 overflow-hidden">
                      {s.avatarUrl ? (
                        <img
                          src={s.avatarUrl}
                          alt={s.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        s.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {s.userName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ROLE_LABEL[s.role] ?? s.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Xóa nhân sự"
                      onClick={() => handleRemoveStaff(s.userId)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="mt-5 bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CheckSquare size={15} className="text-indigo-400" />
            Công việc liên quan
            {tasks.length > 0 && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                {tasks.length}
              </span>
            )}
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            Chưa có công việc nào liên kết với sự kiện này
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/70">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tiêu đề
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ưu tiên
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Người thực hiện
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Deadline
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const pri = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Medium;
                return (
                  <tr
                    key={t.id}
                    className="border-b last:border-0 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {t.title}
                    </td>
                    <td className="px-4 py-3">
                      <TaskStatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: pri.bg, color: pri.text }}
                      >
                        {pri.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.assigneeName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.deadline
                        ? new Date(t.deadline).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editOpen && (
        <EditModal
          open={editOpen}
          event={event}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setEvent(updated)}
        />
      )}

      <AddSessionModal
        open={addSessionOpen}
        eventId={event.id}
        onClose={() => setAddSessionOpen(false)}
        onAdded={loadEvent}
      />

      <AssignStaffModal
        open={assignStaffOpen}
        eventId={event.id}
        members={members}
        onClose={() => setAssignStaffOpen(false)}
        onAssigned={loadEvent}
      />
    </div>
  );
}
