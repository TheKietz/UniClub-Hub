import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ClubProtectedRoute from '@/components/shared/ClubProtectedRoute'
import { Toaster } from '@/components/ui/sonner'
import { CLUB_ROLES } from '@/types/auth'

import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'

import AdminLayout from '@/features/membership/admin/AdminLayout'
import DashboardPage from '@/features/membership/admin/DashboardPage'
import UsersPage from '@/features/membership/admin/UsersPage'
import ClubsPage from '@/features/membership/admin/ClubsPage'
import CategoriesPage from '@/features/membership/admin/CategoriesPage'

import ClubManageLayout from '@/features/membership/club/ClubManageLayout'
import ClubManageDashboard from '@/features/membership/club/ClubManageDashboard'
import MembersPage from '@/features/membership/club/MembersPage'
import ApplicationsPage from '@/features/membership/club/ApplicationsPage'
import DepartmentsPage from '@/features/membership/club/DepartmentsPage'
import FormSchemaPage from '@/features/membership/club/FormSchemaPage'

import MemberDashboard from '@/features/membership/MemberDashboard'
import ClubListPage from '@/features/membership/ClubListPage'

function RootRedirect() {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={isSuperAdmin ? '/admin' : '/dashboard'} replace />
}

const Soon = ({ label }: { label: string }) => (
  <div className="p-8 text-xl font-semibold text-gray-500">{label} — Coming soon</div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin — SUPER_ADMIN only */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/clubs" element={<ClubsPage />} />
              <Route path="/admin/categories" element={<CategoriesPage />} />
            </Route>
          </Route>

          {/* Authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/clubs" element={<ClubListPage />} />

            {/* Club routes */}
            <Route path="/clubs/:clubId">
              <Route index element={<Soon label="Club Detail" />} />

              {/* Club management — CLUB_ADMIN hoặc SUPER_ADMIN */}
              <Route element={<ClubProtectedRoute requiredRoles={[CLUB_ROLES.CLUB_ADMIN]} />}>
                <Route element={<ClubManageLayout />}>
                  <Route path="manage" element={<ClubManageDashboard />} />
                  <Route path="manage/members" element={<MembersPage />} />
                  <Route path="manage/applications" element={<ApplicationsPage />} />
                  <Route path="manage/departments" element={<DepartmentsPage />} />
                  <Route path="manage/form" element={<FormSchemaPage />} />
                </Route>
              </Route>

              {/* Department detail — DEPT_LEAD, DEPT_DEPUTY, CLUB_ADMIN */}
              <Route element={<ClubProtectedRoute requiredRoles={[CLUB_ROLES.CLUB_ADMIN, CLUB_ROLES.DEPT_LEAD, CLUB_ROLES.DEPT_DEPUTY]} />}>
                <Route path="departments/:deptId" element={<Soon label="Department Detail" />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}
