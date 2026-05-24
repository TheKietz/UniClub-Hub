import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { C, PublicFooter } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: C.radiusPill,
  border: C.border, background: C.bg,
  padding: '0 14px', fontSize: 13.5, color: C.ink, outline: 'none',
  fontWeight: 500, boxSizing: 'border-box',
  fontFamily: "'Be Vietnam Pro', sans-serif",
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
    <div className="v3-page v3-enter">
      <PublicHeader />
      <div style={{
        flex: 1, background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 28px', fontFamily: "'Be Vietnam Pro', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {sent ? (
            <div style={{
              background: C.card, border: C.border, borderRadius: 20,
              boxShadow: C.shadow(6, 6), padding: '32px 28px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: '0 0 10px' }}>
                Kiểm tra email của bạn
              </h2>
              <p style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.6, margin: '0 0 8px' }}>
                Nếu <strong style={{ color: C.ink }}>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong <strong style={{ color: C.ink }}>1 giờ</strong>.
              </p>
              <p style={{ fontSize: 12, color: C.inkMuted, margin: '0 0 24px' }}>
                Không thấy email? Kiểm tra thư mục Spam.
              </p>
              <button onClick={() => navigate('/login')} style={{
                width: '100%', height: 44, borderRadius: C.radiusPill,
                background: C.ink, color: C.lemon, border: C.border,
                boxShadow: C.shadow(3, 3), fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Quay lại đăng nhập</button>
            </div>
          ) : (
            <div style={{
              background: C.card, border: C.border, borderRadius: 20,
              boxShadow: C.shadow(6, 6), padding: '32px 28px',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 4, background: C.lemon, color: C.ink,
                border: C.border, marginBottom: 16,
              }}>★ Quên mật khẩu</span>

              <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, margin: '0 0 8px', letterSpacing: '-.03em' }}>
                Đặt lại mật khẩu
              </h2>
              <p style={{ fontSize: 14, color: C.inkMuted, margin: '0 0 24px', lineHeight: 1.5 }}>
                Nhập email tài khoản — chúng tôi sẽ gửi link đặt lại mật khẩu.
              </p>

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1.5px solid #fca5a5',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: '#b91c1c', fontWeight: 500,
                }}>⚠ {error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.inkDim, marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@student.edu.vn" required
                  style={{ ...inputStyle, marginBottom: 20 }}
                />
                <button type="submit" disabled={loading} style={{
                  width: '100%', height: 44, borderRadius: C.radiusPill,
                  background: C.coral, color: C.bg, border: C.border,
                  boxShadow: C.shadow(3, 3), fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}>{loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu →'}</button>
              </form>

              <button onClick={() => navigate('/login')} style={{
                display: 'block', width: '100%', marginTop: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: C.inkMuted, fontFamily: 'inherit',
              }}>← Quay lại đăng nhập</button>
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
