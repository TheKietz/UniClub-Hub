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

import AdminLayout from "@/layouts/SuperAdminLayout";
import DashboardPage from "@/modules/membership/pages/admin/DashboardPage";
import UsersPage from "@/modules/membership/pages/admin/UsersPage";
import ClubsPage from "@/modules/membership/pages/admin/ClubsPage";
import CategoriesPage from "@/modules/membership/pages/admin/CategoriesPage";
import AdminStructurePage from "@/modules/membership/pages/admin/AdminStructurePage";

import MemberLayout from "@/layouts/MemberLayout";
import ClubManageLayout from "@/layouts/ClubAdminLayout";
import ClubManageDashboard from "@/modules/membership/pages/club/ClubManageDashboard";
import MembersPage from "@/modules/membership/pages/club/MembersPage";
import ApplicationsPage from "@/modules/membership/pages/club/ApplicationsPage";
import DepartmentsPage from "@/modules/membership/pages/club/DepartmentsPage";
import FormSchemaPage from "@/modules/membership/pages/club/FormSchemaPage";
import ClubSettingsPage from "@/modules/membership/pages/club/ClubSettingsPage";
import ResignationPage from "@/modules/membership/pages/club/ResignationPage";
import OrgChartPage from "@/modules/membership/pages/club/OrgChartPage";

import MemberDashboard from "@/modules/membership/pages/MemberDashboard";
import ClubListPage from "@/modules/membership/pages/ClubListPage";
import MyActivityPage from "@/modules/membership/pages/MyActivityPage";
import SupportPage from "@/modules/membership/pages/SupportPage";
import SupportAdminPage from "@/modules/membership/pages/admin/SupportAdminPage";
import AdminResignationPage from "@/modules/membership/pages/admin/AdminResignationPage";

import KanbanPage from "@/modules/operations/pages/KanbanPage";
import MyTasksPage from "@/modules/operations/pages/MyTasksPage";
import EventListPage from "@/modules/operations/pages/EventListPage";
import WorkloadPage from "@/modules/operations/pages/WorkloadPage";
import GanttPage from "@/modules/operations/pages/GanttPage";
import DeadlinePage from "@/modules/operations/pages/DeadlinePage";
import SprintsPage from "@/modules/operations/pages/SprintsPage";
import OperationsDashboard from "@/modules/operations/pages/OperationsDashboard";
import ClubDetailPage from "@/modules/membership/pages/ClubDetailPage";
import ProfilePage from "@/modules/membership/pages/ProfilePage";
import MemberHistoryPage from "@/modules/membership/pages/MemberHistoryPage";

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
              <Route path="/my-history" element={<MemberHistoryPage />} />
              <Route path="/my-activity" element={<MyActivityPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/operations" element={<OperationsDashboard />} />
              <Route path="/operations/kanban" element={<KanbanPage />} />
              <Route path="/operations/sprints" element={<SprintsPage />} />
              <Route path="/operations/events" element={<EventListPage />} />
              <Route path="/operations/workload" element={<WorkloadPage />} />
              <Route path="/operations/gantt" element={<GanttPage />} />
              <Route path="/operations/deadlines" element={<DeadlinePage />} />
              <Route path="/my-kpi" element={<Soon label="KPI của tôi" />} />
              <Route
                element={
                  <ClubProtectedRoute
                    requiredRoles={[
                      CLUB_ROLES.CLUB_ADMIN,
                      CLUB_ROLES.DEPT_LEAD,
                    ]}
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
                  <Route
                    path="manage/applications"
                    element={<ApplicationsPage />}
                  />
                  <Route
                    path="manage/departments"
                    element={<DepartmentsPage />}
                  />
                  <Route path="manage/form" element={<FormSchemaPage />} />
                  <Route path="manage/orgchart" element={<OrgChartPage />} />
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
