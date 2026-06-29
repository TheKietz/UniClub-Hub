import { Outlet } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'
import { D } from '@/components/shared/managementTheme'
import { UnsavedChangesProvider } from '@/contexts/unsaved-changes-context'

export default function AdminLayout() {
  return (
    <UnsavedChangesProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DashboardSidebar mode="admin" />
        <main style={{ flex: 1, overflow: 'auto', background: D.bg }}>
          <Outlet />
        </main>
        <ThemeSwitcher />
      </div>
    </UnsavedChangesProvider>
  )
}
