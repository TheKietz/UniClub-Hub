import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '@/lib/axiosInstance'
import { C } from '@/components/public/publicComponents'
import AuthShell from './AuthShell'

type Status = 'loading' | 'success' | 'already' | 'error'

const STATE: Record<Status, { icon: string; title: string; desc: (msg: string) => string; color: string; bg: string }> = {
  loading: { icon: '⟳',  title: 'Đang xác thực...',     desc: () => 'Vui lòng chờ trong giây lát.',                                               color: C.inkMuted,  bg: '#e9f1fc' },
  success: { icon: '✓',  title: 'Xác thực thành công!',  desc: () => 'Email đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.',                 color: '#16a34a',   bg: '#dcfce7' },
  already: { icon: '✓',  title: 'Email đã xác thực',     desc: () => 'Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập bình thường.', color: C.indigo,    bg: '#ede9fe' },
  error:   { icon: '✕',  title: 'Xác thực thất bại',     desc: (m) => m || 'Liên kết không hợp lệ hoặc đã hết hạn.',                              color: '#ef4444',   bg: '#fef2f2' },
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

  const eyebrowMap: Record<Status, string> = {
    loading: 'Xác thực email',
    success: 'Xác thực email',
    already: 'Xác thực email',
    error:   'Xác thực email',
  }

  const accentMap: Record<Status, string> = {
    loading: 'đang xử lý',
    success: 'thành công!',
    already: 'đã hoàn tất',
    error:   'thất bại',
  }

  return (
    <AuthShell
      eyebrow={eyebrowMap[status]}
      title="Xác thực"
      accent={accentMap[status]}
      description="Hoàn tất xác thực email để kích hoạt tài khoản UniClub Hub của bạn."
    >
      <div style={{ textAlign: 'center' }}>
        <div
          className={status === 'loading' ? 'animate-spin' : ''}
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: s.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32,
            color: s.color,
            fontWeight: 900,
          }}
        >
          {s.icon}
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.ink, margin: '0 0 10px', letterSpacing: '-.04em' }}>
          {s.title}
        </h1>
        <p style={{ fontSize: 14, color: C.inkDim, lineHeight: 1.6, margin: '0 0 28px', fontWeight: 600 }}>
          {s.desc(message)}
        </p>

        {status !== 'loading' && (
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
              boxSizing: 'border-box',
            }}
          >
            {status === 'error' ? 'Quay lại đăng nhập' : 'Đăng nhập →'}
          </Link>
        )}

        {status === 'error' && (
          <p style={{ fontSize: 13, color: C.inkMuted, marginTop: 16 }}>
            Link hết hạn?{' '}
            <Link to="/login" style={{ color: C.coral, fontWeight: 800, textDecoration: 'none' }}>
              Gửi lại email xác thực
            </Link>
          </p>
        )}
      </div>
    </AuthShell>
  )
}
