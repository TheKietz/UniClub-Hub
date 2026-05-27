import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, AlertTriangle, Users, Activity, Download, SlidersHorizontal, ArrowRight, CheckCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import StatCard from '../components/StatCard'
import AvatarGroup from '../../shared/AvatarGroup'
import { getTasks } from '../services/operationsApi'
import { useTasks } from '../context/TasksContext'
import type { TaskItem } from '../services/operations.types'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  indigo: '#4f46e5',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
}

/* ─── Logic ──────────────────────────────────────────────────────────────── */

const OVERLOAD_THRESHOLD = 5

type Capacity = 'Quá tải' | 'Bình thường' | 'Sẵn sàng'

const CAPACITY_CONFIG: Record<Capacity, { bg: string; color: string; bar: string; actionBg: string; actionColor: string; action: string }> = {
  'Quá tải':    { bg: '#fee2e2', color: D.red,    bar: D.red,    actionBg: '#fee2e2', actionColor: D.red,    action: 'Điều chuyển' },
  'Bình thường':{ bg: '#fef3c7', color: '#92400e', bar: D.amber,  actionBg: D.bg,     actionColor: D.inkDim, action: 'Xem chi tiết' },
  'Sẵn sàng':  { bg: '#d1fae5', color: '#065f46', bar: D.emerald, actionBg: '#d1fae5', actionColor: '#065f46', action: '+Giao task' },
}

const MOCK_DEPTS = ['Ban Nội dung', 'Ban Kỹ thuật', 'Ban Truyền thông', 'Ban Sự kiện']
function getDept(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return MOCK_DEPTS[Math.abs(h) % MOCK_DEPTS.length]
}
function getCapacity(active: number): Capacity {
  if (active > OVERLOAD_THRESHOLD) return 'Quá tải'
  if (active >= 2) return 'Bình thường'
  return 'Sẵn sàng'
}

interface WorkloadRow { name: string; active: number; done: number; capacity: Capacity; dept: string }

function buildWorkload(tasks: TaskItem[]): WorkloadRow[] {
  const map = new Map<string, { active: number; done: number }>()
  for (const t of tasks) {
    if (!t.assigneeName) continue
    if (!map.has(t.assigneeName)) map.set(t.assigneeName, { active: 0, done: 0 })
    const row = map.get(t.assigneeName)!
    if (t.status === 'Done') row.done++; else row.active++
  }
  return Array.from(map.entries())
    .map(([name, counts]) => ({ name, active: counts.active, done: counts.done, capacity: getCapacity(counts.active), dept: getDept(name) }))
    .sort((a, b) => b.active - a.active)
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '10px 14px', fontSize: 12 }}>
      <p style={{ fontWeight: 800, color: D.ink, margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: D.inkDim, margin: 0 }}>
        Task đang chạy: <span style={{ fontWeight: 900, color: D.ink }}>{payload[0].value}</span>
      </p>
      {payload[0].value > OVERLOAD_THRESHOLD && (
        <p style={{ color: D.red, fontSize: 11, margin: '4px 0 0', fontWeight: 700 }}>Vượt ngưỡng {OVERLOAD_THRESHOLD} task</p>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function WorkloadPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 1)
  const { departmentId } = useTasks()

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { const result = await getTasks({ clubId, departmentId, pageSize: 500 }); setTasks(result.items) }
    catch { toast.error('Không thể tải dữ liệu công việc') }
    finally { setLoading(false) }
  }, [clubId, departmentId])

  useEffect(() => { load() }, [load])

  const data = buildWorkload(tasks)
  const activeTasks = tasks.filter(t => t.status !== 'Done').length
  const members = data
  const avgPerPerson = members.length ? (activeTasks / members.length).toFixed(1) : '0'
  const overloaded = data.filter(r => r.capacity === 'Quá tải')
  const available  = data.filter(r => r.capacity === 'Sẵn sàng')
  const barHeight  = Math.max(data.length * 52, 200)

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
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Phân bổ Công việc</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Theo dõi khối lượng và phát hiện thành viên quá tải để điều phối lại nhân sự</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" style={outlineBtnStyle}><SlidersHorizontal size={13} /> Lọc phòng ban</button>
          <button type="button" style={outlineBtnStyle}><Download size={13} /> Xuất báo cáo</button>
          <button type="button" onClick={load} disabled={loading} title="Làm mới" style={{ ...outlineBtnStyle, padding: '7px 12px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={Activity} iconBg="#ede9fe" iconColor="#7c3aed" value={activeTasks} label="Tổng Task Đang Chạy" trend={{ value: '+12%', positive: true }} />
        <StatCard icon={Users} iconBg="#dbeafe" iconColor="#2563eb" value={avgPerPerson} label="Trung Bình Task / Người" subtitle={`${members.length} thành viên có việc`} />
        <StatCard icon={AlertTriangle} iconBg="#fee2e2" iconColor="#dc2626" value={overloaded.length} label={`Cảnh Báo Quá Tải >${OVERLOAD_THRESHOLD} Tasks`} trend={overloaded.length > 0 ? { value: 'Cần xử lý', positive: false } : undefined} />
      </div>

      {/* Chart + suggestions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Bar chart */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, margin: 0 }}>Khối lượng công việc đang chạy</h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: D.inkMuted }}>
              <span style={{ display: 'inline-block', width: 20, borderTop: `2px dashed ${D.red}` }} />
              Ngưỡng quá tải ({OVERLOAD_THRESHOLD} task)
            </span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
          ) : data.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: D.inkMuted, fontSize: 13 }}>Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8e3d6" />
                <XAxis type="number" allowDecimals={false} domain={[0, 'dataMax + 2']} tick={{ fontSize: 11, fill: D.inkMuted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: D.inkDim }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: D.bg }} />
                <ReferenceLine x={OVERLOAD_THRESHOLD} stroke={D.red} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="active" radius={[0, 4, 4, 0]}>
                  {data.map(row => <Cell key={row.name} fill={CAPACITY_CONFIG[row.capacity].bar} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Suggestions */}
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, margin: '0 0 12px' }}>Gợi ý Điều chỉnh</h2>
          {overloaded.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: D.inkMuted, padding: '32px 0', gap: 8 }}>
              <CheckCircle size={32} style={{ color: D.emerald }} />
              <p style={{ fontSize: 13, margin: 0 }}>Không có thành viên quá tải</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              {overloaded.map((member, idx) => {
                const target = available[idx % Math.max(available.length, 1)]
                return (
                  <div key={member.name} style={{ borderRadius: 10, border: '1px solid #fca5a5', background: '#fee2e2', padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <AvatarGroup avatars={[{ name: member.name }]} max={1} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
                        <p style={{ fontSize: 10, color: D.red, margin: 0 }}>{member.active} task đang chạy</p>
                      </div>
                    </div>
                    {available.length > 0 && target && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkMuted, flexWrap: 'wrap' }}>
                        <span>Điều chuyển sang</span>
                        <ArrowRight size={10} />
                        <span style={{ fontWeight: 700, color: D.emerald }}>{target.name}</span>
                        <span>({target.active} task)</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Member table */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: D.borderLight }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: D.ink, margin: 0 }}>Chi tiết thành viên</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.bg }}>
                {['Thành viên', 'Phòng ban', 'Task đang chạy', 'Tình trạng', 'Thao tác'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted,
                    textTransform: 'uppercase', letterSpacing: '.06em', textAlign: i >= 2 ? 'center' : 'left',
                    borderBottom: D.borderLight,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => {
                const cfg = CAPACITY_CONFIG[row.capacity]
                return (
                  <tr key={row.name} style={{ borderBottom: D.borderLight }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AvatarGroup avatars={[{ name: row.name }]} max={1} size="md" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{row.name}</p>
                          <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>{row.done} task hoàn thành</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: D.inkDim, fontSize: 13 }}>{row.dept}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>{row.active}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: D.pill, background: cfg.bg, color: cfg.color, border: '1px solid currentColor' }}>
                        {row.capacity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button type="button" style={{
                        fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
                        background: cfg.actionBg, color: cfg.actionColor,
                        border: `1px solid ${cfg.color}`, cursor: 'pointer',
                      }}>
                        {cfg.action}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
                    {loading ? 'Đang tải...' : 'Chưa có dữ liệu thành viên'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
