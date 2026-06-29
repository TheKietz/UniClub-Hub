import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, Rv, Tag, Marquee, PublicFooter } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import SkyBackground from '@/components/public/SkyBackground'
import { useAuth } from '@/hooks/useAuth'
import { getClubs, getPublicCategories } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,.74)',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
}

const ROLES = [
  {
    title: 'Sinh viên', subtitle: 'Người dùng phổ thông', icon: '👤', color: C.indigo, headerBg: '#eff6ff',
    features: [
      ['Khám phá câu lạc bộ', 'Tìm CLB theo lĩnh vực, xem thông tin và hoạt động'],
      ['Nộp đơn ứng tuyển online', 'Điền form, theo dõi trạng thái đơn ngay trên dashboard'],
      ['Quản lý hoạt động cá nhân', 'Lịch sử tham gia, task được giao, KPI cá nhân'],
      ['Nhận thông báo theo thời gian thực', 'Cập nhật từ CLB và sự kiện sắp tới'],
    ],
  },
  {
    title: 'Ban chủ nhiệm', subtitle: 'Quản lý CLB', icon: '⚙', color: C.coral, headerBg: '#fff0f0',
    features: [
      ['Duyệt đơn ứng tuyển', 'Pipeline tuyển thành viên nhiều vòng, phân quyền duyệt'],
      ['Quản lý thành viên & phòng ban', 'Sơ đồ tổ chức, vị trí, phân quyền từng ban'],
      ['Tổ chức sự kiện & công việc', 'Kanban, lịch sự kiện, báo cáo hoạt động'],
      ['Theo dõi KPI thành viên', 'Đặt mục tiêu, chấm điểm, xuất báo cáo'],
    ],
  },
  {
    title: 'Admin nhà trường', subtitle: 'Quản trị hệ thống', icon: '🏫', color: '#16a34a', headerBg: '#f0fdf4',
    features: [
      ['Tổng quan toàn hệ thống', 'Dashboard thống kê tất cả CLB, thành viên, đơn đăng ký'],
      ['Quản lý CLB & người dùng', 'Tạo CLB, phân quyền, quản lý tài khoản toàn trường'],
      ['Cấu hình trang chủ', 'Slider banner, thông báo toàn trường, lĩnh vực CLB'],
      ['Nhật ký & báo cáo', 'Audit log toàn hệ thống, xuất báo cáo theo kỳ'],
    ],
  },
]

const FEATURES = [
  ['📋', '#eff6ff', C.indigo, 'Tuyển thành viên tự động', 'Form đăng ký tuỳ chỉnh, pipeline nhiều vòng, thông báo kết quả tự động — không cần quản lý bằng Excel.'],
  ['📊', '#fff0f0', C.coral, 'KPI & đánh giá thành viên', 'Đặt mục tiêu theo kỳ, chấm điểm hoạt động, xem báo cáo đóng góp từng thành viên.'],
  ['📅', '#f0fdf4', '#16a34a', 'Quản lý sự kiện & lịch', 'Tạo sự kiện, theo dõi đăng ký tham dự, xem lịch tổng hợp theo tháng.'],
  ['✅', '#eff6ff', C.indigo, 'Kanban tasks', 'Giao việc, theo dõi tiến độ, phân công công việc trong ban theo thời gian thực.'],
  ['🔔', '#fefce8', '#ca8a04', 'Thông báo thời gian thực', 'Cập nhật ngay khi có đơn mới, task được giao, sự kiện sắp tới hoặc thay đổi trong CLB.'],
  ['🏛', '#fdf2f8', '#9d174d', 'Sơ đồ tổ chức', 'Cấu trúc CLB rõ ràng — ban bộ phận, vị trí, quyền hạn từng thành viên trong hệ thống phân cấp.'],
] as const

export default function AboutPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [clubs, setClubs] = useState<ClubListItem[]>([])
  const [categoryCount, setCategoryCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getClubs(), getPublicCategories()]).then(([clubsResult, catResult]) => {
      if (clubsResult.status === 'fulfilled') setClubs(clubsResult.value)
      if (catResult.status === 'fulfilled') setCategoryCount(catResult.value.length)
      setLoading(false)
    })
  }, [])

  const clubCount = clubs.length
  const totalMembers = clubs.reduce((s, c) => s + (c.memberCount ?? 0), 0)
  const marqueeItems = clubs.length > 0
    ? clubs.map(c => c.name.toUpperCase())
    : ['CLB ĐANG HOẠT ĐỘNG', 'TUYỂN THÀNH VIÊN', 'SINH VIÊN UEF']

  const stats = [
    { value: loading ? '—' : `${clubCount}`, label: 'Câu lạc bộ đang hoạt động', color: '#93c5fd' },
    { value: loading ? '—' : `${totalMembers.toLocaleString()}`, label: 'Sinh viên đã tham gia', color: '#fca5a5' },
    { value: loading ? '—' : `${categoryCount}`, label: 'Lĩnh vực: Học thuật, Văn nghệ, Công nghệ...', color: '#86efac' },
  ]

  return (
    <div className="v3-page v3-enter" style={{ background: 'transparent' }}>
      <SkyBackground />
      <PublicHeader />

      {/* ── Hero ── */}
      <section style={{ padding: '132px 28px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Rv>
            <Tag bg={C.bg} color={C.ink} style={{ boxShadow: C.shadow(2, 2), marginBottom: 20 }}>
              Nền tảng chính thức · UEF Campus
            </Tag>
          </Rv>
          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.97, margin: '0 0 20px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Về{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                UniClub
              </span>{' '}
              <span style={{
                display: 'inline-block', background: C.coral, color: C.bg,
                padding: '0 14px', border: C.border, borderRadius: 12, transform: 'rotate(-1.2deg)',
              }}>Hub.</span>
            </h1>
          </Rv>
          <Rv delay={120}>
            <p style={{ fontSize: 17, color: C.inkDim, lineHeight: 1.6, maxWidth: 560, margin: '0 auto 32px', fontWeight: 500 }}>
              Hệ thống quản lý câu lạc bộ sinh viên tập trung — nơi mọi CLB và mọi sinh viên UEF kết nối với nhau trong một nơi duy nhất.
            </p>
          </Rv>
          <Rv delay={180}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/clubs')} style={{
                height: 50, padding: '0 24px', borderRadius: C.radius,
                background: C.ink, color: C.bg, border: C.border,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: C.shadow(),
              }}>Khám phá CLB →</button>
              {!isAuthenticated && (
                <button onClick={() => navigate('/register')} style={{
                  height: 50, padding: '0 24px', borderRadius: C.radius,
                  background: C.card, color: C.ink, border: C.border,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: C.shadow(),
                }}>Đăng ký tài khoản</button>
              )}
            </div>
          </Rv>
        </div>
      </section>

      <Marquee tone="dark" items={marqueeItems} />

      {/* ── What is UniClub Hub ── */}
      <section style={{ padding: '64px 28px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <Rv>
              <Tag bg={C.ink} color={C.bg} style={{ marginBottom: 16 }}>Giới thiệu</Tag>
              <h2 style={{
                fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: C.ink,
                letterSpacing: '-.04em', lineHeight: 1, marginBottom: 20,
              }}>
                Một nơi cho tất cả<br />
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: C.indigo }}>
                  câu lạc bộ UEF.
                </span>
              </h2>
              <p style={{ fontSize: 15, color: C.inkDim, lineHeight: 1.75, marginBottom: 16, fontWeight: 450 }}>
                UniClub Hub là nền tảng quản lý và kết nối câu lạc bộ sinh viên tại Trường Đại học Kinh tế – Tài chính TP.HCM (UEF). Thay vì mỗi CLB tự vận hành bằng form giấy, nhóm chat rời rạc hay bảng tính — tất cả được tập trung vào một hệ thống thống nhất.
              </p>
              <p style={{ fontSize: 15, color: C.inkDim, lineHeight: 1.75, fontWeight: 450 }}>
                Sinh viên tìm CLB, nộp đơn ứng tuyển và theo dõi hoạt động ngay trên web. Ban chủ nhiệm quản lý thành viên, duyệt đơn và tổ chức sự kiện trong một dashboard riêng.
              </p>
            </Rv>
            <Rv delay={100}>
              <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[['#16a34a', 'Miễn phí hoàn toàn'], [C.indigo, 'Dành riêng cho UEF'], [C.coral, 'Cập nhật liên tục']].map(([dot, label]) => (
                  <div key={label} style={{
                    ...glassCard, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 10, border: C.border,
                    boxShadow: C.shadow(2, 2), fontSize: 13, fontWeight: 700,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: dot }} />
                    {label}
                  </div>
                ))}
              </div>
            </Rv>
          </div>

          <Rv delay={120}>
            <div style={{
              borderRadius: C.radius, border: C.border, boxShadow: C.shadow(),
              overflow: 'hidden', background: C.ink, aspectRatio: '4/3',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 28,
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 1px, transparent 1px 20px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: C.bg, color: C.ink,
                  display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22,
                  transform: 'rotate(-4deg)', border: C.border, boxShadow: `2px 2px 0 ${C.coral}`,
                }}>U</div>
                <Tag bg="rgba(255,255,255,.12)" color={C.bg} style={{ border: '1px solid rgba(255,255,255,.2)' }}>UEF Campus</Tag>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>
                  Hệ thống CLB sinh viên
                </div>
                <div style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 900, color: C.bg, letterSpacing: '-.04em', lineHeight: 1 }}>
                  {loading ? '—' : clubCount} CLB<br />
                  <span style={{ color: C.sky }}>·</span> 1 nền tảng<span style={{ color: C.sky }}>.</span>
                </div>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                background: 'rgba(255,255,255,.12)', borderRadius: 10, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,.12)',
              }}>
                {[[loading ? '—' : `${clubCount}`, 'CLB'], [loading ? '—' : `${totalMembers}`, 'Sinh viên'], [loading ? '—' : `${categoryCount}`, 'Lĩnh vực']].map(([v, l]) => (
                  <div key={l} style={{ padding: 12, background: 'rgba(255,255,255,.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.bg, lineHeight: 1 }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Rv>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ background: C.ink, borderTop: C.border, borderBottom: C.border }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {stats.map((s, i) => (
            <Rv key={s.label} delay={i * 80}>
              <div style={{
                padding: '40px 28px',
                borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,.1)' : 'none',
              }}>
                <div style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.04em', color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 500, marginTop: 6 }}>{s.label}</div>
              </div>
            </Rv>
          ))}
        </div>
      </div>

      {/* ── 3 roles ── */}
      <section style={{ padding: '64px 28px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <Rv>
            <Tag bg={C.coral} color={C.bg} style={{ marginBottom: 14 }}>Ai dùng được?</Tag>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: C.ink, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 40 }}>
              Thiết kế cho <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>mọi sinh viên.</span>
            </h2>
          </Rv>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {ROLES.map((role, i) => (
              <Rv key={role.title} delay={i * 80}>
                <div className="card-lift" style={{ ...glassCard, borderRadius: C.radius, border: C.border, boxShadow: C.shadow(), overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: C.border, display: 'flex', alignItems: 'center', gap: 14, background: role.headerBg }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, border: C.border, flexShrink: 0,
                      display: 'grid', placeItems: 'center', fontSize: 20, background: role.color, color: C.bg,
                    }}>{role.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{role.title}</div>
                      <div style={{ fontSize: 12, color: C.inkDim, marginTop: 2 }}>{role.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ padding: 20 }}>
                    {role.features.map(([title, desc], fi) => (
                      <div key={title} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                        borderBottom: fi < role.features.length - 1 ? `1px dashed ${C.rule}` : 'none',
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 900, color: C.bg, background: role.color,
                        }}>✓</div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{title}</div>
                          <div style={{ fontSize: 12, color: C.inkDim }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '0 28px 64px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <Rv>
            <Tag bg={C.indigo} color={C.bg} style={{ marginBottom: 14 }}>Tính năng</Tag>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: C.ink, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 32 }}>
              Đầy đủ công cụ <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>để vận hành CLB.</span>
            </h2>
          </Rv>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {FEATURES.map(([icon, bg, color, title, desc], i) => (
              <Rv key={title} delay={i * 60}>
                <div className="card-lift" style={{ ...glassCard, borderRadius: C.radius, border: C.border, boxShadow: C.shadow(), padding: 24 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, border: C.border, marginBottom: 16,
                    display: 'grid', placeItems: 'center', fontSize: 18, background: bg, color,
                  }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 8, letterSpacing: '-.01em' }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vision ── */}
      <section style={{ padding: '0 28px 64px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <Rv>
            <div style={{
              borderRadius: 24, padding: 52, background: C.coral, border: C.border, boxShadow: C.shadow(),
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 1px, transparent 1px 20px)',
            }}>
              <div>
                <Tag bg="rgba(255,255,255,.15)" color={C.bg} style={{ border: '1px solid rgba(255,255,255,.25)', marginBottom: 20 }}>Tầm nhìn</Tag>
                <div style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 900, color: C.bg, letterSpacing: '-.03em', lineHeight: 1.1 }}>
                  Xây dựng cộng đồng CLB<br />
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>sinh viên UEF</span><br />
                  vững mạnh và bền vững.
                </div>
              </div>
              <div>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', lineHeight: 1.7, fontWeight: 450, marginBottom: 20 }}>
                  UniClub Hub hướng đến việc số hoá toàn bộ hoạt động câu lạc bộ sinh viên — từ tuyển thành viên, vận hành nội bộ đến báo cáo lên nhà trường — giúp sinh viên có nhiều thời gian hơn để tập trung vào điều thực sự quan trọng: <strong style={{ color: C.bg }}>trải nghiệm và phát triển bản thân.</strong>
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('/clubs')} style={{
                    height: 44, padding: '0 20px', borderRadius: C.radiusPill,
                    background: C.bg, color: C.coral, border: C.border,
                    fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: C.shadow(3, 3),
                  }}>Xem danh sách CLB →</button>
                  {!isAuthenticated && (
                    <button onClick={() => navigate('/register')} style={{
                      height: 44, padding: '0 20px', borderRadius: C.radiusPill,
                      background: 'transparent', color: C.bg, border: '1px solid rgba(255,255,255,.4)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Tham gia ngay</button>
                  )}
                </div>
              </div>
            </div>
          </Rv>
        </div>
      </section>

      <Marquee tone="light" items={marqueeItems} speed={32} />

      <PublicFooter />
    </div>
  )
}
