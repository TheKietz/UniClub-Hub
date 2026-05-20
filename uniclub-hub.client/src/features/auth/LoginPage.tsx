import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { C, Rv } from '@/components/public/v3'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'

const CLUB_SQUARES = [
  { short: 'UEC', color: C.indigo },
  { short: 'MKC', color: C.violet },
  { short: 'ITS', color: C.sky },
  { short: 'VLC', color: C.mint },
  { short: 'DCU', color: C.pink },
  { short: 'PHC', color: C.coral },
]

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: C.radiusPill,
  border: C.border, background: C.bg,
  padding: '0 14px', fontSize: 13.5, color: C.ink, outline: 'none',
  marginBottom: 8, fontWeight: 500, boxSizing: 'border-box',
  fontFamily: "'Be Vietnam Pro', sans-serif",
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.inkDim,
  marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase',
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
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({})

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
    if (Object.keys(fieldErrs).length > 0) { setErrs(fieldErrs); return }
    setLoading(true)
    try {
      const me = await login(email, password, rememberMe)
      navigate(me.roles.includes('SUPER_ADMIN') ? '/admin' : '/dashboard', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.message ?? ''
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
    setResendLoading(true)
    try {
      await api.post('/auth/resend-confirmation', { email: unconfirmedEmail })
      toast.success('Email xác thực đã được gửi lại.')
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
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px 28px',
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 440px', gap: 56,
        maxWidth: 980, width: '100%', alignItems: 'center',
      }}>
        {/* ── Left panel ── */}
        <div style={{ position: 'relative' }}>
          {/* Decoration */}
          <div aria-hidden style={{
            position: 'absolute', top: -10, right: 20, width: 60, height: 60,
            borderRadius: C.radiusPill, background: C.coral, border: C.border,
            transform: 'rotate(8deg)', animation: 'float 4s ease-in-out infinite',
            display: 'grid', placeItems: 'center', color: C.bg,
            fontWeight: 900, fontSize: 10, textAlign: 'center', lineHeight: 1.1,
          } as React.CSSProperties}>WB!<br />UEF</div>

          <Rv>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 4, background: C.lemon, color: C.ink,
              border: C.border, marginBottom: 16,
            }}>★ Đăng nhập</span>
          </Rv>

          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: 0,
            }}>
              Hey, you're<br />
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                back!
              </span>{' '}👋
            </h1>
          </Rv>

          <Rv delay={120}>
            <p style={{ fontSize: 16, color: C.inkDim, lineHeight: 1.5, margin: '20px 0 0', maxWidth: 400, fontWeight: 500 }}>
              42 CLB, sự kiện, hoạt động đang chờ bạn. Đăng nhập để tiếp tục.
            </p>
          </Rv>

          {/* Club avatars decoration */}
          <Rv delay={180}>
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {CLUB_SQUARES.map((club, i) => (
                  <div key={club.short} style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: club.color, border: C.border,
                    display: 'grid', placeItems: 'center',
                    color: C.bg,
                    fontWeight: 900, fontSize: 13, letterSpacing: '-.02em',
                    transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (3 + i)}deg)`,
                    boxShadow: C.shadow(3, 3),
                    animation: `float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.3}s`,
                  } as React.CSSProperties}>{club.short}</div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500, marginTop: 12 }}>
                42 CLB đang hoạt động tại UEF
              </div>
            </div>
          </Rv>
        </div>

        {/* ── Form card ── */}
        <Rv delay={100}>
          <div style={{
            background: C.card, border: C.border, borderRadius: 20,
            boxShadow: C.shadow(6, 6), padding: '24px 24px 20px',
          }}>
            {/* Email not confirmed banner */}
            {unconfirmedEmail && (
              <div style={{
                background: '#fef3c7', border: '1.5px solid #fde68a',
                borderRadius: 10, padding: '12px 14px', marginBottom: 16,
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: '0 0 6px' }}>
                  Email chưa được xác thực
                </p>
                <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 8px' }}>
                  Kiểm tra hộp thư của <strong>{unconfirmedEmail}</strong>.
                </p>
                <button onClick={handleResend} disabled={resendLoading} style={{
                  fontSize: 12, fontWeight: 700, color: '#b45309', background: 'none',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  fontFamily: 'inherit',
                }}>
                  {resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                </button>
              </div>
            )}

            {/* Google */}
            <button onClick={() => handleGoogleLogin()} style={{
              width: '100%', height: 42, borderRadius: C.radiusPill,
              border: C.border, background: C.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 13.5, fontWeight: 600, color: C.ink,
              boxShadow: C.shadow(2, 2), marginBottom: 14, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
              </svg>
              Tiếp tục với Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1.5, background: C.rule }} />
              <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600 }}>hoặc</span>
              <div style={{ flex: 1, height: 1.5, background: C.rule }} />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); if (errs.email) setErrs(p => ({ ...p, email: '' })) }}
                placeholder="example@email.com"
                style={{ ...inputStyle, borderColor: errs.email ? '#ef4444' : C.ink }}
              />
              {errs.email && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 8px', paddingLeft: 14 }}>{errs.email}</p>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={labelStyle}>Mật khẩu</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: C.coral, fontWeight: 700, textDecoration: 'none' }}>Quên?</Link>
              </div>
              <input
                type="password" value={password}
                onChange={e => { setPassword(e.target.value); if (errs.password) setErrs(p => ({ ...p, password: '' })) }}
                placeholder="••••••••"
                style={{ ...inputStyle, borderColor: errs.password ? '#ef4444' : C.ink }}
              />
              {errs.password && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 8px', paddingLeft: 14 }}>{errs.password}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  id="rm" style={{ accentColor: C.coral, cursor: 'pointer' }} />
                <label htmlFor="rm" style={{ fontSize: 12.5, color: C.inkDim, cursor: 'pointer' }}>Ghi nhớ đăng nhập</label>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', height: 46, borderRadius: C.radiusPill,
                background: loading ? '#9ca3af' : C.coral, color: C.bg, border: C.border,
                boxShadow: loading ? 'none' : C.shadow(),
                fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity=".75" />
                    </svg>
                    Đang đăng nhập...
                  </span>
                ) : "Let's go! →"}
              </button>
            </form>

            <p style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: C.inkMuted }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" style={{ color: C.ink, fontWeight: 700, borderBottom: `2px solid ${C.coral}`, textDecoration: 'none' }}>
                Đăng ký
              </Link>
            </p>
          </div>
        </Rv>
      </div>
    </div>
  )
}
