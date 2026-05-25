import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { classesApi } from '../api/classesApi';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAttendance } from '../hooks/useAttendance';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import TimetableManager from '../components/classes/TimetableManager';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import {
    FiCalendar, FiCheckCircle, FiClock, FiMapPin, FiUser,
    FiTrendingUp, FiBookOpen, FiPlusCircle, FiNavigation,
    FiTarget, FiWifi, FiWifiOff, FiExternalLink, FiBarChart2,
    FiX, FiAlertCircle, FiLoader, FiChevronRight, FiActivity,
    FiEye, FiZap, FiRefreshCw, FiChevronDown, FiChevronUp,
    FiInfo, FiList, FiPlus,
} from 'react-icons/fi';

/* ───────────────────────────────────────────
   CARD COMPONENT
────────────────────────────────────────── */
function ClassCard({ classItem, isOnline, location, onViewDetail, onViewAttendance }) {
    const [loading, setLoading] = useState(false);
    const mountedRef = useRef(true);
    const { isMarked, syncPending, markAttendance } = useAttendance(classItem.id);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const handleMark = async () => {
        if (!mountedRef.current) return;
        setLoading(true);
        try {
            await markAttendance('PRESENT');
            if (mountedRef.current) toast.success('Attendance marked!', { icon: '✅' });
        } catch (err) {
            if (mountedRef.current) toast.error('Failed to mark attendance', { icon: '❌' });
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const handleMarkWithLocation = async () => {
        if (!location) {
            toast('Location unavailable. Marking without GPS…', { icon: '⚠️' });
            handleMark();
            return;
        }
        if (!mountedRef.current) return;
        setLoading(true);
        try {
            await markAttendance('PRESENT');
            if (mountedRef.current) toast.success('Location-verified check-in! 📍', { icon: '✅' });
        } catch {
            if (mountedRef.current) toast.error('Failed to mark attendance');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const canMark = classItem.can_mark && isOnline;
    const isPast = !classItem.can_mark && !isMarked;
    const stateClass = isMarked ? 'state-marked' : canMark ? 'state-open' : 'state-closed';
    const hasProgress = classItem.remaining_time !== null && !isMarked && canMark;
    const pct = hasProgress ? Math.min(100, (classItem.remaining_time / 30) * 100) : 0;

    return (
        <div
            className={`cp-class-card ${stateClass}`}
            onClick={() => onViewDetail(classItem)}
            style={{ cursor: 'pointer' }}
        >
            <div className="cp-card-inner">
                {/* Time badge */}
                <div className="cp-time-badge">
                    <div className="cp-time-start">
                        {classItem.start_time?.slice(0, 5) || '—'}
                    </div>
                    <div className="cp-time-end">
                        to {classItem.end_time?.slice(0, 5) || '—'}
                    </div>
                </div>

                {/* Body */}
                <div className="cp-card-body">
                    <div className="cp-card-top">
                        <h3 className="cp-card-unit">{classItem.unit_name}</h3>
                        {classItem.lecturer && (
                            <span className="cp-lecturer-badge">
                                <FiUser size={11} /> {classItem.lecturer}
                            </span>
                        )}
                    </div>

                    <div className="cp-card-meta">
                        <span>
                            <FiMapPin size={12} />
                            {classItem.venue || 'Venue TBA'}
                        </span>
                        <span>
                            <FiClock size={12} />
                            {classItem.start_time?.slice(0, 5)} – {classItem.end_time?.slice(0, 5)}
                        </span>
                    </div>

                    {hasProgress && (
                        <div className="cp-progress-wrap">
                            <div className="cp-progress-labels">
                                <span className="cp-progress-label">
                                    <FiClock size={10} style={{ display: 'inline', marginRight: 3 }} />
                                    {classItem.remaining_time} min left
                                </span>
                                <span className="cp-progress-label" style={{ opacity: 0.6 }}>
                                    {Math.round(pct)}%
                                </span>
                            </div>
                            <div className="cp-progress-track">
                                <div className="cp-progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="cp-card-actions" onClick={(e) => e.stopPropagation()}>
                        {isMarked ? (
                            <span className="cp-status-badge cp-status-marked">
                                <FiCheckCircle size={14} /> Attended
                            </span>
                        ) : canMark ? (
                            <button
                                className={`cp-checkin-btn${location ? ' with-gps' : ''}`}
                                onClick={location ? handleMarkWithLocation : handleMark}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <FiLoader size={13} className="cp-spin" /> Processing…
                                    </>
                                ) : location ? (
                                    <>
                                        <FiNavigation size={13} /> GPS Check-In
                                    </>
                                ) : (
                                    <>
                                        <FiCheckCircle size={13} /> Check In
                                    </>
                                )}
                            </button>
                        ) : (
                            <span className="cp-status-badge cp-status-closed">
                                {isPast ? 'Window Closed' : 'Not Yet Open'}
                            </span>
                        )}

                        {!isOnline && canMark && (
                            <span className="cp-offline-note">
                                <FiWifiOff size={12} /> Offline — will sync
                            </span>
                        )}
                        {syncPending && (
                            <span className="cp-sync-pill">
                                <FiLoader size={10} className="cp-spin" /> Syncing
                            </span>
                        )}
                    </div>

                    {/* Attendance detail link */}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onViewAttendance(classItem.id)}
                            className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                        >
                            <FiList size={11} /> Attendance records
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────────────────────
   MAIN PAGE COMPONENT
────────────────────────────────────────── */
export default function ClassesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { location, error: geoError, getLocation } = useGeolocation({ autoRequest: false });

    // ── State declarations (all hooks before any conditional return) ──
    const [showManageModal, setShowManageModal] = useState(false);
    const [manualClassId, setManualClassId] = useState('');
    const [classIdToManage, setClassIdToManage] = useState(null);
    const [showNearby, setShowNearby] = useState(false);
    const [nearbyClasses, setNearbyClasses] = useState([]);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [viewTab, setViewTab] = useState('today'); // 'today' | 'week'
    const [selectedClassDetail, setSelectedClassDetail] = useState(null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickForm, setQuickForm] = useState({
        day_of_week: 0,
        start_time: '08:00',
        end_time: '10:00',
        unit_name: '',
        venue: '',
        lecturer: '',
    });
    const [quickSaving, setQuickSaving] = useState(false);

    // ── TODAY'S CLASSES ──
    const {
        data: todayClasses,
        isLoading: todayLoading,
        isError: todayError,
        refetch: refetchToday,
    } = useQuery({
        queryKey: ['today-classes'],
        queryFn: async () => {
            const response = await classesApi.getTodayClasses();
            return response.data || response;
        },
        refetchInterval: 60000,
    });

    // ── WEEKLY TIMETABLE ──
    const {
        data: fullTimetable,
        isLoading: timetableLoading,
        isError: timetableError,
    } = useQuery({
        queryKey: ['full-timetable'],
        queryFn: async () => {
            const response = await classesApi.getTimetable();
            return Array.isArray(response.data) ? response.data : response;
        },
        enabled: viewTab === 'week',
    });

    // ── WEEKLY SUMMARY ──
    const {
        data: weeklySummary,
        isLoading: weeklyLoading,
        isError: weeklyError,
    } = useQuery({
        queryKey: ['weekly-summary'],
        queryFn: async () => {
            const response = await classesApi.getWeeklySummary();
            return response.data || response;
        },
    });

    const isClassRep = user?.role === 'class_rep' || user?.role === 'admin';
    const isOnline = navigator.onLine;

    // ── NEARBY CLASSES ──
    const handleFindNearby = async () => {
        if (!location) {
            getLocation();
            toast('Getting your location…', { icon: '📍' });
            return;
        }
        setNearbyLoading(true);
        try {
            const response = await apiClient.get('/geo/classes/nearby/', {
                params: { lat: location.latitude, lon: location.longitude, max_distance: 500 },
            });
            setNearbyClasses(response.data || []);
            setShowNearby(true);
        } catch {
            toast.error('Failed to find nearby classes');
        } finally {
            setNearbyLoading(false);
        }
    };

    // ── MANAGE TIMETABLE MODAL ──
    const handleOpenModal = async () => {
        setClassIdToManage(null);
        setManualClassId('');
        if (isClassRep) {
            try {
                const res = await classesApi.getRepresentedClass();
                const data = res.data || res;
                if (data?.id) {
                    setClassIdToManage(data.id);
                    setShowManageModal(true);
                    return;
                }
            } catch { /* fallback */ }
        }
        setShowManageModal(true);
    };

    const handleStartManaging = () => {
        if (!manualClassId.trim()) {
            toast.error('Please enter a valid Class Group ID');
            return;
        }
        setClassIdToManage(manualClassId);
    };

    // ── DIRECTIONS ──
    const openDirections = (venue, venueLat, venueLon) => {
        if (!location) {
            toast('Enable location for directions', { icon: '📍' });
            return;
        }
        if (!venueLat || !venueLon) {
            toast('Venue coordinates not available', { icon: '🗺️' });
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${venueLat},${venueLon}&travelmode=walking`;
        window.open(url, '_blank');
    };

    // ── STATISTICS DERIVATION ──
    const attendedCount = todayClasses?.filter(c => c.is_marked)?.length ?? 0;
    const totalClasses = todayClasses?.length ?? 0;
    const remaining = totalClasses - attendedCount;
    const weeklyPct = weeklySummary?.percentage ?? 0;

    const STATS = [
        { label: "Today's Classes", value: totalClasses, color: '#6366f1', icon: <FiCalendar size={16} style={{ color: '#6366f1' }} /> },
        { label: 'Attended', value: attendedCount, color: '#10b981', icon: <FiCheckCircle size={16} style={{ color: '#10b981' }} /> },
        { label: 'Remaining', value: remaining, color: '#f59e0b', icon: <FiClock size={16} style={{ color: '#f59e0b' }} /> },
        { label: 'Weekly Rate', value: `${weeklyPct}%`, color: '#8b5cf6', icon: <FiTrendingUp size={16} style={{ color: '#8b5cf6' }} /> },
    ];

    // ── Loading / Error states (placed AFTER all hooks) ──
    if (todayLoading || weeklyLoading) {
        return (
            <>
                <style>{STYLES}</style>
                <div className="cp-wrap">
                    <div className="cp-root">
                        <SkeletonLoader type="list" count={4} />
                    </div>
                </div>
            </>
        );
    }

    if (todayError || weeklyError) {
        return (
            <>
                <style>{STYLES}</style>
                <div className="cp-wrap">
                    <div className="cp-root">
                        <div className="cp-empty" style={{ padding: 64 }}>
                            <FiAlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#ef4444' }} />
                            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>Failed to load schedule</p>
                            <p style={{ fontSize: '0.85rem', marginTop: 8, color: '#94a3b8' }}>
                                {(todayError?.message || weeklyError?.message) || 'An unexpected error occurred.'}
                            </p>
                            <button onClick={() => refetchToday()} className="cp-btn cp-btn-primary" style={{ marginTop: 20 }}>
                                <FiRefreshCw size={14} /> Retry
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── Daily Breakdown for Weekly Summary ──
    const dailyBreakdown = weeklySummary?.daily_breakdown || {};
    const breakdownEntries = Object.entries(dailyBreakdown).map(([day, count]) => ({ day, count }));

    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!quickForm.unit_name.trim() || !quickForm.venue.trim()) {
            toast.error('Unit name and venue required');
            return;
        }
        if (!classIdToManage) {
            toast.error('Class group not detected');
            return;
        }
        setQuickSaving(true);
        try {
            await classesApi.createTimetableEntry({
                ...quickForm,
                class_group_id: classIdToManage,
            });
            toast.success('Class added!');
            setQuickForm({ day_of_week: 0, start_time: '08:00', end_time: '10:00', unit_name: '', venue: '', lecturer: '' });
            refetchToday();
            setShowQuickAdd(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add class');
        } finally {
            setQuickSaving(false);
        }
    };

    // ── MAIN RENDER ──
    return (
        <>
            <style>{STYLES}</style>

            {/* Ambient background */}
            <div className="cp-bg">
                <div className="cp-blob cp-blob-1" />
                <div className="cp-blob cp-blob-2" />
                <div className="cp-blob cp-blob-3" />
            </div>

            <div className="cp-wrap">
                <div className="cp-root">
                    {/* ── HEADER ── */}
                    <div className="cp-header">
                        <div className="cp-header-title-block">
                            <div className="cp-page-eyebrow">
                                <FiActivity size={11} /> Academic Schedule
                            </div>
                            <h1 className="cp-page-title">Today's Classes</h1>
                            <span className="cp-page-date">
                                <FiCalendar size={13} />
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>

                        <div className="cp-header-actions">
                            {/* Online/offline status */}
                            <span className={`cp-status-pill ${isOnline ? 'cp-status-online' : 'cp-status-offline'}`}>
                                {isOnline ? <FiWifi size={13} /> : <FiWifiOff size={13} />}
                                {isOnline ? 'Online' : 'Offline'}
                            </span>

                            {/* Tab switch Today / Week */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button
                                    onClick={() => setViewTab('today')}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${viewTab === 'today' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setViewTab('week')}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${viewTab === 'week' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Week
                                </button>
                            </div>

                            <button className="cp-btn cp-btn-cyan" onClick={handleFindNearby} disabled={nearbyLoading}>
                                {nearbyLoading ? <><FiLoader size={14} className="cp-spin" /> Finding…</> : <><FiNavigation size={14} /> Nearby Classes</>}
                            </button>

                            {isClassRep && (
                                <>
                                    <button className="cp-btn cp-btn-primary" onClick={handleOpenModal}>
                                        <FiPlusCircle size={14} /> Manage Timetable
                                    </button>
                                    <button className="cp-btn cp-btn-primary" onClick={() => setShowQuickAdd(!showQuickAdd)}>
                                        <FiPlus size={14} /> Quick Add
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Quick Add Form (collapsible) */}
                    {showQuickAdd && isClassRep && (
                        <form onSubmit={handleQuickAdd} className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border shadow-sm">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold">Day</label>
                                    <select value={quickForm.day_of_week} onChange={e => setQuickForm({ ...quickForm, day_of_week: parseInt(e.target.value) })} className="w-full p-2 rounded border text-sm">
                                        <option value={0}>Monday</option>
                                        <option value={1}>Tuesday</option>
                                        <option value={2}>Wednesday</option>
                                        <option value={3}>Thursday</option>
                                        <option value={4}>Friday</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold">Start</label>
                                    <input type="time" value={quickForm.start_time} onChange={e => setQuickForm({ ...quickForm, start_time: e.target.value })} className="w-full p-2 rounded border text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold">End</label>
                                    <input type="time" value={quickForm.end_time} onChange={e => setQuickForm({ ...quickForm, end_time: e.target.value })} className="w-full p-2 rounded border text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold">Unit Name</label>
                                    <input type="text" value={quickForm.unit_name} onChange={e => setQuickForm({ ...quickForm, unit_name: e.target.value })} className="w-full p-2 rounded border text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold">Venue</label>
                                    <input type="text" value={quickForm.venue} onChange={e => setQuickForm({ ...quickForm, venue: e.target.value })} className="w-full p-2 rounded border text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold">Lecturer</label>
                                    <input type="text" value={quickForm.lecturer} onChange={e => setQuickForm({ ...quickForm, lecturer: e.target.value })} className="w-full p-2 rounded border text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                                <button type="button" onClick={() => setShowQuickAdd(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                                <button type="submit" disabled={quickSaving} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm">
                                    {quickSaving ? 'Adding...' : 'Add Class'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── STAT CARDS ── */}
                    <div className="cp-stats">
                        {STATS.map(({ label, value, color, icon }) => (
                            <div key={label} className="cp-stat" style={{ '--accent': color }}>
                                <div className="cp-stat-icon">{icon}</div>
                                <div className="cp-stat-val">{value}</div>
                                <div className="cp-stat-label">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── NEARBY CLASSES ── */}
                    {showNearby && nearbyClasses.length > 0 && (
                        <>
                            <div className="cp-section-head"><FiTarget size={14} style={{ color: '#06b6d4' }} /><span style={{ color: '#06b6d4' }}>Nearby Classes</span></div>
                            <div className="cp-nearby-section">
                                <div className="cp-nearby-head">
                                    <div className="cp-nearby-title"><FiNavigation size={15} style={{ color: '#06b6d4' }} />{nearbyClasses.length} class{nearbyClasses.length !== 1 ? 'es' : ''} within 500m</div>
                                    <button className="cp-btn cp-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setShowNearby(false)}><FiX size={13} /> Hide</button>
                                </div>
                                <div className="cp-nearby-list">
                                    {nearbyClasses.map(cls => (
                                        <div key={cls.entry_id} className="cp-nearby-item">
                                            <div className="cp-nearby-dot" />
                                            <div className="cp-nearby-info">
                                                <div className="cp-nearby-name">{cls.unit_name}</div>
                                                <div className="cp-nearby-meta">{cls.venue} · {cls.start_time} – {cls.end_time} · 🚶 {cls.walking_time_minutes} min walk</div>
                                            </div>
                                            <span className="cp-nearby-dist"><FiMapPin size={10} />{cls.distance_display}</span>
                                            <button className="cp-dir-btn" onClick={() => openDirections(cls.venue, cls.venue_latitude, cls.venue_longitude)}><FiExternalLink size={11} /> Go</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── CLASS LIST (Today / Week) ── */}
                    <div className="cp-section-head">
                        <FiBookOpen size={14} />
                        {viewTab === 'today' ? 'Schedule' : 'Weekly Timetable'}
                        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {viewTab === 'today' ? `${attendedCount}/${totalClasses} attended` : ''}
                        </span>
                        <Link to="/classes/attendance" className="ml-2 text-xs text-indigo-500 hover:underline flex items-center gap-1" title="Attendance Summary">
                            <FiBarChart2 size={11} /> Summary
                        </Link>
                    </div>

                    {viewTab === 'today' ? (
                        !todayClasses?.length ? (
                            <div className="cp-empty"><span className="cp-empty-emoji">🎉</span><div className="cp-empty-title">No classes today!</div><div className="cp-empty-sub">Enjoy your free time or catch up on assignments.</div></div>
                        ) : (
                            <div className="cp-class-list">
                                {todayClasses.map(classItem => (
                                    <ClassCard
                                        key={classItem.id}
                                        classItem={classItem}
                                        isOnline={isOnline}
                                        location={location}
                                        onViewDetail={setSelectedClassDetail}
                                        onViewAttendance={(entryId) => navigate(`/classes/attendance/${entryId}`)}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        /* Weekly timetable view */
                        <div>
                            {timetableLoading ? <SkeletonLoader type="list" count={4} /> : !fullTimetable?.length ? (
                                <div className="cp-empty"><span className="cp-empty-emoji">📅</span><div className="cp-empty-title">No timetable entries</div></div>
                            ) : (
                                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => {
                                    const dayEntries = (fullTimetable || []).filter(e => e.day_of_week === idx).sort((a, b) => a.start_time.localeCompare(b.start_time));
                                    if (!dayEntries.length) return null;
                                    return (
                                        <div key={idx} className="mb-4">
                                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{day}</h3>
                                            <div className="space-y-2">
                                                {dayEntries.map(cls => (
                                                    <div key={cls.id} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-lg border">
                                                        <span className="text-xs font-bold text-indigo-500 w-12">{cls.start_time?.slice(0, 5)}</span>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm">{cls.unit_name}</p>
                                                            <p className="text-xs text-gray-500">{cls.venue} {cls.lecturer && `· ${cls.lecturer}`}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ── WEEKLY SUMMARY ── */}
                    {weeklySummary && (
                        <>
                            <div className="cp-section-head"><FiBarChart2 size={14} /> Weekly Summary</div>
                            <div className="cp-weekly">
                                <div className="cp-weekly-head">
                                    <div className="cp-weekly-icon"><FiBarChart2 size={20} style={{ color: '#6366f1' }} /></div>
                                    <div><div className="cp-weekly-title">Attendance Overview</div><div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>This week's performance</div></div>
                                </div>

                                <div className="cp-weekly-grid">
                                    <div><div className="cp-weekly-stat-val" style={{ color: '#6366f1' }}>{weeklySummary.total_classes}</div><div className="cp-weekly-stat-label">Total Classes</div></div>
                                    <div><div className="cp-weekly-stat-val" style={{ color: '#10b981' }}>{weeklySummary.marked_count}</div><div className="cp-weekly-stat-label">Marked Present</div></div>
                                    <div><div className="cp-weekly-stat-val" style={{ color: '#f59e0b' }}>{weeklySummary.percentage}%</div><div className="cp-weekly-stat-label">Attendance Rate</div></div>
                                </div>

                                <div className="cp-weekly-bar-track"><div className="cp-weekly-bar-fill" style={{ width: `${weeklySummary.percentage}%` }} /></div>

                                {/* Daily Breakdown */}
                                {breakdownEntries.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Daily Breakdown</h4>
                                        <div className="space-y-1">
                                            {breakdownEntries.map(({ day, count }) => (
                                                <div key={day} className="flex items-center gap-2">
                                                    <span className="text-xs w-16 text-gray-600">{day}</span>
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, (count / (weeklySummary.total_classes || 1)) * 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-500">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="cp-weekly-bar-caption">
                                    <span className="cp-weekly-caption-text">{weeklySummary.percentage}% complete</span>
                                    <span className={`cp-weekly-caption-badge ${weeklySummary.percentage >= 75 ? 'cp-weekly-good' : 'cp-weekly-warn'}`}>
                                        {weeklySummary.percentage >= 75 ? '🎯 Great job!' : '📚 Keep attending'}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── MANAGE TIMETABLE MODAL ── */}
            {showManageModal && (
                <div className="cp-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowManageModal(false)}>
                    <div className="cp-modal">
                        <div className="cp-modal-header">
                            <div className="cp-modal-title">Manage Class Timetable</div>
                            <button className="cp-modal-close" onClick={() => setShowManageModal(false)}><FiX size={18} /></button>
                        </div>
                        <div className="cp-modal-body">
                            {!classIdToManage ? (
                                <div className="cp-id-form">
                                    <div className="cp-id-icon">📚</div>
                                    <div className="cp-id-title">Enter Class Group ID</div>
                                    <div className="cp-id-sub">You can find the UUID in Django admin under Class Groups.</div>
                                    <label className="cp-id-label">Class Group ID (UUID)</label>
                                    <input type="text" value={manualClassId} onChange={e => setManualClassId(e.target.value)} placeholder="e.g., 27134bbe-..." className="cp-id-input" onKeyDown={(e) => e.key === 'Enter' && handleStartManaging()} />
                                    <button className="cp-btn cp-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={handleStartManaging}>Continue <FiChevronRight size={15} /></button>
                                    <button className="cp-id-cancel" onClick={() => setShowManageModal(false)}>Cancel</button>
                                </div>
                            ) : (
                                <TimetableManager classGroupId={classIdToManage} classGroupName="Selected Class" onClose={() => setShowManageModal(false)} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CLASS DETAIL MODAL ── */}
            {selectedClassDetail && (
                <div className="cp-modal-overlay" onClick={() => setSelectedClassDetail(null)}>
                    <div className="cp-modal" style={{ maxWidth: 500 }}>
                        <div className="cp-modal-header">
                            <div className="cp-modal-title">{selectedClassDetail.unit_name}</div>
                            <button className="cp-modal-close" onClick={() => setSelectedClassDetail(null)}><FiX size={18} /></button>
                        </div>
                        <div className="cp-modal-body">
                            <p className="text-sm"><strong>Time:</strong> {selectedClassDetail.start_time?.slice(0, 5)} – {selectedClassDetail.end_time?.slice(0, 5)}</p>
                            <p className="text-sm"><strong>Venue:</strong> {selectedClassDetail.venue}</p>
                            <p className="text-sm"><strong>Lecturer:</strong> {selectedClassDetail.lecturer || 'N/A'}</p>
                            {selectedClassDetail.latitude && selectedClassDetail.longitude && (
                                <button onClick={() => openDirections(selectedClassDetail.venue, selectedClassDetail.latitude, selectedClassDetail.longitude)} className="mt-2 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-3 py-1 rounded-lg">
                                    <FiExternalLink size={11} className="inline mr-1" /> Directions
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── STYLES (injected once) ──────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

  .cp-wrap * { box-sizing: border-box; }
  .cp-wrap { font-family: 'DM Sans', sans-serif; min-height: 100vh; position: relative; }

  .cp-bg {
    position: fixed; inset: 0; z-index: -2; overflow: hidden;
    background: linear-gradient(155deg, #eef2ff 0%, #f8faff 45%, #f0fdf4 100%);
    transition: background 0.4s;
  }
  .dark .cp-bg {
    background: linear-gradient(155deg, #060914 0%, #080c10 45%, #050d0a 100%);
  }
  .cp-blob {
    position: absolute; border-radius: 50%;
    filter: blur(100px); opacity: 0.22;
    animation: cpDrift 22s ease-in-out infinite alternate;
  }
  .dark .cp-blob { opacity: 0.11; }
  .cp-blob-1 {
    width: 680px; height: 680px;
    background: radial-gradient(circle, #6366f1 0%, transparent 70%);
    top: -220px; left: -160px; animation-duration: 24s;
  }
  .cp-blob-2 {
    width: 520px; height: 520px;
    background: radial-gradient(circle, #10b981 0%, transparent 70%);
    top: 30%; right: -180px; animation-duration: 30s; animation-delay: -10s;
  }
  .cp-blob-3 {
    width: 420px; height: 420px;
    background: radial-gradient(circle, #f59e0b 0%, transparent 70%);
    bottom: -60px; left: 30%; animation-duration: 26s; animation-delay: -6s;
  }
  @keyframes cpDrift {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(40px, 30px) scale(1.06); }
  }

  .cp-root {
    max-width: 1080px; margin: 0 auto;
    padding: 28px 20px 100px;
    animation: cpIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes cpIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cp-root > * {
    animation: cpIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .cp-root > *:nth-child(1) { animation-delay: 0s; }
  .cp-root > *:nth-child(2) { animation-delay: 0.05s; }
  .cp-root > *:nth-child(3) { animation-delay: 0.10s; }
  .cp-root > *:nth-child(4) { animation-delay: 0.15s; }
  .cp-root > *:nth-child(5) { animation-delay: 0.20s; }

  .cp-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; margin-bottom: 28px; flex-wrap: wrap;
  }
  .cp-header-title-block { flex: 1; min-width: 0; }
  .cp-page-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.1em; color: #6366f1;
    padding: 4px 12px; border-radius: 99px;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.18);
    margin-bottom: 8px;
  }
  .dark .cp-page-eyebrow { color: #818cf8; background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.2); }
  .cp-page-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: clamp(1.8rem, 4.5vw, 2.6rem);
    font-weight: 800; letter-spacing: -0.04em; line-height: 1.1;
    color: #0f172a; margin: 0 0 6px;
  }
  .dark .cp-page-title { color: #f1f5f9; }
  .cp-page-date {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.8rem; font-weight: 600; color: #64748b;
  }
  .dark .cp-page-date { color: #94a3b8; }
  .cp-header-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; flex-shrink: 0; }

  .cp-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 18px; border-radius: 12px; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700;
    cursor: pointer; transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    white-space: nowrap; text-decoration: none;
  }
  .cp-btn:hover { transform: translateY(-2px); }
  .cp-btn:active { transform: translateY(0) scale(0.97); }
  .cp-btn-cyan {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    color: #fff;
    box-shadow: 0 4px 14px rgba(6, 182, 212, 0.32);
  }
  .cp-btn-cyan:hover { box-shadow: 0 8px 20px rgba(6, 182, 212, 0.42); }
  .cp-btn-primary {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.32);
  }
  .cp-btn-primary:hover { box-shadow: 0 8px 20px rgba(99, 102, 241, 0.42); }
  .cp-btn-ghost {
    background: rgba(255,255,255, 0.75);
    color: #374151;
    border: 1px solid rgba(0,0,0, 0.08);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 8px rgba(0,0,0, 0.06);
  }
  .dark .cp-btn-ghost {
    background: rgba(255,255,255, 0.06);
    color: #d1d5db; border-color: rgba(255,255,255, 0.08);
  }
  .cp-btn-ghost:hover { background: rgba(255,255,255, 0.92); }
  .dark .cp-btn-ghost:hover { background: rgba(255,255,255, 0.1); }

  .cp-status-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 12px;
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.02em;
    backdrop-filter: blur(8px);
  }
  .cp-status-online  { background: rgba(16,185,129,0.1); color: #059669; border: 1px solid rgba(16,185,129,0.22); }
  .cp-status-offline { background: rgba(239,68,68,0.08);  color: #dc2626; border: 1px solid rgba(239,68,68,0.2);  }
  .dark .cp-status-online  { background: rgba(16,185,129,0.12); color: #34d399; }
  .dark .cp-status-offline { background: rgba(239,68,68,0.10);  color: #f87171; }

  .cp-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 24px;
  }
  @media (max-width: 640px) { .cp-stats { grid-template-columns: repeat(2, 1fr); } }

  .cp-stat {
    border-radius: 20px; padding: 18px 16px 16px;
    background: rgba(255,255,255, 0.82);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255, 0.8);
    box-shadow: 0 2px 14px rgba(0,0,0, 0.05), inset 0 1px 0 rgba(255,255,255, 0.95);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
    cursor: default; position: relative; overflow: hidden;
  }
  .cp-stat::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent, #6366f1);
    border-radius: 20px 20px 0 0;
  }
  .cp-stat:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 30px rgba(0,0,0, 0.08), inset 0 1px 0 rgba(255,255,255, 0.95);
  }
  .dark .cp-stat {
    background: rgba(15, 14, 25, 0.82);
    border-color: rgba(255,255,255, 0.06);
    box-shadow: 0 2px 14px rgba(0,0,0, 0.3), inset 0 1px 0 rgba(255,255,255, 0.03);
  }
  .dark .cp-stat:hover { box-shadow: 0 12px 30px rgba(0,0,0, 0.45); }
  .cp-stat-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent, #6366f1) 13%, transparent);
    margin-bottom: 12px;
  }
  .cp-stat-val {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 2rem; font-weight: 800;
    letter-spacing: -0.06em; line-height: 1;
    color: #0f172a;
  }
  .dark .cp-stat-val { color: #f8fafc; }
  .cp-stat-label {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #94a3b8; margin-top: 5px;
  }

  .cp-section-head {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: -0.02em;
    color: #6366f1; margin: 28px 0 16px;
  }
  .cp-section-head::after {
    content: ''; flex: 1; height: 1.5px;
    background: linear-gradient(90deg, rgba(99,102,241, 0.3) 0%, transparent 100%);
    border-radius: 99px;
  }
  .dark .cp-section-head { color: #818cf8; }

  .cp-class-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }

  .cp-class-card {
    border-radius: 20px; padding: 20px 22px;
    background: rgba(255,255,255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255, 0.85);
    box-shadow: 0 2px 16px rgba(0,0,0, 0.05), inset 0 1px 0 rgba(255,255,255, 0.95);
    transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s;
    position: relative; overflow: hidden;
  }
  .cp-class-card::before {
    content: ''; position: absolute;
    left: 0; top: 0; bottom: 0; width: 4px;
    background: var(--status-color, #94a3b8);
    transition: width 0.3s;
  }
  .cp-class-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 36px rgba(0,0,0, 0.09), inset 0 1px 0 rgba(255,255,255, 0.95);
  }
  .cp-class-card:hover::before { width: 6px; }
  .dark .cp-class-card {
    background: rgba(13, 13, 22, 0.88);
    border-color: rgba(255,255,255, 0.07);
    box-shadow: 0 2px 16px rgba(0,0,0, 0.35), inset 0 1px 0 rgba(255,255,255, 0.04);
  }
  .dark .cp-class-card:hover { box-shadow: 0 14px 36px rgba(0,0,0, 0.55); }

  .cp-class-card.state-marked  { --status-color: #10b981; background: rgba(236,253,245, 0.92); }
  .cp-class-card.state-open    { --status-color: #6366f1; }
  .cp-class-card.state-closed  { --status-color: #94a3b8; }
  .dark .cp-class-card.state-marked { background: rgba(5, 46, 22, 0.4); border-color: rgba(16,185,129,0.15); }

  .cp-card-inner { display: flex; align-items: flex-start; gap: 16px; }
  @media (max-width: 560px) { .cp-card-inner { flex-direction: column; } }

  .cp-time-badge {
    flex-shrink: 0; border-radius: 14px; padding: 10px 14px;
    background: rgba(99,102,241, 0.08); text-align: center;
    border: 1px solid rgba(99,102,241, 0.15); min-width: 72px;
  }
  .cp-time-start {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.1rem; font-weight: 800; color: #4f46e5;
    letter-spacing: -0.03em; line-height: 1;
  }
  .dark .cp-time-start { color: #818cf8; }
  .cp-time-end { font-size: 0.65rem; color: #94a3b8; font-weight: 600; margin-top: 3px; }
  .cp-class-card.state-marked .cp-time-badge { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.18); }
  .cp-class-card.state-marked .cp-time-start { color: #059669; }
  .dark .cp-class-card.state-marked .cp-time-start { color: #34d399; }

  .cp-card-body { flex: 1; min-width: 0; }
  .cp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
  .cp-card-unit {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.05rem; font-weight: 700; color: #0f172a;
    letter-spacing: -0.02em; line-height: 1.25;
  }
  .dark .cp-card-unit { color: #f1f5f9; }
  .cp-lecturer-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 8px;
    background: rgba(0,0,0, 0.04); border: 1px solid rgba(0,0,0, 0.06);
    font-size: 0.7rem; font-weight: 600; color: #64748b;
    white-space: nowrap; flex-shrink: 0;
  }
  .dark .cp-lecturer-badge { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.07); color: #94a3b8; }

  .cp-card-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.75rem; color: #64748b; margin-bottom: 10px; }
  .dark .cp-card-meta { color: #94a3b8; }
  .cp-card-meta span { display: flex; align-items: center; gap: 5px; }

  .cp-progress-wrap { margin-bottom: 10px; }
  .cp-progress-labels { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .cp-progress-track {
    height: 5px; border-radius: 99px;
    background: rgba(0,0,0, 0.06); overflow: hidden;
  }
  .dark .cp-progress-track { background: rgba(255,255,255, 0.08); }
  .cp-progress-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #f59e0b, #ef4444);
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    animation: progressShine 2s ease-in-out infinite;
  }
  @keyframes progressShine {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  .cp-progress-label { font-size: 0.66rem; font-weight: 700; color: #f59e0b; }

  .cp-card-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cp-offline-note {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.69rem; color: #ef4444; font-weight: 600;
  }
  .dark .cp-offline-note { color: #f87171; }

  .cp-status-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 10px;
    font-size: 0.78rem; font-weight: 700;
  }
  .cp-status-marked  { background: rgba(16,185,129,0.1);  color: #059669; border: 1px solid rgba(16,185,129,0.2); }
  .cp-status-closed  { background: rgba(148,163,184,0.1); color: #64748b; border: 1px solid rgba(148,163,184,0.15); }
  .dark .cp-status-marked { background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.2); }
  .dark .cp-status-closed { background: rgba(148,163,184,0.08); color: #94a3b8; }

  .cp-checkin-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 20px; border-radius: 11px; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 700;
    cursor: pointer; color: #fff;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    box-shadow: 0 4px 14px rgba(99,102,241, 0.35);
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .cp-checkin-btn:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 8px 22px rgba(99,102,241, 0.45);
  }
  .cp-checkin-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .cp-checkin-btn.with-gps { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
  .cp-checkin-btn.with-gps:hover:not(:disabled) { box-shadow: 0 8px 22px rgba(16,185,129,0.45); }
  .cp-sync-pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.66rem; font-weight: 700; color: #f59e0b;
    padding: 3px 8px; border-radius: 6px;
    background: rgba(245,158,11, 0.1); border: 1px solid rgba(245,158,11, 0.2);
    animation: syncPulse 1.5s ease-in-out infinite;
  }
  @keyframes syncPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

  .cp-nearby-section {
    border-radius: 20px; padding: 20px;
    background: rgba(255,255,255, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(6,182,212, 0.18);
    box-shadow: 0 4px 20px rgba(6,182,212, 0.08), inset 0 1px 0 rgba(255,255,255, 0.9);
    margin-bottom: 24px;
  }
  .dark .cp-nearby-section {
    background: rgba(8, 18, 24, 0.85);
    border-color: rgba(6,182,212, 0.15);
    box-shadow: 0 4px 20px rgba(0,0,0, 0.3);
  }
  .cp-nearby-head {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
  }
  .cp-nearby-title {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 0.95rem; font-weight: 700; color: #0f172a;
    letter-spacing: -0.02em;
  }
  .dark .cp-nearby-title { color: #f1f5f9; }
  .cp-nearby-list { display: flex; flex-direction: column; gap: 10px; }
  .cp-nearby-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; border-radius: 14px;
    background: rgba(6,182,212, 0.05); border: 1px solid rgba(6,182,212, 0.12);
    gap: 12px; transition: background 0.2s, transform 0.2s;
  }
  .cp-nearby-item:hover { background: rgba(6,182,212, 0.09); transform: translateX(3px); }
  .dark .cp-nearby-item { background: rgba(6,182,212, 0.06); border-color: rgba(6,182,212,0.1); }
  .cp-nearby-dot { width: 8px; height: 8px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 6px rgba(6,182,212,0.5); flex-shrink: 0; }
  .cp-nearby-info { flex: 1; min-width: 0; }
  .cp-nearby-name { font-size: 0.84rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dark .cp-nearby-name { color: #f1f5f9; }
  .cp-nearby-meta { font-size: 0.7rem; color: #64748b; margin-top: 2px; }
  .dark .cp-nearby-meta { color: #94a3b8; }
  .cp-nearby-dist {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.68rem; font-weight: 700; color: #0891b2;
    padding: 3px 8px; border-radius: 8px; background: rgba(6,182,212, 0.1);
    flex-shrink: 0;
  }
  .dark .cp-nearby-dist { color: #22d3ee; }
  .cp-dir-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 12px; border-radius: 9px; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 700;
    cursor: pointer; color: #fff; flex-shrink: 0;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    box-shadow: 0 2px 8px rgba(6,182,212, 0.3);
    transition: all 0.2s;
  }
  .cp-dir-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(6,182,212, 0.4); }

  .cp-empty {
    text-align: center; padding: 60px 20px;
    border-radius: 24px;
    background: rgba(255,255,255, 0.82);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255, 0.8);
    box-shadow: 0 4px 24px rgba(0,0,0, 0.05);
  }
  .dark .cp-empty { background: rgba(13,13,22,0.82); border-color: rgba(255,255,255,0.06); }
  .cp-empty-emoji { font-size: 3.5rem; margin-bottom: 14px; display: block; }
  .cp-empty-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;
  }
  .dark .cp-empty-title { color: #f1f5f9; }
  .cp-empty-sub { font-size: 0.85rem; color: #94a3b8; }

  .cp-weekly {
    border-radius: 24px; padding: 28px;
    background: rgba(255,255,255, 0.88);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255, 0.8);
    box-shadow: 0 4px 28px rgba(0,0,0, 0.06), inset 0 1px 0 rgba(255,255,255, 0.95);
    margin-top: 8px;
  }
  .dark .cp-weekly {
    background: rgba(10, 10, 20, 0.88);
    border-color: rgba(255,255,255, 0.06);
    box-shadow: 0 4px 28px rgba(0,0,0, 0.4);
  }
  .cp-weekly-head {
    display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
  }
  .cp-weekly-icon {
    width: 44px; height: 44px; border-radius: 14px;
    background: rgba(99,102,241, 0.1); display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(99,102,241, 0.15);
  }
  .cp-weekly-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.15rem; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;
  }
  .dark .cp-weekly-title { color: #f1f5f9; }
  .cp-weekly-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 22px; text-align: center; }
  @media (max-width: 480px) { .cp-weekly-grid { grid-template-columns: 1fr; gap: 10px; text-align: left; } }
  .cp-weekly-stat-val {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 2.4rem; font-weight: 800; letter-spacing: -0.06em; line-height: 1;
  }
  .cp-weekly-stat-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-top: 5px; }
  .cp-weekly-bar-track {
    height: 10px; border-radius: 99px;
    background: rgba(0,0,0, 0.06); overflow: hidden;
  }
  .dark .cp-weekly-bar-track { background: rgba(255,255,255, 0.08); }
  .cp-weekly-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #6366f1, #10b981);
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 12px rgba(99,102,241, 0.4);
  }
  .cp-weekly-bar-caption { display: flex; justify-content: space-between; margin-top: 6px; }
  .cp-weekly-caption-text { font-size: 0.72rem; font-weight: 600; color: #94a3b8; }
  .cp-weekly-caption-badge {
    font-size: 0.7rem; font-weight: 800; padding: 2px 10px; border-radius: 99px;
  }
  .cp-weekly-good { background: rgba(16,185,129,0.1); color: #059669; }
  .cp-weekly-warn { background: rgba(245,158,11,0.1); color: #d97706; }
  .dark .cp-weekly-good { background: rgba(16,185,129,0.12); color: #34d399; }
  .dark .cp-weekly-warn { background: rgba(245,158,11,0.1); color: #fbbf24; }

  .cp-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0, 0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 200; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: overlayIn 0.2s ease;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .cp-modal {
    background: rgba(255,255,255, 0.97);
    border-radius: 24px; box-shadow: 0 28px 80px rgba(0,0,0, 0.22);
    max-width: 800px; width: 100%; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: modalUp 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid rgba(255,255,255, 0.9);
  }
  .dark .cp-modal { background: rgba(10, 10, 20, 0.97); border-color: rgba(255,255,255, 0.07); }
  @keyframes modalUp { from{opacity:0;transform:translateY(30px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  .cp-modal-header {
    padding: 22px 24px 18px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(0,0,0, 0.06); flex-shrink: 0;
  }
  .dark .cp-modal-header { border-bottom-color: rgba(255,255,255, 0.06); }
  .cp-modal-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em;
  }
  .dark .cp-modal-title { color: #f1f5f9; }
  .cp-modal-close {
    width: 36px; height: 36px; border-radius: 10px; border: none;
    background: rgba(0,0,0, 0.05); color: #64748b;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .cp-modal-close:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
  .dark .cp-modal-close { background: rgba(255,255,255, 0.06); color: #94a3b8; }
  .dark .cp-modal-close:hover { background: rgba(239,68,68, 0.1); color: #f87171; }
  .cp-modal-body { flex: 1; overflow-y: auto; padding: 24px; }
  .cp-modal-body::-webkit-scrollbar { width: 6px; }
  .cp-modal-body::-webkit-scrollbar-track { background: transparent; }
  .cp-modal-body::-webkit-scrollbar-thumb { background: rgba(0,0,0, 0.12); border-radius: 99px; }
  .dark .cp-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255, 0.1); }

  .cp-id-form { max-width: 440px; margin: 0 auto; text-align: center; }
  .cp-id-icon { font-size: 3.5rem; margin-bottom: 14px; }
  .cp-id-title { font-family:'Bricolage Grotesque',sans-serif; font-size:1.3rem; font-weight:700; color:#0f172a; margin-bottom:6px; }
  .dark .cp-id-title { color:#f1f5f9; }
  .cp-id-sub { font-size:.82rem; color:#94a3b8; margin-bottom:22px; line-height:1.55; }
  .cp-id-label { display:block; text-align:left; font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#64748b; margin-bottom:7px; }
  .dark .cp-id-label { color:#94a3b8; }
  .cp-id-input {
    width:100%; padding:11px 16px; border-radius:12px;
    border:1.5px solid rgba(0,0,0,.1); background:rgba(255,255,255,.8);
    font-family:'DM Sans',sans-serif; font-size:.85rem; color:#0f172a;
    outline:none; transition:border-color .2s, box-shadow .2s; margin-bottom:16px;
  }
  .dark .cp-id-input { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.1); color:#f1f5f9; }
  .cp-id-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
  .cp-id-input::placeholder { color:#94a3b8; }
  .cp-id-cancel { display:block; width:100%; padding:10px; border:none; background:transparent; font-size:.82rem; color:#94a3b8; cursor:pointer; margin-top:8px; transition:color .15s; }
  .cp-id-cancel:hover { color:#ef4444; }

  @keyframes cpSpin { to { transform: rotate(360deg); } }
  .cp-spin { animation: cpSpin 0.8s linear infinite; }
`;