import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubStats } from '@/lib/clubApi'
import type { ClubStats } from '@/types/club'
import { Users, Building, FileText, UserCheck } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  DEPT_DEPUTY: 'Phó ban',
  MEMBER: 'Thành viên',
}

export default function ClubManageDashboard() {
  const { clubId } = useParams<{ clubId: string }>()
  const [stats, setStats] = useState<ClubStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clubId) return
    getClubStats(Number(clubId))
      .then(setStats)
      .catch(() => setError('Không thể tải thống kê CLB.'))
      .finally(() => setLoading(false))
  }, [clubId])

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!stats) return null

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{stats.clubName}</h1>
        <p className="text-gray-500 mt-1">Tổng quan hoạt động câu lạc bộ</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Thành viên" value={stats.totalActiveMembers} icon={Users} color="bg-indigo-500" />
        <StatCard label="Ban bộ phận" value={stats.totalDepartments} icon={Building} color="bg-emerald-500" />
        <StatCard label="Đơn chờ duyệt" value={stats.applications.pending} icon={FileText} color="bg-yellow-500" />
        <StatCard label="Đã duyệt" value={stats.applications.accepted} icon={UserCheck} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Phân bổ theo vai trò */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Thành viên theo vai trò</h2>
          {Object.keys(stats.membersByRole).length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.membersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{ROLE_LABELS[role] ?? role}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phân bổ theo ban */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Thành viên theo ban</h2>
          {stats.membersByDepartment.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-2">
              {stats.membersByDepartment.map((d, i) => (
                <div key={d.departmentId ?? i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate">{d.departmentName}</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{d.memberCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Đơn đăng ký */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Đơn đăng ký</h2>
        <div className="space-y-3">
          {[
            { label: 'Chờ duyệt', value: stats.applications.pending, color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Phỏng vấn', value: stats.applications.interview, color: 'bg-blue-100 text-blue-700' },
            { label: 'Đã duyệt', value: stats.applications.accepted, color: 'bg-green-100 text-green-700' },
            { label: 'Từ chối', value: stats.applications.rejected, color: 'bg-red-100 text-red-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{label}</span>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
