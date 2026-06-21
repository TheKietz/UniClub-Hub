import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { Eye, EyeOff, MailCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { C } from '@/components/public/publicComponents'
import MajorSelect from '@/components/shared/MajorSelect'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'
import type { UserInfo } from '@/types/auth'
import AuthShell from './AuthShell'
import { getApiErrorMessage } from '@/lib/apiError'

function redirectAfterLogin(me: UserInfo): string {
  if (me.roles.includes('SUPER_ADMIN')) return '/admin'
  const active = me.memberships.filter(m => m.status === 'Active')
  const hasManageRole = active.some(m => m.clubRole === 'CLUB_ADMIN' || m.clubRole === 'DEPT_LEAD')
  if (hasManageRole || active.length > 0) return '/dashboard'
  return '/clubs'
}

type F = {
  fullName: string
  email: string
  studentId: string
  major: string
  password: string
  confirmPassword: string
}
type Errs = Partial<Record<keyof F, string>>

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 14,
  border: '1.5px solid #e4dfd4',
  background: C.bg,
  padding: '0 16px',
  fontSize: 14,
  color: C.ink,
  outline: 'none',
  fontWeight: 600,
  boxSizing: 'border-box',
  fontFamily: "'Be Vietnam Pro', sans-serif",
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 800,
  color: C.inkDim,
  marginBottom: 8,
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
    </svg>
  )
}

export default function RegisterPage() {
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [form, setForm] = useState<F>({
    fullName: '',
    email: '',
    studentId: '',
    major: '',
    password: '',
    confirmPassword: '',
  })
  const [errs, setErrs] = useState<Errs>({})
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function validateStep1(v: F): Errs {
    const e: Errs = {}
    if (!v.email.trim()) e.email = 'Vui lòng nhập email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Email không đúng định dạng.'
    if (!v.password) e.password = 'Vui lòng nhập mật khẩu.'
    else if (v.password.length < 6) e.password = 'Tối thiểu 6 ký tự.'
    if (!v.confirmPassword) e.confirmPassword = 'Vui lòng xác nhận.'
    else if (v.password !== v.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp.'
    return e
  }

  function validateStep2(v: F): Errs {
    const e: Errs = {}
    if (!v.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên.'
    if (!v.studentId.trim()) e.studentId = 'Vui lòng nhập MSSV.'
    if (!v.major.trim()) e.major = 'Vui lòng chọn ngành học.'
    return e
  }

  function onChange(field: keyof F) {
    return (e: { target: { value: string } }) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      if (errs[field]) setErrs(prev => ({ ...prev, [field]: '' }))
    }
  }

  function handleNext(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validateStep1(form)
    if (Object.keys(fieldErrs).length > 0) {
      setErrs(fieldErrs)
      return
    }
    setErrs({})
    setStep(2)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validateStep2(form)
    if (Object.keys(fieldErrs).length > 0) {
      setErrs(fieldErrs)
      return
    }
    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        studentId: form.studentId,
        major: form.major,
      })
      setRegisteredEmail(form.email)
      setStep(3)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Đăng ký thất bại. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendLoading(true)
    try {
      await api.post('/auth/resend-confirmation', { email: registeredEmail })
      toast.success('Email xác thực đã được gửi lại.')
    } catch {
      toast.error('Gửi lại thất bại. Vui lòng thử lại sau.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleRegister = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async tokenResponse => {
      setLoading(true)
      try {
        const me = await googleLogin(tokenResponse.access_token)
        navigate(redirectAfterLogin(me), { replace: true })
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Đăng ký Google thất bại.'))
      } finally {
        setLoading(false)
      }
    },
    onError: () => toast.error('Đăng ký Google thất bại. Vui lòng thử lại.'),
  })

  return (
    <AuthShell
      eyebrow="Tham gia UniClub"
      title="Bắt đầu hành trình"
      accent="cùng CLB UEF"
      description="Tạo tài khoản để đăng ký CLB, nhận thông báo tuyển thành viên và tham gia các hoạt động sinh viên."
    >
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: '-.04em' }}>
        {step === 3 ? 'Xác thực email' : 'Đăng ký'}
      </h1>
      <p style={{ margin: '8px 0 24px', fontSize: 15, color: C.inkDim, fontWeight: 600 }}>
        {step === 3 ? 'Hoàn tất bước xác thực để sử dụng tài khoản' : 'Tạo tài khoản sinh viên UniClub'}
      </p>

      {step === 3 ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: '#ede9fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            color: C.violet,
          }}>
            <MailCheck size={34} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 8px' }}>
            Kiểm tra email
          </h2>
          <p style={{ fontSize: 14, color: C.inkDim, lineHeight: 1.6, margin: '0 0 18px', fontWeight: 600 }}>
            Link xác thực đã được gửi đến <strong style={{ color: C.ink }}>{registeredEmail}</strong>.
          </p>
          <div style={{
            background: '#fef3c7',
            border: '1.5px solid #fde68a',
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 16,
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 13, color: '#92400e', margin: 0, fontWeight: 700 }}>
              Không thấy email? Kiểm tra thư mục Spam hoặc gửi lại email xác thực.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 14,
              border: '1.5px solid #e4dfd4',
              background: C.card,
              color: C.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 800,
              cursor: resendLoading ? 'wait' : 'pointer',
              marginBottom: 12,
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={16} style={{ animation: resendLoading ? 'spin 1s linear infinite' : 'none' }} />
            {resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
          </button>
          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: 50,
              borderRadius: 14,
              background: `linear-gradient(90deg, ${C.coral}, #f43f5e)`,
              color: C.bg,
              fontSize: 15,
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Về trang đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, minWidth: 0 }}>
            {[1, 2].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: step >= item ? C.ink : '#f0eee8',
                  color: step >= item ? C.lemon : C.inkMuted,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                }}>
                  {item}
                </span>
                <span style={{ color: step === item ? C.ink : C.inkMuted, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {item === 1 ? 'Tài khoản' : 'Hồ sơ'}
                </span>
                {item === 1 && <span style={{ width: 28, height: 1, background: '#e6e0d6' }} />}
              </div>
            ))}
            <span style={{ marginLeft: 'auto', color: C.inkMuted, fontSize: 12, fontWeight: 800 }}>
              Bước {step}/2
            </span>
          </div>

          {step === 1 && (
            <>
              <button
                type="button"
                onClick={() => handleGoogleRegister()}
                disabled={loading}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  border: '1.5px solid #e4dfd4',
                  background: C.card,
                  color: C.inkDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <GoogleIcon />
                Tiếp tục bằng Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 18px' }}>
                <div style={{ flex: 1, height: 1, background: '#e6e0d6' }} />
                <span style={{ color: C.inkMuted, fontSize: 13, fontWeight: 700 }}>Hoặc đăng ký với email</span>
                <div style={{ flex: 1, height: 1, background: '#e6e0d6' }} />
              </div>

              <form onSubmit={handleNext} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={onChange('email')}
                    placeholder="example@email.com"
                    style={{ ...inputStyle, borderColor: errs.email ? '#ef4444' : '#e4dfd4' }}
                  />
                  {errs.email && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.email}</p>}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                  marginBottom: 22,
                }}>
                  <div>
                    <label style={labelStyle}>Mật khẩu</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={onChange('password')}
                        placeholder="Tối thiểu 6 ký tự"
                        style={{ ...inputStyle, paddingRight: 42, borderColor: errs.password ? '#ef4444' : '#e4dfd4' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: C.inkMuted,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {errs.password && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.password}</p>}
                  </div>

                  <div>
                    <label style={labelStyle}>Xác nhận</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={onChange('confirmPassword')}
                        placeholder="Nhập lại"
                        style={{ ...inputStyle, paddingRight: 42, borderColor: errs.confirmPassword ? '#ef4444' : '#e4dfd4' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: C.inkMuted,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                      >
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {errs.confirmPassword && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.confirmPassword}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    height: 50,
                    border: 'none',
                    borderRadius: 14,
                    background: `linear-gradient(90deg, ${C.coral}, #f43f5e)`,
                    color: C.bg,
                    fontSize: 15,
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Tiếp theo
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Họ và tên</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={onChange('fullName')}
                  placeholder="Nguyễn Văn A"
                  style={{ ...inputStyle, borderColor: errs.fullName ? '#ef4444' : '#e4dfd4' }}
                />
                {errs.fullName && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.fullName}</p>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>MSSV</label>
                <input
                  type="text"
                  value={form.studentId}
                  onChange={onChange('studentId')}
                  placeholder="2151234567"
                  style={{ ...inputStyle, borderColor: errs.studentId ? '#ef4444' : '#e4dfd4' }}
                />
                {errs.studentId && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.studentId}</p>}
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Ngành học</label>
                <MajorSelect
                  value={form.major}
                  onChange={val => {
                    setForm(prev => ({ ...prev, major: val }))
                    if (errs.major) setErrs(prev => ({ ...prev, major: '' }))
                  }}
                  error={!!errs.major}
                />
                {errs.major && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.major}</p>}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setErrs({})
                  }}
                  style={{
                    height: 50,
                    padding: '0 18px',
                    borderRadius: 14,
                    border: '1.5px solid #e4dfd4',
                    background: C.card,
                    color: C.inkDim,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    height: 50,
                    border: 'none',
                    borderRadius: 14,
                    background: loading ? '#9ca3af' : `linear-gradient(90deg, ${C.coral}, #f43f5e)`,
                    color: C.bg,
                    fontSize: 15,
                    fontWeight: 900,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'Đang tạo...' : 'Hoàn tất đăng ký'}
                </button>
              </div>
            </form>
          )}

          <p style={{ margin: '22px 0 0', textAlign: 'center', color: C.inkDim, fontSize: 14, fontWeight: 700 }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: C.coral, fontWeight: 900, textDecoration: 'none' }}>
              Đăng nhập
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
