import axios from 'axios'
import type { ClubLandingData, ExploreResponse, CategoryItem } from './portal.types'

const BASE = '/api/v1/portal'

export async function getClubLandingPage(clubId: number): Promise<ClubLandingData> {
  const { data } = await axios.get<{ data: ClubLandingData; success: boolean }>(`${BASE}/clubs/${clubId}`)
  return data.data
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
