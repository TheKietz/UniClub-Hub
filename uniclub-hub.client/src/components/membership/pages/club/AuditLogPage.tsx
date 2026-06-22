import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubAuditLogs, suggestClubMembers } from '@/components/membership/services/clubApi'
import type { ClubAuditLogItem } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { UserSearchCombobox } from '@/components/shared/UserSearchCombobox'

const D = {
  border: '1.5px solid var(--c-ink)', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  ink: 'var(--c-ink)', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: 'var(--c-bg)', card: '#ffffff', indigo: '#4f46e5',
}

const MODULE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'CLB', label: 'CLB' },
  { value: 'Thành viên', label: 'Thành viên' },
  { value: 'Ban bộ phận', label: 'Ban bộ phận' },
  { value: 'Đơn đăng ký', label: 'Đơn đăng ký' },
]
const ACTION_OPTIONS = [
  { value: '', label: 'Mọi hành động' },
  { value: 'Create', label: '+ Tạo mới' },
  { value: 'Update', label: '✎ Cập nhật' },
  { value: 'Delete', label: '✕ Xóa' },
]
const DATE_OPTIONS = [
  { value: '', label: 'Mọi thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
]

function getDateRange(preset: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }
  return {}
}

const ACTION_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  Create: { label: '+ Tạo mới',  bg: '#d1fae5', color: '#065f46' },
  Update: { label: '✎ Cập nhật', bg: '#dbeafe', color: '#1e40af' },
  Delete: { label: '✕ Xóa',      bg: '#fee2e2', color: '#991b1b' },
}

const MODULE_STYLE: Record<string, { bg: string; color: string }> = {
  'CLB':         { bg: '#ede9fe', color: '#5b21b6' },
  'Thành viên':  { bg: '#d1fae5', color: '#065f46' },
  'Ban bộ phận': { bg: '#dbeafe', color: '#1e40af' },
  'Đơn đăng ký': { bg: '#fef3c7', color: '#92400e' },
}

function formatDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hôm nay'
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function groupByDate(logs: ClubAuditLogItem[]) {
  const result: { label: string; dateKey: string; items: ClubAuditLogItem[] }[] = []
  for (const log of logs) {
    const dateKey = new Date(log.timestamp).toDateString()
    const last = result[result.length - 1]
    if (last?.dateKey === dateKey) {
      last.items.push(log)
    } else {
      result.push({ label: formatDateLabel(log.timestamp), dateKey, items: [log] })
    }
  }
  return result
}

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
  const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const bg = colors[name.charCodeAt(0) % colors.length]
  return url
    ? <img src={url} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: D.borderLight }} alt="" />
    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
}

export default function AuditLogPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [logs, setLogs] = useState<ClubAuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [datePreset, setDatePreset] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageSize = 20

  const dateRange = getDateRange(datePreset)

  useEffect(() => {
    setLoading(true)
    setLogs([])
    setPage(1)
    getClubAuditLogs(id, {
      module: module || undefined,
      action: action || undefined,
      search: search || undefined,
      ...dateRange,
      page: 1, pageSize,
    })
      .then(res => { setLogs(res.items); setTotal(res.totalCount) })
      .catch(() => toast.error('Không thể tải lịch sử thay đổi.'))
      .finally(() => setLoading(false))
  }, [id, module, action, datePreset, search])

  function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    getClubAuditLogs(id, {
      module: module || undefined,
      action: action || undefined,
      search: search || undefined,
      ...dateRange,
      page: nextPage, pageSize,
    })
      .then(res => { setLogs(prev => [...prev, ...res.items]); setPage(nextPage) })
      .catch(() => toast.error('Tải thêm thất bại.'))
      .finally(() => setLoadingMore(false))
  }

  const hasFilter = module !== '' || action !== '' || datePreset !== '' || search !== ''
  function clearFilters() {
    setModule(''); setAction(''); setDatePreset(''); setSearch(''); setSearchInput('')
  }

  const grouped = groupByDate(logs)

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Lịch sử thay đổi</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Ghi lại mọi thao tác trên CLB — ai làm gì, lúc nào</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <UserSearchCombobox
          value={searchInput}
          onChange={v => setSearchInput(v)}
          onSelect={name => { setSearchInput(name); setSearch(name) }}
          onClear={() => { setSearchInput(''); setSearch('') }}
          fetchSuggestions={q => suggestClubMembers(id, q)}
          placeholder="Tìm người thực hiện..."
          style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
        />
        <FilterSelect value={module} onChange={setModule} options={MODULE_OPTIONS} style={{ width: 160 }} />
        <FilterSelect value={action} onChange={setAction} options={ACTION_OPTIONS} style={{ width: 160 }} />
        <FilterSelect value={datePreset} onChange={setDatePreset} options={DATE_OPTIONS} style={{ width: 150 }} />
        {hasFilter && (
          <button onClick={clearFilters} style={{ padding: '0 14px', height: 36, borderRadius: 8, fontSize: 12, fontWeight: 700, border: D.borderLight, background: D.card, color: D.inkMuted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Xoá lọc
          </button>
        )}
        <span style={{ fontSize: 12, color: D.inkMuted, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{total} bản ghi</span>
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', color: D.inkMuted, padding: '64px 0', fontSize: 13 }}>Đang tải...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📋</p>
          <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>Chưa có lịch sử thay đổi nào.</p>
        </div>
      ) : (
        <div>
          {grouped.map(group => (
            <div key={group.dateKey} style={{ marginBottom: 28 }}>
              {/* Date separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.ink, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: D.ink, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {group.label}
                </span>
                <div style={{ flex: 1, height: 1, background: '#e8e3d6' }} />
              </div>

              {/* Items with vertical line */}
              <div style={{ marginLeft: 4, borderLeft: '2px solid #e8e3d6', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(log => {
                  const actionStyle = ACTION_STYLE[log.action] ?? ACTION_STYLE.Update
                  const modStyle = MODULE_STYLE[log.module] ?? { bg: D.bg, color: D.inkMuted }
                  return (
                    <div key={log.id} style={{ position: 'relative' }}>
                      {/* Dot centered on the vertical line */}
                      <div style={{
                        position: 'absolute',
                        left: -29, top: '50%', transform: 'translateY(-50%)',
                        width: 12, height: 12, borderRadius: '50%',
                        background: actionStyle.color,
                        border: `2.5px solid ${D.bg}`,
                      }} />
                      {/* Card */}
                      <div style={{
                        background: D.card, borderRadius: 10, border: D.borderLight,
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <Avatar name={log.userName} url={log.userAvatarUrl} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: D.ink, fontSize: 13, flexShrink: 0 }}>{log.userName}</span>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: actionStyle.bg, color: actionStyle.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {actionStyle.label}
                          </span>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: modStyle.bg, color: modStyle.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {log.module}
                          </span>
                          {log.entityTitle && (
                            <span style={{ fontSize: 13, color: D.inkDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                              "{log.entityTitle}"
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: D.inkMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <LoadMoreBar
        shown={logs.length}
        total={total}
        loading={loadingMore}
        onLoadMore={loadMore}
        label="bản ghi"
      />
    </div>
  )
}
