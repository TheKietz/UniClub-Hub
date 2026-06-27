import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Pencil, Share2, Calendar, MapPin, Users, CalendarClock,
  Wallet, ChevronRight, Plus, Trash2, Tag, Grid2x2, ExternalLink, FileText, Link2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  getEventById, updateEvent, deleteEvent,
  addEventSession, deleteEventSession, getTasks,
} from '../services/operationsApi'
import EventDeptTasksBoard from '../components/event/EventDeptTasksBoard'
import EventAttachmentsSection from '../components/event/EventAttachmentsSection'
import { getDepartments } from '@/components/membership/services/clubApi'
import { EventStatusBadge } from '../../shared/StatusBadge'
import { FilterSelect } from '@/components/shared/FilterSelect'
import type {
  EventItem, UpdateEventDto, EventStatus,
  CreateEventSessionDto, TaskItem,
} from '../services/operations.types'
import type { DepartmentItem } from '@/components/membership/services/club.types'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const D = {
  border: '1.5px solid var(--c-ink)',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  pill: 999,
  ink: 'var(--c-ink)',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: 'var(--c-bg)',
  card: '#ffffff',
  indigo: '#4f46e5',
  amber: '#f59e0b',
  red: '#ef4444',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
  border: '1.5px solid #c4bfb0', borderRadius: 8, outline: 'none',
  background: '#fff', color: D.ink, fontFamily: "'Be Vietnam Pro', sans-serif",
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: D.inkDim,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em',
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatVnd(amount?: number): string {
  if (amount == null) return 'Chưa xác định'
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

const PRIORITY_DOT: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#60a5fa' }

/* ─── Dept status helper ──────────────────────────────────────────────────── */

function getDeptStatus(tasks: TaskItem[]): { label: string; bg: string; color: string; border: string } {
  if (!tasks.length) return { label: 'Chưa có việc', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
  if (tasks.every(t => t.status === 'Done')) return { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
  if (tasks.some(t => t.status === 'Reviewing')) return { label: 'Đang duyệt', bg: '#fef9c3', color: '#a16207', border: '#fde68a' }
  if (tasks.some(t => t.status === 'Doing')) return { label: 'Đang triển khai', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' }
  return { label: 'Chưa bắt đầu', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
}

/* ─── Edit modal ──────────────────────────────────────────────────────────── */

type EventForm = { name: string; description: string; location: string; startTime: string; endTime: string; maxParticipants?: number; status: EventStatus; budget?: number; category: string; summary: string }

function EditModal({ open, event, clubId, onClose, onSaved }: {
  open: boolean; event: EventItem; clubId: number; onClose: () => void; onSaved: (u: EventItem) => void
}) {
  const [form, setForm] = useState<EventForm>({ name: '', description: '', location: '', startTime: '', endTime: '', status: 'Draft', category: '', summary: '' })
  const [saving, setSaving] = useState(false)
  const [dangerOpen, setDangerOpen]     = useState(false)
  const [taskCount, setTaskCount]       = useState(0)
  const [countLoading, setCountLoading] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: event.name, description: event.description ?? '', location: event.location ?? '', startTime: event.startTime ? event.startTime.slice(0, 16) : '', endTime: event.endTime ? event.endTime.slice(0, 16) : '', maxParticipants: event.maxParticipants, status: event.status, budget: event.budget, category: event.category ?? '', summary: event.summary ?? '' })
  }, [open, event])

  const set = (field: keyof EventForm, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const isCascadeTransition =
    event.status === 'InProgress' &&
    (form.status === 'Draft' || form.status === 'Cancelled')

  async function doSave() {
    setSaving(true)
    try {
      const dto: UpdateEventDto = { name: form.name, description: form.description, location: form.location, startTime: form.startTime || undefined, endTime: form.endTime || undefined, maxParticipants: form.maxParticipants, status: form.status, budget: form.budget, category: form.category || undefined, summary: form.summary || undefined }
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
        const result = await getTasks({ clubId, eventId: event.id, pageSize: 1 })
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
              <FilterSelect
                value={form.status}
                onChange={value => set('status', value as EventStatus)}
                options={[
                  { value: 'Draft', label: 'Nháp' },
                  { value: 'InProgress', label: 'Đang diễn ra' },
                  { value: 'Completed', label: 'Hoàn thành' },
                  { value: 'Cancelled', label: 'Đã hủy' },
                ]}
              />
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
              <label style={labelStyle}>Kết quả / Tổng kết sự kiện</label>
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 80 }} rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Ghi lại kết quả, số lượng tham dự thực tế, đánh giá sau sự kiện..." />
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

      {/* ── Neo-brutalism danger confirmation ── */}
      {dangerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: '#fff', border: '3px solid var(--c-ink)', borderRadius: 16, boxShadow: '6px 6px 0 var(--c-ink)', maxWidth: 480, width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif", overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: '#fef2f2', borderBottom: '3px solid var(--c-ink)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: D.red, letterSpacing: '-.01em' }}>HÀNH ĐỘNG NÀY SẼ XÓA TOÀN BỘ CÔNG VIỆC!</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7f1d1d', fontWeight: 600 }}>Không thể hoàn tác sau khi xác nhận</p>
              </div>
            </div>
            {/* Body */}
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
            {/* Footer */}
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

/* ─── Add session modal ───────────────────────────────────────────────────── */

function AddSessionModal({ open, eventId, onClose, onAdded }: { open: boolean; eventId: number; onClose: () => void; onAdded: () => void }) {
  const BLANK: CreateEventSessionDto = { title: '', startTime: '', endTime: '', description: '', location: '' }
  const [form, setForm] = useState<CreateEventSessionDto>(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(BLANK) }, [open])

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
      <DialogContent style={{ maxWidth: 440, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader><DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Thêm mục lịch trình</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div><label style={labelStyle}>Tên mục <span style={{ color: D.red }}>*</span></label><input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Khai mạc, Phát biểu..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

/* ─── Dept Summary Table ──────────────────────────────────────────────────── */

function DeptSummaryTable({ eventId, clubId }: { eventId: number; clubId: number }) {
  const [depts, setDepts]       = useState<DepartmentItem[]>([])
  const [taskMap, setTaskMap]   = useState<Record<number, TaskItem[]>>({})
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const cancelled = { v: false }
    Promise.all([
      getDepartments(clubId),
      getTasks({ clubId, eventId, pageSize: 200 }),
    ]).then(([deptList, result]) => {
      if (cancelled.v) return
      const map: Record<number, TaskItem[]> = {}
      for (const t of result.items) {
        if (t.departmentId != null) {
          if (!map[t.departmentId]) map[t.departmentId] = []
          map[t.departmentId].push(t)
        }
      }
      setDepts(deptList.filter(d => (map[d.id]?.length ?? 0) > 0))
      setTaskMap(map)
    }).catch(() => {}).finally(() => { if (!cancelled.v) setLoading(false) })
    return () => { cancelled.v = true }
  }, [eventId, clubId])

  const allTasks = useMemo(() => Object.values(taskMap).flat(), [taskMap])
  const totalDone = useMemo(() => allTasks.filter(t => t.status === 'Done').length, [allTasks])

  return (
    <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Grid2x2 size={14} style={{ color: D.indigo }} />
          Danh sách Ban tham chiến
          {depts.length > 0 && (
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{depts.length} ban</span>
          )}
        </h2>
        {allTasks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100, height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: '#10b981', width: `${Math.round(totalDone / allTasks.length * 100)}%`, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, whiteSpace: 'nowrap' }}>
              {totalDone}/{allTasks.length} hoàn thành
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
      ) : depts.length === 0 ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Grid2x2 size={28} style={{ color: '#c4bfb0' }} />
          <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Chưa có ban nào được giao việc trong sự kiện này</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.bg }}>
                {['Ban', 'Trưởng Ban', 'Công việc được giao', 'Tiến độ', 'Tổng quan'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depts.map(dept => {
                const tasks   = taskMap[dept.id] ?? []
                const done    = tasks.filter(t => t.status === 'Done').length
                const pct     = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0
                const status  = getDeptStatus(tasks)
                const initial = dept.name.charAt(0).toUpperCase()

                return (
                  <tr key={dept.id} style={{ borderBottom: D.borderLight }}>

                    {/* Ban name */}
                    <td style={{ padding: '14px 16px', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', border: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: D.indigo, flexShrink: 0 }}>
                          {initial}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{dept.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: D.inkMuted }}>{tasks.length} công việc</p>
                        </div>
                      </div>
                    </td>

                    {/* Trưởng ban */}
                    <td style={{ padding: '14px 16px', minWidth: 150 }}>
                      {dept.deptLeadName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#d1fae5', border: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#065f46', flexShrink: 0 }}>
                            {dept.deptLeadName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, color: D.ink, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{dept.deptLeadName}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: D.inkMuted }}>Trưởng ban</p>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: D.inkMuted }}>Chưa có trưởng ban</span>
                      )}
                    </td>

                    {/* Tasks */}
                    <td style={{ padding: '14px 16px', minWidth: 220 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tasks.slice(0, 3).map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.Medium, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: t.status === 'Done' ? D.inkMuted : D.inkDim, fontWeight: t.status === 'Done' ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>
                              {t.title}
                            </span>
                          </div>
                        ))}
                        {tasks.length > 3 && (
                          <span style={{ fontSize: 10, color: D.inkMuted, paddingLeft: 11 }}>+{tasks.length - 3} việc khác</span>
                        )}
                      </div>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: '14px 16px', minWidth: 130 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? '#10b981' : D.indigo, width: `${pct}%`, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: D.inkMuted, fontWeight: 600 }}>{done}/{tasks.length} ({pct}%)</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: D.pill, background: status.bg, color: status.color, border: `1.5px solid ${status.border}`, whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function EventDetailPage() {
  const { id, clubId: clubIdParam } = useParams<{ id: string; clubId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const clubId = Number(clubIdParam ?? 1)
  const isManageContext = location.pathname.includes('/manage/')
  const eventsListUrl = isManageContext
    ? `/clubs/${clubId}/manage/events`
    : `/clubs/${clubId}/operations?view=events`

  const { isSuperAdmin, getClubRole } = useAuth()
  const canManage = isSuperAdmin || getClubRole(clubId) === CLUB_ROLES.CLUB_ADMIN

  const [event, setEvent]         = useState<EventItem | null>(null)
  const [loading, setLoading]     = useState(true)
  const [editOpen, setEditOpen]   = useState(false)
  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false)
  const [deletingEvent, setDeletingEvent]     = useState(false)

  // Google Form link (persisted in localStorage per event)
  const storageKey = id ? `club-event-${id}-reg-link` : ''
  const [regLink, setRegLink]       = useState<string>('')
  const [editingLink, setEditingLink] = useState(false)
  const [linkDraft, setLinkDraft]   = useState('')

  const loadEvent = async () => {
    if (!id) return
    const ev = await getEventById(Number(id))
    setEvent(ev)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getEventById(Number(id))
      .then(ev => setEvent(ev))
      .catch(() => toast.error('Không thể tải thông tin sự kiện'))
      .finally(() => setLoading(false))
    setRegLink(localStorage.getItem(`club-event-${id}-reg-link`) ?? '')
  }, [id])

  const handleDeleteSession = async (sessionId: number) => {
    if (!event) return
    try { await deleteEventSession(event.id, sessionId); toast.success('Đã xóa mục lịch trình'); await loadEvent() }
    catch { toast.error('Không thể xóa mục này') }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    setDeletingEvent(true)
    try { await deleteEvent(event.id); toast.success('Đã xóa sự kiện'); navigate(eventsListUrl) }
    catch { toast.error('Không thể xóa sự kiện này'); setDeletingEvent(false); setDeleteEventOpen(false) }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Đã sao chép liên kết'))
      .catch(() => toast.error('Không thể sao chép liên kết'))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <span style={{ color: D.inkMuted, fontSize: 13 }}>Đang tải...</span>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <p style={{ color: D.inkMuted }}>Không tìm thấy sự kiện</p>
        <button type="button" onClick={() => navigate(eventsListUrl)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.pill, background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2) }}>
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const sessions = event.sessions ?? []

  const outlineBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    fontSize: 12, fontWeight: 700, border: D.border, borderRadius: D.pill,
    background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2), fontFamily: 'inherit',
  }
  const cardStyle: React.CSSProperties = {
    background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20,
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted, marginBottom: 16 }}>
        {isManageContext
          ? <Link to={`/clubs/${clubId}/manage`} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Quản lý CLB</Link>
          : <Link to={`/clubs/${clubId}/operations`} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Vận hành</Link>
        }
        <ChevronRight size={12} />
        <Link to={eventsListUrl} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Sự kiện</Link>
        <ChevronRight size={12} />
        <span style={{ color: D.ink, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{event.name}</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <button type="button" onClick={() => navigate(eventsListUrl)} style={{ marginTop: 2, padding: 6, borderRadius: 8, border: D.borderLight, background: D.card, color: D.inkMuted, cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: D.ink, margin: 0, letterSpacing: '-.025em' }}>{event.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <EventStatusBadge status={event.status} />
              {event.category && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkMuted, background: D.bg, border: D.borderLight, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  <Tag size={9} /> {event.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={handleShare} style={outlineBtnStyle}><Share2 size={13} /> Chia sẻ</button>
          {canManage && (
            <>
              <button type="button" onClick={() => setDeleteEventOpen(true)} style={{ ...outlineBtnStyle, color: D.red, borderColor: '#fca5a5' }}>
                <Trash2 size={13} /> Xóa
              </button>
              <button type="button" onClick={() => setEditOpen(true)} style={{ ...outlineBtnStyle, background: D.ink, color: '#facc15', boxShadow: D.shadow() }}>
                <Pencil size={13} /> Chỉnh sửa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Event info */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 14px' }}>Thông tin tổng quan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: D.inkDim }}>
              {event.startTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={14} style={{ color: D.indigo, flexShrink: 0 }} />
                  <span>{formatDate(event.startTime)}{event.endTime && <> &mdash; {formatDate(event.endTime)}</>}</span>
                </div>
              )}
              {event.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} style={{ color: D.red, flexShrink: 0 }} />
                  <span>{event.location}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>{event.participantCount} người tham gia{event.maxParticipants ? ` / tối đa ${event.maxParticipants}` : ''}</span>
              </div>
              {event.description && (
                <p style={{ margin: '8px 0 0', color: D.inkMuted, lineHeight: 1.6, paddingTop: 12, borderTop: D.borderLight, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{event.description}</p>
              )}
              {event.summary && (
                <div style={{ margin: '10px 0 0', paddingTop: 12, borderTop: D.borderLight }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 6px' }}>Kết quả / Tổng kết</p>
                  <p style={{ fontSize: 13, color: D.inkDim, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{event.summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={13} style={{ color: D.indigo }} />
                Lịch trình hoạt động
                {sessions.length > 0 && (
                  <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{sessions.length}</span>
                )}
              </h2>
              {canManage && (
                <button type="button" onClick={() => setAddSessionOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Plus size={12} /> Thêm mục
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={28} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Chưa có lịch trình — nhấn "Thêm mục" để bắt đầu</p>
              </div>
            ) : (
              <div>
                {sessions.map((s, idx) => (
                  <div key={s.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 52, textAlign: 'right', fontSize: 11, color: D.inkMuted, paddingTop: 2, flexShrink: 0, lineHeight: 1.4 }}>
                      <div>{s.startTime}</div><div style={{ color: '#c4bfb0' }}>{s.endTime}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.indigo, marginTop: 3, flexShrink: 0 }} />
                      {idx < sessions.length - 1 && <div style={{ width: 1, flex: 1, background: '#e8e3d6', margin: '3px 0' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 16, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{s.title}</p>
                        {s.location && <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} /> {s.location}</p>}
                        {s.description && <p style={{ fontSize: 11, color: D.inkMuted, margin: '4px 0 0' }}>{s.description}</p>}
                      </div>
                      {canManage && (
                        <button type="button" aria-label="Xóa mục lịch trình" onClick={() => handleDeleteSession(s.id)} style={{ padding: 4, color: D.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Budget */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={12} style={{ color: D.amber }} />Ngân sách phân bổ
            </h2>
            {event.budget != null ? (
              <p style={{ fontSize: 20, fontWeight: 900, color: D.ink, margin: 0 }}>{formatVnd(event.budget)}</p>
            ) : (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Wallet size={20} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 11, color: D.inkMuted, margin: 0, textAlign: 'center' }}>Chưa xác định ngân sách</p>
              </div>
            )}
          </div>

          {/* Google Form registration link */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={12} style={{ color: '#0ea5e9' }} />
                Form đăng ký
              </h2>
              {canManage && !editingLink && (
                <button
                  type="button"
                  onClick={() => { setLinkDraft(regLink); setEditingLink(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Pencil size={11} /> {regLink ? 'Sửa' : 'Thêm link'}
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
                    onClick={() => setEditingLink(false)}
                    style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 700, border: D.border, borderRadius: 8, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Hủy</button>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = linkDraft.trim()
                      if (storageKey) localStorage.setItem(storageKey, trimmed)
                      setRegLink(trimmed)
                      setEditingLink(false)
                    }}
                    style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 900, border: D.border, borderRadius: 8, background: D.ink, color: '#facc15', cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(2, 2) }}
                  >Lưu</button>
                </div>
                {regLink && (
                  <button
                    type="button"
                    onClick={() => {
                      if (storageKey) localStorage.removeItem(storageKey)
                      setRegLink(''); setEditingLink(false)
                    }}
                    style={{ width: '100%', padding: '5px 0', fontSize: 11, fontWeight: 700, border: '1.5px solid #fca5a5', borderRadius: 8, background: '#fff5f5', color: D.red, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Xóa link</button>
                )}
              </div>
            ) : regLink ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10 }}>
                  <Link2 size={14} style={{ color: '#0ea5e9', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 11, color: '#0369a1', wordBreak: 'break-all', lineHeight: 1.5, fontWeight: 500 }}>
                    {regLink.length > 60 ? regLink.slice(0, 60) + '…' : regLink}
                  </p>
                </div>
                <a
                  href={regLink}
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
        </div>
      </div>

      {/* Tasks by department */}
      <EventDeptTasksBoard
        eventId={event.id}
        clubId={clubId}
        isManager={canManage}
        eventStart={event.startTime}
        eventEnd={event.endTime}
      />

      {/* Attachments */}
      <EventAttachmentsSection eventId={event.id} isManager={canManage} />

      {/* Department summary table */}
      <DeptSummaryTable eventId={event.id} clubId={clubId} />

      {/* Modals */}
      {editOpen && <EditModal open={editOpen} event={event} clubId={clubId} onClose={() => setEditOpen(false)} onSaved={updated => setEvent(updated)} />}
      <AddSessionModal open={addSessionOpen} eventId={event.id} onClose={() => setAddSessionOpen(false)} onAdded={loadEvent} />

      {/* Delete event */}
      <AlertDialog open={deleteEventOpen} onOpenChange={v => !v && setDeleteEventOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Sự kiện <span style={{ fontWeight: 700, color: D.ink }}>"{event.name}"</span> sẽ bị xóa vĩnh viễn cùng toàn bộ lịch trình và nhân sự liên quan. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEvent}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={deletingEvent} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deletingEvent ? 'Đang xóa...' : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
