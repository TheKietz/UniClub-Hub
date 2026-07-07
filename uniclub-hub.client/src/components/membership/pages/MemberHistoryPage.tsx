import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { getMemberHistory } from '@/components/membership/services/userApi'
import type { MembershipHistory } from '@/components/membership/services/userApi'
import { toast } from 'sonner'
import { CalendarDays, LogOut } from 'lucide-react'
import { D } from '@/components/shared/managementTheme'

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Active:    { bg: '#dcfce7', text: '#15803d', label: 'Đang hoạt động' },
  Probation: { bg: '#dbeafe', text: '#1d4ed8', label: 'Thử việc' },
  Resigned:  { bg: '#f3f4f6', text: '#6b7280', label: 'Đã rời CLB' },
}

const CLUB_COLORS = ['#1d4ed8', '#7c3aed', '#ff5a3c', '#14b8a6', '#38bdf8', '#ec4899']

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function MemberHistoryPage() {
  const [history, setHistory] = useState<MembershipHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMemberHistory()
      .then(setHistory)
      .catch(() => toast.error('Không thể tải lịch sử tham gia.'))
      .finally(() => setLoading(false))
  }, [])

  const active   = history.filter(h => h.status === MEMBERSHIP_STATUS.ACTIVE || h.status === MEMBERSHIP_STATUS.PROBATION)
  const resigned = history.filter(h => h.status === MEMBERSHIP_STATUS.RESIGNED)

  if (loading) return (
    <div className="mgmt-page mgmt-page--loading">
      Đang tải...
    </div>
  )

  return (
    <div className="mgmt-page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Lịch sử tham gia</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Các câu lạc bộ bạn đã và đang tham gia</p>
      </div>

      {history.length === 0 && (
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '48px 20px', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
          Bạn chưa tham gia câu lạc bộ nào.
        </div>
      )}

      {active.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: '#dcfce7', color: '#15803d' }}>Đang tham gia</span>
            <span style={{ fontSize: 12, color: D.inkMuted }}>{active.length} CLB</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(h => <HistoryCard key={h.membershipId} h={h} />)}
          </div>
        </section>
      )}

      {resigned.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: '#f3f4f6', color: '#6b7280' }}>Đã rời CLB</span>
            <span style={{ fontSize: 12, color: D.inkMuted }}>{resigned.length} CLB</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resigned.map(h => <HistoryCard key={h.membershipId} h={h} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function HistoryCard({ h }: { h: MembershipHistory }) {
  const color = CLUB_COLORS[(h.clubName?.charCodeAt(0) ?? 0) % CLUB_COLORS.length]
  const statusStyle = STATUS_STYLE[h.status] ?? STATUS_STYLE.Resigned
  const isResigned = h.status === MEMBERSHIP_STATUS.RESIGNED
  const [now] = useState(() => Date.now())
  const daysIn = Math.floor((now - new Date(h.joinedDate).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{
      background: '#fff', border: '1.5px solid #0a2f6e', borderRadius: 14,
      boxShadow: '3px 3px 0 #0a2f6e', padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: isResigned ? 0.75 : 1,
    }}>
      {h.clubLogoUrl ? (
        <img src={h.clubLogoUrl} alt="" style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', border: '1.5px solid #0a2f6e', flexShrink: 0, transform: 'rotate(-3deg)' }} />
      ) : (
        <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: color, border: '1.5px solid #0a2f6e', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: 18, transform: 'rotate(-3deg)' }}>
          {h.clubName[0]}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#0a2f6e', margin: 0 }}>{h.clubName}</p>
            <p style={{ fontSize: 12, color: '#918c99', marginTop: 2 }}>
              {ROLE_LABELS[h.clubRole] ?? h.clubRole}
              {h.departmentName && <span> · {h.departmentName}</span>}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: statusStyle.bg, color: statusStyle.text, flexShrink: 0 }}>
            {statusStyle.label}
          </span>
        </div>

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11.5, color: '#918c99' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarDays size={12} />Gia nhập {fmt(h.joinedDate)}
          </span>
          {h.resignedDate ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <LogOut size={12} />Rời {fmt(h.resignedDate)}
            </span>
          ) : !isResigned ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={12} />{daysIn} ngày
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
