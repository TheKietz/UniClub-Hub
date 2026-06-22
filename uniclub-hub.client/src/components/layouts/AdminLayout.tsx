import { Outlet } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="admin" />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--c-bg)' }}>
        <Outlet />
      </main>
      <ThemeSwitcher />
    </div>
  )
}
