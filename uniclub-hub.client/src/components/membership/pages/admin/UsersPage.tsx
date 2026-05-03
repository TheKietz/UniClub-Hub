import { useEffect, useState } from 'react'
import { getUsers, lockUser, unlockUser, deleteUser } from '@/components/membership/services/adminApi'
import type { UserItem } from '@/components/membership/services/admin.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { MoreHorizontal, Search } from 'lucide-react'

const PAGE_SIZE = 20

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  useEffect(() => {
    setLoading(true)
    getUsers({ search: query || undefined, page, pageSize: PAGE_SIZE })
      .then(r => { setUsers(r.items); setTotalPages(r.totalPages) })
      .catch(() => toast.error('Không thể tải danh sách người dùng.'))
      .finally(() => setLoading(false))
  }, [query, page, refreshKey])

  function handleSearch(e: { preventDefault(): void }) {
    e.preventDefault()
    setPage(1)
    setQuery(search)
  }

  async function handleLock(user: UserItem) {
    try {
      if (user.isLocked) {
        await unlockUser(user.id)
        toast.success(`Đã mở khoá ${user.email}`)
      } else {
        await lockUser(user.id)
        toast.success(`Đã khoá ${user.email}`)
      }
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Thao tác thất bại.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteUser(deleteTarget.id)
      toast.success('Đã xoá tài khoản.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Xoá thất bại.')
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Người dùng</h1>
        <p className="text-gray-500 mt-1">Quản lý tài khoản trong hệ thống</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <Input
          placeholder="Tìm theo email, tên, MSSV..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button type="submit" variant="outline" size="icon">
          <Search size={16} />
        </Button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-12">Đang tải...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-12">Không tìm thấy người dùng nào.</TableCell>
              </TableRow>
            ) : users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{user.email}</TableCell>
                <TableCell className="text-gray-500">{user.studentId ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={user.isLocked ? 'destructive' : 'default'}>
                    {user.isLocked ? 'Đã khoá' : 'Hoạt động'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleLock(user)}>
                        {user.isLocked ? 'Mở khoá' : 'Khoá tài khoản'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(user)}>
                        Xoá tài khoản
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá tài khoản?</AlertDialogTitle>
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
