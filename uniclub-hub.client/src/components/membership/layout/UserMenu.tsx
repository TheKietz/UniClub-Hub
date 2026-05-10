import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, LayoutDashboard, ShieldCheck, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'

export default function UserMenu() {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const initials = (user?.fullName ?? user?.email ?? '?')
    .trim().split(' ').filter(Boolean)
    .map(w => w[0]).slice(-2).join('').toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Context-aware switch button
  const isOnManagement = pathname.startsWith('/admin') || pathname.includes('/manage')
  const managedClub = user?.memberships.find(m => m.status === MEMBERSHIP_STATUS.ACTIVE && m.clubRole === CLUB_ROLES.CLUB_ADMIN)

  let switchBtn: { label: string; icon: React.ElementType; to: string } | null = null
  if (isOnManagement) {
    switchBtn = { label: 'Chuyển sang Dashboard', icon: LayoutDashboard, to: '/dashboard' }
  } else if (isSuperAdmin) {
    switchBtn = { label: 'Chuyển sang Admin', icon: ShieldCheck, to: '/admin' }
  } else if (managedClub) {
    switchBtn = { label: `Quản lý ${managedClub.clubName}`, icon: Settings, to: `/clubs/${managedClub.clubId}/manage` }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {initials}
          </div>
        )}
        <span className="text-sm font-medium max-w-[140px] truncate" style={{ color: '#374151' }}>
          {user?.fullName ?? user?.email}
        </span>
        <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Profile card */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                  {user?.fullName ?? user?.email}
                </p>
                {user?.studentId && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{user.studentId}</p>}
                {user?.major && <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{user.major}</p>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            {switchBtn && (
              <button
                onClick={() => { navigate(switchBtn!.to); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50"
                style={{ color: '#4f46e5' }}
              >
                <switchBtn.icon size={15} />
                {switchBtn.label}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-50"
              style={{ color: '#dc2626' }}
            >
              <LogOut size={15} />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
