import api from '@/lib/axiosInstance'

export type PostCategory = 'News' | 'Announcement'
export type PostStatus = 'Draft' | 'PendingReview' | 'Published' | 'Rejected'

export interface PostResponse {
  id: number
  clubId: number | null   // null = tin cấp trường
  clubName?: string | null
  title: string
  content: string
  thumbnailUrl?: string
  category: PostCategory
  status: PostStatus
  reviewNote?: string
  reviewerName?: string
  reviewedAt?: string
  createdAt: string
  authorId: string
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
  publishDirectly: boolean
  departmentId?: number
}

export interface UpdatePostRequest {
  title: string
  content: string
  category: PostCategory
  departmentId?: number
}

const base = (clubId: number) => `/clubs/${clubId}/posts`

export const getPostsAdmin = (
  clubId: number,
  params?: { page?: number; pageSize?: number; search?: string; category?: string; status?: string }
) =>
  api.get<{ data: PostListResponse }>(base(clubId), { params }).then(r => r.data.data)

export const getPostsPublic = (
  clubId: number,
  params?: { page?: number; pageSize?: number; search?: string; category?: string }
) =>
  api.get<{ data: PostListResponse }>(`${base(clubId)}/public`, { params }).then(r => r.data.data)

export const getPost = (clubId: number, id: number) =>
  api.get<{ data: PostResponse }>(`${base(clubId)}/${id}`).then(r => r.data.data)

export const createPost = (clubId: number, dto: CreatePostRequest) =>
  api.post<{ data: PostResponse }>(base(clubId), dto).then(r => r.data.data)

export const updatePost = (clubId: number, id: number, dto: UpdatePostRequest) =>
  api.put<{ data: PostResponse }>(`${base(clubId)}/${id}`, dto).then(r => r.data.data)

export const deletePost = (clubId: number, id: number) =>
  api.delete(`${base(clubId)}/${id}`)

export const submitPostForReview = (clubId: number, id: number) =>
  api.post<{ data: PostResponse }>(`${base(clubId)}/${id}/submit`).then(r => r.data.data)

export const approvePost = (clubId: number, id: number) =>
  api.post<{ data: PostResponse }>(`${base(clubId)}/${id}/approve`).then(r => r.data.data)

export const rejectPost = (clubId: number, id: number, reviewNote?: string) =>
  api.post<{ data: PostResponse }>(`${base(clubId)}/${id}/reject`, { reviewNote }).then(r => r.data.data)

export const uploadPostThumbnail = (clubId: number, id: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ data: PostResponse }>(`${base(clubId)}/${id}/thumbnail`, form).then(r => r.data.data)
}
