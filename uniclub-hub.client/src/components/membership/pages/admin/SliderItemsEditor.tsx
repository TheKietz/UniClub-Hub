import { useRef, useState } from 'react'
import { X, ChevronUp, ChevronDown, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadApplicationFile } from '@/components/membership/services/clubApi'

// Trình sửa slider "Spotlight" của trang chủ — thay ô JSON thô.
// Serialize ra cùng cấu trúc mà LandingPage đọc (landing.slider_items).

type Slide = {
  eyebrow?: string
  title?: string
  description?: string
  imageUrl?: string
  ctaLabel?: string
  ctaHref?: string
  accent?: string
}

const D = {
  borderLight: '1px solid #e8e3d6',
  ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: '#f7f6f1', card: '#ffffff', indigo: '#4f46e5',
}

const ACCENTS = ['#1d4ed8', '#e11d2a', '#2563eb', '#0ea5e9', '#7c3aed', '#0a2f6e']

const inputS: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: D.borderLight, padding: '8px 11px',
  fontSize: 13, color: D.ink, outline: 'none', background: D.card,
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelS: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: D.inkDim,
  marginBottom: 4, letterSpacing: '.02em',
}

export function SliderItemsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let slides: Slide[] = []
  try { const p = JSON.parse(value); if (Array.isArray(p)) slides = p } catch { slides = [] }

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  function commit(next: Slide[]) { onChange(JSON.stringify(next, null, 2)) }
  function setField(i: number, field: keyof Slide, val: string) {
    const next = [...slides]; next[i] = { ...next[i], [field]: val }; commit(next)
  }
  function remove(i: number) { commit(slides.filter((_, idx) => idx !== i)) }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    const next = [...slides]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }
  function add() {
    commit([...slides, { eyebrow: 'Nổi bật', title: '', description: '', accent: ACCENTS[0] }])
  }

  async function handleUpload(i: number, file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Vui lòng chọn tệp ảnh.'); return }
    setUploadingIdx(i)
    try {
      const url = await uploadApplicationFile(file)
      setField(i, 'imageUrl', url)
      toast.success('Đã tải ảnh lên.')
    } catch {
      toast.error('Tải ảnh thất bại.')
    } finally {
      setUploadingIdx(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {slides.length === 0 && (
        <div style={{ fontSize: 12.5, color: D.inkMuted, padding: '6px 0' }}>
          Chưa có slide nào. Bấm “+ Thêm slide” để bắt đầu.
        </div>
      )}

      {slides.map((s, i) => {
        const accent = s.accent || ACCENTS[0]
        return (
          <div key={i} style={{ border: D.borderLight, borderRadius: 12, padding: 14, background: D.bg }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: accent, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: D.ink, flex: 1 }}>Slide {i + 1}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Lên"
                style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: D.card, border: D.borderLight, cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#d1d5db' : D.inkDim }}>
                <ChevronUp size={14} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="Xuống"
                style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: D.card, border: D.borderLight, cursor: i === slides.length - 1 ? 'default' : 'pointer', color: i === slides.length - 1 ? '#d1d5db' : D.inkDim }}>
                <ChevronDown size={14} />
              </button>
              <button type="button" onClick={() => remove(i)} title="Xoá slide"
                style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: D.card, border: D.borderLight, cursor: 'pointer', color: '#ef4444' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14 }}>
              {/* Image */}
              <div>
                <label style={labelS}>Ảnh</label>
                <input
                  ref={el => { fileRefs.current[i] = el }}
                  type="file" accept="image/*" hidden
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(i, f); e.target.value = '' }}
                />
                <div
                  onClick={() => fileRefs.current[i]?.click()}
                  style={{
                    aspectRatio: '4 / 3', borderRadius: 10, border: `1.5px dashed ${accent}`,
                    background: s.imageUrl ? `center / cover no-repeat url(${s.imageUrl})` : D.card,
                    display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden',
                    color: D.inkMuted, position: 'relative',
                  }}
                >
                  {uploadingIdx === i ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : !s.imageUrl && (
                    <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600 }}>
                      <ImagePlus size={20} style={{ marginBottom: 4 }} /><br />Tải ảnh lên
                    </div>
                  )}
                </div>
                {s.imageUrl && (
                  <button type="button" onClick={() => setField(i, 'imageUrl', '')}
                    style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Xoá ảnh
                  </button>
                )}
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelS}>Nhãn nhỏ (eyebrow)</label>
                    <input value={s.eyebrow ?? ''} onChange={e => setField(i, 'eyebrow', e.target.value)}
                      placeholder="Spotlight tuần này" style={inputS} />
                  </div>
                  <div>
                    <label style={labelS}>Màu nhấn</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="color" value={accent} onChange={e => setField(i, 'accent', e.target.value)}
                        style={{ width: 34, height: 34, padding: 0, border: D.borderLight, borderRadius: 8, background: D.card, cursor: 'pointer' }} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {ACCENTS.map(c => (
                          <button key={c} type="button" onClick={() => setField(i, 'accent', c)} title={c}
                            style={{ width: 20, height: 20, borderRadius: 5, background: c, border: accent.toLowerCase() === c ? '2px solid #15131a' : D.borderLight, cursor: 'pointer' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={labelS}>Tiêu đề</label>
                  <input value={s.title ?? ''} onChange={e => setField(i, 'title', e.target.value)}
                    placeholder="Workshop, tuyển thành viên và sân chơi mới." style={inputS} />
                </div>

                <div>
                  <label style={labelS}>Mô tả</label>
                  <textarea value={s.description ?? ''} onChange={e => setField(i, 'description', e.target.value)}
                    placeholder="Mô tả ngắn cho slide…" rows={2} style={{ ...inputS, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelS}>Nhãn nút (CTA)</label>
                    <input value={s.ctaLabel ?? ''} onChange={e => setField(i, 'ctaLabel', e.target.value)}
                      placeholder="Xem hoạt động" style={inputS} />
                  </div>
                  <div>
                    <label style={labelS}>Link nút</label>
                    <input value={s.ctaHref ?? ''} onChange={e => setField(i, 'ctaHref', e.target.value)}
                      placeholder="/clubs hoặc https://…" style={inputS} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <button type="button" onClick={add}
        style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8, border: D.borderLight, background: D.card, fontSize: 12.5, fontWeight: 700, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit' }}>
        + Thêm slide
      </button>
    </div>
  )
}
