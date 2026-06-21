import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { useParams } from 'react-router-dom'
import { getClubMembers, getClubMembersPage, addMember, updateMember, removeMember, getDepartments, getMemberFieldSchema, updateMemberCustomData, suggestMemberRole, promoteMember, importMembersPreview, importMembersConfirm, exportMembers } from '@/components/membership/services/clubApi'
import type { MemberListQuery } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem, MemberFieldDef, RoleSuggestion, RoleSuggestionItem, MemberImportPreview } from '@/components/membership/services/club.types'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Pencil, Sparkles, X } from 'lucide-react'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { Tooltip } from '@/components/shared/Tooltip'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { getApiErrorMessage } from '@/lib/apiError'

const PAGE_SIZE = 20

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

const AVATAR_COLORS = ['#1d4ed8', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

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
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #dce6f4',
  padding: '0 12px', fontSize: 13, color: '#0a2f6e', outline: 'none',
  background: '#f4f7fc', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#4a4651', display: 'block', marginBottom: 4 }

type AddForm = { userId: string; clubRole: string; departmentId: string }
type EditForm = { clubRole: string; departmentId: string; customData: Record<string, string> }

export default function MembersPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [members, setMembers] = useState<MemberItem[]>([])
  const [allMembers, setAllMembers] = useState<MemberItem[]>([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [fieldSchema, setFieldSchema] = useState<MemberFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const clubPermissions = useClubPermissions(id)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>({ userId: '', clubRole: CLUB_ROLES.MEMBER, departmentId: '' })
  const [saving, setSaving] = useState(false)

  const [editTarget, setEditTarget] = useState<MemberItem | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ clubRole: CLUB_ROLES.MEMBER, departmentId: '', customData: {} })
  const [aiTarget, setAiTarget] = useState<MemberItem | null>(null)
  const [roleSuggestion, setRoleSuggestion] = useState<RoleSuggestion | null>(null)
  const [roleSuggestionLoading, setRoleSuggestionLoading] = useState(false)

  const [removeTarget, setRemoveTarget] = useState<MemberItem | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'joinedDate' | 'role'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [hoverRow, setHoverRow] = useState<number | null>(null)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importPreview, setImportPreview] = useState<MemberImportPreview | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  const latestQueryKey = useRef('')

  type LastAdminModal = { action: 'remove' | 'update'; membershipId: number; memberName: string; updateDto?: EditForm }
  const [lastAdminModal, setLastAdminModal] = useState<LastAdminModal | null>(null)
  const [replacementId, setReplacementId] = useState('')
  const [forceLoading, setForceLoading] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const departmentQueryValue = useCallback(() => {
    if (!deptFilter) return undefined
    return deptFilter === '__none__' ? -1 : Number(deptFilter)
  }, [deptFilter])

  const buildQuery = useCallback((pageNumber: number): MemberListQuery => {
    return {
      page: pageNumber,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      departmentId: departmentQueryValue(),
      sortBy,
      sortDir,
    }
  }, [debouncedSearch, roleFilter, statusFilter, departmentQueryValue, sortBy, sortDir])

  const querySignature = useMemo(() => JSON.stringify({
    search: debouncedSearch || '',
    role: roleFilter || '',
    status: statusFilter || '',
    departmentId: departmentQueryValue() ?? '',
    sortBy,
    sortDir,
  }), [debouncedSearch, roleFilter, statusFilter, departmentQueryValue, sortBy, sortDir])

  useEffect(() => {
    let cancelled = false

    Promise.all([getClubMembers(id), getDepartments(id), getMemberFieldSchema(id)])
      .then(([m, d, fs]) => {
        if (cancelled) return
        setAllMembers(m)
        setDepartments(d)
        setFieldSchema(fs)
      })
      .catch(() => {
        if (!cancelled)
          toast.error('Không thể tải danh sách thành viên.')
      })

    return () => { cancelled = true }
  }, [id, refreshKey])

  useDeferredEffect((isCancelled) => {
    latestQueryKey.current = querySignature
    setLoading(true)
    setLoadingMore(false)
    setMembers([])
    setPage(1)
    getClubMembersPage(id, buildQuery(1))
      .then(r => {
        if (isCancelled() || latestQueryKey.current !== querySignature) return
        setMembers(r.items)
        setTotalMembers(r.totalCount)
      })
      .catch(() => {
        if (!isCancelled() && latestQueryKey.current === querySignature)
          toast.error('Không thể tải danh sách thành viên.')
      })
      .finally(() => {
        if (!isCancelled() && latestQueryKey.current === querySignature)
          setLoading(false)
      })
  }, [id, refreshKey, querySignature, buildQuery])

  function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    getClubMembersPage(id, buildQuery(nextPage))
      .then(r => {
        if (latestQueryKey.current !== querySignature) return
        setMembers(prev => [...prev, ...r.items])
        setTotalMembers(r.totalCount)
        setPage(nextPage)
      })
      .catch(() => {
        if (latestQueryKey.current === querySignature)
          toast.error('Tải thêm thất bại.')
      })
      .finally(() => {
        if (latestQueryKey.current === querySignature)
          setLoadingMore(false)
      })
  }

  const canView = clubPermissions.canAny(CLUB_PERMISSIONS.MEMBERS_VIEW, CLUB_PERMISSIONS.MEMBERS_MANAGE)
  const canManage = clubPermissions.can(CLUB_PERMISSIONS.MEMBERS_MANAGE)
  const canImportExport = clubPermissions.can(CLUB_PERMISSIONS.MEMBER_IMPORT_EXPORT)
  const canSuggest = clubPermissions.can(CLUB_PERMISSIONS.ROLE_SUGGESTIONS_USE)

  function setAddField(field: keyof AddForm) {
    return (e: { target: { value: string } }) => setAddForm(p => ({ ...p, [field]: e.target.value }))
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thêm thất bại.'))
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

  async function openRoleSuggestion(member: MemberItem) {
    setAiTarget(member)
    setRoleSuggestion(null)
    setRoleSuggestionLoading(true)
    try {
      const result = await suggestMemberRole(id, member.id)
      setRoleSuggestion(result)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Không thể tạo gợi ý vai trò.'))
      setAiTarget(null)
    } finally {
      setRoleSuggestionLoading(false)
    }
  }

  function applyRoleSuggestion(suggestion: RoleSuggestionItem) {
    if (!aiTarget) return
    openEdit(aiTarget)
    setEditForm(p => ({
      ...p,
      clubRole: suggestion.role,
      departmentId: suggestion.departmentId ? String(suggestion.departmentId) : '',
    }))
    setAiTarget(null)
    setRoleSuggestion(null)
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
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, '')
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
      await promoteMember(id, membershipId)
      toast.success('Đã xác nhận thành viên chính thức.')
      setRefreshKey(k => k + 1)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Xác nhận thất bại.'))
    }
  }

  async function handleImportPreview(file: File) {
    setImporting(true)
    try {
      const preview = await importMembersPreview(id, file)
      setImportPreview(preview)
      setImportStep('preview')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Không thể đọc file. Kiểm tra định dạng.'))
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
      const result = await importMembersConfirm(id, rows)
      setImportResult(result)
      setImportStep('done')
      setRefreshKey(k => k + 1)
      toast.success(`Đã thêm ${result.imported} thành viên.`)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Import thất bại.'))
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
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, '')
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại.'))
    } finally {
      setForceLoading(false)
    }
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    try {
      const res = await exportMembers(id, format, {
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        departmentId: departmentQueryValue(),
        sortBy,
        sortDir,
      })
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

  const hasFilter = !!(search || roleFilter || statusFilter || deptFilter)

  function clearFilters() { setSearch(''); setRoleFilter(''); setStatusFilter(''); setDeptFilter('') }

  if (!clubPermissions.loading && !canView)
    return <PermissionDenied />

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Quản lý thành viên</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{totalMembers} thành viên trong CLB</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canImportExport && (
            <>
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
            </>
          )}
          {canManage && (
            <button onClick={() => setAddOpen(true)}
              style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Thêm thành viên
            </button>
          )}
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
          <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{members.length}/{totalMembers}</span>
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
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: D.inkMuted, padding: '64px 0' }}>
                  <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔍</p>
                  <p style={{ fontSize: 13, margin: 0 }}>{hasFilter ? 'Không có thành viên khớp với bộ lọc.' : 'Chưa có thành viên nào.'}</p>
                  {hasFilter && <button onClick={clearFilters} style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 6 }}>Xoá bộ lọc</button>}
                </td>
              </tr>
            ) : members.map(m => (
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
                    {canManage && m.status === MEMBERSHIP_STATUS.PROBATION && (
                      <Tooltip label="Xác nhận chính thức">
                        <button onClick={() => handlePromote(m.id)}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid #6ee7b7', cursor: 'pointer', color: '#065f46', fontSize: 13 }}>
                          ✓
                        </button>
                      </Tooltip>
                    )}
                    {canManage && (
                      <Tooltip label="Chỉnh sửa vai trò">
                        <button onClick={() => openEdit(m)}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: D.borderLight, cursor: 'pointer', color: D.indigo }}>
                          <Pencil size={13} />
                        </button>
                      </Tooltip>
                    )}
                    {canSuggest && (
                      <Tooltip label="Gợi ý vai trò bằng AI">
                        <button onClick={() => openRoleSuggestion(m)}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: D.borderLight, cursor: 'pointer', color: D.amber }}>
                          <Sparkles size={13} />
                        </button>
                      </Tooltip>
                    )}
                    {canManage && (
                      <Tooltip label="Xoá khỏi CLB">
                        <button onClick={() => setRemoveTarget(m)}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: D.borderLight, cursor: 'pointer', color: D.red }}>
                          <X size={13} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadMoreBar
        shown={members.length}
        total={totalMembers}
        loading={loadingMore}
        onLoadMore={loadMore}
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
              <FilterSelect
                value={addForm.clubRole}
                onChange={value => setAddForm(p => ({ ...p, clubRole: value }))}
                options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Ban</label>
              <FilterSelect
                value={addForm.departmentId}
                onChange={value => setAddForm(p => ({ ...p, departmentId: value }))}
                options={[
                  { value: '', label: '— Không thuộc ban nào —' },
                  ...departments.map(d => ({ value: String(d.id), label: d.name })),
                ]}
              />
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
              <FilterSelect
                value={editForm.clubRole}
                onChange={value => setEditForm(p => ({ ...p, clubRole: value }))}
                options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Ban</label>
              <FilterSelect
                value={editForm.departmentId}
                onChange={value => setEditForm(p => ({ ...p, departmentId: value }))}
                options={[
                  { value: '', label: '— Không thuộc ban nào —' },
                  ...departments.map(d => ({ value: String(d.id), label: d.name })),
                ]}
              />
            </div>

            {fieldSchema.length > 0 && (
              <div style={{ borderTop: '1px solid #dce6f4', paddingTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>Thông tin đặc thù CLB</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fieldSchema.map(f => (
                    <div key={f.id}>
                      <label style={labelStyle}>{f.label}{f.required && <span style={{ color: '#ef4444' }}> *</span>}</label>
                      {f.type === 'select' ? (
                        <FilterSelect
                          value={editForm.customData[f.id] ?? ''}
                          onChange={value => setEditForm(p => ({ ...p, customData: { ...p.customData, [f.id]: value } }))}
                          options={[
                            { value: '', label: '— Chọn —' },
                            ...(f.options ?? []).map(opt => ({ value: opt, label: opt })),
                          ]}
                        />
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
                style={{ background: D.ink, color: '#ffffff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 18px', borderRadius: D.pill, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI role suggestion dialog */}
      <Dialog open={!!aiTarget} onOpenChange={open => { if (!open) { setAiTarget(null); setRoleSuggestion(null) } }}>
        <DialogContent className="max-w-lg" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color={D.amber} /> Gợi ý vai trò — {aiTarget?.fullName ?? aiTarget?.email}
            </DialogTitle>
          </DialogHeader>

          {roleSuggestionLoading ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
              Đang phân tích hồ sơ thành viên...
            </div>
          ) : roleSuggestion ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <div style={{ borderRadius: 10, border: D.borderLight, background: D.bg, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: D.inkDim, lineHeight: 1.55 }}>{roleSuggestion.summary}</p>
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: roleSuggestion.aiEnabled ? '#065f46' : '#92400e', background: roleSuggestion.aiEnabled ? '#d1fae5' : '#fef3c7', borderRadius: 4, padding: '2px 7px' }}>
                    {roleSuggestion.aiEnabled ? 'AI' : 'RULES'}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: D.inkMuted }}>
                  Nguồn kết quả: {roleSuggestion.aiEnabled ? `Gemini AI (${roleSuggestion.source})` : 'fallback rule-based'}
                </p>
                {roleSuggestion.signals.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {roleSuggestion.signals.map(signal => (
                      <span key={signal} style={{ fontSize: 11, color: D.inkDim, background: D.card, border: D.borderLight, borderRadius: 4, padding: '2px 7px' }}>
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roleSuggestion.suggestions.map((suggestion, index) => {
                  const pct = Math.round((suggestion.confidence ?? 0) * 100)
                  return (
                    <div key={`${suggestion.role}-${suggestion.departmentId ?? 'none'}-${index}`} style={{ border: D.borderLight, borderRadius: 10, padding: '11px 12px', background: D.card }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: D.ink }}>
                              {ROLE_LABELS[suggestion.role] ?? suggestion.role}
                            </span>
                            {suggestion.departmentName && (
                              <span style={{ fontSize: 11, color: D.indigo, fontWeight: 700 }}>
                                {suggestion.departmentName}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: D.inkDim, lineHeight: 1.55 }}>
                            {suggestion.reason}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: pct >= 75 ? '#065f46' : '#92400e', whiteSpace: 'nowrap' }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button onClick={() => applyRoleSuggestion(suggestion)}
                          style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '7px 12px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Áp dụng vào form
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: D.inkMuted }}>
                Gợi ý chỉ hỗ trợ ra quyết định. Vai trò chỉ thay đổi sau khi bạn lưu ở form chỉnh sửa.
              </p>
            </div>
          ) : null}
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
              <FilterSelect
                value={replacementId}
                onChange={setReplacementId}
                options={[
                  { value: '', label: '— Bỏ qua, không bổ nhiệm ai —' },
                  ...allMembers
                    .filter(m => m.id !== lastAdminModal?.membershipId && m.status === MEMBERSHIP_STATUS.ACTIVE)
                    .map(m => ({
                      value: String(m.id),
                      label: `${m.fullName ?? m.email} (${ROLE_LABELS[m.clubRole] ?? m.clubRole})`,
                    })),
                ]}
                maxMenuHeight={320}
              />
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
