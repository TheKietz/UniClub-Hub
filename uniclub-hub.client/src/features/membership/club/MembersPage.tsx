import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubMembers, addMember, updateMember, removeMember, getDepartments } from '@/lib/clubApi'
import type { MemberItem, DepartmentItem } from '@/types/club'
import { CLUB_ROLES } from '@/types/auth'
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

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  DEPT_DEPUTY: 'Phó ban',
  MEMBER: 'Thành viên',
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thành viên</h1>
          <p className="text-gray-500 mt-1">Quản lý thành viên trong câu lạc bộ</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus size={16} /> Thêm thành viên
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ban</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : members.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-12">Chưa có thành viên nào.</TableCell></TableRow>
            ) : members.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.fullName ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{m.email}</TableCell>
                <TableCell className="text-gray-500">{m.studentId ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABELS[m.clubRole] ?? m.clubRole}</Badge>
                </TableCell>
                <TableCell className="text-gray-500">{m.departmentName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={m.status === 'Active' ? 'default' : 'secondary'}>
                    {m.status === 'Active' ? 'Đang tham gia' : m.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(m)}>Chỉnh sửa vai trò</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => setRemoveTarget(m)}>Xoá khỏi CLB</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
