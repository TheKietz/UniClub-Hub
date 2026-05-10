import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClubs } from '@/components/membership/services/clubApi'
import { getCategories } from '@/components/membership/services/adminApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import type { CategoryItem } from '@/components/membership/services/admin.types'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Users, ArrowLeft, ArrowRight } from 'lucide-react'

export default function ClubListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [clubs, setClubs] = useState<ClubListItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getClubs({ search: query || undefined, categoryId }),
      getCategories(),
    ])
      .then(([c, cats]) => { setClubs(c); setCategories(cats) })
      .catch(() => toast.error('Không thể tải danh sách CLB.'))
      .finally(() => setLoading(false))
  }, [query, categoryId, refreshKey])

  const myClubIds = new Set(user?.memberships.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE).map(m => m.clubId))

  function handleSearch(e: { preventDefault(): void }) {
    e.preventDefault()
    setQuery(search)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(user ? '/dashboard' : '/')}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Khám phá CLB</h1>
            <p className="text-gray-500 mt-0.5">Tìm và đăng ký tham gia câu lạc bộ</p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-60">
            <Input
              placeholder="Tìm tên CLB..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline" size="icon">
              <Search size={16} />
            </Button>
          </form>
          <select
            value={categoryId ?? ''}
            onChange={e => { setCategoryId(e.target.value ? Number(e.target.value) : undefined); setRefreshKey(k => k + 1) }}
            className="border border-input rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tất cả lĩnh vực</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Club grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Đang tải...</div>
        ) : clubs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Không tìm thấy CLB nào.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clubs.map(club => {
              const isMember = myClubIds.has(club.id)
              return (
                <div key={club.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{club.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{club.code}</p>
                    </div>
                    {isMember && (
                      <Badge variant="secondary" className="shrink-0 text-xs">Đang tham gia</Badge>
                    )}
                  </div>

                  {club.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{club.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={13} /> {club.memberCount} thành viên
                      </span>
                      {club.categoryName && <span>{club.categoryName}</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-indigo-600 hover:text-indigo-700 -mr-2"
                      onClick={() => navigate(`/clubs/${club.id}`)}>
                      Xem chi tiết <ArrowRight size={13} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
