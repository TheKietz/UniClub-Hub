export type TaskStatus = 'Todo' | 'Doing' | 'Reviewing' | 'Done'
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
  status: TaskStatus
  isSystem: boolean
  taskCount?: number
}

export interface TaskItem {
  id: number
  clubId: number
  parentId?: number
  sprintId?: number
  eventId?: number
  eventName?: string
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
  assigneeIds?: string[]
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
  clubId: number | null   // null = sự kiện cấp trường
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
  summary?: string
  participantCount: number
  registrationLink?: string
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

// ── KPI ───────────────────────────────────────────────────────────────────────

export interface PersonalKpiData {
  userId: string
  fullName: string
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  activeTasks: number
  todoTasks: number
  doingTasks: number
  totalEstimatedHours?: number
  totalActualHours?: number
  completionRate: number
  onTimeRate: number
  productivityScore: number
  highPriorityTasks: number
  mediumPriorityTasks: number
  lowPriorityTasks: number
}

export interface DepartmentMemberKpiRow {
  userId: string
  fullName: string
  avatarUrl?: string
  totalTasks: number
  completedTasks: number
  activeTasks: number
  overdueTasks: number
  totalEstimatedHours?: number
  totalActualHours?: number
  completionRate: number
  onTimeRate: number
  productivityScore: number
}

export interface DepartmentKpiData {
  departmentId: number
  departmentName: string
  totalTasks: number
  completedTasks: number
  deptCompletionRate: number
  members: DepartmentMemberKpiRow[]
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
  summary?: string
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
  status?: TaskStatus
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

// ── Registration / Attendance ─────────────────────────────────────────────────

export type AttendanceStatus = 'Pending' | 'CheckedIn' | 'Absent'

export interface EventRegistrationItem {
  id: number
  eventId: number
  userId: string
  userName: string
  avatarUrl?: string
  email?: string
  studentId?: string
  registeredAt: string
  attendance: AttendanceStatus
  checkedInAt?: string
  note?: string
  /** Mã QR check-in (Base64 "{eventId}_{userId}") — chỉ có ở endpoint tự đăng ký / my-registration. */
  checkInCode?: string
}

export interface RegisterMemberForEventDto {
  userId: string
  note?: string
}

export interface EventAttachmentItem {
  id: number
  eventId: number
  uploadedBy: string
  uploaderName: string
  fileUrl: string
  fileName?: string
  contentType?: string
  fileSize?: number
  note?: string
  uploadedAt: string
}

export interface UpdateAttendanceDto {
  attendance: AttendanceStatus
  note?: string
}

// ── Event Club Assignments (briefs from SUPER_ADMIN to clubs) ────────────────

export type AssignmentStatus = 'Pending' | 'InProgress' | 'Done'

export interface AssignmentAttachment {
  url: string
  name: string
}

export interface AssignmentItem {
  id: number
  eventId: number
  eventName?: string
  clubId: number
  clubName?: string
  title: string
  description?: string
  priority: TaskPriority
  deadline?: string
  status: AssignmentStatus
  attachmentUrls: AssignmentAttachment[]
  createdBy?: string
  createdAt: string
}

// ── Intelligence (Features 1 & 3) ─────────────────────────────────────────────

export interface AssignmentSuggestion {
  userId: string
  fullName: string
  avatarUrl?: string
  suitabilityScore: number
  reason: string
  onTimeRate: number
  productivityScore: number
  currentWorkloadHours: number
}

export interface UrgentTaskItem {
  taskId: number
  title: string
  priority: TaskPriority
  status: TaskStatus
  deadline?: string
  assigneeName?: string
  dependentsWaiting: number
  hoursToDeadline: number
  urgencyIndex: number
  urgencyReason: string
}

export interface AtRiskTaskItem {
  taskId: number
  title: string
  assigneeName?: string
  deadline?: string
  progress: number
  expectedProgress: number
  daysRemaining: number
  priority: TaskPriority
  status: TaskStatus
}
