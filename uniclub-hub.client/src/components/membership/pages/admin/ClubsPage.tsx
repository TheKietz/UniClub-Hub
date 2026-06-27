import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { getAdminClubsPage, createClub, updateClub, deleteClub, getCategories, exportClubs } from '@/components/membership/services/adminApi'
import type { AdminClubListQuery } from '@/components/membership/services/adminApi'
import type { ClubItem, CategoryItem, CreateClubDto, UpdateClubDto } from '@/components/membership/services/admin.types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/shared/Tooltip'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'

const PAGE_SIZE = 20

type FormData = {
  name: string; code: string; description: string
  advisorName: string; contactInfo: string; categoryId: string; status: string
}

const emptyForm: FormData = {
  name: '', code: '', description: '', advisorName: '', contactInfo: '', categoryId: '', status: 'Active'
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: D.borderLight,
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4 }

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [totalClubs, setTotalClubs] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClubItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClubItem | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'members'>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const latestQueryKey = useRef('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const buildQuery = useCallback((pageNumber: number): AdminClubListQuery => {
    return {
      page: pageNumber,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      sortBy,
      sortDir,
    }
  }, [debouncedSearch, statusFilter, categoryFilter, sortBy, sortDir])

  const querySignature = useMemo(() => JSON.stringify({
    search: debouncedSearch || '',
    status: statusFilter || '',
    categoryId: categoryFilter || '',
    sortBy,
    sortDir,
  }), [debouncedSearch, statusFilter, categoryFilter, sortBy, sortDir])

  useDeferredEffect((isCancelled) => {
    latestQueryKey.current = querySignature
    setLoading(true)
    setLoadingMore(false)
    setClubs([])
    setPage(1)
    Promise.all([getAdminClubsPage(buildQuery(1)), getCategories()])
      .then(([c, cats]) => {
        if (isCancelled() || latestQueryKey.current !== querySignature) return
        setClubs(c.items)
        setTotalClubs(c.totalCount)
        setCategories(cats)
      })
      .catch(() => {
        if (!isCancelled() && latestQueryKey.current === querySignature)
          toast.error('Không thể tải dữ liệu.')
      })
      .finally(() => {
        if (!isCancelled() && latestQueryKey.current === querySignature)
          setLoading(false)
      })
  }, [refreshKey, querySignature, buildQuery])

  function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    getAdminClubsPage(buildQuery(nextPage))
      .then(r => {
        if (latestQueryKey.current !== querySignature) return
        setClubs(prev => [...prev, ...r.items])
        setTotalClubs(r.totalCount)
        setPage(nextPage)
      })
      .catch(() => {
        if (latestQueryKey.current === querySignature)
          toast.error('Tải thêm thất bại.')
      })
      .finally(() => {
        if (latestQueryKey.current === querySignature)
          setLoadingMore(false)
      })
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true) }

  function openEdit(club: ClubItem) {
    setEditing(club)
    setForm({
      name: club.name, code: club.code, description: club.description ?? '',
      advisorName: club.advisorName ?? '', contactInfo: club.contactInfo ?? '',
      categoryId: club.categoryId?.toString() ?? '', status: club.status,
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
        name: form.name, code: form.code,
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại.'))
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

  const hasFilter = search || statusFilter || categoryFilter
  const exportQuery = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    categoryId: categoryFilter ? Number(categoryFilter) : undefined,
    sortBy,
    sortDir,
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Câu lạc bộ</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{totalClubs} CLB trong hệ thống</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={async () => {
              const res = await exportClubs('xlsx', exportQuery)
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'clubs.xlsx'; a.click()
              URL.revokeObjectURL(url)
            }}>
            ↓ Excel
          </button>
          <button
            style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={async () => {
              const res = await exportClubs('csv', exportQuery)
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'clubs.csv'; a.click()
              URL.revokeObjectURL(url)
            }}>
            ↓ CSV
          </button>
          <button
            onClick={openCreate}
            style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Thêm CLB
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '10px 14px', borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="⌕  Tên hoặc mã CLB..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'Active', label: 'Hoạt động' },
            { value: 'Inactive', label: 'Ngừng hoạt động' },
          ]}
          style={{ width: 160 }}
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: '', label: 'Tất cả lĩnh vực' },
            ...categories.map(c => ({ value: String(c.id), label: c.name })),
          ]}
          style={{ width: 160 }}
        />
        <FilterSelect
          value={`${sortBy}-${sortDir}`}
          onChange={v => {
            const [col, dir] = v.split('-')
            setSortBy(col as 'id' | 'name' | 'members')
            setSortDir(dir as 'asc' | 'desc')
          }}
          options={[
            { value: 'id-asc', label: 'Mới nhất' },
            { value: 'name-asc', label: 'Tên A → Z' },
            { value: 'name-desc', label: 'Tên Z → A' },
            { value: 'members-desc', label: 'Thành viên nhiều nhất' },
            { value: 'members-asc', label: 'Thành viên ít nhất' },
          ]}
          style={{ width: 180 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {hasFilter && (
            <button onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter('') }}
              style={{ fontSize: 12, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá lọc
            </button>
          )}
          <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{clubs.length}/{totalClubs}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Tên CLB</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Mã</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Lĩnh vực</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Thành viên</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Đang tải...</td></tr>
            ) : clubs.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Không tìm thấy CLB nào.</td></tr>
            ) : clubs.map(club => (
              <tr key={club.id}
                onMouseEnter={() => setHoverRow(club.id)}
                onMouseLeave={() => setHoverRow(null)}
                style={{ background: hoverRow === club.id ? D.bg : D.card, borderBottom: D.borderLight, opacity: club.isDeleted ? 0.5 : 1 }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: D.inkMuted }}>{club.id}</td>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: D.ink }}>{club.name}</td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: D.inkMuted }}>{club.code}</td>
                <td style={{ padding: '12px 14px', color: D.inkDim }}>{club.categoryName ?? '—'}</td>
                <td style={{ padding: '12px 14px', color: D.inkDim }}>
                  <span>{club.memberCount}</span>
                  {!club.hasAdmin && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: D.amber, fontWeight: 600 }}>⚠ Chưa có trưởng</span>
                  )}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    letterSpacing: '.04em', textTransform: 'uppercase',
                    background: club.status === MEMBERSHIP_STATUS.ACTIVE ? '#d1fae5' : '#f3f4f6',
                    color: club.status === MEMBERSHIP_STATUS.ACTIVE ? '#065f46' : D.inkMuted,
                  }}>
                    {club.status === MEMBERSHIP_STATUS.ACTIVE ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Tooltip label="Sửa">
                      <button onClick={() => openEdit(club)} style={{ width: 30, height: 30, borderRadius: 6, display: 'grid', placeItems: 'center', border: D.borderLight, background: D.card, color: D.indigo, cursor: 'pointer' }}>
                        <Pencil size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Xoá">
                      <button onClick={() => setDeleteTarget(club)} style={{ width: 30, height: 30, borderRadius: 6, display: 'grid', placeItems: 'center', border: D.borderLight, background: D.card, color: D.red, cursor: 'pointer' }}>
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

      <LoadMoreBar
        shown={clubs.length}
        total={totalClubs}
        loading={loadingMore}
        onLoadMore={loadMore}
        label="CLB"
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 18 }}>{editing ? 'Chỉnh sửa CLB' : 'Thêm CLB mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Tên CLB *</label>
                <input id="name" value={form.name} onChange={setField('name')} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mã CLB *</label>
                <input id="code" value={form.code} onChange={setField('code')} required disabled={!!editing} style={{ ...inputStyle, opacity: editing ? 0.6 : 1 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Lĩnh vực</label>
              <FilterSelect
                value={form.categoryId}
                onChange={value => setForm(prev => ({ ...prev, categoryId: value }))}
                options={[
                  { value: '', label: '— Chọn lĩnh vực —' },
                  ...categories.map(c => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <input id="description" value={form.description} onChange={setField('description')} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Giảng viên phụ trách</label>
                <input id="advisorName" value={form.advisorName} onChange={setField('advisorName')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Liên hệ</label>
                <input id="contactInfo" value={form.contactInfo} onChange={setField('contactInfo')} style={inputStyle} />
              </div>
            </div>
            {editing && (
              <div>
                <label style={labelStyle}>Trạng thái</label>
                <FilterSelect
                  value={form.status}
                  onChange={value => setForm(prev => ({ ...prev, status: value }))}
                  options={[
                    { value: 'Active', label: 'Hoạt động' },
                    { value: 'Inactive', label: 'Ngừng hoạt động' },
                  ]}
                />
              </div>
            )}
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
            <AlertDialogTitle style={{ color: D.ink, fontWeight: 900 }}>Xoá câu lạc bộ?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: D.inkDim }}>
              CLB <strong>{deleteTarget?.name}</strong> sẽ bị xoá. Hành động này không thể hoàn tác.
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
