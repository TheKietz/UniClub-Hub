import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { getAdminClubs, createClub, updateClub, deleteClub, getCategories } from '@/modules/membership/services/adminApi'
import type { ClubItem, CategoryItem, CreateClubDto, UpdateClubDto } from '@/modules/membership/services/admin.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, AlertTriangle, FileDown } from 'lucide-react'
import api from '@/lib/axiosInstance'

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
  const [searchName, setSearchName] = useState('')
  const [searchCode, setSearchCode] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'members'>('id')

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
    <div className="px-8 pt-3 pb-8 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Câu lạc bộ</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600"
            onClick={async () => {
              const res = await api.get('/admin/export/clubs?format=xlsx', { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'clubs.xlsx'; a.click()
              URL.revokeObjectURL(url)
            }}>
            <FileDown size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600"
            onClick={async () => {
              const res = await api.get('/admin/export/clubs?format=csv', { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'clubs.csv'; a.click()
              URL.revokeObjectURL(url)
            }}>
            <FileDown size={14} /> CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Thêm CLB
          </Button>
        </div>
      </div>

      {/* Search & filter */}
      {(() => {
        const hasFilter = searchName || searchCode || statusFilter
        const filtered = clubs
          .filter(c => !searchName || c.name.toLowerCase().includes(searchName.toLowerCase()))
          .filter(c => !searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase()))
          .filter(c => !statusFilter || c.status === statusFilter)
          .sort((a, b) =>
            sortBy === 'name' ? a.name.localeCompare(b.name)
            : sortBy === 'members' ? b.memberCount - a.memberCount
            : a.id - b.id
          )
        return (<>
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input placeholder="Tên CLB..." value={searchName} onChange={e => setSearchName(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="relative w-32">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input placeholder="Mã CLB..." value={searchCode} onChange={e => setSearchCode(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 border border-input rounded-lg px-3 text-sm bg-white">
          <option value="">Tất cả trạng thái</option>
          <option value="Active">Hoạt động</option>
          <option value="Inactive">Ngừng hoạt động</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="h-9 border border-input rounded-lg px-3 text-sm bg-white">
          <option value="id">Sắp xếp: ID</option>
          <option value="name">Tên A-Z</option>
          <option value="members">Thành viên</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          {hasFilter && (
            <button onClick={() => { setSearchName(''); setSearchCode(''); setStatusFilter('') }}
              className="text-xs text-indigo-500 hover:underline whitespace-nowrap">Xoá lọc</button>
          )}
          <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length}/{clubs.length}</span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12 text-center">ID</TableHead>
              <TableHead>Tên CLB</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Lĩnh vực</TableHead>
              <TableHead>Thành viên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-12">Không tìm thấy CLB nào.</TableCell></TableRow>
            ) : filtered.map(club => (
              <TableRow key={club.id} className={`hover:bg-gray-50/60 ${club.isDeleted ? 'opacity-50' : ''}`}>
                <TableCell className="text-center text-xs font-mono" style={{ color: '#9ca3af' }}>{club.id}</TableCell>
                <TableCell className="font-medium text-sm" style={{ color: '#111827' }}>{club.name}</TableCell>
                <TableCell className="font-mono text-xs" style={{ color: '#9ca3af' }}>{club.code}</TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{club.categoryName ?? '—'}</TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>
                  <span>{club.memberCount}</span>
                  {!club.hasAdmin && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600" title="CLB chưa có Trưởng CLB">
                      <AlertTriangle size={12} /> Chưa có trưởng
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: club.status === MEMBERSHIP_STATUS.ACTIVE ? '#dcfce7' : '#f3f4f6', color: club.status === MEMBERSHIP_STATUS.ACTIVE ? '#16a34a' : '#6b7280' }}>
                    {club.status === MEMBERSHIP_STATUS.ACTIVE ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => openEdit(club)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(club)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
        </>)
      })()}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: '#0f172a', fontWeight: 700 }}>{editing ? 'Chỉnh sửa CLB' : 'Thêm CLB mới'}</DialogTitle>
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
            <DialogFooter className="border-none bg-transparent">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Đang lưu...' : 'Lưu'}</Button>
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
