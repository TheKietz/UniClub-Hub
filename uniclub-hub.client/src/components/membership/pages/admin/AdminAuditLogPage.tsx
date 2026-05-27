import { useEffect, useState } from 'react'
import { getAdminAuditLogs, getUsers } from '@/components/membership/services/adminApi'
import type { ClubAuditLogItem } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { UserSearchCombobox } from '@/components/shared/UserSearchCombobox'

const D = {
  border: '1.5px solid #15131a', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: '#f7f6f1', card: '#ffffff', indigo: '#4f46e5',
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

const thS: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  fontWeight: 700, color: D.inkMuted, letterSpacing: '.04em',
  whiteSpace: 'nowrap', textTransform: 'uppercase',
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
  const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const bg = colors[name.charCodeAt(0) % colors.length]
  return url
    ? <img src={url} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: D.borderLight }} alt="" />
    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
}

export default function AdminAuditLogPage() {
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
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const pageSize = 20

  const dateRange = getDateRange(datePreset)

  useEffect(() => {
    setLoading(true)
    setLogs([])
    setPage(1)
    getAdminAuditLogs({
      module: module || undefined,
      action: action || undefined,
      search: search || undefined,
      ...dateRange,
      page: 1, pageSize,
    })
      .then(res => { setLogs(res.items); setTotal(res.totalCount) })
      .catch(() => toast.error('Không thể tải lịch sử thay đổi.'))
      .finally(() => setLoading(false))
  }, [module, action, datePreset, search])

  function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    getAdminAuditLogs({
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

  async function fetchSuggestions(q: string) {
    const result = await getUsers({ search: q, page: 1, pageSize: 8 })
    return result.items.map(u => ({ id: u.id, name: u.fullName ?? u.email, avatarUrl: u.avatarUrl }))
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Lịch sử thay đổi hệ thống</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Toàn bộ hoạt động trên tất cả CLB</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <UserSearchCombobox
          value={searchInput}
          onChange={v => setSearchInput(v)}
          onSelect={name => { setSearchInput(name); setSearch(name) }}
          onClear={() => { setSearchInput(''); setSearch('') }}
          fetchSuggestions={fetchSuggestions}
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

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={thS}>Người thực hiện</th>
              <th style={thS}>Hành động</th>
              <th style={thS}>Loại</th>
              <th style={thS}>Đối tượng</th>
              <th style={thS}>CLB</th>
              <th style={{ ...thS, textAlign: 'right' }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0', fontSize: 13 }}>Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>📋</p>
                  <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>Chưa có lịch sử thay đổi nào.</p>
                </td>
              </tr>
            ) : logs.map(log => {
              const action = ACTION_STYLE[log.action] ?? ACTION_STYLE.Update
              const modStyle = MODULE_STYLE[log.module] ?? { bg: D.bg, color: D.inkMuted }
              return (
                <tr key={log.id}
                  onMouseEnter={() => setHoverRow(log.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: hoverRow === log.id ? D.bg : D.card, borderBottom: D.borderLight }}>
                  {/* Người thực hiện */}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={log.userName} url={log.userAvatarUrl} />
                      <span style={{ fontWeight: 600, color: D.ink, fontSize: 13 }}>{log.userName}</span>
                    </div>
                  </td>
                  {/* Hành động */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-flex', padding: '3px 10px', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                      background: action.bg, color: action.color,
                    }}>
                      {action.label}
                    </span>
                  </td>
                  {/* Loại */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-flex', padding: '3px 10px', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                      background: modStyle.bg, color: modStyle.color,
                    }}>
                      {log.module}
                    </span>
                  </td>
                  {/* Đối tượng */}
                  <td style={{ padding: '11px 14px', color: D.ink, fontWeight: 500, maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.entityTitle ?? <span style={{ color: D.inkMuted }}>—</span>}
                    </span>
                  </td>
                  {/* CLB */}
                  <td style={{ padding: '11px 14px' }}>
                    {log.clubName
                      ? <span style={{ fontSize: 12, fontWeight: 600, color: D.indigo }}>{log.clubName}</span>
                      : <span style={{ color: D.inkMuted }}>—</span>
                    }
                  </td>
                  {/* Thời gian */}
                  <td style={{ padding: '11px 14px', textAlign: 'right', color: D.inkMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {timeAgo(log.timestamp)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
