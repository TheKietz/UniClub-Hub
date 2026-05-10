export interface SystemStats {
  totalUsers: number
  totalClubs: number
  activeClubs: number
  totalActiveMembers: number
  applications: {
    pending: number
    interview: number
    accepted: number
    rejected: number
    total: number
  }
  clubsByCategory: { categoryId: number; categoryName: string; clubCount: number }[]
  topClubsByMembers: { clubId: number; clubName: string; memberCount: number }[]
}

export interface UserItem {
  id: string
  email: string
  fullName?: string
  studentId?: string
  major?: string
  avatarUrl?: string
  isLocked: boolean
  roles: string[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ClubItem {
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
  isDeleted: boolean
}

export interface CategoryItem {
  id: number
  name: string
  description?: string
  clubCount: number
}

export interface CreateClubDto {
  name: string
  code: string
  description?: string
  categoryId?: number
  advisorName?: string
  contactInfo?: string
  establishedDate?: string
}

export interface UpdateClubDto extends CreateClubDto {
  status?: string
}

export interface CreateCategoryDto {
  name: string
  description?: string
}
