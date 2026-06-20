import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { C } from '@/components/public/publicComponents'
import { MailCheck } from 'lucide-react'
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

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
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
    <AuthShell
      eyebrow="Khôi phục tài khoản"
      title="Quên mật"
      accent="khẩu?"
      description="Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu ngay lập tức."
    >
      {sent ? (
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
            color: '#16a34a',
          }}>
            <MailCheck size={34} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, margin: '0 0 8px', letterSpacing: '-.03em' }}>
            Kiểm tra email
          </h2>
          <p style={{ fontSize: 14, color: C.inkDim, lineHeight: 1.6, margin: '0 0 6px', fontWeight: 600 }}>
            Nếu <strong style={{ color: C.ink }}>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.
          </p>
          <p style={{ fontSize: 13, color: C.inkMuted, margin: '0 0 24px' }}>
            Link có hiệu lực trong <strong>1 giờ</strong>. Không thấy email? Kiểm tra thư mục Spam.
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
            Quay lại đăng nhập
          </button>
        </div>
      ) : (
        <>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: '-.04em' }}>
            Đặt lại mật khẩu
          </h1>
          <p style={{ margin: '8px 0 28px', fontSize: 15, color: C.inkDim, fontWeight: 600 }}>
            Nhập email tài khoản để nhận link đặt lại
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
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@student.edu.vn"
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
              {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu →'}
            </button>
          </form>

          <p style={{ margin: '22px 0 0', textAlign: 'center', color: C.inkDim, fontSize: 14, fontWeight: 700 }}>
            <Link to="/login" style={{ color: C.coral, fontWeight: 900, textDecoration: 'none' }}>
              ← Quay lại đăng nhập
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
