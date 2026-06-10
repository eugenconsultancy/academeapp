// src/pages/HomePage.jsx - Completely refactored with all fixes applied
import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { classesApi } from '../api/classesApi';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTheme } from '../contexts/ThemeContext';
import AttendanceRing from '../components/AttendanceRing';
import HomepageBackground from '../components/HomepageBackground';
import {
  FiArrowRight, FiPackage, FiBell, FiBriefcase,
  FiBook, FiClock, FiMapPin, FiZap,
  FiCheckCircle, FiAlertCircle,
  FiCalendar, FiNavigation, FiCompass,
  FiBookOpen, FiLoader,
} from 'react-icons/fi';

// ============================================
// MODULE-LEVEL CONSTANTS (stable references)
// ============================================

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
    desc: "Photo-based listings of items found on campus. Claim what's yours instantly.",
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

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeListResponse(response) {
  return Array.isArray(response) ? response : response?.data || [];
}

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

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ============================================
// WEATHER HOOK (optimized)
// ============================================

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
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}

// ============================================
// MEMOIZED SUB-COMPONENTS
// ============================================

const StatPill = React.memo(({ icon: Icon, label, value, color, colorBg, isDark }) => {
  const bg = isDark ? 'rgba(15,23,42,0.85)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#f1f5f9' : '#111827';

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
        <p style={{ fontSize: '1.05rem', fontWeight: 800, color: textColor, letterSpacing: '-.03em', lineHeight: 1 }}>{value ?? '–'}</p>
        <p style={{ fontSize: '.62rem', color: isDark ? '#94a3b8' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
});

StatPill.displayName = 'StatPill';

const FeatureCard = React.memo(({ feature, isDark }) => {
  const Icon = feature.icon;
  const cardBg = isDark ? 'rgba(15,23,42,0.85)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textMain = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', transition: 'transform .2s, box-shadow .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: feature.colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: feature.color, flexShrink: 0 }}>
          <Icon size={20} />
        </div>
        <div>
          <p style={{ fontSize: '.85rem', fontWeight: 800, color: textMain, letterSpacing: '-.015em' }}>{feature.label}</p>
        </div>
      </div>
      <p style={{ fontSize: '.78rem', color: textMuted, lineHeight: 1.6, marginBottom: 14, flex: 1 }}>
        {feature.desc}
      </p>
      <Link to={feature.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: '.76rem', fontWeight: 700, textDecoration: 'none', background: feature.colorBg, color: feature.color, alignSelf: 'flex-start' }}>
        {feature.cta} <FiArrowRight size={13} />
      </Link>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

const AttendanceCTA = React.memo(({ cls, location: loc, isDark, onSuccess }) => {
  const [state, setState] = React.useState('idle');
  const [timeLeft, setTimeLeft] = React.useState(null);
  const intervalRef = useRef(null);
  const tickRef = useRef(null);

  const tick = useCallback(() => {
    if (!cls?.mark_window_closes) return;
    const ms = new Date(cls.mark_window_closes) - Date.now();
    if (ms <= 0) {
      setTimeLeft(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setTimeLeft({ mins: Math.floor(ms / 60000), secs: Math.floor((ms % 60000) / 1000) });
  }, [cls]);

  useEffect(() => {
    tick();
    intervalRef.current = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (!document.hidden && !intervalRef.current) {
        tick();
        intervalRef.current = setInterval(tick, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tick]);

  const handleCheckIn = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      if (loc?.latitude && loc?.longitude) {
        await apiClient.post('/geo/check-in/', {
          timetable_entry_id: cls.entry_id,
          latitude: loc.latitude,
          longitude: loc.longitude
        });
      } else {
        await apiClient.post('/classes/mark-attendance/', {
          timetable_entry_id: cls.entry_id
        });
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: bg, border: `1.5px solid ${border}`, marginBottom: 20 }}>
      <span style={{ fontSize: '.85rem', color: '#f59e0b' }}>⏱</span>
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
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none',
        background: state === 'success' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: state !== 'idle' ? 'default' : 'pointer',
        flexShrink: 0,
      }}>
        {state === 'loading' && <FiLoader size={12} style={{ animation: 'hpSpin .8s linear infinite' }} />}
        {state === 'success' && <FiCheckCircle size={12} />}
        {state === 'error' && <FiAlertCircle size={12} />}
        {state === 'loading' ? 'Checking…' : state === 'success' ? 'Checked in!' : state === 'error' ? 'Retry' : 'Check In'}
      </button>
    </div>
  );
});

AttendanceCTA.displayName = 'AttendanceCTA';

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const { isDark } = useTheme();
  const [checkinDone, setCheckinDone] = React.useState(false);
  const shouldFetchLocation = React.useRef(true);

  // Only fetch location if needed (attendance window open or weather)
  React.useEffect(() => {
    if (shouldFetchLocation.current) {
      getLocation();
      shouldFetchLocation.current = false;
    }
  }, [getLocation]);

  // Staggered queries - classes first (most important)
  const { data: todayClasses, isLoading: loadingCls } = useQuery({
    queryKey: ['today-classes'],
    queryFn: async () => {
      const r = await classesApi.getTodayClasses();
      return normalizeListResponse(r);
    },
    staleTime: 0,
  });

  const { data: announcements } = useQuery({
    queryKey: ['recent-announcements'],
    queryFn: async () => {
      const r = await announcementsApi.list({ limit: 5 });
      return normalizeListResponse(r);
    },
    enabled: !!todayClasses, // Fetch after classes load
    staleTime: 60 * 1000,
  });

  const { data: opportunities } = useQuery({
    queryKey: ['recent-opportunities'],
    queryFn: async () => {
      const r = await opportunitiesApi.list({ limit: 10 });
      return normalizeListResponse(r);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: weather } = useWeather(location?.latitude, location?.longitude);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const greeting = getGreeting();
  const dateStr = formatDate();

  const attendedCount = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const totalClasses = todayClasses?.length ?? 0;
  const nextMarkableClass = todayClasses?.find(c => c.can_mark && !c.is_marked) ?? null;
  const allMarked = totalClasses > 0 && attendedCount === totalClasses;
  const urgentAnn = (announcements || []).filter(a => a.is_urgent).length;

  const textMain = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  return (
    <>
      <HomepageBackground isDark={isDark} />

      <div style={{ fontFamily: "'DM Sans', sans-serif", padding: '24px 20px 80px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 10 }}>

        {/* Hero Section */}
        <div style={{ borderRadius: 20, padding: '36px 36px 32px', background: isDark ? 'rgba(9,13,28,.94)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'}`, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, background: 'rgba(99,102,241,.18)', border: '1px solid rgba(99,102,241,.3)', fontSize: '.6rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a5b4fc', marginBottom: 14 }}>
                <FiZap size={9} />
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })} · Campus OS
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.6rem,4.5vw,2.6rem)', fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1.08, margin: '0 0 8px', color: isDark ? '#fff' : '#111827' }}>
                {greeting}, <span style={{ color: '#d3e203' }}>{firstName}</span>.
              </h1>
              <p style={{ fontSize: '.83rem', color: isDark ? 'rgba(200,220,240,.85)' : '#64748b', margin: '0 0 20px', maxWidth: 340 }}>
                {totalClasses > 0
                  ? `${attendedCount} of ${totalClasses} classes attended today.`
                  : 'No classes today — explore what\'s on campus.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', fontSize: '.68rem', fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>
                  <FiCalendar size={10} />{dateStr}
                </div>
                {weather && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', fontSize: '.68rem', fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>
                    {weather.icon} {weather.temp}°C · {weather.desc}
                  </div>
                )}
                {urgentAnn > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, background: 'rgba(251,191,36,.15)', border: '1px solid rgba(251,191,36,.25)', fontSize: '.68rem', fontWeight: 600, color: '#fcd34d' }}>
                    <FiAlertCircle size={10} />{urgentAnn} urgent notice{urgentAnn > 1 ? 's' : ''}
                  </div>
                )}
                {allMarked && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.25)', fontSize: '.68rem', fontWeight: 600, color: '#6ee7b7' }}>
                    <FiCheckCircle size={10} />All attended
                  </div>
                )}
              </div>
            </div>

            <AttendanceRing attended={attendedCount} total={totalClasses} size={88} isDark={isDark} />
          </div>
        </div>

        {/* Attendance CTA */}
        {!loadingCls && !checkinDone && nextMarkableClass && (
          <AttendanceCTA cls={nextMarkableClass} location={location} isDark={isDark} onSuccess={() => setCheckinDone(true)} />
        )}

        {/* All Attended Banner */}
        {!loadingCls && allMarked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', borderRadius: 13, background: isDark ? 'rgba(16,185,129,.12)' : 'rgba(16,185,129,.07)', border: `1px solid ${isDark ? 'rgba(16,185,129,.25)' : 'rgba(16,185,129,.2)'}`, marginBottom: 16, fontSize: '.8rem', fontWeight: 600, color: isDark ? '#6ee7b7' : '#059669' }}>
            <FiCheckCircle size={15} />
            All {totalClasses} class{totalClasses > 1 ? 'es' : ''} attended today — well done!
            <Link to="/classes" style={{ marginLeft: 'auto', fontSize: '.7rem', fontWeight: 700, color: isDark ? '#6ee7b7' : '#059669', textDecoration: 'none', padding: '3px 10px', borderRadius: 7, background: isDark ? 'rgba(16,185,129,.15)' : 'rgba(16,185,129,.1)' }}>
              View stats
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          <StatPill icon={FiBook} label="Classes Today" value={totalClasses} color="#6366f1" colorBg="rgba(99,102,241,.1)" isDark={isDark} />
          <StatPill icon={FiCheckCircle} label="Attended" value={attendedCount} color="#10b981" colorBg="rgba(16,185,129,.1)" isDark={isDark} />
          <StatPill icon={FiBell} label="Urgent Notices" value={urgentAnn} color={urgentAnn > 0 ? '#f59e0b' : '#9ca3af'} colorBg={urgentAnn > 0 ? 'rgba(245,158,11,.1)' : 'rgba(0,0,0,.05)'} isDark={isDark} />
          <StatPill icon={FiBriefcase} label="Opportunities" value={opportunities?.length} color="#8b5cf6" colorBg="rgba(139,92,246,.1)" isDark={isDark} />
        </div>

        {/* Today's Classes */}
        {!loadingCls && todayClasses?.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '.9rem', fontWeight: 800, letterSpacing: '-.02em', margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: textMain }}>
                <span style={{ width: 3, height: 16, borderRadius: 99, background: '#6366f1' }} />
                Today's Classes
              </p>
              <Link to="/classes" style={{ fontSize: '.7rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                All <FiArrowRight size={11} />
              </Link>
            </div>
            <div style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 24, background: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'}` }}>
              {todayClasses.slice(0, 4).map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'}` }}>
                  <span style={{
                    fontSize: '.6rem', fontWeight: 800, padding: '3px 7px', borderRadius: 7, whiteSpace: 'nowrap', flexShrink: 0,
                    background: c.can_mark && !c.is_marked ? 'rgba(99,102,241,.12)' : isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                    color: c.can_mark && !c.is_marked ? '#6366f1' : isDark ? '#94a3b8' : '#9ca3af',
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

        {/* Urgent Notices */}
        {urgentAnn > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '.9rem', fontWeight: 800, letterSpacing: '-.02em', margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: textMain }}>
                <span style={{ width: 3, height: 16, borderRadius: 99, background: '#f59e0b' }} />
                Urgent Notices
              </p>
              <Link to="/announcements" style={{ fontSize: '.7rem', fontWeight: 700, color: '#f59e0b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                All <FiArrowRight size={11} />
              </Link>
            </div>
            <div style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 24, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.18)', borderLeft: '4px solid #f59e0b' }}>
              {(announcements || []).filter(a => a.is_urgent).slice(0, 3).map(a => (
                <Link key={a.id} to="/announcements" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(245,158,11,.1)', textDecoration: 'none', color: 'inherit' }}>
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

        <hr style={{ border: 'none', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'}`, margin: '0 0 24px' }} />

        {/* Campus Services */}
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '.9rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: textMain }}>
          <span style={{ width: 3, height: 18, borderRadius: 99, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          Campus Services
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {FEATURES.map(f => <FeatureCard key={f.id} feature={f} isDark={isDark} />)}
        </div>
      </div>

      <style>{`
        @keyframes hpSpin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .hp-features { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .hp-features { grid-template-columns: 1fr; } }
        @media (max-width: 700px) { .hp-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .hp-root { padding: 16px 14px 80px; } }
      `}</style>
    </>
  );
}