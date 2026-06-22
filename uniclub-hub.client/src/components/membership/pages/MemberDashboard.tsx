import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { PageShell, DTag } from '@/components/shared/DashboardCharts'

const CLUB_COLORS = ['#4f46e5', '#7c3aed', 'var(--c-accent)', '#14b8a6', '#38bdf8', '#ec4899']
const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}
const ROLE_COLORS: Record<string, string> = {
  CLUB_ADMIN: 'var(--c-accent)', DEPT_LEAD: '#f59e0b', MEMBER: '#14b8a6',
}
const D = {
  border: '1.5px solid var(--c-ink)',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  ink: 'var(--c-ink)',
  inkMuted: '#918c99',
  card: '#ffffff',
  lemon: '#facc15',
}

function getClubShort(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase()
}
function getClubColor(id: number) { return CLUB_COLORS[id % CLUB_COLORS.length] }

export default function MemberDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const activeMemberships = user?.memberships.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE) ?? []
  const managedClubs = activeMemberships.filter(m => m.clubRole === CLUB_ROLES.CLUB_ADMIN)
  const memberClubs = activeMemberships.filter(m => m.clubRole !== CLUB_ROLES.CLUB_ADMIN)
  const probationClubs = user?.memberships.filter(m => m.status === 'Probation') ?? []

  const firstName = user?.fullName?.trim().split(' ').pop() ?? user?.email?.split('@')[0] ?? 'bạn'

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: D.ink, letterSpacing: '-.03em', lineHeight: 1.1, margin: 0 }}>
          Xin chào, {firstName} 👋
        </h1>
        <p style={{ fontSize: 14, color: D.inkMuted, marginTop: 6 }}>Quản lý hoạt động câu lạc bộ của bạn</p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { n: activeMemberships.length, l: 'CLB tham gia', color: '#4f46e5', icon: '◐' },
          { n: managedClubs.length, l: 'CLB quản lý', color: 'var(--c-accent)', icon: '◇' },
          { n: probationClubs.length, l: 'Đang thử việc', color: '#f59e0b', icon: '✦' },
        ].map(s => (
          <div key={s.l} style={{
            padding: '18px 20px', borderRadius: D.radius,
            background: D.card, border: D.border, boxShadow: D.shadow(),
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: s.color, border: D.border,
              display: 'grid', placeItems: 'center', color: '#fff', fontSize: 18,
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: D.ink, letterSpacing: '-.03em', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 2 }}>{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Managed clubs */}
      {managedClubs.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <DTag bg="var(--c-accent)" color="#fff">Đang quản lý</DTag>
            <span style={{ fontSize: 12, color: D.inkMuted }}>{managedClubs.length} CLB</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {managedClubs.map(m => (
              <div key={m.clubId} style={{
                padding: '16px 18px', borderRadius: D.radius,
                background: D.card, border: D.border, boxShadow: D.shadow(),
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                {m.clubLogoUrl ? (
                  <img src={m.clubLogoUrl} alt="" style={{
                    width: 46, height: 46, borderRadius: 12, objectFit: 'cover',
                    border: D.border, flexShrink: 0, transform: 'rotate(-3deg)',
                  }} />
                ) : (
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                    background: getClubColor(m.clubId), border: D.border,
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontWeight: 900, fontSize: 15,
                    transform: 'rotate(-3deg)',
                  }}>{getClubShort(m.clubName)}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: D.ink }}>{m.clubName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <DTag bg={ROLE_COLORS[m.clubRole] ?? '#4f46e5'} color="#fff">
                      {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                    </DTag>
                  </div>
                </div>
                <button onClick={() => navigate(`/clubs/${m.clubId}/manage`)} style={{
                  padding: '8px 16px', borderRadius: 999,
                  background: D.ink, color: D.lemon, border: D.border,
                  fontSize: 12, fontWeight: 700, boxShadow: D.shadow(2, 2),
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>Quản lý →</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member clubs */}
      {memberClubs.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <DTag bg="#14b8a6" color="#fff">Đang tham gia</DTag>
            <span style={{ fontSize: 12, color: D.inkMuted }}>{memberClubs.length} CLB</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {memberClubs.map(m => (
              <div key={m.clubId} style={{
                padding: '16px 18px', borderRadius: D.radius,
                background: D.card, border: D.border, boxShadow: D.shadow(),
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                {m.clubLogoUrl ? (
                  <img src={m.clubLogoUrl} alt="" style={{
                    width: 46, height: 46, borderRadius: 12, objectFit: 'cover',
                    border: D.border, flexShrink: 0, transform: 'rotate(-3deg)',
                  }} />
                ) : (
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                    background: getClubColor(m.clubId), border: D.border,
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontWeight: 900, fontSize: 15,
                    transform: 'rotate(-3deg)',
                  }}>{getClubShort(m.clubName)}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: D.ink }}>{m.clubName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <DTag bg="rgba(0,0,0,.08)" color={D.ink}>{ROLE_LABELS[m.clubRole] ?? m.clubRole}</DTag>
                    {m.departmentName && (
                      <span style={{ fontSize: 12, color: D.inkMuted }}>{m.departmentName}</span>
                    )}
                    {m.status === 'Probation' && (
                      <DTag bg="#fef3c7" color="#b45309">Thử việc</DTag>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activeMemberships.length === 0 && (
        <div style={{
          padding: '48px 20px', textAlign: 'center',
          borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(),
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: D.ink, marginBottom: 6 }}>Bạn chưa tham gia CLB nào</div>
          <div style={{ fontSize: 13, color: D.inkMuted }}>Khám phá các câu lạc bộ và nộp đơn tham gia ngay!</div>
        </div>
      )}

      {/* Explore */}
      <button onClick={() => navigate('/clubs')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '14px', borderRadius: D.radius,
        background: D.card, border: `1.5px dashed #e8e3d6`,
        fontSize: 14, fontWeight: 600, color: '#4f46e5',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>⌕ Khám phá thêm CLB</button>
    </PageShell>
  )
}
