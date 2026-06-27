import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
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
  getAuditLogs, getTaskAssignees, assignTask, unassignTask,
} from "../../services/operationsApi";
import type {
  TaskItem, TaskCommentItem, TaskAttachmentItem, AuditLogItem,
  CreateTaskDto, TaskPriority, KanbanColumnItem,
} from "../../services/operations.types";
import { getClubMembers } from "../../../membership/services/clubApi";
import type { MemberItem } from "../../../membership/services/club.types";
import { useAuth } from "@/contexts/AuthContext";
import { CLUB_ROLES } from "@/types/auth";
import { D } from '@/components/shared/managementTheme'

/* ── Design tokens ─────────────────────────────────────────────────────────── */

/* ── Interfaces ──────────────────────────────────────────────────────────────── */

interface Props {
  clubId: number;
  task: TaskItem | null;
  open: boolean;
  defaultColumnId?: number;
  defaultSprintId?: number;
  departmentId?: number;
  columns: KanbanColumnItem[];
  onClose: () => void;
  onSaved: () => void;
}

/* ── Priority config ─────────────────────────────────────────────────────────── */

const PRIORITY_LABELS: { value: TaskPriority; color: string; label: string }[] = [
  { value: "Low",    color: "#10b981", label: "Thấp"       },
  { value: "Medium", color: "#f59e0b", label: "Trung bình" },
  { value: "High",   color: "#ef4444", label: "Cao"        },
]

/* ── Checklist ─────────────────────────────────────────────────────────────── */

interface CLItem  { id: string; text: string; done: boolean }
interface CLGroup { id: string; name: string; items: CLItem[] }
const CL_KEY = (tid: number) => `task_cl_${tid}`
const loadCL = (tid: number): CLGroup[] => {
  try { const r = localStorage.getItem(CL_KEY(tid)); if (r) return JSON.parse(r) } catch {}
  return []
}
const saveCL = (tid: number, gs: CLGroup[]) => {
  try { localStorage.setItem(CL_KEY(tid), JSON.stringify(gs)) } catch {}
}
const uid = () => Math.random().toString(36).slice(2, 9)

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "vừa xong"
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })
}

const initials = (name: string) =>
  name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

/* ── Types ─────────────────────────────────────────────────────────────────── */

type FeedEntry =
  | { kind: "comment";  id: number; userName: string; content: string; time: string }
  | { kind: "activity"; userName: string; action: string; time: string }

type Panel = "add" | "label" | "date" | "member" | "attach" | null

/* ── Shared styles ─────────────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #dce6f4',
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4,
}

const actionBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', border: D.border,
  background: active ? D.ink : D.bg,
  color: active ? '#fff' : D.inkDim,
  boxShadow: active ? 'none' : D.shadow(2, 2),
  transition: 'background .1s, color .1s',
})

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function TaskDetailModal({
  clubId, task, open, defaultColumnId, defaultSprintId, departmentId, columns, onClose, onSaved,
}: Props) {
  const { getClubRole } = useAuth()
  const role = getClubRole(clubId)
  const isAdmin = role === CLUB_ROLES.CLUB_ADMIN
  const canManageAssignees = isAdmin || role === CLUB_ROLES.DEPT_LEAD
  const isEdit = !!task

  const MAX_FILES = 5
  const ALLOWED_EXTS = '.xlsx,.xls,.docx,.doc,.pdf,.rar,.zip,.jpg,.jpeg,.png,.gif,.webp'

  // Form fields
  const [title,          setTitle]         = useState("")
  const [description,    setDescription]   = useState("")
  const [priority,       setPriority]      = useState<TaskPriority>("Medium")
  const [startDate,      setStartDate]     = useState("")
  const [deadline,       setDeadline]      = useState("")
  const [assignedUsers,  setAssignedUsers] = useState<string[]>([])
  const [kanbanColumnId, setKanbanColumnId]= useState<number | undefined>()
  const [sprintId,       setSprintId]      = useState<number | undefined>()
  const [saving,         setSaving]        = useState(false)
  const [deleting,       setDeleting]      = useState(false)

  const [panel, setPanel] = useState<Panel>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [useStart,    setUseStart]    = useState(false)
  const [useDeadline, setUseDeadline] = useState(false)
  const [tmpStart,    setTmpStart]    = useState("")
  const [tmpDeadline, setTmpDeadline] = useState("")
  const [tmpTime,     setTmpTime]     = useState("23:59")

  const [checklists,      setChecklists]      = useState<CLGroup[]>([])
  const [addingGroupId,   setAddingGroupId]   = useState<string | null>(null)
  const [newItemText,     setNewItemText]     = useState("")
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameText,      setRenameText]      = useState("")
  const newItemRef = useRef<HTMLInputElement>(null)

  const [comments,     setComments]     = useState<TaskCommentItem[]>([])
  const [activityLogs, setActivityLogs] = useState<AuditLogItem[]>([])
  const [newComment,   setNewComment]   = useState("")
  const [posting,      setPosting]      = useState(false)
  const [editCmtId,    setEditCmtId]    = useState<number | null>(null)
  const [editCmtText,  setEditCmtText]  = useState("")
  const [showDetail,   setShowDetail]   = useState(false)

  const [attachments,   setAttachments]   = useState<TaskAttachmentItem[]>([])
  const [pendingFiles,  setPendingFiles]  = useState<File[]>([])
  const [linkUrl,       setLinkUrl]       = useState("")
  const [linkNote,      setLinkNote]      = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const [members,      setMembers]      = useState<MemberItem[]>([])
  const [memberSearch, setMemberSearch] = useState("")

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setPanel(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const togglePanel = useCallback((p: Panel) =>
    setPanel(prev => prev === p ? null : p), [])

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    getClubMembers(clubId, { departmentId, status: "Active" }).then(setMembers).catch(() => {
      toast.error("Không thể tải danh sách thành viên")
    })
  }, [open, clubId, departmentId])

  useEffect(() => {
    if (open && task) {
      getTaskAssignees(task.id)
        .then(list => setAssignedUsers(list.map(a => a.userId)))
        .catch(() => {})
    }
  }, [task?.id, open])

  useEffect(() => {
    if (open && task) {
      getTaskComments(task.id).then(setComments).catch(() => {})
      getTaskAttachments(task.id).then(setAttachments).catch(() => {})
      getAuditLogs({ clubId: task.clubId, module: "Tasks", pageSize: 50 })
        .then(r => setActivityLogs(r.items.filter(l => l.entityId === String(task.id))))
        .catch(() => {})
      setChecklists(loadCL(task.id))
    } else {
      setComments([]); setAttachments([]); setActivityLogs([]); setChecklists([]); setPendingFiles([])
    }
  }, [task, open, clubId])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      setPriority(task.priority)
      const sd = task.startDate ? task.startDate.slice(0, 10) : ""
      const dl = task.deadline  ? task.deadline.slice(0, 10)  : ""
      setStartDate(sd); setTmpStart(sd); setUseStart(!!sd)
      setDeadline(dl);  setTmpDeadline(dl); setUseDeadline(!!dl)
      setAssignedUsers(task ? (task.assignedTo ? [task.assignedTo] : []) : [])
      setKanbanColumnId(task.kanbanColumnId ?? defaultColumnId)
      setSprintId(task.sprintId)
    } else {
      setTitle(""); setDescription(""); setPriority("Medium")
      setStartDate(""); setDeadline(""); setAssignedUsers([])
      setUseStart(false); setUseDeadline(false)
      setTmpStart(""); setTmpDeadline(""); setTmpTime("23:59")
      setKanbanColumnId(defaultColumnId)
      setSprintId(defaultSprintId)
    }
  }, [task, open, defaultColumnId, defaultSprintId])

  useEffect(() => {
    if (addingGroupId) newItemRef.current?.focus()
  }, [addingGroupId])

  // ── Save / Delete ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error("Tiêu đề không được để trống"); return }
    setSaving(true)
    try {
      const dto: CreateTaskDto = {
        title: title.trim(), description: description || undefined, priority,
        startDate: startDate || undefined, deadline: deadline || undefined,
        assignedTo: assignedUsers[0] || undefined, kanbanColumnId,
        departmentId: task?.departmentId ?? departmentId,
        sprintId: isEdit ? (task?.sprintId ?? undefined) : sprintId,
      }
      if (isEdit) {
        await updateTask(task.id, dto)
        toast.success("Đã cập nhật công việc")
      } else {
        const created = await createTask(clubId, dto)
        if (pendingFiles.length > 0) {
          const failed: string[] = []
          for (const f of pendingFiles) {
            try { await uploadTaskAttachmentFile(created.id, f) }
            catch { failed.push(f.name) }
          }
          if (failed.length > 0) toast.error(`Lỗi khi tải lên: ${failed.join(', ')}`)
        }
        toast.success("Đã tạo công việc")
      }
      onSaved(); onClose()
    } catch { toast.error("Có lỗi xảy ra") }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!task || !window.confirm("Xóa công việc này?")) return
    setDeleting(true)
    try { await deleteTask(task.id); toast.success("Đã xóa"); onSaved(); onClose() }
    catch { toast.error("Không thể xóa") }
    finally { setDeleting(false) }
  }

  // ── Date panel ─────────────────────────────────────────────────────────────
  const applyDates = () => {
    setStartDate(useStart ? tmpStart : "")
    setDeadline(useDeadline ? tmpDeadline : "")
    setPanel(null)
  }
  const clearDates = () => {
    setStartDate(""); setDeadline("")
    setUseStart(false); setUseDeadline(false)
    setTmpStart(""); setTmpDeadline(""); setPanel(null)
  }

  // ── Member toggle ──────────────────────────────────────────────────────────
  const toggleMember = async (userId: string) => {
    const isAssigned = assignedUsers.includes(userId)
    if (!task) {
      setAssignedUsers(prev => isAssigned ? prev.filter(id => id !== userId) : [...prev, userId])
      return
    }
    try {
      if (isAssigned) {
        await unassignTask(task.id, userId)
        setAssignedUsers(prev => prev.filter(id => id !== userId))
      } else {
        await assignTask(task.id, { userId })
        setAssignedUsers(prev => [...prev, userId])
      }
    } catch { toast.error("Không thể cập nhật thành viên") }
  }

  // ── Checklist ops ──────────────────────────────────────────────────────────
  const addChecklist = () => {
    if (!isEdit) return
    const g: CLGroup = { id: uid(), name: "Việc cần làm", items: [] }
    const next = [...checklists, g]
    setChecklists(next); saveCL(task!.id, next)
    setRenamingGroupId(g.id); setRenameText(g.name)
    setPanel(null)
  }

  const commitRename = (gid: string) => {
    const trimmed = renameText.trim()
    if (!trimmed || !task) return
    const next = checklists.map(g => g.id === gid ? { ...g, name: trimmed } : g)
    setChecklists(next); saveCL(task.id, next); setRenamingGroupId(null)
  }

  const deleteChecklist = (gid: string) => {
    if (!task) return
    const next = checklists.filter(g => g.id !== gid)
    setChecklists(next); saveCL(task.id, next)
  }

  const addItem = (gid: string) => {
    if (!newItemText.trim() || !task) return
    const next = checklists.map(g =>
      g.id === gid ? { ...g, items: [...g.items, { id: uid(), text: newItemText.trim(), done: false }] } : g
    )
    setChecklists(next); saveCL(task.id, next); setNewItemText("")
    newItemRef.current?.focus()
  }

  const toggleItem = (gid: string, iid: string) => {
    if (!task) return
    const next = checklists.map(g =>
      g.id === gid ? { ...g, items: g.items.map(it => it.id === iid ? { ...it, done: !it.done } : it) } : g
    )
    setChecklists(next); saveCL(task.id, next)
  }

  const deleteItem = (gid: string, iid: string) => {
    if (!task) return
    const next = checklists.map(g =>
      g.id === gid ? { ...g, items: g.items.filter(it => it.id !== iid) } : g
    )
    setChecklists(next); saveCL(task.id, next)
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return
    setPosting(true)
    try {
      const c = await addTaskComment(task.id, { content: newComment.trim() })
      setComments(prev => [...prev, c]); setNewComment("")
    } catch { toast.error("Không thể thêm bình luận") }
    finally { setPosting(false) }
  }

  const handleDeleteComment = async (cid: number) => {
    if (!task) return
    try { await deleteTaskComment(task.id, cid); setComments(prev => prev.filter(c => c.id !== cid)) }
    catch { toast.error("Không thể xóa bình luận") }
  }

  // ── Attachments ────────────────────────────────────────────────────────────
  const handleAddLink = async () => {
    if (!linkUrl.trim() || !task) return
    try {
      const a = await addTaskAttachmentLink(task.id, { fileUrl: linkUrl.trim(), note: linkNote || undefined })
      setAttachments(prev => [...prev, a]); setLinkUrl(""); setLinkNote(""); setPanel(null)
    } catch { toast.error("Không thể thêm liên kết") }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (!isEdit) {
      if (pendingFiles.length >= MAX_FILES) {
        toast.error(`Tối đa ${MAX_FILES} tệp đính kèm`)
        return
      }
      setPendingFiles(prev => [...prev, file])
      return
    }

    if (attachments.length >= MAX_FILES) {
      toast.error(`Tối đa ${MAX_FILES} tệp đính kèm`)
      return
    }
    try {
      const a = await uploadTaskAttachmentFile(task!.id, file)
      setAttachments(prev => [...prev, a])
    } catch { toast.error("Không thể tải lên tệp") }
  }

  const handleDeleteAttachment = async (aid: number) => {
    if (!task) return
    try { await deleteTaskAttachment(task.id, aid); setAttachments(prev => prev.filter(a => a.id !== aid)) }
    catch { toast.error("Không thể xóa đính kèm") }
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
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
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentColumn      = columns.find(c => c.id === kanbanColumnId)
  const activePriority     = PRIORITY_LABELS.find(l => l.value === priority)
  const assignedMemberObjs = assignedUsers
    .map(id => members.find(m => m.userId === id))
    .filter(Boolean) as MemberItem[]
  const unassignedMembers  = members.filter(m => !assignedUsers.includes(m.userId))
  const hasDate = !!(startDate || deadline)

  // ── Popover wrapper style ──────────────────────────────────────────────────
  const popoverStyle: React.CSSProperties = {
    position: 'absolute', left: 0, top: '100%', marginTop: 4,
    background: D.card, border: D.border, borderRadius: D.radius,
    boxShadow: D.shadow(4, 4), zIndex: 50, width: 288,
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        style={{ maxWidth: 1000, width: '95vw', maxHeight: '92vh', overflow: 'hidden', padding: 0, gap: 0, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(8, 8), fontFamily: "'Be Vietnam Pro', sans-serif", display: 'flex', flexDirection: 'column' }}
        className="!max-w-[1000px] !w-[95vw]"
      >

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: D.borderLight, background: D.bg, flexShrink: 0 }}>
          {currentColumn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted, flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block', background: currentColumn.color ?? '#6b7280' }} />
              <span style={{ fontWeight: 600 }}>{currentColumn.name}</span>
              <ChevronRight size={12} />
            </div>
          )}
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: D.inkDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isEdit ? `#${task.id} · ${task.title}` : "Tạo công việc mới"}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                title="Xóa thẻ"
                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: D.inkMuted, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = D.red; (e.currentTarget as HTMLElement).style.background = '#fee2e2' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = D.inkMuted; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', overflow: 'hidden', flex: 1, minHeight: 0 }}>

          {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>

            {/* Title */}
            <input
              style={{
                width: '100%', fontSize: 20, fontWeight: 900, color: D.ink,
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.3,
              }}
              placeholder="Tiêu đề công việc..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            {/* ── Action button row + popovers ─────────────────────────────── */}
            <div ref={panelRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>

                {/* + Thêm */}
                <button type="button" onClick={() => togglePanel("add")}
                  style={actionBtnStyle(panel === "add")}>
                  <Plus size={13} /> Thêm <ChevronDown size={11} />
                </button>

                {/* Nhãn */}
                <button type="button" onClick={() => togglePanel("label")}
                  style={panel === "label"
                    ? actionBtnStyle(true)
                    : activePriority
                      ? { ...actionBtnStyle(false), background: activePriority.color + '22', color: activePriority.color, border: `1.5px solid ${activePriority.color}66` }
                      : actionBtnStyle(false)
                  }>
                  <Tag size={13} /> Nhãn
                </button>

                {/* Ngày */}
                <button type="button" onClick={() => togglePanel("date")}
                  style={panel === "date"
                    ? actionBtnStyle(true)
                    : hasDate
                      ? { ...actionBtnStyle(false), background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d' }
                      : actionBtnStyle(false)
                  }>
                  <Calendar size={13} />
                  {deadline ? new Date(deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "Ngày"}
                </button>

                {/* Việc cần làm */}
                {isEdit && (
                  <button type="button" onClick={addChecklist} style={actionBtnStyle(false)}>
                    <CheckSquare size={13} /> Việc cần làm
                  </button>
                )}

                {/* Đính kèm */}
                <button type="button" onClick={() => togglePanel("attach")} style={actionBtnStyle(panel === "attach")}>
                  <Paperclip size={13} /> Đính kèm
                </button>
              </div>

              {/* ── Popovers ────────────────────────────────────────────────── */}

              {/* + Thêm menu */}
              {panel === "add" && (
                <div style={popoverStyle}>
                  <div style={{ padding: '12px 16px', borderBottom: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>Thêm vào thẻ</span>
                    <button type="button" onClick={() => setPanel(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ padding: '6px 0' }}>
                    {[
                      { icon: <Tag size={15} style={{ color: D.inkDim }} />, p: "label" as Panel, title: "Nhãn", desc: "Sắp xếp, phân loại và ưu tiên" },
                      { icon: <Calendar size={15} style={{ color: D.inkDim }} />, p: "date" as Panel, title: "Ngày", desc: "Ngày bắt đầu, ngày hết hạn và lời nhắc" },
                      { icon: <CheckSquare size={15} style={{ color: D.inkDim }} />, p: null, title: "Việc cần làm", desc: "Thêm tác vụ con", action: addChecklist },
                      ...(canManageAssignees ? [{ icon: <User size={15} style={{ color: D.inkDim }} />, p: "member" as Panel, title: "Thành viên", desc: "Chỉ định thành viên" }] : []),
                      { icon: <Paperclip size={15} style={{ color: D.inkDim }} />, p: "attach" as Panel, title: "Đính kèm", desc: "Thêm liên kết, trang, hạng mục công việc, v.v." },
                    ].map(item => (
                      <button key={item.title} type="button"
                        onClick={() => item.action ? item.action() : setPanel(item.p)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '10px 16px', fontSize: 13, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: D.ink, fontFamily: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.bg}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                      >
                        <span style={{ marginTop: 2, flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{item.title}</p>
                          <p style={{ fontSize: 11, color: D.inkMuted, margin: '1px 0 0' }}>{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhãn popover */}
              {panel === "label" && (
                <div style={popoverStyle}>
                  <div style={{ padding: '12px 16px', borderBottom: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>Nhãn</span>
                    <button type="button" onClick={() => setPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 4 }}><X size={14} /></button>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 10px' }}>Nhãn</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {PRIORITY_LABELS.map(l => (
                        <button key={l.value} type="button" onClick={() => setPriority(l.value)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <div style={{ flex: 1, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 12, background: l.color, border: D.border }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{l.label}</span>
                          </div>
                          <div style={{
                            width: 20, height: 20, borderRadius: 4, border: D.border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            background: priority === l.value ? D.indigo : 'transparent',
                          }}>
                            {priority === l.value && <Check size={11} style={{ color: '#fff' }} />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ngày popover */}
              {panel === "date" && (
                <div style={popoverStyle}>
                  <div style={{ padding: '12px 16px', borderBottom: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>Ngày</span>
                    <button type="button" onClick={() => setPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 4 }}><X size={14} /></button>
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Ngày bắt đầu</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={useStart} onChange={e => setUseStart(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <input type="date" value={tmpStart} onChange={e => { setTmpStart(e.target.value); setUseStart(true) }}
                          disabled={!useStart}
                          style={{ ...inputStyle, flex: 1, opacity: useStart ? 1 : 0.4 }} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Ngày hết hạn</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={useDeadline} onChange={e => setUseDeadline(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <input type="date" value={tmpDeadline} onChange={e => { setTmpDeadline(e.target.value); setUseDeadline(true) }}
                          disabled={!useDeadline}
                          style={{ ...inputStyle, flex: 1, opacity: useDeadline ? 1 : 0.4 }} />
                        <input type="time" value={tmpTime} onChange={e => setTmpTime(e.target.value)}
                          disabled={!useDeadline}
                          style={{ ...inputStyle, width: 80, opacity: useDeadline ? 1 : 0.4 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <button type="button" onClick={applyDates}
                        style={{ flex: 1, padding: '8px 0', background: D.indigo, color: '#fff', border: D.border, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Lưu
                      </button>
                      <button type="button" onClick={clearDates}
                        style={{ flex: 1, padding: '8px 0', background: D.bg, color: D.inkDim, border: D.border, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Gỡ bỏ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Thành viên popover */}
              {panel === "member" && (
                <div style={popoverStyle}>
                  <div style={{ padding: '12px 16px', borderBottom: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>Thành viên</span>
                    <button type="button" onClick={() => setPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 4 }}><X size={14} /></button>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <input
                      type="text"
                      placeholder="Tìm kiếm các thành viên"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      style={{ ...inputStyle, marginBottom: 12 }}
                    />
                    {assignedMemberObjs.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>Thành viên của thẻ</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {assignedMemberObjs.map(m => (
                            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: D.bg, border: D.borderLight }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {initials(m.fullName ?? m.email ?? "?")}
                              </div>
                              <span style={{ fontSize: 13, color: D.ink, flex: 1, fontWeight: 600 }}>{m.fullName ?? m.email}</span>
                              {canManageAssignees && (
                                <button type="button" onClick={() => toggleMember(m.userId)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 2, flexShrink: 0 }}>
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {canManageAssignees && unassignedMembers.filter(m => {
                      if (!memberSearch) return true
                      const s = memberSearch.toLowerCase()
                      return (m.fullName ?? "").toLowerCase().includes(s) || (m.email ?? "").toLowerCase().includes(s)
                    }).length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>Thêm thành viên</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                          {unassignedMembers
                            .filter(m => {
                              if (!memberSearch) return true
                              const s = memberSearch.toLowerCase()
                              return (m.fullName ?? "").toLowerCase().includes(s) || (m.email ?? "").toLowerCase().includes(s)
                            })
                            .map(m => (
                              <button key={m.userId} type="button" onClick={() => toggleMember(m.userId)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.bg}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                              >
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                  {initials(m.fullName ?? m.email ?? "?")}
                                </div>
                                <span style={{ fontSize: 13, color: D.ink }}>{m.fullName ?? m.email}</span>
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
                <div style={popoverStyle}>
                  <div style={{ padding: '12px 16px', borderBottom: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>Đính kèm</span>
                    <button type="button" onClick={() => setPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 4 }}><X size={14} /></button>
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* File upload — admin only */}
                    {isAdmin ? (
                      <>
                        <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>
                          Excel, Word, PDF, RAR, ZIP, ảnh · Tối đa {MAX_FILES} tệp
                        </p>
                        {(() => {
                          const currentCount = isEdit ? attachments.length : pendingFiles.length
                          const atLimit = currentCount >= MAX_FILES
                          return (
                            <button type="button"
                              disabled={atLimit}
                              onClick={() => !atLimit && fileRef.current?.click()}
                              style={{ padding: '8px', border: D.borderLight, borderRadius: 8, fontSize: 12, color: atLimit ? D.inkMuted : D.inkDim, background: D.bg, cursor: atLimit ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: atLimit ? 0.5 : 1 }}>
                              Chọn tệp ({currentCount}/{MAX_FILES})
                            </button>
                          )
                        })()}
                        <input ref={fileRef} type="file" style={{ display: 'none' }}
                          accept={ALLOWED_EXTS} onChange={handleFileUpload} />
                        {/* Pending files (create mode) */}
                        {!isEdit && pendingFiles.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {pendingFiles.map((f, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: D.bg, borderRadius: 6, border: D.borderLight }}>
                                <Paperclip size={11} style={{ color: D.inkMuted, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                <button type="button"
                                  onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 2 }}>
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Chỉ Admin CLB mới được tải lên tệp đính kèm.</p>
                    )}
                    {/* Link section — edit mode only */}
                    {isEdit && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: D.inkDim, margin: 0 }}>
                            Tìm kiếm hoặc dán liên kết <span style={{ color: D.red }}>*</span>
                          </p>
                          <input type="url" placeholder="Tìm các liên kết gần đây hoặc dán một đường dẫn..."
                            value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                            style={{ ...inputStyle }} />
                          <input type="text" placeholder="Văn bản hiển thị (không bắt buộc)"
                            value={linkNote} onChange={e => setLinkNote(e.target.value)}
                            style={{ ...inputStyle }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button type="button" onClick={() => setPanel(null)}
                            style={{ padding: '7px 14px', fontSize: 12, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Hủy
                          </button>
                          <button type="button" onClick={handleAddLink} disabled={!linkUrl.trim()}
                            style={{ padding: '7px 14px', background: D.indigo, color: '#fff', border: D.border, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: linkUrl.trim() ? 'pointer' : 'not-allowed', opacity: linkUrl.trim() ? 1 : 0.5, fontFamily: 'inherit' }}>
                            Chèn
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Member avatars ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {assignedMemberObjs.map(m => (
                <div key={m.userId}
                  title={m.fullName ?? m.email ?? m.userId}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0, cursor: 'default', border: D.border }}>
                  {initials(m.fullName ?? m.email ?? "?")}
                </div>
              ))}
              {canManageAssignees && (
                <button type="button" onClick={() => togglePanel("member")} title="Thêm thành viên"
                  style={{ width: 28, height: 28, borderRadius: '50%', background: D.bg, border: D.border, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Plus size={13} style={{ color: D.inkDim }} />
                </button>
              )}
            </div>

            {/* ── Event badge ────────────────────────────────────────────────── */}
            {isEdit && task?.eventId && (
              <Link
                to={`/clubs/${clubId}/events/${task.eventId}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, color: D.indigo,
                  background: '#ede9fe', border: `1.5px solid ${D.indigo}55`,
                  borderRadius: D.pill, padding: '4px 12px',
                  textDecoration: 'none', width: 'fit-content',
                  boxShadow: '1px 1px 0 #1d4ed844',
                }}
              >
                <Calendar size={11} />
                {task.eventName ?? `Sự kiện #${task.eventId}`}
              </Link>
            )}

            {/* Description */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlignLeft size={14} style={{ color: D.inkMuted }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: D.inkDim }}>Mô tả</span>
              </div>
              <textarea rows={4}
                style={{
                  width: '100%', border: D.borderLight, borderRadius: 10, padding: '10px 12px',
                  fontSize: 13, color: D.ink, resize: 'none', outline: 'none',
                  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                placeholder="Thêm mô tả chi tiết hơn..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                onFocus={e => (e.currentTarget.style.border = D.border)}
                onBlur={e => (e.currentTarget.style.border = D.borderLight)}
              />
            </div>

            {/* Attachments list — edit mode */}
            {isEdit && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Paperclip size={14} style={{ color: D.inkMuted }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: D.inkDim }}>
                    Tệp đính kèm ({attachments.length}/{MAX_FILES})
                  </span>
                  {isAdmin && attachments.length < MAX_FILES && (
                    <button type="button" onClick={() => togglePanel("attach")}
                      style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', background: D.bg, border: D.borderLight, borderRadius: D.pill, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Thêm
                    </button>
                  )}
                </div>
                {attachments.length === 0 ? (
                  <div style={{ padding: '14px 0', textAlign: 'center', border: '1.5px dashed #d1cfc9', borderRadius: 8, color: D.inkMuted, fontSize: 12 }}>
                    {isAdmin ? 'Chưa có tệp đính kèm — nhấn "+ Thêm" để tải lên.' : 'Chưa có tệp đính kèm.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {attachments.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: D.bg, borderRadius: 8, border: D.borderLight }}>
                        <div style={{ width: 40, height: 32, background: '#e8e3d6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase' }}>
                          {a.isLink ? <Link2 size={13} style={{ color: D.inkMuted }} /> : (a.fileName?.split(".").pop() ?? "?")}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a href={a.fileUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 13, color: D.indigo, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                            {a.fileName ?? a.note ?? a.fileUrl}
                          </a>
                          <span style={{ fontSize: 11, color: D.inkMuted }}>Đã thêm {fmtTime(a.uploadedAt)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <a href={a.fileUrl} target="_blank" rel="noreferrer"
                            style={{ padding: 4, borderRadius: 4, color: D.inkMuted, display: 'flex', textDecoration: 'none' }}>
                            <Upload size={12} />
                          </a>
                          {isAdmin && (
                            <button type="button" onClick={() => handleDeleteAttachment(a.id)}
                              style={{ padding: 4, borderRadius: 4, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = D.red }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = D.inkMuted }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending files — create mode only, admin only */}
            {!isEdit && isAdmin && pendingFiles.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Paperclip size={14} style={{ color: D.inkMuted }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: D.inkDim }}>
                    Tệp đính kèm ({pendingFiles.length}/{MAX_FILES})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: D.bg, borderRadius: 8, border: D.borderLight }}>
                      <div style={{ width: 40, height: 32, background: '#e8e3d6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase' }}>
                        {f.name.split('.').pop()?.slice(0, 4) ?? '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: D.ink, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </span>
                        <span style={{ fontSize: 11, color: D.inkMuted }}>{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button type="button"
                        onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ padding: 4, borderRadius: 4, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = D.red }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = D.inkMuted }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Checklists ─────────────────────────────────────────────────── */}
            {isEdit && checklists.map(group => {
              const doneCnt = group.items.filter(it => it.done).length
              const pct = group.items.length > 0 ? Math.round((doneCnt / group.items.length) * 100) : 0
              return (
                <div key={group.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CheckSquare size={14} style={{ color: D.inkMuted, flexShrink: 0 }} />
                    {renamingGroupId === group.id ? (
                      <input autoFocus value={renameText}
                        onChange={e => setRenameText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(group.id); if (e.key === "Escape") setRenamingGroupId(null) }}
                        onBlur={() => commitRename(group.id)}
                        style={{ ...inputStyle, flex: 1, height: 30, fontSize: 13, fontWeight: 700 }} />
                    ) : (
                      <button type="button"
                        onClick={() => { setRenamingGroupId(group.id); setRenameText(group.name) }}
                        style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: D.ink, background: 'none', border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'inherit' }}>
                        {group.name}
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: D.inkMuted, flexShrink: 0 }}>{doneCnt}/{group.items.length}</span>
                    <button type="button" onClick={() => deleteChecklist(group.id)}
                      style={{ fontSize: 11, color: D.inkMuted, background: D.bg, border: D.borderLight, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                      Xóa
                    </button>
                  </div>

                  {group.items.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: D.inkMuted, width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                      <div style={{ flex: 1, height: 6, background: '#dce6f4', borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: pct === 100 ? D.emerald : D.indigo, width: `${pct}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                    {group.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.bg}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <button type="button" onClick={() => toggleItem(group.id, item.id)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                          {item.done
                            ? <CheckSquare size={16} style={{ color: D.indigo }} />
                            : <Square size={16} style={{ color: D.inkMuted }} />
                          }
                        </button>
                        <span style={{ flex: 1, fontSize: 13, color: item.done ? D.inkMuted : D.ink, textDecoration: item.done ? 'line-through' : 'none' }}>
                          {item.text}
                        </span>
                        <button type="button" onClick={() => deleteItem(group.id, item.id)}
                          style={{ padding: 2, borderRadius: 3, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0, transition: 'opacity .1s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = D.red }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; (e.currentTarget as HTMLElement).style.color = D.inkMuted }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {addingGroupId === group.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: D.border, borderRadius: 8, padding: '6px 12px', background: D.card, marginBottom: 4 }}>
                      <Plus size={12} style={{ color: D.inkMuted, flexShrink: 0 }} />
                      <input ref={newItemRef} type="text" placeholder="Thêm một mục..."
                        value={newItemText} onChange={e => setNewItemText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(group.id) } if (e.key === "Escape") { setAddingGroupId(null); setNewItemText("") } }}
                        style={{ flex: 1, fontSize: 13, color: D.ink, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }} />
                      {newItemText && (
                        <button type="button" onClick={() => addItem(group.id)}
                          style={{ fontSize: 11, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                          Thêm
                        </button>
                      )}
                      <button type="button" onClick={() => { setAddingGroupId(null); setNewItemText("") }}
                        style={{ color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setAddingGroupId(group.id); setNewItemText("") }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; (e.currentTarget as HTMLElement).style.color = D.inkDim }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = D.inkMuted }}
                    >
                      <Plus size={12} /> Thêm một mục
                    </button>
                  )}
                </div>
              )
            })}

          </div>

          {/* ══ RIGHT PANEL — Combined feed ═══════════════════════════════════ */}
          {isEdit && (
            <div style={{ flexShrink: 0, borderLeft: D.borderLight, display: 'flex', flexDirection: 'column', background: D.bg, overflow: 'hidden', width: 280 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.inkDim, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={13} /> Nhận xét và hoạt động
                </span>
                <button type="button" onClick={() => setShowDetail(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#dce6f4'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  {showDetail ? <EyeOff size={11} /> : <Eye size={11} />}
                  {showDetail ? "Ẩn chi tiết" : "Hiện chi tiết"}
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feed.length === 0 && (
                  <p style={{ fontSize: 12, color: D.inkMuted, textAlign: 'center', padding: '16px 0' }}>Chưa có hoạt động</p>
                )}
                {feed.map((entry, i) => {
                  if (entry.kind === "activity") {
                    if (!showDetail) return null
                    return (
                      <div key={`act-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dce6f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: D.inkMuted, flexShrink: 0, marginTop: 2 }}>
                          {initials(entry.userName)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: D.inkDim, lineHeight: 1.4, margin: 0 }}>
                            <span style={{ fontWeight: 700, color: D.ink }}>{entry.userName}</span>{" "}{entry.action}
                          </p>
                          <p style={{ fontSize: 10, color: D.inkMuted, margin: '2px 0 0' }}>{fmtRelative(entry.time)}</p>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={`cmt-${entry.id}`} style={{ position: 'relative' }}
                      onMouseEnter={e => { const btns = e.currentTarget.querySelectorAll('[data-cmtbtn]'); btns.forEach(b => (b as HTMLElement).style.opacity = '1') }}
                      onMouseLeave={e => { const btns = e.currentTarget.querySelectorAll('[data-cmtbtn]'); btns.forEach(b => (b as HTMLElement).style.opacity = '0') }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0, marginTop: 2, border: D.border }}>
                          {initials(entry.userName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: D.ink }}>{entry.userName}</span>
                            <span style={{ fontSize: 10, color: D.inkMuted }}>{fmtRelative(entry.time)}</span>
                          </div>
                          {editCmtId === entry.id ? (
                            <div style={{ marginTop: 4 }}>
                              <textarea value={editCmtText} onChange={e => setEditCmtText(e.target.value)} rows={2}
                                style={{ width: '100%', border: D.border, borderRadius: 8, padding: '6px 8px', fontSize: 12, resize: 'none', outline: 'none', background: D.card, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <button type="button" onClick={async () => {
                                  const updated = await updateTaskComment(task!.id, entry.id, editCmtText)
                                  setComments(prev => prev.map(x => x.id === entry.id ? updated : x))
                                  setEditCmtId(null)
                                }} style={{ fontSize: 11, color: D.indigo, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Lưu</button>
                                <button type="button" onClick={() => setEditCmtId(null)} style={{ fontSize: 11, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: D.card, border: D.borderLight, borderRadius: 8, padding: '8px 10px', marginTop: 4 }}>
                              <p style={{ fontSize: 12, color: D.inkDim, margin: 0, wordBreak: 'break-word' }}>{entry.content}</p>
                            </div>
                          )}
                          {editCmtId !== entry.id && (
                            <div data-cmtbtn style={{ display: 'flex', gap: 8, marginTop: 3, opacity: 0, transition: 'opacity .1s' }}>
                              <button type="button"
                                onClick={() => { setEditCmtId(entry.id); setEditCmtText(entry.content) }}
                                style={{ fontSize: 10, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                Chỉnh sửa
                              </button>
                              <span style={{ fontSize: 10, color: D.inkMuted }}>·</span>
                              <button type="button" onClick={() => handleDeleteComment(entry.id)}
                                style={{ fontSize: 10, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                Xoá
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '8px 16px 16px', borderTop: D.borderLight, flexShrink: 0 }}>
                <textarea rows={2} value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Viết bình luận..."
                  style={{
                    width: '100%', border: D.borderLight, borderRadius: 8, padding: '8px 10px',
                    fontSize: 12, resize: 'none', outline: 'none', background: D.card,
                    fontFamily: 'inherit', boxSizing: 'border-box', color: D.ink,
                  }}
                  onFocus={e => (e.currentTarget.style.border = D.border)}
                  onBlur={e => (e.currentTarget.style.border = D.borderLight)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                />
                {newComment.trim() && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button type="button" onClick={handleAddComment} disabled={posting}
                      style={{ padding: '6px 14px', background: D.indigo, color: '#fff', border: D.border, borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer', opacity: posting ? 0.6 : 1, fontFamily: 'inherit', boxShadow: D.shadow(2, 2) }}>
                      {posting ? "..." : "Lưu"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (always visible, outside scroll) ──────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px 24px', borderTop: D.borderLight, flexShrink: 0, background: D.bg }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 18px', fontSize: 13, border: D.border, borderRadius: D.pill, background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2), fontFamily: 'inherit', fontWeight: 600 }}>
            Hủy
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: '8px 20px', fontSize: 13, background: D.ink, color: '#facc15', border: D.border, borderRadius: D.pill, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: D.shadow(2, 2), fontFamily: 'inherit', fontWeight: 700 }}>
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo thẻ"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
