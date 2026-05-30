import { Calendar, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function HeroSection({ data, style, theme }: Props) {
  if (style === 'minimal') return <HeroMinimal data={data} theme={theme} />
  if (style === 'vibrant') return <HeroVibrant data={data} theme={theme} />
  return <HeroDefault data={data} theme={theme} />
}

// ── Default: full-bleed hero image with dark gradient overlay ─────────────────
function HeroDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section className="relative min-h-[560px] flex items-end overflow-hidden bg-gray-900">
      {landingPage.heroImage && (
        <img
          src={landingPage.heroImage}
          alt={club.name}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto w-full px-6 pb-16 pt-36">
        <div className="flex items-center gap-4 mb-5">
          {club.logoUrl ? (
            <img
              src={club.logoUrl}
              alt={club.name}
              className="w-16 h-16 rounded-full border-2 border-white/60 object-cover bg-white shadow-lg"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {club.name[0]}
            </div>
          )}
          {club.categoryName && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/15 backdrop-blur-sm text-white border border-white/25">
              {club.categoryName}
            </span>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
          {club.name}
        </h1>

        {landingPage.introduction && (
          <p className="text-white/80 text-lg max-w-2xl mb-6 leading-relaxed">
            {landingPage.introduction}
          </p>
        )}

        <div className="flex items-center gap-6 mb-8 text-white/65 text-sm">
          <span className="flex items-center gap-1.5">
            <Users size={15} />
            {club.memberCount} thành viên
          </span>
          {club.establishedDate && (
            <span className="flex items-center gap-1.5">
              <Calendar size={15} />
              Thành lập {new Date(club.establishedDate).getFullYear()}
            </span>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link
            to={`/clubs/${club.id}`}
            className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Đăng ký tham gia
          </Link>
          <a
            href="#about"
            className="px-6 py-2.5 rounded-lg font-semibold border border-white/40 text-white bg-white/10 hover:bg-white/20 transition-all"
          >
            Tìm hiểu thêm ↓
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Minimal: split layout — clean text left, logo right ──────────────────────
function HeroMinimal({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 min-w-0">
          {club.categoryName && (
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 border"
              style={{ color: theme.primaryColor, borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}18` }}
            >
              {club.categoryName}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            {club.name}
          </h1>
          {landingPage.introduction && (
            <p className="text-gray-500 text-lg leading-relaxed mb-6 max-w-lg">
              {landingPage.introduction}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-8">
            <span className="flex items-center gap-1.5"><Users size={14} />{club.memberCount} thành viên</span>
            {club.establishedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />Thành lập {new Date(club.establishedDate).getFullYear()}
              </span>
            )}
          </div>
          <Link
            to={`/clubs/${club.id}`}
            className="inline-block px-7 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Đăng ký ngay
          </Link>
        </div>

        <div className="flex-shrink-0">
          {club.logoUrl ? (
            <img
              src={club.logoUrl}
              alt={club.name}
              className="w-44 h-44 rounded-3xl object-cover shadow-xl"
            />
          ) : (
            <div
              className="w-44 h-44 rounded-3xl flex items-center justify-center text-white text-5xl font-extrabold shadow-xl"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {club.name[0]}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Vibrant: solid brand-color background with decorative shapes ──────────────
function HeroVibrant({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section
      className="relative overflow-hidden min-h-[500px] flex items-center"
      style={{ backgroundColor: theme.primaryColor }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
        style={{ backgroundColor: theme.accentColor }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-15"
        style={{ backgroundColor: '#ffffff' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full opacity-10"
        style={{ backgroundColor: theme.accentColor }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 w-full py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-white">
          {club.categoryName && (
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-5">
              {club.categoryName}
            </span>
          )}
          <h1 className="text-5xl md:text-6xl font-extrabold mb-5 leading-tight">
            {club.name}
          </h1>
          {landingPage.introduction && (
            <p className="text-white/80 text-xl leading-relaxed mb-8 max-w-xl">
              {landingPage.introduction}
            </p>
          )}
          <div className="flex items-center gap-6 text-white/65 text-sm mb-9">
            <span className="flex items-center gap-1.5"><Users size={14} />{club.memberCount} thành viên</span>
            {club.establishedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />Thành lập {new Date(club.establishedDate).getFullYear()}
              </span>
            )}
          </div>
          <Link
            to={`/clubs/${club.id}`}
            className="inline-block px-8 py-3 bg-white rounded-xl font-bold text-base transition-transform hover:scale-105 active:scale-95 shadow-lg"
            style={{ color: theme.primaryColor }}
          >
            Đăng ký tham gia →
          </Link>
        </div>

        {club.logoUrl && (
          <div className="flex-shrink-0">
            <div className="w-40 h-40 rounded-2xl bg-white/20 backdrop-blur-sm p-3 shadow-2xl">
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
