// src/pages/HomePage.jsx — Compact · Intuitive · Dark/Light · Sidebar-Aware
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { classesApi } from '../api/classesApi';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTheme } from '../contexts/ThemeContext';
import {
  FiArrowRight, FiPackage, FiBell, FiBriefcase,
  FiBook, FiClock, FiMapPin, FiZap,
  FiCheckCircle, FiAlertCircle,
  FiCalendar, FiNavigation, FiCompass,
  FiBookOpen, FiActivity, FiLoader,
} from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════
   WEATHER HELPERS
══════════════════════════════════════════════════════════════ */
function weatherIcon(code) {
  if (!code) return '🌡️';
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code === 800) return '☀️';
  if (code === 801) return '🌤️';
  if (code <= 804) return '☁️';
  return '🌡️';
}

function useWeather(lat, lon) {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      if (!lat || !lon || !API_KEY) return null;
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      if (!res.ok) throw new Error('weather failed');
      const data = await res.json();
      return {
        temp: Math.round(data.main.temp),
        desc: data.weather?.[0]?.description || '',
        icon: weatherIcon(data.weather?.[0]?.id),
      };
    },
    enabled: !!lat && !!lon && !!API_KEY,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}

/* ══════════════════════════════════════════════════════════════
   ATTENDANCE CTA
══════════════════════════════════════════════════════════════ */
function AttendanceCTA({ cls, location: loc, isDark, onSuccess }) {
  const [state, setState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!cls?.mark_window_closes) return;
    const tick = () => {
      const ms = new Date(cls.mark_window_closes) - Date.now();
      if (ms <= 0) { setTimeLeft(null); return; }
      setTimeLeft({ mins: Math.floor(ms / 60000), secs: Math.floor((ms % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cls]);

  const handleCheckIn = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      if (loc?.latitude && loc?.longitude) {
        await apiClient.post('/geo/check-in/', { class_id: cls.id, latitude: loc.latitude, longitude: loc.longitude });
      } else {
        await apiClient.post('/classes/mark-attendance/', { class_id: cls.id });
      }
      setState('success');
      setTimeout(() => onSuccess?.(), 1800);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2200);
    }
  };

  if (!cls) return null;

  const bg = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)';
  const border = isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 14,
      background: bg, border: `1.5px solid ${border}`,
      marginBottom: 20,
    }}>
      <span style={{ fontSize: '.85rem', color: '#f59e0b', animation: 'hpPulse 1.5s ease-in-out infinite' }}>⏱</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>
          Check-in window open
        </p>
        <p style={{ fontSize: '.88rem', fontWeight: 700, color: isDark ? '#f1f5f9' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cls.unit_name}
          {timeLeft && <span style={{ fontSize: '.72rem', color: '#f59e0b', marginLeft: 8, fontWeight: 700 }}>
            {timeLeft.mins}:{String(timeLeft.secs).padStart(2, '0')} left
          </span>}
        </p>
      </div>
      <button onClick={handleCheckIn} disabled={state !== 'idle'} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 10, border: 'none',
        background: state === 'success' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: state !== 'idle' ? 'default' : 'pointer',
        flexShrink: 0, transition: 'transform .15s',
      }}>
        {state === 'loading' && <FiLoader size={12} style={{ animation: 'hpSpin .8s linear infinite' }} />}
        {state === 'success' && <FiCheckCircle size={12} />}
        {state === 'error' && <FiAlertCircle size={12} />}
        {state === 'loading' ? 'Checking…' : state === 'success' ? 'Checked in!' : state === 'error' ? 'Retry' : 'Check In'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FEATURE CARDS CONFIG
══════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    id: 'announcements', icon: FiBell, emoji: '📢',
    label: 'Announcements', color: '#f59e0b', colorBg: 'rgba(245,158,11,.1)',
    desc: 'Urgent notices, timetable updates, and campus-wide alerts — never miss what matters.',
    to: '/announcements', cta: 'Read Notices',
  },
  {
    id: 'opportunities', icon: FiBriefcase, emoji: '💼',
    label: 'Opportunities', color: '#6366f1', colorBg: 'rgba(99,102,241,.1)',
    desc: 'Scholarships, internships, and leadership programmes curated for you.',
    to: '/opportunities', cta: 'Explore',
  },
  {
    id: 'classes', icon: FiBook, emoji: '📚',
    label: 'Classes & Attendance', color: '#8b5cf6', colorBg: 'rgba(139,92,246,.1)',
    desc: 'Your live timetable with geo-verified check-in and semester analytics.',
    to: '/classes', cta: 'View Classes',
  },
  {
    id: 'found-items', icon: FiPackage, emoji: '🎒',
    label: 'Lost & Found', color: '#10b981', colorBg: 'rgba(16,185,129,.1)',
    desc: "Photo-based listings of items found on campus. Claim what's yours instantly.",  // ← fixed apostrophe
    to: '/found-items', cta: 'Browse Items',
  },
  {
    id: 'blog', icon: FiBookOpen, emoji: '✍️',
    label: 'Student Blog', color: '#ec4899', colorBg: 'rgba(236,72,153,.1)',
    desc: 'Insights, experiences, and guides — written by students, for students.',
    to: '/blog', cta: 'Read Blog',
  },
  {
    id: 'campus-map', icon: FiCompass, emoji: '🗺️',
    label: 'Campus Map', color: '#06b6d4', colorBg: 'rgba(6,182,212,.1)',
    desc: 'Interactive map with indoor navigation to every venue on campus.',
    to: '/campus-map', cta: 'Open Map',
  },
  {
    id: 'nearby-classes', icon: FiNavigation, emoji: '📍',
    label: 'Nearby Classes', color: '#84cc16', colorBg: 'rgba(132,204,22,.1)',
    desc: 'GPS-powered view of classes happening right around your location.',
    to: '/nearby-classes', cta: 'View Nearby',
  },
];

/* ══════════════════════════════════════════════════════════════
   FEATURE CARD COMPONENT
══════════════════════════════════════════════════════════════ */
function FeatureCard({ f, isDark }) {
  const Icon = f.icon;
  const cardBg = isDark ? 'rgba(15,23,42,0.85)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textMain = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  return (
    <div className="hp-feat-card" style={{ background: cardBg, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: f.colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: f.color, flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>
        <div>
          <p style={{ fontSize: '.85rem', fontWeight: 800, color: textMain, letterSpacing: '-.015em' }}>{f.label}</p>
        </div>
      </div>
      <p style={{ fontSize: '.78rem', color: textMuted, lineHeight: 1.6, marginBottom: 14, flex: 1 }}>
        {f.desc}
      </p>
      <Link to={f.to} className="hp-feat-btn" style={{
        '--btn-color': f.color,
        '--btn-bg': f.colorBg,
        color: f.color,
      }}>
        {f.cta} <FiArrowRight size={13} />
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STAT PILL
══════════════════════════════════════════════════════════════ */
function StatPill({ icon: Icon, label, value, color, colorBg, isDark }) {
  const bg = isDark ? 'rgba(15,23,42,0.85)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 12,
      background: bg, border: `1px solid ${border}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Icon size={15} />
      </div>
      <div>
        <p style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#f1f5f9' : '#111827', letterSpacing: '-.03em', lineHeight: 1 }}>{value ?? '–'}</p>
        <p style={{ fontSize: '.62rem', color: isDark ? '#94a3b8' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const { isDark } = useTheme();
  const [checkinDone, setCheckinDone] = useState(false);

  useEffect(() => { getLocation(); }, []);

  const { data: announcements } = useQuery({
    queryKey: ['recent-announcements'],
    queryFn: async () => { const r = await announcementsApi.list({ limit: 5 }); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: opportunities } = useQuery({
    queryKey: ['recent-opportunities'],
    queryFn: async () => { const r = await opportunitiesApi.list({ limit: 10 }); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: todayClasses, isLoading: loadingCls } = useQuery({
    queryKey: ['today-classes'],
    queryFn: async () => { const r = await classesApi.getTodayClasses(); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: weather } = useWeather(location?.latitude, location?.longitude);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const attendedCount = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const totalClasses = todayClasses?.length ?? 0;
  const nextMarkableClass = todayClasses?.find(c => c.can_mark && !c.is_marked) ?? null;
  const allMarked = totalClasses > 0 && attendedCount === totalClasses;
  const urgentAnn = (announcements || []).filter(a => a.is_urgent).length;

  const textMain = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
  const pageBg = isDark ? '#060810' : '#F8F7FF';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}

        @keyframes hpIn    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hpSpin  { to{transform:rotate(360deg)} }
        @keyframes hpPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .hp-root {
          font-family: 'DM Sans', sans-serif;
          padding: 24px 20px 80px;
          max-width: 1100px;
          margin: 0 auto;
          animation: hpIn .45s cubic-bezier(.16,1,.3,1) both;
          position: relative; z-index: 10;
          color: inherit;
        }
        @media(max-width:640px){ .hp-root{ padding: 16px 14px 80px; } }

        .hp-hero {
          border-radius: 20px; padding: 36px 36px 32px;
          background: rgba(9,13,28,.94);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 0 0 1px rgba(99,102,241,.14), 0 20px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
          margin-bottom: 16px; color: #fff; position: relative; overflow: hidden;
        }
        .hp-hero::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse at 15% 30%,rgba(99,102,241,.28) 0%,transparent 55%),
            radial-gradient(ellipse at 88% 75%,rgba(139,92,246,.2) 0%,transparent 50%);
        }
        .hp-hero-inner {
          position: relative; z-index: 1;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
        }
        @media(max-width:540px){ .hp-hero{ padding: 24px 20px; } .hp-hero-inner{ flex-direction:column; gap:14px; } }

        .hp-hero-tag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 99px;
          background: rgba(99,102,241,.18); border: 1px solid rgba(99,102,241,.3);
          font-size: .6rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
          color: #a5b4fc; margin-bottom: 14px;
        }
        .hp-hero-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(1.6rem,4.5vw,2.6rem); font-weight: 800; letter-spacing: -.045em;
          line-height: 1.08; margin: 0 0 8px; color: #fff;
        }
        .hp-hero-name span { color: #d3e203; }
        .hp-hero-sub { font-size: .83rem; color: rgba(200,220,240,.85); margin: 0 0 20px; max-width: 340px; }

        .hp-hero-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .hp-hero-pill {
          display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px;
          border-radius: 8px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1);
          font-size: .68rem; font-weight: 600; color: rgba(255,255,255,.75);
        }
        .hp-hero-pill.amber { background: rgba(251,191,36,.15); border-color: rgba(251,191,36,.25); color: #fcd34d; }
        .hp-hero-pill.green { background: rgba(52,211,153,.15); border-color: rgba(52,211,153,.25); color: #6ee7b7; }

        .hp-ring {
          width: 88px; height: 88px; border-radius: 50%;
          background: rgba(99,102,241,.18);
          display: flex; align-items: center; justify-content: center; flex-direction: column;
          gap: 1px; flex-shrink: 0;
          border: 2px solid rgba(99,102,241,.3);
        }
        @media(max-width:540px){ .hp-ring{ width: 72px; height: 72px; } }

        .hp-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        @media(max-width:700px){ .hp-stats{ grid-template-columns: repeat(2,1fr); } }
        @media(max-width:360px){ .hp-stats{ grid-template-columns: 1fr 1fr; } }

        .hp-urgent {
          border-radius: 14px; padding: 14px 16px;
          background: rgba(245,158,11,.07);
          border: 1px solid rgba(245,158,11,.18);
          border-left: 4px solid #f59e0b;
          margin-bottom: 24px;
        }
        .dark .hp-urgent { background: rgba(245,158,11,.1); }
        .hp-urgent-row {
          display: flex; align-items: center; gap: 8px; padding: 6px 0;
          border-bottom: 1px solid rgba(245,158,11,.1);
          text-decoration: none; color: inherit;
        }
        .hp-urgent-row:last-of-type { border-bottom: none; }

        .hp-today-cls {
          border-radius: 14px; padding: 14px 16px;
          margin-bottom: 24px;
        }
        .hp-cls-row {
          display: flex; align-items: center; gap: 10px; padding: 8px 0;
          border-bottom: 1px solid;
        }
        .hp-cls-row:last-child { border-bottom: none; }

        .hp-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media(max-width:860px){ .hp-features{ grid-template-columns: repeat(2,1fr); } }
        @media(max-width:520px){ .hp-features{ grid-template-columns: 1fr; } }

        .hp-feat-card {
          border-radius: 16px; padding: 18px;
          display: flex; flex-direction: column;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
          transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
        }
        .hp-feat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,.09);
        }

        .hp-feat-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 9px;
          font-size: .76rem; font-weight: 700;
          text-decoration: none;
          background: var(--btn-bg);
          transition: filter .15s, transform .15s;
          align-self: flex-start;
          font-family: 'DM Sans', sans-serif;
        }
        .hp-feat-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .hp-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: .9rem; font-weight: 800; letter-spacing: -.02em;
          margin: 0 0 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .hp-section-dot {
          width: 3px; border-radius: 99px; flex-shrink: 0;
        }

        .hp-done-banner {
          display: flex; align-items: center; gap: 9px; padding: 11px 16px;
          border-radius: 13px; background: rgba(16,185,129,.07);
          border: 1px solid rgba(16,185,129,.2); margin-bottom: 16px;
          font-size: .8rem; font-weight: 600; color: #059669;
        }

        .hp-div { border: none; border-top: 1px solid rgba(0,0,0,.07); margin: 0 0 24px; }
        .dark .hp-div { border-top-color: rgba(255,255,255,.07); }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: pageBg }} />

      <div className="hp-root">

        {/* ════ HERO ════ */}
        <div className="hp-hero" style={{ marginBottom: 16 }}>
          <div className="hp-hero-inner">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hp-hero-tag">
                <FiZap size={9} />
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })} · Campus OS
              </div>
              <h1 className="hp-hero-name">{greeting}, <span>{firstName}</span>.</h1>
              <p className="hp-hero-sub">
                {totalClasses > 0
                  ? `${attendedCount} of ${totalClasses} classes attended today.`
                  : 'No classes today — explore what\'s on campus.'}
              </p>
              <div className="hp-hero-pills">
                <div className="hp-hero-pill"><FiCalendar size={10} />{dateStr}</div>
                {weather && <div className="hp-hero-pill">{weather.icon} {weather.temp}°C · {weather.desc}</div>}
                {urgentAnn > 0 && <div className="hp-hero-pill amber"><FiAlertCircle size={10} />{urgentAnn} urgent notice{urgentAnn > 1 ? 's' : ''}</div>}
                {allMarked && <div className="hp-hero-pill green"><FiCheckCircle size={10} />All attended</div>}
              </div>
            </div>

            {/* Attendance ring */}
            <div className="hp-ring">
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#a5b4fc', lineHeight: 1 }}>
                {attendedCount}/{totalClasses}
              </span>
              <span style={{ fontSize: '.5rem', fontWeight: 700, color: 'rgba(165,180,252,.65)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Attended
              </span>
            </div>
          </div>
        </div>

        {/* ════ ATTENDANCE CTA ════ */}
        {!loadingCls && !checkinDone && nextMarkableClass && (
          <AttendanceCTA cls={nextMarkableClass} location={location} isDark={isDark} onSuccess={() => setCheckinDone(true)} />
        )}

        {/* ════ ALL ATTENDED BANNER ════ */}
        {!loadingCls && allMarked && (
          <div className="hp-done-banner" style={{
            background: isDark ? 'rgba(16,185,129,.12)' : undefined,
            color: isDark ? '#6ee7b7' : undefined,
            borderColor: isDark ? 'rgba(16,185,129,.25)' : undefined,
          }}>
            <FiCheckCircle size={15} />
            All {totalClasses} class{totalClasses > 1 ? 'es' : ''} attended today — well done!
            <Link to="/classes" style={{ marginLeft: 'auto', fontSize: '.7rem', fontWeight: 700, color: isDark ? '#6ee7b7' : '#059669', textDecoration: 'none', padding: '3px 10px', borderRadius: 7, background: isDark ? 'rgba(16,185,129,.15)' : 'rgba(16,185,129,.1)' }}>
              View stats
            </Link>
          </div>
        )}

        {/* ════ STAT PILLS ════ */}
        <div className="hp-stats" style={{ marginBottom: 24 }}>
          <StatPill icon={FiBook} label="Classes Today" value={totalClasses} color="#6366f1" colorBg="rgba(99,102,241,.1)" isDark={isDark} />
          <StatPill icon={FiCheckCircle} label="Attended" value={attendedCount} color="#10b981" colorBg="rgba(16,185,129,.1)" isDark={isDark} />
          <StatPill icon={FiBell} label="Urgent Notices" value={urgentAnn} color={urgentAnn > 0 ? '#f59e0b' : '#9ca3af'} colorBg={urgentAnn > 0 ? 'rgba(245,158,11,.1)' : 'rgba(0,0,0,.05)'} isDark={isDark} />
          <StatPill icon={FiBriefcase} label="Opportunities" value={opportunities?.length} color="#8b5cf6" colorBg="rgba(139,92,246,.1)" isDark={isDark} />
        </div>

        {/* ════ TODAY'S CLASSES ════ */}
        {!loadingCls && todayClasses?.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="hp-section-title" style={{ color: textMain, margin: 0 }}>
                <span className="hp-section-dot" style={{ height: 16, background: '#6366f1' }} />
                Today's Classes
              </p>
              <Link to="/classes" style={{ fontSize: '.7rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                All <FiArrowRight size={11} />
              </Link>
            </div>
            <div className="hp-today-cls" style={{
              background: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'}`,
            }}>
              {todayClasses.slice(0, 4).map((c, i) => (
                <div key={c.id} className="hp-cls-row" style={{
                  borderColor: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)',
                }}>
                  <span style={{
                    fontSize: '.6rem', fontWeight: 800, padding: '3px 7px', borderRadius: 7,
                    background: c.can_mark && !c.is_marked ? 'rgba(99,102,241,.12)' : isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                    color: c.can_mark && !c.is_marked ? '#6366f1' : isDark ? '#94a3b8' : '#9ca3af',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {c.start_time?.slice(0, 5)}
                  </span>
                  <p style={{ flex: 1, fontSize: '.83rem', fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.unit_name}
                  </p>
                  {c.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.63rem', color: textMuted, flexShrink: 0 }}><FiMapPin size={9} />{c.venue}</span>}
                  <span style={{
                    fontSize: '.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                    ...(c.is_marked
                      ? { background: 'rgba(16,185,129,.12)', color: isDark ? '#6ee7b7' : '#059669' }
                      : c.can_mark
                        ? { background: 'rgba(245,158,11,.12)', color: isDark ? '#fbbf24' : '#d97706' }
                        : { background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', color: textMuted }),
                  }}>
                    {c.is_marked ? '✓ Done' : c.can_mark ? 'Mark' : 'Soon'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════ URGENT NOTICES ════ */}
        {urgentAnn > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="hp-section-title" style={{ color: textMain, margin: 0 }}>
                <span className="hp-section-dot" style={{ height: 16, background: '#f59e0b' }} />
                Urgent Notices
              </p>
              <Link to="/announcements" style={{ fontSize: '.7rem', fontWeight: 700, color: '#f59e0b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                All <FiArrowRight size={11} />
              </Link>
            </div>
            <div className="hp-urgent" style={{ marginBottom: 24 }}>
              {(announcements || []).filter(a => a.is_urgent).slice(0, 3).map(a => (
                <Link key={a.id} to="/announcements" className="hp-urgent-row">
                  <FiAlertCircle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: '.81rem', fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {a.title}
                  </span>
                  <FiArrowRight size={12} style={{ color: textMuted, flexShrink: 0 }} />
                </Link>
              ))}
              <Link to="/announcements" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 10, fontSize: '.72rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>
                View all announcements <FiArrowRight size={11} />
              </Link>
            </div>
          </>
        )}

        {/* ════ DIVIDER ════ */}
        <hr className="hp-div" />

        {/* ════ SECTION TITLE ════ */}
        <p className="hp-section-title" style={{ color: textMain, marginBottom: 14 }}>
          <span className="hp-section-dot" style={{ height: 18, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          Campus Services
        </p>

        {/* ════ FEATURE CARDS ════ */}
        <div className="hp-features">
          {FEATURES.map(f => <FeatureCard key={f.id} f={f} isDark={isDark} />)}
        </div>

      </div>
    </>
  );
}