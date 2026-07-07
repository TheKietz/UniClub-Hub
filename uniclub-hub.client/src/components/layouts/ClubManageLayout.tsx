import { Outlet, useParams } from 'react-router-dom'
import DashboardLayoutShell from './DashboardLayoutShell'
import { UnsavedChangesProvider } from '@/contexts/unsaved-changes-context'

export default function ClubManageLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <UnsavedChangesProvider>
      <DashboardLayoutShell mode="club" clubId={clubId}>
        <Outlet />
      </DashboardLayoutShell>
    </UnsavedChangesProvider>
  )
}
