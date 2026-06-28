import api from '@/lib/axiosInstance'
import type {
  ClubDetail, ClubListItem, ClubStats, MonthlyGrowth, MemberItem, DepartmentItem,
  ApplicationItem, AddMemberDto, UpdateMemberDto, ReviewApplicationDto,
  FormSchema, SubmitApplicationDto,
  ResignationRequestItem, SubmitResignationDto, ReviewResignationDto,
  ClubAuditLogPage, MemberFieldDef, PipelineStage, RoleSuggestion,
  ClubPermissionItem, ClubPositionItem, CreateClubPositionDto, UpdateClubPositionDto, MemberPositionsItem,
  ClubEffectivePermissions,
  MemberImportPreview, CreateDepartmentDto, UpdateClubSettingsDto,
} from '@/components/membership/services/club.types'
import type { PagedResult } from '@/components/membership/services/admin.types'

const base = (clubId: number) => `/clubs/${clubId}`

export type MemberListQuery = {
  search?: string
  role?: string
  status?: string
  departmentId?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type ApplicationListQuery = {
  search?: string
  status?: string
  stageId?: number
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// ── Clubs (public) ─────────────────────────────────────────────────────────

export const getClubs = (params?: { categoryId?: number; search?: string }) =>
  api.get<{ data: ClubListItem[] }>('/clubs', { params }).then(r => r.data.data)

export const getClubDetail = (clubId: number) =>
  api.get<{ data: ClubDetail }>(base(clubId)).then(r => r.data.data)

export const getClubStats = (clubId: number) =>
  api.get<{ data: ClubStats }>(`${base(clubId)}/stats`).then(r => r.data.data)

export const getClubGrowth = (clubId: number, months = 12) =>
  api.get<{ data: MonthlyGrowth[] }>(`${base(clubId)}/stats/growth?months=${months}`).then(r => r.data.data)

// ── Form schema ────────────────────────────────────────────────────────────

export const getFormSchema = (clubId: number) =>
  api.get<{ data: FormSchema | null }>(`${base(clubId)}/form-schema`).then(r => r.data.data)

export const updateFormSchema = (clubId: number, schema: FormSchema) =>
  api.put(`${base(clubId)}/form-schema`, schema)

// ── Applications (member) ──────────────────────────────────────────────────

export const getMyApplications = (clubId: number) =>
  api.get<{ data: ApplicationItem[] }>(`${base(clubId)}/applications/mine`).then(r => r.data.data)

export const submitApplication = (clubId: number, dto: SubmitApplicationDto) =>
  api.post(`${base(clubId)}/applications`, dto)

// ── Members ────────────────────────────────────────────────────────────────

export const getClubMembers = (clubId: number, params?: { status?: string; role?: string; departmentId?: number }) =>
  api.get<{ data: MemberItem[] }>(`${base(clubId)}/members`, { params }).then(r => r.data.data)

export const getClubMembersPage = (clubId: number, params?: MemberListQuery) =>
  api.get<{ data: PagedResult<MemberItem> }>(`${base(clubId)}/members`, { params }).then(r => r.data.data)

export const addMember = (clubId: number, dto: AddMemberDto) =>
  api.post<{ data: MemberItem }>(`${base(clubId)}/members`, dto).then(r => r.data.data)

export const updateMember = (clubId: number, membershipId: number, dto: UpdateMemberDto, force = false) =>
  api.put<{ data: MemberItem }>(`${base(clubId)}/members/${membershipId}${force ? '?force=true' : ''}`, dto).then(r => r.data.data)

export const suggestMemberRole = (clubId: number, membershipId: number) =>
  api.post<{ data: RoleSuggestion }>(`${base(clubId)}/members/${membershipId}/role-suggestions`).then(r => r.data.data)

// ── Position & permission catalog ─────────────────────────────────────────

export const getClubPermissions = () =>
  api.get<{ data: ClubPermissionItem[] }>('/club-permissions').then(r => r.data.data)

export const getMyClubPermissions = (clubId: number) =>
  api.get<{ data: ClubEffectivePermissions }>(`${base(clubId)}/permissions/me`).then(r => r.data.data)

export const getClubPositions = (clubId: number, params?: { departmentId?: number }) =>
  api.get<{ data: ClubPositionItem[] }>(`${base(clubId)}/positions`, { params }).then(r => r.data.data)

export const createClubPosition = (clubId: number, dto: CreateClubPositionDto) =>
  api.post<{ data: ClubPositionItem }>(`${base(clubId)}/positions`, dto).then(r => r.data.data)

export const updateClubPosition = (clubId: number, positionId: number, dto: UpdateClubPositionDto) =>
  api.put<{ data: ClubPositionItem }>(`${base(clubId)}/positions/${positionId}`, dto).then(r => r.data.data)

export const deleteClubPosition = (clubId: number, positionId: number) =>
  api.delete(`${base(clubId)}/positions/${positionId}`)

export const updateClubPositionPermissions = (clubId: number, positionId: number, permissionCodes: string[]) =>
  api.put<{ data: ClubPositionItem }>(`${base(clubId)}/positions/${positionId}/permissions`, { permissionCodes }).then(r => r.data.data)

export const getMemberPositions = (clubId: number, membershipId: number) =>
  api.get<{ data: MemberPositionsItem }>(`${base(clubId)}/members/${membershipId}/positions`).then(r => r.data.data)

export const assignMemberPositions = (clubId: number, membershipId: number, positionIds: number[]) =>
  api.put<{ data: MemberPositionsItem }>(`${base(clubId)}/members/${membershipId}/positions`, { positionIds }).then(r => r.data.data)

export const removeMember = (clubId: number, membershipId: number, force = false) =>
  api.delete(`${base(clubId)}/members/${membershipId}${force ? '?force=true' : ''}`)

export const resignFromClub = (clubId: number) =>
  api.delete(`${base(clubId)}/members/me`)

// ── Applications ───────────────────────────────────────────────────────────

export const getApplications = (clubId: number, params?: { status?: string }) =>
  api.get<{ data: ApplicationItem[] }>(`${base(clubId)}/applications`, { params }).then(r => r.data.data)

export const getApplicationsPage = (clubId: number, params?: ApplicationListQuery) =>
  api.get<{ data: PagedResult<ApplicationItem> }>(`${base(clubId)}/applications`, { params }).then(r => r.data.data)

export const reviewApplication = (clubId: number, applicationId: number, dto: ReviewApplicationDto) =>
  api.put(`${base(clubId)}/applications/${applicationId}/review`, dto)

export const advanceApplicationStage = (clubId: number, appId: number, reviewNote?: string) =>
  api.post<{ data: ApplicationItem }>(`${base(clubId)}/applications/${appId}/advance`, { reviewNote })
    .then(r => r.data.data)

// ── Pipeline ───────────────────────────────────────────────────────────────

export const getPipelineStages = (clubId: number) =>
  api.get<{ data: PipelineStage[] }>(`${base(clubId)}/pipeline/stages`).then(r => r.data.data)

export const createPipelineStage = (clubId: number, data: { name: string; stageOrder: number }) =>
  api.post<{ data: PipelineStage }>(`${base(clubId)}/pipeline/stages`, data).then(r => r.data.data)

export const updatePipelineStage = (clubId: number, stageId: number, data: { name?: string; stageOrder?: number; isActive?: boolean }) =>
  api.put<{ data: PipelineStage }>(`${base(clubId)}/pipeline/stages/${stageId}`, data).then(r => r.data.data)

export const deletePipelineStage = (clubId: number, stageId: number) =>
  api.delete(`${base(clubId)}/pipeline/stages/${stageId}`)

export const reorderPipelineStages = (clubId: number, stageIds: number[]) =>
  api.put(`${base(clubId)}/pipeline/stages/reorder`, { stageIds })

// ── Departments ────────────────────────────────────────────────────────────

export const getDepartments = (clubId: number) =>
  api.get<{ data: DepartmentItem[] }>(`${base(clubId)}/departments`).then(r => r.data.data)

// ── Resignation requests ───────────────────────────────────────────────────

export const submitResignation = (clubId: number, dto: SubmitResignationDto) =>
  api.post<{ data: ResignationRequestItem }>(`${base(clubId)}/resignation-requests`, dto).then(r => r.data.data)

export const getClubResignations = (clubId: number, params?: ResignationListQuery) =>
  api.get<{ data: PagedResult<ResignationRequestItem> }>(`${base(clubId)}/resignation-requests`, { params }).then(r => r.data.data)

export const reviewClubResignation = (clubId: number, id: number, dto: ReviewResignationDto) =>
  api.patch<{ data: ResignationRequestItem }>(`${base(clubId)}/resignation-requests/${id}`, dto).then(r => r.data.data)

export const getAdminResignations = (params?: ResignationListQuery) =>
  api.get<{ data: PagedResult<ResignationRequestItem> }>('/admin/resignation-requests', { params }).then(r => r.data.data)

export const reviewAdminResignation = (id: number, dto: ReviewResignationDto) =>
  api.patch<{ data: ResignationRequestItem }>(`/admin/resignation-requests/${id}`, dto).then(r => r.data.data)

// ── User-level (dùng userId từ auth context) ──────────────────────────────

export const getUserApplications = (userId: string) =>
  api.get<{ data: ApplicationItem[] }>(`/users/${userId}/applications`).then(r => r.data.data)

export const getUserResignations = (userId: string) =>
  api.get<{ data: ResignationRequestItem[] }>(`/users/${userId}/resignations`).then(r => r.data.data)

// Public endpoint — không cần SUPER_ADMIN
export const getPublicCategories = () =>
  api.get<{ data: { id: number; name: string; description?: string }[] }>('/categories').then(r => r.data.data)

// ── Audit Log ───────────────────────────────────────────────────────────────
export type ResignationListQuery = {
  search?: string
  status?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const getClubAuditLogs = (clubId: number, params?: { module?: string; search?: string; action?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: 'asc' | 'desc'; page?: number; pageSize?: number }) =>
  api.get<{ data: ClubAuditLogPage }>(`${base(clubId)}/audit-logs`, { params }).then(r => r.data.data)

export const suggestClubMembers = (clubId: number, q: string) =>
  api.get<{ data: { userId: string; name: string; avatarUrl?: string }[] }>(`${base(clubId)}/members/suggest`, { params: { q } })
    .then(r => r.data.data.map(u => ({ id: u.userId, name: u.name, avatarUrl: u.avatarUrl })))

// ── Member custom fields ────────────────────────────────────────────────────
export const getMemberFieldSchema = (clubId: number) =>
  api.get<{ data: MemberFieldDef[] }>(`${base(clubId)}/members/field-schema`).then(r => r.data.data)

export const updateMemberFieldSchema = (clubId: number, fields: MemberFieldDef[]) =>
  api.put<{ data: MemberFieldDef[] }>(`${base(clubId)}/members/field-schema`, fields).then(r => r.data.data)

export const updateMemberCustomData = (clubId: number, membershipId: number, data: Record<string, string | null>) =>
  api.patch<{ data: MemberItem }>(`${base(clubId)}/members/${membershipId}/custom-data`, data).then(r => r.data.data)

// ── Members (mutations) ────────────────────────────────────────────────────

export const promoteMember = (clubId: number, membershipId: number) =>
  api.patch(`${base(clubId)}/members/${membershipId}/promote`)

export const importMembersPreview = (clubId: number, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ data: MemberImportPreview }>(`${base(clubId)}/members/import/preview`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data)
}

export const importMembersConfirm = (clubId: number, rows: { email: string; clubRole: string; departmentName?: string }[]) =>
  api.post<{ data: { imported: number; skipped: number } }>(`${base(clubId)}/members/import/confirm`, { rows })
    .then(r => r.data.data)

export const exportMembers = (clubId: number, format: 'xlsx' | 'csv', params?: Omit<MemberListQuery, 'page' | 'pageSize'>) =>
  api.get(`${base(clubId)}/members/export`, { params: { format, ...params }, responseType: 'blob' })

// ── Departments (mutations) ────────────────────────────────────────────────

export const createDepartment = (clubId: number, dto: CreateDepartmentDto) =>
  api.post(`${base(clubId)}/departments`, dto)

export const updateDepartment = (clubId: number, deptId: number, dto: CreateDepartmentDto) =>
  api.put(`${base(clubId)}/departments/${deptId}`, dto)

export const deleteDepartment = (clubId: number, deptId: number) =>
  api.delete(`${base(clubId)}/departments/${deptId}`)

export const setDepartmentLead = (clubId: number, deptId: number, membershipId: number | null) =>
  api.patch(`${base(clubId)}/departments/${deptId}/lead`, { membershipId })

// ── Applications (export) ──────────────────────────────────────────────────

export const exportApplications = (clubId: number, params: { format: string } & Omit<ApplicationListQuery, 'page' | 'pageSize'>) =>
  api.get(`${base(clubId)}/applications/export`, { params, responseType: 'blob' })

// ── Club settings ──────────────────────────────────────────────────────────

export const uploadClubLogo = (clubId: number, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ data: { logoUrl: string } }>(`${base(clubId)}/logo`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data)
}

export const updateClubSettings = (clubId: number, dto: UpdateClubSettingsDto) =>
  api.patch(`${base(clubId)}/settings`, dto)

// ── File uploads ───────────────────────────────────────────────────────────

export const uploadApplicationFile = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ data: { url: string } }>('/uploads/application-file', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data.url)
}
