import { Outlet } from 'react-router-dom'
import DashboardLayoutShell from './DashboardLayoutShell'
import { UnsavedChangesProvider } from '@/contexts/unsaved-changes-context'

export default function AdminLayout() {
  return (
    <UnsavedChangesProvider>
      <DashboardLayoutShell mode="admin">
        <Outlet />
      </DashboardLayoutShell>
    </UnsavedChangesProvider>
  )
}
