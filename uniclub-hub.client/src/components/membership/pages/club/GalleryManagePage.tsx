import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getGallery, uploadImages, addVideo, updateGalleryItem, deleteGalleryItem,
  type GalleryItem,
} from '@/components/membership/services/galleryApi'

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
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8, border: '1px solid #e8e3d6',
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4,
}

export default function GalleryManagePage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Video modal
  const [videoModal, setVideoModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [addingVideo, setAddingVideo] = useState(false)

  // Edit description
  const [editId, setEditId] = useState<number | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)

  // Lightbox
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await getGallery(id)
      setItems(data)
    } catch {
      toast.error('Không thể tải thư viện ảnh')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded = await uploadImages(id, files)
      setItems(prev => [...uploaded, ...prev])
      toast.success(`Đã upload ${uploaded.length} ảnh`)
    } catch {
      toast.error('Upload ảnh thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleAddVideo() {
    if (!videoUrl.trim()) { toast.error('Nhập URL video'); return }
    setAddingVideo(true)
    try {
      const item = await addVideo(id, videoUrl.trim(), videoDesc.trim() || undefined)
      setItems(prev => [item, ...prev])
      setVideoModal(false)
      setVideoUrl('')
      setVideoDesc('')
      toast.success('Đã thêm video')
    } catch {
      toast.error('Thêm video thất bại')
    } finally {
      setAddingVideo(false)
    }
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm(`Xóa ${item.mediaType === 'Video' ? 'video' : 'ảnh'} này?`)) return
    setDeletingId(item.id)
    try {
      await deleteGalleryItem(id, item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success('Đã xóa')
    } catch {
      toast.error('Xóa thất bại')
    } finally {
      setDeletingId(null)
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

  const images = items.filter(i => i.mediaType === 'Image')
  const videos = items.filter(i => i.mediaType === 'Video')

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 28, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
              Thư viện ảnh &amp; Video
            </h1>
            <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4, margin: 0 }}>
              Quản lý hình ảnh và video hiển thị trên trang CLB
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setVideoModal(true)}
              style={{
                height: 38, padding: '0 18px', borderRadius: D.pill, border: D.border,
                background: D.card, color: D.inkDim, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(2, 2),
              }}
            >
              + Video
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                height: 38, padding: '0 20px', borderRadius: D.pill, border: D.border,
                background: uploading ? D.inkMuted : D.indigo, color: '#fff',
                fontWeight: 700, fontSize: 13,
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: uploading ? 'none' : D.shadow(),
              }}
            >
              {uploading ? 'Đang upload...' : '+ Upload ảnh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Tổng', value: items.length, color: D.indigo },
            { label: 'Ảnh', value: images.length, color: '#10b981' },
            { label: 'Video', value: videos.length, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              background: D.card, borderRadius: 10, border: D.border,
              boxShadow: D.shadow(2, 2), padding: '10px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: D.inkMuted }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Image grid */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
        ) : items.length === 0 ? (
          <div style={{
            background: D.card, borderRadius: D.radius, border: D.border,
            boxShadow: D.shadow(), padding: 60, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.inkDim }}>Chưa có ảnh hoặc video nào</div>
            <div style={{ fontSize: 12, color: D.inkMuted, marginTop: 4 }}>Bấm "+ Upload ảnh" để thêm</div>
          </div>
        ) : (
          <>
            {/* Images section */}
            {images.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: D.inkDim, marginBottom: 12, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Ảnh ({images.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {images.map(item => (
                    <div key={item.id} style={{
                      background: D.card, borderRadius: 10, border: D.border,
                      boxShadow: D.shadow(2, 2), overflow: 'hidden',
                    }}>
                      {/* Thumbnail */}
                      <div
                        onClick={() => setLightbox(item)}
                        style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', cursor: 'pointer', background: '#f0ede8' }}
                      >
                        <img src={item.mediaUrl} alt={item.description ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      {/* Description / Actions */}
                      <div style={{ padding: '8px 10px' }}>
                        {editId === item.id ? (
                          <div>
                            <input
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              placeholder="Mô tả..."
                              style={{ ...inputStyle, height: 28, fontSize: 12, marginBottom: 6 }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => handleSaveDesc(item)}
                                disabled={savingDesc}
                                style={{
                                  flex: 1, height: 26, borderRadius: 6, border: D.border,
                                  background: D.indigo, color: '#fff', fontSize: 11, fontWeight: 700,
                                  cursor: 'pointer', fontFamily: 'inherit',
                                }}
                              >Lưu</button>
                              <button
                                onClick={() => setEditId(null)}
                                style={{
                                  flex: 1, height: 26, borderRadius: 6, border: D.borderLight,
                                  background: D.bg, color: D.inkDim, fontSize: 11, fontWeight: 600,
                                  cursor: 'pointer', fontFamily: 'inherit',
                                }}
                              >Hủy</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{
                              fontSize: 11, color: D.inkMuted, marginBottom: 6,
                              minHeight: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Chưa có mô tả</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => { setEditId(item.id); setEditDesc(item.description ?? '') }}
                                style={{
                                  flex: 1, height: 26, borderRadius: 6, border: D.borderLight,
                                  background: D.bg, color: D.inkDim, fontSize: 11, fontWeight: 600,
                                  cursor: 'pointer', fontFamily: 'inherit',
                                }}
                              >Sửa</button>
                              <button
                                onClick={() => handleDelete(item)}
                                disabled={deletingId === item.id}
                                style={{
                                  flex: 1, height: 26, borderRadius: 6, border: `1px solid ${D.red}`,
                                  background: '#fff5f5', color: D.red, fontSize: 11, fontWeight: 600,
                                  cursor: 'pointer', fontFamily: 'inherit',
                                  opacity: deletingId === item.id ? 0.5 : 1,
                                }}
                              >Xóa</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos section */}
            {videos.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: D.inkDim, marginBottom: 12, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Video ({videos.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videos.map(item => (
                    <div key={item.id} style={{
                      background: D.card, borderRadius: 10, border: D.border,
                      boxShadow: D.shadow(2, 2), padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        width: 48, height: 36, borderRadius: 8, background: '#15131a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 18,
                      }}>▶</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.mediaUrl}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: D.inkDim, marginTop: 2 }}>{item.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        style={{
                          height: 28, padding: '0 12px', borderRadius: D.pill,
                          border: `1px solid ${D.red}`, background: '#fff5f5',
                          color: D.red, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                          opacity: deletingId === item.id ? 0.5 : 1,
                        }}
                      >Xóa</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Video modal */}
        {videoModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }} onClick={() => setVideoModal(false)}>
            <div style={{
              background: D.card, borderRadius: D.radius, border: D.border,
              boxShadow: D.shadow(5, 5), padding: 28, width: 460,
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: D.ink, margin: 0 }}>Thêm video</h2>
                <button onClick={() => setVideoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: D.inkMuted }}>✕</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>URL Video</label>
                <input
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... hoặc link trực tiếp"
                  style={inputStyle}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: D.inkMuted, marginTop: 4 }}>
                  Hỗ trợ YouTube, Google Drive hoặc URL file video trực tiếp
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Mô tả (tùy chọn)</label>
                <input
                  value={videoDesc}
                  onChange={e => setVideoDesc(e.target.value)}
                  placeholder="Mô tả ngắn về video..."
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setVideoModal(false)}
                  style={{
                    height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border,
                    background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Hủy</button>
                <button
                  onClick={handleAddVideo}
                  disabled={addingVideo}
                  style={{
                    height: 36, padding: '0 20px', borderRadius: D.pill, border: D.border,
                    background: addingVideo ? D.inkMuted : D.indigo, color: '#fff',
                    fontWeight: 700, fontSize: 13,
                    cursor: addingVideo ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', boxShadow: addingVideo ? 'none' : D.shadow(),
                  }}
                >
                  {addingVideo ? 'Đang thêm...' : 'Thêm video'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
            onClick={() => setLightbox(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 900, width: '100%' }}>
              <img src={lightbox.mediaUrl} alt={lightbox.description ?? ''} style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, border: '3px solid #fff' }} />
              {lightbox.description && (
                <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: D.ink }}>
                  {lightbox.description}
                </div>
              )}
              <button
                onClick={() => setLightbox(null)}
                style={{
                  position: 'absolute', top: -14, right: -14, width: 32, height: 32,
                  borderRadius: D.pill, border: '2px solid #fff', background: '#15131a',
                  color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
