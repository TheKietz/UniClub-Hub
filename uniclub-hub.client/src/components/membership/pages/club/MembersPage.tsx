import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubMembers, addMember, updateMember, removeMember, getDepartments } from '@/components/membership/services/clubApi'
import type { MemberItem, DepartmentItem } from '@/components/membership/services/club.types'
import { CLUB_ROLES } from '@/types/auth'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

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
        <Button onClick={() => setAddOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} /> Thêm thành viên
        </Button>
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
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: m.status === 'Active' ? '#dcfce7' : '#f3f4f6', color: m.status === 'Active' ? '#16a34a' : '#6b7280' }}>
                    {m.status === 'Active' ? 'Đang tham gia' : 'Đã rời'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
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
    </div>
  )
}
