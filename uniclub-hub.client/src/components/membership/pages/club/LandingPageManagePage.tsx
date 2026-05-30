import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowUpDown, ChevronDown, ChevronUp, Eye, GripVertical, ImagePlus,
  Plus, Trash2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getLandingPageSettings, upsertLandingPageSettings, uploadHeroImage,
  type LandingPageSettings,
} from '@/components/membership/services/clubApi'
import type { LayoutSettings, SectionConfig, SectionType } from '@/components/portal/services/portal.types'
import { DEFAULT_LAYOUT } from '@/components/portal/services/portal.types'

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
  hero:        [{ value: 'default', label: 'Ảnh nền tối' }, { value: 'minimal', label: 'Chia đôi' }, { value: 'vibrant', label: 'Màu chủ đạo' }],
  about:       [{ value: 'default', label: 'Cards' }, { value: 'split', label: 'Dạng hàng' }, { value: 'fullwidth', label: 'Full-width' }],
  stats:       [{ value: 'default', label: 'Trắng' }, { value: 'banner', label: 'Banner màu' }],
  departments: [{ value: 'grid', label: 'Lưới cards' }, { value: 'list', label: 'Danh sách' }],
  events:      [{ value: 'default', label: 'Lưới cards' }, { value: 'timeline', label: 'Timeline' }],
  posts:       [{ value: 'default', label: '3 cột' }, { value: 'magazine', label: 'Magazine' }, { value: 'list', label: 'Danh sách' }],
  gallery:     [{ value: 'default', label: 'Lưới đều' }, { value: 'masonry', label: 'Masonry' }],
  apply:       [{ value: 'default', label: 'Card trắng' }, { value: 'banner', label: 'Banner màu' }],
  contact:     [{ value: 'default', label: 'Mặc định' }],
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

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    getLandingPageSettings(id)
      .then(data => applySettings(data))
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
        return s ? { ...def, ...s } : def
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

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Landing Page</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(`/portal/${id}`, '_blank')}
          >
            <Eye size={15} />
            Xem trước
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ['content', 'Nội dung'],
          ['social',  'Mạng xã hội'],
          ['design',  'Giao diện & Layout'],
        ] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Nội dung ──────────────────────────────────────────────────── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {/* Hero image */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <Label className="text-sm font-semibold">Ảnh bìa (Hero)</Label>
            <p className="text-xs text-gray-500">Kích thước khuyến nghị: 1200×500px. Tối đa 10MB. Ảnh sẽ upload khi nhấn Lưu.</p>

            {/* Preview / drop zone */}
            <div
              className={[
                'relative w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors',
                'border-gray-300 hover:border-indigo-400 hover:bg-gray-50',
                displayHero ? 'h-56' : 'h-36',
              ].join(' ')}
              onClick={() => heroInput.current?.click()}
              onDragOver={e => { e.preventDefault(); heroDrop.current = true }}
              onDragLeave={() => { heroDrop.current = false }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickHero(f) }}
            >
              {displayHero ? (
                <img src={displayHero} alt="Hero" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <ImagePlus size={28} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Kéo ảnh vào đây hoặc nhấn để chọn</span>
                </div>
              )}
              {displayHero && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">Nhấn để đổi ảnh</span>
                </div>
              )}
            </div>
            <input
              ref={heroInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) pickHero(f); e.target.value = '' }}
            />
            {pendingHero && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Đã chọn: <strong>{pendingHero.name}</strong> — chưa lưu</span>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => { if (heroPreview) URL.revokeObjectURL(heroPreview); setPendingHero(null); setHeroPreview('') }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Text fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Giới thiệu ngắn</Label>
              <textarea
                value={introduction}
                onChange={e => setIntroduction(e.target.value)}
                rows={3}
                placeholder="Mô tả ngắn gọn về câu lạc bộ, hiển thị ngay dưới tiêu đề hero..."
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sứ mệnh (Mission)</Label>
              <textarea
                value={mission}
                onChange={e => setMission(e.target.value)}
                rows={3}
                placeholder="Sứ mệnh của CLB là gì?"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tầm nhìn (Vision)</Label>
              <textarea
                value={vision}
                onChange={e => setVision(e.target.value)}
                rows={3}
                placeholder="Tầm nhìn dài hạn của CLB..."
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Mạng xã hội ───────────────────────────────────────────────── */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Liên kết mạng xã hội</p>
            <p className="text-xs text-gray-500 mt-0.5">Hiển thị trong phần Liên hệ của landing page.</p>
          </div>

          {/* Existing links */}
          {Object.entries(socialLinks).length > 0 && (
            <div className="space-y-2">
              {Object.entries(socialLinks).map(([platform, url]) => {
                const meta = SOCIAL_PLATFORMS.find(p => p.value === platform)
                return (
                  <div key={platform} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-24 text-sm font-medium text-gray-700 flex-shrink-0">
                      {meta?.label ?? platform}
                    </span>
                    <span className="flex-1 text-sm text-gray-500 truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeSocialLink(platform)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2 items-end">
            <div className="space-y-1 w-36">
              <Label className="text-xs">Nền tảng</Label>
              <select
                value={newPlatform}
                onChange={e => setNewPlatform(e.target.value)}
                className="w-full border border-input rounded-lg px-2 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SOCIAL_PLATFORMS
                  .filter(p => !Object.prototype.hasOwnProperty.call(socialLinks, p.value))
                  .map(p => <option key={p.value} value={p.value}>{p.label}</option>)
                }
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">URL</Label>
              <Input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://facebook.com/..."
                onKeyDown={e => e.key === 'Enter' && addSocialLink()}
              />
            </div>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addSocialLink}>
              <Plus size={15} />
              Thêm
            </Button>
          </div>

          {Object.entries(socialLinks).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có liên kết nào. Thêm bên trên.</p>
          )}
        </div>
      )}

      {/* ── Tab: Giao diện & Layout ─────────────────────────────────────────── */}
      {activeTab === 'design' && (
        <div className="space-y-4">
          {/* Theme colors */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Màu sắc chủ đạo</p>
              <p className="text-xs text-gray-500 mt-0.5">Áp dụng cho nút, tiêu đề section và các điểm nhấn trong trang.</p>
            </div>
            <div className="flex gap-8">
              <div className="space-y-2">
                <Label className="text-xs">Màu chính (Primary)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={e => setTheme(t => ({ ...t, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm font-mono text-gray-600">{theme.primaryColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Màu nhấn (Accent)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={e => setTheme(t => ({ ...t, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm font-mono text-gray-600">{theme.accentColor}</span>
                </div>
              </div>
              {/* Preview */}
              <div className="flex-1 flex items-end justify-end">
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.primaryColor }}
                    title="Primary"
                  />
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.accentColor }}
                    title="Accent"
                  />
                  <div
                    className="h-8 px-3 rounded-full text-white text-xs font-medium flex items-center"
                    style={{ background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.accentColor})` }}
                  >
                    Xem trước gradient
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section layout */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Cấu hình sections</p>
              <p className="text-xs text-gray-500 mt-0.5">Kéo để sắp xếp thứ tự, bật/tắt hiển thị và chọn phong cách cho mỗi section.</p>
            </div>

            <div className="space-y-2">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className={[
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                    sec.visible
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-100 opacity-60',
                  ].join(' ')}
                >
                  {/* Drag icon (visual only) */}
                  <GripVertical size={16} className="text-gray-300 flex-shrink-0 cursor-grab" />

                  {/* Order badge */}
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0 font-medium">
                    {idx + 1}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    {SECTION_LABELS[sec.id]}
                  </span>

                  {/* Style selector */}
                  <select
                    value={sec.style}
                    onChange={e => setStyle(idx, e.target.value)}
                    disabled={!sec.visible}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {SECTION_STYLES[sec.id].map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  {/* Visible toggle */}
                  <button
                    type="button"
                    onClick={() => toggleVisible(idx)}
                    className={[
                      'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      sec.visible ? 'bg-indigo-600' : 'bg-gray-200',
                    ].join(' ')}
                    title={sec.visible ? 'Đang hiện — nhấn để ẩn' : 'Đang ẩn — nhấn để hiện'}
                  >
                    <span
                      className={[
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                        sec.visible ? 'translate-x-5' : 'translate-x-0.5',
                      ].join(' ')}
                    />
                  </button>

                  {/* Move up / down */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-1">
              <ArrowUpDown size={12} />
              Thay đổi sẽ được lưu khi nhấn "Lưu thay đổi" ở trên.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
