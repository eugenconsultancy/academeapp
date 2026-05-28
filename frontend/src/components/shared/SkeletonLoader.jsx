import { useMemo } from 'react';
import { FiZap } from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS — single source of truth
══════════════════════════════════════════════════════════════ */
const TOKEN = {
  radius: {
    sm: '10px',
    md: '14px',
    lg: '20px',
    full: '9999px',
  },
  shadow: {
    xs: '0 1px 3px rgba(0,0,0,.06)',
    sm: '0 2px 8px rgba(0,0,0,.08)',
    md: '0 6px 24px rgba(0,0,0,.10)',
    glow: (c) => `0 0 24px ${c}`,
  },
};

/* ── Feature palette: each skeleton type owns its accent ─── */
const PALETTE = {
  page: { primary: '#6366f1', secondary: '#8b5cf6', bg: '#0F172A', glow: 'rgba(99,102,241,.45)' },
  card: { primary: '#6366f1', secondary: '#a5b4fc', bg: '#f8f7ff', glow: 'rgba(99,102,241,.15)' },
  list: { primary: '#0ea5e9', secondary: '#38bdf8', bg: '#f0f9ff', glow: 'rgba(14,165,233,.15)' },
  text: { primary: '#8b5cf6', secondary: '#c4b5fd', bg: '#faf5ff', glow: 'rgba(139,92,246,.15)' },
  table: { primary: '#10b981', secondary: '#6ee7b7', bg: '#f0fdf4', glow: 'rgba(16,185,129,.15)' },
  avatar: { primary: '#f59e0b', secondary: '#fcd34d', bg: '#fffbeb', glow: 'rgba(245,158,11,.15)' },
  dashboard: { primary: '#6366f1', secondary: '#8b5cf6', bg: '#f8f7ff', glow: 'rgba(99,102,241,.12)' },
  form: { primary: '#0ea5e9', secondary: '#7dd3fc', bg: '#f0f9ff', glow: 'rgba(14,165,233,.12)' },
  image: { primary: '#f43f5e', secondary: '#fb7185', bg: '#fff1f2', glow: 'rgba(244,63,94,.15)' },
  grid: { primary: '#8b5cf6', secondary: '#c4b5fd', bg: '#faf5ff', glow: 'rgba(139,92,246,.12)' },
};

/* ── Shimmer stripe — per-palette ─── */
const shimmerStyle = (type) => {
  const p = PALETTE[type] || PALETTE.card;
  return {
    background: `linear-gradient(
      90deg,
      ${p.bg} 0%,
      ${p.secondary}22 40%,
      ${p.secondary}44 50%,
      ${p.secondary}22 60%,
      ${p.bg} 100%
    )`,
    backgroundSize: '800px 100%',
    animation: 'skShimmer 1.7s ease-in-out infinite',
    borderRadius: TOKEN.radius.md,
  };
};

const SIZE_MAP = {
  sm: { h: 8, w: '60%', gap: 6 },
  md: { h: 12, w: '70%', gap: 8 },
  lg: { h: 16, w: '80%', gap: 10 },
};

/* ══════════════════════════════════════════════════════════════
   GLOBAL KEYFRAMES — injected once
══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

  @keyframes skShimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes skSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes skSpinRev {
    to { transform: rotate(-360deg); }
  }
  @keyframes skPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.55; transform:scale(.93); }
  }
  @keyframes skOrb {
    0%,100% { box-shadow: 0 0 32px 8px rgba(99,102,241,.45), 0 0 64px 16px rgba(139,92,246,.25); }
    50%      { box-shadow: 0 0 48px 16px rgba(99,102,241,.65), 0 0 96px 32px rgba(139,92,246,.35); }
  }
  @keyframes skProgress {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
  @keyframes skFadeUp {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes skDot {
    0%,80%,100% { transform:scale(.6); opacity:.4; }
    40%         { transform:scale(1.0); opacity:1; }
  }
  @keyframes skFloat {
    0%,100% { transform:translateY(0px); }
    50%     { transform:translateY(-10px); }
  }
  @keyframes skParticle {
    0%   { opacity:.7; transform:scale(1) translateY(0); }
    100% { opacity:0;  transform:scale(.2) translateY(-60px); }
  }
  @keyframes skRingRotate {
    from { stroke-dashoffset: 251; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes skGradientBg {
    0%   { background-position: 0%   50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0%   50%; }
  }
`;

/* ══════════════════════════════════════════════════════════════
   PAGE LOADER — premium centered command
══════════════════════════════════════════════════════════════ */
function PageLoader({ brandName = 'Academe', loadingText = 'Loading...' }) {
  return (
    <>
      <style>{GLOBAL_STYLES}{`
        .sk-page-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0B1120;
          background-image:
            radial-gradient(ellipse at 20% 30%, rgba(99,102,241,.18) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 70%, rgba(139,92,246,.14) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, rgba(14,165,233,.08) 0%, transparent 45%);
          z-index: 9999;
          overflow: hidden;
        }

        /* ambient grain overlay */
        .sk-page-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: .4;
        }

        /* floating particle dots */
        .sk-particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: skParticle linear infinite;
        }

        /* central orb */
        .sk-orb-wrap {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 36px;
          animation: skFloat 3s ease-in-out infinite;
        }

        /* outer glow pulse */
        .sk-orb-glow {
          position: absolute;
          inset: -16px;
          border-radius: 50%;
          animation: skOrb 2.4s ease-in-out infinite;
        }

        /* rotating gradient ring — outer */
        .sk-ring-outer {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            rgba(99,102,241,1) 30%,
            rgba(139,92,246,1) 50%,
            rgba(14,165,233,.8) 70%,
            transparent 100%
          );
          animation: skSpin 1.6s linear infinite;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px));
        }

        /* rotating gradient ring — inner (counter) */
        .sk-ring-inner {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: conic-gradient(
            from 180deg,
            transparent 0%,
            rgba(139,92,246,.7) 40%,
            rgba(99,102,241,.5) 60%,
            transparent 100%
          );
          animation: skSpinRev 2.4s linear infinite;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px));
        }

        /* logo core */
        .sk-orb-core {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 22px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.12),
            0 4px 24px rgba(99,102,241,.5),
            inset 0 1px 0 rgba(255,255,255,.2);
        }

        /* brand text */
        .sk-brand {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -.045em;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
          animation: skFadeUp .5s ease both;
          animation-delay: .1s;
        }

        .sk-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: rgba(255,255,255,.35);
          margin-bottom: 36px;
          animation: skFadeUp .5s ease both;
          animation-delay: .2s;
        }

        /* progress track */
        .sk-progress-track {
          width: 200px;
          height: 3px;
          border-radius: 99px;
          background: rgba(255,255,255,.08);
          overflow: hidden;
          margin-bottom: 20px;
          animation: skFadeUp .5s ease both;
          animation-delay: .3s;
        }
        .sk-progress-fill {
          height: 100%;
          width: 45%;
          border-radius: 99px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
          background-size: 200% 100%;
          animation: skProgress 1.4s ease-in-out infinite, skGradientBg 2s ease infinite;
        }

        /* dot loader */
        .sk-dots {
          display: flex;
          gap: 7px;
          animation: skFadeUp .5s ease both;
          animation-delay: .4s;
        }
        .sk-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(99,102,241,.7);
          animation: skDot 1.2s ease-in-out infinite;
        }
        .sk-dot:nth-child(2) { animation-delay: .15s; }
        .sk-dot:nth-child(3) { animation-delay: .30s; }

        .sk-loading-text {
          font-family: 'DM Sans', sans-serif;
          font-size: .78rem;
          font-weight: 500;
          color: rgba(255,255,255,.3);
          margin-top: 16px;
          animation: skFadeUp .5s ease both;
          animation-delay: .5s;
        }
      `}</style>

      {/* Floating particles */}
      <div className="sk-page-root" role="status" aria-label="Loading">
        {[...Array(12)].map((_, i) => {
          const size = 3 + Math.random() * 5;
          const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#a5b4fc'];
          return (
            <div
              key={i}
              className="sk-particle"
              style={{
                width: size,
                height: size,
                left: `${8 + Math.random() * 84}%`,
                bottom: `${5 + Math.random() * 40}%`,
                background: colors[i % colors.length],
                animationDuration: `${2 + Math.random() * 4}s`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          );
        })}

        {/* Orb */}
        <div className="sk-orb-wrap" aria-hidden="true">
          <div className="sk-orb-glow" />
          <div className="sk-ring-outer" />
          <div className="sk-ring-inner" />
          <div className="sk-orb-core">
            <FiZap size={28} color="#fff" strokeWidth={2.5} />
          </div>
        </div>

        {brandName && <div className="sk-brand">{brandName}</div>}
        <div className="sk-sub">Campus OS</div>

        <div className="sk-progress-track">
          <div className="sk-progress-fill" />
        </div>

        <div className="sk-dots">
          <div className="sk-dot" />
          <div className="sk-dot" />
          <div className="sk-dot" />
        </div>

        <p className="sk-loading-text">{loadingText}</p>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   INLINE SPINNER — used inside Suspense fallback
══════════════════════════════════════════════════════════════ */
function InlineSpinner({ label = 'Loading page...' }) {
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div
        role="status"
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        {/* mini ring */}
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0%, #6366f1 35%, #8b5cf6 55%, transparent 100%)',
            animation: 'skSpin 1s linear infinite',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))',
          }} />
          <div style={{
            position: 'absolute',
            inset: '18px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            boxShadow: '0 0 12px rgba(99,102,241,.5)',
          }} />
        </div>
        <div style={{
          display: 'flex', gap: 6,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#6366f1',
              animation: `skDot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '.75rem',
          fontWeight: 500,
          color: '#9ca3af',
          margin: 0,
        }}>{label}</p>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SKELETON BONE — reusable shimmer block
══════════════════════════════════════════════════════════════ */
function Bone({ w = '100%', h = 12, radius = TOKEN.radius.md, type = 'card', style = {} }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: radius,
      ...shimmerStyle(type),
      ...style,
    }} />
  );
}

/* ══════════════════════════════════════════════════════════════
   CARD SKELETON
══════════════════════════════════════════════════════════════ */
function CardSkeleton({ type = 'card' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      borderRadius: TOKEN.radius.lg,
      background: p.bg,
      border: `1px solid ${p.primary}18`,
      padding: 20,
      boxShadow: `${TOKEN.shadow.sm}, ${TOKEN.shadow.glow(p.glow)}`,
      overflow: 'hidden',
    }}>
      <Bone h={160} radius={TOKEN.radius.md} type={type} style={{ marginBottom: 16 }} />
      <Bone h={14} w="70%" type={type} style={{ marginBottom: 10 }} />
      <Bone h={10} w="45%" type={type} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LIST SKELETON
══════════════════════════════════════════════════════════════ */
function ListSkeleton({ count = 4, staggered, lineH, type = 'list' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      borderRadius: TOKEN.radius.lg,
      background: p.bg,
      border: `1px solid ${p.primary}18`,
      padding: '8px 16px',
      boxShadow: TOKEN.shadow.sm,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            borderBottom: i < count - 1 ? `1px solid ${p.primary}10` : 'none',
            animationDelay: staggered ? `${i * 80}ms` : '0ms',
          }}
        >
          {/* avatar dot */}
          <div style={{
            width: 38, height: 38,
            borderRadius: '50%',
            flexShrink: 0,
            ...shimmerStyle(type),
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Bone h={lineH} w="65%" type={type} />
            <Bone h={lineH - 3} w="40%" type={type} />
          </div>
          {/* trailing tag */}
          <div style={{
            width: 50, height: 22,
            borderRadius: TOKEN.radius.full,
            ...shimmerStyle(type),
          }} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TEXT SKELETON
══════════════════════════════════════════════════════════════ */
function TextSkeleton({ lines, lineH, lineW, staggered, type = 'text' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      borderRadius: TOKEN.radius.lg,
      background: p.bg,
      border: `1px solid ${p.primary}15`,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone
          key={i}
          h={lineH}
          w={i === lines - 1 ? '55%' : lineW}
          type={type}
          style={{ animationDelay: staggered ? `${i * 100}ms` : '0ms' }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TABLE SKELETON
══════════════════════════════════════════════════════════════ */
function TableSkeleton({ count, staggered, type = 'table' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      borderRadius: TOKEN.radius.lg,
      border: `1px solid ${p.primary}20`,
      overflow: 'hidden',
      boxShadow: TOKEN.shadow.sm,
    }}>
      {/* header */}
      <div style={{
        display: 'flex',
        gap: 14,
        padding: '14px 18px',
        background: `${p.primary}0D`,
        borderBottom: `1px solid ${p.primary}20`,
      }}>
        {[1, 2, 3, 4].map(i => (
          <Bone key={i} h={12} type={type} style={{ flex: 1 }} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: count }).map((_, row) => (
        <div
          key={row}
          style={{
            display: 'flex',
            gap: 14,
            padding: '12px 18px',
            background: row % 2 === 0 ? '#fff' : `${p.primary}04`,
            borderBottom: row < count - 1 ? `1px solid ${p.primary}10` : 'none',
            animationDelay: staggered ? `${row * 60}ms` : '0ms',
          }}
        >
          {[1, 2, 3, 4].map(col => (
            <Bone key={col} h={10} type={type} style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AVATAR SKELETON
══════════════════════════════════════════════════════════════ */
function AvatarSkeleton({ width, height, type = 'avatar' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '16px 20px',
      borderRadius: TOKEN.radius.lg,
      background: p.bg,
      border: `1px solid ${p.primary}18`,
      boxShadow: TOKEN.shadow.sm,
    }}>
      <div style={{
        width: width || 52,
        height: height || 52,
        borderRadius: '50%',
        flexShrink: 0,
        ...shimmerStyle(type),
        boxShadow: `0 0 12px ${p.glow}`,
      }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bone h={14} w="55%" type={type} />
        <Bone h={10} w="35%" type={type} />
        <Bone h={8} w="45%" type={type} />
      </div>
      <div style={{
        width: 36, height: 36,
        borderRadius: TOKEN.radius.md,
        ...shimmerStyle(type),
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD SKELETON
══════════════════════════════════════════════════════════════ */
function DashboardSkeleton({ staggered, type = 'dashboard' }) {
  const p = PALETTE[type];
  const StatCard = ({ i }) => (
    <div style={{
      borderRadius: TOKEN.radius.lg,
      background: '#fff',
      border: `1px solid ${p.primary}15`,
      padding: 18,
      boxShadow: TOKEN.shadow.xs,
      animationDelay: staggered ? `${i * 100}ms` : '0ms',
    }}>
      <div style={{
        width: 36, height: 36,
        borderRadius: TOKEN.radius.md,
        marginBottom: 12,
        ...shimmerStyle(type),
      }} />
      <Bone h={10} w="60%" type={type} style={{ marginBottom: 8 }} />
      <Bone h={22} w="40%" type={type} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[0, 1, 2, 3].map(i => <StatCard key={i} i={i} />)}
      </div>
      {/* chart area */}
      <div style={{
        borderRadius: TOKEN.radius.lg,
        background: '#fff',
        border: `1px solid ${p.primary}12`,
        padding: 22,
        boxShadow: TOKEN.shadow.xs,
      }}>
        <Bone h={14} w="30%" type={type} style={{ marginBottom: 18 }} />
        <Bone h={180} type={type} />
      </div>
      {/* list section */}
      <div style={{
        borderRadius: TOKEN.radius.lg,
        background: '#fff',
        border: `1px solid ${p.primary}12`,
        padding: 22,
        boxShadow: TOKEN.shadow.xs,
      }}>
        <Bone h={14} w="25%" type={type} style={{ marginBottom: 18 }} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            display: 'flex', gap: 12, marginBottom: i < 3 ? 14 : 0,
            animationDelay: staggered ? `${i * 80}ms` : '0ms',
          }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', ...shimmerStyle(type) }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Bone h={11} w="55%" type={type} />
              <Bone h={9} w="35%" type={type} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FORM SKELETON
══════════════════════════════════════════════════════════════ */
function FormSkeleton({ count, type = 'form' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      borderRadius: TOKEN.radius.lg,
      background: p.bg,
      border: `1px solid ${p.primary}18`,
      padding: 24,
      boxShadow: TOKEN.shadow.sm,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      {Array.from({ length: count || 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Bone h={10} w="28%" type={type} />
          <Bone h={44} type={type} radius={TOKEN.radius.md} />
        </div>
      ))}
      {/* submit button placeholder */}
      <div style={{
        height: 44,
        width: '35%',
        borderRadius: TOKEN.radius.md,
        background: `linear-gradient(135deg, ${p.primary}40, ${p.secondary}40)`,
        animation: 'skPulse 1.8s ease-in-out infinite',
        marginTop: 4,
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   IMAGE SKELETON
══════════════════════════════════════════════════════════════ */
function ImageSkeleton({ width, height, type = 'image' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      width: width || '100%',
      height: height || 220,
      borderRadius: TOKEN.radius.lg,
      background: p.bg,
      border: `1px solid ${p.primary}20`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      overflow: 'hidden',
      position: 'relative',
      ...shimmerStyle(type),
    }}>
      {/* image icon placeholder */}
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={p.primary} strokeWidth="1.5" opacity=".4">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GRID SKELETON
══════════════════════════════════════════════════════════════ */
function GridSkeleton({ count, staggered, type = 'grid' }) {
  const p = PALETTE[type];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 14,
    }}>
      {Array.from({ length: count || 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: TOKEN.radius.lg,
            background: p.bg,
            border: `1px solid ${p.primary}15`,
            padding: 14,
            boxShadow: TOKEN.shadow.xs,
            animationDelay: staggered ? `${i * 60}ms` : '0ms',
          }}
        >
          <Bone h={120} type={type} style={{ marginBottom: 12 }} />
          <Bone h={11} w="70%" type={type} style={{ marginBottom: 7 }} />
          <Bone h={9} w="45%" type={type} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════ */
export default function SkeletonLoader({
  type = 'card',
  count = 1,
  lines = 3,
  width = null,
  height = null,
  variant = 'md',
  staggered = true,
  className = '',
  brandName = 'Academe',
  loadingText = 'Loading your experience...',
}) {
  const { h: lineH, w: lineW } = SIZE_MAP[variant] || SIZE_MAP.md;

  /* ── Page / full-screen ── */
  if (type === 'page') {
    return <PageLoader brandName={brandName} loadingText={loadingText} />;
  }

  /* ── Suspense inline spinner ── */
  if (type === 'spinner') {
    return <InlineSpinner label={loadingText} />;
  }

  /* ── All other skeleton types ── */
  const skeleton = useMemo(() => {
    switch (type) {
      case 'card': return <CardSkeleton type={type} />;
      case 'list': return <ListSkeleton count={count} staggered={staggered} lineH={lineH} type={type} />;
      case 'text': return <TextSkeleton lines={lines || count} lineH={lineH} lineW={lineW} staggered={staggered} type={type} />;
      case 'table': return <TableSkeleton count={count} staggered={staggered} type={type} />;
      case 'avatar': return <AvatarSkeleton width={width} height={height} type={type} />;
      case 'dashboard': return <DashboardSkeleton staggered={staggered} type={type} />;
      case 'form': return <FormSkeleton count={count} type={type} />;
      case 'image': return <ImageSkeleton width={width} height={height} type={type} />;
      case 'grid': return <GridSkeleton count={count} staggered={staggered} type={type} />;
      default: return null;
    }
  }, [type, count, lines, width, height, staggered, lineH, lineW]);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div
        className={className}
        aria-hidden="true"
        style={{ width: '100%' }}
      >
        {skeleton}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        Loading content, please wait…
      </div>
    </>
  );
}