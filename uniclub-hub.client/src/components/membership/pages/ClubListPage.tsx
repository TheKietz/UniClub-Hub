import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClubs, getPublicCategories } from '@/components/membership/services/clubApi'
import type { ClubListItem } from '@/components/membership/services/club.types'
import { C, Rv, Tag, ClubCard, CatPill, Marquee, V3Footer, type ClubCardData } from '@/components/public/v3'
import PublicHeader from '@/components/layouts/PublicHeader'

const CLUB_COLORS = [C.indigo, C.violet, C.coral, C.mint, C.sky, C.pink, C.lemon, C.coral]

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

  useEffect(() => {
    Promise.all([getClubs(), getPublicCategories()])
      .then(([c, cats]) => { setClubs(c); setCategories(cats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const catLabels = ['Tất cả', ...categories.map(c => c.name)]

  const filtered = clubs.filter(c => {
    const matchCat = activeCat === 'Tất cả' || c.categoryName === activeCat
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const cardData = filtered.map(toCardData)
  const marqueeItems = clubs.length > 0 ? clubs.map(c => c.name.toUpperCase()) : ['CLB UEF']

  return (
    <div className="v3-page v3-enter">
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

          <Rv>
            <Tag bg={C.coral} color={C.bg} style={{ marginBottom: 14 }}>
              {clubs.length > 0 ? `${clubs.length} CLB` : '—'} · UEF
            </Tag>
          </Rv>

          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: '0 0 20px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Tìm câu lạc bộ{' '}
              <span style={{
                display: 'inline-block', background: C.lemon, padding: '0 14px',
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
            <div style={{ marginTop: 14, fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>
              Hiển thị <strong style={{ color: C.ink }}>{filtered.length}</strong> trong {clubs.length} câu lạc bộ
              {activeCat !== 'Tất cả' && <> · <strong style={{ color: C.ink }}>{activeCat}</strong></>}
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── Club grid ────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '60px 28px', textAlign: 'center', color: C.inkMuted, fontSize: 15 }}>
          Đang tải...
        </div>
      ) : cardData.length > 0 ? (
        <section style={{ padding: '16px 28px 60px' }}>
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
      <Marquee tone="dark" items={marqueeItems} speed={35} />

      <V3Footer />
    </div>
  )
}
