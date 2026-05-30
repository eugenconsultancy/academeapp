import { useState, useEffect } from 'react';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiUserPlus, FiX, FiSearch } from 'react-icons/fi';

const ROLES = [
    { value: 'class_rep', label: 'Class Representative' },
    { value: 'faculty_rep', label: 'Faculty Representative' },
    { value: 'student_leader', label: 'Student Leader' },
];

const SCOPE_TYPES = {
    class_rep: 'class',
    faculty_rep: 'faculty',
    student_leader: 'institution',
};

export default function RoleAssignmentModal({ onClose, onAssigned }) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [role, setRole] = useState('class_rep');
    const [scopeName, setScopeName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Debounced search
    useEffect(() => {
        const delay = setTimeout(() => {
            if (searchQuery.length >= 2) {
                searchStudents();
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const searchStudents = async () => {
        setLoading(true);
        try {
            const response = await accountsApi.searchStudents(searchQuery);
            setSearchResults(response.data || response);
        } catch (err) {
            toast.error('Failed to search students');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser || !role || !scopeName || !startDate || !endDate) {
            toast.error('All fields are required');
            return;
        }
        if (new Date(startDate) >= new Date(endDate)) {
            toast.error('End date must be after start date');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                user_id: selectedUser.id,
                role: role,
                scope_type: SCOPE_TYPES[role],
                scope_id: crypto.randomUUID(), // In real app, fetch actual class/department ID
                scope_name: scopeName,
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
            };
            const response = await accountsApi.assignRole(payload);
            toast.success(`Role assigned to ${selectedUser.full_name}`);
            onAssigned?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Assignment failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FiUserPlus /> Assign Leadership Role
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><FiX /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User Search */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Search Student</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Name or admission number"
                                className="w-full pl-10 pr-3 py-2 border rounded-lg"
                            />
                        </div>
                        {loading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
                        {searchResults.length > 0 && !selectedUser && (
                            <ul className="mt-2 border rounded-lg divide-y max-h-48 overflow-auto">
                                {searchResults.map(s => (
                                    <li key={s.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setSelectedUser(s)}>
                                        {s.full_name} ({s.class_name})
                                    </li>
                                ))}
                            </ul>
                        )}
                        {selectedUser && (
                            <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex justify-between items-center">
                                <span>{selectedUser.full_name} ({selectedUser.class_name})</span>
                                <button type="button" onClick={() => setSelectedUser(null)} className="text-red-500"><FiX /></button>
                            </div>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded-lg">
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {/* Scope Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Scope (e.g., Class Name, Faculty)</label>
                        <input type="text" value={scopeName} onChange={(e) => setScopeName(e.target.value)} className="w-full p-2 border rounded-lg" required />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-xl">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50">
                            {submitting ? 'Assigning...' : 'Assign Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}