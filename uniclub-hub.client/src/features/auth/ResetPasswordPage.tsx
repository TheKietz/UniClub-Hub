import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { C, PublicFooter } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import { Eye, EyeOff } from 'lucide-react'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: C.radiusPill,
  border: C.border, background: C.bg,
  padding: '0 14px', fontSize: 13.5, color: C.ink, outline: 'none',
  fontWeight: 500, boxSizing: 'border-box',
  fontFamily: "'Be Vietnam Pro', sans-serif",
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

  if (!email || !token) {
    return (
      <div className="v3-page">
        <PublicHeader />
        <div style={{
          flex: 1, background: C.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px 28px', fontFamily: "'Be Vietnam Pro', sans-serif",
        }}>
          <div style={{
            background: C.card, border: C.border, borderRadius: 20,
            boxShadow: C.shadow(6, 6), padding: '32px 28px',
            maxWidth: 420, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 20 }}>
              Link không hợp lệ hoặc đã hết hạn.
            </p>
            <button onClick={() => navigate('/forgot-password')} style={{
              width: '100%', height: 44, borderRadius: C.radiusPill,
              background: C.coral, color: C.bg, border: C.border,
              boxShadow: C.shadow(3, 3), fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Yêu cầu link mới</button>
          </div>
        </div>
        <PublicFooter />
      </div>
    )
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, token, newPassword: password })
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Đặt lại mật khẩu thất bại. Link có thể đã hết hạn.')
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
          {done ? (
            <div style={{
              background: C.card, border: C.border, borderRadius: 20,
              boxShadow: C.shadow(6, 6), padding: '32px 28px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: '0 0 10px' }}>
                Đặt lại mật khẩu thành công!
              </h2>
              <p style={{ fontSize: 14, color: C.inkMuted, margin: '0 0 24px', lineHeight: 1.5 }}>
                Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <button onClick={() => navigate('/login')} style={{
                width: '100%', height: 44, borderRadius: C.radiusPill,
                background: C.ink, color: C.lemon, border: C.border,
                boxShadow: C.shadow(3, 3), fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Đăng nhập ngay →</button>
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
              }}>★ Đặt lại mật khẩu</span>

              <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, margin: '0 0 6px', letterSpacing: '-.03em' }}>
                Mật khẩu mới
              </h2>
              <p style={{ fontSize: 13, color: C.inkMuted, margin: '0 0 24px' }}>
                Tạo mật khẩu mới cho <strong style={{ color: C.ink }}>{email}</strong>
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
                  Mật khẩu mới
                </label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự" required minLength={6}
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: C.inkMuted,
                  }}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>

                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.inkDim, marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Xác nhận mật khẩu
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu" required
                  style={{ ...inputStyle, marginBottom: 20 }}
                />

                <button type="submit" disabled={loading} style={{
                  width: '100%', height: 44, borderRadius: C.radiusPill,
                  background: C.coral, color: C.bg, border: C.border,
                  boxShadow: C.shadow(3, 3), fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}>{loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu →'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
