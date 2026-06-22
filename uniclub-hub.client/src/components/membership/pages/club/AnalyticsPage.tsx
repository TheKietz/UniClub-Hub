import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  getAnalyticsOverview,
  getDailyViews,
  type AnalyticsOverview,
  type DailyView,
} from '@/components/membership/services/analyticsApi'
import { PageShell } from '@/components/shared/DashboardCharts'

const D = {
  border: '1.5px solid #15131a',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  ink: '#15131a',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  pill: { borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 },
}

function StatCard({ label, value, sub, color = '#4f46e5', icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{
      background: '#fff', border: D.border, borderRadius: D.radius,
      boxShadow: D.shadow(), padding: '20px 22px', flex: 1, minWidth: 140,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 18, background: color + '18', borderRadius: 8,
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</span>
        <span style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: D.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function GrowthBadge({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span style={{
      ...D.pill,
      background: up ? '#d1fae5' : '#fee2e2',
      color: up ? '#065f46' : '#991b1b',
    }}>
      {up ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  )
}

type Period = '7' | '30' | '60' | '90'

export default function AnalyticsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [chart, setChart] = useState<DailyView[]>([])
  const [period, setPeriod] = useState<Period>('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAnalyticsOverview(id),
      getDailyViews(id, Number(period)),
    ])
      .then(([ov, dv]) => {
        setOverview(ov.data.data)
        setChart(dv.data.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, period])

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  const maxCount = chart.length > 0 ? Math.max(...chart.map(d => d.count)) : 0

  return (
    <PageShell title="Analytics" subtitle="Thống kê lượt truy cập trang giới thiệu công khai của CLB">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted }}>Đang tải...</div>
      ) : (
        <>
          {/* Overview cards */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard
              label="Tổng lượt xem"
              value={overview?.totalViews ?? 0}
              sub="Tất cả thời gian"
              color="#4f46e5"
              icon="👁"
            />
            <StatCard
              label="7 ngày qua"
              value={overview?.viewsThisWeek ?? 0}
              sub={overview ? `Tuần trước: ${overview.viewsLastWeek}` : undefined}
              color="#10b981"
              icon="📅"
            />
            <StatCard
              label="30 ngày qua"
              value={overview?.viewsThisMonth ?? 0}
              sub={overview ? `Tháng trước: ${overview.viewsLastMonth}` : undefined}
              color="#f59e0b"
              icon="📆"
            />
            <StatCard
              label="TB mỗi ngày"
              value={overview?.avgViewsPerDay ?? 0}
              sub="Trong 30 ngày qua"
              color="#ec4899"
              icon="📊"
            />
          </div>

          {/* Growth comparison */}
          {overview && (
            <div style={{
              display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap',
            }}>
              <div style={{
                background: '#fff', border: D.border, borderRadius: D.radius,
                boxShadow: D.shadow(), padding: '18px 22px', flex: 1, minWidth: 220,
              }}>
                <div style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                  So sánh tuần
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{overview.viewsThisWeek}</span>
                  <span style={{ color: D.inkMuted, fontSize: 13 }}>vs {overview.viewsLastWeek} tuần trước</span>
                  <GrowthBadge value={overview.weeklyGrowthPercent} />
                </div>
              </div>
              <div style={{
                background: '#fff', border: D.border, borderRadius: D.radius,
                boxShadow: D.shadow(), padding: '18px 22px', flex: 1, minWidth: 220,
              }}>
                <div style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                  So sánh tháng
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{overview.viewsThisMonth}</span>
                  <span style={{ color: D.inkMuted, fontSize: 13 }}>vs {overview.viewsLastMonth} tháng trước</span>
                  <GrowthBadge value={overview.monthlyGrowthPercent} />
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div style={{
            background: '#fff', border: D.border, borderRadius: D.radius,
            boxShadow: D.shadow(), padding: '22px 24px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20, flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: D.ink }}>Lượt xem theo ngày</div>
                <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 2 }}>
                  Tổng {chart.reduce((a, b) => a + b.count, 0)} lượt trong {period} ngày
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['7', '30', '60', '90'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      border: D.border, cursor: 'pointer', fontFamily: 'inherit',
                      background: period === p ? D.ink : '#fff',
                      color: period === p ? '#fff' : D.ink,
                    }}
                  >
                    {p}N
                  </button>
                ))}
              </div>
            </div>

            {maxCount === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px 0', color: D.inkMuted, fontSize: 14,
              }}>
                Chưa có lượt xem nào trong {period} ngày qua.
                <br />
                <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                  Lượt xem được ghi lại khi ai đó truy cập trang giới thiệu công khai của CLB.
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece2" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: D.inkMuted }}
                    interval={Math.floor(chart.length / 8)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: D.inkMuted }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value} lượt xem`, 'Lượt xem']}
                    labelFormatter={(label: string) => {
                      const [y, m, d] = label.split('-')
                      return `${d}/${m}/${y}`
                    }}
                    contentStyle={{
                      borderRadius: 10, border: D.border, fontSize: 12,
                      boxShadow: D.shadow(2, 2),
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#4f46e5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Footer note */}
          <div style={{
            marginTop: 16, fontSize: 12, color: D.inkMuted, textAlign: 'center',
          }}>
            Dữ liệu được ghi lại mỗi khi có người truy cập trang giới thiệu công khai của CLB tại{' '}
            <code style={{ background: '#f0ece2', padding: '1px 6px', borderRadius: 4 }}>
              /landing-page/{clubId}
            </code>
          </div>
        </>
      )}
    </PageShell>
  )
}
