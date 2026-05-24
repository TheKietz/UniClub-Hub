import { useRef, useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import NotificationBell from '@/components/shared/NotificationBell'

type Mode = 'member' | 'admin' | 'club'

interface Props {
  mode: Mode
  clubId?: string
}

const CLUB_COLORS = ['#4f46e5', '#7c3aed', '#ff5a3c', '#14b8a6', '#38bdf8', '#ec4899', '#f59e0b', '#10b981']
const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}
const ROLE_COLORS: Record<string, string> = {
  CLUB_ADMIN: '#ff5a3c', DEPT_LEAD: '#f59e0b', MEMBER: '#14b8a6',
}

function getClubShort(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase()
}
function getClubColor(id: number) {
  return CLUB_COLORS[id % CLUB_COLORS.length]
}

const MEMBER_NAV = [
  { to: '/dashboard', icon: '◇', label: 'Dashboard', end: true },
  { to: '/profile', icon: '◐', label: 'Hồ sơ cá nhân', dividerAfter: true },
  { to: '/my-activity', icon: '↗', label: 'Hoạt động của tôi' },
  { to: '/my-history', icon: '◎', label: 'Lịch sử thành viên', dividerAfter: true },
  { to: '/my-tasks', icon: '✦', label: 'Task được giao' },
  { to: '/my-kpi', icon: '▦', label: 'KPI của tôi' },
  { to: '/support', icon: '◉', label: 'Hỗ trợ' },
]

const ADMIN_NAV = [
  { to: '/admin', icon: '◇', label: 'Tổng quan', end: true },
  { to: '/admin/users', icon: '◐', label: 'Người dùng' },
  { to: '/admin/clubs', icon: '▦', label: 'Câu lạc bộ' },
  { to: '/admin/categories', icon: '✦', label: 'Lĩnh vực', dividerAfter: true },
  { to: '/admin/support', icon: '◉', label: 'Hỗ trợ' },
  { to: '/admin/resignations', icon: '↗', label: 'Đơn từ chức' },
  { to: '/admin/audit-log', icon: '◎', label: 'Lịch sử thay đổi' },
  { to: '/admin/settings', icon: '⚙', label: 'Cài đặt hệ thống' },
  { to: '/admin/notification-preferences', icon: '◑', label: 'Cài đặt thông báo' },
]

function clubNav(id: string) {
  return [
    { to: `/clubs/${id}/manage`, icon: '◇', label: 'Tổng quan', end: true },
    { to: `/clubs/${id}/manage/members`, icon: '◐', label: 'Thành viên' },
    { to: `/clubs/${id}/manage/applications`, icon: '✦', label: 'Đơn ứng tuyển' },
    { to: `/clubs/${id}/manage/departments`, icon: '▦', label: 'Ban bộ phận', dividerAfter: true },
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
  const [clubPickerOpen, setClubPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false
  const manageableClubs = (user?.memberships ?? []).filter(
    m => m.status === MEMBERSHIP_STATUS.ACTIVE &&
      (m.clubRole === CLUB_ROLES.CLUB_ADMIN || m.clubRole === CLUB_ROLES.DEPT_LEAD)
  )
  const memberOnlyClubs = (user?.memberships ?? []).filter(
    m => m.status === MEMBERSHIP_STATUS.ACTIVE && m.clubRole === CLUB_ROLES.MEMBER
  )
  const activeClub = clubId
    ? user?.memberships.find(m => m.clubId === Number(clubId))
    : manageableClubs[0]

  const modeColor = mode === 'admin' ? '#ff5a3c' : mode === 'club' ? '#4f46e5' : '#facc15'
  const navItems = mode === 'admin' ? ADMIN_NAV
    : mode === 'club' && clubId ? clubNav(clubId)
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
      if (first) navigate(`/clubs/${first.clubId}/manage`)
    } else {
      navigate('/dashboard')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside style={{
      width: 250, height: '100vh', background: '#15131a',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1.5px solid rgba(255,255,255,.08)',
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      {/* Logo — click to go home */}
      <button
        onClick={() => navigate('/')}
        title="Về trang chủ"
        style={{
          padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit', width: '100%', transition: 'opacity .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: '#facc15',
          display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13,
          color: '#15131a', transform: 'rotate(-3deg)',
          boxShadow: '2px 2px 0 #ff5a3c', flexShrink: 0,
        }}>U!</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>UniClub</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#ff5a3c', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>★ UEF Campus</div>
        </div>
      </button>

      {/* Mode switcher */}
      <div style={{ padding: '0 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,.06)' }}>
          {([['member', 'SV'], ['admin', 'Admin'], ['club', 'CLB']] as [Mode, string][])
            .filter(([m]) => m !== 'admin' || isSuperAdmin)
            .filter(([m]) => m !== 'club' || manageableClubs.length > 0)
            .map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? modeColor : 'transparent',
                color: mode === m ? (m === 'member' ? '#15131a' : '#fff') : 'rgba(255,255,255,.5)',
                fontSize: 11, fontWeight: 700, transition: 'all .15s', fontFamily: 'inherit',
              }}>{label}</button>
            ))}
        </div>
      </div>

      {/* Club selector (club mode only) */}
      {mode === 'club' && activeClub && (
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
                  background: ROLE_COLORS[activeClub.clubRole] ?? '#4f46e5', color: '#fff',
                }}>{ROLE_LABELS[activeClub.clubRole] ?? activeClub.clubRole}</span>
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
              background: '#1e1c24', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 12, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            }}>
              <div style={{ padding: '6px 10px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                CLB của bạn ({manageableClubs.length})
              </div>
              {manageableClubs.map(club => {
                const isActive = club.clubId === Number(clubId)
                return (
                  <button key={club.clubId}
                    onClick={() => { navigate(`/clubs/${club.clubId}/manage`); setClubPickerOpen(false) }}
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
                        background: ROLE_COLORS[club.clubRole] ?? '#4f46e5', color: '#fff',
                      }}>{ROLE_LABELS[club.clubRole] ?? club.clubRole}</span>
                    </div>
                    {isActive && <span style={{ color: '#facc15', fontSize: 12 }}>✓</span>}
                  </button>
                )
              })}
              {memberOnlyClubs.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 8px' }} />
                  <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                    Chỉ là thành viên
                  </div>
                  {memberOnlyClubs.map(club => (
                    <div key={club.clubId} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, opacity: 0.5,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, background: getClubColor(club.clubId),
                        display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 9,
                      }}>{getClubShort(club.clubName)}</div>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.2 }}>{club.clubName}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>Xem ở trang SV</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode label (non-club) */}
      {mode !== 'club' && (
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
            <NavLink to={item.to} end={item.end ?? false} style={{ textDecoration: 'none', display: 'block' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                  background: isActive ? 'rgba(255,255,255,.10)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', transition: 'all .12s',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: isActive ? modeColor : 'rgba(255,255,255,.06)',
                    display: 'grid', placeItems: 'center', fontSize: 11,
                    color: isActive ? (mode === 'member' ? '#15131a' : '#fff') : 'rgba(255,255,255,.4)',
                    transition: 'all .12s',
                  }}>{item.icon}</span>
                  {item.label}
                </div>
              )}
            </NavLink>
            {(item as any).dividerAfter && (
              <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '6px 12px' }} />
            )}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          borderRadius: 10, background: 'rgba(255,255,255,.04)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 32, flexShrink: 0,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontSize: 12, fontWeight: 800,
          }}>{initials}</div>
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
      </div>
    </aside>
  )
}
