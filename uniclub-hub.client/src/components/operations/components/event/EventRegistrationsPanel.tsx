import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Users, Trash2, Search, QrCode } from 'lucide-react'
import { getEventRegistrations, removeEventRegistration, updateEventAttendance } from '../../services/operationsApi'
import type { EventRegistrationItem, AttendanceStatus } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'
import CheckInScannerModal from './CheckInScannerModal'

const ATTENDANCE_CFG: Record<AttendanceStatus, { label: string; bg: string; color: string; border: string }> = {
  Pending:   { label: 'Chưa điểm danh', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  CheckedIn: { label: 'Đã điểm danh',   bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  Absent:    { label: 'Vắng',           bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
}

function AttendanceToggle({ on, disabled, onToggle }: { on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Điểm danh"
      disabled={disabled}
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 999, border: `1.5px solid ${on ? '#15803d' : '#c4bfb0'}`,
        background: on ? '#22c55e' : '#e5e7eb', position: 'relative', flexShrink: 0, padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transition: 'background .15s, border-color .15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 1.5, left: on ? 22 : 2, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.3)', transition: 'left .15s',
      }} />
    </button>
  )
}

/**
 * Shared participant management panel for both club and university event detail pages.
 * Check-in / check-out is a per-row toggle (CheckedIn ↔ Pending); QR check-in and remove reuse
 * the same existing endpoints. Read-only for non-managers. Participants register themselves
 * (via Portal), so there is no manual "add member" here.
 */
export default function EventRegistrationsPanel({ eventId, canManage }: {
  eventId: number
  canManage: boolean
}) {
  const [registrations, setRegistrations] = useState<EventRegistrationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    getEventRegistrations(eventId)
      .then(setRegistrations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  const checkedIn = registrations.filter(r => r.attendance === 'CheckedIn').length
  const totalPct = registrations.length > 0 ? Math.round(checkedIn / registrations.length * 100) : 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return registrations
    return registrations.filter(r =>
      r.userName?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.studentId?.toLowerCase().includes(q)
    )
  }, [registrations, search])

  async function handleRemove(userId: string) {
    try {
      await removeEventRegistration(eventId, userId)
      setRegistrations(prev => prev.filter(r => r.userId !== userId))
      toast.success('Đã hủy đăng ký')
    } catch { toast.error('Không thể hủy đăng ký') }
  }

  async function handleToggle(reg: EventRegistrationItem) {
    const next: AttendanceStatus = reg.attendance === 'CheckedIn' ? 'Pending' : 'CheckedIn'
    setUpdatingId(reg.userId)
    try {
      await updateEventAttendance(eventId, reg.userId, { attendance: next })
      setRegistrations(prev => prev.map(r => r.userId === reg.userId
        ? { ...r, attendance: next, checkedInAt: next === 'CheckedIn' ? (r.checkedInAt ?? new Date().toISOString()) : r.checkedInAt }
        : r))
    } catch { toast.error('Không thể cập nhật điểm danh') }
    finally { setUpdatingId(null) }
  }

  const handleScannerCheckedIn = useCallback((userId: string) => {
    setRegistrations(prev => prev.map(r => r.userId === userId
      ? { ...r, attendance: 'CheckedIn', checkedInAt: r.checkedInAt ?? new Date().toISOString() }
      : r))
  }, [])

  const columns = ['Thành viên', 'MSSV', 'Đăng ký lúc', 'Điểm danh', ...(canManage ? ['Thao tác'] : [])]

  return (
    <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 20px', borderBottom: D.borderLight, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: D.indigo }} />
            Danh sách tham dự
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{registrations.length}</span>
          </h2>
          {registrations.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 80, height: 5, borderRadius: 3, background: '#e8e3d6', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: '#10b981', width: `${totalPct}%`, transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, whiteSpace: 'nowrap' }}>{checkedIn}/{registrations.length}</span>
            </div>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#fff', background: D.ink, border: D.border, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', boxShadow: D.shadow(2, 2) }}
          >
            <QrCode size={13} /> Quét mã Check-in
          </button>
        )}
      </div>

      {/* Search toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: D.borderLight, background: D.bg }}>
        <Search size={14} style={{ color: D.inkMuted, flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Tìm theo MSSV, tên hoặc email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: D.ink, background: 'transparent', fontFamily: 'inherit' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
      ) : registrations.length === 0 ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Users size={28} style={{ color: '#c4bfb0' }} />
          <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Chưa có thành viên nào đăng ký tham dự</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: D.inkMuted, fontSize: 13 }}>Không tìm thấy người tham gia phù hợp</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.bg }}>
                {columns.map((h, i) => (
                  <th key={i} style={{ padding: '9px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(reg => {
                const att = ATTENDANCE_CFG[reg.attendance] ?? ATTENDANCE_CFG.Pending
                const isUpdating = updatingId === reg.userId
                const isIn = reg.attendance === 'CheckedIn'
                const initial = (reg.userName || reg.email || '?').charAt(0).toUpperCase()
                return (
                  <tr key={reg.userId} style={{ borderBottom: D.borderLight }}>
                    {/* Name */}
                    <td style={{ padding: '12px 16px', minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', border: '1.5px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: D.indigo, flexShrink: 0 }}>
                          {initial}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, color: D.ink, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{reg.userName || '—'}</p>
                          {reg.email && <p style={{ margin: '1px 0 0', fontSize: 10, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{reg.email}</p>}
                        </div>
                      </div>
                    </td>
                    {/* MSSV */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: reg.studentId ? D.inkDim : D.inkMuted, fontSize: 12, fontWeight: reg.studentId ? 700 : 400 }}>
                      {reg.studentId || '—'}
                    </td>
                    {/* Registered at */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: D.inkMuted, fontSize: 12 }}>
                      {new Date(reg.registeredAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    {/* Attendance */}
                    <td style={{ padding: '12px 16px' }}>
                      {canManage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <AttendanceToggle on={isIn} disabled={isUpdating} onToggle={() => handleToggle(reg)} />
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: att.color, whiteSpace: 'nowrap' }}>{att.label}</span>
                            {isIn && reg.checkedInAt && (
                              <span style={{ display: 'block', fontSize: 10, color: D.inkMuted }}>
                                {new Date(reg.checkedInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: D.pill, background: att.bg, color: att.color, border: `1.5px solid ${att.border}`, whiteSpace: 'nowrap' }}>
                          {att.label}
                        </span>
                      )}
                    </td>
                    {/* Remove */}
                    {canManage && (
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleRemove(reg.userId)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1.5px solid #fca5a5', borderRadius: 7, background: '#fff5f5', color: D.red, cursor: 'pointer', padding: 0 }}
                          title="Hủy đăng ký"
                        ><Trash2 size={12} /></button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <CheckInScannerModal
          open={scanOpen}
          eventId={eventId}
          registrations={registrations}
          onClose={() => setScanOpen(false)}
          onCheckedIn={handleScannerCheckedIn}
        />
      )}
    </div>
  )
}
