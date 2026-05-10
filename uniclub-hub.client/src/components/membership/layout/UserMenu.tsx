import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {/* Avatar */}
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
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
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                  {user?.fullName ?? user?.email}
                </p>
                {user?.studentId && (
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{user.studentId}</p>
                )}
                {user?.major && (
                  <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{user.major}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
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
