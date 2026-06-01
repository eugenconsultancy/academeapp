// src/pages/HomePage.jsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { classesApi } from '../api/classesApi';
import { blogApi } from '../api/blogApi';
import GeoService from '../api/geoService';
import apiClient from '../api/client';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTheme } from '../contexts/ThemeContext';
// Lazy load heavy 3D components – temporarily disabled to fix ConcurrentRoot error
// const HomepageScene = lazy(() => import('../components/three/HomepageScene'));
// const AttendanceRing3D = lazy(() => import('../components/three/AttendanceRing3D'));
import {
  FiArrowRight, FiPackage, FiBell, FiBriefcase,
  FiBook, FiClock, FiMapPin, FiUser, FiZap,
  FiCheckCircle, FiAlertCircle,
  FiHeart, FiEye, FiCalendar,
  FiActivity, FiNavigation, FiShield, FiBarChart2,
  FiChevronRight, FiLoader, FiTrendingUp, FiInfo,
  FiTarget, FiAward, FiStar, FiGlobe, FiUsers,
  FiFileText, FiSearch, FiMessageSquare, FiCompass,
} from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════
   CAMPUS TIPS
══════════════════════════════════════════════════════════════ */
const CAMPUS_TIPS = [
  "The shortcut behind Lab 201 saves 5 minutes walking to Lecture Hall 3.",
  "Cafeteria is least crowded between 2:00–3:00 PM — skip the lunch rush.",
  "Printing is free in the Computer Lab before 9 AM. Get there early!",
  "You can renew library books online — no queuing needed.",
  "The quiet study room on Floor 3 of the library is almost always empty.",
  "Charge your devices at the charging stations near the Main Hall entrance.",
  "The side gate on Eastern Wing opens at 6 AM — shorter walk from hostels.",
  "Exam timetables are posted 3 weeks early on the student portal.",
  "Wi-Fi is strongest near the Admin Block and IT Centre windows.",
  "Lost your student ID? Report it at the Security Office for a 24hr temp pass.",
  "The campus clinic offers free consultations on Tuesdays and Thursdays.",
  "Bus 14 to town runs every 20 minutes — check the schedule at the main gate.",
  "Course registration bugs? The Registrar office opens at 7:30 AM daily.",
  "Save mobile data: the campus network has a mirrored repo for common packages.",
  "The rooftop of Block D has great signal and a quiet spot to study.",
  "Morning classes on Level 1 are often reassigned — check the notice board.",
  "The Student Centre has free board games and a pool table on weekends.",
  "Need a quiet phone call? The area beside the sports field is lowest traffic.",
  "Print your academic calendar at the start of semester — plan ahead.",
  "Group study bookings open at 8 AM — book the Collaborative Room online.",
  "Campus events often have free refreshments. Check the events board weekly.",
  "The engineering workshop has free tools for borrowing with your student ID.",
  "Water dispensers on every floor. Bring your own bottle to stay hydrated.",
  "Counselling services are confidential and free — Room 104, Wellness Centre.",
  "Late submission? Some lecturers accept work via email — always ask first.",
  "The sports centre has open gym slots on Fridays 4–6 PM at no charge.",
  "Student discounts apply at the campus bookshop — always show your ID.",
  "Need to scan documents? The library copier on Floor 1 is fastest.",
  "Attendance is tracked digitally — mark in-app before class, not after.",
  "The arboretum path between blocks is the most scenic shortcut on campus.",
  "End-of-semester forms are due 2 weeks before exams — don't miss the deadline.",
];

/* ══════════════════════════════════════════════════════════════
   WEATHER HELPERS
══════════════════════════════════════════════════════════════ */
function weatherIcon(code) {
  if (!code) return '🌡️';
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return '☀️';
  if (code === 801) return '🌤️';
  if (code <= 804) return '☁️';
  return '🌡️';
}

function weatherInsight(desc) {
  if (!desc) return null;
  const d = desc.toLowerCase();
  if (d.includes('rain')) return 'Rain expected — remember your umbrella.';
  if (d.includes('storm') || d.includes('thunder')) return 'Storms forecast — stay indoors if possible.';
  if (d.includes('snow')) return 'Snow on the way — dress warmly!';
  if (d.includes('fog') || d.includes('mist')) return 'Low visibility — allow extra travel time.';
  if (d.includes('clear') || d.includes('sun')) return 'Clear skies today — great day to be outdoors!';
  if (d.includes('cloud')) return 'Overcast today — light jacket recommended.';
  return null;
}

/* ══════════════════════════════════════════════════════════════
   WEATHER HOOK
══════════════════════════════════════════════════════════════ */
function useWeather(lat, lon) {
  const CACHE_KEY = 'weather_cache';
  const CACHE_TTL = 30 * 60 * 1000;
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      if (!lat || !lon || !API_KEY) return null;
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL) return data;
        }
      } catch { /* ignore */ }
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      if (!res.ok) throw new Error('weather fetch failed');
      const data = await res.json();
      const result = {
        temp: Math.round(data.main.temp),
        desc: data.weather?.[0]?.description || '',
        code: data.weather?.[0]?.id,
        icon: weatherIcon(data.weather?.[0]?.id),
        humidity: data.main.humidity,
        wind: Math.round(data.wind?.speed ?? 0),
      };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
      return result;
    },
    enabled: !!lat && !!lon && !!API_KEY,
    staleTime: CACHE_TTL,
    retry: false,
  });
}

/* ══════════════════════════════════════════════════════════════
   CONTEXT GREETING
══════════════════════════════════════════════════════════════ */
function getContextGreeting(todayClasses, hour, dayOfWeek) {
  const total = todayClasses?.length ?? 0;
  const marked = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const upcoming = todayClasses?.find(c => !c.is_marked && c.can_mark);
  const nextSoon = todayClasses?.find(c => !c.is_marked && !c.can_mark);
  if (total === 0) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'Weekend mode — enjoy your break!';
    return 'No classes today — perfect day to catch up.';
  }
  if (marked === total && total > 0) return `All ${total} classes attended today. Well done!`;
  if (upcoming) return `Check-in window open for ${upcoming.unit_name}.`;
  if (nextSoon) return `Next: ${nextSoon.unit_name} at ${nextSoon.start_time?.slice(0, 5)}.`;
  return `${marked} of ${total} classes attended today.`;
}

/* ══════════════════════════════════════════════════════════════
   SCROLL REVEAL HOOK
══════════════════════════════════════════════════════════════ */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVis(true); ob.disconnect(); } },
      { threshold },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return [ref, vis];
}

/* ══════════════════════════════════════════════════════════════
   ATTENDANCE CTA
══════════════════════════════════════════════════════════════ */
function AttendanceCTA({ nextMarkableClass, location, onSuccess, isDark }) {
  const [checkinState, setCheckinState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(null);
  const [urgency, setUrgency] = useState('normal');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!nextMarkableClass?.mark_window_closes) return;
    const tick = () => {
      const ms = new Date(nextMarkableClass.mark_window_closes) - Date.now();
      if (ms <= 0) { setTimeLeft(null); return; }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setTimeLeft({ mins, secs, ms });
      setUrgency(ms < 5 * 60000 ? 'critical' : ms < 15 * 60000 ? 'warning' : 'normal');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextMarkableClass]);

  const handleCheckIn = async () => {
    if (checkinState !== 'idle') return;
    setCheckinState('loading');
    try {
      if (location?.latitude && location?.longitude) {
        await apiClient.post('/geo/check-in/', {
          class_id: nextMarkableClass.id,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      } else {
        await apiClient.post('/classes/mark-attendance/', { class_id: nextMarkableClass.id });
      }
      setCheckinState('success');
      queryClient.invalidateQueries(['today-classes']);
      setTimeout(() => onSuccess?.(), 2000);
    } catch {
      setCheckinState('error');
      setTimeout(() => setCheckinState('idle'), 2500);
    }
  };

  if (!nextMarkableClass) return null;

  const urgencyMap = {
    normal: { border: '#f3601c', glow: 'rgb(238, 62, 9)', btn: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
    warning: { border: '#a16a0a', glow: 'rgba(245,158,11,.25)', btn: 'linear-gradient(135deg,#d97706,#f59e0b)' },
    critical: { border: '#ef4444', glow: 'rgba(165, 39, 39, 0.3)', btn: 'linear-gradient(135deg,#dc2626,#ef4444)' },
  };
  const u = urgencyMap[urgency];

  const cardBg = isDark ? 'rgba(15,23,42,0.9)' : '#ffffff';
  const textMain = isDark ? '#ca3305' : '#1f2937';
  const border = isDark ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : u.border}` : `1px solid ${u.border}`;
  const shadow = isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)';

  return (
    <div className="hp-cta-wrap" style={{
      '--cta-border': u.border,
      '--cta-glow': u.glow,
      background: cardBg,
      border,
      boxShadow: shadow,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '14px 0 0 14px', background: u.btn }} />
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          {urgency !== 'normal' && (
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: u.border, animation: 'hpCtaDot 1.3s ease-in-out infinite', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: u.border }}>
            Check-in window open
          </span>
        </div>
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '.95rem', fontWeight: 700, color: textMain, letterSpacing: '-.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: timeLeft ? 3 : 0 }}>
          {nextMarkableClass.unit_name}
        </p>
        {timeLeft && (
          <p style={{ fontSize: '.72rem', fontWeight: 900, color: u.border }}>
            Closes in {timeLeft.mins}:{String(timeLeft.secs).padStart(2, '0')}
          </p>
        )}
      </div>
      <button
        onClick={handleCheckIn}
        disabled={checkinState !== 'idle'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '11px 22px', borderRadius: 11, border: 'none',
          background: checkinState === 'success' ? 'linear-gradient(135deg,#059669,#10b981)' : u.btn,
          color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: '.82rem', fontWeight: 700,
          cursor: checkinState !== 'idle' ? 'default' : 'pointer',
          opacity: checkinState !== 'idle' && checkinState !== 'success' ? .8 : 1,
          flexShrink: 0, boxShadow: `0 4px 14px ${u.glow}`,
          transition: 'transform .18s, filter .18s',
        }}
        onMouseEnter={e => { if (checkinState === 'idle') e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {checkinState === 'loading' && <FiLoader size={14} style={{ animation: 'hpSpin .8s linear infinite' }} />}
        {checkinState === 'success' && <><FiCheckCircle size={14} /> Checked in!</>}
        {checkinState === 'error' && <><FiAlertCircle size={14} /> Retry</>}
        {checkinState === 'idle' && <><FiMapPin size={14} /> Check In</>}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   NEEDS ATTENTION
══════════════════════════════════════════════════════════════ */
function NeedsAttentionSection({ items, isDark }) {
  if (!items.length) return null;
  const critical = items.filter(i => i.is_urgent);
  const normal = items.filter(i => !i.is_urgent);

  const bg = isDark ? 'rgba(55,40,8,0.5)' : '#fffbf0';
  const border = isDark ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(245,158,11,.2)';
  const textMain = isDark ? '#fcd34d' : '#1f2937';
  const textUrgent = isDark ? '#fbbf24' : '#d97706';
  const textNormal = isDark ? '#e2e8f0' : '#374151';

  const Row = ({ item }) => (
    <Link to={item.to || '#'} className="hp-na-row" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.is_urgent ? '#f59e0b' : '#6366f1', flexShrink: 0, marginTop: 4, boxShadow: item.is_urgent ? '0 0 6px rgba(245,158,11,.5)' : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.is_urgent && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: textUrgent, background: 'rgba(245,158,11,.15)', padding: '2px 8px', borderRadius: 99, marginBottom: 4 }}>
            <FiAlertCircle size={8} /> Urgent
          </span>
        )}
        <p style={{ fontSize: '.84rem', fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: item.time ? 2 : 0 }}>
          {item.title}
        </p>
        {item.time && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.65rem', color: isDark ? '#94a3b8' : '#9ca3af', fontWeight: 600 }}>
            <FiClock size={9} />{item.time}
          </p>
        )}
      </div>
      <FiChevronRight size={14} style={{ color: isDark ? '#64748b' : '#d1d5db', flexShrink: 0 }} />
    </Link>
  );

  return (
    <div className="hp-attention-section" style={{
      borderRadius: 16,
      background: bg,
      border,
      borderLeft: '4px solid #f59e0b',
      padding: '20px 20px 14px',
      boxShadow: '0 2px 16px rgba(245,158,11,.08),0 0 0 4px rgba(245,158,11,.05)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {critical.length > 0 && (
          <div style={{ marginBottom: normal.length ? 16 : 0 }}>
            <p style={{ fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: textUrgent, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'hpCtaDot 1.3s ease-in-out infinite' }} />
              Critical
            </p>
            {critical.map(item => <Row key={item.key} item={item} />)}
          </div>
        )}
        {normal.length > 0 && (
          <div>
            {critical.length > 0 && (
              <p style={{ fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 10, marginTop: 4 }}>Informational</p>
            )}
            {normal.map(item => <Row key={item.key} item={item} />)}
          </div>
        )}
      </div>
      <Link to="/announcements" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 0 2px', fontSize: '.72rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none', borderTop: `1px solid ${isDark ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.08)'}`, marginTop: 12, transition: 'color .15s' }}>
        View all notices <FiArrowRight size={12} />
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sublabel, icon: Icon, color, accentBg, trend, total, isDark }) {
  const pct = total && value != null ? Math.min(100, Math.round((value / total) * 100)) : null;
  const bg = isDark ? 'rgba(15,23,42,0.8)' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textMain = isDark ? '#cadbca' : '#111827';
  const labelColor = isDark ? '#0f3b77' : '#9ca3af';
  const subColor = isDark ? '#2b69c0' : '#6b7280';

  return (
    <div style={{
      borderRadius: 16, padding: '18px 16px 16px', background: bg,
      border: `1px solid ${borderColor}`, boxShadow: '0 1px 4px rgba(0,0,0,.04)',
      transition: 'transform .2s,box-shadow .2s',
    }} className="hp-stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon size={16} />
        </div>
        {trend != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.62rem', fontWeight: 700, color: trend >= 0 ? '#10b981' : '#ef4444' }}>
            <FiTrendingUp size={10} style={{ transform: trend < 0 ? 'scaleY(-1)' : 'none' }} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '2rem', fontWeight: 800, color: textMain, letterSpacing: '-.05em', lineHeight: 1, marginBottom: 4 }}>
        {value ?? '–'}
      </div>
      <div style={{ fontSize: '.62rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{label}</div>
      {sublabel && <div style={{ fontSize: '.7rem', color: subColor, fontWeight: 500, marginTop: 3 }}>{sublabel}</div>}
      {pct !== null && (
        <>
          <div style={{ height: 3, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,.05)', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width .9s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <div style={{ fontSize: '.6rem', color: labelColor, fontWeight: 600, marginTop: 4 }}>{pct}% attended</div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CLASS ROW
══════════════════════════════════════════════════════════════ */
function ClassRow({ c, highlight, isDark }) {
  const bgHighlight = highlight ? (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,.04)') : 'transparent';
  const textMain = isDark ? '#e2e8f0' : '#1f2937';
  const textMuted = isDark ? '#94a3b8' : '#9ca3af';
  const pillStyle = (type) => {
    if (type === 'green') return { background: 'rgba(16,185,129,.15)', color: '#6ee7b7' };
    if (type === 'amber') return { background: 'rgba(245,158,11,.15)', color: '#fbbf24' };
    return { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(107,114,128,.07)', color: isDark ? '#94a3b8' : '#6b7280' };
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: highlight ? '10px 10px' : '9px 0',
      background: bgHighlight,
      borderRadius: highlight ? 10 : 0,
      margin: highlight ? '2px -10px' : 0,
      borderBottom: highlight ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,.04)'}`,
    }}>
      <span style={{ fontSize: '.58rem', fontWeight: 800, padding: '4px 8px', borderRadius: 8, background: highlight ? 'rgba(99,102,241,.15)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,.05)'), color: highlight ? '#6366f1' : textMuted, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2, letterSpacing: '.02em' }}>
        {c.start_time?.slice(0, 5)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '.83rem', fontWeight: 700, color: textMain, letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{c.unit_name}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {c.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.63rem', color: textMuted }}><FiMapPin size={9} />{c.venue}</span>}
          {c.lecturer && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.63rem', color: textMuted }}><FiUser size={9} />{c.lecturer}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {c.is_marked ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, ...pillStyle('green') }}><FiCheckCircle size={9} />Done</span>
          : c.can_mark ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, ...pillStyle('amber') }}>Mark</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, ...pillStyle('gray') }}>Soon</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FEATURE SECTIONS
══════════════════════════════════════════════════════════════ */
const FEATURE_SECTIONS = [
  {
    id: 'opportunities',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,.07) 0%, rgba(139,92,246,.05) 100%)',
    border: 'rgba(99,102,241,.15)',
    accent: '#6366f1',
    accentBg: 'rgba(99,102,241,.1)',
    icon: FiBriefcase,
    emoji: '💼',
    title: 'Opportunities',
    tagline: 'Your launchpad for scholarships, internships & leadership.',
    bullets: [
      { icon: FiStar, text: 'Curated scholarships, grants & bursaries — updated daily.' },
      { icon: FiTarget, text: 'Personalised alerts when new opportunities match your profile.' },
      { icon: FiFileText, text: 'Step-by-step application guidance with deadline tracking.' },
    ],
    stat: '200+',
    statLabel: 'Opportunities posted this semester',
    to: '/opportunities',
    cta: 'Explore Opportunities',
    reverse: false,
  },
  {
    id: 'announcements',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,.06) 0%, rgba(251,191,36,.04) 100%)',
    border: 'rgba(245,158,11,.15)',
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,.1)',
    icon: FiBell,
    emoji: '📢',
    title: 'Announcements',
    tagline: 'Never miss what matters on campus.',
    bullets: [
      { icon: FiAlertCircle, text: 'Urgent notices from the administration surfaced instantly.' },
      { icon: FiMessageSquare, text: 'Student-led announcements with an approval workflow to prevent spam.' },
      { icon: FiZap, text: 'Push notifications for time-sensitive updates, wherever you are.' },
    ],
    stat: '98%',
    statLabel: 'Notification delivery rate',
    to: '/announcements',
    cta: 'Read Notices',
    reverse: true,
  },
  {
    id: 'found-items',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,.06) 0%, rgba(6,182,212,.04) 100%)',
    border: 'rgba(16,185,129,.15)',
    accent: '#21966f',
    accentBg: 'rgba(16,185,129,.1)',
    icon: FiPackage,
    emoji: '🎒',
    title: 'Lost & Found',
    tagline: 'Reconnect lost items with their owners — fast.',
    bullets: [
      { icon: FiSearch, text: 'Photo-based item listings with location tags across campus.' },
      { icon: FiUsers, text: 'Verified claim process with identity confirmation to prevent fraud.' },
      { icon: FiActivity, text: 'Real-time feed of newly posted items — check before you give up.' },
    ],
    stat: '85%',
    statLabel: 'Items successfully reunited with owners',
    to: '/found-items',
    cta: 'Browse Found Items',
    reverse: false,
  },
  {
    id: 'classes',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,.06) 0%, rgba(99,102,241,.04) 100%)',
    border: 'rgba(139,92,246,.15)',
    accent: '#2036f5',
    accentBg: 'rgba(139,92,246,.1)',
    icon: FiBook,
    emoji: '📚',
    title: 'Classes & Attendance',
    tagline: 'Your academic schedule, always in sync.',
    bullets: [
      { icon: FiMapPin, text: 'Geo-verified check-in: mark attendance only when you\'re at the venue.' },
      { icon: FiBarChart2, text: 'Semester attendance analytics — track your standing across all units.' },
      { icon: FiClock, text: 'Live check-in windows with countdown so you never miss the mark.' },
    ],
    stat: '60s',
    statLabel: 'Average time to check in',
    to: '/classes',
    cta: 'View My Classes',
    reverse: true,
  },
  {
    id: 'campus-map',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,.06) 0%, rgba(16,185,129,.04) 100%)',
    border: 'rgba(6,182,212,.15)',
    accent: '#2ca89e',
    accentBg: 'rgba(6,182,212,.1)',
    icon: FiCompass,
    emoji: '🗺️',
    title: 'Campus Map',
    tagline: 'Navigate every corner of campus with confidence.',
    bullets: [
      { icon: FiNavigation, text: 'Live indoor positioning to guide you to any lecture hall or office.' },
      { icon: FiGlobe, text: 'Venue details — capacity, accessibility, opening hours & contacts.' },
      { icon: FiZap, text: 'Nearby classes shown on-map so you can get there before the bell.' },
    ],
    stat: '120+',
    statLabel: 'Venues mapped across campus',
    to: '/campus-map',
    cta: 'Open Campus Map',
    reverse: false,
  },
];

function FeatureSection({ section, index, isDark }) {
  const [ref, visible] = useScrollReveal(0.12);
  const { icon: Icon, reverse } = section;
  const textMain = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
  const bodyColor = isDark ? '#f0f3f7' : '#374151';
  const cardBg = isDark ? 'rgba(15,23,42,0.8)' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : section.border;
  const accentBg = isDark ? `${section.accent}1a` : section.accentBg;

  return (
    <section
      ref={ref}
      id={section.id}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 48,
        alignItems: 'center',
        padding: '72px 0',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,.06)'}`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : `translateY(32px)`,
        transition: `opacity .7s ${index * .1}s cubic-bezier(.16,1,.3,1), transform .7s ${index * .1}s cubic-bezier(.16,1,.3,1)`,
      }}
      className="hp-feature-section"
    >
      <div style={{ order: reverse ? 2 : 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 99, background: accentBg, border: `1px solid ${borderColor}`, marginBottom: 20 }}>
          <Icon size={13} style={{ color: section.accent }} />
          <span style={{ fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: section.accent }}>
            {section.title}
          </span>
        </div>

        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-.04em', color: textMain, lineHeight: 1.15, marginBottom: 16 }}>
          {section.tagline}
        </h2>

        <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {section.bullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: section.accent, flexShrink: 0, marginTop: 2 }}>
                <b.icon size={15} />
              </div>
              <span style={{ fontSize: '.88rem', fontWeight: 500, color: bodyColor, lineHeight: 1.6 }}>{b.text}</span>
            </li>
          ))}
        </ul>

        <Link
          to={section.to}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 26px', borderRadius: 13,
            background: `linear-gradient(135deg, ${section.accent}, ${section.accent}cc)`,
            color: '#fff', fontFamily: "'DM Sans', sans-serif",
            fontSize: '.85rem', fontWeight: 700,
            textDecoration: 'none',
            boxShadow: `0 4px 16px ${accentBg}`,
            transition: 'transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s',
          }}
        >
          {section.cta} <FiArrowRight size={15} />
        </Link>
      </div>

      <div style={{ order: reverse ? 1 : 2 }}>
        <div style={{
          borderRadius: 24,
          background: isDark ? `${section.accent}10` : section.gradient,
          border: `1px solid ${borderColor}`,
          padding: '40px 36px',
          display: 'flex', flexDirection: 'column', gap: 24,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,.3)' : '0 8px 32px rgba(0,0,0,.05), 0 0 0 1px ' + section.border,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: 24, top: 20, fontSize: '5rem', opacity: .07, userSelect: 'none', lineHeight: 1 }}>
            {section.emoji}
          </div>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, letterSpacing: '-.06em', color: textMain, lineHeight: 1 }}>
              {section.stat}
            </div>
            <div style={{ fontSize: '.75rem', fontWeight: 600, color: textMuted, marginTop: 6 }}>
              {section.statLabel}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {section.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,.7)', borderRadius: 12, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,.8)'}` }}>
                <b.icon size={14} style={{ color: section.accent, flexShrink: 0 }} />
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: bodyColor }}>{b.text.split(' — ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   CAMPUS INTELLIGENCE CAROUSEL
══════════════════════════════════════════════════════════════ */
function CampusIntelligence({ weather, isDark }) {
  const dayIdx = new Date().getDate() - 1;
  const [idx, setIdx] = useState(0);
  const slides = [
    { icon: '💡', label: 'Your Campus Tip', text: CAMPUS_TIPS[dayIdx % CAMPUS_TIPS.length] },
    weather && {
      icon: weather.icon, label: 'Weather',
      text: weatherInsight(weather.desc) || `${weather.temp}°C, ${weather.desc}. Humidity ${weather.humidity}%, wind ${weather.wind} m/s.`,
    },
    { icon: '☕', label: 'Cafeteria', text: 'Least crowded between 2–3 PM. Main hall canteen opens at 7 AM for breakfast.' },
    { icon: '🗺️', label: 'Shortcut', text: CAMPUS_TIPS[(dayIdx + 3) % CAMPUS_TIPS.length] },
  ].filter(Boolean);
  const slide = slides[idx % slides.length];

  const cardBg = isDark ? 'rgba(15,23,42,0.8)' : '#ffffff';
  const border = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,.06)';
  const textMain = isDark ? '#f1f5f9' : '#374151';
  const labelColor = isDark ? '#f0f4fa' : '#9ca3af';
  const dotColor = '#2d30c9';

  return (
    <div style={{ borderRadius: 16, background: cardBg, border, borderLeft: `3px solid ${dotColor}`, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#4f46e5' }}>
          <FiInfo size={11} /> Campus Intelligence
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['‹', '›'].map((ch, j) => (
            <button key={ch} onClick={() => setIdx(i => j === 0 ? (i - 1 + slides.length) % slides.length : (i + 1) % slides.length)}
              style={{ width: 26, height: 26, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,.08)'}`, borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: '.9rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,.08)'; e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
            >{ch}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>{slide.icon}</span>
        <div>
          <p style={{ fontSize: '.63rem', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{slide.label}</p>
          <p style={{ fontSize: '.82rem', fontWeight: 500, color: textMain, lineHeight: 1.55 }}>{slide.text}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 14, alignItems: 'center' }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 99, background: i === idx ? dotColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,.1)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all .25s' }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACTIVITY FEED
══════════════════════════════════════════════════════════════ */
function ActivityFeed({ todayClasses, announcements, opportunities, claimedItems, isDark }) {
  const relTime = (t) => {
    if (!t) return '';
    const diff = Date.now() - new Date(t);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const items = [
    ...(todayClasses || []).filter(c => c.is_marked).map(c => ({ key: `cls-${c.id}`, icon: '✅', text: `Checked into ${c.unit_name}`, time: c.marked_at })),
    ...(announcements || []).slice(0, 2).map(a => ({ key: `ann-${a.id}`, icon: a.is_urgent ? '🔴' : '📢', text: `${a.is_urgent ? 'Urgent: ' : ''}${a.title}`, time: a.created_at })),
    ...(opportunities || []).slice(0, 2).map(o => ({ key: `opp-${o.id}`, icon: '💼', text: `New: ${o.title}`, time: o.created_at })),
    ...(claimedItems || []).slice(0, 1).map(i => ({ key: `ci-${i.id}`, icon: '🎉', text: `${i.item_name || 'Item'} was reclaimed`, time: i.updated_at })),
  ].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 5);

  const textMain = isDark ? '#e2e8f0' : '#374151';
  const textMuted = isDark ? '#94a3b8' : '#9ca3af';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,.04)';

  if (!items.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: textMuted }}>
      <span style={{ fontSize: '1.4rem', marginBottom: 8, opacity: .6 }}>📭</span>
      <span style={{ fontSize: '.78rem', fontWeight: 700 }}>No recent activity</span>
    </div>
  );

  return (
    <div>
      {items.map((item, i) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < items.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
          <span style={{ fontSize: '.85rem', flexShrink: 0 }}>{item.icon}</span>
          <span style={{ flex: 1, fontSize: '.78rem', fontWeight: 500, color: textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
          <span style={{ flexShrink: 0, fontSize: '.63rem', color: textMuted, fontWeight: 600 }}>{relTime(item.time)}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION TITLE
══════════════════════════════════════════════════════════════ */
function SectionTitle({ children, to, linkLabel, tier = 'secondary', isDark }) {
  const colors = { primary: '#4f46e5', secondary: '#6366f1', tertiary: '#9ca3af', passive: '#d1d5db' };
  const textColor = isDark ? '#f1f5f9' : '#111827';
  const dotColor = colors[tier];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 14px' }}>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: tier === 'primary' ? '1.15rem' : '.95rem', fontWeight: 700, letterSpacing: '-.03em', color: textColor, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: tier === 'primary' ? 18 : 14, borderRadius: 99, background: dotColor, flexShrink: 0 }} />
        {children}
      </h2>
      {to && (
        <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.7rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, transition: 'color .15s, background .15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,.07)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = 'transparent'; }}
        >
          {linkLabel || 'View all'} <FiArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CARD
══════════════════════════════════════════════════════════════ */
function Card({ title, dotColor, to, linkLabel, children, elevated = false, accent = false, isDark }) {
  const bg = isDark ? 'rgba(15,23,42,0.8)' : '#ffffff';
  const border = isDark ? `1px solid ${accent ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,0.06)'}` : `1px solid ${accent ? 'rgba(99,102,241,.12)' : 'rgba(0,0,0,.06)'}`;
  const titleColor = isDark ? '#06adad' : '#111827';

  return (
    <div style={{ background: bg, border, borderRadius: 16, padding: 18, boxShadow: elevated ? (isDark ? '0 4px 20px rgba(0,0,0,.4)' : '0 4px 20px rgba(0,0,0,.07)') : '0 1px 4px rgba(0,0,0,.04)' }}>
      {(title || to) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '.87rem', fontWeight: 700, color: titleColor, letterSpacing: '-.02em', margin: 0 }}>
            {dotColor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
            {title}
          </p>
          {to && (
            <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.68rem', fontWeight: 700, color: '#6b7280', textDecoration: 'none', padding: '3px 9px', borderRadius: 7, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,.04)', transition: 'color .15s' }}>
              {linkLabel || 'All'} <FiArrowRight size={10} />
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   WORKSPACE LAUNCHER
══════════════════════════════════════════════════════════════ */
function WorkspaceLauncher({ links, isDark }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
      {links.map(({ to, label, icon: Icon, color = '#6366f1', bg = 'rgba(99,102,241,.08)' }) => (
        <Link key={to} to={to} className="hp-ws-link" style={{
          '--ws-color': color,
          '--ws-bg': bg,
          background: isDark ? 'rgba(15,23,42,0.8)' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,.07)',
          color: isDark ? '#d1d5db' : '#374151',
        }}>
          <div className="hp-ws-icon-wrap" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,.04)' }}><Icon size={18} /></div>
          <span className="hp-ws-label">{label}</span>
        </Link>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PLATFORM INTRO
══════════════════════════════════════════════════════════════ */
function PlatformIntro({ isDark }) {
  const [ref, visible] = useScrollReveal();
  const textMain = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
  return (
    <div ref={ref} style={{
      textAlign: 'center',
      padding: '80px 0 40px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(24px)',
      transition: 'opacity .7s, transform .7s cubic-bezier(.16,1,.3,1)',
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: isDark ? 'rgba(99,102,241,.1)' : 'rgba(99,102,241,.08)', border: `1px solid ${isDark ? 'rgba(99,102,241,.2)' : 'rgba(99,102,241,.15)'}`, marginBottom: 20 }}>
        <FiZap size={13} style={{ color: '#3437e0' }} />
        <span style={{ fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6366f1' }}>Everything in one place</span>
      </div>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-.04em', color: textMain, lineHeight: 1.15, marginBottom: 16, maxWidth: 600, margin: '0 auto 16px' }}>
        Your campus, intelligently connected
      </h2>
      <p style={{ fontSize: '.95rem', fontWeight: 400, color: textMuted, lineHeight: 1.7, maxWidth: 520, margin: '0 auto', marginBottom: 48 }}>
        Campus OS brings together every student service into a single, fast, beautifully designed experience — from attendance to opportunities, all in your pocket.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
        {[
          { val: '5k+', lbl: 'Active Students' },
          { val: '200+', lbl: 'Opportunities' },
          { val: '98%', lbl: 'Uptime' },
          { val: '60s', lbl: 'Avg. Check-in' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '20px 36px', borderRight: i < 3 ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,.07)'}` : 'none' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '2rem', fontWeight: 800, color: textMain, letterSpacing: '-.05em' }}>{s.val}</div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: textMuted, marginTop: 4 }}>{s.lbl}</div>
          </div>
        ))}
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
  const [isMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => { getLocation(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.nav-search-btn')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Queries ── */
  const { data: announcements, isLoading: loadingAnn } = useQuery({
    queryKey: ['recent-announcements'],
    queryFn: async () => { const r = await announcementsApi.list({ limit: 6 }); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: opportunities, isLoading: loadingOpp } = useQuery({
    queryKey: ['recent-opportunities'],
    queryFn: async () => { const r = await opportunitiesApi.list({ limit: 20 }); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: todayClasses, isLoading: loadingCls } = useQuery({
    queryKey: ['today-classes'],
    queryFn: async () => { const r = await classesApi.getTodayClasses(); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: blogPosts, isLoading: loadingBlog } = useQuery({
    queryKey: ['featured-blog'],
    queryFn: async () => { const r = await blogApi.getFeatured(); return Array.isArray(r) ? r : r.data || []; },
  });
  const { data: claimedItems } = useQuery({
    queryKey: ['claimed-items-ticker'],
    queryFn: async () => {
      const r = await apiClient.get('/found-items/items/', { params: { is_claimed: true, ordering: '-updated_at', limit: 3 } });
      return Array.isArray(r.data) ? r.data : r.data?.results || [];
    },
    refetchInterval: 60000,
  });
  const { data: nearbyClasses } = useQuery({
    queryKey: ['nearby-classes-home', location?.latitude, location?.longitude],
    queryFn: async () => {
      if (!location?.latitude || !location?.longitude) return [];
      const r = await GeoService.getNearbyClasses(location.latitude, location.longitude, 500);
      return Array.isArray(r) ? r.slice(0, 3) : [];
    },
    enabled: !!location,
  });

  const isLeader = ['admin', 'student_leader', 'faculty_rep'].includes(user?.role);
  const { data: governanceStats } = useQuery({
    queryKey: ['governance-stats-home'],
    queryFn: async () => { const r = await apiClient.get('/governance/stats/'); return r.data; },
    enabled: isLeader,
  });
  const { data: weather } = useWeather(location?.latitude, location?.longitude);

  /* ── Derived ── */
  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const hour = new Date().getHours();
  const dow = new Date().getDay();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const attendedCount = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const totalClasses = todayClasses?.length ?? 0;
  const nextMarkableClass = todayClasses?.find(c => c.can_mark && !c.is_marked) ?? null;
  const allMarked = totalClasses > 0 && attendedCount === totalClasses;
  const contextSub = getContextGreeting(todayClasses, hour, dow);
  const urgentAnn = (announcements || []).filter(a => a.is_urgent).length;

  const needsAttentionItems = [
    ...(announcements || []).filter(a => a.is_urgent).map(a => ({ key: `ann-${a.id}`, title: a.title, is_urgent: true, to: '/announcements' })),
    ...(announcements || []).filter(a => !a.is_urgent).slice(0, 2).map(a => ({ key: `ann2-${a.id}`, title: a.title, is_urgent: false, to: '/announcements' })),
    ...(opportunities || []).filter(o => {
      if (!o.expires_at) return false;
      const diff = new Date(o.expires_at) - Date.now();
      return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
    }).slice(0, 2).map(o => {
      const diff = new Date(o.expires_at) - Date.now();
      const label = diff < 86400000 ? `${Math.floor(diff / 3600000)}h left` : `${Math.floor(diff / 86400000)}d left`;
      return { key: `opp-${o.id}`, title: o.title, time: label, is_urgent: diff < 86400000, to: `/opportunities/${o.id}` };
    }),
  ].slice(0, 5);

  const workspaceLinks = [
    { to: '/classes', label: 'My Classes', icon: FiBook, color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
    { to: '/opportunities', label: 'Opportunities', icon: FiBriefcase, color: '#0ea5e9', bg: 'rgba(14,165,233,.1)' },
    { to: '/announcements', label: 'Notices', icon: FiBell, color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
    { to: '/found-items', label: 'Found Items', icon: FiPackage, color: '#10b981', bg: 'rgba(16,185,129,.1)' },
    { to: '/campus-map', label: 'Campus Map', icon: FiMapPin, color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
    { to: '/nearby-classes', label: 'Nearby', icon: FiNavigation, color: '#06b6d4', bg: 'rgba(6,182,212,.1)' },
    ...(isLeader ? [
      { to: '/governance', label: 'Governance', icon: FiShield, color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
      { to: '/admin', label: 'Admin', icon: FiBarChart2, color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
    ] : []),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes hpIn     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hpSpin   { to{transform:rotate(360deg);} }
        @keyframes hpCtaDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }

        .hp-root {
          font-family: 'DM Sans', sans-serif;
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 24px 100px;
          animation: hpIn .5s cubic-bezier(.16,1,.3,1) both;
          color: inherit;
          position: relative;
          z-index: 10;
        }
        @media (max-width:640px) { .hp-root { padding: 20px 16px 100px; } }

        .hp-hero {
          border-radius: 24px;
          padding: 48px 48px 44px;
          background: rgba(11,17,32,.92);
          backdrop-filter: blur(20px) saturate(1.4);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow:
            0 0 0 1px rgba(99,102,241,.15),
            0 24px 80px rgba(0,0,0,.35),
            inset 0 1px 0 rgba(255,255,255,.06);
          margin-bottom: 20px;
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .dark .hp-hero {
          background: rgba(5,8,20,.92);
        }
        .hp-hero::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 15% 30%, rgba(99,102,241,.22) 0%, transparent 55%),
            radial-gradient(ellipse at 88% 75%, rgba(139,92,246,.16) 0%, transparent 50%);
          pointer-events: none;
        }
        .hp-hero::after {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='rgba(255,255,255,0.02)'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }
        .hp-hero-inner { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; position:relative; z-index:1; }
        @media(max-width:640px) { .hp-hero { padding:30px 24px 28px; } .hp-hero-inner { flex-direction:column; gap:20px; } }

        .hp-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 13px; border-radius: 99px;
          background: rgba(99,102,241,.15);
          border: 1px solid rgba(99,102,241,.25);
          font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
          color: #a5b4fc; margin-bottom: 16px;
          backdrop-filter: blur(8px);
        }
        .hp-hero-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2rem, 5vw, 3.4rem);
          font-weight: 800; letter-spacing: -.045em; line-height: 1.08; margin: 0 0 8px; color: #fff;
        }
        .hp-hero-name span { color: #d3e203; }
        .hp-hero-sub { font-size:.87rem; font-weight:300; color:rgba(16, 201, 207, 0.87); margin:0 0 24px; max-width:380px; }
        .hp-hero-pills { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:0; }
        .hp-hero-pill {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 12px; border-radius:9px;
          background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1);
          font-size:.7rem; font-weight:600; color:rgba(255,255,255,.7);
          backdrop-filter:blur(8px);
        }
        .hp-hero-pill.amber { background:rgba(251,191,36,.14); border-color:rgba(251,191,36,.25); color:#fcd34d; }
        .hp-hero-pill.green { background:rgba(52,211,153,.14); border-color:rgba(52,211,153,.25); color:#6ee7b7; }

        .hp-hero-right { display:flex; flex-direction:column; align-items:center; gap:14px; min-width:110px; flex-shrink:0; }
        @media(max-width:640px) { .hp-hero-right { flex-direction:row; align-items:center; min-width:0; } }

        .hp-hero-meta-pill {
          display:flex; align-items:center; gap:5px;
          padding:6px 13px; border-radius:10px;
          background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08);
          font-size:.68rem; font-weight:600; color:rgba(249, 253, 253, 0.92); white-space:nowrap;
        }

        .hp-cta-wrap {
          display:flex; align-items:center; gap:16px;
          padding:18px 20px; border-radius:16px;
          border:1.5px solid var(--cta-border,#6366f1);
          box-shadow:0 0 0 4px var(--cta-glow,rgba(99,102,241,.12)),0 2px 12px rgba(0,0,0,.06);
          margin-bottom:20px; position:relative; overflow:hidden;
        }

        .hp-done-banner {
          display:flex; align-items:center; gap:10px; padding:13px 18px;
          border-radius:14px; background:rgba(16,185,129,.06);
          border:1px solid rgba(16,185,129,.18); margin-bottom:20px;
          font-size:.82rem; font-weight:600; color:#059669;
        }
        .dark .hp-done-banner {
          background: rgba(16,185,129,.1);
          color: #6ee7b7;
        }

        .hp-attention-section {
          border-radius:16px; border-left:4px solid #f59e0b;
          box-shadow:0 2px 16px rgba(245,158,11,.08),0 0 0 4px rgba(245,158,11,.05);
        }
        .dark .hp-attention-section {
          box-shadow:0 2px 16px rgba(0,0,0,.4);
        }

        .hp-na-row { display:flex; align-items:flex-start; gap:10px; padding:9px 6px; text-decoration:none; color:inherit; border-radius:8px; margin:0 -6px; transition:background .15s; }
        .hp-na-row:hover { background:rgba(0,0,0,.025); }
        .dark .hp-na-row:hover { background:rgba(255,255,255,.05); }

        .hp-feature-section { }
        @media(max-width:720px) {
          .hp-feature-section { grid-template-columns:1fr !important; gap:28px !important; padding:48px 0 !important; }
          .hp-feature-section > div { order:1 !important; }
        }

        .hp-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        @media(max-width:860px) { .hp-stat-grid { grid-template-columns:repeat(2,1fr); } }

        .hp-stat-card {
          border-radius:16px; padding:18px 16px 16px;
          transition:transform .2s,box-shadow .2s;
        }
        .hp-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .dark .hp-stat-card:hover { box-shadow:0 8px 24px rgba(0,0,0,.5); }

        .hp-two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:640px) { .hp-two-col { grid-template-columns:1fr; } }

        .hp-ws-link {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:9px; padding:18px 10px; border-radius:14px;
          border:1px solid rgba(0,0,0,.07);
          text-decoration:none;
          font-size:.7rem; font-weight:700; font-family:'DM Sans',sans-serif;
          text-align:center;
          transition:background .15s,border-color .15s,transform .2s cubic-bezier(.34,1.56,.64,1),color .15s,box-shadow .18s;
        }
        .hp-ws-link:hover {
          background:var(--ws-bg);
          border-color:color-mix(in srgb,var(--ws-color) 40%,transparent);
          color:var(--ws-color);
          transform:translateY(-4px);
          box-shadow:0 8px 20px rgba(0,0,0,.08);
        }
        .dark .hp-ws-link:hover {
          box-shadow:0 8px 20px rgba(0,0,0,.6);
        }
        .hp-ws-icon-wrap { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; color:inherit; transition:background .15s; }
        .hp-ws-link:hover .hp-ws-icon-wrap { background:var(--ws-bg); }
        .hp-ws-label { line-height:1.2; }

        .hp-divider { border:none; border-top:1px solid rgba(0,0,0,.07); margin:0; }
        .dark .hp-divider { border-top-color: rgba(255,255,255,0.07); }
      `}</style>

      {/* Lazy‑load the 3D background – only after main content is interactive */}
      {/* Temporarily disabled to fix ConcurrentRoot error */}
      {/* <Suspense fallback={<div style={{ position: 'fixed', inset: 0, zIndex: 0, background: isDark ? '#071226' : '#FAFBFD' }} />}>
        <HomepageScene isMobile={isMobile} isDark={isDark} />
      </Suspense> */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: isDark ? '#071226' : '#FAFBFD' }} />

      <div className="hp-root">
        <div className="hp-hero">
          <div className="hp-hero-inner">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hp-hero-tag">
                <FiZap size={9} />
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })} · Campus OS
              </div>
              <h1 className="hp-hero-name">{greeting}, <span>{firstName}</span>.</h1>
              <p className="hp-hero-sub">{contextSub}</p>
              <div className="hp-hero-pills">
                <div className="hp-hero-pill"><FiCalendar size={11} />{dateStr}</div>
                {weather && <div className="hp-hero-pill">{weather.icon} {weather.temp}°C · {weather.desc}</div>}
                {urgentAnn > 0 && <div className="hp-hero-pill amber"><FiAlertCircle size={11} />{urgentAnn} urgent notice{urgentAnn > 1 ? 's' : ''}</div>}
                {allMarked && <div className="hp-hero-pill green"><FiCheckCircle size={11} />All attended today</div>}
              </div>
            </div>
            <div className="hp-hero-right">
              {/* <Suspense fallback={<div style={{ width: isMobile ? 80 : 100, height: isMobile ? 80 : 100, borderRadius: '50%', background: isDark ? '#1f2937' : '#e2e8f0' }} />}>
                <AttendanceRing3D attended={attendedCount} total={totalClasses} size={isMobile ? 80 : 100} isDark={isDark} />
              </Suspense> */}
              <div style={{ width: isMobile ? 80 : 100, height: isMobile ? 80 : 100, borderRadius: '50%', background: isDark ? '#1f2937' : '#e2e8f0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                {nextMarkableClass ? (
                  <div className="hp-hero-meta-pill"><FiClock size={10} />{nextMarkableClass.unit_name?.split(' ').slice(0, 3).join(' ')}</div>
                ) : (
                  <div className="hp-hero-meta-pill"><FiActivity size={10} />{totalClasses > 0 ? `${totalClasses} today` : 'No classes'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!loadingCls && !checkinDone && nextMarkableClass && (
          <AttendanceCTA nextMarkableClass={nextMarkableClass} location={location} onSuccess={() => setCheckinDone(true)} isDark={isDark} />
        )}
        {!loadingCls && allMarked && (
          <div className="hp-done-banner" style={{ background: isDark ? 'rgba(16,185,129,.1)' : undefined, color: isDark ? '#6ee7b7' : undefined, borderColor: isDark ? 'rgba(16,185,129,.2)' : undefined }}>
            <FiCheckCircle size={16} style={{ flexShrink: 0 }} />
            All {totalClasses} class{totalClasses > 1 ? 'es' : ''} attended today!
            <Link to="/classes" style={{ marginLeft: 'auto', fontSize: '.7rem', fontWeight: 700, color: isDark ? '#6ee7b7' : '#059669', textDecoration: 'none', padding: '4px 12px', borderRadius: 8, background: isDark ? 'rgba(16,185,129,.15)' : 'rgba(16,185,129,.1)' }}>View stats</Link>
          </div>
        )}

        {needsAttentionItems.length > 0 && (
          <>
            <SectionTitle tier="primary" isDark={isDark}>Needs Attention</SectionTitle>
            <NeedsAttentionSection items={needsAttentionItems} isDark={isDark} />
          </>
        )}

        <hr className="hp-divider" style={{ marginTop: 48 }} />
        <PlatformIntro isDark={isDark} />
        <hr className="hp-divider" />

        {FEATURE_SECTIONS.map((section, i) => (
          <FeatureSection key={section.id} section={section} index={i} isDark={isDark} />
        ))}

        <SectionTitle tier="secondary" isDark={isDark}>Academic Snapshot</SectionTitle>
        <div className="hp-stat-grid" style={{ marginBottom: 32 }}>
          <StatCard label="Attended Today" value={attendedCount} sublabel={totalClasses > 0 ? `${totalClasses - attendedCount} remaining` : 'No classes'} total={totalClasses || undefined} icon={FiCheckCircle} color="#10b981" accentBg="rgba(16,185,129,.1)" isDark={isDark} />
          <StatCard label="Classes Today" value={totalClasses} sublabel={nextMarkableClass ? `Next: ${nextMarkableClass.start_time?.slice(0, 5)}` : 'All done'} icon={FiBook} color="#6366f1" accentBg="rgba(99,102,241,.1)" isDark={isDark} />
          <StatCard label="Urgent Notices" value={urgentAnn} sublabel={(announcements || []).length > 0 ? `${(announcements || []).length} total` : undefined} icon={FiBell} color={urgentAnn > 0 ? '#f59e0b' : '#9ca3af'} accentBg={urgentAnn > 0 ? 'rgba(245,158,11,.1)' : 'rgba(0,0,0,.05)'} isDark={isDark} />
          <StatCard label="Opportunities" value={opportunities?.length} sublabel="Available now" icon={FiBriefcase} color="#8b5cf6" accentBg="rgba(139,92,246,.1)" isDark={isDark} />
        </div>

        <SectionTitle to="/classes" linkLabel="All classes" tier="secondary" isDark={isDark}>Your Day</SectionTitle>
        <div className="hp-two-col" style={{ marginBottom: 32 }}>
          <Card title="Today's Classes" dotColor="#4f46e5" to="/classes" linkLabel="All" elevated isDark={isDark}>
            {loadingCls
              ? <SkeletonLoader type="list" count={3} />
              : todayClasses?.length
                ? todayClasses.slice(0, 4).map((c, i) => (
                  <ClassRow key={c.id} c={c} highlight={c.can_mark && !c.is_marked && i === 0} isDark={isDark} />
                ))
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', color: isDark ? '#94a3b8' : '#9ca3af', gap: 10 }}>
                    <span style={{ fontSize: '1.6rem', opacity: .6 }}>🎉</span>
                    <span style={{ fontSize: '.78rem', fontWeight: 600, textAlign: 'center' }}>No classes today — explore opportunities!</span>
                    <Link to="/opportunities" style={{ fontSize: '.72rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, background: isDark ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.08)' }}>
                      Browse Opportunities
                    </Link>
                  </div>
                )}
          </Card>

          {location && nearbyClasses?.length > 0
            ? (
              <Card title="Nearby Classes" dotColor="#0ea5e9" to="/nearby-classes" linkLabel="All" isDark={isDark}>
                {nearbyClasses.map(cls => (
                  <div key={cls.entry_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,.04)'}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9', flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '.82rem', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1f2937', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.unit_name}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.63rem', color: isDark ? '#94a3b8' : '#9ca3af' }}><FiMapPin size={9} />{cls.distance_display}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.63rem', color: isDark ? '#94a3b8' : '#9ca3af' }}>🚶 {cls.walking_time_minutes} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            )
            : (
              <Card title="Campus Overview" dotColor="#8b5cf6" isDark={isDark}>
                {isLeader && governanceStats
                  ? [
                    { label: 'Active Roles', value: governanceStats.active_roles, desc: 'Leadership positions' },
                    { label: 'Students', value: governanceStats.students_count, desc: 'Total registered' },
                    { label: 'Reports', value: governanceStats.total_reports, desc: `${governanceStats.resolved_reports || 0} resolved` },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < 2 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,.04)'}` : 'none' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '.82rem', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1f2937', marginBottom: 2 }}>{s.label}</p>
                        <p style={{ fontSize: '.63rem', color: isDark ? '#e6ebf1' : '#e0e5ec' }}>{s.desc}</p>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.15rem', color: isDark ? '#f1f5f9' : '#1f2937' }}>{s.value}</span>
                    </div>
                  ))
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', color: isDark ? '#94a3b8' : '#9ca3af', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem', opacity: .5 }}>📍</span>
                      <span style={{ fontSize: '.78rem', fontWeight: 600, textAlign: 'center' }}>Enable location to see nearby classes</span>
                    </div>
                  )}
              </Card>
            )}
        </div>

        <SectionTitle tier="tertiary" isDark={isDark}>Campus Intelligence</SectionTitle>
        <div style={{ marginBottom: 32 }}>
          <CampusIntelligence weather={weather} isDark={isDark} />
        </div>

        <SectionTitle tier="tertiary" isDark={isDark}>Community</SectionTitle>
        <div className="hp-two-col" style={{ marginBottom: 36 }}>
          <Card title="Student Blog" dotColor="#6366f1" to="/blog" linkLabel="All" isDark={isDark} accent>
            {loadingBlog
              ? <SkeletonLoader type="list" count={3} />
              : blogPosts?.length
                ? blogPosts.slice(0, 4).map((post, i) => (
                  <Link key={post.id} to={`/blog/${post.slug}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < Math.min(blogPosts.length, 4) - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,.04)'}` : 'none', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '.82rem', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1f2937', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 3 }}>{post.title}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.62rem', color: isDark ? '#94a3b8' : '#9ca3af' }}><FiClock size={9} />{post.reading_time}m</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.62rem', color: isDark ? '#94a3b8' : '#9ca3af' }}><FiHeart size={9} />{post.likes_count || 0}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.62rem', color: isDark ? '#94a3b8' : '#9ca3af' }}><FiEye size={9} />{post.view_count || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))
                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: isDark ? '#94a3b8' : '#9ca3af', gap: 6 }}>
                  <span style={{ fontSize: '1.3rem', opacity: .5 }}>📝</span>
                  <span style={{ fontSize: '.78rem', fontWeight: 600 }}>No posts yet</span>
                </div>}
          </Card>

          <Card title="Recent Activity" dotColor="#9ca3af" isDark={isDark}>
            <ActivityFeed todayClasses={todayClasses} announcements={announcements} opportunities={opportunities} claimedItems={claimedItems} isDark={isDark} />
          </Card>
        </div>

        <SectionTitle tier="secondary" isDark={isDark}>Workspace</SectionTitle>
        <WorkspaceLauncher links={workspaceLinks} isDark={isDark} />
      </div>
    </>
  );
}