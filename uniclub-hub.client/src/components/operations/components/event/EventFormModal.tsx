import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { CreateEventDto } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'
import { inputStyle, labelStyle } from './eventShared'

const EMPTY_FORM: CreateEventDto = { name: '', description: '', location: '', startTime: '', endTime: '', budget: undefined, category: '' }

/**
 * Shared create / edit event form modal for both event list pages.
 *
 * The parent owns the API call and toasts via `onSubmit`: resolve to signal
 * success (the parent then closes the modal); reject to keep the modal open so
 * the user can retry. `showCategory` is false for university-level events,
 * which have no category field.
 */
export default function EventFormModal({ open, mode, title, initial, showCategory = true, onClose, onSubmit }: {
  open: boolean
  mode: 'create' | 'edit'
  title: string
  initial?: CreateEventDto
  showCategory?: boolean
  onClose: () => void
  onSubmit: (form: CreateEventDto) => Promise<void>
}) {
  const [form, setForm] = useState<CreateEventDto>(initial ?? EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Reset the form each time the modal opens (reads the current `initial` then);
  // intentionally not keyed on `initial` identity so typing isn't wiped by parent re-renders.
  useEffect(() => { if (open) setForm(initial ?? EMPTY_FORM) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof CreateEventDto, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    setSaving(true)
    try { await onSubmit(form) }
    catch { /* parent surfaces the error toast; keep modal open for retry */ }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 'min(520px, calc(100vw - 2rem))', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16, fontWeight: 900, color: D.ink }}>{title}</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0', maxHeight: '65vh', overflowY: 'auto' }}>
          <div>
            <label style={labelStyle}>Tên sự kiện <span style={{ color: D.red }}>*</span></label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên sự kiện..." />
          </div>
          <div>
            <label style={labelStyle}>Mô tả</label>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: 64 }} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Địa điểm</label>
            <input style={inputStyle} value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Địa điểm tổ chức..." />
          </div>
          <div className="rsp-form-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Bắt đầu</label>
              <input style={inputStyle} type="datetime-local" value={form.startTime ?? ''} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Kết thúc</label>
              <input style={inputStyle} type="datetime-local" value={form.endTime ?? ''} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Số người tối đa</label>
            <input style={inputStyle} type="number" min={1} value={form.maxParticipants ?? ''} onChange={e => set('maxParticipants', e.target.value ? Number(e.target.value) : undefined)} placeholder="Không giới hạn" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: showCategory ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Ngân sách (VNĐ)</label>
              <input style={inputStyle} type="number" min={0} value={form.budget ?? ''} onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)} placeholder="Chưa xác định" />
            </div>
            {showCategory && (
              <div>
                <label style={labelStyle}>Danh mục</label>
                <input style={inputStyle} value={form.category ?? ''} onChange={e => set('category', e.target.value)} placeholder="VD: Văn hoá, Học thuật..." />
              </div>
            )}
          </div>
        </div>
        <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>
            Hủy
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: saving ? '#6b7280' : D.ink, color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
            {saving ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Tạo sự kiện'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
