import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubMembers, addMember, updateMember, removeMember, getDepartments, getMemberFieldSchema, updateMemberCustomData } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem, MemberFieldDef } from '@/components/membership/services/club.types'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'
import { Pencil, X } from 'lucide-react'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { Tooltip } from '@/components/shared/Tooltip'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'

const PAGE_SIZE = 20

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
}

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  MEMBER: 'Thành viên',
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  CLUB_ADMIN: { bg: '#ede9fe', color: '#5b21b6' },
  DEPT_LEAD:  { bg: '#dbeafe', color: '#1e40af' },
  MEMBER:     { bg: '#d1fae5', color: '#065f46' },
}

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, border: D.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #e8e3d6',
  padding: '0 12px', fontSize: 13, color: '#15131a', outline: 'none',
  background: '#f7f6f1', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#4a4651', display: 'block', marginBottom: 4 }
const selectStyle: React.CSSProperties = { ...inputStyle, height: 36, cursor: 'pointer' }

type AddForm = { userId: string; clubRole: string; departmentId: string }
type EditForm = { clubRole: string; departmentId: string; customData: Record<string, string> }

export default function MembersPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [members, setMembers] = useState<MemberItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [fieldSchema, setFieldSchema] = useState<MemberFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>({ userId: '', clubRole: CLUB_ROLES.MEMBER, departmentId: '' })
  const [saving, setSaving] = useState(false)

  const [editTarget, setEditTarget] = useState<MemberItem | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ clubRole: CLUB_ROLES.MEMBER, departmentId: '', customData: {} })

  const [removeTarget, setRemoveTarget] = useState<MemberItem | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'joinedDate' | 'role'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  type ImportRow = { rowNumber: number; email: string; fullName?: string; clubRole: string; departmentName?: string; isValid: boolean; error?: string }
  type ImportPreview = { validRows: ImportRow[]; invalidRows: ImportRow[]; totalRows: number }
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  type LastAdminModal = { action: 'remove' | 'update'; membershipId: number; memberName: string; updateDto?: EditForm }
  const [lastAdminModal, setLastAdminModal] = useState<LastAdminModal | null>(null)
  const [replacementId, setReplacementId] = useState('')
  const [forceLoading, setForceLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getClubMembers(id), getDepartments(id), getMemberFieldSchema(id)])
      .then(([m, d, fs]) => { setMembers(m); setDepartments(d); setFieldSchema(fs) })
      .catch(() => toast.error('Không thể tải danh sách thành viên.'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  function setAddField(field: keyof AddForm) {
    return (e: { target: { value: string } }) => setAddForm(p => ({ ...p, [field]: e.target.value }))
  }
  function setEditField(field: keyof EditForm) {
    return (e: { target: { value: string } }) => setEditForm(p => ({ ...p, [field]: e.target.value }))
  }

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true)
    try {
      await addMember(id, {
        userId: addForm.userId,
        clubRole: addForm.clubRole,
        departmentId: addForm.departmentId ? Number(addForm.departmentId) : undefined,
      })
      toast.success('Đã thêm thành viên.')
      setAddOpen(false)
      setAddForm({ userId: '', clubRole: CLUB_ROLES.MEMBER, departmentId: '' })
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thêm thất bại.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(member: MemberItem) {
    setEditTarget(member)
    const existingData: Record<string, string> = {}
    fieldSchema.forEach(f => { existingData[f.id] = member.customData?.[f.id] ?? '' })
    setEditForm({ clubRole: member.clubRole, departmentId: member.departmentId?.toString() ?? '', customData: existingData })
  }

  async function handleEdit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      await updateMember(id, editTarget.id, {
        clubRole: editForm.clubRole,
        departmentId: editForm.departmentId ? Number(editForm.departmentId) : undefined,
      })
      if (fieldSchema.length > 0) {
        const customDataPayload: Record<string, string | null> = {}
        fieldSchema.forEach(f => { customDataPayload[f.id] = editForm.customData[f.id] || null })
        await updateMemberCustomData(id, editTarget.id, customDataPayload)
      }
      toast.success('Đã cập nhật thông tin thành viên.')
      setEditTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? ''
      if (msg.startsWith('LAST_CLUB_ADMIN')) {
        setLastAdminModal({ action: 'update', membershipId: editTarget.id, memberName: editTarget.fullName ?? editTarget.email, updateDto: editForm })
        setEditTarget(null)
      } else {
        toast.error(msg || 'Cập nhật thất bại.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePromote(membershipId: number) {
    try {
      await api.patch(`/clubs/${id}/members/${membershipId}/promote`)
      toast.success('Đã xác nhận thành viên chính thức.')
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Xác nhận thất bại.')
    }
  }

  async function handleImportPreview(file: File) {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: ImportPreview }>(`/clubs/${id}/members/import/preview`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportPreview(res.data.data)
      setImportStep('preview')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Không thể đọc file. Kiểm tra định dạng.')
    } finally {
      setImporting(false)
    }
  }

  async function handleImportConfirm() {
    if (!importPreview) return
    setImporting(true)
    try {
      const rows = importPreview.validRows.map(r => ({
        email: r.email, clubRole: r.clubRole, departmentName: r.departmentName,
      }))
      const res = await api.post<{ data: { imported: number; skipped: number } }>(`/clubs/${id}/members/import/confirm`, { rows })
      setImportResult(res.data.data)
      setImportStep('done')
      setRefreshKey(k => k + 1)
      toast.success(`Đã thêm ${res.data.data.imported} thành viên.`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Import thất bại.')
    } finally {
      setImporting(false)
    }
  }

  function resetImport() {
    setImportStep('upload')
    setImportPreview(null)
    setImportResult(null)
    setImportOpen(false)
    if (importFileRef.current) importFileRef.current.value = ''
  }

  async function handleRemove() {
    if (!removeTarget) return
    try {
      await removeMember(id, removeTarget.id)
      toast.success('Đã xoá thành viên khỏi CLB.')
      setRemoveTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? ''
      if (msg.startsWith('LAST_CLUB_ADMIN')) {
        setLastAdminModal({ action: 'remove', membershipId: removeTarget.id, memberName: removeTarget.fullName ?? removeTarget.email })
        setRemoveTarget(null)
      } else {
        toast.error(msg || 'Xoá thất bại.')
      }
    }
  }

  async function handleForceAction() {
    if (!lastAdminModal) return
    setForceLoading(true)
    try {
      if (replacementId) {
        await updateMember(id, Number(replacementId), { clubRole: CLUB_ROLES.CLUB_ADMIN })
      }
      const force = !replacementId
      if (lastAdminModal.action === 'remove') {
        await removeMember(id, lastAdminModal.membershipId, force)
        toast.success('Đã xoá thành viên khỏi CLB.')
      } else if (lastAdminModal.updateDto) {
        await updateMember(id, lastAdminModal.membershipId, {
          clubRole: lastAdminModal.updateDto.clubRole,
          departmentId: lastAdminModal.updateDto.departmentId ? Number(lastAdminModal.updateDto.departmentId) : undefined,
        }, force)
        toast.success('Đã cập nhật vai trò.')
      }
      setLastAdminModal(null)
      setReplacementId('')
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    } finally {
      setForceLoading(false)
    }
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    try {
      const res = await api.get(`/clubs/${id}/members/export?format=${format}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `members-club-${id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Xuất dữ liệu thất bại.')
    }
  }

  // reset khi filter thay đổi
  useEffect(() => setVisibleCount(PAGE_SIZE), [search, roleFilter, statusFilter, deptFilter, sortBy, sortDir])

  const hasFilter = !!(search || roleFilter || statusFilter || deptFilter)

  const filtered = members
    .filter(m => {
      const q = search.toLowerCase()
      const matchSearch = !q
        || (m.fullName ?? '').toLowerCase().includes(q)
        || m.email.toLowerCase().includes(q)
        || (m.studentId ?? '').toLowerCase().includes(q)
      const matchRole = !roleFilter || m.clubRole === roleFilter
      const matchStatus = !statusFilter || m.status === statusFilter
      const matchDept = !deptFilter
        || (deptFilter === '__none__' ? !m.departmentId && m.clubRole !== CLUB_ROLES.CLUB_ADMIN : String(m.departmentId ?? '') === deptFilter)
      return matchSearch && matchRole && matchStatus && matchDept
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email)
      else if (sortBy === 'joinedDate') cmp = (a.joinedDate ?? '').localeCompare(b.joinedDate ?? '')
      else if (sortBy === 'role') cmp = a.clubRole.localeCompare(b.clubRole)
      return sortDir === 'asc' ? cmp : -cmp
    })

  function clearFilters() { setSearch(''); setRoleFilter(''); setStatusFilter(''); setDeptFilter('') }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Quản lý thành viên</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{members.length} thành viên trong CLB</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => handleExport('xlsx')}
            style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Excel
          </button>
          <button onClick={() => handleExport('csv')}
            style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ CSV
          </button>
          <button onClick={() => { setImportOpen(true); setImportStep('upload') }}
            style={{ background: D.card, color: '#065f46', border: '1.5px solid #6ee7b7', boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↑ Import
          </button>
          <button onClick={() => setAddOpen(true)}
            style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Thêm thành viên
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="⌕  Tên, email, MSSV..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <FilterSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: 'Tất cả vai trò' },
            ...Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v as string })),
          ]}
          style={{ width: 150 }}
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'Active', label: 'Chính thức' },
            { value: 'Probation', label: 'Thử việc' },
          ]}
          style={{ width: 150 }}
        />
        <FilterSelect
          value={deptFilter}
          onChange={setDeptFilter}
          options={[
            { value: '', label: 'Tất cả ban' },
            { value: '__none__', label: '⚠ Chưa có ban' },
            ...departments.map(d => ({ value: String(d.id), label: d.name })),
          ]}
          style={{ width: 150 }}
        />
        <FilterSelect
          value={`${sortBy}-${sortDir}`}
          onChange={v => { const [col, dir] = v.split('-'); setSortBy(col as typeof sortBy); setSortDir(dir as 'asc' | 'desc') }}
          options={[
            { value: 'name-asc', label: 'Tên A→Z' },
            { value: 'name-desc', label: 'Tên Z→A' },
            { value: 'joinedDate-desc', label: 'Mới nhất' },
            { value: 'joinedDate-asc', label: 'Cũ nhất' },
            { value: 'role-asc', label: 'Vai trò' },
          ]}
          style={{ width: 140 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {hasFilter && (
            <button onClick={clearFilters}
              style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá lọc
            </button>
          )}
          <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{filtered.length}/{members.length}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Thành viên</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>MSSV</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Vai trò</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Ban</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Ngày vào</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: D.inkMuted, padding: '64px 0' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: D.inkMuted, padding: '64px 0' }}>
                  <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔍</p>
                  <p style={{ fontSize: 13, margin: 0 }}>{hasFilter ? 'Không có thành viên khớp với bộ lọc.' : 'Chưa có thành viên nào.'}</p>
                  {hasFilter && <button onClick={clearFilters} style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 6 }}>Xoá bộ lọc</button>}
                </td>
              </tr>
            ) : filtered.slice(0, visibleCount).map(m => (
              <tr key={m.id}
                onMouseEnter={() => setHoverRow(m.id)}
                onMouseLeave={() => setHoverRow(null)}
                style={{ background: hoverRow === m.id ? D.bg : D.card, borderBottom: D.borderLight }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={m.fullName || m.email} />
                    <div>
                      <p style={{ fontWeight: 700, color: D.ink, margin: 0, fontSize: 13 }}>{m.fullName ?? '—'}</p>
                      <p style={{ fontSize: 11, color: D.inkMuted, margin: '1px 0 0' }}>{m.email}</p>
                      {m.customData && fieldSchema.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {fieldSchema.map(f => {
                            const val = m.customData?.[f.id]
                            if (!val) return null
                            return (
                              <span key={f.id} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: '#eef2ff', color: D.indigo, fontWeight: 600, border: '1px solid #c7d2fe' }}>
                                {f.label}: {val}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: D.inkMuted }}>
                  {m.studentId ?? '—'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {(() => {
                    const s = ROLE_STYLE[m.clubRole] ?? { bg: '#f3f4f6', color: D.inkDim }
                    return (
                      <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', background: s.bg, color: s.color }}>
                        {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                      </span>
                    )
                  })()}
                </td>
                <td style={{ padding: '12px 14px', color: D.inkDim }}>
                  {m.departmentName
                    ? m.departmentName
                    : m.clubRole !== CLUB_ROLES.CLUB_ADMIN
                      ? <span style={{ fontSize: 11, color: D.amber, fontWeight: 600 }}>⚠ Chưa có ban</span>
                      : <span style={{ color: D.inkMuted }}>—</span>
                  }
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {m.status === MEMBERSHIP_STATUS.ACTIVE
                    ? <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', background: '#d1fae5', color: '#065f46' }}>Chính thức</span>
                    : m.status === MEMBERSHIP_STATUS.PROBATION
                      ? <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', background: '#dbeafe', color: '#1e40af' }}>Thử việc</span>
                      : <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', background: '#f3f4f6', color: D.inkMuted }}>Đã rời</span>
                  }
                </td>
                <td style={{ padding: '12px 14px', color: D.inkMuted, fontSize: 12 }}>
                  {m.joinedDate ? new Date(m.joinedDate).toLocaleDateString('vi-VN') : '—'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {m.status === MEMBERSHIP_STATUS.PROBATION && (
                      <Tooltip label="Xác nhận chính thức">
                        <button onClick={() => handlePromote(m.id)}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid #6ee7b7', cursor: 'pointer', color: '#065f46', fontSize: 13 }}>
                          ✓
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip label="Chỉnh sửa vai trò">
                      <button onClick={() => openEdit(m)}
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: D.borderLight, cursor: 'pointer', color: D.indigo }}>
                        <Pencil size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Xoá khỏi CLB">
                      <button onClick={() => setRemoveTarget(m)}
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: D.borderLight, cursor: 'pointer', color: D.red }}>
                        <X size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadMoreBar
        shown={Math.min(visibleCount, filtered.length)}
        total={filtered.length}
        onLoadMore={() => setVisibleCount(v => v + PAGE_SIZE)}
        label="thành viên"
      />

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader><DialogTitle style={{ color: D.ink, fontWeight: 900 }}>Thêm thành viên</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <div>
              <label style={labelStyle}>User ID *</label>
              <input value={addForm.userId} onChange={setAddField('userId')} required placeholder="ID tài khoản người dùng" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vai trò</label>
              <select value={addForm.clubRole} onChange={setAddField('clubRole')} style={selectStyle}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ban</label>
              <select value={addForm.departmentId} onChange={setAddField('departmentId')} style={selectStyle}>
                <option value="">— Không thuộc ban nào —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <DialogFooter style={{ borderTop: 'none', background: 'transparent', paddingTop: 4 }}>
              <button type="button" onClick={() => setAddOpen(false)}
                style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Huỷ
              </button>
              <button type="submit" disabled={saving}
                style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Đang lưu...' : 'Thêm'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 17 }}>
              Chỉnh sửa vai trò — {editTarget?.fullName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            {/* Member info card */}
            {editTarget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: D.bg, border: D.borderLight }}>
                <Avatar name={editTarget.fullName || editTarget.email} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: D.ink }}>{editTarget.fullName ?? '—'}</div>
                  <div style={{ fontSize: 12, color: D.inkMuted }}>{editTarget.email}</div>
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Vai trò</label>
              <select value={editForm.clubRole} onChange={setEditField('clubRole')} style={selectStyle}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ban</label>
              <select value={editForm.departmentId} onChange={setEditField('departmentId')} style={selectStyle}>
                <option value="">— Không thuộc ban nào —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {fieldSchema.length > 0 && (
              <div style={{ borderTop: '1px solid #e8e3d6', paddingTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>Thông tin đặc thù CLB</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fieldSchema.map(f => (
                    <div key={f.id}>
                      <label style={labelStyle}>{f.label}{f.required && <span style={{ color: '#ef4444' }}> *</span>}</label>
                      {f.type === 'select' ? (
                        <select
                          value={editForm.customData[f.id] ?? ''}
                          onChange={e => setEditForm(p => ({ ...p, customData: { ...p.customData, [f.id]: e.target.value } }))}
                          style={selectStyle}
                        >
                          <option value="">— Chọn —</option>
                          {(f.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          value={editForm.customData[f.id] ?? ''}
                          onChange={e => setEditForm(p => ({ ...p, customData: { ...p.customData, [f.id]: e.target.value } }))}
                          placeholder={f.label}
                          rows={3}
                          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          value={editForm.customData[f.id] ?? ''}
                          onChange={e => setEditForm(p => ({ ...p, customData: { ...p.customData, [f.id]: e.target.value } }))}
                          placeholder={f.label}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter style={{ borderTop: 'none', background: 'transparent', paddingTop: 4 }}>
              <button type="button" onClick={() => setEditTarget(null)}
                style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Huỷ
              </button>
              <button type="submit" disabled={saving}
                style={{ background: D.ink, color: '#facc15', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 18px', borderRadius: D.pill, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm remove */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: D.ink, fontWeight: 900 }}>Xoá khỏi CLB?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: D.inkDim }}>
              <strong>{removeTarget?.fullName ?? removeTarget?.email}</strong> sẽ bị xoá khỏi câu lạc bộ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: 'inherit' }}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} style={{ background: D.red, color: '#fff', border: D.border, fontFamily: 'inherit' }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) resetImport() }}>
        <DialogContent className="max-w-2xl" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900 }}>📥 Import thành viên từ file</DialogTitle>
          </DialogHeader>

          {importStep === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
              <div style={{ background: D.bg, borderRadius: 10, padding: '12px 16px', border: D.borderLight, fontSize: 13, color: D.inkDim }}>
                <p style={{ fontWeight: 700, color: D.ink, margin: '0 0 6px' }}>Hướng dẫn:</p>
                <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Tải file template về, điền dữ liệu theo đúng cột</li>
                  <li>Upload file (.xlsx hoặc .csv)</li>
                  <li>Kiểm tra preview và xác nhận import</li>
                </ol>
                <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 6 }}>Cột: <strong>Email</strong> (bắt buộc), <strong>ClubRole</strong>, <strong>Ban</strong></p>
              </div>
              <div>
                <button onClick={() => window.open(`/api/clubs/${id}/members/import/template`)}
                  style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '7px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↓ Tải template CSV
                </button>
              </div>
              <div
                onClick={() => importFileRef.current?.click()}
                style={{ border: '2px dashed #c4bdb1', borderRadius: D.radius, padding: '32px', textAlign: 'center', cursor: 'pointer', background: D.bg }}>
                {importing
                  ? <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Đang phân tích file...</p>
                  : <div>
                    <p style={{ fontSize: 28, margin: '0 0 8px' }}>📂</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: D.ink, margin: 0 }}>Nhấn để chọn file hoặc kéo thả</p>
                    <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 4 }}>Hỗ trợ .xlsx và .csv</p>
                  </div>
                }
              </div>
              <input ref={importFileRef} type="file" hidden accept=".xlsx,.xls,.csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImportPreview(f); e.target.value = '' }} />
            </div>
          )}

          {importStep === 'preview' && importPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ color: '#065f46', fontWeight: 700 }}>✓ {importPreview.validRows.length} dòng hợp lệ</span>
                {importPreview.invalidRows.length > 0 && (
                  <span style={{ color: D.red, fontWeight: 700 }}>✕ {importPreview.invalidRows.length} dòng lỗi</span>
                )}
                <span style={{ color: D.inkMuted }}>/ {importPreview.totalRows} tổng</span>
              </div>
              <div style={{ maxHeight: 288, overflowY: 'auto', borderRadius: 10, border: D.borderLight }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: D.bg, position: 'sticky', top: 0 }}>
                    <tr>
                      {['Dòng', 'Email', 'Tên', 'Vai trò', 'Ban', 'Kết quả'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: D.inkMuted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...importPreview.validRows, ...importPreview.invalidRows]
                      .sort((a, b) => a.rowNumber - b.rowNumber)
                      .map(row => (
                        <tr key={row.rowNumber} style={{ background: row.isValid ? D.card : '#fff1f2', borderTop: D.borderLight }}>
                          <td style={{ padding: '7px 12px', color: D.inkMuted }}>{row.rowNumber}</td>
                          <td style={{ padding: '7px 12px', color: D.inkDim }}>{row.email}</td>
                          <td style={{ padding: '7px 12px', color: D.inkDim }}>{row.fullName ?? '—'}</td>
                          <td style={{ padding: '7px 12px', color: D.inkDim }}>{row.clubRole}</td>
                          <td style={{ padding: '7px 12px', color: D.inkDim }}>{row.departmentName ?? '—'}</td>
                          <td style={{ padding: '7px 12px' }}>
                            {row.isValid
                              ? <span style={{ color: '#065f46', fontWeight: 600 }}>✓ OK</span>
                              : <span style={{ color: D.red, fontWeight: 600 }}>✕ {row.error}</span>
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter style={{ borderTop: 'none', paddingTop: 4 }}>
                <button onClick={() => setImportStep('upload')}
                  style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Chọn file khác
                </button>
                <button disabled={importPreview.validRows.length === 0 || importing} onClick={handleImportConfirm}
                  style={{ background: D.emerald, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: (importPreview.validRows.length === 0 || importing) ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {importing ? 'Đang import...' : `Import ${importPreview.validRows.length} thành viên`}
                </button>
              </DialogFooter>
            </div>
          )}

          {importStep === 'done' && importResult && (
            <div style={{ paddingTop: 24, paddingBottom: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <p style={{ fontSize: 40, margin: 0 }}>✅</p>
              <p style={{ fontWeight: 800, fontSize: 16, color: D.ink, margin: 0 }}>Import hoàn tất!</p>
              <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>
                Đã thêm <strong style={{ color: D.emerald }}>{importResult.imported}</strong> thành viên
                {importResult.skipped > 0 && `, bỏ qua ${importResult.skipped} dòng trùng.`}
              </p>
              <button onClick={resetImport}
                style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 20px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Đóng
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Trưởng CLB duy nhất */}
      <Dialog open={!!lastAdminModal} onOpenChange={open => { if (!open) { setLastAdminModal(null); setReplacementId('') } }}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.amber, fontWeight: 900, fontSize: 16 }}>
              ⚠ CLB sẽ không có Trưởng CLB
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>
              <strong>{lastAdminModal?.memberName}</strong> là Trưởng CLB duy nhất.
              {lastAdminModal?.action === 'remove' ? ' Nếu xoá người này' : ' Nếu hạ cấp người này'},
              {' '}CLB sẽ không có người quản lý.
            </p>
            <div>
              <label style={labelStyle}>Bổ nhiệm Trưởng CLB mới (khuyến nghị)</label>
              <select value={replacementId} onChange={e => setReplacementId(e.target.value)} style={selectStyle}>
                <option value="">— Bỏ qua, không bổ nhiệm ai —</option>
                {members
                  .filter(m => m.id !== lastAdminModal?.membershipId && m.status === MEMBERSHIP_STATUS.ACTIVE)
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName ?? m.email} ({ROLE_LABELS[m.clubRole] ?? m.clubRole})
                    </option>
                  ))}
              </select>
            </div>
            {!replacementId && (
              <p style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                Nếu không chọn người thay thế, CLB sẽ tạm thời không có Trưởng CLB.
              </p>
            )}
          </div>
          <DialogFooter style={{ paddingTop: 8 }}>
            <button onClick={() => { setLastAdminModal(null); setReplacementId('') }}
              style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Huỷ
            </button>
            <button onClick={handleForceAction} disabled={forceLoading}
              style={{ background: replacementId ? D.indigo : D.red, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: forceLoading ? 'not-allowed' : 'pointer', opacity: forceLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {forceLoading ? 'Đang xử lý...' : replacementId ? 'Bổ nhiệm và tiếp tục' : 'Vẫn tiếp tục'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
