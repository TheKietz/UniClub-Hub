import AppShell from './AppShell'
import { UnsavedChangesProvider } from '@/contexts/unsaved-changes-context'

export default function AdminLayout() {
  return (
    <UnsavedChangesProvider>
      <AppShell mode="admin" />
    </UnsavedChangesProvider>
  )
}
