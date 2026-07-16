import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSystemStats, getSystemGrowth, getAdminClubs } from '@/components/membership/services/adminApi'
import { getAdminResignations } from '@/components/membership/services/clubApi'
import type { SystemStats, MonthlyGrowth } from '@/components/membership/services/admin.types'
import {
  StatCard, ChartCard, MiniAreaChart, MiniBarChart, MiniDonut,
  PageShell, PageHeader, DTag,
} from '@/components/shared/DashboardCharts'
import { exportDashboardPdf } from '@/lib/pdfExport'
import { D } from '@/components/shared/managementTheme'
import { toast } from 'sonner'

const BAR_COLORS = ['#1d4ed8', '#7c3aed', '#ec4899', '#38bdf8', '#14b8a6', '#ff5a3c']
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

const MONTH_OPTIONS = [
  { value: 3, label: '3 tháng' },
  { value: 6, label: '6 tháng' },
  { value: 12, label: '12 tháng' },
  { value: 24, label: '24 tháng' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState(12)
  const [approvedResignCount, setApprovedResignCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      getSystemStats(),
      getAdminClubs(),
      getAdminResignations({ status: 'Approved', page: 1, pageSize: 1 }),
      getAdminResignations({ status: 'Pending', page: 1, pageSize: 1 }),
    ])
      .then(([s, clubs, approved, pending]) => {
        setStats(s)
        setApprovedResignCount(approved.totalCount)
        const items: AlertItem[] = []
        clubs.filter(c => !c.hasAdmin && c.status === 'Active').forEach(c => {
          items.push({ message: `CLB "${c.name}" chưa có Trưởng CLB`, link: '/admin/clubs', linkLabel: 'Bổ nhiệm' })
        })
        if (pending.totalCount > 0)
          items.push({ message: `${pending.totalCount} đơn từ chức Trưởng CLB đang chờ phê duyệt`, link: '/admin/resignations', linkLabel: 'Xem đơn' })
        setAlerts(items)
      })
      .catch(() => setError('Không thể tải dữ liệu thống kê.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getSystemGrowth(months).then(setGrowth).catch(() => {})
  }, [months])

  async function handleExportPdf() {
    if (!contentRef.current) return
    setExporting(true)
    try {
      const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')
      await exportDashboardPdf(contentRef.current, `bao-cao-he-thong-${date}.pdf`)
    } catch {
      toast.error('Không thể xuất PDF. Vui lòng thử lại.')
    } finally {
      setExporting(false)
    }
  }

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

  const reviewedApps = stats.applications.accepted + stats.applications.rejected
  const acceptanceRate = reviewedApps > 0 ? Math.round(stats.applications.accepted / reviewedApps * 100) : null
  const totalHistorical = stats.totalActiveMembers + stats.totalProbationMembers + approvedResignCount
  const retentionRate = totalHistorical > 0
    ? Math.round((stats.totalActiveMembers + stats.totalProbationMembers) / totalHistorical * 100) : null
  const categoryData = stats.clubsByCategory.map(c => ({
    name: c.categoryName.length > 10 ? c.categoryName.slice(0, 8) + '…' : c.categoryName,
    val: c.clubCount,
  }))
  const topClubs = stats.topClubsByMembers.slice(0, 5)

  const appSegments = [
    { val: stats.applications.pending, color: D.amber },
    { val: stats.applications.interview, color: D.sky },
    { val: stats.applications.reviewing, color: '#7c3aed' },
    { val: stats.applications.accepted, color: D.emerald },
    { val: stats.applications.rejected, color: D.red },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Tổng quan hệ thống"
        sub="Thống kê toàn bộ hệ thống câu lạc bộ"
        actions={
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            style={{
              padding: '8px 16px', borderRadius: 999,
              background: exporting ? D.bg : D.ink,
              color: exporting ? D.inkMuted : '#ffffff',
              border: '1.5px solid #0a2f6e',
              boxShadow: exporting ? 'none' : '3px 3px 0 #0a2f6e',
              fontSize: 12, fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all .15s',
            }}
          >
            {exporting ? 'Đang xuất...' : '↓ Xuất PDF'}
          </button>
        }
      />

      <div ref={contentRef}>
      <ActionItems items={alerts} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon="◐" label="Người dùng" value={stats.totalUsers.toLocaleString()} color="#1d4ed8" />
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
        sub={`${months} tháng gần nhất`}
        rightLabel={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600 }}>{totalNew} TV mới</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {MONTH_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setMonths(o.value)} style={{
                  padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: months === o.value ? D.ink : D.bg,
                  color: months === o.value ? '#ffffff' : D.inkMuted,
                  border: '1.5px solid #0a2f6e',
                  boxShadow: months === o.value ? 'none' : '2px 2px 0 #0a2f6e',
                  transform: months === o.value ? 'translate(2px,2px)' : 'none',
                  transition: 'all .1s', fontFamily: 'inherit',
                }}>{o.label}</button>
              ))}
            </div>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        <MiniAreaChart data={growthData} color="#1d4ed8" height={160} />
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
                { l: 'Đang xét', v: stats.applications.reviewing, c: '#7c3aed' },
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{c.memberCount}</span>
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

      {/* KPI cards */}
      {(acceptanceRate !== null || retentionRate !== null) && (
        <ChartCard title="Chỉ số hiệu suất hệ thống" sub="Tính từ dữ liệu tích lũy toàn hệ thống" style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {acceptanceRate !== null && (
              <div style={{ padding: '16px 20px', borderRadius: 12, background: D.bg, border: '1.5px solid #d1fae5' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.emerald, letterSpacing: '.06em', marginBottom: 6 }}>TỶ LỆ CHẤP NHẬN ĐƠN</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: D.emerald, letterSpacing: '-.04em', lineHeight: 1 }}>
                  {acceptanceRate}<span style={{ fontSize: 18 }}>%</span>
                </div>
                <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 6 }}>
                  {stats.applications.accepted} duyệt / {reviewedApps} đã xét
                </div>
                <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: '#d1fae5', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${acceptanceRate}%`, background: D.emerald, borderRadius: 3, transition: 'width .6s ease' }} />
                </div>
              </div>
            )}
            {retentionRate !== null && (
              <div style={{ padding: '16px 20px', borderRadius: 12, background: D.bg, border: '1.5px solid #dbeafe' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.sky, letterSpacing: '.06em', marginBottom: 6 }}>TỶ LỆ GIỮ CHÂN THÀNH VIÊN</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: D.sky, letterSpacing: '-.04em', lineHeight: 1 }}>
                  {retentionRate}<span style={{ fontSize: 18 }}>%</span>
                </div>
                <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 6 }}>
                  {stats.totalActiveMembers + stats.totalProbationMembers} đang hoạt động / {totalHistorical} lịch sử
                </div>
                <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: '#dbeafe', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${retentionRate}%`, background: D.sky, borderRadius: 3, transition: 'width .6s ease' }} />
                </div>
              </div>
            )}
          </div>
        </ChartCard>
      )}

      {/* Summary tag */}
      <div style={{ marginTop: 16 }}>
        <DTag bg="#f4f7fc" color="#918c99" style={{ border: D.borderLight, fontSize: 11 }}>
          Tổng đơn: {stats.applications.total} · Tỷ lệ duyệt: {acceptanceRate ?? 0}% · Giữ chân TV: {retentionRate ?? '—'}%
        </DTag>
      </div>
      </div>
    </PageShell>
  )
}
