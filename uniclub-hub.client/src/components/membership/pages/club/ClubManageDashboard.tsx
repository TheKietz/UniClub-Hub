import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubStats } from '@/components/membership/services/clubApi'
import type { ClubStats } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import { Users, Building, FileText, UserCheck } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

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
  MEMBER: 'Thành viên',
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6']
const APP_COLORS: Record<string, string> = {
  'Chờ duyệt': '#f59e0b',
  'Phỏng vấn': '#3b82f6',
  'Đã duyệt': '#10b981',
  'Từ chối': '#ef4444',
}

export default function ClubManageDashboard() {
  const { clubId } = useParams<{ clubId: string }>()
  const { user } = useAuth()
  const club = user?.memberships.find(m => m.clubId === Number(clubId))
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

  const roleData = Object.entries(stats.membersByRole).map(([role, count]) => ({
    name: ROLE_LABELS[role] ?? role,
    value: count,
  }))

  const deptData = stats.membersByDepartment.map(d => ({
    name: d.departmentName,
    'Thành viên': d.memberCount,
  }))

  const appData = [
    { name: 'Chờ duyệt', value: stats.applications.pending },
    { name: 'Phỏng vấn', value: stats.applications.interview },
    { name: 'Đã duyệt', value: stats.applications.accepted },
    { name: 'Từ chối', value: stats.applications.rejected },
  ].filter(d => d.value > 0)

  return (
    <div className="px-8 pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5">
        {club?.clubLogoUrl ? (
          <img src={club.clubLogoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 font-bold text-3xl">{(stats.clubName ?? '?')[0]}</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: '#0f172a' }}>{stats.clubName}</h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>Tổng quan hoạt động câu lạc bộ</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Thành viên" value={stats.totalActiveMembers} icon={Users} color="bg-indigo-500" />
        <StatCard label="Ban bộ phận" value={stats.totalDepartments} icon={Building} color="bg-emerald-500" />
        <StatCard label="Đơn chờ duyệt" value={stats.applications.pending} icon={FileText} color="bg-yellow-500" />
        <StatCard label="Đã duyệt" value={stats.applications.accepted} icon={UserCheck} color="bg-green-500" />
      </div>

      {/* Biểu đồ hàng 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie — theo vai trò */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#0f172a' }}>Thành viên theo vai trò</h2>
          {roleData.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => percent != null ? `${name} ${(percent * 100).toFixed(0)}%` : name} labelLine={false}>
                  {roleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} người`, '']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie — đơn đăng ký */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#0f172a' }}>Tình trạng đơn đăng ký</h2>
          {appData.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có đơn nào.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={appData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {appData.map((d, i) => <Cell key={i} fill={APP_COLORS[d.name] ?? PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bar — thành viên theo ban */}
      {deptData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#0f172a' }}>Thành viên theo ban</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip />
              <Bar dataKey="Thành viên" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
