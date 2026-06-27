# File Tree: UniClub-Hub

**Generated:** 6/25/2026, 7:51:28 PM
**Root Path:** `d:\Web-core\UniClub-Hub`

```

├── 📁 UniClub-Hub.Operations
│   ├── 📁 DTOs
│   │   ├── 📁 Assignment
│   │   │   └── 📄 AssignmentDto.cs
│   │   ├── 📁 AuditLog
│   │   │   └── 📄 AuditLogDto.cs
│   │   ├── 📁 Event
│   │   │   ├── 📄 CreateEventDto.cs
│   │   │   ├── 📄 EventAttachmentDto.cs
│   │   │   ├── 📄 EventDto.cs
│   │   │   ├── 📄 EventRegistrationDto.cs
│   │   │   ├── 📄 EventSessionDto.cs
│   │   │   ├── 📄 EventStaffDto.cs
│   │   │   ├── 📄 RegisterMemberDto.cs
│   │   │   ├── 📄 UpdateAttendanceDto.cs
│   │   │   └── 📄 UpdateEventDto.cs
│   │   ├── 📁 Intelligence
│   │   │   ├── 📄 AssignmentSuggestionResponse.cs
│   │   │   └── 📄 UrgentTaskResponse.cs
│   │   ├── 📁 Kanban
│   │   │   └── 📄 KanbanColumnDto.cs
│   │   ├── 📁 Kpi
│   │   │   ├── 📄 DepartmentKpiResponse.cs
│   │   │   ├── 📄 DepartmentMemberKpiRow.cs
│   │   │   └── 📄 PersonalKpiResponse.cs
│   │   ├── 📁 Sprint
│   │   │   ├── 📄 CreateSprintDto.cs
│   │   │   ├── 📄 SprintDto.cs
│   │   │   └── 📄 UpdateSprintDto.cs
│   │   └── 📁 Task
│   │       ├── 📄 AddDependencyDto.cs
│   │       ├── 📄 CreateTaskDto.cs
│   │       ├── 📄 TaskAssigneeDto.cs
│   │       ├── 📄 TaskAttachmentDto.cs
│   │       ├── 📄 TaskCommentDto.cs
│   │       ├── 📄 TaskDependencyDto.cs
│   │       ├── 📄 TaskDto.cs
│   │       ├── 📄 UpdateTaskDto.cs
│   │       └── 📄 UpdateTaskStatusDto.cs
│   ├── 📁 Services
│   │   ├── 📁 Implements
│   │   │   ├── 📄 AuditLogService.cs
│   │   │   ├── 📄 EventAssignmentService.cs
│   │   │   ├── 📄 EventService.cs
│   │   │   ├── 📄 KanbanColumnService.cs
│   │   │   ├── 📄 KpiService.cs
│   │   │   ├── 📄 SprintService.cs
│   │   │   ├── 📄 TaskAssigneeService.cs
│   │   │   ├── 📄 TaskAttachmentService.cs
│   │   │   ├── 📄 TaskCommentService.cs
│   │   │   ├── 📄 TaskIntelligenceService.cs
│   │   │   ├── 📄 TaskService.cs
│   │   │   └── 📝 readme.md
│   │   └── 📁 Interfaces
│   │       ├── 📄 IAuditLogService.cs
│   │       ├── 📄 IEventAssignmentService.cs
│   │       ├── 📄 IEventService.cs
│   │       ├── 📄 IKanbanColumnService.cs
│   │       ├── 📄 IKpiService.cs
│   │       ├── 📄 ISprintService.cs
│   │       ├── 📄 ITaskAssigneeService.cs
│   │       ├── 📄 ITaskAttachmentService.cs
│   │       ├── 📄 ITaskCommentService.cs
│   │       ├── 📄 ITaskIntelligenceService.cs
│   │       ├── 📄 ITaskService.cs
│   │       └── 📝 readme.md
│   ├── 📄 DependencyInjection.cs
│   └── 📄 UniClub-Hub.Operations.csproj
├── 📁 UniClub-Hub.Server
│   ├── 📁 Controllers
│   │   ├── 📁 Admin
│   │   │   ├── 📄 AdminCategoriesController.cs
│   │   │   ├── 📄 AdminClubsController.cs
│   │   │   ├── 📄 AdminDepartmentsController.cs
│   │   │   ├── 📄 AdminUsersController.cs
│   │   │   └── 📄 SystemSettingsController.cs
│   │   ├── 📁 Membership
│   │   │   ├── 📄 AdminImportController.cs
│   │   │   ├── 📄 ApplicationsController.cs
│   │   │   ├── 📄 AuthController.cs
│   │   │   ├── 📄 CategoriesController.cs
│   │   │   ├── 📄 ClubAuditLogsController.cs
│   │   │   ├── 📄 ClubMembershipsController.cs
│   │   │   ├── 📄 ClubPermissionsController.cs
│   │   │   ├── 📄 ClubPositionsController.cs
│   │   │   ├── 📄 ClubsController.cs
│   │   │   ├── 📄 Controller.cs
│   │   │   ├── 📄 DepartmentsController.cs
│   │   │   ├── 📄 ExportController.cs
│   │   │   ├── 📄 ImportController.cs
│   │   │   ├── 📄 KpiController.cs
│   │   │   ├── 📄 NotificationPreferencesController.cs
│   │   │   ├── 📄 NotificationsController.cs
│   │   │   ├── 📄 PipelineController.cs
│   │   │   ├── 📄 ResignationRequestsController.cs
│   │   │   ├── 📄 StatsController.cs
│   │   │   ├── 📄 SupportController.cs
│   │   │   ├── 📄 UploadsController.cs
│   │   │   └── 📄 UsersController.cs
│   │   ├── 📁 Operations
│   │   │   ├── 📄 AuditLogsController.cs
│   │   │   ├── 📄 Controller.cs
│   │   │   ├── 📄 EventAssignmentsController.cs
│   │   │   ├── 📄 EventsController.cs
│   │   │   ├── 📄 KanbanColumnsController.cs
│   │   │   ├── 📄 KpiController.cs
│   │   │   ├── 📄 SprintsController.cs
│   │   │   ├── 📄 TaskAssigneesController.cs
│   │   │   └── 📄 TasksController.cs
│   │   └── 📁 Portal
│   │       └── 📄 Controller.cs
│   ├── 📁 Data
│   │   └── 📄 DbSeeder.cs
│   ├── 📁 Hubs
│   │   └── 📄 KanbanHub.cs
│   ├── 📁 Properties
│   │   └── ⚙️ launchSettings.json
│   ├── 📝 CHANGELOG.md
│   ├── 📄 Program.cs
│   ├── 📄 UniClub-Hub.API.csproj
│   ├── 📄 UniClub-Hub.Server.http
│   ├── 📄 appsettings.Development.json.example
│   └── 📄 appsettings.Production.json.example
├── 📁 UniClub-Hub.Shared
│   ├── 📁 AI
│   │   ├── 📄 GeminiAiModelClient.cs
│   │   ├── 📄 GeminiOptions.cs
│   │   └── 📄 IAiModelClient.cs
│   ├── 📁 Common
│   │   ├── 📁 Storage
│   │   │   ├── 📄 CloudinaryStorageService.cs
│   │   │   └── 📄 IFileStorageService.cs
│   │   ├── 📄 ApiResponse.cs
│   │   ├── 📄 AppConstants.cs
│   │   ├── 📄 IAuditable.cs
│   │   ├── 📄 ISoftDeletable.cs
│   │   └── 📄 PagedResult.cs
│   ├── 📁 Configurations
│   │   ├── 📄 AuditLogConfiguration.cs
│   │   ├── 📄 ClubApplicationConfiguration.cs
│   │   ├── 📄 ClubConfiguration.cs
│   │   ├── 📄 ClubEventConfiguration.cs
│   │   ├── 📄 ClubMemberPositionConfiguration.cs
│   │   ├── 📄 ClubMembershipConfiguration.cs
│   │   ├── 📄 ClubPositionConfiguration.cs
│   │   ├── 📄 ClubPositionPermissionConfiguration.cs
│   │   ├── 📄 ClubTaskConfiguration.cs
│   │   ├── 📄 ContributionConfiguration.cs
│   │   ├── 📄 DepartmentConfiguration.cs
│   │   ├── 📄 EventRegistrationConfiguration.cs
│   │   ├── 📄 KpiConfigConfiguration.cs
│   │   ├── 📄 KpiCriteriaConfiguration.cs
│   │   ├── 📄 KpiGradeConfigConfiguration.cs
│   │   ├── 📄 MediaGalleryConfiguration.cs
│   │   ├── 📄 NotificationConfiguration.cs
│   │   ├── 📄 PostConfiguration.cs
│   │   └── 📄 SprintConfiguration.cs
│   ├── 📁 Constants
│   │   ├── 📄 ClubPermissions.cs
│   │   ├── 📄 NotificationTriggers.cs
│   │   └── 📄 SignalREvents.cs
│   ├── 📁 Data
│   │   └── 📄 UniClubDbContext.cs
│   ├── 📁 Email
│   │   ├── 📄 EmailTemplates.cs
│   │   ├── 📄 IEmailService.cs
│   │   ├── 📄 SendGridEmailService.cs
│   │   └── 📄 SmtpEmailService.cs
│   ├── 📁 Enums
│   │   ├── 📄 ActivityType.cs
│   │   ├── 📄 ApplicationStatus.cs
│   │   ├── 📄 AttendanceStatus.cs
│   │   ├── 📄 AuditAction.cs
│   │   ├── 📄 ClubRole.cs
│   │   ├── 📄 ClubStatus.cs
│   │   ├── 📄 EventStatus.cs
│   │   ├── 📄 KpiMetricKey.cs
│   │   ├── 📄 MediaType.cs
│   │   ├── 📄 MembershipStatus.cs
│   │   ├── 📄 NotificationType.cs
│   │   ├── 📄 PostCategory.cs
│   │   ├── 📄 ResignationPreference.cs
│   │   ├── 📄 ResignationStatus.cs
│   │   ├── 📄 SprintStatus.cs
│   │   ├── 📄 TaskPriority.cs
│   │   └── 📄 TaskStatus.cs
│   ├── 📁 Migrations
│   │   └── 📄 UniClubDbContextModelSnapshot.cs
│   ├── 📁 Models
│   │   ├── 📄 ApplicationUser.cs
│   │   ├── 📄 AuditLog.cs
│   │   ├── 📄 Category.cs
│   │   ├── 📄 Club.cs
│   │   ├── 📄 ClubApplication.cs
│   │   ├── 📄 ClubEvent.cs
│   │   ├── 📄 ClubMemberPosition.cs
│   │   ├── 📄 ClubMembership.cs
│   │   ├── 📄 ClubPipelineStage.cs
│   │   ├── 📄 ClubPosition.cs
│   │   ├── 📄 ClubPositionPermission.cs
│   │   ├── 📄 ClubTask.cs
│   │   ├── 📄 Contribution.cs
│   │   ├── 📄 Department.cs
│   │   ├── 📄 EventAttachment.cs
│   │   ├── 📄 EventClubAssignment.cs
│   │   ├── 📄 EventRegistration.cs
│   │   ├── 📄 EventSession.cs
│   │   ├── 📄 EventStaff.cs
│   │   ├── 📄 KanbanColumn.cs
│   │   ├── 📄 KpiConfig.cs
│   │   ├── 📄 KpiCriteria.cs
│   │   ├── 📄 KpiGradeConfig.cs
│   │   ├── 📄 LandingPage.cs
│   │   ├── 📄 MediaGallery.cs
│   │   ├── 📄 Notification.cs
│   │   ├── 📄 NotificationPreference.cs
│   │   ├── 📄 Post.cs
│   │   ├── 📄 RefreshToken.cs
│   │   ├── 📄 ResignationRequest.cs
│   │   ├── 📄 Sprint.cs
│   │   ├── 📄 SupportTicket.cs
│   │   ├── 📄 SystemSetting.cs
│   │   ├── 📄 TaskAssignees.cs
│   │   ├── 📄 TaskAttachment.cs
│   │   ├── 📄 TaskComment.cs
│   │   └── 📄 TaskDependency.cs
│   └── 📄 UniClub-Hub.Shared.csproj

├── 📁 uniclub-hub.client
│   ├── 📁 public
│   │   ├── 🖼️ favicon.svg
│   │   └── 🖼️ icons.svg
│   ├── 📁 src
│   │   ├── 📁 assets
│   │   │   ├── 🖼️ hero.png
│   │   │   ├── 🖼️ react.svg
│   │   │   └── 🖼️ vite.svg
│   │   ├── 📁 components
│   │   │   ├── 📁 layouts
│   │   │   │   ├── 📄 AdminLayout.tsx
│   │   │   │   ├── 📄 ClubManageLayout.tsx
│   │   │   │   ├── 📄 DashboardSidebar.tsx
│   │   │   │   ├── 📄 MemberLayout.tsx
│   │   │   │   └── 📄 PublicHeader.tsx
│   │   │   ├── 📁 membership
│   │   │   │   ├── 📁 pages
│   │   │   │   │   ├── 📁 admin
│   │   │   │   │   │   ├── 📄 AdminAuditLogPage.tsx
│   │   │   │   │   │   ├── 📄 AdminPositionsPage.tsx
│   │   │   │   │   │   ├── 📄 AdminReportPage.tsx
│   │   │   │   │   │   ├── 📄 AdminResignationPage.tsx
│   │   │   │   │   │   ├── 📄 AdminStructurePage.tsx
│   │   │   │   │   │   ├── 📄 CategoriesPage.tsx
│   │   │   │   │   │   ├── 📄 ClubsPage.tsx
│   │   │   │   │   │   ├── 📄 DashboardPage.tsx
│   │   │   │   │   │   ├── 📄 NotificationPreferencePage.tsx
│   │   │   │   │   │   ├── 📄 SliderItemsEditor.tsx
│   │   │   │   │   │   ├── 📄 SupportAdminPage.tsx
│   │   │   │   │   │   ├── 📄 SystemSettingsPage.tsx
│   │   │   │   │   │   └── 📄 UsersPage.tsx
│   │   │   │   │   ├── 📁 club
│   │   │   │   │   │   ├── 📄 ApplicationsPage.tsx
│   │   │   │   │   │   ├── 📄 AuditLogPage.tsx
│   │   │   │   │   │   ├── 📄 ClubManageDashboard.tsx
│   │   │   │   │   │   ├── 📄 ClubReportPage.tsx
│   │   │   │   │   │   ├── 📄 ClubSettingsPage.tsx
│   │   │   │   │   │   ├── 📄 DepartmentsPage.tsx
│   │   │   │   │   │   ├── 📄 FormSchemaPage.tsx
│   │   │   │   │   │   ├── 📄 KpiConfigPage.tsx
│   │   │   │   │   │   ├── 📄 KpiDashboardPage.tsx
│   │   │   │   │   │   ├── 📄 MemberFieldsPage.tsx
│   │   │   │   │   │   ├── 📄 MembersPage.tsx
│   │   │   │   │   │   ├── 📄 NotificationPreferencePage.tsx
│   │   │   │   │   │   ├── 📄 OrgChartPage.tsx
│   │   │   │   │   │   ├── 📄 PipelineSettingsPage.tsx
│   │   │   │   │   │   ├── 📄 PositionsPage.tsx
│   │   │   │   │   │   └── 📄 ResignationPage.tsx
│   │   │   │   │   ├── 📁 shared
│   │   │   │   │   │   └── 📄 PositionManagementPanel.tsx
│   │   │   │   │   ├── 📄 ClubDetailPage.tsx
│   │   │   │   │   ├── 📄 ClubListPage.tsx
│   │   │   │   │   ├── 📄 MemberDashboard.tsx
│   │   │   │   │   ├── 📄 MemberHistoryPage.tsx
│   │   │   │   │   ├── 📄 MyActivityPage.tsx
│   │   │   │   │   ├── 📄 MyKpiPage.tsx
│   │   │   │   │   ├── 📄 NotificationsPage.tsx
│   │   │   │   │   ├── 📄 ProfilePage.tsx
│   │   │   │   │   └── 📄 SupportPage.tsx
│   │   │   │   └── 📁 services
│   │   │   │       ├── 📄 admin.types.ts
│   │   │   │       ├── 📄 adminApi.ts
│   │   │   │       ├── 📄 club.types.ts
│   │   │   │       ├── 📄 clubApi.ts
│   │   │   │       ├── 📄 kpiApi.ts
│   │   │   │       ├── 📄 notificationApi.ts
│   │   │   │       ├── 📄 notificationPreferenceApi.ts
│   │   │   │       └── 📄 userApi.ts
│   │   │   ├── 📁 operations
│   │   │   │   ├── 📁 components
│   │   │   │   │   ├── 📁 event
│   │   │   │   │   │   ├── 📄 EventAttachmentsSection.tsx
│   │   │   │   │   │   └── 📄 EventDeptTasksBoard.tsx
│   │   │   │   │   ├── 📁 gantt
│   │   │   │   │   ├── 📁 kanban
│   │   │   │   │   │   ├── 📄 KanbanColumn.tsx
│   │   │   │   │   │   └── 📄 TaskCard.tsx
│   │   │   │   │   ├── 📁 sprint
│   │   │   │   │   │   ├── 📄 AddSprintCard.tsx
│   │   │   │   │   │   ├── 📄 CompleteSprintModal.tsx
│   │   │   │   │   │   ├── 📄 CreateSprintModal.tsx
│   │   │   │   │   │   ├── 📄 SprintCard.tsx
│   │   │   │   │   │   └── 📄 StartSprintModal.tsx
│   │   │   │   │   ├── 📁 task
│   │   │   │   │   │   ├── 📄 TaskDetailModal.tsx
│   │   │   │   │   │   └── 📄 TaskModal.tsx
│   │   │   │   │   └── 📄 StatCard.tsx
│   │   │   │   ├── 📁 context
│   │   │   │   │   └── 📄 TasksContext.tsx
│   │   │   │   ├── 📁 pages
│   │   │   │   │   ├── 📄 ActivityLogPage.tsx
│   │   │   │   │   ├── 📄 CalendarPage.tsx
│   │   │   │   │   ├── 📄 ClubOperationsPage.tsx
│   │   │   │   │   ├── 📄 DeadlinePage.tsx
│   │   │   │   │   ├── 📄 EventDetailPage.tsx
│   │   │   │   │   ├── 📄 EventListPage.tsx
│   │   │   │   │   ├── 📄 GanttPage.tsx
│   │   │   │   │   ├── 📄 InboxPage.tsx
│   │   │   │   │   ├── 📄 KanbanPage.tsx
│   │   │   │   │   ├── 📄 KpiPage.tsx
│   │   │   │   │   ├── 📄 MyTasksPage.tsx
│   │   │   │   │   ├── 📄 OperationsDashboard.tsx
│   │   │   │   │   ├── 📄 SprintsPage.tsx
│   │   │   │   │   ├── 📄 UniversityEventDetailPage.tsx
│   │   │   │   │   ├── 📄 UniversityEventsPage.tsx
│   │   │   │   │   ├── 📄 WorkloadPage.tsx
│   │   │   │   │   └── 🎨 gantt.css
│   │   │   │   └── 📁 services
│   │   │   │       ├── 📄 mockData.ts
│   │   │   │       ├── 📄 operations.types.ts
│   │   │   │       └── 📄 operationsApi.ts
│   │   │   ├── 📁 portal
│   │   │   │   └── 📝 readme.md
│   │   │   ├── 📁 public
│   │   │   │   ├── 📄 LandingSkeleton.tsx
│   │   │   │   ├── 📄 SkyBackground.tsx
│   │   │   │   ├── 📄 clubCardMapper.ts
│   │   │   │   └── 📄 publicComponents.tsx
│   │   │   ├── 📁 shared
│   │   │   │   ├── 📄 AppFooter.tsx
│   │   │   │   ├── 📄 AvatarGroup.tsx
│   │   │   │   ├── 📄 ClubProtectedRoute.tsx
│   │   │   │   ├── 📄 ClubSwitcher.tsx
│   │   │   │   ├── 📄 DashboardCharts.tsx
│   │   │   │   ├── 📄 EmptyState.tsx
│   │   │   │   ├── 📄 FilterBar.tsx
│   │   │   │   ├── 📄 FilterSelect.tsx
│   │   │   │   ├── 📄 LoadMoreBar.tsx
│   │   │   │   ├── 📄 MajorSelect.tsx
│   │   │   │   ├── 📄 NotificationBell.tsx
│   │   │   │   ├── 📄 PageHeader.tsx
│   │   │   │   ├── 📄 PermissionProtectedRoute.tsx
│   │   │   │   ├── 📄 ProgressBar.tsx
│   │   │   │   ├── 📄 ProtectedRoute.tsx
│   │   │   │   ├── 📄 Skeleton.tsx
│   │   │   │   ├── 📄 StatusBadge.tsx
│   │   │   │   ├── 📄 ThemeSwitcher.tsx
│   │   │   │   ├── 📄 Tooltip.tsx
│   │   │   │   ├── 📄 UserMenu.tsx
│   │   │   │   ├── 📄 UserSearchCombobox.tsx
│   │   │   │   └── 📝 readme.md
│   │   │   └── 📁 ui
│   │   │       ├── 📄 alert-dialog.tsx
│   │   │       ├── 📄 badge.tsx
│   │   │       ├── 📄 button.tsx
│   │   │       ├── 📄 card.tsx
│   │   │       ├── 📄 dialog.tsx
│   │   │       ├── 📄 dropdown-menu.tsx
│   │   │       ├── 📄 input.tsx
│   │   │       ├── 📄 label.tsx
│   │   │       ├── 📄 sonner.tsx
│   │   │       └── 📄 table.tsx
│   │   ├── 📁 constants
│   │   │   └── 📄 clubPermissions.ts
│   │   ├── 📁 contexts
│   │   │   ├── 📄 AuthContext.tsx
│   │   │   └── 📄 ThemeContext.tsx
│   │   ├── 📁 features
│   │   │   ├── 📁 auth
│   │   │   │   ├── 📄 AuthShell.tsx
│   │   │   │   ├── 📄 CompleteProfilePage.tsx
│   │   │   │   ├── 📄 ConfirmEmailPage.tsx
│   │   │   │   ├── 📄 ForgotPasswordPage.tsx
│   │   │   │   ├── 📄 LoginPage.tsx
│   │   │   │   ├── 📄 RegisterPage.tsx
│   │   │   │   └── 📄 ResetPasswordPage.tsx
│   │   │   ├── 📁 contact
│   │   │   │   └── 📄 ContactPage.tsx
│   │   │   ├── 📁 errors
│   │   │   │   ├── 📄 ForbiddenPage.tsx
│   │   │   │   └── 📄 NotFoundPage.tsx
│   │   │   └── 📁 landing
│   │   │       └── 📄 LandingPage.tsx
│   │   ├── 📁 lib
│   │   │   ├── 📄 axiosInstance.ts
│   │   │   ├── 📄 kanbanHub.ts
│   │   │   ├── 📄 majors.ts
│   │   │   ├── 📄 pdfExport.ts
│   │   │   ├── 📄 signalrEvents.ts
│   │   │   └── 📄 utils.ts
│   │   ├── 📁 types
│   │   │   └── 📄 auth.ts
│   │   ├── 🎨 App.css
│   │   ├── 📄 App.tsx
│   │   ├── 🎨 index.css
│   │   └── 📄 main.tsx
│   ├── 📝 CHANGELOG.md
│   ├── ⚙️ components.json
│   ├── 📄 eslint.config.js
│   ├── 🌐 index.html
│   ├── ⚙️ package-lock.json
│   ├── ⚙️ package.json
│   ├── ⚙️ tsconfig.app.json
│   ├── ⚙️ tsconfig.json
│   ├── ⚙️ tsconfig.node.json
│   ├── 📄 uniclub-hub.client.esproj
│   └── 📄 vite.config.ts
├── 📄 UniClub-Hub.sln
├── 📝 project-description.md
├── ⚙️ skills-lock.json
```

---
*Generated by FileTree Pro Extension*