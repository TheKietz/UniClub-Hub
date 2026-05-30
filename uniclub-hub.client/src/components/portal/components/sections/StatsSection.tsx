import { Users, CalendarDays, FileText, LayoutGrid } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

const STATS = (s: ClubLandingData['stats']) => [
  { label: 'Thành viên', value: s.memberCount, icon: Users },
  { label: 'Sự kiện', value: s.eventCount, icon: CalendarDays },
  { label: 'Bài viết', value: s.postCount, icon: FileText },
  { label: 'Ban chức năng', value: s.departmentCount, icon: LayoutGrid },
]

export default function StatsSection({ data, style, theme }: Props) {
  const { stats } = data
  const total = stats.memberCount + stats.eventCount + stats.postCount + stats.departmentCount
  if (total === 0) return null

  if (style === 'banner') return <StatsBanner stats={stats} theme={theme} />
  return <StatsDefault stats={stats} theme={theme} />
}

// ── Default: white row with colored numbers ───────────────────────────────────
function StatsDefault({ stats, theme }: { stats: ClubLandingData['stats']; theme: PortalTheme }) {
  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS(stats).map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={22} className="mx-auto mb-2" style={{ color: theme.primaryColor }} />
              <div className="text-3xl font-extrabold text-gray-900">{value.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Banner: dark primary background, large white numbers ─────────────────────
function StatsBanner({ stats, theme }: { stats: ClubLandingData['stats']; theme: PortalTheme }) {
  return (
    <section style={{ backgroundColor: theme.primaryColor }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS(stats).map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <Icon size={24} className="mx-auto mb-2 text-white/60" />
              <div className="text-4xl font-extrabold text-white">{value.toLocaleString()}</div>
              <div className="text-sm text-white/70 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
