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
    const [manualMode, setManualMode] = useState(false);
    const [availableGroups, setAvailableGroups] = useState([]); // for dropdown
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [activeTab, setActiveTab] = useState('timetable');
    const [attendanceData, setAttendanceData] = useState(null);
    const [studentsList, setStudentsList] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [timetableStats, setTimetableStats] = useState({ total: 0, active: 0 });
    const [showBulkUpload, setShowBulkUpload] = useState(false);

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
            if (user.role === 'admin') {
                // Admin: fetch all class groups so we can auto-select the first one
                const res = await classesApi.listClassGroups();
                const groups = res.data || res;
                if (groups && groups.length > 0) {
                    setClassGroup(groups[0]);   // automatically select the first
                    setManualMode(false);
                } else {
                    // If no groups, show manual dropdown (which would be empty)
                    setError('No class groups exist yet. Please create one in the admin panel.');
                    setManualMode(true);
                }
            } else {
                // Class rep – auto-detect via existing endpoint
                const res = await classesApi.getRepresentedClass();
                setClassGroup(res.data || res);
                setManualMode(false);
            }
        } catch (err) {
            console.warn('Auto fetch failed, manual mode available', err);
            if (user.role !== 'admin') {
                setError('Could not automatically detect your class. Please select your class group.');
                setManualMode(true);
            } else {
                // For admins, we already have the list (if API works) or will fetch on manual entry
                setError('Failed to load class groups. You can select one below.');
                setManualMode(true);
            }
            // In any case, fetch the full list for the dropdown
            fetchAvailableGroups();
        } finally {
            setLoading(false);
        }
    };

    // Fetch all class groups for the dropdown (admin) – also works for class reps if they have multiple?
    const fetchAvailableGroups = async () => {
        try {
            const res = await classesApi.listClassGroups();
            setAvailableGroups(res.data || res);
        } catch {
            setAvailableGroups([]);
        }
    };

    // When entering manual mode, populate the dropdown
    useEffect(() => {
        if (manualMode) {
            fetchAvailableGroups();
        }
    }, [manualMode]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!selectedGroupId) return;
        const selected = availableGroups.find(g => g.id === selectedGroupId);
        if (selected) {
            setClassGroup({ id: selected.id, name: selected.name });
            setManualMode(false);
            setError(null);
        } else {
            toast.error('Please select a valid class group.');
        }
    };

    const handleExport = () => {
        toast.success('Export started (feature coming soon)');
    };

    const handleBulkUploadToggle = () => {
        setShowBulkUpload((prev) => !prev);
    };

    const handleStatsUpdate = useCallback((total, active) => {
        setTimetableStats({ total, active });
    }, []);

    const tabs = [
        { id: 'timetable', label: 'Timetable', icon: FiClock },
        { id: 'attendance', label: 'Attendance', icon: FiBarChart2, disabled: true },
        { id: 'exceptions', label: 'Exceptions', icon: FiAlertTriangle, disabled: true },
        { id: 'students', label: 'Students', icon: FiUsers, disabled: true },
    ];

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-5xl mx-auto">
                    <SkeletonLoader type="page" />
                </div>
            </div>
        );
    }

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
                            {user.role === 'admin'
                                ? 'No class groups exist. Create one in the admin panel first.'
                                : 'You are not listed as a class representative for any class. Contact your faculty officer to be assigned.'}
                        </p>
                        <button
                            onClick={() => setManualMode(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <FiHelpCircle /> Select Class Group
                        </button>
                    </Card>
                </div>
            </div>
        );
    }

    if (manualMode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
                <div className="max-w-md mx-auto">
                    <Card className="p-6 shadow-xl border-0 animate-slideUp">
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Select Class Group</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Choose the class group you want to manage.
                        </p>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                                <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Group</label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">-- Select a class group --</option>
                                    {availableGroups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name} ({group.institution})
                                        </option>
                                    ))}
                                </select>
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

    return (
        <>
            <style>{`
        .mt-root { font-family: 'Outfit', sans-serif; max-width: 1100px; margin: 0 auto; padding: 28px 20px 80px; animation: mtIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes mtIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .mt-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .mt-title h1 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; margin-bottom: 4px; }
        .mt-title p { font-size: 0.83rem; color: #94a3b8; font-weight: 500; }
        .dark .mt-title h1 { color: #f8fafc; }
        .mt-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .mt-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .mt-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .mt-btn-primary:hover { background: #4f46e5; transform: translateY(-1px); }
        .mt-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .mt-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .mt-btn-outline { border-color: #334155; color: #94a3b8; }
        .mt-btn-back { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; }
        .mt-btn-back:hover { background: rgba(0,0,0,0.04); color: #0f172a; }
        .mt-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 4px; backdrop-filter: blur(12px); }
        .dark .mt-tabs { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.05); }
        .mt-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; border-radius: 11px; border: none; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; transition: all 0.15s; }
        .mt-tab:hover { color: #0f172a; background: rgba(99,102,241,0.04); }
        .mt-tab.active { background: #6366f1; color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .dark .mt-tab { color: #94a3b8; }
        .dark .mt-tab:hover { color: #f8fafc; }
        .mt-tab.disabled { opacity: 0.4; cursor: not-allowed; }
        .mt-tab-badge { font-size: 0.65rem; padding: 2px 7px; border-radius: 99px; background: rgba(239,68,68,0.1); color: #dc2626; font-weight: 700; }
        .mt-stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .mt-stat-card { background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 16px; text-align: center; backdrop-filter: blur(12px); }
        .dark .mt-stat-card { background: rgba(15,23,42,0.8); border-color: rgba(255,255,255,0.05); }
        .mt-stat-value { font-size: 1.6rem; font-weight: 900; color: #6366f1; }
        .mt-stat-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
        .mt-content-card { background: rgba(255,255,255,0.9); border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 24px; backdrop-filter: blur(16px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06); }
        .dark .mt-content-card { background: rgba(12,16,24,0.9); border-color: rgba(255,255,255,0.05); }

        /* Additional fix for select options in dark mode */
        select.dark-select {
          background-color: #1e293b;
          color: #f8fafc;
        }
        select.dark-select option {
          background-color: #1e293b;
          color: #f8fafc;
        }
        .dark select {
          background-color: #1e293b;
          color: #f8fafc;
        }
        .dark select option {
          background-color: #1e293b;
          color: #f8fafc;
        }
      `}</style>

            <div className="mt-root">
                <div className="mt-header">
                    <div>
                        <button onClick={() => navigate('/classes')} className="mt-btn-back">
                            <FiArrowLeft size={16} /> Classes
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
                        <button onClick={handleBulkUploadToggle} className="mt-btn mt-btn-outline">
                            <FiUpload size={15} /> Bulk Upload
                        </button>
                        <button onClick={() => navigate('/campus-map')} className="mt-btn mt-btn-outline">
                            <FiMapPin size={15} /> Venues
                        </button>
                    </div>
                </div>

                <div className="mt-stats-row">
                    <div className="mt-stat-card">
                        <div className="mt-stat-value">{timetableStats.total || '-'}</div>
                        <div className="mt-stat-label">Total Slots</div>
                    </div>
                    <div className="mt-stat-card">
                        <div className="mt-stat-value">{timetableStats.active || '-'}</div>
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

                <div className="mt-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`mt-tab ${activeTab === tab.id ? 'active' : ''}${tab.disabled ? ' disabled' : ''}`}
                            onClick={() => { if (!tab.disabled) setActiveTab(tab.id); }}
                            disabled={tab.disabled}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                            {tab.id === 'exceptions' && exceptions.length > 0 && (
                                <span className="mt-tab-badge">{exceptions.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-content-card">
                    {activeTab === 'timetable' && (
                        <TimetableManager
                            classGroupId={classGroup.id}
                            classGroupName={classGroup.name}
                            onClose={() => navigate(-1)}
                            onUnsavedChange={setHasUnsavedChanges}
                            onStatsChange={handleStatsUpdate}
                            externalShowBulk={showBulkUpload}
                            onToggleBulk={setShowBulkUpload}
                        />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab data={attendanceData} classGroupId={classGroup.id} />
                    )}
                    {activeTab === 'exceptions' && (
                        <ExceptionsTab
                            exceptions={exceptions}
                            classGroupId={classGroup.id}
                            onRefresh={() => { }}
                        />
                    )}
                    {activeTab === 'students' && (
                        <StudentsTab students={studentsList} classGroupName={classGroup.name} />
                    )}
                </div>
            </div>
        </>
    );
}

/* ─── Tab Sub-Components ─────────────────────── */

function AttendanceTab({ data, classGroupId }) {
    return (
        <div className="text-center py-12 text-gray-500">
            <FiBarChart2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Attendance feature is coming soon</p>
            <p className="text-sm mt-1">This tab will show detailed class attendance once the endpoint is ready.</p>
        </div>
    );
}

function ExceptionsTab({ exceptions, classGroupId, onRefresh }) {
    return (
        <div className="text-center py-12 text-gray-500">
            <FiAlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Exceptions management is coming soon</p>
            <p className="text-sm mt-1">This feature will be available in a future update.</p>
        </div>
    );
}

function StudentsTab({ students, classGroupName }) {
    return (
        <div className="text-center py-12 text-gray-500">
            <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Student roster is coming soon</p>
            <p className="text-sm mt-1">You'll be able to view and manage students here.</p>
        </div>
    );
}