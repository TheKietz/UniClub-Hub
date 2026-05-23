import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDepartments, getClubMembers } from '@/components/membership/services/clubApi'
import type { DepartmentItem, MemberItem } from '@/components/membership/services/club.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'
import { Crown, Pencil, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/shared/Tooltip'

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  indigo: '#4f46e5',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #e8e3d6',
  padding: '0 12px', fontSize: 13, color: '#15131a', outline: 'none',
  background: '#f7f6f1', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#4a4651', display: 'block', marginBottom: 4 }

interface DeptForm { name: string; description: string }

export default function DepartmentsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hoverRow, setHoverRow] = useState<number | null>(null)

  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<DepartmentItem | null>(null)
  const [form, setForm] = useState<DeptForm>({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<DepartmentItem | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  function openAdd() { setForm({ name: '', description: '' }); setEditTarget(null); setDialog('add') }

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
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Ban bộ phận</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{departments.length} ban tổng cộng</p>
        </div>
        <button onClick={openAdd}
          style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Thêm ban
        </button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap', width: 48 }}>ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Tên ban</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Mô tả</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Trưởng ban</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap', width: 96 }}>Thành viên</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap', width: 120 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Đang tải...</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Chưa có ban bộ phận nào.</td></tr>
            ) : departments.map(dept => (
              <tr key={dept.id}
                onMouseEnter={() => setHoverRow(dept.id)}
                onMouseLeave={() => setHoverRow(null)}
                style={{ background: hoverRow === dept.id ? D.bg : D.card, borderBottom: D.borderLight }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: D.inkMuted }}>{dept.id}</td>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: D.ink }}>{dept.name}</td>
                <td style={{ padding: '12px 14px', color: D.inkDim }}>{dept.description ?? '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  {dept.deptLeadName
                    ? <span style={{ fontWeight: 600, color: D.ink, fontSize: 13 }}>{dept.deptLeadName}</span>
                    : <span style={{ fontSize: 11, color: D.amber, fontWeight: 600 }}>⚠ Chưa có trưởng ban</span>
                  }
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: D.inkDim, fontWeight: 600 }}>{dept.memberCount}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <Tooltip label="Bổ nhiệm trưởng ban">
                      <button
                        onClick={() => openLeadDialog(dept)}
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', border: '1px solid #6ee7b7', background: D.card, color: '#059669', cursor: 'pointer' }}>
                        <Crown size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Chỉnh sửa">
                      <button
                        onClick={() => openEdit(dept)}
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', border: D.borderLight, background: D.card, color: D.indigo, cursor: 'pointer' }}>
                        <Pencil size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Xóa ban">
                      <button
                        onClick={() => setDeleteTarget(dept)}
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', border: D.borderLight, background: D.card, color: D.red, cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog thêm / sửa */}
      <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null) }}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900 }}>{dialog === 'add' ? 'Thêm ban mới' : 'Chỉnh sửa ban'}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <div>
              <label style={labelStyle}>Tên ban <span style={{ color: D.red }}>*</span></label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ban Truyền thông, Ban Học thuật..."
                autoFocus
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Mô tả nhiệm vụ của ban..."
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none' }}
              />
            </div>
          </div>
          <DialogFooter style={{ borderTop: 'none', background: 'transparent', paddingTop: 8 }}>
            <button onClick={() => setDialog(null)} disabled={saving}
              style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Đang lưu...' : dialog === 'add' ? 'Thêm' : 'Lưu'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog bổ nhiệm trưởng ban */}
      <Dialog open={leadDept !== null} onOpenChange={open => { if (!open) setLeadDept(null) }}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900 }}>Bổ nhiệm trưởng ban — {leadDept?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ paddingTop: 8 }}>
            {deptMembers.length === 0 ? (
              <p style={{ fontSize: 13, color: D.inkMuted }}>Ban này chưa có thành viên nào.</p>
            ) : (
              <div>
                <label style={labelStyle}>Chọn trưởng ban</label>
                <select value={selectedMembershipId} onChange={e => setSelectedMembershipId(e.target.value)}
                  style={{ ...inputStyle, height: 36, cursor: 'pointer' }}>
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
          <DialogFooter style={{ borderTop: 'none', paddingTop: 8 }}>
            <button onClick={() => setLeadDept(null)} disabled={settingLead}
              style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Hủy
            </button>
            <button onClick={handleSetLead} disabled={settingLead || deptMembers.length === 0}
              style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: (settingLead || deptMembers.length === 0) ? 'not-allowed' : 'pointer', opacity: (settingLead || deptMembers.length === 0) ? 0.7 : 1, fontFamily: 'inherit' }}>
              {settingLead ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900 }}>Xóa ban</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
            <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>
              Bạn có chắc muốn xóa ban <strong>"{deleteTarget?.name}"</strong>?
            </p>
            {deleteTarget && deleteTarget.memberCount > 0 ? (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#b45309', display: 'flex', gap: 8 }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                <span>
                  Ban có <strong>{deleteTarget.memberCount} thành viên</strong> đang hoạt động.
                  Họ sẽ được chuyển thành <strong>thành viên tự do</strong> của CLB. Trưởng ban sẽ bị hạ xuống thành viên thường.
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>Ban này không có thành viên nào.</p>
            )}
          </div>
          <DialogFooter style={{ borderTop: 'none', paddingTop: 8 }}>
            <button onClick={() => setDeleteTarget(null)} disabled={deleting}
              style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Hủy
            </button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ background: D.red, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, fontFamily: 'inherit' }}>
              {deleting ? 'Đang xóa...' : 'Xóa ban'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
