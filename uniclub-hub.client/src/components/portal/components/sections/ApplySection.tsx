import { ArrowRight, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function ApplySection({ data, style, theme }: Props) {
  if (style === 'banner') return <ApplyBanner data={data} theme={theme} />
  return <ApplyDefault data={data} theme={theme} />
}

// ── Default: centered card CTA ────────────────────────────────────────────────
function ApplyDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club } = data

  return (
    <section id="apply" className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${theme.primaryColor}15` }}
            >
              <UserPlus size={22} style={{ color: theme.primaryColor }} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Gia nhập {club.name}</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-md">
                Trở thành thành viên và đồng hành cùng chúng tôi trong các hoạt động và sự kiện sắp tới.
              </p>
            </div>
          </div>
          <Link
            to={`/clubs/${club.id}`}
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white flex-shrink-0 transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Đăng ký ngay <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Banner: full-width colored strip ─────────────────────────────────────────
function ApplyBanner({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club } = data

  return (
    <section
      id="apply"
      className="relative overflow-hidden py-16"
      style={{ backgroundColor: theme.primaryColor }}
    >
      {/* Decorative shape */}
      <div
        className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-15"
        style={{ backgroundColor: theme.accentColor }}
      />
      <div
        className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full opacity-10 bg-white"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Sẵn sàng tham gia {club.name}?
        </h2>
        <p className="text-white/75 text-lg mb-8 max-w-xl mx-auto">
          Điền đơn đăng ký và cùng chúng tôi tạo nên những kỷ niệm đáng nhớ.
        </p>
        <Link
          to={`/clubs/${club.id}`}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white rounded-xl font-bold text-base transition-transform hover:scale-105 active:scale-95 shadow-lg"
          style={{ color: theme.primaryColor }}
        >
          <UserPlus size={18} />
          Đăng ký tham gia CLB
        </Link>
      </div>
    </section>
  )
}
