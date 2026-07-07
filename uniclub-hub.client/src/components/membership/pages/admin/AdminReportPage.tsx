import { useEffect, useState } from 'react'
import { getSystemStats, getSystemGrowth, getAdminClubs } from '@/components/membership/services/adminApi'
import type { SystemStats, MonthlyGrowth, ClubItem } from '@/components/membership/services/admin.types'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ borderBottom: '2px solid #0a2f6e', marginBottom: 14, paddingBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: D.ink, letterSpacing: '-.02em' }}>{title}</span>
      </div>
      {children}
    </section>
  )
}

function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f4f7fc' }}>
          {headers.map((h, i) => (
            <th key={i} style={{
              padding: '7px 10px', textAlign: 'left', border: '1px solid #d1cec8',
              fontWeight: 700, color: D.ink, fontSize: 11, letterSpacing: '.04em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
            {row.map((cell, j) => (
              <td key={j} style={{
                padding: '6px 10px', border: '1px solid #dce6f4',
                color: D.ink, verticalAlign: 'top', fontSize: 12,
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function AdminReportPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSystemStats(), getSystemGrowth(12), getAdminClubs()])
      .then(([s, g, c]) => { setStats(s); setGrowth(g); setClubs(c) })
      .catch(() => toast.error('Không thể tải dữ liệu báo cáo.'))
      .finally(() => setLoading(false))
  }, [])

  const generatedAt = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  if (loading) return (
    <div style={{ padding: '60px 32px', textAlign: 'center', color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      Đang tải dữ liệu...
    </div>
  )
  if (!stats) return null

  const totalGrowth = growth.reduce((s, g) => s + g.newMembers, 0)
  const reviewedApps = stats.applications.accepted + stats.applications.rejected
  const acceptanceRate = reviewedApps > 0 ? Math.round(stats.applications.accepted / reviewedApps * 100) : null
  const activeRate = stats.totalClubs > 0 ? Math.round(stats.activeClubs / stats.totalClubs * 100) : 0
  const topClubs = [...stats.topClubsByMembers].slice(0, 10)
  const activeClubs = clubs.filter(c => c.status === 'Active')
  const inactiveClubs = clubs.filter(c => c.status !== 'Active')

  return (
    <div className="mgmt-page mgmt-page--report">
      <style>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0;
            padding: 0;
            background: white;
          }
          body * { visibility: hidden; }
          #admin-report-printable, #admin-report-printable * { visibility: visible; }
          #admin-report-printable {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            width: auto;
            max-width: none;
            margin: 0;
            padding: 0;
            background: white;
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
          #admin-report-printable table tr { break-inside: avoid; page-break-inside: avoid; }
          .report-no-print { display: none !important; }
          @page { size: A4; margin: 14mm 16mm; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="report-no-print" style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, margin: 0 }}>Báo cáo hệ thống</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Xem trước và xuất báo cáo toàn hệ thống — dữ liệu tính đến {generatedAt}</p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            flexShrink: 0, padding: '10px 22px', borderRadius: 999,
            background: D.ink, color: '#ffffff',
            border: D.border, boxShadow: '3px 3px 0 #0a2f6e',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ↓ In / Xuất PDF
        </button>
      </div>

      {/* Report body */}
      <div id="admin-report-printable" style={{
        background: '#fff', border: D.border, borderRadius: 16,
        boxShadow: '4px 4px 0 #0a2f6e', padding: '36px 44px',
        maxWidth: 880, margin: '0 auto',
      }}>
        {/* Document header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 30, paddingBottom: 24, borderBottom: '2px solid #0a2f6e',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: D.inkMuted, textTransform: 'uppercase', marginBottom: 4 }}>
              Báo cáo tổng quan hệ thống
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: D.ink, letterSpacing: '-.02em' }}>UniClub-Hub</div>
            <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, marginTop: 3 }}>
              Hệ thống quản lý câu lạc bộ sinh viên
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: D.inkMuted }}>Ngày xuất báo cáo</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.ink, marginTop: 2 }}>{generatedAt}</div>
          </div>
        </div>

        {/* 1. System overview */}
        <Section title="1. Tổng quan hệ thống">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Tổng người dùng', value: stats.totalUsers, color: '#1d4ed8' },
              { label: `CLB hoạt động / Tổng`, value: `${stats.activeClubs}/${stats.totalClubs}`, color: '#10b981' },
              { label: 'Thành viên chính thức', value: stats.totalActiveMembers, color: '#7c3aed' },
              { label: 'TV mới (12 tháng)', value: totalGrowth, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '12px 14px', borderRadius: 10, textAlign: 'center',
                border: '1px solid #dce6f4', background: '#f4f7fc',
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: item.color, letterSpacing: '-.04em' }}>{item.value}</div>
                <div style={{ fontSize: 10, color: D.inkMuted, marginTop: 4, lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <ReportTable
            headers={['Chỉ số', 'Giá trị', 'Ghi chú']}
            rows={[
              ['Tổng người dùng', stats.totalUsers, ''],
              ['Tổng câu lạc bộ', stats.totalClubs, `${stats.activeClubs} đang hoạt động (${activeRate}%)`],
              ['Thành viên chính thức', stats.totalActiveMembers, ''],
              ['Thành viên thử việc', stats.totalProbationMembers, ''],
              ['Tổng đơn đăng ký', stats.applications.total, `${stats.applications.pending} đang chờ duyệt`],
              ['Tỉ lệ duyệt đơn', acceptanceRate !== null ? `${acceptanceRate}%` : '—', `${stats.applications.accepted} chấp nhận / ${reviewedApps} đã xét`],
            ]}
          />
        </Section>

        {/* 2. Applications breakdown */}
        {stats.applications.total > 0 && (
          <Section title="2. Tình trạng đơn đăng ký">
            <ReportTable
              headers={['Trạng thái', 'Số lượng', 'Tỉ lệ']}
              rows={[
                ['Chờ duyệt', stats.applications.pending, stats.applications.total > 0 ? `${Math.round(stats.applications.pending / stats.applications.total * 100)}%` : '—'],
                ['Đang phỏng vấn', stats.applications.interview, stats.applications.total > 0 ? `${Math.round(stats.applications.interview / stats.applications.total * 100)}%` : '—'],
                ['Đang xét', stats.applications.reviewing, stats.applications.total > 0 ? `${Math.round(stats.applications.reviewing / stats.applications.total * 100)}%` : '—'],
                ['Đã chấp nhận', stats.applications.accepted, acceptanceRate !== null ? `${acceptanceRate}% tỉ lệ duyệt` : '—'],
                ['Bị từ chối', stats.applications.rejected, ''],
                ['Tổng cộng', stats.applications.total, ''],
              ]}
            />
          </Section>
        )}

        {/* 3. CLB by category */}
        {stats.clubsByCategory.length > 0 && (
          <Section title="3. Câu lạc bộ theo lĩnh vực">
            <ReportTable
              headers={['Lĩnh vực', 'Số CLB', 'Tỉ lệ']}
              rows={stats.clubsByCategory.map(c => [
                c.categoryName,
                c.clubCount,
                stats.totalClubs > 0 ? `${Math.round(c.clubCount / stats.totalClubs * 100)}%` : '—',
              ])}
            />
          </Section>
        )}

        {/* 4. Top clubs */}
        {topClubs.length > 0 && (
          <Section title="4. Top câu lạc bộ nhiều thành viên nhất">
            <ReportTable
              headers={['Hạng', 'Câu lạc bộ', 'Số thành viên chính thức']}
              rows={topClubs.map((c, i) => [i + 1, c.clubName, c.memberCount])}
            />
          </Section>
        )}

        {/* 5. Growth trend */}
        {growth.some(g => g.newMembers > 0) && (
          <Section title="5. Tăng trưởng thành viên toàn hệ thống (12 tháng)">
            <ReportTable
              headers={['Tháng', 'Thành viên mới gia nhập']}
              rows={growth.map(g => [g.label, g.newMembers])}
            />
          </Section>
        )}

        {/* 6. Club list */}
        {clubs.length > 0 && (
          <Section title={`6. Danh sách câu lạc bộ (${clubs.length} CLB)`}>
            <ReportTable
              headers={['STT', 'Tên CLB', 'Mã', 'Lĩnh vực', 'Thành viên', 'Trạng thái', 'Có trưởng CLB']}
              rows={[
                ...activeClubs.map((c, i) => [
                  i + 1,
                  c.name,
                  c.code,
                  c.categoryName ?? '—',
                  c.memberCount,
                  'Đang hoạt động',
                  c.hasAdmin ? 'Có' : 'Chưa có',
                ]),
                ...inactiveClubs.map((c, i) => [
                  activeClubs.length + i + 1,
                  c.name,
                  c.code,
                  c.categoryName ?? '—',
                  c.memberCount,
                  'Ngừng hoạt động',
                  c.hasAdmin ? 'Có' : 'Chưa có',
                ]),
              ]}
            />
          </Section>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 32, paddingTop: 14, borderTop: D.borderLight,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: D.inkMuted }}>UniClub-Hub — Hệ thống quản lý câu lạc bộ sinh viên</span>
          <span style={{ fontSize: 10, color: D.inkMuted }}>{generatedAt}</span>
        </div>
      </div>
    </div>
  )
}
