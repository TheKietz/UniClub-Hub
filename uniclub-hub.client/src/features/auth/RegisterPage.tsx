import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, User, Hash, Users, Calendar, Award } from 'lucide-react'
import MajorSelect from '@/components/shared/MajorSelect'
import { toast } from 'sonner'

type F = { fullName: string; email: string; studentId: string; major: string; password: string; confirmPassword: string }
type Errs = Partial<Record<keyof F, string>>

export default function RegisterPage() {
  const { register, googleLogin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<F>({ fullName: '', email: '', studentId: '', major: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errs, setErrs] = useState<Errs>({})
  const [loading, setLoading] = useState(false)

  function validate(v: F): Errs {
    const e: Errs = {}
    if (!v.fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên.'
    if (!v.email.trim()) e.email = 'Vui lòng nhập email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Email không đúng định dạng.'
    if (!v.studentId.trim()) e.studentId = 'Vui lòng nhập mã số sinh viên.'
    if (!v.major.trim()) e.major = 'Vui lòng nhập ngành học.'
    if (!v.password) e.password = 'Vui lòng nhập mật khẩu.'
    else if (v.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự.'
    if (!v.confirmPassword) e.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    else if (v.password !== v.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp.'
    return e
  }

  function onChange(field: keyof F) {
    return (e: { target: { value: string } }) => {
      const value = e.target.value
      setForm(prev => ({ ...prev, [field]: value }))
      if (errs[field]) setErrs(prev => ({ ...prev, [field]: '' }))
    }
  }

  function onBlur(field: keyof F) {
    const fieldErr = validate(form)[field]
    setErrs(prev => ({ ...prev, [field]: fieldErr ?? '' }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validate(form)
    if (Object.keys(fieldErrs).length > 0) {
      setErrs(fieldErrs)
      return
    }
    setLoading(true)
    try {
      await register({ email: form.email, password: form.password, fullName: form.fullName, studentId: form.studentId, major: form.major })
      navigate('/login', { state: { registered: true } })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async tokenResponse => {
      setLoading(true)
      try {
        await googleLogin(tokenResponse.access_token)
        navigate(isSuperAdmin ? '/admin' : '/dashboard', { replace: true })
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? 'Đăng ký Google thất bại.')
      } finally {
        setLoading(false)
      }
    },
    onError: () => toast.error('Đăng ký Google thất bại. Vui lòng thử lại.'),
  })

  function inputCls(field: keyof F, extra = '') {
    return `${extra}${errs[field] ? ' border-red-400 focus-visible:ring-red-300' : ''}`
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
        <div className="w-full max-w-md space-y-6">
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

          <div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.6px', margin: '0 0 8px 0', color: '#0f172a', lineHeight: 1.2 }}>
              Tạo tài khoản
            </h1>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {/* Họ và tên */}
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Họ và tên <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={onChange('fullName')}
                  onBlur={() => onBlur('fullName')}
                  placeholder="Nguyễn Văn A"
                  className={inputCls('fullName', 'pl-9')}
                  style={{ height: '42px' }}
                />
              </div>
              <p className="min-h-4 text-xs text-red-500">{errs.fullName}</p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={onChange('email')}
                  onBlur={() => onBlur('email')}
                  placeholder="example@student.edu.vn"
                  className={inputCls('email', 'pl-9')}
                  style={{ height: '42px' }}
                />
              </div>
              <p className="min-h-4 text-xs text-red-500">{errs.email}</p>
            </div>

            {/* MSSV + Ngành — 2 cột */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="studentId" className="text-sm font-medium text-gray-700">
                  Mã số SV <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="studentId"
                    type="text"
                    value={form.studentId}
                    onChange={onChange('studentId')}
                    onBlur={() => onBlur('studentId')}
                    placeholder="2151234567"
                    className={inputCls('studentId', 'pl-9')}
                    style={{ height: '42px' }}
                  />
                </div>
                <p className="min-h-4 text-xs text-red-500">{errs.studentId}</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="major" className="text-sm font-medium text-gray-700">
                  Ngành <span className="text-red-500">*</span>
                </Label>
                <MajorSelect
                  id="major"
                  value={form.major}
                  onChange={val => { setForm(p => ({ ...p, major: val })); if (errs.major) setErrs(p => ({ ...p, major: '' })) }}
                  onBlur={() => onBlur('major')}
                  error={!!errs.major}
                />
                <p className="min-h-4 text-xs text-red-500">{errs.major}</p>
              </div>
            </div>

            {/* 2 password fields side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={onChange('password')}
                    onBlur={() => onBlur('password')}
                    placeholder="Tối thiểu 6 ký tự"
                    className={inputCls('password', 'pl-9 pr-10')}
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
                <p className="min-h-4 text-xs text-red-500">{errs.password}</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={onChange('confirmPassword')}
                    onBlur={() => onBlur('confirmPassword')}
                    placeholder="Nhập lại mật khẩu"
                    className={inputCls('confirmPassword', 'pl-9 pr-10')}
                    style={{ height: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="min-h-4 text-xs text-red-500">{errs.confirmPassword}</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold text-sm transition-all duration-200"
              style={{
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
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
              onClick={() => handleGoogleRegister()}
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

          <p className="text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold transition-colors" style={{ color: '#4f46e5' }}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
