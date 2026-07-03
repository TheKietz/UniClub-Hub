import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Pencil, Share2, Calendar, MapPin, Users, CalendarClock,
  Wallet, ChevronRight, Plus, Trash2, Tag, Grid2x2,
} from 'lucide-react'
import {
  getEventById, deleteEvent,
  deleteEventSession, getTasks,
  getEventRegistrations, registerEventMember, removeEventRegistration, updateEventAttendance,
} from '../services/operationsApi'
import EventDeptTasksBoard from '../components/event/EventDeptTasksBoard'
import EventAttachmentsSection from '../components/event/EventAttachmentsSection'
import EditEventModal from '../components/event/EditEventModal'
import AddEventSessionModal from '../components/event/AddEventSessionModal'
import RegistrationLinkCard from '../components/event/RegistrationLinkCard'
import { formatDate, formatVnd, inputStyle } from '../components/event/eventShared'
import { getDepartments } from '@/components/membership/services/clubApi'
import { EventStatusBadge } from '../../shared/StatusBadge'
import type {
  EventItem, TaskItem,
  EventRegistrationItem, AttendanceStatus,
} from '../services/operations.types'
import type { DepartmentItem, MemberItem } from '@/components/membership/services/club.types'
import { getClubMembers } from '@/components/membership/services/clubApi'
import { D } from '@/components/shared/managementTheme'

const PRIORITY_DOT: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#60a5fa' }

/* ─── Dept status helper ──────────────────────────────────────────────────── */

function getDeptStatus(tasks: TaskItem[]): { label: string; bg: string; color: string; border: string } {
  if (!tasks.length) return { label: 'Chưa có việc', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
  if (tasks.every(t => t.status === 'Done')) return { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
  if (tasks.some(t => t.status === 'Reviewing')) return { label: 'Đang duyệt', bg: '#fef9c3', color: '#a16207', border: '#fde68a' }
  if (tasks.some(t => t.status === 'Doing')) return { label: 'Đang triển khai', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' }
  return { label: 'Chưa bắt đầu', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
}

/* ─── Dept Summary Table ──────────────────────────────────────────────────── */

function DeptSummaryTable({ eventId, clubId }: { eventId: number; clubId: number }) {
  const [depts, setDepts]       = useState<DepartmentItem[]>([])
  const [taskMap, setTaskMap]   = useState<Record<number, TaskItem[]>>({})
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const cancelled = { v: false }
    Promise.all([
      getDepartments(clubId),
      getTasks({ clubId, eventId, pageSize: 200 }),
    ]).then(([deptList, result]) => {
      if (cancelled.v) return
      const map: Record<number, TaskItem[]> = {}
      for (const t of result.items) {
        if (t.departmentId != null) {
          if (!map[t.departmentId]) map[t.departmentId] = []
          map[t.departmentId].push(t)
        }
      }
      setDepts(deptList.filter(d => (map[d.id]?.length ?? 0) > 0))
      setTaskMap(map)
    }).catch(() => {}).finally(() => { if (!cancelled.v) setLoading(false) })
    return () => { cancelled.v = true }
  }, [eventId, clubId])

  const allTasks = useMemo(() => Object.values(taskMap).flat(), [taskMap])
  const totalDone = useMemo(() => allTasks.filter(t => t.status === 'Done').length, [allTasks])

  return (
    <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Grid2x2 size={14} style={{ color: D.indigo }} />
          Danh sách Ban tham chiến
          {depts.length > 0 && (
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{depts.length} ban</span>
          )}
        </h2>
        {allTasks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100, height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: '#10b981', width: `${Math.round(totalDone / allTasks.length * 100)}%`, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted, whiteSpace: 'nowrap' }}>
              {totalDone}/{allTasks.length} hoàn thành
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
      ) : depts.length === 0 ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Grid2x2 size={28} style={{ color: '#c4bfb0' }} />
          <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Chưa có ban nào được giao việc trong sự kiện này</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.bg }}>
                {['Ban', 'Trưởng Ban', 'Công việc được giao', 'Tiến độ', 'Tổng quan'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depts.map(dept => {
                const tasks   = taskMap[dept.id] ?? []
                const done    = tasks.filter(t => t.status === 'Done').length
                const pct     = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0
                const status  = getDeptStatus(tasks)
                const initial = dept.name.charAt(0).toUpperCase()

                return (
                  <tr key={dept.id} style={{ borderBottom: D.borderLight }}>

                    {/* Ban name */}
                    <td style={{ padding: '14px 16px', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', border: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: D.indigo, flexShrink: 0 }}>
                          {initial}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, color: D.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{dept.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: D.inkMuted }}>{tasks.length} công việc</p>
                        </div>
                      </div>
                    </td>

                    {/* Trưởng ban */}
                    <td style={{ padding: '14px 16px', minWidth: 150 }}>
                      {dept.deptLeadName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#d1fae5', border: D.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#065f46', flexShrink: 0 }}>
                            {dept.deptLeadName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, color: D.ink, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{dept.deptLeadName}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: D.inkMuted }}>Trưởng ban</p>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: D.inkMuted }}>Chưa có trưởng ban</span>
                      )}
                    </td>

                    {/* Tasks */}
                    <td style={{ padding: '14px 16px', minWidth: 220 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tasks.slice(0, 3).map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.Medium, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: t.status === 'Done' ? D.inkMuted : D.inkDim, fontWeight: t.status === 'Done' ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>
                              {t.title}
                            </span>
                          </div>
                        ))}
                        {tasks.length > 3 && (
                          <span style={{ fontSize: 10, color: D.inkMuted, paddingLeft: 11 }}>+{tasks.length - 3} việc khác</span>
                        )}
                      </div>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: '14px 16px', minWidth: 130 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ height: 6, borderRadius: 4, background: '#e8e3d6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? '#10b981' : D.indigo, width: `${pct}%`, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: D.inkMuted, fontWeight: 600 }}>{done}/{tasks.length} ({pct}%)</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: D.pill, background: status.bg, color: status.color, border: `1.5px solid ${status.border}`, whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Registration & Attendance Section ──────────────────────────────────── */

const ATTENDANCE_CFG: Record<AttendanceStatus, { label: string; bg: string; color: string; border: string }> = {
  Pending:   { label: 'Chưa điểm danh', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  CheckedIn: { label: 'Đã đến',         bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  Absent:    { label: 'Vắng',           bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
}

function RegistrationSection({ event, clubId, canManage }: { event: EventItem; clubId: number; canManage: boolean }) {
  const [registrations, setRegistrations] = useState<EventRegistrationItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [adding, setAdding] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getEventRegistrations(event.id),
      canManage ? getClubMembers(clubId, { status: 'Active' }) : Promise.resolve([] as MemberItem[]),
    ])
      .then(([regs, mems]) => { setRegistrations(regs); setMembers(mems) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [event.id, clubId, canManage])

  const registeredIds = new Set(registrations.map(r => r.userId))
  const unregistered = members.filter(m => !registeredIds.has(m.userId))

  const checkedIn = registrations.filter(r => r.attendance === 'CheckedIn').length
  const absent    = registrations.filter(r => r.attendance === 'Absent').length
  const pending   = registrations.filter(r => r.attendance === 'Pending').length

  async function handleAdd() {
    if (!selectedId) { toast.error('Chọn thành viên để đăng ký'); return }
    setAdding(true)
    try {
      const reg = await registerEventMember(event.id, { userId: selectedId })
      setRegistrations(prev => [...prev, reg])
      setSelectedId(''); setShowAdd(false)
      toast.success('Đã đăng ký tham dự')
    } catch { toast.error('Không thể đăng ký thành viên') }
    finally { setAdding(false) }
  }

  async function handleRemove(userId: string) {
    try {
      await removeEventRegistration(event.id, userId)
      setRegistrations(prev => prev.filter(r => r.userId !== userId))
      toast.success('Đã hủy đăng ký')
    } catch { toast.error('Không thể hủy đăng ký') }
  }

  async function handleAttendance(userId: string, attendance: AttendanceStatus) {
    setUpdatingId(userId)
    try {
      await updateEventAttendance(event.id, userId, { attendance })
      setRegistrations(prev => prev.map(r => r.userId === userId ? { ...r, attendance } : r))
    } catch { toast.error('Không thể cập nhật điểm danh') }
    finally { setUpdatingId(null) }
  }

  const totalPct = registrations.length > 0 ? Math.round(checkedIn / registrations.length * 100) : 0

  return (
    <div style={{ marginTop: 20, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: D.indigo }} />
            Danh sách tham dự
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{registrations.length}</span>
          </h2>
          {registrations.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {checkedIn > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 4, padding: '1px 7px' }}>{checkedIn} đã đến</span>}
              {absent > 0   && <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, padding: '1px 7px' }}>{absent} vắng</span>}
              {pending > 0  && <span style={{ fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, padding: '1px 7px' }}>{pending} chờ</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {registrations.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 80, height: 5, borderRadius: 3, background: '#e8e3d6', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: '#10b981', width: `${totalPct}%`, transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: D.inkMuted }}>{totalPct}%</span>
            </div>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setShowAdd(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: showAdd ? '#fff' : D.indigo, background: showAdd ? D.indigo : 'transparent', border: `1.5px solid ${D.indigo}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}
            >
              <Plus size={11} /> {showAdd ? 'Đóng' : 'Thêm thành viên'}
            </button>
          )}
        </div>
      </div>

      {/* Add member panel */}
      {showAdd && (
        <div style={{ padding: '12px 20px', borderBottom: D.borderLight, background: '#f9f9fb', display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ ...inputStyle, flex: 1, fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">— Chọn thành viên —</option>
            {unregistered.map(m => (
              <option key={m.userId} value={m.userId}>{m.fullName ?? m.email}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !selectedId}
            style={{ padding: '7px 16px', fontSize: 12, fontWeight: 800, border: D.border, borderRadius: 8, background: adding ? '#6b7280' : D.ink, color: '#facc15', cursor: (adding || !selectedId) ? 'not-allowed' : 'pointer', boxShadow: D.shadow(2, 2), whiteSpace: 'nowrap', opacity: !selectedId ? 0.6 : 1, fontFamily: 'inherit' }}
          >
            {adding ? 'Đang thêm...' : 'Đăng ký'}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, border: D.border, borderRadius: 8, background: D.card, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
      ) : registrations.length === 0 ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Users size={28} style={{ color: '#c4bfb0' }} />
          <p style={{ color: D.inkMuted, fontSize: 13, margin: 0 }}>Chưa có thành viên nào đăng ký tham dự</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.bg }}>
                {['Thành viên', 'Đăng ký lúc', 'Trạng thái điểm danh', ...(canManage ? ['Thao tác'] : [])].map((h, i) => (
                  <th key={i} style={{ padding: '9px 16px', fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: D.borderLight, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map(reg => {
                const att = ATTENDANCE_CFG[reg.attendance] ?? ATTENDANCE_CFG.Pending
                const isUpdating = updatingId === reg.userId
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
                          <p style={{ margin: 0, fontWeight: 700, color: D.ink, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{reg.userName || '—'}</p>
                          {reg.email && <p style={{ margin: '1px 0 0', fontSize: 10, color: D.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{reg.email}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Registered at */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: D.inkMuted, fontSize: 12 }}>
                      {new Date(reg.registeredAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    {/* Attendance badge */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: D.pill, background: att.bg, color: att.color, border: `1.5px solid ${att.border}`, whiteSpace: 'nowrap' }}>
                        {att.label}
                      </span>
                    </td>
                    {/* Actions */}
                    {canManage && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {reg.attendance !== 'CheckedIn' && (
                            <button
                              type="button"
                              onClick={() => handleAttendance(reg.userId, 'CheckedIn')}
                              disabled={isUpdating}
                              style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', border: '1.5px solid #86efac', borderRadius: 7, background: '#dcfce7', color: '#15803d', cursor: isUpdating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isUpdating ? 0.6 : 1 }}
                            >✓ Đã đến</button>
                          )}
                          {reg.attendance !== 'Absent' && (
                            <button
                              type="button"
                              onClick={() => handleAttendance(reg.userId, 'Absent')}
                              disabled={isUpdating}
                              style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', border: '1.5px solid #fca5a5', borderRadius: 7, background: '#fee2e2', color: '#dc2626', cursor: isUpdating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isUpdating ? 0.6 : 1 }}
                            >✗ Vắng</button>
                          )}
                          {reg.attendance !== 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleAttendance(reg.userId, 'Pending')}
                              disabled={isUpdating}
                              style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', border: '1.5px solid #d1d5db', borderRadius: 7, background: '#f3f4f6', color: '#374151', cursor: isUpdating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isUpdating ? 0.6 : 1 }}
                            >↺ Reset</button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemove(reg.userId)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1.5px solid #fca5a5', borderRadius: 7, background: '#fff5f5', color: D.red, cursor: 'pointer', padding: 0, marginLeft: 4 }}
                            title="Hủy đăng ký"
                          ><Trash2 size={12} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function EventDetailPage() {
  const { id, clubId: clubIdParam } = useParams<{ id: string; clubId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const clubId = Number(clubIdParam ?? 1)
  const isManageContext = location.pathname.includes('/manage/')
  const eventsListUrl = isManageContext
    ? `/clubs/${clubId}/manage/events`
    : `/clubs/${clubId}/operations?view=events`

  const { isSuperAdmin, getClubRole } = useAuth()
  const canManage = isSuperAdmin || getClubRole(clubId) === CLUB_ROLES.CLUB_ADMIN

  const [event, setEvent]         = useState<EventItem | null>(null)
  const [loading, setLoading]     = useState(true)
  const [editOpen, setEditOpen]   = useState(false)
  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false)
  const [deletingEvent, setDeletingEvent]     = useState(false)

  const loadEvent = async () => {
    if (!id) return
    const ev = await getEventById(Number(id))
    setEvent(ev)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getEventById(Number(id))
      .then(ev => setEvent(ev))
      .catch(() => toast.error('Không thể tải thông tin sự kiện'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDeleteSession = async (sessionId: number) => {
    if (!event) return
    try { await deleteEventSession(event.id, sessionId); toast.success('Đã xóa mục lịch trình'); await loadEvent() }
    catch { toast.error('Không thể xóa mục này') }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    setDeletingEvent(true)
    try { await deleteEvent(event.id); toast.success('Đã xóa sự kiện'); navigate(eventsListUrl) }
    catch { toast.error('Không thể xóa sự kiện này'); setDeletingEvent(false); setDeleteEventOpen(false) }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Đã sao chép liên kết'))
      .catch(() => toast.error('Không thể sao chép liên kết'))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <span style={{ color: D.inkMuted, fontSize: 13 }}>Đang tải...</span>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <p style={{ color: D.inkMuted }}>Không tìm thấy sự kiện</p>
        <button type="button" onClick={() => navigate(eventsListUrl)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: D.pill, background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2) }}>
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const sessions = event.sessions ?? []

  const outlineBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    fontSize: 12, fontWeight: 700, border: D.border, borderRadius: D.pill,
    background: D.card, color: D.inkDim, cursor: 'pointer', boxShadow: D.shadow(2, 2), fontFamily: 'inherit',
  }
  const cardStyle: React.CSSProperties = {
    background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: 20,
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted, marginBottom: 16 }}>
        {isManageContext
          ? <Link to={`/clubs/${clubId}/manage`} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Quản lý CLB</Link>
          : <Link to={`/clubs/${clubId}/operations`} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Vận hành</Link>
        }
        <ChevronRight size={12} />
        <Link to={eventsListUrl} style={{ color: D.inkMuted, textDecoration: 'none', fontWeight: 600 }}>Sự kiện</Link>
        <ChevronRight size={12} />
        <span style={{ color: D.ink, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{event.name}</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <button type="button" onClick={() => navigate(eventsListUrl)} style={{ marginTop: 2, padding: 6, borderRadius: 8, border: D.borderLight, background: D.card, color: D.inkMuted, cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: D.ink, margin: 0, letterSpacing: '-.025em' }}>{event.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <EventStatusBadge status={event.status} />
              {event.category && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: D.inkMuted, background: D.bg, border: D.borderLight, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  <Tag size={9} /> {event.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={handleShare} style={outlineBtnStyle}><Share2 size={13} /> Chia sẻ</button>
          {canManage && (
            <>
              <button type="button" onClick={() => setDeleteEventOpen(true)} style={{ ...outlineBtnStyle, color: D.red, borderColor: '#fca5a5' }}>
                <Trash2 size={13} /> Xóa
              </button>
              <button type="button" onClick={() => setEditOpen(true)} style={{ ...outlineBtnStyle, background: D.ink, color: '#ffffff', boxShadow: D.shadow() }}>
                <Pencil size={13} /> Chỉnh sửa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Event info */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 14px' }}>Thông tin tổng quan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: D.inkDim }}>
              {event.startTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={14} style={{ color: D.indigo, flexShrink: 0 }} />
                  <span>{formatDate(event.startTime)}{event.endTime && <> &mdash; {formatDate(event.endTime)}</>}</span>
                </div>
              )}
              {event.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} style={{ color: D.red, flexShrink: 0 }} />
                  <span>{event.location}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>{event.participantCount} người tham gia{event.maxParticipants ? ` / tối đa ${event.maxParticipants}` : ''}</span>
              </div>
              {event.description && (
                <p style={{ margin: '8px 0 0', color: D.inkMuted, lineHeight: 1.6, paddingTop: 12, borderTop: D.borderLight, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{event.description}</p>
              )}
              {event.summary && (
                <div style={{ margin: '10px 0 0', paddingTop: 12, borderTop: D.borderLight }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 6px' }}>Kết quả / Tổng kết</p>
                  <p style={{ fontSize: 13, color: D.inkDim, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{event.summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={13} style={{ color: D.indigo }} />
                Lịch trình hoạt động
                {sessions.length > 0 && (
                  <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{sessions.length}</span>
                )}
              </h2>
              {canManage && (
                <button type="button" onClick={() => setAddSessionOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Plus size={12} /> Thêm mục
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={28} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 12, color: D.inkMuted, margin: 0 }}>Chưa có lịch trình — nhấn "Thêm mục" để bắt đầu</p>
              </div>
            ) : (
              <div>
                {sessions.map((s, idx) => (
                  <div key={s.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 52, textAlign: 'right', fontSize: 11, color: D.inkMuted, paddingTop: 2, flexShrink: 0, lineHeight: 1.4 }}>
                      <div>{s.startTime}</div><div style={{ color: '#c4bfb0' }}>{s.endTime}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.indigo, marginTop: 3, flexShrink: 0 }} />
                      {idx < sessions.length - 1 && <div style={{ width: 1, flex: 1, background: '#dce6f4', margin: '3px 0' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 16, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>{s.title}</p>
                        {s.location && <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} /> {s.location}</p>}
                        {s.description && <p style={{ fontSize: 11, color: D.inkMuted, margin: '4px 0 0' }}>{s.description}</p>}
                      </div>
                      {canManage && (
                        <button type="button" aria-label="Xóa mục lịch trình" onClick={() => handleDeleteSession(s.id)} style={{ padding: 4, color: D.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Budget */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={12} style={{ color: D.amber }} />Ngân sách phân bổ
            </h2>
            {event.budget != null ? (
              <p style={{ fontSize: 20, fontWeight: 900, color: D.ink, margin: 0 }}>{formatVnd(event.budget)}</p>
            ) : (
              <div style={{ border: '2px dashed #c4bfb0', borderRadius: 10, padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Wallet size={20} style={{ color: '#c4bfb0' }} />
                <p style={{ fontSize: 11, color: D.inkMuted, margin: 0, textAlign: 'center' }}>Chưa xác định ngân sách</p>
              </div>
            )}
          </div>

          {/* Registration form link */}
          <RegistrationLinkCard
            eventId={event.id}
            canManage={canManage}
            value={event.registrationLink ?? ''}
            onChange={link => setEvent(prev => prev ? { ...prev, registrationLink: link || undefined } : prev)}
          />
        </div>
      </div>

      {/* Tasks by department */}
      <EventDeptTasksBoard
        eventId={event.id}
        clubId={clubId}
        isManager={canManage}
        eventStart={event.startTime}
        eventEnd={event.endTime}
      />

      {/* Attachments */}
      <EventAttachmentsSection eventId={event.id} isManager={canManage} />

      {/* Department summary table */}
      <DeptSummaryTable eventId={event.id} clubId={clubId} />

      {/* Registration & Attendance */}
      <RegistrationSection event={event} clubId={clubId} canManage={canManage} />

      {/* Modals */}
      {editOpen && <EditEventModal open={editOpen} event={event} cascadeClubId={clubId} onClose={() => setEditOpen(false)} onSaved={updated => setEvent(updated)} />}
      <AddEventSessionModal open={addSessionOpen} eventId={event.id} onClose={() => setAddSessionOpen(false)} onAdded={loadEvent} />

      {/* Delete event */}
      <AlertDialog open={deleteEventOpen} onOpenChange={v => !v && setDeleteEventOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Sự kiện <span style={{ fontWeight: 700, color: D.ink }}>"{event.name}"</span> sẽ bị xóa vĩnh viễn cùng toàn bộ lịch trình và nhân sự liên quan. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEvent}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={deletingEvent} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              {deletingEvent ? 'Đang xóa...' : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
