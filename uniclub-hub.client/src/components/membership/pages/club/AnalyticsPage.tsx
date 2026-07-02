import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  getAnalyticsOverview,
  getDailyViews,
  getContentStats,
  type AnalyticsOverview,
  type DailyView,
  type ContentStats,
} from '@/components/membership/services/analyticsApi'
import { D } from '@/components/shared/managementTheme'

const pillStyle: React.CSSProperties = { borderRadius: D.pill, padding: '2px 10px', fontSize: 11, fontWeight: 700 }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  Published:     { label: 'Đã xuất bản', color: '#065f46', bg: '#d1fae5' },
  PendingReview: { label: 'Chờ duyệt',   color: '#92400e', bg: '#fef3c7' },
  Draft:         { label: 'Nháp',         color: '#374151', bg: '#f3f4f6' },
  Rejected:      { label: 'Bị từ chối',  color: '#991b1b', bg: '#fee2e2' },
}

const CATEGORY_LABEL: Record<string, string> = {
  News:          'Tin tức',
  Event:         'Sự kiện',
  Announcement:  'Thông báo',
  Achievement:   'Thành tích',
}

function StatCard({ label, value, sub, color = D.indigo, icon }: {
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
      ...pillStyle,
      background: up ? '#d1fae5' : '#fee2e2',
      color: up ? '#065f46' : '#991b1b',
    }}>
      {up ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  )
}

function StatusBar({ label, count, total, color, bg }: {
  label: string; count: number; total: number; color: string; bg: string;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{count} <span style={{ color: D.inkMuted, fontWeight: 500 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: bg, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

type Tab = 'views' | 'content'
type Period = '7' | '30' | '60' | '90'

export default function AnalyticsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [tab, setTab] = useState<Tab>('views')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [chart, setChart] = useState<DailyView[]>([])
  const [period, setPeriod] = useState<Period>('30')
  const [content, setContent] = useState<ContentStats | null>(null)
  const [loadingViews, setLoadingViews] = useState(true)
  const [loadingContent, setLoadingContent] = useState(true)

  useEffect(() => {
    setLoadingViews(true)
    Promise.all([
      getAnalyticsOverview(id),
      getDailyViews(id, Number(period)),
    ])
      .then(([ov, dv]) => {
        setOverview(ov.data.data)
        setChart(dv.data.data)
      })
      .catch(console.error)
      .finally(() => setLoadingViews(false))
  }, [id, period])

  useEffect(() => {
    setLoadingContent(true)
    getContentStats(id)
      .then(r => setContent(r.data.data))
      .catch(console.error)
      .finally(() => setLoadingContent(false))
  }, [id])

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  const maxCount = chart.length > 0 ? Math.max(...chart.map(d => d.count)) : 0

  return (
    <div style={{ minHeight: '100%', background: D.bg, padding: '28px 32px', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Thống kê lượt truy cập và hiệu suất nội dung</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {([['views', '👁 Lượt xem'], ['content', '📝 Nội dung']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            border: D.border, cursor: 'pointer', fontFamily: 'inherit',
            background: tab === key ? D.ink : '#fff',
            color: tab === key ? '#fff' : D.ink,
            boxShadow: tab === key ? 'none' : D.shadow(2, 2),
            transform: tab === key ? 'translate(2px,2px)' : 'none',
            transition: 'all .12s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Lượt xem ── */}
      {tab === 'views' && (
        loadingViews ? (
          <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted }}>Đang tải...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <StatCard label="Tổng lượt xem" value={overview?.totalViews ?? 0} sub="Tất cả thời gian" color={D.indigo} icon="👁" />
              <StatCard label="7 ngày qua" value={overview?.viewsThisWeek ?? 0} sub={overview ? `Tuần trước: ${overview.viewsLastWeek}` : undefined} color="#10b981" icon="📅" />
              <StatCard label="30 ngày qua" value={overview?.viewsThisMonth ?? 0} sub={overview ? `Tháng trước: ${overview.viewsLastMonth}` : undefined} color="#f59e0b" icon="📆" />
              <StatCard label="TB mỗi ngày" value={overview?.avgViewsPerDay ?? 0} sub="Trong 30 ngày qua" color="#ec4899" icon="📊" />
            </div>

            {overview && (
              <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '18px 22px', flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600, marginBottom: 10 }}>So sánh tuần</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 800 }}>{overview.viewsThisWeek}</span>
                    <span style={{ color: D.inkMuted, fontSize: 13 }}>vs {overview.viewsLastWeek} tuần trước</span>
                    <GrowthBadge value={overview.weeklyGrowthPercent} />
                  </div>
                </div>
                <div style={{ background: '#fff', border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '18px 22px', flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 12, color: D.inkMuted, fontWeight: 600, marginBottom: 10 }}>So sánh tháng</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 800 }}>{overview.viewsThisMonth}</span>
                    <span style={{ color: D.inkMuted, fontSize: 13 }}>vs {overview.viewsLastMonth} tháng trước</span>
                    <GrowthBadge value={overview.monthlyGrowthPercent} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: D.ink }}>Lượt xem theo ngày</div>
                  <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 2 }}>
                    Tổng {chart.reduce((a, b) => a + b.count, 0)} lượt trong {period} ngày
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['7', '30', '60', '90'] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      border: D.border, cursor: 'pointer', fontFamily: 'inherit',
                      background: period === p ? D.ink : '#fff',
                      color: period === p ? '#fff' : D.ink,
                    }}>{p}N</button>
                  ))}
                </div>
              </div>

              {maxCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: D.inkMuted, fontSize: 14 }}>
                  Chưa có lượt xem nào trong {period} ngày qua.
                  <br />
                  <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                    Lượt xem được ghi lại khi ai đó truy cập trang giới thiệu công khai của CLB.
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dce6f4" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: D.inkMuted }} interval={Math.floor(chart.length / 8)} />
                    <YAxis tick={{ fontSize: 11, fill: D.inkMuted }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${Number(value ?? 0)} lượt xem`, 'Lượt xem']}
                      labelFormatter={(label) => {
                        const [y, m, d] = String(label).split('-')
                        return `${d}/${m}/${y}`
                      }}
                      contentStyle={{ borderRadius: 10, border: D.border, fontSize: 12, boxShadow: D.shadow(2, 2) }}
                    />
                    <Line type="monotone" dataKey="count" stroke={D.indigo} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: D.indigo }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: D.inkMuted, textAlign: 'center' }}>
              Dữ liệu được ghi lại mỗi khi có người truy cập trang giới thiệu công khai của CLB tại{' '}
              <code style={{ background: D.bg, padding: '1px 6px', borderRadius: 4 }}>/landing-page/{clubId}</code>
            </div>
          </>
        )
      )}

      {/* ── Tab: Nội dung ── */}
      {tab === 'content' && (
        loadingContent ? (
          <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted }}>Đang tải...</div>
        ) : content ? (
          <>
            {/* Overview cards */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <StatCard label="Tổng bài viết" value={content.totalPosts} sub="Tất cả trạng thái" color={D.indigo} icon="📝" />
              <StatCard label="Đã xuất bản" value={content.publishedPosts} sub="Công khai trên landing page" color="#10b981" icon="✅" />
              <StatCard label="Chờ duyệt" value={content.pendingPosts} sub="Đang chờ reviewer" color="#f59e0b" icon="⏳" />
              <StatCard label="Tổng media" value={content.totalMedia} sub={`${content.imageCount} ảnh · ${content.videoCount} video`} color="#8b5cf6" icon="🖼" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {/* Post status breakdown */}
              <div style={{ background: '#fff', border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '22px 24px' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: D.ink, marginBottom: 16 }}>Phân bổ trạng thái bài viết</div>
                {content.totalPosts === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: D.inkMuted, fontSize: 13 }}>Chưa có bài viết nào</div>
                ) : (
                  Object.entries(STATUS_META).map(([key, meta]) => {
                    const count = key === 'Published' ? content.publishedPosts
                      : key === 'PendingReview' ? content.pendingPosts
                      : key === 'Draft' ? content.draftPosts
                      : content.rejectedPosts
                    return (
                      <StatusBar key={key} label={meta.label} count={count} total={content.totalPosts} color={meta.color} bg={meta.bg} />
                    )
                  })
                )}
              </div>

              {/* Media breakdown */}
              <div style={{ background: '#fff', border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '22px 24px' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: D.ink, marginBottom: 16 }}>Thư viện media</div>
                {content.totalMedia === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: D.inkMuted, fontSize: 13 }}>Chưa có media nào</div>
                ) : (
                  <>
                    <StatusBar label="Hình ảnh" count={content.imageCount} total={content.totalMedia} color="#3b82f6" bg="#dbeafe" />
                    <StatusBar label="Video" count={content.videoCount} total={content.totalMedia} color="#8b5cf6" bg="#ede9fe" />
                    <div style={{ marginTop: 20, padding: '14px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 12, color: D.inkMuted, marginBottom: 6 }}>Tỷ lệ ảnh / video</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>{content.imageCount}</span>
                        <span style={{ color: D.inkMuted }}>:</span>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>{content.videoCount}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent posts */}
            <div style={{ background: '#fff', border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '22px 24px' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: D.ink, marginBottom: 16 }}>Bài viết gần đây</div>
              {content.recentPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: D.inkMuted, fontSize: 13 }}>Chưa có bài viết nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {content.recentPosts.map((post, i) => {
                    const meta = STATUS_META[post.status] ?? { label: post.status, color: '#374151', bg: '#f3f4f6' }
                    const catLabel = CATEGORY_LABEL[post.category] ?? post.category
                    const date = new Date(post.createdAt)
                    const dateStr = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`
                    return (
                      <div key={post.id} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 0',
                        borderBottom: i < content.recentPosts.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: D.inkMuted, minWidth: 20 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: D.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {post.title}
                          </div>
                          <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 2 }}>{catLabel} · {dateStr}</div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: meta.bg, color: meta.color, flexShrink: 0,
                        }}>{meta.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted }}>Không tải được dữ liệu nội dung.</div>
        )
      )}
    </div>
  )
}
