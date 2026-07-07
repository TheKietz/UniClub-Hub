import { Users, Crown } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function DepartmentsSection({ data, style, theme }: Props) {
  if (!data.departments.length) return null

  if (style === 'list')    return <DepartmentsList    data={data} theme={theme} />
  if (style === 'compact') return <DepartmentsCompact data={data} theme={theme} />
  return <DepartmentsGrid data={data} theme={theme} />
}

// ── Grid: rounded hard-shadow cards ──────────────────────────────────────────
function DepartmentsGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { departments } = data
  const palette = buildPalette(theme, departments.length)

  return (
    <section id="departments" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Cơ cấu tổ chức" sub={`${departments.length} ban chức năng`} theme={theme} />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept, i) => (
            <div key={dept.id}
              className="rounded-2xl border-2 border-black bg-white p-6 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #003087' }}>
              <div className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-white font-black text-sm mb-4"
                style={{ backgroundColor: palette[i % palette.length] }}>
                {dept.name[0].toUpperCase()}
              </div>
              <h3 className="font-black text-black text-sm uppercase tracking-wide">{dept.name}</h3>
              {dept.description && (
                <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{dept.description}</p>
              )}
              <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-gray-600">
                  <Users size={11} /> {dept.memberCount} TV
                </span>
                {dept.leadName && (
                  <span className="flex items-center gap-1 text-amber-700 uppercase tracking-wide">
                    <Crown size={11} /> {dept.leadName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── List: rows in rounded container ──────────────────────────────────────────
function DepartmentsList({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { departments } = data

  return (
    <section id="departments" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Cơ cấu tổ chức" sub={`${departments.length} ban chức năng`} theme={theme} />

        <div className="mt-8 rounded-2xl border-2 border-black overflow-hidden divide-y-2 divide-black">
          {departments.map(dept => (
            <div key={dept.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-white hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full flex-shrink-0 border border-black"
                  style={{ backgroundColor: theme.primaryColor }} />
                <div>
                  <div className="font-black text-black text-sm uppercase tracking-wide">{dept.name}</div>
                  {dept.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{dept.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold flex-shrink-0">
                {dept.leadName && (
                  <span className="flex items-center gap-1 text-amber-700 uppercase">
                    <Crown size={11} /> {dept.leadName}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-lg border border-black px-2 py-0.5">
                  <Users size={10} /> {dept.memberCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Compact: 4-column tight grid with dot accent ──────────────────────────────
function DepartmentsCompact({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { departments } = data
  const palette = buildPalette(theme, departments.length)

  return (
    <section id="departments" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Cơ cấu tổ chức" sub={`${departments.length} ban chức năng`} theme={theme} />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {departments.map((dept, i) => (
            <div key={dept.id}
              className="rounded-xl border-2 border-black bg-white p-4 flex items-start gap-3 transition-all duration-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              style={{ boxShadow: '3px 3px 0 #003087' }}>
              {/* Color dot */}
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: palette[i % palette.length] }} />
              <div className="min-w-0">
                <div className="font-black text-black text-xs uppercase tracking-wide leading-tight">{dept.name}</div>
                <div className="flex items-center gap-1 mt-1.5 text-gray-500 text-xs font-semibold">
                  <Users size={10} /> {dept.memberCount} thành viên
                </div>
                {dept.leadName && (
                  <div className="flex items-center gap-1 mt-1 text-amber-700 text-xs font-bold uppercase truncate">
                    <Crown size={9} /> {dept.leadName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ label, sub, theme }: { label: string; sub?: string; theme: PortalTheme }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
          Tổ chức
        </span>
      </div>
      <h2 className="text-3xl font-black uppercase text-black leading-none">{label}</h2>
      {sub && <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mt-1">{sub}</p>}
      <div className="w-12 h-1.5 rounded-full bg-black mt-3" />
    </div>
  )
}

function buildPalette(theme: PortalTheme, count: number): string[] {
  const base = [theme.primaryColor, theme.accentColor, '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  return Array.from({ length: count }, (_, i) => base[i % base.length])
}
