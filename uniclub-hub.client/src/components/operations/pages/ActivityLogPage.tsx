import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Plus, ArrowRightLeft, Trash2, Download, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuditLogs } from '../services/operationsApi'
import type { AuditLogItem } from '../services/operations.types'

/* ─── Config ──────────────────────────────────────────────────────────────── */

type AuditAction = AuditLogItem['action']

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: React.ReactNode; iconBg: string; iconColor: string }> = {
  Create: { label: 'tạo mới',    icon: <Plus size={14} />,           iconBg: 'bg-emerald-500', iconColor: 'text-white' },
  Update: { label: 'cập nhật',   icon: <ArrowRightLeft size={14} />, iconBg: 'bg-blue-500',    iconColor: 'text-white' },
  Delete: { label: 'xóa',        icon: <Trash2 size={14} />,         iconBg: 'bg-red-400',     iconColor: 'text-white' },
}

const MODULE_LABELS: Record<string, string> = {
  Tasks:   'Công việc',
  Events:  'Sự kiện',
  Sprints: 'Sprint',
}

const MODULES = ['Tasks', 'Events', 'Sprints']

const STATUS_DISPLAY: Record<string, string> = {
  Todo:  'Cần làm',
  Doing: 'Đang làm',
  Done:  'Hoàn thành',
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function isYesterday(iso: string): boolean {
  const d = new Date(iso)
  const y = new Date(); y.setDate(y.getDate() - 1)
  return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear()
}

function dateGroupLabel(iso: string): string {
  if (isToday(iso)) return 'HÔM NAY'
  if (isYesterday(iso)) return 'HÔM QUA'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function parseStatus(json?: string): string | undefined {
  if (!json) return undefined
  try {
    const obj = JSON.parse(json) as Record<string, string>
    return obj['Status'] ?? obj['status']
  } catch {
    return undefined
  }
}

function buildSubText(entry: AuditLogItem): { badge?: string; from?: string; to?: string; plain?: string } | null {
  const moduleLabel = MODULE_LABELS[entry.module] ?? entry.module

  if (entry.action === 'Update' && entry.module === 'Tasks') {
    const oldStatus = parseStatus(entry.oldValue)
    const newStatus = parseStatus(entry.newValue)
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return {
        from: STATUS_DISPLAY[oldStatus] ?? oldStatus,
        to: STATUS_DISPLAY[newStatus] ?? newStatus,
      }
    }
  }

  return { badge: `Module: ${moduleLabel}` }
}

const STATUS_PILL: Record<string, string> = {
  'Cần làm':    'bg-gray-100 text-gray-600',
  'Đang làm':   'bg-blue-100 text-blue-700',
  'Hoàn thành': 'bg-emerald-100 text-emerald-700',
}

/* ─── Entry card ──────────────────────────────────────────────────────────── */

function EntryCard({ entry }: { entry: AuditLogItem }) {
  const cfg    = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.Update
  const sub    = buildSubText(entry)
  const module = MODULE_LABELS[entry.module] ?? entry.module
  const verb   = entry.action === 'Create'
    ? `đã tạo ${module} mới`
    : entry.action === 'Delete'
      ? `đã xóa ${module}`
      : `đã chuyển trạng thái ${module}`

  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b last:border-0 hover:bg-gray-50/60 transition-colors">
      {/* Action icon */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconBg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">
          <span className="font-semibold">{entry.userName}</span>
          {' '}{verb}{' '}
          {entry.entityTitle && (
            <span className="font-semibold text-indigo-600">"{entry.entityTitle}"</span>
          )}
        </p>

        {sub && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {sub.badge && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sub.badge}</span>
            )}
            {sub.from && sub.to && (
              <>
                <span className="text-xs text-gray-500">Từ</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[sub.from] ?? 'bg-gray-100 text-gray-600'}`}>
                  {sub.from}
                </span>
                <span className="text-xs text-gray-400">sang</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[sub.to] ?? 'bg-gray-100 text-gray-600'}`}>
                  {sub.to}
                </span>
              </>
            )}
            {sub.plain && <span className="text-xs text-gray-500">{sub.plain}</span>}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">
        {formatRelative(entry.timestamp)}
      </span>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function ActivityLogPage() {
  const [searchParams] = useSearchParams()
  const clubId = Number(searchParams.get('clubId') ?? 1)

  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const PAGE_SIZE = 50

  const load = useCallback(async (nextPage: number, append: boolean) => {
    if (nextPage === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const result = await getAuditLogs({
        clubId,
        module: moduleFilter || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setLogs(prev => append ? [...prev, ...result.items] : result.items)
      setHasMore(nextPage < result.totalPages)
      setPage(nextPage)
    } catch {
      toast.error('Không thể tải nhật ký hoạt động')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [clubId, moduleFilter])

  useEffect(() => { load(1, false) }, [load])

  const displayed = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(l =>
      l.userName.toLowerCase().includes(q) ||
      l.entityTitle?.toLowerCase().includes(q) ||
      (MODULE_LABELS[l.module] ?? l.module).toLowerCase().includes(q)
    )
  }, [logs, search])

  // Group by date label
  const groups = useMemo(() => {
    const map = new Map<string, AuditLogItem[]>()
    for (const entry of displayed) {
      const label = dateGroupLabel(entry.timestamp)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(entry)
    }
    return [...map.entries()]
  }, [displayed])

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi các thay đổi và thao tác trên toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Module filter */}
          <div className="relative">
            <select
              aria-label="Lọc module"
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="">Tất cả Module</option>
              {MODULES.map(m => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600">
            <Download size={14} />
            Export Log
          </Button>

          <Button variant="outline" size="sm" onClick={() => load(1, false)} disabled={loading} title="Làm mới">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Tìm kiếm theo người dùng, đối tượng hoặc nội dung..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-gray-400"
        />
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Đang tải...</div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            {search ? 'Không tìm thấy kết quả' : 'Chưa có hoạt động nào'}
          </div>
        ) : (
          <>
            {groups.map(([label, entries]) => (
              <div key={label}>
                {/* Date group header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/80 border-b">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                </div>

                {/* Entries */}
                {entries.map(entry => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-5 border-t">
                <button
                  type="button"
                  onClick={() => load(page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Đang tải...' : 'Tải thêm hoạt động'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
