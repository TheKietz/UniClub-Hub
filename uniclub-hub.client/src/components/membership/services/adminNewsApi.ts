import api from '@/lib/axiosInstance'
import type { PostResponse, PostListResponse, CreatePostRequest, UpdatePostRequest } from './postsApi'

// Tin tức cấp trường (school-level news) — Post.ClubId == null. Chỉ SUPER_ADMIN.
const BASE = '/admin/news'

export const getAdminNews = (
  params?: { page?: number; pageSize?: number; search?: string; category?: string; status?: string }
) =>
  api.get<{ data: PostListResponse }>(BASE, { params }).then(r => r.data.data)

export const getAdminNewsItem = (id: number) =>
  api.get<{ data: PostResponse }>(`${BASE}/${id}`).then(r => r.data.data)

export const createAdminNews = (dto: CreatePostRequest) =>
  api.post<{ data: PostResponse }>(BASE, dto).then(r => r.data.data)

export const updateAdminNews = (id: number, dto: UpdatePostRequest) =>
  api.put<{ data: PostResponse }>(`${BASE}/${id}`, dto).then(r => r.data.data)

export const deleteAdminNews = (id: number) =>
  api.delete(`${BASE}/${id}`)

export const setAdminNewsPublish = (id: number, published: boolean) =>
  api.patch<{ data: PostResponse }>(`${BASE}/${id}/publish`, { published }).then(r => r.data.data)

export const uploadAdminNewsThumbnail = (id: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ data: PostResponse }>(`${BASE}/${id}/thumbnail`, form).then(r => r.data.data)
}
