import { MEMBERSHIP_STATUS } from '@/types/auth'
import { Rv } from '@/components/public/publicComponents'
import { useEffect, useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getClubDetail, getDepartments, getFormSchema, getMemberFieldSchema, getMyApplications, submitApplication, getUserResignations, uploadApplicationFile } from '@/components/membership/services/clubApi'
import type { ClubDetail, DepartmentItem, FormSchema, MemberFieldDef, ApplicationItem, ResignationRequestItem } from '@/components/membership/services/club.types'
import LeaveClubDialog from '@/components/membership/shared/LeaveClubDialog'
import { isLeaderRole } from '@/constants/clubRoles'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Users, Building, Calendar, Phone, GraduationCap, CheckCircle2, Clock, XCircle, MessageCircle, LogOut, AlertCircle, Paperclip, X, GitBranch } from 'lucide-react'
import { Tree, TreeNode } from 'react-organizational-chart'
import PublicHeader from '@/components/layouts/PublicHeader'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { getApiErrorMessage } from '@/lib/apiError'
import { syncMemberFieldsToFormSchema } from '@/lib/memberFieldFormSync'
import { getClubLandingPage } from '@/components/portal/services/portal.api'
import type { ClubLandingData } from '@/components/portal/services/portal.types'

const APP_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Pending: { label: 'Đang chờ duyệt', color: '#d97706', icon: Clock },
  Interview: { label: 'Được mời phỏng vấn', color: '#2563eb', icon: MessageCircle },
  Accepted: { label: 'Đã được chấp nhận', color: '#16a34a', icon: CheckCircle2 },
  Rejected: { label: 'Đã bị từ chối', color: '#dc2626', icon: XCircle },
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuth()

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [fieldSchema, setFieldSchema] = useState<MemberFieldDef[]>([])
  const [application, setApplication] = useState<ApplicationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [landingData, setLandingData] = useState<ClubLandingData | null>(null)

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fileAnswers, setFileAnswers] = useState<Record<string, File | null>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'submitting'>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const [resignOpen, setResignOpen] = useState(false)
  const [resignRequest, setResignRequest] = useState<ResignationRequestItem | null>(null)

  const membership = user?.memberships.find(m => m.clubId === id)
  const isMember = membership && (membership.status === MEMBERSHIP_STATUS.ACTIVE || membership.status === MEMBERSHIP_STATUS.PROBATION)
  const isLeader = membership?.clubRole ? isLeaderRole(membership.clubRole) : false

  const formFields = useMemo(
    () => syncMemberFieldsToFormSchema(fieldSchema, schema?.fields ?? []),
    [fieldSchema, schema],
  )

  useEffect(() => {
    if (isAuthenticated && !isMember && application?.status === 'Accepted') {
      refreshUser()
    }
  }, [application?.status, isAuthenticated, isMember, refreshUser])

  useEffect(() => {
    if (!isAuthenticated || !isMember || !isLeader || !user) return
    getUserResignations(user.id)
      .then(list => {
        const pending = list.find(r => r.clubId === id && r.status === 'Pending')
        setResignRequest(pending ?? null)
      })
      .catch(() => { })
  }, [id, isAuthenticated, isMember, isLeader, user])

  async function handleLeaveSuccess() {
    if (isLeader && user) {
      const list = await getUserResignations(user.id)
      setResignRequest(list.find(r => r.clubId === id && r.status === 'Pending') ?? null)
    } else {
      await refreshUser()
      navigate('/clubs')
    }
    await refreshUser()
  }

  useDeferredEffect((isCancelled) => {
    setLoading(true)
    getClubLandingPage(id).then(setLandingData).catch(() => {})
    const tasks: Promise<void>[] = [
      getClubDetail(id).then(setClub),
      getDepartments(id).then(setDepartments),
      getFormSchema(id).then(s => setSchema(s)),
      getMemberFieldSchema(id).then(setFieldSchema).catch(() => {}),
    ]
    if (isAuthenticated) {
      tasks.push(
        getMyApplications(id)
          .then(apps => {
            const latest = apps.sort((a, b) =>
              new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
            )[0]
            if (latest) setApplication(latest)
          })
          .catch(() => { })
      )
    }
    Promise.all(tasks)
      .catch(() => { if (!isCancelled()) toast.error('Không thể tải thông tin CLB.') })
      .finally(() => { if (!isCancelled()) setLoading(false) })
  }, [id, isAuthenticated])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formFields.length > 0) {
      const missingText = formFields.filter(f => f.required && f.type !== 'file' && !answers[f.id]?.trim())
      const missingFile = formFields.filter(f => f.required && f.type === 'file' && !fileAnswers[f.id])
      const missing = [...missingText, ...missingFile]
      if (missing.length > 0) {
        toast.error(`Vui lòng điền: ${missing.map(f => f.label).join(', ')}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const finalAnswers = { ...answers }

      const fileFields = formFields.filter(f => f.type === 'file' && fileAnswers[f.id]) ?? []
      if (fileFields.length > 0) {
        setSubmitStatus('uploading')
        await Promise.all(fileFields.map(async f => {
          finalAnswers[f.id] = await uploadApplicationFile(fileAnswers[f.id]!)
        }))
      }

      setSubmitStatus('submitting')
      const memberFieldData: Record<string, string> = {}
      for (const field of formFields) {
        if (field.linkedFieldId && finalAnswers[field.id]?.trim()) {
          memberFieldData[field.linkedFieldId] = finalAnswers[field.id]
        }
      }
      await submitApplication(id, {
        answers: formFields.length > 0 ? finalAnswers : { note: finalAnswers['note'] ?? '' },
        ...(Object.keys(memberFieldData).length > 0 ? { memberFieldData } : {}),
      })
      setSubmitted(true)
      setApplyOpen(false)
      toast.success('Đã gửi đơn đăng ký thành công!')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gửi đơn thất bại.'))
    } finally {
      setSubmitting(false)
      setSubmitStatus('idle')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EBF3FF' }}>
      <p className="text-sm" style={{ color: '#5E7AA8' }}>Đang tải...</p>
    </div>
  )

  if (!club) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EBF3FF' }}>
      <p className="text-sm text-red-400">Không tìm thấy CLB.</p>
    </div>
  )

  const avatarLetter = (club.name.startsWith('CLB ') ? club.name.slice(4) : club.name)[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundColor: '#EBF3FF',
      backgroundImage: 'radial-gradient(circle, rgba(0,48,135,0.08) 1.5px, transparent 1.5px)',
      backgroundSize: '26px 26px',
    }}>
      <PublicHeader />

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-[132px] pb-8 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-white/60 transition-colors">
            <ArrowLeft size={14} style={{ color: '#5E7AA8' }} />
          </button>
          <Link to="/clubs" style={{ color: '#5E7AA8' }} className="hover:text-indigo-600 transition-colors">Danh sách CLB</Link>
          <span style={{ color: '#C5D8F0' }}>/</span>
          <span className="font-medium truncate max-w-xs" style={{ color: '#003087' }}>{club.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Cột trái ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Club header card */}
            <Rv><div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 2px 8px rgba(0,48,135,0.08)' }}>
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #003087, #0055B8)' }} />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt=""
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0" style={{ border: '1.5px solid #C5D8F0' }} />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #003087, #0055B8)' }}>
                      {avatarLetter}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h1 className="text-xl font-bold leading-snug" style={{ color: '#003087', margin: 0 }}>{club.name}</h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md font-semibold" style={{ background: '#EBF3FF', color: '#5E7AA8' }}>{club.code}</span>
                      {club.categoryName && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: '#EBF3FF', color: '#0055B8' }}>
                          {club.categoryName}
                        </span>
                      )}
                    </div>
                    <p className="pt-3 text-sm leading-relaxed" style={{ color: '#5E7AA8' }}>
                      {club.description ?? 'Chưa có mô tả.'}
                    </p>
                    <div className="flex justify-end mt-3">
                      <Link to={`/landing-page/${club.id}`} className="text-xs font-semibold transition-colors" style={{ color: '#0055B8' }}>
                        Xem thêm thông tin →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div></Rv>

            {/* Org chart */}
            {departments.length > 0 && (
              <Rv delay={80}><div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 2px 8px rgba(0,48,135,0.08)' }}>
                <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1.5px solid #EBF3FF' }}>
                  <GitBranch size={15} style={{ color: '#003087' }} />
                  <p className="text-sm font-semibold" style={{ color: '#003087' }}>Cơ cấu tổ chức</p>
                </div>
                <div className="px-6 py-5 overflow-x-auto">
                  <div className="min-w-max mx-auto">
                    <Tree
                      lineWidth="2px"
                      lineColor="#C5D8F0"
                      lineBorderRadius="8px"
                      label={
                        <div className="inline-flex items-center gap-2 text-white rounded-xl px-4 py-2 text-sm font-bold"
                          style={{ background: '#003087', boxShadow: '0 2px 8px rgba(0,48,135,0.25)' }}>
                          <Building size={14} />
                          {club.name}
                        </div>
                      }
                    >
                      {departments.map(dept => (
                        <TreeNode key={dept.id} label={
                          <div className="inline-flex flex-col items-center gap-0.5 bg-white rounded-xl px-4 py-2.5 min-w-28"
                            style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 1px 4px rgba(0,48,135,0.08)' }}>
                            <p className="font-semibold text-sm" style={{ color: '#003087' }}>{dept.name}</p>
                            {dept.deptLeadName
                              ? <p className="text-xs" style={{ color: '#0055B8' }}>{dept.deptLeadName}</p>
                              : <p className="text-xs text-amber-500">Chưa có trưởng ban</p>
                            }
                            <p className="text-xs" style={{ color: '#5E7AA8' }}>{dept.memberCount} thành viên</p>
                          </div>
                        } />
                      ))}
                    </Tree>
                  </div>
                </div>
              </div></Rv>
            )}

          </div>

          {/* ── Cột phải ── */}
          <div className="space-y-4 w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-24 self-start">

            {/* Apply card */}
            <Rv><div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #003087', boxShadow: '4px 4px 0 #003087' }}>
              <div className="px-5 py-3" style={{ background: '#003087' }}>
                <p className="text-sm font-black text-white uppercase tracking-wider">Tham gia CLB</p>
              </div>

              <div className="p-5 bg-white">
                {isMember ? (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Bạn đang là thành viên</p>
                    <span className="inline-block text-xs px-3 py-1 rounded-full font-medium"
                      style={{
                        background: membership?.status === MEMBERSHIP_STATUS.PROBATION ? '#eff6ff' : '#f0fdf4',
                        color: membership?.status === MEMBERSHIP_STATUS.PROBATION ? '#2563eb' : '#16a34a'
                      }}>
                      {membership?.status === MEMBERSHIP_STATUS.PROBATION ? 'Đang thử việc' : 'Thành viên chính thức'}
                    </span>
                    <div className="pt-1">
                      {isLeader ? (
                        resignRequest ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                            <AlertCircle size={12} />
                            Đơn từ chức đang chờ duyệt
                          </div>
                        ) : (
                          <button onClick={() => setResignOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition-colors">
                            <LogOut size={12} />
                            Đệ đơn từ chức
                          </button>
                        )
                      ) : (
                        <button onClick={() => setResignOpen(true)}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                          <LogOut size={12} />
                          Rời khỏi CLB
                        </button>
                      )}
                    </div>
                  </div>
                ) : application && !submitted && application.status !== 'Rejected' ? (
                  (() => {
                    const s = APP_STATUS[application.status]
                    const Icon = s?.icon ?? Clock
                    return (
                      <div className="space-y-3">
                        <div className="text-center space-y-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                            style={{ background: `${s?.color}18` }}>
                            <Icon size={20} style={{ color: s?.color }} />
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">Trạng thái đơn</p>
                          <p className="text-sm font-medium" style={{ color: s?.color }}>{s?.label}</p>
                          <p className="text-xs text-gray-400">Nộp {new Date(application.appliedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        {application.reviewNote && (
                          <div className="bg-indigo-50 rounded-lg px-3 py-2.5">
                            <p className="text-xs font-medium text-indigo-500 mb-1">Phản hồi từ CLB</p>
                            <p className="text-sm text-indigo-900 whitespace-pre-wrap">{application.reviewNote}</p>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : application && !submitted && application.status === 'Rejected' ? (
                  (() => {
                    const rejectedAt = application.reviewedAt ? new Date(application.reviewedAt) : new Date(application.appliedAt)
                    const canReapply = Date.now() - rejectedAt.getTime() >= 24 * 60 * 60 * 1000
                    const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - rejectedAt.getTime())) / 3600000)
                    return (
                      <div className="text-center py-2 space-y-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto" style={{ background: '#fee2e2' }}>
                          <XCircle size={22} style={{ color: '#dc2626' }} />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">Đơn đã bị từ chối</p>
                        <p className="text-xs text-gray-400">
                          Nộp ngày {new Date(application.appliedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        {application.reviewNote && (
                          <div className="rounded-lg px-3 py-2.5 text-left mt-1" style={{ background: '#fff1f2', border: '1px solid #fecaca' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: '#dc2626' }}>Lý do từ CLB</p>
                            <p className="text-sm whitespace-pre-wrap" style={{ color: '#7f1d1d' }}>{application.reviewNote}</p>
                          </div>
                        )}
                        {canReapply ? (
                          <button
                            onClick={() => { setApplication(null); setApplyOpen(true) }}
                            className="w-full py-2.5 rounded-xl font-bold text-sm text-white mt-1"
                            style={{ background: '#C8102E', border: '2px solid #8B0000', boxShadow: '0 3px 0 #8B0000' }}
                          >
                            Đăng ký lại
                          </button>
                        ) : (
                          <p className="text-xs text-gray-400">Có thể đăng ký lại sau {hoursLeft} giờ</p>
                        )}
                      </div>
                    )
                  })()
                ) : submitted ? (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Đã gửi đơn thành công!</p>
                    <p className="text-xs text-gray-400">CLB sẽ xem xét và thông báo sớm.</p>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="space-y-3">
                    <p className="text-sm text-center" style={{ color: '#5E7AA8' }}>Đăng nhập để đăng ký tham gia</p>
                    <Link to="/login">
                      <Button className="w-full" style={{ background: '#003087' }}>Đăng nhập</Button>
                    </Link>
                    <p className="text-xs text-gray-400 text-center">
                      Chưa có tài khoản?{' '}
                      <Link to="/register" className="hover:underline" style={{ color: '#0055B8' }}>Đăng ký</Link>
                    </p>
                  </div>
                ) : club.status !== 'Active' ? (
                  <p className="text-center text-sm text-gray-400 py-2">CLB hiện không nhận thành viên mới.</p>
                ) : (
                  <div className="py-2 text-center space-y-4">
                    <p className="text-sm pb-1" style={{ color: '#5E7AA8' }}>Tham gia {club.name} và cùng nhau phát triển!</p>
                    <button
                      type="button"
                      onClick={() => setApplyOpen(true)}
                      className="w-full py-4 rounded-xl font-black text-xl text-white transition-all active:translate-y-0.5"
                      style={{ background: '#C8102E', border: '2px solid #8B0000', boxShadow: '0 4px 0 #8B0000', letterSpacing: '-.01em' }}
                    >
                      Đăng ký ngay!!!
                    </button>
                  </div>
                )}
              </div>
            </div></Rv>

            {/* Club meta card */}
            <Rv delay={80}><div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 2px 8px rgba(0,48,135,0.08)' }}>
              <div className="px-5 py-3" style={{ background: '#EBF3FF', borderBottom: '1.5px solid #C5D8F0' }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#003087' }}>Thông tin CLB</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#003087' }}>
                  <Users size={14} style={{ color: '#5E7AA8', flexShrink: 0 }} />
                  <span>{club.memberCount} thành viên</span>
                </div>
                {club.advisorName && (
                  <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#003087' }}>
                    <GraduationCap size={14} style={{ color: '#5E7AA8', flexShrink: 0 }} />
                    <span>{club.advisorName}</span>
                  </div>
                )}
                {club.establishedDate && (
                  <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#003087' }}>
                    <Calendar size={14} style={{ color: '#5E7AA8', flexShrink: 0 }} />
                    <span>Thành lập {new Date(club.establishedDate).getFullYear()}</span>
                  </div>
                )}
                {club.contactInfo && (
                  <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#003087' }}>
                    <Phone size={14} style={{ color: '#5E7AA8', flexShrink: 0 }} />
                    <span>{club.contactInfo}</span>
                  </div>
                )}
              </div>
            </div></Rv>
          </div>

        </div>

        {/* ── Giới thiệu CLB — full width ── */}
        {landingData && (landingData.landingPage.introduction || landingData.landingPage.mission || landingData.landingPage.vision) && (
          <Rv><div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 2px 8px rgba(0,48,135,0.08)' }}>
            <div className="px-6 py-3" style={{ background: '#EBF3FF', borderBottom: '1.5px solid #C5D8F0' }}>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#003087' }}>Giới thiệu</p>
            </div>
            <div className="p-6">
              {landingData.landingPage.introduction && (
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#334155' }}>
                  {landingData.landingPage.introduction}
                </p>
              )}
              {(landingData.landingPage.mission || landingData.landingPage.vision) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {landingData.landingPage.mission && (
                    <div className="rounded-xl p-4" style={{ background: '#EBF3FF', border: '1.5px solid #C5D8F0' }}>
                      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#003087' }}>Sứ mệnh</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{landingData.landingPage.mission}</p>
                    </div>
                  )}
                  {landingData.landingPage.vision && (
                    <div className="rounded-xl p-4" style={{ background: '#EBF3FF', border: '1.5px solid #C5D8F0' }}>
                      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#003087' }}>Tầm nhìn</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{landingData.landingPage.vision}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div></Rv>
        )}

        {/* ── Thống kê & Bài viết — full width ── */}
        {landingData && (
          <div className="space-y-5">
            <Rv><div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 2px 8px rgba(0,48,135,0.08)' }}>
              <div className="px-6 py-3" style={{ background: '#EBF3FF', borderBottom: '1.5px solid #C5D8F0' }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#003087' }}>Thống kê hoạt động</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0" style={{ borderColor: '#EBF3FF' }}>
                {[
                  { value: landingData.stats.memberCount, label: 'Thành viên', color: '#003087', icon: '👥' },
                  { value: landingData.stats.departmentCount, label: 'Ban chức năng', color: '#0055B8', icon: '🏛️' },
                  { value: landingData.stats.eventCount, label: 'Sự kiện', color: '#C8102E', icon: '📅' },
                  { value: landingData.stats.postCount, label: 'Bài viết', color: '#14b8a6', icon: '📝' },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center justify-center py-7 px-3 gap-1" style={{ borderColor: '#EBF3FF' }}>
                    <span className="text-2xl mb-1">{s.icon}</span>
                    <span className="text-3xl font-black leading-none" style={{ color: s.color }}>{s.value}</span>
                    <span className="text-xs font-semibold mt-1 text-center" style={{ color: '#5E7AA8' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div></Rv>

            {landingData.recentPosts.length > 0 && (
              <Rv delay={80}><div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #C5D8F0', boxShadow: '0 2px 8px rgba(0,48,135,0.08)' }}>
                <div className="px-6 py-3" style={{ background: '#EBF3FF', borderBottom: '1.5px solid #C5D8F0' }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#003087' }}>Bài viết mới nhất</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: '#EBF3FF' }}>
                  {landingData.recentPosts.slice(0, 3).map(post => (
                    <div key={post.id} className="flex flex-col gap-3 p-4">
                      {post.thumbnailUrl ? (
                        <img src={post.thumbnailUrl} alt="" className="w-full h-32 rounded-xl object-cover" style={{ border: '1px solid #C5D8F0' }} />
                      ) : (
                        <div className="w-full h-32 rounded-xl flex items-center justify-center text-white text-2xl font-black"
                          style={{ background: 'linear-gradient(135deg, #003087, #0055B8)' }}>✦</div>
                      )}
                      <div className="flex-1">
                        {post.category && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                            style={{ background: '#EBF3FF', color: '#003087' }}>{post.category}</span>
                        )}
                        <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: '#003087' }}>{post.title}</p>
                        <p className="text-xs mt-1" style={{ color: '#5E7AA8' }}>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3" style={{ borderTop: '1px solid #EBF3FF' }}>
                  <Link to={`/landing-page/${club.id}#posts`} className="text-xs font-bold" style={{ color: '#003087' }}>
                    Xem tất cả bài viết →
                  </Link>
                </div>
              </div></Rv>
            )}
          </div>
        )}

      </div>

      {/* Dialog đăng ký tham gia CLB */}
      <Dialog open={applyOpen} onOpenChange={open => { if (!submitting) setApplyOpen(open) }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: '#003087', borderBottom: '2px solid #001A5E' }}>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-0.5">Đăng ký tham gia</p>
              <p className="text-base font-black text-white leading-tight">{club.name}</p>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            <form id="apply-form" onSubmit={handleSubmit} className="space-y-4 p-6">
              {formFields.length > 0 ? (
                formFields.map(f => (
                  <div key={f.id} className="space-y-1.5">
                    <Label className="text-xs text-gray-600">
                      {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                    {f.type === 'textarea' ? (
                      <textarea rows={3} value={answers[f.id] ?? ''}
                        onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : f.type === 'select' ? (
                      <FilterSelect
                        value={answers[f.id] ?? ''}
                        onChange={value => setAnswers(p => ({ ...p, [f.id]: value }))}
                        options={[
                          { value: '', label: '— Chọn —' },
                          ...((f.linkedFieldId
                            ? fieldSchema.find(mf => mf.id === f.linkedFieldId)?.options
                            : f.options) ?? []).map(o => ({ value: o, label: o })),
                        ]}
                      />
                    ) : f.type === 'file' ? (
                      <div>
                        <label className={`flex items-center gap-2 w-full border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                          fileAnswers[f.id] ? 'border-indigo-400 bg-indigo-50' : 'border-input bg-background hover:bg-gray-50'
                        }`}>
                          <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="flex-1 truncate text-gray-600">
                            {fileAnswers[f.id]?.name ?? 'Chọn file...'}
                          </span>
                          {fileAnswers[f.id] && (
                            <button type="button" onClick={e => { e.preventDefault(); setFileAnswers(p => ({ ...p, [f.id]: null })) }}
                              className="text-gray-400 hover:text-red-500 flex-shrink-0">
                              <X size={13} />
                            </button>
                          )}
                          <input type="file" className="hidden" accept={f.accept}
                            onChange={e => {
                              const file = e.target.files?.[0] ?? null
                              setFileAnswers(p => ({ ...p, [f.id]: file }))
                              e.target.value = ''
                            }} />
                        </label>
                        {f.accept && <p className="text-xs text-gray-400 mt-1">Định dạng chấp nhận: {f.accept}</p>}
                      </div>
                    ) : (
                      <Input value={answers[f.id] ?? ''}
                        onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))} />
                    )}
                  </div>
                ))
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Lý do muốn tham gia</Label>
                  <textarea rows={4} value={answers['note'] ?? ''}
                    onChange={e => setAnswers(p => ({ ...p, note: e.target.value }))}
                    placeholder="Chia sẻ lý do bạn muốn tham gia CLB..."
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}

            </form>
          </div>

          <div className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0"
            style={{ borderTop: '1.5px solid #C5D8F0', background: '#F8FBFF' }}>
            <Button type="button" variant="outline" onClick={() => setApplyOpen(false)} disabled={submitting}
              style={{ borderColor: '#003087', color: '#003087' }}>
              Huỷ
            </Button>
            <Button type="submit" form="apply-form" disabled={submitting}
              style={{ background: '#C8102E', border: 'none', boxShadow: '0 2px 0 #8B0000' }}
              className="hover:opacity-90 font-bold">
              {submitStatus === 'uploading' ? 'Đang tải file...'
                : submitStatus === 'submitting' ? 'Đang gửi...'
                : 'Gửi đơn đăng ký'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog rời CLB / đệ đơn từ chức */}
      {membership && club && (
        <LeaveClubDialog
          open={resignOpen}
          onOpenChange={setResignOpen}
          clubId={id}
          clubName={club.name}
          clubRole={membership.clubRole}
          onSuccess={handleLeaveSuccess}
        />
      )}

      <footer className="py-6 px-6 border-t border-gray-100 text-center bg-white mt-auto">
        <p className="text-xs text-gray-400">© 2026 UniClub Hub · Đại học Kinh tế Tài chính TP.HCM</p>
      </footer>
    </div>
  )
}
