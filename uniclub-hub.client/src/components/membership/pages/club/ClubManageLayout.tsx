import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileText, Building, ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/membership/layout/NotificationBell'
import UserMenu from '@/components/membership/layout/UserMenu'

export default function ClubManageLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  const { isSuperAdmin, user } = useAuth()
  const navigate = useNavigate()

  const club = user?.memberships.find(m => m.clubId === Number(clubId))

  const id = clubId!
  const navItems = [
    { to: `/clubs/${id}/manage`, label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: `/clubs/${id}/manage/members`, label: 'Thành viên', icon: Users },
    { to: `/clubs/${id}/manage/applications`, label: 'Đơn đăng ký', icon: FileText },
    { to: `/clubs/${id}/manage/departments`, label: 'Ban bộ phận', icon: Building },
    { to: `/clubs/${id}/manage/form`, label: 'Form đăng ký', icon: ClipboardList },
  ]

  const backTo = isSuperAdmin ? '/admin/clubs' : '/dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="w-48 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex flex-col justify-center px-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Quản lý CLB</p>
          <p className="font-semibold truncate" style={{ color: '#0f172a' }}>
            {club?.clubName ?? '...'}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-500"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft size={16} />
            {isSuperAdmin ? 'Quay lại Danh sách CLB' : 'Quay lại Dashboard'}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-end gap-2 px-6">
          <NotificationBell />
          <UserMenu />
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
