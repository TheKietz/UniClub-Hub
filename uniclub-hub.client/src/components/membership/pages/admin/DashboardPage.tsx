import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSystemStats, getSystemGrowth, getAdminClubs } from '@/components/membership/services/adminApi'
import { getAdminResignations } from '@/components/membership/services/clubApi'
import type { SystemStats, MonthlyGrowth } from '@/components/membership/services/admin.types'
import {
  StatCard, ChartCard, MiniAreaChart, MiniBarChart, MiniDonut,
  PageShell, PageHeader, DTag,
} from '@/components/shared/DashboardCharts'

const BAR_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#38bdf8', '#14b8a6', '#ff5a3c']
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
      border: `1.5px solid #fde68a`, background: '#fef3c7',
      marginBottom: 20,
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

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getSystemStats(), getSystemGrowth(12), getAdminClubs(), getAdminResignations()])
      .then(([s, g, clubs, resignations]) => {
        setStats(s)
        setGrowth(g)
        const items: AlertItem[] = []
        clubs.filter(c => !c.hasAdmin && c.status === 'Active').forEach(c => {
          items.push({ message: `CLB "${c.name}" chưa có Trưởng CLB`, link: '/admin/structure', linkLabel: 'Bổ nhiệm' })
        })
        const pendingResignations = resignations.filter(r => r.status === 'Pending')
        if (pendingResignations.length > 0)
          items.push({ message: `${pendingResignations.length} đơn từ chức Trưởng CLB đang chờ phê duyệt`, link: '/admin/resignations', linkLabel: 'Xem đơn' })
        setAlerts(items)
      })
      .catch(() => setError('Không thể tải dữ liệu thống kê.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <PageShell>
      <div style={{ padding: '60px 0', textAlign: 'center', color: D.inkMuted, fontSize: 15 }}>Đang tải...</div>
    </PageShell>
  )
  if (error) return (
    <PageShell>
      <div style={{ padding: '60px 0', textAlign: 'center', color: D.red, fontSize: 15 }}>{error}</div>
    </PageShell>
  )
  if (!stats) return null

  const activeRate = stats.totalClubs > 0 ? Math.round((stats.activeClubs / stats.totalClubs) * 100) : 0
  const totalNew = growth.reduce((s, g) => s + g.newMembers, 0)

  const growthData = growth.map(g => ({ month: g.label, val: g.newMembers }))
  const categoryData = stats.clubsByCategory.map(c => ({
    name: c.categoryName.length > 10 ? c.categoryName.slice(0, 8) + '…' : c.categoryName,
    val: c.clubCount,
  }))
  const topClubs = stats.topClubsByMembers.slice(0, 5)

  const appSegments = [
    { val: stats.applications.pending, color: D.amber },
    { val: stats.applications.interview, color: D.sky },
    { val: stats.applications.accepted, color: D.emerald },
    { val: stats.applications.rejected, color: D.red },
  ]

  return (
    <PageShell>
      <PageHeader title="Tổng quan hệ thống" sub="Thống kê toàn bộ hệ thống câu lạc bộ" />

      <ActionItems items={alerts} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon="◐" label="Người dùng" value={stats.totalUsers.toLocaleString()} color="#4f46e5" />
        <StatCard icon="▦" label="Câu lạc bộ" value={stats.totalClubs}
          sub={`${stats.activeClubs} hoạt động (${activeRate}%)`} color={D.emerald} />
        <StatCard icon="◇" label="Thành viên" value={stats.totalActiveMembers.toLocaleString()}
          sub={stats.totalProbationMembers > 0 ? `+ ${stats.totalProbationMembers} thử việc` : undefined} color="#7c3aed" />
        <StatCard icon="✦" label="Đơn đăng ký" value={stats.applications.total}
          sub={`${stats.applications.pending} đang chờ`} color={D.amber} />
      </div>

      {/* Growth area chart */}
      <ChartCard
        title="Tăng trưởng thành viên"
        sub="12 tháng gần nhất"
        rightLabel={`${totalNew} thành viên mới`}
        style={{ marginBottom: 20 }}
      >
        <MiniAreaChart data={growthData} color="#4f46e5" height={160} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {growthData.map(g => (
            <span key={g.month} style={{ fontSize: 10, color: D.inkMuted, fontWeight: 600 }}>{g.month}</span>
          ))}
        </div>
      </ChartCard>

      {/* Row: Donut + Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <ChartCard title="Tình trạng đơn đăng ký">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <MiniDonut size={120} thickness={20} segments={appSegments} />
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
                  <div style={{ fontSize: 20, fontWeight: 800, color: item.c, letterSpacing: '-.02em' }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="CLB theo lĩnh vực">
          {categoryData.length === 0 ? (
            <p style={{ textAlign: 'center', color: D.inkMuted, padding: '32px 0', fontSize: 13 }}>Chưa có dữ liệu.</p>
          ) : (
            <MiniBarChart data={categoryData} color={i => BAR_COLORS[i % BAR_COLORS.length]} height={140} />
          )}
        </ChartCard>
      </div>

      {/* Top clubs ranking */}
      {topClubs.length > 0 && (
        <ChartCard title="Top CLB nhiều thành viên nhất">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topClubs.map((c, i) => {
              const pct = (c.memberCount / topClubs[0].memberCount) * 100
              return (
                <div key={c.clubName} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 22, fontSize: 12, fontWeight: 800, color: D.inkMuted, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: D.ink }}>{c.clubName}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>{c.memberCount}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: D.bg, overflow: 'hidden', border: D.borderLight }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: BAR_COLORS[i % BAR_COLORS.length], transition: 'width .5s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      )}

      {/* App stats summary row */}
      <div style={{ marginTop: 20 }}>
        <DTag bg="#f7f6f1" color="#918c99" style={{ border: D.borderLight, fontSize: 11 }}>
          Tổng đơn: {stats.applications.total} · Tỷ lệ duyệt: {stats.applications.total > 0
            ? Math.round((stats.applications.accepted / stats.applications.total) * 100) : 0}%
        </DTag>
      </div>
    </PageShell>
  )
}
