import { useEffect, useState } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/components/membership/services/adminApi'
import type { CategoryItem, CreateCategoryDto } from '@/components/membership/services/admin.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

const CATEGORY_COLORS = [
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#16a34a' },
  { bg: '#fef9c3', text: '#a16207' },
  { bg: '#fee2e2', text: '#dc2626' },
  { bg: '#ffedd5', text: '#c2410c' },
]

type FormData = { name: string; description: string }
const emptyForm: FormData = { name: '', description: '' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    getCategories()
      .then(setCategories)
      .catch(() => toast.error('Không thể tải danh sách lĩnh vực.'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(cat: CategoryItem) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '' })
    setDialogOpen(true)
  }

  function setField(field: keyof FormData) {
    return (e: { target: { value: string } }) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true)
    const dto: CreateCategoryDto = { name: form.name, description: form.description || undefined }
    try {
      if (editing) {
        await updateCategory(editing.id, dto)
        toast.success('Đã cập nhật lĩnh vực.')
      } else {
        await createCategory(dto)
        toast.success('Đã thêm lĩnh vực mới.')
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
      await deleteCategory(deleteTarget.id)
      toast.success('Đã xoá lĩnh vực.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Xoá thất bại.')
    }
  }

  return (
    <div className="px-8 pt-3 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Lĩnh vực</h1>
        <Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} /> Thêm lĩnh vực
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input placeholder="Tìm theo tên lĩnh vực..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm" style={{ color: '#9ca3af' }}>
          {categories.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).length} lĩnh vực
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12 text-center">ID</TableHead>
              <TableHead>Tên lĩnh vực</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Số CLB</TableHead>
              <TableHead className="text-center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : categories.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-12">Không tìm thấy lĩnh vực nào.</TableCell></TableRow>
            ) : categories.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map((cat, i) => {
              const c = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
              return (
              <TableRow key={cat.id} className="hover:bg-gray-50/60">
                <TableCell className="text-center text-xs font-mono" style={{ color: '#9ca3af' }}>{cat.id}</TableCell>
                <TableCell>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: c.bg, color: c.text }}>
                    {cat.name}
                  </span>
                </TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{cat.description ?? '—'}</TableCell>
                <TableCell className="text-sm" style={{ color: '#6b7280' }}>{cat.clubCount}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => openEdit(cat)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(cat)}>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: '#0f172a', fontWeight: 700 }}>{editing ? 'Chỉnh sửa lĩnh vực' : 'Thêm lĩnh vực mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Tên lĩnh vực *</Label>
              <Input id="name" value={form.name} onChange={setField('name')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Mô tả</Label>
              <Input id="description" value={form.description} onChange={setField('description')} />
            </div>
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
            <AlertDialogTitle>Xoá lĩnh vực?</AlertDialogTitle>
            <AlertDialogDescription>
              Lĩnh vực <strong>{deleteTarget?.name}</strong> sẽ bị xoá.
              {deleteTarget && deleteTarget.clubCount > 0 && (
                <span className="text-red-600 block mt-1">
                  Lưu ý: lĩnh vực này đang có {deleteTarget.clubCount} CLB.
                </span>
              )}
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
