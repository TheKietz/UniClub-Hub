import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, LayoutDashboard, ShieldCheck, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('').toUpperCase()
  const r = size / 2
  return url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--c-ink)' }} />
    : <div style={{ width: size, height: size, borderRadius: r, background: avatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800, flexShrink: 0, border: '1.5px solid var(--c-ink)' }}>{initials}</div>
}

function MenuItem({ icon: Icon, label, onClick, color = 'var(--c-ink)' }: { icon: React.ElementType; label: string; onClick: () => void; color?: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', background: hover ? 'var(--c-bg)' : 'transparent',
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
  const [pos, setPos] = useState({ top: 0, right: 0 })

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
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  function go(path: string) { navigate(path); setOpen(false) }

  // Context-aware items
  const isOnManagement = pathname.startsWith('/admin') || pathname.includes('/manage')
  const managedClub = user?.memberships.find(m => m.status === MEMBERSHIP_STATUS.ACTIVE && m.clubRole === CLUB_ROLES.CLUB_ADMIN)

  const mainNav = isOnManagement
    ? { label: 'Dashboard sinh viên', icon: LayoutDashboard, to: '/dashboard' }
    : isSuperAdmin
    ? { label: 'Admin Panel', icon: ShieldCheck, to: '/admin' }
    : { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 38, padding: '0 10px 0 6px',
          borderRadius: 999, border: '1.5px solid var(--c-ink)',
          background: open ? 'var(--c-ink)' : '#fff',
          boxShadow: open ? 'none' : '2px 2px 0 var(--c-ink)',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        <Avatar name={name} url={user?.avatarUrl} size={26} />
        <span style={{
          fontSize: 13, fontWeight: 700, maxWidth: 120, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: open ? '#facc15' : 'var(--c-ink)',
          fontFamily: "'Be Vietnam Pro', sans-serif",
        }}>
          {user?.fullName ?? user?.email}
        </span>
        <ChevronDown size={13} style={{
          color: open ? '#facc15' : '#918c99', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
        }} />
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed', top: pos.top, right: pos.right,
            width: 240, background: '#fff',
            border: '1.5px solid var(--c-ink)', borderRadius: 14,
            boxShadow: '4px 4px 0 var(--c-ink)',
            zIndex: 9999, overflow: 'hidden',
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          {/* Profile card */}
          <div style={{ padding: '14px', borderBottom: '1px solid #e8e3d6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={name} url={user?.avatarUrl} size={40} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--c-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName ?? user?.email}
                </p>
                {user?.studentId && <p style={{ fontSize: 11, color: '#4a4651', margin: '2px 0 0' }}>{user.studentId}</p>}
                {user?.major && <p style={{ fontSize: 11, color: '#918c99', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.major}</p>}
              </div>
            </div>
          </div>

          {/* Nav items */}
          <div style={{ padding: '6px 0' }}>
            <MenuItem icon={mainNav.icon} label={mainNav.label} onClick={() => go(mainNav.to)} color="#4f46e5" />
            {!isOnManagement && managedClub && (
              <MenuItem icon={Settings} label={`Quản lý ${managedClub.clubName}`} onClick={() => go(`/clubs/${managedClub.clubId}/manage`)} color="#4f46e5" />
            )}
          </div>

          <div style={{ borderTop: '1px solid #e8e3d6', padding: '6px 0' }}>
            <MenuItem icon={LogOut} label="Đăng xuất" onClick={() => { logout(); navigate('/login', { replace: true }) }} color="#ef4444" />
          </div>
        </div>
      )}
    </>
  )
}
