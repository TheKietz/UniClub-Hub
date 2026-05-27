import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  X, Plus, Trash2, Paperclip, CheckSquare, Square, ChevronRight,
  Link2, Upload, AlignLeft, MessageSquare, Eye, EyeOff,
  Tag, Calendar, User, ChevronDown, Check,
} from "lucide-react";
import {
  createTask, updateTask, deleteTask,
  getTaskComments, addTaskComment, updateTaskComment, deleteTaskComment,
  getTaskAttachments, addTaskAttachmentLink, deleteTaskAttachment, uploadTaskAttachmentFile,
  getAuditLogs,
} from "../../services/operationsApi";
import type {
  TaskItem, TaskCommentItem, TaskAttachmentItem, AuditLogItem,
  CreateTaskDto, TaskPriority, KanbanColumnItem,
} from "../../services/operations.types";
import { getClubMembers } from "../../../membership/services/clubApi";
import type { MemberItem } from "../../../membership/services/club.types";

interface Props {
  clubId: number;
  task: TaskItem | null;
  open: boolean;
  defaultColumnId?: number;
  defaultSprintId?: number;
  columns: KanbanColumnItem[];
  onClose: () => void;
  onSaved: () => void;
}

// ── Label / Priority colours ──────────────────────────────────────────────────
const PRIORITY_LABELS: { value: TaskPriority; color: string; label: string }[] = [
  { value: "Low",    color: "#61bd4f", label: "Thấp"       },
  { value: "Medium", color: "#f2d600", label: "Trung bình" },
  { value: "High",   color: "#eb5a46", label: "Cao"        },
];

// ── Checklist (localStorage-backed) ──────────────────────────────────────────
interface CLItem  { id: string; text: string; done: boolean }
interface CLGroup { id: string; name: string; items: CLItem[] }
const CL_KEY = (tid: number) => `task_cl_${tid}`;
const loadCL = (tid: number): CLGroup[] => {
  try { const r = localStorage.getItem(CL_KEY(tid)); if (r) return JSON.parse(r); } catch {}
  return [];
};
const saveCL = (tid: number, gs: CLGroup[]) => {
  try { localStorage.setItem(CL_KEY(tid), JSON.stringify(gs)); } catch {}
};
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Multi-member (localStorage-backed) ───────────────────────────────────────
const MEMBERS_KEY = (tid: number) => `task_members_${tid}`;
const loadMembers = (tid: number, primary?: string): string[] => {
  try { const r = localStorage.getItem(MEMBERS_KEY(tid)); if (r) return JSON.parse(r); } catch {}
  return primary ? [primary] : [];
};
const saveMembers = (tid: number, ids: string[]) => {
  try { localStorage.setItem(MEMBERS_KEY(tid), JSON.stringify(ids)); } catch {}
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });
};

const initials = (name: string) =>
  name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

// ── Combined feed ─────────────────────────────────────────────────────────────
type FeedEntry =
  | { kind: "comment";  id: number; userName: string; content: string; time: string }
  | { kind: "activity"; userName: string; action: string; time: string };

// ── Panel type ────────────────────────────────────────────────────────────────
type Panel = "add" | "label" | "date" | "member" | "attach" | null;

export default function TaskDetailModal({
  clubId, task, open, defaultColumnId, defaultSprintId, columns, onClose, onSaved,
}: Props) {
  const isEdit = !!task;

  // Form fields
  const [title,          setTitle]         = useState("");
  const [description,    setDescription]   = useState("");
  const [priority,       setPriority]      = useState<TaskPriority>("Medium");
  const [startDate,      setStartDate]     = useState("");
  const [deadline,       setDeadline]      = useState("");
  const [assignedUsers,  setAssignedUsers] = useState<string[]>([]);
  const [kanbanColumnId, setKanbanColumnId]= useState<number | undefined>();
  const [sprintId,       setSprintId]      = useState<number | undefined>();
  const [saving,         setSaving]        = useState(false);
  const [deleting,       setDeleting]      = useState(false);

  // Active panel (only one open at a time)
  const [panel, setPanel] = useState<Panel>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Date panel local state
  const [useStart,    setUseStart]    = useState(false);
  const [useDeadline, setUseDeadline] = useState(false);
  const [tmpStart,    setTmpStart]    = useState("");
  const [tmpDeadline, setTmpDeadline] = useState("");
  const [tmpTime,     setTmpTime]     = useState("23:59");

  // Checklists
  const [checklists,      setChecklists]      = useState<CLGroup[]>([]);
  const [addingGroupId,   setAddingGroupId]   = useState<string | null>(null);
  const [newItemText,     setNewItemText]     = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameText,      setRenameText]      = useState("");
  const newItemRef = useRef<HTMLInputElement>(null);

  // Comments & activity
  const [comments,     setComments]     = useState<TaskCommentItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLogItem[]>([]);
  const [newComment,   setNewComment]   = useState("");
  const [posting,      setPosting]      = useState(false);
  const [editCmtId,    setEditCmtId]    = useState<number | null>(null);
  const [editCmtText,  setEditCmtText]  = useState("");
  const [showDetail,   setShowDetail]   = useState(true);

  // Attachments
  const [attachments, setAttachments] = useState<TaskAttachmentItem[]>([]);
  const [linkUrl,     setLinkUrl]     = useState("");
  const [linkNote,    setLinkNote]    = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Side data
  const [members,      setMembers]      = useState<MemberItem[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setPanel(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const togglePanel = useCallback((p: Panel) =>
    setPanel(prev => prev === p ? null : p), []);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    getClubMembers(clubId).then(setMembers).catch(() => {});
  }, [open, clubId]);

  useEffect(() => {
    if (open && task) {
      getTaskComments(task.id).then(setComments).catch(() => {});
      getTaskAttachments(task.id).then(setAttachments).catch(() => {});
      getAuditLogs({ clubId: task.clubId, module: "Tasks", pageSize: 50 })
        .then(r => setActivityLogs(r.items.filter(l => l.entityId === String(task.id))))
        .catch(() => {});
      setChecklists(loadCL(task.id));
    } else {
      setComments([]); setAttachments([]); setActivityLogs([]); setChecklists([]);
    }
  }, [task, open, clubId]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      const sd = task.startDate ? task.startDate.slice(0, 10) : "";
      const dl = task.deadline  ? task.deadline.slice(0, 10)  : "";
      setStartDate(sd); setTmpStart(sd); setUseStart(!!sd);
      setDeadline(dl);  setTmpDeadline(dl); setUseDeadline(!!dl);
      setAssignedUsers(task ? loadMembers(task.id, task.assignedTo ?? undefined) : []);
      setKanbanColumnId(task.kanbanColumnId ?? defaultColumnId);
      setSprintId(task.sprintId);
    } else {
      setTitle(""); setDescription(""); setPriority("Medium");
      setStartDate(""); setDeadline(""); setAssignedUsers([]);
      setUseStart(false); setUseDeadline(false);
      setTmpStart(""); setTmpDeadline(""); setTmpTime("23:59");
      setKanbanColumnId(defaultColumnId);
      setSprintId(defaultSprintId);
    }
  }, [task, open, defaultColumnId, defaultSprintId]);

  useEffect(() => {
    if (addingGroupId) newItemRef.current?.focus();
  }, [addingGroupId]);

  // ── Save / Delete ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error("Tiêu đề không được để trống"); return; }
    setSaving(true);
    try {
      const dto: CreateTaskDto = {
        title: title.trim(), description: description || undefined, priority,
        startDate: startDate || undefined, deadline: deadline || undefined,
        assignedTo: assignedUsers[0] || undefined, kanbanColumnId,
        ...(isEdit ? {} : { sprintId }),
      };
      if (isEdit) { await updateTask(task.id, dto); toast.success("Đã cập nhật công việc"); }
      else        { await createTask(clubId, dto);  toast.success("Đã tạo công việc"); }
      onSaved(); onClose();
    } catch { toast.error("Có lỗi xảy ra"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!task || !window.confirm("Xóa công việc này?")) return;
    setDeleting(true);
    try { await deleteTask(task.id); toast.success("Đã xóa"); onSaved(); onClose(); }
    catch { toast.error("Không thể xóa"); }
    finally { setDeleting(false); }
  };

  // ── Date panel apply ───────────────────────────────────────────────────────
  const applyDates = () => {
    const sd = useStart    ? tmpStart    : "";
    const dl = useDeadline ? tmpDeadline : "";
    setStartDate(sd); setDeadline(dl); setPanel(null);
  };
  const clearDates = () => {
    setStartDate(""); setDeadline("");
    setUseStart(false); setUseDeadline(false);
    setTmpStart(""); setTmpDeadline(""); setPanel(null);
  };

  // ── Member toggle ──────────────────────────────────────────────────────────
  const toggleMember = (userId: string) => {
    const next = assignedUsers.includes(userId)
      ? assignedUsers.filter(id => id !== userId)
      : [...assignedUsers, userId];
    setAssignedUsers(next);
    if (task) saveMembers(task.id, next);
  };

  // ── Checklist ops ──────────────────────────────────────────────────────────
  const addChecklist = () => {
    if (!isEdit) return;
    const g: CLGroup = { id: uid(), name: "Việc cần làm", items: [] };
    const next = [...checklists, g];
    setChecklists(next); saveCL(task!.id, next);
    setRenamingGroupId(g.id); setRenameText(g.name);
    setPanel(null);
  };

  const commitRename = (gid: string) => {
    const trimmed = renameText.trim();
    if (!trimmed || !task) return;
    const next = checklists.map(g => g.id === gid ? { ...g, name: trimmed } : g);
    setChecklists(next); saveCL(task.id, next); setRenamingGroupId(null);
  };

  const deleteChecklist = (gid: string) => {
    if (!task) return;
    const next = checklists.filter(g => g.id !== gid);
    setChecklists(next); saveCL(task.id, next);
  };

  const addItem = (gid: string) => {
    if (!newItemText.trim() || !task) return;
    const next = checklists.map(g =>
      g.id === gid ? { ...g, items: [...g.items, { id: uid(), text: newItemText.trim(), done: false }] } : g
    );
    setChecklists(next); saveCL(task.id, next); setNewItemText("");
    newItemRef.current?.focus();
  };

  const toggleItem = (gid: string, iid: string) => {
    if (!task) return;
    const next = checklists.map(g =>
      g.id === gid ? { ...g, items: g.items.map(it => it.id === iid ? { ...it, done: !it.done } : it) } : g
    );
    setChecklists(next); saveCL(task.id, next);
  };

  const deleteItem = (gid: string, iid: string) => {
    if (!task) return;
    const next = checklists.map(g =>
      g.id === gid ? { ...g, items: g.items.filter(it => it.id !== iid) } : g
    );
    setChecklists(next); saveCL(task.id, next);
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    setPosting(true);
    try {
      const c = await addTaskComment(task.id, { content: newComment.trim() });
      setComments(prev => [...prev, c]); setNewComment("");
    } catch { toast.error("Không thể thêm bình luận"); }
    finally { setPosting(false); }
  };

  const handleDeleteComment = async (cid: number) => {
    if (!task) return;
    try { await deleteTaskComment(task.id, cid); setComments(prev => prev.filter(c => c.id !== cid)); }
    catch { toast.error("Không thể xóa bình luận"); }
  };

  // ── Attachments ────────────────────────────────────────────────────────────
  const handleAddLink = async () => {
    if (!linkUrl.trim() || !task) return;
    try {
      const a = await addTaskAttachmentLink(task.id, { fileUrl: linkUrl.trim(), note: linkNote || undefined });
      setAttachments(prev => [...prev, a]); setLinkUrl(""); setLinkNote(""); setPanel(null);
    } catch { toast.error("Không thể thêm liên kết"); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files?.[0]) return;
    try {
      const a = await uploadTaskAttachmentFile(task.id, e.target.files[0]);
      setAttachments(prev => [...prev, a]);
    } catch { toast.error("Không thể tải lên tệp"); }
    finally { e.target.value = ""; }
  };

  const handleDeleteAttachment = async (aid: number) => {
    if (!task) return;
    try { await deleteTaskAttachment(task.id, aid); setAttachments(prev => prev.filter(a => a.id !== aid)); }
    catch { toast.error("Không thể xóa đính kèm"); }
  };

  // ── Combined feed (newest first) ───────────────────────────────────────────
  const feed: FeedEntry[] = [
    ...comments.map(c => ({
      kind: "comment" as const, id: c.id,
      userName: c.userName, content: c.content, time: c.createdAt,
    })),
    ...activityLogs.map(l => ({
      kind: "activity" as const,
      userName: l.userName,
      action: l.action === "Create" ? "đã tạo thẻ này"
             : l.action === "Delete" ? "đã xóa thẻ này"
             : "đã cập nhật thẻ này",
      time: l.timestamp,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()); // newest first

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentColumn       = columns.find(c => c.id === kanbanColumnId);
  const activePriority      = PRIORITY_LABELS.find(l => l.value === priority);
  const assignedMemberObjs  = assignedUsers
    .map(id => members.find(m => m.userId === id))
    .filter(Boolean) as MemberItem[];
  const unassignedMembers   = members.filter(m => !assignedUsers.includes(m.userId));

  const hasDate = !!(startDate || deadline);

  // ── Shared popover wrapper styles ──────────────────────────────────────────
  const popoverCls = "absolute left-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 w-72";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="!max-w-[1000px] !w-[95vw] max-h-[92vh] overflow-hidden p-0 gap-0 rounded-2xl">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-white shrink-0">
          {currentColumn && (
            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentColumn.color ?? "#6b7280" }} />
              <span className="font-medium">{currentColumn.name}</span>
              <ChevronRight size={12} />
            </div>
          )}
          <span className="flex-1 text-sm font-semibold text-gray-600 truncate">
            {isEdit ? `#${task.id} · ${task.title}` : "Tạo công việc mới"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                title="Xóa thẻ"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            )}            
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex overflow-hidden" style={{ maxHeight: "calc(92vh - 57px)" }}>

          {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-w-0">

            {/* Title */}
            <input
              className="w-full text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none bg-transparent border-none leading-tight"
              placeholder="Tiêu đề công việc..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            {/* ── Action button row + popovers ─────────────────────────────── */}
            <div ref={panelRef} className="relative">
              <div className="flex flex-wrap gap-2">

                {/* + Thêm */}
                <button type="button" onClick={() => togglePanel("add")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    panel === "add"
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent"
                  }`}>
                  <Plus size={13} /> Thêm <ChevronDown size={11} />
                </button>

                {/* Nhãn */}
                <button type="button" onClick={() => togglePanel("label")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    panel === "label"
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent"
                  }`}
                  style={activePriority && panel !== "label" ? { backgroundColor: activePriority.color + "33", color: activePriority.color, border: `1px solid ${activePriority.color}66` } : {}}>
                  <Tag size={13} /> Nhãn
                </button>

                {/* Ngày */}
                <button type="button" onClick={() => togglePanel("date")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    panel === "date"
                      ? "bg-gray-800 text-white border-gray-800"
                      : hasDate
                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent"
                  }`}>
                  <Calendar size={13} />
                  {deadline ? new Date(deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "Ngày"}
                </button>

                {/* Việc cần làm */}
                {isEdit && (
                  <button type="button" onClick={addChecklist}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors border border-transparent">
                    <CheckSquare size={13} /> Việc cần làm
                  </button>
                )}

                {/* Đính kèm */}
                <button type="button" onClick={() => togglePanel("attach")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    panel === "attach"
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent"
                  }`}>
                  <Paperclip size={13} /> Đính kèm
                </button>
              </div>

              {/* ── Popovers ────────────────────────────────────────────────── */}

              {/* + Thêm menu */}
              {panel === "add" && (
                <div className={popoverCls}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Thêm vào thẻ</span>
                    <button type="button" onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="py-2">
                    {[
                      { icon: <Tag size={16} className="text-gray-500" />, p: "label" as Panel, title: "Nhãn", desc: "Sắp xếp, phân loại và ưu tiên" },
                      { icon: <Calendar size={16} className="text-gray-500" />, p: "date" as Panel, title: "Ngày", desc: "Ngày bắt đầu, ngày hết hạn và lời nhắc" },
                      { icon: <CheckSquare size={16} className="text-gray-500" />, p: null, title: "Việc cần làm", desc: "Thêm tác vụ con", action: addChecklist },
                      { icon: <User size={16} className="text-gray-500" />, p: "member" as Panel, title: "Thành viên", desc: "Chỉ định thành viên" },
                      { icon: <Paperclip size={16} className="text-gray-500" />, p: "attach" as Panel, title: "Đính kèm", desc: "Thêm liên kết, trang, hạng mục công việc, v.v." },
                    ].map(item => (
                      <button key={item.title} type="button"
                        onClick={() => item.action ? item.action() : setPanel(item.p)}
                        className="flex items-start gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                        <span className="mt-0.5 shrink-0">{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhãn popover */}
              {panel === "label" && (
                <div className={popoverCls}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Nhãn</span>
                    <button type="button" onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Nhãn</p>
                    <div className="space-y-1.5">
                      {PRIORITY_LABELS.map(l => (
                        <button key={l.value} type="button"
                          onClick={() => { setPriority(l.value); }}
                          className="flex items-center gap-2 w-full group">
                          <div className="flex-1 h-8 rounded-md flex items-center px-3"
                            style={{ backgroundColor: l.color }}>
                            <span className="text-sm font-semibold text-white/90 drop-shadow-sm">{l.label}</span>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            priority === l.value
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-gray-300 group-hover:border-gray-400"
                          }`}>
                            {priority === l.value && <Check size={11} className="text-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ngày popover */}
              {panel === "date" && (
                <div className={popoverCls}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Ngày</span>
                    <button type="button" onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    {/* Start date */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Ngày bắt đầu</label>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={useStart} onChange={e => setUseStart(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300 cursor-pointer" />
                        <input type="date" value={tmpStart} onChange={e => { setTmpStart(e.target.value); setUseStart(true); }}
                          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-40"
                          disabled={!useStart} />
                      </div>
                    </div>

                    {/* Deadline */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Ngày hết hạn</label>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={useDeadline} onChange={e => setUseDeadline(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300 cursor-pointer" />
                        <input type="date" value={tmpDeadline} onChange={e => { setTmpDeadline(e.target.value); setUseDeadline(true); }}
                          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-40"
                          disabled={!useDeadline} />
                        <input type="time" value={tmpTime} onChange={e => setTmpTime(e.target.value)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-40"
                          disabled={!useDeadline} />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={applyDates}
                        className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                        Lưu
                      </button>
                      <button type="button" onClick={clearDates}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                        Gỡ bỏ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Thành viên popover */}
              {panel === "member" && (
                <div className={popoverCls}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Thành viên</span>
                    <button type="button" onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="px-4 pt-3 pb-3">
                    <input
                      type="text"
                      placeholder="Tìm kiếm các thành viên"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-3"
                    />
                    {assignedMemberObjs.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Thành viên của thẻ</p>
                        <div className="space-y-0.5">
                          {assignedMemberObjs.map(m => (
                            <div key={m.userId} className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50">
                              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                {initials(m.fullName ?? m.email ?? "?")}
                              </div>
                              <span className="text-sm text-gray-700 flex-1">{m.fullName ?? m.email}</span>
                              <button type="button" onClick={() => toggleMember(m.userId)}
                                className="text-gray-400 hover:text-gray-600 shrink-0"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {unassignedMembers.filter(m => {
                      if (!memberSearch) return true;
                      const s = memberSearch.toLowerCase();
                      return (m.fullName ?? "").toLowerCase().includes(s) || (m.email ?? "").toLowerCase().includes(s);
                    }).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Thành viên của bảng</p>
                        <div className="space-y-0.5 max-h-40 overflow-y-auto">
                          {unassignedMembers
                            .filter(m => {
                              if (!memberSearch) return true;
                              const s = memberSearch.toLowerCase();
                              return (m.fullName ?? "").toLowerCase().includes(s) || (m.email ?? "").toLowerCase().includes(s);
                            })
                            .map(m => (
                              <button key={m.userId} type="button" onClick={() => toggleMember(m.userId)}
                                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors">
                                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                  {initials(m.fullName ?? m.email ?? "?")}
                                </div>
                                <span className="text-sm text-gray-700">{m.fullName ?? m.email}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Đính kèm popover */}
              {panel === "attach" && (
                <div className={popoverCls}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Đính kèm</span>
                    <button type="button" onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-xs text-gray-500">Đính kèm tệp từ máy tính của bạn.</p>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium">
                      Chọn tệp
                    </button>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-gray-600">
                        Tìm kiếm hoặc dán liên kết <span className="text-red-400">*</span>
                      </p>
                      <input type="url" placeholder="Tìm các liên kết gần đây hoặc dán một đường dẫn..."
                        value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                        className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      <input type="text" placeholder="Văn bản hiển thị (không bắt buộc)"
                        value={linkNote} onChange={e => setLinkNote(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                      <p className="text-[10px] text-gray-400">Cung cấp tiêu đề hoặc mô tả cho liên kết này</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={() => setPanel(null)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Hủy</button>
                      <button type="button" onClick={handleAddLink} disabled={!linkUrl.trim()}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        Chèn
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Member avatars row ────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
              {assignedMemberObjs.map(m => (
                <div key={m.userId}
                  title={m.fullName ?? m.email ?? m.userId}
                  className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-default select-none">
                  {initials(m.fullName ?? m.email ?? "?")}
                </div>
              ))}
              <button type="button" onClick={() => togglePanel("member")}
                title="Thêm thành viên"
                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors shrink-0">
                <Plus size={13} className="text-gray-600" />
              </button>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft size={15} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Mô tả</span>
              </div>
              <textarea rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
                placeholder="Thêm mô tả chi tiết hơn..."
                value={description}
                onChange={e => setDescription(e.target.value)} />
            </div>

            {/* Attachments list */}
            {isEdit && attachments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip size={15} className="text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Các tập tin đính kèm</span>
                  <button type="button" onClick={() => togglePanel("attach")}
                    className="ml-auto text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600">
                    Thêm
                  </button>
                </div>
                <div className="space-y-2">
                  {attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100 group/att">
                      <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-500 uppercase">
                        {a.isLink ? <Link2 size={14} className="text-gray-500" /> : (a.fileName?.split(".").pop() ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={a.fileUrl} target="_blank" rel="noreferrer"
                          className="text-sm text-indigo-600 hover:underline font-medium truncate block">
                          {a.note ?? a.fileName ?? a.fileUrl}
                        </a>
                        <span className="text-xs text-gray-400">Đã thêm {fmtTime(a.uploadedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/att:opacity-100 transition-opacity shrink-0">
                        <a href={a.fileUrl} target="_blank" rel="noreferrer"
                          className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                          <Upload size={13} />
                        </a>
                        <button type="button" onClick={() => handleDeleteAttachment(a.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Multiple Checklists ────────────────────────────────────────── */}
            {isEdit && checklists.map(group => {
              const doneCnt = group.items.filter(it => it.done).length;
              const pct = group.items.length > 0 ? Math.round((doneCnt / group.items.length) * 100) : 0;
              return (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare size={15} className="text-gray-500 shrink-0" />
                    {renamingGroupId === group.id ? (
                      <input autoFocus value={renameText}
                        onChange={e => setRenameText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(group.id); if (e.key === "Escape") setRenamingGroupId(null); }}
                        onBlur={() => commitRename(group.id)}
                        className="flex-1 text-sm font-semibold border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    ) : (
                      <button type="button"
                        onClick={() => { setRenamingGroupId(group.id); setRenameText(group.name); }}
                        className="flex-1 text-left text-sm font-semibold text-gray-700 hover:text-indigo-600 truncate">
                        {group.name}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 shrink-0">{doneCnt}/{group.items.length}</span>
                    <button type="button" onClick={() => deleteChecklist(group.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-0.5 rounded bg-gray-100 hover:bg-red-50 shrink-0 transition-colors">
                      Xóa
                    </button>
                  </div>

                  {group.items.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5 mb-2">
                    {group.items.map(item => (
                      <div key={item.id} className="group/item flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50">
                        <button type="button" onClick={() => toggleItem(group.id, item.id)} className="shrink-0">
                          {item.done ? <CheckSquare size={16} className="text-indigo-500" /> : <Square size={16} className="text-gray-300 hover:text-gray-400" />}
                        </button>
                        <span className={`flex-1 text-sm leading-relaxed ${item.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {item.text}
                        </span>
                        <button type="button" onClick={() => deleteItem(group.id, item.id)}
                          className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {addingGroupId === group.id ? (
                    <div className="flex items-center gap-2 border border-indigo-200 rounded-lg px-3 py-2 bg-white mb-1">
                      <Plus size={13} className="text-gray-300 shrink-0" />
                      <input ref={newItemRef} type="text" placeholder="Thêm một mục..."
                        value={newItemText} onChange={e => setNewItemText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(group.id); } if (e.key === "Escape") { setAddingGroupId(null); setNewItemText(""); } }}
                        className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none bg-transparent" />
                      {newItemText && (
                        <button type="button" onClick={() => addItem(group.id)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium shrink-0">Thêm</button>
                      )}
                      <button type="button" onClick={() => { setAddingGroupId(null); setNewItemText(""); }}
                        className="text-gray-300 hover:text-gray-500 shrink-0"><X size={13} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setAddingGroupId(group.id); setNewItemText(""); }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                      <Plus size={12} /> Thêm một mục
                    </button>
                  )}
                </div>
              );
            })}

            {/* Bottom action bar */}
            <div className="flex items-center justify-end pt-2 border-t border-gray-100">
              <div className="flex gap-2">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60">
                  {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo thẻ"}
                </button>
              </div>
            </div>
          </div>

          {/* ══ RIGHT PANEL — Combined feed (newest first) ════════════════════ */}
          {isEdit && (
            <div className="shrink-0 border-l border-gray-100 flex flex-col bg-gray-50/40 overflow-hidden" style={{ width: "280px" }}>

              <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <MessageSquare size={14} /> Nhận xét và hoạt động
                </span>
                <button type="button" onClick={() => setShowDetail(v => !v)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors">
                  {showDetail ? <EyeOff size={11} /> : <Eye size={11} />}
                  {showDetail ? "Ẩn chi tiết" : "Hiện chi tiết"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
                {feed.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Chưa có hoạt động</p>
                )}
                {feed.map((entry, i) => {
                  if (entry.kind === "activity") {
                    if (!showDetail) return null;
                    return (
                      <div key={`act-${i}`} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500 shrink-0 mt-0.5">
                          {initials(entry.userName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600 leading-snug">
                            <span className="font-semibold text-gray-700">{entry.userName}</span>{" "}{entry.action}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{fmtRelative(entry.time)}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={`cmt-${entry.id}`} className="group/comment">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                          {initials(entry.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-semibold text-gray-700">{entry.userName}</span>
                            <span className="text-[9px] text-gray-400">{fmtRelative(entry.time)}</span>
                          </div>
                          {editCmtId === entry.id ? (
                            <div className="mt-1">
                              <textarea value={editCmtText} onChange={e => setEditCmtText(e.target.value)} rows={2}
                                className="w-full border border-indigo-300 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                              <div className="flex gap-1 mt-1">
                                <button type="button" onClick={async () => {
                                  const updated = await updateTaskComment(task!.id, entry.id, editCmtText);
                                  setComments(prev => prev.map(x => x.id === entry.id ? updated : x));
                                  setEditCmtId(null);
                                }} className="text-[10px] text-indigo-600 font-medium">Lưu</button>
                                <button type="button" onClick={() => setEditCmtId(null)} className="text-[10px] text-gray-400">Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 mt-1 shadow-sm">
                              <p className="text-xs text-gray-600 break-words">{entry.content}</p>
                            </div>
                          )}
                          {editCmtId !== entry.id && (
                            <div className="flex gap-2 mt-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                              <button type="button"
                                onClick={() => { setEditCmtId(entry.id); setEditCmtText(entry.content); }}
                                className="text-[10px] text-gray-400 hover:text-gray-600">Chỉnh sửa</button>
                              <span className="text-[10px] text-gray-200">·</span>
                              <button type="button" onClick={() => handleDeleteComment(entry.id)}
                                className="text-[10px] text-gray-400 hover:text-red-500">Xoá</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 pb-4 pt-2 border-t border-gray-100 shrink-0">
                <textarea rows={2} value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Viết bình luận..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                {newComment.trim() && (
                  <div className="flex justify-end mt-1.5">
                    <button type="button" onClick={handleAddComment} disabled={posting}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                      {posting ? "..." : "Lưu"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
