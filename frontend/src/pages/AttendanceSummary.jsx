import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { classesApi } from '../api/classesApi';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiArrowLeft, FiHome, FiBook, FiChevronRight,
    FiChevronLeft, FiRefreshCw, FiDownload, FiCalendar,
    FiTrendingUp, FiTarget, FiCheckCircle, FiXCircle,
    FiClock, FiBarChart2, FiActivity, FiStar,
} from 'react-icons/fi';

function getWeekDates(date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Sunday
    return { start, end };
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AttendanceSummary() {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1);
        return d.toISOString().split('T')[0];
    });

    const weekDates = getWeekDates(new Date(currentWeekStart));
    const isCurrentWeek = new Date().toISOString().split('T')[0] >= currentWeekStart &&
        new Date().toISOString().split('T')[0] <= new Date(new Date(currentWeekStart).getTime() + 6 * 86400000).toISOString().split('T')[0];

    const { data: summary, isLoading, refetch } = useQuery({
        queryKey: ['weekly-summary', currentWeekStart],
        queryFn: async () => {
            const response = await classesApi.getWeeklySummary(currentWeekStart);
            return response.data || response;
        },
    });

    const navigateWeek = (direction) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + direction * 7);
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };

    const getDayColor = (marked, total) => {
        if (total === 0) return '#94a3b8';
        const pct = (marked / total) * 100;
        if (pct >= 75) return '#10b981';
        if (pct >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const getDayIcon = (marked, total) => {
        if (total === 0) return null;
        const pct = (marked / total) * 100;
        if (pct >= 75) return FiCheckCircle;
        if (pct >= 50) return FiClock;
        return FiXCircle;
    };

    const attendanceRate = summary?.percentage || 0;

    if (isLoading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto">
                    <SkeletonLoader type="page" />
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .as-root { font-family: 'Outfit', sans-serif; max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; animation: asIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes asIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .as-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .as-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }

        .as-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .as-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .as-header h1 { color: #f8fafc; }
        .as-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: transparent; font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; text-decoration: none; }
        .as-btn:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .as-btn { border-color: #334155; color: #94a3b8; }

        .as-week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
        .as-week-nav button { width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.15s; }
        .as-week-nav button:hover { background: rgba(99,102,241,0.06); border-color: #6366f1; }
        .dark .as-week-nav button { border-color: #334155; color: #94a3b8; }
        .as-week-label { font-size: 0.9rem; font-weight: 700; color: #0f172a; min-width: 200px; text-align: center; }
        .dark .as-week-label { color: #f8fafc; }
        .as-week-badge { font-size: 0.65rem; padding: 3px 8px; border-radius: 99px; background: rgba(16,185,129,0.1); color: #059669; font-weight: 700; }

        .as-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 24px; }
        .as-stat { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 18px; text-align: center; backdrop-filter: blur(12px); }
        .dark .as-stat { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .as-stat-value { font-size: 1.8rem; font-weight: 900; }
        .as-stat-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
        .as-stat-icon { margin-bottom: 8px; }

        .as-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 20px; padding: 24px; backdrop-filter: blur(20px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06); margin-bottom: 16px; }
        .dark .as-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        .as-progress-bar { height: 10px; border-radius: 99px; background: #e2e8f0; overflow: hidden; margin: 12px 0; }
        .dark .as-progress-bar { background: #334155; }
        .as-progress-fill { height: 100%; border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

        .as-day-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
        .dark .as-day-row { border-bottom-color: rgba(255,255,255,0.04); }
        .as-day-label { width: 40px; font-size: 0.8rem; font-weight: 700; color: #64748b; }
        .as-day-bar-wrap { flex: 1; height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
        .dark .as-day-bar-wrap { background: #334155; }
        .as-day-bar { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
        .as-day-count { width: 50px; text-align: right; font-size: 0.8rem; font-weight: 700; color: #64748b; }
        .as-day-icon { width: 24px; text-align: center; }

        .as-goal-line { position: relative; }
        .as-goal-marker { position: absolute; top: -8px; width: 2px; height: 26px; background: #6366f1; border-radius: 2px; }
        .as-goal-label { position: absolute; top: -22px; font-size: 0.6rem; font-weight: 700; color: #6366f1; transform: translateX(-50%); white-space: nowrap; }

        .as-empty { text-align: center; padding: 48px 24px; color: #94a3b8; }
      `}</style>

            <div className="as-root">
                {/* Breadcrumb */}
                <nav className="as-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/classes"><FiBook size={13} /> Classes</Link>
                    <FiChevronRight size={12} />
                    <span>Attendance</span>
                </nav>

                {/* Header */}
                <div className="as-header">
                    <div>
                        <h1>Attendance Summary</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Track your class attendance over time
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => refetch()} className="as-btn"><FiRefreshCw size={14} /> Refresh</button>
                        <Link to="/classes" className="as-btn"><FiArrowLeft size={14} /> Back to Classes</Link>
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="as-week-nav">
                    <button onClick={() => navigateWeek(-1)}><FiChevronLeft size={16} /></button>
                    <span className="as-week-label">
                        {formatDate(weekDates.start)} – {formatDate(weekDates.end)}
                        {isCurrentWeek && <span className="as-week-badge" style={{ marginLeft: 8 }}>This Week</span>}
                    </span>
                    <button onClick={() => navigateWeek(1)}><FiChevronRight size={16} /></button>
                </div>

                {summary ? (
                    <>
                        {/* Stats Grid */}
                        <div className="as-stats">
                            <div className="as-stat">
                                <div className="as-stat-icon"><FiCalendar size={20} style={{ color: '#6366f1' }} /></div>
                                <div className="as-stat-value" style={{ color: '#6366f1' }}>{summary.total_classes || 0}</div>
                                <div className="as-stat-label">Total Classes</div>
                            </div>
                            <div className="as-stat">
                                <div className="as-stat-icon"><FiCheckCircle size={20} style={{ color: '#10b981' }} /></div>
                                <div className="as-stat-value" style={{ color: '#10b981' }}>{summary.marked_count || 0}</div>
                                <div className="as-stat-label">Attended</div>
                            </div>
                            <div className="as-stat">
                                <div className="as-stat-icon"><FiXCircle size={20} style={{ color: '#ef4444' }} /></div>
                                <div className="as-stat-value" style={{ color: '#ef4444' }}>{(summary.total_classes || 0) - (summary.marked_count || 0)}</div>
                                <div className="as-stat-label">Missed</div>
                            </div>
                            <div className="as-stat">
                                <div className="as-stat-icon"><FiTarget size={20} style={{ color: '#f59e0b' }} /></div>
                                <div className="as-stat-value" style={{ color: attendanceRate >= 75 ? '#10b981' : attendanceRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                                    {attendanceRate}%
                                </div>
                                <div className="as-stat-label">Rate (Goal: 75%)</div>
                            </div>
                        </div>

                        {/* Overall Progress */}
                        <div className="as-card">
                            <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiBarChart2 size={18} style={{ color: '#6366f1' }} /> Overall Progress
                            </h3>
                            <div className="as-progress-bar as-goal-line" style={{ position: 'relative' }}>
                                <div className="as-progress-fill" style={{
                                    width: `${Math.min(100, attendanceRate)}%`,
                                    background: attendanceRate >= 75
                                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                                        : attendanceRate >= 50
                                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                            : 'linear-gradient(90deg, #ef4444, #f87171)'
                                }} />
                                <div className="as-goal-marker" style={{ left: '75%' }} />
                                <div className="as-goal-label" style={{ left: '75%' }}>75% Goal</div>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 16, textAlign: 'center' }}>
                                {attendanceRate >= 75 ? '🎯 Great job! You\'re above the attendance goal.' :
                                    attendanceRate >= 50 ? '📚 Keep going! You\'re getting close to the goal.' :
                                        '⚠️ You\'re below the recommended attendance rate. Try to attend more classes.'}
                            </p>
                        </div>

                        {/* Daily Breakdown */}
                        <div className="as-card">
                            <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiActivity size={18} style={{ color: '#6366f1' }} /> Daily Breakdown
                            </h3>
                            {Object.keys(summary.daily_breakdown || {}).length > 0 ? (
                                Object.entries(summary.daily_breakdown || {}).map(([date, data]) => {
                                    const pct = data.total > 0 ? (data.marked / data.total) * 100 : 0;
                                    const DayIcon = getDayIcon(data.marked, data.total);
                                    const color = getDayColor(data.marked, data.total);
                                    return (
                                        <div key={date} className="as-day-row">
                                            <span className="as-day-label">
                                                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                            </span>
                                            <span className="as-day-icon" style={{ color }}>
                                                {DayIcon && <DayIcon size={16} />}
                                            </span>
                                            <div className="as-day-bar-wrap">
                                                <div className="as-day-bar" style={{ width: `${pct}%`, background: color }} />
                                            </div>
                                            <span className="as-day-count">{data.marked}/{data.total}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="as-empty">
                                    <FiCalendar size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                    <p style={{ fontWeight: 600 }}>No daily breakdown available</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Data will appear as you attend classes.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="as-empty" style={{ padding: 64 }}>
                        <FiBarChart2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>No attendance data</p>
                        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Start marking attendance to see your summary.</p>
                        <Link to="/classes" className="as-btn" style={{ marginTop: 20, display: 'inline-flex', color: '#6366f1', borderColor: '#6366f1', padding: '10px 20px' }}>
                            Go to Classes
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}