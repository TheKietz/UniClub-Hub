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
import { Plus, Search, Pencil, Trash2, Download, ShieldCheck, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
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

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || (m.fullName ?? '').toLowerCase().includes(q)
      || m.email.toLowerCase().includes(q)
      || (m.studentId ?? '').toLowerCase().includes(q)
    const matchRole = !roleFilter || m.clubRole === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="px-6 pb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Thành viên</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} className="gap-1.5">
            <Download size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1.5">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setImportStep('upload') }} className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <Upload size={14} /> Import
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Thêm thành viên
          </Button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tìm theo tên, email, MSSV..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-input rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-sm" style={{ color: '#9ca3af' }}>{filtered.length} thành viên</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12 text-center">ID</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ban</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-12">Không tìm thấy thành viên nào.</TableCell></TableRow>
            ) : filtered.map(m => (
              <TableRow key={m.id} className="hover:bg-gray-50/60">
                <TableCell className="text-center text-xs font-mono" style={{ color: '#9ca3af' }}>{m.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar name={m.fullName || m.email} />
                    <span className="font-medium text-sm" style={{ color: '#111827' }}>{m.fullName ?? '—'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{m.email}</TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{m.studentId ?? '—'}</TableCell>
                <TableCell>
                  {(() => {
                    const c = ROLE_BADGE[m.clubRole] ?? { bg: '#f3f4f6', text: '#374151' }
                    return (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: c.bg, color: c.text }}>
                        {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{m.departmentName ?? '—'}</TableCell>
                <TableCell>
                  {m.status === MEMBERSHIP_STATUS.ACTIVE && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#dcfce7', color: '#16a34a' }}>Chính thức</span>
                  )}
                  {m.status === MEMBERSHIP_STATUS.PROBATION && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#eff6ff', color: '#2563eb' }}>Thử việc</span>
                  )}
                  {m.status !== 'Active' && m.status !== 'Probation' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#f3f4f6', color: '#6b7280' }}>Đã rời</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {m.status === MEMBERSHIP_STATUS.PROBATION && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Xác nhận chính thức"
                        onClick={() => handlePromote(m.id)}>
                        <ShieldCheck size={14} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={() => openEdit(m)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setRemoveTarget(m)}>
                      <Trash2 size={14} />
                    </Button>
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
