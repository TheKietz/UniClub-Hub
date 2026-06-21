import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { C, Rv, Tag, ClubCard, CatPill, Marquee, PublicFooter } from '@/components/public/publicComponents'
import { LandingClubGridSkeleton } from '@/components/public/LandingSkeleton'
import SkyBackground from '@/components/public/SkyBackground'
import { toClubCardData } from '@/components/public/clubCardMapper'
import PublicHeader from '@/components/layouts/PublicHeader'
import { useAuth } from '@/contexts/AuthContext'
import { getClubs, getPublicCategories } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import { getPublicSettings } from '@/components/membership/services/adminApi'

type LandingSlide = {
  eyebrow: string
  title: string
  description: string
  imageUrl?: string
  ctaLabel?: string
  ctaHref?: string
  accent?: string
}

const DEFAULT_SLIDES: LandingSlide[] = [
  {
    eyebrow: 'Spotlight tuần này',
    title: 'Workshop, tuyển thành viên và sân chơi mới trong một nơi.',
    description: 'Dùng khu vực này để admin ghim banner quan trọng, ảnh sự kiện hoặc thông báo nổi bật trên trang chủ.',
    ctaLabel: 'Xem hoạt động',
    ctaHref: '/clubs',
    accent: C.indigo,
  },
  {
    eyebrow: 'Dành cho tân sinh viên',
    title: 'Tìm CLB hợp gu trước khi bỏ lỡ mùa tuyển quân.',
    description: 'Slider có thể đổi nội dung theo từng đợt tuyển thành viên, tuần lễ định hướng hoặc sự kiện cấp trường.',
    ctaLabel: 'Khám phá CLB',
    ctaHref: '/clubs',
    accent: C.coral,
  },
  {
    eyebrow: 'UEF Club Hub',
    title: 'Một vị trí linh hoạt cho ảnh, poster và thông điệp của admin.',
    description: 'Admin có thể cấu hình tiêu đề, mô tả, link nút và URL ảnh thông qua cài đặt hệ thống.',
    ctaLabel: 'Đăng ký ngay',
    ctaHref: '/register',
    accent: C.mint,
  },
]

const ACTIVITIES = [
  { text: 'CLB Công nghệ UEF vừa mở đơn tuyển thành viên khoá mới', time: '2 phút trước', color: C.mint, tag: 'Tuyển dụng' },
  { text: 'Workshop kỹ năng thuyết trình — đã có 28/40 đăng ký', time: '15 phút trước', color: C.indigo, tag: 'Workshop' },
  { text: '15 sinh viên mới tham gia các CLB trong tuần này', time: '1 giờ trước', color: C.violet, tag: 'Thành viên' },
  { text: 'CLB Công nghệ UEF công bố đề bài Hackathon học kỳ mới', time: '5 giờ trước', color: C.sky, tag: 'Cuộc thi' },
  { text: 'CLB Âm nhạc UEF mở workshop cuối tuần', time: 'Hôm qua', color: C.coral, tag: 'Workshop' },
  { text: 'CLB Tiếng Anh UEF kết nối với 3 doanh nghiệp đối tác', time: 'Hôm qua', color: C.pink, tag: 'Networking' },
]

function parseLandingSlides(raw?: string): LandingSlide[] {
  if (!raw?.trim()) return []

  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []

    return data
      .map(item => ({
        eyebrow: typeof item?.eyebrow === 'string' ? item.eyebrow.trim() : '',
        title: typeof item?.title === 'string' ? item.title.trim() : '',
        description: typeof item?.description === 'string' ? item.description.trim() : '',
        imageUrl: typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : undefined,
        ctaLabel: typeof item?.ctaLabel === 'string' ? item.ctaLabel.trim() : undefined,
        ctaHref: typeof item?.ctaHref === 'string' ? item.ctaHref.trim() : undefined,
        accent: typeof item?.accent === 'string' ? item.accent.trim() : undefined,
      }))
      .filter(item => item.title && item.description)
  } catch {
    return []
  }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [clubs, setClubs] = useState<ClubListItem[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [pubSettings, setPubSettings] = useState<Record<string, string>>({})
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeClubFilter, setActiveClubFilter] = useState('Tất cả')
  const [clubsLoading, setClubsLoading] = useState(true)
  const [clubsError, setClubsError] = useState(false)
  const [clubsErrorHint, setClubsErrorHint] = useState<string | null>(null)
  const [categoriesError, setCategoriesError] = useState(false)

  function loadLandingData() {
    setClubsLoading(true)
    setClubsError(false)
    setClubsErrorHint(null)
    setCategoriesError(false)

    Promise.allSettled([getClubs(), getPublicCategories(), getPublicSettings()])
      .then(([clubsResult, categoriesResult, settingsResult]) => {
        if (clubsResult.status === 'fulfilled') {
          setClubs(clubsResult.value)
        } else {
          setClubs([])
          setClubsError(true)
          const err = clubsResult.reason as { code?: string; response?: { status?: number } }
          if (err?.code === 'ERR_NETWORK' || !err?.response) {
            setClubsErrorHint('Backend chưa chạy hoặc không kết nối được. Chạy: dotnet run --project UniClub-Hub.Server/UniClub-Hub.API.csproj rồi mở https://localhost:54610')
          } else {
            setClubsErrorHint(`API trả lỗi ${err.response?.status ?? 'không xác định'}. Thử tải lại hoặc kiểm tra tab Network trong DevTools.`)
          }
        }

        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value)
        } else {
          setCategories([])
          setCategoriesError(true)
        }

        if (settingsResult.status === 'fulfilled') {
          setPubSettings(settingsResult.value)
        } else {
          setPubSettings({})
        }
      })
      .finally(() => {
        setClubsLoading(false)
      })
  }

  useEffect(() => { loadLandingData() }, [])

  const bannerEnabled = pubSettings['landing.banner_enabled'] === 'true'
  const bannerText    = pubSettings['landing.banner_text']?.trim()
  const bannerColor   = pubSettings['landing.banner_color']?.trim() || '#f59e0b'
  const sliderEnabled = pubSettings['landing.slider_enabled'] !== 'false'
  const sliderSlides = parseLandingSlides(pubSettings['landing.slider_items'])
  const landingSlides = sliderSlides.length > 0 ? sliderSlides : DEFAULT_SLIDES
  const currentSlide = landingSlides[activeSlide] ?? landingSlides[0]

  const cardClubs = clubs.map(toClubCardData)
  const displayClubs = cardClubs
  const clubFilters = ['Tất cả', ...categories.map(c => c.name)]
  const filteredDisplayClubs = displayClubs.filter(c => {
    if (activeClubFilter === 'Tất cả') return true
    return c.category === activeClubFilter
  })
  const previewClubs = filteredDisplayClubs.slice(0, 8)
  const clubCountLabel = displayClubs.length
  const totalMembers = displayClubs.reduce((s, c) => s + (c.memberCount ?? 0), 0)
  const recruitingCount = displayClubs.filter(c => c.isRecruiting).length
  const marqueeItems = clubs.length > 0
    ? clubs.map(c => c.name.toUpperCase())
    : ['CLB ĐANG HOẠT ĐỘNG', 'SỰ KIỆN HÀNG TUẦN', 'TUYỂN THÀNH VIÊN']
  const signalItems = [
    { label: 'Gợi ý nhanh', value: clubsLoading ? 'Đang tải' : clubsError ? '—' : `${clubCountLabel} CLB UEF`, tone: C.coral },
    { label: 'Đang tuyển', value: clubsLoading ? 'Đang tải' : clubsError ? '—' : `${recruitingCount} CLB mở đơn`, tone: C.mint },
    { label: 'Thành viên', value: clubsLoading ? 'Đang tải' : clubsError ? '—' : `${totalMembers > 0 ? totalMembers.toLocaleString() : '—'} thành viên`, tone: C.ink },
  ]

  useEffect(() => {
    if (!sliderEnabled || landingSlides.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveSlide(index => (index + 1) % landingSlides.length)
    }, 6200)
    return () => window.clearInterval(timer)
  }, [landingSlides.length, sliderEnabled])

  useEffect(() => {
    if (activeSlide >= landingSlides.length) setActiveSlide(0)
  }, [activeSlide, landingSlides.length])

  function moveSlide(offset: number) {
    setActiveSlide(index => (index + offset + landingSlides.length) % landingSlides.length)
  }

  function openSlideAction(slide: LandingSlide) {
    if (!slide.ctaHref) return
    if (/^https?:\/\//i.test(slide.ctaHref)) {
      window.open(slide.ctaHref, '_blank', 'noopener,noreferrer')
      return
    }
    navigate(slide.ctaHref)
  }

  return (
    <div className="v3-page v3-enter landing-page" style={{ background: 'transparent' }}>
      <style>{`
        /* ── Nền trời cho TOÀN trang (cố định, nằm sau mọi section) ── */
        .landing-page { position: relative; background: transparent; }
        @media (prefers-reduced-motion: reduce) {
          .landing-hero-decor-icon { animation: none !important; }
        }
        /* hero trong suốt để dùng chung nền trời toàn trang */
        .landing-hero { position: relative; overflow: hidden; background: transparent; }
        .landing-hero-decor {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .landing-hero-decor-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
        }
        .landing-hero-decor-blob--left {
          width: 220px;
          height: 220px;
          top: 8%;
          left: 4%;
          background: radial-gradient(circle, rgba(29,78,216,.14) 0%, transparent 68%);
        }
        .landing-hero-decor-blob--right {
          width: 260px;
          height: 260px;
          top: 14%;
          right: 3%;
          background: radial-gradient(circle, rgba(225,29,42,.12) 0%, transparent 70%);
        }
        .landing-hero-decor-icon {
          position: absolute;
          color: ${C.ink};
          opacity: .12;
          font-size: 42px;
          font-weight: 900;
          line-height: 1;
          animation: landingDecorFloat 7s ease-in-out infinite;
        }
        .landing-hero-decor-icon--left { top: 22%; left: 8%; transform: rotate(-12deg); }
        .landing-hero-decor-icon--right { top: 18%; right: 9%; font-size: 36px; animation-delay: .8s; transform: rotate(10deg); }
        .landing-hero-decor-icon--bottom { bottom: 12%; left: 14%; font-size: 28px; opacity: .1; animation-delay: 1.4s; }
        @keyframes landingDecorFloat {
          0%, 100% { transform: translateY(0) rotate(-12deg); }
          50% { transform: translateY(-8px) rotate(-8deg); }
        }
        .landing-hero--solo { padding: 132px 28px 44px; }
        .landing-hero--with-banner { padding: 44px 28px; }
        .landing-hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .landing-banner { margin-top: 104px; }
        .landing-title {
          animation: landingTitleIn .75s cubic-bezier(.16, 1, .3, 1) both, landingTitleFloat 6s ease-in-out .9s infinite;
          transform-origin: 50% 60%;
        }
        .landing-title-badge {
          animation: landingBadgePop .78s cubic-bezier(.16, 1, .3, 1) .18s both,
                     landingBadgeWiggle 5s ease-in-out 1.2s infinite;
        }
        @keyframes landingBadgeWiggle {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1.6deg); }
        }
        /* chữ đỏ "câu lạc bộ" có hiệu ứng ánh sáng quét qua */
        .landing-title-accent {
          background: linear-gradient(100deg, #e11d2a 0%, #ff7a80 42%, #e11d2a 64%);
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: landingAccentShine 4.5s linear infinite;
        }
        @keyframes landingAccentShine {
          0%   { background-position: 220% 0; }
          100% { background-position: -40% 0; }
        }
        .landing-hero-actions {
          justify-content: center;
        }
        .landing-title-mobile-break {
          display: none;
        }
        .landing-glass-card {
          border: ${C.border};
          background: linear-gradient(135deg, rgba(255,255,255,.84), rgba(255,255,255,.58));
          box-shadow: 0 18px 44px rgba(10, 47, 110, .16);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
        }
        .landing-hero-signals {
          display: grid;
          grid-template-columns: repeat(3, minmax(160px, 1fr));
          gap: 12px;
          width: min(760px, 100%);
          margin-top: 28px;
        }
        .landing-hero-signal {
          border-radius: 18px;
          padding: 14px 16px;
          text-align: left;
          transform: translateY(0);
          animation: landingSignalFloat 5.5s ease-in-out infinite;
        }
        .landing-hero-signal:nth-child(2) { animation-delay: .45s; }
        .landing-hero-signal:nth-child(3) { animation-delay: .9s; }
        .landing-signal-label {
          color: ${C.inkMuted};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .landing-signal-value {
          color: ${C.ink};
          font-size: 20px;
          font-weight: 900;
          line-height: 1.1;
          margin-top: 5px;
        }
        .landing-stats-section {
          padding: 34px 28px 42px;
        }
        .landing-stats-grid {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .landing-stat-card {
          border-radius: 22px;
          padding: 22px 24px;
          min-height: 128px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .landing-final-cta {
          padding: 46px 28px 22px;
        }
        .landing-activities-section {
          padding: 44px 28px 28px;
        }
        .landing-activities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 14px;
        }
        .landing-activity-card {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 14px 16px;
          border-radius: 18px;
        }
        .landing-activity-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          flex-shrink: 0;
          border: ${C.border};
          display: grid;
          place-items: center;
          color: ${C.bg};
          font-size: 18px;
        }
        .landing-clubs-section {
          padding: 44px 28px 56px;
        }
        .landing-slider-section {
          padding: 28px 28px 36px;
        }
        .landing-slider-shell {
          max-width: 1280px;
          margin: 0 auto;
        }
        .landing-slider-panel {
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          padding: 28px;
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(360px, 1.05fr);
          gap: 28px;
          align-items: stretch;
        }
        .landing-slider-panel::before {
          content: "";
          position: absolute;
          inset: -40% 42% auto -12%;
          height: 260px;
          background: radial-gradient(circle, color-mix(in srgb, var(--slide-accent, ${C.indigo}) 34%, transparent) 0%, transparent 68%);
          pointer-events: none;
        }
        .landing-slider-copy {
          position: relative;
          z-index: 1;
          min-height: 290px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
        }
        .landing-slider-eyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          border: ${C.border};
          border-radius: ${C.radiusPill}px;
          background: rgba(255,255,255,.66);
          color: ${C.ink};
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .landing-slider-title {
          color: ${C.ink};
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: clamp(28px, 3.8vw, 48px);
          font-weight: 900;
          letter-spacing: -.04em;
          line-height: .98;
          margin: 18px 0 0;
        }
        .landing-slider-description {
          color: ${C.inkDim};
          font-size: 15.5px;
          font-weight: 550;
          line-height: 1.65;
          max-width: 540px;
          margin: 16px 0 0;
        }
        .landing-slider-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .landing-slider-dots {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .landing-slider-dot {
          width: 26px;
          height: 8px;
          border-radius: ${C.radiusPill}px;
          border: ${C.border};
          background: rgba(255,255,255,.55);
          cursor: pointer;
          transition: width .18s ease, background .18s ease;
        }
        .landing-slider-dot.is-active {
          width: 42px;
          background: var(--slide-accent, ${C.indigo});
        }
        .landing-slider-nav {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .landing-slider-icon-button {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: ${C.border};
          background: rgba(255,255,255,.72);
          color: ${C.ink};
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: ${C.shadow(2, 2)};
        }
        .landing-slider-media {
          position: relative;
          z-index: 1;
          min-height: 290px;
          border-radius: 24px;
          border: ${C.border};
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,.65) 0%, rgba(255,255,255,0) 32%),
            linear-gradient(135deg, var(--slide-accent, ${C.indigo}) 0%, ${C.sky} 56%, rgba(255,255,255,.78) 100%);
          box-shadow: ${C.shadow()};
        }
        .landing-slider-media img {
          width: 100%;
          height: 100%;
          min-height: 290px;
          object-fit: cover;
          display: block;
        }
        .landing-slider-visual {
          position: absolute;
          inset: 0;
          padding: 26px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: ${C.bg};
        }
        .landing-slider-visual-logo {
          width: 66px;
          height: 66px;
          border-radius: 18px;
          border: ${C.border};
          background: ${C.ink};
          color: ${C.lemon};
          display: grid;
          place-items: center;
          font-size: 26px;
          font-weight: 900;
          transform: rotate(-4deg);
          box-shadow: ${C.shadow(2, 2)};
        }
        .landing-slider-visual-title {
          max-width: 520px;
          font-size: clamp(26px, 4vw, 54px);
          font-weight: 900;
          letter-spacing: -.045em;
          line-height: .94;
          text-shadow: 0 8px 30px rgba(3, 24, 68, .22);
        }
        .landing-final-cta-panel {
          max-width: 1120px;
          margin: 0 auto;
          border-radius: 30px;
          padding: 34px 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }
        .landing-final-cta-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        @keyframes landingTitleIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes landingTitleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes landingBadgePop {
          from {
            opacity: 0;
            transform: rotate(-4deg) translateY(10px);
          }
          to {
            opacity: 1;
            transform: rotate(-1deg) translateY(0);
          }
        }
        @keyframes landingSignalFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-title,
          .landing-title-badge,
          .landing-hero-signal {
            animation: none !important;
          }
        }
        @media (max-width: 820px) {
          .landing-hero-decor-icon,
          .landing-hero-decor-blob { display: none; }
          .landing-banner { margin-top: 118px; }
          .landing-hero--solo { padding: 148px 20px 38px; }
          .landing-hero--with-banner { padding: 34px 20px 38px; }
          .landing-title {
            font-size: clamp(30px, 9.6vw, 38px) !important;
            letter-spacing: -.035em !important;
            max-width: 350px !important;
          }
          .landing-title-script {
            display: block;
            margin-top: -2px;
          }
          .landing-title-mobile-break {
            display: block;
          }
          .landing-hero-copy {
            font-size: 16px !important;
            max-width: 286px !important;
          }
          .landing-hero-actions {
            align-items: center;
            flex-direction: column;
          }
          .landing-hero-actions button {
            width: min(100%, 286px);
            justify-content: center;
          }
          .landing-hero-signals {
            display: flex;
            overflow-x: auto;
            width: calc(100vw - 40px);
            max-width: 350px;
            margin-top: 24px;
            margin-left: auto;
            margin-right: auto;
            padding: 0 2px 8px;
            scroll-snap-type: x mandatory;
          }
          .landing-hero-signal {
            flex: 0 0 218px;
            text-align: left;
            scroll-snap-align: center;
          }
          .landing-stats-section {
            padding: 28px 20px 34px;
          }
          .landing-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .landing-stat-card {
            min-height: 118px;
            padding: 18px 16px;
          }
          .landing-final-cta {
            padding: 34px 16px 12px;
          }
          .landing-slider-section {
            padding: 8px 16px 40px;
          }
          .landing-slider-panel {
            grid-template-columns: 1fr;
            border-radius: 24px;
            padding: 20px;
            gap: 18px;
          }
          .landing-slider-copy {
            min-height: 0;
            gap: 24px;
          }
          .landing-slider-title {
            font-size: clamp(28px, 9vw, 38px);
          }
          .landing-slider-description {
            font-size: 14.5px;
          }
          .landing-slider-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .landing-slider-actions button[data-cta="true"] {
            width: 100%;
            justify-content: center;
          }
          .landing-slider-media,
          .landing-slider-media img {
            min-height: 210px;
          }
          .landing-slider-nav {
            justify-content: space-between;
          }
          .landing-final-cta-panel {
            align-items: flex-start;
            flex-direction: column;
            border-radius: 24px;
            padding: 26px 22px;
          }
          .landing-final-cta-actions,
          .landing-final-cta-actions button {
            width: 100%;
          }
          .landing-final-cta-actions button {
            justify-content: center;
          }
        }
      `}</style>

      {/* ─── Nền trời + mây + icon cho toàn trang ───────── */}
      <SkyBackground />

      <PublicHeader />

      {/* ─── Banner ───────────────────────────────────── */}
      {bannerEnabled && bannerText && (
        <div className="landing-banner" style={{ display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
          <div className="landing-glass-card" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '9px 18px', borderRadius: C.radiusPill,
            fontSize: 13.5, fontWeight: 750, color: C.ink, letterSpacing: '-.01em',
          }}>
            <span style={{
              width: 9, height: 9, borderRadius: 999, flexShrink: 0,
              background: bannerColor, boxShadow: `0 0 0 4px ${bannerColor}22`,
            }} />
            {bannerText}
          </div>
        </div>
      )}

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className={`landing-hero ${bannerEnabled && bannerText ? 'landing-hero--with-banner' : 'landing-hero--solo'}`}>
        <div className="landing-hero-decor" aria-hidden>
          <span className="landing-hero-decor-blob landing-hero-decor-blob--left" />
          <span className="landing-hero-decor-blob landing-hero-decor-blob--right" />
          <span className="landing-hero-decor-icon landing-hero-decor-icon--left">✦</span>
          <span className="landing-hero-decor-icon landing-hero-decor-icon--right">🎓</span>
          <span className="landing-hero-decor-icon landing-hero-decor-icon--bottom">★</span>
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
            <h1 className="landing-title" style={{
              fontSize: 'clamp(44px, 6.5vw, 72px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: '0 auto', maxWidth: 900,
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Cổng thông<span className="landing-title-mobile-break" /> tin<br />
              <span className="landing-title-accent">câu lạc bộ</span>{' '}
              <span className="landing-title-script" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                sinh viên
              </span><br />
              <span className="landing-title-badge" style={{
                display: 'inline-block', background: C.coral, color: C.bg, padding: '0 14px',
                border: C.border, borderRadius: 12, transform: 'rotate(-1deg)',
              }}>UEF.</span>
            </h1>
          </Rv>

          <Rv delay={140}>
            <p className="landing-hero-copy" style={{ fontSize: 18, color: C.inkDim, lineHeight: 1.5, maxWidth: 560, margin: '20px auto 0', fontWeight: 500 }}>
              {clubsLoading
                ? 'Đang tải danh sách CLB tại UEF...'
                : clubsError
                  ? 'Khám phá các CLB, tham gia hoạt động và tìm câu lạc bộ phù hợp với bạn tại UEF.'
                  : `Khám phá ${clubCountLabel} CLB, tham gia hoạt động và tìm câu lạc bộ phù hợp với bạn tại UEF.`}
            </p>
          </Rv>

          <Rv delay={200}>
            <div className="landing-hero-actions" style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/clubs')} style={{
                height: 52, padding: '0 24px', borderRadius: C.radius,
                background: C.ink, color: C.lemon, border: C.border,
                fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
              }}>Khám phá CLB →</button>
              {!isAuthenticated && (
                <button onClick={() => navigate('/login')} style={{
                  height: 52, padding: '0 24px', borderRadius: C.radius,
                  background: C.card, color: C.ink, border: C.border,
                  fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
                }}>Đăng nhập</button>
              )}
              {!isAuthenticated && (
                <button onClick={() => navigate('/register')} style={{
                  height: 52, padding: '0 24px', borderRadius: C.radius,
                  background: C.coral, color: C.bg, border: C.border,
                  fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
                }}>Đăng ký →</button>
              )}
            </div>
          </Rv>

          <Rv delay={260}>
            <div className="landing-hero-signals">
              {signalItems.map(item => (
                <div key={item.label} className="landing-glass-card landing-hero-signal">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: item.tone, boxShadow: `0 0 0 4px ${item.tone}22` }} />
                    <span className="landing-signal-label">{item.label}</span>
                  </div>
                  <div className="landing-signal-value">{item.value}</div>
                </div>
              ))}
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── Dải chạy chữ (marquee) ngay sau hero ───────── */}
      <Marquee tone="dark" items={[
        `${clubCountLabel || '—'} CÂU LẠC BỘ`, 'SINH VIÊN UEF',
        'WORKSHOP · HACKATHON · GALA', 'SỰ KIỆN HÀNG TUẦN', 'TUYỂN THÀNH VIÊN',
      ]} />

      {/* ─── Hoạt động / sự kiện đang diễn ra ─────────── */}
      <section className="landing-activities-section">
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
          <div className="landing-activities-grid">
            {ACTIVITIES.map((a, i) => (
              <Rv key={i} delay={i * 50}>
                <div className="landing-glass-card landing-activity-card card-lift">
                  <div className="landing-activity-icon" style={{ background: a.color }}>★</div>
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

      {/* ─── Spotlight slider (giữa các section card) ───── */}
      {sliderEnabled && currentSlide && (
        <section className="landing-slider-section">
          <div className="landing-slider-shell">
            <Rv>
              <div
                className="landing-glass-card landing-slider-panel"
                style={{ '--slide-accent': currentSlide.accent || C.indigo } as React.CSSProperties}
              >
                <div className="landing-slider-copy">
                  <div>
                    <span className="landing-slider-eyebrow">
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: currentSlide.accent || C.indigo }} />
                      {currentSlide.eyebrow || 'Nổi bật'}
                    </span>
                    <h2 className="landing-slider-title">{currentSlide.title}</h2>
                    <p className="landing-slider-description">{currentSlide.description}</p>
                  </div>

                  <div className="landing-slider-actions">
                    <div className="landing-slider-dots" aria-label="Chọn slide">
                      {landingSlides.map((slide, index) => (
                        <button
                          key={`${slide.title}-${index}`}
                          type="button"
                          className={`landing-slider-dot ${index === activeSlide ? 'is-active' : ''}`}
                          aria-label={`Mở slide ${index + 1}`}
                          onClick={() => setActiveSlide(index)}
                        />
                      ))}
                    </div>

                    <div className="landing-slider-nav">
                      <button type="button" className="landing-slider-icon-button" aria-label="Slide trước" onClick={() => moveSlide(-1)}>
                        <ChevronLeft size={18} strokeWidth={2.8} />
                      </button>
                      <button type="button" className="landing-slider-icon-button" aria-label="Slide sau" onClick={() => moveSlide(1)}>
                        <ChevronRight size={18} strokeWidth={2.8} />
                      </button>
                      {currentSlide.ctaLabel && currentSlide.ctaHref && (
                        <button
                          type="button"
                          data-cta="true"
                          onClick={() => openSlideAction(currentSlide)}
                          style={{
                            height: 42,
                            padding: '0 18px',
                            borderRadius: C.radius,
                            background: currentSlide.accent || C.ink,
                            color: C.bg,
                            border: C.border,
                            fontSize: 13,
                            fontWeight: 850,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: C.shadow(2, 2),
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {currentSlide.ctaLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="landing-slider-media">
                  {currentSlide.imageUrl ? (
                    <img src={currentSlide.imageUrl} alt="" />
                  ) : (
                    <div className="landing-slider-visual">
                      <div className="landing-slider-visual-logo">U!</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 850, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                          UniClub Highlight
                        </div>
                        <div className="landing-slider-visual-title">{currentSlide.title}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Rv>
          </div>
        </section>
      )}

      {/* ─── Câu lạc bộ (một section, lọc theo danh mục / tuyển) ─ */}
      <section className="landing-clubs-section">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Rv>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <Tag style={{ marginBottom: 12 }}>{clubCountLabel} CLB · UEF</Tag>
                <h2 style={{
                  fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.ink,
                  letterSpacing: '-.03em', lineHeight: 1, margin: 0,
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                }}>
                  Khám phá{' '}
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                    câu lạc bộ.
                  </span>
                </h2>
                {clubsError && (
                  <p style={{ color: C.inkDim, fontSize: 13, lineHeight: 1.5, margin: '10px 0 0', fontWeight: 600 }}>
                    Không tải được danh sách CLB từ API.
                  </p>
                )}
                {categoriesError && !clubsError && (
                  <p style={{ color: C.inkDim, fontSize: 13, lineHeight: 1.5, margin: '10px 0 0', fontWeight: 600 }}>
                    Chưa tải được danh mục, bộ lọc danh mục sẽ hiện khi API sẵn sàng.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {clubsError && (
                  <button onClick={loadLandingData} style={{
                    color: C.bg, fontSize: 13, fontWeight: 800,
                    background: C.ink, border: C.border, borderRadius: C.radiusPill,
                    padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: C.shadow(2, 2),
                  }}>Thử lại</button>
                )}
                <button onClick={() => navigate('/clubs')} style={{
                  color: C.ink, fontSize: 14, fontWeight: 700,
                  background: 'none', border: 'none', borderBottom: `2px solid ${C.ink}`,
                  paddingBottom: 2, cursor: 'pointer', fontFamily: 'inherit',
                }}>Xem danh sách đầy đủ →</button>
              </div>
            </div>
          </Rv>
          <Rv delay={80}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {clubFilters.map(filter => (
                <CatPill
                  key={filter}
                  label={filter}
                  active={activeClubFilter === filter}
                  onClick={() => setActiveClubFilter(filter)}
                />
              ))}
            </div>
          </Rv>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {clubsLoading ? (
              <LandingClubGridSkeleton count={5} />
            ) : clubsError ? (
              <div className="landing-glass-card" style={{ gridColumn: '1 / -1', borderRadius: C.radius, padding: '24px 26px' }}>
                <div style={{ color: C.ink, fontSize: 16, fontWeight: 850 }}>Không tải được danh sách CLB</div>
                <div style={{ color: C.inkDim, fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
                  {clubsErrorHint ?? 'Kiểm tra kết nối API rồi thử tải lại.'}
                </div>
                <button
                  type="button"
                  onClick={loadLandingData}
                  style={{
                    marginTop: 14,
                    height: 40,
                    padding: '0 16px',
                    borderRadius: C.radiusPill,
                    background: C.ink,
                    color: C.bg,
                    border: C.border,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Thử lại
                </button>
              </div>
            ) : previewClubs.length > 0 ? (
              previewClubs.map((club, i) => (
                <Rv key={club.id} delay={i * 40}>
                  <ClubCard
                    club={club}
                    compact
                    onClick={() => club.id > 0 ? navigate(`/clubs/${club.id}`) : navigate('/clubs')}
                  />
                </Rv>
              ))
            ) : (
              <div className="landing-glass-card" style={{ gridColumn: '1 / -1', borderRadius: C.radius, padding: '24px 26px' }}>
                <div style={{ color: C.ink, fontSize: 16, fontWeight: 850 }}>Chưa có CLB phù hợp</div>
                <div style={{ color: C.inkDim, fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
                  Thử đổi bộ lọc hoặc quay lại danh sách tất cả CLB.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveClubFilter('Tất cả')}
                  style={{
                    marginTop: 14,
                    height: 40,
                    padding: '0 16px',
                    borderRadius: C.radiusPill,
                    background: C.ink,
                    color: C.bg,
                    border: C.border,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div className="landing-glass-card landing-final-cta-panel">
          <div>
            <Tag bg={C.coral} color={C.bg} style={{ marginBottom: 12 }}>Bắt đầu</Tag>
            <h2 style={{
              color: C.ink,
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900,
              letterSpacing: '-.035em',
              lineHeight: 1,
              margin: 0,
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Tìm CLB hợp gu{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                ngay hôm nay.
              </span>
            </h2>
            <p style={{ color: C.inkDim, fontSize: 15, lineHeight: 1.6, maxWidth: 560, margin: '14px 0 0', fontWeight: 500 }}>
              Xem danh sách CLB, theo dõi hoạt động mới và đăng ký tài khoản để bắt đầu hành trình sinh viên tại UEF.
            </p>
          </div>
          <div className="landing-final-cta-actions">
            <button onClick={() => navigate('/clubs')} style={{
              height: 50, padding: '0 22px', borderRadius: C.radius,
              background: C.ink, color: C.bg, border: C.border,
              fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
            }}>Khám phá CLB →</button>
            {!isAuthenticated && (
              <button onClick={() => navigate('/register')} style={{
                height: 50, padding: '0 22px', borderRadius: C.radius,
                background: C.coral, color: C.bg, border: C.border,
                fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: C.shadow(), cursor: 'pointer', fontFamily: 'inherit',
              }}>Đăng ký →</button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Marquee light ────────────────────────────── */}
      <Marquee tone="light" items={marqueeItems} speed={35} />

      <PublicFooter />
    </div>
  )
}
