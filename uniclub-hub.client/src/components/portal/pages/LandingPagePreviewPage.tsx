import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubLandingPage } from '../services/portal.api'
import type { ClubLandingData, PortalTheme, SectionConfig } from '../services/portal.types'
import { DEFAULT_LAYOUT } from '../services/portal.types'
import SectionRenderer from '../components/SectionRenderer'

const CANONICAL_ORDER = Object.fromEntries(DEFAULT_LAYOUT.sections.map(s => [s.id, s.order]))

export interface PreviewBroadcast {
  heroImage: string
  introduction: string
  mission: string
  vision: string
  socialLinks: Record<string, string>
  theme: PortalTheme
  sections: SectionConfig[]
}

export default function LandingPagePreviewPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [baseData, setBaseData] = useState<ClubLandingData | null>(null)
  const [overrides, setOverrides] = useState<PreviewBroadcast | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    getClubLandingPage(id).then(setBaseData).catch(() => {})

    const channel = new BroadcastChannel(`landing-preview-${id}`)
    channelRef.current = channel
    channel.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'UPDATE') setOverrides(e.data.payload)
      if (e.data?.type === 'REQUEST_ACK') setOverrides(e.data.payload)
    }
    // Request current state from manage tab
    channel.postMessage({ type: 'REQUEST' })
    return () => channel.close()
  }, [id])

  if (!baseData) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Đang tải...
    </div>
  )

  const theme = overrides?.theme ?? baseData.landingPage.layoutSettings?.theme ?? DEFAULT_LAYOUT.theme
  const sections = overrides?.sections ?? baseData.landingPage.layoutSettings?.sections ?? DEFAULT_LAYOUT.sections

  const preview: ClubLandingData = overrides ? {
    ...baseData,
    landingPage: {
      ...baseData.landingPage,
      heroImage: overrides.heroImage || baseData.landingPage.heroImage,
      introduction: overrides.introduction,
      mission: overrides.mission,
      vision: overrides.vision,
      socialLinks: overrides.socialLinks,
      layoutSettings: { theme: overrides.theme, sections: overrides.sections },
    },
  } : baseData

  const visibleSections = [...sections]
    .filter(s => s.visible)
    .sort((a, b) => (CANONICAL_ORDER[a.id] ?? a.order) - (CANONICAL_ORDER[b.id] ?? b.order))

  return (
    <div style={{ '--p': theme.primaryColor, '--a': theme.accentColor } as React.CSSProperties}>
      <div className="sticky top-0 z-50 bg-amber-400 border-b border-amber-500 text-amber-900 text-xs font-bold text-center py-1.5 tracking-wide">
        ⚡ Xem trước — cập nhật trực tiếp từ trang quản trị
      </div>
      {visibleSections.map(section => (
        <SectionRenderer key={section.id} config={section} data={preview} theme={theme} />
      ))}
    </div>
  )
}
