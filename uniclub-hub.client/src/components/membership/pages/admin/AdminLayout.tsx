import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, Tag, Network, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import UserMenu from '@/components/membership/layout/UserMenu'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/clubs', label: 'Câu lạc bộ', icon: Building2 },
  { to: '/admin/structure', label: 'Cơ cấu tổ chức', icon: Network },
  { to: '/admin/categories', label: 'Lĩnh vực', icon: Tag },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">U</span>
            </div>
            <div>
              <p style={{ color: '#0f172a', fontSize: '0.875rem', fontWeight: 600 }}>UniClub Hub</p>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
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
            variant="ghost" size="sm"
            className="w-full justify-start gap-2 text-gray-500"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} /> Về Dashboard
          </Button>
        </div>
      </aside>

      {/* Right side: topbar + content */}
      <div className="flex-1 flex flex-col ml-60">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-10">
          <UserMenu />
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
