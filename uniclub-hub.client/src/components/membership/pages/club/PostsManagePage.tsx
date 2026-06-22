import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getPostsAdmin, createPost, updatePost, deletePost, uploadPostThumbnail,
  type PostResponse, type CreatePostRequest,
} from '@/components/membership/services/postsApi'

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
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #e8e3d6',
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4,
}

const CATEGORIES = [
  { value: 'News', label: 'Tin tức' },
  { value: 'Announcement', label: 'Thông báo' },
]

type FormState = {
  title: string
  content: string
  category: 'News' | 'Announcement'
  isPublished: boolean
  departmentId?: number
}

const EMPTY_FORM: FormState = {
  title: '', content: '', category: 'News', isPublished: false,
}

export default function PostsManagePage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [posts, setPosts] = useState<PostResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPublished, setFilterPublished] = useState<'' | 'true' | 'false'>('')
  const [loading, setLoading] = useState(false)

  // Editor state
  const [editing, setEditing] = useState<PostResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Thumbnail upload
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [uploadingThumb, setUploadingThumb] = useState<number | null>(null)

  const PAGE_SIZE = 10

  async function load(p = page) {
    setLoading(true)
    try {
      const res = await getPostsAdmin(id, {
        page: p,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        category: filterCategory || undefined,
        isPublished: filterPublished === '' ? undefined : filterPublished === 'true',
      })
      setPosts(res.data)
      setTotal(res.totalCount)
    } catch {
      toast.error('Không thể tải danh sách bài viết')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPage(1) }, [search, filterCategory, filterPublished])
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
      isPublished: p.isPublished,
      departmentId: p.departmentId,
    })
    setEditing(p)
    setCreating(false)
  }

  function closeEditor() {
    setCreating(false)
    setEditing(null)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Tiêu đề không được để trống'); return }
    if (!form.content.trim()) { toast.error('Nội dung không được để trống'); return }
    setSaving(true)
    try {
      const dto: CreatePostRequest = {
        title: form.title,
        content: form.content,
        category: form.category,
        isPublished: form.isPublished,
        departmentId: form.departmentId,
      }
      if (editing) {
        await updatePost(id, editing.id, dto)
        toast.success('Đã cập nhật bài viết')
      } else {
        await createPost(id, dto)
        toast.success('Đã tạo bài viết')
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
    if (!confirm(`Xóa bài viết "${post.title}"?`)) return
    setDeletingId(post.id)
    try {
      await deletePost(id, post.id)
      toast.success('Đã xóa bài viết')
      load(page)
    } catch {
      toast.error('Xóa bài viết thất bại')
    } finally {
      setDeletingId(null)
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
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
              Bài viết &amp; Tin tức
            </h1>
            <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4, margin: 0 }}>
              Quản lý nội dung bài viết, tin tức của câu lạc bộ
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              height: 38, padding: '0 20px', borderRadius: D.pill, border: D.border,
              background: D.indigo, color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(),
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            + Tạo bài viết
          </button>
        </div>

        {/* Filters */}
        <div style={{
          background: D.card, borderRadius: D.radius, border: D.border,
          boxShadow: D.shadow(), padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            placeholder="Tìm kiếm tiêu đề..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 220 }}
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ ...inputStyle, width: 150 }}
          >
            <option value="">Tất cả loại</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filterPublished}
            onChange={e => setFilterPublished(e.target.value as '' | 'true' | 'false')}
            style={{ ...inputStyle, width: 150 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đã xuất bản</option>
            <option value="false">Bản nháp</option>
          </select>
          <span style={{ fontSize: 12, color: D.inkMuted, marginLeft: 'auto' }}>
            {total} bài viết
          </span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16 }}>
              <div>
                <label style={labelStyle}>Tiêu đề</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nhập tiêu đề bài viết..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Loại bài viết</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as 'News' | 'Announcement' }))}
                  style={inputStyle}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Nội dung</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Nhập nội dung bài viết (hỗ trợ HTML)..."
                rows={10}
                style={{
                  ...inputStyle, height: 'auto', padding: '10px 12px',
                  resize: 'vertical', lineHeight: 1.6,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16 }}>
              {/* Published toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
                  style={{
                    width: 44, height: 24, borderRadius: D.pill, border: D.border,
                    background: form.isPublished ? D.green : '#e8e3d6',
                    cursor: 'pointer', position: 'relative', transition: 'background .2s',
                    padding: 0, flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: form.isPublished ? 22 : 2,
                    width: 18, height: 18, borderRadius: D.pill,
                    background: '#fff', border: D.border,
                    transition: 'left .2s',
                  }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: D.inkDim }}>
                  {form.isPublished ? 'Xuất bản' : 'Bản nháp'}
                </span>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button
                  onClick={closeEditor}
                  style={{
                    height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border,
                    background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    height: 36, padding: '0 20px', borderRadius: D.pill, border: D.border,
                    background: saving ? D.inkMuted : D.indigo, color: '#fff',
                    fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', boxShadow: saving ? 'none' : D.shadow(),
                  }}
                >
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
              <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 4 }}>Bấm "+ Tạo bài viết" để bắt đầu</div>
            </div>
          ) : (
            posts.map((post, i) => (
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
                    cursor: 'pointer', position: 'relative',
                  }}
                  title="Click để thay ảnh bìa"
                  onClick={() => {
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: post.category === 'News' ? '#dbeafe' : '#fef3c7',
                      color: post.category === 'News' ? '#1d4ed8' : '#92400e',
                    }}>
                      {post.category === 'News' ? 'Tin tức' : 'Thông báo'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: post.isPublished ? '#d1fae5' : '#f3f4f6',
                      color: post.isPublished ? '#065f46' : '#6b7280',
                    }}>
                      {post.isPublished ? '● Đã xuất bản' : '○ Nháp'}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: D.ink,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>
                    {post.authorName} · {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    {post.departmentName && ` · ${post.departmentName}`}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(post)}
                    style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: D.border,
                      background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    disabled={deletingId === post.id}
                    style={{
                      height: 30, padding: '0 12px', borderRadius: D.pill, border: `1.5px solid ${D.red}`,
                      background: '#fff5f5', color: D.red, fontWeight: 600, fontSize: 12,
                      cursor: deletingId === post.id ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', opacity: deletingId === post.id ? 0.5 : 1,
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                height: 32, padding: '0 14px', borderRadius: D.pill, border: D.border,
                background: D.card, color: D.inkDim, fontSize: 12, fontWeight: 600,
                cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: page === 1 ? 0.5 : 1,
              }}
            >← Trước</button>
            <span style={{ lineHeight: '32px', fontSize: 13, color: D.inkDim, fontWeight: 600 }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                height: 32, padding: '0 14px', borderRadius: D.pill, border: D.border,
                background: D.card, color: D.inkDim, fontSize: 12, fontWeight: 600,
                cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: page === totalPages ? 0.5 : 1,
              }}
            >Tiếp →</button>
          </div>
        )}

        {/* Hidden thumbnail file input */}
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            const postId = Number(e.target.dataset.postId)
            if (file && postId) handleThumbnailChange(postId, file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
