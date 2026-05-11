import { useEffect, useState } from 'react'
import { getSystemStats } from '@/components/membership/services/adminApi'
import type { SystemStats } from '@/components/membership/services/admin.types'
import { Users, Building2, UserCheck, FileText } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-deprecated
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const APP_COLORS: Record<string, string> = {
  'Chờ duyệt': '#f59e0b',
  'Phỏng vấn': '#3b82f6',
  'Đã duyệt':  '#10b981',
  'Từ chối':   '#ef4444',
}

const BAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6']

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
  if (error)   return <div className="p-8 text-red-500">{error}</div>
  if (!stats)  return null

  const appPieData = [
    { name: 'Chờ duyệt', value: stats.applications.pending },
    { name: 'Phỏng vấn', value: stats.applications.interview },
    { name: 'Đã duyệt',  value: stats.applications.accepted },
    { name: 'Từ chối',   value: stats.applications.rejected },
  ].filter(d => d.value > 0)

  const categoryBarData = stats.clubsByCategory.map(c => ({
    name: c.categoryName.length > 16 ? c.categoryName.slice(0, 14) + '…' : c.categoryName,
    'Số CLB': c.clubCount,
  }))

  const topClubsData = stats.topClubsByMembers.map(c => ({
    name: c.clubName.length > 18 ? c.clubName.slice(0, 16) + '…' : c.clubName,
    'Thành viên': c.memberCount,
  }))

  const activeRate = stats.totalClubs > 0
    ? Math.round((stats.activeClubs / stats.totalClubs) * 100)
    : 0

  return (
    <div className="px-8 pt-3 pb-8 space-y-6">
      <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Tổng quan hệ thống</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Người dùng" value={stats.totalUsers} icon={Users} color="bg-indigo-500" />
        <StatCard label="Câu lạc bộ" value={stats.totalClubs} icon={Building2} color="bg-emerald-500"
          sub={`${stats.activeClubs} đang hoạt động (${activeRate}%)`} />
        <StatCard label="Thành viên tích cực" value={stats.totalActiveMembers} icon={UserCheck} color="bg-violet-500" />
        <StatCard label="Tổng đơn đăng ký" value={stats.applications.total} icon={FileText} color="bg-amber-500"
          sub={`${stats.applications.pending} đang chờ duyệt`} />
      </div>

      {/* Row 1: Pie đơn + Bar lĩnh vực */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie — đơn đăng ký */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>Tình trạng đơn đăng ký</p>
          </div>
          <div className="p-5">
            {appPieData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có đơn nào.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={appPieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    paddingAngle={3}>
                    {appPieData.map((d, i) => (
                      <Cell key={i} fill={APP_COLORS[d.name] ?? BAR_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} đơn`, '']} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Summary row */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { label: 'Chờ duyệt', value: stats.applications.pending, color: '#f59e0b' },
                { label: 'Phỏng vấn', value: stats.applications.interview, color: '#3b82f6' },
                { label: 'Đã duyệt',  value: stats.applications.accepted, color: '#10b981' },
                { label: 'Từ chối',   value: stats.applications.rejected, color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar — CLB theo lĩnh vực */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>CLB theo lĩnh vực</p>
          </div>
          <div className="p-5">
            {categoryBarData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryBarData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip />
                  <Bar dataKey="Số CLB" radius={[4, 4, 0, 0]}>
                    {categoryBarData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Bar top CLB */}
      {topClubsData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>Top CLB nhiều thành viên nhất</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topClubsData} layout="vertical"
                margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip />
                <Bar dataKey="Thành viên" fill="#6366f1" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 11, fill: '#6b7280' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
