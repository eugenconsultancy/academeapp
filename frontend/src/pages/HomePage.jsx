// src/pages/HomePage.jsx - REFACTORED: Visual Hierarchy & Layout Compression Fixes
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
// DESIGN TOKENS
// ============================================

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,    // FIXED: quoted key to avoid numeric literal error
};

const COLORS = {
  light: {
    bg: '#f4f5f9',
    card: '#ffffff',
    text1: '#0a0f1a',
    text2: '#1e293b',
    text3: '#475569',
    border: 'rgba(226, 232, 240, 0.8)',
  },
  dark: {
    bg: '#07090f',
    card: '#0d1117',
    text1: '#ffffff',
    text2: '#e2e8f0',
    text3: '#cbd5e1',
    border: 'rgba(255, 255, 255, 0.06)',
  },
};

const FEATURES = [
  {
    id: 'announcements',
    icon: FiBell,
    label: 'Announcements',
    color: '#f59e0b',
    colorBg: 'rgba(245, 158, 11, 0.1)',
    desc: 'Urgent notices and campus-wide alerts.',
    to: '/announcements',
    cta: 'Read',
  },
  {
    id: 'opportunities',
    icon: FiBriefcase,
    label: 'Opportunities',
    color: '#6366f1',
    colorBg: 'rgba(99, 102, 241, 0.1)',
    desc: 'Scholarships, internships, leadership programs.',
    to: '/opportunities',
    cta: 'Explore',
  },
  {
    id: 'classes',
    icon: FiBook,
    label: 'Classes & Attendance',
    color: '#8b5cf6',
    colorBg: 'rgba(139, 92, 246, 0.1)',
    desc: 'Live timetable with geo-verified check-in.',
    to: '/classes',
    cta: 'View',
  },
  {
    id: 'found-items',
    icon: FiPackage,
    label: 'Lost & Found',
    color: '#10b981',
    colorBg: 'rgba(16, 185, 129, 0.1)',
    desc: 'Photo-based listings of found items.',
    to: '/found-items',
    cta: 'Browse',
  },
  {
    id: 'blog',
    icon: FiBookOpen,
    label: 'Student Blog',
    color: '#ec4899',
    colorBg: 'rgba(236, 72, 153, 0.1)',
    desc: 'Insights and guides by students.',
    to: '/blog',
    cta: 'Read',
  },
  {
    id: 'campus-map',
    icon: FiCompass,
    label: 'Campus Map',
    color: '#06b6d4',
    colorBg: 'rgba(6, 182, 212, 0.1)',
    desc: 'Interactive map with indoor navigation.',
    to: '/campus-map',
    cta: 'Open',
  },
  {
    id: 'nearby-classes',
    icon: FiNavigation,
    label: 'Nearby Classes',
    color: '#84cc16',
    colorBg: 'rgba(132, 204, 22, 0.1)',
    desc: 'GPS-powered view of nearby classes.',
    to: '/nearby-classes',
    cta: 'View',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeListResponse(response) {
  return Array.isArray(response) ? response : response?.data || [];
}

function weatherIcon(code) {
  if (!code) return '\u{1F321}\uFE0F'; // 🌡️
  if (code >= 200 && code < 300) return '\u26C8\uFE0F'; // ⛈️
  if (code >= 300 && code < 400) return '\u{1F326}\uFE0F'; // 🌦️
  if (code >= 500 && code < 600) return '\u{1F327}\uFE0F'; // 🌧️
  if (code >= 600 && code < 700) return '\u2744\uFE0F'; // ❄️
  if (code === 800) return '\u2600\uFE0F'; // ☀️
  if (code === 801) return '\u{1F324}\uFE0F'; // 🌤️
  if (code <= 804) return '\u2601\uFE0F'; // ☁️
  return '\u{1F321}\uFE0F'; // 🌡️
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================
// WEATHER HOOK
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
  const colors = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)';
  const border = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: `${SPACING.md}px ${SPACING.md}px`,
        borderRadius: 14,
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: colorBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: colors.text1,
            margin: '0 0 2px',
            letterSpacing: '-0.01em',
          }}
        >
          {value ?? '\u2013'}
        </p>
        <p
          style={{
            fontSize: '0.7rem',
            color: colors.text3,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
});

StatPill.displayName = 'StatPill';

const FeatureCard = React.memo(({ feature, isDark }) => {
  const Icon = feature.icon;
  const colors = isDark ? COLORS.dark : COLORS.light;
  const cardBg = isDark
    ? 'rgba(15, 23, 42, 0.7)'
    : 'rgba(255, 255, 255, 0.85)';
  const border = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: `${SPACING.lg}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 12px 32px rgba(0, 0, 0, 0.3)'
          : '0 8px 24px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)';
      }}
    >
      {/* Icon Container */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: feature.colorBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: feature.color,
          flexShrink: 0,
        }}
      >
        <Icon size={24} />
      </div>

      {/* Label & Description */}
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: colors.text1,
            margin: '0 0 6px',
            letterSpacing: '-0.015em',
            lineHeight: 1.3,
          }}
        >
          {feature.label}
        </h3>
        <p
          style={{
            fontSize: '0.85rem',
            color: colors.text3,
            margin: 0,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
          }}
        >
          {feature.desc}
        </p>
      </div>

      {/* CTA Button */}
      <Link
        to={feature.to}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: `${SPACING.sm}px ${SPACING.md}px`,
          borderRadius: 10,
          fontSize: '0.8rem',
          fontWeight: 700,
          textDecoration: 'none',
          background: feature.colorBg,
          color: feature.color,
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(2px)';
          e.currentTarget.style.opacity = '0.85';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.opacity = '1';
        }}
      >
        {feature.cta} <FiArrowRight size={14} />
      </Link>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

const AttendanceCTA = React.memo(({ cls, location: loc, isDark, onSuccess }) => {
  const [state, setState] = React.useState('idle');
  const [timeLeft, setTimeLeft] = React.useState(null);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    if (!cls?.mark_window_closes) return;
    const ms = new Date(cls.mark_window_closes) - Date.now();
    if (ms <= 0) {
      setTimeLeft(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setTimeLeft({
      mins: Math.floor(ms / 60000),
      secs: Math.floor((ms % 60000) / 1000),
    });
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
          longitude: loc.longitude,
        });
      } else {
        await apiClient.post('/classes/mark-attendance/', {
          timetable_entry_id: cls.entry_id,
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

  const colors = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.06)';
  const border = isDark
    ? 'rgba(99, 102, 241, 0.25)'
    : 'rgba(99, 102, 241, 0.2)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.md}px ${SPACING.lg}px`,
        borderRadius: 14,
        background: bg,
        border: `1.5px solid ${border}`,
        marginBottom: SPACING.lg,
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{'\u23F1'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#6366f1',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 4px',
          }}
        >
          Check-in Window
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: colors.text1,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cls.unit_name}
          {timeLeft && (
            <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginLeft: 8 }}>
              {timeLeft.mins}:{String(timeLeft.secs).padStart(2, '0')} left
            </span>
          )}
        </p>
      </div>
      <button
        onClick={handleCheckIn}
        disabled={state !== 'idle'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: `${SPACING.sm}px ${SPACING.md}px`,
          borderRadius: 10,
          border: 'none',
          background:
            state === 'success'
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: state !== 'idle' ? 'default' : 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
      >
        {state === 'loading' && (
          <FiLoader size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
        )}
        {state === 'success' && <FiCheckCircle size={12} />}
        {state === 'error' && <FiAlertCircle size={12} />}
        {state === 'loading'
          ? 'Checking\u2026'
          : state === 'success'
            ? 'Checked in!'
            : state === 'error'
              ? 'Retry'
              : 'Check In'}
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

  React.useEffect(() => {
    if (shouldFetchLocation.current) {
      getLocation();
      shouldFetchLocation.current = false;
    }
  }, [getLocation]);

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
    enabled: !!todayClasses,
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

  const colors = isDark ? COLORS.dark : COLORS.light;

  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const greeting = getGreeting();
  const dateStr = formatDate();

  const attendedCount = todayClasses?.filter((c) => c.is_marked).length ?? 0;
  const totalClasses = todayClasses?.length ?? 0;
  const nextMarkableClass = todayClasses?.find(
    (c) => c.can_mark && !c.is_marked
  ) ?? null;
  const allMarked = totalClasses > 0 && attendedCount === totalClasses;
  const urgentAnn = (announcements || []).filter((a) => a.is_urgent).length;

  return (
    <>
      <HomepageBackground isDark={isDark} />

      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          padding: `${SPACING.lg}px ${SPACING.md}px 80px`,
          maxWidth: 1100,
          margin: '0 auto',
          position: 'relative',
          zIndex: 10,
          width: '100%',
        }}
      >
        {/* HERO SECTION */}
        <div
          style={{
            borderRadius: 24,
            padding: `${SPACING.xl}px`,
            background: isDark
              ? 'rgba(9, 13, 28, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${colors.border}`,
            marginBottom: SPACING.lg,
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: SPACING.lg,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Date Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: `${SPACING.xs}px ${SPACING.sm}px`,
                  borderRadius: 99,
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#6366f1',
                  marginBottom: SPACING.md,
                }}
              >
                <FiZap size={11} />
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                })}{' '}
                {'\u00B7'} Campus OS
              </div>

              {/* Greeting */}
              <h1
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.1,
                  margin: `0 0 ${SPACING.sm}px`,
                  color: colors.text1,
                }}
              >
                {greeting}, <span style={{ color: '#6366f1' }}>{firstName}</span>.
              </h1>

              {/* Status */}
              <p
                style={{
                  fontSize: '0.95rem',
                  color: colors.text3,
                  margin: `0 0 ${SPACING.lg}px`,
                  maxWidth: 360,
                  lineHeight: 1.5,
                }}
              >
                {totalClasses > 0
                  ? `${attendedCount} of ${totalClasses} classes attended today.`
                  : "No classes today \u2014 explore what's on campus."}
              </p>

              {/* Info Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.xs }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: `${SPACING.xs}px ${SPACING.sm}px`,
                    borderRadius: 8,
                    background: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                    border: isDark
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.05)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <FiCalendar size={12} />
                  {dateStr}
                </div>

                {weather && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: 8,
                      background: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.04)',
                      border: isDark
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.05)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {weather.icon} {weather.temp}{'\u00B0'}C {'\u00B7'} {weather.desc}
                  </div>
                )}

                {urgentAnn > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: 8,
                      background: 'rgba(251, 191, 36, 0.12)',
                      border: '1px solid rgba(251, 191, 36, 0.25)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#fcd34d',
                    }}
                  >
                    <FiAlertCircle size={12} />
                    {urgentAnn} urgent notice{urgentAnn > 1 ? 's' : ''}
                  </div>
                )}

                {allMarked && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: 8,
                      background: 'rgba(52, 211, 153, 0.12)',
                      border: '1px solid rgba(52, 211, 153, 0.25)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6ee7b7',
                    }}
                  >
                    <FiCheckCircle size={12} />
                    All attended
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Ring */}
            <AttendanceRing attended={attendedCount} total={totalClasses} size={100} isDark={isDark} />
          </div>
        </div>

        {/* ATTENDANCE CTA */}
        {!loadingCls && !checkinDone && nextMarkableClass && (
          <AttendanceCTA
            cls={nextMarkableClass}
            location={location}
            isDark={isDark}
            onSuccess={() => setCheckinDone(true)}
          />
        )}

        {/* ALL ATTENDED BANNER */}
        {!loadingCls && allMarked && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
              padding: `${SPACING.sm}px ${SPACING.md}px`,
              borderRadius: 14,
              background: isDark
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(16, 185, 129, 0.06)',
              border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`,
              marginBottom: SPACING.md,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: isDark ? '#6ee7b7' : '#059669',
            }}
          >
            <FiCheckCircle size={16} />
            All {totalClasses} class{totalClasses > 1 ? 'es' : ''} attended {'\u2014'} well done!
            <Link
              to="/classes"
              style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: isDark ? '#6ee7b7' : '#059669',
                textDecoration: 'none',
                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                borderRadius: 6,
                background: isDark
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(16, 185, 129, 0.1)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark
                  ? 'rgba(16, 185, 129, 0.25)'
                  : 'rgba(16, 185, 129, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(16, 185, 129, 0.1)';
              }}
            >
              View stats
            </Link>
          </div>
        )}

        {/* STATS GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: SPACING.md,
            marginBottom: SPACING.xl,
          }}
        >
          <StatPill
            icon={FiBook}
            label="Classes"
            value={totalClasses}
            color="#6366f1"
            colorBg="rgba(99, 102, 241, 0.1)"
            isDark={isDark}
          />
          <StatPill
            icon={FiCheckCircle}
            label="Attended"
            value={attendedCount}
            color="#10b981"
            colorBg="rgba(16, 185, 129, 0.1)"
            isDark={isDark}
          />
          <StatPill
            icon={FiBell}
            label="Urgent"
            value={urgentAnn}
            color={urgentAnn > 0 ? '#f59e0b' : '#9ca3af'}
            colorBg={
              urgentAnn > 0
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(0, 0, 0, 0.05)'
            }
            isDark={isDark}
          />
          <StatPill
            icon={FiBriefcase}
            label="Opportunities"
            value={opportunities?.length}
            color="#8b5cf6"
            colorBg="rgba(139, 92, 246, 0.1)"
            isDark={isDark}
          />
        </div>

        {/* TODAY'S CLASSES */}
        {!loadingCls && todayClasses?.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: SPACING.md,
              }}
            >
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.sm,
                  color: colors.text1,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 18,
                    borderRadius: 99,
                    background: '#6366f1',
                  }}
                />
                Today&apos;s Classes
              </h2>
              <Link
                to="/classes"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#6366f1',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                All <FiArrowRight size={12} />
              </Link>
            </div>

            <div
              style={{
                borderRadius: 14,
                padding: SPACING.md,
                marginBottom: SPACING.xl,
                background: isDark
                  ? 'rgba(15, 23, 42, 0.7)'
                  : 'rgba(255, 255, 255, 0.85)',
                border: `1px solid ${colors.border}`,
              }}
            >
              {todayClasses.slice(0, 4).map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.md,
                    padding: `${SPACING.md}px 0`,
                    borderBottom:
                      idx < 3 ? `1px solid ${colors.border}` : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: 7,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background:
                        c.can_mark && !c.is_marked
                          ? 'rgba(99, 102, 241, 0.1)'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.04)',
                      color:
                        c.can_mark && !c.is_marked
                          ? '#6366f1'
                          : colors.text3,
                    }}
                  >
                    {c.start_time?.slice(0, 5)}
                  </span>

                  <p
                    style={{
                      flex: 1,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: colors.text1,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.unit_name}
                  </p>

                  {c.venue && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: '0.7rem',
                        color: colors.text3,
                        flexShrink: 0,
                      }}
                    >
                      <FiMapPin size={11} />
                      {c.venue}
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: 99,
                      flexShrink: 0,
                      ...(c.is_marked
                        ? {
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: isDark ? '#6ee7b7' : '#059669',
                        }
                        : c.can_mark
                          ? {
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: isDark ? '#fbbf24' : '#d97706',
                          }
                          : {
                            background: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.04)',
                            color: colors.text3,
                          }),
                    }}
                  >
                    {c.is_marked ? '\u2713 Done' : c.can_mark ? 'Mark' : 'Soon'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* URGENT NOTICES */}
        {urgentAnn > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: SPACING.md,
              }}
            >
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.sm,
                  color: colors.text1,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 18,
                    borderRadius: 99,
                    background: '#f59e0b',
                  }}
                />
                Urgent Notices
              </h2>
              <Link
                to="/announcements"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                All <FiArrowRight size={12} />
              </Link>
            </div>

            <div
              style={{
                borderRadius: 14,
                padding: SPACING.md,
                marginBottom: SPACING.xl,
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              {(announcements || [])
                .filter((a) => a.is_urgent)
                .slice(0, 3)
                .map((a, idx) => (
                  <Link
                    key={a.id}
                    to="/announcements"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.md,
                      padding: `${SPACING.md}px 0`,
                      borderBottom:
                        idx < 2
                          ? '1px solid rgba(245, 158, 11, 0.1)'
                          : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.85';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    <FiAlertCircle
                      size={16}
                      style={{ color: '#f59e0b', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: colors.text1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {a.title}
                    </span>
                    <FiArrowRight
                      size={14}
                      style={{ color: colors.text3, flexShrink: 0 }}
                    />
                  </Link>
                ))}
            </div>
          </>
        )}

        <hr
          style={{
            border: 'none',
            borderTop: `1px solid ${colors.border}`,
            margin: `0 0 ${SPACING.xl}px`,
          }}
        />

        {/* CAMPUS SERVICES */}
        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '1rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: SPACING.md,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            color: colors.text1,
          }}
        >
          <span
            style={{
              width: 4,
              height: 18,
              borderRadius: 99,
              background:
                'linear-gradient(180deg, #6366f1, #8b5cf6)',
            }}
          />
          Campus Services
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(240px, 1fr))',
            gap: SPACING.md,
          }}
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} isDark={isDark} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          [style*="grid-template-columns"][style*="repeat"] {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
          }
        }
      `}</style>
    </>
  );
}