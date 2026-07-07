import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { resignFromClub, submitResignation } from '@/components/membership/services/clubApi'
import type { ResignationPreference } from '@/components/membership/services/club.types'
import { CLUB_ROLE_LABELS, isLeaderRole } from '@/constants/clubRoles'
import { D } from '@/components/shared/managementTheme'
import { getApiErrorMessage } from '@/lib/apiError'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: number
  clubName: string
  clubRole: string
  onSuccess?: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: D.inkMuted,
  display: 'block',
  marginBottom: 8,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
}

const cancelBtn: React.CSSProperties = {
  background: D.card,
  color: D.inkDim,
  border: D.border,
  boxShadow: D.shadow(2, 2),
  padding: '8px 14px',
  borderRadius: D.pill,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const PREFERENCE_OPTIONS = [
  { value: 'LeaveClub' as const, label: 'Rời CLB hoàn toàn', desc: 'Chấm dứt tư cách thành viên' },
  { value: 'BecomeMember' as const, label: 'Trở thành thành viên thường', desc: 'Giữ lại tư cách thành viên, không còn vai trò quản lý' },
]

function PreferenceOption({
  value,
  label,
  desc,
  checked,
  onSelect,
}: {
  value: string
  label: string
  desc: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: checked ? D.border : D.borderLight,
        background: checked ? D.bg : D.card,
        boxShadow: checked ? D.shadow(2, 2) : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'box-shadow .12s, background .12s',
      }}
    >
      <span style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        flexShrink: 0,
        marginTop: 1,
        border: checked ? `5px solid ${D.indigo}` : D.border,
        background: D.card,
        boxSizing: 'border-box',
      }} />
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: D.ink, lineHeight: 1.3 }}>
          {label}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: D.inkMuted, marginTop: 3, lineHeight: 1.4 }}>
          {desc}
        </span>
      </span>
      <input type="radio" name="preference" value={value} checked={checked} readOnly style={{ display: 'none' }} />
    </button>
  )
}

export default function LeaveClubDialog({
  open,
  onOpenChange,
  clubId,
  clubName,
  clubRole,
  onSuccess,
}: Props) {
  const [resigning, setResigning] = useState(false)
  const [resignPreference, setResignPreference] = useState<ResignationPreference>('LeaveClub')
  const isLeader = isLeaderRole(clubRole)
  const roleLabel = CLUB_ROLE_LABELS[clubRole] ?? clubRole

  useEffect(() => {
    if (open) setResignPreference('LeaveClub')
  }, [open])

  async function handleResign() {
    setResigning(true)
    try {
      await resignFromClub(clubId)
      toast.success('Đã rời khỏi CLB.')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại.'))
    } finally {
      setResigning(false)
    }
  }

  async function handleSubmitResignation() {
    setResigning(true)
    try {
      await submitResignation(clubId, { preference: resignPreference })
      toast.success('Đã gửi đơn từ chức. Vui lòng chờ phê duyệt.')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gửi đơn thất bại.'))
    } finally {
      setResigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md gap-0 p-0 overflow-hidden"
        style={{ fontFamily: "'Be Vietnam Pro', sans-serif", border: D.border, boxShadow: D.shadow(4, 4) }}
      >
        <div style={{ padding: '18px 20px 0' }}>
          <DialogHeader>
            <DialogTitle style={{ color: D.ink, fontWeight: 900, fontSize: 17, letterSpacing: '-.02em' }}>
              {isLeader ? `Đệ đơn từ chức — ${clubName}` : 'Xác nhận rời CLB'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div style={{ padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLeader ? (
            <>
              <div style={{
                background: D.bg,
                borderRadius: 10,
                padding: '12px 14px',
                border: D.borderLight,
                fontSize: 13,
                color: D.inkDim,
                lineHeight: 1.55,
              }}>
                Bạn đang là <strong style={{ color: D.ink }}>{roleLabel}</strong> tại CLB này.
                Đơn từ chức cần được phê duyệt trước khi có hiệu lực.
              </div>

              <div>
                <label style={labelStyle}>Sau khi được duyệt, bạn muốn</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PREFERENCE_OPTIONS.map(opt => (
                    <PreferenceOption
                      key={opt.value}
                      value={opt.value}
                      label={opt.label}
                      desc={opt.desc}
                      checked={resignPreference === opt.value}
                      onSelect={() => setResignPreference(opt.value)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{
              background: D.bg,
              borderRadius: 10,
              padding: '14px 16px',
              border: D.borderLight,
              fontSize: 13,
              color: D.inkDim,
              lineHeight: 1.55,
            }}>
              Bạn có chắc muốn rời khỏi{' '}
              <strong style={{ color: D.ink }}>{clubName}</strong>?
              <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: D.inkMuted }}>
                Bạn có thể nộp đơn đăng ký lại sau khi rời CLB.
              </span>
            </div>
          )}
        </div>

        <DialogFooter
          style={{
            borderTop: D.borderLight,
            background: D.bg,
            padding: '14px 20px',
            marginTop: 14,
            gap: 8,
          }}
        >
          <button type="button" onClick={() => onOpenChange(false)} disabled={resigning} style={cancelBtn}>
            Huỷ
          </button>
          {isLeader ? (
            <button
              type="button"
              onClick={handleSubmitResignation}
              disabled={resigning}
              style={{
                ...cancelBtn,
                background: D.amber,
                color: '#fff',
                fontWeight: 700,
                opacity: resigning ? 0.7 : 1,
                cursor: resigning ? 'not-allowed' : 'pointer',
              }}
            >
              {resigning ? 'Đang gửi...' : 'Gửi đơn từ chức'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResign}
              disabled={resigning}
              style={{
                ...cancelBtn,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: D.red,
                color: '#fff',
                fontWeight: 700,
                opacity: resigning ? 0.7 : 1,
                cursor: resigning ? 'not-allowed' : 'pointer',
              }}
            >
              <LogOut size={13} />
              {resigning ? 'Đang xử lý...' : 'Rời CLB'}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
