import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { QRCodeCanvas } from 'qrcode.react'
import { CalendarDays, MapPin, Ticket, Trash2, X } from 'lucide-react'
import { getMyEventRegistrations, cancelMyEventRegistration, type MyEventRegistration } from '@/components/membership/services/userApi'
import { D } from '@/components/shared/managementTheme'

const EVENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  Draft:      { label: 'Sắp diễn ra',  bg: '#dbeafe', color: '#1d4ed8' },
  InProgress: { label: 'Đang diễn ra', bg: '#dcfce7', color: '#15803d' },
  Completed:  { label: 'Đã kết thúc',  bg: '#f3f4f6', color: '#6b7280' },
  Cancelled:  { label: 'Đã hủy',       bg: '#fee2e2', color: '#b91c1c' },
}

const ATTENDANCE: Record<string, { label: string; bg: string; color: string }> = {
  Pending:   { label: 'Chưa điểm danh', bg: '#f3f4f6', color: '#374151' },
  CheckedIn: { label: 'Đã điểm danh',   bg: '#dcfce7', color: '#15803d' },
  Absent:    { label: 'Vắng',           bg: '#fee2e2', color: '#dc2626' },
}

type Filter = 'all' | 'upcoming' | 'ended'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'upcoming', label: 'Sắp & đang diễn ra' },
  { value: 'ended', label: 'Đã kết thúc' },
]

const thS: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', borderBottom: D.borderLight }
const tdS: React.CSSProperties = { padding: '12px 16px', fontSize: 13, verticalAlign: 'middle' }

function fmtRange(start?: string | null, end?: string | null) {
  if (!start) return 'Chưa xác định'
  const s = new Date(start).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!end) return s
  const e = new Date(end).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return s === e ? s : `${s} – ${e}`
}

export default function MyEventsPage() {
  const [items, setItems] = useState<MyEventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [cancelTarget, setCancelTarget] = useState<MyEventRegistration | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [qrTarget, setQrTarget] = useState<MyEventRegistration | null>(null)

  function load() {
    setLoading(true)
    getMyEventRegistrations()
      .then(setItems)
      .catch(() => toast.error('Không thể tải danh sách sự kiện đã tham gia.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Esc để đóng popup mã QR
  useEffect(() => {
    if (!qrTarget) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setQrTarget(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [qrTarget])

  const filtered = useMemo(() => {
    if (filter === 'upcoming') return items.filter(i => i.eventStatus === 'Draft' || i.eventStatus === 'InProgress')
    if (filter === 'ended') return items.filter(i => i.eventStatus === 'Completed' || i.eventStatus === 'Cancelled')
    return items
  }, [items, filter])

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await cancelMyEventRegistration(cancelTarget.eventId)
      setItems(prev => prev.filter(i => i.eventId !== cancelTarget.eventId))
      toast.success('Đã hủy tham gia sự kiện')
      setCancelTarget(null)
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể hủy tham gia'
      toast.error(msg)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Sự kiện của tôi</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Lịch sử các sự kiện bạn đã đăng ký tham gia</p>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.value
          const count = f.value === 'all' ? items.length
            : f.value === 'upcoming' ? items.filter(i => i.eventStatus === 'Draft' || i.eventStatus === 'InProgress').length
            : items.filter(i => i.eventStatus === 'Completed' || i.eventStatus === 'Cancelled').length
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: '7px 14px', borderRadius: D.pill,
              background: active ? D.ink : D.card, color: active ? '#fff' : D.ink,
              border: D.border, boxShadow: active ? 'none' : D.shadow(2, 2),
              transform: active ? 'translate(2px,2px)' : 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .12s',
            }}>
              {f.label}
              <span style={{ padding: '1px 6px', borderRadius: D.pill, fontSize: 10, fontWeight: 800, background: active ? 'rgba(255,255,255,.2)' : D.bg, color: active ? '#fff' : D.inkMuted }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '48px 20px', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>
          Đang tải...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '48px 20px', textAlign: 'center' }}>
          <Ticket size={30} style={{ color: '#c4bfb0', marginBottom: 10 }} />
          <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>
            {items.length === 0 ? 'Bạn chưa đăng ký tham gia sự kiện nào.' : 'Không có sự kiện phù hợp bộ lọc.'}
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: D.bg }}>
                  <th style={thS}>Sự kiện</th>
                  <th style={thS}>Thời gian</th>
                  <th style={thS}>Trạng thái</th>
                  <th style={thS}>Tham gia</th>
                  <th style={thS}>Mã QR</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(reg => {
                  const st = EVENT_STATUS[reg.eventStatus] ?? EVENT_STATUS.Draft
                  const att = ATTENDANCE[reg.attendance] ?? ATTENDANCE.Pending
                  return (
                    <tr key={reg.eventId} style={{ borderBottom: D.borderLight }}>
                      {/* Event */}
                      <td style={{ ...tdS, minWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, flexWrap: 'wrap' }}>
                          {reg.clubId == null ? (
                            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: D.pill, background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5' }}>Toàn trường</span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: D.pill, background: '#ede9fe', color: D.indigo }}>{reg.clubName ?? 'CLB'}</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, color: D.ink, fontSize: 13.5 }}>{reg.eventName}</p>
                        {reg.location && (
                          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: D.inkMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} /> {reg.location}
                          </p>
                        )}
                      </td>
                      {/* Time */}
                      <td style={{ ...tdS, color: D.inkDim, whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CalendarDays size={12} style={{ color: D.inkMuted }} /> {fmtRange(reg.startTime, reg.endTime)}
                        </span>
                      </td>
                      {/* Event status */}
                      <td style={tdS}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: D.pill, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                      </td>
                      {/* Attendance */}
                      <td style={tdS}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: D.pill, background: att.bg, color: att.color, whiteSpace: 'nowrap' }}>{att.label}</span>
                        {reg.attendance === 'CheckedIn' && reg.checkedInAt && (
                          <span style={{ display: 'block', fontSize: 10, color: D.inkMuted, marginTop: 2 }}>
                            {new Date(reg.checkedInAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                      {/* QR thumbnail — click để phóng to */}
                      <td style={tdS}>
                        {reg.checkInCode ? (
                          <button
                            type="button"
                            onClick={() => setQrTarget(reg)}
                            title="Nhấn để phóng to mã QR"
                            aria-label={`Xem mã QR check-in của ${reg.eventName}`}
                            style={{
                              padding: 4, borderRadius: 8, border: D.borderLight, background: '#fff',
                              cursor: 'pointer', lineHeight: 0, display: 'inline-flex', transition: 'box-shadow .15s, transform .15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = D.shadow(2, 2); e.currentTarget.style.transform = 'translate(-1px,-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = '' }}
                          >
                            <QRCodeCanvas value={reg.checkInCode} size={40} level="L" includeMargin={false} />
                          </button>
                        ) : (
                          <span style={{ fontSize: 11.5, color: D.inkMuted }}>—</span>
                        )}
                      </td>
                      {/* Action */}
                      <td style={{ ...tdS, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {reg.canCancel ? (
                          <button
                            onClick={() => setCancelTarget(reg)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: D.pill, border: `1.5px solid ${D.red}`, background: '#fff5f5', color: D.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            <Trash2 size={12} /> Hủy tham gia
                          </button>
                        ) : (
                          <span style={{ fontSize: 11.5, color: D.inkMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel confirm dialog */}
      {cancelTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => !cancelling && setCancelTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 16, border: D.border, boxShadow: D.shadow(6, 6), padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: D.ink }}>Hủy tham gia sự kiện?</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: D.inkMuted, lineHeight: 1.5 }}>
              Bạn có chắc muốn hủy tham gia <span style={{ fontWeight: 700, color: D.ink }}>"{cancelTarget.eventName}"</span>? Mã check-in của bạn cũng sẽ bị xóa.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelTarget(null)} disabled={cancelling} style={{ height: 36, padding: '0 18px', borderRadius: D.pill, border: D.border, background: D.bg, color: D.inkDim, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Đóng</button>
              <button onClick={confirmCancel} disabled={cancelling} style={{ height: 36, padding: '0 20px', borderRadius: D.pill, border: `1.5px solid ${D.red}`, background: D.red, color: '#fff', fontWeight: 700, fontSize: 13, cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: cancelling ? 'none' : D.shadow() }}>
                {cancelling ? 'Đang hủy...' : 'Hủy tham gia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR popup */}
      {qrTarget?.checkInCode && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setQrTarget(null)}
        >
          <div
            style={{ position: 'relative', background: '#fff', borderRadius: 16, border: D.border, boxShadow: D.shadow(6, 6), padding: '24px 24px 22px', width: '100%', maxWidth: 380, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQrTarget(null)}
              aria-label="Đóng"
              style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 999, border: D.borderLight, background: D.bg, color: D.inkMuted, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}
            ><X size={15} /></button>

            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: D.inkMuted, marginBottom: 8 }}>
              Mã QR check-in
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 800, color: D.ink, lineHeight: 1.35, paddingRight: 20 }}>{qrTarget.eventName}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: D.inkMuted }}>
              {qrTarget.clubId == null ? 'Sự kiện cấp trường' : (qrTarget.clubName ?? 'CLB')}
            </p>

            <div style={{ display: 'inline-block', background: '#fff', border: D.border, borderRadius: 14, padding: 14, lineHeight: 0, boxShadow: D.shadow(3, 3) }}>
              <QRCodeCanvas value={qrTarget.checkInCode} size={220} level="M" includeMargin={false} />
            </div>

            {qrTarget.attendance === 'CheckedIn' ? (
              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: D.pill, padding: '5px 12px' }}>
                ✓ Đã điểm danh{qrTarget.checkedInAt ? ` lúc ${new Date(qrTarget.checkedInAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
              </div>
            ) : (
              <p style={{ margin: '16px 0 0', fontSize: 12.5, color: D.inkDim, lineHeight: 1.5 }}>
                Đưa mã này cho ban tổ chức tại sự kiện để check-in.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
