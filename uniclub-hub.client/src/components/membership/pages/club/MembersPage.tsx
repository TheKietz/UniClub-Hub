import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubMembers, addMember, updateMember, removeMember, getDepartments } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem } from '@/components/membership/services/club.types'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Download, ShieldCheck, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, ArrowUpDown, X } from 'lucide-react'
import api from '@/lib/axiosInstance'

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  MEMBER: 'Thành viên',
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  CLUB_ADMIN: { bg: '#ede9fe', text: '#6d28d9' },
  DEPT_LEAD: { bg: '#dbeafe', text: '#1d4ed8' },
  MEMBER: { bg: '#f0fdf4', text: '#16a34a' },
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ background: color }}>
      {initials}
    </div>
  )
}

type AddForm = { userId: string; clubRole: string; departmentId: string }
type EditForm = { clubRole: string; departmentId: string }

export default function MembersPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [members, setMembers] = useState<MemberItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>({ userId: '', clubRole: CLUB_ROLES.MEMBER, departmentId: '' })
  const [saving, setSaving] = useState(false)

  const [editTarget, setEditTarget] = useState<MemberItem | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ clubRole: CLUB_ROLES.MEMBER, departmentId: '' })

  const [removeTarget, setRemoveTarget] = useState<MemberItem | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'joinedDate' | 'role'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  type ImportRow = { rowNumber: number; email: string; fullName?: string; clubRole: string; departmentName?: string; isValid: boolean; error?: string }
  type ImportPreview = { validRows: ImportRow[]; invalidRows: ImportRow[]; totalRows: number }
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([getClubMembers(id), getDepartments(id)])
      .then(([m, d]) => { setMembers(m); setDepartments(d) })
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
    setEditForm({ clubRole: member.clubRole, departmentId: member.departmentId?.toString() ?? '' })
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
      toast.success('Đã cập nhật vai trò.')
      setEditTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cập nhật thất bại.')
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
    } catch {
      toast.error('Xoá thất bại.')
    }
  }

  const roleSelect = (value: string, onChange: (e: { target: { value: string } }) => void) => (
    <select value={value} onChange={onChange} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
      {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )

  const deptSelect = (value: string, onChange: (e: { target: { value: string } }) => void) => (
    <select value={value} onChange={onChange} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
      <option value="">— Không thuộc ban nào —</option>
      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  )

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
      const matchDept = !deptFilter || String(m.departmentId ?? '') === deptFilter
      return matchSearch && matchRole && matchStatus && matchDept
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email)
      else if (sortBy === 'joinedDate') cmp = (a.joinedDate ?? '').localeCompare(b.joinedDate ?? '')
      else if (sortBy === 'role') cmp = a.clubRole.localeCompare(b.clubRole)
      return sortDir === 'asc' ? cmp : -cmp
    })

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function clearFilters() {
    setSearch(''); setRoleFilter(''); setStatusFilter(''); setDeptFilter('')
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Quản lý thành viên</h1>
          <p className="text-sm text-gray-400 mt-0.5">{members.length} thành viên trong CLB</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} className="gap-1.5 text-gray-600">
            <Download size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1.5 text-gray-600">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setImportStep('upload') }}
            className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <Upload size={14} /> Import
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Thêm thành viên
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Tìm tên, email, MSSV..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="h-9 border border-input rounded-lg px-3 text-sm bg-white">
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 border border-input rounded-lg px-3 text-sm bg-white">
          <option value="">Tất cả trạng thái</option>
          <option value="Active">Chính thức</option>
          <option value="Probation">Thử việc</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="h-9 border border-input rounded-lg px-3 text-sm bg-white">
          <option value="">Tất cả ban</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <select value={`${sortBy}-${sortDir}`}
            onChange={e => { const [col, dir] = e.target.value.split('-'); setSortBy(col as typeof sortBy); setSortDir(dir as 'asc'|'desc') }}
            className="h-9 border border-input rounded-lg px-3 text-sm bg-white gap-1">
            <option value="name-asc">Tên A→Z</option>
            <option value="name-desc">Tên Z→A</option>
            <option value="joinedDate-desc">Mới nhất</option>
            <option value="joinedDate-asc">Cũ nhất</option>
            <option value="role-asc">Vai trò</option>
          </select>
          {hasFilter && (
            <button onClick={clearFilters}
              className="h-9 px-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1 text-sm">
              <X size={14} /> Xoá lọc
            </button>
          )}
          <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length}/{members.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="w-10 text-center text-xs">#</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900 font-medium">
                  Họ tên <ArrowUpDown size={12} className={sortBy === 'name' ? 'text-indigo-500' : 'text-gray-300'} />
                </button>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('role')} className="flex items-center gap-1 hover:text-gray-900 font-medium">
                  Vai trò <ArrowUpDown size={12} className={sortBy === 'role' ? 'text-indigo-500' : 'text-gray-300'} />
                </button>
              </TableHead>
              <TableHead>Ban</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('joinedDate')} className="flex items-center gap-1 hover:text-gray-900 font-medium">
                  Ngày vào <ArrowUpDown size={12} className={sortBy === 'joinedDate' ? 'text-indigo-500' : 'text-gray-300'} />
                </button>
              </TableHead>
              <TableHead className="text-center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-16">Đang tải...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Search size={32} className="text-gray-200" />
                    <p className="text-sm">{hasFilter ? 'Không có thành viên khớp với bộ lọc.' : 'Chưa có thành viên nào.'}</p>
                    {hasFilter && <button onClick={clearFilters} className="text-xs text-indigo-500 hover:underline">Xoá bộ lọc</button>}
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(m => (
              <TableRow key={m.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell className="text-center text-xs font-mono text-gray-300">{m.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.fullName || m.email} />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{m.fullName ?? '—'}</p>
                      {m.studentId && <p className="text-xs text-gray-400">{m.studentId}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{m.email}</TableCell>
                <TableCell className="text-sm text-gray-400">{m.studentId ?? '—'}</TableCell>
                <TableCell>
                  {(() => {
                    const c = ROLE_BADGE[m.clubRole] ?? { bg: '#f3f4f6', text: '#374151' }
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: c.bg, color: c.text }}>
                        {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-sm text-gray-500">{m.departmentName ?? <span className="text-gray-300">—</span>}</TableCell>
                <TableCell>
                  {m.status === MEMBERSHIP_STATUS.ACTIVE
                    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Chính thức</span>
                    : m.status === MEMBERSHIP_STATUS.PROBATION
                    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Thử việc</span>
                    : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Đã rời</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-gray-400">
                  {m.joinedDate ? new Date(m.joinedDate).toLocaleDateString('vi-VN') : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-0.5">
                    {m.status === MEMBERSHIP_STATUS.PROBATION && (
                      <button title="Xác nhận chính thức" onClick={() => handlePromote(m.id)}
                        className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors">
                        <ShieldCheck size={14} />
                      </button>
                    )}
                    <button title="Chỉnh sửa" onClick={() => openEdit(m)}
                      className="p-1.5 rounded-md text-indigo-400 hover:bg-indigo-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button title="Xoá" onClick={() => setRemoveTarget(m)}
                      className="p-1.5 rounded-md text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm thành viên</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="userId">User ID *</Label>
              <Input id="userId" value={addForm.userId} onChange={setAddField('userId')} required placeholder="ID tài khoản người dùng" />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              {roleSelect(addForm.clubRole, setAddField('clubRole'))}
            </div>
            <div className="space-y-1.5">
              <Label>Ban</Label>
              {deptSelect(addForm.departmentId, setAddField('departmentId'))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chỉnh sửa vai trò — {editTarget?.fullName}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              {roleSelect(editForm.clubRole, setEditField('clubRole'))}
            </div>
            <div className="space-y-1.5">
              <Label>Ban</Label>
              {deptSelect(editForm.departmentId, setEditField('departmentId'))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm remove */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá khỏi CLB?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.fullName ?? removeTarget?.email}</strong> sẽ bị xoá khỏi câu lạc bộ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) resetImport() }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              Import thành viên từ file
            </DialogTitle>
          </DialogHeader>

          {/* Step: Upload */}
          {importStep === 'upload' && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Hướng dẫn:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tải file template về, điền dữ liệu theo đúng cột</li>
                  <li>Upload file (.xlsx hoặc .csv)</li>
                  <li>Kiểm tra preview và xác nhận import</li>
                </ol>
                <p className="text-xs text-gray-400 mt-2">Cột: <strong>Email</strong> (bắt buộc), <strong>ClubRole</strong> (MEMBER/DEPT_LEAD/CLUB_ADMIN), <strong>Ban</strong> (tên ban, nếu có)</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => window.open(`/api/clubs/${id}/members/import/template`)}>
                  <Download size={14} /> Tải template CSV
                </Button>
              </div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                onClick={() => importFileRef.current?.click()}
              >
                {importing
                  ? <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang phân tích file...</p>
                  </div>
                  : <div className="flex flex-col items-center gap-2">
                    <Upload size={28} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Nhấn để chọn file hoặc kéo thả vào đây</p>
                    <p className="text-xs text-gray-400">Hỗ trợ .xlsx và .csv</p>
                  </div>
                }
              </div>
              <input ref={importFileRef} type="file" hidden accept=".xlsx,.xls,.csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImportPreview(f); e.target.value = '' }} />
            </div>
          )}

          {/* Step: Preview */}
          {importStep === 'preview' && importPreview && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <CheckCircle2 size={15} /> {importPreview.validRows.length} dòng hợp lệ
                </span>
                {importPreview.invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500 font-medium">
                    <XCircle size={15} /> {importPreview.invalidRows.length} dòng lỗi
                  </span>
                )}
                <span className="text-gray-400">/ {importPreview.totalRows} tổng</span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Dòng</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Tên</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Vai trò</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Ban</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...importPreview.validRows, ...importPreview.invalidRows]
                      .sort((a, b) => a.rowNumber - b.rowNumber)
                      .map(row => (
                        <tr key={row.rowNumber} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-gray-700">{row.email}</td>
                          <td className="px-3 py-2 text-gray-600">{row.fullName ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.clubRole}</td>
                          <td className="px-3 py-2 text-gray-600">{row.departmentName ?? '—'}</td>
                          <td className="px-3 py-2">
                            {row.isValid
                              ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> OK</span>
                              : <span className="flex items-center gap-1 text-red-500"><AlertCircle size={12} /> {row.error}</span>
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportStep('upload')}>Chọn file khác</Button>
                <Button disabled={importPreview.validRows.length === 0 || importing}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={handleImportConfirm}>
                  {importing ? 'Đang import...' : `Import ${importPreview.validRows.length} thành viên`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: Done */}
          {importStep === 'done' && importResult && (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <p className="font-semibold text-gray-900">Import hoàn tất!</p>
              <p className="text-sm text-gray-500">
                Đã thêm <strong className="text-emerald-600">{importResult.imported}</strong> thành viên
                {importResult.skipped > 0 && `, bỏ qua ${importResult.skipped} dòng trùng.`}
              </p>
              <DialogFooter className="justify-center pt-2">
                <Button onClick={resetImport} className="bg-indigo-600 hover:bg-indigo-700">Đóng</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
