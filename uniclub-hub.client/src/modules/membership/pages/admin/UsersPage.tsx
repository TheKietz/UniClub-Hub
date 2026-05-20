import { useEffect, useRef, useState } from 'react'
import { getUsers, lockUser, unlockUser, deleteUser, createUser, changeUserRole } from '@/modules/membership/services/adminApi'
import type { UserItem } from '@/modules/membership/services/admin.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Search, Trash2, LockKeyhole, LockKeyholeOpen, ShieldCheck, ShieldOff, ArrowUpDown, FileDown, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/axiosInstance'

const PAGE_SIZE = 20

function Avatar({ name, email }: { name?: string; email: string }) {
  const label = name || email
  const initials = label.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || email[0].toUpperCase()
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const color = colors[label.charCodeAt(0) % colors.length]
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ background: color }}>
      {initials}
    </div>
  )
}

type CreateForm = { email: string; password: string; fullName: string; studentId: string; major: string; gender: string; role: string }
const EMPTY_FORM: CreateForm = { email: '', password: '', fullName: '', studentId: '', major: '', gender: '', role: 'USER' }

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [searchName, setSearchName] = useState('')
  const [searchEmail, setSearchEmail] = useState('')
  const [searchStudentId, setSearchStudentId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  // Import state
  type ImportUserRow = { rowNumber: number; email: string; fullName?: string; studentId?: string; major?: string; isValid: boolean; error?: string }
  type ImportUserPreview = { validRows: ImportUserRow[]; invalidRows: ImportUserRow[]; totalRows: number; defaultPassword: string }
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importPreview, setImportPreview] = useState<ImportUserPreview | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  function resetImport() {
    setImportStep('upload'); setImportPreview(null); setImportResult(null); setImportOpen(false)
    if (importFileRef.current) importFileRef.current.value = ''
  }

  async function handleImportPreview(file: File) {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: ImportUserPreview }>('/admin/import/users/preview', fd, {
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
        email: r.email, fullName: r.fullName, studentId: r.studentId, major: r.major,
      }))
      const res = await api.post<{ data: { imported: number; skipped: number } }>('/admin/import/users/confirm', { rows })
      setImportResult(res.data.data)
      setImportStep('done')
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Import thất bại.')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    getUsers({ page, pageSize: PAGE_SIZE })
      .then(r => { setUsers(r.items); setTotalPages(r.totalPages) })
      .catch(() => toast.error('Không thể tải danh sách người dùng.'))
      .finally(() => setLoading(false))
  }, [page, refreshKey])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createUser({
        email: form.email, password: form.password,
        fullName: form.fullName || undefined, studentId: form.studentId || undefined,
        major: form.major || undefined, gender: form.gender || undefined, role: form.role,
      })
      toast.success('Đã tạo tài khoản.')
      setAddOpen(false)
      setForm(EMPTY_FORM)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Tạo tài khoản thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeRole(user: UserItem) {
    const isSuperAdmin = user.roles.includes('SUPER_ADMIN')
    const newRole = isSuperAdmin ? 'USER' : 'SUPER_ADMIN'
    const label = isSuperAdmin ? 'hạ về Người dùng' : 'nâng lên Super Admin'
    if (!confirm(`${label} tài khoản ${user.email}?`)) return
    try {
      await changeUserRole(user.id, newRole)
      toast.success(`Đã ${label}.`)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    }
  }

  async function handleLock(user: UserItem) {
    try {
      if (user.isLocked) { await unlockUser(user.id); toast.success(`Đã mở khoá ${user.email}`) }
      else { await lockUser(user.id); toast.success(`Đã khoá ${user.email}`) }
      setRefreshKey(k => k + 1)
    } catch { toast.error('Thao tác thất bại.') }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteUser(deleteTarget.id)
      toast.success('Đã xoá tài khoản.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch { toast.error('Xoá thất bại.') }
  }

  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const hasFilter = searchName || searchEmail || searchStudentId || statusFilter
  const filtered = users
    .filter(u => !searchName || (u.fullName ?? '').toLowerCase().includes(searchName.toLowerCase()))
    .filter(u => !searchEmail || u.email.toLowerCase().includes(searchEmail.toLowerCase()))
    .filter(u => !searchStudentId || (u.studentId ?? '').toLowerCase().includes(searchStudentId.toLowerCase()))
    .filter(u => statusFilter === 'locked' ? u.isLocked : statusFilter === 'active' ? !u.isLocked : true)
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email)
      else if (sortBy === 'email') cmp = a.email.localeCompare(b.email)
      else if (sortBy === 'role') cmp = (a.roles?.[0] ?? '').localeCompare(b.roles?.[0] ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const field = (key: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="px-6 pt-3 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Người dùng</h1>
          <p className="text-sm text-gray-400 mt-0.5">Quản lý tài khoản hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600"
            onClick={async () => {
              const res = await api.get('/admin/export/users?format=xlsx', { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'users.xlsx'; a.click()
              URL.revokeObjectURL(url)
            }}>
            <FileDown size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600"
            onClick={async () => {
              const res = await api.get('/admin/export/users?format=csv', { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click()
              URL.revokeObjectURL(url)
            }}>
            <FileDown size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}
            className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <Upload size={14} /> Import
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input placeholder="Họ tên..." value={searchName}
              onChange={e => setSearchName(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input placeholder="Email..." value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <div className="relative w-36">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input placeholder="MSSV..." value={searchStudentId}
              onChange={e => setSearchStudentId(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 border border-input rounded-lg px-3 text-sm bg-white">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="locked">Đã khoá</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            {hasFilter && (
              <button onClick={() => { setSearchName(''); setSearchEmail(''); setSearchStudentId(''); setStatusFilter('') }}
                className="text-xs text-indigo-500 hover:underline whitespace-nowrap">
                Xoá lọc
              </button>
            )}
            <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length}/{users.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900 font-medium">
                  Họ tên <ArrowUpDown size={12} className={sortBy === 'name' ? 'text-indigo-500' : 'text-gray-300'} />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort('email')} className="flex items-center gap-1 hover:text-gray-900 font-medium">
                  Email <ArrowUpDown size={12} className={sortBy === 'email' ? 'text-indigo-500' : 'text-gray-300'} />
                </button>
              </TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Ngành</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('role')} className="flex items-center gap-1 hover:text-gray-900 font-medium">
                  Quyền <ArrowUpDown size={12} className={sortBy === 'role' ? 'text-indigo-500' : 'text-gray-300'} />
                </button>
              </TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-16">Đang tải...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Search size={32} className="text-gray-200" />
                    <p className="text-sm">Không tìm thấy người dùng nào.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(user => {
              const isSuperAdmin = user.roles?.includes('SUPER_ADMIN')
              return (
              <TableRow key={user.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.fullName} email={user.email} />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{user.fullName ?? '—'}</p>
                      {user.studentId && <p className="text-xs text-gray-400">{user.studentId}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{user.email}</TableCell>
                <TableCell className="text-sm text-gray-400">{user.studentId ?? '—'}</TableCell>
                <TableCell className="text-sm text-gray-500 max-w-36 truncate">{user.major ?? '—'}</TableCell>
                <TableCell>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: isSuperAdmin ? '#ede9fe' : '#f3f4f6', color: isSuperAdmin ? '#6d28d9' : '#374151' }}>
                    {isSuperAdmin ? 'Super Admin' : 'Người dùng'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: user.isLocked ? '#fee2e2' : '#dcfce7', color: user.isLocked ? '#dc2626' : '#16a34a' }}>
                    {user.isLocked ? 'Đã khoá' : 'Hoạt động'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-0.5">
                    <button title={isSuperAdmin ? 'Hạ về Người dùng' : 'Nâng lên Super Admin'}
                      onClick={() => handleChangeRole(user)}
                      className={`p-1.5 rounded-md transition-colors ${isSuperAdmin ? 'text-gray-400 hover:bg-gray-100' : 'text-violet-500 hover:bg-violet-50'}`}>
                      {isSuperAdmin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </button>
                    <button title={user.isLocked ? 'Mở khoá' : 'Khoá tài khoản'}
                      onClick={() => handleLock(user)}
                      className={`p-1.5 rounded-md transition-colors ${user.isLocked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}>
                      {user.isLocked ? <LockKeyholeOpen size={14} /> : <LockKeyhole size={14} />}
                    </button>
                    <button title="Xoá tài khoản" onClick={() => setDeleteTarget(user)}
                      className="p-1.5 rounded-md text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="text-sm" style={{ color: '#6b7280' }}>Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: '#0f172a', fontWeight: 700 }}>Thêm người dùng</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Email *</Label>
                <Input value={form.email} onChange={field('email')} required type="email" placeholder="user@uef.edu.vn" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Mật khẩu *</Label>
                <Input value={form.password} onChange={field('password')} required type="password" placeholder="Tối thiểu 6 ký tự" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Họ tên</Label>
                <Input value={form.fullName} onChange={field('fullName')} placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-1.5">
                <Label>MSSV</Label>
                <Input value={form.studentId} onChange={field('studentId')} placeholder="2151000001" />
              </div>
              <div className="space-y-1.5">
                <Label>Giới tính</Label>
                <select value={form.gender} onChange={field('gender')} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">—</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Ngành</Label>
                <Input value={form.major} onChange={field('major')} placeholder="Công nghệ thông tin" />
              </div>
            </div>
            <DialogFooter className="border-none bg-transparent">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) resetImport() }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              Import người dùng từ file
            </DialogTitle>
          </DialogHeader>

          {importStep === 'upload' && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Hướng dẫn:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tải file template về, điền dữ liệu theo đúng cột</li>
                  <li>Upload file (.xlsx hoặc .csv)</li>
                  <li>Kiểm tra preview và xác nhận tạo tài khoản</li>
                </ol>
                <p className="text-xs text-gray-400 mt-2">
                  Cột: <strong>Email</strong> (bắt buộc), <strong>HoTen</strong>, <strong>MaSoSinhVien</strong>, <strong>Nganh</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Mật khẩu mặc định: <strong>UniClub@2026</strong> — yêu cầu người dùng đổi sau lần đăng nhập đầu tiên.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => window.open('/api/admin/import/users/template')}>
                <Download size={14} /> Tải template CSV
              </Button>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                onClick={() => importFileRef.current?.click()}>
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
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Họ tên</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">MSSV</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Ngành</th>
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
                          <td className="px-3 py-2 text-gray-600">{row.studentId ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-24 truncate">{row.major ?? '—'}</td>
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
                  {importing ? 'Đang tạo tài khoản...' : `Tạo ${importPreview.validRows.length} tài khoản`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {importStep === 'done' && importResult && (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <p className="font-semibold text-gray-900">Import hoàn tất!</p>
              <p className="text-sm text-gray-500">
                Đã tạo <strong className="text-emerald-600">{importResult.imported}</strong> tài khoản
                {importResult.skipped > 0 && `, bỏ qua ${importResult.skipped} dòng trùng.`}
              </p>
              <p className="text-xs text-amber-600">Mật khẩu mặc định: <strong>UniClub@2026</strong></p>
              <DialogFooter className="justify-center pt-2">
                <Button onClick={resetImport}>Đóng</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#0f172a' }}>Xoá tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Tài khoản <strong>{deleteTarget?.email}</strong> sẽ bị xoá. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
