import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createTask, updateTask, deleteTask,
  getTasks, getTaskDependencies, addDependency, removeDependency,
} from "../services/operationsApi";
import type {
  TaskItem, TaskDependencyItem,
  CreateTaskDto, TaskPriority,
} from "../services/operations.types";
import { getClubMembers } from "../../membership/services/clubApi";
import type { MemberItem } from "../../membership/services/club.types";

interface Props {
  clubId: number;
  task: TaskItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
};

const DEP_STATUS_LABEL: Record<string, string> = {
  Todo: "Chưa làm",
  Doing: "Đang làm",
  Done: "Hoàn thành",
};

export default function TaskModal({ clubId, task, open, onClose, onSaved }: Props) {
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
  const [subTasks, setSubTasks] = useState<TaskItem[]>([]);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [addingSubTask, setAddingSubTask] = useState(false);

  useEffect(() => {
    if (!open) return;
    getClubMembers(clubId)
      .then(setMembers)
      .catch(() => toast.error("Không thể tải danh sách thành viên"));
    getTasks({ clubId, pageSize: 200 })
      .then(r => setAllTasks(r.items))
      .catch(() => {});
  }, [clubId, open]);

  useEffect(() => {
    if (open && task) {
      getTaskDependencies(task.id)
        .then(setDeps)
        .catch(() => {});
      getTasks({ clubId, parentId: task.id, pageSize: 50 })
        .then(r => setSubTasks(r.items))
        .catch(() => {});
    } else {
      setDeps([]);
      setAddDepId(null);
      setSubTasks([]);
      setNewSubTitle('');
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
      setForm({ title: "", description: "", priority: "Medium", deadline: "", estimatedHours: undefined, assignedTo: "" });
    }
  }, [task, open]);

  const set = (field: keyof CreateTaskDto, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Tiêu đề không được để trống"); return; }
    setSaving(true);
    try {
      const dto = { ...form, deadline: form.deadline || undefined, assignedTo: form.assignedTo || undefined };
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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không thể thêm phụ thuộc");
    } finally {
      setDepLoading(false);
    }
  };

  const handleRemoveDep = async (dependsOnTaskId: number) => {
    if (!task) return;
    try {
      await removeDependency(task.id, dependsOnTaskId);
      setDeps(prev => prev.filter(d => d.dependsOnTaskId !== dependsOnTaskId));
      onSaved();
    } catch {
      toast.error("Không thể xóa phụ thuộc");
    }
  };

  const availableToAdd = allTasks.filter(
    t => t.id !== task?.id && !deps.some(d => d.dependsOnTaskId === t.id)
  );

  const handleAddSubTask = async () => {
    if (!newSubTitle.trim() || !task) return;
    setAddingSubTask(true);
    try {
      const created = await createTask(clubId, { title: newSubTitle.trim(), priority: 'Medium', parentId: task.id });
      setSubTasks(prev => [...prev, created]);
      setNewSubTitle('');
      onSaved();
    } catch {
      toast.error('Không thể tạo công việc con');
    } finally {
      setAddingSubTask(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa công việc" : "Tạo công việc mới"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
            <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Nhập tiêu đề..." />
          </div>

          <div>
            <Label>Mô tả</Label>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Mô tả công việc..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority" className="text-sm font-medium text-gray-700">Ưu tiên</Label>
              <select
                id="priority"
                aria-label="Ưu tiên"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as TaskPriority)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input className="mt-1" type="date" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Giờ dự kiến</Label>
              <Input
                className="mt-1" type="number" min={0} step={0.5}
                value={form.estimatedHours ?? ""}
                onChange={(e) => set("estimatedHours", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="assignedTo">Người thực hiện</Label>
              <select
                id="assignedTo"
                aria-label="Người thực hiện"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                value={form.assignedTo ?? ""}
                onChange={(e) => set("assignedTo", e.target.value)}
              >
                <option value="">-- Chọn thành viên --</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName ?? m.email}{m.studentId ? ` (${m.studentId})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-tasks — edit only */}
          {isEdit && (
            <div className="border-t pt-4">
              <Label className="font-semibold text-sm text-gray-700">Công việc con</Label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">{subTasks.length} công việc con</p>

              {subTasks.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {subTasks.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-800 truncate">{sub.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${
                        sub.status === 'Done'  ? 'bg-green-100 text-green-700' :
                        sub.status === 'Doing' ? 'bg-blue-100 text-blue-700'  :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {DEP_STATUS_LABEL[sub.status] ?? sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Tiêu đề công việc con..."
                  value={newSubTitle}
                  onChange={e => setNewSubTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubTask(); } }}
                />
                <Button
                  size="sm"
                  type="button"
                  disabled={!newSubTitle.trim() || addingSubTask}
                  onClick={handleAddSubTask}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  + Thêm
                </Button>
              </div>
            </div>
          )}

          {/* Dependencies — edit only */}
          {isEdit && (
            <div className="border-t pt-4">
              <Label className="font-semibold text-sm text-gray-700">Phụ thuộc</Label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">Công việc này chỉ được chuyển sang Đang làm / Hoàn thành khi tất cả các công việc dưới đây hoàn thành.</p>

              {deps.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Chưa có phụ thuộc nào.</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {deps.map(dep => (
                    <div key={dep.dependsOnTaskId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-gray-800 truncate">{dep.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                          dep.status === 'Done' ? 'bg-green-100 text-green-700' :
                          dep.status === 'Doing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {DEP_STATUS_LABEL[dep.status] ?? dep.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ml-2 text-xs text-red-400 hover:text-red-600 shrink-0"
                        onClick={() => handleRemoveDep(dep.dependsOnTaskId)}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {availableToAdd.length > 0 && (
                <div className="flex gap-2">
                  <select
                    aria-label="Thêm phụ thuộc"
                    className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    value={addDepId ?? ""}
                    onChange={(e) => setAddDepId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">-- Chọn công việc --</option>
                    {availableToAdd.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!addDepId || depLoading}
                    onClick={handleAddDep}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                  >
                    + Thêm
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto">
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo công việc"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
