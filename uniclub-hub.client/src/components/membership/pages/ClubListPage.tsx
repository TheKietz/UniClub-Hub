import { MEMBERSHIP_STATUS } from "@/types/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getClubs,
  getPublicCategories,
} from "@/components/membership/services/clubApi";
import type { ClubListItem } from "@/components/membership/services/club.types";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Users, ArrowRight } from "lucide-react";
import PublicHeader from "@/components/layouts/PublicHeader";

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
];

// Lấy chữ cái đầu của từ sau "CLB " (nếu có)
function getAvatarLetter(name: string) {
  const meaningful = name.startsWith("CLB ") ? name.slice(4) : name;
  return meaningful[0]?.toUpperCase() ?? "?";
}

export default function ClubListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState<ClubListItem[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getClubs({ search: query || undefined, categoryId }),
      getPublicCategories(),
    ])
      .then(([c, cats]) => {
        setClubs(c);
        setCategories(cats);
      })
      .catch(() => toast.error("Không thể tải danh sách CLB."))
      .finally(() => setLoading(false));
  }, [query, categoryId, refreshKey]);

  const myClubIds = new Set(
    user?.memberships
      .filter((m) => m.status === MEMBERSHIP_STATUS.ACTIVE)
      .map((m) => m.clubId),
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      {/* Body */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 pb-10 space-y-8">
          {/* Title */}
          <div>
            <h1
              className="text-3xl font-bold pt-3"
              style={{ color: "#0f172a" }}
            >
              Khám phá CLB
            </h1>
            <p className="text-gray-500 mt-1">
              Tìm và đăng ký tham gia câu lạc bộ phù hợp với bạn
            </p>
          </div>

          {/* Search + filter */}
          <div className="flex flex-wrap gap-3">
            <form
              onSubmit={handleSearch}
              className="flex gap-2 flex-1 min-w-64"
            >
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <Input
                  placeholder="Tìm tên CLB..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline" size="icon">
                <Search size={15} />
              </Button>
            </form>
            <select
              value={categoryId ?? ""}
              onChange={(e) => {
                setCategoryId(
                  e.target.value ? Number(e.target.value) : undefined,
                );
                setRefreshKey((k) => k + 1);
              }}
              className="border border-input rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Tất cả lĩnh vực</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Result count */}
          {!loading && (
            <p className="text-sm text-gray-400">
              {clubs.length} câu lạc bộ{query && ` cho "${query}"`}
            </p>
          )}

          {/* Club grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 h-52 animate-pulse"
                />
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <Search size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Không tìm thấy CLB nào.</p>
              {query && (
                <button
                  onClick={() => {
                    setSearch("");
                    setQuery("");
                  }}
                  className="mt-2 text-sm text-indigo-500 hover:underline"
                >
                  Xoá tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {clubs.map((club) => {
                const isMember = myClubIds.has(club.id);
                const avatarColor =
                  AVATAR_COLORS[club.id % AVATAR_COLORS.length];
                const letter = getAvatarLetter(club.name);
                return (
                  <div
                    key={club.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => navigate(`/clubs/${club.id}`)}
                  >
                    {/* Logo + tên */}
                    <div className="flex items-center gap-3">
                      {club.logoUrl ? (
                        <img
                          src={club.logoUrl}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ${avatarColor}`}
                        >
                          {letter}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="font-semibold text-gray-900 leading-snug line-clamp-1 flex-1">
                            {club.name}
                          </p>
                          {isMember && (
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0 mt-0.5"
                            >
                              Tham gia
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {club.code}
                        </p>
                      </div>
                    </div>

                    {/* Mô tả */}
                    <p className="text-sm text-gray-500 line-clamp-2 flex-1 leading-relaxed">
                      {club.description || "Chưa có mô tả."}
                    </p>

                    {/* Footer card */}
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      {/* Category */}
                      {club.categoryName && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          {club.categoryName}
                        </span>
                      )}
                      {/* Members + chi tiết */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users size={12} /> {club.memberCount} thành viên
                        </span>
                        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                          Chi tiết <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-100 text-center bg-white mt-auto">
        <p className="text-xs text-gray-400">
          © 2026 UniClub Hub · Đại học Kinh tế Tài chính TP.HCM
        </p>
      </footer>
    </div>
  );
}
