import axios from 'axios'
import type { ClubLandingData, ExploreResponse, CategoryItem } from './portal.types'

const BASE = '/api/v1/portal'

const landingCache = new Map<number, { data: ClubLandingData; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function getClubLandingPage(clubId: number): Promise<ClubLandingData> {
  const cached = landingCache.get(clubId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
  const { data } = await axios.get<{ data: ClubLandingData; success: boolean }>(`${BASE}/clubs/${clubId}`)
  landingCache.set(clubId, { data: data.data, ts: Date.now() })
  return data.data
}

export function invalidateLandingCache(clubId: number) {
  landingCache.delete(clubId)
}

export async function recordClubView(clubId: number): Promise<void> {
  await axios.post(`${BASE}/clubs/${clubId}/view`)
}

export async function getExploreClubs(params?: {
  search?: string
  categoryId?: number
  page?: number
  pageSize?: number
}): Promise<ExploreResponse> {
  const { data } = await axios.get<ExploreResponse>(`${BASE}/clubs`, { params })
  return data
}

export async function getCategories(): Promise<CategoryItem[]> {
  const { data } = await axios.get<{ data: CategoryItem[] }>('/api/v1/membership/categories')
  return data.data
}
