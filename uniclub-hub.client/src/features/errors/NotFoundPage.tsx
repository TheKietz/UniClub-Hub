import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorPageLayout } from './ErrorPageLayout'
import { errorBtnPrimary, errorBtnSecondary } from './errorButtonStyles'

export default function NotFoundPage() {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  const dashboardHref = isSuperAdmin ? '/admin' : '/dashboard'

  return (
    <ErrorPageLayout
      variant="notFound"
      code="404"
      badge="Trang không tồn tại"
      title="Đường dẫn không hợp lệ"
      description="Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa. Kiểm tra lại URL hoặc quay về trang trước."
      actions={
        <>
          <button type="button" onClick={() => window.history.back()} style={errorBtnSecondary}>
            ← Quay lại
          </button>
          <Link to={isAuthenticated ? dashboardHref : '/'} style={errorBtnPrimary}>
            <Compass size={15} />
            {isAuthenticated ? 'Về dashboard' : 'Về trang chủ'}
          </Link>
        </>
      }
    />
  )
}
