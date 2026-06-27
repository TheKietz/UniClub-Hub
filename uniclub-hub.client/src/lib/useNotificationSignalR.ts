import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createKanbanConnection } from './kanbanHub'
import { SIGNALR_EVENTS } from './signalrEvents'

export interface NotificationPayload {
  id: number
  title: string
  message: string
  type: string
  navigationUrl?: string | null
}

/**
 * Subscribes to per-user realtime notifications over the (reused) KanbanHub.
 * Server pushes to Clients.User(userId), so no club group join is needed.
 * Shows a short toast and invokes `onReceived` so the caller can refresh state.
 */
export function useNotificationSignalR(onReceived?: (payload: NotificationPayload) => void) {
  // Keep the latest callback without re-establishing the connection on every render.
  const cbRef = useRef(onReceived)
  cbRef.current = onReceived

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const conn = createKanbanConnection()

    conn.on(SIGNALR_EVENTS.NOTIFICATION_RECEIVED, (payload: NotificationPayload) => {
      if (payload?.title) toast(payload.title)
      cbRef.current?.(payload)
    })

    conn.start().catch(() => { /* token expired / offline — poll path still works */ })

    return () => {
      conn.off(SIGNALR_EVENTS.NOTIFICATION_RECEIVED)
      conn.stop().catch(() => {})  // safe to call in any connection state
    }
  }, [])
}
