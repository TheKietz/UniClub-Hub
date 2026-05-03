import { useEffect, useState } from 'react'
import { getSystemStats } from '@/lib/adminApi'
import type { SystemStats } from '@/types/admin'
import { Users, Building2, UserCheck, FileText } from 'lucide-react'

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
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSystemStats()
      .then(setStats)
      .catch(() => setError('Không thể tải dữ liệu thống kê.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!stats) return null

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Tổng quan hệ thống UniClub Hub</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Người dùng" value={stats.totalUsers} icon={Users} color="bg-indigo-500" />
        <StatCard label="Câu lạc bộ" value={stats.totalClubs} icon={Building2} color="bg-emerald-500" />
        <StatCard label="CLB đang hoạt động" value={stats.activeClubs} icon={Building2} color="bg-blue-500" />
        <StatCard label="Thành viên tích cực" value={stats.totalActiveMembers} icon={UserCheck} color="bg-violet-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Đơn đăng ký */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Đơn đăng ký CLB</h2>
          </div>
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
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Tổng</span>
              <span className="text-sm font-bold text-gray-900">{stats.applications.total}</span>
            </div>
          </div>
        </div>

        {/* CLB theo lĩnh vực */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">CLB theo lĩnh vực</h2>
          </div>
          {stats.clubsByCategory.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-2">
              {stats.clubsByCategory.map(c => (
                <div key={c.categoryId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate">{c.categoryName}</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{c.clubCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top CLB */}
      {stats.topClubsByMembers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top CLB nhiều thành viên nhất</h2>
          <div className="space-y-2">
            {stats.topClubsByMembers.map((club, i) => (
              <div key={club.clubId} className="flex items-center gap-3">
                <span className="w-6 text-sm font-bold text-gray-400">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-700">{club.clubName}</span>
                <span className="text-sm font-semibold text-indigo-600">{club.memberCount} thành viên</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
