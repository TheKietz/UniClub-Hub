export type SectionType =
  | 'hero'
  | 'about'
  | 'stats'
  | 'departments'
  | 'events'
  | 'posts'
  | 'gallery'
  | 'apply'
  | 'contact'

export interface SectionConfig {
  id: SectionType
  visible: boolean
  order: number
  style: string
}

export interface PortalTheme {
  primaryColor: string
  accentColor: string
  mode?: 'light' | 'dark'
}

export interface LayoutSettings {
  theme: PortalTheme
  sections: SectionConfig[]
}

export const DEFAULT_LAYOUT: LayoutSettings = {
  theme: { primaryColor: '#4f46e5', accentColor: '#7c3aed', mode: 'light' },
  sections: [
    { id: 'hero',        visible: true,  order: 0, style: 'default'  },
    { id: 'stats',       visible: true,  order: 1, style: 'default'  },
    { id: 'about',       visible: true,  order: 2, style: 'split'    },
    { id: 'departments', visible: true,  order: 3, style: 'grid'     },
    { id: 'events',      visible: true,  order: 4, style: 'default'  },
    { id: 'posts',       visible: true,  order: 5, style: 'magazine' },
    { id: 'gallery',     visible: true,  order: 6, style: 'default'  },
    { id: 'apply',       visible: true,  order: 7, style: 'banner'   },
    { id: 'contact',     visible: true,  order: 8, style: 'default'  },
  ],
}

export interface ClubPublicInfo {
  id: number
  name: string
  code: string
  description?: string
  logoUrl?: string
  categoryName?: string
  advisorName?: string
  establishedDate?: string
  memberCount: number
  contactInfo?: string
}

export interface LandingPageContent {
  heroImage?: string
  introduction?: string
  mission?: string
  vision?: string
  socialLinks?: Record<string, string>
  layoutSettings?: LayoutSettings
  achievements?: AchievementItem[]
}

export interface AchievementItem {
  id: number
  title: string
  description?: string
  year?: number
}

export interface DepartmentPublicItem {
  id: number
  name: string
  description?: string
  memberCount: number
  leadName?: string
}

export interface EventPublicItem {
  id: number
  name: string
  description?: string
  location?: string
  startTime: string
  endTime?: string
  status: string
}

export interface PostPublicItem {
  id: number
  title: string
  content?: string
  thumbnailUrl?: string
  category?: string
  createdAt: string
  authorName?: string
}

export interface MediaItem {
  id: number
  mediaUrl: string
  mediaType: 'Image' | 'Video'
  description?: string
}

export interface LandingStats {
  memberCount: number
  eventCount: number
  postCount: number
  departmentCount: number
}

export interface ClubLandingData {
  club: ClubPublicInfo
  landingPage: LandingPageContent
  departments: DepartmentPublicItem[]
  upcomingEvents: EventPublicItem[]
  recentPosts: PostPublicItem[]
  gallery: MediaItem[]
  stats: LandingStats
}

export interface ClubExploreItem {
  id: number
  name: string
  code: string
  description?: string
  logoUrl?: string
  categoryName?: string
  memberCount: number
  status: string
  primaryColor?: string
}

export interface ExploreResponse {
  data: ClubExploreItem[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CategoryItem {
  id: number
  name: string
  description?: string
}

// ── Aggregate feeds (school + all clubs) ─────────────────────────────
export type PortalFeedScope = 'all' | 'university' | 'club'

export interface PortalEventItem {
  id: number
  clubId: number | null        // null = cấp trường
  clubName?: string | null
  clubLogoUrl?: string | null
  name: string
  description?: string | null
  location?: string | null
  bannerUrl?: string | null
  startTime?: string | null
  endTime?: string | null
  maxParticipants?: number | null
  participantCount: number
  status: string
  category?: string | null
}

export interface PortalNewsItem {
  id: number
  clubId: number | null        // null = cấp trường
  clubName?: string | null
  clubLogoUrl?: string | null
  title: string
  content?: string | null
  thumbnailUrl?: string | null
  category: string
  createdAt: string
  authorName?: string | null
}

export interface PortalFeedResult<T> {
  data: T[]
  totalCount: number
  page: number
  pageSize: number
}
