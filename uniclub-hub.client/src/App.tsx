import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ClubProtectedRoute from "@/components/shared/ClubProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { CLUB_ROLES } from "@/types/auth";

import LandingPage from "@/features/landing/LandingPage";
import NotFoundPage from "@/features/errors/NotFoundPage";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import CompleteProfilePage from "@/features/auth/CompleteProfilePage";

import AdminLayout from "@/components/membership/pages/admin/AdminLayout";
import DashboardPage from "@/components/membership/pages/admin/DashboardPage";
import UsersPage from "@/components/membership/pages/admin/UsersPage";
import ClubsPage from "@/components/membership/pages/admin/ClubsPage";
import CategoriesPage from "@/components/membership/pages/admin/CategoriesPage";
import AdminStructurePage from "@/components/membership/pages/admin/AdminStructurePage";

import MemberLayout from "@/components/membership/layout/MemberLayout";
import ClubManageLayout from "@/components/membership/pages/club/ClubManageLayout";
import ClubManageDashboard from "@/components/membership/pages/club/ClubManageDashboard";
import MembersPage from "@/components/membership/pages/club/MembersPage";
import ApplicationsPage from "@/components/membership/pages/club/ApplicationsPage";
import DepartmentsPage from "@/components/membership/pages/club/DepartmentsPage";
import FormSchemaPage from "@/components/membership/pages/club/FormSchemaPage";
import ClubSettingsPage from "@/components/membership/pages/club/ClubSettingsPage";

import MemberDashboard from "@/components/membership/pages/MemberDashboard";
import ClubListPage from "@/components/membership/pages/ClubListPage";

import KanbanPage from "@/components/operations/pages/KanbanPage";
import MyTasksPage from "@/components/operations/pages/MyTasksPage";
import EventListPage from "@/components/operations/pages/EventListPage";
import WorkloadPage from "@/components/operations/pages/WorkloadPage";
import GanttPage from "@/components/operations/pages/GanttPage";
import DeadlinePage from "@/components/operations/pages/DeadlinePage";
import SprintsPage from "@/components/operations/pages/SprintsPage";
import OperationsDashboard from "@/components/operations/pages/OperationsDashboard";
import ClubDetailPage from "@/components/membership/pages/ClubDetailPage";
import ProfilePage from "@/components/membership/pages/ProfilePage";
import MemberHistoryPage from "@/components/membership/pages/MemberHistoryPage";

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
            </Route>
          </Route>

          {/* Public club pages — không cần đăng nhập */}
          <Route path="/clubs" element={<ClubListPage />} />
          <Route path="/clubs/:clubId" element={<ClubDetailPage />} />

          {/* Member routes — sidebar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MemberLayout />}>
              <Route path="/dashboard" element={<MemberDashboard />} />
              <Route path="/clubs" element={<ClubListPage />} />
              <Route
                path="/clubs/:clubId"
                element={<Soon label="Club Detail" />}
              />
              <Route path="/profile" element={<Soon label="Hồ sơ cá nhân" />} />
              <Route
                path="/my-history"
                element={<Soon label="Lịch sử hoạt động" />}
              />
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
                  <Route
                    path="manage/settings"
                    element={<ClubSettingsPage />}
                  />
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
