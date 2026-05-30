import { MapPin, Calendar, Clock } from 'lucide-react'
import type { ClubLandingData, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function EventsSection({ data, style, theme }: Props) {
  if (!data.upcomingEvents.length) return null
  if (style === 'timeline') return <EventsTimeline data={data} theme={theme} />
  return <EventsGrid data={data} theme={theme} />
}

// ── Grid: card grid ───────────────────────────────────────────────────────────
function EventsGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { upcomingEvents } = data

  return (
    <section id="events" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Sự kiện sắp tới" theme={theme} />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcomingEvents.map(event => (
            <div key={event.id} className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Date strip */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-50">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                >
                  <Calendar size={11} />
                  {fmtDate(event.startTime)}
                </div>
              </div>

              <div className="p-5">
                <EventStatusBadge status={event.status} />
                <h3 className="font-bold text-gray-900 text-sm mt-2 line-clamp-2">{event.name}</h3>

                {event.description && (
                  <p className="text-gray-500 text-xs mt-1.5 line-clamp-2">{event.description}</p>
                )}

                <div className="mt-3 space-y-1.5">
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                      <MapPin size={11} /> {event.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Clock size={11} /> {fmtTime(event.startTime)}
                    {event.endTime && ` – ${fmtTime(event.endTime)}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Timeline: vertical timeline layout ───────────────────────────────────────
function EventsTimeline({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { upcomingEvents } = data

  return (
    <section id="events" className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Sự kiện sắp tới" theme={theme} />

        <div className="mt-8 relative">
          {/* Vertical line */}
          <div
            className="absolute left-8 top-0 bottom-0 w-0.5 rounded-full"
            style={{ backgroundColor: `${theme.primaryColor}25` }}
          />

          <div className="space-y-6">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex gap-6 relative pl-20">
                {/* Date circle */}
                <div
                  className="absolute left-5 top-0 w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: theme.primaryColor }}
                />

                <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-sm">{event.name}</h3>
                    <EventStatusBadge status={event.status} />
                  </div>
                  {event.description && (
                    <p className="text-gray-500 text-xs mt-1.5 line-clamp-2">{event.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(event.startTime)}</span>
                    {event.location && <span className="flex items-center gap-1"><MapPin size={11} />{event.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function EventStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Upcoming:  { label: 'Sắp diễn ra', cls: 'bg-blue-50 text-blue-600' },
    Ongoing:   { label: 'Đang diễn ra', cls: 'bg-green-50 text-green-600' },
    Completed: { label: 'Đã kết thúc', cls: 'bg-gray-100 text-gray-500' },
    Cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-500' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
  )
}

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900">{label}</h2>
      <div className="w-10 h-1 rounded-full mt-2" style={{ backgroundColor: theme.primaryColor }} />
    </div>
  )
}
