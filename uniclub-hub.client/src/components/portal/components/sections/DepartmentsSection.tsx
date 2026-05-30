import { Users, Crown } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

export default function DepartmentsSection({ data, style, theme }: Props) {
  if (!data.departments.length) return null

  if (style === 'grid') return <DepartmentsGrid data={data} theme={theme} />
  if (style === 'list') return <DepartmentsList data={data} theme={theme} />
  return <DepartmentsGrid data={data} theme={theme} />
}

// ── Grid: card grid with department info ─────────────────────────────────────
function DepartmentsGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { departments } = data
  const palette = buildPalette(theme, departments.length)

  return (
    <section id="departments" className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Cơ cấu tổ chức" sub={`${departments.length} ban chức năng`} theme={theme} />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept, i) => (
            <div
              key={dept.id}
              className="rounded-2xl p-6 border border-white shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm mb-4"
                style={{ backgroundColor: palette[i % palette.length] }}
              >
                {dept.name[0].toUpperCase()}
              </div>
              <h3 className="font-bold text-gray-900 text-base">{dept.name}</h3>
              {dept.description && (
                <p className="text-gray-500 text-xs mt-1.5 line-clamp-2">{dept.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {dept.memberCount} thành viên
                </span>
                {dept.leadName && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Crown size={12} /> {dept.leadName}
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

// ── List: compact horizontal list ────────────────────────────────────────────
function DepartmentsList({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { departments } = data

  return (
    <section id="departments" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Cơ cấu tổ chức" sub={`${departments.length} ban chức năng`} theme={theme} />

        <div className="mt-8 divide-y divide-gray-100">
          {departments.map((dept) => (
            <div key={dept.id} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {dept.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{dept.name}</div>
                  {dept.description && (
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{dept.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                {dept.leadName && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Crown size={11} /> {dept.leadName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} /> {dept.memberCount}
                </span>
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
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900">{label}</h2>
      <div className="w-10 h-1 rounded-full mt-2" style={{ backgroundColor: theme.primaryColor }} />
      {sub && <p className="text-gray-500 text-sm mt-2">{sub}</p>}
    </div>
  )
}

function buildPalette(theme: PortalTheme, count: number): string[] {
  const base = [theme.primaryColor, theme.accentColor, '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  return Array.from({ length: count }, (_, i) => base[i % base.length])
}
