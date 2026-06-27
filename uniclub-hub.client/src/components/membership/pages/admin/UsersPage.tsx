import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { getUsers, lockUser, unlockUser, deleteUser, createUser, changeUserRole, importUsersPreview, importUsersConfirm, exportUsers } from '@/components/membership/services/adminApi'
import type { UserListQuery } from '@/components/membership/services/adminApi'
import type { UserItem, UserImportPreview } from '@/components/membership/services/admin.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Trash2, LockKeyhole, LockKeyholeOpen, ShieldCheck, ShieldOff, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'

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
  const [totalUsers, setTotalUsers] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importPreview, setImportPreview] = useState<UserImportPreview | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  const latestQueryKey = useRef('')

  function resetImport() {
    setImportStep('upload'); setImportPreview(null); setImportResult(null); setImportOpen(false)
    if (importFileRef.current) importFileRef.current.value = ''
  }

  async function handleImportPreview(file: File) {
    setImporting(true)
    try {
      const preview = await importUsersPreview(file)
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
        email: r.email, fullName: r.fullName, studentId: r.studentId, major: r.major,
      }))
      const result = await importUsersConfirm(rows)
      setImportResult(result)
      setImportStep('done')
      setRefreshKey(k => k + 1)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Import thất bại.'))
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const buildQuery = useCallback((pageNumber: number): UserListQuery => {
    return {
      page: pageNumber,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      role: roleFilter || undefined,
      sortBy,
      sortDir,
    }
  }, [debouncedSearch, statusFilter, roleFilter, sortBy, sortDir])

  const querySignature = useMemo(() => JSON.stringify({
    search: debouncedSearch || '',
    status: statusFilter || '',
    role: roleFilter || '',
    sortBy,
    sortDir,
  }), [debouncedSearch, statusFilter, roleFilter, sortBy, sortDir])

  useDeferredEffect((isCancelled) => {
    latestQueryKey.current = querySignature
    setLoading(true)
    setLoadingMore(false)
    setUsers([])
    setPage(1)
    getUsers(buildQuery(1))
      .then(r => {
        if (isCancelled() || latestQueryKey.current !== querySignature) return
        setUsers(r.items)
        setTotalUsers(r.totalCount)
      })
      .catch(() => {
        if (!isCancelled() && latestQueryKey.current === querySignature)
          toast.error('Không thể tải danh sách người dùng.')
      })
      .finally(() => {
        if (!isCancelled() && latestQueryKey.current === querySignature)
          setLoading(false)
      })
  }, [refreshKey, querySignature, buildQuery])

  function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    getUsers(buildQuery(nextPage))
      .then(r => {
        if (latestQueryKey.current !== querySignature) return
        setUsers(prev => [...prev, ...r.items])
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Tạo tài khoản thất bại.'))
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại.'))
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

  const hasFilter = search || statusFilter || roleFilter
  const exportQuery = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    role: roleFilter || undefined,
    sortBy,
    sortDir,
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const field = (key: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

    const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }
  const tdS: React.CSSProperties = { padding: '12px 14px', fontSize: 13 }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Người dùng</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Quản lý tài khoản hệ thống</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: '↓ Excel', action: async () => { const res = await exportUsers('xlsx', exportQuery); const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = 'users.xlsx'; a.click(); URL.revokeObjectURL(url) }, color: D.inkDim },
            { label: '↓ CSV', action: async () => { const res = await exportUsers('csv', exportQuery); const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click(); URL.revokeObjectURL(url) }, color: D.inkDim },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} style={{
              padding: '8px 14px', borderRadius: D.pill, background: D.card, border: D.border,
              boxShadow: D.shadow(2, 2), fontSize: 12, fontWeight: 600, color: btn.color,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>{btn.label}</button>
          ))}
          <button onClick={() => setImportOpen(true)} style={{
            padding: '8px 14px', borderRadius: D.pill, background: D.card, border: D.border,
            boxShadow: D.shadow(2, 2), fontSize: 12, fontWeight: 600, color: D.emerald,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}>↑ Import</button>
          <button onClick={() => setAddOpen(true)} style={{
            padding: '8px 16px', borderRadius: D.pill, background: D.indigo, color: '#fff',
            border: D.border, boxShadow: D.shadow(2, 2), fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}>+ Thêm người dùng</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        padding: '10px 14px', borderRadius: D.radius, background: D.card,
        border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10,
        alignItems: 'center', marginBottom: 16, flexWrap: 'wrap',
      }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="⌕  Tên, email hoặc MSSV..." style={{
          flex: 1, minWidth: 220, height: 36, borderRadius: 8, border: D.borderLight,
          padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none', background: D.bg,
          fontFamily: 'inherit',
        }} />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Hoạt động' },
            { value: 'locked', label: 'Đã khoá' },
          ]}
          style={{ width: 160 }}
        />
        <FilterSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: 'Tất cả quyền' },
            { value: 'USER', label: 'Người dùng' },
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
          ]}
          style={{ width: 160 }}
        />
        {hasFilter && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setRoleFilter('') }}
            style={{ fontSize: 12, color: D.indigo, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Xoá lọc
          </button>
        )}
        <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap', marginLeft: 'auto' }}>{users.length}/{totalUsers}</span>
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={thS}><button onClick={() => toggleSort('name')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: D.inkMuted }}>Người dùng <span style={{ color: sortBy === 'name' ? D.indigo : '#ccc' }}>↕</span></button></th>
              <th style={thS}>MSSV</th>
              <th style={thS}>Ngành</th>
              <th style={thS}><button onClick={() => toggleSort('role')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: D.inkMuted }}>Quyền <span style={{ color: sortBy === 'role' ? D.indigo : '#ccc' }}>↕</span></button></th>
              <th style={thS}>Trạng thái</th>
              <th style={{ ...thS, textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: D.inkMuted }}>Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: D.inkMuted }}>Không tìm thấy người dùng nào.</td></tr>
            ) : users.map(user => {
              const isSuperAdmin = user.roles?.includes('SUPER_ADMIN')
              return (
                <tr key={user.id} style={{ borderBottom: D.borderLight, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = D.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={tdS}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={user.fullName} email={user.email} />
                      <div>
                        <div style={{ fontWeight: 600, color: D.ink }}>{user.fullName ?? '—'}</div>
                        <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 1 }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdS, color: D.inkMuted }}>{user.studentId ?? '—'}</td>
                  <td style={{ ...tdS, color: D.inkDim, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.major ?? '—'}</td>
                  <td style={tdS}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                      background: isSuperAdmin ? D.violet : D.bg, color: isSuperAdmin ? '#fff' : D.ink,
                    }}>{isSuperAdmin ? 'Super Admin' : 'Người dùng'}</span>
                  </td>
                  <td style={tdS}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                      background: user.isLocked ? '#fee2e2' : '#dcfce7', color: user.isLocked ? D.red : D.emerald,
                    }}>{user.isLocked ? 'Đã khoá' : 'Hoạt động'}</span>
                  </td>
                  <td style={{ ...tdS, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      <button title={isSuperAdmin ? 'Hạ về Người dùng' : 'Nâng lên Super Admin'} onClick={() => handleChangeRole(user)} style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: isSuperAdmin ? D.inkMuted : D.violet }}>
                        {isSuperAdmin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>
                      <button title={user.isLocked ? 'Mở khoá' : 'Khoá'} onClick={() => handleLock(user)} style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: user.isLocked ? D.emerald : D.amber }}>
                        {user.isLocked ? <LockKeyholeOpen size={14} /> : <LockKeyhole size={14} />}
                      </button>
                      <button title="Xoá" onClick={() => setDeleteTarget(user)} style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: D.red }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <LoadMoreBar
        shown={users.length}
        total={totalUsers}
        loading={loadingMore}
        onLoadMore={loadMore}
        label="người dùng"
      />

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
                <FilterSelect
                  value={form.gender}
                  onChange={value => setForm(prev => ({ ...prev, gender: value }))}
                  options={[
                    { value: '', label: '—' },
                    { value: 'Nam', label: 'Nam' },
                    { value: 'Nữ', label: 'Nữ' },
                  ]}
                />
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
