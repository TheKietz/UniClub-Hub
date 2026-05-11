import { APPLICATION_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApplications, reviewApplication } from '@/components/membership/services/clubApi'
import type { ApplicationItem } from '@/components/membership/services/club.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Interview', label: 'Phỏng vấn' },
  { value: 'Accepted', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
]

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Pending: { label: 'Chờ duyệt', variant: 'outline' },
  Interview: { label: 'Phỏng vấn', variant: 'secondary' },
  Accepted: { label: 'Đã duyệt', variant: 'default' },
  Rejected: { label: 'Từ chối', variant: 'destructive' },
}

export default function ApplicationsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
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
      toast.success(`Đã cập nhật trạng thái: ${STATUS_BADGE[status]?.label ?? status}`)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    }
  }

  return (
    <div className="px-8 pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Đơn đăng ký</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === opt.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : applications.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Không có đơn nào.</TableCell></TableRow>
            ) : applications.map(app => {
              const badge = STATUS_BADGE[app.status]
              const isPending = app.status === APPLICATION_STATUS.PENDING || app.status === APPLICATION_STATUS.INTERVIEW
              return (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.fullName ?? '—'}</TableCell>
                  <TableCell className="text-gray-600">{app.email ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{app.studentId ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                  </TableCell>
                  <TableCell>
                    {isPending && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {app.status === APPLICATION_STATUS.PENDING && (
                            <DropdownMenuItem onClick={() => handleReview(app.id, 'Interview')}>
                              Chuyển sang phỏng vấn
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleReview(app.id, 'Accepted')}>
                            Duyệt
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleReview(app.id, 'Rejected')}>
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
