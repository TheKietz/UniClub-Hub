import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '@/lib/axiosInstance'

type Status = 'loading' | 'success' | 'already' | 'error'

export default function ConfirmEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!email || !token) {
      setStatus('error')
      setMessage('Liên kết xác thực không hợp lệ.')
      return
    }

    api.get(`/auth/confirm-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then(res => {
        const msg: string = res.data.message ?? ''
        setStatus(msg.includes('trước đó') ? 'already' : 'success')
        setMessage(msg)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.message ?? 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.')
      })
  }, [email, token])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #6d28d9 100%)' }}
    >
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>U</div>
          <span className="font-semibold text-gray-900">UniClub Hub</span>
        </div>

        {status === 'loading' && (
          <div className="py-6 space-y-4">
            <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto" />
            <p className="text-gray-600">Đang xác thực email của bạn...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Xác thực thành công!</h1>
              <p className="text-gray-500 text-sm mt-2">
                Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              Đăng nhập
            </Link>
          </div>
        )}

        {status === 'already' && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Email đã xác thực</h1>
              <p className="text-gray-500 text-sm mt-2">
                Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập bình thường.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              Đăng nhập
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <XCircle size={36} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Xác thực thất bại</h1>
              <p className="text-gray-500 text-sm mt-2">{message}</p>
            </div>
            <p className="text-sm text-gray-500">
              Link đã hết hạn?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
                Đăng nhập để gửi lại email xác thực
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
