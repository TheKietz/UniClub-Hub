import api from '@/lib/axiosInstance'

export interface ClubRecommendation {
  clubId: number
  name: string
  logoUrl: string | null
  description: string | null
  categoryName: string | null
  memberCount: number
  similarityScore: number
  reason: string
}

export const getClubRecommendations = (topN = 3) =>
  api.get<{ data: ClubRecommendation[] }>('/v1/recommendations/clubs', { params: { topN } })
