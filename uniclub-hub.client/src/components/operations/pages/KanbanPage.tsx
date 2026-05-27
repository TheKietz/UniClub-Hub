import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw, Plus, Check, X, Image } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import KanbanColumn from "../components/kanban/KanbanColumn";
import TaskDetailModal from "../components/task/TaskDetailModal";
import {
  updateTaskStatus, getSprints,
  getKanbanColumns, createKanbanColumn, updateKanbanColumn, deleteKanbanColumn,
} from "../services/operationsApi";
import type { TaskItem, KanbanColumnItem, SprintItem, SprintStatus } from "../services/operations.types";
import { createKanbanConnection } from "@/lib/kanbanHub";
import { SIGNALR_EVENTS, HUB_METHODS } from "@/lib/signalrEvents";
import { useTasks } from "../context/TasksContext";

// ── Background presets ────────────────────────────────────────────────────────

interface BgPreset {
  id: string;
  label: string;
  type: "gradient" | "image";
  value: string;       // CSS backgroundImage value
  isDark: boolean;     // drives overlay + text contrast
  thumbnail: string;   // inline-style for the swatch
}

const BG_PRESETS: BgPreset[] = [
  {
    id: "default",
    label: "Mặc định",
    type: "gradient",
    value: "linear-gradient(135deg,#f1f5f9 0%,#e0e7ff 100%)",
    isDark: false,
    thumbnail: "linear-gradient(135deg,#f1f5f9 0%,#e0e7ff 100%)",
  },
  {
    id: "ocean",
    label: "Đại dương",
    type: "gradient",
    value: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0e7490 100%)",
    isDark: true,
    thumbnail: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0e7490 100%)",
  },
  {
    id: "forest",
    label: "Rừng xanh",
    type: "gradient",
    value: "linear-gradient(135deg,#052e16 0%,#166534 60%,#4ade80 100%)",
    isDark: true,
    thumbnail: "linear-gradient(135deg,#052e16 0%,#166534 60%,#4ade80 100%)",
  },
  {
    id: "sunset",
    label: "Hoàng hôn",
    type: "gradient",
    value: "linear-gradient(135deg,#7c3aed 0%,#db2777 50%,#ea580c 100%)",
    isDark: true,
    thumbnail: "linear-gradient(135deg,#7c3aed 0%,#db2777 50%,#ea580c 100%)",
  },
  {
    id: "midnight",
    label: "Đêm tối",
    type: "gradient",
    value: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
    isDark: true,
    thumbnail: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
  },
  {
    id: "sky",
    label: "Bầu trời",
    type: "gradient",
    value: "linear-gradient(135deg,#bae6fd 0%,#3b82f6 100%)",
    isDark: false,
    thumbnail: "linear-gradient(135deg,#bae6fd 0%,#3b82f6 100%)",
  },
  {
    id: "sakura",
    label: "Hoa anh đào",
    type: "gradient",
    value: "linear-gradient(135deg,#fce4ec 0%,#f48fb1 50%,#e91e63 100%)",
    isDark: false,
    thumbnail: "linear-gradient(135deg,#fce4ec 0%,#f48fb1 50%,#e91e63 100%)",
  },
  {
    id: "milkyway",
    label: "Ngân hà",
    type: "image",
    value: "url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1920&q=80')",
    isDark: true,
    thumbnail: "url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=60')",
  },
  {
    id: "mountain",
    label: "Núi rừng",
    type: "image",
    value: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80')",
    isDark: true,
    thumbnail: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=60')",
  },
  {
    id: "beach",
    label: "Biển xanh",
    type: "image",
    value: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80')",
    isDark: false,
    thumbnail: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=60')",
  },
];

const LS_KEY = (clubId: number) => `kanban_bg_${clubId}`;

// ── Sprint label helpers ──────────────────────────────────────────────────────

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  Planning: "Lên kế hoạch", Active: "Đang chạy", Completed: "Hoàn thành", Cancelled: "Đã hủy",
};
const SPRINT_STATUS_COLOR: Record<SprintStatus, string> = {
  Planning: "text-indigo-500", Active: "text-green-600", Completed: "text-gray-500", Cancelled: "text-red-500",
};
const SPRINT_STATUS_BG: Record<SprintStatus, string> = {
  Planning: "bg-indigo-50 text-indigo-700", Active: "bg-green-50 text-green-700",
  Completed: "bg-gray-100 text-gray-600", Cancelled: "bg-red-50 text-red-600",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

const nameToStatus = (name: string): "Todo" | "Doing" | "Done" => {
  const lc = name.toLowerCase();
  if (lc.includes("hoàn") || lc.includes("done") || lc.includes("xong")) return "Done";
  if (lc.includes("đang") || lc.includes("doing")) return "Doing";
  return "Todo";
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const clubId = Number(clubIdParam ?? 1);

  const { tasks: allTasks, patchTask, addTask, removeTask, reloadTasks } = useTasks();
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<number | undefined>(undefined);
  const [defaultSprintId, setDefaultSprintId] = useState<number | undefined>(undefined);

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const newColRef = useRef<HTMLInputElement>(null);

  // ── Board drag-to-scroll ──────────────────────────────────────────────────────
  const boardRef = useRef<HTMLDivElement>(null);
  const boardDragOrigin = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [boardDragging, setBoardDragging] = useState(false);

  const onBoardMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Skip clicks on interactive elements or DnD draggables so card drag still works
    if (
      target.closest('[data-rfd-draggable-id]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a')
    ) return;
    if (!boardRef.current) return;
    boardDragOrigin.current = { x: e.clientX, scrollLeft: boardRef.current.scrollLeft };
    setBoardDragging(true);
  }, []);

  const onBoardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardDragOrigin.current || !boardRef.current) return;
    e.preventDefault();
    const dx = e.clientX - boardDragOrigin.current.x;
    boardRef.current.scrollLeft = boardDragOrigin.current.scrollLeft - dx;
  }, []);

  const stopBoardDrag = useCallback(() => {
    boardDragOrigin.current = null;
    setBoardDragging(false);
  }, []);

  // ── Background state ─────────────────────────────────────────────────────────
  const LS_VAL_KEY = (cid: number) => `kanban_bg_val_${cid}`;

  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [activeBgId, setActiveBgId] = useState<string>(() => {
    try { return localStorage.getItem(LS_KEY(clubId)) ?? "default"; }
    catch { return "default"; }
  });
  // Custom preset (URL input or file upload) — restored from localStorage per club
  const [customPreset, setCustomPreset] = useState<BgPreset | null>(() => {
    try {
      const id  = localStorage.getItem(LS_KEY(clubId));
      const val = localStorage.getItem(LS_VAL_KEY(clubId));
      if ((id === "custom_url" || id === "custom_upload") && val) {
        return {
          id,
          label: id === "custom_upload" ? "Ảnh tải lên" : "URL tùy chỉnh",
          type: "image",
          value: val,
          isDark: true,
          thumbnail: val,
        };
      }
    } catch { /* noop */ }
    return null;
  });

  const allPresets = customPreset ? [...BG_PRESETS, customPreset] : BG_PRESETS;
  const activeBg   = allPresets.find(b => b.id === activeBgId) ?? BG_PRESETS[0];

  const [customUrl, setCustomUrl] = useState("");
  const bgPickerRef      = useRef<HTMLDivElement>(null);
  const bgPickerBtnRef   = useRef<HTMLButtonElement>(null);
  const bgPickerDropRef  = useRef<HTMLDivElement>(null);   // ref for portal dropdown
  const [bgPickerPos, setBgPickerPos] = useState({ top: 0, right: 0 });
  const fileInputRef     = useRef<HTMLInputElement>(null);

  // Close bg picker only when clicking outside BOTH the button wrapper AND the portal dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inBtn  = bgPickerRef.current?.contains(target);
      const inDrop = bgPickerDropRef.current?.contains(target);
      if (!inBtn && !inDrop) setBgPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectBg = (id: string) => {
    setActiveBgId(id);
    try { localStorage.setItem(LS_KEY(clubId), id); } catch { /* noop */ }
  };

  const applyCustomPreset = (preset: BgPreset) => {
    setCustomPreset(preset);
    setActiveBgId(preset.id);
    try {
      localStorage.setItem(LS_KEY(clubId), preset.id);
      localStorage.setItem(LS_VAL_KEY(clubId), preset.value);
    } catch { /* noop */ }
  };

  const applyCustomUrl = () => {
    if (!customUrl.trim()) return;
    applyCustomPreset({
      id: "custom_url",
      label: "URL tùy chỉnh",
      type: "image",
      value: `url('${customUrl.trim()}')`,
      isDark: true,
      thumbnail: `url('${customUrl.trim()}')`,
    });
    setCustomUrl("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      applyCustomPreset({
        id: "custom_upload",
        label: "Ảnh tải lên",
        type: "image",
        value: `url('${dataUrl}')`,
        isDark: true,
        thumbnail: `url('${dataUrl}')`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Data loading ──────────────────────────────────────────────────────────────
  // Never show backlog tasks (sprintId = null) on the Kanban board
  const tasks = selectedSprintId
    ? allTasks.filter(t => t.sprintId === selectedSprintId)
    : allTasks.filter(t => t.sprintId != null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cols = await getKanbanColumns(clubId, selectedSprintId ?? undefined);
      setColumns(cols);
    } catch { toast.error("Không thể tải dữ liệu"); }
    finally { setLoading(false); }
  }, [clubId, selectedSprintId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    getSprints({ clubId, pageSize: 100 }).then(r => {
      setSprints(r.items);
      // Auto-select the sole active sprint so the board defaults to it
      const active = r.items.filter(s => s.status === 'Active');
      if (active.length === 1) setSelectedSprintId(active[0].id);
    }).catch(() => {});
  }, [clubId]);

  useEffect(() => {
    const conn = createKanbanConnection();
    conn.on(SIGNALR_EVENTS.TASK_STATUS_UPDATED, (u: TaskItem) => patchTask(u));
    conn.on(SIGNALR_EVENTS.TASK_CREATED,        (c: TaskItem) => addTask(c));
    conn.on(SIGNALR_EVENTS.TASK_DELETED,        (id: number)  => removeTask(id));
    conn.start().then(() => conn.invoke(HUB_METHODS.JOIN_CLUB, clubId)).catch(() => {});
    return () => { conn.invoke(HUB_METHODS.LEAVE_CLUB, clubId).catch(() => {}); conn.stop(); };
  }, [clubId]);

  useEffect(() => { if (addingColumn) newColRef.current?.focus(); }, [addingColumn]);

  // ── Kanban logic ──────────────────────────────────────────────────────────────
  const tasksForColumn = (col: KanbanColumnItem): TaskItem[] => {
    const fallbackStatus = nameToStatus(col.name);
    const isDefault = col.name === "Cần làm" || col.name === "Đang làm" || col.name === "Hoàn thành";
    return tasks.filter(t => {
      if (t.kanbanColumnId) return t.kanbanColumnId === col.id;
      if (isDefault) return t.status === fallbackStatus;
      return false;
    });
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const targetColId = Number(destination.droppableId);
    const task = tasks.find(t => t.id === Number(draggableId));
    if (!task || task.kanbanColumnId === targetColId) return;
    const targetCol = columns.find(c => c.id === targetColId);
    if (!targetCol) return;
    const newStatus = nameToStatus(targetCol.name);
    if (task.isBlocked && (newStatus === "Doing" || newStatus === "Done")) {
      toast.error(`Bị chặn bởi ${task.blockingCount} công việc chưa hoàn thành`); return;
    }
    const progress = newStatus === "Done" ? 100 : newStatus === "Doing" ? Math.max(task.progress, 10) : task.progress;
    patchTask({ ...task, kanbanColumnId: targetColId, status: newStatus });
    try {
      const updated = await updateTaskStatus(task.id, { status: newStatus, progress, kanbanColumnId: targetColId });
      patchTask(updated);
    } catch { toast.error("Không thể cập nhật trạng thái"); reloadTasks(); }
  };

  const openCreate = (columnId?: number) => {
    const activeSprints = sprints.filter(s => s.status === 'Active');

    let sprintForNew: number | undefined;
    if (selectedSprintId != null) {
      // User already scoped the board to a specific sprint — create inside it
      sprintForNew = selectedSprintId;
    } else if (activeSprints.length === 0) {
      toast.error('Chưa có sprint nào đang chạy. Vui lòng khởi động sprint trước khi tạo công việc.');
      return;
    } else if (activeSprints.length === 1) {
      sprintForNew = activeSprints[0].id;
    } else {
      // Multiple active sprints — task goes to backlog; user drags it later
      toast.info('Có nhiều sprint đang chạy. Task mới sẽ vào Backlog — hãy kéo sang sprint phù hợp.');
      sprintForNew = undefined;
    }

    setEditTask(null);
    setDefaultColumnId(columnId);
    setDefaultSprintId(sprintForNew);
    setModalOpen(true);
  };
  const openEdit = (task: TaskItem) => { setEditTask(task); setDefaultColumnId(undefined); setDefaultSprintId(undefined); setModalOpen(true); };

  const handleRename = async (id: number, newName: string) => {
    const col = columns.find(c => c.id === id);
    if (!col) return;
    try {
      const updated = await updateKanbanColumn(id, { name: newName, color: col.color, sortOrder: col.sortOrder });
      setColumns(prev => prev.map(c => c.id === id ? updated : c));
    } catch { toast.error("Không thể đổi tên cột"); }
  };

  const handleDeleteColumn = async (id: number) => {
    if (!window.confirm("Xóa cột này? Các thẻ trong cột sẽ chuyển sang 'Cần làm'.")) return;
    try {
      await deleteKanbanColumn(id);
      setColumns(prev => prev.filter(c => c.id !== id));
      toast.success("Đã xóa cột");
    } catch { toast.error("Không thể xóa cột"); }
  };

  const commitAddColumn = async () => {
    const trimmed = newColName.trim();
    if (!trimmed) { setAddingColumn(false); return; }
    try {
      const col = await createKanbanColumn(clubId, { name: trimmed, sortOrder: columns.length });
      setColumns(prev => [...prev, col]);
      setNewColName(""); setAddingColumn(false);
    } catch { toast.error("Không thể tạo cột mới"); }
  };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) ?? null;

  // ── Derived background styles ─────────────────────────────────────────────────
  // Dark backgrounds get a dark overlay; light ones get a very light white wash
  const overlayClass = activeBg.isDark
    ? "bg-black/25"
    : "bg-white/10";

  // Header & filter area: frosted glass effect adapts to dark/light bg
  const glassClass = activeBg.isDark
    ? "bg-black/40 backdrop-blur-md border-white/10 text-white"
    : "bg-white/80 backdrop-blur-md border-white/60 text-gray-800";

  const subTextClass = activeBg.isDark ? "text-white/70" : "text-gray-500";
  const pillActive = "bg-indigo-600 text-white";
  const pillInactive = activeBg.isDark
    ? "bg-white/15 text-white/90 border border-white/20 hover:bg-white/25"
    : "bg-white text-gray-600 border hover:bg-gray-50";

  return (
    /* ── Outer wrapper — fixed background ───────────────────────────────────── */
    <div
      className="relative min-h-screen"
      style={{
        backgroundImage: activeBg.value,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for contrast */}
      <div className={`absolute inset-0 pointer-events-none ${overlayClass}`} />

      {/* All content sits above the overlay */}
      <div className="relative z-10 p-6 flex flex-col min-h-screen">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between mb-4 rounded-2xl px-5 py-3 border ${glassClass}`}>
          <div>
            <h1 className="text-xl font-bold">Quản Lý Công Việc</h1>
            <p className={`text-sm mt-0.5 ${subTextClass}`}>
              Bảng Kanban · {tasks.length} công việc
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={activeBg.isDark ? "border-white/30 text-white bg-white/10 hover:bg-white/20" : ""}
              onClick={() => { reloadTasks(); setRefreshKey(k => k + 1); }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>

            {/* ── Background picker trigger ────────────────────────────────── */}
            <div ref={bgPickerRef}>
              <button
                ref={bgPickerBtnRef}
                type="button"
                title="Thay đổi nền"
                onClick={() => {
                  if (!bgPickerOpen && bgPickerBtnRef.current) {
                    const rect = bgPickerBtnRef.current.getBoundingClientRect();
                    setBgPickerPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                  }
                  setBgPickerOpen(v => !v);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  activeBg.isDark
                    ? "border-white/30 text-white bg-white/10 hover:bg-white/20"
                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                }`}
              >
                <Image size={14} />
                <span>Nền</span>
              </button>
            </div>

            {/* Hidden file input for local image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Picker dropdown rendered via portal so it sits above Dialog/Modal */}
            {bgPickerOpen && createPortal(
              <div
                ref={bgPickerDropRef}
                className="fixed w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                style={{ top: bgPickerPos.top, right: bgPickerPos.right, zIndex: 9999 }}
              >
                <div className="px-4 pt-4 pb-2">
                  <p className="text-sm font-semibold text-gray-800 mb-3">Chọn nền bảng</p>

                  {/* Gradient presets */}
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Màu sắc</p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {allPresets.filter(b => b.type === "gradient").map(bg => (
                      <button
                        key={bg.id}
                        type="button"
                        title={bg.label}
                        onClick={() => selectBg(bg.id)}
                        className={`relative w-full aspect-square rounded-xl transition-all ${
                          activeBgId === bg.id ? "ring-2 ring-indigo-500 ring-offset-1 scale-105" : "hover:scale-105"
                        }`}
                        style={{ backgroundImage: bg.thumbnail, backgroundSize: "cover" }}
                      >
                        {activeBgId === bg.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={14} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Image presets + custom upload thumbnail */}
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ảnh</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {allPresets.filter(b => b.type === "image").map(bg => (
                      <button
                        key={bg.id}
                        type="button"
                        title={bg.label}
                        onClick={() => selectBg(bg.id)}
                        className={`relative w-full h-14 rounded-xl transition-all overflow-hidden ${
                          activeBgId === bg.id ? "ring-2 ring-indigo-500 ring-offset-1 scale-105" : "hover:scale-105"
                        }`}
                        style={{ backgroundImage: bg.thumbnail, backgroundSize: "cover", backgroundPosition: "center" }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5">
                          <span className="text-[9px] text-white font-medium">{bg.label}</span>
                        </div>
                        {activeBgId === bg.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Check size={14} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Upload from computer */}
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Tải ảnh lên</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors mb-3"
                  >
                    <Image size={13} /> Chọn ảnh từ máy tính
                  </button>

                  {/* Custom URL */}
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Hoặc dán URL</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={customUrl}
                      onChange={e => setCustomUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && applyCustomUrl()}
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={applyCustomUrl}
                      disabled={!customUrl.trim()}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                    >
                      Dùng
                    </button>
                  </div>
                </div>
                <div className="px-4 pb-3 mt-1">
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Nền cố định — riêng từng bảng, lưu trên trình duyệt này.
                  </p>
                </div>
              </div>,
              document.body
            )}

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => openCreate()}
            >
              + Tạo công việc
            </Button>
          </div>
        </div>

        {/* ── Sprint filter ────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedSprintId(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSprintId === null ? pillActive : pillInactive
            }`}
          >
            Tất cả
          </button>
          {sprints.map(sprint => (
            <button
              key={sprint.id}
              type="button"
              onClick={() => setSelectedSprintId(sprint.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedSprintId === sprint.id ? pillActive : pillInactive
              }`}
            >
              {sprint.name}
              <span className={`ml-1.5 text-xs ${
                selectedSprintId === sprint.id ? "text-indigo-200" : (activeBg.isDark ? "text-white/60" : SPRINT_STATUS_COLOR[sprint.status])
              }`}>
                {SPRINT_STATUS_LABEL[sprint.status]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Sprint info banner ───────────────────────────────────────────────── */}
        {selectedSprint && (
          <div className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-4 text-sm border ${glassClass}`}>
            <span className="font-semibold">{selectedSprint.name}</span>
            {selectedSprint.goal && <span className={`truncate ${subTextClass}`}>{selectedSprint.goal}</span>}
            <span className={`ml-auto shrink-0 ${subTextClass}`}>
              {formatDate(selectedSprint.startDate)} → {formatDate(selectedSprint.endDate)}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SPRINT_STATUS_BG[selectedSprint.status]}`}>
              {SPRINT_STATUS_LABEL[selectedSprint.status]}
            </span>
          </div>
        )}

        {/* ── Board ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className={`flex items-center justify-center h-64 ${activeBg.isDark ? "text-white/60" : "text-gray-400"}`}>
            Đang tải...
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div
              ref={boardRef}
              className={[
                "flex gap-3 items-start overflow-x-scroll pb-4 flex-1 select-none",
                boardDragging ? "cursor-grabbing" : "cursor-grab",
                // scrollbar styling via arbitrary Tailwind variants
                "[&::-webkit-scrollbar]:h-2",
                activeBg.isDark
                  ? "[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/60"
                  : "[&::-webkit-scrollbar-track]:bg-black/5 [&::-webkit-scrollbar-thumb]:bg-black/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/35",
              ].join(" ")}
              onMouseDown={onBoardMouseDown}
              onMouseMove={onBoardMouseMove}
              onMouseUp={stopBoardDrag}
              onMouseLeave={stopBoardDrag}
            >
              {columns.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={tasksForColumn(col)}
                  onAdd={openCreate}
                  onEdit={openEdit}
                  onRename={handleRename}
                  onDelete={handleDeleteColumn}
                  isDarkBg={activeBg.isDark}
                />
              ))}

              {/* Add column */}
              <div className="flex-shrink-0 w-[272px]">
                {addingColumn ? (
                  <div className={`rounded-2xl p-3 ${activeBg.isDark ? "bg-black/30 backdrop-blur-sm" : "bg-white/70 backdrop-blur-sm"}`}>
                    <input
                      ref={newColRef}
                      value={newColName}
                      onChange={e => setNewColName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") commitAddColumn();
                        if (e.key === "Escape") { setAddingColumn(false); setNewColName(""); }
                      }}
                      placeholder="Nhập tên cột..."
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-2 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={commitAddColumn}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                      >
                        <Check size={13} /> Thêm cột
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingColumn(false); setNewColName(""); }}
                        className={`p-1.5 ${activeBg.isDark ? "text-white/60 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingColumn(true)}
                    className={`flex items-center gap-2 w-full px-4 py-3 border border-dashed rounded-2xl text-sm transition-colors ${
                      activeBg.isDark
                        ? "border-white/30 text-white/70 bg-white/10 hover:bg-white/20 hover:border-white/50"
                        : "border-gray-300 text-gray-500 bg-white/60 hover:bg-white/80 hover:border-indigo-400 hover:text-indigo-600"
                    }`}
                  >
                    <Plus size={15} /> Thêm cột khác
                  </button>
                )}
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      <TaskDetailModal
        clubId={clubId}
        task={editTask}
        open={modalOpen}
        defaultColumnId={defaultColumnId}
        defaultSprintId={defaultSprintId}
        columns={columns}
        onClose={() => setModalOpen(false)}
        onSaved={() => { reloadTasks(); setRefreshKey(k => k + 1); }}
      />
    </div>
  );
}
