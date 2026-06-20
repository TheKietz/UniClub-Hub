import { useEffect, useState, useRef } from 'react'
import { getSettings, updateSetting, toggleSettingEnabled } from '@/components/membership/services/adminApi'
import type { SystemSetting } from '@/components/membership/services/adminApi'
import { toast } from 'sonner'
import { Save, X, Power, ChevronDown } from 'lucide-react'
import { SliderItemsEditor } from './SliderItemsEditor'

const D = {
  border: '1.5px solid #15131a', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14, pill: 999,
  ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: '#f7f6f1', card: '#ffffff', indigo: '#4f46e5',
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  auth:         { label: 'Xác thực & Đăng ký', color: '#4f46e5' },
  club:         { label: 'Câu lạc bộ',          color: '#10b981' },
  system:       { label: 'Hệ thống',             color: '#f59e0b' },
  notification: { label: 'Thông báo',            color: '#6366f1' },
  contact:      { label: 'Trang liên hệ',        color: '#ec4899' },
  landing:      { label: 'Trang chủ công khai',  color: '#0ea5e9' },
  footer:       { label: 'Footer',               color: '#64748b' },
}

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState('')
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : []

  function add() {
    const t = input.trim().toLowerCase()
    if (!t || tags.includes(t)) { setInput(''); return }
    onChange([...tags, t].join(', '))
    setInput('')
  }

  return (
    <div style={{ border: D.borderLight, borderRadius: 10, padding: '6px 10px', background: D.card, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 44 }}>
      {tags.map(tag => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ede9fe', color: '#5b21b6', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: D.pill, border: '1px solid #c4b5fd' }}>
          {tag}
          <button type="button" onClick={() => onChange(tags.filter(t => t !== tag).join(', '))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#7c3aed', display: 'flex' }}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length === 0 ? 'Nhập rồi Enter...' : ''}
        style={{ border: 'none', outline: 'none', fontSize: 13, color: D.ink, background: 'transparent', minWidth: 120, fontFamily: 'inherit' }}
      />
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width: 48, height: 26, borderRadius: 13, padding: 3,
      background: checked ? '#10b981' : '#d1d5db',
      border: 'none', cursor: 'pointer', transition: 'background .2s',
      display: 'flex', alignItems: 'center',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transform: checked ? 'translateX(22px)' : 'translateX(0)',
        transition: 'transform .2s', display: 'block', flexShrink: 0,
      }} />
    </button>
  )
}

// ── FAQ editor ────────────────────────────────────────────────────────────────
type FaqItem = { q: string; a: string }

function FaqEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let items: FaqItem[] = []
  try { items = JSON.parse(value) } catch { items = [] }

  function update(next: FaqItem[]) { onChange(JSON.stringify(next)) }
  function set(i: number, field: 'q' | 'a', val: string) {
    const next = [...items]; next[i] = { ...next[i], [field]: val }; update(next)
  }

  const inputS: React.CSSProperties = {
    borderRadius: 6, border: D.borderLight, padding: '0 10px', fontSize: 13,
    color: D.ink, outline: 'none', background: D.card, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ border: D.borderLight, borderRadius: 10, padding: '12px 14px', background: D.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, width: 16, flexShrink: 0 }}>{i + 1}.</span>
            <input value={item.q} onChange={e => set(i, 'q', e.target.value)} placeholder="Câu hỏi..."
              style={{ ...inputS, height: 34, flex: 1 }} />
            <button type="button" onClick={() => update(items.filter((_, idx) => idx !== i))}
              style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: D.borderLight, cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
              <X size={12} />
            </button>
          </div>
          <textarea value={item.a} onChange={e => set(i, 'a', e.target.value)} placeholder="Trả lời..." rows={2}
            style={{ ...inputS, padding: '8px 10px', resize: 'vertical', marginLeft: 24 }} />
        </div>
      ))}
      <button type="button" onClick={() => update([...items, { q: '', a: '' }])}
        style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 8, border: D.borderLight, background: D.card, fontSize: 12, fontWeight: 700, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit' }}>
        + Thêm câu hỏi
      </button>
    </div>
  )
}

// ── Setting row ───────────────────────────────────────────────────────────────
function SettingRow({ setting }: { setting: SystemSetting }) {
  const [value, setValue] = useState(setting.value)
  const [enabled, setEnabled] = useState(setting.isEnabled ?? true)
  const [saving, setSaving] = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)
  const [dirty, setDirty] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const isNotification = setting.category === 'notification'

  function handleChange(v: string) { setValue(v); setDirty(v !== setting.value) }

  async function save() {
    setSaving(true)
    try {
      await updateSetting(setting.key, value)
      toast.success(`Đã lưu: ${setting.label}`)
      setDirty(false)
    } catch {
      toast.error('Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleEnabled() {
    setTogglingEnabled(true)
    try {
      await toggleSettingEnabled(setting.key, !enabled)
      setEnabled(!enabled)
      toast.success(!enabled ? 'Đã bật thông báo.' : 'Đã tắt thông báo.')
    } catch {
      toast.error('Thao tác thất bại.')
    } finally {
      setTogglingEnabled(false)
    }
  }

  const inputS: React.CSSProperties = {
    width: '100%', height: 40, borderRadius: 8, border: D.borderLight,
    padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
    background: D.card, fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '16px 20px', borderBottom: D.borderLight, opacity: (!isNotification || enabled) ? 1 : 0.45, transition: 'opacity .2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <div style={{ width: 240, flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{setting.label}</p>
          {setting.description && <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 3, lineHeight: 1.5 }}>{setting.description}</p>}
          <code style={{ fontSize: 10, color: D.inkMuted, background: D.bg, padding: '1px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block', border: D.borderLight }}>{setting.key}</code>
        </div>

        <div style={{ flex: 1, pointerEvents: (isNotification && !enabled) ? 'none' : 'auto' }}>
          {setting.key === 'landing.slider_items' ? (
            <SliderItemsEditor value={value} onChange={handleChange} />
          ) : (
          <>
          {setting.inputType === 'toggle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40 }}>
              <Toggle checked={value === 'true'} onChange={v => handleChange(v ? 'true' : 'false')} />
              <span style={{ fontSize: 13, color: D.inkDim, fontWeight: 600 }}>{value === 'true' ? 'Bật' : 'Tắt'}</span>
            </div>
          )}
          {setting.inputType === 'tags' && <TagInput value={value} onChange={handleChange} />}
          {setting.inputType === 'number' && (
            <input ref={inputRef as React.RefObject<HTMLInputElement>} type="number" min={0} value={value}
              onChange={e => handleChange(e.target.value)} style={inputS} />
          )}
          {setting.inputType === 'text' && (
            <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" value={value}
              onChange={e => handleChange(e.target.value)} style={inputS} />
          )}
          {setting.inputType === 'textarea' && (
            <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={value}
              onChange={e => handleChange(e.target.value)} rows={3}
              style={{ ...inputS, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
          )}
          {setting.inputType === 'faq' && <FaqEditor value={value} onChange={handleChange} />}
          </>
          )}
        </div>

        {isNotification && (
          <button
            onClick={handleToggleEnabled}
            disabled={togglingEnabled}
            title={enabled ? 'Tắt thông báo này' : 'Bật thông báo này'}
            style={{
              width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center',
              background: enabled ? '#ecfdf5' : D.bg,
              border: `1.5px solid ${enabled ? '#10b981' : '#d1d5db'}`,
              color: enabled ? '#10b981' : D.inkMuted,
              cursor: 'pointer', flexShrink: 0, marginTop: 2, transition: 'all .15s',
            }}
          >
            <Power size={14} />
          </button>
        )}

        <button
          onClick={save}
          disabled={!dirty || saving}
          style={{
            width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center',
            background: dirty ? D.ink : D.bg, border: D.borderLight,
            color: dirty ? '#facc15' : D.inkMuted,
            cursor: dirty ? 'pointer' : 'default',
            flexShrink: 0, marginTop: 2, transition: 'all .15s',
          }}
        >
          <Save size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getSettings()
      .then(data => {
        setSettings(data)
        const first = [...new Set(data.map(s => s.category))][0]
        if (first) setActiveTab(first)
      })
      .catch(() => toast.error('Không thể tải cài đặt.'))
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(settings.map(s => s.category))]
  const activeSettings = settings.filter(s => s.category === activeTab)
  const activeColor = CATEGORY_LABELS[activeTab]?.color ?? D.indigo
  const collapsed = !!collapsedCategories[activeTab]

  function toggleActiveCategory() {
    setCollapsedCategories(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header + tab bar */}
      <div style={{ padding: '28px 32px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Cài đặt hệ thống</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Tuỳ chỉnh hành vi hệ thống — thay đổi áp dụng ngay lập tức</p>
        </div>
        {!loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '2px solid #e8e3d6', overflow: 'visible' }}>
            {categories.map(cat => {
              const info = CATEGORY_LABELS[cat] ?? { label: cat, color: D.indigo }
              const isActive = activeTab === cat
              return (
                <button key={cat} onClick={() => setActiveTab(cat)} style={{
                  padding: '9px 18px', fontSize: 13, whiteSpace: 'nowrap',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? D.ink : D.inkMuted,
                  background: 'transparent', border: 'none',
                  borderBottom: `2.5px solid ${isActive ? info.color : 'transparent'}`,
                  marginBottom: -2, cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s',
                }}>{info.label}</button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '28px 32px', fontSize: 13, color: D.inkMuted }}>Đang tải...</div>
      ) : (
        <div style={{ padding: '24px 32px' }}>
          <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
            <button
              type="button"
              onClick={toggleActiveCategory}
              aria-expanded={!collapsed}
              style={{
                width: '100%', padding: '10px 20px', background: activeColor,
                border: 'none', borderBottom: collapsed ? 'none' : D.borderLight,
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1, fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[activeTab]?.label ?? activeTab} — {activeSettings.length} cài đặt
              </span>
              <ChevronDown
                size={16}
                color="#fff"
                style={{ transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              />
            </button>
            {!collapsed && activeSettings.map(s => <SettingRow key={s.key} setting={s} />)}
          </div>
        </div>
      )}
    </div>
  )
}
