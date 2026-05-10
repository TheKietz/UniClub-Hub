import api from '@/lib/axiosInstance'
import type {
  ClubDetail, ClubListItem, ClubStats, MemberItem, DepartmentItem,
  ApplicationItem, AddMemberDto, UpdateMemberDto, ReviewApplicationDto,
  FormSchema, SubmitApplicationDto,
} from '@/components/membership/services/club.types'

const base = (clubId: number) => `/clubs/${clubId}`

// ── Clubs (public) ─────────────────────────────────────────────────────────

export const getClubs = (params?: { categoryId?: number; search?: string }) =>
  api.get<{ data: ClubListItem[] }>('/clubs', { params }).then(r => r.data.data)

export const getClubDetail = (clubId: number) =>
  api.get<{ data: ClubDetail }>(base(clubId)).then(r => r.data.data)

export const getClubStats = (clubId: number) =>
  api.get<{ data: ClubStats }>(`${base(clubId)}/stats`).then(r => r.data.data)

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

export const updateMember = (clubId: number, membershipId: number, dto: UpdateMemberDto) =>
  api.put<{ data: MemberItem }>(`${base(clubId)}/members/${membershipId}`, dto).then(r => r.data.data)

export const removeMember = (clubId: number, membershipId: number) =>
  api.delete(`${base(clubId)}/members/${membershipId}`)

// ── Applications ───────────────────────────────────────────────────────────

export const getApplications = (clubId: number, params?: { status?: string }) =>
  api.get<{ data: ApplicationItem[] }>(`${base(clubId)}/applications`, { params }).then(r => r.data.data)

export const reviewApplication = (clubId: number, applicationId: number, dto: ReviewApplicationDto) =>
  api.put(`${base(clubId)}/applications/${applicationId}/review`, dto)

// ── Departments ────────────────────────────────────────────────────────────

export const getDepartments = (clubId: number) =>
  api.get<{ data: DepartmentItem[] }>(`${base(clubId)}/departments`).then(r => r.data.data)
