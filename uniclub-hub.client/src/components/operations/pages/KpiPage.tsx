import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import {
  RefreshCw, Award, CheckCircle, AlertTriangle, Zap, Clock, ListTodo,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import AvatarGroup from '../../shared/AvatarGroup'
import { useAuth } from '@/contexts/AuthContext'
import { useTasks } from '../context/TasksContext'
import { getPersonalKpi, getDepartmentKpi, getSprints } from '../services/operationsApi'
import { CLUB_ROLES } from '@/types/auth'
import type { PersonalKpiData, DepartmentKpiData, SprintItem } from '../services/operations.types'

/* ── Design tokens ────────────────────────────────────────────────────────── */

const D = {
  border: '1.5px solid var(--c-ink)',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  pill: 999,
  ink: 'var(--c-ink)',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: 'var(--c-bg)',
  card: '#ffffff',
  indigo: '#4f46e5',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  violet: '#7c3aed',
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 10) return D.emerald
  if (score >= 5) return D.indigo
  if (score >= 2) return D.amber
  return D.inkMuted
}

function CircularProgress({ value, size = 80, color = D.indigo }: { value: number; size?: number; color?: string }) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - value / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e3d6" strokeWidth={7} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function RateRing({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <CircularProgress value={value} size={76} color={color} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: D.ink }}>{value}%</span>
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

const PIE_COLORS: Record<string, string> = {
  'Chưa làm': '#e8e3d6',
  'Đang làm': '#dbeafe',
  'Hoàn thành': D.emerald,
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '8px 12px', fontSize: 12 }}>
      <p style={{ fontWeight: 800, color: D.ink, margin: 0 }}>{payload[0].name}: <span style={{ color: D.indigo }}>{payload[0].value}</span></p>
    </div>
  )
}

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '10px 14px', fontSize: 12 }}>
      <p style={{ fontWeight: 800, color: D.ink, margin: '0 0 4px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill, margin: '2px 0', fontWeight: 700 }}>
          {p.name}: {p.value}h
        </p>
      ))}
    </div>
  )
}

/* ── Personal KPI section ─────────────────────────────────────────────────── */

function PersonalSection({ kpi }: { kpi: PersonalKpiData }) {
  const pieData = [
    { name: 'Chưa làm', value: kpi.todoTasks },
    { name: 'Đang làm', value: kpi.doingTasks },
    { name: 'Hoàn thành', value: kpi.completedTasks },
  ].filter(d => d.value > 0)

  const hasHours = kpi.totalEstimatedHours != null || kpi.totalActualHours != null
  const hoursData = hasHours ? [
    {
      name: 'Giờ',
      'Dự kiến': Math.round((kpi.totalEstimatedHours ?? 0) * 10) / 10,
      'Thực tế': Math.round((kpi.totalActualHours ?? 0) * 10) / 10,
    },
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard icon={ListTodo} iconBg="#eef2ff" iconColor={D.indigo} value={kpi.totalTasks} label="Tổng công việc" />
        <StatCard icon={CheckCircle} iconBg="#d1fae5" iconColor={D.emerald} value={kpi.completedTasks} label="Đã hoàn thành"
          trend={kpi.totalTasks > 0 ? { value: `${kpi.completionRate}%`, positive: true } : undefined} />
        <StatCard icon={AlertTriangle} iconBg="#fee2e2" iconColor={D.red} value={kpi.overdueTasks} label="Hoàn thành trễ"
          trend={kpi.overdueTasks > 0 ? { value: 'Cần cải thiện', positive: false } : undefined} />
        <StatCard icon={Award} iconBg="#ede9fe" iconColor={D.violet} value={kpi.productivityScore} label="Điểm năng suất"
          subtitle="High×3 Med×2 Low×1" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: hasHours ? '1fr 1fr 260px' : '1fr 260px', gap: 16 }}>

        {/* Pie chart — status breakdown */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: '0 0 16px' }}>Phân bổ trạng thái</h3>
          {pieData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: D.inkMuted, fontSize: 13 }}>Chưa có công việc nào</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} strokeWidth={1.5} stroke="var(--c-ink)">
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? D.inkMuted} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend iconType="circle" iconSize={10} formatter={(v: string) => <span style={{ fontSize: 11, color: D.inkDim, fontWeight: 700 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart — estimated vs actual hours */}
        {hasHours && (
          <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: '0 0 16px' }}>Giờ dự kiến vs thực tế</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hoursData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e3d6" />
                <XAxis dataKey="name" hide />
                <YAxis tick={{ fontSize: 11, fill: D.inkMuted }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: D.bg }} />
                <Bar dataKey="Dự kiến" fill={D.indigo} radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Thực tế" fill={D.amber} radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
              {[{ color: D.indigo, label: 'Dự kiến' }, { color: D.amber, label: 'Thực tế' }].map(({ color, label }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkDim, fontWeight: 700 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />{label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rate rings */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, alignSelf: 'flex-start' }}>Chỉ số hiệu suất</h3>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            <RateRing value={kpi.completionRate} label="Hoàn thành" color={D.emerald} />
            <RateRing value={kpi.onTimeRate} label="Đúng hạn" color={D.indigo} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
            {[
              { label: 'Cao', value: kpi.highPriorityTasks, color: D.red },
              { label: 'Vừa', value: kpi.mediumPriorityTasks, color: D.amber },
              { label: 'Thấp', value: kpi.lowPriorityTasks, color: D.emerald },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: D.bg, border: D.borderLight }}>
                <p style={{ fontSize: 16, fontWeight: 900, color, margin: 0 }}>{value}</p>
                <p style={{ fontSize: 10, color: D.inkMuted, fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Department KPI section ───────────────────────────────────────────────── */

function DepartmentSection({ kpi }: { kpi: DepartmentKpiData }) {
  const chartData = kpi.members.map(m => ({
    name: m.fullName || m.userId.slice(0, 8),
    score: m.productivityScore,
    rate: m.completionRate,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={16} style={{ color: D.amber }} />
        KPI Ban — {kpi.departmentName}
      </h2>

      {/* Dept stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard icon={ListTodo} iconBg="#eef2ff" iconColor={D.indigo} value={kpi.totalTasks} label="Tổng task ban" />
        <StatCard icon={CheckCircle} iconBg="#d1fae5" iconColor={D.emerald} value={kpi.completedTasks} label="Đã hoàn thành"
          trend={{ value: `${kpi.deptCompletionRate}%`, positive: true }} />
        <StatCard icon={Clock} iconBg="#fef3c7" iconColor={D.amber} value={kpi.members.length} label="Thành viên" />
      </div>

      {/* Chart + table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Productivity score bar chart */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: '0 0 16px' }}>Điểm năng suất thành viên</h3>
          {chartData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: D.inkMuted, fontSize: 13 }}>Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 48, 160)}>
              <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 32, left: 8, bottom: 4 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8e3d6" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: D.inkMuted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: D.inkDim }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '10px 14px', fontSize: 12 }}>
                      <p style={{ fontWeight: 800, color: D.ink, margin: '0 0 4px' }}>{label}</p>
                      <p style={{ margin: 0, color: D.indigo }}>Điểm: <strong>{payload[0].value}</strong></p>
                    </div>
                  )
                }} cursor={{ fill: D.bg }} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map(row => <Cell key={row.name} fill={scoreColor(row.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leaderboard table */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: D.borderLight }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0 }}>Bảng xếp hạng</h3>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 340 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: D.bg }}>
                  {['#', 'Thành viên', 'Xong', 'Đúng hạn', 'Điểm'].map((h, i) => (
                    <th key={h} style={{
                      padding: '8px 12px', fontSize: 10, fontWeight: 800, color: D.inkMuted,
                      textTransform: 'uppercase', letterSpacing: '.06em',
                      textAlign: i === 0 ? 'center' : i >= 2 ? 'right' : 'left',
                      borderBottom: D.borderLight,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpi.members.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Chưa có thành viên</td>
                  </tr>
                ) : (
                  kpi.members.map((m, idx) => {
                    const rank = idx + 1
                    const medalColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : D.inkMuted
                    return (
                      <tr key={m.userId} style={{ borderBottom: D.borderLight }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: medalColor }}>
                            {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AvatarGroup avatars={[{ name: m.fullName || m.userId }]} max={1} size="sm" />
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: D.ink, margin: 0 }}>{m.fullName || m.userId}</p>
                              <p style={{ fontSize: 10, color: D.inkMuted, margin: 0 }}>{m.totalTasks} task</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: D.emerald }}>{m.completionRate}%</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: m.onTimeRate >= 80 ? D.emerald : m.onTimeRate >= 50 ? D.amber : D.red }}>
                            {m.onTimeRate}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 900, padding: '2px 8px',
                            borderRadius: 4, background: '#ede9fe', color: D.violet,
                          }}>
                            {m.productivityScore}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function KpiPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 0)
  const { user, getClubRole } = useAuth()
  const { departmentId } = useTasks()

  const clubRole = getClubRole(clubId)
  const canViewDept = clubRole === CLUB_ROLES.CLUB_ADMIN || clubRole === CLUB_ROLES.DEPT_LEAD

  const [personalKpi, setPersonalKpi] = useState<PersonalKpiData | null>(null)
  const [deptKpi, setDeptKpi] = useState<DepartmentKpiData | null>(null)
  const [sprints, setSprints] = useState<SprintItem[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !clubId) return
    setLoading(true)
    try {
      const personalPromise = getPersonalKpi({ clubId, departmentId, sprintId: selectedSprintId })
      const deptPromise = (canViewDept && departmentId)
        ? getDepartmentKpi(departmentId, { clubId, sprintId: selectedSprintId })
        : Promise.resolve(null)

      const [personal, dept] = await Promise.all([personalPromise, deptPromise])
      setPersonalKpi(personal)
      setDeptKpi(dept)
    } catch {
      toast.error('Không thể tải dữ liệu KPI')
    } finally {
      setLoading(false)
    }
  }, [user, clubId, departmentId, selectedSprintId, canViewDept])

  useEffect(() => {
    if (!clubId) return
    getSprints({ clubId, departmentId, pageSize: 50 })
      .then(r => setSprints(r.items))
      .catch(() => {})
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

  const outlineBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    background: D.card, color: D.inkDim, border: D.border,
    boxShadow: D.shadow(2, 2), padding: '7px 14px',
    borderRadius: D.pill, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
            Báo cáo KPI
          </h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            Theo dõi hiệu suất và điểm năng suất công việc
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {sprints.length > 0 && (
            <select
              value={selectedSprintId ?? ''}
              onChange={e => setSelectedSprintId(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                height: 36, padding: '0 12px', fontSize: 12, fontWeight: 700,
                border: D.border, borderRadius: D.pill, background: D.card,
                color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: D.shadow(2, 2), outline: 'none',
              }}
            >
              <option value="">Tất cả sprint</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={load} disabled={loading} style={{ ...outlineBtnStyle, padding: '7px 12px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {loading && !personalKpi ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: D.inkMuted, fontSize: 13 }}>
          Đang tải dữ liệu KPI...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Personal section */}
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: D.ink, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} style={{ color: D.indigo }} />
              KPI của tôi {personalKpi?.fullName ? `— ${personalKpi.fullName}` : ''}
            </h2>
            {personalKpi ? (
              <PersonalSection kpi={personalKpi} />
            ) : (
              <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '48px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
                Không có dữ liệu
              </div>
            )}
          </section>

          {/* Department section — DEPT_LEAD / CLUB_ADMIN only */}
          {canViewDept && deptKpi && (
            <section>
              <DepartmentSection kpi={deptKpi} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
