import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { classesApi } from '../api/classesApi';
import { blogApi } from '../api/blogApi';
import GeoService from '../api/geoService';
import apiClient from '../api/client';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  FiArrowRight, FiPackage, FiBell, FiBriefcase,
  FiBook, FiClock, FiMapPin, FiUser, FiZap,
  FiTrendingUp, FiCheckCircle, FiAlertCircle,
  FiBookOpen, FiHeart, FiEye, FiCalendar,
  FiSearch, FiSun, FiMoon, FiX, FiActivity,
  FiNavigation, FiShield, FiBarChart2, FiUsers,
  FiRefreshCw, FiSend, FiThumbsUp, FiCloud,
  FiDroplet, FiWind, FiChevronRight, FiLoader,
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
   WEATHER ICONS helper
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

function weatherSuffix(desc) {
  if (!desc) return '';
  const d = desc.toLowerCase();
  if (d.includes('rain')) return ' — grab an umbrella!';
  if (d.includes('storm') || d.includes('thunder')) return ' — stay safe indoors!';
  if (d.includes('snow')) return ' — bundle up!';
  if (d.includes('fog') || d.includes('mist')) return ' — drive carefully.';
  if (d.includes('clear') || d.includes('sun')) return ' — enjoy the sunshine!';
  return '';
}

/* ─────────────────────────────────────────────
   TopBar
───────────────────────────────────────────── */
function TopBar({ user, announcements, isDark, onThemeToggle }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const urgentCount = announcements?.filter(a => a.is_urgent)?.length ?? 0;
  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';

  return (
    <div className={`hp-topbar${searchOpen ? ' hp-topbar-search' : ''}`}>
      <div className="hp-topbar-left">
        <span className="hp-topbar-brand">
          <FiActivity size={15} style={{ color: '#ea580c' }} />
          Academe
        </span>
        <span className="hp-topbar-sep">/</span>
        <span className="hp-topbar-page">Dashboard</span>
      </div>
      <div className={`hp-search-wrap${searchOpen ? ' open' : ''}`}>
        {searchOpen ? (
          <>
            <FiSearch size={13} className="hp-search-icon" />
            <input className="hp-search-input" autoFocus placeholder="Search announcements, classes, blog…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
            <button className="hp-search-x" onClick={() => { setSearchOpen(false); setSearchVal(''); }}><FiX size={13} /></button>
          </>
        ) : (
          <button className="hp-search-pill" onClick={() => setSearchOpen(true)}>
            <FiSearch size={13} /><span>Search…</span><kbd>⌘K</kbd>
          </button>
        )}
      </div>
      <div className="hp-topbar-right">
        <Link to="/nearby-classes" className="hp-tb-btn" title="Nearby Classes"><FiNavigation size={16} /></Link>
        <button className="hp-tb-btn hp-tb-bell" title="Notifications">
          <FiBell size={16} />
          {urgentCount > 0 && <span className="hp-notif-dot">{urgentCount}</span>}
        </button>
        <button className="hp-tb-btn" onClick={onThemeToggle} title="Toggle theme">
          {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
        </button>
        <Link to="/profile" className="hp-tb-avatar" title={user?.full_name}>{initials}</Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BentoStat
───────────────────────────────────────────── */
function BentoStat({ label, value, total, icon: Icon, color, span = 1, trend }) {
  const pct = total && value != null ? Math.min(100, Math.round((value / total) * 100)) : null;
  return (
    <div className="hp-bstat" style={{ '--c': color, gridColumn: `span ${span}` }}>
      <div className="hp-bstat-top">
        <div className="hp-bstat-icon-wrap"><Icon size={15} style={{ color }} /></div>
        {trend != null && (
          <span className="hp-bstat-trend" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
            <FiTrendingUp size={9} />{trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="hp-bstat-val">{value ?? '–'}</div>
      <div className="hp-bstat-lbl">{label}</div>
      {pct !== null && (
        <div className="hp-bstat-track">
          <div className="hp-bstat-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
        </div>
      )}
      {pct !== null && <div className="hp-bstat-pct">{pct}% attended</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Row components
───────────────────────────────────────────── */
function ClassRow({ c }) {
  return (
    <div className="hp-row hp-class-row">
      <div className="hp-class-pill" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>{c.start_time?.slice(0, 5)}</div>
      <div className="hp-row-body">
        <p className="hp-row-title">{c.unit_name}</p>
        <div className="hp-row-meta">
          {c.venue && <span><FiMapPin size={9} />{c.venue}</span>}
          {c.lecturer && <span><FiUser size={9} />{c.lecturer}</span>}
        </div>
      </div>
      <div className="hp-row-end">
        {c.is_marked ? <span className="hp-badge hp-badge-green"><FiCheckCircle size={10} />Done</span>
          : c.can_mark ? <span className="hp-badge hp-badge-amber">Mark</span>
            : <span className="hp-badge hp-badge-gray">Soon</span>}
      </div>
    </div>
  );
}

function AnnouncementRow({ a }) {
  return (
    <div className="hp-row">
      <div className={`hp-row-dot${a.is_urgent ? ' urgent' : ''}`} />
      <div className="hp-row-body">
        {a.is_urgent && <span className="hp-badge hp-badge-red" style={{ marginBottom: 4 }}><FiAlertCircle size={9} />Urgent</span>}
        <p className="hp-row-title">{a.title}</p>
        <p className="hp-row-preview">{a.content?.substring(0, 72)}{a.content?.length > 72 ? '…' : ''}</p>
      </div>
    </div>
  );
}

function BlogRow({ post }) {
  return (
    <div className="hp-row hp-blog-row">
      <div className="hp-row-dot" style={{ background: '#ec4899', boxShadow: '0 0 5px rgba(236,72,153,.35)', flexShrink: 0, marginTop: 5 }} />
      <div className="hp-row-body" style={{ minWidth: 0, overflow: 'hidden' }}>
        <p className="hp-row-title hp-blog-title">{post.title}</p>
        <div className="hp-row-meta">
          <span><FiClock size={9} />{post.reading_time}m</span>
          <span><FiHeart size={9} />{post.likes_count || 0}</span>
          <span><FiEye size={9} />{post.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
}

function NearbyClassRow({ cls }) {
  return (
    <div className="hp-row">
      <div className="hp-row-dot" style={{ background: '#06b6d4', boxShadow: '0 0 5px rgba(6,182,212,.35)', flexShrink: 0, marginTop: 5 }} />
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

function GovernanceRow({ stat }) {
  return (
    <div className="hp-row">
      <div className="hp-row-dot" style={{ background: '#8b5cf6', boxShadow: '0 0 5px rgba(139,92,246,.35)', flexShrink: 0, marginTop: 5 }} />
      <div className="hp-row-body">
        <p className="hp-row-title">{stat.label}</p>
        <p className="hp-row-preview">{stat.description}</p>
      </div>
      <div className="hp-row-end">
        <span className="hp-bstat-val" style={{ fontSize: '1.1rem' }}>{stat.value}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE 1 — Attendance Check-in CTA
───────────────────────────────────────────── */
function AttendanceCTA({ nextMarkableClass, location, onSuccess }) {
  const [checkinState, setCheckinState] = useState('idle'); // idle | loading | success | error
  const [timeLeft, setTimeLeft] = useState(null);
  const [urgency, setUrgency] = useState('gray'); // gray | amber | red
  const queryClient = useQueryClient();

  // Compute time left until window closes
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
        // GPS check-in
        await apiClient.post('/geo/check-in/', {
          class_id: nextMarkableClass.id,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      } else {
        // Basic attendance fallback
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

  const urgencyColors = {
    gray: { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)', text: '#6b7280', btn: 'linear-gradient(135deg,#6b7280,#4b5563)' },
    amber: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#d97706', btn: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)', text: '#dc2626', btn: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  };
  const colors = urgencyColors[urgency];

  return (
    <div className="hp-cta-checkin" style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="hp-cta-left">
        <div className="hp-cta-label" style={{ color: colors.text }}>
          <span className={`hp-cta-pulse${urgency !== 'gray' ? ` hp-cta-pulse-${urgency}` : ''}`} />
          Check-in window open
        </div>
        <p className="hp-cta-class">{nextMarkableClass.unit_name}</p>
        {timeLeft && (
          <p className="hp-cta-countdown" style={{ color: colors.text }}>
            Closes in {timeLeft.mins}:{String(timeLeft.secs).padStart(2, '0')} mins
          </p>
        )}
      </div>
      <button
        className={`hp-cta-btn${checkinState === 'success' ? ' hp-cta-btn-success' : ''}`}
        style={{ background: checkinState === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' : colors.btn }}
        onClick={handleCheckIn}
        disabled={checkinState !== 'idle'}
      >
        {checkinState === 'loading' && <FiLoader size={14} className="hp-spin" />}
        {checkinState === 'success' && <><FiCheckCircle size={14} /> You're all set!</>}
        {checkinState === 'error' && <><FiAlertCircle size={14} /> Retry</>}
        {checkinState === 'idle' && <><FiMapPin size={14} /> Check In</>}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE 2 — Event Countdown Strip
───────────────────────────────────────────── */
function EventCountdownStrip({ opportunities }) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const upcoming = (opportunities || []).filter(o => {
    if (!o.expires_at) return false;
    const diff = new Date(o.expires_at) - now;
    return diff > 0 && diff <= sevenDays;
  }).sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at));

  if (!upcoming.length) return null;

  const getLabel = (expires_at) => {
    const diff = new Date(expires_at) - now;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return { label: `${hours}h left`, urgent: true };
    if (days === 1) return { label: 'Closes tomorrow', urgent: false };
    return { label: `${days} days left`, urgent: false };
  };

  const catIcon = (cat) => {
    const m = { internship: '💼', scholarship: '🎓', workshop: '🛠️', competition: '🏆', event: '📅', job: '💡' };
    return m[(cat || '').toLowerCase()] || '📌';
  };

  return (
    <div className="hp-strip">
      <div className="hp-strip-label">⚡ Upcoming Deadlines</div>
      <div className="hp-strip-scroll">
        {upcoming.map(o => {
          const { label, urgent } = getLabel(o.expires_at);
          return (
            <Link key={o.id} to={`/opportunities/${o.id}`} className="hp-strip-item">
              <span className="hp-strip-icon">{catIcon(o.category)}</span>
              <span className="hp-strip-title">{o.title}</span>
              <span className={`hp-strip-badge${urgent ? ' urgent' : ''}`}>
                {urgent && <span className="hp-strip-pulse" />}
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE 3 — Daily Campus Tip
───────────────────────────────────────────── */
function DailyTip() {
  const dayIdx = new Date().getDate() - 1; // 0-based
  const [tipIdx, setTipIdx] = useState(dayIdx);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('tip_dismissed_date') === new Date().toDateString(); } catch { return false; }
  });
  const [voted, setVoted] = useState(false);

  const rotateTip = () => setTipIdx(i => (i + 1) % CAMPUS_TIPS.length);

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    // Future: POST to backend
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('tip_dismissed_date', new Date().toDateString()); } catch { }
  };

  if (dismissed) return null;

  return (
    <div className="hp-tip-card">
      <div className="hp-tip-header">
        <span className="hp-tip-badge">💡 Campus Tip of the Day</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="hp-tip-btn" onClick={rotateTip} title="See another tip">
            <FiRefreshCw size={13} />
          </button>
          <button className="hp-tip-btn" onClick={handleDismiss} title="Dismiss">
            <FiX size={13} />
          </button>
        </div>
      </div>
      <p className="hp-tip-text">{CAMPUS_TIPS[tipIdx % CAMPUS_TIPS.length]}</p>
      <div className="hp-tip-footer">
        <button
          className={`hp-tip-vote${voted ? ' voted' : ''}`}
          onClick={handleVote}
        >
          <FiThumbsUp size={12} /> {voted ? 'Thanks!' : 'Helpful'}
        </button>
        <span className="hp-tip-day">Tip {(tipIdx % CAMPUS_TIPS.length) + 1} of 31</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE 4 — Recently Claimed Items Ticker
───────────────────────────────────────────── */
function ClaimedItemsTicker({ claimedItems }) {
  const [idx, setIdx] = useState(0);
  const items = (claimedItems || []).slice(0, 3);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;

  const relTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'yesterday';
    return `${d} days ago`;
  };

  const item = items[idx];
  return (
    <Link to="/found-items" className="hp-claimed-ticker">
      <span className="hp-claimed-icon">🎉</span>
      <span className="hp-claimed-text">
        <strong>Someone reclaimed their {item.item_name || 'item'}!</strong>
        &nbsp;·&nbsp;
        <span className="hp-claimed-time">Reclaimed {relTime(item.updated_at || item.created_at)}</span>
      </span>
      <span className="hp-claimed-dots">
        {items.map((_, i) => (
          <span key={i} className={`hp-claimed-dot${i === idx ? ' active' : ''}`} />
        ))}
      </span>
      <FiChevronRight size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
    </Link>
  );
}

/* ─────────────────────────────────────────────
   FEATURE 6 — Weather Widget (pill)
───────────────────────────────────────────── */
function useWeather(lat, lon) {
  const CACHE_KEY = 'weather_cache';
  const CACHE_TTL = 30 * 60 * 1000;
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE';

  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      if (!lat || !lon) return null;
      // Check cache
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL) return data;
        }
      } catch { }
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      if (!res.ok) throw new Error('weather fetch failed');
      const data = await res.json();
      const result = {
        temp: Math.round(data.main.temp),
        desc: data.weather[0]?.description || '',
        code: data.weather[0]?.id,
        icon: weatherIcon(data.weather[0]?.id),
      };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch { }
      return result;
    },
    enabled: !!lat && !!lon,
    staleTime: CACHE_TTL,
    retry: false,
  });
}

/* ─────────────────────────────────────────────
   FEATURE 5 — Context-aware greeting sub-text
───────────────────────────────────────────── */
function getContextGreeting(todayClasses, hour, dayOfWeek) {
  const total = todayClasses?.length ?? 0;
  const marked = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const upcoming = todayClasses?.find(c => !c.is_marked && c.can_mark);
  const nextSoon = todayClasses?.find(c => !c.is_marked && !c.can_mark);

  if (total === 0) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return "Weekend mode — enjoy your break! 🏖️";
    return "No classes today — perfect day to catch up!";
  }
  if (marked === total && total > 0) {
    if (dayOfWeek === 5 && hour >= 14) return "Weekend starts now! Enjoy it 🎉";
    return `All done for today! You attended ${total} class${total > 1 ? 'es' : ''} 🎉`;
  }
  if (upcoming) {
    return `Check-in open for ${upcoming.unit_name} · ${upcoming.venue || 'check venue'}`;
  }
  if (nextSoon) {
    return `Next: ${nextSoon.unit_name} at ${nextSoon.start_time?.slice(0, 5)} · ${nextSoon.venue || ''}`;
  }
  if (dayOfWeek === 1 && hour < 11) {
    return `New week, fresh start! You've got ${total} class${total > 1 ? 'es' : ''} today.`;
  }
  return `${marked} of ${total} classes attended today`;
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const cursorRef = useRef(null);
  const [heroScrolled, setHeroScrolled] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  /* ── Dark mode sync ── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /* ── System preference listener ── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('theme')) setIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Hero shrink on scroll ── */
  useEffect(() => {
    const onScroll = () => setHeroScrolled(window.scrollY > 72);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Get location on mount ── */
  useEffect(() => { getLocation(); }, []);

  /* ── Cursor glow ── */
  useEffect(() => {
    const move = (e) => {
      if (!cursorRef.current) return;
      cursorRef.current.style.left = `${e.clientX}px`;
      cursorRef.current.style.top = `${e.clientY}px`;
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.hp-search-pill')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Data queries ── */
  const { data: announcements, isLoading: loadingAnn } = useQuery({
    queryKey: ['recent-announcements'],
    queryFn: async () => { const r = await announcementsApi.list({ limit: 3 }); return Array.isArray(r) ? r : r.data || []; },
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

  /* ── Claimed items query (Feature 4) ── */
  const { data: claimedItems } = useQuery({
    queryKey: ['claimed-items-ticker'],
    queryFn: async () => {
      const r = await apiClient.get('/found-items/items/', { params: { is_claimed: true, ordering: '-updated_at', limit: 3 } });
      return Array.isArray(r.data) ? r.data : r.data?.results || [];
    },
    refetchInterval: 60000,
  });

  /* ── Nearby classes ── */
  const { data: nearbyClasses } = useQuery({
    queryKey: ['nearby-classes-home', location?.latitude, location?.longitude],
    queryFn: async () => {
      if (!location?.latitude || !location?.longitude) return [];
      const r = await GeoService.getNearbyClasses(location.latitude, location.longitude, 500);
      return Array.isArray(r) ? r.slice(0, 3) : [];
    },
    enabled: !!location,
  });

  /* ── Governance (leaders only) ── */
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

  /* ── Weather (Feature 6) ── */
  const { data: weather } = useWeather(location?.latitude, location?.longitude);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const hour = new Date().getHours();
  const dow = new Date().getDay();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const attendedCount = todayClasses?.filter(c => c.is_marked).length ?? 0;
  const totalClasses = todayClasses?.length ?? 0;

  // Feature 1: next markable class
  const nextMarkableClass = todayClasses?.find(c => c.can_mark && !c.is_marked) ?? null;
  const allMarked = totalClasses > 0 && attendedCount === totalClasses;

  // Feature 5: context greeting
  const contextSub = getContextGreeting(todayClasses, hour, dow);

  const quickLinks = [
    { to: '/found-items', label: 'Found Items', color: '#3b82f6', icon: FiPackage },
    { to: '/blog', label: 'Student Blog', color: '#ec4899', icon: FiBookOpen },
    { to: '/announcements', label: 'Announcements', color: '#8b5cf6', icon: FiBell },
    { to: '/opportunities', label: 'Opportunities', color: '#10b981', icon: FiBriefcase },
    { to: '/classes', label: 'My Classes', color: '#f59e0b', icon: FiBook },
    { to: '/nearby-classes', label: 'Nearby', color: '#06b6d4', icon: FiNavigation },
    { to: '/campus-map', label: 'Campus Map', color: '#84cc16', icon: FiMapPin },
  ];
  const leaderLinks = isLeader ? [
    { to: '/governance', label: 'Governance', color: '#8b5cf6', icon: FiShield },
    { to: '/admin', label: 'Admin Panel', color: '#ef4444', icon: FiBarChart2 },
  ] : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        /* ── Ambient background ── */
        .hp-wrap { font-family: 'DM Sans', sans-serif; min-height: 100vh; position: relative; }
        .hp-bg { position: fixed; inset: 0; z-index: -2; overflow: hidden; background: linear-gradient(155deg,#fef6ee 0%,#fefaf5 45%,#f3f0ff 100%); transition: background .4s; }
        .dark .hp-bg { background: linear-gradient(155deg,#0c0a15 0%,#100c08 45%,#080c1c 100%); }
        .hp-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .28; animation: blobDrift 20s ease-in-out infinite alternate; }
        .dark .hp-blob { opacity: .14; }
        .hp-blob-1 { width:700px;height:700px;background:radial-gradient(circle,#fb923c 0%,transparent 70%);top:-200px;left:-180px;animation-duration:22s; }
        .hp-blob-2 { width:550px;height:550px;background:radial-gradient(circle,#a78bfa 0%,transparent 70%);top:25%;right:-200px;animation-duration:28s;animation-delay:-9s; }
        .hp-blob-3 { width:450px;height:450px;background:radial-gradient(circle,#34d399 0%,transparent 70%);bottom:-80px;left:28%;animation-duration:24s;animation-delay:-5s; }
        @keyframes blobDrift { from{transform:translate(0,0) scale(1)} to{transform:translate(45px,35px) scale(1.07)} }

        /* ── Cursor glow ── */
        .hp-cursor-glow { position:fixed;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(234,88,12,.07) 0%,rgba(124,58,237,.04) 40%,transparent 70%);pointer-events:none;z-index:-1;transform:translate(-50%,-50%);transition:left .45s cubic-bezier(.23,1,.32,1),top .45s cubic-bezier(.23,1,.32,1);will-change:left,top; }
        @media (hover:none) { .hp-cursor-glow { display:none; } }

        /* ── Spin animation ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .hp-spin { animation: spin .8s linear infinite; }

        /* ── TOPBAR ── */
        .hp-topbar { position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;padding:0 20px;height:54px;background:rgba(255,255,255,.82);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid rgba(0,0,0,.06);box-shadow:0 1px 0 rgba(255,255,255,.7),0 4px 16px rgba(0,0,0,.04);transition:background .3s,border-color .3s; }
        .dark .hp-topbar { background:rgba(10,8,20,.88);border-bottom-color:rgba(255,255,255,.06);box-shadow:0 1px 0 rgba(255,255,255,.03),0 4px 20px rgba(0,0,0,.3); }
        .hp-topbar-left { display:flex;align-items:center;gap:8px;flex-shrink:0; }
        .hp-topbar-brand { display:flex;align-items:center;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-size:.85rem;font-weight:700;color:#1f2937;letter-spacing:-.02em; }
        .dark .hp-topbar-brand { color:#f3f4f6; }
        .hp-topbar-sep { color:#d1d5db;font-size:.9rem;font-weight:300; }
        .dark .hp-topbar-sep { color:#374151; }
        .hp-topbar-page { font-size:.8rem;font-weight:600;color:#6b7280; }
        .dark .hp-topbar-page { color:#9ca3af; }
        .hp-search-wrap { flex:1;max-width:360px;margin:0 auto;display:flex;align-items:center;position:relative; }
        .hp-search-pill { display:flex;align-items:center;gap:8px;width:100%;padding:7px 14px;background:rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.07);border-radius:10px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.8rem;color:#9ca3af;font-weight:500;transition:background .15s,border-color .15s; }
        .dark .hp-search-pill { background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.07);color:#6b7280; }
        .hp-search-pill:hover { background:rgba(234,88,12,.06);border-color:rgba(234,88,12,.2);color:#ea580c; }
        .hp-search-pill kbd { margin-left:auto;padding:2px 7px;background:rgba(0,0,0,.06);border-radius:5px;font-size:.68rem;font-weight:700;color:#9ca3af;font-family:'DM Sans',sans-serif; }
        .dark .hp-search-pill kbd { background:rgba(255,255,255,.06); }
        .hp-search-wrap.open { display:flex;align-items:center;background:rgba(255,255,255,.95);border:1.5px solid rgba(234,88,12,.4);border-radius:11px;padding:0 12px;box-shadow:0 0 0 3px rgba(234,88,12,.08),0 4px 16px rgba(0,0,0,.08);gap:8px; }
        .dark .hp-search-wrap.open { background:rgba(20,16,34,.95);border-color:rgba(234,88,12,.35); }
        .hp-search-icon { color:#ea580c;flex-shrink:0; }
        .hp-search-input { flex:1;border:none;background:transparent;outline:none;font-family:'DM Sans',sans-serif;font-size:.85rem;color:#1f2937;font-weight:500;padding:8px 0; }
        .dark .hp-search-input { color:#f3f4f6; }
        .hp-search-input::placeholder { color:#9ca3af; }
        .hp-search-x { flex-shrink:0;padding:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;border-radius:6px;display:flex;align-items:center;transition:color .15s,background .15s; }
        .hp-search-x:hover { color:#ef4444;background:rgba(239,68,68,.08); }
        .hp-topbar-right { display:flex;align-items:center;gap:6px;flex-shrink:0; }
        .hp-tb-btn { width:36px;height:36px;border-radius:10px;border:none;background:transparent;color:#6b7280;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;transition:background .15s,color .15s;text-decoration:none; }
        .hp-tb-btn:hover { background:rgba(0,0,0,.06);color:#ea580c; }
        .dark .hp-tb-btn { color:#9ca3af; }
        .dark .hp-tb-btn:hover { background:rgba(255,255,255,.07);color:#fb923c; }
        .hp-notif-dot { position:absolute;top:6px;right:6px;width:15px;height:15px;border-radius:50%;background:#ef4444;color:#fff;font-size:.55rem;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid white;animation:notifPulse 2.5s ease-in-out infinite; }
        .dark .hp-notif-dot { border-color:#0a0814; }
        @keyframes notifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)} 50%{box-shadow:0 0 0 4px rgba(239,68,68,0)} }
        .hp-tb-avatar { width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#ea580c,#7c3aed);color:#fff;font-size:.68rem;font-weight:800;display:flex;align-items:center;justify-content:center;text-decoration:none;letter-spacing:.03em;box-shadow:0 2px 10px rgba(234,88,12,.35);transition:transform .2s,box-shadow .2s; }
        .hp-tb-avatar:hover { transform:scale(1.08);box-shadow:0 4px 16px rgba(234,88,12,.45); }

        /* ── PAGE ROOT ── */
        .hp-root { max-width:1080px;margin:0 auto;padding:24px 20px 90px;animation:hpIn .5s cubic-bezier(.16,1,.3,1) both; }
        @keyframes hpIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        /* ── HERO ── */
        .hp-hero-outer { position:relative;border-radius:26px;padding:3px;margin-bottom:20px;background:linear-gradient(135deg,#ea580c,#f97316,#fb923c,#a78bfa,#7c3aed,#ea580c);background-size:300% 300%;animation:borderSpin 6s linear infinite;transition:transform .45s cubic-bezier(.4,0,.2,1),box-shadow .45s;box-shadow:0 20px 60px rgba(234,88,12,.3),0 4px 16px rgba(0,0,0,.1); }
        .hp-hero-outer.scrolled { transform:scale(.986);box-shadow:0 10px 30px rgba(234,88,12,.18),0 2px 8px rgba(0,0,0,.08); }
        @keyframes borderSpin { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .hp-hero { position:relative;overflow:hidden;border-radius:24px;padding:38px 36px 34px;background:linear-gradient(135deg,#ea580c 0%,#f97316 38%,#fb923c 62%,#7c3aed 100%);color:#fff;transition:padding .4s cubic-bezier(.4,0,.2,1); }
        .hp-hero-outer.scrolled .hp-hero { padding:24px 36px 20px; }
        .hp-hero::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 78% 18%,rgba(255,255,255,.16) 0%,transparent 55%),url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='100' r='88' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1.2'/%3E%3C/svg%3E") repeat;pointer-events:none; }
        .hp-hero-badge { display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:99px;background:rgba(255,255,255,.18);backdrop-filter:blur(10px);font-size:.72rem;font-weight:700;letter-spacing:.05em;margin-bottom:10px;border:1px solid rgba(255,255,255,.24);text-transform:uppercase; }
        .hp-hero-eyebrow { font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.72);margin:0 0 6px; }
        .hp-hero h1 { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(2rem,5.2vw,3rem);font-weight:800;letter-spacing:-.035em;line-height:1.12;margin:0 0 8px;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.12);padding-bottom:2px; }
        .hp-hero h1 .hp-name { color:#fde68a;text-shadow:0 0 28px rgba(253,230,138,.45),0 2px 16px rgba(0,0,0,.12); }
        .hp-hero-sub { font-size:.88rem;opacity:.75;font-weight:500;letter-spacing:.01em;transition:opacity .35s; }
        .hp-hero-outer.scrolled .hp-hero-sub { opacity:0;pointer-events:none; }
        .hp-hero-meta { display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap; }
        .hp-hero-date { display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:12px;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);font-size:.72rem;font-weight:700;border:1px solid rgba(255,255,255,.2);letter-spacing:.01em;transition:opacity .35s; }
        .hp-hero-outer.scrolled .hp-hero-date { opacity:0; }
        .hp-hero-weather { display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:12px;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);font-size:.72rem;font-weight:700;border:1px solid rgba(255,255,255,.2);letter-spacing:.01em;white-space:nowrap;overflow:hidden;max-width:220px;text-overflow:ellipsis; }
        @media (max-width:520px) { .hp-hero-date,.hp-hero-weather { display:none; } }

        /* ── FEATURE 1: Attendance CTA ── */
        .hp-cta-checkin { display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:18px;border:1.5px solid;margin-bottom:14px;transition:all .3s;backdrop-filter:blur(12px); }
        .hp-cta-left { flex:1;min-width:0; }
        .hp-cta-label { display:flex;align-items:center;gap:8px;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px; }
        .hp-cta-pulse { width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0; }
        .hp-cta-pulse-amber { animation:ctaPulseAmber 1.5s ease-in-out infinite; }
        .hp-cta-pulse-red { animation:ctaPulseRed 1s ease-in-out infinite; }
        @keyframes ctaPulseAmber { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.5)} 50%{box-shadow:0 0 0 5px rgba(245,158,11,0)} }
        @keyframes ctaPulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.6)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }
        .hp-cta-class { font-family:'Bricolage Grotesque',sans-serif;font-size:.92rem;font-weight:700;color:#1f2937;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .dark .hp-cta-class { color:#f3f4f6; }
        .hp-cta-countdown { font-size:.72rem;font-weight:700;margin-top:3px;opacity:.9; }
        .hp-cta-btn { display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:12px;border:none;color:#fff;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:transform .2s,filter .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(0,0,0,.15); }
        .hp-cta-btn:hover:not(:disabled) { transform:translateY(-2px) scale(1.04);filter:brightness(1.08);box-shadow:0 8px 24px rgba(0,0,0,.2); }
        .hp-cta-btn:disabled { cursor:default; }
        .hp-cta-btn-success { animation:ctaSuccess .4s cubic-bezier(.34,1.56,.64,1); }
        @keyframes ctaSuccess { 0%{transform:scale(.92)} 60%{transform:scale(1.06)} 100%{transform:scale(1)} }
        .hp-cta-allgood { display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);margin-bottom:14px; }
        .hp-cta-allgood-text { font-size:.82rem;font-weight:700;color:#059669;flex:1; }
        .hp-cta-allgood-link { font-size:.72rem;font-weight:700;color:#059669;text-decoration:none;padding:4px 10px;border-radius:8px;background:rgba(16,185,129,.1);transition:background .15s; }
        .hp-cta-allgood-link:hover { background:rgba(16,185,129,.18); }

        /* ── FEATURE 2: Event Countdown Strip ── */
        .hp-strip { display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(245,158,11,.1) 0%,rgba(234,88,12,.07) 100%);border:1px solid rgba(245,158,11,.22);margin-bottom:16px;overflow:hidden; }
        .dark .hp-strip { background:linear-gradient(135deg,rgba(245,158,11,.08) 0%,rgba(234,88,12,.05) 100%);border-color:rgba(245,158,11,.15); }
        .hp-strip-label { font-size:.68rem;font-weight:800;color:#d97706;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;flex-shrink:0; }
        .dark .hp-strip-label { color:#f59e0b; }
        .hp-strip-scroll { display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;flex:1; }
        .hp-strip-scroll::-webkit-scrollbar { display:none; }
        .hp-strip-item { display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:10px;background:rgba(255,255,255,.65);border:1px solid rgba(245,158,11,.15);text-decoration:none;color:inherit;white-space:nowrap;flex-shrink:0;transition:transform .2s,box-shadow .2s;backdrop-filter:blur(8px); }
        .dark .hp-strip-item { background:rgba(255,255,255,.05); }
        .hp-strip-item:hover { transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.1); }
        .hp-strip-icon { font-size:.9rem; }
        .hp-strip-title { font-size:.75rem;font-weight:700;color:#1f2937;max-width:160px;overflow:hidden;text-overflow:ellipsis; }
        .dark .hp-strip-title { color:#f3f4f6; }
        .hp-strip-badge { display:inline-flex;align-items:center;gap:5px;font-size:.65rem;font-weight:800;padding:3px 9px;border-radius:99px;background:rgba(245,158,11,.12);color:#d97706; }
        .hp-strip-badge.urgent { background:rgba(239,68,68,.1);color:#dc2626; }
        .hp-strip-pulse { width:6px;height:6px;border-radius:50%;background:currentColor;animation:stripPulse 1.2s ease-in-out infinite; }
        @keyframes stripPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }

        /* ── FEATURE 3: Daily Tip ── */
        .hp-tip-card { padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.75);border:1px solid rgba(99,102,241,.14);backdrop-filter:blur(12px);margin-bottom:16px;box-shadow:0 2px 12px rgba(99,102,241,.06); }
        .dark .hp-tip-card { background:rgba(15,12,28,.75);border-color:rgba(99,102,241,.15); }
        .hp-tip-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
        .hp-tip-badge { font-size:.7rem;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.07em; }
        .dark .hp-tip-badge { color:#818cf8; }
        .hp-tip-btn { width:28px;height:28px;border:none;background:transparent;color:#9ca3af;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s; }
        .hp-tip-btn:hover { background:rgba(99,102,241,.08);color:#6366f1; }
        .hp-tip-text { font-size:.83rem;font-weight:500;color:#374151;line-height:1.55;margin:0 0 10px; }
        .dark .hp-tip-text { color:#d1d5db; }
        .hp-tip-footer { display:flex;align-items:center;justify-content:space-between; }
        .hp-tip-vote { display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;border:1px solid rgba(16,185,129,.25);background:rgba(16,185,129,.07);color:#059669;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .2s; }
        .hp-tip-vote:hover { background:rgba(16,185,129,.14); }
        .hp-tip-vote.voted { background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.4);cursor:default; }
        .hp-tip-day { font-size:.65rem;color:#9ca3af;font-weight:600; }

        /* ── FEATURE 4: Claimed Items Ticker ── */
        .hp-claimed-ticker { display:flex;align-items:center;gap:10px;padding:11px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(16,185,129,.09) 0%,rgba(5,150,105,.06) 100%);border:1px solid rgba(16,185,129,.2);margin-bottom:16px;text-decoration:none;color:inherit;transition:transform .2s,box-shadow .2s; }
        .dark .hp-claimed-ticker { background:linear-gradient(135deg,rgba(16,185,129,.07) 0%,rgba(5,150,105,.04) 100%); }
        .hp-claimed-ticker:hover { transform:translateY(-1px);box-shadow:0 4px 16px rgba(16,185,129,.12); }
        .hp-claimed-icon { font-size:1.1rem;flex-shrink:0; }
        .hp-claimed-text { flex:1;font-size:.78rem;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .dark .hp-claimed-text { color:#f3f4f6; }
        .hp-claimed-text strong { color:#059669; }
        .hp-claimed-time { color:#9ca3af;font-weight:500; }
        .hp-claimed-dots { display:flex;gap:4px;align-items:center;flex-shrink:0; }
        .hp-claimed-dot { width:5px;height:5px;border-radius:50%;background:rgba(16,185,129,.25);transition:background .3s; }
        .hp-claimed-dot.active { background:#10b981; }

        /* ── SECTION TITLES ── */
        .hp-section-title { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(.95rem,2vw,1.1rem);font-weight:700;letter-spacing:-.02em;color:#ea580c;margin:26px 0 14px;display:flex;align-items:center;gap:10px; }
        .hp-section-title::after { content:'';flex:1;height:1.5px;background:linear-gradient(90deg,rgba(234,88,12,.25) 0%,transparent 100%);border-radius:99px; }
        .dark .hp-section-title { color:#fb923c; }

        /* ── BENTO ── */
        .hp-bento { display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:24px; }
        @media (max-width:860px) { .hp-bento{grid-template-columns:repeat(3,1fr)} .hp-bstat[style*="span 2"]{grid-column:span 3!important} }
        @media (max-width:520px) { .hp-bento{grid-template-columns:repeat(2,1fr)} .hp-bstat[style*="span 2"],.hp-bstat[style*="span 3"]{grid-column:span 2!important} }
        .hp-bstat { border-radius:18px;padding:16px 15px 14px;background:rgba(255,255,255,.82);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.75);box-shadow:0 2px 12px rgba(0,0,0,.05),inset 0 1px 0 rgba(255,255,255,.9);transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;cursor:default; }
        .hp-bstat:hover { transform:translateY(-4px) scale(1.02);box-shadow:0 10px 28px rgba(234,88,12,.1),inset 0 1px 0 rgba(255,255,255,.9); }
        .dark .hp-bstat { background:rgba(15,12,28,.82);border-color:rgba(255,255,255,.06);box-shadow:0 2px 12px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.03); }
        .dark .hp-bstat:hover { box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05); }
        .hp-bstat-top { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px; }
        .hp-bstat-icon-wrap { width:34px;height:34px;border-radius:10px;background:color-mix(in srgb,var(--c,#ea580c) 12%,transparent);display:flex;align-items:center;justify-content:center; }
        .hp-bstat-trend { display:flex;align-items:center;gap:3px;font-size:.65rem;font-weight:700;padding:3px 7px;border-radius:99px;background:rgba(16,185,129,.1); }
        .hp-bstat-val { font-family:'Bricolage Grotesque',sans-serif;font-size:1.65rem;font-weight:800;color:#111827;letter-spacing:-.05em;line-height:1; }
        .dark .hp-bstat-val { color:#f9fafb; }
        .hp-bstat-lbl { font-size:.62rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;font-weight:700;margin-top:4px; }
        .hp-bstat-track { height:4px;border-radius:99px;background:rgba(0,0,0,.06);margin-top:12px;overflow:hidden; }
        .dark .hp-bstat-track { background:rgba(255,255,255,.07); }
        .hp-bstat-fill { height:100%;border-radius:99px;transition:width .8s cubic-bezier(.4,0,.2,1); }
        .hp-bstat-pct { font-size:.64rem;color:#9ca3af;font-weight:600;margin-top:5px; }

        /* ── 3-col grid ── */
        .hp-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px;align-items:start; }
        @media (max-width:860px) { .hp-grid{grid-template-columns:1fr 1fr} }
        @media (max-width:560px) { .hp-grid{grid-template-columns:1fr} }
        .hp-card-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px; }
        .hp-card-title { display:flex;align-items:center;gap:8px;font-family:'Bricolage Grotesque',sans-serif;font-size:.9rem;font-weight:700;color:#111827;letter-spacing:-.02em; }
        .dark .hp-card-title { color:#f9fafb; }
        .hp-card-dot { width:8px;height:8px;border-radius:50%; }
        .hp-card-link { display:flex;align-items:center;gap:4px;font-size:.7rem;font-weight:700;color:#ea580c;text-decoration:none;padding:4px 10px;border-radius:8px;background:rgba(234,88,12,.07);transition:background .15s,transform .15s;letter-spacing:.01em; }
        .hp-card-link:hover { background:rgba(234,88,12,.13);transform:translateX(2px); }

        /* ── Row components ── */
        .hp-row { display:flex;align-items:flex-start;gap:10px;padding:9px 0;text-decoration:none;color:inherit; }
        .hp-row+.hp-row { border-top:1px solid rgba(0,0,0,.04); }
        .dark .hp-row+.hp-row { border-top-color:rgba(255,255,255,.04); }
        .hp-blog-row { width:100%;overflow:hidden;box-sizing:border-box; }
        .hp-blog-title { white-space:normal!important;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;overflow-wrap:break-word; }
        .hp-row-dot { width:7px;height:7px;border-radius:50%;background:#ea580c;flex-shrink:0;margin-top:5px; }
        .hp-row-dot.urgent { background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,.45); }
        .hp-row-body { flex:1;min-width:0;overflow:hidden; }
        .hp-row-title { font-size:.82rem;font-weight:700;color:#1f2937;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px; }
        .dark .hp-row-title { color:#f3f4f6; }
        .hp-row-preview { font-size:.7rem;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .hp-row-meta { display:flex;gap:9px;flex-wrap:wrap;font-size:.66rem;color:#9ca3af;margin-top:3px; }
        .hp-row-meta span { display:flex;align-items:center;gap:3px; }
        .hp-row-end { flex-shrink:0; }
        .hp-class-pill { font-size:.6rem;font-weight:800;padding:4px 8px;border-radius:8px;white-space:nowrap;flex-shrink:0;letter-spacing:.02em; }
        .hp-badge { display:inline-flex;align-items:center;gap:3px;font-size:.61rem;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap; }
        .hp-badge-green { background:rgba(16,185,129,.1);color:#059669; }
        .hp-badge-amber { background:rgba(245,158,11,.1);color:#d97706; }
        .hp-badge-gray  { background:rgba(107,114,128,.07);color:#6b7280; }
        .hp-badge-red   { background:rgba(239,68,68,.08);color:#dc2626; }
        .hp-empty { display:flex;flex-direction:column;align-items:center;padding:26px 16px;text-align:center;color:#9ca3af; }
        .hp-empty-icon { font-size:1.5rem;margin-bottom:6px;opacity:.6; }
        .hp-empty-text { font-size:.77rem;font-weight:600; }

        /* ── Quick Access ── */
        .hp-ql-label { font-family:'Bricolage Grotesque',sans-serif;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#ea580c;margin-bottom:12px; }
        .dark .hp-ql-label { color:#fb923c; }
        .hp-quick { display:grid;grid-template-columns:repeat(5,1fr);gap:12px; }
        @media (max-width:860px) { .hp-quick{grid-template-columns:repeat(3,1fr)} }
        @media (max-width:480px) { .hp-quick{grid-template-columns:repeat(2,1fr)} }
        .hp-quick-card { border-radius:18px;padding:20px 18px 18px;text-decoration:none;display:flex;flex-direction:column;gap:10px;border:1px solid rgba(255,255,255,.22);transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s,filter .2s;position:relative;overflow:hidden; }
        .hp-quick-card::before { content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.18) 0%,transparent 60%);pointer-events:none; }
        .hp-quick-card:hover { transform:translateY(-6px) scale(1.03);filter:brightness(1.06); }
        .hp-quick-icon { width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;backdrop-filter:blur(4px);transition:background .2s,transform .2s; }
        .hp-quick-card:hover .hp-quick-icon { background:rgba(255,255,255,.3);transform:scale(1.08) rotate(-4deg); }
        .hp-quick-label { font-family:'Bricolage Grotesque',sans-serif;font-size:.82rem;font-weight:700;color:rgba(255,255,255,.95);letter-spacing:-.01em;line-height:1.2; }

        /* ── Governance alert ── */
        .hp-gov-alert { display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.15);margin-bottom:16px; }
        .dark .hp-gov-alert { background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.2); }
        .hp-gov-alert-text { font-size:.78rem;font-weight:600;color:#7c3aed;flex:1; }
        .hp-gov-alert-link { font-size:.72rem;font-weight:700;color:#7c3aed;text-decoration:none;padding:4px 10px;border-radius:8px;background:rgba(139,92,246,.1);transition:background .15s; }
        .hp-gov-alert-link:hover { background:rgba(139,92,246,.2); }
      `}</style>

      <div className="hp-bg">
        <div className="hp-blob hp-blob-1" />
        <div className="hp-blob hp-blob-2" />
        <div className="hp-blob hp-blob-3" />
      </div>

      <div ref={cursorRef} className="hp-cursor-glow" />

      <div className="hp-wrap">

        <TopBar
          user={user}
          announcements={announcements}
          isDark={isDark}
          onThemeToggle={() => setIsDark(d => !d)}
        />

        <div className="hp-root">

          {/* ── HERO ── */}
          <div className={`hp-hero-outer${heroScrolled ? ' scrolled' : ''}`}>
            <div className="hp-hero">
              <div className="hp-hero-badge"><FiZap size={11} /> {greeting}</div>
              <p className="hp-hero-eyebrow">Welcome back,</p>
              {/* Feature 5 — enhanced greeting h1 */}
              <h1><span className="hp-name">{firstName}</span>!</h1>
              {/* Feature 5 — context-aware sub */}
              <p className="hp-hero-sub">{contextSub}</p>
              <div className="hp-hero-meta">
                <div className="hp-hero-date"><FiCalendar size={12} /> {dateStr}</div>
                {/* Feature 6 — weather pill */}
                {weather && (
                  <div className="hp-hero-weather">
                    {weather.icon} {weather.temp}°C, {weather.desc}{weatherSuffix(weather.desc)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── FEATURE 1: Attendance CTA ── */}
          {!loadingCls && !checkinDone && nextMarkableClass && (
            <AttendanceCTA
              nextMarkableClass={nextMarkableClass}
              location={location}
              onSuccess={() => setCheckinDone(true)}
            />
          )}
          {!loadingCls && allMarked && (
            <div className="hp-cta-allgood">
              <FiCheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
              <span className="hp-cta-allgood-text">All caught up! 🎉 You've marked all your classes today.</span>
              <Link to="/classes" className="hp-cta-allgood-link">View stats</Link>
            </div>
          )}

          {/* ── FEATURE 4: Claimed Items Ticker ── */}
          <ClaimedItemsTicker claimedItems={claimedItems} />

          {/* ── FEATURE 2: Event Countdown Strip ── */}
          <EventCountdownStrip opportunities={opportunities} />

          {/* ── Governance Alert (leaders only) ── */}
          {isLeader && expiringRoles?.length > 0 && (
            <div className="hp-gov-alert">
              <FiUsers size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <span className="hp-gov-alert-text">
                {expiringRoles.length} role{expiringRoles.length > 1 ? 's' : ''} expiring within 7 days
              </span>
              <Link to="/admin/roles" className="hp-gov-alert-link">Manage</Link>
            </div>
          )}

          {/* ── FEATURE 3: Daily Campus Tip ── */}
          <DailyTip />

          {/* ── BENTO STATS ── */}
          <div className="hp-bento">
            <BentoStat label="Attended Today" value={attendedCount} total={totalClasses || undefined} icon={FiCheckCircle} color="#10b981" span={2} />
            <BentoStat label="Classes" value={todayClasses?.length} icon={FiBook} color="#6366f1" span={1} />
            <BentoStat label="Notices" value={announcements?.length} icon={FiBell} color="#ea580c" span={1} trend={2} />
            <BentoStat label="Blog" value={blogPosts?.length} icon={FiBookOpen} color="#ec4899" span={1} />
            <BentoStat label="Opps" value={opportunities?.length} icon={FiBriefcase} color="#f59e0b" span={1} trend={5} />
            {isLeader && (
              <BentoStat label="Active Roles" value={governanceStats?.active_roles} icon={FiShield} color="#8b5cf6" span={1} />
            )}
          </div>

          {/* ── 3-col grid ── */}
          <p className="hp-section-title">Today's Overview</p>
          <div className="hp-grid">
            {/* Today's Classes */}
            <Card padding="sm" accent="indigo" hover={false}>
              <div className="hp-card-head">
                <p className="hp-card-title">
                  <span className="hp-card-dot" style={{ background: '#6366f1', boxShadow: '0 0 6px #6366f1' }} />
                  Today's Classes
                </p>
                <Link to="/classes" className="hp-card-link" style={{ color: '#6366f1', background: 'rgba(99,102,241,.07)' }}>
                  All <FiArrowRight size={11} />
                </Link>
              </div>
              {loadingCls ? <SkeletonLoader type="list" count={3} />
                : todayClasses?.length
                  ? todayClasses.slice(0, 3).map(c => <ClassRow key={c.id} c={c} />)
                  : <div className="hp-empty"><span className="hp-empty-icon">🎉</span><span className="hp-empty-text">No classes today!</span></div>}
            </Card>

            {/* Student Blog */}
            <Card padding="sm" accent="pink" hover={false} style={{ overflow: 'hidden' }}>
              <div className="hp-card-head">
                <p className="hp-card-title">
                  <span className="hp-card-dot" style={{ background: '#ec4899', boxShadow: '0 0 6px #ec4899' }} />
                  Student Blog
                </p>
                <Link to="/blog" className="hp-card-link" style={{ color: '#ec4899', background: 'rgba(236,72,153,.07)' }}>
                  All <FiArrowRight size={11} />
                </Link>
              </div>
              {loadingBlog ? <SkeletonLoader type="list" count={3} />
                : blogPosts?.length
                  ? blogPosts.slice(0, 3).map(post => (
                    <Link key={post.id} to={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', overflow: 'hidden' }}>
                      <BlogRow post={post} />
                    </Link>
                  ))
                  : <div className="hp-empty"><span className="hp-empty-icon">📝</span><span className="hp-empty-text">No posts yet</span></div>}
            </Card>

            {/* Announcements */}
            <Card padding="sm" accent="violet" hover={false}>
              <div className="hp-card-head">
                <p className="hp-card-title">
                  <span className="hp-card-dot" style={{ background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }} />
                  Announcements
                </p>
                <Link to="/announcements" className="hp-card-link" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,.07)' }}>
                  All <FiArrowRight size={11} />
                </Link>
              </div>
              {loadingAnn ? <SkeletonLoader type="list" count={3} />
                : announcements?.length
                  ? announcements.slice(0, 3).map(a => <AnnouncementRow key={a.id} a={a} />)
                  : <div className="hp-empty"><span className="hp-empty-icon">📭</span><span className="hp-empty-text">All clear!</span></div>}
            </Card>

            {/* Nearby Classes (GPS) */}
            {location && nearbyClasses?.length > 0 && (
              <Card padding="sm" accent="cyan" hover={false}>
                <div className="hp-card-head">
                  <p className="hp-card-title">
                    <span className="hp-card-dot" style={{ background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }} />
                    Nearby Classes
                  </p>
                  <Link to="/nearby-classes" className="hp-card-link" style={{ color: '#06b6d4', background: 'rgba(6,182,212,.07)' }}>
                    All <FiArrowRight size={11} />
                  </Link>
                </div>
                {nearbyClasses.map(cls => <NearbyClassRow key={cls.entry_id} cls={cls} />)}
              </Card>
            )}

            {/* Governance (leaders only) */}
            {isLeader && governanceStats && (
              <Card padding="sm" accent="violet" hover={false}>
                <div className="hp-card-head">
                  <p className="hp-card-title">
                    <span className="hp-card-dot" style={{ background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }} />
                    Governance
                  </p>
                  <Link to="/governance" className="hp-card-link" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,.07)' }}>
                    More <FiArrowRight size={11} />
                  </Link>
                </div>
                <GovernanceRow stat={{ label: 'Active Roles', value: governanceStats.active_roles, description: 'Current leadership positions' }} />
                <GovernanceRow stat={{ label: 'Students', value: governanceStats.students_count, description: 'Total registered students' }} />
                <GovernanceRow stat={{ label: 'Reports', value: governanceStats.total_reports, description: `${governanceStats.resolved_reports} resolved` }} />
              </Card>
            )}
          </div>

          {/* ── Quick Access ── */}
          <p className="hp-ql-label">Quick Access</p>
          <div className="hp-quick">
            {[...quickLinks, ...leaderLinks].map(({ to, label, color, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="hp-quick-card"
                style={{ background: `linear-gradient(135deg,${color}f0 0%,${color}a0 100%)`, boxShadow: `0 8px 24px ${color}38` }}
              >
                <div className="hp-quick-icon"><Icon size={18} /></div>
                <span className="hp-quick-label">{label}</span>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}