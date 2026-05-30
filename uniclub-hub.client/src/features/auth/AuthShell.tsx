import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

type AuthShellProps = {
  eyebrow: string
  title: string
  accent: string
  description: string
  children: React.ReactNode
}

const D = {
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  coral: '#ff5a3c',
  lemon: '#facc15',
  indigo: '#4f46e5',
  border: '1.5px solid #15131a',
}

export default function AuthShell({ eyebrow, title, accent, description, children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <style>{`
        .auth-shell {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 26px;
          box-sizing: border-box;
          background: ${D.bg};
          font-family: 'Be Vietnam Pro', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .auth-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 13% 20%, rgba(31, 191, 166, .9) 0 5px, transparent 6px),
            radial-gradient(circle at 78% 30%, rgba(126, 211, 202, .8) 0 24px, transparent 25px),
            radial-gradient(circle at 92% 23%, transparent 0 30px, #ff6a52 31px 35px, transparent 36px),
            radial-gradient(circle at 55% 87%, #ffd028 0 12px, #15131a 13px 15px, transparent 16px);
          pointer-events: none;
        }
        .auth-confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .auth-confetti span {
          position: absolute;
          z-index: 0;
          border: 3px solid ${D.ink};
          box-sizing: border-box;
        }
        .auth-confetti .triangle {
          width: 0;
          height: 0;
          border-left: 18px solid transparent;
          border-right: 18px solid transparent;
          border-bottom: 30px solid #54bff5;
          filter: drop-shadow(2px 2px 0 ${D.ink});
          transform: rotate(-13deg);
        }
        .auth-confetti .star {
          width: 28px;
          height: 28px;
          border: 0;
          background: #ff5a3c;
          clip-path: polygon(50% 0%, 62% 35%, 100% 35%, 68% 56%, 80% 92%, 50% 70%, 20% 92%, 32% 56%, 0 35%, 38% 35%);
        }
        .auth-confetti .spark {
          width: 24px;
          height: 24px;
          border: 0;
          background: #8b5cf6;
          clip-path: polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%);
          filter: drop-shadow(1.5px 1.5px 0 ${D.ink});
        }
        .auth-confetti .ring {
          width: 68px;
          height: 68px;
          border-radius: 999px;
          border-color: #22c7b8;
          background: transparent;
        }
        .auth-confetti .pill {
          width: 52px;
          height: 18px;
          border-radius: 999px;
          border-color: #58bff1;
          border-left-color: transparent;
          border-right-color: transparent;
          transform: rotate(12deg);
        }
        .auth-confetti .square {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #ec4899;
          transform: rotate(13deg);
        }
        .auth-confetti .plus {
          width: 28px;
          height: 28px;
          border: 0;
        }
        .auth-confetti .plus::before,
        .auth-confetti .plus::after {
          content: '';
          position: absolute;
          background: #ff5a3c;
          border-radius: 2px;
        }
        .auth-confetti .plus::before {
          width: 28px;
          height: 8px;
          top: 10px;
        }
        .auth-confetti .plus::after {
          width: 8px;
          height: 28px;
          left: 10px;
        }
        .auth-confetti .welcome {
          width: 118px;
          height: 118px;
          border-radius: 999px;
          background: ${D.lemon};
          display: grid;
          place-items: center;
          text-align: center;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.2;
          transform: rotate(13deg);
        }
        .auth-confetti .welcome b {
          display: block;
          transform: rotate(12deg);
        }
        .auth-wrap {
          width: min(1120px, 100%);
          min-height: 640px;
          display: grid;
          grid-template-columns: 1fr 520px;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.22);
          box-shadow: 0 22px 60px rgba(21,19,26,.16);
          position: relative;
          z-index: 1;
        }
        .auth-brand {
          position: relative;
          padding: 46px;
          color: #fff;
          background: linear-gradient(145deg, rgba(21,19,26,.8), rgba(21,19,26,.94));
          overflow: hidden;
        }
        .auth-brand::after {
          content: '';
          position: absolute;
          width: 170px;
          height: 170px;
          right: -36px;
          bottom: -34px;
          border-radius: 999px;
          border: 3px solid rgba(255,255,255,.25);
          background: rgba(250, 204, 21, .12);
          transform: rotate(-8deg);
        }
        .auth-form-panel {
          background: ${D.card};
          padding: 72px 58px;
          display: flex;
          align-items: center;
        }
        .auth-form-inner {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
        }
        .auth-logo-link {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          text-decoration: none;
          position: relative;
          z-index: 1;
        }
        .auth-benefits {
          margin-top: 48px;
          display: grid;
          gap: 16px;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 900px) {
          .auth-shell { padding: 14px; }
          .auth-wrap {
            min-height: auto;
            grid-template-columns: 1fr;
            border-radius: 22px;
          }
          .auth-brand {
            min-height: 300px;
            padding: 28px;
          }
          .auth-form-panel {
            padding: 32px 24px;
          }
        }
      `}</style>

      <div className="auth-confetti" aria-hidden>
        <span className="triangle" style={{ left: '7%', top: '17%' }} />
        <span className="spark" style={{ left: '18%', top: '78%' }} />
        <span className="ring" style={{ left: '10%', bottom: '10%' }} />
        <span className="star" style={{ right: '13%', top: '45%' }} />
        <span className="pill" style={{ right: '9%', bottom: '28%' }} />
        <span className="square" style={{ right: '11%', bottom: '13%' }} />
        <span className="plus" style={{ left: '71%', bottom: '7%' }} />
        <span className="welcome" style={{ right: '7%', top: '21%' }}>
          <b>WELCOME<br />TO UEF</b>
        </span>
      </div>

      <div className="auth-wrap">
        <section className="auth-brand">
          <Link to="/" className="auth-logo-link" title="Về trang chủ">
            <span style={{
              width: 38, height: 38, borderRadius: 10, background: D.lemon,
              display: 'grid', placeItems: 'center', fontWeight: 900,
              color: D.ink, transform: 'rotate(-4deg)',
              boxShadow: `3px 3px 0 ${D.coral}`,
            }}>
              U!
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 18, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1 }}>
                UniClub
              </span>
              <span style={{ display: 'block', color: D.coral, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', marginTop: 3 }}>
                ★ UEF CAMPUS
              </span>
            </span>
          </Link>

          <div style={{ marginTop: 64, position: 'relative', zIndex: 1 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,.55)',
              color: '#ffe8b5', fontSize: 11, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '.12em',
            }}>
              ★ {eyebrow}
            </span>
            <h1 style={{
              margin: '34px 0 0',
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.02,
              letterSpacing: '-.05em',
              fontWeight: 900,
              maxWidth: 460,
            }}>
              {title}<br />
              <span style={{ color: D.coral }}>{accent}</span>
            </h1>
            <p style={{
              margin: '24px 0 0',
              maxWidth: 430,
              color: 'rgba(255,255,255,.72)',
              fontSize: 16,
              lineHeight: 1.7,
              fontWeight: 600,
            }}>
              {description}
            </p>
          </div>

          <div className="auth-benefits">
            {['Quản lý CLB, thành viên và hoạt động tập trung', 'Theo dõi đơn đăng ký, nhiệm vụ và thông báo', 'Không gian sinh viên UEF kết nối dễ hơn'].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.82)', fontSize: 13, fontWeight: 700 }}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: 'rgba(255,90,60,.22)', display: 'grid', placeItems: 'center', color: D.coral, flexShrink: 0 }}>
                  <CheckCircle2 size={15} fill="currentColor" color={D.coral} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-inner">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
