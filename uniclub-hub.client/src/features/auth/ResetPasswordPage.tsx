import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') ?? ''
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!email || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-red-500 font-medium">Link không hợp lệ hoặc đã hết hạn.</p>
          <Link to="/forgot-password">
            <Button variant="outline" className="w-full">Yêu cầu link mới</Button>
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, token, newPassword: password })
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Đặt lại mật khẩu thất bại. Link có thể đã hết hạn.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white font-bold text-xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            U
          </div>
          <h1 className="text-2xl font-bold text-gray-900">UniClub Hub</h1>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Đặt lại mật khẩu thành công!</h2>
            <p className="text-gray-500 text-sm">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
            <Button
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none' }}
              onClick={() => navigate('/login')}
            >
              Đăng nhập ngay
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
              <p className="text-gray-500 text-sm mt-1">Tạo mật khẩu mới cho tài khoản <strong>{email}</strong></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-600">
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu mới</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    className="pl-9 pr-10"
                    style={{ height: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu"
                    className="pl-9"
                    style={{ height: '42px' }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-semibold"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none' }}
              >
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
