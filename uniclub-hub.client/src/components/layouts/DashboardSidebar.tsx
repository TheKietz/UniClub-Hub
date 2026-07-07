import { useRef, useState, useEffect, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLE_COLORS, CLUB_ROLE_LABELS, roleRank } from '@/constants/clubRoles'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import type { UserMembership } from '@/types/auth'
import NotificationBell from '@/components/shared/NotificationBell'
import { getMyClubPermissions } from '@/components/membership/services/clubApi'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'

type Mode = 'member' | 'admin' | 'club'
type NavItem = { to: string; icon: string; label: string; end?: boolean; dividerAfter?: boolean }

interface Props {
  mode: Mode
  clubId?: string
  mobile?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
  /** Gọi khi người dùng điều hướng — dùng để đóng drawer trên mobile. */
  onNavigate?: () => void
  /** Buộc sidebar luôn mở rộng (không cho thu gọn) — dùng trong drawer mobile. */
  forceExpanded?: boolean
}

const CLUB_COLORS = ['#4f46e5', '#7c3aed', '#ef4444', '#14b8a6', '#38bdf8', '#ec4899', '#f59e0b', '#10b981']
function getClubShort(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase()
}
function getClubColor(id: number) {
  return CLUB_COLORS[id % CLUB_COLORS.length]
}

function SidebarUserAvatar({
  initials,
  avatarUrl,
  size = 32,
}: {
  initials: string
  avatarUrl?: string | null
  size?: number
}) {
  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size,
    flexShrink: 0,
  }

  if (avatarUrl) {
    return <img src={avatarUrl} alt="" style={{ ...shared, objectFit: 'cover' }} />
  }

  return (
    <div style={{
      ...shared,
      background: 'linear-gradient(135deg, #2563eb, #e11d48)',
      display: 'grid',
      placeItems: 'center',
      color: '#fff',
      fontSize: size * 0.375,
      fontWeight: 800,
    }}>
      {initials}
    </div>
  )
}

const MEMBER_NAV: NavItem[] = [
  { to: '/dashboard', icon: '◇', label: 'Tổng quan', end: true },
  { to: '/notifications', icon: '◑', label: 'Thông báo' },
  { to: '/profile', icon: '◐', label: 'Hồ sơ cá nhân'},
  { to: '/my-kpi', icon: '▦', label: 'KPI của tôi', dividerAfter: true  },
  { to: '/my-activity', icon: '↗', label: 'Hoạt động của tôi' },
  { to: '/my-events', icon: '◈', label: 'Sự kiện của tôi' },
  { to: '/my-history', icon: '◎', label: 'Lịch sử thành viên', dividerAfter: true },
  { to: '/support', icon: '◉', label: 'Hỗ trợ' },  
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', icon: '◇', label: 'Tổng quan', end: true },
  { to: '/admin/users', icon: '◐', label: 'Người dùng' },
  { to: '/admin/clubs', icon: '▦', label: 'Câu lạc bộ' },
  { to: '/admin/events', icon: '◈', label: 'Sự kiện toàn trường' },
  { to: '/admin/news', icon: '✎', label: 'Tin tức cấp trường' },
  { to: '/admin/categories', icon: '✦', label: 'Lĩnh vực', dividerAfter: true },
  { to: '/admin/positions', icon: '✣', label: 'Vị trí & quyền', dividerAfter: true },
  { to: '/admin/support', icon: '◉', label: 'Hỗ trợ' },
  { to: '/admin/resignations', icon: '↗', label: 'Đơn từ chức' },
  { to: '/admin/audit-log', icon: '◎', label: 'Lịch sử thay đổi' },
  { to: '/admin/report', icon: '↓', label: 'Báo cáo', dividerAfter: true },
  { to: '/admin/settings', icon: '⚙', label: 'Cài đặt hệ thống' },
  { to: '/admin/notification-preferences', icon: '◑', label: 'Cài đặt thông báo' },
]

type ClubPerms = {
  positions: boolean
  members: boolean
  applications: boolean
  departments: boolean
  pipeline: boolean
  form: boolean
  orgChart: boolean
  kpiView: boolean
  kpiManage: boolean
  resignations: boolean
  notifications: boolean
  settings: boolean
  auditLog: boolean
}

function clubNav(id: string, role?: string, isSuperAdmin = false, perms: ClubPerms = {} as ClubPerms) {
  const positionsItem = { to: `/clubs/${id}/manage/positions`, icon: '✣', label: 'Vị trí & quyền' }

  if (!isSuperAdmin && role === CLUB_ROLES.MEMBER) {
    return [
      { to: `/clubs/${id}`, icon: '◇', label: 'Trang CLB', end: true },
      { to: '/my-activity', icon: '↗', label: 'Hoạt động của tôi' },
      { to: '/my-tasks', icon: '✦', label: 'Task được giao' },
      { to: '/my-kpi', icon: '▦', label: 'KPI của tôi' },
    ]
  }

  if (!isSuperAdmin && role === CLUB_ROLES.DEPT_LEAD) {
    return [
      { to: `/clubs/${id}/manage/posts`, icon: '✦', label: 'Bài viết & Tin tức' },
      { to: `/clubs/${id}/manage/gallery`, icon: '◈', label: 'Thư viện ảnh & Video' },
    ]
  }

  const positionItems = perms.positions ? [{ ...positionsItem, dividerAfter: true }] : []
  return [
    { to: `/clubs/${id}/manage`, icon: '◇', label: 'Tổng quan', end: true },
    { to: `/clubs/${id}/manage/report`, icon: '↓', label: 'Báo cáo' },
    { to: `/clubs/${id}/manage/members`, icon: '◐', label: 'Thành viên' },
    { to: `/clubs/${id}/manage/events`, icon: '◐', label: 'Sự kiện' },
    { to: `/clubs/${id}/manage/inbox`, icon: '◫', label: 'Hộp thư công việc' },
    { to: `/clubs/${id}/manage/applications`, icon: '✦', label: 'Đơn ứng tuyển' },
    { to: `/clubs/${id}/manage/departments`, icon: '▦', label: 'Ban bộ phận', dividerAfter: true },
    ...positionItems,
    { to: `/clubs/${id}/manage/kpi`, icon: '▥', label: 'KPI thành viên', end: true },
    { to: `/clubs/${id}/manage/kpi/config`, icon: '◫', label: 'Cấu hình KPI' },
    { to: `/clubs/${id}/manage/orgchart`, icon: '⊹', label: 'Sơ đồ tổ chức' },
    { to: `/clubs/${id}/manage/audit-log`, icon: '◎', label: 'Lịch sử thay đổi' },
    { to: `/clubs/${id}/manage/resignations`, icon: '⊖', label: 'Đơn từ chức' },
    { to: `/clubs/${id}/manage/notifications`, icon: '◑', label: 'Cài đặt thông báo' },
    { to: `/clubs/${id}/manage/settings`, icon: '◉', label: 'Cài đặt CLB' },
    { to: `/clubs/${id}/manage/posts`, icon: '✦', label: 'Bài viết & Tin tức' },
    { to: `/clubs/${id}/manage/gallery`, icon: '◈', label: 'Thư viện ảnh & Video' },
    { to: `/clubs/${id}/manage/landing-page`, icon: '✦', label: 'Chi tiết CLB' },
    { to: `/clubs/${id}/manage/analytics`, icon: '▦', label: 'Analytics', dividerAfter: false },
  ]
}

export default function DashboardSidebar({
  mode,
  clubId,
  mobile = false,
  mobileOpen = false,
  onMobileClose,
  onNavigate,
  forceExpanded = false,
}: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsedState, setCollapsedState] = useState(false)
  // Trong drawer mobile: luôn mở rộng, không cho thu gọn.
  const collapsed = forceExpanded || mobile ? false : collapsedState
  const setCollapsed = setCollapsedState
  const [clubPickerOpen, setClubPickerOpen] = useState(false)
  const [clubPermissionCodes, setClubPermissionCodes] = useState<string[]>([])
  const pickerRef = useRef<HTMLDivElement>(null)

  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false

  // Deduplicate by clubId — keep the membership with the highest role per club
  const uniqueActiveMemberships = useMemo<UserMembership[]>(() => {
    const map = new Map<number, UserMembership>()
    for (const m of (user?.memberships ?? []).filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE)) {
      const existing = map.get(m.clubId)
      if (!existing || roleRank(m.clubRole) > roleRank(existing.clubRole)) {
        map.set(m.clubId, m)
      }
    }
    return Array.from(map.values())
  }, [user?.memberships])

  const manageableClubs = uniqueActiveMemberships.filter(
    m => m.clubRole === CLUB_ROLES.CLUB_ADMIN || m.clubRole === CLUB_ROLES.DEPT_LEAD
  )
  // The SV/CLB switcher only distinguishes CLB for users who are CLUB_ADMIN of a club
  const adminClubs = uniqueActiveMemberships.filter(
    m => m.clubRole === CLUB_ROLES.CLUB_ADMIN
  )
  const activeClub = clubId
    ? user?.memberships.find(m => m.clubId === Number(clubId))
    : manageableClubs[0]

  const clubPerms = useMemo<ClubPerms>(() => {
    const isAdmin = isSuperAdmin || activeClub?.clubRole === CLUB_ROLES.CLUB_ADMIN
    const codes = new Set(clubPermissionCodes.map(c => c.toLowerCase()))
    const has = (...ps: string[]) => isAdmin || ps.some(p => codes.has(p.toLowerCase()))
    return {
      positions: has(CLUB_PERMISSIONS.ORG_CHART_VIEW, CLUB_PERMISSIONS.ORG_CHART_MANAGE, CLUB_PERMISSIONS.POSITIONS_MANAGE, CLUB_PERMISSIONS.POSITION_ASSIGNMENTS_MANAGE),
      members: has(CLUB_PERMISSIONS.MEMBERS_VIEW, CLUB_PERMISSIONS.MEMBERS_MANAGE),
      applications: has(CLUB_PERMISSIONS.APPLICATIONS_VIEW, CLUB_PERMISSIONS.APPLICATIONS_REVIEW),
      departments: has(CLUB_PERMISSIONS.DEPARTMENTS_MANAGE),
      pipeline: has(CLUB_PERMISSIONS.RECRUITMENT_PIPELINE_MANAGE),
      form: has(CLUB_PERMISSIONS.RECRUITMENT_FORM_MANAGE),
      orgChart: has(CLUB_PERMISSIONS.ORG_CHART_MANAGE),
      kpiView: has(CLUB_PERMISSIONS.MEMBER_KPI_VIEW),
      kpiManage: has(CLUB_PERMISSIONS.MEMBER_KPI_MANAGE),
      resignations: has(CLUB_PERMISSIONS.RESIGNATIONS_VIEW, CLUB_PERMISSIONS.RESIGNATIONS_REVIEW),
      notifications: has(CLUB_PERMISSIONS.NOTIFICATION_SETTINGS_MANAGE),
      settings: has(CLUB_PERMISSIONS.CLUB_SETTINGS_MANAGE),
      auditLog: has(CLUB_PERMISSIONS.CLUB_AUDIT_LOG_VIEW),
    }
  }, [activeClub?.clubRole, clubPermissionCodes, isSuperAdmin])

  const modeColor = mode === 'admin' ? '#e11d48' : mode === 'club' ? '#2563eb' : '#38bdf8'
  const navItems = mode === 'admin' ? ADMIN_NAV
    : mode === 'club' && clubId ? clubNav(clubId, activeClub?.clubRole, isSuperAdmin, clubPerms)
    : MEMBER_NAV

  const initials = user?.fullName
    ? user.fullName.trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : (user?.email?.[0] ?? 'U').toUpperCase()

  useEffect(() => {
    if (!clubPickerOpen) return
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setClubPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clubPickerOpen])

  useEffect(() => {
    const parsedClubId = Number(clubId)
    if (mode !== 'club' || !parsedClubId || isSuperAdmin || activeClub?.clubRole === CLUB_ROLES.CLUB_ADMIN) {
      setClubPermissionCodes([])
      return
    }

    let cancelled = false
    getMyClubPermissions(parsedClubId)
      .then(result => {
        if (!cancelled) setClubPermissionCodes(result.permissionCodes)
      })
      .catch(() => {
        if (!cancelled) setClubPermissionCodes([])
      })

    return () => { cancelled = true }
  }, [activeClub?.clubRole, clubId, isSuperAdmin, mode])

  function switchMode(m: Mode) {
    if (m === 'admin') navigate('/admin')
    else if (m === 'club') {
      const first = adminClubs[0] ?? manageableClubs[0]
      if (first) navigate(getClubManageEntry(first))
    } else {
      navigate('/dashboard')
    }
    onNavigate?.()
  }

  function getClubManageEntry(club: UserMembership) {
    if (club.clubRole !== CLUB_ROLES.DEPT_LEAD || isSuperAdmin)
      return `/clubs/${club.clubId}/manage`
    if (clubPerms.positions) return `/clubs/${club.clubId}/manage/positions`
    if (clubPerms.members) return `/clubs/${club.clubId}/manage/members`
    if (clubPerms.applications) return `/clubs/${club.clubId}/manage/applications`
    return `/clubs/${club.clubId}/manage/posts`
  }

  function handleLogout() {
    onNavigate?.()
    logout()
    navigate('/login', { replace: true })
  }

  const showCollapsed = collapsed && !mobile

  return (
    <aside
      className={[
        mobile ? 'dashboard-sidebar--mobile' : '',
        mobile && mobileOpen ? 'dashboard-sidebar--open' : '',
      ].filter(Boolean).join(' ')}
      style={{
      width: mobile ? 250 : (collapsed ? 60 : 250), height: '100vh', background: 'var(--c-chrome)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1.5px solid rgba(255,255,255,.05)',
      fontFamily: "'Be Vietnam Pro', sans-serif",
      transition: mobile ? undefined : 'width .2s ease', overflow: 'hidden',
    }}>
      {/* Logo — click to go home */}
      {showCollapsed ? (
        <div style={{ padding: '12px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button onClick={() => { navigate('/'); onNavigate?.() }} title="Về trang chủ" style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            transition: 'opacity .15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#ffffff',
              display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13,
              color: 'var(--c-ink)', transform: 'rotate(-3deg)', boxShadow: '2px 2px 0 #e11d48',
            }}>U!</div>
          </button>
          <button
            onClick={() => { setCollapsed(false); setClubPickerOpen(false) }}
            title="Mở rộng"
            style={{
              width: 32, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,.15)',
              background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
            }}
          >›</button>
        </div>
      ) : (
        <div style={{ padding: '14px 10px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { navigate('/'); onNavigate?.() }} title="Về trang chủ" style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit', padding: 0, transition: 'opacity .15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: '#ffffff',
              display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13,
              color: 'var(--c-ink)', transform: 'rotate(-3deg)', boxShadow: '2px 2px 0 #e11d48', flexShrink: 0,
            }}>U!</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>UniClub</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#e11d48', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>★ UEF Campus</div>
            </div>
          </button>
          {!forceExpanded && (
          <button
            onClick={() => { setCollapsed(true); setClubPickerOpen(false) }}
            title="Thu gọn"
            style={{
              width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit', flexShrink: 0, transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
          >‹</button>
          )}
        </div>
      )}

      {/* Mode switcher */}
      {!showCollapsed && <div style={{ padding: '0 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,.06)' }}>
          {([['member', 'SV'], ['admin', 'Admin'], ['club', 'CLB']] as [Mode, string][])
            .filter(([m]) => m !== 'admin' || isSuperAdmin)
            .filter(([m]) => m !== 'club' || manageableClubs.length > 0)
            .map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? modeColor : 'transparent',
                color: mode === m ? (m === 'member' ? 'var(--c-ink)' : '#fff') : 'rgba(255,255,255,.5)',
                fontSize: 11, fontWeight: 700, transition: 'all .15s', fontFamily: 'inherit',
              }}>{label}</button>
            ))}
        </div>
      </div>}

      {/* Club selector (club mode only) */}
      {!showCollapsed && mode === 'club' && activeClub && (
        <div ref={pickerRef} style={{ padding: '0 10px 8px', position: 'relative' }}>
          <button onClick={() => setClubPickerOpen(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,.10)',
            background: 'rgba(255,255,255,.06)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: getClubColor(activeClub.clubId),
              display: 'grid', placeItems: 'center',
              color: '#fff', fontWeight: 900, fontSize: 12, transform: 'rotate(-2deg)',
            }}>{activeClub.clubLogoUrl
                ? <img src={activeClub.clubLogoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: 9, objectFit: 'cover' }} />
                : getClubShort(activeClub.clubName)
              }</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{activeClub.clubName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                  background: CLUB_ROLE_COLORS[activeClub.clubRole] ?? '#2563eb', color: '#fff',
                }}>{CLUB_ROLE_LABELS[activeClub.clubRole] ?? activeClub.clubRole}</span>
              </div>
            </div>
            <span style={{
              color: 'rgba(255,255,255,.35)', fontSize: 11, display: 'inline-block',
              transform: clubPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
            }}>▾</span>
          </button>

          {clubPickerOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 10, right: 10, zIndex: 30,
              background: 'var(--c-chrome-2)', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 12, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            }}>
              <div style={{ padding: '6px 10px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                CLB quản lý ({manageableClubs.length})
              </div>
              {manageableClubs.map(club => {
                const isActive = club.clubId === Number(clubId)
                return (
                  <button key={club.clubId}
                    onClick={() => { navigate(getClubManageEntry(club)); setClubPickerOpen(false); onNavigate?.() }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 8, marginBottom: 2, border: 'none',
                      background: isActive ? 'rgba(255,255,255,.08)' : 'transparent',
                      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: getClubColor(club.clubId),
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontWeight: 900, fontSize: 11, transform: 'rotate(-2deg)',
                    }}>{getClubShort(club.clubName)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, lineHeight: 1.2,
                        color: isActive ? '#fff' : 'rgba(255,255,255,.7)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{club.clubName}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                        background: CLUB_ROLE_COLORS[club.clubRole] ?? '#2563eb', color: '#fff',
                      }}>{CLUB_ROLE_LABELS[club.clubRole] ?? club.clubRole}</span>
                    </div>
                    {isActive && <span style={{ color: '#38bdf8', fontSize: 12 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mode label (non-club) */}
      {!showCollapsed && mode !== 'club' && (
        <div style={{ padding: '2px 20px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: modeColor, flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {mode === 'admin' ? 'Admin Panel' : 'Sinh viên'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {navItems.map((item) => (
          <div key={item.to}>
            <NavLink to={item.to} end={item.end ?? false} style={{ textDecoration: 'none', display: 'block' }} onClick={() => { onMobileClose?.(); onNavigate?.() }}>
              {({ isActive }) => (
                <div title={showCollapsed ? item.label : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: showCollapsed ? '9px 0' : '9px 12px',
                  justifyContent: showCollapsed ? 'center' : 'flex-start',
                  borderRadius: 10, marginBottom: 2,
                  background: isActive ? 'rgba(255,255,255,.10)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', transition: 'all .12s',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: isActive ? modeColor : 'rgba(255,255,255,.06)',
                    display: 'grid', placeItems: 'center', fontSize: 11,
                    color: isActive ? (mode === 'member' ? 'var(--c-ink)' : '#fff') : 'rgba(255,255,255,.4)',
                    transition: 'all .12s',
                  }}>{item.icon}</span>
                  {!showCollapsed && item.label}
                </div>
              )}
            </NavLink>
            {item.dividerAfter && (
              <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '6px 12px' }} />
            )}
          </div>
        ))}

        {/* Clubs list (member/SV mode) — flat list at the bottom */}
        {mode === 'member' && uniqueActiveMemberships.length > 0 && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '6px 12px' }} />
            {!showCollapsed && (
              <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.28)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Câu lạc bộ
              </div>
            )}
            {uniqueActiveMemberships.map(m => (
              <NavLink key={m.clubId} to={`/clubs/${m.clubId}/operations`} style={{ textDecoration: 'none', display: 'block' }} onClick={() => { onMobileClose?.(); onNavigate?.() }}>
                {({ isActive }) => (
                  <div title={showCollapsed ? m.clubName : undefined} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: showCollapsed ? '8px 0' : '8px 12px',
                    justifyContent: showCollapsed ? 'center' : 'flex-start',
                    borderRadius: 10, marginBottom: 2,
                    background: isActive ? 'rgba(255,255,255,.10)' : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', transition: 'all .12s',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: getClubColor(m.clubId),
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontWeight: 900, fontSize: 9,
                    }}>{m.clubLogoUrl
                        ? <img src={m.clubLogoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: 6, objectFit: 'cover' }} />
                        : getClubShort(m.clubName)
                      }</div>
                    {!showCollapsed && (
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.clubName}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        {showCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <SidebarUserAvatar initials={initials} avatarUrl={user?.avatarUrl} />
            <button onClick={handleLogout} title="Đăng xuất" style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', color: 'rgba(255,255,255,.35)',
              display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 15,
              fontFamily: 'inherit',
            }}>⏻</button>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 10, background: 'rgba(255,255,255,.04)',
          }}>
            <SidebarUserAvatar initials={initials} avatarUrl={user?.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName ?? 'Người dùng'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ?? ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <NotificationBell />
              <button onClick={handleLogout} title="Đăng xuất" style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'transparent', color: 'rgba(255,255,255,.35)',
                display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 15,
                fontFamily: 'inherit',
              }}>⏻</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}