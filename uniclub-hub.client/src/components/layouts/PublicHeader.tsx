import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { C } from '@/components/public/publicComponents'
import UserMenu from '@/components/shared/UserMenu'

export default function PublicHeader() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const navItems: [string, string][] = [
    ['/portal', 'Trang chủ'],
    ['/clubs', 'Câu lạc bộ'],
    ['/contact', 'Liên hệ'],
  ]

  const isActive = (path: string) =>
    path === '/portal' ? pathname === '/portal' : pathname.startsWith(path)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(235,243,255,.95)', backdropFilter: 'blur(14px)',
      borderBottom: C.border,
      fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 28px',
        height: 64, display: 'flex', alignItems: 'center', gap: 20,
      }}>
        {/* Logo */}
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: C.ink, color: C.lemon,
            display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 15,
            transform: 'rotate(-3deg)', boxShadow: `2px 2px 0 ${C.coral}`,
            flexShrink: 0,
          }}>U!</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', lineHeight: 1 }}>
              UniClub
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.coral, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>
              ★ UEF Campus
            </div>
          </div>
        </button>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
          {navItems.map(([path, label]) => (
            <button key={path} onClick={() => navigate(path)} style={{
              padding: '7px 16px', borderRadius: C.radiusPill,
              background: isActive(path) ? C.ink : 'transparent',
              color: isActive(path) ? C.bg : C.ink,
              fontWeight: isActive(path) ? 700 : 600, fontSize: 13.5,
              border: 'none', transition: 'all .15s', cursor: 'pointer',
              fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Auth */}
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <button onClick={() => navigate('/login')} style={{
            padding: '8px 18px', borderRadius: C.radiusPill,
            background: C.coral, color: C.bg, border: C.border,
            boxShadow: C.shadow(2, 2), fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Đăng nhập</button>
        )}
      </div>
    </header>
  )
}
