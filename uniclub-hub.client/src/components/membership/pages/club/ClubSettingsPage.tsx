import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubDetail, uploadClubLogo, updateClubSettings } from '@/components/membership/services/clubApi'
import { toast } from 'sonner'
import { QRCodeCanvas } from 'qrcode.react'
import FormSchemaPage from './FormSchemaPage'
import MemberFieldsPage from './MemberFieldsPage'
import PipelineSettingsPage from './PipelineSettingsPage'

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
  padding: '0 12px', fontSize: 13, color: '#15131a', outline: 'none',
  background: '#f7f6f1', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#4a4651', display: 'block', marginBottom: 4 }

type Tab = 'info' | 'pipeline' | 'form' | 'fields'
const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Thông tin CLB' },
  { key: 'pipeline', label: 'Quy trình tuyển' },
  { key: 'form', label: 'Form đăng ký' },
  { key: 'fields', label: 'Trường thành viên' },
]

export default function ClubSettingsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const [activeTab, setActiveTab] = useState<Tab>('info')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const publicUrl = `${window.location.origin}/clubs/${id}`

  function downloadQR() {
    const canvas = document.getElementById('club-qr-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-club-${id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const [form, setForm] = useState({
    description: '',
    contactInfo: '',
    advisorName: '',
    logoUrl: '',
  })

  useEffect(() => {
    getClubDetail(id)
      .then(club => setForm({
        description: club.description ?? '',
        contactInfo: club.contactInfo ?? '',
        advisorName: club.advisorName ?? '',
        logoUrl: club.logoUrl ?? '',
      }))
      .catch(() => toast.error('Không thể tải thông tin CLB.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))

  function pickFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { toast.error('Chỉ chấp nhận ảnh jpg, png, webp, gif.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('File không được vượt quá 5MB.'); return }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearLogo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl('')
    setForm(p => ({ ...p, logoUrl: '' }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) pickFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) pickFile(file)
  }

  const displayLogo = previewUrl || form.logoUrl

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let logoUrl = form.logoUrl
      if (pendingFile) {
        const uploaded = await uploadClubLogo(id, pendingFile)
        logoUrl = uploaded.logoUrl
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPendingFile(null)
        setPreviewUrl('')
        setForm(p => ({ ...p, logoUrl }))
      }
      await updateClubSettings(id, {
        description: form.description || null,
        contactInfo: form.contactInfo || null,
        advisorName: form.advisorName || null,
        logoUrl: logoUrl || null,
      })
      toast.success('Đã cập nhật thông tin CLB.')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header + tab bar */}
      <div style={{ padding: '28px 32px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Cài đặt CLB</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Tuỳ chỉnh thông tin, quy trình và cấu hình câu lạc bộ</p>
        </div>
        <div style={{ display: 'flex', borderBottom: '2px solid #e8e3d6' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '9px 18px', fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? D.ink : D.inkMuted,
              background: 'transparent', border: 'none',
              borderBottom: `2.5px solid ${activeTab === tab.key ? D.indigo : 'transparent'}`,
              marginBottom: -2, cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Tab: Thông tin CLB */}
      {activeTab === 'info' && (
        loading ? (
          <div style={{ padding: '28px 32px', fontSize: 13, color: D.inkMuted }}>Đang tải...</div>
        ) : (
          <div style={{ padding: '24px 32px' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Logo + QR section */}
              <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 0' }}>
                  {/* Left: Logo */}
                  <div style={{ paddingRight: 24 }}>
                    <label style={{ ...labelStyle, fontSize: 13, marginBottom: 16 }}>Logo CLB</label>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        style={{
                          width: 160, height: 160, flexShrink: 0, borderRadius: D.radius,
                          border: dragging ? `2px dashed ${D.indigo}` : `2px dashed #c4bdb1`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', overflow: 'hidden', position: 'relative',
                          background: dragging ? '#ede9fe' : D.bg, transition: 'border-color .15s',
                        }}>
                        {displayLogo ? (
                          <img src={displayLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: 28 }}>🖼</span>
                            <span style={{ fontSize: 11, color: D.inkMuted, lineHeight: 1.4 }}>Kéo ảnh vào đây<br />hoặc nhấn để chọn</span>
                          </div>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleFileChange} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: D.ink, margin: 0 }}>Tải ảnh lên</p>
                        <p style={{ fontSize: 12, color: D.inkDim, lineHeight: 1.6, margin: 0 }}>
                          Kéo thả file ảnh vào ô bên trái, hoặc nhấn vào ô đó để chọn file.<br />
                          Chấp nhận: jpg, png, webp, gif — tối đa 5MB.<br />
                          Ảnh sẽ được upload khi bạn nhấn <strong>Lưu thay đổi</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
                          <button type="button" onClick={() => fileInputRef.current?.click()}
                            style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2, 2), padding: '6px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Chọn file ảnh
                          </button>
                          {displayLogo && (
                            <button type="button" onClick={clearLogo}
                              style={{ background: D.card, color: D.red, border: '1.5px solid #fecaca', boxShadow: D.shadow(2, 2), padding: '6px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              ✕ Xóa logo
                            </button>
                          )}
                        </div>
                        {pendingFile && (
                          <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>
                            Đã chọn: <strong>{pendingFile.name}</strong> — chưa lưu
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: QR */}
                  <div style={{ paddingLeft: 24, borderLeft: D.borderLight }}>
                    <label style={{ ...labelStyle, fontSize: 13, marginBottom: 16 }}>QR trang CLB</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ background: '#fff', border: D.border, borderRadius: 12, padding: 8, boxShadow: D.shadow(2, 2), flexShrink: 0 }}>
                        <QRCodeCanvas id="club-qr-canvas" value={publicUrl} size={110} level="M" includeMargin={false} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ fontSize: 12, color: D.inkDim, margin: 0, lineHeight: 1.6 }}>
                          Quét để mở trang CLB công khai.<br />
                          Dùng để dán vào poster, banner hoặc tờ rơi.
                        </p>
                        <button type="button" onClick={downloadQR}
                          style={{ alignSelf: 'flex-start', background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2, 2), padding: '6px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Tải QR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info fields */}
              <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Mô tả CLB</label>
                  <textarea
                    value={form.description}
                    onChange={field('description')}
                    rows={4}
                    placeholder="Mô tả về câu lạc bộ..."
                    style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'none', lineHeight: 1.6 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Giảng viên phụ trách</label>
                  <input value={form.advisorName} onChange={field('advisorName')} placeholder="ThS. Nguyễn Văn A" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Thông tin liên hệ</label>
                  <input value={form.contactInfo} onChange={field('contactInfo')} placeholder="email@uef.edu.vn hoặc SĐT" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving}
                  style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2, 2), padding: '10px 24px', borderRadius: D.pill, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {saving ? (pendingFile ? 'Đang upload & lưu...' : 'Đang lưu...') : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        )
      )}

      {activeTab === 'pipeline' && <PipelineSettingsPage />}
      {activeTab === 'form' && <FormSchemaPage />}
      {activeTab === 'fields' && <MemberFieldsPage />}
    </div>
  )
}
