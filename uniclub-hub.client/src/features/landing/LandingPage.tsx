import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  Award,
  ArrowRight,
  BarChart3,
  Shield,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PublicHeader from "@/components/layouts/PublicHeader";

const FEATURES = [
  {
    icon: Users,
    title: "Quản lý thành viên",
    desc: "Phân quyền linh hoạt theo vai trò: Quản lý CLB, Trưởng ban, Thành viên.",
  },
  {
    icon: Calendar,
    title: "Sự kiện & hoạt động",
    desc: "Theo dõi lịch sự kiện, nhiệm vụ nội bộ và tiến độ hoàn thành.",
  },
  {
    icon: Award,
    title: "Hệ thống KPI",
    desc: "Đánh giá mức độ đóng góp của từng thành viên qua điểm KPI minh bạch.",
  },
  {
    icon: BarChart3,
    title: "Báo cáo thống kê",
    desc: "Tổng quan hoạt động CLB theo tuần, tháng với biểu đồ trực quan.",
  },
  {
    icon: Shield,
    title: "Phân quyền RBAC",
    desc: "Kiểm soát quyền truy cập chi tiết ở cấp độ hệ thống và từng câu lạc bộ.",
  },
  {
    icon: Bell,
    title: "Thông báo realtime",
    desc: "Nhận thông báo tức thì khi có nhiệm vụ mới, đơn xét duyệt hoặc sự kiện.",
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      {/* Hero */}
      <section
        className="relative overflow-hidden flex-1 flex items-center justify-center py-24 px-6"
        style={{
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4c1d95 70%, #6d28d9 100%)",
        }}
      >
        {/* Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #a78bfa, transparent)",
            }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, #818cf8, transparent)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
            style={{
              background: "radial-gradient(circle, #c4b5fd, transparent)",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-purple-200 mb-8"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Hệ thống quản lý CLB sinh viên UEF
          </div>

          <h1
            className="text-5xl font-extrabold text-white mb-6 leading-tight"
            style={{ letterSpacing: "-1px" }}
          >
            Quản lý câu lạc bộ
            <br />
            <span style={{ color: "#c4b5fd" }}>thông minh hơn</span>
          </h1>

          <p className="text-purple-200 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
            Nền tảng số hóa toàn diện giúp các câu lạc bộ sinh viên quản lý
            thành viên, sự kiện và hoạt động nội bộ hiệu quả.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-base font-semibold text-indigo-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Vào hệ thống <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-base font-semibold text-indigo-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Đăng ký miễn phí <ArrowRight size={16} />
              </Link>
            )}
            <Link
              to="/clubs"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-base font-medium text-purple-200 hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Users size={16} /> Khám phá CLB
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Tính năng nổi bật
            </h2>
            <p className="text-gray-500">
              Mọi thứ bạn cần để điều hành câu lạc bộ sinh viên
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, #eef2ff, #ede9fe)",
                  }}
                >
                  <Icon size={18} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="py-16 px-6 bg-white text-center border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Bắt đầu ngay hôm nay
          </h2>
          <p className="text-gray-500 mb-8">
            Tạo tài khoản miễn phí và trải nghiệm toàn bộ tính năng.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 h-11 px-8 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            Tạo tài khoản <ArrowRight size={15} />
          </Link>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          © 2026 UniClub Hub · Đại học Kinh tế Tài chính TP.HCM
        </p>
      </footer>
    </div>
  );
}
