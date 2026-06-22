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
    <header className="public-header" style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      zIndex: 50,
      width: 'min(1120px, calc(100% - 32px))',
      transform: 'translateX(-50%)',
      background: 'rgba(255,255,255,.86)',
      backdropFilter: 'blur(18px) saturate(145%)',
      WebkitBackdropFilter: 'blur(18px) saturate(145%)',
      border: C.border,
      borderRadius: C.radiusPill,
      boxShadow: '0 18px 48px rgba(10, 47, 110, .18)',
      fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
    }}>
      <style>{`
        .public-header-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 18px;
          height: 58px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .public-header-logo-text {
          text-align: left;
        }
        .public-header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .public-header-nav {
          display: flex;
          gap: 3px;
          margin-left: 2px;
        }
        .public-header-spacer {
          flex: 1;
        }
        .public-header-auth {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
        @media (max-width: 720px) {
          .public-header {
            top: 10px !important;
            width: calc(100% - 20px) !important;
            border-radius: 24px !important;
          }
          .public-header-inner {
            min-height: 58px;
            height: auto;
            padding: 8px 10px;
            gap: 8px;
            display: grid;
            grid-template-columns: auto 1fr auto;
          }
          .public-header-inner .public-header-logo-text {
            display: none;
          }
          .public-header-inner .public-header-brand {
            grid-column: 1;
            grid-row: 1;
          }
          .public-header-inner .public-header-nav {
            grid-column: 1 / -1;
            grid-row: 2;
            width: 100%;
            justify-content: center;
            margin-left: 0;
          }
          .public-header-inner .public-header-nav button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .public-header-inner .public-header-spacer {
            display: none;
          }
          .public-header-inner .public-header-auth {
            display: flex;
            grid-column: 3;
            grid-row: 1;
            gap: 6px;
          }
          .public-header-inner .public-header-login {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .public-header-inner .public-header-auth > button:last-child {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
      <div className="public-header-inner">
        {/* Logo */}
        <button className="public-header-brand" onClick={() => navigate('/')}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: C.ink, color: C.lemon,
            display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 15,
            transform: 'rotate(-3deg)', boxShadow: `2px 2px 0 ${C.coral}`,
            flexShrink: 0,
          }}>U!</div>
          <div className="public-header-logo-text">
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', lineHeight: 1 }}>
              UniClub
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.coral, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>
              ★ UEF Campus
            </div>
          </div>
        </button>

        {/* Nav */}
        <nav className="public-header-nav">
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

        <div className="public-header-spacer" />

        {/* Auth */}
        <div className="public-header-auth">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <button className="public-header-login" onClick={() => navigate('/login')} style={{
                padding: '8px 16px', borderRadius: C.radiusPill,
                background: C.card, color: C.ink, border: C.border,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Đăng nhập</button>
              <button onClick={() => navigate('/register')} style={{
                padding: '8px 18px', borderRadius: C.radiusPill,
                background: C.coral, color: C.bg, border: C.border,
                boxShadow: C.shadow(2, 2), fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Đăng ký</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
