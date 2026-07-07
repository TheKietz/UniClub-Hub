/** Mẫu notification.msg.* vẫn được backend đọc trực tiếp (không qua NotificationPreferences). */
export const ACTIVE_LEGACY_NOTIFICATION_SETTING_KEYS = [
  'notification.msg.support_new',
  'notification.msg.support_inprogress',
  'notification.msg.support_resolved',
  'notification.msg.dept_deleted',
] as const
