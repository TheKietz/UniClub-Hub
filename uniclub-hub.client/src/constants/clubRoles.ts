import { CLUB_ROLES } from '@/types/auth'

export const CLUB_ROLE_LABELS: Record<string, string> = {
  [CLUB_ROLES.CLUB_ADMIN]: 'Trưởng CLB',
  [CLUB_ROLES.DEPT_LEAD]: 'Trưởng ban',
  [CLUB_ROLES.MEMBER]: 'Thành viên',
}

export const CLUB_ROLE_COLORS: Record<string, string> = {
  [CLUB_ROLES.CLUB_ADMIN]: '#e11d48',
  [CLUB_ROLES.DEPT_LEAD]: '#f59e0b',
  [CLUB_ROLES.MEMBER]: '#14b8a6',
}

const ROLE_RANK: Record<string, number> = {
  [CLUB_ROLES.CLUB_ADMIN]: 3,
  [CLUB_ROLES.DEPT_LEAD]: 2,
  [CLUB_ROLES.MEMBER]: 1,
}

export function clubRoleLabel(role: string) {
  return CLUB_ROLE_LABELS[role] ?? role
}

export function isLeaderRole(role: string) {
  return role === CLUB_ROLES.CLUB_ADMIN || role === CLUB_ROLES.DEPT_LEAD
}

export function roleRank(role: string) {
  return ROLE_RANK[role] ?? 0
}
