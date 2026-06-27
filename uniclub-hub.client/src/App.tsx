import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ClubProtectedRoute from "@/components/shared/ClubProtectedRoute";
import PermissionProtectedRoute from "@/components/shared/PermissionProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { CLUB_ROLES } from "@/types/auth";
import { CLUB_PERMISSIONS } from "@/constants/clubPermissions";

import LandingPage from "@/features/landing/LandingPage";
import ContactPage from "@/features/contact/ContactPage";
import AboutPage from "@/features/about/AboutPage";
import NotFoundPage from "@/features/errors/NotFoundPage";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import ConfirmEmailPage from "@/features/auth/ConfirmEmailPage";
import CompleteProfilePage from "@/features/auth/CompleteProfilePage";

import AdminLayout from "@/components/layouts/AdminLayout";
import DashboardPage from "@/components/membership/pages/admin/DashboardPage";
import UsersPage from "@/components/membership/pages/admin/UsersPage";
import ClubsPage from "@/components/membership/pages/admin/ClubsPage";
import CategoriesPage from "@/components/membership/pages/admin/CategoriesPage";
import AdminStructurePage from "@/components/membership/pages/admin/AdminStructurePage";
import AdminPositionsPage from "@/components/membership/pages/admin/AdminPositionsPage";

import MemberLayout from "@/components/layouts/MemberLayout";
import ClubManageLayout from "@/components/layouts/ClubManageLayout";
import ClubManageDashboard from "@/components/membership/pages/club/ClubManageDashboard";
import MembersPage from "@/components/membership/pages/club/MembersPage";
import ApplicationsPage from "@/components/membership/pages/club/ApplicationsPage";
import DepartmentsPage from "@/components/membership/pages/club/DepartmentsPage";
import FormSchemaPage from "@/components/membership/pages/club/FormSchemaPage";
import MemberFieldsPage from "@/components/membership/pages/club/MemberFieldsPage";
import ClubSettingsPage from "@/components/membership/pages/club/ClubSettingsPage";
import ResignationPage from "@/components/membership/pages/club/ResignationPage";
import OrgChartPage from "@/components/membership/pages/club/OrgChartPage";
import AuditLogPage from "@/components/membership/pages/club/AuditLogPage";
import PipelineSettingsPage from "@/components/membership/pages/club/PipelineSettingsPage";
import PositionsPage from "@/components/membership/pages/club/PositionsPage";
import KpiConfigPage from "@/components/membership/pages/club/KpiConfigPage";
import KpiDashboardPage from "@/components/membership/pages/club/KpiDashboardPage";

import MemberDashboard from "@/components/membership/pages/MemberDashboard";
import ClubListPage from "@/components/membership/pages/ClubListPage";
import MyActivityPage from "@/components/membership/pages/MyActivityPage";
import SupportPage from "@/components/membership/pages/SupportPage";
import SupportAdminPage from "@/components/membership/pages/admin/SupportAdminPage";
import AdminResignationPage from "@/components/membership/pages/admin/AdminResignationPage";
import AdminAuditLogPage from "@/components/membership/pages/admin/AdminAuditLogPage";
import SystemSettingsPage from "@/components/membership/pages/admin/SystemSettingsPage";
import AdminNotificationPreferencePage from "@/components/membership/pages/admin/NotificationPreferencePage";
import AdminReportPage from "@/components/membership/pages/admin/AdminReportPage";
import ClubNotificationPreferencePage from "@/components/membership/pages/club/NotificationPreferencePage";
import ClubReportPage from "@/components/membership/pages/club/ClubReportPage";
import ClubDetailPage from "@/components/membership/pages/ClubDetailPage";
import ProfilePage from "@/components/membership/pages/ProfilePage";
import MemberHistoryPage from "@/components/membership/pages/MemberHistoryPage";
import NotificationsPage from "@/components/membership/pages/NotificationsPage";

import EventDetailPage from "@/components/operations/pages/EventDetailPage";
import EventListPage from "@/components/operations/pages/EventListPage";
import GanttPage from "@/components/operations/pages/GanttPage";
import CalendarPage from "@/components/operations/pages/CalendarPage";
import ClubOperationsPage from "@/components/operations/pages/ClubOperationsPage";
import UniversityEventsPage from "@/components/operations/pages/UniversityEventsPage";
import UniversityEventDetailPage from "@/components/operations/pages/UniversityEventDetailPage";
import InboxPage from "@/components/operations/pages/InboxPage";
import { TasksProvider } from "@/components/operations/context/TasksContext";

function WithTasksProvider({ children }: { children: React.ReactNode }) {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <TasksProvider clubId={Number(clubId ?? 0)}>
      {children}
    </TasksProvider>
  )
}

const Soon = ({ label }: { label: string }) => (
  <div className="p-8 text-xl font-semibold text-gray-500">
    {label} — Coming soon
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />

          {/* Complete profile — requires auth but not complete profile */}
          <Route element={<ProtectedRoute />}>
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
          </Route>

          {/* Admin — SUPER_ADMIN only */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/clubs" element={<ClubsPage />} />
              <Route path="/admin/structure" element={<AdminStructurePage />} />
              <Route path="/admin/categories" element={<CategoriesPage />} />
              <Route path="/admin/positions" element={<AdminPositionsPage />} />
              <Route path="/admin/support" element={<SupportAdminPage />} />
              <Route path="/admin/resignations" element={<AdminResignationPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
              <Route path="/admin/settings" element={<SystemSettingsPage />} />
              <Route path="/admin/notification-preferences" element={<AdminNotificationPreferencePage />} />
              <Route path="/admin/report" element={<AdminReportPage />} />
              <Route path="/admin/events" element={<UniversityEventsPage />} />
              <Route path="/admin/events/:id" element={<UniversityEventDetailPage />} />
            </Route>
          </Route>

          {/* Public pages */}
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Public club pages — không cần đăng nhập */}
          <Route path="/clubs" element={<ClubListPage />} />
          <Route path="/clubs/:clubId" element={<ClubDetailPage />} />

          {/* Member routes — sidebar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MemberLayout />}>
              <Route path="/dashboard" element={<MemberDashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/my-history" element={<MemberHistoryPage />} />
              <Route path="/my-activity" element={<MyActivityPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/clubs/:clubId/operations" element={<ClubOperationsPage />} />
              <Route path="/clubs/:clubId/events/:id" element={<EventDetailPage />} />
              <Route path="/events/university/:id" element={<UniversityEventDetailPage />} />
              <Route
                element={
                  <ClubProtectedRoute
                    requiredRoles={[CLUB_ROLES.CLUB_ADMIN, CLUB_ROLES.DEPT_LEAD]}
                  />
                }
              >
                <Route
                  path="/clubs/:clubId/departments/:deptId"
                  element={<Soon label="Department Detail" />}
                />
              </Route>
            </Route>
          </Route>

          {/* Club management — full-page layout riêng, không có MemberLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/clubs/:clubId">
              <Route
                element={
                  <ClubProtectedRoute
                    requiredRoles={[CLUB_ROLES.CLUB_ADMIN, CLUB_ROLES.DEPT_LEAD]}
                  />
                }
              >
                <Route
                  element={
                    <PermissionProtectedRoute
                      anyOf={[
                        CLUB_PERMISSIONS.ORG_CHART_VIEW,
                        CLUB_PERMISSIONS.ORG_CHART_MANAGE,
                        CLUB_PERMISSIONS.POSITIONS_MANAGE,
                        CLUB_PERMISSIONS.POSITION_ASSIGNMENTS_MANAGE,
                      ]}
                    />
                  }
                >
                  <Route element={<ClubManageLayout />}>
                    <Route path="manage/positions" element={<PositionsPage />} />
                  </Route>
                </Route>
              </Route>
              {/* Members — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute
                    anyOf={[CLUB_PERMISSIONS.MEMBERS_VIEW, CLUB_PERMISSIONS.MEMBERS_MANAGE]}
                  />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/members" element={<MembersPage />} />
                </Route>
              </Route>

              {/* Applications — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute
                    anyOf={[CLUB_PERMISSIONS.APPLICATIONS_VIEW, CLUB_PERMISSIONS.APPLICATIONS_REVIEW]}
                  />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/applications" element={<ApplicationsPage />} />
                </Route>
              </Route>

              {/* Departments — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.DEPARTMENTS_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/departments" element={<DepartmentsPage />} />
                </Route>
              </Route>

              {/* Pipeline — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.RECRUITMENT_PIPELINE_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/pipeline" element={<PipelineSettingsPage />} />
                </Route>
              </Route>

              {/* Form schema — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.RECRUITMENT_FORM_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/form" element={<FormSchemaPage />} />
                  <Route path="manage/member-fields" element={<MemberFieldsPage />} />
                </Route>
              </Route>

              {/* Org chart manage — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.ORG_CHART_VIEW, CLUB_PERMISSIONS.ORG_CHART_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/orgchart" element={<OrgChartPage />} />
                </Route>
              </Route>

              {/* Resignations — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute
                    anyOf={[CLUB_PERMISSIONS.RESIGNATIONS_VIEW, CLUB_PERMISSIONS.RESIGNATIONS_REVIEW]}
                  />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/resignations" element={<ResignationPage />} />
                </Route>
              </Route>

              {/* Notification preferences — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.NOTIFICATION_SETTINGS_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/notifications" element={<ClubNotificationPreferencePage />} />
                </Route>
              </Route>

              {/* Club settings — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.CLUB_SETTINGS_MANAGE, CLUB_PERMISSIONS.CLUB_PROFILE_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/settings" element={<ClubSettingsPage />} />
                </Route>
              </Route>

              {/* Audit log — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.CLUB_AUDIT_LOG_VIEW]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/audit-log" element={<AuditLogPage />} />
                </Route>
              </Route>

              {/* KPI results — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.MEMBER_KPI_VIEW, CLUB_PERMISSIONS.MEMBER_KPI_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/kpi" element={<KpiDashboardPage />} />
                </Route>
              </Route>

              {/* KPI config — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.MEMBER_KPI_MANAGE]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/kpi/config" element={<KpiConfigPage />} />
                </Route>
              </Route>

              {/* Club reports — permission-based */}
              <Route
                element={
                  <PermissionProtectedRoute anyOf={[CLUB_PERMISSIONS.REPORTS_VIEW, CLUB_PERMISSIONS.REPORTS_EXPORT]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage/report" element={<ClubReportPage />} />
                </Route>
              </Route>

              {/* Dashboard & operations — chỉ CLUB_ADMIN */}
              <Route
                element={
                  <ClubProtectedRoute requiredRoles={[CLUB_ROLES.CLUB_ADMIN]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage" element={<ClubManageDashboard />} />
                  <Route path="manage/orgchart" element={<OrgChartPage />} />
                  <Route path="manage/pipeline" element={<PipelineSettingsPage />} />
                  <Route path="manage/events" element={<EventListPage />} />
                  <Route path="manage/events/:id" element={<EventDetailPage />} />
                  <Route path="manage/inbox" element={<InboxPage />} />
                  <Route path="manage/gantt" element={<WithTasksProvider><GanttPage /></WithTasksProvider>} />
                  <Route path="manage/calendar" element={<WithTasksProvider><CalendarPage /></WithTasksProvider>} />
                  <Route path="manage/audit-log" element={<AuditLogPage />} />
                  <Route path="manage/notifications" element={<ClubNotificationPreferencePage />} />
                  <Route path="manage/resignations" element={<ResignationPage />} />
                  <Route path="manage/settings" element={<ClubSettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
