import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard, Layers, Calendar, BarChart2, Activity,
  AlertTriangle, CheckSquare, Clock, ListTodo, Zap,
  Users, ArrowUpRight, Plus, ArrowRightLeft, Trash2,
} from "lucide-react";
import {
  getTasks, getSprints, getEvents, getAuditLogs,
} from "../services/operationsApi";
import type { SprintItem, EventItem, AuditLogItem } from "../services/operations.types";
import { useTasks } from "../context/TasksContext";
import StatCard from "../components/StatCard";
import { D } from '@/components/shared/managementTheme'

/* ── Design tokens ─────────────────────────────────────────────────────────── */

/* ── Nav cards ─────────────────────────────────────────────────────────────── */

const NAV_CARD_DEFS = [
  { label: "Kanban",    sub: "board",     icon: LayoutDashboard, color: D.indigo,  bg: "#eef2ff" },
  { label: "Sprints",   sub: "sprints",   icon: Layers,          color: "#7c3aed", bg: "#f5f3ff" },
  { label: "Sự kiện",   sub: "events",    icon: Calendar,        color: "#2563eb", bg: "#eff6ff" },
  { label: "Phân công", sub: "workload",  icon: BarChart2,       color: D.amber,   bg: "#fffbeb" },
  { label: "Gantt",     sub: "gantt",     icon: Activity,        color: "#0d9488", bg: "#f0fdfa" },
  { label: "Cảnh báo",  sub: "deadlines", icon: AlertTriangle,   color: D.red,     bg: "#fef2f2" },
]

const ACTION_ICON: Record<string, React.ReactNode> = {
  Create: <Plus size={13} style={{ color: D.emerald }} />,
  Update: <ArrowRightLeft size={13} style={{ color: '#2563eb' }} />,
  Delete: <Trash2 size={13} style={{ color: D.red }} />,
}
const ACTION_BG: Record<string, string> = {
  Create: '#d1fae5', Update: '#dbeafe', Delete: '#fee2e2',
}
const MODULE_LABEL: Record<string, string> = {
  Tasks: 'công việc', Events: 'sự kiện', Sprints: 'sprint',
}

const SPRINT_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  Planning:  { bg: '#eef2ff', color: D.indigo,  label: 'Lên kế hoạch' },
  Active:    { bg: '#d1fae5', color: '#065f46', label: 'Đang chạy' },
  Completed: { bg: '#f3f4f6', color: D.inkDim,  label: 'Hoàn thành' },
  Cancelled: { bg: '#fee2e2', color: D.red,      label: 'Đã hủy' },
}

const EVENT_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  Upcoming:   { bg: '#eef2ff', color: D.indigo,  label: 'Sắp diễn ra' },
  Ongoing:    { bg: '#d1fae5', color: '#065f46', label: 'Đang diễn ra' },
  Completed:  { bg: '#f3f4f6', color: D.inkDim,  label: 'Kết thúc' },
  Cancelled:  { bg: '#fee2e2', color: D.red,      label: 'Đã hủy' },
}

function formatLogTime(iso: string): string {
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (diffMin < 1) return "Vừa xong"
  if (diffMin < 60) return `${diffMin} phút trước`
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function OperationsDashboard() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()

  const [loading, setLoading] = useState(true)
  const [taskStats, setTaskStats] = useState({ total: 0, todo: 0, doing: 0, done: 0, overdue: 0 })
  const [activeSprint, setActiveSprint] = useState<SprintItem | null>(null)
  const [sprintTasks, setSprintTasks] = useState({ todo: 0, doing: 0, done: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([])
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getTasks({ clubId, departmentId, pageSize: 500 }),
      getSprints({ clubId, departmentId, pageSize: 20 }),
      getEvents({ clubId, pageSize: 20 }),
      getAuditLogs({ clubId, pageSize: 5 }),
    ])
      .then(([taskData, sprintData, eventData, auditData]) => {
        const tasks = taskData.items
        setTaskStats({
          total:   taskData.totalCount,
          todo:    tasks.filter(t => t.status === "Todo").length,
          doing:   tasks.filter(t => t.status === "Doing").length,
          done:    tasks.filter(t => t.status === "Done").length,
          overdue: tasks.filter(t => t.status !== "Done" && t.deadline && new Date(t.deadline) < new Date()).length,
        })
        const active = sprintData.items.find(s => s.status === "Active") ?? null
        setActiveSprint(active)
        if (active) {
          const sts = tasks.filter(t => t.sprintId === active.id)
          setSprintTasks({
            todo:  sts.filter(t => t.status === "Todo").length,
            doing: sts.filter(t => t.status === "Doing").length,
            done:  sts.filter(t => t.status === "Done").length,
          })
        }
        setUpcomingEvents(eventData.items.filter(e => e.status !== "Cancelled").slice(0, 3))
        setRecentLogs(auditData.items)
      })
      .catch(() => toast.error("Không thể tải dữ liệu"))
      .finally(() => setLoading(false))
  }, [clubId, departmentId])

  const withClub = (sub: string) => `/clubs/${clubId}?view=${sub}`

  const sprintTotal = sprintTasks.todo + sprintTasks.doing + sprintTasks.done
  const sprintProgress = sprintTotal > 0 ? Math.round((sprintTasks.done / sprintTotal) * 100) : 0
  const sprintBadge = activeSprint ? SPRINT_STATUS_BADGE[activeSprint.status] : null

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
          Tổng quan Câu lạc bộ
        </h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
          Theo dõi tiến độ công việc, sự kiện và hoạt động của câu lạc bộ trong thời gian thực.
        </p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20, height: 120 }} />
          ))
        ) : (
          <>
            <StatCard icon={ListTodo}     iconBg="#eef2ff" iconColor={D.indigo}  value={taskStats.total}  label="Tổng công việc" />
            <StatCard icon={Clock}        iconBg="#fef3c7" iconColor={D.amber}   value={taskStats.doing}  label="Đang thực hiện" />
            <StatCard icon={CheckSquare}  iconBg="#d1fae5" iconColor={D.emerald} value={taskStats.done}   label="Hoàn thành"
              trend={{ value: `${taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0}%`, positive: true }} />
            <StatCard icon={AlertTriangle} iconBg="#fee2e2" iconColor={D.red}    value={taskStats.overdue} label="Quá hạn"
              trend={taskStats.overdue > 0 ? { value: `${taskStats.overdue}`, positive: false } : undefined} />
          </>
        )}
      </div>

      {/* ── Overdue alert ────────────────────────────────────────────── */}
      {!loading && taskStats.overdue > 0 && (
        <div
          onClick={() => navigate(withClub("deadlines"))}
          style={{
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', background: '#fee2e2',
            border: '1.5px solid #fca5a5', borderRadius: D.radius,
            boxShadow: D.shadow(2, 2), cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fecaca'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fee2e2'}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={16} style={{ color: D.red }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', flex: 1, margin: 0 }}>
            <strong>{taskStats.overdue}</strong> công việc đã quá hạn — nhấn để xem chi tiết
          </p>
          <ArrowUpRight size={16} style={{ color: '#f87171', flexShrink: 0 }} />
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Active Sprint */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Zap size={16} style={{ color: D.amber }} />
              Sprint đang chạy
            </h2>
            <button type="button" onClick={() => navigate(withClub("sprints"))}
              style={{ fontSize: 12, fontWeight: 600, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>

          {loading ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
          ) : !activeSprint ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic' }}>Không có sprint nào đang chạy</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {sprintBadge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    border: D.borderLight, borderRadius: 0,
                    background: sprintBadge.bg, color: sprintBadge.color,
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>
                    {sprintBadge.label}
                  </span>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 900, color: D.ink, margin: 0 }}>{activeSprint.name}</h3>
              </div>
              {activeSprint.goal && (
                <p style={{ fontSize: 13, color: D.inkMuted, marginBottom: 16, margin: '4px 0 16px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {activeSprint.goal}
                </p>
              )}
              <div style={{ background: D.bg, borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: D.borderLight }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: D.inkMuted }}>{activeSprint.taskCount} công việc</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: D.indigo }}>{sprintProgress}%</span>
                </div>
                <div style={{ height: 8, background: '#dce6f4', borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc' }}>
                  <div style={{ height: '100%', background: D.indigo, width: `${sprintProgress}%`, transition: 'width .4s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {([
                  { label: 'Chưa làm',   count: sprintTasks.todo,  dot: D.inkMuted },
                  { label: 'Đang làm',   count: sprintTasks.doing, dot: D.amber },
                  { label: 'Hoàn thành', count: sprintTasks.done,  dot: D.emerald },
                ] as const).map(({ label, count, dot }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: D.inkMuted }}>
                      {label}: <strong style={{ color: D.ink }}>{count}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Activity size={16} style={{ color: '#2563eb' }} />
              Nhật ký hoạt động
            </h2>
            <button type="button" onClick={() => navigate(withClub("activity"))}
              style={{ fontSize: 12, fontWeight: 600, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
            ) : recentLogs.length === 0 ? (
              <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Chưa có hoạt động nào</p>
            ) : recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: ACTION_BG[log.action] ?? D.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: D.borderLight, marginTop: 2,
                }}>
                  {ACTION_ICON[log.action]}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 12, color: D.inkDim, lineHeight: 1.4, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    <strong style={{ fontWeight: 700, color: D.ink }}>{log.userName}</strong>
                    {' '}{log.action === "Create" ? "tạo" : log.action === "Delete" ? "xóa" : "cập nhật"}{' '}
                    {MODULE_LABEL[log.module] ?? log.module}
                    {log.entityTitle && (
                      <span style={{ fontWeight: 600, color: D.indigo }}> "{log.entityTitle}"</span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>{formatLogTime(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upcoming Events ──────────────────────────────────────────── */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Calendar size={16} style={{ color: '#2563eb' }} />
            Sự kiện sắp tới
          </h2>
          <button type="button" onClick={() => navigate(withClub("events"))}
            style={{ fontSize: 12, fontWeight: 600, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            Xem tất cả <ArrowUpRight size={12} />
          </button>
        </div>
        {loading ? (
          <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
        ) : upcomingEvents.length === 0 ? (
          <p style={{ fontSize: 13, color: D.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Không có sự kiện sắp tới</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {upcomingEvents.map(ev => {
              const evBadge = EVENT_STATUS_BADGE[ev.status] ?? EVENT_STATUS_BADGE.Upcoming
              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/clubs/${clubId}/events/${ev.id}`)}
                  style={{
                    padding: '14px 16px', borderRadius: D.radius,
                    border: D.border, background: D.bg, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = D.shadow(3, 3); (e.currentTarget as HTMLElement).style.background = D.card }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.background = D.bg }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', border: D.borderLight,
                      borderRadius: 0, background: evBadge.bg, color: evBadge.color,
                      textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>
                      {evBadge.label}
                    </span>
                    <ArrowUpRight size={13} style={{ color: D.inkMuted }} />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: D.ink, marginBottom: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {ev.name}
                  </h3>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '0 0 6px' }}>
                    {ev.startTime
                      ? new Date(ev.startTime).toLocaleDateString("vi-VN", { day: "2-digit", month: "long" })
                      : "Chưa có ngày"}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} style={{ color: D.inkMuted }} />
                    <span style={{ fontSize: 11, color: D.inkMuted }}>{ev.participantCount} người tham gia</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Nav Grid ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {NAV_CARD_DEFS.map(({ label, sub, icon: Icon, color, bg }) => (
          <button
            key={sub}
            type="button"
            onClick={() => navigate(withClub(sub))}
            style={{
              background: D.card, border: D.border, borderRadius: D.radius,
              boxShadow: D.shadow(3, 3), padding: '16px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s, box-shadow .12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.shadow(5, 5) }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.shadow(3, 3) }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: D.borderLight }}>
              <Icon size={20} style={{ color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.inkDim }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
