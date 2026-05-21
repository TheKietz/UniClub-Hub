import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Calendar, MapPin, Users, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/operationsApi'
import type { EventItem, CreateEventDto, UpdateEventDto, EventStatus } from '../services/operations.types'

const STATUS_BADGE: Record<EventStatus, { label: string; bg: string; text: string }> = {
  Draft:      { label: 'Nháp',        bg: '#f3f4f6', text: '#374151' },
  InProgress: { label: 'Đang diễn ra', bg: '#dbeafe', text: '#1d4ed8' },
  Completed:  { label: 'Hoàn thành',  bg: '#d1fae5', text: '#065f46' },
  Cancelled:  { label: 'Đã hủy',     bg: '#fee2e2', text: '#991b1b' },
}

const EMPTY_FORM: CreateEventDto = { name: '', description: '', location: '', startTime: '', endTime: '', budget: undefined, category: '' }

export default function EventListPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EventItem | null>(null)
  const [form, setForm] = useState<CreateEventDto>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getEvents({ clubId, status: statusFilter || undefined, pageSize: 100 })
      .then(r => setEvents(r.items))
      .catch(() => toast.error('Không thể tải danh sách sự kiện'))
      .finally(() => setLoading(false))
  }, [clubId, statusFilter, refreshKey])

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (ev: EventItem) => {
    setEditTarget(ev)
    setForm({
      name: ev.name,
      description: ev.description ?? '',
      location: ev.location ?? '',
      startTime: ev.startTime ? ev.startTime.slice(0, 16) : '',
      endTime: ev.endTime ? ev.endTime.slice(0, 16) : '',
      maxParticipants: ev.maxParticipants,
      budget: ev.budget,
      category: ev.category ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateEvent(editTarget.id, { ...form, status: editTarget.status } as UpdateEventDto)
        toast.success('Cập nhật thành công')
      } else {
        await createEvent(clubId, form)
        toast.success('Tạo sự kiện thành công')
      }
      setModalOpen(false)
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ev: EventItem) => {
    try {
      await deleteEvent(ev.id)
      toast.success('Đã xóa sự kiện')
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Không thể xóa sự kiện này')
    }
  }

  const set = (field: keyof CreateEventDto, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sự kiện</h1>
          <p className="text-sm text-gray-500 mt-1">{events.length} sự kiện</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openCreate}>
          <Plus size={16} className="mr-1" /> Tạo sự kiện
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'Draft', 'InProgress', 'Completed', 'Cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {s ? STATUS_BADGE[s as EventStatus]?.label : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-20">Đang tải...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-gray-400 py-20">Chưa có sự kiện nào</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(ev => {
            const badge = STATUS_BADGE[ev.status] ?? STATUS_BADGE.Draft
            return (
              <div
                key={ev.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/operations/events/${ev.id}?clubId=${clubId}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.text }}>
                    {badge.label}
                  </span>
                  <div className="flex gap-1">
                    <button className="p-1 text-gray-400 hover:text-indigo-600" onClick={e => { e.stopPropagation(); openEdit(ev) }}>
                      <Pencil size={14} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-500" onClick={e => { e.stopPropagation(); handleDelete(ev) }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{ev.name}</h3>

                <div className="space-y-1 text-xs text-gray-500">
                  {ev.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {ev.location}
                    </span>
                  )}
                  {ev.startTime && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(ev.startTime).toLocaleDateString('vi-VN')}
                      {ev.endTime && ` – ${new Date(ev.endTime).toLocaleDateString('vi-VN')}`}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {ev.participantCount} người tham gia
                    {ev.maxParticipants && ` / ${ev.maxParticipants}`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tên sự kiện <span className="text-red-500">*</span></Label>
              <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên sự kiện..." />
            </div>
            <div>
              <Label>Mô tả</Label>
              <textarea
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                rows={2}
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
              />
            </div>
            <div>
              <Label>Địa điểm</Label>
              <Input className="mt-1" value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Địa điểm tổ chức..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bắt đầu</Label>
                <Input className="mt-1" type="datetime-local" value={form.startTime ?? ''} onChange={e => set('startTime', e.target.value)} />
              </div>
              <div>
                <Label>Kết thúc</Label>
                <Input className="mt-1" type="datetime-local" value={form.endTime ?? ''} onChange={e => set('endTime', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Số người tối đa</Label>
              <Input
                className="mt-1" type="number" min={1}
                value={form.maxParticipants ?? ''}
                onChange={e => set('maxParticipants', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Không giới hạn"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngân sách (VNĐ)</Label>
                <Input
                  className="mt-1" type="number" min={0}
                  value={form.budget ?? ''}
                  onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Chưa xác định"
                />
              </div>
              <div>
                <Label>Danh mục</Label>
                <Input
                  className="mt-1"
                  value={form.category ?? ''}
                  onChange={e => set('category', e.target.value)}
                  placeholder="VD: Văn hoá, Học thuật..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Đang lưu...' : editTarget ? 'Lưu thay đổi' : 'Tạo sự kiện'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
