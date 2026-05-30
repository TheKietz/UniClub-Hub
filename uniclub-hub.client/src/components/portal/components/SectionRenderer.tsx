import type { SectionConfig, ClubLandingData, PortalTheme } from '../services/portal.types'
import HeroSection from './sections/HeroSection'
import AboutSection from './sections/AboutSection'
import StatsSection from './sections/StatsSection'
import DepartmentsSection from './sections/DepartmentsSection'
import EventsSection from './sections/EventsSection'
import PostsSection from './sections/PostsSection'
import GallerySection from './sections/GallerySection'
import ApplySection from './sections/ApplySection'
import ContactSection from './sections/ContactSection'

interface Props {
  config: SectionConfig
  data: ClubLandingData
  theme: PortalTheme
}

export default function SectionRenderer({ config, data, theme }: Props) {
  const props = { data, style: config.style, theme }

  switch (config.id) {
    case 'hero':        return <HeroSection        {...props} />
    case 'about':       return <AboutSection       {...props} />
    case 'stats':       return <StatsSection       {...props} />
    case 'departments': return <DepartmentsSection {...props} />
    case 'events':      return <EventsSection      {...props} />
    case 'posts':       return <PostsSection       {...props} />
    case 'gallery':     return <GallerySection     {...props} />
    case 'apply':       return <ApplySection       {...props} />
    case 'contact':     return <ContactSection     {...props} />
    default:            return null
  }
}
