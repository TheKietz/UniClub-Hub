import { useParams } from 'react-router-dom'
import AppShell from './AppShell'
import { UnsavedChangesProvider } from '@/contexts/unsaved-changes-context'

export default function ClubManageLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <UnsavedChangesProvider>
      <AppShell mode="club" clubId={clubId} />
    </UnsavedChangesProvider>
  )
}
