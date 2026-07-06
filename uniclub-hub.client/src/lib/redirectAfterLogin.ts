import type { UserInfo } from '@/types/auth'

export function redirectAfterLogin(me: UserInfo): string {
  if (!me.roles.includes('SUPER_ADMIN') && !me.studentId) {
    return '/complete-profile'
  }

  if (me.roles.includes('SUPER_ADMIN')) return '/admin'

  const active = me.memberships.filter(m => m.status === 'Active')
  const hasManageRole = active.some(m => m.clubRole === 'CLUB_ADMIN' || m.clubRole === 'DEPT_LEAD')
  if (hasManageRole || active.length > 0) return '/dashboard'

  return '/clubs'
}
