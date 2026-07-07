import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getClubDetail, getClubStats, getClubGrowth, getClubMembers,
} from '@/components/membership/services/clubApi'
import type { ClubDetail, ClubStats, MonthlyGrowth, MemberItem } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'
import { CLUB_ROLE_LABELS } from '@/constants/clubRoles'

const STATUS_LABELS: Record<string, string> = {
  Active: 'Chính thức',
  Probation: 'Thử việc',
  Resigned: 'Đã rời',
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, paddingBottom: 7, borderBottom: D.borderLight }}>
      <span style={{ color: D.inkMuted, minWidth: 130, flexShrink: 0, fontSize: 12 }}>{label}</span>
      <span style={{ color: D.ink, fontWeight: 600, fontSize: 12 }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{
        borderBottom: '2px solid #0a2f6e', marginBottom: 14, paddingBottom: 6,
      }}>
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
              padding: '7px 10px', textAlign: 'left',
              border: '1px solid #d1cec8', fontWeight: 700,
              color: D.ink, fontSize: 11, letterSpacing: '.04em',
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

export default function ClubReportPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const clubPermissions = useClubPermissions(id)
  const canView = clubPermissions.canAny(CLUB_PERMISSIONS.REPORTS_VIEW, CLUB_PERMISSIONS.REPORTS_EXPORT)

  const [detail, setDetail] = useState<ClubDetail | null>(null)
  const [stats, setStats] = useState<ClubStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClubDetail(id), getClubStats(id), getClubGrowth(id, 12), getClubMembers(id)])
      .then(([d, s, g, m]) => { setDetail(d); setStats(s); setGrowth(g); setMembers(m) })
      .catch(() => toast.error('Không thể tải dữ liệu báo cáo.'))
      .finally(() => setLoading(false))
  }, [id])

  const generatedAt = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  if (!clubPermissions.loading && !canView)
    return <PermissionDenied />

  if (loading) return (
    <div style={{ padding: '60px 32px', textAlign: 'center', color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      Đang tải dữ liệu...
    </div>
  )
  if (!stats || !detail) return null

  const roleEntries = Object.entries(stats.membersByRole)
  const total = stats.totalActiveMembers + stats.totalProbationMembers
  const totalGrowth = growth.reduce((s, g) => s + g.newMembers, 0)
  const reviewedApps = stats.applications.accepted + stats.applications.rejected
  const acceptanceRate = reviewedApps > 0 ? Math.round(stats.applications.accepted / reviewedApps * 100) : null

  const memberRows = members.map((m, i) => [
    i + 1,
    m.fullName ?? '—',
    m.studentId ?? '—',
    m.departmentName ?? '—',
    CLUB_ROLE_LABELS[m.clubRole] ?? m.clubRole,
    STATUS_LABELS[m.status] ?? m.status,
    fmtDate(m.joinedDate),
  ])

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
          #club-report-printable, #club-report-printable * { visibility: visible; }
          #club-report-printable {
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
          #club-report-printable table tr { break-inside: avoid; page-break-inside: avoid; }
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
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, margin: 0 }}>Báo cáo hoạt động</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Xem trước và xuất báo cáo câu lạc bộ — dữ liệu tính đến {generatedAt}</p>
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
      <div id="club-report-printable" style={{
        background: '#fff', border: D.border, borderRadius: 16,
        boxShadow: '4px 4px 0 #0a2f6e', padding: '36px 44px',
        maxWidth: 880, margin: '0 auto',
      }}>
        {/* Document header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 20,
          marginBottom: 30, paddingBottom: 24, borderBottom: '2px solid #0a2f6e',
        }}>
          {detail.logoUrl ? (
            <img src={detail.logoUrl} alt="" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', border: D.border, flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 60, height: 60, borderRadius: 12, background: '#1d4ed8',
              border: D.border, display: 'grid', placeItems: 'center',
              color: '#fff', fontWeight: 900, fontSize: 22, flexShrink: 0,
            }}>
              {detail.name[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: D.inkMuted, textTransform: 'uppercase', marginBottom: 3 }}>
              Báo cáo hoạt động câu lạc bộ
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: D.ink, letterSpacing: '-.02em', lineHeight: 1.15 }}>{detail.name}</div>
            {detail.categoryName && (
              <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, marginTop: 3 }}>{detail.categoryName}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: D.inkMuted }}>Ngày xuất báo cáo</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.ink, marginTop: 2 }}>{generatedAt}</div>
          </div>
        </div>

        {/* 1. Club info */}
        <Section title="1. Thông tin câu lạc bộ">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px' }}>
            <InfoRow label="Tên câu lạc bộ" value={detail.name} />
            <InfoRow label="Mã CLB" value={detail.code} />
            <InfoRow label="Lĩnh vực" value={detail.categoryName ?? '—'} />
            <InfoRow label="Ngày thành lập" value={detail.establishedDate ? fmtDate(detail.establishedDate) : '—'} />
            <InfoRow label="Cố vấn" value={detail.advisorName ?? '—'} />
            <InfoRow label="Liên hệ" value={detail.contactInfo ?? '—'} />
            <InfoRow label="Trạng thái" value={detail.status === 'Active' ? 'Đang hoạt động' : 'Ngừng hoạt động'} />
          </div>
          {detail.description && (
            <div style={{
              marginTop: 12, fontSize: 12, color: '#4a4651', lineHeight: 1.7,
              padding: '10px 14px', background: '#f4f7fc', borderRadius: 8,
            }}>
              {detail.description}
            </div>
          )}
        </Section>

        {/* 2. Overview */}
        <Section title="2. Tổng quan thành viên">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Thành viên chính thức', value: stats.totalActiveMembers, color: '#1d4ed8' },
              { label: 'Thành viên thử việc', value: stats.totalProbationMembers, color: '#f59e0b' },
              { label: 'Ban bộ phận', value: stats.totalDepartments, color: '#10b981' },
              { label: 'TV mới (12 tháng)', value: totalGrowth, color: '#7c3aed' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '12px 14px', borderRadius: 10, textAlign: 'center',
                border: '1px solid #dce6f4', background: '#f4f7fc',
              }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: item.color, letterSpacing: '-.04em' }}>{item.value}</div>
                <div style={{ fontSize: 10, color: D.inkMuted, marginTop: 4, lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. Role breakdown */}
        {roleEntries.length > 0 && (
          <Section title="3. Phân bổ vai trò">
            <ReportTable
              headers={['Vai trò', 'Số lượng', 'Tỉ lệ']}
              rows={[
                ...roleEntries.map(([role, count]) => [
                  CLUB_ROLE_LABELS[role] ?? role,
                  count,
                  total > 0 ? `${Math.round((count as number) / total * 100)}%` : '—',
                ]),
                ['Tổng cộng', total, '100%'],
              ]}
            />
          </Section>
        )}

        {/* 4. Department breakdown */}
        {stats.membersByDepartment.length > 0 && (
          <Section title="4. Thành viên theo ban bộ phận">
            <ReportTable
              headers={['Ban / Bộ phận', 'Số thành viên', 'Tỉ lệ']}
              rows={stats.membersByDepartment.map(d => [
                d.departmentName,
                d.memberCount,
                total > 0 ? `${Math.round(d.memberCount / total * 100)}%` : '—',
              ])}
            />
          </Section>
        )}

        {/* 5. Applications */}
        {stats.applications.total > 0 && (
          <Section title="5. Tình trạng đơn đăng ký">
            <ReportTable
              headers={['Trạng thái', 'Số lượng', 'Tỉ lệ']}
              rows={[
                ['Chờ duyệt', stats.applications.pending, '—'],
                ['Đang phỏng vấn', stats.applications.interview, '—'],
                ['Đang xét', stats.applications.reviewing, '—'],
                ['Đã chấp nhận', stats.applications.accepted,
                  acceptanceRate !== null ? `${acceptanceRate}% tỉ lệ duyệt` : '—'],
                ['Bị từ chối', stats.applications.rejected, '—'],
                ['Tổng cộng', stats.applications.total, ''],
              ]}
            />
          </Section>
        )}

        {/* 6. Growth trend */}
        {growth.some(g => g.newMembers > 0) && (
          <Section title="6. Tăng trưởng thành viên (12 tháng gần nhất)">
            <ReportTable
              headers={['Tháng', 'Thành viên mới']}
              rows={growth.map(g => [g.label, g.newMembers])}
            />
          </Section>
        )}

        {/* 7. Member list */}
        {members.length > 0 && (
          <Section title={`7. Danh sách thành viên (${members.length} người)`}>
            <ReportTable
              headers={['STT', 'Họ và tên', 'MSSV', 'Ban bộ phận', 'Vai trò', 'Trạng thái', 'Ngày gia nhập']}
              rows={memberRows}
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
