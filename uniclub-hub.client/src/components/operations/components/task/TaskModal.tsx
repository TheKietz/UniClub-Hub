import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  List,
  Link2,
  Plus,
  X,
  Trash2,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";
import ProgressBar from "../../../shared/ProgressBar";
import {
  createTask,
  updateTask,
  deleteTask,
  getTasks,
  getTaskDependencies,
  addDependency,
  removeDependency,
  updateTaskStatus,
  getEvents,
} from "../../services/operationsApi";
import type {
  TaskItem,
  TaskDependencyItem,
  CreateTaskDto,
  TaskPriority,
  TaskStatus,
  EventItem,
} from "../../services/operations.types";
import { getClubMembers } from "../../../membership/services/clubApi";
import type { MemberItem } from "../../../membership/services/club.types";
import { FilterSelect } from "@/components/shared/FilterSelect";

interface Props {
  clubId: number;
  task: TaskItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];
const PRIORITY_META: Record<TaskPriority, { label: string; dot: string }> = {
  Low: { label: "Thấp", dot: "bg-sky-400" },
  Medium: { label: "Trung bình", dot: "bg-amber-400" },
  High: { label: "Cao", dot: "bg-red-500" },
};

const STATUS_STYLE: Record<
  TaskStatus,
  { label: string; bg: string; text: string }
> = {
  Todo: { label: "Chưa làm", bg: "bg-gray-100", text: "text-gray-600" },
  Doing: {
    label: "Đang thực hiện",
    bg: "bg-green-100",
    text: "text-green-700",
  },
  Done: { label: "Hoàn thành", bg: "bg-blue-100", text: "text-blue-700" },
};

export default function TaskModal({
  clubId,
  task,
  open,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!task;

  const [form, setForm] = useState<CreateTaskDto>({
    title: "",
    description: "",
    priority: "Medium",
    deadline: "",
    estimatedHours: undefined,
    assignedTo: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [deps, setDeps] = useState<TaskDependencyItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [addDepId, setAddDepId] = useState<number | null>(null);
  const [depLoading, setDepLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [subTasks, setSubTasks] = useState<TaskItem[]>([]);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [togglingSubId, setTogglingSubId] = useState<number | null>(null);

  const subInputRef = useRef<HTMLInputElement>(null);

  /* ── Load data on open ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    Promise.all([
      getClubMembers(clubId),
      getTasks({ clubId, pageSize: 200 }),
      getEvents({ clubId, pageSize: 100 }),
    ])
      .then(([memberList, taskResult, eventResult]) => {
        setMembers(memberList);
        setAllTasks(taskResult.items);
        setEvents(eventResult.items);
      })
      .catch(() => toast.error("Không thể tải dữ liệu"));
  }, [clubId, open]);

  useEffect(() => {
    if (open && task) {
      getTaskDependencies(task.id)
        .then(setDeps)
        .catch(() => {});
      getTasks({ clubId, parentId: task.id, pageSize: 50 })
        .then((r) => setSubTasks(r.items))
        .catch(() => {});
    } else {
      setDeps([]);
      setAddDepId(null);
      setSubTasks([]);
      setNewSubTitle("");
    }
  }, [task, open, clubId]);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        deadline: task.deadline ? task.deadline.slice(0, 10) : "",
        estimatedHours: task.estimatedHours,
        assignedTo: task.assignedTo ?? "",
        eventId: task.eventId,
        sprintId: task.sprintId,
        departmentId: task.departmentId,
        parentId: task.parentId,
      });
    } else {
      setForm({
        title: "",
        description: "",
        priority: "Medium",
        deadline: "",
        estimatedHours: undefined,
        assignedTo: "",
        eventId: undefined,
      });
    }
  }, [task, open]);

  const set = (field: keyof CreateTaskDto, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* ── Save / Delete ──────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Tiêu đề không được để trống");
      return;
    }
    setSaving(true);
    try {
      const dto = {
        ...form,
        deadline: form.deadline || undefined,
        assignedTo: form.assignedTo || undefined,
      };
      if (isEdit) {
        await updateTask(task.id, dto);
        toast.success("Cập nhật công việc thành công");
      } else {
        await createTask(clubId, dto);
        toast.success("Tạo công việc thành công");
      }
      onSaved();
      onClose();
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success("Đã xóa công việc");
      onSaved();
      onClose();
    } catch {
      toast.error("Không thể xóa công việc này");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Dependencies ───────────────────────────────────────────────────── */
  const handleAddDep = async () => {
    if (!task || !addDepId) return;
    setDepLoading(true);
    try {
      await addDependency(task.id, { dependsOnTaskId: addDepId });
      const updated = await getTaskDependencies(task.id);
      setDeps(updated);
      setAddDepId(null);
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Không thể thêm phụ thuộc");
    } finally {
      setDepLoading(false);
    }
  };

  const handleRemoveDep = async (depId: number) => {
    if (!task) return;
    try {
      await removeDependency(task.id, depId);
      setDeps((prev) => prev.filter((d) => d.dependsOnTaskId !== depId));
      onSaved();
    } catch {
      toast.error("Không thể xóa phụ thuộc");
    }
  };

  /* ── Sub-tasks ──────────────────────────────────────────────────────── */
  const handleAddSubTask = async () => {
    if (!newSubTitle.trim() || !task) return;
    setAddingSubTask(true);
    try {
      const created = await createTask(clubId, {
        title: newSubTitle.trim(),
        priority: "Medium",
        parentId: task.id,
      });
      setSubTasks((prev) => [...prev, created]);
      setNewSubTitle("");
      onSaved();
      subInputRef.current?.focus();
    } catch {
      toast.error("Không thể tạo công việc con");
    } finally {
      setAddingSubTask(false);
    }
  };

  const handleToggleSubTask = async (sub: TaskItem) => {
    setTogglingSubId(sub.id);
    const newStatus: TaskStatus = sub.status === "Done" ? "Todo" : "Done";
    const progress = newStatus === "Done" ? 100 : 0;
    try {
      const updated = await updateTaskStatus(sub.id, {
        status: newStatus,
        progress,
      });
      setSubTasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
    } catch {
      toast.error("Không thể cập nhật công việc con");
    } finally {
      setTogglingSubId(null);
    }
  };

  const doneCount = subTasks.filter((s) => s.status === "Done").length;
  const availableDeps = allTasks.filter(
    (t) => t.id !== task?.id && !deps.some((d) => d.dependsOnTaskId === t.id),
  );
  const assigneeMember = members.find((m) => m.userId === form.assignedTo);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-hidden p-0 gap-0">
        {/* ── Modal header ─────────────────────────────────────────────── */}
        <DialogHeader className="flex-row items-center gap-3 px-6 py-4 border-b border-gray-100">
          {isEdit && (
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md shrink-0">
              #TK-{task.id}
            </span>
          )}
          {isEdit && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[task.status].bg} ${STATUS_STYLE[task.status].text}`}
            >
              {STATUS_STYLE[task.status].label}
            </span>
          )}
          {isEdit && task.eventId && (() => {
            const evName = task.eventName ?? events.find(e => e.id === task.eventId)?.name
            return evName ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-indigo-100 text-indigo-700 max-w-[180px] truncate" title={evName}>
                {evName}
              </span>
            ) : null
          })()}
          <span className="text-sm font-semibold text-gray-700 flex-1">
            {isEdit ? "Chi tiết công việc" : "Tạo công việc mới"}
          </span>
        </DialogHeader>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex overflow-hidden max-h-[calc(92vh-200px)]">
          {/* Left: title + description + sub-tasks */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 border-r border-gray-100">
            {/* Title */}
            <input
              className="w-full text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none bg-transparent border-none"
              placeholder="Tiêu đề công việc..."
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />

            {/* Description */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <List size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">
                  Mô tả
                </span>
              </div>
              {/* Toolbar (cosmetic) */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-t-lg px-2 py-1.5 bg-gray-50">
                {(
                  [
                    { Icon: Bold, tip: "In đậm" },
                    { Icon: Italic, tip: "In nghiêng" },
                    { Icon: List, tip: "Danh sách" },
                    { Icon: Link2, tip: "Liên kết" },
                  ] as const
                ).map(({ Icon, tip }) => (
                  <button
                    key={tip}
                    type="button"
                    title={tip}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border border-t-0 border-gray-200 rounded-b-lg px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                rows={9}
                placeholder="Mô tả chi tiết công việc..."
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Sub-tasks — only in edit mode */}
            {isEdit && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600">
                      Sub-tasks
                    </span>
                  </div>
                  {subTasks.length > 0 && (
                    <span className="text-xs text-gray-400 font-medium">
                      {doneCount}/{subTasks.length} Completed
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {subTasks.length > 0 && (
                  <div className="mb-3">
                    <ProgressBar
                      value={
                        subTasks.length > 0
                          ? Math.round((doneCount / subTasks.length) * 100)
                          : 0
                      }
                      showLabel={false}
                      size="sm"
                      color="#1d4ed8"
                    />
                  </div>
                )}

                {/* Sub-task list */}
                <div className="space-y-1.5 mb-3">
                  {subTasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2.5 py-1 group/sub cursor-pointer"
                      onClick={() => handleToggleSubTask(sub)}
                    >
                      {togglingSubId === sub.id ? (
                        <div className="w-4 h-4 border-2 border-indigo-400 rounded animate-pulse shrink-0" />
                      ) : sub.status === "Done" ? (
                        <CheckSquare
                          size={16}
                          className="text-indigo-500 shrink-0"
                        />
                      ) : (
                        <Square
                          size={16}
                          className="text-gray-300 group-hover/sub:text-gray-400 shrink-0"
                        />
                      )}
                      <span
                        className={`text-sm flex-1 ${sub.status === "Done" ? "line-through text-gray-400" : "text-gray-700"}`}
                      >
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add sub-task input */}
                <div className="flex items-center gap-2 border border-dashed border-gray-200 rounded-lg px-3 py-2 focus-within:border-indigo-300">
                  <Plus size={14} className="text-gray-300 shrink-0" />
                  <input
                    ref={subInputRef}
                    type="text"
                    placeholder="Thêm sub-task..."
                    className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none bg-transparent"
                    value={newSubTitle}
                    onChange={(e) => setNewSubTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubTask();
                      }
                    }}
                    disabled={addingSubTask}
                  />
                  <span className="text-[10px] text-gray-300 font-medium shrink-0">
                    Enter ↵
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: metadata sidebar */}
          <div className="w-52 shrink-0 overflow-y-auto px-5 py-5 space-y-5 bg-gray-50/50">
            {/* Assignee */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Người thực hiện
              </Label>
              {assigneeMember ? (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">
                      {assigneeMember.fullName
                        ?.split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("") ?? "?"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {assigneeMember.fullName ?? assigneeMember.email}
                  </span>
                </div>
              ) : null}
              <FilterSelect
                value={form.assignedTo ?? ""}
                onChange={(value) => set("assignedTo", value)}
                options={[
                  { value: "", label: "-- Chọn thành viên --" },
                  ...members.map((m) => ({
                    value: m.userId,
                    label: `${m.fullName ?? m.email}${m.studentId ? ` (${m.studentId})` : ""}`,
                  })),
                ]}
                maxMenuHeight={260}
              />
            </div>

            {/* Priority */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Mức ưu tiên
              </Label>
              <div className="relative">
                <FilterSelect
                  value={form.priority}
                  onChange={(value) => set("priority", value as TaskPriority)}
                  options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
                  buttonStyle={{ paddingLeft: 28 }}
                />
                <span
                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${PRIORITY_META[form.priority].dot} pointer-events-none`}
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Deadline
              </Label>
              <Input
                type="date"
                className="text-sm border-gray-200 focus:ring-1 focus:ring-indigo-300 rounded-lg"
                value={form.deadline ?? ""}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </div>

            {/* Event */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Sự kiện
              </Label>
              <FilterSelect
                value={form.eventId ? String(form.eventId) : ""}
                onChange={(value) =>
                  set(
                    "eventId",
                    value ? Number(value) : undefined,
                  )
                }
                options={[
                  { value: "", label: "-- Không có --" },
                  ...events.map((ev) => ({ value: String(ev.id), label: ev.name })),
                ]}
                maxMenuHeight={260}
              />
            </div>

            {/* Dependencies — edit only */}
            {isEdit && (
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Dependencies
                </Label>

                {deps.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {deps.map((dep) => (
                      <div
                        key={dep.dependsOnTaskId}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5"
                      >
                        <Link2 size={12} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">
                          Depends on #{dep.dependsOnTaskId}
                        </span>
                        <button
                          type="button"
                          title="Xóa phụ thuộc"
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          onClick={() => handleRemoveDep(dep.dependsOnTaskId)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {availableDeps.length > 0 && (
                  <div className="space-y-1.5">
                    <FilterSelect
                      value={addDepId ? String(addDepId) : ""}
                      onChange={(value) =>
                        setAddDepId(
                          value ? Number(value) : null,
                        )
                      }
                      options={[
                        { value: "", label: "-- Chọn công việc --" },
                        ...availableDeps.map((t) => ({ value: String(t.id), label: t.title })),
                      ]}
                      maxMenuHeight={220}
                    />
                    <button
                      type="button"
                      disabled={!addDepId || depLoading}
                      onClick={handleAddDep}
                      className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
                    >
                      <Plus size={12} /> Add Dependency
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 size={15} />
              {deleting ? "Đang xóa..." : "Delete Task"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="bg-[#1a3a6c] hover:bg-[#152f59] text-white gap-1.5"
            >
              <Save size={14} />
              {saving
                ? "Đang lưu..."
                : isEdit
                  ? "Save Changes"
                  : "Tạo công việc"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
