import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { useParams } from 'react-router-dom'
import { Tree, TreeNode } from 'react-organizational-chart'
import html2canvas from 'html2canvas-pro'
import { getClubMembers, getDepartments, getClubDetail } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem, ClubDetail } from '@/components/membership/services/club.types'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'

const AVATAR_COLORS = ['#1d4ed8', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#38bdf8']
const DEPT_COLORS  = ['#1d4ed8', '#7c3aed', '#ec4899', '#14b8a6', '#38bdf8', '#f59e0b']

/* ── Node components ──────────────────────────────────────────────── */

function ClubNode({ club }: { club: ClubDetail }) {
  const letter = (club.name.startsWith('CLB ') ? club.name.slice(4) : club.name)[0]?.toUpperCase() ?? '?'
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      background: '#fff', borderRadius: 16, padding: '12px 20px', minWidth: 150,
      boxShadow: '4px 4px 0 #0a2f6e', border: '1.5px solid #0a2f6e',
    }}>
      {club.logoUrl
        ? <img src={club.logoUrl} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #0a2f6e' }} alt="" />
        : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1d4ed8', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 20, color: '#fff', border: '1.5px solid #0a2f6e' }}>{letter}</div>
      }
      <p style={{ fontWeight: 900, fontSize: 13, color: '#0a2f6e', margin: 0, textAlign: 'center' }}>{club.name}</p>
      <p style={{ fontSize: 11, color: '#918c99', margin: 0 }}>{club.memberCount} thành viên</p>
    </div>
  )
}

function DeptNode({ dept, index, collapsed, onToggle }: {
  dept: DepartmentItem; index: number; collapsed: boolean; onToggle: () => void
}) {
  const color = DEPT_COLORS[index % DEPT_COLORS.length]
  return (
    <div
      onClick={onToggle}
      title={collapsed ? 'Nhấn để mở rộng' : 'Nhấn để thu gọn'}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: D.card, border: `1.5px solid ${color}`, borderRadius: 12,
        padding: '10px 16px', minWidth: 136,
        boxShadow: `2px 2px 0 ${color}`,
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, background: color, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 800 }}>▦</div>
      <p style={{ fontWeight: 800, fontSize: 12, color: D.ink, margin: 0, textAlign: 'center' }}>{dept.name}</p>
      {dept.deptLeadName
        ? <p style={{ fontSize: 10, color: color, fontWeight: 700, margin: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>TB: {dept.deptLeadName}</p>
        : <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>⚠ Chưa có TB</span>
      }
      <p style={{ fontSize: 10, color: D.inkMuted, margin: 0 }}>{dept.memberCount ?? 0} TV {collapsed ? '▶' : '▼'}</p>
    </div>
  )
}

function MemberNode({ member, highlighted }: { member: MemberItem; highlighted: boolean }) {
  const name = member.fullName || member.email
  const initials = name.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  const isAdmin = member.clubRole === CLUB_ROLES.CLUB_ADMIN
  const isLead  = member.clubRole === CLUB_ROLES.DEPT_LEAD
  const roleBg  = isAdmin ? '#1d4ed8' : isLead ? '#7c3aed' : '#dce6f4'
  const roleCol = isAdmin || isLead ? '#fff' : D.inkMuted
  const roleLabel = isAdmin ? 'Trưởng CLB' : isLead ? 'Trưởng ban' : 'Thành viên'
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: isAdmin ? '#ede9fe' : isLead ? '#f5f3ff' : D.card,
      border: highlighted
        ? '2px solid #facc15'
        : isAdmin ? '1.5px solid #1d4ed8' : isLead ? '1.5px solid #7c3aed' : D.borderLight,
      borderRadius: 12, padding: '8px 12px', minWidth: 104,
      boxShadow: highlighted
        ? '0 0 0 3px #fde68a, 2px 2px 0 #0a2f6e'
        : isAdmin ? '2px 2px 0 #1d4ed8' : isLead ? '2px 2px 0 #7c3aed' : '2px 2px 0 #dce6f4',
      transition: 'box-shadow .15s',
    }}>
      {member.avatarUrl
        ? <img src={member.avatarUrl} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>{initials}</div>
      }
      <p style={{ fontSize: 11, fontWeight: 600, color: D.ink, margin: 0, textAlign: 'center', maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.fullName ?? member.email}</p>
      {member.studentId && <p style={{ fontSize: 10, color: D.inkMuted, margin: 0 }}>{member.studentId}</p>}
      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: roleBg, color: roleCol, textTransform: 'uppercase', letterSpacing: '.04em' }}>{roleLabel}</span>
      {member.status === MEMBERSHIP_STATUS.PROBATION && (
        <span style={{ fontSize: 9, color: '#b45309', fontWeight: 600 }}>Thử việc</span>
      )}
    </div>
  )
}

function EmptyNode() {
  return (
    <div style={{ fontSize: 11, color: D.inkMuted, border: '1.5px dashed #dce6f4', borderRadius: 10, padding: '8px 14px' }}>
      Chưa có thành viên
    </div>
  )
}

/* ── Pill button helper ───────────────────────────────────────────── */

function PillBtn({ children, onClick, active = false, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', border: D.border, whiteSpace: 'nowrap',
        background: active ? D.ink : D.card,
        color: active ? '#ffffff' : D.ink,
        boxShadow: active ? 'none' : D.shadow(2, 2),
        opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  )
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function OrgChartPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const clubPermissions = useClubPermissions(id)
  const canView = clubPermissions.canAny(CLUB_PERMISSIONS.ORG_CHART_VIEW, CLUB_PERMISSIONS.ORG_CHART_MANAGE)

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [searchQ, setSearchQ] = useState('')
  const [exporting, setExporting] = useState(false)

  const chartRef     = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef      = useRef<{ x: number; y: number; sl: number; st: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useDeferredEffect((isCancelled) => {
    setLoading(true)
    Promise.all([getClubDetail(id), getDepartments(id), getClubMembers(id)])
      .then(([c, d, m]) => {
        if (isCancelled()) return
        setClub(c); setDepartments(d); setMembers(m)
      })
      .catch(() => {
        if (!isCancelled()) toast.error('Không thể tải dữ liệu sơ đồ.')
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false)
      })
  }, [id, clubPermissions.loading, canView], { enabled: !clubPermissions.loading && canView })

  if (!clubPermissions.loading && !canView) return <PermissionDenied />
  if (loading) return (
    <div style={{ padding: '28px 32px', color: '#918c99', fontSize: 13, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Đang tải...</div>
  )
  if (!club) return null

  const activeMembers = members.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)
  const clubAdmin     = activeMembers.find(m => m.clubRole === CLUB_ROLES.CLUB_ADMIN)
  const missingLeads  = departments.filter(d => !d.deptLeadName).length
  const freeMembers   = activeMembers.filter(m => !m.departmentId && m.clubRole === CLUB_ROLES.MEMBER)

  const deptLead    = (deptId: number) => activeMembers.find(m => m.departmentId === deptId && m.clubRole === CLUB_ROLES.DEPT_LEAD)
  const deptRegular = (deptId: number) => activeMembers.filter(m => m.departmentId === deptId && m.clubRole === CLUB_ROLES.MEMBER)

  const q = searchQ.trim().toLowerCase()
  const isHighlighted = (m: MemberItem) =>
    q.length > 0 && (
      (m.fullName ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.studentId ?? '').toLowerCase().includes(q)
    )

  const toggleCollapse = (deptId: number) =>
    setCollapsed(prev => {
      const n = new Set(prev)
      if (n.has(deptId)) n.delete(deptId)
      else n.add(deptId)
      return n
    })

  /* Fit chart to container */
  function fitToScreen() {
    if (!chartRef.current || !containerRef.current) return
    const cw = containerRef.current.clientWidth - 48
    const ch = containerRef.current.clientHeight - 48
    const innerEl = chartRef.current.firstElementChild as HTMLElement | null
    if (!innerEl) return
    const iw = innerEl.scrollWidth
    const ih = innerEl.scrollHeight
    const fit = Math.min(cw / iw, ch / ih, 1.5)
    setZoom(Math.max(0.3, Math.round(fit * 10) / 10))
  }

  /* Export PNG */
  async function exportPng() {
    if (!chartRef.current || !containerRef.current) return
    setExporting(true)
    const prevZoom = zoom
    const container = containerRef.current
    const prevScrollLeft = container.scrollLeft
    const prevScrollTop = container.scrollTop

    try {
      flushSync(() => setZoom(1))
      container.scrollLeft = 0
      container.scrollTop = 0
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      const el = chartRef.current
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (_doc, clonedEl) => {
          clonedEl.style.transform = 'none'
        },
      })
      const link = document.createElement('a')
      link.download = `so-do-to-chuc-${club?.name ?? id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      toast.error('Không thể xuất ảnh.')
    } finally {
      flushSync(() => setZoom(prevZoom))
      container.scrollLeft = prevScrollLeft
      container.scrollTop = prevScrollTop
      setExporting(false)
    }
  }

  /* Print PDF */
  function handlePrint() {
    const prev = zoom; setZoom(1)
    setTimeout(() => { window.print(); setZoom(prev) }, 80)
  }

  /* Drag-to-pan */
  function onPointerDown(e: React.PointerEvent) {
    if (!containerRef.current) return
    dragRef.current = { x: e.clientX, y: e.clientY, sl: containerRef.current.scrollLeft, st: containerRef.current.scrollTop }
    setIsDragging(true)
    containerRef.current.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !containerRef.current) return
    containerRef.current.scrollLeft = dragRef.current.sl - (e.clientX - dragRef.current.x)
    containerRef.current.scrollTop  = dragRef.current.st - (e.clientY - dragRef.current.y)
  }
  function onPointerUp() { dragRef.current = null; setIsDragging(false) }

  const DeptSubtree = ({ dept, index }: { dept: DepartmentItem; index: number }) => {
    const lead    = deptLead(dept.id)
    const regular = deptRegular(dept.id)
    const isCollapsed = collapsed.has(dept.id)
    return (
      <TreeNode label={<DeptNode dept={dept} index={index} collapsed={isCollapsed} onToggle={() => toggleCollapse(dept.id)} />}>
        {!isCollapsed && (
          lead ? (
            <TreeNode label={<MemberNode member={lead} highlighted={isHighlighted(lead)} />}>
              {regular.length > 0
                ? regular.map(m => <TreeNode key={m.id} label={<MemberNode member={m} highlighted={isHighlighted(m)} />} />)
                : <TreeNode label={<EmptyNode />} />
              }
            </TreeNode>
          ) : (
            regular.length > 0
              ? regular.map(m => <TreeNode key={m.id} label={<MemberNode member={m} highlighted={isHighlighted(m)} />} />)
              : <TreeNode label={<EmptyNode />} />
          )
        )}
      </TreeNode>
    )
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif", display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #org-chart-printable, #org-chart-printable * { visibility: visible; }
          #org-chart-printable { position: fixed; top: 0; left: 0; width: 100%; padding: 10mm 12mm; background: white; }
          .orgchart-no-print { display: none !important; }
          @page { size: A3 landscape; margin: 0; }
        }
      `}</style>

      {/* Header */}
      <div className="orgchart-no-print" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Sơ đồ cơ cấu tổ chức</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Kéo để di chuyển · Nhấn vào ban để thu gọn/mở rộng</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <PillBtn onClick={exportPng} disabled={exporting}>{exporting ? '...' : '↓ PNG'}</PillBtn>
          <button
            onClick={handlePrint}
            style={{ padding: '8px 18px', borderRadius: 999, background: D.ink, color: '#ffffff', border: D.border, boxShadow: D.shadow(), fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ↓ In / PDF
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orgchart-no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { icon: '◐', label: 'Thành viên', value: activeMembers.length, color: '#1d4ed8', bg: '#eef2ff' },
          { icon: '▦', label: 'Ban', value: departments.length, color: '#7c3aed', bg: '#f5f3ff' },
          { icon: '⚠', label: 'Ban chưa có TB', value: missingLeads, color: missingLeads > 0 ? '#b45309' : '#16a34a', bg: missingLeads > 0 ? '#fef3c7' : '#dcfce7' },
          { icon: '◌', label: 'Thành viên tự do', value: freeMembers.length, color: '#64748b', bg: '#f1f5f9' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: D.radius,
            background: s.bg, border: `1.5px solid ${s.color}22`,
            boxShadow: `2px 2px 0 ${s.color}33`,
          }}>
            <span style={{ fontSize: 14, color: s.color }}>{s.icon}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color, opacity: 0.8 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="orgchart-no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Search */}
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="⌕  Tìm thành viên..."
          style={{
            height: 34, borderRadius: 999, border: D.border, padding: '0 14px',
            fontSize: 12, color: D.ink, outline: 'none', background: D.card,
            fontFamily: 'inherit', boxShadow: D.shadow(2, 2), minWidth: 200,
            boxSizing: 'border-box',
          }}
        />
        {searchQ && (
          <button type="button" onClick={() => setSearchQ('')} style={{ fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            Xóa
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: D.card, border: D.border, borderRadius: 999, padding: '5px 10px', boxShadow: D.shadow(2, 2) }}>
          <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 16, color: D.ink, lineHeight: 1, padding: '0 2px' }}>−</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: D.ink, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 16, color: D.ink, lineHeight: 1, padding: '0 2px' }}>+</button>
        </div>

        <PillBtn onClick={() => setZoom(1)}>Reset</PillBtn>
        <PillBtn onClick={fitToScreen}>Fit màn hình</PillBtn>
        <PillBtn onClick={() => setCollapsed(new Set(departments.map(d => d.id)))}>Thu gọn</PillBtn>
        <PillBtn onClick={() => setCollapsed(new Set())}>Mở rộng</PillBtn>
      </div>

      {/* Chart canvas */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(),
          overflow: 'auto', flex: 1, minHeight: 400,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          id="org-chart-printable"
          ref={chartRef}
          style={{ minWidth: 'max-content', padding: '32px 40px', transformOrigin: 'top left', transform: `scale(${zoom})` }}
        >
          <Tree lineWidth="2px" lineColor="#c7d2fe" lineBorderRadius="8px" label={<ClubNode club={club} />}>
            {clubAdmin ? (
              <TreeNode label={<MemberNode member={clubAdmin} highlighted={isHighlighted(clubAdmin)} />}>
                {departments.map((dept, i) => <DeptSubtree key={dept.id} dept={dept} index={i} />)}
                {freeMembers.length > 0 && (
                  <TreeNode label={
                    <div style={{
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: D.bg, border: '1.5px dashed #dce6f4', borderRadius: 12,
                      padding: '10px 16px', minWidth: 120,
                    }}>
                      <p style={{ fontWeight: 700, fontSize: 12, color: D.inkDim, margin: 0 }}>Thành viên tự do</p>
                      <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>{freeMembers.length} người</p>
                    </div>
                  }>
                    {freeMembers.map(m => <TreeNode key={m.id} label={<MemberNode member={m} highlighted={isHighlighted(m)} />} />)}
                  </TreeNode>
                )}
              </TreeNode>
            ) : (
              departments.map((dept, i) => <DeptSubtree key={dept.id} dept={dept} index={i} />)
            )}
          </Tree>
        </div>
      </div>

      {/* Legend */}
      <div className="orgchart-no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, fontSize: 12, color: D.inkMuted }}>
        <span style={{ fontWeight: 700, color: D.inkDim }}>Chú thích:</span>
        {[
          { color: '#1d4ed8', label: 'Trưởng CLB' },
          { color: '#7c3aed', label: 'Trưởng ban' },
          { color: '#dce6f4', label: 'Thành viên' },
          { color: '#facc15', label: 'Kết quả tìm kiếm' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: 'inline-block', border: D.borderLight }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
