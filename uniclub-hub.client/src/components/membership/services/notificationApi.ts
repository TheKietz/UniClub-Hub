import api from '@/lib/axiosInstance'

export type NotificationType =
  | 'Task' | 'Event' | 'Application' | 'System'
  | 'TaskAssigned' | 'TaskStatusUpdated' | 'DeadlineReminder' | 'AssignmentReceived'

export interface NotificationItem {
  id: number
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  createdAt: string
  body?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: number | null
  navigationUrl?: string | null
}

export interface NotificationPagedResult {
  items: NotificationItem[]
  totalCount: number
  page: number
  pageSize: number
}

export const getNotifications = (page: number, pageSize = 20) =>
  api.get<{ data: NotificationPagedResult }>('/notifications', { params: { page, pageSize } })
    .then(r => r.data.data)

export const getNotificationUnreadCount = () =>
  api.get<{ data: { count: number } }>('/notifications/unread-count').then(r => r.data.data.count)

export const markAllNotificationsRead = () =>
  api.patch('/notifications/read-all')

export const markNotificationRead = (id: number) =>
  api.patch(`/notifications/${id}/read`)

export const deleteNotification = (id: number) =>
  api.delete(`/notifications/${id}`)
