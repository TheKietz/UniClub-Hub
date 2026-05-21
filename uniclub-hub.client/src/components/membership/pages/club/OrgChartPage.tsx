import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tree, TreeNode } from 'react-organizational-chart'
import { getClubMembers, getDepartments } from '@/components/membership/services/clubApi'
import { getClubDetail } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem, ClubDetail } from '@/components/membership/services/club.types'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

// ── Node components ───────────────────────────────────────────────────────────

function ClubNode({ club }: { club: ClubDetail }) {
  const letter = (club.name.startsWith('CLB ') ? club.name.slice(4) : club.name)[0]?.toUpperCase() ?? '?'
  return (
    <div className="inline-flex flex-col items-center gap-1.5 bg-indigo-600 text-white rounded-2xl px-5 py-3 shadow-lg min-w-36">
      {club.logoUrl
        ? <img src={club.logoUrl} className="w-10 h-10 rounded-full object-cover" />
        : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">{letter}</div>
      }
      <p className="font-semibold text-sm leading-tight">{club.name}</p>
      <p className="text-xs text-indigo-200">{club.memberCount} thành viên</p>
    </div>
  )
}

function DeptNode({ dept }: { dept: DepartmentItem }) {
  return (
    <div className="inline-flex flex-col items-center gap-1 bg-white border-2 border-indigo-200 rounded-xl px-4 py-2.5 shadow-sm min-w-32">
      <p className="font-semibold text-sm text-gray-800">{dept.name}</p>
      {dept.deptLeadName
        ? <p className="text-xs text-indigo-600">{dept.deptLeadName}</p>
        : <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={11} /> Chưa có trưởng ban
          </span>
      }
      <p className="text-xs text-gray-400">{dept.memberCount} thành viên</p>
    </div>
  )
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

function MemberNode({ member }: { member: MemberItem }) {
  const name = member.fullName || member.email
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  const isLead = member.clubRole === CLUB_ROLES.DEPT_LEAD
  const isAdmin = member.clubRole === CLUB_ROLES.CLUB_ADMIN

  return (
    <div className={`inline-flex flex-col items-center gap-1 rounded-xl px-3 py-2 shadow-sm border min-w-28 ${
      isAdmin ? 'border-indigo-400 bg-indigo-50' :
      isLead ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      {member.avatarUrl
        ? <img src={member.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
        : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: color }}>{initials}</div>
      }
      <p className="text-xs font-medium text-gray-800 text-center leading-tight max-w-24 truncate">{member.fullName ?? member.email}</p>
      {member.studentId && <p className="text-[10px] text-gray-400">{member.studentId}</p>}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
        isAdmin ? 'bg-indigo-100 text-indigo-700' :
        isLead ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {isAdmin ? 'Trưởng CLB' : isLead ? 'Trưởng ban' : 'Thành viên'}
      </span>
      {member.status === MEMBERSHIP_STATUS.PROBATION && (
        <span className="text-[10px] text-amber-600">Thử việc</span>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

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

  if (loading) return <div className="p-8 text-gray-400 text-sm">Đang tải...</div>
  if (!club) return null

  const activeMembers = members.filter(m =>
    m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION
  )

  // Nhóm members theo departmentId
  const membersByDept = (deptId: number) =>
    activeMembers.filter(m => m.departmentId === deptId)

  const clubAdmin = activeMembers.find(m => m.clubRole === CLUB_ROLES.CLUB_ADMIN)

  const freeMembers = activeMembers.filter(
    m => !m.departmentId && m.clubRole === CLUB_ROLES.MEMBER
  )

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Sơ đồ cơ cấu tổ chức</h1>
        <p className="text-sm text-gray-400 mt-0.5">{activeMembers.length} thành viên đang hoạt động</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-x-auto">
        <div className="min-w-max mx-auto">
          <Tree
            lineWidth="2px"
            lineColor="#c7d2fe"
            lineBorderRadius="8px"
            label={<ClubNode club={club} />}
          >
            {/* Trưởng CLB */}
            {clubAdmin && (
              <TreeNode label={<MemberNode member={clubAdmin} />}>
                {/* Các ban bộ phận */}
                {departments.map(dept => (
                  <TreeNode key={dept.id} label={<DeptNode dept={dept} />}>
                    {membersByDept(dept.id).map(m => (
                      <TreeNode key={m.id} label={<MemberNode member={m} />} />
                    ))}
                    {membersByDept(dept.id).length === 0 && (
                      <TreeNode label={
                        <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2">
                          Chưa có thành viên
                        </div>
                      } />
                    )}
                  </TreeNode>
                ))}

                {/* Thành viên tự do */}
                {freeMembers.length > 0 && (
                  <TreeNode label={
                    <div className="inline-flex flex-col items-center gap-1 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 min-w-32">
                      <p className="font-medium text-sm text-gray-500">Thành viên tự do</p>
                      <p className="text-xs text-gray-400">{freeMembers.length} người</p>
                    </div>
                  }>
                    {freeMembers.map(m => (
                      <TreeNode key={m.id} label={<MemberNode member={m} />} />
                    ))}
                  </TreeNode>
                )}
              </TreeNode>
            )}

            {/* Nếu chưa có trưởng CLB, render thẳng các ban */}
            {!clubAdmin && departments.map(dept => (
              <TreeNode key={dept.id} label={<DeptNode dept={dept} />}>
                {membersByDept(dept.id).map(m => (
                  <TreeNode key={m.id} label={<MemberNode member={m} />} />
                ))}
              </TreeNode>
            ))}
          </Tree>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Chú thích:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-50 border border-indigo-400 inline-block" /> Trưởng CLB</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-300 inline-block" /> Trưởng ban</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-gray-200 inline-block" /> Thành viên</span>
      </div>
    </div>
  )
}
