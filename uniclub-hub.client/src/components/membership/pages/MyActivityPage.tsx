import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getUserApplications, getUserResignations } from '@/components/membership/services/clubApi'
import type { ApplicationItem, ResignationRequestItem } from '@/components/membership/services/club.types'
import { MEMBERSHIP_STATUS } from '@/types/auth'
import { toast } from 'sonner'
import {
  CheckCircle2, Clock, XCircle, MessageCircle,
  LogOut, ArrowRight, Users, AlertCircle, History, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Config ────────────────────────────────────────────────────────────────

const APP_STATUS: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  Pending:   { label: 'Chờ duyệt',   bg: '#fef3c7', color: '#b45309', icon: Clock },
  Interview: { label: 'Phỏng vấn',   bg: '#dbeafe', color: '#1d4ed8', icon: MessageCircle },
  Accepted:  { label: 'Đã chấp nhận', bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  Rejected:  { label: 'Từ chối',      bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
}

const RESIGN_STATUS: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  Pending:  { label: 'Chờ phê duyệt', bg: '#fef3c7', color: '#b45309', icon: Clock },
  Approved: { label: 'Đã duyệt',      bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  Rejected: { label: 'Bị từ chối',    bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
}

const ROLE_LABEL: Record<string, string> = {
  CLUB_ADMIN: 'Trưởng CLB',
  DEPT_LEAD:  'Trưởng ban',
  MEMBER:     'Thành viên',
}

const MEMBERSHIP_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  Active:   { label: 'Thành viên chính thức', bg: '#f0fdf4', color: '#15803d' },
  Probation:{ label: 'Đang thử việc',          bg: '#eff6ff', color: '#2563eb' },
  Resigned: { label: 'Đã rời CLB',             bg: '#f3f4f6', color: '#6b7280' },
}

const TABS = ['CLB của tôi', 'Đơn ứng tuyển', 'Đơn từ chức'] as const
type Tab = typeof TABS[number]

// ── Component ─────────────────────────────────────────────────────────────

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
      getUserApplications(user.id)
        .then(setApplications)
        .catch(() => toast.error('Không thể tải đơn ứng tuyển.'))
        .finally(() => setLoading(false))
    }
    if (tab === 'Đơn từ chức' && resignations.length === 0) {
      setLoading(true)
      getUserResignations(user.id)
        .then(setResignations)
        .catch(() => toast.error('Không thể tải đơn từ chức.'))
        .finally(() => setLoading(false))
    }
  }, [tab, user])

  const memberships = user?.memberships ?? []
  const activeMemberships = memberships.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)
  const historicMemberships = memberships.filter(m => m.status === MEMBERSHIP_STATUS.RESIGNED)
  const activeCount = activeMemberships.length

  return (
    <div className="px-8 pt-6 pb-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hoạt động của tôi</h1>
        <p className="text-sm text-gray-400 mt-0.5">Quản lý CLB, đơn ứng tuyển và đơn từ chức</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-gray-200">
        {TABS.map(t => {
          const count = t === 'CLB của tôi' ? activeCount
            : t === 'Đơn ứng tuyển' ? applications.length
            : resignations.length
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                tab === t
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab: CLB của tôi ── */}
      {tab === 'CLB của tôi' && (
        <div className="space-y-3">
          {activeMemberships.length === 0 && historicMemberships.length === 0 ? (
            <EmptyState icon={Users} text="Bạn chưa tham gia CLB nào." />
          ) : (
            <>
              {/* Active / Probation */}
              {activeMemberships.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">Bạn chưa là thành viên CLB nào.</div>
              ) : activeMemberships.map(m => {
                const st = MEMBERSHIP_LABEL[m.status] ?? MEMBERSHIP_LABEL.Active
                return (
                  <div key={`${m.clubId}-${m.status}`}
                    className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{m.clubName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ROLE_LABEL[m.clubRole] ?? m.clubRole}
                        {' · '}Tham gia {new Date(m.joinedDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <Link to={`/clubs/${m.clubId}`}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        Xem <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                )
              })}

              {/* Lịch sử rời CLB */}
              {historicMemberships.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setHistoryOpen(v => !v)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium mb-2 transition-colors">
                    <History size={15} />
                    Lịch sử tham gia ({historicMemberships.length})
                    {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {historyOpen && (
                    <div className="space-y-2 pl-1 border-l-2 border-gray-100 ml-1">
                      {historicMemberships.map((m, i) => (
                        <div key={`${m.clubId}-resigned-${i}`}
                          className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-700 text-sm truncate">{m.clubName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {ROLE_LABEL[m.clubRole] ?? m.clubRole}
                              {' · '}Tham gia {new Date(m.joinedDate).toLocaleDateString('vi-VN')}
                              {m.resignedDate && ` → Rời ${new Date(m.resignedDate).toLocaleDateString('vi-VN')}`}
                            </p>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                            style={{ background: MEMBERSHIP_LABEL.Resigned.bg, color: MEMBERSHIP_LABEL.Resigned.color }}>
                            Đã rời CLB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Đơn ứng tuyển ── */}
      {tab === 'Đơn ứng tuyển' && (
        <div className="space-y-3">
          {loading ? <LoadingRow /> : applications.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Bạn chưa nộp đơn ứng tuyển CLB nào." />
          ) : applications.map(app => {
            const s = APP_STATUS[app.status]
            const Icon = s?.icon ?? Clock
            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/clubs/${app.clubId}`}
                      className="font-semibold text-sm text-gray-900 hover:text-indigo-600 transition-colors">
                      {app.clubName}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Nộp {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  {s && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: s.bg, color: s.color }}>
                      <Icon size={11} />{s.label}
                    </span>
                  )}
                </div>
                {app.reviewNote && (
                  <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700 whitespace-pre-wrap">
                    <p className="text-xs text-gray-400 mb-1 font-medium">Phản hồi từ CLB</p>
                    {app.reviewNote}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Đơn từ chức ── */}
      {tab === 'Đơn từ chức' && (
        <div className="space-y-3">
          {loading ? <LoadingRow /> : resignations.length === 0 ? (
            <EmptyState icon={LogOut} text="Bạn chưa gửi đơn từ chức nào." />
          ) : resignations.map(r => {
            const s = RESIGN_STATUS[r.status]
            const Icon = s?.icon ?? Clock
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/clubs/${r.clubId}`}
                      className="font-semibold text-sm text-gray-900 hover:text-indigo-600 transition-colors">
                      {r.clubName}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ROLE_LABEL[r.clubRole] ?? r.clubRole} · {r.preference === 'LeaveClub' ? 'Rời CLB hoàn toàn' : 'Trở thành thành viên thường'} · {new Date(r.requestedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  {s && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: s.bg, color: s.color }}>
                      <Icon size={11} />{s.label}
                    </span>
                  )}
                </div>
                {r.status === 'Pending' && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle size={13} />
                    Đang chờ {r.clubRole === 'CLUB_ADMIN' ? 'Ban quản trị' : 'Trưởng CLB'} phê duyệt
                  </div>
                )}
                {r.reviewNote && (
                  <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
                    <p className="text-xs text-gray-400 mb-1 font-medium">Phản hồi</p>
                    {r.reviewNote}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 py-16 flex flex-col items-center gap-2 text-gray-400">
      <Icon size={32} className="text-gray-200" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400">
      Đang tải...
    </div>
  )
}
