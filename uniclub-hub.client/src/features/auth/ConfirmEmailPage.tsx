import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { C } from '@/components/public/publicComponents'

type Status = 'loading' | 'success' | 'already' | 'error'

const STATE: Record<Status, { icon: string; title: string; desc: (msg: string) => string; accent: string }> = {
  loading: { icon: '⟳',  title: 'Đang xác thực...',     desc: () => 'Vui lòng chờ trong giây lát.', accent: C.inkMuted },
  success: { icon: '✓',  title: 'Xác thực thành công!',  desc: () => 'Email đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.', accent: '#10b981' },
  already: { icon: '✓',  title: 'Email đã xác thực',     desc: () => 'Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập bình thường.', accent: C.indigo },
  error:   { icon: '✕',  title: 'Xác thực thất bại',     desc: (m) => m || 'Liên kết không hợp lệ hoặc đã hết hạn.', accent: '#ef4444' },
}

export default function ConfirmEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!email || !token) { setStatus('error'); return }
    api.get(`/auth/confirm-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then(res => {
        const msg: string = res.data.message ?? ''
        setStatus(msg.includes('trước đó') ? 'already' : 'success')
        setMessage(msg)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.message ?? 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.')
      })
  }, [email, token])

  const s = STATE[status]

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      <div style={{
        background: C.card, border: C.border, borderRadius: 20,
        boxShadow: C.shadow(6, 6), padding: '36px 40px',
        width: '100%', maxWidth: 420, textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 34, height: 34, background: C.ink, borderRadius: 8, border: C.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: C.lemon, letterSpacing: '-.02em',
          }}>U!</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: '-.02em' }}>UniClub Hub</span>
        </div>

        {/* Status icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: status === 'loading' ? '#f7f6f1' : s.accent + '18',
          border: `1.5px solid ${status === 'loading' ? C.rule : s.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: s.accent,
          animation: status === 'loading' ? 'spin 1s linear infinite' : 'none',
        }}>
          {s.icon}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 900, color: C.ink, margin: '0 0 10px', letterSpacing: '-.025em' }}>
          {s.title}
        </h1>
        <p style={{ fontSize: 14, color: C.inkDim, lineHeight: 1.6, margin: '0 0 28px' }}>
          {s.desc(message)}
        </p>

        {status !== 'loading' && (
          <Link to="/login" style={{
            display: 'block', width: '100%', padding: '13px 0',
            borderRadius: C.radiusPill, background: C.ink, color: C.lemon,
            border: C.border, boxShadow: C.shadow(),
            fontSize: 14, fontWeight: 800, textDecoration: 'none',
            letterSpacing: '-.01em', boxSizing: 'border-box',
          }}>
            {status === 'error' ? 'Quay lại đăng nhập' : 'Đăng nhập →'}
          </Link>
        )}

        {status === 'error' && (
          <p style={{ fontSize: 12.5, color: C.inkMuted, marginTop: 14 }}>
            Link hết hạn?{' '}
            <Link to="/login" style={{ color: C.indigo, fontWeight: 700, textDecoration: 'none' }}>
              Gửi lại email xác thực
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
