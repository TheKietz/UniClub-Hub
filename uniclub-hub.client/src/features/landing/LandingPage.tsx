import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, Rv, Tag, ClubCard, Marquee, PublicFooter, type ClubCardData } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import { getClubs } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import { getPublicSettings } from '@/components/membership/services/adminApi'

const CLUB_COLORS = [C.indigo, C.violet, C.coral, C.mint, C.sky, C.pink, C.lemon, C.coral]

function toCardData(c: ClubListItem, i: number): ClubCardData {
  return {
    id: c.id,
    name: c.name,
    short: c.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase(),
    category: c.categoryName ?? '',
    memberCount: c.memberCount ?? 0,
    hue: (i * 47 + 200) % 360,
    description: c.description ?? '',
    isRecruiting: false, // will be populated when API supports it
    color: CLUB_COLORS[i % CLUB_COLORS.length],
    logoUrl: c.logoUrl,
  }
}

const ACTIVITIES = [
  { text: 'Volunteer Club vừa mở đơn tuyển thành viên khoá mới', time: '2 phút trước', color: C.mint, tag: 'Tuyển dụng' },
  { text: 'Workshop kỹ năng thuyết trình — đã có 28/40 đăng ký', time: '15 phút trước', color: C.indigo, tag: 'Workshop' },
  { text: '15 sinh viên mới tham gia các CLB trong tuần này', time: '1 giờ trước', color: C.violet, tag: 'Thành viên' },
  { text: 'IT Society công bố đề bài Hackathon học kỳ mới', time: '5 giờ trước', color: C.sky, tag: 'Cuộc thi' },
  { text: 'Photography Club mở workshop chụp ảnh cuối tuần', time: 'Hôm qua', color: C.coral, tag: 'Workshop' },
  { text: 'Marketing Club kết nối với 3 doanh nghiệp đối tác', time: 'Hôm qua', color: C.pink, tag: 'Networking' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<ClubListItem[]>([])
  const [pubSettings, setPubSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    getClubs().then(setClubs).catch(() => { })
    getPublicSettings().then(setPubSettings).catch(() => { })
  }, [])

  const bannerEnabled = pubSettings['landing.banner_enabled'] === 'true'
  const bannerText    = pubSettings['landing.banner_text']?.trim()
  const bannerColor   = pubSettings['landing.banner_color']?.trim() || '#f59e0b'

  const cardClubs = clubs.map(toCardData)
  const allPreview = cardClubs.slice(0, 8)
  const marqueeItems = clubs.length > 0
    ? clubs.map(c => c.name.toUpperCase())
    : ['CLB ĐANG HOẠT ĐỘNG', 'SỰ KIỆN HÀNG TUẦN', 'TUYỂN THÀNH VIÊN']

  return (
    <div className="v3-page v3-enter">
      <PublicHeader />

      {/* ─── Banner ───────────────────────────────────── */}
      {bannerEnabled && bannerText && (
        <div style={{
          background: bannerColor, borderBottom: C.border,
          padding: '10px 28px', textAlign: 'center',
          fontSize: 13.5, fontWeight: 700, color: C.ink,
          letterSpacing: '-.01em',
        }}>
          {bannerText}
        </div>
      )}

      {/* ─── Hero ─────────────────────────────────────── */}
      <section style={{ padding: '52px 28px 44px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          {/* Decorations */}
          <div aria-hidden style={{
            position: 'absolute', top: 20, right: 80, width: 88, height: 88,
            borderRadius: C.radiusPill, background: C.lemon, border: C.border,
            animation: 'float 4s ease-in-out infinite',
            display: 'grid', placeItems: 'center', color: C.ink,
            fontWeight: 900, fontSize: 10, textAlign: 'center', lineHeight: 1.2,
          } as React.CSSProperties}>WELCOME<br />TO UEF</div>
          <div aria-hidden style={{
            position: 'absolute', top: 140, right: 200,
            fontSize: 28, color: C.coral, animation: 'float 3s ease-in-out infinite .5s',
          }} >★</div>
          <div aria-hidden style={{
            position: 'absolute', top: 60, right: 260,
            width: 40, height: 40, borderRadius: 999,
            background: C.mint, border: C.border, opacity: 0.6,
            animation: 'float 5s ease-in-out infinite 1s',
          }} />
          {/* 
          <Rv>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: C.card, border: C.border, borderRadius: C.radiusPill,
              padding: '5px 14px', marginBottom: 20,
              boxShadow: C.shadow(2, 2), fontSize: 12.5, fontWeight: 600, color: C.inkDim,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: C.mint, animation: 'pulse 2s infinite' }} />
              {clubs.length > 0 ? `${clubs.length} câu lạc bộ · UEF` : 'Đang tải dữ liệu...'}
            </div>
          </Rv> */}

          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(44px, 6.5vw, 72px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: 0, maxWidth: 800,
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Cổng thông tin<br />
              <span style={{ color: C.coral }}>câu lạc bộ</span>{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                sinh viên
              </span><br />
              <span style={{
                display: 'inline-block', background: C.lemon, padding: '0 14px',
                border: C.border, borderRadius: 12, transform: 'rotate(-1deg)',
              }}>UEF.</span>
            </h1>
          </Rv>

          <Rv delay={140}>
            <p style={{ fontSize: 18, color: C.inkDim, lineHeight: 1.5, maxWidth: 520, margin: '20px 0 0', fontWeight: 500 }}>
              Khám phá {clubs.length > 0 ? `${clubs.length} CLB` : 'các CLB'}, tham gia hoạt động và
              tìm câu lạc bộ phù hợp với bạn tại UEF.
            </p>
          </Rv>

          <Rv delay={200}>
            <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/clubs')} style={{
                height: 52, padding: '0 24px', borderRadius: C.radius,
                background: C.ink, color: C.lemon, border: C.border,
                fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
              }}>Khám phá CLB →</button>
              <button onClick={() => navigate('/login')} style={{
                height: 52, padding: '0 24px', borderRadius: C.radius,
                background: C.card, color: C.ink, border: C.border,
                fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
              }}>🎓 Đăng nhập ngay</button>
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── Marquee dark ─────────────────────────────── */}
      <Marquee tone="dark" items={[
        `${clubs.length || '—'} CÂU LẠC BỘ`, 'SINH VIÊN UEF',
        'WORKSHOP · HACKATHON · GALA', 'SỰ KIỆN HÀNG TUẦN', 'TUYỂN THÀNH VIÊN',
      ]} />

      {/* ─── Stats ────────────────────────────────────── */}
      <section style={{ background: C.ink, padding: '44px 28px', borderBottom: C.border }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20,
        }}>
          {[
            { n: clubs.length > 0 ? String(clubs.length) : '—', l: 'Câu lạc bộ', color: C.coral },
            { n: clubs.reduce((s, c) => s + (c.memberCount ?? 0), 0) > 0 ? clubs.reduce((s, c) => s + (c.memberCount ?? 0), 0).toLocaleString() : '—', l: 'Lượt tham gia', color: C.lemon },
            { n: clubs.filter(c => c.status === 'Active').length > 0 ? String(clubs.filter(c => c.status === 'Active').length) : String(clubs.length) || '—', l: 'CLB hoạt động', color: C.mint },
            { n: String(new Set(clubs.map(c => c.categoryName)).size) || '—', l: 'Lĩnh vực', color: C.sky },
          ].map((s, i) => (
            <Rv key={s.l} delay={i * 80}>
              <div>
                <div style={{ color: s.color, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1 }}>
                  {s.n}
                </div>
                <div style={{ color: C.bg, fontSize: 14, marginTop: 6, opacity: 0.7, fontWeight: 500 }}>{s.l}</div>
              </div>
            </Rv>
          ))}
        </div>
      </section>

      {/* ─── Hoạt động gần đây ────────────────────────── */}
      <section style={{ padding: '52px 28px 44px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Rv>
            <Tag bg={C.violet} color={C.bg} style={{ marginBottom: 12 }}>Mới cập nhật</Tag>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.03em', lineHeight: 1, margin: '0 0 24px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Đang diễn ra{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                tại UEF.
              </span>
            </h2>
          </Rv>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {ACTIVITIES.map((a, i) => (
              <Rv key={i} delay={i * 50}>
                <div className="card-lift" style={{
                  display: 'flex', gap: 14, alignItems: 'center',
                  padding: '14px 16px', borderRadius: C.radius,
                  border: C.border, boxShadow: C.shadow(), background: C.card, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: a.color, border: C.border,
                    display: 'grid', placeItems: 'center',
                    color: C.bg, fontSize: 18,
                  }}>★</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.35, marginBottom: 3 }}>
                      {a.text}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: a.color, color: C.bg, letterSpacing: '.04em',
                      }}>{a.tag}</span>
                      <span style={{ fontSize: 11.5, color: C.inkMuted }}>{a.time}</span>
                    </div>
                  </div>
                </div>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tất cả CLB ───────────────────────────────── */}
      {allPreview.length > 0 && (
        <section style={{ padding: '44px 28px 56px', borderTop: C.border }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Rv>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <Tag style={{ marginBottom: 12 }}>{clubs.length} CLB · UEF</Tag>
                  <h2 style={{
                    fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.ink,
                    letterSpacing: '-.03em', lineHeight: 1, margin: 0,
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                  }}>
                    Tất cả{' '}
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                      câu lạc bộ.
                    </span>
                  </h2>
                </div>
                <button onClick={() => navigate('/clubs')} style={{
                  color: C.ink, fontSize: 14, fontWeight: 700,
                  background: 'none', border: 'none', borderBottom: `2px solid ${C.ink}`,
                  paddingBottom: 2, cursor: 'pointer', fontFamily: 'inherit',
                }}>Xem danh sách đầy đủ →</button>
              </div>
            </Rv>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {allPreview.map((club, i) => (
                <Rv key={club.id} delay={i * 40}>
                  <ClubCard club={club} compact onClick={() => navigate(`/clubs/${club.id}`)} />
                </Rv>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Marquee light ────────────────────────────── */}
      <Marquee tone="light" items={marqueeItems} speed={35} />

      <PublicFooter />
    </div>
  )
}
