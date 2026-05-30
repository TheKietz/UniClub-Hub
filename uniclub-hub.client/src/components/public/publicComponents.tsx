import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getPublicSettings } from '@/components/membership/services/adminApi'

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FEDA77" />
          <stop offset="30%"  stopColor="#FA7E1E" />
          <stop offset="60%"  stopColor="#D62976" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-g)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="url(#ig-g)" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-g)" />
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#69C9D0">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.77a4.85 4.85 0 0 1-1-.08z" />
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg width="20" height="17" viewBox="0 0 24 24">
      <path fill="#FF0000" d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.735-8.835L2.313 2.25h6.38l4.258 5.639L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function SocialLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', transition: 'transform .15s, opacity .15s', opacity: 0.85 }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)'; e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.85' }}
    >
      {children}
    </a>
  )
}

// ─── Design tokens ───────────────────────────────────────────────
export const C = {
  bg: '#fbf9f3',
  card: '#ffffff',
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  rule: '#e8e3d6',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  coral: '#ff5a3c',
  lemon: '#facc15',
  mint: '#14b8a6',
  sky: '#38bdf8',
  pink: '#ec4899',
  navy: '#1e1b4b',
  border: '1.5px solid #15131a',
  shadow: (x = 4, y = 4) => `${x}px ${y}px 0 #15131a`,
  radius: 16,
  radiusSm: 10,
  radiusPill: 999,
} as const

// ─── Scroll reveal ───────────────────────────────────────────────
export function Rv({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target) }
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`rv ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ─── Tag label ───────────────────────────────────────────────────
export function Tag({ children, bg = C.ink, color = C.bg, style: sx }: {
  children: ReactNode; bg?: string; color?: string; style?: React.CSSProperties
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 4, background: bg, color, ...sx,
    }}>★ {children}</span>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────
export function Av({ text, hue = 240, size = 36, ring }: {
  text: string; hue?: number; size?: number; ring?: string
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.60 0.16 ${hue}), oklch(0.42 0.12 ${(hue + 40) % 360}))`,
      color: '#fff', fontSize: size * 0.36, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      letterSpacing: '-.02em',
      boxShadow: ring ? `0 0 0 3px ${ring}` : 'none',
    }}>{text}</div>
  )
}

// ─── Marquee ─────────────────────────────────────────────────────
export function Marquee({ items, tone = 'dark', speed = 28 }: {
  items: string[]; tone?: 'dark' | 'light'; speed?: number
}) {
  const isDark = tone === 'dark'
  const repeated = [...items, ...items, ...items, ...items]
  return (
    <div style={{
      background: isDark ? C.ink : C.lemon,
      color: isDark ? C.lemon : C.ink,
      borderTop: C.border, borderBottom: C.border,
      padding: '12px 0', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', whiteSpace: 'nowrap', gap: 28, width: 'max-content',
        animation: `marqueeScroll ${speed}s linear infinite`,
      }}>
        {repeated.map((t, i) => (
          <span key={i} style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '-.01em',
            display: 'inline-flex', alignItems: 'center', gap: 28,
          }}>
            {t}
            <span style={{ color: isDark ? C.coral : C.violet, fontSize: 11 }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── ClubCard ────────────────────────────────────────────────────
export interface ClubCardData {
  id: number
  name: string
  short?: string
  category?: string
  memberCount: number
  hue?: number
  description?: string
  isRecruiting?: boolean
  color?: string
  logoUrl?: string | null
}

export function ClubCard({ club, onClick, compact = false }: {
  club: ClubCardData; onClick?: () => void; compact?: boolean
}) {
  const color = club.color ?? C.indigo
  const short = club.short ?? club.name.slice(0, 3).toUpperCase()
  const isDark = color !== C.lemon && color !== '#facc15'
  return (
    <div
      className="card-lift"
      onClick={onClick}
      style={{
        borderRadius: C.radius, overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
        border: C.border, boxShadow: C.shadow(),
        background: C.card,
      }}
    >
      {/* Banner */}
      <div style={{
        height: compact ? 100 : 120, padding: 14,
        background: color, borderBottom: C.border,
        position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {club.logoUrl ? (
            <img src={club.logoUrl} alt="" style={{
              width: 42, height: 42, borderRadius: 10, objectFit: 'cover',
              border: C.border, transform: 'rotate(-3deg)',
            }} />
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: C.ink, color: isDark ? C.bg : C.ink,
              display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900,
              transform: 'rotate(-3deg)', letterSpacing: '-.02em',
            }}>{short}</div>
          )}
          {club.isRecruiting && (
            <div style={{
              background: C.ink, color: C.lemon,
              fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em',
              padding: '3px 8px', borderRadius: C.radiusPill,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: C.lemon, animation: 'pulse 2s infinite' }} />
              TUYỂN TV
            </div>
          )}
        </div>
        <div style={{
          color: isDark ? C.bg : C.ink,
          fontSize: compact ? 17 : 21, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1,
        }}>{club.category ?? ''}</div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: '-.01em', marginBottom: 4 }}>
          {club.name}
        </div>
        <div style={{
          fontSize: 12, color: C.inkMuted, lineHeight: 1.5, marginBottom: 12,
          minHeight: 54, maxHeight: 54, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
        }}>
          {club.description ?? ''}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: `1px dashed ${C.rule}`, paddingTop: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.inkDim }}>
            <div style={{ display: 'flex' }}>
              {['A', 'B', 'C'].map((t, i) => (
                <div key={t} style={{ marginLeft: i ? -7 : 0 }}>
                  <Av text={t} hue={(club.hue ?? 240) + i * 20} size={20} ring={C.card} />
                </div>
              ))}
            </div>
            <span style={{ fontWeight: 600 }}>{club.memberCount} TV</span>
          </div>
          <span style={{ color: C.ink, fontSize: 12, fontWeight: 700 }}>Xem →</span>
        </div>
      </div>
    </div>
  )
}

// ─── Category pill ───────────────────────────────────────────────
export function CatPill({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: C.radiusPill,
      background: active ? C.ink : C.card,
      color: active ? C.lemon : C.ink,
      border: C.border,
      boxShadow: active ? 'none' : C.shadow(2, 2),
      transform: active ? 'translate(2px,2px)' : 'none',
      fontSize: 13, fontWeight: 700, transition: 'all .12s',
      fontFamily: 'inherit',
    }}>{label}</button>
  )
}

// ─── V3 Footer ───────────────────────────────────────────────────
export function PublicFooter() {
  const [s, setS] = useState<Record<string, string>>({})
  useEffect(() => { getPublicSettings().then(setS).catch(() => {}) }, [])

  const facebook  = s['footer.facebook_url']?.trim()
  const instagram = s['footer.instagram_url']?.trim()
  const tiktok    = s['footer.tiktok_url']?.trim()
  const youtube   = s['footer.youtube_url']?.trim()
  const x         = s['footer.x_url']?.trim()
  const linkedin  = s['footer.linkedin_url']?.trim()
  const address   = s['footer.address']?.trim()

  return (
    <footer style={{
      padding: '24px 28px', borderTop: C.border, background: C.ink,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5 }}>
        <span style={{ fontWeight: 800, color: C.lemon }}>UniClub Hub</span>
        <span style={{ opacity: 0.5, color: C.bg }}>
          © 2026 · {address || 'Đại học Kinh tế Tài chính TP.HCM'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {facebook  && <SocialLink href={facebook}><IconFacebook /></SocialLink>}
        {instagram && <SocialLink href={instagram}><IconInstagram /></SocialLink>}
        {tiktok    && <SocialLink href={tiktok}><IconTikTok /></SocialLink>}
        {youtube   && <SocialLink href={youtube}><IconYouTube /></SocialLink>}
        {x         && <SocialLink href={x}><IconX /></SocialLink>}
        {linkedin  && <SocialLink href={linkedin}><IconLinkedIn /></SocialLink>}
        <div style={{ display: 'flex', gap: 16, opacity: 0.6, fontSize: 12.5, color: C.bg }}>
          <span>Hỗ trợ</span>
          <span>Điều khoản</span>
        </div>
      </div>
    </footer>
  )
}
