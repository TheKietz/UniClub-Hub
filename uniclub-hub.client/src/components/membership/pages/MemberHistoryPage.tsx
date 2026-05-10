import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import api from '@/lib/axiosInstance'
import { toast } from 'sonner'
import { CalendarDays, LogOut } from 'lucide-react'

interface MembershipHistory {
  membershipId: number
  clubId: number
  clubName: string
  clubLogoUrl?: string
  clubRole: string
  departmentName?: string
  status: string
  joinedDate: string
  resignedDate?: string
}

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  MEMBER: 'Thành viên',
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Active:     { bg: '#f0fdf4', text: '#16a34a', label: 'Đang hoạt động' },
  Probation:  { bg: '#eff6ff', text: '#2563eb', label: 'Thử việc' },
  Resigned:   { bg: '#f3f4f6', text: '#6b7280', label: 'Đã rời CLB' },
}

const AVATAR_COLORS = ['bg-indigo-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500']

function fmt(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function MemberHistoryPage() {
  const [history, setHistory] = useState<MembershipHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: MembershipHistory[] }>('/users/me/history')
      .then(r => setHistory(r.data.data))
      .catch(() => toast.error('Không thể tải lịch sử tham gia.'))
      .finally(() => setLoading(false))
  }, [])

  const active   = history.filter(h => h.status === MEMBERSHIP_STATUS.ACTIVE || h.status === MEMBERSHIP_STATUS.PROBATION)
  const resigned = history.filter(h => h.status === MEMBERSHIP_STATUS.RESIGNED)

  if (loading) return <div className="px-8 pt-6 text-sm" style={{ color: '#6b7280' }}>Đang tải...</div>

  return (
    <div className="px-8 pt-4 pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Lịch sử tham gia</h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>Các câu lạc bộ bạn đã và đang tham gia</p>
      </div>

      {history.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm" style={{ color: '#9ca3af' }}>Bạn chưa tham gia câu lạc bộ nào.</p>
        </div>
      )}

      {/* Đang tham gia */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>Đang tham gia</h2>
          {active.map(h => <HistoryCard key={h.membershipId} h={h} />)}
        </section>
      )}

      {/* Đã rời */}
      {resigned.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>Đã rời CLB</h2>
          {resigned.map(h => <HistoryCard key={h.membershipId} h={h} />)}
        </section>
      )}
    </div>
  )
}

function HistoryCard({ h }: { h: MembershipHistory }) {
  const avatarColor = AVATAR_COLORS[(h.clubName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
  const statusStyle = STATUS_STYLE[h.status] ?? STATUS_STYLE.Resigned
  const isResigned = h.status === MEMBERSHIP_STATUS.RESIGNED

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 ${isResigned ? 'opacity-70' : ''}`}>
      {/* Logo */}
      {h.clubLogoUrl
        ? <img src={h.clubLogoUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        : <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${avatarColor}`}>
            {h.clubName[0]}
          </div>
      }

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm leading-tight" style={{ color: '#111827' }}>{h.clubName}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {ROLE_LABELS[h.clubRole] ?? h.clubRole}
              {h.departmentName && <span> · {h.departmentName}</span>}
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: statusStyle.bg, color: statusStyle.text }}>
            {statusStyle.label}
          </span>
        </div>

        {/* Timeline */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: '#9ca3af' }}>
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            Gia nhập {fmt(h.joinedDate)}
          </span>
          {h.resignedDate && (
            <span className="flex items-center gap-1">
              <LogOut size={12} />
              Rời {fmt(h.resignedDate)}
            </span>
          )}
          {!isResigned && !h.resignedDate && (
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              {Math.floor((Date.now() - new Date(h.joinedDate).getTime()) / (1000 * 60 * 60 * 24))} ngày
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
