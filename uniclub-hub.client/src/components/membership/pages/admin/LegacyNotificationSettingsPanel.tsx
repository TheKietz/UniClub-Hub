import { useCallback, useEffect, useState } from 'react'
import { Save, Power } from 'lucide-react'
import { toast } from 'sonner'
import { getSettings, updateSetting, toggleSettingEnabled, type SystemSetting } from '@/components/membership/services/adminApi'
import { ACTIVE_LEGACY_NOTIFICATION_SETTING_KEYS } from '@/constants/legacyNotificationSettings'
import { D } from '@/components/shared/managementTheme'

function SettingRow({ setting, onSaved, onToggled }: {
  setting: SystemSetting
  onSaved: (key: string, value: string) => void
  onToggled: (key: string, isEnabled: boolean) => void
}) {
  const [value, setValue] = useState(setting.value)
  const [enabled, setEnabled] = useState(setting.isEnabled ?? true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const dirty = value !== setting.value

  useEffect(() => {
    setValue(setting.value)
    setEnabled(setting.isEnabled ?? true)
  }, [setting.key, setting.value, setting.isEnabled])

  async function save() {
    setSaving(true)
    try {
      await updateSetting(setting.key, value)
      toast.success(`Đã lưu: ${setting.label}`)
      onSaved(setting.key, value)
    } catch {
      toast.error('Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled() {
    setToggling(true)
    try {
      await toggleSettingEnabled(setting.key, !enabled)
      setEnabled(!enabled)
      onToggled(setting.key, !enabled)
      toast.success(!enabled ? 'Đã bật thông báo.' : 'Đã tắt thông báo.')
    } catch {
      toast.error('Thao tác thất bại.')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div style={{
      padding: '16px 20px', borderBottom: D.borderLight,
      opacity: enabled ? 1 : 0.5, transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{setting.label}</p>
          {setting.description && (
            <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 3, lineHeight: 1.5 }}>{setting.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={toggling}
          title={enabled ? 'Tắt thông báo' : 'Bật thông báo'}
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            border: D.borderLight, background: enabled ? '#dcfce7' : D.bg,
            color: enabled ? '#15803d' : D.inkMuted,
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        >
          <Power size={14} />
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={!enabled}
        rows={3}
        style={{
          width: '100%', marginTop: 12, borderRadius: 8, border: D.borderLight,
          padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
          background: D.card, color: D.ink, resize: 'vertical', boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || !enabled}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: D.pill,
            background: dirty && enabled ? D.ink : D.bg,
            color: dirty && enabled ? '#fff' : D.inkMuted,
            border: D.border, fontSize: 12, fontWeight: 700,
            cursor: dirty && enabled ? 'pointer' : 'default',
            boxShadow: dirty && enabled ? D.shadow(2, 2) : 'none',
            fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={13} />
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  )
}

export default function LegacyNotificationSettingsPanel() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await getSettings()
    const keyOrder = new Map(ACTIVE_LEGACY_NOTIFICATION_SETTING_KEYS.map((k, i) => [k, i]))
    const items = data
      .filter(s => keyOrder.has(s.key as typeof ACTIVE_LEGACY_NOTIFICATION_SETTING_KEYS[number]))
      .sort((a, b) => (keyOrder.get(a.key as typeof ACTIVE_LEGACY_NOTIFICATION_SETTING_KEYS[number]) ?? 0)
        - (keyOrder.get(b.key as typeof ACTIVE_LEGACY_NOTIFICATION_SETTING_KEYS[number]) ?? 0))
    setSettings(items)
  }, [])

  useEffect(() => {
    load()
      .catch(() => toast.error('Không tải được mẫu hỗ trợ.'))
      .finally(() => setLoading(false))
  }, [load])

  if (loading) return <div className="mgmt-page mgmt-page--loading">Đang tải…</div>

  return (
    <div style={{ border: D.border, borderRadius: D.radius, overflow: 'hidden', background: D.card, boxShadow: D.shadow() }}>
      <div style={{ padding: '12px 20px', background: '#64748b', borderBottom: D.borderLight }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Hỗ trợ & thông báo trực tiếp — {settings.length} mẫu
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,.85)', lineHeight: 1.45 }}>
          Các mẫu này gửi trực tiếp (ticket hỗ trợ, giải thể ban). Các sự kiện CLB khác cấu hình ở tab Mẫu thông báo.
        </p>
      </div>
      {settings.map(s => (
        <SettingRow
          key={s.key}
          setting={s}
          onSaved={(key, value) => setSettings(prev => prev.map(item => item.key === key ? { ...item, value } : item))}
          onToggled={(key, isEnabled) => setSettings(prev => prev.map(item => item.key === key ? { ...item, isEnabled } : item))}
        />
      ))}
    </div>
  )
}
