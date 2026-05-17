import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, Users, Calendar, Award } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const e: { email?: string; password?: string } = {}
    if (!email.trim()) e.email = 'Vui lòng nhập email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email không đúng định dạng.'
    if (!password) e.password = 'Vui lòng nhập mật khẩu.'
    return e
  }

  function onBlur(field: 'email' | 'password') {
    const fieldErr = validate()[field]
    setErrs(prev => ({ ...prev, [field]: fieldErr ?? '' }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validate()
    if (Object.keys(fieldErrs).length > 0) { setErrs(fieldErrs); return }
    setLoading(true)
    try {
      const me = await login(email, password, rememberMe)
      navigate(me.roles.includes('SUPER_ADMIN') ? '/admin' : '/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async tokenResponse => {
      setLoading(true)
      try {
        const me = await googleLogin(tokenResponse.access_token)
        navigate(me.roles.includes('SUPER_ADMIN') ? '/admin' : '/dashboard', { replace: true })
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? 'Đăng nhập Google thất bại.')
      } finally {
        setLoading(false)
      }
    },
    onError: () => toast.error('Đăng nhập Google thất bại. Vui lòng thử lại.'),
  })

  return (
    // Lớp 1 — full-screen purple gradient background
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #6d28d9 100%)' }}
    >
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)' }} />
      </div>

      {/* Lớp 2 — floating card */}
      <div
        className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex"
        style={{ minHeight: '560px' }}
      >
        {/* Nửa trái — glass trên nền tím */}
        <div
          className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              U
            </div>
            <span className="text-white font-semibold">UniClub Hub</span>
          </div>

          {/* Content */}
          <div className="space-y-7">
            <div>
              <h2 className="text-3xl font-bold text-white leading-tight mb-3"
                style={{ letterSpacing: '-0.5px' }}>
                Quản lý câu lạc bộ <br />
                <span style={{ color: '#c4b5fd' }}>thông minh hơn</span>
              </h2>
              <p className="text-purple-200 text-sm leading-relaxed">
                Nền tảng quản lý toàn diện cho các câu lạc bộ sinh viên — từ nhân sự đến hoạt động.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Users, text: 'Quản lý thành viên & phân quyền vai trò' },
                { icon: Calendar, text: 'Theo dõi sự kiện và hoạt động nội bộ' },
                { icon: Award, text: 'Hệ thống KPI và đánh giá đóng góp' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <Icon size={14} className="text-purple-200" />
                  </div>
                  <span className="text-purple-100 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-purple-400 text-xs">© 2026 UniClub Hub</p>
        </div>

        {/* Nửa phải — form trắng */}
        <div className="flex-1 bg-white flex items-center justify-center p-10">
          <div className="w-full max-w-sm space-y-5">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-2">
              <div className="inline-flex w-10 h-10 rounded-xl items-center justify-center text-white font-bold mb-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>U</div>
              <p className="text-lg font-bold text-gray-900">UniClub Hub</p>
            </div>

            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px 0', color: '#0f172a' }}>
                Chào mừng trở lại
              </h1>
              <p className="text-sm text-gray-400">Đăng nhập để tiếp tục</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input id="email" type="email" value={email}
                    onChange={e => { setEmail(e.target.value); if (errs.email) setErrs(p => ({ ...p, email: '' })) }}
                    onBlur={() => onBlur('email')}
                    placeholder="example@student.edu.vn"
                    className={`pl-9${errs.email ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                    style={{ height: '42px' }} />
                </div>
                <p className="min-h-4 text-xs text-red-500">{errs.email}</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Mật khẩu</Label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); if (errs.password) setErrs(p => ({ ...p, password: '' })) }}
                    onBlur={() => onBlur('password')}
                    placeholder="••••••••"
                    className={`pl-9 pr-10${errs.password ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                    style={{ height: '42px' }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="min-h-4 text-xs text-red-500">{errs.password}</p>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                  <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
                </label>
                <Link to="/forgot-password" className="text-sm font-medium" style={{ color: '#4f46e5' }}>
                  Quên mật khẩu?
                </Link>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold text-sm"
                style={{
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(79,70,229,0.35)',
                }}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Đang đăng nhập...
                  </span>
                ) : 'Đăng nhập'}
              </Button>

              <div className="flex items-center gap-3">
                <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                <span className="text-xs text-gray-400 whitespace-nowrap">hoặc tiếp tục với</span>
                <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              </div>

              <button type="button" onClick={() => handleGoogleLogin()}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg font-medium text-sm transition-all hover:bg-gray-50 active:scale-95"
                style={{ border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
                </svg>
                Đăng nhập với Google
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-semibold" style={{ color: '#4f46e5' }}>Đăng ký ngay</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
