import { ExternalLink, Mail, BookUser } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  zalo: 'Zalo',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  website: 'Website',
}

export default function ContactSection({ data, theme }: Props) {
  const { club, landingPage } = data
  const social = landingPage.socialLinks ?? {}
  const hasSocial = Object.keys(social).length > 0
  const hasContent = club.contactInfo || hasSocial || club.advisorName

  if (!hasContent) return null

  return (
    <section id="contact" className="py-14 bg-gray-50 border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-xl font-extrabold text-gray-900 mb-5">Liên hệ & Theo dõi</h2>

        <div className="flex flex-wrap gap-4 items-center">
          {club.contactInfo && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Mail size={14} style={{ color: 'var(--p)' }} />
              {club.contactInfo}
            </div>
          )}

          {club.advisorName && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <BookUser size={14} style={{ color: 'var(--p)' }} />
              GV phụ trách: <span className="font-medium">{club.advisorName}</span>
            </div>
          )}

          {hasSocial && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(social).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
                >
                  {PLATFORM_LABELS[platform.toLowerCase()] ?? platform}
                  <ExternalLink size={11} className="text-gray-400" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
