import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorPageLayout } from './ErrorPageLayout'
import { errorBtnPrimary, errorBtnSecondary } from './errorButtonStyles'

export default function ForbiddenPage() {
  const { isSuperAdmin } = useAuth()
  const dashboardHref = isSuperAdmin ? '/admin' : '/dashboard'

  return (
    <ErrorPageLayout
      variant="forbidden"
      code="403"
      badge="Không có quyền truy cập"
      title="Bạn không có thẩm quyền"
      description="Trang này chỉ dành cho người có vai trò phù hợp. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn."
      actions={
        <>
          <button type="button" onClick={() => window.history.back()} style={errorBtnSecondary}>
            ← Quay lại
          </button>
          <Link to={dashboardHref} style={errorBtnPrimary}>
            <LayoutDashboard size={15} />
            Về dashboard
          </Link>
        </>
      }
    />
  )
}
