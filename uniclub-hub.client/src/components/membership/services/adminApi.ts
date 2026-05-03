import api from '@/lib/axiosInstance'
import type {
  SystemStats, UserItem, PagedResult, ClubItem, CategoryItem,
  CreateClubDto, UpdateClubDto, CreateCategoryDto,
} from '@/components/membership/services/admin.types'

// ── Stats ──────────────────────────────────────────────────────────────────

export const getSystemStats = () =>
  api.get<{ data: SystemStats }>('/admin/stats').then(r => r.data.data)

// ── Users ──────────────────────────────────────────────────────────────────

export const getUsers = (params?: { search?: string; page?: number; pageSize?: number }) =>
  api.get<{ data: PagedResult<UserItem> }>('/admin/users', { params }).then(r => r.data.data)

export const lockUser = (id: string) =>
  api.patch(`/admin/users/${id}/lock`)

export const unlockUser = (id: string) =>
  api.patch(`/admin/users/${id}/unlock`)

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`)

// ── Clubs ──────────────────────────────────────────────────────────────────

export const getAdminClubs = (params?: { categoryId?: number; status?: string }) =>
  api.get<{ data: ClubItem[] }>('/admin/clubs', { params }).then(r => r.data.data)

export const createClub = (dto: CreateClubDto) =>
  api.post<{ data: ClubItem }>('/admin/clubs', dto).then(r => r.data.data)

export const updateClub = (id: number, dto: UpdateClubDto) =>
  api.put<{ data: ClubItem }>(`/admin/clubs/${id}`, dto).then(r => r.data.data)

export const deleteClub = (id: number) =>
  api.delete(`/admin/clubs/${id}`)

// ── Categories ─────────────────────────────────────────────────────────────

export const getCategories = () =>
  api.get<{ data: CategoryItem[] }>('/admin/categories').then(r => r.data.data)

export const createCategory = (dto: CreateCategoryDto) =>
  api.post<{ data: CategoryItem }>('/admin/categories', dto).then(r => r.data.data)

export const updateCategory = (id: number, dto: CreateCategoryDto) =>
  api.put<{ data: CategoryItem }>(`/admin/categories/${id}`, dto).then(r => r.data.data)

export const deleteCategory = (id: number) =>
  api.delete(`/admin/categories/${id}`)
