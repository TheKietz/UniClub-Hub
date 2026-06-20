import { useEffect, useState } from 'react'
import { getAdminClubs, createAdminDepartment, updateAdminDepartment, deleteAdminDepartment } from '@/components/membership/services/adminApi'
import { getDepartments } from '@/components/membership/services/clubApi'
import type { ClubItem } from '@/components/membership/services/admin.types'
import type { DepartmentItem } from '@/components/membership/services/club.types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

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
  violet: '#7c3aed',
  red: '#ef4444',
}

const CLUB_PALETTES = [
  { accent: '#4f46e5', light: '#ede9fe' },
  { accent: '#0ea5e9', light: '#e0f2fe' },
  { accent: '#10b981', light: '#d1fae5' },
  { accent: '#f59e0b', light: '#fef9c3' },
  { accent: '#ef4444', light: '#fee2e2' },
  { accent: '#ec4899', light: '#fce7f3' },
]

type DeptsByClub = Record<number, DepartmentItem[]>

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #e8e3d6',
  padding: '0 12px', fontSize: 13, color: '#15131a', outline: 'none',
  background: '#f7f6f1', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#4a4651', display: 'block', marginBottom: 4 }

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
        await updateAdminDepartment(dialogClub.id, editingDept.id, dto)
        toast.success('Đã cập nhật ban.')
      } else {
        await createAdminDepartment(dialogClub.id, dto)
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
      await deleteAdminDepartment(deleteTarget.clubId, deleteTarget.dept.id)
      toast.success('Đã xoá ban.')
      setDeleteTarget(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Xoá thất bại.')
    }
  }

  if (loading) return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif", color: D.inkMuted, fontSize: 13 }}>
      Đang tải...
    </div>
  )

  const hasFilter = searchName || searchCode
  const filteredClubs = clubs
    .filter(c => !searchName || c.name.toLowerCase().includes(searchName.toLowerCase()))
    .filter(c => !searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase()))

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Cơ cấu tổ chức</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{clubs.length} CLB · {Object.values(deptsByClub).flat().length} ban bộ phận</p>
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input placeholder="⌕  Tên CLB..." value={searchName} onChange={e => setSearchName(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        <input placeholder="⌕  Mã CLB..." value={searchCode} onChange={e => setSearchCode(e.target.value)}
          style={{ ...inputStyle, width: 130 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {hasFilter && (
            <button onClick={() => { setSearchName(''); setSearchCode('') }}
              style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá lọc
            </button>
          )}
          <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{filteredClubs.length}/{clubs.length}</span>
        </div>
      </div>

      {/* Club cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredClubs.map((club, idx) => {
          const depts = deptsByClub[club.id] ?? []
          const pal = CLUB_PALETTES[idx % CLUB_PALETTES.length]
          return (
            <div key={club.id} style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 20 }}>
              {/* Club header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: pal.light, border: D.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 900, color: pal.accent,
                  }}>
                    {club.name[0]}
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: D.ink, margin: 0 }}>{club.name}</p>
                    <p style={{ fontSize: 11, color: D.inkMuted, fontFamily: 'monospace', margin: 0 }}>{club.code}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link to={`/clubs/${club.id}/manage/orgchart`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', borderRadius: D.pill, fontSize: 11, fontWeight: 700,
                      border: D.border, background: D.card, color: pal.accent,
                      textDecoration: 'none', boxShadow: D.shadow(2,2),
                    }}>
                    ⎇ Sơ đồ
                  </Link>
                  <button
                    onClick={() => openCreate(club)}
                    style={{ background: pal.accent, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '5px 12px', borderRadius: D.pill, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + Thêm ban
                  </button>
                </div>
              </div>

              {/* Departments */}
              {depts.length === 0 ? (
                <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>Chưa có ban nào.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {depts.map(dept => (
                    <div key={dept.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px', borderRadius: 10,
                      background: pal.light, border: '1px solid transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: pal.accent, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: D.ink }}>{dept.name}</span>
                        {dept.description && (
                          <span style={{ fontSize: 12, color: D.inkMuted }}>{dept.description}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: D.pill, background: D.card, color: pal.accent, border: `1px solid ${pal.accent}30` }}>
                          {dept.memberCount} TV
                        </span>
                        <button
                          onClick={() => openEdit(club, dept)}
                          style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: D.borderLight, background: D.card, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Sửa
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ clubId: club.id, dept })}
                          style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: D.borderLight, background: D.card, color: D.red, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Xoá
                        </button>
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
        <DialogContent className="max-w-sm" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 17 }}>
              {editingDept ? `Sửa ban — ${dialogClub?.name}` : `Thêm ban — ${dialogClub?.name}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <div>
              <label style={labelStyle}>Tên ban *</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder="VD: Ban Học thuật"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả ngắn về ban (tuỳ chọn)"
                style={inputStyle}
              />
            </div>
            <DialogFooter style={{ borderTop: 'none', background: 'transparent', paddingTop: 4 }}>
              <button type="button" onClick={() => setDialogOpen(false)}
                style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Huỷ
              </button>
              <button type="submit" disabled={saving}
                style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: D.ink, fontWeight: 900 }}>Xoá ban?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: D.inkDim }}>
              Ban <strong>{deleteTarget?.dept.name}</strong> sẽ bị xoá khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: 'inherit' }}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              style={{ background: D.red, color: '#fff', border: D.border, fontFamily: 'inherit' }}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
