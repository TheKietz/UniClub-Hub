import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ExternalLink, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSprints, createSprint, updateSprint, deleteSprint, getEvents } from '../services/operationsApi'
import type { SprintItem, SprintStatus, CreateSprintDto, UpdateSprintDto, EventItem } from '../services/operations.types'

const STATUS_STYLE: Record<SprintStatus, { label: string; bg: string; text: string; border: string }> = {
  Planning:  { label: 'Lên kế hoạch', bg: '#eef2ff', text: '#4338ca', border: '#a5b4fc' },
  Active:    { label: 'Đang chạy',    bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  Completed: { label: 'Hoàn thành',  bg: '#f9fafb', text: '#4b5563', border: '#d1d5db' },
  Cancelled: { label: 'Đã hủy',      bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
}

const STATUS_OPTIONS: SprintStatus[] = ['Planning', 'Active', 'Completed', 'Cancelled']

const EMPTY_FORM: CreateSprintDto = { name: '', goal: '', startDate: '', endDate: '', eventId: undefined }

export default function SprintsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [sprints, setSprints] = useState<SprintItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<SprintStatus | ''>('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [events, setEvents] = useState<EventItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SprintItem | null>(null)
  const [form, setForm] = useState<CreateSprintDto>(EMPTY_FORM)
  const [editStatus, setEditStatus] = useState<SprintStatus>('Planning')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getSprints({ clubId, pageSize: 100 })
      .then(r => setSprints(r.items))
      .catch(() => toast.error('Không thể tải danh sách sprint'))
      .finally(() => setLoading(false))
  }, [clubId, refreshKey])

  useEffect(() => {
    getEvents({ clubId, pageSize: 50 })
      .then(r => setEvents(r.items))
      .catch(() => {})
  }, [clubId])

  const displayed = statusFilter ? sprints.filter(s => s.status === statusFilter) : sprints

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setEditStatus('Planning')
    setModalOpen(true)
  }

  const openEdit = (s: SprintItem) => {
    setEditTarget(s)
    setForm({
      name: s.name,
      goal: s.goal ?? '',
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate.slice(0, 10),
      eventId: s.eventId,
    })
    setEditStatus(s.status)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sprint không được để trống'); return }
    if (!form.startDate || !form.endDate) { toast.error('Vui lòng chọn ngày bắt đầu và kết thúc'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateSprint(editTarget.id, { ...form, status: editStatus } as UpdateSprintDto)
        toast.success('Cập nhật sprint thành công')
      } else {
        await createSprint(clubId, form)
        toast.success('Tạo sprint thành công')
      }
      setModalOpen(false)
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: SprintItem) => {
    if (!confirm(`Xóa sprint "${s.name}"?`)) return
    try {
      await deleteSprint(s.id)
      toast.success('Đã xóa sprint')
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Không thể xóa sprint này')
    }
  }

  const set = (field: keyof CreateSprintDto, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sprints</h1>
          <p className="text-sm text-gray-500 mt-1">{sprints.length} sprint</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openCreate}>
          <Plus size={16} className="mr-1" /> Tạo sprint
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['', ...STATUS_OPTIONS] as Array<SprintStatus | ''>).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {s ? STATUS_STYLE[s].label : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-20">Đang tải...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center text-gray-400 py-20">Chưa có sprint nào</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(s => {
            const style = STATUS_STYLE[s.status]
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow"
                style={{ borderColor: style.border }}
              >
                {/* Status + actions */}
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {style.label}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" className="p-1 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(s)}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="p-1 text-gray-400 hover:text-red-500" onClick={() => handleDelete(s)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{s.name}</h3>
                {s.goal && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.goal}</p>}

                <div className="space-y-1 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <CalendarRange size={11} />
                    {formatDate(s.startDate)} → {formatDate(s.endDate)}
                  </span>
                  <span className="text-gray-400">{s.taskCount} công việc</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1"
                  onClick={() => navigate(`/operations/kanban?clubId=${clubId}&sprintId=${s.id}`)}
                >
                  <ExternalLink size={12} /> Xem Kanban
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Chỉnh sửa sprint' : 'Tạo sprint mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tên sprint <span className="text-red-500">*</span></Label>
              <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sprint 1 - Khởi động..." />
            </div>
            <div>
              <Label>Mục tiêu</Label>
              <textarea
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                rows={2}
                value={form.goal ?? ''}
                onChange={e => set('goal', e.target.value)}
                placeholder="Mục tiêu của sprint này..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bắt đầu <span className="text-red-500">*</span></Label>
                <Input className="mt-1" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </div>
              <div>
                <Label>Kết thúc <span className="text-red-500">*</span></Label>
                <Input className="mt-1" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              </div>
            </div>
            {editTarget && (
              <div>
                <Label htmlFor="sprint-status">Trạng thái</Label>
                <select
                  id="sprint-status"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as SprintStatus)}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                  ))}
                </select>
              </div>
            )}
            {events.length > 0 && (
              <div>
                <Label htmlFor="sprint-event">Sự kiện liên kết</Label>
                <select
                  id="sprint-event"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  value={form.eventId ?? ''}
                  onChange={e => set('eventId', e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">-- Không liên kết --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Đang lưu...' : editTarget ? 'Lưu thay đổi' : 'Tạo sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
