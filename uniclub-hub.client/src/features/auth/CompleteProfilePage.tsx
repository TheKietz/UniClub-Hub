import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Hash, Phone, CheckCircle2 } from "lucide-react";
import MajorSelect from "@/components/shared/MajorSelect";
import { toast } from "sonner";

type F = {
  fullName: string;
  studentId: string;
  major: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
};
type Errs = Partial<Record<"fullName" | "studentId" | "major", string>>;

const GENDER_OPTIONS = ["Nam", "Nữ", "Khác", "Không muốn nêu"];

const CHECKLIST = [
  "Xác nhận danh tính sinh viên UEF",
  "Tham gia và quản lý câu lạc bộ",
  "Nhận thông báo sự kiện & nhiệm vụ",
];

export default function CompleteProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<F>({
    fullName: user?.fullName ?? "",
    studentId: user?.studentId ?? "",
    major: user?.major ?? "",
    phone: user?.phone ?? "",
    gender: user?.gender ?? "",
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
  });
  const [errs, setErrs] = useState<Errs>({});
  const [loading, setLoading] = useState(false);

  function validate(v: F): Errs {
    const e: Errs = {};
    if (!v.fullName.trim()) e.fullName = "Vui lòng nhập họ và tên.";
    if (!v.studentId.trim()) e.studentId = "Vui lòng nhập mã số sinh viên.";
    if (!v.major.trim()) e.major = "Vui lòng chọn ngành.";
    return e;
  }

  function onChange(field: keyof F) {
    return (e: { target: { value: string } }) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (field in errs && errs[field as keyof Errs])
        setErrs((prev) => ({ ...prev, [field]: "" }));
    };
  }

  function onBlur(field: "fullName" | "studentId" | "major") {
    const fieldErr = validate(form)[field];
    setErrs((prev) => ({ ...prev, [field]: fieldErr ?? "" }));
  }

  function inputCls(field: keyof Errs, extra = "") {
    return `${extra}${errs[field] ? " border-red-400 focus-visible:ring-red-300" : ""}`;
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const fieldErrs = validate(form);
    if (Object.keys(fieldErrs).length > 0) {
      setErrs(fieldErrs);
      return;
    }

    setLoading(true);
    try {
      await api.patch("/users/me", {
        fullName: form.fullName,
        studentId: form.studentId,
        major: form.major,
        phone: form.phone || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ?? "Cập nhật thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #6d28d9 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #a78bfa, transparent)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, #818cf8, transparent)",
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            U
          </div>
          <span className="text-white font-semibold text-lg">UniClub Hub</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2
              className="text-4xl font-bold text-white leading-tight mb-4"
              style={{ letterSpacing: "-0.5px" }}
            >
              Sắp hoàn thành <br />
              <span style={{ color: "#c4b5fd" }}>hồ sơ của bạn!</span>
            </h2>
            <p className="text-purple-200 text-base leading-relaxed max-w-xs">
              Chỉ một vài thông tin nữa là bạn có thể tham gia các câu lạc bộ và
              trải nghiệm đầy đủ hệ thống.
            </p>
          </div>

          <div className="space-y-3">
            {CHECKLIST.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2
                  size={18}
                  className="text-purple-300 flex-shrink-0"
                />
                <span className="text-purple-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-purple-300 text-xs">
            © 2026 UniClub Hub · Hệ thống quản lý câu lạc bộ sinh viên
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div
              className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white font-bold text-xl mb-3"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              }}
            >
              U
            </div>
            <h1 className="text-2xl font-bold text-gray-900">UniClub Hub</h1>
          </div>

          <div className="mb-6">
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                margin: "0 0 6px 0",
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              Hoàn tất hồ sơ
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
              Bổ sung thông tin để bắt đầu sử dụng hệ thống.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-2">
            {/* Họ và tên */}
            <div className="space-y-1">
              <Label
                htmlFor="fullName"
                className="text-sm font-medium text-gray-700"
              >
                Họ và tên <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={onChange("fullName")}
                  onBlur={() => onBlur("fullName")}
                  placeholder="Nguyễn Văn A"
                  className={inputCls("fullName", "pl-9")}
                  style={{ height: "40px" }}
                />
              </div>
              <p className="min-h-3 text-xs text-red-500">{errs.fullName}</p>
            </div>

            {/* MSSV + Ngành */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="studentId"
                  className="text-sm font-medium text-gray-700"
                >
                  Mã số SV <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Hash
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    id="studentId"
                    value={form.studentId}
                    onChange={onChange("studentId")}
                    onBlur={() => onBlur("studentId")}
                    placeholder="2151234567"
                    className={inputCls("studentId", "pl-9")}
                    style={{ height: "40px" }}
                  />
                </div>
                <p className="min-h-3 text-xs text-red-500">{errs.studentId}</p>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="major"
                  className="text-sm font-medium text-gray-700"
                >
                  Ngành <span className="text-red-500">*</span>
                </Label>
                <MajorSelect
                  id="major"
                  value={form.major}
                  onChange={(val) => {
                    setForm((p) => ({ ...p, major: val }));
                    if (errs.major) setErrs((p) => ({ ...p, major: "" }));
                  }}
                  onBlur={() => onBlur("major")}
                  error={!!errs.major}
                />
                <p className="min-h-3 text-xs text-red-500">{errs.major}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#9ca3af",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Tuỳ chọn
              </span>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
            </div>

            {/* SĐT + Giới tính */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700"
                >
                  Số điện thoại
                </Label>
                <div className="relative">
                  <Phone
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={onChange("phone")}
                    placeholder="0901234567"
                    className="pl-9"
                    style={{ height: "40px" }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="gender"
                  className="text-sm font-medium text-gray-700"
                >
                  Giới tính
                </Label>
                <select
                  id="gender"
                  value={form.gender}
                  aria-label="Giới tính"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gender: e.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  style={{ height: "40px" }}
                >
                  <option value="">-- Chọn --</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ngày sinh */}
            <div className="space-y-1">
              <Label
                htmlFor="dateOfBirth"
                className="text-sm font-medium text-gray-700"
              >
                Ngày sinh
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={onChange("dateOfBirth")}
                max={new Date().toISOString().split("T")[0]}
                style={{ height: "40px" }}
              />
            </div>

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-semibold text-sm transition-all duration-200"
                style={{
                  background: loading
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  border: "none",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 15px rgba(79, 70, 229, 0.35)",
                }}
              >
                {loading ? "Đang lưu..." : "Hoàn tất"}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Muốn đổi tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                  className="font-semibold transition-colors"
                  style={{ color: "#4f46e5" }}
                >
                  Đăng xuất
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
