import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import DashboardSidebar from './DashboardSidebar'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import { D } from '@/components/shared/managementTheme'
import { useIsMobile } from '@/hooks/useMediaQuery'

type Mode = 'member' | 'admin' | 'club'

interface Props {
  mode: Mode
  clubId?: string
}

/**
 * Khung layout dùng chung cho các trang internal (Member / Admin / Club manage).
 *  - Desktop (>768px): sidebar cố định nằm cạnh nội dung — giữ nguyên như cũ.
 *  - Điện thoại (≤768px): sidebar chuyển thành drawer trượt từ trái, mở bằng nút
 *    hamburger trên thanh top bar; có lớp phủ nền và tự đóng khi điều hướng.
 */
export default function AppShell({ mode, clubId }: Props) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  // Đổi sang desktop thì đóng drawer
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  // Khoá cuộn nền khi drawer mở
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  if (!isMobile) {
    // ── Desktop — giữ nguyên hành vi cũ ──────────────────────────────────
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DashboardSidebar mode={mode} clubId={clubId} />
        <main style={{ flex: 1, overflow: 'auto', background: D.bg }}>
          <Outlet />
        </main>
        <ThemeSwitcher />
      </div>
    )
  }

  // ── Điện thoại — top bar + drawer ──────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden',
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 10px', background: 'var(--c-chrome)',
        borderBottom: '1.5px solid rgba(255,255,255,.06)', zIndex: 40,
      }}>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Mở menu"
          style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0, border: '1px solid rgba(255,255,255,.15)',
            background: 'rgba(255,255,255,.08)', color: '#fff',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        >
          <Menu size={20} />
        </button>

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, minWidth: 0,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: '#fff', flexShrink: 0,
            display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12,
            color: 'var(--c-ink)', transform: 'rotate(-3deg)', boxShadow: '2px 2px 0 #e11d48',
          }}>U!</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>UniClub</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <NotificationBell />
        </div>
      </header>

      {/* Nội dung */}
      <main style={{ flex: 1, overflow: 'auto', background: D.bg, minHeight: 0 }}>
        <Outlet />
      </main>

      {/* Lớp phủ nền */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 60 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 70,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
        boxShadow: drawerOpen ? '4px 0 28px rgba(0,0,0,.45)' : 'none',
        // Không nhận sự kiện chuột khi đang đóng để không chặn nội dung
        pointerEvents: drawerOpen ? 'auto' : 'none',
      }}>
        <DashboardSidebar
          mode={mode}
          clubId={clubId}
          forceExpanded
          onNavigate={() => setDrawerOpen(false)}
        />
      </div>

      <ThemeSwitcher />
    </div>
  )
}
