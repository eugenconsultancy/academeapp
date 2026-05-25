// HomePage.jsx — Campus OS redesign
// Calm, premium dashboard: reduced noise, clear Now/Next/Later hierarchy
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { classesApi } from '../api/classesApi';
import { blogApi } from '../api/blogApi';
import GeoService from '../api/geoService';
import apiClient from '../api/client';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  FiArrowRight, FiPackage, FiBell, FiBriefcase,
  FiBook, FiClock, FiMapPin, FiUser, FiZap,
  FiCheckCircle, FiAlertCircle,
  FiBookOpen, FiHeart, FiEye, FiCalendar,
  FiSun, FiActivity,
  FiNavigation, FiShield, FiBarChart2,
  FiRefreshCw, FiChevronRight, FiLoader,
  FiUsers, FiTrendingUp, FiInfo, FiCoffee,
} from 'react-icons/fi';

/* ─────────────────────────────────────────────
   CAMPUS TIPS (31 — one per day of month)
───────────────────────────────────────────── */
const CAMPUS_TIPS = [
  "The shortcut behind Lab 201 saves 5 minutes walking to Lecture Hall 3.",
  "Cafeteria is least crowded between 2:00–3:00 PM — skip the lunch rush.",
  "Printing is free in the Computer Lab before 9 AM. Get there early!",
  "You can renew library books online at library.ku.ac.ke — no queuing needed.",
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

/* ─────────────────────────────────────────────
   WEATHER HELPERS
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   WEATHER HOOK
───────────────────────────────────────────── */
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
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() }));
      } catch { /* ignore */ }
      return result;
    },
    enabled: !!lat && !!lon && !!API_KEY,
    staleTime: CACHE_TTL,
    retry: false,
  });
}

/* ─────────────────────────────────────────────
   CONTEXT GREETING
───────────────────────────────────────────── */
function getContextGreeting(todayClasses, hour, dayOfWeek) {
  const total = todayClasses?.length ?? 0;
  const marked = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const upcoming = todayClasses?.find(c => !c.is_marked && c.can_mark);
  const nextSoon = todayClasses?.find(c => !c.is_marked && !c.can_mark);

  if (total === 0) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'Weekend mode — enjoy your break!';
    return 'No classes today — perfect day to catch up.';
  }
  if (marked === total && total > 0) {
    return `All ${total} classes attended today. Well done!`;
  }
  if (upcoming) {
    return `Check-in window open for ${upcoming.unit_name}.`;
  }
  if (nextSoon) {
    return `Next: ${nextSoon.unit_name} at ${nextSoon.start_time?.slice(0, 5)}.`;
  }
  return `${marked} of ${total} classes attended today.`;
}

/* ─────────────────────────────────────────────
   ATTENDANCE CTA
───────────────────────────────────────────── */
function AttendanceCTA({ nextMarkableClass, location, onSuccess }) {
  const [checkinState, setCheckinState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(null);
  const [urgency, setUrgency] = useState('gray');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!nextMarkableClass?.mark_window_closes) return;
    const tick = () => {
      const ms = new Date(nextMarkableClass.mark_window_closes) - Date.now();
      if (ms <= 0) { setTimeLeft(null); return; }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setTimeLeft({ mins, secs, ms });
      if (ms < 5 * 60000) setUrgency('red');
      else if (ms < 15 * 60000) setUrgency('amber');
      else setUrgency('gray');
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

  const palette = {
    gray: { border: 'rgba(107,114,128,0.2)', text: '#6b7280', btnBg: '#6b7280' },
    amber: { border: 'rgba(245,158,11,0.35)', text: '#d97706', btnBg: '#f59e0b' },
    red: { border: 'rgba(239,68,68,0.35)', text: '#dc2626', btnBg: '#ef4444' },
  };
  const c = palette[urgency];

  return (
    <div className="hp-cta" style={{ borderColor: c.border }}>
      <div className="hp-cta-body">
        <div className="hp-cta-label" style={{ color: c.text }}>
          {urgency !== 'gray' && <span className="hp-cta-dot" style={{ background: c.text }} />}
          Check-in window open
        </div>
        <p className="hp-cta-class">{nextMarkableClass.unit_name}</p>
        {timeLeft && (
          <p className="hp-cta-timer" style={{ color: c.text }}>
            Closes in {timeLeft.mins}:{String(timeLeft.secs).padStart(2, '0')}
          </p>
        )}
      </div>
      <button
        className="hp-cta-btn"
        style={{ background: checkinState === 'success' ? '#10b981' : c.btnBg }}
        onClick={handleCheckIn}
        disabled={checkinState !== 'idle'}
      >
        {checkinState === 'loading' && <FiLoader size={14} className="hp-spin" />}
        {checkinState === 'success' && <><FiCheckCircle size={14} /> Checked in!</>}
        {checkinState === 'error' && <><FiAlertCircle size={14} /> Retry</>}
        {checkinState === 'idle' && <><FiMapPin size={14} /> Check In</>}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTION CENTER CARDS
───────────────────────────────────────────── */
function ActionCenter({ opportunities, claimedItems, expiringRoles, isLeader }) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const nextDeadline = (opportunities || [])
    .filter(o => o.expires_at && new Date(o.expires_at) - now > 0 && new Date(o.expires_at) - now <= sevenDays)
    .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))[0];

  const latestClaimed = (claimedItems || [])[0];

  const deadlineDiff = nextDeadline ? new Date(nextDeadline.expires_at) - now : null;
  const deadlineLabel = deadlineDiff
    ? (deadlineDiff < 86400000 ? `${Math.floor(deadlineDiff / 3600000)}h left` : `${Math.floor(deadlineDiff / 86400000)}d left`)
    : null;
  const deadlineUrgent = deadlineDiff && deadlineDiff < 86400000;

  const relTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const cards = [
    nextDeadline && {
      key: 'deadline',
      icon: '⚡',
      label: 'Upcoming Deadline',
      value: nextDeadline.title,
      meta: deadlineLabel,
      urgent: deadlineUrgent,
      to: `/opportunities/${nextDeadline.id}`,
    },
    latestClaimed && {
      key: 'claimed',
      icon: '🎉',
      label: 'Item Reclaimed',
      value: latestClaimed.item_name || 'Lost item',
      meta: relTime(latestClaimed.updated_at || latestClaimed.created_at),
      to: '/found-items',
    },
    isLeader && expiringRoles?.length > 0 && {
      key: 'governance',
      icon: '🛡️',
      label: 'Governance Alert',
      value: `${expiringRoles.length} role${expiringRoles.length > 1 ? 's' : ''} expiring`,
      meta: 'within 7 days',
      urgent: true,
      to: '/admin/roles',
    },
  ].filter(Boolean);

  if (!cards.length) return null;

  return (
    <div className="hp-action-center">
      {cards.map(card => (
        <Link key={card.key} to={card.to} className={`hp-action-card${card.urgent ? ' urgent' : ''}`}>
          <span className="hp-action-icon">{card.icon}</span>
          <div className="hp-action-body">
            <p className="hp-action-label">{card.label}</p>
            <p className="hp-action-value">{card.value}</p>
          </div>
          {card.meta && (
            <span className={`hp-action-badge${card.urgent ? ' urgent' : ''}`}>{card.meta}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BENTO STAT (simplified — 4 stats only)
───────────────────────────────────────────── */
function BentoStat({ label, value, total, icon: Icon, color, accentBg }) {
  const pct = total && value != null ? Math.min(100, Math.round((value / total) * 100)) : null;
  return (
    <div className="hp-bstat">
      <div className="hp-bstat-head">
        <div className="hp-bstat-icon" style={{ background: accentBg, color }}>
          <Icon size={15} />
        </div>
      </div>
      <div className="hp-bstat-val">{value ?? '–'}</div>
      <div className="hp-bstat-lbl">{label}</div>
      {pct !== null && (
        <>
          <div className="hp-bstat-track">
            <div className="hp-bstat-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="hp-bstat-pct">{pct}% attended</div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROW COMPONENTS
───────────────────────────────────────────── */
function ClassRow({ c, highlight }) {
  return (
    <div className={`hp-row${highlight ? ' hp-row-highlight' : ''}`}>
      <div className="hp-class-time">{c.start_time?.slice(0, 5)}</div>
      <div className="hp-row-body">
        <p className="hp-row-title">{c.unit_name}</p>
        <div className="hp-row-meta">
          {c.venue && <span><FiMapPin size={9} />{c.venue}</span>}
          {c.lecturer && <span><FiUser size={9} />{c.lecturer}</span>}
        </div>
      </div>
      <div className="hp-row-end">
        {c.is_marked
          ? <span className="hp-badge hp-badge-green"><FiCheckCircle size={10} />Done</span>
          : c.can_mark
            ? <span className="hp-badge hp-badge-amber">Mark</span>
            : <span className="hp-badge hp-badge-gray">Soon</span>}
      </div>
    </div>
  );
}

function NeedsAttentionRow({ item }) {
  /* item: { title, is_urgent, time, type, to } */
  return (
    <Link to={item.to || '#'} className="hp-na-row">
      <div className={`hp-na-dot${item.is_urgent ? ' urgent' : ''}`} />
      <div className="hp-row-body">
        {item.is_urgent && (
          <span className="hp-badge hp-badge-amber" style={{ marginBottom: 4, display: 'inline-flex' }}>
            <FiAlertCircle size={9} /> Urgent
          </span>
        )}
        <p className="hp-row-title">{item.title}</p>
        {item.time && <p className="hp-row-meta"><span><FiClock size={9} />{item.time}</span></p>}
      </div>
      <FiChevronRight size={14} className="hp-na-arrow" />
    </Link>
  );
}

function NearbyClassRow({ cls }) {
  return (
    <div className="hp-row">
      <div className="hp-row-dot" style={{ background: '#6366f1' }} />
      <div className="hp-row-body">
        <p className="hp-row-title">{cls.unit_name}</p>
        <div className="hp-row-meta">
          <span><FiMapPin size={9} />{cls.distance_display}</span>
          <span>🚶 {cls.walking_time_minutes} min</span>
        </div>
      </div>
    </div>
  );
}

function BlogRow({ post }) {
  return (
    <div className="hp-row">
      <div className="hp-row-dot" style={{ background: '#6366f1' }} />
      <div className="hp-row-body">
        <p className="hp-row-title" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.title}
        </p>
        <div className="hp-row-meta">
          <span><FiClock size={9} />{post.reading_time}m read</span>
          <span><FiHeart size={9} />{post.likes_count || 0}</span>
          <span><FiEye size={9} />{post.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
}

function GovernanceRow({ stat }) {
  return (
    <div className="hp-row">
      <div className="hp-row-dot" style={{ background: '#6366f1' }} />
      <div className="hp-row-body">
        <p className="hp-row-title">{stat.label}</p>
        <p className="hp-row-meta"><span>{stat.description}</span></p>
      </div>
      <div className="hp-row-end">
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1f2937' }}>{stat.value}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CAMPUS INTELLIGENCE CAROUSEL
───────────────────────────────────────────── */
function CampusIntelligence({ weather }) {
  const dayIdx = new Date().getDate() - 1;
  const [idx, setIdx] = useState(0);

  const slides = [
    {
      icon: '💡',
      label: 'Campus Tip',
      text: CAMPUS_TIPS[dayIdx % CAMPUS_TIPS.length],
    },
    weather && {
      icon: weather.icon,
      label: 'Weather Insight',
      text: weatherInsight(weather.desc) || `${weather.temp}°C, ${weather.desc}. Humidity ${weather.humidity}%, wind ${weather.wind} m/s.`,
    },
    {
      icon: '☕',
      label: 'Cafeteria',
      text: 'Least crowded between 2:00–3:00 PM. The main hall canteen opens early at 7 AM for breakfast.',
    },
    {
      icon: '🗺️',
      label: 'Campus Shortcut',
      text: CAMPUS_TIPS[(dayIdx + 3) % CAMPUS_TIPS.length],
    },
  ].filter(Boolean);

  const next = () => setIdx(i => (i + 1) % slides.length);
  const prev = () => setIdx(i => (i - 1 + slides.length) % slides.length);
  const slide = slides[idx];

  return (
    <div className="hp-intel-card">
      <div className="hp-intel-head">
        <span className="hp-intel-label">
          <FiInfo size={12} /> Campus Intelligence
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="hp-intel-nav" onClick={prev}>‹</button>
          <button className="hp-intel-nav" onClick={next}>›</button>
        </div>
      </div>
      <div className="hp-intel-body">
        <span className="hp-intel-icon">{slide.icon}</span>
        <div>
          <p className="hp-intel-type">{slide.label}</p>
          <p className="hp-intel-text">{slide.text}</p>
        </div>
      </div>
      <div className="hp-intel-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`hp-intel-dot${i === idx ? ' active' : ''}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTIVITY FEED (aggregated from existing data)
───────────────────────────────────────────── */
function ActivityFeed({ todayClasses, announcements, opportunities, claimedItems }) {
  const items = [];

  (todayClasses || []).filter(c => c.is_marked).forEach(c => {
    items.push({
      key: `cls-${c.id}`,
      icon: '✅',
      text: `Checked into ${c.unit_name}`,
      time: c.marked_at,
    });
  });

  (announcements || []).slice(0, 2).forEach(a => {
    items.push({
      key: `ann-${a.id}`,
      icon: a.is_urgent ? '🔴' : '📢',
      text: `${a.is_urgent ? 'Urgent: ' : ''}${a.title}`,
      time: a.created_at,
    });
  });

  (opportunities || []).slice(0, 2).forEach(o => {
    items.push({
      key: `opp-${o.id}`,
      icon: '💼',
      text: `New opportunity: ${o.title}`,
      time: o.created_at,
    });
  });

  (claimedItems || []).slice(0, 1).forEach(item => {
    items.push({
      key: `ci-${item.id}`,
      icon: '🎉',
      text: `${item.item_name || 'Item'} was reclaimed`,
      time: item.updated_at,
    });
  });

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

  items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  const feed = items.slice(0, 5);

  if (!feed.length) {
    return (
      <div className="hp-empty">
        <span className="hp-empty-icon">📭</span>
        <span className="hp-empty-text">No recent activity</span>
      </div>
    );
  }

  return (
    <div className="hp-feed">
      {feed.map(item => (
        <div key={item.key} className="hp-feed-item">
          <span className="hp-feed-icon">{item.icon}</span>
          <span className="hp-feed-text">{item.text}</span>
          <span className="hp-feed-time">{relTime(item.time)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SectionTitle({ children, to, linkLabel }) {
  return (
    <div className="hp-section-head">
      <h2 className="hp-section-title">{children}</h2>
      {to && (
        <Link to={to} className="hp-section-link">
          {linkLabel || 'View all'} <FiArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CARD WRAPPER
───────────────────────────────────────────── */
function HPCard({ title, dotColor, to, linkLabel, children }) {
  return (
    <div className="hp-card">
      <div className="hp-card-head">
        <p className="hp-card-title">
          {dotColor && <span className="hp-card-dot" style={{ background: dotColor }} />}
          {title}
        </p>
        {to && (
          <Link to={to} className="hp-card-link">
            {linkLabel || 'All'} <FiArrowRight size={11} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const [checkinDone, setCheckinDone] = useState(false);

  useEffect(() => { getLocation(); }, []);

  /* ── Keyboard shortcut for search ── */
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

  /* ── Data queries ── */
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
  const { data: expiringRoles } = useQuery({
    queryKey: ['expiring-roles-home'],
    queryFn: async () => { const r = await apiClient.get('/governance/roles/expiring/', { params: { days: 7 } }); return Array.isArray(r.data) ? r.data : []; },
    enabled: isLeader,
  });
  const { data: weather } = useWeather(location?.latitude, location?.longitude);

  /* ── Derived state ── */
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

  /* "Today Focus" summary line */
  const remaining = totalClasses - attendedCount;
  const urgentAnn = (announcements || []).filter(a => a.is_urgent).length;
  const todayFocusParts = [
    remaining > 0 && `${remaining} class${remaining > 1 ? 'es' : ''} remaining`,
    nextMarkableClass?.mark_window_closes && (() => {
      const ms = new Date(nextMarkableClass.mark_window_closes) - Date.now();
      if (ms > 0) return `Attendance closes in ${Math.floor(ms / 60000)}m`;
      return null;
    })(),
    urgentAnn > 0 && `${urgentAnn} urgent notice${urgentAnn > 1 ? 's' : ''}`,
  ].filter(Boolean);

  /* Needs Attention items */
  const needsAttentionItems = [
    ...(announcements || [])
      .filter(a => a.is_urgent)
      .map(a => ({ key: `ann-${a.id}`, title: a.title, is_urgent: true, to: '/announcements' })),
    ...(announcements || [])
      .filter(a => !a.is_urgent)
      .slice(0, 2)
      .map(a => ({ key: `ann2-${a.id}`, title: a.title, is_urgent: false, to: '/announcements' })),
    ...(opportunities || [])
      .filter(o => {
        if (!o.expires_at) return false;
        const diff = new Date(o.expires_at) - Date.now();
        return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 2)
      .map(o => {
        const diff = new Date(o.expires_at) - Date.now();
        const label = diff < 86400000 ? `${Math.floor(diff / 3600000)}h left` : `${Math.floor(diff / 86400000)}d left`;
        return { key: `opp-${o.id}`, title: o.title, time: label, is_urgent: diff < 86400000, to: `/opportunities/${o.id}` };
      }),
  ].slice(0, 5);

  /* Quick links — monochrome command grid */
  const workspaceLinks = [
    { to: '/classes', label: 'My Classes', icon: FiBook },
    { to: '/opportunities', label: 'Opportunities', icon: FiBriefcase },
    { to: '/announcements', label: 'Announcements', icon: FiBell },
    { to: '/found-items', label: 'Found Items', icon: FiPackage },
    { to: '/campus-map', label: 'Campus Map', icon: FiMapPin },
    { to: '/nearby-classes', label: 'Nearby', icon: FiNavigation },
    ...(isLeader ? [
      { to: '/governance', label: 'Governance', icon: FiShield },
      { to: '/admin', label: 'Admin', icon: FiBarChart2 },
    ] : []),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        /* ── Spin ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .hp-spin { animation: spin .8s linear infinite; }

        /* ── Page enter ── */
        @keyframes hpIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .hp-root {
          font-family: 'DM Sans', sans-serif;
          max-width: 1080px;
          margin: 0 auto;
          padding: 24px 20px 90px;
          animation: hpIn .45s cubic-bezier(.16,1,.3,1) both;
        }

        /* ══════════════════════════════════
           HERO — calm, dark, solid surface
        ══════════════════════════════════ */
        .hp-hero {
          border-radius: 20px;
          padding: 40px 40px 36px;
          background: #0F172A;
          background-image: radial-gradient(ellipse at 18% 35%, rgba(234,88,12,.14) 0%, transparent 52%),
                            radial-gradient(ellipse at 85% 70%, rgba(99,102,241,.09) 0%, transparent 45%);
          margin-bottom: 24px;
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .hp-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='rgba(255,255,255,0.02)' fill-rule='nonzero'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }
        .hp-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 99px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,.6);
          margin-bottom: 16px;
        }
        .hp-hero-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          letter-spacing: -.04em;
          line-height: 1.1;
          margin: 0 0 6px;
          color: #fff;
        }
        .hp-hero-name span { color: #fbbf24; }
        .hp-hero-sub {
          font-size: .88rem;
          color: rgba(255,255,255,.5);
          font-weight: 500;
          margin: 0 0 20px;
        }
        .hp-hero-focus {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .hp-hero-focus-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 8px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.1);
          font-size: .72rem;
          font-weight: 600;
          color: rgba(255,255,255,.75);
        }
        .hp-hero-focus-pill.amber { background: rgba(245,158,11,.15); border-color: rgba(245,158,11,.25); color: #fbbf24; }
        .hp-hero-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .hp-hero-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.1);
          font-size: .72rem;
          font-weight: 600;
          color: rgba(255,255,255,.7);
          backdrop-filter: blur(8px);
        }
        @media (max-width: 480px) {
          .hp-hero { padding: 28px 24px 24px; }
          .hp-hero-name { font-size: 1.8rem; }
        }

        /* ══════════════════════════════════
           ATTENDANCE CTA
        ══════════════════════════════════ */
        .hp-cta {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          background: rgba(255,255,255,1);
          border: 1.5px solid;
          margin-bottom: 16px;
          transition: box-shadow .2s;
        }
        .dark .hp-cta { background: rgba(15,23,42,.9); }
        .hp-cta:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
        .hp-cta-body { flex: 1; min-width: 0; }
        .hp-cta-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: .68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 4px;
        }
        .hp-cta-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          animation: ctaDot 1.4s ease-in-out infinite;
        }
        @keyframes ctaDot {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.5;transform:scale(.7)}
        }
        .hp-cta-class {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: .95rem;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: -.015em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .hp-cta-class { color: #f3f4f6; }
        .hp-cta-timer { font-size: .72rem; font-weight: 700; margin-top: 2px; }
        .hp-cta-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: .82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: transform .18s, filter .18s;
        }
        .hp-cta-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
        .hp-cta-btn:disabled { opacity: .7; cursor: default; }

        /* ── All-marked banner ── */
        .hp-cta-done {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 14px;
          background: rgba(16,185,129,.07);
          border: 1px solid rgba(16,185,129,.2);
          margin-bottom: 16px;
          font-size: .82rem;
          font-weight: 600;
          color: #059669;
        }
        .hp-cta-done a {
          margin-left: auto;
          font-size: .72rem;
          font-weight: 700;
          color: #059669;
          text-decoration: none;
          padding: 3px 10px;
          border-radius: 7px;
          background: rgba(16,185,129,.12);
        }

        /* ══════════════════════════════════
           ACTION CENTER
        ══════════════════════════════════ */
        .hp-action-center {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px;
          margin-bottom: 28px;
        }
        .hp-action-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 13px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.07);
          text-decoration: none;
          color: inherit;
          transition: transform .18s, box-shadow .18s;
          min-height: 66px;
        }
        .dark .hp-action-card { background: rgba(15,23,42,.8); border-color: rgba(255,255,255,.07); }
        .hp-action-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }
        .hp-action-card.urgent { border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.04); }
        .hp-action-icon { font-size: 1.2rem; flex-shrink: 0; }
        .hp-action-body { flex: 1; min-width: 0; }
        .hp-action-label { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #9ca3af; margin-bottom: 2px; }
        .hp-action-value { font-size: .82rem; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dark .hp-action-value { color: #f3f4f6; }
        .hp-action-badge {
          font-size: .65rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 99px;
          background: rgba(107,114,128,.08);
          color: #6b7280;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .hp-action-badge.urgent { background: rgba(245,158,11,.12); color: #d97706; }

        /* ══════════════════════════════════
           SECTION HEADERS
        ══════════════════════════════════ */
        .hp-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 32px 0 14px;
        }
        .hp-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -.025em;
          color: #111827;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dark .hp-section-title { color: #f9fafb; }
        .hp-section-title::before {
          content: '';
          width: 3px;
          height: 16px;
          border-radius: 99px;
          background: #f59e0b;
        }
        .hp-section-link {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: .72rem;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
          padding: 4px 10px;
          border-radius: 8px;
          transition: color .15s, background .15s;
        }
        .hp-section-link:hover { color: #f59e0b; background: rgba(245,158,11,.07); }

        /* ══════════════════════════════════
           BENTO — 4 stats
        ══════════════════════════════════ */
        .hp-bento {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 8px;
        }
        @media (max-width: 768px) { .hp-bento { grid-template-columns: repeat(2, 1fr); } }
        .hp-bstat {
          border-radius: 16px;
          padding: 18px 16px 14px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
          transition: transform .2s, box-shadow .2s;
        }
        .hp-bstat:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,.08); }
        .dark .hp-bstat { background: rgba(15,23,42,.8); border-color: rgba(255,255,255,.06); }
        .hp-bstat-head { margin-bottom: 12px; }
        .hp-bstat-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .hp-bstat-val {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #111827;
          letter-spacing: -.04em;
          line-height: 1;
        }
        .dark .hp-bstat-val { color: #f9fafb; }
        .hp-bstat-lbl { font-size: .62rem; color: #9ca3af; text-transform: uppercase; letter-spacing: .07em; font-weight: 700; margin-top: 5px; }
        .hp-bstat-track { height: 3px; border-radius: 99px; background: rgba(0,0,0,.06); margin-top: 12px; overflow: hidden; }
        .dark .hp-bstat-track { background: rgba(255,255,255,.07); }
        .hp-bstat-fill { height: 100%; border-radius: 99px; transition: width .8s cubic-bezier(.4,0,.2,1); }
        .hp-bstat-pct { font-size: .62rem; color: #9ca3af; font-weight: 600; margin-top: 4px; }

        /* ══════════════════════════════════
           CARDS
        ══════════════════════════════════ */
        .hp-card {
          background: #fff;
          border: 1px solid rgba(0,0,0,.06);
          border-radius: 16px;
          padding: 18px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }
        .dark .hp-card { background: rgba(15,23,42,.8); border-color: rgba(255,255,255,.06); }
        .hp-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .hp-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: .88rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -.02em;
        }
        .dark .hp-card-title { color: #f9fafb; }
        .hp-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .hp-card-link {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: .7rem;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
          padding: 3px 9px;
          border-radius: 7px;
          background: rgba(0,0,0,.04);
          transition: color .15s, background .15s;
        }
        .hp-card-link:hover { color: #f59e0b; background: rgba(245,158,11,.09); }

        /* ── 2-col grid ── */
        .hp-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 0;
        }
        @media (max-width: 640px) { .hp-two-col { grid-template-columns: 1fr; } }

        /* ── 3-col grid ── */
        .hp-three-col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 860px) { .hp-three-col { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .hp-three-col { grid-template-columns: 1fr; } }

        /* ══════════════════════════════════
           ROW COMPONENTS
        ══════════════════════════════════ */
        .hp-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 9px 0;
        }
        .hp-row + .hp-row { border-top: 1px solid rgba(0,0,0,.04); }
        .dark .hp-row + .hp-row { border-top-color: rgba(255,255,255,.04); }
        .hp-row-highlight { background: rgba(99,102,241,.04); border-radius: 10px; padding: 9px 10px; margin: 0 -10px; }
        .hp-class-time {
          font-size: .6rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 8px;
          background: rgba(99,102,241,.1);
          color: #6366f1;
          white-space: nowrap;
          flex-shrink: 0;
          letter-spacing: .02em;
          margin-top: 2px;
        }
        .hp-row-dot { width: 7px; height: 7px; border-radius: 50%; background: #6366f1; flex-shrink: 0; margin-top: 5px; }
        .hp-row-body { flex: 1; min-width: 0; overflow: hidden; }
        .hp-row-title { font-size: .82rem; font-weight: 700; color: #1f2937; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
        .dark .hp-row-title { color: #f3f4f6; }
        .hp-row-meta { display: flex; gap: 9px; flex-wrap: wrap; font-size: .66rem; color: #9ca3af; }
        .hp-row-meta span { display: flex; align-items: center; gap: 3px; }
        .hp-row-end { flex-shrink: 0; }

        /* ── Needs Attention rows ── */
        .hp-na-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 0;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: background .15s;
          border-radius: 8px;
          margin: 0 -6px;
          padding-left: 6px;
          padding-right: 6px;
        }
        .hp-na-row + .hp-na-row { border-top: 1px solid rgba(0,0,0,.04); }
        .dark .hp-na-row + .hp-na-row { border-top-color: rgba(255,255,255,.04); }
        .hp-na-row:hover { background: rgba(0,0,0,.025); }
        .dark .hp-na-row:hover { background: rgba(255,255,255,.03); }
        .hp-na-dot { width: 7px; height: 7px; border-radius: 50%; background: #6366f1; flex-shrink: 0; margin-top: 5px; }
        .hp-na-dot.urgent { background: #f59e0b; box-shadow: 0 0 5px rgba(245,158,11,.4); }
        .hp-na-arrow { flex-shrink: 0; color: #d1d5db; margin-top: 3px; }

        /* ── Badges ── */
        .hp-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: .61rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          white-space: nowrap;
        }
        .hp-badge-green { background: rgba(16,185,129,.1); color: #059669; }
        .hp-badge-amber { background: rgba(245,158,11,.1); color: #d97706; }
        .hp-badge-gray  { background: rgba(107,114,128,.07); color: #6b7280; }
        .hp-badge-red   { background: rgba(239,68,68,.08); color: #dc2626; }

        /* ── Empty state ── */
        .hp-empty { display: flex; flex-direction: column; align-items: center; padding: 28px 16px; text-align: center; color: #9ca3af; }
        .hp-empty-icon { font-size: 1.6rem; margin-bottom: 8px; opacity: .6; }
        .hp-empty-text { font-size: .78rem; font-weight: 600; }

        /* ══════════════════════════════════
           CAMPUS INTELLIGENCE
        ══════════════════════════════════ */
        .hp-intel-card {
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.06);
          border-left: 3px solid #6366f1;
          padding: 16px 18px;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }
        .dark .hp-intel-card { background: rgba(15,23,42,.8); border-color: rgba(255,255,255,.06); border-left-color: #6366f1; }
        .hp-intel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .hp-intel-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: .68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #6366f1;
        }
        .hp-intel-nav {
          width: 26px; height: 26px;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 7px;
          background: transparent;
          cursor: pointer;
          font-size: .9rem;
          color: #6b7280;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s;
        }
        .hp-intel-nav:hover { background: rgba(99,102,241,.08); color: #6366f1; }
        .hp-intel-body {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .hp-intel-icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }
        .hp-intel-type { font-size: .68rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
        .hp-intel-text { font-size: .82rem; font-weight: 500; color: #374151; line-height: 1.55; }
        .dark .hp-intel-text { color: #d1d5db; }
        .hp-intel-dots { display: flex; gap: 5px; margin-top: 14px; align-items: center; }
        .hp-intel-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(0,0,0,.12);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: background .2s, transform .2s;
        }
        .dark .hp-intel-dot { background: rgba(255,255,255,.15); }
        .hp-intel-dot.active { background: #6366f1; transform: scale(1.4); }

        /* ══════════════════════════════════
           ACTIVITY FEED
        ══════════════════════════════════ */
        .hp-feed { display: flex; flex-direction: column; gap: 0; }
        .hp-feed-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          font-size: .78rem;
        }
        .hp-feed-item + .hp-feed-item { border-top: 1px solid rgba(0,0,0,.04); }
        .dark .hp-feed-item + .hp-feed-item { border-top-color: rgba(255,255,255,.04); }
        .hp-feed-icon { font-size: .9rem; flex-shrink: 0; }
        .hp-feed-text { flex: 1; color: #374151; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dark .hp-feed-text { color: #d1d5db; }
        .hp-feed-time { flex-shrink: 0; font-size: .65rem; color: #9ca3af; font-weight: 600; }

        /* ══════════════════════════════════
           WORKSPACE — monochrome command grid
        ══════════════════════════════════ */
        .hp-workspace {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }
        @media (max-width: 860px) { .hp-workspace { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 480px) { .hp-workspace { grid-template-columns: repeat(2, 1fr); } }
        .hp-ws-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 10px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,.08);
          background: #fff;
          text-decoration: none;
          color: #374151;
          font-size: .72rem;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          transition: background .15s, border-color .15s, transform .2s, color .15s;
          text-align: center;
          cursor: pointer;
        }
        .dark .hp-ws-btn {
          background: rgba(15,23,42,.8);
          border-color: rgba(255,255,255,.07);
          color: #d1d5db;
        }
        .hp-ws-btn:hover {
          background: rgba(99,102,241,.06);
          border-color: rgba(99,102,241,.25);
          color: #6366f1;
          transform: translateY(-2px);
        }
        .dark .hp-ws-btn:hover { color: #a5b4fc; }
        .hp-ws-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .dark .hp-ws-icon { background: rgba(255,255,255,.06); }
        .hp-ws-btn:hover .hp-ws-icon { background: rgba(99,102,241,.1); }

        /* Dark mode base */
        .dark .hp-row-title { color: #f3f4f6; }
        .dark .hp-card-link { background: rgba(255,255,255,.05); color: #9ca3af; }
      `}</style>

      <div className="hp-root">

        {/* ══ HERO ══ */}
        <div className="hp-hero">
          <div className="hp-hero-tag">
            <FiZap size={10} /> {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <h1 className="hp-hero-name">{greeting}, <span>{firstName}</span>.</h1>
          <p className="hp-hero-sub">{contextSub}</p>

          {/* Today Focus pills */}
          {todayFocusParts.length > 0 && (
            <div className="hp-hero-focus">
              {todayFocusParts.map((part, i) => (
                <span
                  key={i}
                  className={`hp-hero-focus-pill${i === 1 && nextMarkableClass ? ' amber' : ''}`}
                >
                  {part}
                </span>
              ))}
            </div>
          )}

          <div className="hp-hero-meta">
            <div className="hp-hero-pill"><FiCalendar size={11} /> {dateStr}</div>
            {weather && (
              <div className="hp-hero-pill">
                {weather.icon} {weather.temp}°C · {weather.desc}
              </div>
            )}
          </div>
        </div>

        {/* ══ ATTENDANCE CTA ══ */}
        {!loadingCls && !checkinDone && nextMarkableClass && (
          <AttendanceCTA
            nextMarkableClass={nextMarkableClass}
            location={location}
            onSuccess={() => setCheckinDone(true)}
          />
        )}
        {!loadingCls && allMarked && (
          <div className="hp-cta-done">
            <FiCheckCircle size={16} style={{ flexShrink: 0 }} />
            All {totalClasses} class{totalClasses > 1 ? 'es' : ''} attended today. 🎉
            <Link to="/classes">View stats</Link>
          </div>
        )}

        {/* ══ ACTION CENTER ══ */}
        <ActionCenter
          opportunities={opportunities}
          claimedItems={claimedItems}
          expiringRoles={expiringRoles}
          isLeader={isLeader}
        />

        {/* ══ ACADEMIC SNAPSHOT ══ */}
        <SectionTitle>Academic Snapshot</SectionTitle>
        <div className="hp-bento" style={{ marginBottom: 32 }}>
          <BentoStat
            label="Attended Today"
            value={attendedCount}
            total={totalClasses || undefined}
            icon={FiCheckCircle}
            color="#10b981"
            accentBg="rgba(16,185,129,.12)"
          />
          <BentoStat
            label="Classes"
            value={totalClasses}
            icon={FiBook}
            color="#6366f1"
            accentBg="rgba(99,102,241,.12)"
          />
          <BentoStat
            label="Urgent Notices"
            value={(announcements || []).filter(a => a.is_urgent).length}
            icon={FiBell}
            color="#f59e0b"
            accentBg="rgba(245,158,11,.12)"
          />
          <BentoStat
            label="Opportunities"
            value={opportunities?.length}
            icon={FiBriefcase}
            color="#6366f1"
            accentBg="rgba(99,102,241,.12)"
          />
        </div>

        {/* ══ YOUR DAY ══ */}
        <SectionTitle to="/classes" linkLabel="All classes">Your Day</SectionTitle>
        <div className="hp-two-col" style={{ marginBottom: 32 }}>
          <HPCard title="Today's Classes" dotColor="#6366f1" to="/classes" linkLabel="All">
            {loadingCls
              ? <SkeletonLoader type="list" count={3} />
              : todayClasses?.length
                ? todayClasses.slice(0, 4).map((c, i) => (
                  <ClassRow key={c.id} c={c} highlight={c.can_mark && !c.is_marked && i === 0} />
                ))
                : <div className="hp-empty">
                  <span className="hp-empty-icon">🎉</span>
                  <span className="hp-empty-text">No classes today — explore opportunities!</span>
                </div>}
          </HPCard>

          {location && nearbyClasses?.length > 0
            ? (
              <HPCard title="Nearby Classes" dotColor="#6366f1" to="/nearby-classes" linkLabel="All">
                {nearbyClasses.map(cls => <NearbyClassRow key={cls.entry_id} cls={cls} />)}
              </HPCard>
            )
            : (
              <HPCard title="Campus Overview" dotColor="#6366f1">
                {isLeader && governanceStats
                  ? <>
                    <GovernanceRow stat={{ label: 'Active Roles', value: governanceStats.active_roles, description: 'Current leadership positions' }} />
                    <GovernanceRow stat={{ label: 'Students', value: governanceStats.students_count, description: 'Total registered' }} />
                    <GovernanceRow stat={{ label: 'Reports', value: governanceStats.total_reports, description: `${governanceStats.resolved_reports || 0} resolved` }} />
                  </>
                  : <div className="hp-empty">
                    <span className="hp-empty-icon">📍</span>
                    <span className="hp-empty-text">Enable location to see nearby classes</span>
                  </div>}
              </HPCard>
            )}
        </div>

        {/* ══ NEEDS ATTENTION ══ */}
        {needsAttentionItems.length > 0 && (
          <>
            <SectionTitle to="/announcements" linkLabel="All notices">Needs Attention</SectionTitle>
            <HPCard title="Announcements & Deadlines" dotColor="#f59e0b" style={{ marginBottom: 32 }}>
              {needsAttentionItems.map(item => (
                <NeedsAttentionRow key={item.key} item={item} />
              ))}
            </HPCard>
          </>
        )}

        {/* ══ CAMPUS INTELLIGENCE ══ */}
        <SectionTitle>Campus Intelligence</SectionTitle>
        <div style={{ marginBottom: 32 }}>
          <CampusIntelligence weather={weather} />
        </div>

        {/* ══ COMMUNITY ══ */}
        <SectionTitle>Community</SectionTitle>
        <div className="hp-two-col" style={{ marginBottom: 32 }}>
          <HPCard title="Student Blog" dotColor="#6366f1" to="/blog" linkLabel="All posts">
            {loadingBlog
              ? <SkeletonLoader type="list" count={3} />
              : blogPosts?.length
                ? blogPosts.slice(0, 4).map(post => (
                  <Link key={post.id} to={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <BlogRow post={post} />
                  </Link>
                ))
                : <div className="hp-empty"><span className="hp-empty-icon">📝</span><span className="hp-empty-text">No posts yet</span></div>}
          </HPCard>

          <HPCard title="Recent Activity" dotColor="#6366f1">
            <ActivityFeed
              todayClasses={todayClasses}
              announcements={announcements}
              opportunities={opportunities}
              claimedItems={claimedItems}
            />
          </HPCard>
        </div>

        {/* ══ WORKSPACE ══ */}
        <SectionTitle>Workspace</SectionTitle>
        <div className="hp-workspace">
          {workspaceLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="hp-ws-btn">
              <div className="hp-ws-icon"><Icon size={17} /></div>
              {label}
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}