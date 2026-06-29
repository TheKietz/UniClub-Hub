import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, ChevronDown, Check } from 'lucide-react'
import type { ClubLandingData, ClubExploreItem } from '../services/portal.types'
import { DEFAULT_LAYOUT } from '../services/portal.types'

const CANONICAL_ORDER = Object.fromEntries(
  DEFAULT_LAYOUT.sections.map(s => [s.id, s.order])
)
import { getClubLandingPage, recordClubView, getExploreClubs } from '../services/portal.api'
import { usePortalSEO } from '../hooks/usePortalSEO'
import SectionRenderer from '../components/SectionRenderer'
import AppFooter from '@/components/shared/AppFooter'

// ── Club Switcher Dropdown ────────────────────────────────────────────────────
function ClubSwitcher({ currentId, currentName }: { currentId: number; currentName: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [clubs, setClubs] = useState<ClubExploreItem[]>([])
  const [clubsLoaded, setClubsLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = search.trim()
    ? clubs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()))
    : clubs

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => {
          const opening = !open
          setOpen(opening)
          setSearch('')
          if (opening && !clubsLoaded) {
            getExploreClubs({ pageSize: 100 })
              .then(r => { setClubs(r.data); setClubsLoaded(true) })
              .catch(() => {})
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 10px', borderRadius: 6,
          border: '1.5px solid #003087', background: open ? '#003087' : 'white',
          color: open ? '#fff' : '#003087',
          fontSize: 11, fontWeight: 800, letterSpacing: '.04em',
          cursor: 'pointer', maxWidth: 200, fontFamily: 'inherit',
          transition: 'all .12s',
        }}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 140,
        }}>
          {currentName}
        </span>
        <ChevronDown size={11} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          width: 280, background: '#fff',
          border: '2px solid #003087', borderRadius: 10,
          boxShadow: '4px 4px 0 #003087',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1.5px solid #C5D8F0' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm câu lạc bộ..."
              style={{
                width: '100%', border: '1.5px solid #C5D8F0', borderRadius: 6,
                padding: '5px 8px', fontSize: 12, outline: 'none',
                fontFamily: 'inherit', color: '#003087', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Club list */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#5E7AA8', textAlign: 'center' }}>
                Không tìm thấy CLB
              </div>
            ) : filtered.map(club => {
              const isCurrent = club.id === currentId
              const initials = club.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <button
                  key={club.id}
                  onClick={() => {
                    setOpen(false)
                    setSearch('')
                    navigate(`/landing-page/${club.id}`)
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', background: isCurrent ? '#EBF3FF' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', borderBottom: '1px solid #EBF3FF',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = '#F5F9FF' }}
                  onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {/* Logo / initials */}
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt=""
                      style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1.5px solid #C5D8F0' }} />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: club.primaryColor ?? '#003087',
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontSize: 9, fontWeight: 900,
                    }}>{initials}</div>
                  )}
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: '#003087',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{club.name}</div>
                    {club.categoryName && (
                      <div style={{ fontSize: 10, color: '#5E7AA8', marginTop: 1 }}>{club.categoryName}</div>
                    )}
                  </div>
                  {/* Current check */}
                  {isCurrent && <Check size={13} style={{ color: '#003087', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClubLandingPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ClubLandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tracked = useRef(false)

  useEffect(() => {
    if (!clubId) return
    setLoading(true)
    getClubLandingPage(Number(clubId))
      .then(setData)
      .catch(() => setError('Không tìm thấy câu lạc bộ hoặc trang giới thiệu chưa được thiết lập.'))
      .finally(() => setLoading(false))

    // Track once per mount — ref guard prevents React StrictMode double-invoke
    if (!tracked.current) {
      tracked.current = true
      recordClubView(Number(clubId)).catch(() => {})
    }
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
    .sort((a, b) => (CANONICAL_ORDER[a.id] ?? a.order) - (CANONICAL_ORDER[b.id] ?? b.order))

  return (
    <div className="portal-page" style={{ '--p': theme.primaryColor, '--a': theme.accentColor } as React.CSSProperties}>
      {/* Sub-nav bar */}
      <div className="sticky top-0 z-40 bg-white" style={{ borderBottom: '2px solid #003087' }}>
        <div className="max-w-5xl mx-auto px-6 h-11 flex items-center gap-3 justify-between">
          {/* Left: back + switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide hover:opacity-60 transition-opacity"
              style={{ color: '#003087', flexShrink: 0 }}
            >
              <ArrowLeft size={13} /> Quay lại
            </button>
            <span style={{ width: 1, height: 16, background: '#C5D8F0', flexShrink: 0 }} />
            <ClubSwitcher currentId={Number(clubId)} currentName={data.club.name} />
          </div>
          <div className="flex items-center gap-4">
            {data.club.code && (
              <span
                className="rounded-md text-xs font-black uppercase tracking-widest px-2 py-0.5 text-white"
                style={{ backgroundColor: theme.primaryColor, border: '1px solid #003087' }}
              >
                {data.club.code}
              </span>
            )}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href)
              }}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide hover:opacity-60 transition-opacity"
              style={{ color: '#003087' }}
            >
              <Share2 size={12} /> Chia sẻ
            </button>
          </div>
        </div>
      </div>

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
    <div className="portal-page">
      <div className="animate-pulse">
        <div className="h-[520px]" style={{ backgroundColor: '#002D6B', borderBottom: '4px solid #003087' }} />
        <div style={{ borderBottom: '4px solid #003087' }}>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-4" style={{ borderLeft: '2px solid #003087', borderRight: '2px solid #003087' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center py-10 px-4" style={{ borderRight: i < 3 ? '2px solid #003087' : 'none' }}>
                <div className="w-5 h-5 mx-auto mb-3" style={{ backgroundColor: '#C5D8F0' }} />
                <div className="h-9 w-16 mx-auto mb-2" style={{ backgroundColor: '#C5D8F0' }} />
                <div className="h-3 w-20 mx-auto" style={{ backgroundColor: '#EBF3FF' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-4">
          <div className="h-3 w-24" style={{ backgroundColor: '#C5D8F0' }} />
          <div className="h-8 w-64" style={{ backgroundColor: '#002D6B' }} />
          <div className="h-1.5 w-12" style={{ backgroundColor: '#003087' }} />
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="h-40" style={{ border: '2px solid #C5D8F0', backgroundColor: '#EBF3FF' }} />
            <div className="h-40" style={{ border: '2px solid #C5D8F0', backgroundColor: '#EBF3FF' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPageError({ message }: { message: string }) {
  return (
    <div className="portal-page">
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div
          className="w-20 h-20 flex items-center justify-center text-3xl mb-6"
          style={{ border: '4px solid #003087', boxShadow: '6px 6px 0 #003087' }}
        >
          🏫
        </div>
        <h2 className="text-2xl font-black uppercase mb-2" style={{ color: '#003087' }}>
          {message ? 'Không tìm thấy' : 'Chưa sẵn sàng'}
        </h2>
        <div className="w-12 h-1.5 mb-4" style={{ backgroundColor: '#003087' }} />
        <p className="text-gray-600 text-sm mb-8 max-w-sm font-medium">
          {message || 'Câu lạc bộ này chưa thiết lập trang giới thiệu công khai.'}
        </p>
        <Link
          to="/clubs"
          className="flex items-center gap-2 text-white text-sm font-black uppercase tracking-wider px-6 py-3 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          style={{ border: '2px solid #003087', backgroundColor: '#003087', boxShadow: '4px 4px 0 #003087' }}
        >
          <ArrowLeft size={14} /> Xem CLB khác
        </Link>
      </div>
      <AppFooter />
    </div>
  )
}
