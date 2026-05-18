import api from '@/lib/axiosInstance'
import type {
  TaskItem, EventItem, EventSessionItem, EventStaffItem, SprintItem, PagedResult,
  TaskDependencyItem, AddDependencyDto,
  CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto,
  CreateEventDto, UpdateEventDto, CreateEventSessionDto, AssignEventStaffDto,
  CreateSprintDto, UpdateSprintDto,
  AuditLogItem,
} from './operations.types'

type ApiResponse<T> = { data: T; success: boolean; message: string }

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getTasks = (params: {
  clubId: number; status?: string; sprintId?: number; eventId?: number;
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

// ── Events ────────────────────────────────────────────────────────────────────

export const getEvents = (params: {
  clubId: number; status?: string; page?: number; pageSize?: number
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

// ── Sprints ───────────────────────────────────────────────────────────────────

export const getSprints = (params: {
  clubId: number; eventId?: number; page?: number; pageSize?: number
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
