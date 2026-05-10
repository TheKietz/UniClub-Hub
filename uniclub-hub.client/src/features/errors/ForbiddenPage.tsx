import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldOff, ArrowLeft } from 'lucide-react'

export default function ForbiddenPage() {
  const { isSuperAdmin } = useAuth()
  const dashboardHref = isSuperAdmin ? '/admin' : '/dashboard'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div
          className="inline-flex w-24 h-24 rounded-3xl items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg, #fef2f2, #fce7f3)' }}
        >
          <ShieldOff size={40} className="text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Bạn không có thẩm quyền để xem trang này.
          Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={15} /> Quay lại
          </button>
          <Link
            to={dashboardHref}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            Về dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
