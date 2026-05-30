import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Share2 } from 'lucide-react'
import type { ClubLandingData } from '../services/portal.types'
import { DEFAULT_LAYOUT } from '../services/portal.types'
import { getClubLandingPage } from '../services/portal.api'
import { usePortalSEO } from '../hooks/usePortalSEO'
import SectionRenderer from '../components/SectionRenderer'
import PublicHeader from '@/components/layouts/PublicHeader'
import AppFooter from '@/components/shared/AppFooter'

export default function ClubLandingPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [data, setData] = useState<ClubLandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clubId) return
    setLoading(true)
    getClubLandingPage(Number(clubId))
      .then(setData)
      .catch(() => setError('Không tìm thấy câu lạc bộ hoặc trang giới thiệu chưa được thiết lập.'))
      .finally(() => setLoading(false))
  }, [clubId])

  usePortalSEO({
    title: data ? `${data.club.name} | UniClub Hub` : 'UniClub Hub',
    description: data?.landingPage.introduction ?? data?.club.description,
    image: data?.landingPage.heroImage ?? data?.club.logoUrl,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    keywords: data
      ? [data.club.name, data.club.categoryName ?? '', 'câu lạc bộ sinh viên'].filter(Boolean).join(', ')
      : undefined,
  })

  if (loading) return <LandingPageSkeleton />
  if (error || !data) return <LandingPageError message={error} />

  const settings = data.landingPage.layoutSettings ?? DEFAULT_LAYOUT
  const theme = settings.theme ?? DEFAULT_LAYOUT.theme

  const visibleSections = [...settings.sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <div
      style={{ '--p': theme.primaryColor, '--a': theme.accentColor } as React.CSSProperties}
    >
      <PublicHeader />

      {/* Sub-nav: back + share */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-11 flex items-center justify-between">
          <Link
            to="/portal"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} /> Tất cả câu lạc bộ
          </Link>
          <div className="flex items-center gap-3">
            {data.club.code && (
              <span className="text-xs text-gray-400 font-mono">{data.club.code}</span>
            )}
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Share2 size={13} /> Chia sẻ
            </button>
          </div>
        </div>
      </div>

      {/* All sections rendered in configured order */}
      <main>
        {visibleSections.map(section => (
          <SectionRenderer key={section.id} config={section} data={data} theme={theme} />
        ))}
      </main>

      <AppFooter />
    </div>
  )
}

function LandingPageSkeleton() {
  return (
    <div>
      <PublicHeader />
      <div className="animate-pulse">
        {/* Hero skeleton */}
        <div className="h-[520px] bg-gray-200" />
        {/* Stats skeleton */}
        <div className="border-y border-gray-100 py-10">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-6 h-6 rounded bg-gray-200 mx-auto" />
                <div className="h-8 w-16 rounded bg-gray-200 mx-auto" />
                <div className="h-3 w-20 rounded bg-gray-100 mx-auto" />
              </div>
            ))}
          </div>
        </div>
        {/* Content skeleton */}
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-4">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="h-1 w-10 rounded bg-gray-200" />
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="h-32 rounded-2xl bg-gray-100" />
            <div className="h-32 rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPageError({ message }: { message: string }) {
  return (
    <div>
      <PublicHeader />
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-4">🏫</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {message || 'Trang giới thiệu chưa sẵn sàng'}
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm">
          Câu lạc bộ này chưa thiết lập trang giới thiệu công khai.
        </p>
        <Link
          to="/portal"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft size={14} /> Xem câu lạc bộ khác
        </Link>
      </div>
      <AppFooter />
    </div>
  )
}
