import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { classesApi } from '../api/classesApi';
import TimetableManager from '../components/classes/TimetableManager';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiAlertCircle, FiHelpCircle, FiArrowLeft, FiBook,
    FiUsers, FiBarChart2, FiDownload, FiUpload,
    FiCalendar, FiAlertTriangle, FiPlus, FiCopy,
    FiEye, FiEyeOff, FiRefreshCw, FiCheckCircle,
    FiXCircle, FiClock, FiMapPin,
} from 'react-icons/fi';

export default function ManageTimetablePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [classGroup, setClassGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [manualClassId, setManualClassId] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [activeTab, setActiveTab] = useState('timetable'); // timetable | attendance | students | exceptions
    const [attendanceData, setAttendanceData] = useState(null);
    const [studentsList, setStudentsList] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        fetchRepresentedClass();
    }, [user]);

    const fetchRepresentedClass = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const res = await classesApi.getRepresentedClass();
            setClassGroup(res.data || res);
            setManualMode(false);
        } catch (err) {
            console.warn('Auto fetch failed, manual mode available', err);
            setError('Could not automatically detect your class. Please enter the class ID manually.');
            setManualMode(true);
        } finally {
            setLoading(false);
        }
    };

    // Fetch tab-specific data
    const fetchTabData = useCallback(async (tab) => {
        if (!classGroup?.id) return;
        setTabLoading(true);
        try {
            switch (tab) {
                case 'attendance':
                    const attRes = await classesApi.getClassAttendance(classGroup.id);
                    setAttendanceData(attRes.data);
                    break;
                case 'students':
                    // This would need a dedicated endpoint
                    setStudentsList([]);
                    break;
                case 'exceptions':
                    const excRes = await classesApi.listExceptions({ class_group_id: classGroup.id });
                    setExceptions(excRes.data || []);
                    break;
                default:
                    break;
            }
        } catch (err) {
            console.error(`Failed to fetch ${tab} data:`, err);
            toast.error(`Failed to load ${tab} data`);
        } finally {
            setTabLoading(false);
        }
    }, [classGroup]);

    useEffect(() => {
        if (classGroup?.id && activeTab !== 'timetable') {
            fetchTabData(activeTab);
        }
    }, [activeTab, classGroup, fetchTabData]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualClassId.trim()) return;
        setClassGroup({ id: manualClassId.trim(), name: 'Manual Class' });
        setManualMode(false);
        setError(null);
    };

    const handleExport = () => {
        toast.success('Export started (feature coming soon)');
    };

    const handleBulkUpload = () => {
        toast('Bulk upload feature coming soon', { icon: '📋' });
    };

    const tabs = [
        { id: 'timetable', label: 'Timetable', icon: FiClock },
        { id: 'attendance', label: 'Attendance', icon: FiBarChart2 },
        { id: 'exceptions', label: 'Exceptions', icon: FiAlertTriangle },
        { id: 'students', label: 'Students', icon: FiUsers },
    ];

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-5xl mx-auto">
                    <SkeletonLoader type="page" />
                </div>
            </div>
        );
    }

    // No class assigned
    if (!classGroup && !manualMode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <Card className="p-8 text-center shadow-xl border-0 animate-fadeIn">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <FiAlertCircle className="w-10 h-10 text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">No Class Assigned</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You are not listed as a class representative for any class. Contact your faculty officer to be assigned.
                        </p>
                        <button
                            onClick={() => setManualMode(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <FiHelpCircle /> Enter Class ID Manually
                        </button>
                    </Card>
                </div>
            </div>
        );
    }

    // Manual mode
    if (manualMode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
                <div className="max-w-md mx-auto">
                    <Card className="p-6 shadow-xl border-0 animate-slideUp">
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Manage Timetable</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Enter the Class Group ID to manage its timetable.
                        </p>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                                <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Group ID (UUID)</label>
                                <input
                                    type="text"
                                    value={manualClassId}
                                    onChange={(e) => setManualClassId(e.target.value)}
                                    placeholder="e.g., 27134bbe-5e06-47ea-8cf6-c825f9324dd6"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Find the ID in Django admin → Class Groups → copy the UUID from the URL.
                                </p>
                            </div>
                            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all">
                                Continue
                            </button>
                            <button
                                type="button"
                                onClick={() => { setManualMode(false); fetchRepresentedClass(); }}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2"
                            >
                                ← Go back and try auto‑detect again
                            </button>
                        </form>
                    </Card>
                </div>
            </div>
        );
    }

    // Success state
    return (
        <>
            <style>{`
        .mt-root {
          font-family: 'Outfit', sans-serif;
          max-width: 1100px; margin: 0 auto;
          padding: 28px 20px 80px;
          animation: mtIn .4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes mtIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .mt-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
        }
        .mt-title h1 {
          font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900;
          letter-spacing: -0.04em; color: #0f172a; margin-bottom: 4px;
        }
        .mt-title p { font-size: 0.83rem; color: #94a3b8; font-weight: 500; }
        .dark .mt-title h1 { color: #f8fafc; }

        .mt-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .mt-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 12px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 0.82rem;
          font-weight: 600; cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }
        .mt-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .mt-btn-primary:hover { background: #4f46e5; transform: translateY(-1px); }
        .mt-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .mt-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .mt-btn-outline { border-color: #334155; color: #94a3b8; }
        .mt-btn-back { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; }
        .mt-btn-back:hover { background: rgba(0,0,0,0.04); color: #0f172a; }

        /* Tabs */
        .mt-tabs {
          display: flex; gap: 4px; margin-bottom: 20px;
          background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.05);
          border-radius: 14px; padding: 4px; backdrop-filter: blur(12px);
        }
        .dark .mt-tabs { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.05); }
        .mt-tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 16px; border-radius: 11px; border: none;
          background: transparent; cursor: pointer;
          font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600;
          color: #64748b; transition: all 0.15s;
        }
        .mt-tab:hover { color: #0f172a; background: rgba(99,102,241,0.04); }
        .mt-tab.active { background: #6366f1; color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .dark .mt-tab { color: #94a3b8; }
        .dark .mt-tab:hover { color: #f8fafc; }
        .mt-tab-badge { font-size: 0.65rem; padding: 2px 7px; border-radius: 99px; background: rgba(239,68,68,0.1); color: #dc2626; font-weight: 700; }

        /* Stats mini row */
        .mt-stats-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px; margin-bottom: 20px;
        }
        .mt-stat-card {
          background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.05);
          border-radius: 14px; padding: 16px; text-align: center;
          backdrop-filter: blur(12px);
        }
        .dark .mt-stat-card { background: rgba(15,23,42,0.8); border-color: rgba(255,255,255,0.05); }
        .mt-stat-value { font-size: 1.6rem; font-weight: 900; color: #6366f1; }
        .mt-stat-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 4px; }

        /* Content card */
        .mt-content-card {
          background: rgba(255,255,255,0.9); border: 1px solid rgba(0,0,0,0.05);
          border-radius: 20px; padding: 24px; backdrop-filter: blur(16px);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
        }
        .dark .mt-content-card { background: rgba(12,16,24,0.9); border-color: rgba(255,255,255,0.05); }
      `}</style>

            <div className="mt-root">
                {/* Header */}
                <div className="mt-header">
                    <div>
                        <button onClick={() => navigate(-1)} className="mt-btn-back">
                            <FiArrowLeft size={16} /> Back
                        </button>
                        <div className="mt-title" style={{ marginTop: 8 }}>
                            <h1>Manage Timetable</h1>
                            <p>{classGroup.name || 'Selected Class'} — Class Representative Dashboard</p>
                        </div>
                    </div>
                    <div className="mt-actions">
                        <button onClick={handleExport} className="mt-btn mt-btn-outline">
                            <FiDownload size={15} /> Export
                        </button>
                        <button onClick={handleBulkUpload} className="mt-btn mt-btn-outline">
                            <FiUpload size={15} /> Bulk Upload
                        </button>
                        <button onClick={() => navigate('/nearby-classes')} className="mt-btn mt-btn-outline">
                            <FiMapPin size={15} /> Venues
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-stats-row">
                    <div className="mt-stat-card">
                        <div className="mt-stat-value">{classGroup.total_entries || '-'}</div>
                        <div className="mt-stat-label">Total Slots</div>
                    </div>
                    <div className="mt-stat-card">
                        <div className="mt-stat-value">{classGroup.active_entries || '-'}</div>
                        <div className="mt-stat-label">Active</div>
                    </div>
                    <div className="mt-stat-card">
                        <div className="mt-stat-value" style={{ color: '#10b981' }}>
                            {attendanceData?.attendance_rate ? `${attendanceData.attendance_rate}%` : '-'}
                        </div>
                        <div className="mt-stat-label">Attendance Rate</div>
                    </div>
                    <div className="mt-stat-card">
                        <div className="mt-stat-value">{studentsList.length || '-'}</div>
                        <div className="mt-stat-label">Students</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`mt-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                            {tab.id === 'exceptions' && exceptions.length > 0 && (
                                <span className="mt-tab-badge">{exceptions.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="mt-content-card">
                    {tabLoading ? (
                        <SkeletonLoader type="list" count={4} />
                    ) : (
                        <>
                            {activeTab === 'timetable' && (
                                <TimetableManager
                                    classGroupId={classGroup.id}
                                    classGroupName={classGroup.name}
                                    onClose={() => navigate(-1)}
                                    onUnsavedChange={setHasUnsavedChanges}
                                />
                            )}

                            {activeTab === 'attendance' && (
                                <AttendanceTab data={attendanceData} classGroupId={classGroup.id} />
                            )}

                            {activeTab === 'exceptions' && (
                                <ExceptionsTab
                                    exceptions={exceptions}
                                    classGroupId={classGroup.id}
                                    onRefresh={() => fetchTabData('exceptions')}
                                />
                            )}

                            {activeTab === 'students' && (
                                <StudentsTab students={studentsList} classGroupName={classGroup.name} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

/* ─── Tab Sub-Components ─────────────────────── */

function AttendanceTab({ data, classGroupId }) {
    if (!data) {
        return (
            <div className="text-center py-12 text-gray-500">
                <FiBarChart2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No attendance data available</p>
                <p className="text-sm mt-1">Attendance records will appear here once students start checking in.</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Class Attendance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.total_students || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Students</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{data.present_today || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Present Today</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{data.absent_today || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Absent Today</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{data.attendance_rate || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">Weekly Rate</p>
                </div>
            </div>
            {/* Progress bar */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${data.attendance_rate || 0}%` }}
                />
            </div>
        </div>
    );
}

function ExceptionsTab({ exceptions, classGroupId, onRefresh }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Session Exceptions</h3>
                <button className="mt-btn mt-btn-primary">
                    <FiPlus size={14} /> Add Exception
                </button>
            </div>
            {exceptions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FiCheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="font-medium">No exceptions</p>
                    <p className="text-sm mt-1">All classes are running as scheduled.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {exceptions.map(exc => (
                        <div key={exc.id} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{exc.unit_name}</p>
                                <p className="text-sm text-gray-500">{exc.reason} • {exc.date}</p>
                            </div>
                            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold">
                                {exc.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StudentsTab({ students, classGroupName }) {
    if (students.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Student list not available</p>
                <p className="text-sm mt-1">This feature requires the class roster endpoint.</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Students in {classGroupName} ({students.length})
            </h3>
            <div className="space-y-2">
                {students.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {s.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{s.full_name}</p>
                            <p className="text-xs text-gray-500">{s.admission_number}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}