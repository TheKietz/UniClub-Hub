import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClubStats, getClubGrowth, getDepartments, getClubResignations } from '@/modules/membership/services/clubApi'
import type { ClubStats, MonthlyGrowth, DepartmentItem } from '@/modules/membership/services/club.types'
import { Tree, TreeNode } from 'react-organizational-chart'
import { useAuth } from '@/contexts/AuthContext'
import { Users, Building, FileText, Clock, TrendingUp, AlertTriangle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
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
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

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

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD:  'Trưởng ban',
  MEMBER:     'Thành viên',
}
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6']
const APP_COLORS: Record<string, string> = {
  'Chờ duyệt': '#f59e0b', 'Phỏng vấn': '#3b82f6',
  'Đã duyệt': '#10b981',  'Từ chối':   '#ef4444',
}

export default function ClubManageDashboard() {
  const { clubId } = useParams<{ clubId: string }>()
  const { user } = useAuth()
  const club = user?.memberships.find(m => m.clubId === Number(clubId))

  const [stats, setStats] = useState<ClubStats | null>(null)
  const [growth, setGrowth] = useState<MonthlyGrowth[]>([])
  const [depts, setDepts] = useState<DepartmentItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clubId) return
    const id = Number(clubId)
    Promise.all([getClubStats(id), getClubGrowth(id, 12), getDepartments(id), getClubResignations(id)])
      .then(([s, g, depts, resignations]) => {
        setStats(s)
        setGrowth(g)
        setDepts(depts)

        const items: AlertItem[] = []

        // Ban chưa có Trưởng ban
        const missingLead = depts.filter(d => !d.deptLeadName)
        missingLead.forEach(d => items.push({
          message: `Ban "${d.name}" chưa có Trưởng ban`,
          link: `/clubs/${id}/manage/departments`,
          linkLabel: 'Bổ nhiệm',
        }))

        // Đơn từ chức chờ duyệt
        const pendingResign = resignations.filter(r => r.status === 'Pending')
        if (pendingResign.length > 0)
          items.push({
            message: `${pendingResign.length} đơn từ chức đang chờ phê duyệt`,
            link: `/clubs/${id}/manage/resignations`,
            linkLabel: 'Xem đơn',
          })

        // Thành viên Probation chờ xác nhận
        if (s.totalProbationMembers > 0)
          items.push({
            message: `${s.totalProbationMembers} thành viên đang thử việc, chưa được xác nhận chính thức`,
            link: `/clubs/${id}/manage/members`,
            linkLabel: 'Xem danh sách',
          })

        // Đơn ứng tuyển chờ duyệt
        if (s.applications.pending > 0)
          items.push({
            message: `${s.applications.pending} đơn ứng tuyển đang chờ xét duyệt`,
            link: `/clubs/${id}/manage/applications`,
            linkLabel: 'Xét duyệt',
          })

        setAlerts(items)
      })
      .catch(() => setError('Không thể tải thống kê CLB.'))
      .finally(() => setLoading(false))
  }, [clubId])

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>
  if (error)   return <div className="p-8 text-red-500">{error}</div>
  if (!stats)  return null

  const roleData = Object.entries(stats.membersByRole).map(([role, count]) => ({
    name: ROLE_LABELS[role] ?? role, value: count,
  }))

  const deptData = stats.membersByDepartment.map(d => ({
    name: d.departmentName, 'Thành viên': d.memberCount,
  }))

  const appData = [
    { name: 'Chờ duyệt', value: stats.applications.pending },
    { name: 'Phỏng vấn', value: stats.applications.interview },
    { name: 'Đã duyệt',  value: stats.applications.accepted },
    { name: 'Từ chối',   value: stats.applications.rejected },
  ].filter(d => d.value > 0)

  const growthData = growth.map(g => ({ name: g.label, 'Thành viên mới': g.newMembers }))
  const totalNew = growth.reduce((s, g) => s + g.newMembers, 0)

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
          <h1 className="text-2xl font-bold text-gray-900">{stats.clubName}</h1>
          <p className="mt-1 text-sm text-gray-500">Tổng quan hoạt động câu lạc bộ</p>
        </div>
      </div>

      <ActionItems items={alerts} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Thành viên chính thức" value={stats.totalActiveMembers} icon={Users} color="bg-indigo-500"
          sub={stats.totalProbationMembers > 0 ? `+ ${stats.totalProbationMembers} thử việc` : undefined} />
        <StatCard label="Ban bộ phận" value={stats.totalDepartments} icon={Building} color="bg-emerald-500" />
        <StatCard label="Đơn chờ duyệt" value={stats.applications.pending} icon={FileText} color="bg-amber-500" />
        <StatCard label="Thành viên mới (12 tháng)" value={totalNew} icon={TrendingUp} color="bg-violet-500" />
      </div>

      {/* Biểu đồ tăng trưởng */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Tăng trưởng thành viên</p>
            <p className="text-xs text-gray-400 mt-0.5">12 tháng gần nhất</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
            <Clock size={14} /> {totalNew} thành viên mới
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <defs>
                <linearGradient id="clubGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip formatter={(v) => [`${v} thành viên`, 'Mới']} />
              <Area type="monotone" dataKey="Thành viên mới"
                stroke="#6366f1" strokeWidth={2} fill="url(#clubGrowthGrad)"
                dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie vai trò + Pie đơn */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Thành viên theo vai trò</p>
          </div>
          <div className="p-5">
            {roleData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} innerRadius={38} paddingAngle={3}>
                    {roleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} người`, '']} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Tình trạng đơn đăng ký</p>
          </div>
          <div className="p-5">
            {appData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có đơn nào.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={appData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      {appData.map((d, i) => <Cell key={i} fill={APP_COLORS[d.name] ?? PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    { label: 'Chờ', value: stats.applications.pending,  color: '#f59e0b' },
                    { label: 'PV',  value: stats.applications.interview, color: '#3b82f6' },
                    { label: 'OK',  value: stats.applications.accepted,  color: '#10b981' },
                    { label: 'TC',  value: stats.applications.rejected,  color: '#ef4444' },
                  ].map(item => (
                    <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50">
                      <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
                      <p className="text-xs text-gray-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bar theo ban */}
      {deptData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Thành viên theo ban</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip />
                <Bar dataKey="Thành viên" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sơ đồ cơ cấu tổ chức */}
      {depts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Cơ cấu tổ chức</p>
          </div>
          <div className="p-5 overflow-x-auto">
            <div className="min-w-max mx-auto">
              <Tree
                lineWidth="2px"
                lineColor="#c7d2fe"
                lineBorderRadius="8px"
                label={
                  <div className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm">
                    <Building size={14} />
                    {stats.clubName}
                  </div>
                }
              >
                {depts.map(dept => (
                  <TreeNode key={dept.id} label={
                    <div className={`inline-flex flex-col items-center gap-0.5 rounded-xl px-4 py-2.5 border-2 shadow-sm min-w-28 ${
                      dept.deptLeadName ? 'bg-white border-indigo-200' : 'bg-amber-50 border-amber-200'
                    }`}>
                      <p className="font-semibold text-sm text-gray-800">{dept.name}</p>
                      {dept.deptLeadName
                        ? <p className="text-xs text-indigo-500 truncate max-w-28">{dept.deptLeadName}</p>
                        : <p className="text-xs text-amber-500">Chưa có trưởng ban</p>
                      }
                      <p className="text-xs text-gray-400">{dept.memberCount} thành viên</p>
                    </div>
                  } />
                ))}
              </Tree>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
