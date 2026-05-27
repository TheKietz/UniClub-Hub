import { Outlet } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'

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
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="member" />
      <main style={{ flex: 1, overflow: 'auto', background: '#f7f6f1' }}>
        <Outlet />
      </main>
    </div>
  )
}
