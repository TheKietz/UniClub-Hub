import { Play } from 'lucide-react'
import { useState } from 'react'
import type { ClubLandingData, MediaItem, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function GallerySection({ data, style, theme }: Props) {
  if (!data.gallery.length) return null
  if (style === 'masonry') return <GalleryMasonry data={data} theme={theme} />
  return <GalleryGrid data={data} theme={theme} />
}

// ── Grid: uniform equal-size grid with lightbox ───────────────────────────────
function GalleryGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { gallery } = data
  const [active, setActive] = useState<MediaItem | null>(null)

  return (
    <section id="gallery" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Thư viện ảnh" theme={theme} />

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {gallery.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="aspect-square rounded-xl overflow-hidden relative group focus:outline-none focus-visible:ring-2"
              style={{ '--ring-color': theme.primaryColor } as React.CSSProperties}
            >
              {item.mediaType === 'Video' ? (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <Play size={28} className="text-white opacity-80" />
                </div>
              ) : (
                <img
                  src={item.mediaUrl}
                  alt={item.description ?? ''}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {active && <Lightbox item={active} onClose={() => setActive(null)} />}
    </section>
  )
}

// ── Masonry: CSS columns for staggered heights ────────────────────────────────
function GalleryMasonry({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { gallery } = data
  const [active, setActive] = useState<MediaItem | null>(null)

  return (
    <section id="gallery" className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Thư viện ảnh" theme={theme} />

        <div className="mt-8" style={{ columnCount: 3, columnGap: '12px' }}>
          {gallery.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="w-full rounded-xl overflow-hidden mb-3 group focus:outline-none block"
              style={{ breakInside: 'avoid' }}
            >
              {item.mediaType === 'Video' ? (
                <div
                  className="w-full flex items-center justify-center bg-gray-900 rounded-xl"
                  style={{ height: `${160 + (i % 3) * 40}px` }}
                >
                  <Play size={32} className="text-white opacity-70" />
                </div>
              ) : (
                <img
                  src={item.mediaUrl}
                  alt={item.description ?? ''}
                  className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {active && <Lightbox item={active} onClose={() => setActive(null)} />}
    </section>
  )
}

function Lightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
        {item.mediaType === 'Video' ? (
          <video
            src={item.mediaUrl}
            controls
            autoPlay
            className="w-full rounded-xl max-h-[80vh]"
          />
        ) : (
          <img
            src={item.mediaUrl}
            alt={item.description ?? ''}
            className="w-full rounded-xl object-contain max-h-[80vh]"
          />
        )}
        {item.description && (
          <p className="text-white/70 text-sm text-center mt-3">{item.description}</p>
        )}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/35 transition-colors flex items-center justify-center text-lg"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900">{label}</h2>
      <div className="w-10 h-1 rounded-full mt-2" style={{ backgroundColor: theme.primaryColor }} />
    </div>
  )
}
