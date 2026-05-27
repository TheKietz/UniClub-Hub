export type TaskStatus = 'Todo' | 'Doing' | 'Done'
export type TaskPriority = 'Low' | 'Medium' | 'High'
export type EventStatus = 'Draft' | 'InProgress' | 'Completed' | 'Cancelled'
export type SprintStatus = 'Planning' | 'Active' | 'Completed' | 'Cancelled'

export interface KanbanColumnItem {
  id: number
  clubId: number
  sprintId?: number
  departmentId?: number
  name: string
  color?: string
  sortOrder: number
  taskCount?: number
}

export interface TaskItem {
  id: number
  clubId: number
  parentId?: number
  sprintId?: number
  eventId?: number
  departmentId?: number
  title: string
  description?: string
  priority: TaskPriority
  startDate?: string
  deadline?: string
  estimatedHours?: number
  actualHours?: number
  status: TaskStatus
  kanbanColumnId?: number
  progress: number
  completedAt?: string
  assignedTo?: string
  assigneeName?: string
  createdBy?: string
  createdAt: string
  subTaskCount: number
  isBlocked: boolean
  blockingCount: number
}

export interface TaskAssigneeItem {
  id: number
  taskId: number
  userId: string
  fullName?: string
  email?: string
  avatarUrl?: string
  assignedAt: string
  assignedBy?: string
}

export interface AssignTaskDto {
  userId: string
}

export interface TaskCommentItem {
  id: number
  taskId: number
  userId: string
  userName: string
  userAvatarUrl?: string
  content: string
  createdAt: string
  updatedAt?: string
  isEdited: boolean
}

export interface TaskAttachmentItem {
  id: number
  taskId: number
  fileUrl: string
  fileName?: string
  contentType?: string
  fileSize?: number
  note?: string
  isLink: boolean
  uploadedAt: string
  userId: string
}

export interface TaskDependencyItem {
  dependsOnTaskId: number
  title: string
  status: TaskStatus
}

export interface EventSessionItem {
  id: number
  eventId: number
  title: string
  startTime: string
  endTime: string
  description?: string
  location?: string
  sortOrder: number
}

export interface EventStaffItem {
  id: number
  eventId: number
  userId: string
  userName: string
  avatarUrl?: string
  role: string
  assignedAt: string
}

export interface EventItem {
  id: number
  clubId: number
  name: string
  description?: string
  location?: string
  bannerUrl?: string
  startTime?: string
  endTime?: string
  maxParticipants?: number
  status: EventStatus
  budget?: number
  category?: string
  participantCount: number
  sessions: EventSessionItem[]
  staff: EventStaffItem[]
  createdAt: string
  createdBy?: string
}

export interface SprintItem {
  id: number
  clubId: number
  eventId?: number
  departmentId?: number
  name: string
  goal?: string
  startDate: string
  endDate: string
  status: SprintStatus
  createdAt: string
  taskCount: number
}

export interface AuditLogItem {
  id: number
  userId?: string
  userName: string
  userAvatarUrl?: string
  action: 'Create' | 'Update' | 'Delete'
  module: string
  entityId: string
  entityTitle?: string
  oldValue?: string
  newValue?: string
  timestamp: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateTaskDto {
  title: string
  description?: string
  priority: TaskPriority
  startDate?: string
  deadline?: string
  estimatedHours?: number
  assignedTo?: string
  eventId?: number
  sprintId?: number
  departmentId?: number
  parentId?: number
  kanbanColumnId?: number
}

export interface AddDependencyDto {
  dependsOnTaskId: number
}

export interface UpdateTaskDto extends CreateTaskDto {
  actualHours?: number
}

export interface UpdateTaskStatusDto {
  status: TaskStatus
  progress: number
  kanbanColumnId?: number
}

export interface CreateEventDto {
  name: string
  description?: string
  location?: string
  bannerUrl?: string
  startTime?: string
  endTime?: string
  maxParticipants?: number
  budget?: number
  category?: string
}

export interface UpdateEventDto extends CreateEventDto {
  status: EventStatus
}

export interface CreateEventSessionDto {
  title: string
  startTime: string
  endTime: string
  description?: string
  location?: string
  sortOrder?: number
}

export interface AssignEventStaffDto {
  userId: string
  role?: string
}

export interface CreateSprintDto {
  name: string
  goal?: string
  startDate: string
  endDate: string
  eventId?: number
  departmentId?: number
}

export interface UpdateSprintDto extends CreateSprintDto {
  status: SprintStatus
}

export interface CreateKanbanColumnDto {
  name: string
  color?: string
  sprintId?: number
  departmentId?: number
  sortOrder?: number
}

export interface UpdateKanbanColumnDto {
  name: string
  color?: string
  sortOrder: number
}

export interface CreateTaskCommentDto {
  content: string
}

export interface AddTaskAttachmentLinkDto {
  fileUrl: string
  note?: string
}
