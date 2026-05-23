import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tree, TreeNode } from 'react-organizational-chart'
import { getClubMembers, getDepartments, getClubDetail } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem, ClubDetail } from '@/components/membership/services/club.types'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { toast } from 'sonner'

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#38bdf8']
const DEPT_COLORS  = ['#4f46e5', '#7c3aed', '#ec4899', '#14b8a6', '#38bdf8', '#f59e0b']

const D = {
  border: '1.5px solid #15131a', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14, ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: '#f7f6f1', card: '#ffffff',
}

function ClubNode({ club }: { club: ClubDetail }) {
  const letter = (club.name.startsWith('CLB ') ? club.name.slice(4) : club.name)[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 16, padding: '12px 20px', minWidth: 140, boxShadow: '4px 4px 0 #15131a', border: '1.5px solid #15131a' }}>
      {club.logoUrl
        ? <img src={club.logoUrl} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #15131a' }} alt="" />
        : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 18, color: '#fff', border: '1.5px solid #15131a' }}>{letter}</div>
      }
      <p style={{ fontWeight: 800, fontSize: 13, color: '#15131a', margin: 0, textAlign: 'center' }}>{club.name}</p>
      <p style={{ fontSize: 11, color: '#918c99', margin: 0 }}>{club.memberCount} thành viên</p>
    </div>
  )
}

function DeptNode({ dept, index }: { dept: DepartmentItem; index: number }) {
  const color = DEPT_COLORS[index % DEPT_COLORS.length]
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: D.card, border: D.border, borderRadius: 12, padding: '10px 16px', minWidth: 128, boxShadow: D.shadow(2, 2) }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: color, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>▦</div>
      <p style={{ fontWeight: 700, fontSize: 12, color: D.ink, margin: 0, textAlign: 'center' }}>{dept.name}</p>
      {dept.deptLeadName
        ? <p style={{ fontSize: 11, color: '#4f46e5', margin: 0, textAlign: 'center' }}>{dept.deptLeadName}</p>
        : <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>⚠ Chưa có TB</span>
      }
      <p style={{ fontSize: 10, color: D.inkMuted, margin: 0 }}>{dept.memberCount} TV</p>
    </div>
  )
}

function MemberNode({ member }: { member: MemberItem }) {
  const name = member.fullName || member.email
  const initials = name.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  const isAdmin = member.clubRole === CLUB_ROLES.CLUB_ADMIN
  const isLead  = member.clubRole === CLUB_ROLES.DEPT_LEAD
  const roleBg  = isAdmin ? '#4f46e5' : isLead ? '#7c3aed' : '#e8e3d6'
  const roleCol = isAdmin || isLead ? '#fff' : D.inkMuted
  const roleLabel = isAdmin ? 'Trưởng CLB' : isLead ? 'Trưởng ban' : 'Thành viên'
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: isAdmin ? '#ede9fe' : D.card,
      border: isAdmin ? '1.5px solid #4f46e5' : isLead ? '1.5px solid #7c3aed' : D.borderLight,
      borderRadius: 12, padding: '8px 12px', minWidth: 100,
      boxShadow: isAdmin ? '2px 2px 0 #4f46e5' : '2px 2px 0 #e8e3d6',
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

export default function OrgChartPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClubDetail(id), getDepartments(id), getClubMembers(id)])
      .then(([c, d, m]) => { setClub(c); setDepartments(d); setMembers(m) })
      .catch(() => toast.error('Không thể tải dữ liệu sơ đồ.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ padding: '28px 32px', color: '#918c99', fontSize: 13, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Đang tải...</div>
  )
  if (!club) return null

  const activeMembers = members.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)
  const membersByDept = (deptId: number) => activeMembers.filter(m => m.departmentId === deptId)
  const clubAdmin = activeMembers.find(m => m.clubRole === CLUB_ROLES.CLUB_ADMIN)
  const freeMembers = activeMembers.filter(m => !m.departmentId && m.clubRole === CLUB_ROLES.MEMBER)

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Sơ đồ cơ cấu tổ chức</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{activeMembers.length} thành viên đang hoạt động</p>
      </div>

      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '24px', overflowX: 'auto' }}>
        <div style={{ minWidth: 'max-content', margin: '0 auto' }}>
          <Tree lineWidth="2px" lineColor="#c7d2fe" lineBorderRadius="8px" label={<ClubNode club={club} />}>
            {clubAdmin && (
              <TreeNode label={<MemberNode member={clubAdmin} />}>
                {departments.map((dept, i) => (
                  <TreeNode key={dept.id} label={<DeptNode dept={dept} index={i} />}>
                    {membersByDept(dept.id).map(m => (
                      <TreeNode key={m.id} label={<MemberNode member={m} />} />
                    ))}
                    {membersByDept(dept.id).length === 0 && (
                      <TreeNode label={
                        <div style={{ fontSize: 11, color: D.inkMuted, border: '1.5px dashed #e8e3d6', borderRadius: 10, padding: '8px 14px' }}>Chưa có thành viên</div>
                      } />
                    )}
                  </TreeNode>
                ))}
                {freeMembers.length > 0 && (
                  <TreeNode label={
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: D.bg, border: '1.5px dashed #e8e3d6', borderRadius: 12, padding: '10px 16px', minWidth: 120 }}>
                      <p style={{ fontWeight: 700, fontSize: 12, color: D.inkDim, margin: 0 }}>Thành viên tự do</p>
                      <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>{freeMembers.length} người</p>
                    </div>
                  }>
                    {freeMembers.map(m => <TreeNode key={m.id} label={<MemberNode member={m} />} />)}
                  </TreeNode>
                )}
              </TreeNode>
            )}
            {!clubAdmin && departments.map((dept, i) => (
              <TreeNode key={dept.id} label={<DeptNode dept={dept} index={i} />}>
                {membersByDept(dept.id).map(m => <TreeNode key={m.id} label={<MemberNode member={m} />} />)}
              </TreeNode>
            ))}
          </Tree>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 16, fontSize: 12, color: D.inkMuted }}>
        <span style={{ fontWeight: 700, color: D.inkDim }}>Chú thích:</span>
        {[
          { color: '#4f46e5', label: 'Trưởng CLB' },
          { color: '#7c3aed', label: 'Trưởng ban' },
          { color: '#e8e3d6', label: 'Thành viên' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: 'inline-block', border: D.borderLight }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
