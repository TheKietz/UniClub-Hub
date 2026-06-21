import { useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { getAdminResignations, reviewAdminResignation } from '@/components/membership/services/clubApi'
import type { ResignationRequestItem, ReviewResignationDto } from '@/components/membership/services/club.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  Pending:  { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309' },
  Approved: { label: 'Đã duyệt',  bg: '#d1fae5', color: '#065f46' },
  Rejected: { label: 'Từ chối',   bg: '#fee2e2', color: '#991b1b' },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
]

export default function AdminResignationPage() {
  const [requests, setRequests] = useState<ResignationRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<ResignationRequestItem | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [hoverRow, setHoverRow] = useState<number | null>(null)

  useDeferredEffect(() => {
    setLoading(true)
    getAdminResignations()
      .then(setRequests)
      .catch(() => toast.error('Không thể tải danh sách đơn từ chức.'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  async function handleReview(status: 'Approved' | 'Rejected') {
    if (!selected) return
    setReviewing(true)
    try {
      const dto: ReviewResignationDto = { status, reviewNote: reviewNote || undefined }
      await reviewAdminResignation(selected.id, dto)
      toast.success(status === 'Approved' ? 'Đã chấp thuận đơn từ chức.' : 'Đã từ chối đơn.')
      setSelected(null)
      setRefreshKey(k => k + 1)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại.'))
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
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Đơn từ chức Trưởng CLB</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{requests.length} đơn tổng cộng</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {STATUS_TABS.map(tab => {
          const active = statusFilter === tab.value
          const c = tab.value ? (counts[tab.value] ?? 0) : requests.length
          return (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '7px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 700,
                border: D.border, cursor: 'pointer', fontFamily: 'inherit',
                background: active ? D.ink : D.card,
                color: active ? D.lemon : D.ink,
                boxShadow: active ? 'none' : D.shadow(2, 2),
                transform: active ? 'translate(2px,2px)' : 'none',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .12s',
              }}>
              {tab.label}
              {c > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: D.pill, fontWeight: 800,
                  background: active ? 'rgba(255,255,255,.2)' : D.bg,
                  color: active ? D.lemon : D.inkMuted,
                }}>{c}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Họ tên</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>CLB</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Nguyện vọng</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Ngày gửi</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: D.inkMuted, padding: '48px 0' }}>
                  Chưa có đơn từ chức nào.
                </td>
              </tr>
            ) : filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status]
              return (
                <tr key={r.id}
                  onMouseEnter={() => setHoverRow(r.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: hoverRow === r.id ? D.bg : D.card, borderBottom: D.borderLight }}>
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ fontWeight: 700, color: D.ink, margin: 0 }}>{r.fullName ?? '—'}</p>
                    <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>{r.email}</p>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: D.inkDim }}>{r.clubName}</td>
                  <td style={{ padding: '12px 14px', color: D.inkDim }}>
                    {r.preference === 'LeaveClub' ? 'Rời CLB hoàn toàn' : 'Thành viên thường'}
                  </td>
                  <td style={{ padding: '12px 14px', color: D.inkMuted }}>
                    {new Date(r.requestedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {cfg && (
                      <span style={{
                        display: 'inline-flex', padding: '2px 10px', borderRadius: 4, fontSize: 10,
                        fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                        background: cfg.bg, color: cfg.color,
                      }}>
                        {cfg.label}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => { setSelected(r); setReviewNote('') }}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: D.borderLight, background: D.card, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {r.status === 'Pending' ? 'Duyệt' : 'Xem'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail / Review dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 17 }}>Đơn từ chức — {selected?.fullName ?? selected?.email}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <div style={{ background: D.bg, borderRadius: 10, padding: '12px 16px', border: D.borderLight, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>CLB: <strong style={{ color: D.ink }}>{selected.clubName}</strong></p>
                <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>Email: <span style={{ color: D.ink }}>{selected.email}</span></p>
                {selected.studentId && <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>MSSV: <span style={{ color: D.ink }}>{selected.studentId}</span></p>}
                <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>Nguyện vọng: <strong style={{ color: D.ink }}>{selected.preference === 'LeaveClub' ? 'Rời CLB hoàn toàn' : 'Trở thành thành viên thường'}</strong></p>
                <p style={{ fontSize: 13, color: D.inkDim, margin: 0 }}>Ngày gửi: <span style={{ color: D.ink }}>{new Date(selected.requestedAt).toLocaleDateString('vi-VN')}</span></p>
              </div>

              {(selected.status === 'Approved' || selected.status === 'Rejected') && (
                <div style={{
                  borderRadius: 10, padding: '12px 16px', border: D.borderLight, fontSize: 13,
                  background: selected.status === 'Approved' ? '#f0fdf4' : '#fff1f2',
                  borderColor: selected.status === 'Approved' ? '#bbf7d0' : '#fecaca',
                }}>
                  <p style={{ fontWeight: 700, margin: 0, color: selected.status === 'Approved' ? '#065f46' : '#991b1b' }}>
                    {selected.status === 'Approved' ? 'Đã chấp thuận' : 'Đã từ chối'}
                  </p>
                  {selected.reviewedAt && <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>{new Date(selected.reviewedAt).toLocaleString('vi-VN')}</p>}
                  {selected.reviewNote && <p style={{ color: D.inkDim, marginTop: 4, whiteSpace: 'pre-wrap' }}>{selected.reviewNote}</p>}
                </div>
              )}

              {selected.status === 'Pending' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 6 }}>
                    Ghi chú phản hồi <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(tuỳ chọn)</span>
                  </label>
                  <textarea rows={3} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                    placeholder="Lý do từ chối hoặc ghi chú..."
                    style={{ width: '100%', border: D.borderLight, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: D.ink, background: D.bg, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>
          )}
          <DialogFooter style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8 }}>
            {selected?.status === 'Pending' && (
              <>
                <button disabled={reviewing} onClick={() => handleReview('Approved')}
                  style={{ background: D.emerald, color: '#fff', border: D.border, boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: reviewing ? 'not-allowed' : 'pointer', opacity: reviewing ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {reviewing ? 'Đang xử lý...' : 'Chấp thuận'}
                </button>
                <button disabled={reviewing} onClick={() => handleReview('Rejected')}
                  style={{ background: D.card, color: D.red, border: '1.5px solid #fecaca', boxShadow: D.shadow(2,2), padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700, cursor: reviewing ? 'not-allowed' : 'pointer', opacity: reviewing ? 0.7 : 1, fontFamily: 'inherit' }}>
                  Từ chối
                </button>
              </>
            )}
            <button onClick={() => setSelected(null)}
              style={{ background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2,2), padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
