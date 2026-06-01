import { APPLICATION_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApplications, reviewApplication, getMemberFieldSchema, advanceApplicationStage, getPipelineStages, getMyClubPermissions, exportApplications } from '@/components/membership/services/clubApi'
import type { ApplicationItem, MemberFieldDef, PipelineStage } from '@/components/membership/services/club.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Clock, MessageCircle, CheckCircle2, XCircle, GitBranch } from 'lucide-react'
import { LoadMoreBar } from '@/components/shared/LoadMoreBar'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'

const PAGE_SIZE = 20

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Pending:   { label: 'Chờ duyệt',  bg: '#fef3c7', text: '#b45309', icon: Clock },
  Interview: { label: 'Phỏng vấn',  bg: '#dbeafe', text: '#1d4ed8', icon: MessageCircle },
  Reviewing: { label: 'Đang xét',   bg: '#ede9fe', text: '#5b21b6', icon: GitBranch },
  Accepted:  { label: 'Đã duyệt',   bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
  Rejected:  { label: 'Từ chối',    bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Interview', label: 'Phỏng vấn' },
  { value: 'Reviewing', label: 'Đang xét' },
  { value: 'Accepted', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
]

export default function ApplicationsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [fieldSchema, setFieldSchema] = useState<MemberFieldDef[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [permCodes, setPermCodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [refreshKey, setRefreshKey] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    getMemberFieldSchema(id).then(setFieldSchema).catch(() => {})
    getPipelineStages(id).then(setPipelineStages).catch(() => {})
    getMyClubPermissions(id)
      .then(r => setPermCodes(new Set(r.permissionCodes.map(c => c.toLowerCase()))))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    setLoading(true)
    getApplications(id)
      .then(setApplications)
      .catch(() => toast.error('Không thể tải danh sách đơn.'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  const canReview = permCodes.has(CLUB_PERMISSIONS.APPLICATIONS_REVIEW)

  const [selected, setSelected] = useState<ApplicationItem | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  function openDetail(app: ApplicationItem) {
    setSelected(app)
    setReviewNote('')
  }

  async function handleReview(status: string) {
    if (!selected) return
    setReviewing(true)
    try {
      await reviewApplication(id, selected.id, { status, reviewNote: reviewNote || undefined })
      toast.success(`Đã cập nhật: ${STATUS_CONFIG[status]?.label ?? status}`)
      setSelected(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
    } finally {
      setReviewing(false)
    }
  }

  async function handleAdvance() {
    if (!selected) return
    setReviewing(true)
    try {
      const updated = await advanceApplicationStage(id, selected.id, reviewNote || undefined)
      toast.success(`Đã chuyển sang vòng: ${updated.currentStageName}`)
      setSelected(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Chuyển vòng thất bại.')
    } finally {
      setReviewing(false)
    }
  }

  const hasPipeline = pipelineStages.length > 0
  const isAtLastStage = selected?.currentStageId != null &&
    pipelineStages.length > 0 &&
    selected.currentStageId === pipelineStages[pipelineStages.length - 1].id
  const canAdvance = hasPipeline &&
    (selected?.status === 'Pending' || selected?.status === 'Reviewing') &&
    !isAtLastStage

  useEffect(() => setVisibleCount(PAGE_SIZE), [search, statusFilter, sortDir])

  const filtered = applications
    .filter(app => !statusFilter || app.status === statusFilter)
    .filter(app => {
      const q = search.toLowerCase()
      return !q
        || (app.fullName ?? '').toLowerCase().includes(q)
        || (app.email ?? '').toLowerCase().includes(q)
        || (app.studentId ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const cmp = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
      return sortDir === 'desc' ? -cmp : cmp
    })

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  async function handleExport(format: 'xlsx' | 'csv') {
    try {
      const res = await exportApplications(id, { format, ...(statusFilter ? { status: statusFilter } : {}) })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers['content-disposition']?.split('filename=')[1] ?? `applications.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Xuất file thất bại.')
    }
  }

  const D = {
    border: '1.5px solid #15131a', borderLight: '1px solid #e8e3d6',
    shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
    radius: 14, pill: 999,
    ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
    bg: '#f7f6f1', card: '#ffffff', lemon: '#facc15', indigo: '#4f46e5',
  }
  const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: D.inkMuted, letterSpacing: '.02em', whiteSpace: 'nowrap' }
  const tdS: React.CSSProperties = { padding: '12px 14px', fontSize: 13 }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 6 }
  const fieldBoxStyle: React.CSSProperties = {
    width: '100%', borderRadius: 8, border: D.borderLight,
    padding: '10px 12px', fontSize: 13, color: D.ink,
    background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const ghostButtonStyle: React.CSSProperties = {
    background: D.card, color: D.inkDim, border: D.border, boxShadow: D.shadow(2, 2),
    padding: '8px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
  const primaryButtonStyle: React.CSSProperties = {
    background: D.indigo, color: '#fff', border: D.border, boxShadow: D.shadow(2, 2),
    padding: '8px 16px', borderRadius: D.pill, fontSize: 12, fontWeight: 700,
    cursor: reviewing ? 'not-allowed' : 'pointer', opacity: reviewing ? 0.7 : 1,
    fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Đơn đăng ký</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>{applications.length} đơn tổng cộng</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['xlsx', 'csv'] as const).map(fmt => (
            <button key={fmt} onClick={() => handleExport(fmt)} style={{
              padding: '8px 14px', borderRadius: D.pill, background: D.card, border: D.border,
              boxShadow: D.shadow(2, 2), fontSize: 12, fontWeight: 600, color: D.inkDim,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>↓ {fmt.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(tab => {
          const c = tab.value ? (counts[tab.value] ?? 0) : applications.length
          const active = statusFilter === tab.value
          return (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)} style={{
              padding: '7px 14px', borderRadius: D.pill,
              background: active ? D.ink : D.card,
              color: active ? D.lemon : D.ink,
              border: D.border,
              boxShadow: active ? 'none' : D.shadow(2, 2),
              transform: active ? 'translate(2px,2px)' : 'none',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .12s', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {tab.label}
              {c > 0 && (
                <span style={{
                  padding: '1px 6px', borderRadius: D.pill, fontSize: 10, fontWeight: 800,
                  background: active ? 'rgba(255,255,255,.2)' : D.bg,
                  color: active ? D.lemon : D.inkMuted,
                }}>{c}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + sort */}
      <div style={{
        padding: '10px 14px', borderRadius: D.radius, background: D.card,
        border: D.border, boxShadow: D.shadow(), display: 'flex', gap: 10,
        alignItems: 'center', marginBottom: 16,
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: D.inkMuted, fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, email, MSSV..." style={{
            width: '100%', height: 36, borderRadius: 8, border: D.borderLight,
            padding: '0 12px 0 32px', fontSize: 13, color: D.ink, outline: 'none',
            background: D.bg, fontFamily: 'inherit',
          }} />
        </div>
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{
          height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: D.inkDim,
          background: D.bg, border: D.borderLight, borderRadius: 8,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>↕ {sortDir === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</button>
        <span style={{ fontSize: 12, color: D.inkMuted, whiteSpace: 'nowrap' }}>{filtered.length}/{applications.length}</span>
      </div>

      {/* Table */}
      <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
              <th style={thS}>Họ tên</th>
              <th style={thS}>Email</th>
              <th style={thS}>MSSV</th>
              <th style={thS}>Ngày nộp</th>
              <th style={thS}>Trạng thái</th>
              <th style={{ ...thS, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: D.inkMuted }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: D.inkMuted }}>{search ? 'Không tìm thấy đơn nào.' : 'Chưa có đơn đăng ký.'}</td></tr>
            ) : filtered.slice(0, visibleCount).map(app => {
              const cfg = STATUS_CONFIG[app.status]
              const Icon = cfg?.icon ?? Clock
              const isPending = app.status === APPLICATION_STATUS.PENDING || app.status === APPLICATION_STATUS.INTERVIEW
              return (
                <tr key={app.id} style={{ borderBottom: D.borderLight, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = D.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tdS, fontWeight: 600, color: D.ink }}>{app.fullName ?? '—'}</td>
                  <td style={{ ...tdS, color: D.inkDim }}>{app.email ?? '—'}</td>
                  <td style={{ ...tdS, color: D.inkMuted }}>{app.studentId ?? '—'}</td>
                  <td style={{ ...tdS, color: D.inkMuted }}>{new Date(app.appliedAt).toLocaleDateString('vi-VN')}</td>
                  <td style={tdS}>
                    {cfg && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: D.pill,
                        background: cfg.bg, color: cfg.text,
                        fontSize: 11.5, fontWeight: 700,
                      }}>
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                    )}
                  </td>
                  <td style={tdS}>
                    <button onClick={() => openDetail(app)} style={{
                      fontSize: 12, fontWeight: 700, color: D.indigo,
                      padding: '4px 10px', borderRadius: 6,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {isPending && canReview ? 'Xem & duyệt' : 'Chi tiết'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <LoadMoreBar
        shown={Math.min(visibleCount, filtered.length)}
        total={filtered.length}
        onLoadMore={() => setVisibleCount(v => v + PAGE_SIZE)}
        label="đơn"
      />

      {/* Dialog xem chi tiết & duyệt */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 20 }}>Đơn đăng ký</DialogTitle>
          </DialogHeader>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
              <div>
                <label style={labelStyle}>Ứng viên</label>
                <div style={{ ...fieldBoxStyle, lineHeight: 1.75 }}>
                  <div style={{ fontWeight: 800 }}>{selected.fullName ?? selected.email}</div>
                  <div style={{ color: D.inkMuted }}>Email: <strong style={{ color: D.ink }}>{selected.email}</strong></div>
                  {selected.studentId && <div style={{ color: D.inkMuted }}>MSSV: <strong style={{ color: D.ink }}>{selected.studentId}</strong></div>}
                  <div style={{ color: D.inkMuted }}>Ngày nộp: <strong style={{ color: D.ink }}>{new Date(selected.appliedAt).toLocaleDateString('vi-VN')}</strong></div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Trạng thái</label>
                <div style={{ color: D.inkMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(() => { const cfg = STATUS_CONFIG[selected.status]; const Icon = cfg?.icon ?? Clock; return cfg ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: D.pill, background: cfg.bg, color: cfg.text, fontSize: 11.5, fontWeight: 700 }}><Icon size={10} />{cfg.label}</span> : null })()}
                </div>
              </div>

              {selected.answers && (() => {
                try {
                  const parsed = JSON.parse(selected.answers)
                  const entries = Object.entries(parsed)
                  if (entries.length > 0) return (
                    <div>
                      <label style={labelStyle}>Câu trả lời</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {entries.map(([k, v]) => (
                          <div key={k} style={fieldBoxStyle}>
                            <p style={{ fontSize: 11.5, color: D.inkMuted, marginBottom: 3 }}>{k}</p>
                            <p style={{ fontSize: 13, color: D.ink }}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}

              {selected.memberFieldData && (() => {
                try {
                  const parsed = JSON.parse(selected.memberFieldData) as Record<string, string>
                  const entries = Object.entries(parsed).filter(([, v]) => v)
                  if (entries.length === 0) return null
                  return (
                    <div>
                      <label style={labelStyle}>Thông tin hồ sơ thành viên</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {entries.map(([k, v]) => {
                          const field = fieldSchema.find(f => f.id === k)
                          return (
                            <div key={k} style={fieldBoxStyle}>
                              <p style={{ fontSize: 11.5, color: '#6366f1', marginBottom: 3, fontWeight: 600 }}>{field?.label ?? k}</p>
                              <p style={{ fontSize: 13, color: D.ink }}>{String(v)}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}

              {selected.status === 'Reviewing' && selected.currentStageName && (
                <div>
                  <label style={labelStyle}>Vòng hiện tại</label>
                  <div style={{ ...fieldBoxStyle, borderColor: '#c4b5fd', background: '#f5f3ff' }}>
                    <p style={{ fontWeight: 700, color: '#5b21b6', marginBottom: 4 }}>Đang ở vòng: {selected.currentStageName}</p>
                    {hasPipeline && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {pipelineStages.map((s, i) => (
                          <span key={s.id} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4,
                            background: s.id === selected.currentStageId ? '#5b21b6' : '#ede9fe',
                            color: s.id === selected.currentStageId ? '#fff' : '#7c3aed',
                            fontWeight: s.id === selected.currentStageId ? 700 : 400,
                          }}>
                            {i + 1}. {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selected.status === 'Accepted' || selected.status === 'Rejected') && (
                <div>
                  <label style={labelStyle}>Kết quả duyệt</label>
                  <div style={{ ...fieldBoxStyle, borderColor: selected.status === 'Accepted' ? '#bbf7d0' : '#fecaca', background: selected.status === 'Accepted' ? '#f0fdf4' : '#fff1f2' }}>
                    <p style={{ fontWeight: 700, color: selected.status === 'Accepted' ? '#15803d' : '#b91c1c', marginBottom: 4 }}>
                      {selected.status === 'Accepted' ? '✓ Đã chấp nhận' : '✕ Đã từ chối'}
                    </p>
                    {selected.reviewerName && <p style={{ color: D.inkMuted, fontSize: 12 }}>Bởi: {selected.reviewerName}</p>}
                    {selected.reviewedAt && <p style={{ color: D.inkMuted, fontSize: 11 }}>{new Date(selected.reviewedAt).toLocaleString('vi-VN')}</p>}
                    {selected.reviewNote && <p style={{ color: D.inkDim, marginTop: 4, whiteSpace: 'pre-wrap' }}>{selected.reviewNote}</p>}
                  </div>
                </div>
              )}

              {canReview && (selected.status === 'Pending' || selected.status === 'Interview' || selected.status === 'Reviewing') && (
                <div>
                  <label style={labelStyle}>
                    Ghi chú phản hồi <span style={{ fontWeight: 400, color: D.inkMuted }}>(tuỳ chọn)</span>
                  </label>
                  <textarea rows={3} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                    placeholder="Lý do từ chối, hướng dẫn phỏng vấn..."
                    style={{ ...fieldBoxStyle, resize: 'none', outline: 'none' }} />
                </div>
              )}
            </div>
          )}

          <DialogFooter style={{ borderTop: 'none', background: 'transparent', paddingTop: 8, flexWrap: 'wrap', gap: 8 }}>
            {canReview && selected && (selected.status === 'Pending' || selected.status === 'Interview' || selected.status === 'Reviewing') && (
              <>
                {canAdvance && (
                  <button disabled={reviewing} onClick={handleAdvance}
                    style={{ ...ghostButtonStyle, color: '#5b21b6', border: '1.5px solid #c4b5fd', opacity: reviewing ? 0.7 : 1 }}>
                    → Vòng tiếp theo
                  </button>
                )}
                {!hasPipeline && selected.status === 'Pending' && (
                  <button disabled={reviewing} onClick={() => handleReview('Interview')}
                    style={{ ...ghostButtonStyle, color: '#0284c7', border: '1.5px solid #38bdf8', opacity: reviewing ? 0.7 : 1 }}>
                    Mời phỏng vấn
                  </button>
                )}
                <button disabled={reviewing} onClick={() => handleReview('Accepted')}
                  style={{ ...primaryButtonStyle, background: '#10b981' }}>
                  {reviewing ? 'Đang xử lý...' : 'Chấp nhận'}
                </button>
                <button disabled={reviewing} onClick={() => handleReview('Rejected')}
                  style={{ ...ghostButtonStyle, color: '#ef4444', border: '1.5px solid #ef4444', opacity: reviewing ? 0.7 : 1 }}>
                  Từ chối
                </button>
              </>
            )}
            <button onClick={() => setSelected(null)} style={{ ...ghostButtonStyle, marginLeft: 'auto' }}>
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
