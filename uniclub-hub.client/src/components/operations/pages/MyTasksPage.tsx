import { useState, useMemo, useEffect } from "react";
import {
  ListTodo, Clock, CheckSquare, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "../context/TasksContext";
import StatCard from "../components/StatCard";
import TaskDetailModal from "../components/task/TaskDetailModal";
import { getKanbanColumns } from "../services/operationsApi";
import type { TaskItem, KanbanColumnItem } from "../services/operations.types";
import { D } from '@/components/shared/managementTheme'

/* ── Design tokens ─────────────────────────────────────────────────────────── */

/* ── Config maps ───────────────────────────────────────────────────────────── */

const PRIORITY_CONFIG = {
  High:   { color: D.red,     label: "Cao"  },
  Medium: { color: D.amber,   label: "Vừa"  },
  Low:    { color: D.emerald, label: "Thấp" },
} as const

const STATUS_TABS = [
  { key: "all",       label: "Tất cả"     },
  { key: "Todo",      label: "Chưa làm"   },
  { key: "Doing",     label: "Đang làm"   },
  { key: "Reviewing", label: "Reviewing"  },
  { key: "Done",      label: "Hoàn thành" },
]

/* ── TaskListCard ──────────────────────────────────────────────────────────── */

function TaskListCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done"
  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
    : null

  const statusBadge = {
    Todo:  { bg: '#f3f4f6', color: D.inkDim, label: 'Chưa làm' },
    Doing: { bg: '#dbeafe', color: '#1e40af', label: 'Đang làm' },
    Done:  { bg: '#d1fae5', color: '#065f46', label: 'Hoàn thành' },
    Reviewing: { label: "Đang duyệt", bg: "#fef9c3", text: "#a16207" },
  }[task.status] ?? { bg: '#f3f4f6', color: D.inkDim, label: task.status }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: D.card,
        border: D.border,
        borderLeft: `4px solid ${p.color}`,
        borderRadius: D.radius,
        boxShadow: hovered ? D.shadow(5, 5) : D.shadow(3, 3),
        transform: hovered ? 'translate(-1px,-1px)' : 'none',
        transition: 'transform .12s, box-shadow .12s',
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '2px 8px',
          border: '1.5px solid #0a0a0a', borderRadius: 0,
          background: 'white', color: p.color,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          {p.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.sprintId && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 0, border: '1px solid #c7d2fe',
              background: '#eef2ff', color: D.indigo,
            }}>
              Sprint #{task.sprintId}
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 0, border: D.borderLight,
            background: statusBadge.bg, color: statusBadge.color,
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontSize: 13, fontWeight: 700, color: D.ink, margin: 0,
        lineHeight: 1.4, display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {task.title}
      </p>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: D.inkMuted, fontWeight: 600 }}>Tiến độ</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: p.color }}>{task.progress}%</span>
        </div>
        <div style={{ height: 6, background: '#dce6f4', borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc' }}>
          <div style={{ height: '100%', background: p.color, width: `${task.progress}%`, transition: 'width .4s' }} />
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {task.subTaskCount > 0 && (
            <span style={{ fontSize: 11, color: D.inkMuted, fontWeight: 600 }}>
              {task.subTaskCount} sub
            </span>
          )}
        </div>
        {deadlineStr && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
            borderRadius: 0, border: D.borderLight,
            background: isOverdue ? '#fee2e2' : '#f4f7fc',
            color: isOverdue ? D.red : D.inkMuted,
          }}>
            {deadlineStr}
          </span>
        )}
      </div>
    </div>
  )
}

function CircularProgress({ value, size = 88 }: { value: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - value / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dce6f4" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={D.indigo} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function MyTasksPage() {
  const { user } = useAuth()
  const { tasks, tasksLoading, reloadTasks, departmentId } = useTasks()

  const myTasks = useMemo(
    () => tasks.filter(t => t.assignedTo === user?.id),
    [tasks, user?.id],
  )

  const [activeTab, setActiveTab]     = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [modalOpen, setModalOpen]     = useState(false)
  const [columns, setColumns]         = useState<KanbanColumnItem[]>([])

  const clubId = myTasks[0]?.clubId ?? tasks[0]?.clubId ?? 0
  useEffect(() => {
    if (!clubId) return
    getKanbanColumns(clubId, undefined, departmentId).then(setColumns).catch(() => {})
  }, [clubId, departmentId])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total:   myTasks.length,
      doing:   myTasks.filter(t => t.status === "Doing").length,
      done:    myTasks.filter(t => t.status === "Done").length,
      overdue: myTasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== "Done").length,
    }
  }, [myTasks])

  const filteredTasks = useMemo(() => myTasks.filter(t => {
    const matchTab    = activeTab === "all" || t.status === activeTab
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchTab && matchSearch
  }), [myTasks, activeTab, searchQuery])

  const upcomingDeadline = useMemo(() =>
    myTasks
      .filter(t => t.deadline && t.status !== "Done")
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0],
    [myTasks],
  )

  const tabCounts: Record<string, number> = {
    all:   stats.total,
    Todo:  myTasks.filter(t => t.status === "Todo").length,
    Doing: stats.doing,
    Done:  stats.done,
  }

  const hour = new Date().getHours()
  const timeGreet = hour < 12 ? "buổi sáng" : hour < 18 ? "buổi chiều" : "buổi tối"
  const firstName = user?.fullName?.trim().split(" ").pop() ?? "bạn"

  function openTask(task: TaskItem) {
    setSelectedTask(task)
    setModalOpen(true)
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
          Chào {timeGreet}, {firstName}!
        </h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
          {tasksLoading ? "Đang tải công việc..." : "Hãy bắt đầu một ngày làm việc hiệu quả."}
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={ListTodo}      iconBg="#eef2ff" iconColor={D.indigo}   value={stats.total}  label="Tổng công việc" />
        <StatCard icon={Clock}         iconBg="#fef3c7" iconColor={D.amber}    value={stats.doing}  label="Đang thực hiện" />
        <StatCard
          icon={AlertTriangle} iconBg="#fee2e2" iconColor={D.red}
          value={stats.overdue} label="Quá hạn"
          trend={stats.overdue > 0 ? { value: "Cần chú ý", positive: false } : undefined}
        />
        <StatCard
          icon={CheckSquare} iconBg="#d1fae5" iconColor={D.emerald}
          value={stats.done} label="Hoàn thành"
          trend={stats.total > 0 ? { value: `${Math.round((stats.done / stats.total) * 100)}%`, positive: true } : undefined}
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px', borderRadius: D.radius,
        background: D.card, border: D.border, boxShadow: D.shadow(),
        display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap',
      }}>
        <input
          placeholder="⌕  Tìm công việc..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1, minWidth: 200, height: 36, borderRadius: 8,
            border: '1px solid #dce6f4', padding: '0 12px', fontSize: 13,
            color: D.ink, outline: 'none', background: D.bg,
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 12px', borderRadius: D.pill, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', border: D.border,
                  background: isActive ? D.ink : D.card,
                  color: isActive ? '#fff' : D.inkDim,
                  boxShadow: isActive ? 'none' : D.shadow(2, 2),
                }}
              >
                {tab.label} ({tabCounts[tab.key]})
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasksLoading ? (
            <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '56px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
              Đang tải...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '56px 0', textAlign: 'center', color: D.inkMuted }}>
              <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔍</p>
              <p style={{ fontSize: 13, margin: 0 }}>Không có công việc nào phù hợp</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskListCard key={task.id} task={task} onClick={() => openTask(task)} />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {upcomingDeadline && (
            <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '18px 20px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: D.inkDim, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} style={{ color: D.amber }} />
                Sắp đến hạn
              </h3>
              <div
                role="button"
                tabIndex={0}
                onClick={() => openTask(upcomingDeadline)}
                onKeyDown={e => e.key === "Enter" && openTask(upcomingDeadline)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 8, background: '#fee2e2',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, border: '1px solid #fecaca',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: D.red, lineHeight: 1 }}>
                    {new Date(upcomingDeadline.deadline!).getDate()}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171' }}>
                    Th{new Date(upcomingDeadline.deadline!).getMonth() + 1}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: '0 0 4px', lineHeight: 1.3 }}>
                    {upcomingDeadline.title}
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    background: '#fee2e2', color: D.red,
                    border: '1px solid #fecaca', borderRadius: 4,
                  }}>
                    {PRIORITY_CONFIG[upcomingDeadline.priority]?.label ?? 'Medium'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Progress ring */}
          {stats.total > 0 && (
            <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '18px 20px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: D.inkDim, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 16px' }}>
                Tiến độ cá nhân
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <CircularProgress value={Math.round((stats.done / stats.total) * 100)} size={88} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>
                      {Math.round((stats.done / stats.total) * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 26, fontWeight: 900, color: D.ink, margin: 0, letterSpacing: '-.02em' }}>
                    {stats.done}/{stats.total}
                  </p>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>Công việc hoàn thành</p>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.indigo, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: D.inkDim }}>{stats.doing} đang thực hiện</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Task detail modal ───────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          clubId={selectedTask.clubId}
          task={selectedTask}
          open={modalOpen}
          departmentId={departmentId}
          columns={columns}
          onClose={() => setModalOpen(false)}
          onSaved={async () => { setModalOpen(false); await reloadTasks() }}
        />
      )}
    </div>
  )
}
