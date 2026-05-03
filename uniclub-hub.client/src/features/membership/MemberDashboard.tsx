import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Users, ChevronRight, Search } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  DEPT_DEPUTY: 'Phó ban',
  MEMBER: 'Thành viên',
}

export default function MemberDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const activeMemberships = user?.memberships.filter(m => m.status === 'Active') ?? []
  const managedClubs = activeMemberships.filter(m => m.clubRole === CLUB_ROLES.CLUB_ADMIN)
  const memberClubs = activeMemberships.filter(m => m.clubRole !== CLUB_ROLES.CLUB_ADMIN)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {user?.fullName ?? user?.email} 👋
          </h1>
          <p className="text-gray-500 mt-1">Quản lý hoạt động câu lạc bộ của bạn</p>
        </div>

        {/* CLB đang quản lý */}
        {managedClubs.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">CLB bạn đang quản lý</h2>
            <div className="space-y-3">
              {managedClubs.map(m => (
                <div key={m.clubId} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{m.clubName}</p>
                    <Badge variant="outline" className="mt-0.5 text-xs">
                      {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/clubs/${m.clubId}/manage`)}
                    className="gap-1 shrink-0"
                  >
                    Quản lý <ChevronRight size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CLB đang tham gia */}
        {memberClubs.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">CLB bạn đang tham gia</h2>
            <div className="space-y-3">
              {memberClubs.map(m => (
                <div key={m.clubId} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{m.clubName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                      </Badge>
                      {m.departmentName && (
                        <span className="text-xs text-gray-400">{m.departmentName}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chưa tham gia CLB nào */}
        {activeMemberships.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Bạn chưa tham gia câu lạc bộ nào</p>
            <p className="text-sm text-gray-400 mt-1">Khám phá và đăng ký tham gia ngay</p>
            <Button className="mt-4 gap-2" onClick={() => navigate('/clubs')}>
              <Search size={16} /> Khám phá CLB
            </Button>
          </div>
        )}

        {/* Nút khám phá thêm */}
        {activeMemberships.length > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/clubs')} className="gap-2">
              <Search size={16} /> Khám phá thêm CLB
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
