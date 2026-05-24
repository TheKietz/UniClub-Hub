import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const C = {
  bg: '#fbf9f3', ink: '#15131a', lemon: '#facc15', coral: '#ff5a3c',
  card: '#ffffff', inkMuted: '#918c99',
  border: '1.5px solid #15131a',
  shadow: '4px 4px 0 #15131a',
}

export default function ForbiddenPage() {
  const { isSuperAdmin } = useAuth()
  const dashboardHref = isSuperAdmin ? '/admin' : '/dashboard'

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      {/* Big 403 */}
      <div style={{
        fontSize: 'clamp(100px, 20vw, 180px)', fontWeight: 900, lineHeight: 1,
        color: C.ink, letterSpacing: '-.06em', userSelect: 'none',
        textShadow: `6px 6px 0 ${C.coral}`,
      }}>403</div>

      {/* Card */}
      <div style={{
        marginTop: 32, maxWidth: 440, width: '100%',
        background: C.card, border: C.border, borderRadius: 16,
        boxShadow: C.shadow, padding: '28px 32px', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', background: C.coral, border: C.border,
          borderRadius: 6, padding: '2px 12px', fontSize: 10.5,
          fontWeight: 800, letterSpacing: '.06em', marginBottom: 14, color: '#fff',
        }}>⚠ KHÔNG CÓ QUYỀN TRUY CẬP</div>

        <h1 style={{
          fontSize: 22, fontWeight: 900, color: C.ink,
          letterSpacing: '-.025em', margin: '0 0 8px',
        }}>Bạn không có thẩm quyền</h1>

        <p style={{ fontSize: 13.5, color: C.inkMuted, lineHeight: 1.6, margin: '0 0 24px' }}>
          Trang này chỉ dành cho người có vai trò phù hợp.
          Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              height: 44, padding: '0 20px', borderRadius: 10,
              background: C.card, color: C.ink, border: C.border,
              boxShadow: '2px 2px 0 #15131a', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >← Quay lại</button>
          <Link
            to={dashboardHref}
            style={{
              height: 44, padding: '0 20px', borderRadius: 10,
              background: C.ink, color: C.lemon, border: C.border,
              boxShadow: '2px 2px 0 #15131a', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
            }}
          >Về dashboard →</Link>
        </div>
      </div>
    </div>
  )
}
