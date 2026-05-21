import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubAuditLogs } from '@/components/membership/services/clubApi'
import type { ClubAuditLogItem } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { History, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MODULES = ['Tất cả', 'CLB', 'Thành viên', 'Ban bộ phận', 'Đơn đăng ký']

const ACTION_STYLE: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  Create: { label: 'Tạo mới',  icon: Plus,   cls: 'bg-green-50 text-green-700 border-green-200' },
  Update: { label: 'Cập nhật', icon: Pencil,  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  Delete: { label: 'Xóa',      icon: Trash2,  cls: 'bg-red-50 text-red-700 border-red-200' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
  return url
    ? <img src={url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
    : <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">{initials}</div>
}

export default function AuditLogPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [logs, setLogs] = useState<ClubAuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [module, setModule] = useState('Tất cả')
  const [loading, setLoading] = useState(true)

  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    getClubAuditLogs(id, {
      module: module === 'Tất cả' ? undefined : module,
      page,
      pageSize,
    })
      .then(res => { setLogs(res.items); setTotal(res.totalCount) })
      .catch(() => toast.error('Không thể tải lịch sử thay đổi.'))
      .finally(() => setLoading(false))
  }, [id, module, page])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Lịch sử thay đổi</h1>
        <p className="text-sm text-gray-400 mt-0.5">Ghi lại mọi thao tác trên CLB — ai làm gì, lúc nào</p>
      </div>

      {/* Module filter */}
      <div className="flex gap-2 flex-wrap items-center">
        {MODULES.map(m => (
          <button
            key={m}
            onClick={() => { setModule(m); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              module === m
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {m}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{total} bản ghi</span>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
            <History size={36} className="text-gray-200" />
            <p className="text-sm">Chưa có lịch sử thay đổi nào.</p>
          </div>
        ) : logs.map(log => {
          const action = ACTION_STYLE[log.action] ?? ACTION_STYLE.Update
          const Icon = action.icon
          return (
            <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <Avatar name={log.userName} url={log.userAvatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{log.userName}</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${action.cls}`}>
                    <Icon size={10} />
                    {action.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                    {log.module}
                  </span>
                  {log.entityTitle && (
                    <span className="text-sm text-gray-600">
                      — <span className="font-medium">{log.entityTitle}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(log.timestamp)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
