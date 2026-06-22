import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClubs, getPublicCategories } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import { C, Rv, ClubCard, CatPill, Marquee, PublicFooter, type ClubCardData } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import { getClubRecommendations, type ClubRecommendation } from '@/components/membership/services/recommendationApi'

const CLUB_COLORS = [C.indigo, '#0066CC', C.coral, C.mint, C.sky, '#003087', C.violet, '#C8102E']

function toCardData(c: ClubListItem, i: number): ClubCardData {
  return {
    id: c.id,
    name: c.name,
    short: c.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase(),
    category: c.categoryName ?? '',
    memberCount: c.memberCount ?? 0,
    hue: (i * 47 + 200) % 360,
    description: c.description ?? '',
    isRecruiting: false,
    color: CLUB_COLORS[i % CLUB_COLORS.length],
    logoUrl: c.logoUrl,
  }
}

export default function ClubListPage() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<ClubListItem[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('Tất cả')
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'members-desc' | 'members-asc'>('default')
  const [recommendations, setRecommendations] = useState<ClubRecommendation[]>([])
  const [recLoading, setRecLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClubs(), getPublicCategories()])
      .then(([c, cats]) => { setClubs(c); setCategories(cats) })
      .catch(() => { })
      .finally(() => setLoading(false))

    getClubRecommendations(3)
      .then(r => setRecommendations(r.data.data ?? []))
      .catch(() => setRecommendations([]))
      .finally(() => setRecLoading(false))
  }, [])

  const catLabels = ['Tất cả', ...categories.map(c => c.name)]

  const filtered = clubs
    .filter(c => {
      const matchCat = activeCat === 'Tất cả' || c.categoryName === activeCat
      const q = search.toLowerCase()
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
      return matchCat && matchSearch
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'members-desc') return (b.memberCount ?? 0) - (a.memberCount ?? 0)
      if (sortBy === 'members-asc') return (a.memberCount ?? 0) - (b.memberCount ?? 0)
      return 0
    })

  const cardData = filtered.map(toCardData)
  const marqueeItems = clubs.length > 0 ? clubs.map(c => c.name.toUpperCase()) : ['CLB UEF']

  return (
    <div className="v3-page v3-enter" style={{
      backgroundColor: '#EBF3FF',
      backgroundImage: 'radial-gradient(circle, rgba(0,48,135,0.10) 1.5px, transparent 1.5px)',
      backgroundSize: '26px 26px',
    }}>
      <PublicHeader />

      {/* ─── Header / Search ──────────────────────────── */}
      <section style={{ padding: '44px 28px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          {/* Decoration */}
          <div aria-hidden style={{
            position: 'absolute', top: 10, right: 40,
            fontSize: 48, color: C.lemon, transform: 'rotate(15deg)',
            animation: 'float 4s ease-in-out infinite', pointerEvents: 'none',
          }}>✦</div>

          {/* <Rv>
            <Tag bg={C.coral} color={C.bg} style={{ marginBottom: 14 }}>
              {clubs.length > 0 ? `${clubs.length} CLB` : '—'} · UEF
            </Tag>
          </Rv> */}

          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: '0 0 20px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Tìm câu lạc bộ{' '}
              <span style={{
                display: 'inline-block', background: '#C8102E', color: '#ffffff', padding: '0 14px',
                border: C.border, borderRadius: 14, transform: 'rotate(-1.5deg)',
              }}>phù hợp.</span>
            </h1>
          </Rv>

          {/* Search */}
          <Rv delay={100}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.card, border: C.border, borderRadius: C.radiusPill,
              padding: '0 20px', height: 52, marginBottom: 16, boxShadow: C.shadow(),
            }}>
              <span style={{ fontSize: 18, color: C.inkMuted }}>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm CLB, hoạt động, kỹ năng…"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: C.ink, height: '100%', fontWeight: 500,
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    width: 28, height: 28, borderRadius: 999, border: 'none',
                    background: C.ink, color: C.lemon, fontSize: 14, fontWeight: 800,
                    display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}
                >×</button>
              )}
            </div>
          </Rv>

          {/* Categories */}
          <Rv delay={140}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {catLabels.map(c => (
                <CatPill key={c} label={c} active={activeCat === c} onClick={() => setActiveCat(c)} />
              ))}
            </div>
          </Rv>

          <Rv delay={160}>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>
                Hiển thị <strong style={{ color: C.ink }}>{filtered.length}</strong> trong {clubs.length} câu lạc bộ
                {activeCat !== 'Tất cả' && <> · <strong style={{ color: C.ink }}>{activeCat}</strong></>}
              </span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  marginLeft: 'auto', height: 34, borderRadius: 8,
                  border: C.border, padding: '0 10px', fontSize: 12, fontWeight: 600,
                  background: C.card, color: C.ink, cursor: 'pointer',
                  fontFamily: "'Be Vietnam Pro', sans-serif", outline: 'none',
                }}
              >
                <option value="default">Mặc định</option>
                <option value="name-asc">Tên A → Z</option>
                <option value="name-desc">Tên Z → A</option>
                <option value="members-desc">Thành viên nhiều nhất</option>
                <option value="members-asc">Thành viên ít nhất</option>
              </select>
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── AI Recommendations ───────────────────────── */}
      {(recLoading || recommendations.length > 0) && !search && activeCat === 'Tất cả' && (
        <section style={{ padding: '0 28px 32px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{
                background: C.ink, color: C.lemon, fontSize: 11, fontWeight: 800,
                padding: '3px 10px', borderRadius: 99, letterSpacing: '.06em',
                border: C.border,
              }}>✦ AI GỢI Ý</span>
              <span style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>
                Dựa trên hồ sơ của bạn
              </span>
            </div>

            {recLoading ? (
              <div style={{ display: 'flex', gap: 12 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 110, borderRadius: 14, border: C.border,
                    background: 'linear-gradient(90deg,#C5D8F0 25%,#A8C4E0 50%,#C5D8F0 75%)',
                    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                  }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {recommendations.map((rec, i) => (
                  <Rv key={rec.clubId} delay={i * 60}>
                    <button
                      onClick={() => navigate(`/landing-page/${rec.clubId}`)}
                      style={{
                        flex: '1 1 260px', textAlign: 'left', cursor: 'pointer',
                        background: C.card, border: C.border, borderRadius: 14,
                        boxShadow: C.shadow(), padding: '14px 16px',
                        fontFamily: 'inherit', transition: 'transform .15s',
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {rec.logoUrl ? (
                          <img src={rec.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: C.border }} />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, background: C.ink,
                            display: 'grid', placeItems: 'center',
                            color: C.lemon, fontWeight: 900, fontSize: 12,
                          }}>
                            {rec.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: C.ink, lineHeight: 1.2 }}>{rec.name}</div>
                          {rec.categoryName && (
                            <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 2 }}>{rec.categoryName}</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 7px',
                          borderRadius: 99, background: C.lemon, color: C.ink, border: C.border,
                          flexShrink: 0,
                        }}>{rec.similarityScore}%</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.inkMuted, fontStyle: 'italic' }}>
                        {rec.reason}
                      </div>
                      <div style={{ fontSize: 11, color: C.inkMuted }}>
                        {rec.memberCount} thành viên
                      </div>
                    </button>
                  </Rv>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Club grid ────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '60px 28px', textAlign: 'center', color: C.inkMuted, fontSize: 15 }}>
          Đang tải...
        </div>
      ) : cardData.length > 0 ? (
        <section style={{ padding: '16px 28px 60px', flex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {cardData.map((club, i) => (
                <Rv key={club.id} delay={i * 40}>
                  <ClubCard club={club} onClick={() => navigate(`/clubs/${club.id}`)} />
                </Rv>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section style={{ padding: '64px 28px', textAlign: 'center' }}>
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
              Không tìm thấy CLB nào
            </div>
            <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 20 }}>
              Thử tìm với từ khóa khác hoặc xóa bộ lọc.
            </div>
            <button
              onClick={() => { setActiveCat('Tất cả'); setSearch('') }}
              style={{
                padding: '10px 20px', borderRadius: C.radiusPill,
                background: C.ink, color: C.lemon, border: C.border,
                fontSize: 14, fontWeight: 700, boxShadow: C.shadow(),
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Xóa bộ lọc</button>
          </div>
        </section>
      )}

      {/* ─── Marquee ──────────────────────────────────── */}
      <Marquee tone="light" items={marqueeItems} speed={35} />

      <PublicFooter />
    </div>
  )
}
