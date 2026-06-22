import { useEffect, useState } from 'react'
import { C, Rv, Tag, PublicFooter } from '@/components/public/publicComponents'
import PublicHeader from '@/components/layouts/PublicHeader'
import { ChevronDown } from 'lucide-react'
import { getPublicContactInfo } from '@/components/membership/services/adminApi'

const SUBJECTS = ['Hỏi về CLB', 'Hỗ trợ kỹ thuật', 'Góp ý', 'Hợp tác', 'Khác']

const FALLBACK_INFO: Record<string, string> = {
  'contact.office_name':    'Phòng Công tác Sinh viên',
  'contact.office_address': 'Lầu 3, Toà nhà A\n276 Điện Biên Phủ, Quận 3, TP.HCM',
  'contact.email':          'clb@uef.edu.vn',
  'contact.email_note':     'Phản hồi trong vòng 24 giờ làm việc.',
  'contact.hours_label':    'Thứ 2 — Thứ 6',
  'contact.hours_detail':   '8:00 — 17:00 · Trừ ngày lễ',
}
const FALLBACK_FAQ = [
  { q: 'Làm sao tham gia CLB?', a: 'Vào trang Câu lạc bộ → chọn CLB → nhấn Nộp đơn. Sau khi nộp đơn, ban tuyển thành viên sẽ liên hệ lại trong vòng 3-5 ngày làm việc.' },
  { q: 'Quên mật khẩu phải làm sao?', a: 'Bấm "Quên?" ở trang đăng nhập, nhập email tài khoản — hệ thống sẽ gửi link đặt lại mật khẩu trong vòng vài phút.' },
  { q: 'Muốn tạo CLB mới thì liên hệ ai?', a: 'Liên hệ Phòng Công tác Sinh viên qua form trên hoặc đến trực tiếp Lầu 3, Toà nhà A. Cần chuẩn bị đề án thành lập CLB theo mẫu.' },
  { q: 'Một sinh viên có thể tham gia bao nhiêu CLB?', a: 'Không giới hạn số lượng CLB, nhưng khuyến khích tham gia tối đa 2-3 CLB để đảm bảo chất lượng đóng góp.' },
  { q: 'Làm sao để rời CLB?', a: 'Đăng nhập vào hệ thống, vào trang "Hoạt động của tôi" → chọn CLB → gửi đơn xin rút lui. Trưởng CLB sẽ xử lý trong 5 ngày làm việc.' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: C.radiusPill,
  border: C.border, background: C.bg, padding: '0 14px',
  fontSize: 13.5, color: C.ink, outline: 'none',
  marginBottom: 10, fontWeight: 500, boxSizing: 'border-box',
  fontFamily: "'Be Vietnam Pro', sans-serif",
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.inkDim,
  marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase',
}

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Hỏi về CLB'])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [faqOpen, setFaqOpen] = useState(false)
  const [info, setInfo] = useState<Record<string, string>>(FALLBACK_INFO)
  const [faqs, setFaqs] = useState(FALLBACK_FAQ)

  useEffect(() => {
    getPublicContactInfo()
      .then(data => {
        if (Object.keys(data).length > 0) setInfo(prev => ({ ...prev, ...data }))
        try {
          const parsed = JSON.parse(data['contact.faq'] ?? '')
          if (Array.isArray(parsed) && parsed.length > 0) setFaqs(parsed)
        } catch { /* keep fallback */ }
      })
      .catch(() => { /* keep fallback */ })
  }, [])

  function toggleSubject(s: string) {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return
    setSent(true)
  }

  return (
    <div className="v3-page v3-enter" style={{
      backgroundColor: '#EBF3FF',
      backgroundImage: 'radial-gradient(circle, rgba(0,48,135,0.10) 1.5px, transparent 1.5px)',
      backgroundSize: '26px 26px',
    }}>
      <PublicHeader />

      <section style={{ padding: '48px 28px 56px', flex: 1 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Heading */}
          {/* <Rv>
            <Tag bg={C.coral} color={C.bg} style={{ marginBottom: 14 }}>Liên hệ</Tag>
          </Rv> */}
          <Rv delay={60}>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: C.ink,
              letterSpacing: '-.045em', lineHeight: 0.95, margin: '0 0 12px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}>
              Gửi tin nhắn{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                cho chúng mình.
              </span>
            </h1>
          </Rv>
          <Rv delay={100}>
            <p style={{ fontSize: 17, color: C.inkDim, lineHeight: 1.5, margin: '0 0 40px', fontWeight: 500 }}>
              Có thắc mắc về câu lạc bộ, hệ thống hay cần hỗ trợ? Liên hệ ngay — đội ngũ UniClub luôn sẵn sàng.
            </p>
          </Rv>

          {/* ── Form + Info cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'stretch', marginBottom: 40 }}>

            {/* Form */}
            <Rv delay={140}>
              <div style={{
                background: C.card, border: C.border, borderRadius: 20,
                boxShadow: C.shadow(6, 6), padding: '28px 24px',
                height: '100%', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column',
              }}>
                {sent ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Đã gửi thành công!</div>
                    <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 24, lineHeight: 1.5 }}>
                      Chúng mình sẽ phản hồi trong vòng 24 giờ qua email.
                    </div>
                    <button onClick={() => { setSent(false); setName(''); setEmail(''); setMessage('') }} style={{
                      padding: '10px 22px', borderRadius: C.radiusPill,
                      background: C.ink, color: C.lemon, border: C.border,
                      fontSize: 14, fontWeight: 700, boxShadow: C.shadow(3, 3),
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>Gửi tin nhắn khác</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
                      <div>
                        <label style={labelStyle}>Họ và tên</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                          placeholder="Nguyễn Văn A" style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="example@email.com" style={inputStyle} required />
                      </div>
                    </div>

                    <label style={labelStyle}>Chủ đề</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {SUBJECTS.map(s => {
                        const active = selectedSubjects.includes(s)
                        return (
                          <button key={s} type="button" onClick={() => toggleSubject(s)} style={{
                            padding: '6px 14px', borderRadius: C.radiusPill,
                            background: active ? C.ink : C.card,
                            color: active ? C.lemon : C.ink,
                            border: C.border, fontSize: 12, fontWeight: 700,
                            boxShadow: active ? 'none' : C.shadow(2, 2),
                            transform: active ? 'translate(2px,2px)' : 'none',
                            transition: 'all .12s', cursor: 'pointer', fontFamily: 'inherit',
                          }}>{s}</button>
                        )
                      })}
                    </div>

                    <label style={labelStyle}>Nội dung</label>
                    <textarea
                      value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="Mô tả chi tiết câu hỏi hoặc yêu cầu của bạn…"
                      required
                      style={{
                        ...inputStyle, borderRadius: C.radiusSm, height: 'auto',
                        padding: '12px 14px', resize: 'none', flex: 1, minHeight: 120,
                      }}
                    />

                    <button type="submit" style={{
                      width: '100%', height: 48, borderRadius: C.radiusPill,
                      background: C.coral, color: C.bg, border: C.border,
                      boxShadow: C.shadow(), marginTop: 12,
                      fontSize: 15, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: 'inherit', flexShrink: 0,
                    }}>Gửi tin nhắn →</button>
                  </form>
                )}
              </div>
            </Rv>

            {/* Info cards — 3 thẻ, không có FAQ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Rv delay={180}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.lemon, border: C.border, boxShadow: C.shadow() }}>
                  <Tag bg={C.ink} color={C.lemon} style={{ marginBottom: 10 }}>Văn phòng</Tag>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{info['contact.office_name']}</div>
                  <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                    {info['contact.office_address']}
                  </div>
                </div>
              </Rv>

              <Rv delay={240}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.indigo, border: C.border, boxShadow: C.shadow() }}>
                  <Tag bg="rgba(255,255,255,.2)" color={C.bg} style={{ marginBottom: 10 }}>Email</Tag>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.bg, marginBottom: 4 }}>{info['contact.email']}</div>
                  <div style={{ fontSize: 13, color: C.bg, opacity: 0.7, lineHeight: 1.5 }}>
                    {info['contact.email_note']}
                  </div>
                </div>
              </Rv>

              <Rv delay={300}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.mint, border: C.border, boxShadow: C.shadow() }}>
                  <Tag bg="rgba(255,255,255,.25)" color={C.bg} style={{ marginBottom: 10 }}>Giờ làm việc</Tag>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.bg, marginBottom: 4 }}>{info['contact.hours_label']}</div>
                  <div style={{ fontSize: 13, color: C.bg, opacity: 0.7, lineHeight: 1.5 }}>{info['contact.hours_detail']}</div>
                </div>
              </Rv>
            </div>
          </div>

          {/* ── FAQ full-width accordion ── */}
          <Rv delay={360}>
            <div style={{
              background: C.card, border: C.border, borderRadius: 20,
              boxShadow: C.shadow(6, 6), overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => { setFaqOpen(v => !v); setOpenFaq(null) }}
                style={{
                  width: '100%', padding: '20px 28px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: faqOpen ? C.border : 'none',
                  fontFamily: 'inherit', textAlign: 'left',
                  transition: 'background .15s',
                }}
              >
                <Tag style={{ flexShrink: 0 }}>FAQ</Tag>
                <span style={{ fontSize: 14, color: C.inkMuted, fontWeight: 500, flex: 1 }}>
                  Câu hỏi thường gặp
                </span>
                <span style={{ fontSize: 12, color: C.inkMuted, marginRight: 6 }}>
                  {faqOpen ? 'Thu gọn' : `${faqs.length} câu hỏi`}
                </span>
                <ChevronDown size={16} style={{
                  color: C.inkMuted, flexShrink: 0,
                  transform: faqOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s',
                }} />
              </button>

              {faqOpen && faqs.map(({ q, a }: { q: string; a: string }, i: number) => {
                const isOpen = openFaq === i
                return (
                  <div key={i} style={{ borderBottom: i < faqs.length - 1 ? C.border : 'none' }}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{
                        width: '100%', padding: '18px 28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                        background: isOpen ? `${C.lemon}40` : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit', transition: 'background .15s',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{q}</span>
                      <ChevronDown size={16} style={{
                        color: C.inkMuted, flexShrink: 0,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform .2s',
                      }} />
                    </button>
                    {isOpen && (
                      <div style={{
                        padding: '0 28px 18px',
                        fontSize: 13.5, color: C.inkMuted, lineHeight: 1.65,
                      }}>{a}</div>
                    )}
                  </div>
                )
              })}

            </div>
          </Rv>

        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
