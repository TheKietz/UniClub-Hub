import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDepartments, getClubMembers } from '@/modules/membership/services/clubApi'
import type { DepartmentItem, MemberItem } from '@/modules/membership/services/club.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, UserCog, AlertTriangle } from 'lucide-react'
import api from '@/lib/axiosInstance'

interface DeptForm { name: string; description: string }

export default function DepartmentsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog thêm / sửa ban
  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<DepartmentItem | null>(null)
  const [form, setForm] = useState<DeptForm>({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  // Dialog xóa ban
  const [deleteTarget, setDeleteTarget] = useState<DepartmentItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Dialog bổ nhiệm trưởng ban
  const [leadDept, setLeadDept] = useState<DepartmentItem | null>(null)
  const [deptMembers, setDeptMembers] = useState<MemberItem[]>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('')
  const [settingLead, setSettingLead] = useState(false)

  function load() {
    getDepartments(id)
      .then(setDepartments)
      .catch(() => toast.error('Không thể tải danh sách ban.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (clubId) load() }, [clubId])

  function openAdd() {
    setForm({ name: '', description: '' })
    setEditTarget(null)
    setDialog('add')
  }

  function openEdit(dept: DepartmentItem) {
    setForm({ name: dept.name, description: dept.description ?? '' })
    setEditTarget(dept)
    setDialog('edit')
  }

  async function openLeadDialog(dept: DepartmentItem) {
    setLeadDept(dept)
    setSelectedMembershipId(dept.deptLeadMembershipId?.toString() ?? '')
    try {
      const members = await getClubMembers(id, { status: 'Active' })
      setDeptMembers(members.filter(m => m.departmentId === dept.id))
    } catch {
      toast.error('Không thể tải danh sách thành viên.')
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên ban.'); return }
    setSaving(true)
    try {
      if (dialog === 'add') {
        await api.post(`/clubs/${id}/departments`, { name: form.name.trim(), description: form.description || null })
        toast.success('Đã thêm ban mới.')
      } else {
        await api.put(`/clubs/${id}/departments/${editTarget!.id}`, { name: form.name.trim(), description: form.description || null })
        toast.success('Đã cập nhật ban.')
      }
      setDialog(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/clubs/${id}/departments/${deleteTarget.id}`)
      toast.success(`Đã xóa ban "${deleteTarget.name}".`)
      setDeleteTarget(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Xóa thất bại.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSetLead() {
    if (!leadDept) return
    setSettingLead(true)
    try {
      await api.patch(`/clubs/${id}/departments/${leadDept.id}/lead`, {
        membershipId: selectedMembershipId ? Number(selectedMembershipId) : null,
      })
      toast.success('Đã cập nhật trưởng ban.')
      setLeadDept(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cập nhật thất bại.')
    } finally {
      setSettingLead(false)
    }
  }

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Ban bộ phận</h1>
          <p className="text-sm text-gray-400 mt-0.5">{departments.length} ban tổng cộng</p>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
          <Plus size={16} /> Thêm ban
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Tên ban</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trưởng ban</TableHead>
              <TableHead className="w-24 text-center">Thành viên</TableHead>
              <TableHead className="w-28 text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : departments.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Chưa có ban bộ phận nào.</TableCell></TableRow>
            ) : departments.map(dept => (
              <TableRow key={dept.id}>
                <TableCell className="font-mono text-xs text-gray-400">{dept.id}</TableCell>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell className="text-gray-500">{dept.description ?? '—'}</TableCell>
                <TableCell>
                  {dept.deptLeadName
                    ? <span className="text-sm font-medium" style={{ color: '#374151' }}>{dept.deptLeadName}</span>
                    : <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                        <AlertTriangle size={13} />
                        Chưa có trưởng ban
                      </span>
                  }
                </TableCell>
                <TableCell className="text-center text-gray-600">{dept.memberCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openLeadDialog(dept)}
                      className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Bổ nhiệm trưởng ban"
                    >
                      <UserCog size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(dept)}
                      className="p-1.5 rounded-md text-indigo-500 hover:bg-indigo-50 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(dept)}
                      className="p-1.5 rounded-md text-red-400 hover:bg-red-50 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog thêm / sửa */}
      <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'add' ? 'Thêm ban mới' : 'Chỉnh sửa ban'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tên ban <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ban Truyền thông, Ban Học thuật..."
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Mô tả nhiệm vụ của ban..."
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Đang lưu...' : dialog === 'add' ? 'Thêm' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog bổ nhiệm trưởng ban */}
      <Dialog open={leadDept !== null} onOpenChange={open => { if (!open) setLeadDept(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bổ nhiệm trưởng ban — {leadDept?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {deptMembers.length === 0 ? (
              <p className="text-sm text-gray-400">Ban này chưa có thành viên nào.</p>
            ) : (
              <div className="space-y-1.5">
                <Label>Chọn trưởng ban</Label>
                <select
                  value={selectedMembershipId}
                  onChange={e => setSelectedMembershipId(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
                >
                  <option value="">— Không có trưởng ban —</option>
                  {deptMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName ?? m.email}{m.studentId ? ` (${m.studentId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadDept(null)} disabled={settingLead}>Hủy</Button>
            <Button onClick={handleSetLead} disabled={settingLead || deptMembers.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {settingLead ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa ban</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Bạn có chắc muốn xóa ban <strong>"{deleteTarget?.name}"</strong>?
            </p>
            {deleteTarget && deleteTarget.memberCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
                <span>
                  Ban có <strong>{deleteTarget.memberCount} thành viên</strong> đang hoạt động.
                  Họ sẽ được chuyển thành <strong>thành viên tự do</strong> của CLB và nhận thông báo.
                  Trưởng ban sẽ bị hạ xuống thành viên thường.
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Ban này không có thành viên nào.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Đang xóa...' : 'Xóa ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
