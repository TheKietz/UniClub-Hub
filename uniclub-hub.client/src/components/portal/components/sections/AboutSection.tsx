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

  if (style === 'split')     return <AboutSplit     data={data} theme={theme} />
  if (style === 'fullwidth') return <AboutFullwidth data={data} theme={theme} />
  if (style === 'timeline')  return <AboutTimeline  data={data} theme={theme} />
  return <AboutDefault data={data} theme={theme} />
}

// ── Default: two rounded cards side by side ───────────────────────────────────
function AboutDefault({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data

  return (
    <section id="about" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Về chúng tôi" theme={theme} />

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {landingPage.mission && (
            <div className="rounded-2xl border-2 border-black bg-white p-7 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <div className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center mb-4"
                style={{ backgroundColor: theme.primaryColor }}>
                <Target size={18} className="text-white" />
              </div>
              <h3 className="text-base font-black uppercase tracking-wide text-black mb-3">Sứ mệnh</h3>
              <div className="w-8 h-0.5 rounded-full bg-black mb-3" />
              <p className="text-gray-600 leading-relaxed text-sm">{landingPage.mission}</p>
            </div>
          )}
          {landingPage.vision && (
            <div className="rounded-2xl border-2 border-black bg-white p-7 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <div className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center mb-4"
                style={{ backgroundColor: theme.accentColor }}>
                <Eye size={18} className="text-white" />
              </div>
              <h3 className="text-base font-black uppercase tracking-wide text-black mb-3">Tầm nhìn</h3>
              <div className="w-8 h-0.5 rounded-full bg-black mb-3" />
              <p className="text-gray-600 leading-relaxed text-sm">{landingPage.vision}</p>
            </div>
          )}
        </div>

        <Achievements achievements={landingPage.achievements} theme={theme} />
      </div>
    </section>
  )
}

// ── Split: rows with icon ─────────────────────────────────────────────────────
function AboutSplit({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data

  return (
    <section id="about" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Về chúng tôi" theme={theme} />

        <div className="mt-10 space-y-6">
          {landingPage.mission && (
            <div className="rounded-2xl flex flex-col md:flex-row gap-6 items-start border-2 border-black bg-white p-6 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor }}>
                <Target size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black uppercase tracking-wide text-black mb-2">Sứ mệnh</h3>
                <div className="w-8 h-0.5 rounded-full bg-black mb-3" />
                <p className="text-gray-600 leading-relaxed text-base max-w-2xl">{landingPage.mission}</p>
              </div>
            </div>
          )}
          {landingPage.vision && (
            <div className="rounded-2xl flex flex-col md:flex-row gap-6 items-start border-2 border-black bg-white p-6 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center"
                style={{ backgroundColor: theme.accentColor }}>
                <Eye size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black uppercase tracking-wide text-black mb-2">Tầm nhìn</h3>
                <div className="w-8 h-0.5 rounded-full bg-black mb-3" />
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

// ── Fullwidth: stacked full-width strips ──────────────────────────────────────
function AboutFullwidth({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data

  return (
    <section id="about">
      {landingPage.mission && (
        <div className="py-16 bg-white border-b-4 border-black">
          <div className="max-w-5xl mx-auto px-6">
            <SectionHeading label="Sứ mệnh" theme={theme} />
            <p className="mt-6 text-gray-700 leading-relaxed text-xl max-w-3xl font-medium">
              {landingPage.mission}
            </p>
          </div>
        </div>
      )}
      {landingPage.vision && (
        <div className="py-16 border-b-4 border-black" style={{ backgroundColor: theme.primaryColor }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-sm border-2 border-white/80 bg-white/30" />
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Định hướng</span>
              </div>
              <h2 className="text-3xl font-black uppercase text-white leading-none">Tầm nhìn</h2>
              <div className="w-12 h-1.5 rounded-full bg-white mt-3" />
            </div>
            <p className="text-white/90 leading-relaxed text-xl max-w-3xl font-medium">{landingPage.vision}</p>
          </div>
        </div>
      )}
      {(landingPage.achievements?.length ?? 0) > 0 && (
        <div className="py-16 bg-white border-b-4 border-black">
          <div className="max-w-5xl mx-auto px-6">
            <Achievements achievements={landingPage.achievements} theme={theme} />
          </div>
        </div>
      )}
    </section>
  )
}

// ── Timeline: vertical with icon nodes ───────────────────────────────────────
function AboutTimeline({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { landingPage } = data
  const items = [
    landingPage.mission && { icon: Target, label: 'Sứ mệnh', color: theme.primaryColor, text: landingPage.mission },
    landingPage.vision  && { icon: Eye,    label: 'Tầm nhìn', color: theme.accentColor,  text: landingPage.vision  },
  ].filter(Boolean) as { icon: typeof Target; label: string; color: string; text: string }[]

  return (
    <section id="about" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Về chúng tôi" theme={theme} />

        <div className="mt-10 relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />

          <div className="space-y-8">
            {items.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex gap-8 items-start">
                  {/* Icon node */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl border-2 border-black flex items-center justify-center z-10 relative"
                    style={{ backgroundColor: item.color, boxShadow: '3px 3px 0 #003087' }}>
                    <Icon size={20} className="text-white" />
                  </div>
                  {/* Card */}
                  <div className="flex-1 rounded-2xl border-2 border-black bg-white p-6 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    style={{ boxShadow: '4px 4px 0 #003087' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-base font-black uppercase tracking-wide text-black">{item.label}</h3>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <p className="text-gray-600 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Achievements achievements={landingPage.achievements} theme={theme} />
      </div>
    </section>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
          Câu lạc bộ
        </span>
      </div>
      <h2 className="text-3xl font-black uppercase text-black leading-none">{label}</h2>
      <div className="w-12 h-1.5 rounded-full bg-black mt-3" />
    </div>
  )
}

function Achievements({
  achievements,
  theme,
}: {
  achievements?: import('../../services/portal.types').AchievementItem[]
  theme: PortalTheme
}) {
  if (!achievements?.length) return null
  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <Trophy size={18} style={{ color: theme.accentColor }} />
        <h3 className="text-base font-black uppercase tracking-wide text-black">Thành tích nổi bật</h3>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map(a => (
          <div key={a.id}
            className="rounded-xl border-2 border-black bg-white p-4 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            style={{ boxShadow: '3px 3px 0 #003087' }}>
            <div className="text-sm font-black text-black uppercase">{a.title}</div>
            {a.year && (
              <div className="rounded-md inline-block border border-black text-xs font-bold px-1.5 py-0.5 mt-1"
                style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>
                {a.year}
              </div>
            )}
            {a.description && <div className="text-xs text-gray-600 mt-2">{a.description}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
