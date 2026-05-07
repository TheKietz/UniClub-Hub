import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, Users, Calendar, Award } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password, rememberMe)
      navigate(isSuperAdmin ? '/admin' : '/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    toast.info('Tính năng đăng nhập Google đang được phát triển.')
  }

  function handleForgotPassword() {
    toast.info('Tính năng quên mật khẩu đang được phát triển.')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #6d28d9 100%)',
        }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)' }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              U
            </div>
            <span className="text-white font-semibold text-lg">UniClub Hub</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2
              className="text-4xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.5px' }}
            >
              Quản lý câu lạc bộ <br />
              <span style={{ color: '#c4b5fd' }}>thông minh hơn</span>
            </h2>
            <p className="text-purple-200 text-base leading-relaxed max-w-xs">
              Nền tảng quản lý toàn diện cho các câu lạc bộ sinh viên — từ nhân sự đến hoạt động, tất cả trong một hệ thống.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: Users, text: 'Quản lý thành viên & phân quyền theo vai trò' },
              { icon: Calendar, text: 'Theo dõi sự kiện và hoạt động nội bộ' },
              { icon: Award, text: 'Hệ thống KPI và đánh giá đóng góp' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <Icon size={15} className="text-purple-200" />
                </div>
                <span className="text-purple-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-purple-300 text-xs">
            © 2026 UniClub Hub · Hệ thống quản lý câu lạc bộ sinh viên
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div
              className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white font-bold text-xl mb-3"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              U
            </div>
            <h1 className="text-2xl font-bold text-gray-900">UniClub Hub</h1>
          </div>

          {/* Heading */}
          <div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.6px', margin: '0 0 8px 0', color: '#0f172a', lineHeight: 1.2 }}>
              Chào mừng trở lại
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Đăng nhập để tiếp tục vào hệ thống</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
              >
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mật khẩu
                </Label>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  style={{ height: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span style={{ fontSize: '0.85rem', color: '#374151' }}>Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 500, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Quên mật khẩu?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold text-sm transition-all duration-200"
              style={{
                background: loading
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(79, 70, 229, 0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>hoặc tiếp tục với</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-lg font-medium text-sm transition-all duration-150 hover:bg-gray-50 active:scale-95"
              style={{ border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
              </svg>
              Đăng nhập với Google
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="font-semibold transition-colors"
              style={{ color: '#4f46e5' }}
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
