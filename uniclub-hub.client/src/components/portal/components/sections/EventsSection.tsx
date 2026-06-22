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
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function EventsSection({ data, style, theme }: Props) {
  if (!data.upcomingEvents.length) return null
  if (style === 'timeline') return <EventsTimeline data={data} theme={theme} />
  if (style === 'list')     return <EventsList     data={data} theme={theme} />
  return <EventsGrid data={data} theme={theme} />
}

// ── Grid: rounded hard-shadow event cards ─────────────────────────────────────
function EventsGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { upcomingEvents } = data

  return (
    <section id="events" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Sự kiện sắp tới" theme={theme} />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcomingEvents.map(event => (
            <div key={event.id}
              className="rounded-2xl border-2 border-black bg-white overflow-hidden transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              style={{ boxShadow: '4px 4px 0 #000' }}>
              {/* Date header strip */}
              <div className="px-4 py-2 border-b-2 border-black flex items-center justify-between"
                style={{ backgroundColor: theme.primaryColor }}>
                <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wide">
                  <Calendar size={11} />{fmtDate(event.startTime)}
                </div>
                <EventStatusBadge status={event.status} />
              </div>

              <div className="p-5">
                <h3 className="font-black text-black text-sm uppercase tracking-wide line-clamp-2 mb-2">
                  {event.name}
                </h3>
                {event.description && (
                  <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-3">{event.description}</p>
                )}
                <div className="pt-3 border-t border-black/10 space-y-1.5">
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                      <MapPin size={10} /> {event.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                    <Clock size={10} /> {fmtTime(event.startTime)}
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

// ── Timeline: vertical with rounded cards ────────────────────────────────────
function EventsTimeline({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { upcomingEvents } = data

  return (
    <section id="events" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Sự kiện sắp tới" theme={theme} />

        <div className="mt-8 relative">
          <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-black" />

          <div className="space-y-6">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex gap-6 relative pl-14">
                {/* Rounded dot */}
                <div className="absolute left-[14px] top-4 w-4 h-4 rounded-md border-2 border-black"
                  style={{ backgroundColor: theme.primaryColor }} />

                <div className="flex-1 rounded-2xl border-2 border-black bg-white p-5 transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  style={{ boxShadow: '4px 4px 0 #000' }}>
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <h3 className="font-black text-black text-sm uppercase tracking-wide">{event.name}</h3>
                    <EventStatusBadge status={event.status} />
                  </div>
                  {event.description && (
                    <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-3">{event.description}</p>
                  )}
                  <div className="pt-3 border-t border-black/10 flex flex-wrap gap-4 text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />{fmtDate(event.startTime)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />{event.location}
                      </span>
                    )}
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

// ── List: compact scannable list rows ────────────────────────────────────────
function EventsList({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { upcomingEvents } = data

  return (
    <section id="events" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Sự kiện sắp tới" theme={theme} />

        <div className="mt-8 rounded-2xl border-2 border-black overflow-hidden divide-y-2 divide-black">
          {upcomingEvents.map(event => (
            <div key={event.id}
              className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-zinc-50 transition-colors group">
              {/* Date pill */}
              <div className="flex-shrink-0 text-center w-14">
                <div className="rounded-xl border-2 border-black px-2 py-1.5"
                  style={{ backgroundColor: theme.primaryColor }}>
                  <div className="text-lg font-black text-white leading-none">
                    {new Date(event.startTime).getDate()}
                  </div>
                  <div className="text-xs text-white/80 font-bold uppercase">
                    {new Date(event.startTime).toLocaleDateString('vi-VN', { month: 'short' })}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-black text-sm uppercase tracking-wide line-clamp-1">{event.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Clock size={9} />{fmtTime(event.startTime)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={9} />{event.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                <EventStatusBadge status={event.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EventStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    Draft:      { label: 'Sắp tới',     bg: '#dbeafe', color: '#1d4ed8' },
    InProgress: { label: 'Đang diễn ra', bg: '#dcfce7', color: '#15803d' },
    Completed:  { label: 'Đã kết thúc', bg: '#f4f4f5', color: '#52525b' },
    Cancelled:  { label: 'Đã hủy',      bg: '#fee2e2', color: '#dc2626' },
  }
  const { label, bg, color } = map[status] ?? { label: status, bg: '#f4f4f5', color: '#52525b' }
  return (
    <span className="rounded-full border border-current text-xs font-black uppercase px-2.5 py-0.5 flex-shrink-0"
      style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  )
}

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
          Hoạt động
        </span>
      </div>
      <h2 className="text-3xl font-black uppercase text-black leading-none">{label}</h2>
      <div className="w-12 h-1.5 rounded-full bg-black mt-3" />
    </div>
  )
}
