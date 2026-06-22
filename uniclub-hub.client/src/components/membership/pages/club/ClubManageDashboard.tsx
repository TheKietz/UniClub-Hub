import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClubStats, getClubGrowth, getDepartments, getClubResignations } from '@/components/membership/services/clubApi'
import type { ClubStats, MonthlyGrowth, DepartmentItem } from '@/components/membership/services/club.types'
import { getPostsAdmin, type PostResponse } from '@/components/membership/services/postsApi'
import { getGallery } from '@/components/membership/services/galleryApi'
import { getClubLandingPage } from '@/components/portal/services/portal.api'
import { useAuth } from '@/contexts/AuthContext'
import {
  StatCard, ChartCard, MiniAreaChart, MiniBarChart, MiniDonut,
  PageShell, DTag,
} from '@/components/shared/DashboardCharts'
import { exportDashboardPdf } from '@/lib/pdfExport'

const MONTH_OPTIONS = [
  { value: 3, label: '3 tháng' },
  { value: 6, label: '6 tháng' },
  { value: 12, label: '12 tháng' },
  { value: 24, label: '24 tháng' },
]

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}
const ROLE_COLORS = ['var(--c-accent)', '#f59e0b', '#4f46e5']
const DEPT_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#14b8a6', '#38bdf8']

const D = {
  border: '1.5px solid var(--c-ink)',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  ink: 'var(--c-ink)',
  inkMuted: '#918c99',
  bg: 'var(--c-bg)',
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
  const [approvedResignCount, setApprovedResignCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState(12)
  const [exporting, setExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  type MediaStats = {
    totalPosts: number; publishedPosts: number; draftPosts: number
    recentPosts: PostResponse[]; imageCount: number; videoCount: number
    hasLandingContent: boolean
  }
  const [media, setMedia] = useState<MediaStats | null>(null)

  useEffect(() => {
    if (!clubId) return
    const id = Number(clubId)
    // Load media stats independently — don't block main dashboard
    Promise.all([
      getPostsAdmin(id, { pageSize: 5 }).catch(() => null),
      getGallery(id).catch(() => []),
      getClubLandingPage(id).catch(() => null),
    ]).then(([postsRes, galleryItems, landingData]) => {
      if (postsRes) {
        const allPosts = postsRes.data
        setMedia({
          totalPosts: postsRes.totalCount,
          publishedPosts: allPosts.filter(p => p.isPublished).length,
          draftPosts: allPosts.filter(p => !p.isPublished).length,
          recentPosts: allPosts.slice(0, 5),
          imageCount: galleryItems.filter(g => g.mediaType === 'Image').length,
          videoCount: galleryItems.filter(g => g.mediaType === 'Video').length,
          hasLandingContent: !!(landingData?.landingPage?.introduction || landingData?.landingPage?.heroImage),
        })
      }
    })

    Promise.all([getClubStats(id), getDepartments(id), getClubResignations(id)])
      .then(([s, dpts, resignations]) => {
        setStats(s)
        setDepts(dpts)
        setApprovedResignCount(resignations.filter(r => r.status === 'Approved').length)

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

  useEffect(() => {
    if (!clubId) return
    getClubGrowth(Number(clubId), months).then(setGrowth).catch(() => {})
  }, [clubId, months])

  async function handleExportPdf() {
    if (!contentRef.current) return
    setExporting(true)
    try {
      const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')
      await exportDashboardPdf(contentRef.current, `bao-cao-clb-${clubId}-${date}.pdf`)
    } finally {
      setExporting(false)
    }
  }

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

  const reviewedApps = stats.applications.accepted + stats.applications.rejected
  const acceptanceRate = reviewedApps > 0
    ? Math.round(stats.applications.accepted / reviewedApps * 100)
    : null

  const totalHistorical = stats.totalActiveMembers + stats.totalProbationMembers + approvedResignCount
  const retentionRate = totalHistorical > 0
    ? Math.round((stats.totalActiveMembers + stats.totalProbationMembers) / totalHistorical * 100)
    : null

  return (
    <PageShell>
      {/* Club header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
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
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          style={{
            flexShrink: 0, padding: '8px 16px', borderRadius: 999,
            background: exporting ? D.bg : D.ink,
            color: exporting ? D.inkMuted : '#facc15',
            border: '1.5px solid var(--c-ink)',
            boxShadow: exporting ? 'none' : '3px 3px 0 var(--c-ink)',
            fontSize: 12, fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'all .15s',
          }}
        >
          {exporting ? 'Đang xuất...' : '↓ Xuất PDF'}
        </button>
      </div>

      <div ref={contentRef}>
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
                  color: months === o.value ? '#facc15' : D.inkMuted,
                  border: '1.5px solid var(--c-ink)',
                  boxShadow: months === o.value ? 'none' : '2px 2px 0 var(--c-ink)',
                  transform: months === o.value ? 'translate(2px,2px)' : 'none',
                  transition: 'all .1s', fontFamily: 'inherit',
                }}>{o.label}</button>
              ))}
            </div>
          </div>
        }
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

      {/* Advanced KPIs */}
      {(acceptanceRate !== null || retentionRate !== null) && (
        <ChartCard title="Chỉ số hiệu suất" sub="Tính từ dữ liệu tích lũy" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {acceptanceRate !== null && (
              <div style={{ padding: '16px 20px', borderRadius: 12, background: D.bg, border: '1.5px solid #d1fae5' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.emerald, letterSpacing: '.06em', marginBottom: 6 }}>TỶ LỆ CHẤP NHẬN ĐƠN</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: D.emerald, letterSpacing: '-.04em', lineHeight: 1 }}>
                  {acceptanceRate}<span style={{ fontSize: 18 }}>%</span>
                </div>
                <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 6 }}>
                  {stats.applications.accepted} chấp nhận / {reviewedApps} đã xét
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

      {/* ── Truyền thông & Nội dung ──────────────────────────────────── */}
      {media && (
        <>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '28px 0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: '#10b981' }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: D.ink, letterSpacing: '-.02em' }}>
                Truyền thông &amp; Nội dung
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={`/clubs/${clubId}/manage/posts`} style={{
                fontSize: 12, fontWeight: 700, color: '#4f46e5', textDecoration: 'none',
                padding: '4px 12px', borderRadius: 99, border: '1px solid #c7d2fe', background: '#eef2ff',
              }}>Bài viết</Link>
              <Link to={`/clubs/${clubId}/manage/gallery`} style={{
                fontSize: 12, fontWeight: 700, color: '#10b981', textDecoration: 'none',
                padding: '4px 12px', borderRadius: 99, border: '1px solid #a7f3d0', background: '#ecfdf5',
              }}>Thư viện ảnh</Link>
              <Link to={`/clubs/${clubId}/manage/landing-page`} style={{
                fontSize: 12, fontWeight: 700, color: '#f59e0b', textDecoration: 'none',
                padding: '4px 12px', borderRadius: 99, border: '1px solid #fde68a', background: '#fefce8',
              }}>Chi tiết CLB</Link>
            </div>
          </div>

          {/* Warning nếu landing page chưa có nội dung */}
          {!media.hasLandingContent && (
            <div style={{
              borderRadius: 10, border: '1.5px solid #fde68a', background: '#fef3c7',
              padding: '10px 16px', marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                ⚠️ Trang Chi tiết CLB chưa có nội dung giới thiệu
              </span>
              <Link to={`/clubs/${clubId}/manage/landing-page`} style={{
                fontSize: 12, fontWeight: 700, color: '#b45309', textDecoration: 'none', whiteSpace: 'nowrap',
              }}>Cài đặt ngay →</Link>
            </div>
          )}

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Tổng bài viết', value: media.totalPosts, color: '#4f46e5', icon: '📝' },
              { label: 'Đã xuất bản', value: media.publishedPosts, color: '#10b981', icon: '✅' },
              { label: 'Bản nháp', value: media.draftPosts, color: '#f59e0b', icon: '📄' },
              { label: 'Ảnh', value: media.imageCount, color: '#38bdf8', icon: '🖼️' },
              { label: 'Video', value: media.videoCount, color: '#7c3aed', icon: '🎬' },
            ].map(s => (
              <div key={s.label} style={{
                background: D.card ?? '#fff', borderRadius: 12, border: D.border,
                boxShadow: D.shadow(2, 2), padding: '14px 16px',
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-.03em' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: D.inkMuted, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent posts */}
          {media.recentPosts.length > 0 && (
            <ChartCard title="Bài viết gần nhất" rightLabel={
              <Link to={`/clubs/${clubId}/manage/posts`} style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
                Xem tất cả →
              </Link>
            } style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {media.recentPosts.map(post => (
                  <div key={post.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, background: D.bg, border: D.borderLight,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: post.thumbnailUrl ? 'transparent' : '#e0e7ff',
                      border: D.borderLight, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                      {post.thumbnailUrl
                        ? <img src={post.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '📝'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: D.ink,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{post.title}</div>
                      <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')} · {post.category === 'News' ? 'Tin tức' : 'Thông báo'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                      background: post.isPublished ? '#d1fae5' : '#f3f4f6',
                      color: post.isPublished ? '#065f46' : '#6b7280',
                    }}>
                      {post.isPublished ? '● Đã đăng' : '○ Nháp'}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}

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
      </div>
    </PageShell>
  )
}
