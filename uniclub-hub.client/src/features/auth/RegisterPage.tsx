import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { C, Rv } from '@/components/public/v3'
import MajorSelect from '@/components/shared/MajorSelect'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'
import { MailCheck, RefreshCw } from 'lucide-react'

type F = { fullName: string; email: string; studentId: string; major: string; password: string; confirmPassword: string }
type Errs = Partial<Record<keyof F, string>>

const CLUB_SQUARES = [
  { short: 'UEC', color: C.indigo },
  { short: 'MKC', color: C.violet },
  { short: 'ITS', color: C.sky },
  { short: 'VLC', color: C.mint },
  { short: 'DCU', color: C.pink },
  { short: 'STH', color: C.coral },
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

export default function RegisterPage() {
  const { register, googleLogin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [form, setForm] = useState<F>({ fullName: '', email: '', studentId: '', major: '', password: '', confirmPassword: '' })
  const [errs, setErrs] = useState<Errs>({})
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

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
    if (Object.keys(fieldErrs).length > 0) { setErrs(fieldErrs); return }
    setErrs({})
    setStep(2)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validateStep2(form)
    if (Object.keys(fieldErrs).length > 0) { setErrs(fieldErrs); return }
    setLoading(true)
    try {
      await register({ email: form.email, password: form.password, fullName: form.fullName, studentId: form.studentId, major: form.major })
      setRegisteredEmail(form.email)
      setStep(3)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.')
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


  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 28px', fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 440px', gap: 56,
        maxWidth: 980, width: '100%', alignItems: 'center',
      }}>
        {/* ── Left panel ── */}
        <div style={{ position: 'relative' }}>
          <Rv>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 4, background: C.lemon, color: C.ink,
              border: C.border, marginBottom: 16,
            }}>★ Đăng ký</span>
          </Rv>
          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: 0,
            }}>
              Chào mừng<br />
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                đến UniClub!
              </span>{' '}🎉
            </h1>
          </Rv>
          <Rv delay={120}>
            <p style={{ fontSize: 16, color: C.inkDim, lineHeight: 1.5, margin: '20px 0 0', maxWidth: 400, fontWeight: 500 }}>
              Tham gia cộng đồng CLB sinh viên. Khám phá, tham gia và đóng góp cùng mọi người.
            </p>
          </Rv>
          <Rv delay={180}>
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {CLUB_SQUARES.map((club, i) => (
                  <div key={club.short} style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: club.color, border: C.border,
                    display: 'grid', placeItems: 'center',
                    color: C.bg, fontWeight: 900, fontSize: 13, letterSpacing: '-.02em',
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
            {/* Step 3 — check email */}
            {step === 3 ? (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 999, background: '#ede9fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <MailCheck size={28} color={C.violet} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: '0 0 8px' }}>
                  Kiểm tra email!
                </h2>
                <p style={{ fontSize: 13.5, color: C.inkDim, lineHeight: 1.5, margin: '0 0 16px' }}>
                  Đã gửi link xác thực đến{' '}
                  <strong style={{ color: C.ink }}>{registeredEmail}</strong>.
                </p>
                <div style={{
                  background: '#fef3c7', border: '1.5px solid #fde68a',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 16, textAlign: 'left',
                }}>
                  <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
                    Không thấy email? Kiểm tra thư mục <strong>Spam</strong>.
                  </p>
                </div>
                <button onClick={handleResend} disabled={resendLoading} style={{
                  width: '100%', height: 40, borderRadius: C.radiusPill,
                  border: C.border, background: C.card, color: C.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10,
                  fontFamily: 'inherit',
                }}>
                  <RefreshCw size={14} style={{ animation: resendLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                </button>
                <Link to="/login" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: 44, borderRadius: C.radiusPill,
                  background: C.coral, color: C.bg, border: C.border,
                  boxShadow: C.shadow(), fontSize: 14, fontWeight: 800,
                  textDecoration: 'none',
                }}>Về trang đăng nhập</Link>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  {[1, 2].map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 999, border: C.border,
                        background: step >= s ? C.ink : C.card,
                        color: step >= s ? C.lemon : C.inkMuted,
                        display: 'grid', placeItems: 'center',
                        fontSize: 11, fontWeight: 800,
                      }}>{s}</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: step === s ? C.ink : C.inkMuted }}>
                        {s === 1 ? 'Tài khoản' : 'Hồ sơ'}
                      </span>
                      {s < 2 && <div style={{ width: 20, height: 1.5, background: C.rule, margin: '0 2px' }} />}
                    </div>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: C.inkMuted, fontWeight: 600 }}>
                    Bước {step}/2
                  </span>
                </div>

                {/* Google (step 1 only) */}
                {step === 1 && (
                  <>
                    <button onClick={() => handleGoogleRegister()} style={{
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
                      Đăng ký với Google
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ flex: 1, height: 1.5, background: C.rule }} />
                      <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600 }}>hoặc</span>
                      <div style={{ flex: 1, height: 1.5, background: C.rule }} />
                    </div>
                  </>
                )}

                {/* Step 1 */}
                {step === 1 && (
                  <form onSubmit={handleNext} noValidate>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={form.email} onChange={onChange('email')} placeholder="example@email.com"
                      style={{ ...inputStyle, borderColor: errs.email ? '#ef4444' : C.ink }} />
                    {errs.email && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 6px', paddingLeft: 14 }}>{errs.email}</p>}

                    <label style={labelStyle}>Mật khẩu</label>
                    <input type="password" value={form.password} onChange={onChange('password')} placeholder="Tối thiểu 6 ký tự"
                      style={{ ...inputStyle, borderColor: errs.password ? '#ef4444' : C.ink }} />
                    {errs.password && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 6px', paddingLeft: 14 }}>{errs.password}</p>}

                    <label style={labelStyle}>Xác nhận mật khẩu</label>
                    <input type="password" value={form.confirmPassword} onChange={onChange('confirmPassword')} placeholder="Nhập lại mật khẩu"
                      style={{ ...inputStyle, borderColor: errs.confirmPassword ? '#ef4444' : C.ink }} />
                    {errs.confirmPassword && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 6px', paddingLeft: 14 }}>{errs.confirmPassword}</p>}

                    <button type="submit" style={{
                      width: '100%', height: 46, borderRadius: C.radiusPill,
                      background: C.coral, color: C.bg, border: C.border,
                      boxShadow: C.shadow(), fontSize: 15, fontWeight: 800,
                      cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
                    }}>Tiếp theo →</button>

                    <p style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: C.inkMuted }}>
                      Đã có tài khoản?{' '}
                      <Link to="/login" style={{ color: C.ink, fontWeight: 700, borderBottom: `2px solid ${C.coral}`, textDecoration: 'none' }}>
                        Đăng nhập
                      </Link>
                    </p>
                  </form>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <form onSubmit={handleSubmit} noValidate>
                    <label style={labelStyle}>Họ và tên *</label>
                    <input type="text" value={form.fullName} onChange={onChange('fullName')} placeholder="Nguyễn Văn A"
                      style={{ ...inputStyle, borderColor: errs.fullName ? '#ef4444' : C.ink }} />
                    {errs.fullName && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 6px', paddingLeft: 14 }}>{errs.fullName}</p>}

                    <label style={labelStyle}>Mã số sinh viên *</label>
                    <input type="text" value={form.studentId} onChange={onChange('studentId')} placeholder="2151234567"
                      style={{ ...inputStyle, borderColor: errs.studentId ? '#ef4444' : C.ink }} />
                    {errs.studentId && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 6px', paddingLeft: 14 }}>{errs.studentId}</p>}

                    <label style={labelStyle}>Ngành học *</label>
                    <MajorSelect
                      value={form.major}
                      onChange={val => { setForm(p => ({ ...p, major: val })); if (errs.major) setErrs(p => ({ ...p, major: '' })) }}
                      error={!!errs.major}
                    />
                    {errs.major && <p style={{ fontSize: 11, color: '#ef4444', margin: '2px 0 6px', paddingLeft: 14 }}>{errs.major}</p>}

                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button type="button" onClick={() => { setStep(1); setErrs({}) }} style={{
                        height: 46, padding: '0 20px', borderRadius: C.radiusPill,
                        border: C.border, background: C.card, color: C.ink,
                        fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}>← Quay lại</button>
                      <button type="submit" disabled={loading} style={{
                        flex: 1, height: 46, borderRadius: C.radiusPill,
                        background: loading ? '#9ca3af' : C.coral, color: C.bg, border: C.border,
                        boxShadow: loading ? 'none' : C.shadow(),
                        fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}>
                        {loading ? 'Đang tạo...' : 'Hoàn tất đăng ký →'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </Rv>
      </div>
    </div>
  )
}
