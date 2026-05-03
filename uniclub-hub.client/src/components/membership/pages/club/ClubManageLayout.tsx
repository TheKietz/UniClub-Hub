import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getClubDetail } from '@/components/membership/services/clubApi'
import type { ClubDetail } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileText, Building, ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ClubManageLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [club, setClub] = useState<ClubDetail | null>(null)

  useEffect(() => {
    if (clubId) getClubDetail(Number(clubId)).then(setClub).catch(() => { })
  }, [clubId])

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
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-gray-500 -ml-1"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft size={16} /> Quay lại
          </Button>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Quản lý CLB</p>
            <p className="font-semibold text-gray-900 truncate mt-0.5">
              {club?.name ?? '...'}
            </p>
            {club && (
              <p className="text-xs text-gray-400 font-mono">{club.code}</p>
            )}
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
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
