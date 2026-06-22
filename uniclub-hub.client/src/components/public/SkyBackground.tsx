import {
  GraduationCap, Sparkles, Star, Trophy, Music, BookOpen, Users, Heart,
} from 'lucide-react'
import { C } from './publicComponents'

// Nền trời dùng chung (trang chủ + auth): gradient + mây puffy + icon màu trôi nhẹ.
// position: fixed, nằm sau toàn bộ nội dung (z-index -1).

type FloatIcon = {
  Icon: typeof GraduationCap
  top: string
  left: string
  size: number
  color: string
  delay: number
  rot: number
}

const ICONS: FloatIcon[] = [
  { Icon: GraduationCap, top: '15%', left: '7%',  size: 40, color: C.indigo, delay: 0,   rot: -10 },
  { Icon: Sparkles,      top: '22%', left: '88%', size: 32, color: C.coral,  delay: 0.6, rot: 8 },
  { Icon: Star,          top: '58%', left: '5%',  size: 28, color: C.sky,    delay: 1.2, rot: -6 },
  { Icon: Music,         top: '70%', left: '83%', size: 30, color: C.violet, delay: 0.9, rot: 10 },
  { Icon: Trophy,        top: '40%', left: '71%', size: 34, color: C.coral,  delay: 1.5, rot: -8 },
  { Icon: BookOpen,      top: '82%', left: '40%', size: 30, color: C.indigo, delay: 0.3, rot: 6 },
  { Icon: Heart,         top: '9%',  left: '52%', size: 26, color: C.pink,   delay: 1.8, rot: 12 },
  { Icon: Users,         top: '49%', left: '20%', size: 30, color: C.mint,   delay: 0.5, rot: -4 },
]

export default function SkyBackground() {
  return (
    <div className="sky-bg" aria-hidden>
      <style>{`
        .sky-bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
          background:
            radial-gradient(60% 44% at 50% -8%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 62%),
            radial-gradient(120% 70% at 86% 2%, rgba(255,255,255,.3) 0%, rgba(255,255,255,0) 52%),
            linear-gradient(180deg, #7cc1ec 0%, #97cef2 34%, #b8dff9 64%, #ddf1fd 100%);
        }
        .sky-bg .sun {
          position: absolute;
          top: -150px; left: 50%;
          width: 560px; height: 560px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,255,255,.45) 32%, rgba(255,255,255,0) 70%);
        }
        .sky-bg .clouds {
          position: absolute;
          inset: -14% -22%;
          animation: skyDrift 150s linear infinite;
        }
        .sky-bg .clouds--far { animation-duration: 250s; opacity: .65; }
        @keyframes skyDrift {
          from { transform: translateX(0); }
          to   { transform: translateX(-7%); }
        }
        .sky-bg .cloud {
          position: absolute;
          border-radius: 50%;
          background:
            radial-gradient(closest-side at 30% 62%, #fff 0%, rgba(255,255,255,0) 100%),
            radial-gradient(closest-side at 48% 44%, #fff 0%, rgba(255,255,255,0) 100%),
            radial-gradient(closest-side at 66% 60%, #fff 0%, rgba(255,255,255,0) 100%),
            radial-gradient(closest-side at 50% 72%, rgba(255,255,255,.97) 0%, rgba(255,255,255,0) 100%),
            radial-gradient(60% 70% at 50% 55%, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 78%);
          will-change: transform;
        }
        .sky-bg .c1  { width: 480px; height: 205px; top: 9%;  left: -8%; opacity: 1;   filter: blur(6px); animation: cloudA 64s ease-in-out infinite; }
        .sky-bg .c2  { width: 690px; height: 275px; top: 1%;  left: 24%; opacity: .97; filter: blur(8px); animation: cloudB 92s ease-in-out infinite; }
        .sky-bg .c3  { width: 430px; height: 185px; top: 33%; left: 52%; opacity: .93; filter: blur(6px); animation: cloudA 54s ease-in-out infinite reverse; }
        .sky-bg .c4  { width: 610px; height: 255px; top: 19%; left: 72%; opacity: .96; filter: blur(8px); animation: cloudB 104s ease-in-out infinite; }
        .sky-bg .c5  { width: 365px; height: 168px; top: 57%; left: 2%;  opacity: .94; filter: blur(5px); animation: cloudA 58s ease-in-out infinite; }
        .sky-bg .c6  { width: 345px; height: 160px; top: 65%; left: 79%; opacity: .92; filter: blur(6px); animation: cloudB 72s ease-in-out infinite reverse; }
        .sky-bg .c7  { width: 305px; height: 142px; top: 15%; left: 63%; opacity: .82; filter: blur(7px); animation: cloudA 70s ease-in-out infinite; }
        .sky-bg .c8  { width: 470px; height: 198px; top: 43%; left: 21%; opacity: .92; filter: blur(7px); animation: cloudB 86s ease-in-out infinite; }
        .sky-bg .c9  { width: 390px; height: 175px; top: 79%; left: 39%; opacity: .9;  filter: blur(6px); animation: cloudA 66s ease-in-out infinite reverse; }
        .sky-bg .c10 { width: 325px; height: 152px; top: 85%; left: 7%;  opacity: .88; filter: blur(6px); animation: cloudB 78s ease-in-out infinite; }
        .sky-bg .c11 { width: 300px; height: 142px; top: 49%; left: 87%; opacity: .85; filter: blur(7px); animation: cloudA 60s ease-in-out infinite; }
        .sky-bg .cf1 { width: 250px; height: 115px; top: 27%; left: 12%; opacity: .6;  filter: blur(9px);  animation: cloudA 120s ease-in-out infinite; }
        .sky-bg .cf2 { width: 230px; height: 108px; top: 73%; left: 61%; opacity: .55; filter: blur(10px); animation: cloudB 140s ease-in-out infinite; }
        .sky-bg .cf3 { width: 270px; height: 122px; top: 6%;  left: 48%; opacity: .5;  filter: blur(11px); animation: cloudA 160s ease-in-out infinite reverse; }
        @keyframes cloudA {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-52px, -15px); }
        }
        @keyframes cloudB {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(46px, 14px); }
        }
        /* icon màu trôi nhẹ */
        .sky-bg .sky-icons { position: absolute; inset: 0; }
        .sky-bg .sky-icon {
          position: absolute;
          opacity: .5;
          filter: drop-shadow(0 6px 14px rgba(10,47,110,.14));
          animation: skyIconFloat 7s ease-in-out infinite;
        }
        @keyframes skyIconFloat {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50%      { transform: translateY(-13px) rotate(calc(var(--r, 0deg) + 4deg)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sky-bg .clouds, .sky-bg .cloud, .sky-bg .sky-icon { animation: none !important; }
        }
        @media (max-width: 820px) {
          .sky-bg .c2, .sky-bg .c4, .sky-bg .c7, .sky-bg .c8, .sky-bg .c11,
          .sky-bg .cf1, .sky-bg .cf2, .sky-bg .cf3 { display: none; }
          .sky-bg .sky-icon { opacity: .4; }
          .sky-bg .sky-icon:nth-child(2n) { display: none; }
        }
      `}</style>

      <div className="sun" />

      <div className="clouds clouds--far">
        <span className="cloud cf1" />
        <span className="cloud cf2" />
        <span className="cloud cf3" />
      </div>

      <div className="clouds">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <span className="cloud c4" />
        <span className="cloud c5" />
        <span className="cloud c6" />
        <span className="cloud c7" />
        <span className="cloud c8" />
        <span className="cloud c9" />
        <span className="cloud c10" />
        <span className="cloud c11" />
      </div>

      <div className="sky-icons">
        {ICONS.map(({ Icon, top, left, size, color, delay, rot }, i) => (
          <span
            key={i}
            className="sky-icon"
            style={{ top, left, color, animationDelay: `${delay}s`, ['--r' as string]: `${rot}deg` }}
          >
            <Icon size={size} strokeWidth={2.4} />
          </span>
        ))}
      </div>
    </div>
  )
}
