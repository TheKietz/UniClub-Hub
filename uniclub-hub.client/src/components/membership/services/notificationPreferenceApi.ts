import api from '@/lib/axiosInstance'

export interface NotificationPreferenceItem {
  triggerKey: string
  triggerLabel: string
  triggerCategory: string
  recipientRole: string
  recipientRoleLabel: string
  inAppEnabled: boolean
  emailEnabled: boolean
  inAppTemplate?: string
  emailSubject?: string
  emailTemplate?: string
  isOverride?: boolean
}

export interface UpdateNotificationPreferenceRequest {
  inAppEnabled: boolean
  emailEnabled: boolean
  inAppTemplate?: string
  emailSubject?: string
  emailTemplate?: string
}

const BASE = '/membership/notification-preferences'

// ── Super Admin — global defaults ──────────────────────────────────────────

export const getGlobalPreferences = (): Promise<NotificationPreferenceItem[]> =>
  api.get<NotificationPreferenceItem[]>(BASE).then(r => r.data)

export const updateGlobalPreference = (
  triggerKey: string,
  recipientRole: string,
  dto: UpdateNotificationPreferenceRequest,
) => api.put(`${BASE}/${encodeURIComponent(triggerKey)}/${encodeURIComponent(recipientRole)}`, dto)

// ── Club Admin — per-club overrides ────────────────────────────────────────

export const getClubPreferences = (clubId: number): Promise<NotificationPreferenceItem[]> =>
  api.get<NotificationPreferenceItem[]>(`/membership/clubs/${clubId}/notification-preferences`)
    .then(r => r.data)

export const updateClubPreference = (
  clubId: number,
  triggerKey: string,
  recipientRole: string,
  dto: UpdateNotificationPreferenceRequest,
) => api.put(
  `/membership/clubs/${clubId}/notification-preferences/${encodeURIComponent(triggerKey)}/${encodeURIComponent(recipientRole)}`,
  dto,
)

export const resetClubPreference = (
  clubId: number,
  triggerKey: string,
  recipientRole: string,
) => api.delete(
  `/membership/clubs/${clubId}/notification-preferences/${encodeURIComponent(triggerKey)}/${encodeURIComponent(recipientRole)}`,
)
