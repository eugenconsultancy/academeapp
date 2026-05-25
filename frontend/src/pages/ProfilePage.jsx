import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '@/api/client';
import { accountsApi } from '@/api/accountsApi';
import { blogApi } from '@/api/blogApi';
import { foundItemsApi } from '@/api/foundItemsApi';
import { classesApi } from '@/api/classesApi';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import {
  FiUser, FiMail, FiPhone, FiBook, FiMapPin, FiShield,
  FiEdit3, FiCamera, FiLogOut, FiTrash2, FiDownload,
  FiChevronRight, FiKey, FiSmartphone, FiMonitor, FiClock,
  FiAward, FiActivity, FiHeart, FiStar, FiTrendingUp,
  FiBell, FiBarChart2, FiPackage, FiBookOpen,
  FiUserCheck, FiHelpCircle, FiInfo, FiFileText,
} from 'react-icons/fi';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
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

  // ---------- Dynamic stats (with queries) ----------
  const { data: myPosts } = useQuery({
    queryKey: ['my-blog-posts-count'],
    queryFn: async () => {
      const res = await blogApi.getMyPosts();
      return Array.isArray(res) ? res : (res.data || []);
    },
    enabled: !!user,
  });

  const { data: myItems } = useQuery({
    queryKey: ['my-found-items-count'],
    queryFn: async () => {
      const res = await foundItemsApi.getMyItems();
      return Array.isArray(res) ? res : (res.data || []);
    },
    enabled: !!user,
  });

  const { data: weeklySummary } = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const res = await classesApi.getWeeklySummary();
      return res.data || res;
    },
    enabled: !!user,
  });

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    ?.toUpperCase() ?? '?';

  const profilePicUrl = user?.profile_pic
    ? (user.profile_pic.startsWith('http')
      ? user.profile_pic
      : `${apiClient.defaults.baseURL}${user.profile_pic}`)
    : null;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await accountsApi.updateProfile(formData);
      updateUser(response.data);
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const response = await accountsApi.uploadProfilePic(file);
      updateUser(response.data.user);
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await accountsApi.deleteAccount();
      toast.success('Account deactivated');
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

  const badges = user?.badges || [];
  const badgeColors = {
    login_bronze: 'from-amber-700 to-amber-600',
    login_silver: 'from-gray-400 to-gray-300',
    login_gold: 'from-yellow-500 to-yellow-400',
    high_engager: 'from-pink-500 to-pink-400',
  };

  const postCount = myPosts?.length ?? 0;
  const itemCount = myItems?.length ?? 0;
  const attendanceRate = weeklySummary?.percentage ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Profile Header Card */}
        <Card className="p-6 md:p-8 border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group cursor-pointer">
              <label className="cursor-pointer">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={user?.full_name || 'User Profile'}
                    className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-700"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}

                <div
                  className="w-28 h-28 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg"
                  style={{ display: profilePicUrl ? 'none' : 'flex' }}
                >
                  {initials}
                </div>

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
            <Link to="/blog/my-posts" className="text-center p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors">
              <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                {postCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Posts</p>
            </Link>
            <Link to="/found-items/my-listings" className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {itemCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Items Listed</p>
            </Link>
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
            <Link
              to="/profile/edit"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
            >
              <FiEdit3 size={14} />
              Edit
            </Link>
          </div>

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
            {attendanceRate !== null && (
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FiBarChart2 size={14} /> Weekly Attendance
                </span>
                <span className="font-medium text-green-600">{attendanceRate}%</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <FiClock size={14} /> Last Login
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'New Account'}
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Links Card */}
        <Card className="p-6 border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiActivity size={18} /> Account Actions
          </h2>
          <div className="space-y-2">

            {/* Two-Factor Authentication */}
            <Link
              to="/profile/2fa"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FiShield size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enhance your account security</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* Biometric Enrollment */}
            <Link
              to="/profile/biometrics"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <FiUserCheck size={18} className="text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Biometric Login</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Set up face recognition</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

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
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Reset Password</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Change your password via OTP</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <FiBell size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">View all your notifications</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* Attendance Summary */}
            <Link
              to="/classes/attendance"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FiBarChart2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Attendance Summary</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Track your class attendance</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* My Blog Posts */}
            <Link
              to="/blog/my-posts"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <FiBookOpen size={18} className="text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">My Blog Posts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{postCount} published</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            {/* My Found Items */}
            <Link
              to="/found-items/my-listings"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <FiPackage size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">My Found Items</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{itemCount} listed</p>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Download your data</p>
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

            {/* Support & Legal */}
            <Link
              to="/contact"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                  <FiHelpCircle size={18} className="text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Help & Support</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Contact us</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            <Link
              to="/privacy"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/30 flex items-center justify-center">
                  <FiFileText size={18} className="text-gray-500 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Privacy Policy</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>

            <Link
              to="/about"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/30 flex items-center justify-center">
                  <FiInfo size={18} className="text-gray-500 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">About Academe</p>
                </div>
              </div>
              <FiChevronRight size={18} className="text-gray-400" />
            </Link>
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