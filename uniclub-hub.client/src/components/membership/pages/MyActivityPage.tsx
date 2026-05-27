import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getUserApplications, getUserResignations } from '@/components/membership/services/clubApi'
import type { ApplicationItem, ResignationRequestItem } from '@/components/membership/services/club.types'
import { MEMBERSHIP_STATUS } from '@/types/auth'
import { toast } from 'sonner'
import { CheckCircle2, Clock, XCircle, MessageCircle, AlertCircle } from 'lucide-react'

const D = {
  border: '1.5px solid #15131a', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14, pill: 999,
  ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: '#f7f6f1', card: '#ffffff', indigo: '#4f46e5',
}

const APP_STATUS: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  Pending:   { label: 'Chờ duyệt',    bg: '#fef3c7', color: '#b45309', icon: Clock },
  Interview: { label: 'Phỏng vấn',    bg: '#dbeafe', color: '#1d4ed8', icon: MessageCircle },
  Accepted:  { label: 'Đã chấp nhận', bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  Rejected:  { label: 'Từ chối',      bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
}

const RESIGN_STATUS: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  Pending:  { label: 'Chờ phê duyệt', bg: '#fef3c7', color: '#b45309', icon: Clock },
  Approved: { label: 'Đã duyệt',      bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  Rejected: { label: 'Bị từ chối',    bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
}

const ROLE_LABEL: Record<string, string> = {
  CLUB_ADMIN: 'Trưởng CLB', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}

const MEMBERSHIP_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  Active:    { label: 'Thành viên chính thức', bg: '#dcfce7', color: '#15803d' },
  Probation: { label: 'Đang thử việc',         bg: '#dbeafe', color: '#1d4ed8' },
  Resigned:  { label: 'Đã rời CLB',            bg: '#f3f4f6', color: '#6b7280' },
}

const TABS = ['CLB của tôi', 'Đơn ứng tuyển', 'Đơn từ chức'] as const
type Tab = typeof TABS[number]

const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }
const tdS: React.CSSProperties = { padding: '12px 14px', fontSize: 13 }

export default function MyActivityPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('CLB của tôi')
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [resignations, setResignations] = useState<ResignationRequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (tab === 'Đơn ứng tuyển' && applications.length === 0) {
      setLoading(true)
      getUserApplications(user.id).then(setApplications).catch(() => toast.error('Không thể tải đơn ứng tuyển.')).finally(() => setLoading(false))
    }
    if (tab === 'Đơn từ chức' && resignations.length === 0) {
      setLoading(true)
      getUserResignations(user.id).then(setResignations).catch(() => toast.error('Không thể tải đơn từ chức.')).finally(() => setLoading(false))
    }
  }, [tab, user])

  const memberships = user?.memberships ?? []
  const activeMemberships = memberships.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)
  const historicMemberships = memberships.filter(m => m.status === MEMBERSHIP_STATUS.RESIGNED)

  const tabCount = (t: Tab) => t === 'CLB của tôi' ? activeMemberships.length : t === 'Đơn ứng tuyển' ? applications.length : resignations.length

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Hoạt động của tôi</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Quản lý CLB, đơn ứng tuyển và đơn từ chức</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t
          const c = tabCount(t)
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 14px', borderRadius: D.pill,
              background: active ? D.ink : D.card, color: active ? '#facc15' : D.ink,
              border: D.border, boxShadow: active ? 'none' : D.shadow(2, 2),
              transform: active ? 'translate(2px,2px)' : 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .12s',
            }}>
              {t}
              {c > 0 && <span style={{ padding: '1px 6px', borderRadius: D.pill, fontSize: 10, fontWeight: 800, background: active ? 'rgba(255,255,255,.2)' : D.bg, color: active ? '#facc15' : D.inkMuted }}>{c}</span>}
            </button>
          )
        })}
      </div>

      {/* CLB của tôi */}
      {tab === 'CLB của tôi' && (
        activeMemberships.length === 0 && historicMemberships.length === 0
          ? <EmptyCard text="Bạn chưa tham gia CLB nào." />
          : <>
            {activeMemberships.map(m => {
              const st = MEMBERSHIP_LABEL[m.status] ?? MEMBERSHIP_LABEL.Active
              return (
                <div key={`${m.clubId}-${m.status}`} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '16px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: D.ink, fontSize: 14, margin: 0 }}>{m.clubName}</p>
                    <p style={{ fontSize: 12, color: D.inkMuted, marginTop: 2 }}>
                      {ROLE_LABEL[m.clubRole] ?? m.clubRole} · Tham gia {new Date(m.joinedDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: D.pill, background: st.bg, color: st.color }}>{st.label}</span>
                    <Link to={`/clubs/${m.clubId}`} style={{ fontSize: 12, color: D.indigo, fontWeight: 600, textDecoration: 'none' }}>Xem →</Link>
                  </div>
                </div>
              )
            })}

            {historicMemberships.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setHistoryOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: D.inkMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
                  ◎ Lịch sử tham gia ({historicMemberships.length}) {historyOpen ? '▲' : '▼'}
                </button>
                {historyOpen && historicMemberships.map((m, i) => (
                  <div key={`${m.clubId}-resigned-${i}`} style={{ background: D.bg, border: D.borderLight, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: 0.8 }}>
                    <div>
                      <p style={{ fontWeight: 600, color: D.inkDim, fontSize: 13, margin: 0 }}>{m.clubName}</p>
                      <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>
                        {ROLE_LABEL[m.clubRole] ?? m.clubRole} · {new Date(m.joinedDate).toLocaleDateString('vi-VN')}
                        {m.resignedDate && ` → ${new Date(m.resignedDate).toLocaleDateString('vi-VN')}`}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: D.pill, background: '#f3f4f6', color: '#6b7280', flexShrink: 0 }}>Đã rời CLB</span>
                  </div>
                ))}
              </div>
            )}
          </>
      )}

      {/* Đơn ứng tuyển */}
      {tab === 'Đơn ứng tuyển' && (
        loading ? <LoadingCard /> : applications.length === 0
          ? <EmptyCard text="Bạn chưa nộp đơn ứng tuyển CLB nào." />
          : <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
                  <th style={thS}>Câu lạc bộ</th>
                  <th style={thS}>Ngày nộp</th>
                  <th style={thS}>Trạng thái</th>
                  <th style={thS}>Phản hồi</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const s = APP_STATUS[app.status]
                  const Icon = s?.icon ?? Clock
                  return (
                    <tr key={app.id} style={{ borderBottom: D.borderLight }}>
                      <td style={{ ...tdS, fontWeight: 700, color: D.ink }}>
                        <Link to={`/clubs/${app.clubId}`} style={{ color: D.indigo, textDecoration: 'none' }}>{app.clubName}</Link>
                      </td>
                      <td style={{ ...tdS, color: D.inkMuted }}>{new Date(app.appliedAt).toLocaleDateString('vi-VN')}</td>
                      <td style={tdS}>
                        {s && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: D.pill, background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 700 }}><Icon size={10} />{s.label}</span>}
                      </td>
                      <td style={{ ...tdS, color: D.inkDim, fontSize: 12 }}>{app.reviewNote ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      )}

      {/* Đơn từ chức */}
      {tab === 'Đơn từ chức' && (
        loading ? <LoadingCard /> : resignations.length === 0
          ? <EmptyCard text="Bạn chưa gửi đơn từ chức nào." />
          : <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
                  <th style={thS}>Câu lạc bộ</th>
                  <th style={thS}>Vai trò</th>
                  <th style={thS}>Hình thức</th>
                  <th style={thS}>Ngày gửi</th>
                  <th style={thS}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {resignations.map(r => {
                  const s = RESIGN_STATUS[r.status]
                  const Icon = s?.icon ?? Clock
                  return (
                    <tr key={r.id} style={{ borderBottom: D.borderLight }}>
                      <td style={{ ...tdS, fontWeight: 700, color: D.ink }}>
                        <Link to={`/clubs/${r.clubId}`} style={{ color: D.indigo, textDecoration: 'none' }}>{r.clubName}</Link>
                      </td>
                      <td style={{ ...tdS, color: D.inkDim }}>{ROLE_LABEL[r.clubRole] ?? r.clubRole}</td>
                      <td style={{ ...tdS, color: D.inkDim }}>{r.preference === 'LeaveClub' ? 'Rời CLB hoàn toàn' : 'Trở thành thành viên thường'}</td>
                      <td style={{ ...tdS, color: D.inkMuted }}>{new Date(r.requestedAt).toLocaleDateString('vi-VN')}</td>
                      <td style={tdS}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {s && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: D.pill, background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 700 }}><Icon size={10} />{s.label}</span>}
                          {r.status === 'Pending' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#b45309' }}>
                              <AlertCircle size={11} />Chờ {r.clubRole === 'CLUB_ADMIN' ? 'Ban quản trị' : 'Trưởng CLB'} duyệt
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      )}
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #15131a', borderRadius: 14, padding: '48px 20px', textAlign: 'center', color: '#918c99', fontSize: 13, boxShadow: '3px 3px 0 #15131a' }}>
      {text}
    </div>
  )
}

function LoadingCard() {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #15131a', borderRadius: 14, padding: '48px 20px', textAlign: 'center', color: '#918c99', fontSize: 13 }}>
      Đang tải...
    </div>
  )
}
