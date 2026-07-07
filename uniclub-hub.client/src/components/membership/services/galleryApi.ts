import api from '@/lib/axiosInstance'

export type MediaStatus = 'PendingReview' | 'Published' | 'Rejected'

export interface GalleryItem {
  id: number
  clubId: number
  mediaUrl: string
  mediaType: 'Image' | 'Video'
  description?: string
  eventId?: number
  status: MediaStatus
  uploadedById?: string
  uploadedByName?: string
  reviewNote?: string
  reviewedAt?: string
  uploadedAt: string
}

const base = (clubId: number) => `/clubs/${clubId}/gallery`

export const getGallery = (clubId: number) =>
  api.get<{ data: GalleryItem[] }>(base(clubId)).then(r => r.data.data)

export const getGalleryManage = (clubId: number) =>
  api.get<{ data: GalleryItem[] }>(`${base(clubId)}/manage`).then(r => r.data.data)

export const uploadImages = (clubId: number, files: File[], description?: string) => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  if (description) form.append('description', description)
  return api.post<{ data: GalleryItem[]; message: string }>(`${base(clubId)}/upload`, form)
    .then(r => ({ items: r.data.data, message: r.data.message }))
}

export const uploadVideo = (clubId: number, file: File, description?: string) => {
  const form = new FormData()
  form.append('file', file)
  if (description) form.append('description', description)
  return api.post<{ data: GalleryItem; message: string }>(`${base(clubId)}/upload-video`, form)
    .then(r => ({ item: r.data.data, message: r.data.message }))
}

export const addVideo = (clubId: number, url: string, description?: string) =>
  api.post<{ data: GalleryItem }>(`${base(clubId)}/video`, { url, description }).then(r => r.data.data)

export const updateGalleryItem = (clubId: number, id: number, description: string) =>
  api.put<{ data: GalleryItem }>(`${base(clubId)}/${id}`, { description }).then(r => r.data.data)

export const deleteGalleryItem = (clubId: number, id: number) =>
  api.delete(`${base(clubId)}/${id}`)

export const approveGalleryItem = (clubId: number, id: number) =>
  api.post<{ data: GalleryItem }>(`${base(clubId)}/${id}/approve`).then(r => r.data.data)

export const rejectGalleryItem = (clubId: number, id: number, reviewNote?: string) =>
  api.post<{ data: GalleryItem }>(`${base(clubId)}/${id}/reject`, { reviewNote }).then(r => r.data.data)
