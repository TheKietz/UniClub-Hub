import { useEffect, useState } from 'react'
import { getUsers, lockUser, unlockUser, deleteUser, createUser, changeUserRole } from '@/components/membership/services/adminApi'
import type { UserItem } from '@/components/membership/services/admin.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Search, Trash2, LockKeyhole, LockKeyholeOpen, ShieldCheck, ShieldOff } from 'lucide-react'

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
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  useEffect(() => {
    setLoading(true)
    getUsers({ search: query || undefined, page, pageSize: PAGE_SIZE })
      .then(r => { setUsers(r.items); setTotalPages(r.totalPages) })
      .catch(() => toast.error('Không thể tải danh sách người dùng.'))
      .finally(() => setLoading(false))
  }, [query, page, refreshKey])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setQuery(search) }, 400)
    return () => clearTimeout(t)
  }, [search])

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

  const filtered = statusFilter
    ? users.filter(u => statusFilter === 'locked' ? u.isLocked : !u.isLocked)
    : users

  const field = (key: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="px-8 pt-3 pb-8 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Người dùng</h1>
        <Button onClick={() => setAddOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} /> Thêm người dùng
        </Button>
      </div>

      {/* Search & filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Tìm theo email, tên, MSSV..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-input rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Đã khoá</option>
        </select>
        <span className="text-sm" style={{ color: '#9ca3af' }}>{filtered.length} người dùng</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Ngành</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Không tìm thấy người dùng nào.</TableCell></TableRow>
            ) : filtered.map(user => {
              const isSuperAdmin = user.roles?.includes('SUPER_ADMIN')
              return (
              <TableRow key={user.id} className="hover:bg-gray-50/60">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar name={user.fullName} email={user.email} />
                    <span className="font-medium text-sm" style={{ color: '#111827' }}>{user.fullName ?? '—'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{user.email}</TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{user.studentId ?? '—'}</TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{user.major ?? '—'}</TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: isSuperAdmin ? '#ede9fe' : '#f3f4f6', color: isSuperAdmin ? '#6d28d9' : '#374151' }}>
                    {isSuperAdmin ? 'Super Admin' : 'Người dùng'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: user.isLocked ? '#fee2e2' : '#dcfce7', color: user.isLocked ? '#dc2626' : '#16a34a' }}>
                    {user.isLocked ? 'Đã khoá' : 'Hoạt động'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon"
                      className={`h-7 w-7 ${isSuperAdmin ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-violet-500 hover:text-violet-700 hover:bg-violet-50'}`}
                      title={isSuperAdmin ? 'Hạ về Người dùng' : 'Nâng lên Super Admin'}
                      onClick={() => handleChangeRole(user)}>
                      {isSuperAdmin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </Button>
                    <Button variant="ghost" size="icon"
                      className={`h-7 w-7 ${user.isLocked ? 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50' : 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'}`}
                      title={user.isLocked ? 'Mở khoá' : 'Khoá tài khoản'}
                      onClick={() => handleLock(user)}>
                      {user.isLocked ? <LockKeyholeOpen size={14} /> : <LockKeyhole size={14} />}
                    </Button>
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Xoá tài khoản"
                      onClick={() => setDeleteTarget(user)}>
                      <Trash2 size={14} />
                    </Button>
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
