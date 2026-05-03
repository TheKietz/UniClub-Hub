import { useEffect, useState } from 'react'
import { getAdminClubs, createClub, updateClub, deleteClub, getCategories } from '@/lib/adminApi'
import type { ClubItem, CategoryItem, CreateClubDto, UpdateClubDto } from '@/types/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, MoreHorizontal } from 'lucide-react'

type FormData = {
  name: string; code: string; description: string
  advisorName: string; contactInfo: string; categoryId: string; status: string
}

const emptyForm: FormData = {
  name: '', code: '', description: '', advisorName: '', contactInfo: '', categoryId: '', status: 'Active'
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClubItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClubItem | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([getAdminClubs(), getCategories()])
      .then(([c, cats]) => { setClubs(c); setCategories(cats) })
      .catch(() => toast.error('Không thể tải dữ liệu.'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(club: ClubItem) {
    setEditing(club)
    setForm({
      name: club.name,
      code: club.code,
      description: club.description ?? '',
      advisorName: club.advisorName ?? '',
      contactInfo: club.contactInfo ?? '',
      categoryId: club.categoryId?.toString() ?? '',
      status: club.status,
    })
    setDialogOpen(true)
  }

  function setField(field: keyof FormData) {
    return (e: { target: { value: string } }) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true)
    try {
      const base = {
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        advisorName: form.advisorName || undefined,
        contactInfo: form.contactInfo || undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      }
      if (editing) {
        await updateClub(editing.id, { ...base, status: form.status } as UpdateClubDto)
        toast.success('Đã cập nhật CLB.')
      } else {
        await createClub(base as CreateClubDto)
        toast.success('Đã tạo CLB mới.')
      }
      setDialogOpen(false)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteClub(deleteTarget.id)
      toast.success('Đã xoá CLB.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Xoá thất bại.')
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Câu lạc bộ</h1>
          <p className="text-gray-500 mt-1">Quản lý tất cả CLB trong hệ thống</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> Thêm CLB
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên CLB</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Lĩnh vực</TableHead>
              <TableHead>Thành viên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : clubs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Chưa có CLB nào.</TableCell></TableRow>
            ) : clubs.map(club => (
              <TableRow key={club.id} className={club.isDeleted ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{club.name}</TableCell>
                <TableCell className="text-gray-500 font-mono text-xs">{club.code}</TableCell>
                <TableCell className="text-gray-600">{club.categoryName ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{club.memberCount}</TableCell>
                <TableCell>
                  <Badge variant={club.status === 'Active' ? 'default' : 'secondary'}>
                    {club.status === 'Active' ? 'Hoạt động' : 'Ngừng'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(club)}>Chỉnh sửa</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(club)}>Xoá</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa CLB' : 'Thêm CLB mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên CLB *</Label>
                <Input id="name" value={form.name} onChange={setField('name')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Mã CLB *</Label>
                <Input id="code" value={form.code} onChange={setField('code')} required disabled={!!editing} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Lĩnh vực</Label>
              <select
                id="category"
                value={form.categoryId}
                onChange={setField('categoryId')}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">— Chọn lĩnh vực —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Mô tả</Label>
              <Input id="description" value={form.description} onChange={setField('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="advisorName">Giảng viên phụ trách</Label>
                <Input id="advisorName" value={form.advisorName} onChange={setField('advisorName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactInfo">Liên hệ</Label>
                <Input id="contactInfo" value={form.contactInfo} onChange={setField('contactInfo')} />
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Trạng thái</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={setField('status')}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Ngừng hoạt động</option>
                </select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá câu lạc bộ?</AlertDialogTitle>
            <AlertDialogDescription>
              CLB <strong>{deleteTarget?.name}</strong> sẽ bị xoá. Hành động này không thể hoàn tác.
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
