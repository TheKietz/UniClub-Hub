import { useEffect } from 'react'
import { useOptionalUnsavedChanges } from '@/contexts/unsaved-changes-context'

type UseUnsavedNavigationGuardOptions = {
  when: boolean
  onSave: () => Promise<boolean>
  onDiscard: () => void
  description?: string
}

/** Register unsaved-change guard for sidebar / in-app navigation (BrowserRouter-safe). */
export function useUnsavedNavigationGuard({
  when,
  onSave,
  onDiscard,
  description,
}: UseUnsavedNavigationGuardOptions) {
  const unsaved = useOptionalUnsavedChanges()

  useEffect(() => {
    if (!unsaved) return

    unsaved.registerLeaveRequest({
      when,
      description,
      onSave,
      onDiscard,
    })

    return () => unsaved.registerLeaveRequest(null)
  }, [description, onDiscard, onSave, unsaved, when])
}
