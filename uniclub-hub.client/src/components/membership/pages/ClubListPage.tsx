import { useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { useNavigate } from 'react-router-dom'
import { getClubs, getPublicCategories } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import { C, Rv, ClubCard, CatPill, Marquee, PublicFooter } from '@/components/public/publicComponents'
import { LandingClubGridSkeleton } from '@/components/public/LandingSkeleton'
import { toClubCardData } from '@/components/public/clubCardMapper'
import PublicHeader from '@/components/layouts/PublicHeader'
import { FilterSelect } from '@/components/shared/FilterSelect'
import SkyBackground from '@/components/public/SkyBackground'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,.74)',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
}

export default function ClubListPage() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<ClubListItem[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [clubsError, setClubsError] = useState(false)
  const [categoriesError, setCategoriesError] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('Tất cả')
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'members-desc' | 'members-asc'>('default')
  const [onlyRecruiting, setOnlyRecruiting] = useState(false)

  function loadClubsPage() {
    setLoading(true)
    setClubsError(false)
    setCategoriesError(false)

    Promise.allSettled([getClubs(), getPublicCategories()])
      .then(([clubsResult, categoriesResult]) => {
        if (clubsResult.status === 'fulfilled') {
          setClubs(clubsResult.value)
        } else {
          setClubs([])
          setClubsError(true)
        }

        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value)
        } else {
          setCategories([])
          setCategoriesError(true)
        }
      })
      .finally(() => setLoading(false))
  }

  useDeferredEffect(() => {
    loadClubsPage()
  }, [])

  const catLabels = ['Tất cả', ...categories.map(c => c.name)]

  const filtered = clubs
    .filter(c => {
      const matchCat = activeCat === 'Tất cả' || c.categoryName === activeCat
      const q = search.toLowerCase()
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
      const matchRecruiting = !onlyRecruiting || c.isRecruiting === true
      return matchCat && matchSearch && matchRecruiting
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'members-desc') return (b.memberCount ?? 0) - (a.memberCount ?? 0)
      if (sortBy === 'members-asc') return (a.memberCount ?? 0) - (b.memberCount ?? 0)
      return 0
    })

  const cardData = filtered.map(toClubCardData)
  const marqueeItems = clubs.length > 0 ? clubs.map(c => c.name.toUpperCase()) : ['CLB UEF']

  // CLB đang tuyển nổi bật — chỉ hiện khi chưa lọc/tìm kiếm
  const recruitingCount = clubs.filter(c => c.isRecruiting === true).length
  const spotlightCards = clubs.filter(c => c.isRecruiting === true).slice(0, 2).map(toClubCardData)
  const showSpotlight = !loading && !clubsError
    && activeCat === 'Tất cả' && !search.trim() && !onlyRecruiting
    && spotlightCards.length > 0

  return (
    <div className="v3-page v3-enter" style={{ background: 'transparent' }}>
      <SkyBackground />
      <PublicHeader />

      {/* ─── Header / Search ──────────────────────────── */}
      <section className="portal-section portal-section--hero">
        <div className="portal-inner" style={{ position: 'relative' }}>
          {/* Decoration */}
          <div aria-hidden style={{
            position: 'absolute', top: 10, right: 40,
            fontSize: 48, color: C.coral, opacity: 0.35, transform: 'rotate(15deg)',
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
                display: 'inline-block', background: C.coral, color: C.bg, padding: '0 14px',
                border: C.border, borderRadius: 14, transform: 'rotate(-1.5deg)',
              }}>phù hợp.</span>
            </h1>
          </Rv>

          {/* Search */}
          <Rv delay={100}>
            <div style={{
              ...glassCard,
              display: 'flex', alignItems: 'center', gap: 10,
              border: C.border, borderRadius: C.radiusPill,
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
                    background: C.ink, color: C.bg, fontSize: 14, fontWeight: 800,
                    display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}
                >×</button>
              )}
            </div>
          </Rv>

          {/* Categories */}
          <Rv delay={140}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {catLabels.map(c => (
                <CatPill key={c} label={c} active={activeCat === c} onClick={() => setActiveCat(c)} />
              ))}
              {recruitingCount > 0 && (
                <button
                  onClick={() => setOnlyRecruiting(v => !v)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: C.radiusPill,
                    background: onlyRecruiting ? C.coral : C.card,
                    color: onlyRecruiting ? C.bg : C.coral,
                    border: `1.5px solid ${C.coral}`,
                    boxShadow: onlyRecruiting ? 'none' : C.shadow(2, 2),
                    transform: onlyRecruiting ? 'translate(2px,2px)' : 'none',
                    fontSize: 13, fontWeight: 700, transition: 'all .12s',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: onlyRecruiting ? C.bg : C.coral,
                    animation: 'pulse 2s infinite',
                  }} />
                  Đang tuyển ({recruitingCount})
                </button>
              )}
            </div>
            {categoriesError && (
              <div style={{ marginTop: 10, fontSize: 12, color: C.inkMuted, fontWeight: 600 }}>
                Chưa tải được danh mục, bạn vẫn có thể xem danh sách CLB.
              </div>
            )}
          </Rv>

          <Rv delay={160}>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>
                Hiển thị <strong style={{ color: C.ink }}>{filtered.length}</strong> trong {clubs.length} câu lạc bộ
                {activeCat !== 'Tất cả' && <> · <strong style={{ color: C.ink }}>{activeCat}</strong></>}
              </span>
              <FilterSelect
                value={sortBy}
                onChange={value => setSortBy(value as typeof sortBy)}
                options={[
                  { value: 'default', label: 'Mặc định' },
                  { value: 'name-asc', label: 'Tên A → Z' },
                  { value: 'name-desc', label: 'Tên Z → A' },
                  { value: 'members-desc', label: 'Thành viên nhiều nhất' },
                  { value: 'members-asc', label: 'Thành viên ít nhất' },
                ]}
                style={{ marginLeft: 'auto', width: 210 }}
                buttonStyle={{
                  height: 42, borderRadius: C.radiusPill,
                  border: C.border, color: C.ink, fontWeight: 700, fontSize: 13,
                  background: 'rgba(255,255,255,.74)',
                  backdropFilter: 'blur(16px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                }}
                menuStyle={{
                  border: C.border, borderRadius: 14, boxShadow: C.shadow(3, 3),
                }}
              />
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── Spotlight: CLB đang tuyển nổi bật ────────── */}
      {showSpotlight && (
        <section className="portal-section" style={{ paddingTop: 4, paddingBottom: 8 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Rv>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.coral, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.coral }}>
                  Đang mở đơn tuyển thành viên
                </span>
              </div>
            </Rv>
            <div className="portal-spotlight-grid">
              {spotlightCards.map((club, i) => (
                <Rv key={club.id} delay={i * 60}>
                  <div
                    className="card-lift"
                    onClick={() => navigate(`/clubs/${club.id}`)}
                    style={{
                      ...glassCard, display: 'flex', border: C.border, borderRadius: 20,
                      boxShadow: C.shadow(6, 6), overflow: 'hidden', cursor: 'pointer', minHeight: 156,
                    }}
                  >
                    <div style={{
                      width: 112, flexShrink: 0, background: club.color, borderRight: C.border,
                      display: 'grid', placeItems: 'center',
                    }}>
                      {club.logoUrl ? (
                        <img src={club.logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: C.border }} />
                      ) : (
                        <div style={{ fontSize: 26, fontWeight: 900, color: C.bg, letterSpacing: '-.02em', transform: 'rotate(-3deg)' }}>
                          {club.short}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{
                        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                        padding: '3px 9px', borderRadius: 999, background: C.coral, color: C.bg, marginBottom: 8,
                      }}>★ Tuyển thành viên</span>
                      <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: '-.01em', marginBottom: 5 }}>
                        {club.name}
                      </div>
                      <div style={{
                        fontSize: 12.5, color: C.inkDim, lineHeight: 1.5, flex: 1,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>
                        {club.description}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: 12, color: C.inkMuted, fontWeight: 600 }}>{club.memberCount} thành viên</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.coral }}>Xem &amp; nộp đơn →</span>
                      </div>
                    </div>
                  </div>
                </Rv>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Club grid ────────────────────────────────── */}
      {loading ? (
        <section className="portal-section portal-section--body">
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="portal-club-grid">
              <LandingClubGridSkeleton count={8} compact={false} />
            </div>
          </div>
        </section>
      ) : clubsError ? (
        <section className="portal-section portal-section--cta">
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
              Không tải được danh sách CLB
            </div>
            <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 20, lineHeight: 1.55 }}>
              Backend có thể chưa chạy hoặc API đang gián đoạn. Thử tải lại danh sách một lần nữa.
            </div>
            <button
              type="button"
              onClick={loadClubsPage}
              style={{
                padding: '10px 20px', borderRadius: C.radiusPill,
                background: C.ink, color: C.lemon, border: C.border,
                fontSize: 14, fontWeight: 750, boxShadow: C.shadow(),
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Thử lại</button>
          </div>
        </section>
      ) : cardData.length > 0 ? (
        <section className="portal-section portal-section--body">
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="portal-club-grid">
              {cardData.map((club, i) => (
                <Rv key={club.id} delay={i * 40}>
                  <ClubCard club={club} onClick={() => navigate(`/clubs/${club.id}`)} />
                </Rv>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="portal-section portal-section--cta">
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
      <Marquee tone="dark" items={marqueeItems} speed={35} />

      <PublicFooter />
    </div>
  )
}
