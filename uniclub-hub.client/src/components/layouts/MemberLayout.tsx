import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  User,
  History,
  ClipboardList,
  BarChart3,
  Layers,
  Home,
  LifeBuoy,
  Zap,
  Calendar,
  BarChart2,
  Activity,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "../shared/NotificationBell";
import UserMenu from "../shared/UserMenu";
import AppFooter from "../shared/AppFooter";
import { CLUB_ROLES, MEMBERSHIP_STATUS } from "@/types/auth";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-50 text-indigo-700"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
  }`;

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1">
      <p
        className="px-3 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "#9ca3af" }}
      >
        {label}
      </p>
    </div>
  );
}

export default function MemberLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const defaultClubId =
    user?.memberships.find((m) => m.status === "Active")?.clubId ?? 1;

  const managedClubs =
    user?.memberships.filter(
      (m) =>
        m.status === MEMBERSHIP_STATUS.ACTIVE &&
        m.clubRole === CLUB_ROLES.CLUB_ADMIN,
    ) ?? [];

  const ledDepts =
    user?.memberships.filter(
      (m) =>
        m.status === MEMBERSHIP_STATUS.ACTIVE &&
        m.clubRole === CLUB_ROLES.DEPT_LEAD &&
        m.departmentId,
    ) ?? [];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#f8fafc" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            U
          </div>
          <span className="font-semibold text-sm" style={{ color: "#111827" }}>
            UniClub Hub
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {/* Chính */}
          <NavLink to="/dashboard" end className={navCls}>
            <LayoutDashboard size={17} />
            Tổng quan
          </NavLink>

          <NavLink to="/profile" className={navCls}>
            <User size={17} />
            Hồ sơ cá nhân
          </NavLink>

          {/* Câu lạc bộ */}
          <SectionLabel label="Câu lạc bộ" />

          <NavLink to="/my-activity" className={navCls}>
            <Activity size={17} />
            Hoạt động của tôi
          </NavLink>

          <NavLink to="/my-history" className={navCls}>
            <History size={17} />
            Lịch sử thành viên
          </NavLink>

          {/* Cá nhân */}
          <SectionLabel label="Cá nhân" />

          <NavLink to="/my-tasks" className={navCls}>
            <ClipboardList size={17} />
            Task được giao
          </NavLink>

          <NavLink to="/my-kpi" className={navCls}>
            <BarChart3 size={17} />
            KPI của tôi
          </NavLink>

          <NavLink to="/support" className={navCls}>
            <LifeBuoy size={17} />
            Yêu cầu hỗ trợ
          </NavLink>

          {/* Vận hành */}
          <SectionLabel label="Vận hành" />

          {(user?.memberships ?? []).filter(
            (m) =>
              m.status === MEMBERSHIP_STATUS.ACTIVE &&
              m.clubRole === CLUB_ROLES.DEPT_LEAD,
          ).length > 0 && (
            <NavLink
              to={`/operations?clubId=${defaultClubId}`}
              end
              className={navCls}
            >
              <Zap size={17} />
              Tổng quan
            </NavLink>
          )}
          <NavLink to={`/kanban?clubId=${defaultClubId}`} className={navCls}>
            <LayoutDashboard size={17} />
            Kanban
          </NavLink>
          <NavLink to={`/sprints?clubId=${defaultClubId}`} className={navCls}>
            <Layers size={17} />
            Sprints
          </NavLink>
          <NavLink to={`/events?clubId=${defaultClubId}`} className={navCls}>
            <Calendar size={17} />
            Sự kiện
          </NavLink>
          {(user?.memberships ?? []).filter(
            (m) =>
              m.status === MEMBERSHIP_STATUS.ACTIVE &&
              m.clubRole === CLUB_ROLES.DEPT_LEAD,
          ).length > 0 && (
            <NavLink
              to={`/workload?clubId=${defaultClubId}`}
              className={navCls}
            >
              <BarChart2 size={17} />
              Phân công
            </NavLink>
          )}
          {(user?.memberships ?? []).filter(
            (m) =>
              m.status === MEMBERSHIP_STATUS.ACTIVE &&
              m.clubRole === CLUB_ROLES.DEPT_LEAD,
          ).length > 0 && (
            <NavLink to={`/gantt?clubId=${defaultClubId}`} className={navCls}>
              <Activity size={17} />
              Gantt
            </NavLink>
          )}
          <NavLink to={`/deadlines?clubId=${defaultClubId}`} className={navCls}>
            <AlertTriangle size={17} />
            Cảnh báo
          </NavLink>
          <NavLink to={`/calendar?clubId=${defaultClubId}`} className={navCls}>
            <Calendar size={17} />
            Lịch
          </NavLink>
          <NavLink to={`/activity?clubId=${defaultClubId}`} className={navCls}>
            <FileText size={17} />
            Nhật ký hoạt động
          </NavLink>

          {/* Ban mà user đang dẫn dắt (DEPT_LEAD) */}
          {ledDepts.length > 0 && <SectionLabel label="Ban của tôi" />}
          {ledDepts.map((m) => (
            <NavLink
              key={`${m.clubId}-${m.departmentId}`}
              to={`/clubs/${m.clubId}/departments/${m.departmentId}`}
              className={navCls}
            >
              <Layers size={17} />
              <span className="truncate">{m.departmentName ?? "Ban"}</span>
            </NavLink>
          ))}

          {/* CLB user đang quản lý (CLUB_ADMIN) */}
          {managedClubs.length > 0 && <SectionLabel label="Quản lý CLB" />}
          {managedClubs.map((m) => (
            <NavLink
              key={m.clubId}
              to={`/clubs/${m.clubId}/manage`}
              className={navCls}
            >
              <Users size={17} />
              <span className="truncate">{m.clubName}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 flex-shrink-0 space-y-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <Home size={17} /> Về trang chủ
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-end gap-2 px-6">
          <NotificationBell />
          <UserMenu />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
