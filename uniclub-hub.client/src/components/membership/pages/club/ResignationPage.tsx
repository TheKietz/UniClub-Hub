import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubResignations, reviewClubResignation } from '@/components/membership/services/clubApi'
import type { ResignationRequestItem, ReviewResignationDto } from '@/components/membership/services/club.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Clock, CheckCircle2, XCircle, Search } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  Pending:  { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309', icon: Clock },
  Approved: { label: 'Đã duyệt',  bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  Rejected: { label: 'Từ chối',   bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
]

export default function ResignationPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [requests, setRequests] = useState<ResignationRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<ResignationRequestItem | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    getClubResignations(id)
      .then(setRequests)
      .catch(() => toast.error('Không thể tải danh sách đơn từ chức.'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  async function handleReview(status: 'Approved' | 'Rejected') {
    if (!selected) return
    setReviewing(true)
    try {
      const dto: ReviewResignationDto = { status, reviewNote: reviewNote || undefined }
      await reviewClubResignation(id, selected.id, dto)
      toast.success(status === 'Approved' ? 'Đã chấp thuận đơn từ chức.' : 'Đã từ chối đơn.')
      setSelected(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    } finally {
      setReviewing(false)
    }
  }

  const filtered = requests.filter(r => !statusFilter || r.status === statusFilter)
  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Đơn từ chức</h1>
        <p className="text-sm text-gray-400 mt-0.5">{requests.length} đơn tổng cộng</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
            {tab.value && counts[tab.value] ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{counts[tab.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Họ tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Nguyện vọng</TableHead>
              <TableHead>Ngày gửi</TableHead>
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
                    <p className="text-sm">Chưa có đơn từ chức.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status]
              const Icon = cfg?.icon ?? Clock
              return (
                <TableRow key={r.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <p className="font-medium text-sm text-gray-900">{r.fullName ?? '—'}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {r.clubRole === 'DEPT_LEAD' ? 'Trưởng ban' : r.clubRole}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {r.preference === 'LeaveClub' ? 'Rời CLB hoàn toàn' : 'Thành viên thường'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {new Date(r.requestedAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    {cfg && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={11} />{cfg.label}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm"
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={() => { setSelected(r); setReviewNote('') }}>
                      {r.status === 'Pending' ? 'Xem & duyệt' : 'Chi tiết'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail / review dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đơn từ chức — {selected?.fullName ?? selected?.email}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="text-gray-500">Email: <span className="text-gray-800">{selected.email}</span></p>
                {selected.studentId && <p className="text-gray-500">MSSV: <span className="text-gray-800">{selected.studentId}</span></p>}
                <p className="text-gray-500">Nguyện vọng: <span className="text-gray-800 font-medium">
                  {selected.preference === 'LeaveClub' ? 'Rời CLB hoàn toàn' : 'Trở thành thành viên thường'}
                </span></p>
                <p className="text-gray-500">Ngày gửi: <span className="text-gray-800">{new Date(selected.requestedAt).toLocaleDateString('vi-VN')}</span></p>
              </div>

              {(selected.status === 'Approved' || selected.status === 'Rejected') && (
                <div className="rounded-lg border px-4 py-3 text-sm"
                  style={{
                    borderColor: selected.status === 'Approved' ? '#bbf7d0' : '#fecaca',
                    background: selected.status === 'Approved' ? '#f0fdf4' : '#fff1f2',
                  }}>
                  <p className="font-medium" style={{ color: selected.status === 'Approved' ? '#15803d' : '#b91c1c' }}>
                    {selected.status === 'Approved' ? 'Đã chấp thuận' : 'Đã từ chối'}
                  </p>
                  {selected.reviewedAt && <p className="text-gray-400 text-xs mt-0.5">{new Date(selected.reviewedAt).toLocaleString('vi-VN')}</p>}
                  {selected.reviewNote && <p className="text-gray-700 mt-1 whitespace-pre-wrap">{selected.reviewNote}</p>}
                </div>
              )}

              {selected.status === 'Pending' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ghi chú phản hồi <span className="text-gray-400 normal-case font-normal">(tuỳ chọn)</span></p>
                  <textarea rows={3} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                    placeholder="Lý do từ chối hoặc ghi chú..."
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {selected?.status === 'Pending' && (
              <>
                <Button disabled={reviewing} onClick={() => handleReview('Approved')}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  {reviewing ? 'Đang xử lý...' : 'Chấp thuận'}
                </Button>
                <Button variant="outline" disabled={reviewing} onClick={() => handleReview('Rejected')}
                  className="border-red-200 text-red-600 hover:bg-red-50">
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
