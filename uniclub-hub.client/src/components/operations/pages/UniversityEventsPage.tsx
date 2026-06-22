import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, CalendarDays, MapPin, Search, Users } from 'lucide-react'
import { getUniversityEvents, createEvent } from '../services/operationsApi'
import type { EventItem, EventStatus, CreateEventDto } from '../services/operations.types'

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  pill: 999,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  red: '#ef4444',
  amber: '#f59e0b',
}

const STATUS_MAP: Record<EventStatus, { label: string; bg: string; color: string }> = {
  Draft:      { label: 'Nháp',        bg: '#f3f4f6', color: '#6b7280' },
  InProgress: { label: 'Đang diễn ra', bg: '#dcfce7', color: '#15803d' },
  Completed:  { label: 'Đã kết thúc', bg: '#ede9fe', color: '#4f46e5' },
  Cancelled:  { label: 'Đã hủy',      bg: '#fee2e2', color: '#dc2626' },
}

function fmtDate(iso?: string) {
  if (!iso) return '?'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ─── Create Modal ───────────────────────────────────────────────────────── */
function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ev: EventItem) => void }) {
  const [form, setForm] = useState<CreateEventDto>({ name: '' })
  const [saving, setSaving] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13, fontWeight: 600,
    border: D.border, borderRadius: 8, outline: 'none',
    background: D.card, color: D.ink, boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 800, color: D.inkMuted,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em',
  }

  async function submit() {
    if (!form.name.trim()) { toast.error('Tên sự kiện không được để trống'); return }
    setSaving(true)
    try {
      const created = await createEvent(null, { ...form, name: form.name.trim() })
      toast.success('Đã tạo sự kiện cấp trường')
      onCreated(created)
    } catch {
      toast.error('Không thể tạo sự kiện')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(21,19,26,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(6, 6), fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: D.borderLight }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: D.ink }}>Tạo sự kiện cấp trường</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Tên sự kiện *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="VD: Hội trại Sinh viên 2026" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Bắt đầu</label>
              <input type="datetime-local" value={form.startTime ?? ''} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Kết thúc</label>
              <input type="datetime-local" value={form.endTime ?? ''} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Địa điểm</label>
            <input value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="Sân trung tâm, Hội trường A..." />
          </div>
          <div>
            <label style={labelStyle}>Mô tả</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Số lượng tối đa</label>
              <input type="number" value={form.maxParticipants ?? ''} onChange={e => setForm(f => ({ ...f, maxParticipants: Number(e.target.value) || undefined }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ngân sách (VNĐ)</label>
              <input type="number" value={form.budget ?? ''} onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) || undefined }))} style={inputStyle} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: D.borderLight, background: D.bg, borderRadius: `0 0 ${D.radius}px ${D.radius}px` }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, border: D.border, borderRadius: 8, background: D.card, color: D.ink, cursor: 'pointer' }}>Hủy</button>
          <button type="button" onClick={submit} disabled={saving} style={{ padding: '8px 22px', fontSize: 13, fontWeight: 800, border: D.border, borderRadius: 8, background: D.ink, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: D.shadow(3, 3) }}>
            {saving ? 'Đang tạo...' : 'Tạo sự kiện'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Event Card ─────────────────────────────────────────────────────────── */
function EventCard({ event, onClick }: { event: EventItem; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const st = STATUS_MAP[event.status]
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: D.card, border: D.border, borderRadius: D.radius,
        padding: 20, cursor: 'pointer',
        boxShadow: hovered ? D.shadow(5, 5) : D.shadow(),
        transform: hovered ? 'translate(-2px,-2px)' : 'none',
        transition: 'box-shadow .15s, transform .15s',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Badges row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: D.pill, padding: '2px 8px', letterSpacing: '.04em' }}>
          TOÀN TRƯỜNG
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, borderRadius: D.pill, padding: '2px 8px' }}>{st.label}</span>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: D.ink, margin: '0 0 8px', lineHeight: 1.3 }}>{event.name}</h3>
      {event.description && (
        <p style={{ fontSize: 12, color: D.inkMuted, margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.description}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {event.startTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted }}>
            <CalendarDays size={12} />{fmtDate(event.startTime)}{event.endTime ? ` – ${fmtDate(event.endTime)}` : ''}
          </div>
        )}
        {event.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted }}>
            <MapPin size={12} />{event.location}
          </div>
        )}
        {event.participantCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted }}>
            <Users size={12} />{event.participantCount} người đăng ký
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function UniversityEventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getUniversityEvents({ search: search || undefined, pageSize: 100 })
      setEvents(result.items)
    } catch {
      toast.error('Không thể tải danh sách sự kiện')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = events.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '28px 32px', background: D.bg, minHeight: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, margin: 0, letterSpacing: '-0.01em' }}>
            Sự kiện cấp Trường
          </h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            {events.length} sự kiện · Quản lý bởi Admin trường
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', fontSize: 13, fontWeight: 800,
            color: D.card, background: D.ink, border: D.border, borderRadius: 10,
            cursor: 'pointer', boxShadow: D.shadow(3, 3),
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.shadow(5,5) }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.shadow(3,3) }}
        >
          <Plus size={14} /> Tạo sự kiện
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 24 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.inkMuted }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm sự kiện..."
          style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: 13, border: D.border, borderRadius: 10, outline: 'none', background: D.card, color: D.ink, boxSizing: 'border-box' }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted, fontSize: 13 }}>Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: D.inkMuted, fontSize: 13 }}>
          {search ? 'Không tìm thấy sự kiện phù hợp.' : 'Chưa có sự kiện cấp trường nào. Tạo sự kiện đầu tiên!'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(ev => (
            <EventCard key={ev.id} event={ev} onClick={() => navigate(`/admin/events/${ev.id}`)} />
          ))}
        </div>
      )}

      {creating && (
        <CreateEventModal
          onClose={() => setCreating(false)}
          onCreated={ev => { setCreating(false); navigate(`/admin/events/${ev.id}`) }}
        />
      )}
    </div>
  )
}
