import { useEffect, useMemo, useState } from 'react'
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
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  violetSoft: '#ede9fe',
  greenSoft: '#d1fae5',
}

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
  permissionCodes: [],
}

function getMemberName(member: MemberItem) {
  return member.fullName || member.email
}

function permissionKey(permission: ClubPermissionItem) {
  return `${permission.module} / ${permission.group}`
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
  const [departmentFilter, setDepartmentFilter] = useState(departmentScopeId ? String(departmentScopeId) : '')
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
        return !position.departmentId || position.departmentId === selectedMember.departmentId
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

  useEffect(() => {
    if (!clubId) return
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
        setPositions(positionData)
        setPermissions(permissionData)
        setDepartments(departmentScopeId ? departmentData.filter(d => d.id === departmentScopeId) : departmentData)
        setMembers(departmentScopeId ? memberData.filter(m => m.departmentId === departmentScopeId) : memberData)
      })
      .catch(() => toast.error('Không thể tải dữ liệu position.'))
      .finally(() => setLoading(false))
  }, [clubId, departmentScopeId, refreshKey])

  useEffect(() => {
    setDepartmentFilter(departmentScopeId ? String(departmentScopeId) : '')
  }, [departmentScopeId])

  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedMemberPositionIds([])
      return
    }

    setLoadingMemberPositions(true)
    getMemberPositions(clubId, Number(selectedMemberId))
      .then(result => {
        const positionIds = canManageCatalog
          ? result.positions.map(position => position.id)
          : result.positions
              .filter(position => position.departmentId === departmentScopeId && position.canBeAssignedByDeptLead)
              .map(position => position.id)
        setSelectedMemberPositionIds(positionIds)
      })
      .catch(() => toast.error('Không thể tải position của thành viên.'))
      .finally(() => setLoadingMemberPositions(false))
  }, [canManageCatalog, clubId, departmentScopeId, selectedMemberId])

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
      toast.error('Vui lòng nhập tên position.')
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
      }

      if (editing) {
        await updateClubPosition(clubId, editing.id, payload)
        await updateClubPositionPermissions(clubId, editing.id, form.permissionCodes)
        toast.success('Đã cập nhật position.')
      } else {
        await createClubPosition(clubId, { ...payload, permissionCodes: form.permissionCodes })
        toast.success('Đã tạo position.')
      }

      setDialogOpen(false)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Lưu position thất bại.')
    } finally {
      setSavingPosition(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteClubPosition(clubId, deleteTarget.id)
      toast.success('Đã xoá position.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Xoá position thất bại.')
    }
  }

  async function saveMemberPositions() {
    if (!selectedMemberId || (!canManageCatalog && !canAssignPositions)) return
    setSavingMemberPositions(true)
    try {
      await assignMemberPositions(clubId, Number(selectedMemberId), selectedMemberPositionIds)
      toast.success('Đã cập nhật position cho thành viên.')
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gán position thất bại.')
    } finally {
      setSavingMemberPositions(false)
    }
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>{title}</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            {clubName ? `${clubName} · ` : ''}{filteredPositions.length}/{scopedPositions.length} position
            {departmentScopeName ? ` · ${departmentScopeName}` : ''}
          </p>
        </div>
        {canManageCatalog && (
          <button
            onClick={openCreate}
            style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Thêm position
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: canShowAssignment ? 'minmax(0, 1.2fr) minmax(340px, .8fr)' : '1fr', gap: 18, alignItems: 'start' }}>
        <section>
          <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="⌕  Tìm position, ban..."
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            />
            {!departmentScopeId && (
              <FilterSelect
                value={departmentFilter}
                onChange={setDepartmentFilter}
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
                onClick={() => { setSearch(''); if (!departmentScopeId) setDepartmentFilter('') }}
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
                  <th style={thStyle}>Position</th>
                  <th style={thStyle}>Phạm vi</th>
                  <th style={thStyle}>Permission</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Thành viên</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={emptyCell}>Đang tải...</td></tr>
                ) : filteredPositions.length === 0 ? (
                  <tr><td colSpan={5} style={emptyCell}>Chưa có position nào.</td></tr>
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
                        <Tooltip label="Xem permission">
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

        {canShowAssignment && <aside style={{ borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), overflow: 'hidden' }}>
          <div style={{ background: D.indigo, color: '#fff', padding: '14px 16px', fontSize: 13, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Gán position
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Thành viên</label>
              <select
                value={selectedMemberId}
                onChange={e => setSelectedMemberId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— Chọn thành viên —</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {getMemberName(member)}{member.departmentName ? ` · ${member.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!selectedMember ? (
              <div style={{ border: D.borderLight, borderRadius: 10, padding: '22px 14px', color: D.inkMuted, textAlign: 'center', fontSize: 13 }}>
                Chọn thành viên để gán position.
              </div>
            ) : loadingMemberPositions ? (
              <div style={{ border: D.borderLight, borderRadius: 10, padding: '22px 14px', color: D.inkMuted, textAlign: 'center', fontSize: 13 }}>
                Đang tải position...
              </div>
            ) : assignablePositions.length === 0 ? (
              <div style={{ border: D.borderLight, borderRadius: 10, padding: '22px 14px', color: D.inkMuted, textAlign: 'center', fontSize: 13 }}>
                Không có position phù hợp.
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
              {canManageCatalog ? (editing ? 'Chỉnh sửa position' : 'Thêm position') : 'Chi tiết position'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={savePosition} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Tên position</label>
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
                <select
                  value={form.departmentId}
                  onChange={e => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                  disabled={!canManageCatalog || !!departmentScopeId}
                  style={{ ...inputStyle, cursor: canManageCatalog ? 'pointer' : 'default' }}
                >
                  <option value="">Cấp CLB</option>
                  {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
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
              Trưởng ban được gán position này cho thành viên trong ban
            </label>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Permission</label>
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
                                <span style={{ display: 'block', color: D.ink, fontSize: 12, fontWeight: 800 }}>{permission.name}</span>
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
            <AlertDialogTitle>Xoá position?</AlertDialogTitle>
            <AlertDialogDescription>
              Position "{deleteTarget?.name}" sẽ không còn dùng được. Position đang được gán cho thành viên sẽ không thể xoá.
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
