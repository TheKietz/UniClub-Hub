import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'

type LeaveRequest = {
  when: boolean
  description?: string
  onSave: () => Promise<boolean>
  onDiscard: () => void
}

type UnsavedChangesContextValue = {
  registerLeaveRequest: (request: LeaveRequest | null) => void
  runGuarded: (action: () => void) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const requestRef = useRef<LeaveRequest | null>(null)
  const pendingAction = useRef<(() => void) | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState<string>()
  const [hasUnsaved, setHasUnsaved] = useState(false)

  const registerLeaveRequest = useCallback((request: LeaveRequest | null) => {
    requestRef.current = request
    setHasUnsaved(Boolean(request?.when))
    if (request?.description) setDescription(request.description)
  }, [])

  const runGuarded = useCallback((action: () => void) => {
    const request = requestRef.current
    if (!request?.when) {
      action()
      return
    }
    pendingAction.current = action
    if (request.description) setDescription(request.description)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  const cancel = useCallback(() => {
    setOpen(false)
    pendingAction.current = null
  }, [])

  const discardAndLeave = useCallback(() => {
    requestRef.current?.onDiscard()
    setOpen(false)
    pendingAction.current?.()
    pendingAction.current = null
  }, [])

  const saveAndLeave = useCallback(async () => {
    const request = requestRef.current
    if (!request) return
    setSaving(true)
    try {
      const ok = await request.onSave()
      if (!ok) return
      setOpen(false)
      pendingAction.current?.()
      pendingAction.current = null
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <UnsavedChangesContext value={{ registerLeaveRequest, runGuarded }}>
      {children}
      <UnsavedChangesDialog
        open={open}
        saving={saving}
        description={description}
        onCancel={cancel}
        onDiscard={discardAndLeave}
        onSave={saveAndLeave}
      />
    </UnsavedChangesContext>
  )
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext)
  if (!ctx) throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider')
  return ctx
}

export function useOptionalUnsavedChanges() {
  return useContext(UnsavedChangesContext)
}
