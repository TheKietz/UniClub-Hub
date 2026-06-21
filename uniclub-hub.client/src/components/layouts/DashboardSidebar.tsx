import { useRef, useState, useEffect, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import type { UserMembership } from '@/types/auth'
import NotificationBell from '@/components/shared/NotificationBell'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'
import { D } from '@/components/shared/managementTheme'
import { useClubPermissions } from '@/hooks/useClubPermissions'

const ROLE_RANK = { CLUB_ADMIN: 3, DEPT_LEAD: 2, MEMBER: 1 } as const
function roleRank(role: string) {
  return ROLE_RANK[role as keyof typeof ROLE_RANK] ?? 0
}

type Mode = 'member' | 'admin' | 'club'
type NavItem = { to: string; icon: string; label: string; end?: boolean; dividerAfter?: boolean }

interface Props {
  mode: Mode
  clubId?: string
}

const CLUB_COLORS = ['#1d4ed8', '#7c3aed', '#ff5a3c', '#14b8a6', '#38bdf8', '#ec4899', '#f59e0b', '#10b981']
const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}
const ROLE_COLORS: Record<string, string> = {
  CLUB_ADMIN: D.coral, DEPT_LEAD: D.amber, MEMBER: D.emerald,
}
const SIDEBAR_BG = '#1f4f8f'
const SIDEBAR_PANEL = 'rgba(255,255,255,.10)'
const SIDEBAR_PANEL_ACTIVE = 'rgba(255,255,255,.16)'
const SIDEBAR_BORDER = '1px solid rgba(255,255,255,.16)'
const SIDEBAR_TEXT_MUTED = 'rgba(255,255,255,.72)'
const SIDEBAR_TEXT_SUBTLE = 'rgba(255,255,255,.58)'

function getClubShort(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase()
}
function getClubColor(id: number) {
  return CLUB_COLORS[id % CLUB_COLORS.length]
}

const MEMBER_NAV: NavItem[] = [
  { to: '/dashboard', icon: '◇', label: 'Dashboard', end: true },
  { to: '/notifications', icon: '◑', label: 'Thông báo' },
  { to: '/profile', icon: '◐', label: 'Hồ sơ cá nhân', dividerAfter: true },
  { to: '/my-activity', icon: '↗', label: 'Hoạt động của tôi' },
  { to: '/my-history', icon: '◎', label: 'Lịch sử thành viên', dividerAfter: true },
  { to: '/my-tasks', icon: '✦', label: 'Task được giao' },
  { to: '/my-kpi', icon: '▦', label: 'KPI của tôi' },
  { to: '/support', icon: '◉', label: 'Hỗ trợ' },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', icon: '◇', label: 'Tổng quan', end: true },
  { to: '/admin/users', icon: '◐', label: 'Người dùng' },
  { to: '/admin/clubs', icon: '▦', label: 'Câu lạc bộ' },
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
    const items: NavItem[] = []
    if (perms.positions) items.push(positionsItem)
    if (perms.members) items.push({ to: `/clubs/${id}/manage/members`, icon: '◐', label: 'Thành viên' })
    if (perms.applications) items.push({ to: `/clubs/${id}/manage/applications`, icon: '✦', label: 'Đơn ứng tuyển' })
    if (perms.departments) items.push({ to: `/clubs/${id}/manage/departments`, icon: '▦', label: 'Ban bộ phận' })
    if (perms.kpiView) items.push({ to: `/clubs/${id}/manage/kpi`, icon: '▥', label: 'KPI thành viên', end: true })
    if (perms.kpiManage) items.push({ to: `/clubs/${id}/manage/kpi/config`, icon: '◫', label: 'Cấu hình KPI' })
    if (perms.orgChart) items.push({ to: `/clubs/${id}/manage/orgchart`, icon: '⊹', label: 'Sơ đồ tổ chức' })
    if (perms.pipeline) items.push({ to: `/clubs/${id}/manage/pipeline`, icon: '↗', label: 'Quy trình tuyển' })
    if (perms.form) items.push({ to: `/clubs/${id}/manage/form`, icon: '✦', label: 'Form đăng ký' })
    if (perms.resignations) items.push({ to: `/clubs/${id}/manage/resignations`, icon: '⊖', label: 'Đơn từ chức' })
    if (perms.notifications) items.push({ to: `/clubs/${id}/manage/notifications`, icon: '◑', label: 'Cài đặt thông báo' })
    if (perms.settings) items.push({ to: `/clubs/${id}/manage/settings`, icon: '◉', label: 'Cài đặt CLB' })
    if (perms.auditLog) items.push({ to: `/clubs/${id}/manage/audit-log`, icon: '◎', label: 'Lịch sử thay đổi' })
    return items
  }

  const positionItems = perms.positions ? [{ ...positionsItem, dividerAfter: true }] : []
  return [
    { to: `/clubs/${id}/manage`, icon: '◇', label: 'Tổng quan', end: true },
    { to: `/clubs/${id}/manage/report`, icon: '↓', label: 'Báo cáo' },
    { to: `/clubs/${id}/manage/members`, icon: '◐', label: 'Thành viên' },
    { to: `/clubs/${id}/manage/events`, icon: '◐', label: 'Sự kiện' },
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
  ]
}

export default function DashboardSidebar({ mode, clubId }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [clubPickerOpen, setClubPickerOpen] = useState(false)
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
  const activeClub = clubId
    ? user?.memberships.find(m => m.clubId === Number(clubId))
    : manageableClubs[0]
  const permissions = useClubPermissions(clubId ? Number(clubId) : activeClub?.clubId)

  const clubPerms = useMemo<ClubPerms>(() => {
    return {
      positions: permissions.canAny(CLUB_PERMISSIONS.ORG_CHART_VIEW, CLUB_PERMISSIONS.ORG_CHART_MANAGE, CLUB_PERMISSIONS.POSITIONS_MANAGE, CLUB_PERMISSIONS.POSITION_ASSIGNMENTS_MANAGE),
      members: permissions.canAny(CLUB_PERMISSIONS.MEMBERS_VIEW, CLUB_PERMISSIONS.MEMBERS_MANAGE),
      applications: permissions.canAny(CLUB_PERMISSIONS.APPLICATIONS_VIEW, CLUB_PERMISSIONS.APPLICATIONS_REVIEW),
      departments: permissions.can(CLUB_PERMISSIONS.DEPARTMENTS_MANAGE),
      pipeline: permissions.can(CLUB_PERMISSIONS.RECRUITMENT_PIPELINE_MANAGE),
      form: permissions.can(CLUB_PERMISSIONS.RECRUITMENT_FORM_MANAGE),
      orgChart: permissions.can(CLUB_PERMISSIONS.ORG_CHART_MANAGE),
      kpiView: permissions.can(CLUB_PERMISSIONS.MEMBER_KPI_VIEW),
      kpiManage: permissions.can(CLUB_PERMISSIONS.MEMBER_KPI_MANAGE),
      resignations: permissions.canAny(CLUB_PERMISSIONS.RESIGNATIONS_VIEW, CLUB_PERMISSIONS.RESIGNATIONS_REVIEW),
      notifications: permissions.can(CLUB_PERMISSIONS.NOTIFICATION_SETTINGS_MANAGE),
      settings: permissions.canAny(CLUB_PERMISSIONS.CLUB_SETTINGS_MANAGE, CLUB_PERMISSIONS.CLUB_PROFILE_MANAGE),
      auditLog: permissions.can(CLUB_PERMISSIONS.CLUB_AUDIT_LOG_VIEW),
    }
  }, [permissions])

  const modeColor = mode === 'admin' ? D.coral : mode === 'club' ? D.indigo : D.card
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

  function switchMode(m: Mode) {
    if (m === 'admin') navigate('/admin')
    else if (m === 'club') {
      const first = manageableClubs[0]
      if (first) navigate(getClubManageEntry(first))
    } else {
      navigate('/dashboard')
    }
  }

  function getClubManageEntry(club: UserMembership) {
    if (club.clubRole !== CLUB_ROLES.DEPT_LEAD || isSuperAdmin)
      return `/clubs/${club.clubId}/manage`
    if (clubPerms.positions) return `/clubs/${club.clubId}/manage/positions`
    if (clubPerms.members) return `/clubs/${club.clubId}/manage/members`
    if (clubPerms.applications) return `/clubs/${club.clubId}/manage/applications`
    return `/clubs/${club.clubId}/manage/positions`
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside style={{
      width: collapsed ? 60 : 250, height: '100vh', background: SIDEBAR_BG,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: SIDEBAR_BORDER,
      fontFamily: "'Be Vietnam Pro', sans-serif",
      transition: 'width .2s ease', overflow: 'hidden',
    }}>
      {/* Logo — click to go home */}
      {collapsed ? (
        <div style={{ padding: '12px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button onClick={() => navigate('/')} title="Về trang chủ" style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            transition: 'opacity .15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: D.ink,
              display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13,
              color: D.card, transform: 'rotate(-3deg)', boxShadow: `2px 2px 0 ${D.coral}`,
              border: '1.5px solid rgba(255,255,255,.85)',
            }}>U!</div>
          </button>
          <button
            onClick={() => { setCollapsed(false); setClubPickerOpen(false) }}
            title="Mở rộng"
            style={{
              width: 32, height: 24, borderRadius: 6, border: SIDEBAR_BORDER,
              background: SIDEBAR_PANEL, color: SIDEBAR_TEXT_MUTED,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
            }}
          >›</button>
        </div>
      ) : (
        <div style={{ padding: '14px 10px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/')} title="Về trang chủ" style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit', padding: 0, transition: 'opacity .15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: D.ink,
              display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13,
              color: D.card, transform: 'rotate(-3deg)', boxShadow: `2px 2px 0 ${D.coral}`, flexShrink: 0,
              border: '1.5px solid rgba(255,255,255,.85)',
            }}>U!</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>UniClub</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: D.coral, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>★ UEF Campus</div>
            </div>
          </button>
          <button
            onClick={() => { setCollapsed(true); setClubPickerOpen(false) }}
            title="Thu gọn"
            style={{
              width: 28, height: 28, borderRadius: 8, border: SIDEBAR_BORDER,
              background: SIDEBAR_PANEL, color: SIDEBAR_TEXT_MUTED,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit', flexShrink: 0, transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = SIDEBAR_PANEL_ACTIVE)}
            onMouseLeave={e => (e.currentTarget.style.background = SIDEBAR_PANEL)}
          >‹</button>
        </div>
      )}

      {/* Mode switcher */}
      {!collapsed && <div style={{ padding: '0 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: SIDEBAR_PANEL }}>
          {([['member', 'SV'], ['admin', 'Admin'], ['club', 'CLB']] as [Mode, string][])
            .filter(([m]) => m !== 'admin' || isSuperAdmin)
            .filter(([m]) => m !== 'club' || manageableClubs.length > 0)
            .map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? modeColor : 'transparent',
                color: mode === m ? (m === 'member' ? D.ink : '#fff') : SIDEBAR_TEXT_MUTED,
                fontSize: 11, fontWeight: 700, transition: 'all .15s', fontFamily: 'inherit',
              }}>{label}</button>
            ))}
        </div>
      </div>}

      {/* Club selector (club mode only) */}
      {!collapsed && mode === 'club' && activeClub && (
        <div ref={pickerRef} style={{ padding: '0 10px 8px', position: 'relative' }}>
          <button onClick={() => setClubPickerOpen(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12, border: SIDEBAR_BORDER,
            background: SIDEBAR_PANEL, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
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
                  background: ROLE_COLORS[activeClub.clubRole] ?? D.indigo, color: '#fff',
                }}>{ROLE_LABELS[activeClub.clubRole] ?? activeClub.clubRole}</span>
              </div>
            </div>
            <span style={{
              color: SIDEBAR_TEXT_SUBTLE, fontSize: 11, display: 'inline-block',
              transform: clubPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
            }}>▾</span>
          </button>

          {clubPickerOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 10, right: 10, zIndex: 30,
              background: '#173f77', border: SIDEBAR_BORDER,
              borderRadius: 12, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            }}>
              <div style={{ padding: '6px 10px 6px', fontSize: 10, fontWeight: 700, color: SIDEBAR_TEXT_SUBTLE, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                CLB quản lý ({manageableClubs.length})
              </div>
              {manageableClubs.map(club => {
                const isActive = club.clubId === Number(clubId)
                return (
                  <button key={club.clubId}
                    onClick={() => { navigate(getClubManageEntry(club)); setClubPickerOpen(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 8, marginBottom: 2, border: 'none',
                      background: isActive ? SIDEBAR_PANEL_ACTIVE : 'transparent',
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
                        color: isActive ? '#fff' : SIDEBAR_TEXT_MUTED,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{club.clubName}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                        background: ROLE_COLORS[club.clubRole] ?? D.indigo, color: '#fff',
                      }}>{ROLE_LABELS[club.clubRole] ?? club.clubRole}</span>
                    </div>
                    {isActive && <span style={{ color: D.card, fontSize: 12 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Club picker (member/SV mode) */}
      {!collapsed && mode === 'member' && uniqueActiveMemberships.length > 0 && (
        <div ref={pickerRef} style={{ padding: '0 10px 8px', position: 'relative' }}>
          <button onClick={() => setClubPickerOpen(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12, border: SIDEBAR_BORDER,
            background: SIDEBAR_PANEL, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {activeClub ? (
              <>
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
                  <div style={{ marginTop: 2 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: ROLE_COLORS[activeClub.clubRole] ?? D.indigo, color: '#fff',
                    }}>{ROLE_LABELS[activeClub.clubRole] ?? activeClub.clubRole}</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: SIDEBAR_TEXT_SUBTLE }}>
                Chọn câu lạc bộ
              </div>
            )}
            <span style={{
              color: SIDEBAR_TEXT_SUBTLE, fontSize: 11, display: 'inline-block',
              transform: clubPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
            }}>▾</span>
          </button>

          {clubPickerOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 10, right: 10, zIndex: 30,
              background: '#173f77', border: SIDEBAR_BORDER,
              borderRadius: 12, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            }}>
              <div style={{ padding: '6px 10px 6px', fontSize: 10, fontWeight: 700, color: SIDEBAR_TEXT_SUBTLE, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                CLB của bạn ({uniqueActiveMemberships.length})
              </div>
              {uniqueActiveMemberships.map(m => {
                const isActive = m.clubId === Number(clubId)
                return (
                  <button key={m.clubId}
                    onClick={() => { navigate(`/clubs/${m.clubId}/operations`); setClubPickerOpen(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 8, marginBottom: 2, border: 'none',
                      background: isActive ? SIDEBAR_PANEL_ACTIVE : 'transparent',
                      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: getClubColor(m.clubId),
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontWeight: 900, fontSize: 11, transform: 'rotate(-2deg)',
                    }}>{m.clubLogoUrl
                        ? <img src={m.clubLogoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                        : getClubShort(m.clubName)
                      }</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, lineHeight: 1.2,
                        color: isActive ? '#fff' : SIDEBAR_TEXT_MUTED,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{m.clubName}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                        background: ROLE_COLORS[m.clubRole] ?? D.indigo, color: '#fff',
                      }}>{ROLE_LABELS[m.clubRole] ?? m.clubRole}</span>
                    </div>
                    {isActive && <span style={{ color: D.card, fontSize: 12 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mode label (non-club) */}
      {!collapsed && mode !== 'club' && (
        <div style={{ padding: '2px 20px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: modeColor, flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: SIDEBAR_TEXT_MUTED, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {mode === 'admin' ? 'Admin Panel' : 'Sinh viên'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {navItems.map((item) => (
          <div key={item.to}>
            <NavLink to={item.to} end={item.end ?? false} style={{ textDecoration: 'none', display: 'block' }}>
              {({ isActive }) => (
                <div title={collapsed ? item.label : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '9px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10, marginBottom: 2,
                  background: isActive ? SIDEBAR_PANEL_ACTIVE : 'transparent',
                  color: isActive ? '#fff' : SIDEBAR_TEXT_MUTED,
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', transition: 'all .12s',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: isActive ? modeColor : SIDEBAR_PANEL,
                    display: 'grid', placeItems: 'center', fontSize: 11,
                    color: isActive ? (mode === 'member' ? D.ink : '#fff') : SIDEBAR_TEXT_MUTED,
                    transition: 'all .12s',
                  }}>{item.icon}</span>
                  {!collapsed && item.label}
                </div>
              )}
            </NavLink>
            {item.dividerAfter && (
              <div style={{ height: 1, background: 'rgba(255,255,255,.14)', margin: '6px 12px' }} />
            )}
          </div>
        ))}

      </nav>

      {/* User footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.14)' }}>
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div title={user?.fullName ?? 'Người dùng'} style={{
              width: 32, height: 32, borderRadius: 32, flexShrink: 0,
              background: `linear-gradient(135deg, ${D.indigo}, ${D.coral})`,
              display: 'grid', placeItems: 'center',
              color: '#fff', fontSize: 12, fontWeight: 800,
            }}>{initials}</div>
            <button onClick={handleLogout} title="Đăng xuất" style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', color: SIDEBAR_TEXT_SUBTLE,
              display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 15,
              fontFamily: 'inherit',
            }}>⏻</button>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 10, background: SIDEBAR_PANEL,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 32, flexShrink: 0,
              background: `linear-gradient(135deg, ${D.indigo}, ${D.coral})`,
              display: 'grid', placeItems: 'center',
              color: '#fff', fontSize: 12, fontWeight: 800,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName ?? 'Người dùng'}
              </div>
              <div style={{ fontSize: 10, color: SIDEBAR_TEXT_SUBTLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ?? ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <NotificationBell />
              <button onClick={handleLogout} title="Đăng xuất" style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'transparent', color: SIDEBAR_TEXT_SUBTLE,
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
