export const SIGNALR_EVENTS = {
  TASK_STATUS_UPDATED:  'TaskStatusUpdated',
  TASK_CREATED:         'TaskCreated',
  TASK_DELETED:         'TaskDeleted',
  EVENT_TASKS_CLEANED:  'EventTasksCleaned',  // fired after cascade soft-delete
  NOTIFICATION_RECEIVED: 'NotificationReceived',  // per-user in-app notification
} as const

export const HUB_METHODS = {
  JOIN_CLUB:  'JoinClub',
  LEAVE_CLUB: 'LeaveClub',
} as const
