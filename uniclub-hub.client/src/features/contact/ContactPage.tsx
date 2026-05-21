import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, Rv, Tag, V3Footer } from '@/components/public/v3'
import PublicHeader from '@/components/layouts/PublicHeader'

const SUBJECTS = ['Hỏi về CLB', 'Hỗ trợ kỹ thuật', 'Góp ý', 'Hợp tác', 'Khác']
const FAQ = [
  { q: 'Làm sao tham gia CLB?', a: 'Vào trang Câu lạc bộ → chọn CLB → nhấn Nộp đơn.' },
  { q: 'Quên mật khẩu?', a: 'Bấm "Quên?" ở trang đăng nhập để đặt lại qua email.' },
  { q: 'Muốn tạo CLB mới?', a: 'Liên hệ Phòng Công tác Sinh viên qua form này.' },
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
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Hỏi về CLB'])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

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
    <div className="v3-page v3-enter">
      <PublicHeader />

      <section style={{ padding: '48px 28px 64px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Heading */}
          <Rv>
            <Tag bg={C.coral} color={C.bg} style={{ marginBottom: 14 }}>Liên hệ</Tag>
          </Rv>
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
            <p style={{ fontSize: 17, color: C.inkDim, lineHeight: 1.5, margin: '0 0 40px', maxWidth: 560, fontWeight: 500 }}>
              Có thắc mắc về câu lạc bộ, hệ thống hay cần hỗ trợ? Liên hệ ngay — đội ngũ UniClub luôn sẵn sàng.
            </p>
          </Rv>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'flex-start' }}>
            {/* ── Form ── */}
            <Rv delay={140}>
              <div style={{
                background: C.card, border: C.border, borderRadius: 20,
                boxShadow: C.shadow(6, 6), padding: '28px 24px',
              }}>
                {sent ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
                      Đã gửi thành công!
                    </div>
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
                  <form onSubmit={handleSubmit} noValidate>
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
                      rows={5} required
                      style={{
                        ...inputStyle, borderRadius: C.radiusSm, height: 'auto',
                        padding: '12px 14px', resize: 'vertical', minHeight: 110,
                      }}
                    />

                    <button type="submit" style={{
                      width: '100%', height: 48, borderRadius: C.radiusPill,
                      background: C.coral, color: C.bg, border: C.border,
                      boxShadow: C.shadow(), marginTop: 4,
                      fontSize: 15, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: 'inherit',
                    }}>Gửi tin nhắn →</button>
                  </form>
                )}
              </div>
            </Rv>

            {/* ── Info cards ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Rv delay={180}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.lemon, border: C.border, boxShadow: C.shadow() }}>
                  <Tag bg={C.ink} color={C.lemon} style={{ marginBottom: 10 }}>Văn phòng</Tag>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
                    Phòng Công tác Sinh viên
                  </div>
                  <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.55 }}>
                    Lầu 3, Toà nhà A<br />
                    276 Điện Biên Phủ, Quận 3, TP.HCM
                  </div>
                </div>
              </Rv>

              <Rv delay={240}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.indigo, border: C.border, boxShadow: C.shadow() }}>
                  <Tag bg="rgba(255,255,255,.2)" color={C.bg} style={{ marginBottom: 10 }}>Email</Tag>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.bg, marginBottom: 4 }}>clb@uef.edu.vn</div>
                  <div style={{ fontSize: 13, color: C.bg, opacity: 0.7, lineHeight: 1.5 }}>
                    Phản hồi trong vòng 24 giờ làm việc.
                  </div>
                </div>
              </Rv>

              <Rv delay={300}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.mint, border: C.border, boxShadow: C.shadow() }}>
                  <Tag bg="rgba(255,255,255,.25)" color={C.bg} style={{ marginBottom: 10 }}>Giờ làm việc</Tag>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.bg, marginBottom: 4 }}>Thứ 2 — Thứ 6</div>
                  <div style={{ fontSize: 13, color: C.bg, opacity: 0.7, lineHeight: 1.5 }}>8:00 — 17:00 · Trừ ngày lễ</div>
                </div>
              </Rv>

              <Rv delay={360}>
                <div style={{ padding: 20, borderRadius: C.radius, background: C.card, border: C.border, boxShadow: C.shadow() }}>
                  <Tag style={{ marginBottom: 10 }}>FAQ</Tag>
                  <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.6 }}>
                    {FAQ.map(({ q, a }, i) => (
                      <div key={i} style={{
                        marginBottom: i < FAQ.length - 1 ? 10 : 0,
                        paddingBottom: i < FAQ.length - 1 ? 10 : 0,
                        borderBottom: i < FAQ.length - 1 ? `1px dashed ${C.rule}` : 'none',
                      }}>
                        <div style={{ fontWeight: 700, color: C.ink, fontSize: 13, marginBottom: 2 }}>{q}</div>
                        <div style={{ color: C.inkMuted, fontSize: 12.5 }}>{a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Rv>
            </div>
          </div>
        </div>
      </section>

      <V3Footer />
    </div>
  )
}
