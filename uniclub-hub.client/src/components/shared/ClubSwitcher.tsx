import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ChevronDown, Building2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MEMBERSHIP_STATUS } from "@/types/auth";

const ROLE_LABEL: Record<string, string> = {
  CLUB_ADMIN: "Quản lý CLB",
  DEPT_LEAD: "Trưởng ban",
  MEMBER: "Thành viên",
};

export default function ClubSwitcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeClubs =
    user?.memberships.filter((m) => m.status === MEMBERSHIP_STATUS.ACTIVE) ??
    [];

  const currentClubId = clubIdParam
    ? Number(clubIdParam)
    : (activeClubs[0]?.clubId ?? 1);

  const currentClub =
    activeClubs.find((m) => m.clubId === currentClubId) ?? activeClubs[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (activeClubs.length === 0) return null;

  const switchClub = (newClubId: number) => {
    setOpen(false);
    if (newClubId === currentClubId) return;
    if (clubIdParam) {
      const newPath = location.pathname.replace(
        `/clubs/${clubIdParam}/`,
        `/clubs/${newClubId}/`,
      );
      navigate(newPath);
    } else {
      navigate(`/clubs/${newClubId}/kanban`);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-left border border-white/10"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
          {currentClub?.clubName?.[0] ?? <Building2 size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 leading-none mb-0.5">
            CLB đang xem
          </p>
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {currentClub?.clubName ?? "—"}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-white/40 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && activeClubs.length > 1 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl shadow-2xl overflow-hidden border border-white/10"
          style={{ background: "#0d2d4a" }}
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 border-b border-white/10">
            Chuyển câu lạc bộ
          </p>
          {activeClubs.map((m) => (
            <button
              key={m.clubId}
              type="button"
              onClick={() => switchClub(m.clubId)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                m.clubId === currentClubId
                  ? "bg-white/10"
                  : "hover:bg-white/10"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {m.clubName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {m.clubName}
                </p>
                <p className="text-[11px] text-white/40">
                  {ROLE_LABEL[m.clubRole] ?? m.clubRole}
                </p>
              </div>
              {m.clubId === currentClubId && (
                <Check size={14} className="text-indigo-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
