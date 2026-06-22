import api from '@/lib/axiosInstance'

export type PostCategory = 'News' | 'Announcement'

export interface PostResponse {
  id: number
  clubId: number
  title: string
  content: string
  thumbnailUrl?: string
  category: PostCategory
  isPublished: boolean
  createdAt: string
  authorName: string
  departmentId?: number
  departmentName?: string
}

export interface PostListResponse {
  data: PostResponse[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreatePostRequest {
  title: string
  content: string
  category: PostCategory
  isPublished: boolean
  departmentId?: number
}

export type UpdatePostRequest = CreatePostRequest

const base = (clubId: number) => `/clubs/${clubId}/posts`

export const getPostsAdmin = (
  clubId: number,
  params?: { page?: number; pageSize?: number; search?: string; category?: string; isPublished?: boolean }
) =>
  api.get<{ data: PostListResponse }>(base(clubId), { params }).then(r => r.data.data)

export const getPost = (clubId: number, id: number) =>
  api.get<{ data: PostResponse }>(`${base(clubId)}/${id}`).then(r => r.data.data)

export const createPost = (clubId: number, dto: CreatePostRequest) =>
  api.post<{ data: PostResponse }>(base(clubId), dto).then(r => r.data.data)

export const updatePost = (clubId: number, id: number, dto: UpdatePostRequest) =>
  api.put<{ data: PostResponse }>(`${base(clubId)}/${id}`, dto).then(r => r.data.data)

export const deletePost = (clubId: number, id: number) =>
  api.delete(`${base(clubId)}/${id}`)

export const uploadPostThumbnail = (clubId: number, id: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ data: PostResponse }>(`${base(clubId)}/${id}/thumbnail`, form).then(r => r.data.data)
}
