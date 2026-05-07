import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, User, Hash, Users, Calendar, Award } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '', studentId: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: { target: { value: string } }) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.')
      return
    }
    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        studentId: form.studentId,
      })
      navigate('/login', { state: { registered: true } })
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleRegister() {
    toast.info('Tính năng đăng ký bằng Google đang được phát triển.')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #312e81 65%, #4c1d95 100%)',
        }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }}
          />
          <div
            className="absolute bottom-20 -left-10 w-72 h-72 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }}
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
              Tham gia cùng <br />
              <span style={{ color: '#c4b5fd' }}>cộng đồng CLB</span>
            </h2>
            <p className="text-purple-200 text-base leading-relaxed max-w-xs">
              Tạo tài khoản và kết nối với các câu lạc bộ sinh viên. Khám phá, tham gia và đóng góp cho cộng đồng.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Users, text: 'Tham gia nhiều câu lạc bộ cùng lúc' },
              { icon: Calendar, text: 'Nhận thông báo sự kiện & nhiệm vụ' },
              { icon: Award, text: 'Theo dõi điểm đóng góp cá nhân' },
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
              Tạo tài khoản
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Điền thông tin để đăng ký tham gia hệ thống</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Họ và tên <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={set('fullName')}
                  required
                  placeholder="Nguyễn Văn A"
                  className="pl-9"
                  style={{ height: '42px' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  placeholder="example@student.edu.vn"
                  className="pl-9"
                  style={{ height: '42px' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium text-gray-700">
                Mã số sinh viên <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="studentId"
                  type="text"
                  value={form.studentId}
                  onChange={set('studentId')}
                  required
                  placeholder="2151234567"
                  className="pl-9"
                  style={{ height: '42px' }}
                />
              </div>
            </div>

            {/* 2 password fields side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    required
                    placeholder="Tối thiểu 6 ký tự"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    required
                    placeholder="Nhập lại mật khẩu"
                    className="pl-9"
                    style={{
                      height: '42px',
                      borderColor: form.confirmPassword && form.password !== form.confirmPassword ? '#f87171' : '',
                    }}
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>Không khớp</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold text-sm mt-2 transition-all duration-200"
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
                  Đang đăng ký...
                </span>
              ) : (
                'Tạo tài khoản'
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
              onClick={handleGoogleRegister}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-lg font-medium text-sm transition-all duration-150 hover:bg-gray-50 active:scale-95"
              style={{ border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
              </svg>
              Đăng ký với Google
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="font-semibold transition-colors"
              style={{ color: '#4f46e5' }}
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
