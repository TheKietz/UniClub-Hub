import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowUpDown, Eye, GripVertical, ImagePlus,
  Plus, Trash2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getLandingPageSettings, upsertLandingPageSettings, uploadHeroImage,
  type LandingPageSettings,
} from '@/components/membership/services/clubApi'
import type { LayoutSettings, SectionConfig, SectionType, ClubLandingData } from '@/components/portal/services/portal.types'
import { DEFAULT_LAYOUT } from '@/components/portal/services/portal.types'
import { getClubLandingPage } from '@/components/portal/services/portal.api'
import SectionRenderer from '@/components/portal/components/SectionRenderer'
import type { PreviewBroadcast } from '@/components/portal/pages/LandingPagePreviewPage'

// ── Design tokens (matches ClubSettingsPage) ────────────────────────────────
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

// ── Section metadata ────────────────────────────────────────────────────────

const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Ảnh bìa & Tiêu đề (Hero)',
  about: 'Sứ mệnh & Tầm nhìn',
  stats: 'Thống kê số liệu',
  departments: 'Ban / Bộ phận',
  events: 'Sự kiện sắp tới',
  posts: 'Bài viết & Tin tức',
  gallery: 'Thư viện ảnh',
  apply: 'Kêu gọi đăng ký',
  contact: 'Liên hệ',
}

const SECTION_STYLES: Record<SectionType, { value: string; label: string }[]> = {
  hero:        [
    { value: 'default',  label: 'Ảnh nền tối' },
    { value: 'minimal',  label: 'Chia đôi' },
    { value: 'vibrant',  label: 'Màu chủ đạo' },
    { value: 'centered', label: 'Căn giữa' },
  ],
  about:       [
    { value: 'default',   label: 'Cards' },
    { value: 'split',     label: 'Dạng hàng' },
    { value: 'fullwidth', label: 'Full-width' },
    { value: 'timeline',  label: 'Timeline' },
  ],
  stats:       [
    { value: 'default', label: 'Bảng liền' },
    { value: 'banner',  label: 'Banner màu' },
    { value: 'cards',   label: 'Cards riêng' },
  ],
  departments: [
    { value: 'grid',    label: 'Lưới cards' },
    { value: 'list',    label: 'Danh sách' },
    { value: 'compact', label: 'Compact' },
  ],
  events:      [
    { value: 'default',  label: 'Lưới cards' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'list',     label: 'Dạng list' },
  ],
  posts:       [
    { value: 'default',  label: '3 cột' },
    { value: 'magazine', label: 'Magazine' },
    { value: 'list',     label: 'Danh sách' },
  ],
  gallery:     [
    { value: 'default', label: 'Lưới đều' },
    { value: 'masonry', label: 'Masonry' },
    { value: 'film',    label: 'Film strip' },
  ],
  apply:       [
    { value: 'default', label: 'Card trắng' },
    { value: 'banner',  label: 'Banner màu' },
    { value: 'split',   label: 'Chia đôi' },
  ],
  contact:     [
    { value: 'default', label: 'Tối giản' },
    { value: 'card',    label: 'Cards nhóm' },
  ],
}

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'github', label: 'GitHub' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
]

type Tab = 'content' | 'social' | 'design'

// ── Component ───────────────────────────────────────────────────────────────

export default function LandingPageManagePage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('content')

  // Content
  const [heroImage, setHeroImage] = useState('')
  const [pendingHero, setPendingHero] = useState<File | null>(null)
  const [heroPreview, setHeroPreview] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [mission, setMission] = useState('')
  const [vision, setVision] = useState('')
  const heroDrop = useRef(false)
  const heroInput = useRef<HTMLInputElement>(null)

  // Social links
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [newPlatform, setNewPlatform] = useState('facebook')
  const [newUrl, setNewUrl] = useState('')

  // Layout
  const [theme, setTheme] = useState(DEFAULT_LAYOUT.theme)
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_LAYOUT.sections)

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [baseData, setBaseData] = useState<ClubLandingData | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // ── BroadcastChannel setup ────────────────────────────────────────────────

  useEffect(() => {
    const channel = new BroadcastChannel(`landing-preview-${id}`)
    channelRef.current = channel
    channel.onmessage = (e) => {
      if (e.data?.type === 'REQUEST') {
        const payload = buildBroadcastPayload()
        if (payload) channel.postMessage({ type: 'REQUEST_ACK', payload })
      }
    }
    return () => channel.close()
  }, [id])

  // Broadcast on every state change (debounced 300ms)
  useEffect(() => {
    if (!baseData) return
    const t = setTimeout(() => {
      const payload = buildBroadcastPayload()
      if (payload) channelRef.current?.postMessage({ type: 'UPDATE', payload })
    }, 300)
    return () => clearTimeout(t)
  }, [heroImage, introduction, mission, vision, socialLinks, sections, theme, baseData])

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getLandingPageSettings(id),
      getClubLandingPage(id).catch(() => null),
    ])
      .then(([settings, landing]) => {
        applySettings(settings)
        if (landing) setBaseData(landing)
      })
      .catch(() => toast.error('Không thể tải cài đặt landing page.'))
      .finally(() => setLoading(false))
  }, [id])

  function applySettings(data: LandingPageSettings) {
    setHeroImage(data.heroImage ?? '')
    setIntroduction(data.introduction ?? '')
    setMission(data.mission ?? '')
    setVision(data.vision ?? '')
    setSocialLinks(data.socialLinks ?? {})

    if (data.layoutSettings) {
      setTheme(data.layoutSettings.theme ?? DEFAULT_LAYOUT.theme)
      const saved = data.layoutSettings.sections ?? []
      const merged = DEFAULT_LAYOUT.sections.map(def => {
        const s = saved.find(x => x.id === def.id)
        return s ? { ...def, ...s, order: def.order } : def
      })
      setSections(merged)
    }
  }

  // ── Hero image ───────────────────────────────────────────────────────────

  function pickHero(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Chỉ chấp nhận jpg, png, webp.'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('File không vượt quá 10MB.'); return }
    if (heroPreview) URL.revokeObjectURL(heroPreview)
    setPendingHero(file)
    setHeroPreview(URL.createObjectURL(file))
  }

  useEffect(() => () => { if (heroPreview) URL.revokeObjectURL(heroPreview) }, [heroPreview])

  // ── Social links ─────────────────────────────────────────────────────────

  function addSocialLink() {
    if (!newUrl.trim()) { toast.error('Nhập URL trước.'); return }
    setSocialLinks(prev => ({ ...prev, [newPlatform]: newUrl.trim() }))
    setNewUrl('')
  }

  function removeSocialLink(platform: string) {
    setSocialLinks(prev => {
      const next = { ...prev }
      delete next[platform]
      return next
    })
  }

  // ── Section ordering ─────────────────────────────────────────────────────

  function moveSection(idx: number, dir: -1 | 1) {
    const next = [...sections]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setSections(next.map((s, i) => ({ ...s, order: i })))
  }

  function toggleVisible(idx: number) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, visible: !s.visible } : s))
  }

  function setStyle(idx: number, style: string) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, style } : s))
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      // 1. Upload hero if pending
      if (pendingHero) {
        const url = await uploadHeroImage(id, pendingHero)
        setHeroImage(url)
        if (heroPreview) URL.revokeObjectURL(heroPreview)
        setPendingHero(null)
        setHeroPreview('')
      }

      // 2. Save settings
      const layout: LayoutSettings = { theme, sections }
      await upsertLandingPageSettings(id, {
        introduction: introduction || undefined,
        mission: mission || undefined,
        vision: vision || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        layoutSettings: layout,
      })

      toast.success('Đã lưu landing page.')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-8 pt-6 space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  const displayHero = heroPreview || heroImage

  function buildBroadcastPayload(): PreviewBroadcast | null {
    if (!baseData) return null
    return { heroImage, introduction, mission, vision, socialLinks, theme, sections }
  }

  function buildPreviewData(): ClubLandingData | null {
    if (!baseData) return null
    return {
      ...baseData,
      landingPage: {
        ...baseData.landingPage,
        heroImage: heroPreview || heroImage || baseData.landingPage.heroImage,
        introduction,
        mission,
        vision,
        socialLinks,
        layoutSettings: { theme, sections },
      },
    }
  }

  return (
    <>
    <div style={{ minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header + tab bar */}
      <div style={{ padding: '28px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Chi tiết CLB</h1>
            <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Tuỳ chỉnh nội dung, giao diện và layout trang</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              disabled={!baseData}
              onClick={() => {
                const payload = buildBroadcastPayload()
                if (payload) channelRef.current?.postMessage({ type: 'UPDATE', payload })
                window.open(`/landing-page/preview/${id}`, '_blank')
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 13, fontWeight: 600, cursor: !baseData ? 'not-allowed' : 'pointer', opacity: !baseData ? 0.5 : 1, fontFamily: 'inherit' }}
            >
              <Eye size={14} /> Xem trước
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 20px', borderRadius: D.pill, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e8e3d6' }}>
          {([['content','Nội dung'],['social','Mạng xã hội'],['design','Giao diện & Layout']] as [Tab,string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '9px 18px', fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? D.ink : D.inkMuted,
              background: 'transparent', border: 'none',
              borderBottom: `2.5px solid ${activeTab === tab ? D.indigo : 'transparent'}`,
              marginBottom: -2, cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Tab: Nội dung ───────────────────────────────────────────────── */}
        {activeTab === 'content' && <>
          {/* Hero image */}
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24 }}>
            <label style={labelStyle}>Ảnh bìa (Hero)</label>
            <p style={{ fontSize: 12, color: D.inkMuted, marginBottom: 12, marginTop: 2 }}>Kích thước khuyến nghị: 1200×500px. Tối đa 10MB. Ảnh sẽ upload khi nhấn Lưu.</p>
            <div
              style={{ position: 'relative', width: '100%', borderRadius: 10, border: `2px dashed ${D.inkMuted}`, overflow: 'hidden', cursor: 'pointer', height: displayHero ? 220 : 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: D.bg, transition: 'border-color .15s' }}
              onClick={() => heroInput.current?.click()}
              onDragOver={e => { e.preventDefault(); heroDrop.current = true }}
              onDragLeave={() => { heroDrop.current = false }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickHero(f) }}
            >
              {displayHero
                ? <img src={displayHero} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <><ImagePlus size={28} color={D.inkMuted} /><span style={{ fontSize: 12, color: D.inkMuted, marginTop: 8 }}>Kéo ảnh vào đây hoặc nhấn để chọn</span></>
              }
            </div>
            <input ref={heroInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pickHero(f); e.target.value = '' }} />
            {pendingHero && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: D.inkMuted }}>
                <span>Đã chọn: <strong>{pendingHero.name}</strong> — chưa lưu</span>
                <button type="button" onClick={() => { if (heroPreview) URL.revokeObjectURL(heroPreview); setPendingHero(null); setHeroPreview('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.red, display: 'flex' }}><X size={14} /></button>
              </div>
            )}
          </div>

          {/* Text fields */}
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {([
              { key: 'introduction', label: 'Giới thiệu ngắn', val: introduction, set: setIntroduction, ph: 'Mô tả ngắn gọn về câu lạc bộ, hiển thị ngay dưới tiêu đề hero...' },
              { key: 'mission',      label: 'Sứ mệnh (Mission)', val: mission,      set: setMission,      ph: 'Sứ mệnh của CLB là gì?' },
              { key: 'vision',       label: 'Tầm nhìn (Vision)',  val: vision,       set: setVision,       ph: 'Tầm nhìn dài hạn của CLB...' },
            ] as const).map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <textarea value={f.val} onChange={e => f.set(e.target.value)} rows={3} placeholder={f.ph}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none', lineHeight: 1.6 }} />
              </div>
            ))}
          </div>
        </>}

        {/* ── Tab: Mạng xã hội ────────────────────────────────────────────── */}
        {activeTab === 'social' && (
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>Liên kết mạng xã hội</p>
              <p style={{ fontSize: 12, color: D.inkMuted, marginTop: 3 }}>Hiển thị trong phần Liên hệ của trang chi tiết CLB.</p>
            </div>

            {Object.entries(socialLinks).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(socialLinks).map(([platform, url]) => {
                  const meta = SOCIAL_PLATFORMS.find(p => p.value === platform)
                  return (
                    <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: D.borderLight, background: D.bg }}>
                      <span style={{ width: 96, fontSize: 13, fontWeight: 600, color: D.inkDim, flexShrink: 0 }}>{meta?.label ?? platform}</span>
                      <span style={{ flex: 1, fontSize: 13, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                      <button type="button" onClick={() => removeSocialLink(platform)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.red, display: 'flex', flexShrink: 0 }}><Trash2 size={15} /></button>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ width: 144 }}>
                <label style={labelStyle}>Nền tảng</label>
                <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} style={{ ...inputStyle, height: 36 }}>
                  {SOCIAL_PLATFORMS.filter(p => !Object.prototype.hasOwnProperty.call(socialLinks, p.value)).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>URL</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://facebook.com/..." onKeyDown={e => e.key === 'Enter' && addSocialLink()} style={inputStyle} />
              </div>
              <button type="button" onClick={addSocialLink} style={{ display: 'flex', alignItems: 'center', gap: 5, background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                <Plus size={14} /> Thêm
              </button>
            </div>

            {Object.entries(socialLinks).length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 13, color: D.inkMuted, padding: '12px 0' }}>Chưa có liên kết nào. Thêm bên trên.</p>
            )}
          </div>
        )}

        {/* ── Tab: Giao diện & Layout ──────────────────────────────────────── */}
        {activeTab === 'design' && <>
          {/* Theme colors */}
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: '0 0 3px' }}>Màu sắc chủ đạo</p>
            <p style={{ fontSize: 12, color: D.inkMuted, marginBottom: 16 }}>Áp dụng cho nút, tiêu đề và gradient trong trang.</p>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
              {([
                { key: 'primaryColor', label: 'Màu chính (Primary)', val: theme.primaryColor, set: (v: string) => setTheme(t => ({ ...t, primaryColor: v })) },
                { key: 'accentColor',  label: 'Màu nhấn (Accent)',   val: theme.accentColor,  set: (v: string) => setTheme(t => ({ ...t, accentColor: v })) },
              ] as const).map(c => (
                <div key={c.key}>
                  <label style={labelStyle}>{c.label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={c.val} onChange={e => c.set(e.target.value)} style={{ width: 40, height: 40, borderRadius: 8, border: D.borderLight, cursor: 'pointer', padding: 2 }} />
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: D.inkDim }}>{c.val}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, border: D.borderLight, backgroundColor: theme.primaryColor }} title="Primary" />
                <div style={{ width: 32, height: 32, borderRadius: 999, border: D.borderLight, backgroundColor: theme.accentColor }} title="Accent" />
                <div style={{ height: 32, padding: '0 14px', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.accentColor})` }}>
                  Gradient
                </div>
              </div>
            </div>
          </div>

          {/* Section layout */}
          <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: '0 0 3px' }}>Cấu hình sections</p>
            <p style={{ fontSize: 12, color: D.inkMuted, marginBottom: 16 }}>Bật/tắt từng phần và chọn phong cách hiển thị.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sections.map((sec, idx) => (
                <div key={sec.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: sec.visible ? D.border : D.borderLight, background: sec.visible ? D.card : D.bg, boxShadow: sec.visible ? D.shadow(2,2) : 'none', opacity: sec.visible ? 1 : 0.55, transition: 'all .15s' }}>
                  <GripVertical size={15} style={{ color: D.inkMuted, flexShrink: 0, cursor: 'grab' }} />
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: D.bg, border: D.borderLight, fontSize: 11, fontWeight: 700, color: D.inkMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: D.ink }}>{SECTION_LABELS[sec.id]}</span>
                  <select
                    value={sec.style}
                    onChange={e => setStyle(idx, e.target.value)}
                    disabled={!sec.visible}
                    style={{ fontSize: 12, border: D.borderLight, borderRadius: 8, padding: '5px 10px', background: D.bg, color: D.inkDim, fontFamily: 'inherit', cursor: sec.visible ? 'pointer' : 'not-allowed', outline: 'none' }}
                  >
                    {SECTION_STYLES[sec.id].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleVisible(idx)}
                    title={sec.visible ? 'Đang hiện — nhấn để ẩn' : 'Đang ẩn — nhấn để hiện'}
                    style={{ width: 44, height: 24, borderRadius: 999, background: sec.visible ? D.indigo : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: sec.visible ? 22 : 2, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} />
                  </button>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: D.inkMuted, marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpDown size={12} /> Thay đổi sẽ được lưu khi nhấn "Lưu thay đổi" ở trên.
            </p>
          </div>
        </>}
      </div>
    </div>

    {/* Preview modal */}
    {previewOpen && (() => {
      const preview = buildPreviewData()
      if (!preview) return null
      const previewTheme = theme
      const visibleSections = [...sections]
        .filter(s => s.visible)
        .sort((a, b) => (CANONICAL_ORDER[a.id] ?? a.order) - (CANONICAL_ORDER[b.id] ?? b.order))
      return (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-indigo-500" />
              <span className="font-semibold text-sm text-gray-800">Xem trước — chưa lưu</span>
              <span className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                Đây là bản xem thử, chưa được lưu vào hệ thống
              </span>
            </div>
            <button
              onClick={() => setPreviewOpen(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors"
            >
              <X size={15} /> Đóng xem trước
            </button>
          </div>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-y-auto bg-white"
            style={{ '--p': previewTheme.primaryColor, '--a': previewTheme.accentColor } as React.CSSProperties}
          >
            {visibleSections.map(section => (
              <SectionRenderer key={section.id} config={section} data={preview} theme={previewTheme} />
            ))}
          </div>
        </div>
      )
    })()}
    </>
  )
}

const CANONICAL_ORDER = Object.fromEntries(
  DEFAULT_LAYOUT.sections.map(s => [s.id, s.order])
)
