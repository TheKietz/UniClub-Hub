import { useState } from 'react'
import { X } from 'lucide-react'
import type { CreateSprintDto, SprintStatus } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'

interface CreateSprintModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateSprintDto) => Promise<void>
  editData?: {
    id: number
    name: string
    goal?: string
    startDate: string
    endDate: string
    status: SprintStatus
    eventId?: number
  }
}

const EMPTY: CreateSprintDto = { name: '', goal: '', startDate: '', endDate: '', eventId: undefined }

const inputStyle = (hasErr?: boolean): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', fontSize: 13, fontWeight: 500,
  border: `1.5px solid ${hasErr ? D.red : '#c4bfb0'}`,
  borderRadius: 8, outline: 'none', background: D.card, color: D.ink,
  fontFamily: "'Be Vietnam Pro', sans-serif", boxSizing: 'border-box',
})

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: D.inkDim,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em',
}

export default function CreateSprintModal({ open, onClose, onSubmit, editData }: CreateSprintModalProps) {
  const [form, setForm] = useState<CreateSprintDto>(
    editData
      ? { name: editData.name, goal: editData.goal ?? '', startDate: editData.startDate.slice(0, 10), endDate: editData.endDate.slice(0, 10), eventId: editData.eventId }
      : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Tên sprint không được để trống'
    if (!form.startDate) e.startDate = 'Vui lòng chọn ngày bắt đầu'
    if (!form.endDate) e.endDate = 'Vui lòng chọn ngày kết thúc'
    if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = 'Ngày kết thúc phải sau ngày bắt đầu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try { await onSubmit(form); setForm(EMPTY); onClose() }
    finally { setSaving(false) }
  }

  const set = (field: keyof CreateSprintDto, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(21,19,26,0.35)', backdropFilter: 'blur(2px)' }} onClick={onClose} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: 440, height: '100%',
        background: D.card, border: D.border,
        boxShadow: '-6px 0 0 #0a2f6e',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: D.ink, zIndex: 10,
          padding: '16px 20px', borderBottom: D.border, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#ffffff', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {editData ? 'Chỉnh sửa Sprint' : 'Tạo Sprint mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, border: '1.5px solid #ffffff', borderRadius: 6,
              background: 'transparent', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sprint name */}
          <div>
            <label style={labelStyle}>Sprint Name <span style={{ color: D.red }}>*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="VD: Sprint Q3 Launch"
              style={inputStyle(!!errors.name)}
            />
            {errors.name && <p style={{ margin: '4px 0 0', fontSize: 11, color: D.red, fontWeight: 700 }}>{errors.name}</p>}
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Bắt đầu <span style={{ color: D.red }}>*</span></label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                style={inputStyle(!!errors.startDate)}
              />
              {errors.startDate && <p style={{ margin: '4px 0 0', fontSize: 11, color: D.red, fontWeight: 700 }}>{errors.startDate}</p>}
            </div>
            <div>
              <label style={labelStyle}>Kết thúc <span style={{ color: D.red }}>*</span></label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                style={inputStyle(!!errors.endDate)}
              />
              {errors.endDate && <p style={{ margin: '4px 0 0', fontSize: 11, color: D.red, fontWeight: 700 }}>{errors.endDate}</p>}
            </div>
          </div>

          {/* Sprint goal */}
          <div>
            <label style={{ ...labelStyle, color: D.inkMuted }}>Sprint Goal</label>
            <textarea
              value={form.goal ?? ''}
              onChange={e => set('goal', e.target.value)}
              placeholder="Mô tả mục tiêu chính của sprint này..."
              rows={4}
              style={{ ...inputStyle(), resize: 'vertical', minHeight: 96 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'sticky', bottom: 0, background: D.bg, borderTop: D.border,
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              border: D.border, borderRadius: D.radius,
              background: D.card, color: D.inkDim, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '8px 22px', fontSize: 13, fontWeight: 900,
              border: D.border, borderRadius: D.radius,
              background: saving ? '#6b7280' : D.ink, color: '#ffffff',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '3px 3px 0 #1d4ed8',
              letterSpacing: '.04em', textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Đang lưu...' : editData ? 'Lưu thay đổi' : 'Tạo Sprint'}
          </button>
        </div>
      </div>
    </div>
  )
}
