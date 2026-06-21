import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getDepartments } from '@/components/membership/services/clubApi'
import type { DepartmentItem } from '@/components/membership/services/club.types'
import { getKpiResults, type KpiResults, type MemberKpiResult } from '@/components/membership/services/kpiApi'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  MEMBER: 'Thành viên',
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

const thS: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: D.inkMuted,
  letterSpacing: '.02em',
  whiteSpace: 'nowrap',
}

const tdS: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  verticalAlign: 'top',
}

function currentMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { fromDate: fmt(from), toDate: fmt(now) }
}

function MetricBreakdown({ member }: { member: MemberKpiResult }) {
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 260 }}>
      {member.metrics.map(metric => (
        <div key={metric.metricKey} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 84px 42px', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: D.inkDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {metric.displayName}
          </span>
          <div style={{ height: 6, borderRadius: D.pill, background: '#ede9fe', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, metric.rawScore))}%`, height: '100%', background: D.indigo }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: D.ink, textAlign: 'right' }}>{metric.rawScore}%</span>
        </div>
      ))}
    </div>
  )
}

export default function KpiDashboardPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const clubPermissions = useClubPermissions(id)
  const canView = clubPermissions.canAny(CLUB_PERMISSIONS.MEMBER_KPI_VIEW, CLUB_PERMISSIONS.MEMBER_KPI_MANAGE)
  const defaultRange = useMemo(() => currentMonthRange(), [])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [departmentId, setDepartmentId] = useState('')
  const [fromDate, setFromDate] = useState(defaultRange.fromDate)
  const [toDate, setToDate] = useState(defaultRange.toDate)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<KpiResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverRow, setHoverRow] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = {
      ...(departmentId ? { departmentId: Number(departmentId) } : {}),
      fromDate,
      toDate,
    }
    Promise.all([getKpiResults(id, params), getDepartments(id)])
      .then(([kpi, deps]) => {
        setResults(kpi)
        setDepartments(deps)
      })
      .catch(() => toast.error('Không thể tải bảng KPI.'))
      .finally(() => setLoading(false))
  }, [departmentId, fromDate, id, toDate])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      const params = {
        ...(departmentId ? { departmentId: Number(departmentId) } : {}),
        fromDate,
        toDate,
      }
      Promise.all([getKpiResults(id, params), getDepartments(id)])
        .then(([kpi, deps]) => {
          if (cancelled) return
          setResults(kpi)
          setDepartments(deps)
        })
        .catch(() => { if (!cancelled) toast.error('Không thể tải bảng KPI.') })
        .finally(() => { if (!cancelled) setLoading(false) })
    })()
    return () => { cancelled = true }
  }, [departmentId, fromDate, id, toDate])

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const members = results?.members ?? []
    if (!q) return members
    return members.filter(member =>
      (member.fullName ?? '').toLowerCase().includes(q) ||
      (member.email ?? '').toLowerCase().includes(q) ||
      (member.departmentName ?? '').toLowerCase().includes(q)
    )
  }, [results?.members, search])

  if (!clubPermissions.loading && !canView)
    return <PermissionDenied />

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>KPI thành viên</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            {results
              ? `${filteredMembers.length}/${results.totalMembers} thành viên · Điểm trung bình ${results.averageScore}`
              : 'Đang tải dữ liệu'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: D.indigo,
            color: '#fff',
            border: D.border,
            boxShadow: D.shadow(2, 2),
            padding: '8px 16px',
            borderRadius: D.pill,
            fontSize: 12,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      <div style={{
        padding: '10px 14px',
        borderRadius: D.radius,
        background: D.card,
        border: D.border,
        boxShadow: D.shadow(),
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="⌕  Tìm thành viên, email, ban..."
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...inputStyle, width: 310 }}>
          <CalendarDays size={14} color={D.inkMuted} />
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', width: 118 }} />
          <span style={{ color: D.inkMuted }}>→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', width: 118 }} />
        </div>
        <FilterSelect
          value={departmentId}
          onChange={setDepartmentId}
          options={[
            { value: '', label: 'Toàn CLB' },
            ...departments.map(dep => ({ value: String(dep.id), label: dep.name })),
          ]}
          style={{ width: 190 }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
          >
            Xóa lọc
          </button>
        )}
      </div>

      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={{ ...thS, width: 64 }}>Hạng</th>
              <th style={thS}>Thành viên</th>
              <th style={thS}>Ban</th>
              <th style={{ ...thS, width: 90 }}>Điểm</th>
              <th style={{ ...thS, width: 140 }}>Xếp loại</th>
              <th style={thS}>Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: D.inkMuted }}>Đang tải bảng KPI...</td></tr>
            ) : filteredMembers.length ? (
              filteredMembers.map(member => (
                <tr
                  key={member.membershipId}
                  onMouseEnter={() => setHoverRow(member.membershipId)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: hoverRow === member.membershipId ? D.bg : D.card, borderBottom: D.borderLight }}
                >
                  <td style={{ ...tdS, fontWeight: 900, color: D.ink }}>#{member.rank}</td>
                  <td style={tdS}>
                    <div style={{ fontWeight: 800, color: D.ink }}>{member.fullName ?? member.email ?? member.userId}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: D.inkMuted }}>{ROLE_LABELS[member.clubRole] ?? member.clubRole}</div>
                  </td>
                  <td style={{ ...tdS, color: D.inkDim }}>{member.departmentName ?? 'Chưa phân ban'}</td>
                  <td style={{ ...tdS, fontSize: 18, fontWeight: 900, color: D.ink }}>{member.totalScore}</td>
                  <td style={tdS}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: 26,
                      padding: '4px 10px',
                      borderRadius: D.pill,
                      background: '#f3f4f6',
                      color: member.gradeColor ?? '#dc2626',
                      fontWeight: 800,
                      fontSize: 12,
                    }}>
                      {member.grade}
                    </span>
                  </td>
                  <td style={tdS}><MetricBreakdown member={member} /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: D.inkMuted }}>Chưa có dữ liệu KPI trong kỳ này.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
