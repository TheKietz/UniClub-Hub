import { useState } from 'react'
import { Calendar, User, X } from 'lucide-react'
import type { ClubLandingData, PostPublicItem, PortalTheme } from '../../services/portal.types'

interface Props {
  data: ClubLandingData
  style: string
  theme: PortalTheme
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PostsSection({ data, style, theme }: Props) {
  if (!data.recentPosts.length) return null
  if (style === 'magazine') return <PostsMagazine data={data} theme={theme} />
  if (style === 'list')     return <PostsList     data={data} theme={theme} />
  return <PostsGrid data={data} theme={theme} />
}

// ── Grid: 3-column rounded cards ─────────────────────────────────────────────
function PostsGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { recentPosts } = data
  const [selected, setSelected] = useState<PostPublicItem | null>(null)

  return (
    <section id="posts" className="py-16 bg-zinc-50 border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Tin tức & Hoạt động" theme={theme} />
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentPosts.map(post => (
            <PostCard key={post.id} post={post} theme={theme} onClick={() => setSelected(post)} />
          ))}
        </div>
      </div>
      {selected && <PostModal post={selected} onClose={() => setSelected(null)} theme={theme} />}
    </section>
  )
}

// ── Magazine: big featured + compact side stack ───────────────────────────────
function PostsMagazine({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const [featured, ...rest] = data.recentPosts
  const [selected, setSelected] = useState<PostPublicItem | null>(null)

  return (
    <section id="posts" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Tin tức & Hoạt động" theme={theme} />

        <div className="mt-8 grid md:grid-cols-5 gap-5">
          {/* Featured */}
          <div
            className="md:col-span-3 rounded-2xl border-2 border-black bg-white overflow-hidden cursor-pointer transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            style={{ boxShadow: '6px 6px 0 #003087' }}
            onClick={() => setSelected(featured)}
          >
            {featured.thumbnailUrl ? (
              <img src={featured.thumbnailUrl} alt={featured.title}
                className="w-full h-52 object-cover border-b-2 border-black" />
            ) : (
              <div className="w-full h-52 flex items-center justify-center text-white text-6xl font-black border-b-2 border-black"
                style={{ backgroundColor: theme.primaryColor }}>✦</div>
            )}
            <div className="p-6">
              {featured.category && (
                <span className="rounded-lg border-2 border-black text-xs font-black uppercase px-2 py-0.5 text-white inline-block mb-3"
                  style={{ backgroundColor: theme.primaryColor }}>
                  {featured.category}
                </span>
              )}
              <h3 className="font-black text-black text-base uppercase tracking-wide line-clamp-2">{featured.title}</h3>
              <PostMeta post={featured} />
            </div>
          </div>

          {/* Side stack */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {rest.slice(0, 3).map(post => (
              <div key={post.id}
                className="rounded-xl border-2 border-black bg-white p-4 flex gap-3 cursor-pointer transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                style={{ boxShadow: '3px 3px 0 #003087' }}
                onClick={() => setSelected(post)}
              >
                {post.thumbnailUrl && (
                  <img src={post.thumbnailUrl} alt={post.title}
                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border-2 border-black" />
                )}
                <div className="min-w-0">
                  <h4 className="font-black text-black text-xs uppercase tracking-wide line-clamp-2">{post.title}</h4>
                  <PostMeta post={post} small />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected && <PostModal post={selected} onClose={() => setSelected(null)} theme={theme} />}
    </section>
  )
}

// ── List: rows in rounded container ──────────────────────────────────────────
function PostsList({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { recentPosts } = data
  const [selected, setSelected] = useState<PostPublicItem | null>(null)

  return (
    <section id="posts" className="py-16 bg-white border-b-4 border-black">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Tin tức & Hoạt động" theme={theme} />

        <div className="mt-8 rounded-2xl border-2 border-black overflow-hidden divide-y-2 divide-black">
          {recentPosts.map(post => (
            <div key={post.id}
              className="flex gap-4 p-4 bg-white hover:bg-zinc-50 transition-colors group cursor-pointer"
              onClick={() => setSelected(post)}
            >
              {post.thumbnailUrl && (
                <img src={post.thumbnailUrl} alt={post.title}
                  className="w-20 h-16 object-cover rounded-xl flex-shrink-0 border-2 border-black" />
              )}
              <div className="min-w-0 flex flex-col justify-center">
                {post.category && (
                  <span className="text-xs font-black uppercase tracking-widest mb-1"
                    style={{ color: theme.primaryColor }}>{post.category}</span>
                )}
                <h3 className="font-black text-black text-sm uppercase tracking-wide line-clamp-2">{post.title}</h3>
                <PostMeta post={post} small />
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && <PostModal post={selected} onClose={() => setSelected(null)} theme={theme} />}
    </section>
  )
}

function PostCard({ post, theme, onClick }: { post: PostPublicItem; theme: PortalTheme; onClick: () => void }) {
  return (
    <div
      className="rounded-2xl border-2 border-black bg-white overflow-hidden cursor-pointer transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
      style={{ boxShadow: '4px 4px 0 #003087' }}
      onClick={onClick}
    >
      {post.thumbnailUrl ? (
        <img src={post.thumbnailUrl} alt={post.title}
          className="w-full h-40 object-cover border-b-2 border-black" />
      ) : (
        <div className="w-full h-40 flex items-center justify-center text-white/60 text-3xl font-black border-b-2 border-black"
          style={{ backgroundColor: theme.primaryColor }}>✦</div>
      )}
      <div className="p-4">
        {post.category && (
          <span className="rounded-lg border-2 border-black text-xs font-black uppercase px-2 py-0.5 text-white inline-block mb-2"
            style={{ backgroundColor: theme.primaryColor }}>
            {post.category}
          </span>
        )}
        <h3 className="font-black text-black text-sm uppercase tracking-wide line-clamp-2">{post.title}</h3>
        <PostMeta post={post} small />
      </div>
    </div>
  )
}

// ── Post detail popup ─────────────────────────────────────────────────────────
function PostModal({ post, onClose, theme }: { post: PostPublicItem; onClose: () => void; theme: PortalTheme }) {
  const isHtml = post.content?.trimStart().startsWith('<')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
    >
      {/* X button trên overlay — không bị clip */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors z-10"
        style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}
      >
        <X size={18} />
      </button>

      <div
        className="relative bg-white rounded-2xl overflow-hidden w-full flex flex-col"
        style={{ maxWidth: 780, maxHeight: '90vh', border: '2px solid #003087', boxShadow: '8px 8px 0 #003087' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Thumbnail */}
        {post.thumbnailUrl && (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full object-cover flex-shrink-0"
            style={{ height: 260, borderBottom: '2px solid #003087' }}
          />
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-7">
          {post.category && (
            <span
              className="text-xs font-black uppercase px-3 py-1.5 rounded-lg inline-block mb-4 text-white"
              style={{ background: theme.primaryColor }}
            >
              {post.category}
            </span>
          )}
          <h2 className="text-2xl font-black uppercase text-black leading-tight mb-3">{post.title}</h2>
          <PostMeta post={post} />

          <div className="mt-5 border-t-2 border-black pt-5">
            {post.content ? (
              isHtml ? (
                <div
                  className="text-sm text-gray-700 leading-relaxed"
                  style={{ lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="text-sm text-gray-700" style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </div>
              )
            ) : (
              <p className="text-sm text-gray-400 italic">Bài viết chưa có nội dung chi tiết.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostMeta({ post, small }: { post: PostPublicItem; small?: boolean }) {
  const cls = small ? 'text-xs mt-1.5 gap-3' : 'text-xs mt-2 gap-3'
  return (
    <div className={`flex items-center text-gray-500 font-semibold flex-wrap ${cls}`}>
      <span className="flex items-center gap-1"><Calendar size={10} />{fmtDate(post.createdAt)}</span>
      {post.authorName && (
        <span className="flex items-center gap-1"><User size={10} />{post.authorName}</span>
      )}
    </div>
  )
}

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ backgroundColor: theme.primaryColor }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primaryColor }}>
          Nội dung
        </span>
      </div>
      <h2 className="text-3xl font-black uppercase text-black leading-none">{label}</h2>
      <div className="w-12 h-1.5 rounded-full bg-black mt-3" />
    </div>
  )
}
