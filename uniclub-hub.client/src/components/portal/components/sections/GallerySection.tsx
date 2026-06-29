import { Play, X } from 'lucide-react'
import { useState } from 'react'
import type { ClubLandingData, MediaItem, PortalTheme } from '../../services/portal.types'

function getVideoThumbnail(url: string): string | null {
  try {
    if (!url.includes('cloudinary.com')) return null
    return url
      .replace('/video/upload/', '/video/upload/so_auto/')
      .replace(/\.[^./]+$/, '.jpg')
  } catch {
    return null
  }
}

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function GallerySection({ data, style, theme }: Props) {
  if (!data.gallery.length) return null
  if (style === 'masonry') return <GalleryMasonry data={data} theme={theme} />
  if (style === 'film')    return <GalleryFilm    data={data} theme={theme} />
  return <GalleryGrid data={data} theme={theme} />
}

// ── Grid: uniform rounded grid ────────────────────────────────────────────────
function GalleryGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { gallery } = data
  const [active, setActive] = useState<MediaItem | null>(null)

  return (
    <section id="gallery" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Thư viện ảnh" theme={theme} />

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {gallery.map(item => (
            <button key={item.id} onClick={() => setActive(item)}
              className="aspect-square rounded-xl border-2 border-black overflow-hidden relative group focus:outline-none transition-all duration-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              style={{ boxShadow: '3px 3px 0 #003087' }}>
              {item.mediaType === 'Video' ? (
                <VideoThumb url={item.mediaUrl} iconSize={28} />
              ) : (
                <img src={item.mediaUrl} alt={item.description ?? ''}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {active && <Lightbox item={active} onClose={() => setActive(null)} theme={theme} />}
    </section>
  )
}

// ── Masonry: CSS columns ──────────────────────────────────────────────────────
function GalleryMasonry({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { gallery } = data
  const [active, setActive] = useState<MediaItem | null>(null)

  return (
    <section id="gallery" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Thư viện ảnh" theme={theme} />

        <div className="mt-8" style={{ columnCount: 3, columnGap: '12px' }}>
          {gallery.map((item, i) => (
            <button key={item.id} onClick={() => setActive(item)}
              className="w-full rounded-xl border-2 border-black overflow-hidden mb-3 group focus:outline-none block transition-all duration-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              style={{ breakInside: 'avoid', boxShadow: '3px 3px 0 #003087' }}>
              {item.mediaType === 'Video' ? (
                <div style={{ height: `${160 + (i % 3) * 40}px` }}>
                  <VideoThumb url={item.mediaUrl} iconSize={32} />
                </div>
              ) : (
                <img src={item.mediaUrl} alt={item.description ?? ''}
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {active && <Lightbox item={active} onClose={() => setActive(null)} theme={theme} />}
    </section>
  )
}

// ── Film: horizontal scroll strip ────────────────────────────────────────────
function GalleryFilm({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { gallery } = data
  const [active, setActive] = useState<MediaItem | null>(null)

  return (
    <section id="gallery" className="py-16 bg-zinc-950 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-sm border-2 border-white/50" style={{ backgroundColor: theme.primaryColor }} />
            <span className="text-xs font-black uppercase tracking-widest text-white/60">Media</span>
          </div>
          <h2 className="text-3xl font-black uppercase text-white leading-none">Thư viện ảnh</h2>
          <div className="w-12 h-1.5 rounded-full bg-white mt-3" />
        </div>
      </div>

      {/* Film strip — full bleed scroll */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex gap-3 px-6 pb-2" style={{ width: 'max-content' }}>
          {gallery.map(item => (
            <button key={item.id} onClick={() => setActive(item)}
              className="rounded-xl flex-shrink-0 overflow-hidden relative group focus:outline-none border-2 border-white/20 transition-all duration-200 hover:border-white/60 hover:scale-[1.03]"
              style={{ width: 240, height: 160 }}>
              {item.mediaType === 'Video' ? (
                <VideoThumb url={item.mediaUrl} iconSize={22} rounded />
              ) : (
                <img src={item.mediaUrl} alt={item.description ?? ''}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              {item.description && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium line-clamp-2">{item.description}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {active && <Lightbox item={active} onClose={() => setActive(null)} theme={theme} dark />}
    </section>
  )
}

function VideoThumb({ url, iconSize, rounded }: { url: string; iconSize: number; rounded?: boolean }) {
  const thumb = getVideoThumbnail(url)
  return (
    <div className="relative w-full h-full">
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-zinc-800" />
      )}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        {rounded ? (
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Play size={iconSize} className="text-white ml-1" />
          </div>
        ) : (
          <Play size={iconSize} className="text-white opacity-80" />
        )}
      </div>
    </div>
  )
}

function Lightbox({ item, onClose, theme, dark }: { item: MediaItem; onClose: () => void; theme: PortalTheme; dark?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
      {/* X button on overlay — above overflow-hidden container */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors z-10"
        style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}
      >
        <X size={18} />
      </button>

      <div className="relative max-w-4xl max-h-[90vh] w-full rounded-2xl overflow-hidden border-4 border-white"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '8px 8px 0 rgba(255,255,255,0.15)' }}>
        {item.mediaType === 'Video' ? (
          <video src={item.mediaUrl} controls className="w-full max-h-[80vh]" />
        ) : (
          <img src={item.mediaUrl} alt={item.description ?? ''}
            className="w-full object-contain max-h-[80vh]" />
        )}
        {item.description && (
          <div className="bg-white border-t-2 border-white px-4 py-2">
            <p className="text-black text-sm font-bold">{item.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
          Media
        </span>
      </div>
      <h2 className="text-3xl font-black uppercase text-black leading-none">{label}</h2>
      <div className="w-12 h-1.5 rounded-full bg-black mt-3" />
    </div>
  )
}
