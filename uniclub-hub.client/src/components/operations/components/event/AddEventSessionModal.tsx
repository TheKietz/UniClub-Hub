import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { addEventSession } from '../../services/operationsApi'
import type { CreateEventSessionDto } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'
import { inputStyle, labelStyle } from './eventShared'

/**
 * Add-session modal shared by both event detail pages (club + university).
 * Extracted from the previously-duplicated `AddSessionModal` in each page.
 */
export default function AddEventSessionModal({ open, eventId, onClose, onAdded }: {
  open: boolean; eventId: number; onClose: () => void; onAdded: () => void
}) {
  const BLANK: CreateEventSessionDto = { title: '', startTime: '', endTime: '', description: '', location: '' }
  const [form, setForm] = useState<CreateEventSessionDto>(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(BLANK) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof CreateEventSessionDto, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Tên phiên không được để trống'); return }
    if (!form.startTime || !form.endTime) { toast.error('Vui lòng nhập giờ bắt đầu và kết thúc'); return }
    setSaving(true)
    try { await addEventSession(eventId, form); toast.success('Đã thêm phiên'); onAdded(); onClose() }
    catch { toast.error('Có lỗi xảy ra') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 'min(440px, calc(100vw - 2rem))', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader><DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Thêm mục lịch trình</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div><label style={labelStyle}>Tên mục <span style={{ color: D.red }}>*</span></label><input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Khai mạc, Phát biểu..." /></div>
          <div className="rsp-form-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Giờ bắt đầu <span style={{ color: D.red }}>*</span></label><input style={inputStyle} type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
            <div><label style={labelStyle}>Giờ kết thúc <span style={{ color: D.red }}>*</span></label><input style={inputStyle} type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Địa điểm</label><input style={inputStyle} value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Phòng họp, Sân trường..." /></div>
          <div><label style={labelStyle}>Mô tả</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 56 }} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: saving ? '#6b7280' : D.ink, color: '#facc15', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
            {saving ? 'Đang lưu...' : 'Thêm mục'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
