import { useEffect, useState } from 'react'
import { Calendar, User, X } from 'lucide-react'
import { C, Rv, Marquee, PublicFooter } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import SkyBackground from '@/components/public/SkyBackground'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { getClubs } from '@/components/membership/services/clubApi'
import { getPortalNews } from '../services/portal.api'
import type { PortalNewsItem, PortalFeedScope } from '../services/portal.types'
import {
  glassCard, useDebounced, fmtDate,
  ScopeChips, ClubFilterSelect, PortalSearchBar, ScopeBadge,
  FeedError, EmptyFeed, LoadMoreButton,
} from './portalFeedShared'

const PAGE_SIZE = 12

function categoryLabel(c: string) {
  if (c === 'News') return 'Tin tức'
  if (c === 'Announcement') return 'Thông báo'
  return c
}
const CATEGORY_OPTIONS = [
  { value: '', label: 'Mọi loại' },
  { value: 'News', label: 'Tin tức' },
  { value: 'Announcement', label: 'Thông báo' },
]

export default function NewsPortalPage() {
  const [clubs, setClubs] = useState<{ id: number; name: string }[]>([])
  const [scope, setScope] = useState<PortalFeedScope>('all')
  const [clubId, setClubId] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)

  const [items, setItems] = useState<PortalNewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<PortalNewsItem | null>(null)

  useEffect(() => {
    getClubs().then(cs => setClubs(cs.map(c => ({ id: c.id, name: c.name })))).catch(() => setClubs([]))
  }, [])

  function fetchPage(pageNum: number, append: boolean) {
    if (append) setLoadingMore(true)
    else { setLoading(true); setError(false) }

    getPortalNews({
      scope: clubId ? undefined : scope,
      clubId: clubId ? Number(clubId) : undefined,
      category: category || undefined,
      search: debouncedSearch || undefined,
      page: pageNum,
      pageSize: PAGE_SIZE,
    })
      .then(res => {
        setTotal(res.totalCount)
        setPage(res.page)
        setItems(prev => append ? [...prev, ...res.data] : res.data)
      })
      .catch(() => { if (!append) { setError(true); setItems([]) } })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }

  useEffect(() => {
    fetchPage(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, clubId, category, debouncedSearch])

  const hasMore = items.length < total
  const resetFilters = () => { setScope('all'); setClubId(''); setCategory(''); setSearch('') }

  return (
    <div className="v3-page v3-enter" style={{ background: 'transparent' }}>
      <SkyBackground />
      <PublicHeader />

      {/* ─── Hero / filters ─────────────────────────────── */}
      <section style={{ padding: '132px 28px 20px', position: 'relative', zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute', top: 6, right: 40, fontSize: 48, color: C.indigo,
            opacity: 0.32, transform: 'rotate(-12deg)', animation: 'float 4s ease-in-out infinite', pointerEvents: 'none',
          }}>✦</div>

          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: '0 0 18px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Tin tức{' '}
              <span style={{
                display: 'inline-block', background: C.ink, color: C.bg, padding: '0 14px',
                border: C.border, borderRadius: 14, transform: 'rotate(-1.5deg)',
              }}>UEF.</span>
            </h1>
          </Rv>

          <Rv delay={100}>
            <p style={{ fontSize: 16, color: C.inkDim, lineHeight: 1.5, maxWidth: 560, margin: '0 0 18px', fontWeight: 500 }}>
              Tin tức cấp trường và của các câu lạc bộ. Lọc theo cấp tổ chức, theo CLB, theo loại hoặc tìm theo tiêu đề.
            </p>
          </Rv>

          <Rv delay={140}>
            <div style={{ marginBottom: 14 }}>
              <PortalSearchBar value={search} onChange={setSearch} placeholder="Tìm tin theo tiêu đề…" />
            </div>
          </Rv>

          <Rv delay={160}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <ScopeChips value={scope} onChange={v => { setScope(v); if (v === 'university') setClubId('') }} />
              <ClubFilterSelect
                clubs={clubs}
                value={clubId}
                onChange={setClubId}
                disabled={scope === 'university'}
              />
              <FilterSelect
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
                style={{ width: 170 }}
                buttonStyle={{
                  height: 42, borderRadius: C.radiusPill, border: C.border, color: C.ink,
                  fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,.74)',
                  backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                }}
                menuStyle={{ border: C.border, borderRadius: 14, boxShadow: C.shadow(3, 3) }}
              />
            </div>
          </Rv>

          <Rv delay={180}>
            <div style={{ marginTop: 14, fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>
              {loading ? 'Đang tải…' : <>Tìm thấy <strong style={{ color: C.ink }}>{total}</strong> bài viết</>}
            </div>
          </Rv>
        </div>
      </section>

      {/* ─── Feed ───────────────────────────────────────── */}
      {loading ? (
        <NewsGridSkeleton />
      ) : error ? (
        <FeedError onRetry={() => fetchPage(1, false)} label="Không tải được danh sách tin tức" />
      ) : items.length === 0 ? (
        <EmptyFeed icon="📰" title="Không có tin tức phù hợp" hint="Thử đổi bộ lọc hoặc từ khóa khác." onReset={resetFilters} />
      ) : (
        <section style={{ padding: '8px 28px 56px', flex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gridAutoRows: '1fr', gap: 16 }}>
              {items.map((n, i) => (
                <Rv key={n.id} delay={Math.min(i, 8) * 40}>
                  <NewsCard n={n} onOpen={() => setSelected(n)} />
                </Rv>
              ))}
            </div>
            {hasMore && <LoadMoreButton onClick={() => fetchPage(page + 1, true)} loading={loadingMore} />}
          </div>
        </section>
      )}

      <Marquee tone="light" items={['TIN TỨC CẤP TRƯỜNG', 'HOẠT ĐỘNG CLB', 'THÔNG BÁO MỚI', 'SINH VIÊN UEF']} speed={38} />
      <PublicFooter />

      {selected && <NewsModal n={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/* ─── News card ──────────────────────────────────────────────────── */
function NewsCard({ n, onOpen }: { n: PortalNewsItem; onOpen: () => void }) {
  return (
    <div
      className="card-lift"
      onClick={onOpen}
      style={{
        ...glassCard, borderRadius: C.radius, overflow: 'hidden', cursor: 'pointer',
        border: C.border, boxShadow: C.shadow(), display: 'flex', flexDirection: 'column', height: '100%',
      }}
    >
      {n.thumbnailUrl ? (
        <img src={n.thumbnailUrl} alt={n.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderBottom: C.border }} />
      ) : (
        <div style={{
          height: 160, borderBottom: C.border, display: 'grid', placeItems: 'center',
          background: n.clubId == null ? C.ink : C.indigo, color: C.bg, fontSize: 40, fontWeight: 900,
        }}>✦</div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <ScopeBadge clubId={n.clubId} clubName={n.clubName} clubLogoUrl={n.clubLogoUrl} small />
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: C.radiusPill,
            background: n.category === 'Announcement' ? '#fef3c7' : '#dbeafe',
            color: n.category === 'Announcement' ? '#92400e' : '#1d4ed8',
          }}>{categoryLabel(n.category)}</span>
        </div>

        <h3 style={{
          fontSize: 15.5, fontWeight: 800, color: C.ink, letterSpacing: '-.01em', margin: '0 0 10px', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>{n.title}</h3>

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px dashed ${C.rule}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.inkMuted }}>
            <Calendar size={11} />{fmtDate(n.createdAt)}
          </span>
          {n.authorName && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.inkMuted }}>
              <User size={11} />{n.authorName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── News detail modal ──────────────────────────────────────────── */
function NewsModal({ n, onClose }: { n: PortalNewsItem; onClose: () => void }) {
  const isHtml = !!n.content?.trimStart().startsWith('<')
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(3,24,68,0.7)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Đóng"
        style={{
          position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 999,
          display: 'grid', placeItems: 'center', color: '#fff', zIndex: 10,
          background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.7)', cursor: 'pointer',
        }}
      ><X size={18} /></button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: C.card, borderRadius: C.radius, overflow: 'hidden',
          width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          border: C.border, boxShadow: C.shadow(8, 8),
        }}
      >
        {n.thumbnailUrl && (
          <img src={n.thumbnailUrl} alt={n.title} style={{ width: '100%', height: 260, objectFit: 'cover', borderBottom: C.border, flexShrink: 0 }} />
        )}

        <div style={{ overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <ScopeBadge clubId={n.clubId} clubName={n.clubName} clubLogoUrl={n.clubLogoUrl} />
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: C.radiusPill,
              background: n.category === 'Announcement' ? '#fef3c7' : '#dbeafe',
              color: n.category === 'Announcement' ? '#92400e' : '#1d4ed8',
            }}>{categoryLabel(n.category)}</span>
          </div>

          <h2 style={{ fontSize: 25, fontWeight: 900, color: C.ink, letterSpacing: '-.02em', lineHeight: 1.25, margin: '0 0 12px' }}>{n.title}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13, color: C.inkMuted, fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13} />{fmtDate(n.createdAt)}</span>
            {n.authorName && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} />{n.authorName}</span>}
          </div>

          <div style={{ borderTop: C.border, marginTop: 16, paddingTop: 18 }}>
            {n.content ? (
              isHtml ? (
                <div style={{ fontSize: 14.5, color: C.inkDim, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: n.content }} />
              ) : (
                <div style={{ fontSize: 14.5, color: C.inkDim, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{n.content}</div>
              )
            ) : (
              <p style={{ fontSize: 14, color: C.inkMuted, fontStyle: 'italic', margin: 0 }}>Bài viết chưa có nội dung chi tiết.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function NewsGridSkeleton() {
  return (
    <section style={{ padding: '8px 28px 56px', flex: 1 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ ...glassCard, borderRadius: C.radius, border: C.border, boxShadow: C.shadow(), overflow: 'hidden' }}>
              <div style={{ height: 160, borderBottom: C.border, background: 'rgba(0,0,0,.05)' }} />
              <div style={{ padding: 16 }}>
                <div style={{ width: 100, height: 16, borderRadius: 999, background: 'rgba(0,0,0,.06)', marginBottom: 12 }} />
                <div style={{ width: '92%', height: 15, borderRadius: 6, background: 'rgba(0,0,0,.08)', marginBottom: 8 }} />
                <div style={{ width: '75%', height: 15, borderRadius: 6, background: 'rgba(0,0,0,.06)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
