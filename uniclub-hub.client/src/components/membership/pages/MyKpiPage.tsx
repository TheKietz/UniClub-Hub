import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw, Trophy, Award, Hash, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { MEMBERSHIP_STATUS } from '@/types/auth'
import { getMyKpiResult, type MemberKpiResult } from '@/components/membership/services/kpiApi'
import { FilterSelect } from '@/components/shared/FilterSelect'

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  indigo: '#4f46e5',
}

function currentMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { fromDate: fmt(from), toDate: fmt(now) }
}

const inputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: D.borderLight,
  padding: '0 12px',
  fontSize: 13,
  color: D.ink,
  outline: 'none',
  background: D.bg,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}

function gradeAccent(grade: string): { color: string; iconBg: string } {
  if (grade === 'Xuất sắc') return { color: '#16a34a', iconBg: '#dcfce7' }
  if (grade === 'Tốt')      return { color: '#4f46e5', iconBg: '#eef2ff' }
  if (grade === 'Đạt')      return { color: '#d97706', iconBg: '#fef3c7' }
  return { color: '#dc2626', iconBg: '#fee2e2' }
}

function StatIconCard({
  icon: Icon, iconBg, iconColor, label, children,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string
  label: string; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: D.border,
        borderRadius: D.radius,
        background: D.card,
        padding: '16px 18px',
        boxShadow: hovered ? D.shadow(5, 5) : D.shadow(2, 2),
        transform: hovered ? 'translate(-1px,-1px)' : 'none',
        transition: 'transform .12s, box-shadow .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: iconBg, border: D.border,
          display: 'grid', placeItems: 'center',
        }}>
          <Icon size={18} color={iconColor} />
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export default function MyKpiPage() {
  const { user } = useAuth()
  const clubs = useMemo(() => {
    const map = new Map<number, { clubId: number; clubName: string }>()
    for (const membership of user?.memberships ?? []) {
      if (membership.status === MEMBERSHIP_STATUS.ACTIVE || membership.status === MEMBERSHIP_STATUS.PROBATION) {
        map.set(membership.clubId, { clubId: membership.clubId, clubName: membership.clubName })
      }
    }
    return Array.from(map.values())
  }, [user?.memberships])

  const defaultRange = useMemo(currentMonthRange, [])
  const [clubId, setClubId] = useState<number | undefined>(clubs[0]?.clubId)
  const [fromDate, setFromDate] = useState(defaultRange.fromDate)
  const [toDate, setToDate] = useState(defaultRange.toDate)
  const [result, setResult] = useState<MemberKpiResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clubId && clubs[0]?.clubId) setClubId(clubs[0].clubId)
  }, [clubId, clubs])

  function load() {
    if (!clubId) return
    setLoading(true)
    getMyKpiResult(clubId, { fromDate, toDate })
      .then(setResult)
      .catch(() => toast.error('Không thể tải KPI cá nhân.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [clubId])

  const accent = gradeAccent(result?.grade ?? '')

  return (
    <div style={{ minHeight: '100%', background: D.bg, padding: '28px 32px 40px', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em' }}>KPI của tôi</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: D.inkMuted }}>
            Theo dõi KPI cá nhân theo từng câu lạc bộ
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading || !clubId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 36,
            padding: '0 16px',
            border: D.border,
            borderRadius: D.pill,
            background: D.indigo,
            color: '#fff',
            boxShadow: D.shadow(2, 2),
            cursor: loading || !clubId ? 'not-allowed' : 'pointer',
            opacity: loading || !clubId ? 0.75 : 1,
            fontWeight: 800,
            fontFamily: 'inherit',
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Tải lại
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        padding: '10px 14px',
        borderRadius: D.radius,
        background: D.card,
        border: D.border,
        boxShadow: D.shadow(),
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <FilterSelect
          value={clubId?.toString() ?? ''}
          onChange={value => setClubId(Number(value))}
          options={clubs.map(club => ({ value: String(club.clubId), label: club.clubName }))}
          style={{ width: 240 }}
          disabled={clubs.length === 0}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...inputStyle, width: 310 }}>
          <CalendarDays size={14} color={D.inkMuted} />
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', width: 118 }} />
          <span style={{ color: D.inkMuted }}>→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', width: 118 }} />
        </div>
      </div>

      {clubs.length === 0 ? (
        <div style={{ border: D.border, borderRadius: D.radius, background: D.card, padding: 28, color: D.inkMuted, boxShadow: D.shadow() }}>
          Bạn chưa là thành viên hoạt động của CLB nào.
        </div>
      ) : loading ? (
        <div style={{ border: D.border, borderRadius: D.radius, background: D.card, padding: 28, color: D.inkMuted, boxShadow: D.shadow() }}>
          Đang tải KPI...
        </div>
      ) : result ? (
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 12 }}>
            <StatIconCard icon={Trophy} iconBg="#eef2ff" iconColor={D.indigo} label="Điểm tổng">
              <div style={{ fontSize: 32, fontWeight: 950, color: D.ink, lineHeight: 1 }}>{result.totalScore}</div>
            </StatIconCard>

            <StatIconCard icon={Award} iconBg={accent.iconBg} iconColor={accent.color} label="Xếp loại">
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                padding: '0 10px',
                borderRadius: D.pill,
                border: `1.5px solid ${accent.color}`,
                color: accent.color,
                fontWeight: 900,
                fontSize: 13,
                background: accent.iconBg,
              }}>{result.grade}</span>
            </StatIconCard>

            <StatIconCard icon={Hash} iconBg="#fef3c7" iconColor="#d97706" label="Thứ hạng">
              <div style={{ fontSize: 30, fontWeight: 950, color: D.ink, lineHeight: 1 }}>#{result.rank || '—'}</div>
            </StatIconCard>

            <StatIconCard icon={Users} iconBg="#ccfbf1" iconColor="#0f766e" label="Ban">
              <div style={{ fontSize: 13, fontWeight: 700, color: D.inkDim, lineHeight: 1.35, marginTop: 2 }}>
                {result.departmentName ?? 'Chưa phân ban'}
              </div>
            </StatIconCard>
          </div>

          {/* Metric breakdown */}
          <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 110px 110px 110px', gap: 14, padding: '12px 16px', background: D.bg, borderBottom: D.borderLight }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: D.inkMuted }}>Tiêu chí</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: D.inkMuted, textAlign: 'right' }}>Điểm thô</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: D.inkMuted, textAlign: 'right' }}>Trọng số</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: D.inkMuted, textAlign: 'right' }}>Điểm KPI</div>
            </div>
            {result.metrics.map(metric => (
              <MetricRow key={metric.metricKey} metric={metric} />
            ))}
            {result.metrics.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: D.inkMuted }}>
                Chưa có tiêu chí KPI được bật cho CLB này.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ border: D.border, borderRadius: D.radius, background: D.card, padding: 28, color: D.inkMuted, boxShadow: D.shadow() }}>
          Chưa có dữ liệu KPI trong kỳ này.
        </div>
      )}
    </div>
  )
}

function MetricRow({ metric }: { metric: MemberKpiResult['metrics'][number] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) 110px 110px 110px',
        gap: 14,
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: D.borderLight,
        background: hovered ? D.bg : D.card,
        transition: 'background .1s',
      }}
    >
      <div>
        <div style={{ fontWeight: 900, color: D.ink, fontSize: 14 }}>{metric.displayName}</div>
        <div style={{ marginTop: 3, fontSize: 12, color: D.inkMuted }}>{metric.detail}</div>
        <div style={{ height: 6, background: '#e8e3d6', borderRadius: D.pill, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${clampScore(metric.rawScore)}%`, height: '100%', background: D.indigo, transition: 'width .4s' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', fontWeight: 900, color: D.ink }}>{metric.rawScore}%</div>
      <div style={{ textAlign: 'right', fontWeight: 800, color: D.inkDim }}>{metric.weight}%</div>
      <div style={{ textAlign: 'right', fontWeight: 950, color: D.indigo }}>{metric.weightedScore}</div>
    </div>
  )
}
