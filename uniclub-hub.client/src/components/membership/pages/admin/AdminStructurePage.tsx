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
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'

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

  return (
    <div className="px-8 pt-3 pb-8 space-y-4">
      <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Cơ cấu tổ chức</h1>

      <div className="space-y-4">
        {clubs.map(club => {
          const depts = deptsByClub[club.id] ?? []
          return (
            <div key={club.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.95rem' }}>{club.name}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace' }}>{club.code}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openCreate(club)}>
                  <Plus size={14} /> Thêm ban
                </Button>
              </div>

              {depts.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Chưa có ban nào.</p>
              ) : (
                <div className="space-y-1.5">
                  {depts.map(dept => (
                    <div key={dept.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span style={{ color: '#374151', fontSize: '0.875rem', fontWeight: 500 }}>{dept.name}</span>
                        {dept.description && (
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{dept.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{dept.memberCount} thành viên</span>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => openEdit(club, dept)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget({ clubId: club.id, dept })}
                        >
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
