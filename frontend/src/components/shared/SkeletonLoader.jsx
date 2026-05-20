import { FiZap } from 'react-icons/fi';

export default function SkeletonLoader({ type = 'card', count = 1 }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'page':
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)',
          }}>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');
              @keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
              @keyframes skSpin { to { transform: rotate(360deg); } }
              @keyframes skGrow { 0%{transform:scaleX(0)} 100%{transform:scaleX(1)} }
              .sk-page-brand { font-family:'Outfit',sans-serif; display:flex; align-items:center; gap:14px; margin-bottom:40px; }
              .sk-logo-wrap {
                width:52px; height:52px; border-radius:16px;
                background:linear-gradient(135deg,#6366f1,#8b5cf6);
                display:flex; align-items:center; justify-content:center;
                box-shadow: 0 8px 24px rgba(99,102,241,0.3);
                animation: skPulse 2s ease-in-out infinite;
              }
              .sk-brand-title { font-size:1.6rem; font-weight:800; letter-spacing:-0.04em; background:linear-gradient(135deg,#4f46e5,#7c3aed); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
              .sk-brand-sub { font-size:0.72rem; color:#9ca3af; font-family:'Outfit',sans-serif; letter-spacing:0.05em; text-transform:uppercase; }
              .sk-progress-track { width:200px; height:3px; background:rgba(99,102,241,0.1); border-radius:3px; overflow:hidden; margin-bottom:14px; }
              .sk-progress-fill { height:100%; background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4); border-radius:3px; animation:skGrow 1.8s ease-in-out infinite alternate; transform-origin:left; }
              .sk-loading-text { font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:500; color:#9ca3af; letter-spacing:0.02em; }
            `}</style>

            <div className="sk-page-brand">
              <div className="sk-logo-wrap">
                <FiZap size={24} color="#fff" />
              </div>
              <div>
                <div className="sk-brand-title">Academe</div>
                <div className="sk-brand-sub">Student Ecosystem</div>
              </div>
            </div>

            <div className="sk-progress-track">
              <div className="sk-progress-fill" />
            </div>
            <p className="sk-loading-text">Loading your dashboard…</p>
          </div>
        );

      case 'card':
        return (
          <div style={{
            borderRadius: '18px',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(0,0,0,0.05)',
            padding: '20px',
            overflow: 'hidden',
          }}>
            <style>{`
              @keyframes skShimmer {
                0% { background-position: -400px 0; }
                100% { background-position: 400px 0; }
              }
              .sk-shimmer {
                background: linear-gradient(90deg, #f1f5f9 25%, #e8ecf0 50%, #f1f5f9 75%);
                background-size: 800px 100%;
                animation: skShimmer 1.5s ease-in-out infinite;
                border-radius: 8px;
              }
            `}</style>
            <div className="sk-shimmer" style={{ height: 160, borderRadius: 12, marginBottom: 14 }} />
            <div className="sk-shimmer" style={{ height: 14, width: '72%', marginBottom: 8 }} />
            <div className="sk-shimmer" style={{ height: 12, width: '48%' }} />
          </div>
        );

      case 'list':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <style>{`
              @keyframes skShimmer {
                0% { background-position: -400px 0; }
                100% { background-position: 400px 0; }
              }
              .sk-shimmer {
                background: linear-gradient(90deg, #f1f5f9 25%, #e8ecf0 50%, #f1f5f9 75%);
                background-size: 800px 100%;
                animation: skShimmer 1.5s ease-in-out infinite;
                border-radius: 8px;
              }
              .dark .sk-shimmer {
                background: linear-gradient(90deg, #1e1e30 25%, #252535 50%, #1e1e30 75%);
              }
            `}</style>
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div
                  className="sk-shimmer"
                  style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div className="sk-shimmer" style={{ height: 12, width: '65%', marginBottom: 6 }} />
                  <div className="sk-shimmer" style={{ height: 10, width: '42%' }} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'image':
        return (
          <div style={{
            width: '100%', height: '100%', minHeight: 160,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <style>{`
              @keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
              .sk-img-icon { animation: skPulse 1.8s ease-in-out infinite; }
            `}</style>
            <FiZap size={28} color="#cbd5e1" className="sk-img-icon" />
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderSkeleton()}</>;
}