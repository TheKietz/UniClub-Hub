import api from '@/lib/axiosInstance'
import { apiUrl } from '@/lib/apiConfig'
import type {
  ClubLandingData, ExploreResponse, CategoryItem,
  PortalEventItem, PortalNewsItem, PortalFeedResult, PortalFeedScope,
} from './portal.types'

const portalBase = () => apiUrl('/v1/portal')

const landingCache = new Map<number, { data: ClubLandingData; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function getClubLandingPage(clubId: number): Promise<ClubLandingData> {
  const cached = landingCache.get(clubId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
  const { data } = await api.get<{ data: ClubLandingData; success: boolean }>(`${portalBase()}/clubs/${clubId}`)
  landingCache.set(clubId, { data: data.data, ts: Date.now() })
  return data.data
}

export function invalidateLandingCache(clubId: number) {
  landingCache.delete(clubId)
}

export async function recordClubView(clubId: number): Promise<void> {
  await api.post(`${portalBase()}/clubs/${clubId}/view`)
}

export async function getExploreClubs(params?: {
  search?: string
  categoryId?: number
  page?: number
  pageSize?: number
}): Promise<ExploreResponse> {
  const { data } = await api.get<ExploreResponse>(`${portalBase()}/clubs`, { params })
  return data
}

export async function getCategories(): Promise<CategoryItem[]> {
  const { data } = await api.get<{ data: CategoryItem[] }>(apiUrl('/v1/membership/categories'))
  return data.data
}

// ── Aggregate feeds (school-level + all clubs) ───────────────────────

export interface PortalEventsQuery {
  scope?: PortalFeedScope
  clubId?: number
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export async function getPortalEvents(params?: PortalEventsQuery): Promise<PortalFeedResult<PortalEventItem>> {
  const { data } = await api.get<{ data: PortalFeedResult<PortalEventItem> }>(`${portalBase()}/events`, { params })
  return data.data
}

export interface PortalNewsQuery {
  scope?: PortalFeedScope
  clubId?: number
  category?: string
  search?: string
  page?: number
  pageSize?: number
}

export async function getPortalNews(params?: PortalNewsQuery): Promise<PortalFeedResult<PortalNewsItem>> {
  const { data } = await api.get<{ data: PortalFeedResult<PortalNewsItem> }>(`${portalBase()}/news`, { params })
  return data.data
}
