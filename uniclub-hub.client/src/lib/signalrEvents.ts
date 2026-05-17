export const SIGNALR_EVENTS = {
  TASK_STATUS_UPDATED: 'TaskStatusUpdated',
  TASK_CREATED:        'TaskCreated',
  TASK_DELETED:        'TaskDeleted',
} as const

export const HUB_METHODS = {
  JOIN_CLUB:  'JoinClub',
  LEAVE_CLUB: 'LeaveClub',
} as const
