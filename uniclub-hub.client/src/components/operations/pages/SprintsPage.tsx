import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, MoreHorizontal, Zap, GripVertical, Search, X } from "lucide-react";
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd";
import {
  getSprints, createSprint, updateSprint, deleteSprint,
  createTask, updateTask, updateTaskStatus,
  getKanbanColumns, getUrgentTasks,
} from "../services/operationsApi";
import type {
  SprintItem, TaskItem, TaskStatus, TaskPriority, SprintStatus,
  UpdateSprintDto, KanbanColumnItem, UrgentTaskItem,
} from "../services/operations.types";
import { useTasks } from "../context/TasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { CLUB_ROLES } from "@/types/auth";
import StartSprintModal from "../components/sprint/StartSprintModal";
import CompleteSprintModal from "../components/sprint/CompleteSprintModal";
import TaskDetailModal from "../components/task/TaskDetailModal";

// ── Column helpers ────────────────────────────────────────────────────────────

function sortedCols(columns: KanbanColumnItem[]) {
  return [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
}

function currentColumn(task: TaskItem, columns: KanbanColumnItem[]): KanbanColumnItem | undefined {
  if (task.kanbanColumnId) return columns.find(c => c.id === task.kanbanColumnId);
  // Fallback for tasks not yet pinned to a column: match the column whose
  // exact status equals the task's status (prefer a system column).
  const sc = sortedCols(columns);
  return sc.find(c => c.isSystem && c.status === task.status)
    ?? sc.find(c => c.status === task.status);
}

function colBg(col: KanbanColumnItem, columns: KanbanColumnItem[]): string {
  if (col.color) return col.color;
  const sc = sortedCols(columns);
  if (col.id === sc[0]?.id) return '#F5F5F5';
  if (col.id === sc.at(-1)?.id) return '#00C853';
  return '#3B4EFF';
}

function colFg(col: KanbanColumnItem, columns: KanbanColumnItem[]): string {
  const bg = colBg(col, columns);
  return bg === '#F5F5F5' ? '#0A0A0A' : 'white';
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return '?';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
}
function isOverdue(iso?: string) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// Feature 2: client-side deadline risk computation
function computeRisk(task: TaskItem): 'high' | 'none' {
  if (task.status === 'Done') return 'none'
  if (!task.deadline || !task.estimatedHours) return 'none'
  const now = Date.now()
  const timeLeftHours = (new Date(task.deadline).getTime() - now) / 3_600_000
  const timeNeededHours = task.estimatedHours * (100 - task.progress) / 100
  return timeLeftHours < timeNeededHours ? 'high' : 'none'
}

const SPRINT_STATUS_BADGE: Record<SprintStatus, { bg: string; color: string; label: string }> = {
  Planning:  { bg: '#E0E7FF', color: '#4338CA', label: 'Lên kế hoạch' },
  Active:    { bg: '#DCFCE7', color: '#15803D', label: 'Đang chạy' },
  Completed: { bg: '#F3F4F6', color: '#6B7280', label: 'Đã hoàn thành' },
  Cancelled: { bg: '#FEE2E2', color: '#DC2626', label: 'Đã hủy' },
};

const PRIORITY_COLOR: Record<string, string> = {
  High: '#FF3B3B', Medium: '#FF9500', Low: '#3B4EFF',
};


const SPRINT_LAYOUT = {
  pageX: 32,
  sectionGap: 18,
  rowPadY: 9,
  rowPadX: 12,
  leftSpacer: 100,
  statusW: 142,
  assigneeW: 100,
  deadlineW: 86,
  headerPad: '12px 16px',
} as const;

const tableHeaderTextStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  color: '#8A8A8A',
  textTransform: 'uppercase',
  letterSpacing: '.07em',
};

function SprintColumnHeader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: `7px ${SPRINT_LAYOUT.rowPadX}px`,
      background: '#F5F5F0',
      borderBottom: '1.5px solid #D0D0C8',
    }}>
      <div style={{ width: SPRINT_LAYOUT.leftSpacer, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <span style={tableHeaderTextStyle}>Tên công việc</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: SPRINT_LAYOUT.statusW, textAlign: 'center' }}>
          <span style={tableHeaderTextStyle}>Trạng thái</span>
        </div>
        <div style={{ width: SPRINT_LAYOUT.assigneeW, textAlign: 'center' }}>
          <span style={tableHeaderTextStyle}>Người làm</span>
        </div>
        <div style={{ width: SPRINT_LAYOUT.deadlineW, textAlign: 'center' }}>
          <span style={tableHeaderTextStyle}>Hạn chót</span>
        </div>
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, columns, canManage, dragHandleProps, onOpen, onStatusChange }: {
  task: TaskItem;
  columns: KanbanColumnItem[];
  canManage: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> | null;
  onOpen: (t: TaskItem) => void;
  onStatusChange: (id: number, colId: number, status: TaskStatus) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const overdue = isOverdue(task.deadline) && task.status !== 'Done';
  const risk = computeRisk(task);
  const sc = sortedCols(columns);
  const cur = currentColumn(task, columns);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: `${SPRINT_LAYOUT.rowPadY}px ${SPRINT_LAYOUT.rowPadX}px`,
        borderBottom: '1.5px solid #0A0A0A',
        borderLeft: risk === 'high' ? '4px solid #f59e0b' : '4px solid transparent',
        background: hovered ? '#FFFBE0' : risk === 'high' ? '#fffbeb' : 'white',
        minHeight: 48,
        transition: 'background .1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle — only for managers */}
      {canManage ? (
        <div
          {...(dragHandleProps ?? {})}
          style={{
            cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: '0 6px 0 0', width: 30,
            color: hovered ? '#888' : 'transparent', transition: 'color .1s',
          }}
        >
          <GripVertical size={13} />
        </div>
      ) : (
        <div style={{ width: 30, flexShrink: 0 }} />
      )}

      {/* Priority dot */}
      <div style={{ width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          width: 8, height: 8, borderRadius: 0, display: 'block',
          background: PRIORITY_COLOR[task.priority] ?? '#94a3b8',
        }} />
      </div>

      {/* Title + inline badges */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16 }}>
        <button
          type="button"
          onClick={() => onOpen(task)}
          style={{
            flexShrink: 1, textAlign: 'left', color: '#0A0A0A', fontWeight: 700, fontSize: 13,
            background: 'none', border: 'none', cursor: 'pointer',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            padding: 0, transition: 'color .1s', minWidth: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#3B4EFF')}
          onMouseLeave={e => (e.currentTarget.style.color = '#0A0A0A')}
        >
          {task.title}
        </button>

        {task.subTaskCount > 0 && (
          <span style={{ fontSize: 10, color: '#AAA', flexShrink: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {task.subTaskCount} sub
          </span>
        )}
        {task.isBlocked && (
          <span style={{ fontSize: 10, color: '#FF3B3B', fontWeight: 800, flexShrink: 0, whiteSpace: 'nowrap' }}>
            Bị chặn
          </span>
        )}
        {risk === 'high' && (
          <span title="Nguy cơ trễ deadline" style={{ fontSize: 10, color: '#d97706', fontWeight: 800, flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', border: '1.5px solid #f59e0b', borderRadius: 4, background: '#fef3c7' }}>
            ⚠️ Trễ hạn
          </span>
        )}
        {task.eventId && (
          <span
            title={task.eventName ?? `Sự kiện #${task.eventId}`}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              maxWidth: 150,
              padding: '3px 9px',
              border: '1.5px solid #7C3AED',
              borderRadius: 999,
              background: '#F3E8FF',
              color: '#5B21B6',
              fontSize: 10,
              fontWeight: 900,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              boxShadow: '2px 2px 0 #0A0A0A18',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#7C3AED',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.eventName ?? `Sự kiện #${task.eventId}`}
            </span>
          </span>
        )}
      </div>

      {/* Right columns — fixed widths for alignment */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>

        {/* Status — 140px */}
        <div style={{ width: SPRINT_LAYOUT.statusW, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {canManage ? (
            <>
              <button
                type="button"
                onClick={() => setStatusOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', width: '100%', justifyContent: 'center',
                  border: '1.5px solid #0A0A0A', borderRadius: 0,
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
                  background: cur ? colBg(cur, columns) : '#F5F5F5',
                  color: cur ? colFg(cur, columns) : '#0A0A0A',
                  cursor: 'pointer', overflow: 'hidden',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cur?.name ?? task.status}
                </span>
                <ChevronDown size={10} style={{ flexShrink: 0 }} />
              </button>
              {statusOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setStatusOpen(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 2, zIndex: 40,
                    background: 'white', border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0 #0A0A0A', borderRadius: 0, padding: '4px 0', minWidth: 160,
                  }}>
                    {sc.map(col => {
                      const isCurrent = cur?.id === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', fontSize: 12, fontWeight: 700,
                            textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#0A0A0A',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FFFBE0')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          onClick={() => {
                            onStatusChange(task.id, col.id, col.status);
                            setStatusOpen(false);
                          }}
                        >
                          <span style={{
                            width: 10, height: 10, borderRadius: 0, flexShrink: 0,
                            background: colBg(col, columns), border: '1.5px solid #0A0A0A',
                          }} />
                          {col.name}
                          {isCurrent && <span style={{ marginLeft: 'auto', color: '#3B4EFF', fontWeight: 900 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '3px 8px', maxWidth: '100%',
              border: '1.5px solid #0A0A0A', borderRadius: 0,
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
              background: cur ? colBg(cur, columns) : '#F5F5F5',
              color: cur ? colFg(cur, columns) : '#0A0A0A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {cur?.name ?? task.status}
            </span>
          )}
        </div>

        {/* Assignee — 52px */}
        <div style={{ width: SPRINT_LAYOUT.assigneeW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {task.assigneeName ? (
            <span style={{
              width: 26, height: 26, borderRadius: 0,
              border: '2px solid #0A0A0A', background: '#FFE500', color: '#0A0A0A',
              fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center',
            }} title={task.assigneeName}>
              {task.assigneeName.split(' ').at(-1)?.[0]?.toUpperCase() ?? '?'}
            </span>
          ) : (
            <span style={{
              width: 26, height: 26, borderRadius: 0,
              border: '2px solid #CCC', background: '#F5F5F5', color: '#AAA',
              fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center',
            }} title="Chưa giao">?</span>
          )}
        </div>

        {/* Deadline — 72px */}
        <div style={{ width: SPRINT_LAYOUT.deadlineW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: overdue ? 800 : 600,
            fontFamily: 'monospace', color: overdue ? '#FF3B3B' : '#888',
            whiteSpace: 'nowrap',
          }}>
            {task.deadline ? fmtDate(task.deadline) : '—'}
          </span>
        </div>

      </div>
    </div>
  );
}

// ── Quick-create row ──────────────────────────────────────────────────────────

function QuickCreateRow({ sprintId, clubId, departmentId, onCreated, onCancel }: {
  sprintId: number | null; clubId: number; departmentId?: number;
  onCreated: () => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  async function submit() {
    const t = title.trim();
    if (!t) { onCancel(); return; }
    setSaving(true);
    try {
      await createTask(clubId, { title: t, priority: 'Medium', departmentId, ...(sprintId != null && { sprintId }) });
      setTitle('');
      onCreated();
    } catch { toast.error('Không thể tạo công việc'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px 8px 32px',
      background: '#FFFBE0', border: '2px dashed #0A0A0A', borderTop: 'none',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 0, background: '#AAA', flexShrink: 0, border: '1px solid #888' }} />
      <input
        ref={ref} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Tiêu đề công việc..."
        disabled={saving}
        style={{ flex: 1, fontSize: 13, fontWeight: 700, background: 'transparent', outline: 'none', border: 'none', color: '#0A0A0A' }}
      />
      <button type="button" onClick={submit} disabled={saving} style={{ flexShrink: 0, padding: '4px 12px', fontSize: 12, fontWeight: 800, color: 'white', background: '#0A0A0A', border: 'none', borderRadius: 0, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
        {saving ? '...' : 'Tạo'}
      </button>
      <button type="button" onClick={onCancel} style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
        Hủy
      </button>
    </div>
  );
}

// ── Sprint section ────────────────────────────────────────────────────────────

function SprintSection({
  sprint, tasks, columns, canManage, departmentId,
  onEdit, onDelete, onStart, onComplete,
  onOpenTask, onStatusChange, onTaskCreated,
}: {
  sprint: SprintItem;
  tasks: TaskItem[];
  columns: KanbanColumnItem[];
  canManage: boolean;
  departmentId?: number;
  onEdit: (s: SprintItem) => void;
  onDelete: (id: number) => void;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
  onOpenTask: (t: TaskItem) => void;
  onStatusChange: (id: number, colId: number, status: TaskStatus) => void;
  onTaskCreated: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const todo   = tasks.filter(t => t.status === 'Todo').length;
  const doing  = tasks.filter(t => t.status === 'Doing').length;
  const review = tasks.filter(t => t.status === 'Reviewing').length;
  const done   = tasks.filter(t => t.status === 'Done').length;
  const badge = SPRINT_STATUS_BADGE[sprint.status];

  const headerBg = sprint.status === 'Active' ? '#FFE500' : sprint.status === 'Planning' ? 'white' : '#F0F0F0';
  const headerShadow = sprint.status === 'Active' ? '4px 4px 0 #0A0A0A' : sprint.status === 'Planning' ? '3px 3px 0 #0A0A0A' : 'none';

  return (
    <div style={{ marginBottom: SPRINT_LAYOUT.sectionGap }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: SPRINT_LAYOUT.headerPad,
        background: headerBg, border: '2px solid #0A0A0A', boxShadow: headerShadow, borderRadius: 0,
      }}>
        <button type="button" onClick={() => setCollapsed(v => !v)} style={{
          background: '#0A0A0A', border: 'none', borderRadius: 0, width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          {collapsed ? <ChevronRight size={13} color="white" /> : <ChevronDown size={13} color="white" />}
        </button>

        <span style={{ fontSize: 13, fontWeight: 900, color: '#0A0A0A' }}>{sprint.name}</span>
        <span style={{ fontSize: 12, color: '#555', fontWeight: 700, fontFamily: 'monospace' }}>
          {fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)}
        </span>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>({tasks.length} công việc)</span>
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ padding: '2px 8px', border: '2px solid #0A0A0A', background: '#F5F5F5', color: '#0A0A0A', fontWeight: 900, fontSize: 11, borderRadius: 0 }}>{todo}</span>
          <span style={{ padding: '2px 8px', border: '2px solid #0A0A0A', background: '#3B4EFF', color: 'white', fontWeight: 900, fontSize: 11, borderRadius: 0 }}>{doing}</span>
          <span style={{ padding: '2px 8px', border: '2px solid #0A0A0A', background: '#8B5CF6', color: 'white', fontWeight: 900, fontSize: 11, borderRadius: 0 }}>{review}</span>
          <span style={{ padding: '2px 8px', border: '2px solid #0A0A0A', background: '#00C853', color: 'white', fontWeight: 900, fontSize: 11, borderRadius: 0 }}>{done}</span>
        </div>

        {sprint.status === 'Planning' && canManage && (
          <button type="button" onClick={() => onStart(sprint.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            fontSize: 11, fontWeight: 800, color: 'white', background: '#0A0A0A',
            border: '2px solid #0A0A0A', boxShadow: '3px 3px 0 #555', borderRadius: 0, cursor: 'pointer',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-1px,-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '5px 5px 0 #555'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0 #555'; }}
          >
            <Zap size={11} /> Bắt đầu
          </button>
        )}
        {sprint.status === 'Active' && canManage && (
          <button type="button" onClick={() => onComplete(sprint.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            fontSize: 11, fontWeight: 800, color: '#0A0A0A', background: '#00C853',
            border: '2px solid #0A0A0A', borderRadius: 0, cursor: 'pointer', transition: 'transform .1s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-1px,-1px)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = ''}
          >
            Đang chạy
          </button>
        )}
        {(sprint.status === 'Completed' || sprint.status === 'Cancelled') && (
          <span style={{
            padding: '3px 10px', fontSize: 11, fontWeight: 800,
            border: '2px solid #0A0A0A', borderRadius: 0,
            background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '.05em',
          }}>{badge.label}</span>
        )}

        {canManage && (
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setMenuOpen(v => !v)} style={{
              width: 28, height: 28, border: '2px solid #0A0A0A', borderRadius: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'white', cursor: 'pointer', color: '#0A0A0A',
            }}>
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setMenuOpen(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: 32, zIndex: 40,
                  background: 'white', border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 #0A0A0A',
                  borderRadius: 0, padding: '4px 0', width: 160,
                }}>
                  <button type="button" style={{ width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 700, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#0A0A0A' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFFBE0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onClick={() => { setMenuOpen(false); onEdit(sprint); }}>
                    Chỉnh sửa
                  </button>
                  <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #0A0A0A' }} />
                  <button type="button" style={{ width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 700, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B3B' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onClick={() => { setMenuOpen(false); onDelete(sprint.id); }}>
                    Xóa sprint
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <Droppable droppableId={`sprint-${sprint.id}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                background: snapshot.isDraggingOver ? '#FFFBE0' : 'white',
                border: `2px solid #0A0A0A`,
                borderTop: 'none',
                borderRadius: 0,
                outline: snapshot.isDraggingOver ? '2px dashed #FFE500' : 'none',
                outlineOffset: -2,
                transition: 'background .1s',
                minHeight: 44,
              }}
            >
              {/* Column header */}
              <SprintColumnHeader />

              {tasks.length === 0 && !creating && !snapshot.isDraggingOver && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#AAA', fontStyle: 'italic', fontWeight: 700 }}>
                  Chưa có công việc trong tuần công việc này.
                </div>
              )}
              {tasks.map((task, idx) => (
                <Draggable key={task.id} draggableId={`task-${task.id}`} index={idx}>
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      style={{ ...prov.draggableProps.style, opacity: snap.isDragging ? 0.85 : 1 }}
                    >
                      <TaskRow
                        task={task}
                        columns={columns}
                        canManage={canManage}
                        dragHandleProps={canManage ? prov.dragHandleProps : null}
                        onOpen={onOpenTask}
                        onStatusChange={onStatusChange}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {canManage && (creating ? (
                <QuickCreateRow
                  sprintId={sprint.id} clubId={sprint.clubId} departmentId={departmentId}
                  onCreated={() => { setCreating(false); onTaskCreated(); }}
                  onCancel={() => setCreating(false)}
                />
              ) : (
                <button type="button" onClick={() => setCreating(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#0A0A0A',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFFBE0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Plus size={14} /> Tạo
                </button>
              ))}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

// ── Backlog section ───────────────────────────────────────────────────────────

function BacklogSection({
  tasks, clubId, departmentId, columns, canManage,
  onOpenTask, onStatusChange, onTaskCreated, onCreateSprint,
}: {
  tasks: TaskItem[];
  clubId: number;
  departmentId?: number;
  columns: KanbanColumnItem[];
  canManage: boolean;
  onOpenTask: (t: TaskItem) => void;
  onStatusChange: (id: number, colId: number, status: TaskStatus) => void;
  onTaskCreated: () => void;
  onCreateSprint: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);

  // ── Search + filter state ───────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  const q = search.trim().toLowerCase();
  const hasFilter = q !== '' || priorityFilter !== 'all' || statusFilter !== 'all';

  const visibleTasks = tasks.filter(t => {
    if (q && !t.title.toLowerCase().includes(q) && !(t.assigneeName?.toLowerCase().includes(q))) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  function clearFilters() {
    setSearch('');
    setPriorityFilter('all');
    setStatusFilter('all');
  }

  const selectStyle: React.CSSProperties = {
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    padding: '5px 26px 5px 10px', fontSize: 11, fontWeight: 800, color: '#0A0A0A',
    background: 'white', border: '2px solid #0A0A0A', borderRadius: 0, cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ marginBottom: SPRINT_LAYOUT.sectionGap }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: SPRINT_LAYOUT.headerPad,
        background: '#E8E8E8', border: '2px solid #0A0A0A', borderRadius: 0,
      }}>
        <button type="button" onClick={() => setCollapsed(v => !v)} style={{
          background: '#0A0A0A', border: 'none', borderRadius: 0, width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          {collapsed ? <ChevronRight size={13} color="white" /> : <ChevronDown size={13} color="white" />}
        </button>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#0A0A0A' }}>Kho công việc</span>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>
          {hasFilter ? `(${visibleTasks.length}/${tasks.length} công việc)` : `(${tasks.length} công việc)`}
        </span>
        <div style={{ flex: 1 }} />
        {canManage && (
          <button type="button" onClick={onCreateSprint} style={{
            padding: '5px 12px', fontSize: 11, fontWeight: 800, color: '#0A0A0A',
            background: 'white', border: '2px solid #0A0A0A', borderRadius: 0, cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#FFFBE0'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'white'}
          >
            Tạo tuần công việc
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* ── Search + filter toolbar ──────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '8px 12px', background: '#F5F5F0',
            border: '2px solid #0A0A0A', borderTop: 'none',
          }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc người làm..."
                style={{
                  width: '100%', padding: '6px 28px 6px 28px', fontSize: 12, fontWeight: 600,
                  border: '2px solid #0A0A0A', borderRadius: 0, outline: 'none',
                  background: 'white', color: '#0A0A0A', boxSizing: 'border-box',
                }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} title="Xóa tìm kiếm" style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#888',
                }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'all' | TaskPriority)} style={selectStyle}>
              <option value="all">Ưu tiên</option>
              <option value="High">Cao</option>
              <option value="Medium">Trung bình</option>
              <option value="Low">Thấp</option>
            </select>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | TaskStatus)} style={selectStyle}>
              <option value="all">Trạng thái</option>
              <option value="Todo">Cần làm</option>
              <option value="Doing">Đang làm</option>
              <option value="Reviewing">Reviewing</option>
              <option value="Done">Hoàn thành</option>
            </select>

            {hasFilter && (
              <button type="button" onClick={clearFilters} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                fontSize: 11, fontWeight: 800, color: '#0A0A0A',
                background: '#FFE500', border: '2px solid #0A0A0A', borderRadius: 0, cursor: 'pointer',
              }}>
                <X size={12} /> Xóa lọc
              </button>
            )}
          </div>

          <Droppable droppableId="backlog">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                background: snapshot.isDraggingOver ? '#FFFBE0' : 'white',
                border: '2px solid #0A0A0A', borderTop: 'none', borderRadius: 0,
                outline: snapshot.isDraggingOver ? '2px dashed #FFE500' : 'none',
                outlineOffset: -2,
                transition: 'background .1s',
                minHeight: 44,
              }}
            >
              {/* Column header */}
              <SprintColumnHeader />

              {tasks.length === 0 && !creating && !snapshot.isDraggingOver && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#AAA', fontStyle: 'italic', fontWeight: 700 }}>
                  Backlog trống. Thêm công việc chưa được lên sprint.
                </div>
              )}
              {tasks.length > 0 && visibleTasks.length === 0 && !snapshot.isDraggingOver && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#AAA', fontStyle: 'italic', fontWeight: 700 }}>
                  Không có công việc nào khớp với bộ lọc.
                </div>
              )}
              {visibleTasks.map((task, idx) => (
                <Draggable key={task.id} draggableId={`task-${task.id}`} index={idx}>
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      style={{ ...prov.draggableProps.style, opacity: snap.isDragging ? 0.85 : 1 }}
                    >
                      <TaskRow
                        task={task}
                        columns={columns}
                        canManage={canManage}
                        dragHandleProps={canManage ? prov.dragHandleProps : null}
                        onOpen={onOpenTask}
                        onStatusChange={onStatusChange}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {canManage && (creating ? (
                <QuickCreateRow
                  sprintId={null} clubId={clubId} departmentId={departmentId}
                  onCreated={() => { setCreating(false); onTaskCreated(); }}
                  onCancel={() => setCreating(false)}
                />
              ) : (
                <button type="button" onClick={() => setCreating(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#0A0A0A',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFFBE0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Plus size={14} /> Tạo
                </button>
              ))}
            </div>
          )}
          </Droppable>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const clubId = Number(clubIdParam ?? 1);
  const { getClubRole } = useAuth();

  const clubRole = getClubRole(clubId);
  const canManage = clubRole === CLUB_ROLES.CLUB_ADMIN || clubRole === CLUB_ROLES.DEPT_LEAD;

  const { tasks, tasksLoading, reloadTasks, patchTask, setAllTasks, departmentId } = useTasks();

  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startTarget, setStartTarget] = useState<SprintItem | null>(null);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<SprintItem | null>(null);

  const [editSprintOpen, setEditSprintOpen] = useState(false);
  const [editSprint, setEditSprint] = useState<SprintItem | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  const [createBtnHovered, setCreateBtnHovered] = useState(false);
  const [creating, setCreating] = useState(false);

  // Feature 3: Urgent tasks widget
  const [urgentTasks,    setUrgentTasks]    = useState<UrgentTaskItem[]>([]);
  const [urgentLoading,  setUrgentLoading]  = useState(false);
  const [urgentExpanded, setUrgentExpanded] = useState(true);

  useEffect(() => {
    if (!departmentId) return;
    setUrgentLoading(true);
    getUrgentTasks({ clubId, departmentId })
      .then(setUrgentTasks)
      .catch(() => {})
      .finally(() => setUrgentLoading(false));
  }, [clubId, departmentId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, cr] = await Promise.all([
        getSprints({ clubId, departmentId, pageSize: 100 }),
        getKanbanColumns(clubId, undefined, departmentId),
      ]);
      setSprints(sr.items);
      setColumns(cr);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [clubId, departmentId]);

  useEffect(() => { load(); }, [load]);

  // ── Sprint actions ──────────────────────────────────────────────────────────

  async function handleDirectCreateSprint() {
    if (creating) return;
    setCreating(true);
    const n = sprints.length + 1;
    const today = new Date().toISOString();
    const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString();
    try {
      await createSprint(clubId, { name: `Tuần công việc ${n}`, startDate: today, endDate: inTwoWeeks, departmentId });
      const r = await getSprints({ clubId, departmentId, pageSize: 100 });
      setSprints(r.items);
      toast.success(`Đã tạo tuần công việc ${n}`);
    } catch { toast.error('Không thể tạo tuần công việc'); }
    finally { setCreating(false); }
  }

  function handleStart(id: number) {
    const s = sprints.find(x => x.id === id);
    if (!s) return;
    setStartTarget(s);
    setStartModalOpen(true);
  }

  async function handleConfirmStart(dto: Partial<UpdateSprintDto>) {
    if (!startTarget) return;
    const s = startTarget;
    try {
      const updated = await updateSprint(s.id, {
        name: dto.name ?? s.name,
        goal: dto.goal ?? s.goal,
        startDate: dto.startDate ?? s.startDate,
        endDate: dto.endDate ?? s.endDate,
        status: 'Active',
      } as UpdateSprintDto);
      setSprints(prev => prev.map(x => x.id === s.id ? updated : x));
      toast.success('Tuần công việc đã bắt đầu');
    } catch { toast.error('Không thể bắt đầu tuần công việc'); }
  }

  function handleComplete(id: number) {
    const s = sprints.find(x => x.id === id);
    if (!s) return;
    setCompleteTarget(s);
    setCompleteModalOpen(true);
  }

  async function handleConfirmComplete(moveToSprintId: number | null) {
    if (!completeTarget) return;
    const s = completeTarget;
    const lastCol = [...columns].sort((a, b) => a.sortOrder - b.sortOrder).at(-1);
    const openTasks = tasksForSprint(s.id).filter(t =>
      lastCol ? t.kanbanColumnId !== lastCol.id : t.status !== 'Done'
    );
    try {
      // Move open tasks first
      await Promise.all(openTasks.map(t =>
        updateTask(t.id, {
          title: t.title, priority: t.priority, description: t.description,
          startDate: t.startDate, deadline: t.deadline, estimatedHours: t.estimatedHours,
          assignedTo: t.assignedTo, eventId: t.eventId, departmentId: t.departmentId,
          parentId: t.parentId, kanbanColumnId: t.kanbanColumnId,
          sprintId: moveToSprintId ?? undefined,
        })
      ));
      // Then mark sprint as completed
      const updated = await updateSprint(s.id, {
        name: s.name, goal: s.goal, startDate: s.startDate, endDate: s.endDate, status: 'Completed',
      } as UpdateSprintDto);
      setSprints(prev => prev.map(x => x.id === s.id ? updated : x));
      await reloadTasks();
      toast.success('Tuần công việc đã hoàn thành');
    } catch { toast.error('Không thể hoàn thành tuần công việc'); }
  }

  async function handleDeleteSprint(id: number) {
    const s = sprints.find(x => x.id === id);
    if (!s || !confirm(`Xóa tuần công việc "${s.name}"?`)) return;
    try {
      await deleteSprint(id);
      setSprints(prev => prev.filter(x => x.id !== id));
      toast.success('Đã xóa tuần công việc');
    } catch { toast.error('Không thể xóa tuần công việc'); }
  }

  async function handleEditSprint(data: { name: string; goal?: string; startDate: string; endDate: string }) {
    if (!editSprint) return;
    try {
      const updated = await updateSprint(editSprint.id, {
        ...data, status: editSprint.status,
      } as UpdateSprintDto);
      setSprints(prev => prev.map(x => x.id === editSprint.id ? updated : x));
      toast.success('Đã cập nhật tuần công việc');
      setEditSprintOpen(false);
      setEditSprint(null);
    } catch { toast.error('Không thể cập nhật tuần công việc'); }
  }

  // ── Task actions ────────────────────────────────────────────────────────────

  async function handleStatusChange(id: number, colId: number, status: TaskStatus) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const progress = status === 'Done' ? 100 : status === 'Doing' ? Math.max(task.progress, 10) : task.progress;
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status, kanbanColumnId: colId } : t));
    try {
      const updated = await updateTaskStatus(id, { status, progress, kanbanColumnId: colId });
      patchTask(updated);
    } catch { toast.error('Không thể cập nhật trạng thái'); reloadTasks(); }
  }

  // ── Drag and drop ───────────────────────────────────────────────────────────

  async function onDragEnd(result: DropResult) {
    if (!canManage) return;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId.replace('task-', ''));
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSprintId = destination.droppableId === 'backlog'
      ? undefined
      : parseInt(destination.droppableId.replace('sprint-', ''));

    // Optimistic update
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprintId: newSprintId } : t));

    try {
      const updated = await updateTask(taskId, {
        title: task.title,
        priority: task.priority,
        description: task.description,
        startDate: task.startDate,
        deadline: task.deadline,
        estimatedHours: task.estimatedHours,
        assignedTo: task.assignedTo,
        eventId: task.eventId,
        sprintId: newSprintId,
        departmentId: task.departmentId,
        parentId: task.parentId,
        kanbanColumnId: task.kanbanColumnId,
      });
      patchTask(updated);
    } catch {
      toast.error('Không thể di chuyển công việc');
      reloadTasks();
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const tasksForSprint = (sprintId: number) => tasks.filter(t => t.sprintId === sprintId);
  const backlogTasks = tasks.filter(t => !t.sprintId);

  const sortedSprints = [...sprints].sort((a, b) => {
    const order: Record<SprintStatus, number> = { Active: 0, Planning: 1, Completed: 2, Cancelled: 3 };
    return (order[a.status] ?? 99) - (order[b.status] ?? 99);
  });

  // Completed sprints render below the backlog; everything else above it.
  const activeSprints    = sortedSprints.filter(s => s.status !== 'Completed');
  const completedSprints = sortedSprints.filter(s => s.status === 'Completed');

  if (loading || tasksLoading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: 'var(--c-bg)', minHeight: '100%' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #FFE500', borderTop: '3px solid #0A0A0A', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 800, color: '#888', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em' }}>Đang tải...</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="rsp-page" style={{ padding: `24px ${SPRINT_LAYOUT.pageX}px 32px`, background: 'var(--c-bg)', minHeight: '100%', boxSizing: 'border-box' }}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A', margin: 0, letterSpacing: '-0.01em' }}>Quản lý công việc</h1>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4, fontWeight: 600 }}>
              {tasks.length} công việc · {sprints.length} sprint
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={handleDirectCreateSprint}
              disabled={creating}
              onMouseEnter={() => setCreateBtnHovered(true)}
              onMouseLeave={() => setCreateBtnHovered(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 800, color: '#0A0A0A', background: '#FFE500',
                border: '2px solid #0A0A0A',
                boxShadow: createBtnHovered ? '5px 5px 0 #0A0A0A' : '3px 3px 0 #0A0A0A',
                borderRadius: 0, cursor: creating ? 'not-allowed' : 'pointer',
                transform: createBtnHovered ? 'translate(-2px,-2px)' : 'none',
                transition: 'transform .12s, box-shadow .12s',
                opacity: creating ? 0.6 : 1,
              }}
            >
              <Plus size={15} /> {creating ? 'Đang tạo...' : 'Tạo tuần công việc'}
            </button>
          )}
        </div>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, rowGap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {sortedCols(columns).map((col) => (
            <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#555' }}>
              <span style={{ padding: '1px 8px', border: '2px solid #0A0A0A', background: colBg(col, columns), color: colFg(col, columns), fontWeight: 900, fontSize: 10, borderRadius: 0 }}>0</span>
              {col.name}
            </div>
          ))}
        </div>

        {/* ── Feature 3: Urgent task widget ───────────────────────── */}
        {(urgentTasks.length > 0 || urgentLoading) && (
          <div style={{ marginBottom: 20, border: '2.5px solid #0A0A0A', borderRadius: 0, background: 'white', boxShadow: '4px 4px 0 #0A0A0A', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setUrgentExpanded(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: '#0A0A0A', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#FFE500', letterSpacing: '.04em', flex: 1 }}>VIỆC CẦN LÀM NGAY HÔM NAY</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FFE500', opacity: 0.7 }}>{urgentExpanded ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
            </button>
            {urgentExpanded && (
              urgentLoading ? (
                <div style={{ padding: '12px 16px', fontSize: 12, color: '#888', fontWeight: 700 }}>Đang tính toán...</div>
              ) : (
                <div>
                  {urgentTasks.map((ut, i) => {
                    const priorityColor: Record<string, string> = { High: '#FF3B3B', Medium: '#FF9500', Low: '#3B4EFF' };
                    const deadlineStr = ut.deadline
                      ? (ut.hoursToDeadline >= 0 && ut.hoursToDeadline < 24
                          ? `Còn ${Math.floor(ut.hoursToDeadline)}h`
                          : new Date(ut.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }))
                      : '—';
                    return (
                      <div key={ut.taskId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < urgentTasks.length - 1 ? '1.5px solid #E8E8E0' : 'none', background: i === 0 ? '#FFFBE0' : 'white' }}>
                        <span style={{ width: 22, height: 22, borderRadius: 0, border: '2px solid #0A0A0A', background: '#FFE500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#0A0A0A', flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        <span style={{ width: 8, height: 8, borderRadius: 0, background: priorityColor[ut.priority] ?? '#888', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ut.title}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ut.hoursToDeadline >= 0 && ut.hoursToDeadline < 24 ? '#FF3B3B' : '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {deadlineStr}
                        </span>
                        <span style={{ fontSize: 10, color: '#888', fontWeight: 600, flexShrink: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ut.urgencyReason}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* ── Sprint sections (active / planning) ──────────────────── */}
        {activeSprints.map(sprint => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            tasks={tasksForSprint(sprint.id)}
            columns={columns}
            canManage={canManage}
            departmentId={departmentId}
            onEdit={s => { setEditSprint(s); setEditSprintOpen(true); }}
            onDelete={handleDeleteSprint}
            onStart={handleStart}
            onComplete={handleComplete}
            onOpenTask={t => { setActiveTask(t); setTaskModalOpen(true); }}
            onStatusChange={handleStatusChange}
            onTaskCreated={async () => { await reloadTasks(); await load(); }}
          />
        ))}

        {/* ── Backlog ──────────────────────────────────────────────── */}
        <BacklogSection
          tasks={backlogTasks}
          clubId={clubId}
          departmentId={departmentId}
          columns={columns}
          canManage={canManage}
          onOpenTask={t => { setActiveTask(t); setTaskModalOpen(true); }}
          onStatusChange={handleStatusChange}
          onTaskCreated={async () => { await reloadTasks(); await load(); }}
          onCreateSprint={handleDirectCreateSprint}
        />

        {/* ── Completed sprints (below the backlog) ────────────────── */}
        {completedSprints.map(sprint => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            tasks={tasksForSprint(sprint.id)}
            columns={columns}
            canManage={canManage}
            departmentId={departmentId}
            onEdit={s => { setEditSprint(s); setEditSprintOpen(true); }}
            onDelete={handleDeleteSprint}
            onStart={handleStart}
            onComplete={handleComplete}
            onOpenTask={t => { setActiveTask(t); setTaskModalOpen(true); }}
            onStatusChange={handleStatusChange}
            onTaskCreated={async () => { await reloadTasks(); await load(); }}
          />
        ))}

        {/* ── Modals ───────────────────────────────────────────────── */}
        <CompleteSprintModal
          open={completeModalOpen}
          sprint={completeTarget!}
          tasks={completeTarget ? tasksForSprint(completeTarget.id) : []}
          columns={columns}
          otherSprints={sprints.filter(s => s.id !== completeTarget?.id && (s.status === 'Active' || s.status === 'Planning'))}
          onClose={() => { setCompleteModalOpen(false); setCompleteTarget(null); }}
          onComplete={handleConfirmComplete}
        />

        <StartSprintModal
          open={startModalOpen}
          sprintName={startTarget?.name ?? ''}
          taskCount={startTarget ? tasksForSprint(startTarget.id).length : 0}
          defaultStartDate={startTarget?.startDate}
          defaultEndDate={startTarget?.endDate}
          onClose={() => { setStartModalOpen(false); setStartTarget(null); }}
          onStart={handleConfirmStart}
        />

        {/* Inline edit sprint — reuse StartSprintModal logic but for editing */}
        {editSprintOpen && editSprint && (
          <EditSprintInline
            sprint={editSprint}
            onClose={() => { setEditSprintOpen(false); setEditSprint(null); }}
            onSave={handleEditSprint}
          />
        )}

        <TaskDetailModal
          clubId={clubId}
          task={activeTask}
          open={taskModalOpen}
          departmentId={departmentId}
          columns={columns}
          onClose={() => { setTaskModalOpen(false); setActiveTask(null); }}
          onSaved={async () => { await reloadTasks(); await load(); }}
        />
      </div>
    </DragDropContext>
  );
}

// ── Inline edit sprint modal ──────────────────────────────────────────────────

function EditSprintInline({ sprint, onClose, onSave }: {
  sprint: SprintItem;
  onClose: () => void;
  onSave: (data: { name: string; goal?: string; startDate: string; endDate: string }) => Promise<void>;
}) {
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? '');
  const [startDate, setStartDate] = useState(sprint.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(sprint.endDate.slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), goal: goal.trim() || undefined, startDate, endDate }); }
    finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 14, fontWeight: 600,
    border: '2px solid #0A0A0A', borderRadius: 0, outline: 'none',
    background: 'white', color: '#0A0A0A', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 800, color: '#0A0A0A',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px 24px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: 'calc(100vh - 84px)', overflowY: 'auto', background: 'white', border: '3px solid #0A0A0A', boxShadow: '8px 8px 0 #0A0A0A', borderRadius: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '2px solid #0A0A0A', background: '#0A0A0A' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#FFE500', textTransform: 'uppercase', letterSpacing: '.04em' }}>Chỉnh sửa tuần công việc</h2>
          <button type="button" onClick={onClose} style={{ width: 26, height: 26, border: '2px solid #FFE500', borderRadius: 0, background: 'transparent', color: '#FFE500', cursor: 'pointer', fontWeight: 900 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Tên tuần công việc *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div className="rsp-form-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Ngày bắt đầu</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ngày kết thúc</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ ...labelStyle, color: '#555' }}>Mục tiêu</label>
            <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '2px solid #0A0A0A', background: '#FAFAF0' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 800, border: '2px solid #0A0A0A', borderRadius: 0, background: 'white', color: '#0A0A0A', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0F0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            Hủy
          </button>
          <button type="button" onClick={submit} disabled={saving} style={{ padding: '8px 22px', fontSize: 13, fontWeight: 900, border: '2px solid #0A0A0A', borderRadius: 0, background: saving ? '#AAA' : '#FFE500', color: '#0A0A0A', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '3px 3px 0 #0A0A0A' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-1px,-1px)'; }}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = ''}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
