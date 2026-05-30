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
    <div className="v3-page v3-enter landing-page">
      <style>{`
        .landing-hero {
          position: relative;
          overflow: hidden;
          background: ${C.bg};
        }
        .landing-confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        .landing-confetti span {
          position: absolute;
          box-sizing: border-box;
          z-index: 0;
        }
        .landing-confetti .dot-mint {
          width: 54px;
          height: 54px;
          border-radius: 999px;
          background: ${C.mint};
          border: ${C.border};
          opacity: .62;
        }
        .landing-confetti .ring-coral {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          border: 5px solid ${C.coral};
          background: transparent;
        }
        .landing-confetti .ring-mint {
          width: 68px;
          height: 68px;
          border-radius: 999px;
          border: 5px solid ${C.mint};
          background: transparent;
        }
        .landing-confetti .triangle-sky {
          width: 0;
          height: 0;
          border-left: 18px solid transparent;
          border-right: 18px solid transparent;
          border-bottom: 31px solid ${C.sky};
          filter: drop-shadow(2px 2px 0 ${C.ink});
          transform: rotate(-12deg);
        }
        .landing-confetti .star-coral {
          width: 36px;
          height: 36px;
          background: ${C.coral};
          clip-path: polygon(50% 0%, 62% 35%, 100% 35%, 68% 56%, 80% 92%, 50% 70%, 20% 92%, 32% 56%, 0 35%, 38% 35%);
        }
        .landing-confetti .spark-violet {
          width: 28px;
          height: 28px;
          background: ${C.violet};
          clip-path: polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%);
          filter: drop-shadow(1.5px 1.5px 0 ${C.ink});
        }
        .landing-confetti .pill-sky {
          width: 70px;
          height: 22px;
          border-radius: 999px;
          border-top: 5px solid ${C.sky};
          border-bottom: 5px solid ${C.sky};
          transform: rotate(12deg);
        }
        .landing-confetti .square-pink {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: ${C.pink};
          border: ${C.border};
          transform: rotate(13deg);
        }
        .landing-confetti .plus-coral {
          width: 30px;
          height: 30px;
        }
        .landing-confetti .plus-coral::before,
        .landing-confetti .plus-coral::after {
          content: '';
          position: absolute;
          background: ${C.coral};
          border-radius: 2px;
        }
        .landing-confetti .plus-coral::before {
          width: 30px;
          height: 9px;
          top: 10.5px;
        }
        .landing-confetti .plus-coral::after {
          width: 9px;
          height: 30px;
          left: 10.5px;
        }
        .landing-confetti .welcome {
          width: 122px;
          height: 122px;
          border-radius: 999px;
          border: ${C.border};
          background: ${C.lemon};
          display: grid;
          place-items: center;
          text-align: center;
          color: ${C.ink};
          font-size: 13px;
          font-weight: 900;
          line-height: 1.2;
          transform: rotate(13deg);
        }
        .landing-confetti .welcome b {
          display: block;
          transform: rotate(10deg);
        }
        .landing-hero-content {
          position: relative;
          z-index: 1;
        }
        @media (max-width: 820px) {
          .landing-confetti .welcome,
          .landing-confetti .ring-coral,
          .landing-confetti .dot-mint {
            opacity: .35;
            transform: scale(.75);
          }
          .landing-confetti .pill-sky,
          .landing-confetti .square-pink {
            display: none;
          }
        }
      `}</style>
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
      <section className="landing-hero" style={{ padding: '52px 28px 44px' }}>
        <div className="landing-confetti" aria-hidden>
          <span className="triangle-sky" style={{ left: '73%', top: '13%', animation: 'float 4.5s ease-in-out infinite' }} />
          <span className="spark-violet" style={{ left: '55%', top: '25%', animation: 'float 4s ease-in-out infinite .3s' }} />
          <span className="dot-mint" style={{ left: '73%', top: '34%', animation: 'float 5s ease-in-out infinite .8s' }} />
          <span className="ring-coral" style={{ right: '7%', top: '20%', animation: 'float 5s ease-in-out infinite .5s' }} />
          <span className="welcome" style={{ right: '12%', top: '26%', animation: 'float 4.8s ease-in-out infinite .2s' }}>
            <b>WELCOME<br />TO UEF</b>
          </span>
          <span className="pill-sky" style={{ right: '10%', top: '55%', animation: 'float 3.8s ease-in-out infinite .9s' }} />
          <span className="star-coral" style={{ right: '20%', top: '61%', animation: 'float 3.2s ease-in-out infinite .4s' }} />
          <span className="square-pink" style={{ right: '11%', bottom: '13%', animation: 'float 4.2s ease-in-out infinite .6s' }} />
          <span className="plus-coral" style={{ left: '70%', bottom: '8%', animation: 'float 4.6s ease-in-out infinite 1s' }} />
          <span className="ring-mint" style={{ left: '10%', bottom: '8%', animation: 'float 5.2s ease-in-out infinite .7s' }} />
        </div>

        <div className="landing-hero-content" style={{ maxWidth: 1280, margin: '0 auto' }}>
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
