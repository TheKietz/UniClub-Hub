import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Plus, ArrowRightLeft, Trash2, Search } from 'lucide-react'
import { getAuditLogs } from '../services/operationsApi'
import type { AuditLogItem } from '../services/operations.types'
import { FilterSelect } from '@/components/shared/FilterSelect'
import ExportReportButton from '../components/ExportReportButton'
import { D } from '@/components/shared/managementTheme'

/* ── Design tokens ─────────────────────────────────────────────────────────── */

/* ─── Config ───────────────────────────────────────────────────────────────── */

type AuditAction = AuditLogItem['action']

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: React.ReactNode; iconBg: string; color: string }> = {
  Create: { label: 'tạo mới',  icon: <Plus size={14} />,           iconBg: '#d1fae5', color: D.emerald },
  Update: { label: 'cập nhật', icon: <ArrowRightLeft size={14} />, iconBg: '#dbeafe', color: '#2563eb' },
  Delete: { label: 'xóa',      icon: <Trash2 size={14} />,         iconBg: '#fee2e2', color: D.red },
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

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function isToday(iso: string): boolean {
  const d = new Date(iso); const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function isYesterday(iso: string): boolean {
  const d = new Date(iso); const y = new Date(); y.setDate(y.getDate() - 1)
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
  } catch { return undefined }
}

function buildSubText(entry: AuditLogItem): { badge?: string; from?: string; to?: string } | null {
  const moduleLabel = MODULE_LABELS[entry.module] ?? entry.module
  if (entry.action === 'Update' && entry.module === 'Tasks') {
    const oldStatus = parseStatus(entry.oldValue)
    const newStatus = parseStatus(entry.newValue)
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return {
        from: STATUS_DISPLAY[oldStatus] ?? oldStatus,
        to:   STATUS_DISPLAY[newStatus] ?? newStatus,
      }
    }
  }
  return { badge: `Module: ${moduleLabel}` }
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  'Cần làm':    { bg: '#f3f4f6', color: D.inkDim },
  'Đang làm':   { bg: '#dbeafe', color: '#1e40af' },
  'Hoàn thành': { bg: '#d1fae5', color: '#065f46' },
}

/* ─── Entry row ────────────────────────────────────────────────────────────── */

function EntryRow({ entry }: { entry: AuditLogItem }) {
  const [hovered, setHovered] = useState(false)
  const cfg    = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.Update
  const sub    = buildSubText(entry)
  const module = MODULE_LABELS[entry.module] ?? entry.module
  const verb   = entry.action === 'Create'
    ? `đã tạo ${module} mới`
    : entry.action === 'Delete'
      ? `đã xóa ${module}`
      : `đã chuyển trạng thái ${module}`

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 20px', borderBottom: D.borderLight,
        background: hovered ? D.bg : D.card, transition: 'background .1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: cfg.iconBg, border: D.borderLight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: cfg.color, marginTop: 2,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: D.inkDim, lineHeight: 1.5, margin: 0 }}>
          <span style={{ fontWeight: 700, color: D.ink }}>{entry.userName}</span>
          {' '}{verb}{' '}
          {entry.entityTitle && (
            <span style={{ fontWeight: 700, color: D.indigo }}>"{entry.entityTitle}"</span>
          )}
        </p>

        {sub && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {sub.badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                background: D.bg, color: D.inkMuted, border: D.borderLight,
                borderRadius: 4,
              }}>
                {sub.badge}
              </span>
            )}
            {sub.from && sub.to && (
              <>
                <span style={{ fontSize: 11, color: D.inkMuted }}>Từ</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  border: D.borderLight, borderRadius: 4,
                  background: STATUS_PILL[sub.from]?.bg ?? D.bg,
                  color: STATUS_PILL[sub.from]?.color ?? D.inkDim,
                }}>
                  {sub.from}
                </span>
                <span style={{ fontSize: 11, color: D.inkMuted }}>sang</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  border: D.borderLight, borderRadius: 4,
                  background: STATUS_PILL[sub.to]?.bg ?? D.bg,
                  color: STATUS_PILL[sub.to]?.color ?? D.inkDim,
                }}>
                  {sub.to}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span style={{ fontSize: 11, color: D.inkMuted, flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
        {formatRelative(entry.timestamp)}
      </span>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function ActivityLogPage() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const clubId = Number(clubIdParam ?? 1)

  const [logs, setLogs]               = useState<AuditLogItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]               = useState(1)
  const [hasMore, setHasMore]         = useState(false)
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [search, setSearch]           = useState('')

  const PAGE_SIZE = 50

  const load = useCallback(async (nextPage: number, append: boolean) => {
    if (nextPage === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const result = await getAuditLogs({
        clubId, module: moduleFilter || undefined, page: nextPage, pageSize: PAGE_SIZE,
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
    <div className="rsp-page" style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>
            Nhật ký hoạt động
          </h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            Theo dõi các thay đổi và thao tác trên toàn hệ thống.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Module filter */}
          <FilterSelect
            value={moduleFilter}
            onChange={setModuleFilter}
            options={[
              { value: '', label: 'Tất cả module' },
              ...MODULES.map(m => ({ value: m, label: MODULE_LABELS[m] })),
            ]}
            style={{ width: 170 }}
          />

          <ExportReportButton clubId={clubId} variant="audit" />

          <button
            type="button"
            onClick={() => load(1, false)}
            disabled={loading}
            title="Làm mới"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: D.card, color: D.inkDim, border: D.border,
              boxShadow: D.shadow(2, 2), padding: '8px 12px',
              borderRadius: D.pill, fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{
        padding: '10px 14px', borderRadius: D.radius,
        background: D.card, border: D.border, boxShadow: D.shadow(),
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
      }}>
        <Search size={15} style={{ color: D.inkMuted, flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Tìm kiếm theo người dùng, đối tượng hoặc nội dung..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, height: 32, border: 'none', outline: 'none',
            fontSize: 13, color: D.ink, background: 'transparent',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Timeline */}
      <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: D.inkMuted, fontSize: 13 }}>
            Đang tải...
          </div>
        ) : groups.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, color: D.inkMuted }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>📋</p>
            <p style={{ fontSize: 13, margin: 0 }}>{search ? 'Không tìm thấy kết quả' : 'Chưa có hoạt động nào'}</p>
          </div>
        ) : (
          <>
            {groups.map(([label, entries]) => (
              <div key={label}>
                {/* Date group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', background: D.bg, borderBottom: D.borderLight,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.indigo, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {label}
                  </span>
                </div>

                {/* Entries */}
                {entries.map(entry => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', borderTop: D.borderLight }}>
                <button
                  type="button"
                  onClick={() => load(page + 1, true)}
                  disabled={loadingMore}
                  style={{
                    background: D.card, color: D.inkDim, border: D.border,
                    boxShadow: D.shadow(2, 2), padding: '8px 24px',
                    borderRadius: D.pill, fontSize: 12, fontWeight: 600,
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: loadingMore ? 0.6 : 1,
                  }}
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
