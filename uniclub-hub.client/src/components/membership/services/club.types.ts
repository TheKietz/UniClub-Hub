export interface ClubDetail {
  id: number
  name: string
  code: string
  status: string
  description?: string
  logoUrl?: string
  contactInfo?: string
  establishedDate?: string
  advisorName?: string
  categoryId?: number
  categoryName?: string
  memberCount: number
  createdAt: string
}

export interface ClubStats {
  clubId: number
  clubName: string
  totalActiveMembers: number
  totalDepartments: number
  membersByRole: Record<string, number>
  membersByDepartment: { departmentId?: number; departmentName: string; memberCount: number }[]
  applications: { pending: number; interview: number; accepted: number; rejected: number; total: number }
}

export interface MemberItem {
  id: number
  userId: string
  fullName?: string
  email: string
  studentId?: string
  avatarUrl?: string
  clubRole: string
  departmentId?: number
  departmentName?: string
  joinedDate: string
  status: string
}

export interface DepartmentItem {
  id: number
  clubId: number
  name: string
  description?: string
  memberCount: number
  deptLeadMembershipId?: number
  deptLeadName?: string
}

export interface ApplicationItem {
  id: number
  clubId: number
  clubName: string
  status: string
  appliedAt: string
  // Admin view extras
  userId?: string
  fullName?: string
  email?: string
  studentId?: string
  answers?: string
}

export interface AddMemberDto {
  userId: string
  clubRole?: string
  departmentId?: number
}

export interface UpdateMemberDto {
  clubRole: string
  departmentId?: number
}

export interface ReviewApplicationDto {
  status: string // Accepted | Rejected | Interview
}

// Form schema cho đơn đăng ký
export type FormFieldType = 'text' | 'textarea' | 'select'

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[] // chỉ dùng khi type = 'select'
}

export interface FormSchema {
  fields: FormField[]
}

export interface SubmitApplicationDto {
  answers: Record<string, string> // fieldId → answer
}

// Public club list item (GET /api/clubs)
export interface ClubListItem {
  id: number
  name: string
  code: string
  status: string
  description?: string
  logoUrl?: string
  categoryName?: string
  memberCount: number
}
