import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ClubProtectedRoute from "@/components/shared/ClubProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { CLUB_ROLES } from "@/types/auth";

import LandingPage from "@/features/landing/LandingPage";
import ContactPage from "@/features/contact/ContactPage";
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

import MemberDashboard from "@/components/membership/pages/MemberDashboard";
import ClubListPage from "@/components/membership/pages/ClubListPage";
import MyActivityPage from "@/components/membership/pages/MyActivityPage";
import SupportPage from "@/components/membership/pages/SupportPage";
import SupportAdminPage from "@/components/membership/pages/admin/SupportAdminPage";
import AdminResignationPage from "@/components/membership/pages/admin/AdminResignationPage";
import AdminAuditLogPage from "@/components/membership/pages/admin/AdminAuditLogPage";
import SystemSettingsPage from "@/components/membership/pages/admin/SystemSettingsPage";
import AdminNotificationPreferencePage from "@/components/membership/pages/admin/NotificationPreferencePage";
import ClubNotificationPreferencePage from "@/components/membership/pages/club/NotificationPreferencePage";
import ClubDetailPage from "@/components/membership/pages/ClubDetailPage";
import ProfilePage from "@/components/membership/pages/ProfilePage";
import MemberHistoryPage from "@/components/membership/pages/MemberHistoryPage";
import NotificationsPage from "@/components/membership/pages/NotificationsPage";

import MyTasksPage from "@/components/operations/pages/MyTasksPage";
import EventDetailPage from "@/components/operations/pages/EventDetailPage";
import ClubOperationsPage from "@/components/operations/pages/ClubOperationsPage";
import { TasksProvider } from "@/components/operations/context/TasksContext";

const Soon = ({ label }: { label: string }) => (
  <div className="p-8 text-xl font-semibold text-gray-500">
    {label} — Coming soon
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
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
              <Route path="/admin/support" element={<SupportAdminPage />} />
              <Route path="/admin/resignations" element={<AdminResignationPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
              <Route path="/admin/settings" element={<SystemSettingsPage />} />
              <Route path="/admin/notification-preferences" element={<AdminNotificationPreferencePage />} />
            </Route>
          </Route>

          {/* Public pages */}
          <Route path="/contact" element={<ContactPage />} />

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
              <Route path="/my-tasks" element={<TasksProvider clubId={0}><MyTasksPage /></TasksProvider>} />
              <Route path="/clubs/:clubId/operations" element={<ClubOperationsPage />} />
              <Route path="/clubs/:clubId/events/:id" element={<EventDetailPage />} />
              <Route path="/my-kpi" element={<Soon label="KPI của tôi" />} />
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
                  <ClubProtectedRoute requiredRoles={[CLUB_ROLES.CLUB_ADMIN]} />
                }
              >
                <Route element={<ClubManageLayout />}>
                  <Route path="manage" element={<ClubManageDashboard />} />
                  <Route path="manage/members" element={<MembersPage />} />
                  <Route path="manage/applications" element={<ApplicationsPage />} />
                  <Route path="manage/departments" element={<DepartmentsPage />} />
                  <Route path="manage/form" element={<FormSchemaPage />} />
                  <Route path="manage/member-fields" element={<MemberFieldsPage />} />
                  <Route path="manage/orgchart" element={<OrgChartPage />} />
                  <Route path="manage/pipeline" element={<PipelineSettingsPage />} />
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
    </BrowserRouter>
  );
}
