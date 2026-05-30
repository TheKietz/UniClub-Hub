import { Calendar, User } from 'lucide-react'
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
  if (style === 'list') return <PostsList data={data} theme={theme} />
  return <PostsGrid data={data} theme={theme} />
}

// ── Grid: 3-column card grid ──────────────────────────────────────────────────
function PostsGrid({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { recentPosts } = data

  return (
    <section id="posts" className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Tin tức & Hoạt động" theme={theme} />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentPosts.map(post => <PostCard key={post.id} post={post} theme={theme} />)}
        </div>
      </div>
    </section>
  )
}

// ── Magazine: 1 featured large card + small cards on the right ────────────────
function PostsMagazine({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const [featured, ...rest] = data.recentPosts

  return (
    <section id="posts" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Tin tức & Hoạt động" theme={theme} />

        <div className="mt-8 grid md:grid-cols-5 gap-5">
          {/* Featured */}
          <div className="md:col-span-3 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group">
            {featured.thumbnailUrl ? (
              <img
                src={featured.thumbnailUrl}
                alt={featured.title}
                className="w-full h-52 object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <div
                className="w-full h-52 flex items-center justify-center text-white/60 text-5xl font-light"
                style={{ backgroundColor: theme.primaryColor }}
              >
                ✦
              </div>
            )}
            <div className="p-6">
              {featured.category && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` }}
                >
                  {featured.category}
                </span>
              )}
              <h3 className="font-bold text-gray-900 text-base mt-2 line-clamp-2">{featured.title}</h3>
              <PostMeta post={featured} />
            </div>
          </div>

          {/* Side stack */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {rest.slice(0, 3).map(post => (
              <div key={post.id} className="rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow flex gap-3">
                {post.thumbnailUrl && (
                  <img src={post.thumbnailUrl} alt={post.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{post.title}</h4>
                  <PostMeta post={post} small />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── List: article list ────────────────────────────────────────────────────────
function PostsList({ data, theme }: { data: ClubLandingData; theme: PortalTheme }) {
  const { recentPosts } = data

  return (
    <section id="posts" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading label="Tin tức & Hoạt động" theme={theme} />

        <div className="mt-8 divide-y divide-gray-100">
          {recentPosts.map(post => (
            <div key={post.id} className="py-5 flex gap-4 group">
              {post.thumbnailUrl && (
                <img
                  src={post.thumbnailUrl}
                  alt={post.title}
                  className="w-20 h-16 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                {post.category && (
                  <span className="text-xs font-medium" style={{ color: theme.primaryColor }}>
                    {post.category}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 text-sm mt-0.5 group-hover:text-gray-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <PostMeta post={post} small />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PostCard({ post, theme }: { post: PostPublicItem; theme: PortalTheme }) {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      {post.thumbnailUrl ? (
        <img
          src={post.thumbnailUrl}
          alt={post.title}
          className="w-full h-40 object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
      ) : (
        <div
          className="w-full h-40 flex items-center justify-center text-white/60 text-3xl font-light"
          style={{ backgroundColor: theme.primaryColor }}
        >
          ✦
        </div>
      )}
      <div className="p-4">
        {post.category && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` }}
          >
            {post.category}
          </span>
        )}
        <h3 className="font-bold text-gray-900 text-sm mt-2 line-clamp-2">{post.title}</h3>
        <PostMeta post={post} small />
      </div>
    </div>
  )
}

function PostMeta({ post, small }: { post: PostPublicItem; small?: boolean }) {
  const cls = small ? 'text-xs mt-1.5 gap-3' : 'text-xs mt-2 gap-3'
  return (
    <div className={`flex items-center text-gray-400 flex-wrap ${cls}`}>
      <span className="flex items-center gap-1"><Calendar size={10} />{fmtDate(post.createdAt)}</span>
      {post.authorName && <span className="flex items-center gap-1"><User size={10} />{post.authorName}</span>}
    </div>
  )
}

function SectionHeading({ label, theme }: { label: string; theme: PortalTheme }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900">{label}</h2>
      <div className="w-10 h-1 rounded-full mt-2" style={{ backgroundColor: theme.primaryColor }} />
    </div>
  )
}
