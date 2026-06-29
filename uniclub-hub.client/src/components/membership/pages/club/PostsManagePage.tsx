import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getPostsAdmin, createPost, updatePost, deletePost,
  uploadPostThumbnail, submitPostForReview, approvePost, rejectPost,
  type PostResponse, type PostStatus, type CreatePostRequest, type UpdatePostRequest,
} from '@/components/membership/services/postsApi'
import RichTextEditor from '@/components/shared/RichTextEditor'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'

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
  red: '#ef4444',
  green: '#10b981',
  amber: '#d97706',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #e8e3d6',
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}

const STATUS_CONFIG: Record<PostStatus, { label: string; bg: string; color: string }> = {
  Draft:         { label: 'Nháp',          bg: '#f3f4f6', color: '#6b7280' },
  PendingReview: { label: 'Chờ duyệt',     bg: '#fef3c7', color: '#b45309' },
  Published:     { label: '● Đã xuất bản', bg: '#d1fae5', color: '#065f46' },
  Rejected:      { label: 'Bị từ chối',    bg: '#fee2e2', color: '#b91c1c' },
}

const CATEGORIES = [
  { value: 'News', label: 'Tin tức' },
  { value: 'Announcement', label: 'Thông báo' },
]

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'Draft', label: 'Nháp' },
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'Published', label: 'Đã xuất bản' },
  { value: 'Rejected', label: 'Bị từ chối' },
]

type FormState = {
  title: string
  content: string
  category: 'News' | 'Announcement'
  publishDirectly: boolean
  departmentId?: number
}

const EMPTY_FORM: FormState = { title: '', content: '', category: 'News', publishDirectly: false }

export default function PostsManagePage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const { user } = useAuth()

  const membership = user?.memberships.find(m => m.clubId === id)
  const isAdmin = membership?.clubRole === CLUB_ROLES.CLUB_ADMIN
    || user?.roles?.includes('SUPER_ADMIN')
  const isEditor = isAdmin
    || (membership?.clubRole === CLUB_ROLES.DEPT_LEAD
      && (membership.status === MEMBERSHIP_STATUS.ACTIVE || membership.status === MEMBERSHIP_STATUS.PROBATION))

  const [posts, setPosts] = useState<PostResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const [editing, setEditing] = useState<PostResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<PostResponse | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [uploadingThumb, setUploadingThumb] = useState<number | null>(null)

  const PAGE_SIZE = 10

  async function load(p = page) {
    setLoading(true)
    try {
      const res = await getPostsAdmin(id, {
        page: p, pageSize: PAGE_SIZE,
        search: search || undefined,
        category: filterCategory || undefined,
        status: filterStatus || undefined,
      })
      setPosts(res.data)
      setTotal(res.totalCount)
    } catch {
      toast.error('Không thể tải danh sách bài viết')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPage(1) }, [search, filterCategory, filterStatus])
  useEffect(() => { load(page) }, [page])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setCreating(true)
  }

  function openEdit(p: PostResponse) {
    setForm({
      title: p.title,
      content: p.content,
      category: p.category as 'News' | 'Announcement',
      publishDirectly: false,
      departmentId: p.departmentId,
    })
    setEditing(p)
    setCreating(false)
  }

  function closeEditor() { setCreating(false); setEditing(null) }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Tiêu đề không được để trống'); return }
    if (!form.content || form.content === '<p></p>') { toast.error('Nội dung không được để trống'); return }
    setSaving(true)
    try {
      if (editing) {
        const dto: UpdatePostRequest = { title: form.title, content: form.content, category: form.category, departmentId: form.departmentId }
        await updatePost(id, editing.id, dto)
        toast.success('Đã cập nhật bài viết')
      } else {
        const dto: CreatePostRequest = { title: form.title, content: form.content, category: form.category, publishDirectly: form.publishDirectly, departmentId: form.departmentId }
        await createPost(id, dto)
        toast.success(form.publishDirectly ? 'Đã tạo và xuất bản bài viết' : 'Đã tạo bản nháp')
      }
      closeEditor()
      load(editing ? page : 1)
      if (!editing) setPage(1)
    } catch {
      toast.error('Lưu bài viết thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(post: PostResponse) {
    if (!window.confirm(`Xóa bài viết "${post.title}"?`)) return
    setActionId(post.id)
    try {
      await deletePost(id, post.id)
      toast.success('Đã xóa bài viết')
      load(page)
    } catch {
      toast.error('Xóa bài viết thất bại')
    } finally {
      setActionId(null)
    }
  }

  async function handleSubmitForReview(post: PostResponse) {
    setActionId(post.id)
    try {
      await submitPostForReview(id, post.id)
      toast.success('Đã gửi bài viết để duyệt')
      load(page)
    } catch {
      toast.error('Gửi duyệt thất bại')
    } finally {
      setActionId(null)
    }
  }

  async function handleApprove(post: PostResponse) {
    setActionId(post.id)
    try {
      await approvePost(id, post.id)
      toast.success('Đã phê duyệt và xuất bản bài viết')
      load(page)
    } catch {
      toast.error('Phê duyệt thất bại')
    } finally {
      setActionId(null)
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return
    setActionId(rejectTarget.id)
    try {
      await rejectPost(id, rejectTarget.id, rejectNote || undefined)
      toast.success('Đã từ chối bài viết')
      setRejectTarget(null)
      setRejectNote('')
      load(page)
    } catch {
      toast.error('Từ chối thất bại')
    } finally {
      setActionId(null)
    }
  }

  async function handleThumbnailChange(postId: number, file: File) {
    setUploadingThumb(postId)
    try {
      await uploadPostThumbnail(id, postId, file)
      toast.success('Đã cập nhật ảnh bìa')
      load(page)
    } catch {
      toast.error('Upload ảnh thất bại')
    } finally {
      setUploadingThumb(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 28, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
              Bài viết &amp; Tin tức
            </h1>
            <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4, margin: 0 }}>
              {isAdmin ? 'Quản lý, duyệt và xuất bản nội dung' : 'Tạo và gửi bài viết để duyệt'}
            </p>
          </div>
          {isEditor && (
            <button onClick={openCreate} style={{
              height: 38, padding: '0 20px', borderRadius: D.pill, border: D.border,
              background: D.indigo, color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(),
            }}>
              + Tạo bài viết
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{
          background: D.card, borderRadius: D.radius, border: D.border,
          boxShadow: D.shadow(), padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input placeholder="Tìm kiếm tiêu đề..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 220 }} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            <option value="">Tất cả loại</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <span style={{ fontSize: 12, color: D.inkMuted, marginLeft: 'auto' }}>{total} bài viết</span>
        </div>

        {/* Editor panel */}
        {(creating || editing) && (
          <div style={{
            background: D.card, borderRadius: D.radius, border: D.border,
            boxShadow: D.shadow(4, 4), padding: 24, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: D.ink, margin: 0 }}>
                {editing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
              </h2>
              <button onClick={closeEditor} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: D.inkMuted }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4 }}>Tiêu đề</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nhập tiêu đề bài viết..." style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4 }}>Loại bài viết</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as 'News' | 'Announcement' }))} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 6 }}>Nội dung</label>
              <RichTextEditor
                value={form.content}
                onChange={content => setForm(f => ({ ...f, content }))}
                placeholder="Nhập nội dung bài viết..."
                minHeight={300}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* Admin: toggle publish directly */}
              {isAdmin && !editing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, publishDirectly: !f.publishDirectly }))}
                    style={{
                      width: 44, height: 24, borderRadius: D.pill, border: D.border,
                      background: form.publishDirectly ? D.green : '#e8e3d6',
                      cursor: 'pointer', position: 'relative', transition: 'background .2s', padding: 0, flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: form.publishDirectly ? 22 : 2,
                      width: 18, height: 18, borderRadius: D.pill, background: '#fff', border: D.border,
                      transition: 'left .2s',
                    }} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: D.inkDim }}>
                    {form.publishDirectly ? 'Xuất bản ngay' : 'Lưu nháp'}
                  </span>
                </div>
              )}

              {!isAdmin && (
                <span style={{ fontSize: 12, color: D.inkMuted }}>
                  Bài sẽ lưu nháp — gửi duyệt để trưởng CLB phê duyệt
                </span>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button onClick={closeEditor} style={{
                  height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border,
                  background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>Hủy</button>
                <button onClick={handleSave} disabled={saving} style={{
                  height: 36, padding: '0 20px', borderRadius: D.pill, border: D.border,
                  background: saving ? D.inkMuted : D.indigo, color: '#fff',
                  fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', boxShadow: saving ? 'none' : D.shadow(),
                }}>
                  {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Tạo bài viết')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post list */}
        <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <div style={{ fontSize: 14, color: D.inkMuted, fontWeight: 600 }}>Chưa có bài viết nào</div>
            </div>
          ) : posts.map((post, i) => {
            const st = STATUS_CONFIG[post.status]
            const isMyPost = post.authorId === user?.id
            const canEdit = isAdmin || (isEditor && isMyPost && (post.status === 'Draft' || post.status === 'Rejected'))
            const canDelete = isAdmin || (isEditor && isMyPost && post.status !== 'Published')
            const canSubmit = isEditor && isMyPost && (post.status === 'Draft' || post.status === 'Rejected')
            const canApproveReject = isAdmin && post.status === 'PendingReview'
            const busy = actionId === post.id

            return (
              <div key={post.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                borderBottom: i < posts.length - 1 ? D.borderLight : 'none',
              }}>
                {/* Thumbnail */}
                <div
                  style={{
                    width: 72, height: 50, borderRadius: 8, border: D.borderLight,
                    background: '#f0ede8', flexShrink: 0, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: canEdit ? 'pointer' : 'default', position: 'relative',
                  }}
                  title={canEdit ? 'Click để thay ảnh bìa' : ''}
                  onClick={() => {
                    if (!canEdit) return
                    if (thumbInputRef.current) {
                      thumbInputRef.current.dataset.postId = String(post.id)
                      thumbInputRef.current.click()
                    }
                  }}
                >
                  {uploadingThumb === post.id ? (
                    <span style={{ fontSize: 10, color: D.inkMuted }}>...</span>
                  ) : post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 18, opacity: 0.3 }}>🖼</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: post.category === 'News' ? '#dbeafe' : '#fef3c7',
                      color: post.category === 'News' ? '#1d4ed8' : '#92400e' }}>
                      {post.category === 'News' ? 'Tin tức' : 'Thông báo'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    {post.status === 'PendingReview' && (
                      <span style={{ fontSize: 10, color: D.amber, fontWeight: 600 }}>⏳ Đang chờ phê duyệt</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>
                    {post.authorName} · {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    {post.departmentName && ` · ${post.departmentName}`}
                  </div>
                  {/* Rejection note */}
                  {post.status === 'Rejected' && post.reviewNote && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#b91c1c', background: '#fee2e2',
                      borderRadius: 5, padding: '3px 8px', display: 'inline-block' }}>
                      Lý do từ chối: {post.reviewNote}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Submit for review */}
                  {canSubmit && (
                    <button onClick={() => handleSubmitForReview(post)} disabled={busy} style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: `1.5px solid ${D.amber}`,
                      background: '#fffbeb', color: D.amber, fontWeight: 700, fontSize: 12,
                      cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
                    }}>
                      Gửi duyệt
                    </button>
                  )}

                  {/* Approve */}
                  {canApproveReject && (
                    <button onClick={() => handleApprove(post)} disabled={busy} style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: `1.5px solid ${D.green}`,
                      background: '#f0fdf4', color: '#065f46', fontWeight: 700, fontSize: 12,
                      cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
                    }}>
                      ✓ Duyệt
                    </button>
                  )}

                  {/* Reject */}
                  {canApproveReject && (
                    <button onClick={() => { setRejectTarget(post); setRejectNote('') }} disabled={busy} style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: `1.5px solid ${D.red}`,
                      background: '#fff5f5', color: D.red, fontWeight: 700, fontSize: 12,
                      cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
                    }}>
                      ✕ Từ chối
                    </button>
                  )}

                  {/* Edit */}
                  {canEdit && (
                    <button onClick={() => openEdit(post)} style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: D.border,
                      background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Sửa
                    </button>
                  )}

                  {/* Delete */}
                  {canDelete && (
                    <button onClick={() => handleDelete(post)} disabled={busy} style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: `1.5px solid ${D.red}`,
                      background: '#fff5f5', color: D.red, fontWeight: 600, fontSize: 12,
                      cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
                    }}>
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              height: 32, padding: '0 14px', borderRadius: D.pill, border: D.border,
              background: D.card, color: D.inkDim, fontSize: 12, fontWeight: 600,
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: page === 1 ? 0.5 : 1,
            }}>← Trước</button>
            <span style={{ lineHeight: '32px', fontSize: 13, color: D.inkDim, fontWeight: 600 }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
              height: 32, padding: '0 14px', borderRadius: D.pill, border: D.border,
              background: D.card, color: D.inkDim, fontSize: 12, fontWeight: 600,
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: page === totalPages ? 0.5 : 1,
            }}>Tiếp →</button>
          </div>
        )}

        {/* Hidden thumbnail input */}
        <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            const postId = Number(e.target.dataset.postId)
            if (file && postId) handleThumbnailChange(postId, file)
            e.target.value = ''
          }}
        />

        {/* Reject dialog */}
        {rejectTarget && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div style={{
              background: '#fff', borderRadius: 16, border: D.border, boxShadow: D.shadow(6, 6),
              padding: 28, width: '100%', maxWidth: 420,
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: D.ink }}>Từ chối bài viết</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: D.inkMuted }}>"{rejectTarget.title}"</p>
              <label style={{ fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 6 }}>
                Lý do từ chối (tùy chọn)
              </label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Nội dung cần chỉnh sửa..."
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setRejectTarget(null)} style={{
                  height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border,
                  background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>Hủy</button>
                <button onClick={handleRejectConfirm} disabled={actionId === rejectTarget.id} style={{
                  height: 36, padding: '0 20px', borderRadius: D.pill, border: `1.5px solid ${D.red}`,
                  background: D.red, color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(),
                }}>Xác nhận từ chối</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
