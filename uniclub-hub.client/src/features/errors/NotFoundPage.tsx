import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  const dashboardHref = isSuperAdmin ? '/admin' : '/dashboard'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* 404 number */}
        <div
          className="text-[8rem] font-extrabold leading-none mb-4 select-none"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Trang không tồn tại</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị xóa.
          Vui lòng kiểm tra lại URL hoặc quay về trang trước.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={15} /> Quay lại
          </button>
          <Link
            to={isAuthenticated ? dashboardHref : '/'}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Home size={15} /> {isAuthenticated ? 'Về dashboard' : 'Về trang chủ'}
          </Link>
        </div>
      </div>
    </div>
  )
}
