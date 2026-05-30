import api from '@/lib/axiosInstance'
import type {
  ClubDetail, ClubListItem, ClubStats, MonthlyGrowth, MemberItem, DepartmentItem,
  ApplicationItem, AddMemberDto, UpdateMemberDto, ReviewApplicationDto,
  FormSchema, SubmitApplicationDto,
  ResignationRequestItem, SubmitResignationDto, ReviewResignationDto,
} from '@/components/membership/services/club.types'
import type { LayoutSettings } from '@/components/portal/services/portal.types'

export interface LandingPageSettings {
  heroImage?: string
  introduction?: string
  mission?: string
  vision?: string
  socialLinks?: Record<string, string>
  layoutSettings?: LayoutSettings
}

const base = (clubId: number) => `/clubs/${clubId}`

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

export const getClubMembers = (clubId: number, params?: { status?: string; role?: string }) =>
  api.get<{ data: MemberItem[] }>(`${base(clubId)}/members`, { params }).then(r => r.data.data)

export const addMember = (clubId: number, dto: AddMemberDto) =>
  api.post<{ data: MemberItem }>(`${base(clubId)}/members`, dto).then(r => r.data.data)

export const updateMember = (clubId: number, membershipId: number, dto: UpdateMemberDto, force = false) =>
  api.put<{ data: MemberItem }>(`${base(clubId)}/members/${membershipId}${force ? '?force=true' : ''}`, dto).then(r => r.data.data)

export const removeMember = (clubId: number, membershipId: number, force = false) =>
  api.delete(`${base(clubId)}/members/${membershipId}${force ? '?force=true' : ''}`)

export const resignFromClub = (clubId: number) =>
  api.delete(`${base(clubId)}/members/me`)

// ── Applications ───────────────────────────────────────────────────────────

export const getApplications = (clubId: number, params?: { status?: string }) =>
  api.get<{ data: ApplicationItem[] }>(`${base(clubId)}/applications`, { params }).then(r => r.data.data)

export const reviewApplication = (clubId: number, applicationId: number, dto: ReviewApplicationDto) =>
  api.put(`${base(clubId)}/applications/${applicationId}/review`, dto)

// ── Departments ────────────────────────────────────────────────────────────

export const getDepartments = (clubId: number) =>
  api.get<{ data: DepartmentItem[] }>(`${base(clubId)}/departments`).then(r => r.data.data)

// ── Resignation requests ───────────────────────────────────────────────────

export const submitResignation = (clubId: number, dto: SubmitResignationDto) =>
  api.post<{ data: ResignationRequestItem }>(`${base(clubId)}/resignation-requests`, dto).then(r => r.data.data)

export const getClubResignations = (clubId: number) =>
  api.get<{ data: ResignationRequestItem[] }>(`${base(clubId)}/resignation-requests`).then(r => r.data.data)

export const reviewClubResignation = (clubId: number, id: number, dto: ReviewResignationDto) =>
  api.patch<{ data: ResignationRequestItem }>(`${base(clubId)}/resignation-requests/${id}`, dto).then(r => r.data.data)

export const getAdminResignations = () =>
  api.get<{ data: ResignationRequestItem[] }>('/admin/resignation-requests').then(r => r.data.data)

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

// ── Landing Page ──────────────────────────────────────────────────────────

export const getLandingPageSettings = (clubId: number) =>
  api.get<{ data: LandingPageSettings }>(`${base(clubId)}/landing-page`).then(r => r.data.data)

export const upsertLandingPageSettings = (
  clubId: number,
  data: Omit<LandingPageSettings, 'heroImage'>,
) => api.put<{ data: LandingPageSettings }>(`${base(clubId)}/landing-page`, data).then(r => r.data.data)

export const uploadHeroImage = async (clubId: number, file: File): Promise<string> => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post<{ data: { heroImage: string } }>(
    `${base(clubId)}/landing-page/hero`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data.heroImage
}
