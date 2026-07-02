import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getGalleryManage, uploadImages, uploadVideo, updateGalleryItem, deleteGalleryItem,
  approveGalleryItem, rejectGalleryItem,
  type GalleryItem,
} from '@/components/membership/services/galleryApi'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import { D as managementTheme } from '@/components/shared/managementTheme'

const D = { ...managementTheme, green: managementTheme.emerald }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: D.borderLight,
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4,
}

const STATUS_META = {
  Published:     { label: 'Đã xuất bản', color: D.green,  bg: '#d1fae5' },
  PendingReview: { label: 'Chờ duyệt',   color: D.amber,  bg: '#fef3c7' },
  Rejected:      { label: 'Bị từ chối',  color: D.red,    bg: '#fee2e2' },
} as const

type Tab = 'all' | 'PendingReview' | 'Published' | 'Rejected'

export default function GalleryManagePage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const { user } = useAuth()
  const membership = user?.memberships.find(m =>
    m.clubId === id &&
    (m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION))
  const isClubAdmin = membership?.clubRole === CLUB_ROLES.CLUB_ADMIN
  const isDeptLead = membership?.clubRole === CLUB_ROLES.DEPT_LEAD

  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('all')

  // Image modal
  const [imageModal, setImageModal] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageDesc, setImageDesc] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Video modal
  const [videoModal, setVideoModal] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoDesc, setVideoDesc] = useState('')
  const [addingVideo, setAddingVideo] = useState(false)
  const videoFileInputRef = useRef<HTMLInputElement>(null)

  // Edit description
  const [editId, setEditId] = useState<number | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)

  // Reject modal
  const [rejectModal, setRejectModal] = useState<GalleryItem | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null)

  // Lightbox
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await getGalleryManage(id)
      setItems(data)
    } catch {
      toast.error('Không thể tải thư viện ảnh')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleUploadImages() {
    if (!imageFiles.length) { toast.error('Chưa chọn ảnh'); return }
    setUploading(true)
    try {
      const { items: uploaded, message } = await uploadImages(id, imageFiles, imageDesc.trim() || undefined)
      setItems(prev => [...uploaded, ...prev])
      setImageModal(false)
      setImageFiles([])
      setImageDesc('')
      toast.success(message)
    } catch {
      toast.error('Upload ảnh thất bại')
    } finally {
      setUploading(false)
    }
  }

  async function handleAddVideo() {
    if (!videoFile) { toast.error('Chưa chọn file video'); return }
    setAddingVideo(true)
    try {
      const { item, message } = await uploadVideo(id, videoFile, videoDesc.trim() || undefined)
      setItems(prev => [item, ...prev])
      setVideoModal(false)
      setVideoFile(null)
      setVideoDesc('')
      toast.success(message)
    } catch {
      toast.error('Upload video thất bại')
    } finally {
      setAddingVideo(false)
    }
  }

  async function handleDelete(item: GalleryItem) {
    setProcessingId(item.id)
    try {
      await deleteGalleryItem(id, item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setDeleteTarget(null)
      toast.success('Đã xóa')
    } catch {
      toast.error('Xóa thất bại')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleSaveDesc(item: GalleryItem) {
    setSavingDesc(true)
    try {
      const updated = await updateGalleryItem(id, item.id, editDesc)
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      setEditId(null)
      toast.success('Đã cập nhật mô tả')
    } catch {
      toast.error('Cập nhật thất bại')
    } finally {
      setSavingDesc(false)
    }
  }

  async function handleApprove(item: GalleryItem) {
    setProcessingId(item.id)
    try {
      const updated = await approveGalleryItem(id, item.id)
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      toast.success('Đã duyệt và xuất bản')
    } catch {
      toast.error('Duyệt thất bại')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject() {
    if (!rejectModal) return
    setRejecting(true)
    try {
      const updated = await rejectGalleryItem(id, rejectModal.id, rejectNote.trim() || undefined)
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      setRejectModal(null)
      setRejectNote('')
      toast.success('Đã từ chối')
    } catch {
      toast.error('Thất bại')
    } finally {
      setRejecting(false)
    }
  }

  const filtered = tab === 'all' ? items : items.filter(i => i.status === tab)
  const images = filtered.filter(i => i.mediaType === 'Image')
  const videos = filtered.filter(i => i.mediaType === 'Video')

  const pendingCount = items.filter(i => i.status === 'PendingReview').length
  const publishedCount = items.filter(i => i.status === 'Published').length
  const rejectedCount = items.filter(i => i.status === 'Rejected').length

  const canDeleteItem = (item: GalleryItem) => {
    if (isClubAdmin) return true
    if (isDeptLead && item.uploadedById === user?.id && item.status !== 'Published') return true
    return false
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg, padding: '28px 32px', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
              Thư viện ảnh &amp; Video
            </h1>
            <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4, margin: 0 }}>
              {isDeptLead
                ? 'Upload ảnh/video — ban chủ nhiệm sẽ duyệt trước khi xuất bản'
                : 'Quản lý hình ảnh và video hiển thị trên trang CLB'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setVideoModal(true)} style={{
              height: 38, padding: '0 18px', borderRadius: D.pill, border: D.border,
              background: D.card, color: D.inkDim, fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(2, 2),
            }}>+ Video</button>
            <button onClick={() => setImageModal(true)} disabled={uploading} style={{
              height: 38, padding: '0 20px', borderRadius: D.pill, border: D.border,
              background: uploading ? D.inkMuted : D.indigo, color: '#fff',
              fontWeight: 700, fontSize: 13,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', boxShadow: uploading ? 'none' : D.shadow(),
            }}>{uploading ? 'Đang upload...' : '+ Upload ảnh'}</button>
          </div>
        </div>

        {/* Stats + Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            ['all', `Tất cả (${items.length})`, D.indigo],
            ['Published', `Đã xuất bản (${publishedCount})`, D.green],
            ['PendingReview', `Chờ duyệt (${pendingCount})`, D.amber],
            ['Rejected', `Bị từ chối (${rejectedCount})`, D.red],
          ] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => setTab(key as Tab)} style={{
              height: 36, padding: '0 16px', borderRadius: D.pill,
              border: tab === key ? `1.5px solid ${color}` : D.borderLight,
              background: tab === key ? color + '15' : D.card,
              color: tab === key ? color : D.inkMuted,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {key === 'PendingReview' && pendingCount > 0 && (
                <span style={{ width: 7, height: 7, borderRadius: 99, background: D.amber, display: 'inline-block' }} />
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.inkDim }}>
              {tab === 'all' ? 'Chưa có ảnh hoặc video nào' : `Không có mục nào ở trạng thái "${STATUS_META[tab as keyof typeof STATUS_META]?.label ?? tab}"`}
            </div>
          </div>
        ) : (
          <>
            {/* Images */}
            {images.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: D.inkDim, marginBottom: 12, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Ảnh ({images.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {images.map(item => {
                    const meta = STATUS_META[item.status] ?? { label: item.status, color: D.inkMuted, bg: '#f3f4f6' }
                    const showReviewActions = isClubAdmin && item.status === 'PendingReview'
                    const showDelete = canDeleteItem(item)
                    return (
                      <div key={item.id} style={{ background: D.card, borderRadius: 10, border: D.border, boxShadow: D.shadow(2, 2), overflow: 'hidden' }}>
                        {/* Thumbnail */}
                        <div onClick={() => setLightbox(item)} style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', cursor: 'pointer', background: D.bg, position: 'relative' }}>
                          <img src={item.mediaUrl} alt={item.description ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {/* Status badge on thumbnail */}
                          {item.status !== 'Published' && (
                            <span style={{
                              position: 'absolute', top: 6, left: 6,
                              fontSize: 10, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 99, background: meta.bg, color: meta.color,
                            }}>{meta.label}</span>
                          )}
                        </div>

                        {/* Info + Actions */}
                        <div style={{ padding: '8px 10px' }}>
                          {/* Description */}
                          {editId === item.id && isClubAdmin ? (
                            <div style={{ marginBottom: 6 }}>
                              <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                placeholder="Mô tả..." style={{ ...inputStyle, height: 28, fontSize: 12, marginBottom: 4 }} autoFocus />
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => handleSaveDesc(item)} disabled={savingDesc} style={{ flex: 1, height: 24, borderRadius: 6, border: D.border, background: D.indigo, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Lưu</button>
                                <button onClick={() => setEditId(null)} style={{ flex: 1, height: 24, borderRadius: 6, border: D.borderLight, background: D.bg, color: D.inkDim, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: D.inkMuted, marginBottom: 6, minHeight: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Chưa có mô tả</span>}
                            </div>
                          )}

                          {/* Uploader info for admin */}
                          {isClubAdmin && item.uploadedByName && (
                            <div style={{ fontSize: 10, color: D.inkMuted, marginBottom: 6 }}>
                              Bởi: {item.uploadedByName}
                            </div>
                          )}

                          {/* Rejection note */}
                          {item.status === 'Rejected' && item.reviewNote && (
                            <div style={{ fontSize: 10, color: D.red, background: '#fff5f5', borderRadius: 6, padding: '4px 8px', marginBottom: 6 }}>
                              Lý do: {item.reviewNote}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: 'grid', gridTemplateColumns: showReviewActions ? 'repeat(2, minmax(88px, 1fr))' : 'repeat(auto-fit, minmax(88px, 1fr))', gap: 6 }}>
                            {/* Admin: approve/reject for pending */}
                            {showReviewActions && (
                              <>
                                <button onClick={() => handleApprove(item)} disabled={processingId === item.id} style={{ flex: 1, height: 26, borderRadius: 6, border: `1px solid ${D.green}`, background: '#f0fdf4', color: D.green, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Duyệt</button>
                                <button onClick={() => { setRejectModal(item); setRejectNote('') }} disabled={processingId === item.id} style={{ flex: 1, height: 26, borderRadius: 6, border: `1px solid ${D.red}`, background: '#fff5f5', color: D.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Từ chối</button>
                              </>
                            )}
                            {/* Admin: edit desc for published */}
                            {isClubAdmin && item.status === 'Published' && editId !== item.id && (
                              <button onClick={() => { setEditId(item.id); setEditDesc(item.description ?? '') }} style={{ flex: 1, height: 26, borderRadius: 6, border: D.borderLight, background: D.bg, color: D.inkDim, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Sửa</button>
                            )}
                            {/* Delete button */}
                            {showDelete && (
                              <button onClick={() => setDeleteTarget(item)} disabled={processingId === item.id} style={{ flex: 1, height: 26, borderRadius: 6, border: `1px solid ${D.red}`, background: '#fff5f5', color: D.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: processingId === item.id ? 0.5 : 1 }}>Xóa</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: D.inkDim, marginBottom: 12, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Video ({videos.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videos.map(item => {
                    const meta = STATUS_META[item.status] ?? { label: item.status, color: D.inkMuted, bg: '#f3f4f6' }
                    return (
                      <div key={item.id} style={{ background: D.card, borderRadius: 10, border: D.border, boxShadow: D.shadow(2, 2), padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 36, borderRadius: 8, background: D.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>▶</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                            {isClubAdmin && item.uploadedByName && (
                              <span style={{ fontSize: 10, color: D.inkMuted }}>bởi {item.uploadedByName}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description || item.mediaUrl}
                          </div>
                          {item.status === 'Rejected' && item.reviewNote && (
                            <div style={{ fontSize: 11, color: D.red, marginTop: 3 }}>Lý do từ chối: {item.reviewNote}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {isClubAdmin && item.status === 'PendingReview' && (
                            <>
                              <button onClick={() => handleApprove(item)} disabled={processingId === item.id} style={{ height: 28, padding: '0 12px', borderRadius: D.pill, border: `1px solid ${D.green}`, background: '#f0fdf4', color: D.green, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Duyệt</button>
                              <button onClick={() => { setRejectModal(item); setRejectNote('') }} disabled={processingId === item.id} style={{ height: 28, padding: '0 12px', borderRadius: D.pill, border: `1px solid ${D.red}`, background: '#fff5f5', color: D.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Từ chối</button>
                            </>
                          )}
                          {canDeleteItem(item) && (
                            <button onClick={() => setDeleteTarget(item)} disabled={processingId === item.id} style={{ height: 28, padding: '0 12px', borderRadius: D.pill, border: `1px solid ${D.red}`, background: '#fff5f5', color: D.red, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: processingId === item.id ? 0.5 : 1 }}>Xóa</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Image upload modal */}
        {imageModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => { setImageModal(false); setImageFiles([]); setImageDesc('') }}>
            <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(5, 5), padding: 28, width: 460 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: D.ink, margin: 0 }}>Upload ảnh</h2>
                <button onClick={() => { setImageModal(false); setImageFiles([]); setImageDesc('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: D.inkMuted }}>✕</button>
              </div>

              {isDeptLead && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                  ℹ️ Ảnh sẽ được gửi cho ban chủ nhiệm duyệt trước khi xuất bản.
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div onClick={() => fileInputRef.current?.click()} style={{
                  border: `2px dashed ${imageFiles.length ? D.indigo : '#dce6f4'}`,
                  borderRadius: 10, padding: '18px 16px', textAlign: 'center',
                  cursor: 'pointer', background: imageFiles.length ? '#f0f0ff' : D.bg,
                }}>
                  {imageFiles.length ? (
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>🖼️</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: D.indigo }}>{imageFiles.length} ảnh đã chọn</div>
                      <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>
                        {imageFiles.map(f => f.name).join(', ').slice(0, 60)}{imageFiles.map(f => f.name).join(', ').length > 60 ? '...' : ''}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: D.inkDim }}>Nhấn để chọn ảnh</div>
                      <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>JPG, PNG, WebP... — có thể chọn nhiều ảnh</div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => setImageFiles(Array.from(e.target.files ?? []))} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Mô tả (tùy chọn)</label>
                <input value={imageDesc} onChange={e => setImageDesc(e.target.value)} placeholder="Mô tả ngắn về ảnh..." style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setImageModal(false); setImageFiles([]); setImageDesc('') }} style={{ height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border, background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                <button onClick={handleUploadImages} disabled={uploading || !imageFiles.length} style={{ height: 36, padding: '0 20px', borderRadius: D.pill, border: D.border, background: uploading || !imageFiles.length ? D.inkMuted : D.indigo, color: '#fff', fontWeight: 700, fontSize: 13, cursor: uploading || !imageFiles.length ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: uploading ? 'none' : D.shadow() }}>
                  {uploading ? 'Đang upload...' : isDeptLead ? 'Gửi để duyệt' : 'Upload ảnh'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video modal */}
        {videoModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => setVideoModal(false)}>
            <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(5, 5), padding: 28, width: 460 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: D.ink, margin: 0 }}>Thêm video</h2>
                <button onClick={() => { setVideoModal(false); setVideoFile(null); setVideoDesc('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: D.inkMuted }}>✕</button>
              </div>

              {isDeptLead && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                  ℹ️ Video sẽ được gửi cho ban chủ nhiệm duyệt trước khi xuất bản.
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>File video</label>
                <div onClick={() => videoFileInputRef.current?.click()} style={{ border: `2px dashed ${videoFile ? D.indigo : '#dce6f4'}`, borderRadius: 10, padding: '18px 16px', textAlign: 'center', cursor: 'pointer', background: videoFile ? '#eef2ff' : D.bg }}>
                  {videoFile ? (
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>🎬</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: D.indigo }}>{videoFile.name}</div>
                      <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📹</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: D.inkDim }}>Nhấn để chọn file video</div>
                      <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>MP4, WebM, MOV...</div>
                    </div>
                  )}
                </div>
                <input ref={videoFileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Mô tả (tùy chọn)</label>
                <input value={videoDesc} onChange={e => setVideoDesc(e.target.value)} placeholder="Mô tả ngắn về video..." style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setVideoModal(false); setVideoFile(null); setVideoDesc('') }} style={{ height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border, background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                <button onClick={handleAddVideo} disabled={addingVideo} style={{ height: 36, padding: '0 20px', borderRadius: D.pill, border: D.border, background: addingVideo ? D.inkMuted : D.indigo, color: '#fff', fontWeight: 700, fontSize: 13, cursor: addingVideo ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: addingVideo ? 'none' : D.shadow() }}>
                  {addingVideo ? 'Đang thêm...' : isDeptLead ? 'Gửi để duyệt' : 'Thêm video'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete modal */}
        {deleteTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setDeleteTarget(null)}>
            <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(5, 5), padding: 28, width: '100%', maxWidth: 420 }}
              onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: D.ink, margin: '0 0 8px' }}>
                Xóa {deleteTarget.mediaType === 'Video' ? 'video' : 'ảnh'} này?
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: D.inkMuted, lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa {deleteTarget.mediaType === 'Video' ? 'video' : 'ảnh'} này? Hành động này không thể hoàn tác.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteTarget(null)} style={{ height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border, background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                <button onClick={() => handleDelete(deleteTarget)} disabled={processingId === deleteTarget.id} style={{ height: 36, padding: '0 20px', borderRadius: D.pill, border: `1.5px solid ${D.red}`, background: D.red, color: '#fff', fontWeight: 700, fontSize: 13, cursor: processingId === deleteTarget.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: processingId === deleteTarget.id ? 'none' : D.shadow() }}>
                  {processingId === deleteTarget.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject modal */}
        {rejectModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => { setRejectModal(null); setRejectNote('') }}>
            <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(5, 5), padding: 28, width: 420 }}
              onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: D.ink, margin: '0 0 16px' }}>Từ chối ảnh/video</h2>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Lý do từ chối (tùy chọn)</label>
                <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Nhập lý do để thông báo cho người upload..." style={inputStyle} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setRejectModal(null); setRejectNote('') }} style={{ height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border, background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                <button onClick={handleReject} disabled={rejecting} style={{ height: 36, padding: '0 20px', borderRadius: D.pill, border: `1.5px solid ${D.red}`, background: D.red, color: '#fff', fontWeight: 700, fontSize: 13, cursor: rejecting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {rejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
            onClick={() => setLightbox(null)}>
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 900, width: '100%' }}>
              <img src={lightbox.mediaUrl} alt={lightbox.description ?? ''} style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, border: '3px solid #fff' }} />
              {lightbox.description && (
                <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: D.ink }}>
                  {lightbox.description}
                </div>
              )}
              <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: D.pill, border: '2px solid #fff', background: D.ink, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
