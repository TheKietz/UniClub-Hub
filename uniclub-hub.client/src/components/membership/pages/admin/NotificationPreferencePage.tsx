import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import {
  getGlobalPreferences, updateGlobalPreference,
  type NotificationPreferenceItem, type UpdateNotificationPreferenceRequest,
} from '@/components/membership/services/notificationPreferenceApi'
import { D } from '@/components/shared/managementTheme'

const CATEGORY_COLORS: Record<string, string> = {
  'Tuyển thành viên': '#1d4ed8',
  'Quản lý thành viên': '#10b981',
  'Từ chức': '#f59e0b',
  'Công việc': '#6366f1',
  'Sự kiện': '#ec4899',
  'Hệ thống': '#64748b',
}

const VARS = ['{{userName}}', '{{clubName}}', '{{stageName}}', '{{note}}', '{{dashboardUrl}}']

type Tab = 'recipients' | 'templates'
const TABS: { key: Tab; label: string }[] = [
  { key: 'recipients', label: 'Người nhận & kênh' },
  { key: 'templates', label: 'Mẫu thông báo' },
]

// ── Toggle ────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 999,
        background: checked ? D.indigo : '#d1d5db',
        border: D.border, cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background .15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 16, height: 16, borderRadius: 999,
        background: '#fff', border: D.border, transition: 'left .15s',
      }} />
    </button>
  )
}

// ── Recipients tab: trigger group ─────────────────────────────────────────
function TriggerGroup({
  label, items, onSaveRole,
}: {
  label: string
  items: NotificationPreferenceItem[]
  onSaveRole: (item: NotificationPreferenceItem, dto: UpdateNotificationPreferenceRequest) => Promise<void>
}) {
  const [roles, setRoles] = useState(() =>
    Object.fromEntries(items.map(i => [i.recipientRole, { inApp: i.inAppEnabled, email: i.emailEnabled }]))
  )
  const [saving, setSaving] = useState(false)

  async function handleToggle(role: string, field: 'inApp' | 'email', value: boolean) {
    const next = { ...roles[role], [field]: value }
    setRoles(prev => ({ ...prev, [role]: next }))
    setSaving(true)
    try {
      const item = items.find(i => i.recipientRole === role)!
      await onSaveRole(item, {
        inAppEnabled: next.inApp, emailEnabled: next.email,
        inAppTemplate: item.inAppTemplate, emailSubject: item.emailSubject, emailTemplate: item.emailTemplate,
      })
    } catch { toast.error('Lưu thất bại') } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', background: '#f5f4ef', borderBottom: D.borderLight, gap: 10 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: D.ink }}>{label}</span>
        <span style={{ fontSize: 10, color: D.inkMuted }}>{items.length} người nhận</span>
      </div>
      {items.map(item => (
        <div key={item.recipientRole} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px 10px 32px', borderBottom: D.borderLight }}>
          <span style={{ flex: 1, fontSize: 13, color: D.ink }}>{item.recipientRoleLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: D.inkMuted, minWidth: 40, textAlign: 'right' }}>In-app</span>
            <Toggle checked={roles[item.recipientRole].inApp} onChange={v => handleToggle(item.recipientRole, 'inApp', v)} disabled={saving} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: D.inkMuted, minWidth: 34, textAlign: 'right' }}>Email</span>
            <Toggle checked={roles[item.recipientRole].email} onChange={v => handleToggle(item.recipientRole, 'email', v)} disabled={saving} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Templates tab: trigger editor ─────────────────────────────────────────
function TriggerTemplateEditor({
  label, items, onSave,
}: {
  label: string
  items: NotificationPreferenceItem[]
  onSave: (item: NotificationPreferenceItem, dto: UpdateNotificationPreferenceRequest) => Promise<void>
}) {
  const firstItem = items[0]
  const [inAppTpl, setInAppTpl] = useState(items.find(i => i.inAppTemplate)?.inAppTemplate ?? '')
  const [emailSubj, setEmailSubj] = useState(items.find(i => i.emailSubject)?.emailSubject ?? '')
  const [emailBody, setEmailBody] = useState(items.find(i => i.emailTemplate)?.emailTemplate ?? '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  function set<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  async function save() {
    setSaving(true)
    try {
      await Promise.all(items.map(item => onSave(item, {
        inAppEnabled: item.inAppEnabled,
        emailEnabled: item.emailEnabled,
        inAppTemplate: inAppTpl || undefined,
        emailSubject: emailSubj || undefined,
        emailTemplate: emailBody || undefined,
      })))
      toast.success('Đã lưu template')
      setDirty(false)
    } catch { toast.error('Lưu thất bại') } finally { setSaving(false) }
  }

  const labelS: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: D.inkMuted,
    textTransform: 'uppercase', letterSpacing: '.06em',
    display: 'block', marginBottom: 4,
  }
  const inputS: React.CSSProperties = {
    width: '100%', border: D.borderLight, borderRadius: 8,
    padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
    background: D.card, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ padding: '16px 20px', borderBottom: D.borderLight }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, flex: 1 }}>{label}</p>
        {(firstItem?.inAppTemplate || firstItem?.emailSubject || firstItem?.emailTemplate) && (
          <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 999 }}>Đã tuỳ chỉnh</span>
        )}
      </div>

      {/* Variable chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: D.inkMuted, alignSelf: 'center', marginRight: 2 }}>Biến:</span>
        {VARS.map(v => (
          <code key={v} style={{ fontSize: 11, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 999, border: '1px solid #c4b5fd', cursor: 'default', fontFamily: 'monospace' }}>{v}</code>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={labelS}>Thông báo In-app</label>
          <textarea rows={2} value={inAppTpl} onChange={e => set(setInAppTpl)(e.target.value)}
            placeholder="Để trống = dùng template mặc định hệ thống"
            style={{ ...inputS, resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={labelS}>Tiêu đề email</label>
          <input value={emailSubj} onChange={e => set(setEmailSubj)(e.target.value)}
            placeholder="Để trống = dùng tiêu đề mặc định"
            style={inputS}
          />
        </div>
        <div>
          <label style={labelS}>Nội dung email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(HTML — để trống = dùng mẫu hệ thống)</span></label>
          <textarea rows={6} value={emailBody} onChange={e => set(setEmailBody)(e.target.value)}
            placeholder={'<p>Xin chào {{userName}},</p>\n<p>...</p>'}
            style={{ ...inputS, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={save} disabled={!dirty || saving} style={{
            padding: '8px 20px', borderRadius: 8,
            background: dirty ? D.ink : D.bg,
            color: dirty ? '#ffffff' : D.inkMuted,
            border: D.border, fontSize: 13, fontWeight: 700,
            cursor: dirty ? 'pointer' : 'default',
            boxShadow: dirty ? D.shadow(2, 2) : 'none',
            transition: 'all .15s', fontFamily: 'inherit',
          }}>
            {saving ? 'Đang lưu…' : 'Lưu template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function groupByTrigger(items: NotificationPreferenceItem[]) {
  const order: string[] = []
  const map: Record<string, NotificationPreferenceItem[]> = {}
  for (const item of items) {
    if (!map[item.triggerKey]) { order.push(item.triggerKey); map[item.triggerKey] = [] }
    map[item.triggerKey].push(item)
  }
  return order.map(k => ({ triggerKey: k, label: map[k][0].triggerLabel, items: map[k] }))
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function NotificationPreferencePage() {
  const [prefs, setPrefs] = useState<NotificationPreferenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('recipients')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<Tab, Record<string, boolean>>>({
    recipients: {},
    templates: {},
  })

  useEffect(() => {
    getGlobalPreferences()
      .then(setPrefs)
      .catch(() => toast.error('Không tải được cài đặt thông báo'))
      .finally(() => setLoading(false))
  }, [])

  async function save(item: NotificationPreferenceItem, dto: UpdateNotificationPreferenceRequest) {
    await updateGlobalPreference(item.triggerKey, item.recipientRole, dto)
    setPrefs(prev => prev.map(p =>
      p.triggerKey === item.triggerKey && p.recipientRole === item.recipientRole
        ? { ...p, ...dto }
        : p
    ))
  }

  const byCategory = prefs.reduce<Record<string, NotificationPreferenceItem[]>>((acc, p) => {
    const cat = p.triggerCategory || 'Khác'
    ;(acc[cat] ??= []).push(p)
    return acc
  }, {})

  function toggleCategory(category: string) {
    setCollapsedCategories(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [category]: !prev[activeTab][category],
      },
    }))
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header + tab bar */}
      <div style={{ padding: '28px 32px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Cài đặt thông báo</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            Cấu hình kênh, người nhận và nội dung thông báo cho từng sự kiện hệ thống.
          </p>
        </div>
        <div style={{ display: 'flex', borderBottom: '2px solid #dce6f4' }}>
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

      {/* Content */}
      {loading ? (
        <div className="mgmt-page mgmt-page--loading">Đang tải…</div>
      ) : (
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(byCategory).map(([cat, items]) => {
            const color = CATEGORY_COLORS[cat] ?? '#6366f1'
            const triggers = groupByTrigger(items)
            const collapsed = !!collapsedCategories[activeTab][cat]
            return (
              <div key={cat} style={{ border: D.border, borderRadius: D.radius, overflow: 'hidden', background: D.card, boxShadow: D.shadow() }}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-expanded={!collapsed}
                  style={{
                    width: '100%', padding: '10px 16px', background: color,
                    border: 'none', display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '.08em', textTransform: 'uppercase' }}>{cat}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.78)' }}>
                    {triggers.length} mục
                  </span>
                  <ChevronDown
                    size={16}
                    color="#fff"
                    style={{ transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  />
                </button>
                {!collapsed && (
                  <div>
                    {triggers.map(({ triggerKey, label, items: roleItems }, ti) => (
                      <div key={triggerKey} style={{ borderTop: ti === 0 ? 'none' : D.borderLight }}>
                        {activeTab === 'recipients' && (
                          <TriggerGroup label={label} items={roleItems} onSaveRole={save} />
                        )}
                        {activeTab === 'templates' && (
                          <TriggerTemplateEditor label={label} items={roleItems} onSave={save} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
