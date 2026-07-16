import { useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import type { CSSProperties, FormEvent } from 'react'
import {
  assignMemberPositions,
  createClubPosition,
  deleteClubPosition,
  getClubMembers,
  getClubPermissions,
  getClubPositions,
  getDepartments,
  getMemberPositions,
  updateClubPosition,
  updateClubPositionPermissions,
} from '@/components/membership/services/clubApi'
import type {
  ClubPermissionItem,
  ClubPositionItem,
  DepartmentItem,
  MemberItem,
} from '@/components/membership/services/club.types'
import { MEMBERSHIP_STATUS } from '@/types/auth'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Check, Pencil, Plus, Save, ShieldCheck, Trash2, Users } from 'lucide-react'
import { Tooltip } from '@/components/shared/Tooltip'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'

const inputStyle: CSSProperties = {
  width: '100%',
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

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: D.inkDim,
  display: 'block',
  marginBottom: 4,
}

type PositionForm = {
  name: string
  description: string
  departmentId: string
  isDefault: boolean
  canBeAssignedByDeptLead: boolean
  isUnique: boolean
  permissionCodes: string[]
}

interface Props {
  clubId: number
  clubName?: string
  title?: string
  canManageCatalog: boolean
  canAssignPositions?: boolean
  departmentScopeId?: number
  departmentScopeName?: string
}

const emptyForm: PositionForm = {
  name: '',
  description: '',
  departmentId: '',
  isDefault: false,
  canBeAssignedByDeptLead: true,
  isUnique: false,
  permissionCodes: [],
}

function getMemberName(member: MemberItem) {
  return member.fullName || member.email
}

const MODULE_LABELS: Record<string, string> = {
  Membership: 'Thành viên',
  Operations: 'Vận hành',
  Portal: 'Cổng thông tin',
}

const GROUP_LABELS: Record<string, string> = {
  'Thanh vien': 'Thành viên',
  'Danh gia': 'Đánh giá',
  'Co cau to chuc': 'Cơ cấu tổ chức',
  'Tuyen thanh vien': 'Tuyển thành viên',
  'Nhan su': 'Nhân sự',
  'Bao cao': 'Báo cáo',
  'Cai dat': 'Cài đặt',
  'Kiem soat': 'Kiểm soát',
  'Tong quan': 'Tổng quan',
  'Cong viec': 'Công việc',
  'Su kien': 'Sự kiện',
  'Noi dung': 'Nội dung',
  'Truyen thong': 'Truyền thông',
  'Goi y': 'Gợi ý',
  'Thong bao': 'Thông báo',
  'Landing page': 'Trang giới thiệu',
}

const PERMISSION_LABELS: Record<string, string> = {
  'membership.members.view': 'Xem thành viên',
  'membership.members.manage': 'Quản lý thành viên',
  'membership.member_history.view': 'Xem lịch sử tham gia',
  'membership.member_lifecycle.manage': 'Quản lý vòng đời thành viên',
  'membership.member_kpi.view': 'Xem KPI thành viên',
  'membership.member_kpi.manage': 'Quản lý KPI thành viên',
  'membership.members.import_export': 'Nhập/xuất thành viên',
  'membership.departments.manage': 'Quản lý ban bộ phận',
  'membership.applications.view': 'Xem đơn đăng ký',
  'membership.applications.review': 'Duyệt đơn đăng ký',
  'membership.recruitment_pipeline.manage': 'Quản lý quy trình tuyển',
  'membership.recruitment_form.manage': 'Quản lý form đăng ký',
  'membership.resignations.view': 'Xem đơn từ chức',
  'membership.resignations.review': 'Duyệt đơn từ chức',
  'membership.org_chart.view': 'Xem sơ đồ tổ chức',
  'membership.org_chart.manage': 'Quản lý sơ đồ tổ chức',
  'membership.positions.manage': 'Quản lý vị trí',
  'membership.position_assignments.manage': 'Gán vị trí',
  'membership.reports.view': 'Xem báo cáo',
  'membership.reports.export': 'Xuất báo cáo',
  'membership.role_suggestions.use': 'Dùng gợi ý vai trò',
  'club.settings.manage': 'Quản lý cài đặt CLB',
  'club.audit_log.view': 'Xem lịch sử thay đổi',
  'club.profile.manage': 'Quản lý thông tin CLB',
  'operations.dashboard.view': 'Xem tổng quan vận hành',
  'operations.tasks.view': 'Xem công việc',
  'operations.tasks.manage': 'Quản lý công việc',
  'operations.sprints.manage': 'Quản lý sprint',
  'operations.events.view': 'Xem sự kiện',
  'operations.events.manage': 'Quản lý sự kiện',
  'operations.event_participants.manage': 'Quản lý người tham gia',
  'operations.workload.view': 'Xem tải công việc',
  'portal.landing_page.manage': 'Quản lý trang giới thiệu',
  'portal.content.view': 'Xem nội dung công khai',
  'portal.content.manage': 'Quản lý nội dung',
  'portal.content.review': 'Duyệt nội dung',
  'portal.media.manage': 'Quản lý hình ảnh',
  'portal.seo.manage': 'Quản lý SEO',
  'portal.template.manage': 'Quản lý mẫu giao diện',
  'portal.analytics.view': 'Xem phân tích truy cập',
  'portal.social.manage': 'Quản lý mạng xã hội',
  'portal.recommendations.manage': 'Quản lý gợi ý CLB',
  'notifications.view': 'Xem thông báo',
  'notifications.settings.manage': 'Quản lý thông báo',
}

function permissionKey(permission: ClubPermissionItem) {
  return `${MODULE_LABELS[permission.module] ?? permission.module} / ${GROUP_LABELS[permission.group] ?? permission.group}`
}

function permissionName(permission: ClubPermissionItem) {
  return PERMISSION_LABELS[permission.code] ?? permission.name
}

export default function PositionManagementPanel({
  clubId,
  clubName,
  title = 'Vị trí & quyền',
  canManageCatalog,
  canAssignPositions = true,
  departmentScopeId,
  departmentScopeName,
}: Props) {
  const [positions, setPositions] = useState<ClubPositionItem[]>([])
  const [permissions, setPermissions] = useState<ClubPermissionItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [search, setSearch] = useState('')
  const [localDepartmentFilter, setLocalDepartmentFilter] = useState('')
  const departmentFilter = departmentScopeId ? String(departmentScopeId) : localDepartmentFilter
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedMemberPositionIds, setSelectedMemberPositionIds] = useState<number[]>([])
  const [loadingMemberPositions, setLoadingMemberPositions] = useState(false)
  const [savingMemberPositions, setSavingMemberPositions] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClubPositionItem | null>(null)
  const [form, setForm] = useState<PositionForm>(emptyForm)
  const [savingPosition, setSavingPosition] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClubPositionItem | null>(null)

  const selectedMember = useMemo(
    () => members.find(member => String(member.id) === selectedMemberId) ?? null,
    [members, selectedMemberId]
  )
  const canShowAssignment = canManageCatalog || canAssignPositions

  const scopedPositions = useMemo(() => {
    if (!departmentScopeId) return positions
    return positions.filter(position => position.departmentId === departmentScopeId)
  }, [departmentScopeId, positions])

  const filteredPositions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scopedPositions
      .filter(position => !q
        || position.name.toLowerCase().includes(q)
        || (position.departmentName ?? '').toLowerCase().includes(q)
        || (position.description ?? '').toLowerCase().includes(q))
      .filter(position => {
        if (!departmentFilter) return true
        if (departmentFilter === '__club__') return !position.departmentId
        return String(position.departmentId ?? '') === departmentFilter
      })
      .sort((a, b) => (a.departmentName ?? '').localeCompare(b.departmentName ?? '') || a.name.localeCompare(b.name))
  }, [departmentFilter, scopedPositions, search])

  const assignablePositions = useMemo(() => {
    if (!selectedMember || (!canManageCatalog && !canAssignPositions)) return []
    return positions
      .filter(position => {
        if (!canManageCatalog && !position.canBeAssignedByDeptLead) return false
        if (departmentScopeId) return position.departmentId === departmentScopeId
        // Vị trí cấp CLB: luôn gán được. Vị trí theo ban: gán được nếu thành viên thuộc đúng ban,
        // HOẶC chưa thuộc ban nào (khi đó gán vị trí sẽ tự động thêm họ vào ban đó).
        return !position.departmentId
          || position.departmentId === selectedMember.departmentId
          || !selectedMember.departmentId
      })
      .sort((a, b) => (a.departmentName ?? '').localeCompare(b.departmentName ?? '') || a.name.localeCompare(b.name))
  }, [canAssignPositions, canManageCatalog, departmentScopeId, positions, selectedMember])

  const permissionGroups = useMemo(() => {
    const map = new Map<string, ClubPermissionItem[]>()
    for (const permission of permissions) {
      const key = permissionKey(permission)
      const items = map.get(key) ?? []
      items.push(permission)
      map.set(key, items)
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }, [permissions])

  useDeferredEffect((isCancelled) => {
    setLoading(true)
    Promise.all([
      getClubPositions(clubId, departmentScopeId ? { departmentId: departmentScopeId } : undefined),
      getClubPermissions(),
      getDepartments(clubId),
      getClubMembers(clubId, {
        status: MEMBERSHIP_STATUS.ACTIVE,
        departmentId: departmentScopeId,
      }),
    ])
      .then(([positionData, permissionData, departmentData, memberData]) => {
        if (isCancelled()) return
        setPositions(positionData)
        setPermissions(permissionData)
        setDepartments(departmentScopeId ? departmentData.filter(d => d.id === departmentScopeId) : departmentData)
        setMembers(departmentScopeId ? memberData.filter(m => m.departmentId === departmentScopeId) : memberData)
      })
      .catch(() => { if (!isCancelled()) toast.error('Không thể tải dữ liệu vị trí.') })
      .finally(() => { if (!isCancelled()) setLoading(false) })
  }, [clubId, departmentScopeId, refreshKey], { enabled: Boolean(clubId) })

  useDeferredEffect((isCancelled) => {
    setLoadingMemberPositions(true)
    getMemberPositions(clubId, Number(selectedMemberId))
      .then(result => {
        if (isCancelled()) return
        const positionIds = canManageCatalog
          ? result.positions.map(position => position.id)
          : result.positions
              .filter(position => position.departmentId === departmentScopeId && position.canBeAssignedByDeptLead)
              .map(position => position.id)
        setSelectedMemberPositionIds(positionIds)
      })
      .catch(() => { if (!isCancelled()) toast.error('Không thể tải vị trí của thành viên.') })
      .finally(() => { if (!isCancelled()) setLoadingMemberPositions(false) })
  }, [canManageCatalog, clubId, departmentScopeId, selectedMemberId], { enabled: Boolean(selectedMemberId) })

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, departmentId: departmentScopeId ? String(departmentScopeId) : '' })
    setDialogOpen(true)
  }

  function openEdit(position: ClubPositionItem) {
    setEditing(position)
    setForm({
      name: position.name,
      description: position.description ?? '',
      departmentId: position.departmentId ? String(position.departmentId) : '',
      isDefault: position.isDefault,
      canBeAssignedByDeptLead: position.canBeAssignedByDeptLead,
      isUnique: position.isUnique,
      permissionCodes: position.permissionCodes,
    })
    setDialogOpen(true)
  }

  function togglePermission(code: string) {
    setForm(prev => {
      const selected = new Set(prev.permissionCodes)
      if (selected.has(code)) selected.delete(code)
      else selected.add(code)
      return { ...prev, permissionCodes: Array.from(selected) }
    })
  }

  function toggleAssignedPosition(positionId: number) {
    setSelectedMemberPositionIds(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    )
  }

  async function savePosition(e: FormEvent) {
    e.preventDefault()
    if (!canManageCatalog) return
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên vị trí.')
      return
    }

    setSavingPosition(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        isDefault: form.isDefault,
        canBeAssignedByDeptLead: form.canBeAssignedByDeptLead,
        isUnique: form.isUnique,
      }

      if (editing) {
        await updateClubPosition(clubId, editing.id, payload)
        await updateClubPositionPermissions(clubId, editing.id, form.permissionCodes)
        toast.success('Đã cập nhật vị trí.')
      } else {
        await createClubPosition(clubId, { ...payload, permissionCodes: form.permissionCodes })
        toast.success('Đã tạo vị trí.')
      }

      setDialogOpen(false)
      setRefreshKey(k => k + 1)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Lưu vị trí thất bại.'))
    } finally {
      setSavingPosition(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteClubPosition(clubId, deleteTarget.id)
      toast.success('Đã xoá vị trí.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Xoá vị trí thất bại.'))
    }
  }

  async function saveMemberPositions() {
    if (!selectedMemberId || (!canManageCatalog && !canAssignPositions)) return
    setSavingMemberPositions(true)
    try {
      await assignMemberPositions(clubId, Number(selectedMemberId), selectedMemberPositionIds)
      toast.success('Đã cập nhật vị trí cho thành viên.')
      setRefreshKey(k => k + 1)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gán vị trí thất bại.'))
    } finally {
      setSavingMemberPositions(false)
    }
  }

  return (
    <div className="mgmt-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>{title}</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            {clubName ? `${clubName} · ` : ''}{filteredPositions.length}/{scopedPositions.length} vị trí
            {departmentScopeName ? ` · ${departmentScopeName}` : ''}
          </p>
        </div>
        {canManageCatalog && (
          <button
            onClick={openCreate}
            style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Thêm vị trí
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: canShowAssignment ? 'minmax(0, 1.2fr) minmax(340px, .8fr)' : '1fr', gap: 18, alignItems: 'start' }}>
        <section>
          <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="⌕  Tìm vị trí, ban..."
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            />
            {!departmentScopeId && (
              <FilterSelect
                value={departmentFilter}
                onChange={setLocalDepartmentFilter}
                options={[
                  { value: '', label: 'Tất cả phạm vi' },
                  { value: '__club__', label: 'Cấp CLB' },
                  ...departments.map(dept => ({ value: String(dept.id), label: dept.name })),
                ]}
                style={{ width: 180 }}
              />
            )}
            {(search || (!departmentScopeId && departmentFilter)) && (
              <button
                onClick={() => { setSearch(''); if (!departmentScopeId) setLocalDepartmentFilter('') }}
                style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Xoá lọc
              </button>
            )}
          </div>

          <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
                  <th style={thStyle}>Vị trí</th>
                  <th style={thStyle}>Phạm vi</th>
                  <th style={thStyle}>Quyền</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Thành viên</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={emptyCell}>Đang tải...</td></tr>
                ) : filteredPositions.length === 0 ? (
                  <tr><td colSpan={5} style={emptyCell}>Chưa có vị trí nào.</td></tr>
                ) : filteredPositions.map(position => (
                  <tr key={position.id} style={{ borderBottom: D.borderLight }}>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 800, color: D.ink }}>{position.name}</span>
                        {position.description && <span style={{ color: D.inkMuted, fontSize: 12 }}>{position.description}</span>}
                        {position.canBeAssignedByDeptLead && (
                          <span style={{ color: '#047857', fontSize: 11, fontWeight: 700 }}>Trưởng ban được gán</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', color: D.inkDim }}>
                      {position.departmentName
                        ? <span style={tagStyle('#eef2ff', '#3730a3')}>{position.departmentName}</span>
                        : <span style={tagStyle('#fef3c7', '#92400e')}>Cấp CLB</span>}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ color: D.inkMuted, fontWeight: 700 }}>{position.permissionCodes.length}</span>
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'center', color: D.inkDim, fontWeight: 700 }}>{position.memberCount}</td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Tooltip label="Xem quyền">
                          <button
                            onClick={() => openEdit(position)}
                            style={iconButtonStyle(D.violetSoft, D.indigo)}
                          >
                            <ShieldCheck size={14} />
                          </button>
                        </Tooltip>
                        {canManageCatalog && (
                          <>
                            <Tooltip label="Chỉnh sửa">
                              <button onClick={() => openEdit(position)} style={iconButtonStyle('#eef2ff', D.indigo)}>
                                <Pencil size={14} />
                              </button>
                            </Tooltip>
                            <Tooltip label="Xoá">
                              <button onClick={() => setDeleteTarget(position)} style={iconButtonStyle('#fee2e2', D.red)}>
                                <Trash2 size={14} />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canShowAssignment && <aside style={{ borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow() }}>
          <div style={{ background: D.indigo, color: '#fff', padding: '14px 16px', fontSize: 13, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, borderTopLeftRadius: D.radius, borderTopRightRadius: D.radius }}>
            <Users size={16} /> Gán vị trí
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Thành viên</label>
              <FilterSelect
                value={selectedMemberId}
                onChange={value => {
                  setSelectedMemberId(value)
                  if (!value) setSelectedMemberPositionIds([])
                }}
                options={[
                  { value: '', label: '— Chọn thành viên —' },
                  ...members.map(member => ({
                    value: String(member.id),
                    label: `${getMemberName(member)}${member.departmentName ? ` · ${member.departmentName}` : ''}`,
                  })),
                ]}
                maxMenuHeight={320}
              />
            </div>

            {!selectedMember ? (
              <div style={{ border: D.borderLight, borderRadius: 10, padding: '22px 14px', color: D.inkMuted, textAlign: 'center', fontSize: 13 }}>
                Chọn thành viên để gán vị trí.
              </div>
            ) : loadingMemberPositions ? (
              <div style={{ border: D.borderLight, borderRadius: 10, padding: '22px 14px', color: D.inkMuted, textAlign: 'center', fontSize: 13 }}>
                Đang tải vị trí...
              </div>
            ) : assignablePositions.length === 0 ? (
              <div style={{ border: D.borderLight, borderRadius: 10, padding: '22px 14px', color: D.inkMuted, textAlign: 'center', fontSize: 13 }}>
                Không có vị trí phù hợp.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflow: 'auto', paddingRight: 2 }}>
                {assignablePositions.map(position => {
                  const checked = selectedMemberPositionIds.includes(position.id)
                  return (
                    <button
                      key={position.id}
                      onClick={() => toggleAssignedPosition(position.id)}
                      style={{
                        textAlign: 'left',
                        border: checked ? D.border : D.borderLight,
                        background: checked ? '#eef2ff' : D.bg,
                        borderRadius: 10,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: D.border,
                        background: checked ? D.indigo : D.card,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}>
                        {checked && <Check size={13} />}
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', color: D.ink, fontWeight: 800, fontSize: 13 }}>{position.name}</span>
                        <span style={{ display: 'block', color: D.inkMuted, fontSize: 11, marginTop: 2 }}>
                          {position.departmentName ?? 'Cấp CLB'} · {position.permissionCodes.length} quyền
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={saveMemberPositions}
              disabled={!selectedMember || savingMemberPositions || (!canManageCatalog && !canAssignPositions)}
              style={{
                background: !selectedMember || (!canManageCatalog && !canAssignPositions) ? '#e5e1d8' : D.indigo,
                color: !selectedMember || (!canManageCatalog && !canAssignPositions) ? D.inkMuted : '#fff',
                border: D.border,
                boxShadow: D.shadow(2,2),
                borderRadius: D.pill,
                height: 40,
                fontSize: 13,
                fontWeight: 800,
                cursor: !selectedMember || savingMemberPositions || (!canManageCatalog && !canAssignPositions) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Save size={15} /> {savingMemberPositions ? 'Đang lưu...' : 'Lưu phân công'}
            </button>
          </div>
        </aside>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-3xl" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900 }}>
              {canManageCatalog ? (editing ? 'Chỉnh sửa vị trí' : 'Thêm vị trí') : 'Chi tiết vị trí'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={savePosition} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Tên vị trí</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!canManageCatalog}
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Phạm vi</label>
                <FilterSelect
                  value={form.departmentId}
                  onChange={value => setForm(prev => ({ ...prev, departmentId: value }))}
                  disabled={!canManageCatalog || !!departmentScopeId}
                  options={[
                    { value: '', label: 'Cấp CLB' },
                    ...departments.map(dept => ({ value: String(dept.id), label: dept.name })),
                  ]}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Mô tả</label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                disabled={!canManageCatalog}
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: '9px 12px', resize: 'vertical' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: D.inkDim, fontSize: 13, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={form.canBeAssignedByDeptLead}
                disabled={!canManageCatalog}
                onChange={e => setForm(prev => ({ ...prev, canBeAssignedByDeptLead: e.target.checked }))}
              />
              Trưởng ban được gán vị trí này cho thành viên trong ban
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: D.inkDim, fontSize: 13, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={form.isUnique}
                disabled={!canManageCatalog}
                onChange={e => setForm(prev => ({ ...prev, isUnique: e.target.checked }))}
                style={{ marginTop: 3 }}
              />
              <span>
                Vị trí độc quyền — chỉ một người được giữ cùng lúc
                <span style={{ display: 'block', color: D.inkMuted, fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                  Bật cho các chức danh lãnh đạo (Trưởng CLB, Thủ quỹ…). Khi đã có người giữ,
                  hệ thống sẽ chặn gán cho người thứ hai cho tới khi gỡ người hiện tại.
                </span>
              </span>
            </label>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Quyền</label>
                <span style={{ color: D.inkMuted, fontSize: 12, fontWeight: 700 }}>{form.permissionCodes.length} quyền đã chọn</span>
              </div>
              <div style={{ maxHeight: 340, overflow: 'auto', border: D.borderLight, borderRadius: 10, padding: 10, background: D.bg }}>
                {permissionGroups.map(group => (
                  <div key={group.key} style={{ marginBottom: 12 }}>
                    <div style={{ color: D.ink, fontSize: 12, fontWeight: 900, marginBottom: 6, letterSpacing: '.02em' }}>{group.key}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                      {group.items.map(permission => {
                        const checked = form.permissionCodes.includes(permission.code)
                        return (
                          <button
                            key={permission.code}
                            type="button"
                            onClick={() => canManageCatalog && togglePermission(permission.code)}
                            style={{
                              border: checked ? D.border : D.borderLight,
                              background: checked ? '#eef2ff' : D.card,
                              borderRadius: 9,
                              padding: '9px 10px',
                              cursor: canManageCatalog ? 'pointer' : 'default',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                            }}
                          >
                            <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{
                                width: 18,
                                height: 18,
                                borderRadius: 5,
                                border: D.border,
                                background: checked ? D.indigo : D.card,
                                color: '#fff',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}>
                                {checked && <Check size={12} />}
                              </span>
                              <span>
                                <span style={{ display: 'block', color: D.ink, fontSize: 12, fontWeight: 800 }}>{permissionName(permission)}</span>
                                <span style={{ display: 'block', color: D.inkMuted, fontSize: 10.5, marginTop: 2 }}>{permission.code}</span>
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter style={{ borderTop: 'none', background: 'transparent', paddingTop: 0 }}>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Đóng
              </button>
              {canManageCatalog && (
                <button
                  type="submit"
                  disabled={savingPosition}
                  style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 800, cursor: savingPosition ? 'not-allowed' : 'pointer', opacity: savingPosition ? 0.7 : 1, fontFamily: 'inherit' }}
                >
                  {savingPosition ? 'Đang lưu...' : 'Lưu'}
                </button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá vị trí?</AlertDialogTitle>
            <AlertDialogDescription>
              Vị trí "{deleteTarget?.name}" sẽ không còn dùng được. Vị trí đang được gán cho thành viên sẽ không thể xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} style={{ background: D.red }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const thStyle: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 800,
  color: D.inkMuted,
  letterSpacing: '.02em',
  whiteSpace: 'nowrap',
}

const emptyCell: CSSProperties = {
  textAlign: 'center',
  color: D.inkMuted,
  padding: '48px 0',
}

function tagStyle(bg: string, color: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 9px',
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  }
}

function iconButtonStyle(bg: string, color: string): CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 7,
    border: D.borderLight,
    background: bg,
    color,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  }
}
