import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { getApiErrorMessage } from '@/lib/apiError'
import { C } from '@/components/public/publicComponents'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from './AuthShell'

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

function InvalidLink() {
  const navigate = useNavigate()
  return (
    <AuthShell
      eyebrow="Đặt lại mật khẩu"
      title="Link không"
      accent="hợp lệ"
      description="Link đặt lại mật khẩu đã hết hạn hoặc không đúng. Vui lòng yêu cầu link mới."
    >
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 22,
        background: '#fef2f2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 18px',
        fontSize: 36,
      }}>
        ⚠️
      </div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: '-.04em', textAlign: 'center' }}>
        Link hết hạn
      </h1>
      <p style={{ margin: '10px 0 28px', fontSize: 14, color: C.inkDim, fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
        Link không hợp lệ hoặc đã hết hạn.<br />Vui lòng yêu cầu link mới.
      </p>
      <button
        onClick={() => navigate('/forgot-password')}
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
        Yêu cầu link mới
      </button>
    </AuthShell>
  )
}

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

  if (!email || !token) return <InvalidLink />

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, token, newPassword: password })
      setDone(true)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Đặt lại mật khẩu thất bại. Link có thể đã hết hạn.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Đặt lại mật khẩu"
      title="Tạo mật khẩu"
      accent="mới ngay"
      description="Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có ít nhất 6 ký tự."
    >
      {done ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            fontSize: 36,
          }}>
            🎉
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, margin: '0 0 8px', letterSpacing: '-.03em' }}>
            Thành công!
          </h2>
          <p style={{ fontSize: 14, color: C.inkDim, margin: '0 0 24px', lineHeight: 1.5, fontWeight: 600 }}>
            Mật khẩu mới đã được đặt. Bạn có thể đăng nhập ngay.
          </p>
          <button
            onClick={() => navigate('/login')}
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
            Đăng nhập ngay →
          </button>
        </div>
      ) : (
        <>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: '-.04em' }}>
            Mật khẩu mới
          </h1>
          <p style={{ margin: '8px 0 28px', fontSize: 15, color: C.inkDim, fontWeight: 600 }}>
            Tạo mật khẩu mới cho <strong style={{ color: C.ink }}>{email}</strong>
          </p>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 18,
              fontSize: 13,
              color: '#b91c1c',
              fontWeight: 600,
            }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  minLength={6}
                  style={{ ...inputStyle, paddingRight: 44 }}
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
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Xác nhận mật khẩu</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
                style={inputStyle}
              />
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
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu →'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
