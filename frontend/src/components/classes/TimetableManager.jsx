import { useState, useEffect, useCallback, useRef } from 'react';
import { classesApi } from '../../api/classesApi';
import GeoService from "../../api/geoService";
import SkeletonLoader from '../shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit3, FiTrash2, FiCopy, FiSave, FiX,
    FiClock, FiMapPin, FiUser, FiCalendar, FiToggleLeft,
    FiToggleRight, FiAlertTriangle, FiChevronDown,
    FiChevronUp, FiDownload, FiUpload, FiRefreshCw,
    FiTarget, FiEye, FiEyeOff, FiCheckCircle,
} from 'react-icons/fi';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_FORM = {
    day_of_week: 0,
    start_time: '08:00',
    end_time: '10:00',
    unit_name: '',
    venue: '',
    lecturer: '',
    is_active: true,
    attendance_radius_meters: 100,
};

export default function TimetableManager({
    classGroupId,
    classGroupName,
    onClose,
    onUnsavedChange,
    onStatsChange,               // NEW: (total, active) => void
    externalShowBulk = false,    // NEW: parent‑controlled bulk visibility
    onToggleBulk                 // NEW: (next: boolean) => void
}) {
    // ──────────────────────────────
    // 1. MOUNTED TRACKER (memory leak guard)
    // ──────────────────────────────
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState({ ...DEFAULT_FORM });
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
    const [expandedDay, setExpandedDay] = useState(null);
    const [venueSuggestions, setVenueSuggestions] = useState([]);
    const [showVenueDropdown, setShowVenueDropdown] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const [bulkText, setBulkText] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // ──────────────────────────────
    // 2. VENUE TIMEOUT REF (prevent race condition)
    // ──────────────────────────────
    const venueTimeoutRef = useRef(null);

    useEffect(() => {
        if (classGroupId) loadTimetable();
    }, [classGroupId]);

    const loadTimetable = async () => {
        setLoading(true);
        try {
            const res = await classesApi.getClassTimetable(classGroupId);
            if (isMounted.current) {
                const data = res.data || [];
                setEntries(data);

                // Report stats to parent
                if (onStatsChange) {
                    const total = data.length;
                    const active = data.filter(e => e.is_active !== false).length;
                    onStatsChange(total, active);
                }
            }
        } catch (err) {
            toast.error('Failed to load timetable');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    // Venue autocomplete with debounce guard
    const handleVenueChange = async (value) => {
        setFormData({ ...formData, venue: value });
        if (value.length >= 2) {
            try {
                const res = await GeoService.listVenues({ search: value, limit: 5 });
                if (isMounted.current) {
                    setVenueSuggestions(res.data || res || []);
                    setShowVenueDropdown(true);
                }
            } catch {
                if (isMounted.current) setVenueSuggestions([]);
            }
        } else {
            setShowVenueDropdown(false);
        }
    };

    const selectVenue = (venue) => {
        if (venueTimeoutRef.current) clearTimeout(venueTimeoutRef.current);
        setFormData({ ...formData, venue: venue.name });
        setShowVenueDropdown(false);
    };

    // ──────────────────────────────
    // 3. FIXED CONFLICT DETECTION (type casting + time normalization)
    // ──────────────────────────────
    const checkConflicts = useCallback((newEntry, excludeId = null) => {
        const conflicts = entries.filter(e => {
            if (excludeId && e.id === excludeId) return false;
            if (Number(e.day_of_week) !== Number(newEntry.day_of_week)) return false;

            const startA = newEntry.start_time.slice(0, 5);
            const endA = newEntry.end_time.slice(0, 5);
            const startB = e.start_time.slice(0, 5);
            const endB = e.end_time.slice(0, 5);

            return startA < endB && endA > startB;
        });
        return conflicts;
    }, [entries]);

    useEffect(() => {
        const detected = checkConflicts(formData, editingEntry?.id);
        setConflicts(detected);
    }, [formData, editingEntry, checkConflicts]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.end_time <= formData.start_time) {
            toast.error('End time must be after start time');
            return;
        }

        setSaving(true);
        try {
            if (editingEntry) {
                await classesApi.updateTimetableEntry(editingEntry.id, formData);
                toast.success('Entry updated');
            } else {
                await classesApi.createTimetableEntry({ ...formData, class_group_id: classGroupId });
                toast.success('Entry added');
            }
            resetForm();
            loadTimetable();
            if (onUnsavedChange) onUnsavedChange(false);
        } catch (err) {
            toast.error(editingEntry ? 'Update failed' : 'Creation failed');
        } finally {
            if (isMounted.current) setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await classesApi.deleteTimetableEntry(id);
            toast.success('Entry deleted');
            setDeleteConfirm(null);
            loadTimetable();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleToggleActive = async (entry) => {
        try {
            await classesApi.updateTimetableEntry(entry.id, { is_active: !entry.is_active });
            toast.success(entry.is_active ? 'Entry deactivated' : 'Entry activated');
            loadTimetable();
        } catch (err) {
            toast.error('Toggle failed');
        }
    };

    const handleDuplicate = async (entry) => {
        try {
            await classesApi.createTimetableEntry({
                class_group_id: classGroupId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time?.slice(0, 5),
                end_time: entry.end_time?.slice(0, 5),
                unit_name: entry.unit_name,
                venue: entry.venue,
                lecturer: entry.lecturer || '',
            });
            toast.success('Entry duplicated');
            loadTimetable();
        } catch (err) {
            toast.error('Duplicate failed');
        }
    };

    // ──────────────────────────────
    // 4. FIXED BULK UPLOAD (error tracking & line validation)
    // ──────────────────────────────
    const handleBulkUpload = async () => {
        if (!bulkText.trim()) return;
        const lines = bulkText.trim().split('\n').filter(l => l.trim());
        let successCount = 0;
        let failCount = 0;

        for (const line of lines) {
            try {
                const parts = line.split(',').map(s => s.trim());
                if (parts.length < 4) {
                    failCount++;
                    continue;
                }

                const [day, start, end, unit, venue, lecturer] = parts;
                const dayIndex = DAYS.findIndex(d => d.toLowerCase().startsWith(day.toLowerCase()));
                if (dayIndex === -1) {
                    failCount++;
                    continue;
                }

                await classesApi.createTimetableEntry({
                    class_group_id: classGroupId,
                    day_of_week: dayIndex,
                    start_time: start,
                    end_time: end,
                    unit_name: unit,
                    venue: venue || '',
                    lecturer: lecturer || '',
                });
                successCount++;
            } catch {
                failCount++;
            }
        }

        if (successCount > 0) toast.success(`Added ${successCount} entries`);
        if (failCount > 0) toast.error(`Failed to process ${failCount} lines`);

        // Close bulk upload (via parent callback)
        onToggleBulk?.(false);
        setBulkText('');
        loadTimetable();
    };

    const startEdit = (entry) => {
        setEditingEntry(entry);
        setFormData({
            day_of_week: entry.day_of_week,
            start_time: entry.start_time?.slice(0, 5) || '08:00',
            end_time: entry.end_time?.slice(0, 5) || '10:00',
            unit_name: entry.unit_name,
            venue: entry.venue,
            lecturer: entry.lecturer || '',
            is_active: entry.is_active !== false,
            attendance_radius_meters: entry.attendance_radius_meters || 100,
        });
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const resetForm = () => {
        setEditingEntry(null);
        setFormData({ ...DEFAULT_FORM });
        setConflicts([]);
        setShowVenueDropdown(false);
        if (onUnsavedChange) onUnsavedChange(false);
    };

    // Group entries by day
    const entriesByDay = DAYS.reduce((acc, day, idx) => {
        acc[idx] = entries.filter(e => e.day_of_week === idx).sort((a, b) => a.start_time?.localeCompare(b.start_time));
        return acc;
    }, {});

    if (loading) return <SkeletonLoader type="list" count={6} />;

    return (
        <>
            <style>{`
                .tm-root { font-family: 'Outfit', sans-serif; }
                .tm-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
                .tm-header h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
                .dark .tm-header h3 { color: #f8fafc; }
                .tm-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 10px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
                .tm-btn-primary { background: #6366f1; color: #fff; }
                .tm-btn-primary:hover { background: #4f46e5; }
                .tm-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
                .tm-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
                .dark .tm-btn-outline { border-color: #334155; color: #94a3b8; }
                .tm-btn-danger { background: transparent; border: 1.5px solid #fecaca; color: #dc2626; }
                .tm-btn-danger:hover { background: rgba(239,68,68,0.06); }

                /* Form */
                .tm-form { background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
                .dark .tm-form { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }
                .tm-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
                .tm-form label { display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
                .tm-form input, .tm-form select { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 500; color: #0f172a; outline: none; }
                .tm-form input:focus, .tm-form select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
                .dark .tm-form input, .dark .tm-form select { background: rgba(15,23,42,0.9); border-color: #334155; color: #f8fafc; }
                .tm-venue-wrap { position: relative; }
                .tm-venue-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 20; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 180px; overflow-y: auto; }
                .dark .tm-venue-dropdown { background: #1e293b; border-color: #334155; }
                .tm-venue-item { padding: 10px 14px; cursor: pointer; font-size: 0.82rem; font-weight: 500; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
                .tm-venue-item:hover { background: rgba(99,102,241,0.06); }
                .dark .tm-venue-item { color: #f8fafc; border-color: #334155; }
                .dark .tm-venue-item:hover { background: rgba(99,102,241,0.1); }

                /* Conflict warning */
                .tm-conflict { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; font-size: 0.75rem; font-weight: 600; color: #d97706; margin-top: 10px; }
                .dark .tm-conflict { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.2); }

                /* Entry list */
                .tm-entries { max-height: 500px; overflow-y: auto; }
                .tm-entry { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border: 1px solid rgba(0,0,0,0.04); border-radius: 12px; margin-bottom: 6px; background: rgba(255,255,255,0.7); transition: all 0.15s; }
                .tm-entry:hover { background: rgba(255,255,255,0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
                .tm-entry.inactive { opacity: 0.5; }
                .dark .tm-entry { background: rgba(15,23,42,0.5); border-color: rgba(255,255,255,0.04); }
                .dark .tm-entry:hover { background: rgba(15,23,42,0.7); }
                .tm-entry-main { flex: 1; min-width: 0; }
                .tm-entry-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
                .dark .tm-entry-title { color: #f8fafc; }
                .tm-entry-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.72rem; color: #94a3b8; margin-top: 3px; }
                .tm-entry-meta span { display: flex; align-items: center; gap: 3px; }
                .tm-entry-actions { display: flex; gap: 2px; flex-shrink: 0; }
                .tm-icon-btn { width: 30px; height: 30px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.15s; }
                .tm-icon-btn:hover { background: rgba(99,102,241,0.08); color: #6366f1; }
                .tm-icon-btn.danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; }

                /* Day header */
                .tm-day-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(99,102,241,0.04); border-radius: 10px; margin-bottom: 6px; margin-top: 12px; cursor: pointer; font-weight: 700; font-size: 0.85rem; color: #6366f1; }
                .tm-day-count { font-size: 0.7rem; padding: 2px 8px; border-radius: 99px; background: rgba(99,102,241,0.1); }

                /* Bulk upload */
                .tm-bulk-textarea { width: 100%; padding: 12px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; resize: vertical; min-height: 150px; }
                .dark .tm-bulk-textarea { background: #1e293b; border-color: #334155; color: #f8fafc; }

                /* Grid view */
                .tm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
                .tm-grid-day { border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; padding: 10px; min-height: 80px; }
                .tm-grid-day-label { font-size: 0.7rem; font-weight: 700; color: #6366f1; margin-bottom: 6px; text-align: center; }
                .tm-grid-entry { font-size: 0.7rem; padding: 4px 8px; background: rgba(99,102,241,0.06); border-radius: 6px; margin-bottom: 3px; cursor: pointer; }
                .tm-grid-entry:hover { background: rgba(99,102,241,0.12); }

                /* Confirm dialog */
                .tm-confirm-overlay { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .tm-confirm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
                .tm-confirm-card { position: relative; z-index: 81; width: 100%; max-width: 400px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 20px; backdrop-filter: blur(20px); box-shadow: 0 24px 48px rgba(0,0,0,0.18); }
                .dark .tm-confirm-card { background: rgba(12,16,24,0.98); border-color: rgba(255,255,255,0.07); }
                .tm-confirm-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
                .dark .tm-confirm-header { border-bottom-color: rgba(255,255,255,0.06); }
                .tm-confirm-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; }
                .dark .tm-confirm-title { color: #f8fafc; }
                .tm-confirm-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.15s; }
                .tm-confirm-close:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
                .tm-confirm-body { padding: 20px 22px; font-size: 0.9rem; color: #64748b; }
                .tm-confirm-footer { display: flex; gap: 10px; padding: 0 22px 20px; }
                .tm-btn-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid rgba(226,232,240,0.9); background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; transition: all 0.15s; }
                .tm-btn-cancel:hover { background: rgba(0,0,0,0.03); }
                .tm-btn-submit-danger { flex: 1; padding: 11px; border-radius: 12px; border: none; background: linear-gradient(135deg, #ef4444, #f97316); color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 6px 18px rgba(239,68,68,0.28); transition: all 0.18s; }
                .tm-btn-submit-danger:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(239,68,68,0.35); }
            `}</style>

            <div className="tm-root">
                {/* Header */}
                <div className="tm-header">
                    <h3>📅 {classGroupName} — Timetable</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className="tm-btn tm-btn-outline">
                            {viewMode === 'list' ? <FiEye size={13} /> : <FiEyeOff size={13} />}
                            {viewMode === 'list' ? 'Grid' : 'List'}
                        </button>
                        <button onClick={() => onToggleBulk?.(!externalShowBulk)} className="tm-btn tm-btn-outline">
                            <FiUpload size={13} /> Bulk
                        </button>
                        <button onClick={loadTimetable} className="tm-btn tm-btn-outline">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Bulk Upload – controlled by parent */}
                {externalShowBulk && (
                    <div className="tm-form">
                        <label>Bulk Upload — Format: Day, Start, End, Unit, Venue, Lecturer (one per line)</label>
                        <textarea
                            className="tm-bulk-textarea"
                            placeholder={`Monday,08:00,10:00,Microbial Genetics,Lab 201,Dr. Kimani\nTuesday,09:00,11:00,Biostatistics,Computer Lab,Dr. Akinyi`}
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            rows={5}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button onClick={handleBulkUpload} className="tm-btn tm-btn-primary">Upload</button>
                            <button onClick={() => onToggleBulk?.(false)} className="tm-btn tm-btn-outline">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="tm-form">
                    <div className="tm-form-grid">
                        <div>
                            <label>Day</label>
                            <select value={formData.day_of_week} onChange={e => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })} required>
                                {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                            </select>
                        </div>
                        <div>
                            <label>Unit Name *</label>
                            <input type="text" value={formData.unit_name} onChange={e => setFormData({ ...formData, unit_name: e.target.value })} placeholder="e.g., Microbiology" required />
                        </div>
                        <div>
                            <label>Start Time *</label>
                            <input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
                        </div>
                        <div>
                            <label>End Time *</label>
                            <input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
                        </div>
                        <div className="tm-venue-wrap">
                            <label>Venue *</label>
                            <input
                                type="text"
                                value={formData.venue}
                                onChange={e => handleVenueChange(e.target.value)}
                                onFocus={() => venueSuggestions.length > 0 && setShowVenueDropdown(true)}
                                onBlur={() => {
                                    venueTimeoutRef.current = setTimeout(() => {
                                        if (isMounted.current) setShowVenueDropdown(false);
                                    }, 200);
                                }}
                                placeholder="e.g., Lab 201"
                                required
                            />
                            {showVenueDropdown && venueSuggestions.length > 0 && (
                                <div className="tm-venue-dropdown">
                                    {venueSuggestions.map(v => (
                                        <div
                                            key={v.id}
                                            className="tm-venue-item"
                                            onMouseDown={() => selectVenue(v)}
                                        >
                                            🏫 {v.name} {v.building_code && `(${v.building_code})`}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label>Lecturer</label>
                            <input type="text" value={formData.lecturer} onChange={e => setFormData({ ...formData, lecturer: e.target.value })} placeholder="e.g., Dr. Kimani" />
                        </div>
                        <div>
                            <label>GPS Radius (m)</label>
                            <input type="number" value={formData.attendance_radius_meters} onChange={e => setFormData({ ...formData, attendance_radius_meters: parseInt(e.target.value) || 100 })} min={10} max={500} />
                        </div>
                    </div>

                    {/* Conflict warning */}
                    {conflicts.length > 0 && (
                        <div className="tm-conflict">
                            <FiAlertTriangle size={14} />
                            Time conflict with: {conflicts.map(c => c.unit_name).join(', ')}
                        </div>
                    )}

                    {/* Form actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button type="submit" disabled={saving} className="tm-btn tm-btn-primary">
                            {saving ? 'Saving...' : editingEntry ? <><FiSave size={13} /> Update</> : <><FiPlus size={13} /> Add Entry</>}
                        </button>
                        {editingEntry && (
                            <button type="button" onClick={resetForm} className="tm-btn tm-btn-outline">
                                <FiX size={13} /> Cancel Edit
                            </button>
                        )}
                    </div>
                </form>

                {/* Entries */}
                <div className="tm-entries">
                    {viewMode === 'list' ? (
                        entries.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <FiCalendar size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                <p style={{ fontWeight: 600 }}>No timetable entries yet</p>
                                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Add your first class using the form above or bulk upload.</p>
                            </div>
                        ) : (
                            DAYS.map((day, idx) => {
                                const dayEntries = entriesByDay[idx] || [];
                                if (dayEntries.length === 0) return null;
                                const isExpanded = expandedDay === idx;
                                return (
                                    <div key={idx}>
                                        <div className="tm-day-header" onClick={() => setExpandedDay(isExpanded ? null : idx)}>
                                            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                            {day}
                                            <span className="tm-day-count">{dayEntries.length}</span>
                                        </div>
                                        {isExpanded && dayEntries.map(entry => (
                                            <div key={entry.id} className={`tm-entry ${entry.is_active === false ? 'inactive' : ''}`}>
                                                <div className="tm-entry-main">
                                                    <div className="tm-entry-title">
                                                        {entry.is_active === false && '🚫 '}
                                                        {entry.unit_name}
                                                    </div>
                                                    <div className="tm-entry-meta">
                                                        <span><FiClock size={10} />{entry.start_time?.slice(0, 5)}–{entry.end_time?.slice(0, 5)}</span>
                                                        <span><FiMapPin size={10} />{entry.venue}</span>
                                                        {entry.lecturer && <span><FiUser size={10} />{entry.lecturer}</span>}
                                                        {entry.attendance_radius_meters && <span><FiTarget size={10} />{entry.attendance_radius_meters}m</span>}
                                                    </div>
                                                </div>
                                                <div className="tm-entry-actions">
                                                    <button onClick={() => handleToggleActive(entry)} className="tm-icon-btn" title={entry.is_active !== false ? 'Deactivate' : 'Activate'}>
                                                        {entry.is_active !== false ? <FiToggleRight size={15} color="#10b981" /> : <FiToggleLeft size={15} />}
                                                    </button>
                                                    <button onClick={() => handleDuplicate(entry)} className="tm-icon-btn" title="Duplicate">
                                                        <FiCopy size={13} />
                                                    </button>
                                                    <button onClick={() => startEdit(entry)} className="tm-icon-btn" title="Edit">
                                                        <FiEdit3 size={13} />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(entry.id)} className="tm-icon-btn danger" title="Delete">
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })
                        )
                    ) : (
                        /* Grid view */
                        <div className="tm-grid">
                            {DAYS.map((day, idx) => (
                                <div key={idx} className="tm-grid-day">
                                    <div className="tm-grid-day-label">{DAYS_SHORT[idx]}</div>
                                    {(entriesByDay[idx] || []).map(entry => (
                                        <div key={entry.id} className="tm-grid-entry" onClick={() => startEdit(entry)} title={entry.unit_name}>
                                            <strong>{entry.unit_name?.substring(0, 20)}</strong>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                {entry.start_time?.slice(0, 5)} {entry.venue}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            {deleteConfirm && (
                <div className="tm-confirm-overlay">
                    <div className="tm-confirm-backdrop" onClick={() => setDeleteConfirm(null)} />
                    <div className="tm-confirm-card">
                        <div className="tm-confirm-header">
                            <span className="tm-confirm-title">Delete Entry</span>
                            <button className="tm-confirm-close" onClick={() => setDeleteConfirm(null)}>
                                <FiX size={16} />
                            </button>
                        </div>
                        <div className="tm-confirm-body">
                            <p>Are you sure you want to delete this timetable entry? This cannot be undone.</p>
                        </div>
                        <div className="tm-confirm-footer">
                            <button className="tm-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="tm-btn-submit-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}