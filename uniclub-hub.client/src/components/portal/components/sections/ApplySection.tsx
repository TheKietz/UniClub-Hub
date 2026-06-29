import { ArrowRight, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function ApplySection({ data, style, theme }: Props) {
  if (style === 'banner') return <ApplyBanner  data={data} theme={theme} />
  if (style === 'split')  return <ApplySplit   data={data} theme={theme} />
  return <ApplyDefault data={data} theme={theme} />
}

// ── Default: rounded card ─────────────────────────────────────────────────────
function ApplyDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club } = data

  return (
    <section id="apply" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <div className="rounded-2xl border-2 border-black bg-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8"
          style={{ boxShadow: '6px 6px 0 #000' }}>
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 mt-1"
              style={{ backgroundColor: theme.primaryColor }}>
              <UserPlus size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.accentColor }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.accentColor }}>
                  Tham gia ngay
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase text-black leading-tight mb-1">Gia nhập {club.name}</h2>
              <div className="w-10 h-1 rounded-full bg-black mb-3" />
              <p className="text-gray-600 text-sm max-w-md leading-relaxed">
                Trở thành thành viên và đồng hành cùng chúng tôi trong các hoạt động và sự kiện sắp tới.
              </p>
            </div>
          </div>

          <Link to={`/clubs/${club.id}`}
            className="rounded-xl flex items-center gap-2 border-2 border-black font-black uppercase tracking-wider text-sm px-7 py-3.5 text-white flex-shrink-0 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none whitespace-nowrap"
            style={{ backgroundColor: theme.primaryColor, boxShadow: '4px 4px 0 #003087' }}>
            Đăng ký ngay <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Banner: full-width with geometric shapes ──────────────────────────────────
function ApplyBanner({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club } = data

  return (
    <section id="apply" className="relative py-20 border-b-4 border-black overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})` }}>
      {/* Geometric decorations */}
      <div className="absolute top-0 left-0 w-0 h-0 border-solid border-l-[120px] border-t-[120px] border-l-black/15 border-t-transparent" />
      <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-r-[120px] border-b-[120px] border-r-black/15 border-b-transparent" />
      <div className="absolute top-6 right-6 w-16 h-16 rounded-2xl border-4 border-white/20" />
      <div className="absolute bottom-6 left-6 w-10 h-10 rounded-xl border-4 border-white/20 rotate-45" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <div className="rounded-lg inline-block border-2 border-white bg-black text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 mb-5">
          Tham gia CLB
        </div>
        <h2 className="text-4xl md:text-5xl font-black uppercase text-white leading-tight mb-4 tracking-tighter">
          Sẵn sàng tham gia<br />{club.name}?
        </h2>
        <div className="w-16 h-1.5 rounded-full bg-white mx-auto mb-5" />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-white/80 text-base font-medium max-w-sm text-left sm:text-right leading-relaxed">
            Điền đơn đăng ký và cùng chúng tôi tạo nên những kỷ niệm đáng nhớ.
          </p>
          <div className="w-px h-10 bg-white/30 hidden sm:block flex-shrink-0" />
          <Link to={`/clubs/${club.id}`}
            className="rounded-xl flex-shrink-0 inline-flex items-center gap-2 border-2 border-black bg-white font-black uppercase tracking-wider text-sm px-8 py-3.5 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            style={{ color: theme.primaryColor, boxShadow: '5px 5px 0 #003087' }}>
            <UserPlus size={18} />Đăng ký ngay
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Split: left brand color, right white CTA ──────────────────────────────────
function ApplySplit({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club } = data

  return (
    <section id="apply" className="border-b-4 border-black overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row min-h-[280px]">
        {/* Left: brand color */}
        <div className="flex-1 px-8 py-12 flex flex-col justify-center border-r-0 md:border-r-4 border-black relative overflow-hidden"
          style={{ backgroundColor: theme.primaryColor }}>
          {/* Decoration */}
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-3xl border-4 border-white/15 rotate-12" />
          <div className="absolute top-4 right-4 w-10 h-10 rounded-2xl border-2 border-white/20" />

          <div className="relative z-10">
            <div className="rounded-lg inline-block bg-black/20 text-white text-xs font-black uppercase tracking-widest px-3 py-1 mb-4">
              Cơ hội dành cho bạn
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase text-white leading-tight tracking-tighter mb-3">
              Gia nhập<br />{club.name}
            </h2>
            <div className="w-10 h-1.5 rounded-full bg-white/60" />
          </div>
        </div>

        {/* Right: white */}
        <div className="flex-1 px-8 py-12 bg-white flex flex-col justify-center gap-5">
          <p className="text-gray-700 text-base leading-relaxed max-w-sm">
            Trở thành thành viên, phát triển kỹ năng và tạo nên kỷ niệm đáng nhớ cùng những người bạn cùng đam mê.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to={`/clubs/${club.id}`}
              className="rounded-xl inline-flex items-center gap-2 border-2 border-black font-black uppercase tracking-wider text-sm px-7 py-3 text-white transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ backgroundColor: theme.primaryColor, boxShadow: '4px 4px 0 #003087' }}>
              Đăng ký ngay <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
