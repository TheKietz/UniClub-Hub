import { useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { Pencil, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/shared/Tooltip'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/components/membership/services/adminApi'
import type { CategoryItem, CreateCategoryDto } from '@/components/membership/services/admin.types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'

const CAT_PALETTES = [
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#dbeafe', color: '#1e40af' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fef9c3', color: '#854d0e' },
  { bg: '#fee2e2', color: '#991b1b' },
  { bg: '#ffedd5', color: '#9a3412' },
]

type FormData = { name: string; description: string }
const emptyForm: FormData = { name: '', description: '' }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #dce6f4',
  padding: '0 12px', fontSize: 13, color: '#0a2f6e', outline: 'none',
  background: '#f4f7fc', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#4a4651', display: 'block', marginBottom: 4 }

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
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'clubCount'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visibleCount, setVisibleCount] = useState(20)
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const pageSize = 20

  useDeferredEffect(() => {
    setLoading(true)
    getCategories()
      .then(setCategories)
      .catch(() => toast.error('Không thể tải danh sách lĩnh vực.'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true) }

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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại.'))
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Xoá thất bại.'))
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return categories
      .filter(c =>
        !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        const cmp = sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : sortBy === 'clubCount'
            ? a.clubCount - b.clubCount
            : a.id - b.id
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [categories, search, sortBy, sortDir])

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="mgmt-page">
      {/* Header */}
      <div className="mgmt-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Lĩnh vực</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{categories.length} lĩnh vực trong hệ thống</p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Thêm lĩnh vực
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="⌕  Tìm tên hoặc mô tả..."
          value={search}
          onChange={e => { setSearch(e.target.value); setVisibleCount(pageSize) }}
          style={{ ...inputStyle, flex: 1 }}
        />
        <FilterSelect
          value={`${sortBy}-${sortDir}`}
          onChange={v => {
            const [col, dir] = v.split('-')
            setSortBy(col as 'name' | 'id' | 'clubCount')
            setSortDir(dir as 'asc' | 'desc')
            setVisibleCount(pageSize)
          }}
          options={[
            { value: 'name-asc', label: 'Tên A → Z' },
            { value: 'name-desc', label: 'Tên Z → A' },
            { value: 'id-asc', label: 'ID tăng dần' },
            { value: 'id-desc', label: 'ID giảm dần' },
            { value: 'clubCount-desc', label: 'CLB nhiều nhất' },
            { value: 'clubCount-asc', label: 'CLB ít nhất' },
          ]}
          style={{ width: 180 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {search && (
            <button onClick={() => { setSearch(''); setVisibleCount(pageSize) }}
              style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá lọc
            </button>
          )}
          <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{visible.length}/{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Tên lĩnh vực</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Mô tả</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Số CLB</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Đang tải...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Không tìm thấy lĩnh vực nào.</td></tr>
            ) : visible.map((cat, i) => {
              const palette = CAT_PALETTES[i % CAT_PALETTES.length]
              return (
                <tr key={cat.id}
                  onMouseEnter={() => setHoverRow(cat.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: hoverRow === cat.id ? D.bg : D.card, borderBottom: D.borderLight }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: D.inkMuted }}>{cat.id}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-flex', padding: '3px 12px', borderRadius: D.pill, fontSize: 12, fontWeight: 700,
                      background: palette.bg, color: palette.color,
                    }}>
                      {cat.name}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: D.inkDim }}>{cat.description ?? '—'}</td>
                  <td style={{ padding: '12px 14px', color: D.inkDim, fontWeight: 600 }}>{cat.clubCount}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Tooltip label="Sửa">
                        <button onClick={() => openEdit(cat)} style={{ width: 30, height: 30, borderRadius: 6, display: 'grid', placeItems: 'center', border: D.borderLight, background: D.card, color: D.indigo, cursor: 'pointer' }}>
                          <Pencil size={13} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Xoá">
                        <button onClick={() => setDeleteTarget(cat)} style={{ width: 30, height: 30, borderRadius: 6, display: 'grid', placeItems: 'center', border: D.borderLight, background: D.card, color: D.red, cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <LoadMoreBar
        shown={visible.length}
        total={filtered.length}
        loading={false}
        onLoadMore={() => setVisibleCount(c => c + pageSize)}
        label="lĩnh vực"
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 18 }}>{editing ? 'Chỉnh sửa lĩnh vực' : 'Thêm lĩnh vực mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <div>
              <label style={labelStyle}>Tên lĩnh vực *</label>
              <input id="name" value={form.name} onChange={setField('name')} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <input id="description" value={form.description} onChange={setField('description')} style={inputStyle} />
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
            <AlertDialogTitle style={{ color: D.ink, fontWeight: 900 }}>Xoá lĩnh vực?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: D.inkDim }}>
              Lĩnh vực <strong>{deleteTarget?.name}</strong> sẽ bị xoá.
              {deleteTarget && deleteTarget.clubCount > 0 && (
                <span style={{ color: D.red, display: 'block', marginTop: 4 }}>
                  Lưu ý: lĩnh vực này đang có {deleteTarget.clubCount} CLB.
                </span>
              )}
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
