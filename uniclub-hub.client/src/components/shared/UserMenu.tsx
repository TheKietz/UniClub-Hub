import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, LayoutDashboard, ShieldCheck, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { D } from '@/components/shared/managementTheme'

const AVATAR_COLORS = [D.indigo, D.violet, '#ec4899', D.amber, D.emerald, '#3b82f6']

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('').toUpperCase()
  const r = size / 2
  return url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flexShrink: 0, border: D.border }} />
    : <div style={{ width: size, height: size, borderRadius: r, background: avatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800, flexShrink: 0, border: D.border }}>{initials}</div>
}

function MenuItem({ icon: Icon, label, onClick, color = D.ink }: { icon: React.ElementType; label: string; onClick: () => void; color?: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', background: hover ? D.bg : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        fontSize: 13, fontWeight: 600, color,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        transition: 'background .1s',
      }}
    >
      <Icon size={14} style={{ flexShrink: 0 }} />
      {label}
    </button>
  )
}

export default function UserMenu() {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const name = user?.fullName ?? user?.email ?? '?'

  function handleToggle() {
    setOpen(v => !v)
  }

  function go(path: string) { navigate(path); setOpen(false) }

  // Context-aware items
  const isOnManagement = pathname.startsWith('/admin') || pathname.includes('/manage')
  const managedClub = user?.memberships.find(m => m.status === MEMBERSHIP_STATUS.ACTIVE && m.clubRole === CLUB_ROLES.CLUB_ADMIN)

  const mainNav = isOnManagement
    ? { label: 'Tổng quan sinh viên', icon: LayoutDashboard, to: '/dashboard' }
    : isSuperAdmin
    ? { label: 'Admin Panel', icon: ShieldCheck, to: '/admin' }
    : { label: 'Tổng quan', icon: LayoutDashboard, to: '/dashboard' }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 38, padding: '0 10px 0 6px',
          borderRadius: 999, border: D.border,
          background: open ? D.ink : D.card,
          boxShadow: open ? 'none' : D.shadow(2, 2),
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        <Avatar name={name} url={user?.avatarUrl} size={26} />
        <span style={{
          fontSize: 13, fontWeight: 700, maxWidth: 120, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: open ? '#ffffff' : D.ink,
          fontFamily: "'Be Vietnam Pro', sans-serif",
        }}>
          {user?.fullName ?? user?.email}
        </span>
        <ChevronDown size={13} style={{
          color: open ? '#ffffff' : D.inkMuted, flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
        }} />
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 240,
            maxWidth: 'calc(100vw - 32px)',
            background: D.card,
            border: D.border,
            borderRadius: D.radius,
            boxShadow: D.shadow(4, 4),
            zIndex: 9999, overflow: 'hidden',
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          {/* Profile card */}
          <div style={{ padding: '14px', borderBottom: D.borderLight }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={name} url={user?.avatarUrl} size={40} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName ?? user?.email}
                </p>
                {user?.studentId && <p style={{ fontSize: 11, color: D.inkDim, margin: '2px 0 0' }}>{user.studentId}</p>}
                {user?.major && <p style={{ fontSize: 11, color: D.inkMuted, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.major}</p>}
              </div>
            </div>
          </div>

          {/* Nav items */}
          <div style={{ padding: '6px 0' }}>
            <MenuItem icon={mainNav.icon} label={mainNav.label} onClick={() => go(mainNav.to)} color={D.indigo} />
            {!isOnManagement && managedClub && (
              <MenuItem icon={Settings} label={`Quản lý ${managedClub.clubName}`} onClick={() => go(`/clubs/${managedClub.clubId}/manage`)} color={D.indigo} />
            )}
          </div>

          <div style={{ borderTop: D.borderLight, padding: '6px 0' }}>
            <MenuItem icon={LogOut} label="Đăng xuất" onClick={() => { logout(); navigate('/', { replace: true }) }} color={D.red} />
          </div>
        </div>
      )}
    </div>
  )
}
