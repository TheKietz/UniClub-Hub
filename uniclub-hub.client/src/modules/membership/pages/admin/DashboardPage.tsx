import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSystemStats, getSystemGrowth, getAdminClubs } from '@/modules/membership/services/adminApi'
import { getAdminResignations } from '@/modules/membership/services/clubApi'
import type { SystemStats, MonthlyGrowth } from '@/modules/membership/services/admin.types'
import { Users, Building2, UserCheck, FileText, Clock, AlertTriangle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-deprecated
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
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

type AlertItem = { message: string; link: string; linkLabel: string }

function ActionItems({ items }: { items: AlertItem[] }) {
  const [open, setOpen] = useState(true)
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
        <span className="font-semibold text-amber-800 text-sm flex-1">
          {items.length} vấn đề cần xử lý
        </span>
        {open ? <ChevronUp size={15} className="text-amber-500" /> : <ChevronDown size={15} className="text-amber-500" />}
      </button>
      {open && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-2.5">
              <p className="text-sm text-amber-900">{item.message}</p>
              <Link to={item.link}
                className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap flex-shrink-0">
                {item.linkLabel} <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getSystemStats(), getSystemGrowth(12), getAdminClubs(), getAdminResignations()])
      .then(([s, g, clubs, resignations]) => {
        setStats(s)
        setGrowth(g)

        const items: AlertItem[] = []

        // CLB chưa có Trưởng CLB
        clubs.filter(c => !c.hasAdmin && c.status === 'Active').forEach(c => {
          items.push({
            message: `CLB "${c.name}" chưa có Trưởng CLB`,
            link: `/admin/structure`,
            linkLabel: 'Bổ nhiệm',
          })
        })

        // Đơn từ chức CLUB_ADMIN chờ duyệt
        const pendingResignations = resignations.filter(r => r.status === 'Pending')
        if (pendingResignations.length > 0)
          items.push({
            message: `${pendingResignations.length} đơn từ chức Trưởng CLB đang chờ phê duyệt`,
            link: `/admin/resignations`,
            linkLabel: 'Xem đơn',
          })

        setAlerts(items)
      })
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

  const growthData = growth.map(g => ({ name: g.label, 'Thành viên mới': g.newMembers }))
  const totalNewThisYear = growth.reduce((s, g) => s + g.newMembers, 0)
  const activeRate = stats.totalClubs > 0 ? Math.round((stats.activeClubs / stats.totalClubs) * 100) : 0

  return (
    <div className="px-8 pt-3 pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tổng quan hệ thống</h1>
        <p className="text-sm text-gray-400 mt-0.5">Thống kê toàn bộ hệ thống câu lạc bộ</p>
      </div>

      <ActionItems items={alerts} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Người dùng" value={stats.totalUsers} icon={Users} color="bg-indigo-500" />
        <StatCard label="Câu lạc bộ" value={stats.totalClubs} icon={Building2} color="bg-emerald-500"
          sub={`${stats.activeClubs} đang hoạt động (${activeRate}%)`} />
        <StatCard label="Thành viên chính thức" value={stats.totalActiveMembers} icon={UserCheck} color="bg-violet-500"
          sub={stats.totalProbationMembers > 0 ? `+ ${stats.totalProbationMembers} đang thử việc` : undefined} />
        <StatCard label="Tổng đơn đăng ký" value={stats.applications.total} icon={FileText} color="bg-amber-500"
          sub={`${stats.applications.pending} đang chờ duyệt`} />
      </div>

      {/* Biểu đồ tăng trưởng */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Tăng trưởng thành viên</p>
            <p className="text-xs text-gray-400 mt-0.5">12 tháng gần nhất</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
            <Clock size={14} />
            {totalNewThisYear} thành viên mới
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip formatter={(v) => [`${v} thành viên`, 'Mới']} />
              <Area type="monotone" dataKey="Thành viên mới"
                stroke="#6366f1" strokeWidth={2}
                fill="url(#growthGrad)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row: Pie đơn + Bar lĩnh vực */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Tình trạng đơn đăng ký</p>
          </div>
          <div className="p-5">
            {appPieData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có đơn nào.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={appPieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={3}>
                    {appPieData.map((d, i) => <Cell key={i} fill={APP_COLORS[d.name] ?? BAR_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} đơn`, '']} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-4 gap-2 mt-1">
              {[
                { label: 'Chờ duyệt', value: stats.applications.pending,  color: '#f59e0b' },
                { label: 'Phỏng vấn', value: stats.applications.interview, color: '#3b82f6' },
                { label: 'Đã duyệt',  value: stats.applications.accepted,  color: '#10b981' },
                { label: 'Từ chối',   value: stats.applications.rejected,  color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">CLB theo lĩnh vực</p>
          </div>
          <div className="p-5">
            {categoryBarData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryBarData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip />
                  <Bar dataKey="Số CLB" radius={[4, 4, 0, 0]}>
                    {categoryBarData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top CLB */}
      {topClubsData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Top CLB nhiều thành viên nhất</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topClubsData} layout="vertical"
                margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip />
                <Bar dataKey="Thành viên" fill="#6366f1" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 11, fill: '#9ca3af' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
