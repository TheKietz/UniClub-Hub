import { useState, useEffect, useMemo } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
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
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "../shared/NotificationBell";
import UserMenu from "../shared/UserMenu";
import AppFooter from "../shared/AppFooter";
import ClubSwitcher from "../shared/ClubSwitcher";
import { CLUB_ROLES, MEMBERSHIP_STATUS } from "@/types/auth";

/* ─── Section label ─────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-4 pb-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
    </div>
  );
}

/* ─── Department sub-item ───────────────────────────────────────────── */
function SubNavItem({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [targetPath, targetQuery] = to.split("?");
  const targetDeptId =
    new URLSearchParams(targetQuery ?? "").get("departmentId");
  const currentDeptId = new URLSearchParams(location.search).get(
    "departmentId",
  );
  const isActive =
    location.pathname === targetPath && currentDeptId === targetDeptId;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
        isActive
          ? "bg-white/20 text-white"
          : "text-white/50 hover:bg-white/10 hover:text-white/90"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
          isActive ? "bg-white" : "bg-white/30"
        }`}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ─── Operations nav item (accordion) ───────────────────────────────── */
type OpsNavItemProps = {
  icon: LucideIcon;
  label: string;
  to: string;
  subs: { to: string; label: string }[];
  isOpen: boolean;
  onToggle: () => void;
};

function OpsNavItem({
  icon: Icon,
  label,
  to,
  subs,
  isOpen,
  onToggle,
}: OpsNavItemProps) {
  const location = useLocation();

  const isActive = location.pathname === to;
  const hasSubs = subs.length > 0;

  if (!hasSubs) {
    return (
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`
        }
      >
        <Icon size={17} className="shrink-0" />
        <span>{label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      {/* Parent row — entire row is a toggle, never navigates */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? "bg-white/15 text-white"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={17} className="shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Submenu — grid-rows animation for smooth height */}
      <div
        className={`grid transition-all duration-250 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-0.5 pb-1 space-y-0.5">
            {subs.map((sub) => (
              <SubNavItem key={sub.to} to={sub.to} label={sub.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MemberLayout ──────────────────────────────────────────────────── */
export default function MemberLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();

  const activeClubs =
    user?.memberships.filter((m) => m.status === MEMBERSHIP_STATUS.ACTIVE) ??
    [];

  const currentClubId = clubIdParam
    ? Number(clubIdParam)
    : (activeClubs[0]?.clubId ?? 1);

  const managedClubs =
    user?.memberships.filter(
      (m) =>
        m.status === MEMBERSHIP_STATUS.ACTIVE &&
        m.clubRole === CLUB_ROLES.CLUB_ADMIN,
    ) ?? [];

  const isDeptLead = (user?.memberships ?? []).some(
    (m) =>
      m.status === MEMBERSHIP_STATUS.ACTIVE &&
      m.clubRole === CLUB_ROLES.DEPT_LEAD,
  );

  /* Departments belonging to the current club */
  const currentClubDepts = useMemo(
    () =>
      (user?.memberships ?? []).filter(
        (m) =>
          m.clubId === currentClubId &&
          m.status === MEMBERSHIP_STATUS.ACTIVE &&
          m.departmentId != null,
      ),
    [user?.memberships, currentClubId],
  );

  /* Build sub-item list — only departments the user joined in this club */
  const deptSubs = (sub: string) =>
    currentClubDepts.map((m) => ({
      to: `/clubs/${currentClubId}/${sub}?departmentId=${m.departmentId}`,
      label: m.departmentName ?? `Ban ${m.departmentId}`,
    }));

  /* Accordion open state */
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Reset accordion when switching clubs */
  useEffect(() => {
    setOpenItems(new Set());
  }, [currentClubId]);

  /* Auto-expand the active operations section */
  useEffect(() => {
    const opsKeys = [
      "kanban",
      "sprints",
      "events",
      "workload",
      "gantt",
      "deadlines",
      "calendar",
      "activity",
    ];
    for (const key of opsKeys) {
      if (location.pathname.endsWith(`/${key}`)) {
        setOpenItems((prev) => new Set([...prev, key]));
        break;
      }
    }
  }, [location.pathname]);

  const club = (sub: string) => `/clubs/${currentClubId}/${sub}`;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: "#0A2540" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            U
          </div>
          <span className="font-bold text-sm text-white tracking-tight">
            UniClub Hub
          </span>
        </div>

        {/* Club Switcher */}
        <div className="px-3 pt-3 pb-1">
          <ClubSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {/* Chính */}
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <LayoutDashboard size={17} />
            Tổng quan
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <User size={17} />
            Hồ sơ cá nhân
          </NavLink>

          {/* Câu lạc bộ */}
          <SectionLabel label="Câu lạc bộ" />

          <NavLink
            to="/my-activity"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Activity size={17} />
            Hoạt động của tôi
          </NavLink>

          <NavLink
            to="/my-history"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <History size={17} />
            Lịch sử thành viên
          </NavLink>

          {/* Cá nhân */}
          <SectionLabel label="Cá nhân" />

          <NavLink
            to="/my-tasks"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <ClipboardList size={17} />
            Task được giao
          </NavLink>

          <NavLink
            to="/my-kpi"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <BarChart3 size={17} />
            KPI của tôi
          </NavLink>

          <NavLink
            to="/support"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <LifeBuoy size={17} />
            Yêu cầu hỗ trợ
          </NavLink>

          {/* Vận hành */}
          <SectionLabel label="Vận hành" />

          {isDeptLead && (
            <NavLink
              to={club("operations")}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Zap size={17} />
              Tổng quan
            </NavLink>
          )}

          <OpsNavItem
            icon={LayoutDashboard}
            label="Kanban"
            to={club("kanban")}
            subs={deptSubs("kanban")}
            isOpen={openItems.has("kanban")}
            onToggle={() => toggleItem("kanban")}
          />

          <OpsNavItem
            icon={Layers}
            label="Sprints"
            to={club("sprints")}
            subs={deptSubs("sprints")}
            isOpen={openItems.has("sprints")}
            onToggle={() => toggleItem("sprints")}
          />

          <OpsNavItem
            icon={Calendar}
            label="Sự kiện"
            to={club("events")}
            subs={deptSubs("events")}
            isOpen={openItems.has("events")}
            onToggle={() => toggleItem("events")}
          />

          {isDeptLead && (
            <OpsNavItem
              icon={BarChart2}
              label="Phân công"
              to={club("workload")}
              subs={deptSubs("workload")}
              isOpen={openItems.has("workload")}
              onToggle={() => toggleItem("workload")}
            />
          )}

          {isDeptLead && (
            <OpsNavItem
              icon={Activity}
              label="Gantt"
              to={club("gantt")}
              subs={deptSubs("gantt")}
              isOpen={openItems.has("gantt")}
              onToggle={() => toggleItem("gantt")}
            />
          )}

          <OpsNavItem
            icon={AlertTriangle}
            label="Cảnh báo"
            to={club("deadlines")}
            subs={deptSubs("deadlines")}
            isOpen={openItems.has("deadlines")}
            onToggle={() => toggleItem("deadlines")}
          />

          <OpsNavItem
            icon={Calendar}
            label="Lịch"
            to={club("calendar")}
            subs={deptSubs("calendar")}
            isOpen={openItems.has("calendar")}
            onToggle={() => toggleItem("calendar")}
          />

          <OpsNavItem
            icon={FileText}
            label="Nhật ký hoạt động"
            to={club("activity")}
            subs={deptSubs("activity")}
            isOpen={openItems.has("activity")}
            onToggle={() => toggleItem("activity")}
          />
          
          {/* CLB user đang quản lý (CLUB_ADMIN) */}
          {managedClubs.length > 0 && <SectionLabel label="Quản lý CLB" />}
          {managedClubs.map((m) => (
            <NavLink
              key={m.clubId}
              to={`/clubs/${m.clubId}/manage`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Users size={17} />
              <span className="truncate">{m.clubName}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
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
