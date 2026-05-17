## Milestone 1: Operations Foundation

[x] Database: Migration AddTaskDependencyAndSprint applied.

[x] Step 1: Events CRUD
[x] Create Event DTOs (EventDto, CreateEventDto, UpdateEventDto)
[x] Implement IEventService & EventService
[x] Build EventsController — route: api/v1/operations/events

[x] Step 2: Tasks CRUD
[x] Create Task DTOs including UpdateTaskStatusDto
[x] Implement ITaskService with status update + CompletedAt logic
[x] Build TasksController with PATCH /{id}/status endpoint

[x] Step 3: Sprints CRUD
[x] Implement lightweight Sprint management (ClubId + optional EventId)
[x] Build SprintsController — route: api/v1/operations/sprints

[x] Step 4: Frontend Kanban
[x] Define TypeScript types (operations.types.ts)
[x] Build operationsApi.ts service
[x] Build KanbanPage, KanbanColumn, TaskCard, TaskModal
[x] Build EventListPage (CRUD with status filter)
[x] Wire routes: /operations/kanban, /operations/events

## Milestone 2: Advanced Features
[x] Integrate SignalR for real-time Kanban updates
[x] Implement TaskDependencies validation logic (block status if dependency not Done)
[x] Add drag-and-drop (@hello-pangea/dnd) to Kanban
[x] Sprint board view filtered by sprint
[x] Workload distribution chart
[x] Gantt chart for events
[x] Deadline prediction / overdue alerts

## Milestone 3: UX Completion & Feature Enhancement
[x] Add Operations navigation section to MemberLayout sidebar
[x] Add assignedTo + parentId filters to task backend (ITaskService, TaskService, TasksController)
[x] Fix /my-tasks to show only logged-in user's assigned tasks (MyTasksPage)
[x] Sprint Management page — full CRUD at /operations/sprints
[x] Sub-tasks in TaskModal — create/view sub-tasks inline
[x] Operations Dashboard at /operations — task summary, active sprint, upcoming events, quick nav
