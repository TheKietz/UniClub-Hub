import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, ChevronRight, Filter } from 'lucide-react'
import type { ClubExploreItem, CategoryItem } from '../services/portal.types'
import { getExploreClubs, getCategories } from '../services/portal.api'
import { usePortalSEO } from '../hooks/usePortalSEO'
import PublicHeader from '@/components/layouts/PublicHeader'
import AppFooter from '@/components/shared/AppFooter'

export default function PortalExplorePage() {
  const [clubs, setClubs] = useState<ClubExploreItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  usePortalSEO({
    title: 'Khám phá Câu lạc bộ | UniClub Hub',
    description: 'Tìm kiếm và khám phá các câu lạc bộ sinh viên tại trường. Đăng ký tham gia câu lạc bộ phù hợp với bạn.',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  })

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    getExploreClubs({ search: search || undefined, categoryId, page, pageSize: PAGE_SIZE })
      .then(res => {
        setClubs(res.data)
        setTotalCount(res.totalCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, categoryId, page])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold text-gray-900">Câu lạc bộ sinh viên</h1>
          <p className="text-gray-500 mt-1">
            Khám phá {totalCount > 0 ? totalCount : ''} câu lạc bộ đang hoạt động tại trường
          </p>

          {/* Search bar */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="search"
                placeholder="Tìm kiếm câu lạc bộ..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm bg-gray-50"
              />
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => { setCategoryId(undefined); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  !categoryId
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setPage(1) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoryId === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Club grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
                <div className="w-14 h-14 rounded-xl bg-gray-200 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-20">
            <Filter size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Không tìm thấy câu lạc bộ phù hợp.</p>
            <button
              onClick={() => { setSearch(''); setCategoryId(undefined); setPage(1) }}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clubs.map(club => <ClubCard key={club.id} club={club} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Trước
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${
                      page === i + 1
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AppFooter />
    </div>
  )
}

function ClubCard({ club }: { club: ClubExploreItem }) {
  const color = club.primaryColor ?? '#4f46e5'

  return (
    <Link
      to={`/portal/${club.id}`}
      className="group rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md hover:border-gray-200 transition-all"
    >
      {/* Logo */}
      {club.logoUrl ? (
        <img
          src={club.logoUrl}
          alt={club.name}
          className="w-14 h-14 rounded-xl object-cover mb-4"
        />
      ) : (
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4"
          style={{ backgroundColor: color }}
        >
          {club.name[0]}
        </div>
      )}

      {/* Info */}
      <div className="mb-3">
        <h2 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
          {club.name}
        </h2>
        {club.categoryName && (
          <span className="inline-block mt-1 text-xs text-gray-400">{club.categoryName}</span>
        )}
      </div>

      {club.description && (
        <p className="text-gray-500 text-xs line-clamp-2 mb-3">{club.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Users size={11} /> {club.memberCount}
        </span>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}
