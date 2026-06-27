import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useResendCooldown } from '@/hooks/useResendCooldown'
import { useGoogleLogin } from '@react-oauth/google'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getApiErrorMessage } from '@/lib/apiError'
import { C } from '@/components/public/publicComponents'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'
import type { UserInfo } from '@/types/auth'
import AuthShell from './AuthShell'

function redirectAfterLogin(me: UserInfo): string {
  if (me.roles.includes('SUPER_ADMIN')) return '/admin'
  const active = me.memberships.filter(m => m.status === 'Active')
  const hasManageRole = active.some(m => m.clubRole === 'CLUB_ADMIN' || m.clubRole === 'DEPT_LEAD')
  if (hasManageRole || active.length > 0) return '/dashboard'
  return '/clubs'
}

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

export default function LoginPage() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const resend = useResendCooldown(60)
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({})
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const e: { email?: string; password?: string } = {}
    if (!email.trim()) e.email = 'Vui lòng nhập email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email không đúng định dạng.'
    if (!password) e.password = 'Vui lòng nhập mật khẩu.'
    return e
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validate()
    if (Object.keys(fieldErrs).length > 0) {
      setErrs(fieldErrs)
      return
    }
    setLoading(true)
    try {
      const me = await login(email, password, rememberMe)
      navigate(redirectAfterLogin(me), { replace: true })
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, '')
      if (msg === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmedEmail(email)
      } else {
        toast.error(msg || 'Email hoặc mật khẩu không đúng.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resend.active) return
    setResendLoading(true)
    try {
      await api.post('/auth/resend-confirmation', { email: unconfirmedEmail })
      toast.success('Email xác thực đã được gửi lại.')
      resend.start(60)
    } catch {
      toast.error('Gửi lại thất bại. Vui lòng thử lại sau.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async tokenResponse => {
      setLoading(true)
      try {
        const me = await googleLogin(tokenResponse.access_token)
        navigate(redirectAfterLogin(me), { replace: true })
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Đăng nhập Google thất bại.'))
      } finally {
        setLoading(false)
      }
    },
    onError: () => toast.error('Đăng nhập Google thất bại. Vui lòng thử lại.'),
  })

  return (
    <AuthShell
      eyebrow="Cổng thông tin CLB UEF"
      title="Chào mừng bạn"
      accent="quay trở lại"
      description="Đăng nhập để theo dõi CLB, nhiệm vụ, thông báo và các hoạt động đang diễn ra trong cộng đồng sinh viên UEF."
    >
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: '-.04em' }}>
        Đăng nhập
      </h1>
      <p style={{ margin: '8px 0 28px', fontSize: 15, color: C.inkDim, fontWeight: 600 }}>
        Chào mừng bạn quay trở lại
      </p>

      {unconfirmedEmail && (
        <div style={{
          background: '#fef3c7',
          border: '1.5px solid #fde68a',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 18,
        }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#92400e', margin: '0 0 6px' }}>
            Email chưa được xác thực
          </p>
          <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 8px' }}>
            Kiểm tra hộp thư của <strong>{unconfirmedEmail}</strong>.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resend.active}
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#b45309',
              background: 'none',
              border: 'none',
              cursor: (resendLoading || resend.active) ? 'not-allowed' : 'pointer',
              opacity: resend.active ? 0.7 : 1,
              textDecoration: 'underline',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            {resend.active ? `Gửi lại sau ${resend.seconds}s` : resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Tên đăng nhập</label>
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              if (errs.email) setErrs(prev => ({ ...prev, email: '' }))
            }}
            placeholder="Email"
            style={{ ...inputStyle, borderColor: errs.email ? '#ef4444' : '#e4dfd4' }}
          />
          {errs.email && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{errs.email}</p>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mật khẩu</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (errs.password) setErrs(prev => ({ ...prev, password: '' }))
              }}
              placeholder="Mật khẩu"
              style={{ ...inputStyle, paddingRight: 44, borderColor: errs.password ? '#ef4444' : '#e4dfd4' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute',
                right: 14,
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.inkDim, fontWeight: 700, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ accentColor: C.coral, cursor: 'pointer' }}
            />
            Ghi nhớ đăng nhập
          </label>
          <Link to="/forgot-password" style={{ color: C.coral, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
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
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px' }}>
        <div style={{ flex: 1, height: 1, background: '#e6e0d6' }} />
        <span style={{ color: C.inkMuted, fontSize: 13, fontWeight: 700 }}>Hoặc tiếp tục với</span>
        <div style={{ flex: 1, height: 1, background: '#e6e0d6' }} />
      </div>

      <button
        type="button"
        onClick={() => handleGoogleLogin()}
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

      <p style={{ margin: '24px 0 0', textAlign: 'center', color: C.inkDim, fontSize: 14, fontWeight: 700 }}>
        Chưa có tài khoản?{' '}
        <Link to="/register" style={{ color: C.coral, fontWeight: 900, textDecoration: 'none' }}>
          Đăng ký tại đây
        </Link>
      </p>
    </AuthShell>
  )
}
