import { APPLICATION_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApplications, reviewApplication } from '@/components/membership/services/clubApi'
import type { ApplicationItem } from '@/components/membership/services/club.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Clock, MessageCircle, CheckCircle2, XCircle, ArrowUpDown, FileDown } from 'lucide-react'
import api from '@/lib/axiosInstance'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Pending: { label: 'Chờ duyệt', bg: '#fef3c7', text: '#b45309', icon: Clock },
  Interview: { label: 'Phỏng vấn', bg: '#dbeafe', text: '#1d4ed8', icon: MessageCircle },
  Accepted: { label: 'Đã duyệt', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
  Rejected: { label: 'Từ chối', bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Interview', label: 'Phỏng vấn' },
  { value: 'Accepted', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
]

export default function ApplicationsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    getApplications(id, { status: statusFilter || undefined })
      .then(setApplications)
      .catch(() => toast.error('Không thể tải danh sách đơn.'))
      .finally(() => setLoading(false))
  }, [id, statusFilter, refreshKey])

  const [selected, setSelected] = useState<ApplicationItem | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  function openDetail(app: ApplicationItem) {
    setSelected(app)
    setReviewNote('')
  }

  async function handleReview(status: string) {
    if (!selected) return
    setReviewing(true)
    try {
      await reviewApplication(id, selected.id, { status, reviewNote: reviewNote || undefined })
      toast.success(`Đã cập nhật: ${STATUS_CONFIG[status]?.label ?? status}`)
      setSelected(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    } finally {
      setReviewing(false)
    }
  }

  const filtered = applications
    .filter(app => {
      const q = search.toLowerCase()
      return !q
        || (app.fullName ?? '').toLowerCase().includes(q)
        || (app.email ?? '').toLowerCase().includes(q)
        || (app.studentId ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const cmp = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
      return sortDir === 'desc' ? -cmp : cmp
    })

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  async function handleExport(format: 'xlsx' | 'csv') {
    try {
      const params = new URLSearchParams({ format })
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/clubs/${id}/applications/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers['content-disposition']?.split('filename=')[1] ?? `applications.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Xuất file thất bại.')
    }
  }

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Đơn đăng ký</h1>
          <p className="text-sm text-gray-400 mt-0.5">{applications.length} đơn tổng cộng</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} className="gap-1.5 text-gray-600">
            <FileDown size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1.5 text-gray-600">
            <FileDown size={14} /> CSV
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${statusFilter === tab.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
            {tab.label}
            {tab.value && counts[tab.value] ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{counts[tab.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Tìm tên, email, MSSV..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="h-9 px-3 flex items-center gap-1.5 text-sm text-gray-500 border border-input rounded-lg hover:bg-gray-50 whitespace-nowrap">
          <ArrowUpDown size={13} />
          {sortDir === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
        </button>
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length}/{applications.length}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Ngày nộp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-16">Đang tải...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Search size={32} className="text-gray-200" />
                    <p className="text-sm">{search ? 'Không tìm thấy đơn nào.' : 'Chưa có đơn đăng ký.'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(app => {
              const cfg = STATUS_CONFIG[app.status]
              const Icon = cfg?.icon ?? Clock
              const isPending = app.status === APPLICATION_STATUS.PENDING || app.status === APPLICATION_STATUS.INTERVIEW
              return (
                <TableRow key={app.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <p className="font-medium text-sm text-gray-900">{app.fullName ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{app.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-400">{app.studentId ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    {cfg && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: cfg.bg, color: cfg.text }}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={() => openDetail(app)}>
                      {isPending ? 'Xem & duyệt' : 'Chi tiết'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog xem chi tiết & duyệt */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Đơn đăng ký — {selected?.fullName ?? selected?.email}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-1">
              {/* Thông tin người nộp */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="text-gray-500">Email: <span className="text-gray-800">{selected.email}</span></p>
                {selected.studentId && <p className="text-gray-500">MSSV: <span className="text-gray-800">{selected.studentId}</span></p>}
                <p className="text-gray-500">Ngày nộp: <span className="text-gray-800">{new Date(selected.appliedAt).toLocaleDateString('vi-VN')}</span></p>
              </div>

              {/* Câu trả lời form */}
              {selected.answers && (() => {
                try {
                  const parsed = JSON.parse(selected.answers)
                  const entries = Object.entries(parsed)
                  if (entries.length > 0) return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Câu trả lời</p>
                      {entries.map(([k, v]) => (
                        <div key={k} className="bg-gray-50 rounded-lg px-4 py-3">
                          <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                          <p className="text-sm text-gray-800">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  )
                } catch { return null }
              })()}

              {/* Kết quả duyệt (nếu đã xử lý) */}
              {(selected.status === 'Accepted' || selected.status === 'Rejected') && (
                <div className="rounded-lg border px-4 py-3 space-y-1 text-sm"
                  style={{ borderColor: selected.status === 'Accepted' ? '#bbf7d0' : '#fecaca', background: selected.status === 'Accepted' ? '#f0fdf4' : '#fff1f2' }}>
                  <p className="font-medium" style={{ color: selected.status === 'Accepted' ? '#15803d' : '#b91c1c' }}>
                    {selected.status === 'Accepted' ? 'Đã chấp nhận' : 'Đã từ chối'}
                  </p>
                  {selected.reviewerName && <p className="text-gray-500">Bởi: {selected.reviewerName}</p>}
                  {selected.reviewedAt && <p className="text-gray-400 text-xs">{new Date(selected.reviewedAt).toLocaleString('vi-VN')}</p>}
                  {selected.reviewNote && <p className="text-gray-700 mt-1 whitespace-pre-wrap">{selected.reviewNote}</p>}
                </div>
              )}

              {/* Ghi chú + actions (chỉ khi đang chờ) */}
              {(selected.status === 'Pending' || selected.status === 'Interview') && (
                <div className="space-y-2">
                  <Label className="text-sm">Ghi chú phản hồi <span className="text-gray-400 font-normal">(tuỳ chọn)</span></Label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Lý do từ chối, hướng dẫn phỏng vấn..."
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {selected && (selected.status === 'Pending' || selected.status === 'Interview') && (
              <>
                {selected.status === 'Pending' && (
                  <Button variant="outline" disabled={reviewing}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => handleReview('Interview')}>
                    Mời phỏng vấn
                  </Button>
                )}
                <Button disabled={reviewing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleReview('Accepted')}>
                  {reviewing ? 'Đang xử lý...' : 'Chấp nhận'}
                </Button>
                <Button variant="outline" disabled={reviewing}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleReview('Rejected')}>
                  Từ chối
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
