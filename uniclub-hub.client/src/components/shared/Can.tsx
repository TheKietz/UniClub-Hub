import type { ReactNode } from 'react'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { D } from '@/components/shared/managementTheme'

type Props = {
  clubId?: number | string | null
  perm?: string
  any?: string[]
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ clubId, perm, any, fallback = null, children }: Props) {
  const { loading, can, canAny } = useClubPermissions(clubId)
  if (loading) return null
  if (perm && can(perm)) return <>{children}</>
  if (any && canAny(...any)) return <>{children}</>
  return <>{fallback}</>
}

export function PermissionDenied() {
  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ background: D.card, border: D.border, boxShadow: D.shadow(), borderRadius: D.radius, padding: 28 }}>
        <p style={{ margin: 0, color: D.ink, fontSize: 20, fontWeight: 900 }}>Bạn không có quyền truy cập mục này.</p>
      </div>
    </div>
  )
}
