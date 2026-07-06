import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Html5Qrcode } from 'html5-qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { updateEventAttendance } from '../../services/operationsApi'
import type { EventRegistrationItem } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'

const READER_ID = 'checkin-qr-reader'
/** Ignore the same decoded string for this long so one QR isn't processed repeatedly. */
const DEDUP_MS = 3000

/** QR payload = Base64 of `EventId_UserId` (split on the FIRST underscore; userId is a GUID). */
function decodeQrPayload(text: string): { eventId: string; userId: string } | null {
  try {
    const raw = atob(text.trim())
    const idx = raw.indexOf('_')
    if (idx <= 0) return null
    const eventId = raw.slice(0, idx)
    const userId = raw.slice(idx + 1)
    if (!eventId || !userId) return null
    return { eventId, userId }
  } catch { return null }
}

/** Friendly Vietnamese camera label from the raw device label. */
function viCameraLabel(raw: string, index: number): string {
  const l = (raw || '').toLowerCase()
  if (/back|rear|sau|environment|facing back/.test(l)) return 'Camera sau'
  if (/front|user|trước|truoc|face|facing front/.test(l)) return 'Camera trước'
  return `Camera ${index + 1}`
}

/**
 * Camera-based check-in scanner. Works on both phones and desktops: it enumerates the real
 * camera devices and starts one by deviceId (not `facingMode`, which yields a black stream on
 * laptops that have no rear camera). A picker lets the organizer switch cameras.
 * Requires a secure context (HTTPS in prod; localhost in dev) and camera permission.
 */
export default function CheckInScannerModal({ open, eventId, registrations, onClose, onCheckedIn }: {
  open: boolean
  eventId: number
  registrations: EventRegistrationItem[]
  onClose: () => void
  onCheckedIn: (userId: string) => void
}) {
  const [lastResult, setLastResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [activeCam, setActiveCam] = useState('')
  const [status, setStatus] = useState<'starting' | 'running' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  const regsRef = useRef(registrations)
  const recentRef = useRef<Record<string, number>>({})
  const busyRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const runningRef = useRef(false)
  regsRef.current = registrations

  // Latest decode handler — reassigned each render so it always sees the current
  // eventId / registrations / onCheckedIn without restarting the camera.
  const decodeRef = useRef<(text: string) => void>(() => {})
  decodeRef.current = async (text: string) => {
    const now = Date.now()
    if (busyRef.current) return
    if (recentRef.current[text] && now - recentRef.current[text] < DEDUP_MS) return
    recentRef.current[text] = now

    const decoded = decodeQrPayload(text)
    if (!decoded) { setLastResult({ ok: false, text: 'Mã QR không hợp lệ' }); toast.error('Mã QR không hợp lệ'); return }
    if (String(decoded.eventId) !== String(eventId)) {
      setLastResult({ ok: false, text: 'Mã QR không thuộc sự kiện này' }); toast.error('Mã QR không thuộc sự kiện này'); return
    }
    const reg = regsRef.current.find(r => r.userId === decoded.userId)
    if (!reg) { setLastResult({ ok: false, text: 'Sinh viên chưa đăng ký sự kiện' }); toast.error('Sinh viên chưa đăng ký sự kiện'); return }
    if (reg.attendance === 'CheckedIn') {
      setLastResult({ ok: true, text: `${reg.userName} đã điểm danh trước đó` }); toast.info(`${reg.userName} đã điểm danh trước đó`); return
    }

    busyRef.current = true
    try {
      await updateEventAttendance(eventId, decoded.userId, { attendance: 'CheckedIn' })
      onCheckedIn(decoded.userId)
      const label = reg.studentId ? `${reg.userName} (${reg.studentId})` : reg.userName
      setLastResult({ ok: true, text: `Check-in thành công: ${label}` })
      toast.success(`Check-in thành công: ${label}`)
    } catch {
      setLastResult({ ok: false, text: 'Không thể check-in, thử lại' }); toast.error('Không thể check-in, vui lòng thử lại')
    } finally {
      busyRef.current = false
    }
  }

  async function stopCamera() {
    const s = scannerRef.current
    if (s && runningRef.current) {
      runningRef.current = false
      try { await s.stop() } catch { /* already stopped / mid-transition */ }
    }
  }

  // html5-qrcode shows the raw stream; mirror front/desktop cameras so the preview reads the
  // right way round, but leave a rear (environment) camera un-mirrored.
  function applyVideoOrientation() {
    const v = document.querySelector<HTMLVideoElement>(`#${READER_ID} video`)
    if (!v) return
    let mirror = true
    try {
      const stream = v.srcObject as MediaStream | null
      const facing = stream?.getVideoTracks?.()[0]?.getSettings?.()?.facingMode
      if (facing === 'environment') mirror = false
    } catch { /* default to mirrored (front / desktop webcam) */ }
    v.style.transform = mirror ? 'scaleX(-1)' : 'none'
    v.style.objectFit = 'cover'
  }

  async function startCamera(camId: string) {
    const s = scannerRef.current
    if (!s || !camId) return
    setStatus('starting'); setErrorMsg('')
    await stopCamera()
    try {
      await s.start(camId, { fps: 10, qrbox: { width: 240, height: 240 } }, t => decodeRef.current(t), undefined)
      runningRef.current = true
      setStatus('running')
      window.setTimeout(applyVideoOrientation, 200)
    } catch {
      setStatus('error'); setErrorMsg('Không mở được camera này. Hãy thử chọn camera khác bên dưới.')
    }
  }

  // Enumerate cameras + start when the modal opens; stop when it closes/unmounts.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLastResult(null); recentRef.current = {}; setStatus('starting'); setErrorMsg('')

    // Defer a tick so the Radix Dialog portal (and the reader element) is mounted,
    // and guard every step so a failure shows an error instead of crashing the app.
    const timer = window.setTimeout(() => {
      if (cancelled) return
      if (!document.getElementById(READER_ID)) { setStatus('error'); setErrorMsg('Không khởi tạo được vùng quét.'); return }
      let scanner: Html5Qrcode
      try {
        scanner = new Html5Qrcode(READER_ID)
      } catch {
        setStatus('error'); setErrorMsg('Không khởi tạo được camera trên thiết bị này.'); return
      }
      scannerRef.current = scanner

      Html5Qrcode.getCameras()
        .then(devices => {
          if (cancelled) return
          if (!devices || devices.length === 0) { setStatus('error'); setErrorMsg('Không tìm thấy camera nào trên thiết bị.'); return }
          // Build Vietnamese labels, de-duplicating repeats (e.g. multiple rear lenses).
          const counts: Record<string, number> = {}
          const labeled = devices.map((d, i) => ({ id: d.id, raw: d.label || '', label: viCameraLabel(d.label || '', i) }))
          labeled.forEach(c => { counts[c.label] = (counts[c.label] || 0) + 1 })
          const seen: Record<string, number> = {}
          const cams = labeled.map(c => {
            if (counts[c.label] > 1) { seen[c.label] = (seen[c.label] || 0) + 1; return { id: c.id, label: `${c.label} ${seen[c.label]}` } }
            return { id: c.id, label: c.label }
          })
          setCameras(cams)
          const back = labeled.find(c => /back|rear|environment|sau|facing back/i.test(c.raw))
          const chosen = back?.id ?? cams[0].id
          setActiveCam(chosen)
          startCamera(chosen)
        })
        .catch(() => {
          if (cancelled) return
          setStatus('error')
          setErrorMsg('Không thể truy cập camera. Hãy cấp quyền camera cho trình duyệt và dùng HTTPS (hoặc localhost).')
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const s = scannerRef.current
      scannerRef.current = null
      if (s) {
        void (async () => { if (runningRef.current) { runningRef.current = false; try { await s.stop() } catch { /* noop */ } } try { s.clear() } catch { /* noop */ } })()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: D.border, borderRadius: 8, outline: 'none', background: D.card, color: D.ink,
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 420, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader><DialogTitle style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>Quét mã Check-in</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div id={READER_ID} style={{ width: '100%', borderRadius: 12, overflow: 'hidden', border: D.border, background: '#000', minHeight: 240 }} />

          {cameras.length > 1 && (
            <select value={activeCam} onChange={e => { setActiveCam(e.target.value); startCamera(e.target.value) }} style={selectStyle}>
              {cameras.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}

          {status === 'error' ? (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: D.red, textAlign: 'center' }}>{errorMsg}</p>
          ) : (
            <p style={{ margin: 0, fontSize: 11, color: D.inkMuted, textAlign: 'center' }}>
              {status === 'starting' ? 'Đang mở camera...' : 'Đưa camera vào mã QR trên điện thoại sinh viên. Hệ thống tự điểm danh khi đọc được mã hợp lệ.'}
            </p>
          )}

          {lastResult && (
            <div style={{
              padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'center',
              background: lastResult.ok ? '#dcfce7' : '#fee2e2',
              color: lastResult.ok ? '#15803d' : '#dc2626',
              border: `1.5px solid ${lastResult.ok ? '#86efac' : '#fca5a5'}`,
            }}>
              {lastResult.text}
            </div>
          )}
        </div>
        <DialogFooter style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 800, border: D.border, borderRadius: D.radius, background: D.ink, color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: D.shadow(2, 2) }}>
            Xong
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
