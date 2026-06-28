import api from '@/lib/axiosInstance'
import type {
  SystemStats, MonthlyGrowth, UserItem, PagedResult, ClubItem, CategoryItem,
  CreateClubDto, UpdateClubDto, CreateCategoryDto, UserImportPreview,
} from '@/components/membership/services/admin.types'

export type UserListQuery = {
  search?: string
  status?: string
  role?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type AdminClubListQuery = {
  search?: string
  categoryId?: number
  status?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// ── Stats ──────────────────────────────────────────────────────────────────

export const getSystemStats = () =>
  api.get<{ data: SystemStats }>('/admin/stats').then(r => r.data.data)

export const getSystemGrowth = (months = 12) =>
  api.get<{ data: MonthlyGrowth[] }>(`/admin/stats/growth?months=${months}`).then(r => r.data.data)

// ── Users ──────────────────────────────────────────────────────────────────

export const getUsers = (params?: UserListQuery) =>
  api.get<{ data: PagedResult<UserItem> }>('/admin/users', { params }).then(r => r.data.data)

export const lockUser = (id: string) =>
  api.patch(`/admin/users/${id}/lock`)

export const unlockUser = (id: string) =>
  api.patch(`/admin/users/${id}/unlock`)

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`)

export const changeUserRole = (id: string, role: string) =>
  api.patch(`/admin/users/${id}/role`, { role })

export const createUser = (dto: {
  email: string; password: string; fullName?: string
  studentId?: string; major?: string; gender?: string; role?: string
}) => api.post<{ data: unknown }>('/admin/users', dto).then(r => r.data.data)

// ── Clubs ──────────────────────────────────────────────────────────────────

export const getAdminClubs = (params?: { categoryId?: number; status?: string }) =>
  api.get<{ data: ClubItem[] }>('/admin/clubs', { params }).then(r => r.data.data)

export const getAdminClubsPage = (params?: AdminClubListQuery) =>
  api.get<{ data: PagedResult<ClubItem> }>('/admin/clubs', { params }).then(r => r.data.data)

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


import type { ClubAuditLogPage } from './club.types'
export const getAdminAuditLogs = (params?: { module?: string; search?: string; action?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: 'asc' | 'desc'; page?: number; pageSize?: number }) =>
  api.get<{ data: ClubAuditLogPage }>('/admin/audit-logs', { params }).then(r => r.data.data)

export interface SystemSetting {
  key: string; value: string; label: string; description?: string
  category: string; inputType: 'text' | 'textarea' | 'toggle' | 'number' | 'tags' | 'faq'
  isEnabled: boolean; updatedAt: string; updatedBy?: string
}
export const getSettings = () =>
  api.get<{ data: SystemSetting[] }>('/admin/settings').then(r => r.data.data)
export const updateSetting = (key: string, value: string) =>
  api.patch(`/admin/settings/${key}`, { value })
export const toggleSettingEnabled = (key: string, enabled: boolean) =>
  api.patch(`/admin/settings/${key}/enabled`, { enabled })
export const getPublicContactInfo = () =>
  api.get<{ data: Record<string, string> }>('/admin/settings/contact').then(r => r.data.data)
export const getPublicSettings = () =>
  api.get<{ data: Record<string, string> }>('/admin/settings/public').then(r => r.data.data)

// ── Users import/export ────────────────────────────────────────────────────

export const importUsersPreview = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ data: UserImportPreview }>('/admin/import/users/preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data)
}

export const importUsersConfirm = (rows: { email: string; fullName?: string; studentId?: string; major?: string }[]) =>
  api.post<{ data: { imported: number; skipped: number } }>('/admin/import/users/confirm', { rows })
    .then(r => r.data.data)

export const exportUsers = (format: 'xlsx' | 'csv', params?: Omit<UserListQuery, 'page' | 'pageSize'>) =>
  api.get('/admin/export/users', { params: { format, ...params }, responseType: 'blob' })

// ── Clubs export ───────────────────────────────────────────────────────────

export const exportClubs = (format: 'xlsx' | 'csv', params?: Omit<AdminClubListQuery, 'page' | 'pageSize'>) =>
  api.get('/admin/export/clubs', { params: { format, ...params }, responseType: 'blob' })

// ── Support (admin) ────────────────────────────────────────────────────────

export type SupportListQuery = {
  search?: string
  status?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface SupportTicketItem {
  id: number
  subject: string
  message: string
  status: string
  adminNote?: string
  createdAt: string
  resolvedAt?: string
  userId: string
  userFullName: string
  userEmail: string
}

export const getSupportTickets = (params?: SupportListQuery) =>
  api.get<{ data: PagedResult<SupportTicketItem> }>('/support', { params }).then(r => r.data.data)

export const updateSupportRequest = (id: number, status: string, adminNote?: string | null) =>
  api.patch(`/support/${id}`, { status, adminNote: adminNote ?? null })

// ── Admin-scoped departments ───────────────────────────────────────────────

export const createAdminDepartment = (clubId: number, dto: { name: string; description?: string }) =>
  api.post(`/admin/clubs/${clubId}/departments`, dto)

export const updateAdminDepartment = (clubId: number, deptId: number, dto: { name: string; description?: string }) =>
  api.put(`/admin/clubs/${clubId}/departments/${deptId}`, dto)

export const deleteAdminDepartment = (clubId: number, deptId: number) =>
  api.delete(`/admin/clubs/${clubId}/departments/${deptId}`)
