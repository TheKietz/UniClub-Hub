import api from '@/lib/axiosInstance'
import type {
  TaskItem, EventItem, SprintItem, PagedResult,
  TaskDependencyItem, AddDependencyDto,
  CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto,
  CreateEventDto, UpdateEventDto,
  CreateSprintDto, UpdateSprintDto,
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
