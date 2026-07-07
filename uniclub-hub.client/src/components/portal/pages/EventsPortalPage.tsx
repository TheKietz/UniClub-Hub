import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { QRCodeCanvas } from 'qrcode.react'
import { MapPin, Calendar, Clock, Users, X, LogIn, Check, Ticket } from 'lucide-react'
import { C, Rv, Marquee, PublicFooter } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import SkyBackground from '@/components/public/SkyBackground'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { useAuth } from '@/hooks/useAuth'
import { getClubs } from '@/components/membership/services/clubApi'
import { getMyEventRegistration, registerSelfForEvent, unregisterSelfFromEvent } from '@/components/operations/services/operationsApi'
import type { EventRegistrationItem } from '@/components/operations/services/operations.types'
import { getPortalEvents } from '../services/portal.api'
import type { PortalEventItem, PortalFeedScope } from '../services/portal.types'
import {
  glassCard, useDebounced, fmtDate, fmtTime, fmtDateRange,
  ScopeChips, ClubFilterSelect, PortalSearchBar, ScopeBadge,
  FeedError, EmptyFeed, LoadMoreButton,
} from './portalFeedShared'

const PAGE_SIZE = 12

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  Draft:      { label: 'Sắp diễn ra',  bg: '#dbeafe', color: '#1d4ed8' },
  InProgress: { label: 'Đang diễn ra', bg: '#dcfce7', color: '#15803d' },
  Completed:  { label: 'Đã kết thúc',  bg: '#f4f4f5', color: '#52525b' },
  Cancelled:  { label: 'Đã hủy',       bg: '#fee2e2', color: '#dc2626' },
}
function statusMeta(s: string) { return STATUS_META[s] ?? { label: s, bg: '#f4f4f5', color: '#52525b' } }

const STATUS_OPTIONS = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'Draft', label: 'Sắp diễn ra' },
  { value: 'InProgress', label: 'Đang diễn ra' },
  { value: 'Completed', label: 'Đã kết thúc' },
]

export default function EventsPortalPage() {
  const [clubs, setClubs] = useState<{ id: number; name: string }[]>([])
  const [scope, setScope] = useState<PortalFeedScope>('all')
  const [clubId, setClubId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)

  const [items, setItems] = useState<PortalEventItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<PortalEventItem | null>(null)

  useEffect(() => {
    getClubs().then(cs => setClubs(cs.map(c => ({ id: c.id, name: c.name })))).catch(() => setClubs([]))
  }, [])

  function fetchPage(pageNum: number, append: boolean) {
    if (append) setLoadingMore(true)
    else { setLoading(true); setError(false) }

    getPortalEvents({
      scope: clubId ? undefined : scope,
      clubId: clubId ? Number(clubId) : undefined,
      status: status || undefined,
      search: debouncedSearch || undefined,
      page: pageNum,
      pageSize: PAGE_SIZE,
    })
      .then(res => {
        setTotal(res.totalCount)
        setPage(res.page)
        setItems(prev => append ? [...prev, ...res.data] : res.data)
      })
      .catch(() => { if (!append) { setError(true); setItems([]) } })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }

  // Reload page 1 whenever a filter changes
  useEffect(() => {
    fetchPage(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, clubId, status, debouncedSearch])

  const hasMore = items.length < total
  const resetFilters = () => { setScope('all'); setClubId(''); setStatus(''); setSearch('') }

  return (
    <div className="v3-page v3-enter" style={{ background: 'transparent' }}>
      <SkyBackground />
      <PublicHeader />

      {/* ─── Hero / filters ─────────────────────────────── */}
      <section style={{ padding: '132px 28px 20px', position: 'relative', zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute', top: 6, right: 40, fontSize: 48, color: C.coral,
            opacity: 0.35, transform: 'rotate(15deg)', animation: 'float 4s ease-in-out infinite', pointerEvents: 'none',
          }}>✦</div>

          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: '0 0 18px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Sự kiện{' '}
              <span style={{
                display: 'inline-block', background: C.coral, color: C.bg, padding: '0 14px',
                border: C.border, borderRadius: 14, transform: 'rotate(-1.5deg)',
              }}>UEF.</span>
            </h1>
          </Rv>

          <Rv delay={100}>
            <p style={{ fontSize: 16, color: C.inkDim, lineHeight: 1.5, maxWidth: 560, margin: '0 0 18px', fontWeight: 500 }}>
              Sự kiện cấp trường và của các câu lạc bộ. Lọc theo cấp tổ chức, theo CLB hoặc tìm theo tên.
            </p>
          </Rv>

          <Rv delay={140}>
            <div style={{ marginBottom: 14 }}>
              <PortalSearchBar value={search} onChange={setSearch} placeholder="Tìm sự kiện theo tên…" />
            </div>
          </Rv>

          <Rv delay={160}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <ScopeChips value={scope} onChange={v => { setScope(v); if (v === 'university') setClubId('') }} />
              <ClubFilterSelect
                clubs={clubs}
                value={clubId}
                onChange={setClubId}
                disabled={scope === 'university'}
              />
              <FilterSelect
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
                style={{ width: 190 }}
                buttonStyle={{
                  height: 42, borderRadius: C.radiusPill, border: C.border, color: C.ink,
                  fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,.74)',
                  backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                }}
                menuStyle={{ border: C.border, borderRadius: 14, boxShadow: C.shadow(3, 3) }}
              />
            </div>
          </Rv>

          <Rv delay={180}>
            <div style={{ marginTop: 14, fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>
              {loading ? 'Đang tải…' : <>Tìm thấy <strong style={{ color: C.ink }}>{total}</strong> sự kiện</>}
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── Feed ───────────────────────────────────────── */}
      {loading ? (
        <FeedGridSkeleton />
      ) : error ? (
        <FeedError onRetry={() => fetchPage(1, false)} label="Không tải được danh sách sự kiện" />
      ) : items.length === 0 ? (
        <EmptyFeed icon="📅" title="Không có sự kiện phù hợp" hint="Thử đổi bộ lọc hoặc từ khóa khác." onReset={resetFilters} />
      ) : (
        <section style={{ padding: '8px 28px 56px', flex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gridAutoRows: '1fr', gap: 16 }}>
              {items.map((ev, i) => (
                <Rv key={ev.id} delay={Math.min(i, 8) * 40}>
                  <EventCard ev={ev} onOpen={() => setSelected(ev)} />
                </Rv>
              ))}
            </div>
            {hasMore && <LoadMoreButton onClick={() => fetchPage(page + 1, true)} loading={loadingMore} />}
          </div>
        </section>
      )}

      <Marquee tone="light" items={['SỰ KIỆN CẤP TRƯỜNG', 'HOẠT ĐỘNG CLB', 'WORKSHOP · GALA · HACKATHON', 'SINH VIÊN UEF']} speed={38} />
      <PublicFooter />

      {selected && <EventModal ev={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/* ─── Event card ─────────────────────────────────────────────────── */
function EventCard({ ev, onOpen }: { ev: PortalEventItem; onOpen: () => void }) {
  const st = statusMeta(ev.status)
  return (
    <div
      className="card-lift"
      onClick={onOpen}
      style={{
        ...glassCard, borderRadius: C.radius, overflow: 'hidden', cursor: 'pointer',
        border: C.border, boxShadow: C.shadow(), display: 'flex', flexDirection: 'column', height: '100%',
      }}
    >
      {/* Date strip */}
      <div style={{
        padding: '10px 14px', borderBottom: C.border, background: ev.clubId == null ? C.ink : C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800,
          color: ev.clubId == null ? C.bg : C.ink,
        }}>
          <Calendar size={12} />{fmtDateRange(ev.startTime, ev.endTime)}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: C.radiusPill,
          background: st.bg, color: st.color, flexShrink: 0,
        }}>{st.label}</span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ marginBottom: 10 }}>
          <ScopeBadge clubId={ev.clubId} clubName={ev.clubName} clubLogoUrl={ev.clubLogoUrl} />
        </div>

        <h3 style={{
          fontSize: 15.5, fontWeight: 800, color: C.ink, letterSpacing: '-.01em', margin: '0 0 8px', lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>{ev.name}</h3>

        {ev.description && (
          <p style={{
            fontSize: 12.5, color: C.inkMuted, lineHeight: 1.5, margin: '0 0 12px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>{ev.description}</p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px dashed ${C.rule}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ev.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.inkDim }}>
              <MapPin size={11} />{ev.location}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {ev.startTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.inkDim }}>
                <Clock size={11} />{fmtTime(ev.startTime)}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.inkDim }}>
              <Users size={11} />{ev.participantCount}{ev.maxParticipants ? ` / ${ev.maxParticipants}` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Event detail modal ─────────────────────────────────────────── */
function EventModal({ ev, onClose }: { ev: PortalEventItem; onClose: () => void }) {
  const st = statusMeta(ev.status)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(3,24,68,0.7)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Đóng"
        style={{
          position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 999,
          display: 'grid', placeItems: 'center', color: '#fff', zIndex: 10,
          background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.7)', cursor: 'pointer',
        }}
      ><X size={18} /></button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: C.card, borderRadius: C.radius, overflow: 'hidden',
          width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          border: C.border, boxShadow: C.shadow(8, 8),
        }}
      >
        {/* Banner */}
        {ev.bannerUrl ? (
          <img src={ev.bannerUrl} alt={ev.name} style={{ width: '100%', height: 220, objectFit: 'cover', borderBottom: C.border, flexShrink: 0 }} />
        ) : (
          <div style={{
            height: 120, background: ev.clubId == null ? C.ink : C.indigo, borderBottom: C.border,
            display: 'grid', placeItems: 'center', color: C.bg, fontSize: 46, fontWeight: 900,
          }}>✦</div>
        )}

        <div style={{ overflowY: 'auto', padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <ScopeBadge clubId={ev.clubId} clubName={ev.clubName} clubLogoUrl={ev.clubLogoUrl} />
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: C.radiusPill, background: st.bg, color: st.color }}>{st.label}</span>
            {ev.category && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: C.radiusPill, background: C.bg, color: C.inkDim, border: C.border }}>{ev.category}</span>
            )}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: '-.02em', lineHeight: 1.2, margin: '0 0 16px' }}>{ev.name}</h2>

          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            <InfoRow icon={<Calendar size={15} />} label="Thời gian" value={
              ev.startTime
                ? `${fmtDate(ev.startTime)}${ev.startTime ? ` · ${fmtTime(ev.startTime)}` : ''}${ev.endTime ? ` – ${fmtDate(ev.endTime) === fmtDate(ev.startTime) ? fmtTime(ev.endTime) : `${fmtDate(ev.endTime)} ${fmtTime(ev.endTime)}`}` : ''}`
                : 'Chưa xác định'
            } />
            {ev.location && <InfoRow icon={<MapPin size={15} />} label="Địa điểm" value={ev.location} />}
            <InfoRow icon={<Users size={15} />} label="Tham gia" value={`${ev.participantCount} người${ev.maxParticipants ? ` / tối đa ${ev.maxParticipants}` : ''}`} />
          </div>

          <EventRegistrationSection ev={ev} />

          {ev.description && (
            <div style={{ borderTop: C.border, paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.inkMuted, marginBottom: 8 }}>Mô tả</div>
              <p style={{ fontSize: 14, color: C.inkDim, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{ev.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Registration + check-in QR (in the event modal) ────────────── */
function EventRegistrationSection({ ev }: { ev: PortalEventItem }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [myReg, setMyReg] = useState<EventRegistrationItem | null | undefined>(undefined) // undefined = loading
  const [busy, setBusy] = useState(false)

  const closed = ev.status === 'Completed' || ev.status === 'Cancelled'
  const isFull = ev.maxParticipants != null && ev.participantCount >= ev.maxParticipants

  useEffect(() => {
    if (!isAuthenticated) { setMyReg(null); return }
    let alive = true
    setMyReg(undefined)
    getMyEventRegistration(ev.id)
      .then(r => { if (alive) setMyReg(r ?? null) })
      .catch(() => { if (alive) setMyReg(null) })
    return () => { alive = false }
  }, [ev.id, isAuthenticated])

  async function handleRegister() {
    setBusy(true)
    try {
      const r = await registerSelfForEvent(ev.id)
      setMyReg(r)
      toast.success('Đăng ký tham gia thành công')
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại'
      toast.error(msg)
    } finally { setBusy(false) }
  }

  async function handleCancel() {
    setBusy(true)
    try {
      await unregisterSelfFromEvent(ev.id)
      setMyReg(null)
      toast.success('Đã hủy đăng ký')
    } catch { toast.error('Không thể hủy đăng ký') }
    finally { setBusy(false) }
  }

  const box: React.CSSProperties = { borderTop: C.border, marginTop: 4, paddingTop: 16 }
  const heading = (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.inkMuted, marginBottom: 10 }}>
      Đăng ký tham gia
    </div>
  )

  // Not logged in → login banner
  if (!isAuthenticated) {
    return (
      <div style={box}>
        {heading}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: C.bg, border: C.border, borderRadius: C.radius, padding: '14px 16px' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Đăng nhập để đăng ký</div>
            <div style={{ fontSize: 12.5, color: C.inkMuted, marginTop: 2 }}>Bạn cần đăng nhập để tham gia sự kiện và nhận mã check-in.</div>
          </div>
          <button onClick={() => navigate('/login')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: C.radiusPill,
            background: C.ink, color: C.lemon, border: C.border, boxShadow: C.shadow(2, 2),
            fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}><LogIn size={15} /> Đăng nhập</button>
        </div>
      </div>
    )
  }

  // Loading
  if (myReg === undefined) {
    return <div style={box}>{heading}<div style={{ fontSize: 13, color: C.inkMuted }}>Đang kiểm tra đăng ký…</div></div>
  }

  // Registered → QR + status
  if (myReg) {
    const checkedIn = !!myReg.checkedInAt
    return (
      <div style={box}>
        {heading}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: C.bg, border: C.border, borderRadius: C.radius, padding: 16 }}>
          {myReg.checkInCode && (
            <div style={{ background: '#fff', border: C.border, borderRadius: 12, padding: 10, flexShrink: 0, lineHeight: 0 }}>
              <QRCodeCanvas value={myReg.checkInCode} size={140} level="M" includeMargin={false} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
              <Check size={16} /> Bạn đã đăng ký tham gia
            </div>
            <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5, marginBottom: 10 }}>
              Đưa mã QR này cho ban tổ chức tại sự kiện để check-in.
            </div>
            {checkedIn ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: C.radiusPill, padding: '4px 10px' }}>
                ✓ Đã check-in lúc {fmtTime(myReg.checkedInAt)}
              </div>
            ) : (
              <button onClick={handleCancel} disabled={busy} style={{
                padding: '8px 16px', borderRadius: C.radiusPill, background: C.card,
                color: C.coral, border: `1.5px solid ${C.coral}`, fontSize: 12.5, fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1,
              }}>Hủy đăng ký</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Logged in, not registered
  return (
    <div style={box}>
      {heading}
      {closed ? (
        <div style={{ fontSize: 13, color: C.inkMuted, background: C.bg, border: C.border, borderRadius: C.radius, padding: '14px 16px' }}>
          Sự kiện {ev.status === 'Cancelled' ? 'đã hủy' : 'đã kết thúc'} — không còn nhận đăng ký.
        </div>
      ) : isFull ? (
        <div style={{ fontSize: 13, fontWeight: 700, color: C.coral, background: C.bg, border: `1.5px solid ${C.coral}`, borderRadius: C.radius, padding: '14px 16px' }}>
          Sự kiện đã đủ số lượng tham gia.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: C.bg, border: C.border, borderRadius: C.radius, padding: '14px 16px' }}>
          <div style={{ flex: 1, minWidth: 180, fontSize: 12.5, color: C.inkMuted }}>
            {ev.maxParticipants != null
              ? `Còn ${Math.max(0, ev.maxParticipants - ev.participantCount)} chỗ trống`
              : 'Đăng ký để nhận mã check-in.'}
          </div>
          <button onClick={handleRegister} disabled={busy} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: C.radiusPill,
            background: C.coral, color: C.bg, border: C.border, boxShadow: C.shadow(2, 2),
            fontSize: 13.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: busy ? 0.7 : 1,
          }}><Ticket size={15} /> {busy ? 'Đang đăng ký…' : 'Đăng ký tham gia'}</button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: C.coral, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        <div style={{ fontSize: 14, color: C.ink, fontWeight: 600, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function FeedGridSkeleton() {
  return (
    <section style={{ padding: '8px 28px 56px', flex: 1 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ ...glassCard, borderRadius: C.radius, border: C.border, boxShadow: C.shadow(), height: 220, overflow: 'hidden' }}>
              <div style={{ height: 40, borderBottom: C.border, background: 'rgba(0,0,0,.04)' }} />
              <div style={{ padding: 16 }}>
                <div style={{ width: 90, height: 18, borderRadius: 999, background: 'rgba(0,0,0,.06)', marginBottom: 12 }} />
                <div style={{ width: '90%', height: 16, borderRadius: 6, background: 'rgba(0,0,0,.08)', marginBottom: 8 }} />
                <div style={{ width: '70%', height: 12, borderRadius: 6, background: 'rgba(0,0,0,.05)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
