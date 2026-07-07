import { useEffect, useState, type ReactNode } from 'react'
import DashboardSidebar from './DashboardSidebar'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type Mode = 'member' | 'admin' | 'club'

type Props = {
  mode: Mode
  clubId?: string
  children: ReactNode
}

export default function DashboardLayoutShell({ mode, clubId, children }: Props) {
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!isMobile) setNavOpen(false)
  }, [isMobile])

  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [navOpen])

  const modeLabel = mode === 'admin' ? 'Quản trị' : mode === 'club' ? 'Quản lý CLB' : 'Thành viên'

  return (
    <div className="dashboard-layout">
      {isMobile && navOpen && (
        <button
          type="button"
          className="dashboard-backdrop"
          aria-label="Đóng menu"
          onClick={() => setNavOpen(false)}
        />
      )}
      <DashboardSidebar
        mode={mode}
        clubId={clubId}
        mobile={isMobile}
        mobileOpen={navOpen}
        onMobileClose={() => setNavOpen(false)}
      />
      <div className="dashboard-main">
        {isMobile && (
          <div className="dashboard-mobile-bar">
            <button
              type="button"
              className="dashboard-mobile-bar__menu"
              aria-label="Mở menu"
              onClick={() => setNavOpen(true)}
            >
              ☰
            </button>
            <span className="dashboard-mobile-bar__title">UniClub Hub</span>
            <span className="dashboard-mobile-bar__mode">{modeLabel}</span>
          </div>
        )}
        <main className="dashboard-main__content">
          {children}
        </main>
      </div>
      <ThemeSwitcher />
    </div>
  )
}
