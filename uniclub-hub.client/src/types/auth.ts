export interface UserMembership {
  clubId: number
  clubName: string
  departmentId?: number
  departmentName?: string
  clubRole: string
  joinedDate: string
  status: string
}

export interface UserInfo {
  id: string
  email: string
  fullName: string | null
  studentId: string | null
  major: string | null
  avatarUrl: string | null
  phone: string | null
  gender: string | null
  dateOfBirth: string | null
  roles: string[]
  memberships: UserMembership[]
}

// System-level roles (ASP.NET Identity)
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  USER: 'USER',
} as const

// Club-level roles (ClubMembership.ClubRole)
export const CLUB_ROLES = {
  CLUB_ADMIN: 'CLUB_ADMIN',
  DEPT_LEAD: 'DEPT_LEAD',
  MEMBER: 'MEMBER',
} as const

export type ClubRole = typeof CLUB_ROLES[keyof typeof CLUB_ROLES]
