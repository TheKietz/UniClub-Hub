import api from '@/lib/axiosInstance'
import type {
  TaskItem, EventItem, EventSessionItem, EventStaffItem, SprintItem, PagedResult,
  TaskDependencyItem, AddDependencyDto,
  CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto,
  CreateEventDto, UpdateEventDto, CreateEventSessionDto, AssignEventStaffDto,
  CreateSprintDto, UpdateSprintDto,
  AuditLogItem,
  KanbanColumnItem, CreateKanbanColumnDto, UpdateKanbanColumnDto,
  TaskCommentItem, CreateTaskCommentDto,
  TaskAttachmentItem, AddTaskAttachmentLinkDto,
  TaskAssigneeItem, AssignTaskDto,
  PersonalKpiData, DepartmentKpiData,
  EventRegistrationItem, RegisterMemberForEventDto, UpdateAttendanceDto,
  EventAttachmentItem,
} from './operations.types'

type ApiResponse<T> = { data: T; success: boolean; message: string }

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getTasks = (params: {
  clubId: number; departmentId?: number; status?: string; sprintId?: number; eventId?: number;
  assignedTo?: string; parentId?: number;
  page?: number; pageSize?: number
}) =>
  api.get<ApiResponse<PagedResult<TaskItem>>>('/v1/operations/tasks', { params }).then(r => r.data.data)

export const getTaskById = (id: number) =>
  api.get<ApiResponse<TaskItem>>(`/v1/operations/tasks/${id}`).then(r => r.data.data)

export const createTask = (clubId: number, dto: CreateTaskDto) =>
  api.post<ApiResponse<TaskItem>>(`/v1/operations/tasks?clubId=${clubId}`, dto).then(r => r.data.data)

export const updateTask = (id: number, dto: UpdateTaskDto) =>
  api.put<ApiResponse<TaskItem>>(`/v1/operations/tasks/${id}`, dto).then(r => r.data.data)

export const updateTaskStatus = (id: number, dto: UpdateTaskStatusDto) =>
  api.patch<ApiResponse<TaskItem>>(`/v1/operations/tasks/${id}/status`, dto).then(r => r.data.data)

export const deleteTask = (id: number) =>
  api.delete(`/v1/operations/tasks/${id}`)

export const getTaskDependencies = (taskId: number) =>
  api.get<ApiResponse<TaskDependencyItem[]>>(`/v1/operations/tasks/${taskId}/dependencies`).then(r => r.data.data)

export const addDependency = (taskId: number, dto: AddDependencyDto) =>
  api.post(`/v1/operations/tasks/${taskId}/dependencies`, dto)

export const removeDependency = (taskId: number, dependsOnTaskId: number) =>
  api.delete(`/v1/operations/tasks/${taskId}/dependencies/${dependsOnTaskId}`)

// ── Task Comments ─────────────────────────────────────────────────────────────

export const getTaskComments = (taskId: number) =>
  api.get<ApiResponse<TaskCommentItem[]>>(`/v1/operations/tasks/${taskId}/comments`).then(r => r.data.data)

export const addTaskComment = (taskId: number, dto: CreateTaskCommentDto) =>
  api.post<ApiResponse<TaskCommentItem>>(`/v1/operations/tasks/${taskId}/comments`, dto).then(r => r.data.data)

export const updateTaskComment = (taskId: number, commentId: number, content: string) =>
  api.put<ApiResponse<TaskCommentItem>>(`/v1/operations/tasks/${taskId}/comments/${commentId}`, { content }).then(r => r.data.data)

export const deleteTaskComment = (taskId: number, commentId: number) =>
  api.delete(`/v1/operations/tasks/${taskId}/comments/${commentId}`)

// ── Task Attachments ──────────────────────────────────────────────────────────

export const getTaskAttachments = (taskId: number) =>
  api.get<ApiResponse<TaskAttachmentItem[]>>(`/v1/operations/tasks/${taskId}/attachments`).then(r => r.data.data)

export const addTaskAttachmentLink = (taskId: number, dto: AddTaskAttachmentLinkDto) =>
  api.post<ApiResponse<TaskAttachmentItem>>(`/v1/operations/tasks/${taskId}/attachments/link`, dto).then(r => r.data.data)

export const uploadTaskAttachmentFile = (taskId: number, file: File, note?: string) => {
  const form = new FormData()
  form.append('file', file)
  if (note) form.append('note', note)
  return api.post<ApiResponse<TaskAttachmentItem>>(`/v1/operations/tasks/${taskId}/attachments/file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data)
}

export const deleteTaskAttachment = (taskId: number, attachmentId: number) =>
  api.delete(`/v1/operations/tasks/${taskId}/attachments/${attachmentId}`)

// ── Task Assignees ────────────────────────────────────────────────────────────

export const getTaskAssignees = (taskId: number) =>
  api.get<ApiResponse<TaskAssigneeItem[]>>(`/v1/operations/tasks/${taskId}/assignees`).then(r => r.data.data)

export const assignTask = (taskId: number, dto: AssignTaskDto) =>
  api.post<ApiResponse<TaskAssigneeItem>>(`/v1/operations/tasks/${taskId}/assignees`, dto).then(r => r.data.data)

export const unassignTask = (taskId: number, userId: string) =>
  api.delete(`/v1/operations/tasks/${taskId}/assignees/${userId}`)

// ── Kanban Columns ────────────────────────────────────────────────────────────

export const getKanbanColumns = (clubId: number, sprintId?: number, departmentId?: number) =>
  api.get<ApiResponse<KanbanColumnItem[]>>('/v1/operations/kanban-columns', { params: { clubId, sprintId, departmentId } }).then(r => r.data.data)

export const createKanbanColumn = (clubId: number, dto: CreateKanbanColumnDto) =>
  api.post<ApiResponse<KanbanColumnItem>>(`/v1/operations/kanban-columns?clubId=${clubId}`, dto).then(r => r.data.data)

export const updateKanbanColumn = (id: number, dto: UpdateKanbanColumnDto) =>
  api.put<ApiResponse<KanbanColumnItem>>(`/v1/operations/kanban-columns/${id}`, dto).then(r => r.data.data)

export const deleteKanbanColumn = (id: number) =>
  api.delete(`/v1/operations/kanban-columns/${id}`)

export const reorderKanbanColumns = (clubId: number, orderedIds: number[]) =>
  api.patch(`/v1/operations/kanban-columns/reorder?clubId=${clubId}`, { orderedIds })

// ── Events ────────────────────────────────────────────────────────────────────

export const getEvents = (params: {
  clubId: number; status?: string; search?: string; page?: number; pageSize?: number
}) =>
  api.get<ApiResponse<PagedResult<EventItem>>>('/v1/operations/events', { params }).then(r => r.data.data)

export const getEventById = (id: number) =>
  api.get<ApiResponse<EventItem>>(`/v1/operations/events/${id}`).then(r => r.data.data)

export const createEvent = (clubId: number, dto: CreateEventDto) =>
  api.post<ApiResponse<EventItem>>(`/v1/operations/events?clubId=${clubId}`, dto).then(r => r.data.data)

export const updateEvent = (id: number, dto: UpdateEventDto) =>
  api.put<ApiResponse<EventItem>>(`/v1/operations/events/${id}`, dto).then(r => r.data.data)

export const deleteEvent = (id: number) =>
  api.delete(`/v1/operations/events/${id}`)

export const getEventSessions = (eventId: number) =>
  api.get<ApiResponse<EventSessionItem[]>>(`/v1/operations/events/${eventId}/sessions`).then(r => r.data.data)

export const addEventSession = (eventId: number, dto: CreateEventSessionDto) =>
  api.post<ApiResponse<EventSessionItem>>(`/v1/operations/events/${eventId}/sessions`, dto).then(r => r.data.data)

export const deleteEventSession = (eventId: number, sessionId: number) =>
  api.delete(`/v1/operations/events/${eventId}/sessions/${sessionId}`)

export const reorderEventSessions = (eventId: number, orderedIds: number[]) =>
  api.patch(`/v1/operations/events/${eventId}/sessions/reorder`, { orderedIds })

export const getEventStaff = (eventId: number) =>
  api.get<ApiResponse<EventStaffItem[]>>(`/v1/operations/events/${eventId}/staff`).then(r => r.data.data)

export const assignEventStaff = (eventId: number, dto: AssignEventStaffDto) =>
  api.post<ApiResponse<EventStaffItem>>(`/v1/operations/events/${eventId}/staff`, dto).then(r => r.data.data)

export const removeEventStaff = (eventId: number, userId: string) =>
  api.delete(`/v1/operations/events/${eventId}/staff/${userId}`)

// ── Event Registrations ───────────────────────────────────────────────────────

export const getEventRegistrations = (eventId: number) =>
  api.get<ApiResponse<EventRegistrationItem[]>>(`/v1/operations/events/${eventId}/registrations`).then(r => r.data.data)

export const registerEventMember = (eventId: number, dto: RegisterMemberForEventDto) =>
  api.post<ApiResponse<EventRegistrationItem>>(`/v1/operations/events/${eventId}/registrations`, dto).then(r => r.data.data)

export const removeEventRegistration = (eventId: number, userId: string) =>
  api.delete(`/v1/operations/events/${eventId}/registrations/${userId}`)

export const updateEventAttendance = (eventId: number, userId: string, dto: UpdateAttendanceDto) =>
  api.patch(`/v1/operations/events/${eventId}/registrations/${userId}/attendance`, dto)

export const getEventAttachments = (eventId: number) =>
  api.get<ApiResponse<EventAttachmentItem[]>>(`/v1/operations/events/${eventId}/attachments`).then(r => r.data.data)

export const uploadEventAttachment = (eventId: number, file: File, note?: string) => {
  const form = new FormData()
  form.append('file', file)
  if (note) form.append('note', note)
  return api.post<ApiResponse<EventAttachmentItem>>(`/v1/operations/events/${eventId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data)
}

export const deleteEventAttachment = (eventId: number, attachmentId: number) =>
  api.delete(`/v1/operations/events/${eventId}/attachments/${attachmentId}`)

// ── Sprints ───────────────────────────────────────────────────────────────────

export const getSprints = (params: {
  clubId: number; departmentId?: number; eventId?: number; page?: number; pageSize?: number
}) =>
  api.get<ApiResponse<PagedResult<SprintItem>>>('/v1/operations/sprints', { params }).then(r => r.data.data)

export const createSprint = (clubId: number, dto: CreateSprintDto) =>
  api.post<ApiResponse<SprintItem>>(`/v1/operations/sprints?clubId=${clubId}`, dto).then(r => r.data.data)

export const updateSprint = (id: number, dto: UpdateSprintDto) =>
  api.put<ApiResponse<SprintItem>>(`/v1/operations/sprints/${id}`, dto).then(r => r.data.data)

export const deleteSprint = (id: number) =>
  api.delete(`/v1/operations/sprints/${id}`)

// ── Audit Logs ────────────────────────────────────────────────────────────────

export const getAuditLogs = (params: {
  clubId: number; module?: string; page?: number; pageSize?: number
}) =>
  api.get<ApiResponse<PagedResult<AuditLogItem>>>('/v1/operations/audit-logs', { params }).then(r => r.data.data)

// ── KPI ───────────────────────────────────────────────────────────────────────

export const getPersonalKpi = (params: {
  clubId: number; departmentId?: number; sprintId?: number
}) =>
  api.get<ApiResponse<PersonalKpiData>>('/v1/operations/kpi/me', { params }).then(r => r.data.data)

export const getDepartmentKpi = (departmentId: number, params: {
  clubId: number; sprintId?: number
}) =>
  api.get<ApiResponse<DepartmentKpiData>>(`/v1/operations/kpi/departments/${departmentId}`, { params }).then(r => r.data.data)
