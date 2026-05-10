import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white font-bold text-xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            U
          </div>
          <h1 className="text-2xl font-bold text-gray-900">UniClub Hub</h1>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Kiểm tra email của bạn</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Nếu địa chỉ <strong>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong <strong>1 giờ</strong>.
            </p>
            <p className="text-gray-400 text-xs">Không thấy email? Kiểm tra thư mục Spam.</p>
            <Link to="/login">
              <Button variant="outline" className="w-full mt-2">
                Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
              <p className="text-gray-500 text-sm mt-1">
                Nhập email tài khoản — chúng tôi sẽ gửi link đặt lại mật khẩu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-600">
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="example@student.edu.vn"
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
                {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
              </Button>
            </form>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} /> Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
