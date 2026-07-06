import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { updateEvent, getTasks } from '../../services/operationsApi'
import type { EventItem, UpdateEventDto, EventStatus } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'
import { inputStyle, labelStyle } from './eventShared'

type EventForm = {
  name: string; description: string; location: string
  startTime: string; endTime: string; maxParticipants?: number
  status: EventStatus; budget?: number; category: string; summary: string
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'InProgress', label: 'Đang diễn ra' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

/**
 * Shared edit-event modal for both event detail pages.
 *
 * When `cascadeClubId` is provided (club context) the modal uses the styled
 * FilterSelect and shows a danger confirmation before reverting an InProgress
 * event to Draft/Cancelled, because that deletes the event's department tasks.
 * University context passes no clubId → plain select, no cascade warning.
 */
export default function EditEventModal({ open, event, onClose, onSaved, cascadeClubId }: {
  open: boolean
  event: EventItem
  onClose: () => void
  onSaved: (u: EventItem) => void
  cascadeClubId?: number
}) {
  const cascadeMode = cascadeClubId != null
  const [form, setForm] = useState<EventForm>({ name: '', description: '', location: '', startTime: '', endTime: '', status: 'Draft', category: '', summary: '' })
  const [saving, setSaving] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [taskCount, setTaskCount] = useState(0)
  const [countLoading, setCountLoading] = useState(false)

  useEffect(() => {
    if (open) setForm({
      name: event.name,
      description: event.description ?? '',
      location: event.location ?? '',
      startTime: event.startTime ? event.startTime.slice(0, 16) : '',
      endTime: event.endTime ? event.endTime.slice(0, 16) : '',
      maxParticipants: event.maxParticipants,
      status: event.status,
      budget: event.budget,
      category: event.category ?? '',
      summary: event.summary ?? '',
    })
  }, [open, event])

  const set = (field: keyof EventForm, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const isCascadeTransition =
    cascadeMode && event.status === 'InProgress' && (form.status === 'Draft' || form.status === 'Cancelled')

  async function doSave() {
    setSaving(true)
    try {
      const dto: UpdateEventDto = {
        name: form.name, description: form.description, location: form.location,
        startTime: form.startTime || undefined, endTime: form.endTime || undefined,
        maxParticipants: form.maxParticipants, status: form.status, budget: form.budget,
        category: form.category || undefined, summary: form.summary || undefined,
      }
      const updated = await updateEvent(event.id, dto)
      toast.success('Đã cập nhật sự kiện'); onSaved(updated); onClose(); setDangerOpen(false)
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại') }
    finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    if (isCascadeTransition) {
      setCountLoading(true)
      try {
        const result = await getTasks({ clubId: cascadeClubId, eventId: event.id, pageSize: 1 })
        setTaskCount(result.totalCount)
      } catch { setTaskCount(0) }
      finally { setCountLoading(false) }
      setDangerOpen(true)
      return
    }
    await doSave()
  }

  const statusLabel = form.status === 'Draft' ? 'Nháp' : 'Đã hủy'

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent style={{ maxWidth: 520, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader><DialogTitle style={{ fontSize: 16, fontWeight: 900, color: D.ink }}>Chỉnh sửa sự kiện</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0', maxHeight: '65vh', overflowY: 'auto' }}>
            <div><label style={labelStyle}>Tên sự kiện <span style={{ color: D.red }}>*</span></label><input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div>
              <label style={labelStyle}>Trạng thái</label>
              {cascadeMode ? (
                <FilterSelect
                  value={form.status}
                  onChange={value => set('status', value as EventStatus)}
                  options={STATUS_OPTIONS}
                />
              ) : (
                <select aria-label="Trạng thái" style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value as EventStatus)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {isCascadeTransition && (
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: D.red, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ⚠ Chuyển về "{statusLabel}" sẽ xóa toàn bộ công việc của sự kiện này!
                </p>
              )}
            </div>
            <div><label style={labelStyle}>Mô tả</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 72 }} rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
            <div><label style={labelStyle}>Địa điểm</label><input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Bắt đầu</label><input style={inputStyle} type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
              <div><label style={labelStyle}>Kết thúc</label><input style={inputStyle} type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Số người tối đa</label><input style={inputStyle} type="number" min={1} value={form.maxParticipants ?? ''} onChange={e => set('maxParticipants', e.target.value ? Number(e.target.value) : undefined)} placeholder="Không giới hạn" /></div>
              <div><label style={labelStyle}>Danh mục</label><input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Văn hoá, Học thuật..." /></div>
            </div>
            <div><label style={labelStyle}>Ngân sách (VNĐ)</label><input style={inputStyle} type="number" min={0} value={form.budget ?? ''} onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)} placeholder="Chưa xác định" /></div>
            <div>
              <label style={labelStyle}>{cascadeMode ? 'Kết quả / Tổng kết sự kiện' : 'Kết quả / Tổng kết'}</label>
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 80 }} rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder={cascadeMode ? 'Ghi lại kết quả, số lượng tham dự thực tế, đánh giá sau sự kiện...' : 'Ghi lại kết quả, số lượng tham dự thực tế...'} />
            </div>
          </div>
          <DialogFooter style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.radius, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
            <button type="button" onClick={handleSave} disabled={saving || countLoading} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 900, border: D.border, borderRadius: D.radius, background: (saving || countLoading) ? '#6b7280' : isCascadeTransition ? D.red : D.ink, color: '#facc15', cursor: (saving || countLoading) ? 'not-allowed' : 'pointer', boxShadow: (saving || countLoading) ? 'none' : D.shadow(2, 2), fontFamily: 'inherit' }}>
              {countLoading ? 'Đang kiểm tra...' : saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Neo-brutalism danger confirmation (club cascade only) */}
      {cascadeMode && dangerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: '#fff', border: '3px solid var(--c-ink)', borderRadius: 16, boxShadow: '6px 6px 0 var(--c-ink)', maxWidth: 480, width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif", overflow: 'hidden' }}>
            <div style={{ background: '#fef2f2', borderBottom: '3px solid var(--c-ink)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: D.red, letterSpacing: '-.01em' }}>HÀNH ĐỘNG NÀY SẼ XÓA TOÀN BỘ CÔNG VIỆC!</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7f1d1d', fontWeight: 600 }}>Không thể hoàn tác sau khi xác nhận</p>
              </div>
            </div>
            <div style={{ padding: '18px 20px', borderBottom: '2px solid #fee2e2' }}>
              <p style={{ margin: 0, fontSize: 13, color: D.inkDim, lineHeight: 1.7 }}>
                Hệ thống ghi nhận sự kiện <span style={{ fontWeight: 700, color: D.ink }}>"{event.name}"</span> đang được triển khai.
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: D.inkDim, lineHeight: 1.7 }}>
                Nếu bạn chuyển về trạng thái <span style={{ fontWeight: 900, color: D.red }}>"{statusLabel}"</span>,{' '}
                {taskCount > 0
                  ? <><span style={{ fontWeight: 900, color: D.red }}>{taskCount} công việc</span> đang chạy trên Kanban của các Ban sẽ bị xóa bỏ hoàn toàn.</>
                  : <>toàn bộ công việc đang chạy trên Kanban của các Ban sẽ bị xóa bỏ hoàn toàn.</>
                }
              </p>
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#7f1d1d' }}>Bạn có chắc chắn muốn tiếp tục không?</p>
              </div>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setDangerOpen(false)}
                style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, border: '2px solid var(--c-ink)', borderRadius: 10, background: '#fff', color: D.inkDim, cursor: 'pointer', boxShadow: '2px 2px 0 var(--c-ink)' }}
              >
                Không, giữ nguyên
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={doSave}
                style={{ padding: '9px 20px', fontSize: 13, fontWeight: 900, border: '2px solid var(--c-ink)', borderRadius: 10, background: saving ? '#6b7280' : D.red, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '3px 3px 0 #7f1d1d' }}
              >
                {saving ? 'Đang xử lý...' : 'Xác nhận, xóa hết'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
