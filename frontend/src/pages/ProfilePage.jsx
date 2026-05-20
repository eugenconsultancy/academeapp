import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/accountsApi';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import {
  FiUser, FiMail, FiPhone, FiBook, FiMapPin, FiShield,
  FiEdit3, FiCamera, FiLogOut, FiTrash2, FiDownload,
  FiChevronRight, FiKey, FiSmartphone, FiMonitor, FiClock,
  FiAward, FiActivity, FiHeart, FiStar, FiTrendingUp,
} from 'react-icons/fi';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    class_name: user?.class_name || '',
  });
  const [loading, setLoading] = useState(false);

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')?.toUpperCase() ?? '?';

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await accountsApi.updateProfile(formData);
      toast.success('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setUploading(true);
    try {
      await accountsApi.uploadProfilePic(file);
      toast.success('Profile picture updated!');
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await accountsApi.deleteAccount();
      toast.success('Account deactivated successfully');
      logout();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to deactivate account');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await accountsApi.exportData();
      toast.success(response.data?.message || 'Data export started!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const isAdmin = user?.role === 'admin';
  const isLeader = isAdmin || ['student_leader', 'faculty_rep', 'class_rep'].includes(user?.role);

  // Badge display
  const badges = user?.badges || [];
  const badgeColors = {
    login_bronze: 'from-amber-700 to-amber-600',
    login_silver: 'from-gray-400 to-gray-300',
    login_gold: 'from-yellow-500 to-yellow-400',
    high_engager: 'from-pink-500 to-pink-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card className="p-6 md:p-8 border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group cursor-pointer">
              <label className="cursor-pointer">
                {user?.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt={user.full_name}
                    className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-700"
                  />
                ) : (
                  <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium flex items-center gap-1">
                    <FiCamera size={14} />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleImageUpload}
                  accept="image/*"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {user?.full_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
                <FiBook size={14} /> {user?.class_name || 'No class set'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm flex items-center justify-center sm:justify-start gap-1 mt-1">
                <FiMapPin size={12} /> {user?.institution || 'No institution'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold capitalize">
                  {user?.role?.replace(/_/g, ' ') || 'Student'}
                </span>
                {isLeader && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                    Leadership
                  </span>
                )}
                {user?.is_online && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {user?.login_count || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Logins</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {badges.length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Badges</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20">
              <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                {user?.total_likes_given || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Likes Given</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">0</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Posts</p>
            </div>
          </div>

          {/* Badges Section */}
          {badges.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <FiAward size={16} /> Badges Earned
              </h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 bg-gradient-to-r ${badgeColors[badge] || 'from-gray-500 to-gray-400'} text-white rounded-full text-xs font-bold shadow-sm`}
                  >
                    {badge.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Profile Information Card */}
        <Card className="p-6 border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiUser size={18} /> Profile Information
            </h2>
            <button
              onClick={() => {
                setEditing(!editing);
                if (editing) {
                  setFormData({
                    full_name: user?.full_name || '',
                    email: user?.email || '',
                    class_name: user?.class_name || '',
                  });
                }
              }}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
            >
              <FiEdit3 size={14} />
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class / Year
                </label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 3rd Year Microbiology"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      full_name: user?.full_name || '',
                      email: user?.email || '',
                      class_name: user?.class_name || '',
                    });
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FiPhone size={14} /> Phone
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{user?.phone_number || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FiShield size={14} /> Admission No.
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{user?.admission_number || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FiMail size={14} /> Email
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{user?.email || 'Not set'}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Links Card */}
        <Card className="p-6 border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiActivity size={18} /> Account Actions
          </h2>
          <div className="space-y-2">
            {/* Sessions */}
            <Link
              to="/sessions"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FiMonitor size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Active Sessions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage your logged-in devices</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* Change Password */}
            <Link
              to="/forgot-password"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <FiKey size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Change Password</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* Export Data */}
            <button
              onClick={handleExportData}
              className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FiDownload size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm text-left">Export My Data</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Download your data as JSON or CSV</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </button>

            {/* Governance (Leaders only) */}
            {isLeader && (
              <Link
                to="/governance"
                className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <FiTrendingUp size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Governance Dashboard</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View platform statistics & roles</p>
                  </div>
                </div>
                <FiChevronRight size={18} className="text-gray-400" />
              </Link>
            )}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-l-4 border-l-red-500">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <FiTrash2 size={18} /> Danger Zone
          </h2>

          <button
            onClick={logout}
            className="w-full py-3 mb-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <FiLogOut size={16} /> Sign Out
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Deactivate Account
            </button>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <p className="text-sm text-red-700 dark:text-red-400 mb-3 font-medium">
                Are you sure? This will deactivate your account. You can contact support to reactivate it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                >
                  Yes, Deactivate
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}