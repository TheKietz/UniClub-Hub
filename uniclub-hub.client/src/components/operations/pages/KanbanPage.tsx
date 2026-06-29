import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw, Plus, Check, X, Image } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

// ── Component ─────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const clubId = Number(clubIdParam ?? 1);

  const { tasks: allTasks, patchTask, addTask, removeTask, reloadTasks, departmentId } = useTasks();
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
  const activeSprints   = sprints.filter(s => s.status === "Active");
  const activeSprintIds = new Set(activeSprints.map(s => s.id));

  // Only show tasks belonging to running (Active) sprints
  const tasks = selectedSprintId
    ? allTasks.filter(t => t.sprintId === selectedSprintId)
    : allTasks.filter(t => t.sprintId != null && activeSprintIds.has(t.sprintId));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cols = await getKanbanColumns(clubId, selectedSprintId ?? undefined, departmentId);
      setColumns(cols);
    } catch { toast.error("Không thể tải dữ liệu"); }
    finally { setLoading(false); }
  }, [clubId, selectedSprintId, departmentId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    getSprints({ clubId, departmentId, pageSize: 100 }).then(r => {
      setSprints(r.items);
      // Auto-select the sole active sprint so the board defaults to it
      const active = r.items.filter(s => s.status === 'Active');
      if (active.length === 1) setSelectedSprintId(active[0].id);
      else setSelectedSprintId(null);
    }).catch(() => {});
  }, [clubId, departmentId]);

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
    return tasks.filter(t => {
      if (t.kanbanColumnId) return t.kanbanColumnId === col.id;
      // Unpinned tasks fall into the system column matching their exact status.
      if (col.isSystem) return t.status === col.status;
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
    const newStatus = targetCol.status;
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
    let sprintForNew: number | undefined;
    if (selectedSprintId != null) {
      // User already scoped the board to a specific sprint — create inside it
      sprintForNew = selectedSprintId;
    } else if (activeSprints.length === 0) {
      toast.error('Chưa có tuần công việc nào đang chạy. Vui lòng khởi động tuần công việc trước khi tạo công việc.');
      return;
    } else if (activeSprints.length === 1) {
      sprintForNew = activeSprints[0].id;
    } else {
      // Multiple active sprints — task goes to backlog; user drags it later
      toast.info('Có nhiều tuần công việc đang chạy. Công việc mới sẽ vào kho công việc — hãy kéo sang tuần công việc phù hợp.');
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
      const col = await createKanbanColumn(clubId, { name: trimmed, sortOrder: columns.length, departmentId });
      setColumns(prev => [...prev, col]);
      setNewColName(""); setAddingColumn(false);
    } catch { toast.error("Không thể tạo cột mới"); }
  };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) ?? null;

  // ── Derived background styles ─────────────────────────────────────────────────
  const overlayClass = activeBg.isDark ? "bg-black/25" : "bg-white/10";

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

        {/* ── Header — neo-brutalism card ──────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, padding: '12px 18px',
          background: '#ffffff', border: '1.5px solid #0a2f6e',
          borderRadius: 14, boxShadow: '3px 3px 0 #0a2f6e',
          fontFamily: "'Be Vietnam Pro', sans-serif",
        }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: '#0a2f6e', margin: 0, letterSpacing: '-.02em' }}>
              Quản Lý Công Việc
            </h1>
            <p style={{ fontSize: 12, color: '#918c99', marginTop: 2 }}>
              Bảng Kanban · {tasks.length} công việc
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => { reloadTasks(); setRefreshKey(k => k + 1); }}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f4f7fc', color: '#4a4651', border: '1.5px solid #0a2f6e',
                boxShadow: '2px 2px 0 #0a2f6e', padding: '7px 10px',
                borderRadius: 999, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

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
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#f4f7fc', color: '#4a4651', border: '1.5px solid #0a2f6e',
                  boxShadow: '2px 2px 0 #0a2f6e', padding: '7px 12px',
                  borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Image size={13} />
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

            <button
              type="button"
              onClick={() => openCreate()}
              style={{
                background: '#1d4ed8', color: '#fff', border: '1.5px solid #0a2f6e',
                boxShadow: '2px 2px 0 #0a2f6e', padding: '8px 16px',
                borderRadius: 999, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Tạo công việc
            </button>
          </div>
        </div>

        {/* ── Sprint filter ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <button
            type="button"
            onClick={() => setSelectedSprintId(null)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid #0a2f6e',
              background: selectedSprintId === null ? '#0a2f6e' : '#ffffff',
              color: selectedSprintId === null ? '#fff' : '#4a4651',
              boxShadow: selectedSprintId === null ? 'none' : '2px 2px 0 #0a2f6e',
              transition: 'background .1s, color .1s',
            }}
          >
            Tất cả
          </button>
          {activeSprints.map(sprint => (
            <button
              key={sprint.id}
              type="button"
              onClick={() => setSelectedSprintId(sprint.id)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid #0a2f6e',
                background: selectedSprintId === sprint.id ? '#0a2f6e' : '#ffffff',
                color: selectedSprintId === sprint.id ? '#fff' : '#4a4651',
                boxShadow: selectedSprintId === sprint.id ? 'none' : '2px 2px 0 #0a2f6e',
              }}
            >
              {sprint.name}
            </button>
          ))}
          {activeSprints.length === 0 && (
            <span style={{ fontSize: 12, color: '#918c99', alignSelf: 'center' }}>
              Không có sprint nào đang chạy
            </span>
          )}
        </div>

        {/* ── Sprint info banner ────────────────────────────────────────────────── */}
        {selectedSprint && (
          <div style={{
            marginBottom: 16, padding: '10px 16px',
            background: '#ffffff', border: '1.5px solid #0a2f6e',
            borderRadius: 10, boxShadow: '2px 2px 0 #0a2f6e',
            display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 13, fontFamily: "'Be Vietnam Pro', sans-serif",
          }}>
            <span style={{ fontWeight: 800, color: '#0a2f6e' }}>{selectedSprint.name}</span>
            {selectedSprint.goal && (
              <span style={{ color: '#918c99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {selectedSprint.goal}
              </span>
            )}
            <span style={{ marginLeft: 'auto', flexShrink: 0, color: '#918c99', fontSize: 12 }}>
              {formatDate(selectedSprint.startDate)} → {formatDate(selectedSprint.endDate)}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: '#eef2ff', color: '#1d4ed8', border: '1px solid #c7d2fe',
              flexShrink: 0,
            }}>
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
        departmentId={departmentId}
        columns={columns}
        onClose={() => setModalOpen(false)}
        onSaved={() => { reloadTasks(); setRefreshKey(k => k + 1); }}
      />
    </div>
  );
}
