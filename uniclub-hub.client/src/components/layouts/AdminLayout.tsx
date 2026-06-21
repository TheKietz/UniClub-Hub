import { Outlet } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import { D } from '@/components/shared/managementTheme'

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="admin" />
      <main style={{ flex: 1, overflow: 'auto', background: D.bg }}>
        <Outlet />
      </main>
    </div>
  )
}
