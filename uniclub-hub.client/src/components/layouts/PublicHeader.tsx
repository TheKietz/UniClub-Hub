import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "../shared/UserMenu";

export default function PublicHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
        {/* Left — Logo */}
        <Link to="/" className="flex items-center gap-2.5 w-fit">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            U
          </div>
          <span className="font-semibold text-gray-900">UniClub Hub</span>
        </Link>

        {/* Center — Nav */}
        <nav className="flex items-center justify-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `h-9 px-4 rounded-lg text-sm font-medium flex items-center transition-colors ${
                isActive
                  ? "text-indigo-700 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`
            }
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/clubs"
            className={({ isActive }) =>
              `h-9 px-4 rounded-lg text-sm font-medium flex items-center transition-colors ${
                isActive
                  ? "text-indigo-700 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`
            }
          >
            Câu lạc bộ
          </NavLink>
        </nav>

        {/* Right — Auth */}
        <div className="flex items-center justify-end gap-1">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link
                to="/login"
                className="h-9 px-4 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="h-9 px-4 rounded-lg text-sm font-medium text-white flex items-center transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                }}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
