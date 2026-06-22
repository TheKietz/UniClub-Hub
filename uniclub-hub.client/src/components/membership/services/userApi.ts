import api from '@/lib/axiosInstance'

export interface UpdateProfileDto {
  fullName?: string | null
  studentId?: string | null
  major?: string | null
  phone?: string | null
  gender?: string | null
  dateOfBirth?: string | null
}

export const updateUserAvatar = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.patch('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export const updateUserProfile = (dto: UpdateProfileDto) =>
  api.patch('/users/me', dto)

export interface SupportTicket {
  id: number
  subject: string
  message: string
  status: string
  adminNote?: string
  createdAt: string
  resolvedAt?: string
}

export const getSupportTickets = () =>
  api.get<{ data: SupportTicket[] }>('/support/me').then(r => r.data.data)

export const submitSupportRequest = (subject: string, message: string) =>
  api.post('/support', { subject, message })

export interface MembershipHistory {
  membershipId: number
  clubId: number
  clubName: string
  clubLogoUrl?: string
  clubRole: string
  departmentName?: string
  status: string
  joinedDate: string
  resignedDate?: string
}

export const getMemberHistory = () =>
  api.get<{ data: MembershipHistory[] }>('/users/me/history').then(r => r.data.data)
