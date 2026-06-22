import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { C } from '@/components/public/publicComponents'
import SkyBackground from '@/components/public/SkyBackground'

type AuthShellProps = {
  eyebrow: string
  title: string
  accent: string
  description: string
  children: React.ReactNode
}

const BENEFITS = [
  'Quản lý CLB, thành viên và hoạt động tập trung',
  'Theo dõi đơn đăng ký, nhiệm vụ và thông báo',
  'Không gian sinh viên UEF kết nối dễ hơn',
]

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
          font-family: 'Be Vietnam Pro', sans-serif;
          position: relative;
          z-index: 0; /* tạo stacking context để lớp nền trời (z-index:-1) hiển thị */
          background: transparent;
        }
        .auth-wrap {
          width: min(1080px, 100%);
          min-height: 620px;
          display: grid;
          grid-template-columns: 1.05fr 500px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(10, 47, 110, .22);
          position: relative;
          z-index: 1;
          /* Solid panel (no backdrop-filter): a large backdrop-blur over the
             animated SkyBackground forces a full-panel re-blur every frame and
             tanks performance. Children cover this fill, so nothing is lost. */
          background: #ffffff;
        }
        .auth-brand {
          position: relative;
          padding: 48px;
          color: #fff;
          background: linear-gradient(150deg, #0a2f6e 0%, #0e3f8f 58%, #123f86 100%);
          overflow: hidden;
        }
        .auth-brand::before {
          content: '';
          position: absolute;
          width: 300px; height: 300px;
          right: -80px; top: -70px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 189, 248, .38) 0%, transparent 70%);
        }
        .auth-brand::after {
          content: '';
          position: absolute;
          width: 220px; height: 220px;
          left: -60px; bottom: -70px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(225, 29, 42, .3) 0%, transparent 70%);
        }
        .auth-form-panel {
          background: rgba(255, 255, 255, .94);
          padding: 64px 56px;
          display: flex;
          align-items: center;
        }
        .auth-form-inner {
          width: 100%;
          max-width: 410px;
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
          margin-top: 44px;
          display: grid;
          gap: 14px;
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
          .auth-brand { min-height: 260px; padding: 30px; }
          .auth-form-panel { padding: 34px 24px; }
        }
      `}</style>

      <SkyBackground />

      <div className="auth-wrap">
        <section className="auth-brand">
          <Link to="/" className="auth-logo-link" title="Về trang chủ">
            <span style={{
              width: 38, height: 38, borderRadius: 10, background: '#fff',
              display: 'grid', placeItems: 'center', fontWeight: 900,
              color: C.ink, transform: 'rotate(-4deg)',
              boxShadow: `3px 3px 0 ${C.coral}`,
            }}>
              U!
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 18, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1 }}>
                UniClub
              </span>
              <span style={{ display: 'block', color: '#ffd0d3', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', marginTop: 3 }}>
                ★ UEF CAMPUS
              </span>
            </span>
          </Link>

          <div style={{ marginTop: 60, position: 'relative', zIndex: 1 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,.5)',
              color: '#cfe6ff', fontSize: 11, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '.12em',
            }}>
              ★ {eyebrow}
            </span>
            <h1 style={{
              margin: '30px 0 0',
              fontSize: 'clamp(34px, 5vw, 52px)',
              lineHeight: 1.04,
              letterSpacing: '-.05em',
              fontWeight: 900,
              maxWidth: 440,
            }}>
              {title}<br />
              <span style={{ color: '#ff6b73' }}>{accent}</span>
            </h1>
            <p style={{
              margin: '22px 0 0',
              maxWidth: 420,
              color: 'rgba(255,255,255,.78)',
              fontSize: 15.5,
              lineHeight: 1.7,
              fontWeight: 500,
            }}>
              {description}
            </p>
          </div>

          <div className="auth-benefits">
            {BENEFITS.map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: 'rgba(225,29,42,.24)', display: 'grid', placeItems: 'center', color: '#ff6b73', flexShrink: 0 }}>
                  <CheckCircle2 size={15} fill="currentColor" color="#ff6b73" />
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
