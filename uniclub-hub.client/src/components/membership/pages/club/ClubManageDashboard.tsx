import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClubStats, getClubGrowth, getDepartments, getClubResignations } from '@/components/membership/services/clubApi'
import type { ClubStats, MonthlyGrowth, DepartmentItem } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import {
  StatCard, ChartCard, MiniAreaChart, MiniBarChart, MiniDonut,
  PageShell, DTag,
} from '@/components/shared/DashboardCharts'

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}
const ROLE_COLORS = ['#ff5a3c', '#f59e0b', '#4f46e5']
const DEPT_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#14b8a6', '#38bdf8']

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  ink: '#15131a',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  amber: '#f59e0b',
  emerald: '#10b981',
  red: '#ef4444',
  sky: '#38bdf8',
}

type AlertItem = { message: string; link: string; linkLabel: string }

function ActionItems({ items }: { items: AlertItem[] }) {
  const [open, setOpen] = useState(true)
  if (items.length === 0) return null
  return (
    <div style={{
      borderRadius: D.radius, overflow: 'hidden',
      border: '1.5px solid #fde68a', background: '#fef3c7', marginBottom: 20,
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px', background: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{ fontWeight: 700, color: '#92400e', fontSize: 13, flex: 1, textAlign: 'left' }}>
          {items.length} vấn đề cần xử lý
        </span>
        <span style={{ fontSize: 12, color: '#b45309' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #fde68a' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              padding: '10px 18px', borderBottom: i < items.length - 1 ? '1px solid #fde68a' : 'none',
            }}>
              <p style={{ fontSize: 13, color: '#92400e' }}>{item.message}</p>
              <Link to={item.link} style={{
                fontSize: 12, fontWeight: 700, color: '#b45309', textDecoration: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>{item.linkLabel} →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getClubShort(name: string) {
  return (name ?? '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase()
}

export default function ClubManageDashboard() {
  const { clubId } = useParams<{ clubId: string }>()
  const { user } = useAuth()
  const club = user?.memberships.find(m => m.clubId === Number(clubId))

  const [stats, setStats] = useState<ClubStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [depts, setDepts] = useState<DepartmentItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clubId) return
    const id = Number(clubId)
    Promise.all([getClubStats(id), getClubGrowth(id, 12), getDepartments(id), getClubResignations(id)])
      .then(([s, g, dpts, resignations]) => {
        setStats(s)
        setGrowth(g)
        setDepts(dpts)

        const items: AlertItem[] = []
        dpts.filter(d => !d.deptLeadName).forEach(d => items.push({
          message: `Ban "${d.name}" chưa có Trưởng ban`,
          link: `/clubs/${id}/manage/departments`,
          linkLabel: 'Bổ nhiệm',
        }))
        const pendingResign = resignations.filter(r => r.status === 'Pending')
        if (pendingResign.length > 0)
          items.push({ message: `${pendingResign.length} đơn từ chức đang chờ phê duyệt`, link: `/clubs/${id}/manage/resignations`, linkLabel: 'Xem đơn' })
        if (s.totalProbationMembers > 0)
          items.push({ message: `${s.totalProbationMembers} thành viên đang thử việc`, link: `/clubs/${id}/manage/members`, linkLabel: 'Xem danh sách' })
        if (s.applications.pending > 0)
          items.push({ message: `${s.applications.pending} đơn ứng tuyển đang chờ xét duyệt`, link: `/clubs/${id}/manage/applications`, linkLabel: 'Xét duyệt' })
        setAlerts(items)
      })
      .catch(() => setError('Không thể tải thống kê CLB.'))
      .finally(() => setLoading(false))
  }, [clubId])

  if (loading) return <PageShell><div style={{ padding: '60px 0', textAlign: 'center', color: D.inkMuted }}>Đang tải...</div></PageShell>
  if (error) return <PageShell><div style={{ padding: '60px 0', textAlign: 'center', color: D.red }}>{error}</div></PageShell>
  if (!stats) return null

  const totalNew = growth.reduce((s, g) => s + g.newMembers, 0)
  const growthData = growth.map(g => ({ month: g.label, val: g.newMembers }))

  const roleEntries = Object.entries(stats.membersByRole)
  const roleSegments = roleEntries.map(([, v], i) => ({ val: v, color: ROLE_COLORS[i % ROLE_COLORS.length] }))

  const deptBarData = stats.membersByDepartment.map(d => ({
    name: d.departmentName.length > 10 ? d.departmentName.slice(0, 8) + '…' : d.departmentName,
    val: d.memberCount,
  }))

  const appSegments = [
    { val: stats.applications.pending, color: D.amber },
    { val: stats.applications.interview, color: D.sky },
    { val: stats.applications.accepted, color: D.emerald },
    { val: stats.applications.rejected, color: D.red },
  ]

  return (
    <PageShell>
      {/* Club header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
        {club?.clubLogoUrl ? (
          <img src={club.clubLogoUrl} alt="" style={{
            width: 64, height: 64, borderRadius: 16, objectFit: 'cover',
            border: D.border, transform: 'rotate(-3deg)', flexShrink: 0,
            boxShadow: D.shadow(),
          }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 16, flexShrink: 0,
            background: '#4f46e5', border: D.border,
            display: 'grid', placeItems: 'center',
            color: '#fff', fontWeight: 900, fontSize: 24,
            transform: 'rotate(-3deg)', boxShadow: D.shadow(),
          }}>{getClubShort(stats.clubName)}</div>
        )}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>{stats.clubName}</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Tổng quan hoạt động câu lạc bộ</p>
        </div>
      </div>

      <ActionItems items={alerts} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon="◐" label="Thành viên chính thức" value={stats.totalActiveMembers}
          sub={stats.totalProbationMembers > 0 ? `+ ${stats.totalProbationMembers} thử việc` : undefined} color="#4f46e5" />
        <StatCard icon="▦" label="Ban bộ phận" value={stats.totalDepartments} color={D.emerald} />
        <StatCard icon="✦" label="Đơn chờ duyệt" value={stats.applications.pending} color={D.amber} />
        <StatCard icon="↗" label="TV mới (12 tháng)" value={totalNew} color="#7c3aed" />
      </div>

      {/* Growth chart */}
      <ChartCard
        title="Tăng trưởng thành viên" sub="12 tháng gần nhất"
        rightLabel={`${totalNew} thành viên mới`}
        style={{ marginBottom: 20 }}
      >
        <MiniAreaChart data={growthData} color="#4f46e5" height={140} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {growthData.map(g => (
            <span key={g.month} style={{ fontSize: 10, color: D.inkMuted, fontWeight: 600 }}>{g.month}</span>
          ))}
        </div>
      </ChartCard>

      {/* Row: Roles donut + Dept bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <ChartCard title="Thành viên theo vai trò">
          {roleEntries.length === 0 ? (
            <p style={{ textAlign: 'center', color: D.inkMuted, padding: '32px 0', fontSize: 13 }}>Chưa có dữ liệu.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <MiniDonut size={110} thickness={18} segments={roleSegments} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {roleEntries.map(([role, count], i) => (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 5, background: ROLE_COLORS[i % ROLE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: D.ink }}>{ROLE_LABELS[role] ?? role}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: ROLE_COLORS[i % ROLE_COLORS.length] }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Thành viên theo phòng ban">
          {deptBarData.length === 0 ? (
            <p style={{ textAlign: 'center', color: D.inkMuted, padding: '32px 0', fontSize: 13 }}>Chưa có dữ liệu.</p>
          ) : (
            <MiniBarChart data={deptBarData} color={i => DEPT_COLORS[i % DEPT_COLORS.length]} height={130} />
          )}
        </ChartCard>
      </div>

      {/* Application status */}
      {stats.applications.total > 0 && (
        <ChartCard title="Tình trạng đơn đăng ký" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <MiniDonut size={100} thickness={18} segments={appSegments.filter(s => s.val > 0)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
              {[
                { l: 'Chờ duyệt', v: stats.applications.pending, c: D.amber },
                { l: 'Phỏng vấn', v: stats.applications.interview, c: D.sky },
                { l: 'Đã duyệt', v: stats.applications.accepted, c: D.emerald },
                { l: 'Từ chối', v: stats.applications.rejected, c: D.red },
              ].map(item => (
                <div key={item.l} style={{ padding: '8px 10px', borderRadius: 8, background: D.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: item.c, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: D.inkMuted }}>{item.l}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.c, letterSpacing: '-.02em' }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      )}

      {/* Recent activity (static) */}
      {depts.length > 0 && (
        <ChartCard title="Cơ cấu ban bộ phận">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {depts.map((d, i) => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: D.bg, border: D.borderLight,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: DEPT_COLORS[i % DEPT_COLORS.length], border: D.border,
                  display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14,
                }}>▦</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: D.ink }}>{d.name}</div>
                  {d.deptLeadName
                    ? <div style={{ fontSize: 11.5, color: D.inkMuted }}>Trưởng ban: {d.deptLeadName}</div>
                    : <DTag bg="#fef3c7" color="#b45309" style={{ marginTop: 2 }}>Chưa có trưởng ban</DTag>
                  }
                </div>
                <DTag bg={D.bg} color={D.inkMuted} style={{ border: D.borderLight }}>
                  {d.memberCount} TV
                </DTag>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </PageShell>
  )
}
