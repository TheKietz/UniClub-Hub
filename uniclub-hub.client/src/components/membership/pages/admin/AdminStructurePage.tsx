import { useEffect, useState } from 'react'
import { getAdminClubs } from '@/components/membership/services/adminApi'
import { getDepartments } from '@/components/membership/services/clubApi'
import type { ClubItem } from '@/components/membership/services/admin.types'
import type { DepartmentItem } from '@/components/membership/services/club.types'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react'

const CLUB_COLORS = [
  { bg: '#ede9fe', icon: '#7c3aed', border: '#ddd6fe' },
  { bg: '#dbeafe', icon: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#dcfce7', icon: '#16a34a', border: '#bbf7d0' },
  { bg: '#fef9c3', icon: '#a16207', border: '#fef08a' },
  { bg: '#fee2e2', icon: '#dc2626', border: '#fecaca' },
  { bg: '#ffedd5', icon: '#c2410c', border: '#fed7aa' },
]

type DeptsByClub = Record<number, DepartmentItem[]>

export default function AdminStructurePage() {
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [deptsByClub, setDeptsByClub] = useState<DeptsByClub>({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogClub, setDialogClub] = useState<ClubItem | null>(null)
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{ clubId: number; dept: DepartmentItem } | null>(null)
  const [searchName, setSearchName] = useState('')
  const [searchCode, setSearchCode] = useState('')

  useEffect(() => {
    setLoading(true)
    getAdminClubs()
      .then(async (clubList) => {
        setClubs(clubList)
        const results = await Promise.all(
          clubList.map(c =>
            getDepartments(c.id)
              .then(d => ({ clubId: c.id, depts: d }))
              .catch(() => ({ clubId: c.id, depts: [] as DepartmentItem[] }))
          )
        )
        const map: DeptsByClub = {}
        results.forEach(({ clubId, depts }) => { map[clubId] = depts })
        setDeptsByClub(map)
      })
      .catch(() => toast.error('Không thể tải dữ liệu.'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  function openCreate(club: ClubItem) {
    setDialogClub(club)
    setEditingDept(null)
    setForm({ name: '', description: '' })
    setDialogOpen(true)
  }

  function openEdit(club: ClubItem, dept: DepartmentItem) {
    setDialogClub(club)
    setEditingDept(dept)
    setForm({ name: dept.name, description: dept.description ?? '' })
    setDialogOpen(true)
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!dialogClub) return
    setSaving(true)
    try {
      const dto = { name: form.name, description: form.description || undefined }
      if (editingDept) {
        await api.put(`/admin/clubs/${dialogClub.id}/departments/${editingDept.id}`, dto)
        toast.success('Đã cập nhật ban.')
      } else {
        await api.post(`/admin/clubs/${dialogClub.id}/departments`, dto)
        toast.success('Đã thêm ban mới.')
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
      await api.delete(`/admin/clubs/${deleteTarget.clubId}/departments/${deleteTarget.dept.id}`)
      toast.success('Đã xoá ban.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Xoá thất bại.')
    }
  }

  if (loading) return <div className="p-8" style={{ color: '#6b7280' }}>Đang tải...</div>

  const hasFilter = searchName || searchCode
  const filteredClubs = clubs
    .filter(c => !searchName || c.name.toLowerCase().includes(searchName.toLowerCase()))
    .filter(c => !searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase()))

  return (
    <div className="px-8 pt-3 pb-8 space-y-4">
      <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Cơ cấu tổ chức</h1>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input placeholder="Tên CLB..." value={searchName} onChange={e => setSearchName(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="relative w-32">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input placeholder="Mã CLB..." value={searchCode} onChange={e => setSearchCode(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {hasFilter && (
            <button onClick={() => { setSearchName(''); setSearchCode('') }}
              className="text-xs text-indigo-500 hover:underline whitespace-nowrap">Xoá lọc</button>
          )}
          <span className="text-sm text-gray-400 whitespace-nowrap">{filteredClubs.length}/{clubs.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {filteredClubs.map((club, idx) => {
          const depts = deptsByClub[club.id] ?? []
          const clr = CLUB_COLORS[idx % CLUB_COLORS.length]
          return (
            <div key={club.id} className="bg-white rounded-xl border p-5" style={{ borderColor: clr.border }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: clr.bg }}>
                    <Building2 size={16} style={{ color: clr.icon }} />
                  </div>
                  <div>
                    <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.95rem' }}>{club.name}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace' }}>{club.code}</p>
                  </div>
                </div>
                <Button size="sm" className="gap-1.5" style={{ background: clr.icon, color: '#fff' }}
                  onClick={() => openCreate(club)}>
                  <Plus size={14} /> Thêm ban
                </Button>
              </div>

              {depts.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Chưa có ban nào.</p>
              ) : (
                <div className="space-y-1.5">
                  {depts.map(dept => (
                    <div key={dept.id} className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ background: clr.bg + '60' }}>
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: clr.icon }} />
                        <span style={{ color: '#374151', fontSize: '0.875rem', fontWeight: 500 }}>{dept.name}</span>
                        {dept.description && (
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{dept.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: clr.bg, color: clr.icon }}>
                          {dept.memberCount} thành viên
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => openEdit(club, dept)}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget({ clubId: club.id, dept })}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: '#0f172a', fontWeight: 700 }}>
              {editingDept ? `Sửa ban — ${dialogClub?.name}` : `Thêm ban — ${dialogClub?.name}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tên ban *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder="VD: Ban Học thuật"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả ngắn về ban (tuỳ chọn)"
              />
            </div>
            <DialogFooter className="border-none bg-transparent">
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
            <AlertDialogTitle>Xoá ban?</AlertDialogTitle>
            <AlertDialogDescription>
              Ban <strong>{deleteTarget?.dept.name}</strong> sẽ bị xoá khỏi hệ thống.
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
