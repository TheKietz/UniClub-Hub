import { APPLICATION_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApplications, reviewApplication } from '@/components/membership/services/clubApi'
import type { ApplicationItem } from '@/components/membership/services/club.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, Search, Clock, MessageCircle, CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Pending:   { label: 'Chờ duyệt',  bg: '#fef3c7', text: '#b45309', icon: Clock },
  Interview: { label: 'Phỏng vấn',  bg: '#dbeafe', text: '#1d4ed8', icon: MessageCircle },
  Accepted:  { label: 'Đã duyệt',   bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
  Rejected:  { label: 'Từ chối',    bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
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

  async function handleReview(appId: number, status: string) {
    try {
      await reviewApplication(id, appId, { status })
      toast.success(`Đã cập nhật: ${STATUS_CONFIG[status]?.label ?? status}`)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
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

  return (
    <div className="px-6 pb-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Đơn đăng ký</h1>
        <p className="text-sm text-gray-400 mt-0.5">{applications.length} đơn tổng cộng</p>
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
                    {isPending && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {app.status === APPLICATION_STATUS.PENDING && (
                            <DropdownMenuItem onClick={() => handleReview(app.id, 'Interview')}>
                              Chuyển sang phỏng vấn
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleReview(app.id, 'Accepted')}>
                            Duyệt chấp nhận
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600"
                            onClick={() => handleReview(app.id, 'Rejected')}>
                            Từ chối
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
