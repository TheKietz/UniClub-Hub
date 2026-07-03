import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, FileText, Link2, ExternalLink } from 'lucide-react'
import { saveRegistrationLink } from '../../services/operationsApi'
import { D } from '@/components/shared/managementTheme'
import { inputStyle } from './eventShared'

/**
 * Registration-form link card, shared by both event detail pages (club + university).
 *
 * Persisted via the API (`saveRegistrationLink`) — NOT localStorage. It is controlled
 * by the parent through `value` (event.registrationLink) and `onChange`, which is called
 * with the new link after a successful save so the parent can update its event state.
 */
export default function RegistrationLinkCard({ eventId, canManage, value, onChange }: {
  eventId: number
  canManage: boolean
  value: string
  onChange: (link: string) => void
}) {
  const [editingLink, setEditingLink] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const cardStyle: React.CSSProperties = {
    background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20,
  }

  const persist = async (link: string) => {
    setSaving(true)
    try {
      await saveRegistrationLink(eventId, link || null)
      onChange(link)
      setEditingLink(false)
      toast.success(link ? 'Đã lưu link đăng ký' : 'Đã xóa link đăng ký')
    } catch { toast.error('Không thể lưu link đăng ký') }
    finally { setSaving(false) }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <FileText size={12} style={{ color: '#0ea5e9' }} />
          Form đăng ký
        </h2>
        {canManage && !editingLink && (
          <button
            type="button"
            onClick={() => { setLinkDraft(value); setEditingLink(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Pencil size={11} /> {value ? 'Sửa' : 'Thêm link'}
          </button>
        )}
      </div>

      {editingLink ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            autoFocus
            type="url"
            placeholder="https://forms.google.com/..."
            value={linkDraft}
            onChange={e => setLinkDraft(e.target.value)}
            style={{ ...inputStyle, fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditingLink(false)}
              style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 700, border: D.border, borderRadius: 8, background: D.card, color: D.inkDim, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >Hủy</button>
            <button
              type="button"
              disabled={saving}
              onClick={() => persist(linkDraft.trim())}
              style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 900, border: D.border, borderRadius: 8, background: saving ? '#6b7280' : D.ink, color: '#facc15', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : D.shadow(2, 2) }}
            >{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
          {value && (
            <button
              type="button"
              disabled={saving}
              onClick={() => persist('')}
              style={{ width: '100%', padding: '5px 0', fontSize: 11, fontWeight: 700, border: '1.5px solid #fca5a5', borderRadius: 8, background: '#fff5f5', color: D.red, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >Xóa link</button>
          )}
        </div>
      ) : value ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10 }}>
            <Link2 size={14} style={{ color: '#0ea5e9', flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11, color: '#0369a1', wordBreak: 'break-all', lineHeight: 1.5, fontWeight: 500 }}>
              {value.length > 60 ? value.slice(0, 60) + '…' : value}
            </p>
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', fontSize: 12, fontWeight: 900, border: D.border, borderRadius: 10, background: D.ink, color: '#facc15', textDecoration: 'none', boxShadow: D.shadow(2, 2) }}
          >
            <ExternalLink size={12} /> Mở Form đăng ký
          </a>
        </div>
      ) : (
        <div style={{ border: '2px dashed #bae6fd', borderRadius: 10, padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <FileText size={20} style={{ color: '#7dd3fc' }} />
          <p style={{ fontSize: 11, color: D.inkMuted, margin: 0, textAlign: 'center' }}>
            {canManage ? 'Nhấn "Thêm link" để dán link Google Form' : 'Chưa có link form đăng ký'}
          </p>
        </div>
      )}
    </div>
  )
}
