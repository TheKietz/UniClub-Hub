import { Users, CalendarDays, FileText, LayoutGrid } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

const STATS = (s: ClubLandingData['stats']) => [
  { label: 'Thành viên',    value: s.memberCount,     icon: Users,       color: '#4f46e5' },
  { label: 'Sự kiện',       value: s.eventCount,      icon: CalendarDays, color: '#0ea5e9' },
  { label: 'Bài viết',      value: s.postCount,       icon: FileText,    color: '#10b981' },
  { label: 'Ban chức năng', value: s.departmentCount, icon: LayoutGrid,  color: '#f59e0b' },
]

export default function StatsSection({ data, style, theme }: Props) {
  const { stats } = data
  const total = stats.memberCount + stats.eventCount + stats.postCount + stats.departmentCount
  if (total === 0) return null

  if (style === 'banner') return <StatsBanner stats={stats} theme={theme} />
  if (style === 'cards')  return <StatsCards  stats={stats} theme={theme} />
  return <StatsDefault stats={stats} theme={theme} />
}

// ── Default: white bg, cells with thick borders ───────────────────────────────
function StatsDefault({ stats, theme }: { stats: ClubLandingData['stats']; theme: PortalTheme }) {
  return (
    <section className="bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6 py-0">
        <div className="rounded-2xl overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-x-2 divide-black border-2 border-black">
          {STATS(stats).map(({ label, value, icon: Icon }, i) => (
            <div key={label}
              className={`text-center py-10 px-4 ${i % 2 === 0 ? 'border-b-2 border-black md:border-b-0' : ''}`}>
              <Icon size={22} className="mx-auto mb-3" style={{ color: theme.primaryColor }} />
              <div className="text-4xl font-black text-black leading-none">{value.toLocaleString()}</div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-500 mt-2">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Banner: dark primary bg, white numbers ────────────────────────────────────
function StatsBanner({ stats, theme }: { stats: ClubLandingData['stats']; theme: PortalTheme }) {
  return (
    <section className="border-b-4 border-black" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})` }}>
      <div className="max-w-5xl mx-auto px-6 py-0">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x-2 divide-white/30">
          {STATS(stats).map(({ label, value, icon: Icon }, i) => (
            <div key={label}
              className={`text-center py-12 px-4 ${i < 2 ? 'border-b-2 border-white/30 md:border-b-0' : ''}`}>
              <Icon size={22} className="mx-auto mb-3 text-white/60" />
              <div className="text-4xl font-black text-white leading-none">{value.toLocaleString()}</div>
              <div className="text-xs font-black uppercase tracking-widest text-white/60 mt-2">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Cards: individual rounded cards with colored icon ─────────────────────────
function StatsCards({ stats, theme }: { stats: ClubLandingData['stats']; theme: PortalTheme }) {
  const items = STATS(stats)

  return (
    <section className="py-12 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(({ label, value, icon: Icon, color }) => (
            <div key={label}
              className="rounded-2xl bg-white border-2 border-black overflow-hidden transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              {/* Color top bar */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${color})` }} />
              <div className="p-5 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: `${color}18`, border: `2px solid ${color}30` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="text-3xl font-black text-black leading-none mb-1">{value.toLocaleString()}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
