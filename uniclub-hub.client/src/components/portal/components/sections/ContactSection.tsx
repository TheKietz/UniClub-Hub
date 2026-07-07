import { ExternalLink, Mail, BookUser } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  youtube:   'YouTube',
  tiktok:    'TikTok',
  zalo:      'Zalo',
  github:    'GitHub',
  linkedin:  'LinkedIn',
  twitter:   'Twitter / X',
  website:   'Website',
}

export default function ContactSection({ data, style, theme }: Props) {
  const { club, landingPage } = data
  const social = landingPage.socialLinks ?? {}
  const hasSocial = Object.keys(social).length > 0
  const hasContent = club.contactInfo || hasSocial || club.advisorName
  if (!hasContent) return null

  if (style === 'card') return <ContactCard data={data} theme={theme} />
  return <ContactDefault data={data} theme={theme} />
}

// ── Default: dark section, chip-style links ───────────────────────────────────
function ContactDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data
  const social = landingPage.socialLinks ?? {}
  const hasSocial = Object.keys(social).length > 0

  return (
    <section id="contact" className="py-14 bg-zinc-950 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-sm border-2 border-white/50" style={{ backgroundColor: theme.primaryColor }} />
            <span className="text-xs font-black uppercase tracking-widest text-white/60">Kết nối</span>
          </div>
          <h2 className="text-3xl font-black uppercase text-white leading-none">Liên hệ & Theo dõi</h2>
          <div className="w-12 h-1.5 rounded-full bg-white mt-3" />
        </div>

        <div className="flex flex-wrap gap-3 items-start">
          {club.contactInfo && (
            <div className="rounded-xl border-2 border-white/30 bg-white/5 px-4 py-2.5 flex items-center gap-2 text-sm text-white font-bold transition-all duration-100 hover:bg-white/10">
              <Mail size={14} style={{ color: theme.primaryColor }} />
              {club.contactInfo}
            </div>
          )}
          {club.advisorName && (
            <div className="rounded-xl border-2 border-white/30 bg-white/5 px-4 py-2.5 flex items-center gap-2 text-sm text-white font-bold transition-all duration-100 hover:bg-white/10">
              <BookUser size={14} style={{ color: theme.primaryColor }} />
              GV phụ trách: <span className="font-black">{club.advisorName}</span>
            </div>
          )}
          {hasSocial && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(social).map(([platform, url]) => (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl border-2 border-white/30 bg-white/5 text-white text-sm font-black uppercase tracking-wide px-4 py-2.5 flex items-center gap-2 transition-all duration-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-white/10"
                  style={{ boxShadow: '2px 2px 0 rgba(255,255,255,0.2)' }}>
                  {PLATFORM_LABELS[platform.toLowerCase()] ?? platform}
                  <ExternalLink size={11} className="text-white/50" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Card: grouped cards layout ────────────────────────────────────────────────
function ContactCard({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { club, landingPage } = data
  const social = landingPage.socialLinks ?? {}
  const hasSocial = Object.keys(social).length > 0

  return (
    <section id="contact" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
              Kết nối
            </span>
          </div>
          <h2 className="text-3xl font-black uppercase text-black leading-none">Liên hệ & Theo dõi</h2>
          <div className="w-12 h-1.5 rounded-full bg-black mt-3" />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Contact info card */}
          {(club.contactInfo || club.advisorName) && (
            <div className="rounded-2xl border-2 border-black bg-white p-6 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <h3 className="text-sm font-black uppercase tracking-wide text-black mb-4">Thông tin liên hệ</h3>
              <div className="space-y-3">
                {club.contactInfo && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${theme.primaryColor}18` }}>
                      <Mail size={14} style={{ color: theme.primaryColor }} />
                    </div>
                    <span className="text-sm text-gray-700 font-semibold">{club.contactInfo}</span>
                  </div>
                )}
                {club.advisorName && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${theme.accentColor}18` }}>
                      <BookUser size={14} style={{ color: theme.accentColor }} />
                    </div>
                    <span className="text-sm text-gray-700 font-semibold">
                      GV phụ trách: <strong>{club.advisorName}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social links card */}
          {hasSocial && (
            <div className="rounded-2xl border-2 border-black bg-white p-6 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <h3 className="text-sm font-black uppercase tracking-wide text-black mb-4">Mạng xã hội</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(social).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl border-2 border-black text-xs font-black uppercase tracking-wide px-3 py-2 flex items-center gap-1.5 text-white transition-all duration-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                    style={{ backgroundColor: theme.primaryColor, boxShadow: '2px 2px 0 #003087' }}>
                    {PLATFORM_LABELS[platform.toLowerCase()] ?? platform}
                    <ExternalLink size={10} className="opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
