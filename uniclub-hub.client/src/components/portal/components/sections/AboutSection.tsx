import { Target, Eye, Trophy } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function AboutSection({ data, style, theme }: Props) {
  const { landingPage } = data
  const hasContent = landingPage.mission || landingPage.vision || (landingPage.achievements?.length ?? 0) > 0
  if (!hasContent) return null

  if (style === 'split') return <AboutSplit data={data} theme={theme} />
  if (style === 'fullwidth') return <AboutFullwidth data={data} theme={theme} />
  return <AboutDefault data={data} theme={theme} />
}

// ── Default: mission + vision in two side-by-side cards ──────────────────────
function AboutDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data

  return (
    <section id="about" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Về chúng tôi" theme={theme} />

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {landingPage.mission && (
            <div className="rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-shadow">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${theme.primaryColor}15` }}
              >
                <Target size={20} style={{ color: theme.primaryColor }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sứ mệnh</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{landingPage.mission}</p>
            </div>
          )}
          {landingPage.vision && (
            <div className="rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-shadow">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${theme.accentColor}15` }}
              >
                <Eye size={20} style={{ color: theme.accentColor }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tầm nhìn</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{landingPage.vision}</p>
            </div>
          )}
        </div>

        <Achievements achievements={landingPage.achievements} theme={theme} />
      </div>
    </section>
  )
}

// ── Split: alternating full-width rows ────────────────────────────────────────
function AboutSplit({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data

  return (
    <section id="about" className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Về chúng tôi" theme={theme} />

        <div className="mt-10 space-y-10">
          {landingPage.mission && (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div
                className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm mt-1"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Target size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Sứ mệnh</h3>
                <p className="text-gray-600 leading-relaxed text-base max-w-2xl">{landingPage.mission}</p>
              </div>
            </div>
          )}
          {landingPage.vision && (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div
                className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm mt-1"
                style={{ backgroundColor: theme.accentColor }}
              >
                <Eye size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Tầm nhìn</h3>
                <p className="text-gray-600 leading-relaxed text-base max-w-2xl">{landingPage.vision}</p>
              </div>
            </div>
          )}
        </div>

        <Achievements achievements={landingPage.achievements} theme={theme} />
      </div>
    </section>
  )
}

// ── Fullwidth: dark accent strip between mission and vision ───────────────────
function AboutFullwidth({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data

  return (
    <section id="about">
      {landingPage.mission && (
        <div className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <SectionHeading label="Sứ mệnh" theme={theme} />
            <p className="mt-6 text-gray-600 leading-relaxed text-lg max-w-3xl">
              {landingPage.mission}
            </p>
          </div>
        </div>
      )}
      {landingPage.vision && (
        <div className="py-16" style={{ backgroundColor: theme.primaryColor }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-extrabold text-white mb-2">Tầm nhìn</h2>
            <div className="w-10 h-1 rounded-full bg-white/50 mb-6" />
            <p className="text-white/85 leading-relaxed text-lg max-w-3xl">{landingPage.vision}</p>
          </div>
        </div>
      )}
      {(landingPage.achievements?.length ?? 0) > 0 && (
        <div className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <Achievements achievements={landingPage.achievements} theme={theme} />
          </div>
        </div>
      )}
    </section>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────
function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900">{label}</h2>
      <div className="w-10 h-1 rounded-full mt-2" style={{ backgroundColor: theme.primaryColor }} />
    </div>
  )
}

function Achievements({ achievements, theme }: { achievements?: import('../../services/portal.types').AchievementItem[]; theme: PortalTheme }) {
  if (!achievements?.length) return null
  return (
    <div className="mt-10">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Trophy size={18} style={{ color: theme.accentColor }} />
        Thành tích nổi bật
      </h3>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map(a => (
          <div key={a.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
            <div className="text-sm font-semibold text-gray-800">{a.title}</div>
            {a.year && <div className="text-xs text-gray-400 mt-0.5">{a.year}</div>}
            {a.description && <div className="text-xs text-gray-500 mt-1">{a.description}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
