import { Calendar, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function HeroSection({ data, style, theme }: Props) {
  if (style === 'minimal')  return <HeroMinimal  data={data} theme={theme} />
  if (style === 'vibrant')  return <HeroVibrant  data={data} theme={theme} />
  if (style === 'centered') return <HeroCentered data={data} theme={theme} />
  return <HeroDefault data={data} theme={theme} />
}

// ── Default: full-bleed image, dark overlay, brutalist typography ─────────────
function HeroDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section className="relative min-h-[580px] flex items-end overflow-hidden border-b-4 border-black bg-black">
      {landingPage.heroImage && (
        <img src={landingPage.heroImage} alt={club.name}
          className="absolute inset-0 w-full h-full object-cover opacity-50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto w-full px-6 pb-14 pt-36">
        <div className="flex items-center gap-3 mb-5">
          {club.logoUrl ? (
            <img src={club.logoUrl} alt={club.name}
              className="w-14 h-14 rounded-xl border-2 border-white object-cover bg-white flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl border-2 border-white flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ backgroundColor: theme.primaryColor }}>
              {club.name[0]}
            </div>
          )}
          {club.categoryName && (
            <span className="rounded-lg border-2 border-white bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1">
              {club.categoryName}
            </span>
          )}
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-none tracking-tighter mb-4">
          {club.name}
        </h1>
        <div className="w-full h-0.5 bg-white/30 mb-4" />

        {landingPage.introduction && (
          <p className="text-white/85 text-lg max-w-2xl mb-6 leading-relaxed">{landingPage.introduction}</p>
        )}

        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg border-2 border-white/60 px-3 py-1.5 text-sm text-white font-bold flex items-center gap-2">
            <Users size={13} />{club.memberCount} thành viên
          </div>
          {club.establishedDate && (
            <div className="rounded-lg border-2 border-white/60 px-3 py-1.5 text-sm text-white font-bold flex items-center gap-2">
              <Calendar size={13} />Thành lập {new Date(club.establishedDate).getFullYear()}
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link to={`/clubs/${club.id}`}
            className="rounded-xl border-2 border-white font-black uppercase tracking-wider text-sm px-7 py-3 text-white transition-all duration-100 hover:translate-x-1 hover:translate-y-1"
            style={{ backgroundColor: theme.primaryColor, boxShadow: '4px 4px 0 #fff' }}>
            Đăng ký tham gia →
          </Link>
          <a href="#about"
            className="rounded-xl border-2 border-white/60 bg-transparent text-white font-black uppercase tracking-wider text-sm px-7 py-3 hover:bg-white/10 transition-colors">
            Tìm hiểu thêm ↓
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Minimal: split layout — left text, right logo ─────────────────────────────
function HeroMinimal({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section className="bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-20 flex flex-col md:flex-row items-stretch gap-10">
        <div className="flex-1 min-w-0 flex flex-col justify-center md:border-r-4 md:border-black md:pr-12">
          {club.categoryName && (
            <div className="flex items-center gap-2 mb-5">
              <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
                {club.categoryName}
              </span>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter mb-4">
            {club.name}
          </h1>
          <div className="w-12 h-1.5 rounded-full bg-black mb-4" />
          {landingPage.introduction && (
            <p className="text-gray-600 text-base leading-relaxed mb-6 max-w-lg">{landingPage.introduction}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-7">
            <div className="rounded-xl border-2 border-black px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
              <Users size={12} /> {club.memberCount} thành viên
            </div>
            {club.establishedDate && (
              <div className="rounded-xl border-2 border-black px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
                <Calendar size={12} /> Thành lập {new Date(club.establishedDate).getFullYear()}
              </div>
            )}
          </div>
          <Link to={`/clubs/${club.id}`}
            className="rounded-xl inline-block border-2 border-black font-black uppercase tracking-wider text-sm px-7 py-3 text-white transition-all duration-100 hover:translate-x-1 hover:translate-y-1 self-start"
            style={{ backgroundColor: theme.primaryColor, boxShadow: '4px 4px 0 #000' }}>
            Đăng ký ngay →
          </Link>
        </div>

        <div className="md:pl-12 flex items-center justify-center flex-shrink-0">
          {club.logoUrl ? (
            <div className="rounded-2xl border-4 border-black bg-white" style={{ boxShadow: '8px 8px 0 #000' }}>
              <img src={club.logoUrl} alt={club.name} className="w-40 h-40 rounded-xl object-cover" />
            </div>
          ) : (
            <div className="w-40 h-40 rounded-2xl border-4 border-black flex items-center justify-center text-white text-5xl font-black"
              style={{ backgroundColor: theme.primaryColor, boxShadow: '8px 8px 0 #000' }}>
              {club.name[0]}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Vibrant: solid brand color with geometric shapes ──────────────────────────
function HeroVibrant({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section className="relative overflow-hidden min-h-[520px] flex items-center border-b-4 border-black"
      style={{ backgroundColor: theme.primaryColor }}>
      <div className="absolute top-0 right-0 w-0 h-0 border-solid border-t-[300px] border-r-[300px] border-t-black/10 border-r-transparent" />
      <div className="absolute bottom-0 left-0 w-40 h-40 rounded-3xl border-4 border-white/20" />
      <div className="absolute top-8 right-8 w-20 h-20 rounded-2xl border-4 border-white/25 rotate-12" />
      <div className="absolute -bottom-8 right-40 w-32 h-32 rounded-2xl border-4 border-black/10"
        style={{ backgroundColor: theme.accentColor }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 w-full py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-white">
          {club.categoryName && (
            <div className="rounded-lg inline-block border-2 border-white bg-black text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 mb-6">
              {club.categoryName}
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none tracking-tighter mb-4">{club.name}</h1>
          <div className="w-16 h-1.5 rounded-full bg-white mb-5" />
          {landingPage.introduction && (
            <p className="text-white/85 text-lg leading-relaxed mb-8 max-w-xl">{landingPage.introduction}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-8">
            <div className="rounded-xl border-2 border-white/70 px-3 py-1.5 text-xs text-white font-bold flex items-center gap-1.5">
              <Users size={12} /> {club.memberCount} thành viên
            </div>
            {club.establishedDate && (
              <div className="rounded-xl border-2 border-white/70 px-3 py-1.5 text-xs text-white font-bold flex items-center gap-1.5">
                <Calendar size={12} /> Thành lập {new Date(club.establishedDate).getFullYear()}
              </div>
            )}
          </div>
          <Link to={`/clubs/${club.id}`}
            className="rounded-xl inline-block border-2 border-black bg-white font-black uppercase tracking-wider text-sm px-8 py-3.5 transition-all duration-100 hover:translate-x-1 hover:translate-y-1"
            style={{ color: theme.primaryColor, boxShadow: '4px 4px 0 #000' }}>
            Đăng ký tham gia →
          </Link>
        </div>

        {club.logoUrl && (
          <div className="flex-shrink-0">
            <div className="rounded-2xl border-4 border-white bg-white" style={{ boxShadow: '6px 6px 0 #000' }}>
              <img src={club.logoUrl} alt={club.name} className="w-36 h-36 rounded-xl object-contain" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Centered: full-bleed image, centered content ──────────────────────────────
function HeroCentered({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden border-b-4 border-black bg-black">
      {landingPage.heroImage && (
        <img src={landingPage.heroImage} alt={club.name}
          className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative z-10 max-w-3xl mx-auto w-full px-6 py-24 flex flex-col items-center text-center">
        {club.logoUrl ? (
          <div className="w-20 h-20 rounded-2xl border-4 border-white/80 bg-white mb-6 overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl border-4 border-white/80 flex items-center justify-center text-white text-3xl font-black mb-6"
            style={{ backgroundColor: theme.primaryColor, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {club.name[0]}
          </div>
        )}

        {club.categoryName && (
          <span className="rounded-full border-2 border-white/60 bg-white/10 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 mb-4 backdrop-blur-sm">
            {club.categoryName}
          </span>
        )}

        <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-none tracking-tighter mb-5">
          {club.name}
        </h1>

        {landingPage.introduction && (
          <p className="text-white/80 text-lg max-w-xl mb-8 leading-relaxed">{landingPage.introduction}</p>
        )}

        <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
          <div className="rounded-full border border-white/50 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white font-bold flex items-center gap-2">
            <Users size={13} />{club.memberCount} thành viên
          </div>
          {club.establishedDate && (
            <div className="rounded-full border border-white/50 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white font-bold flex items-center gap-2">
              <Calendar size={13} />Thành lập {new Date(club.establishedDate).getFullYear()}
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link to={`/clubs/${club.id}`}
            className="rounded-xl border-2 border-white font-black uppercase tracking-wider text-sm px-8 py-3.5 text-white transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: theme.primaryColor, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            Đăng ký tham gia →
          </Link>
          <a href="#about"
            className="rounded-xl border-2 border-white/60 bg-white/10 backdrop-blur-sm text-white font-black uppercase tracking-wider text-sm px-8 py-3.5 hover:bg-white/20 transition-colors">
            Khám phá ↓
          </a>
        </div>
      </div>
    </section>
  )
}
