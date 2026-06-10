// C:\Users\GATARA-BJTU\academe\frontend\src\App.jsx
import { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import FAB from './components/layout/FAB';
import SkeletonLoader from './components/shared/SkeletonLoader';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { useChatStore } from './stores/useChatStore';

// ═══════════════════════════════════════════════════════════════
// LAZY-LOADED PAGES
// ═══════════════════════════════════════════════════════════════
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const AnnouncementDetailPage = lazy(() => import('./pages/AnnouncementDetailPage'));
const AnnouncementRequestsPage = lazy(() => import('./pages/AnnouncementRequestsPage'));
const CreateAnnouncementRequestPage = lazy(() => import('./pages/CreateAnnouncementRequestPage'));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));
const OpportunityDetailPage = lazy(() => import('./pages/OpportunityDetailPage'));
const CreateOpportunityPage = lazy(() => import('./pages/CreateOpportunityPage'));
const EditOpportunityPage = lazy(() => import('./pages/EditOpportunityPage'));
const FoundItemsPage = lazy(() => import('./pages/FoundItemsPage'));
const FoundItemDetailPage = lazy(() => import('./pages/FoundItemDetailPage'));
const PostFoundItem = lazy(() => import('./pages/PostFoundItem'));
const ClaimDetail = lazy(() => import('./pages/ClaimDetail'));
const ClaimListPage = lazy(() => import('./pages/ClaimListPage'));
const MyFoundItemsPage = lazy(() => import('./pages/MyFoundItemsPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const AttendanceSummary = lazy(() => import('./pages/AttendanceSummary'));
const AttendanceDetail = lazy(() => import('./pages/AttendanceDetail'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const CreateBlog = lazy(() => import('./pages/CreateBlog'));
const EditBlogPage = lazy(() => import('./pages/EditBlogPage'));
const MyBlogPostsPage = lazy(() => import('./pages/MyBlogPostsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const TwoFactorSetupPage = lazy(() => import('./pages/TwoFactorSetupPage'));
const BiometricEnrollmentPage = lazy(() => import('./pages/BiometricEnrollmentPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminAuditLogsPage = lazy(() => import('./pages/AdminAuditLogsPage'));
const AdminRolesPage = lazy(() => import('./pages/AdminRolesPage'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
const NearbyClassesPage = lazy(() => import('./pages/NearbyClassesPage'));
const CampusMapPage = lazy(() => import('./pages/CampusMapPage'));
const VenueDetailPage = lazy(() => import('./pages/VenueDetailPage'));
const GovernanceDashboard = lazy(() => import('./pages/GovernanceDashboard'));
const GovernanceStats = lazy(() => import('./pages/GovernanceStats'));
const ManageTimetablePage = lazy(() => import('./pages/ManageTimetablePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const ResourceUploadPage = lazy(() => import('./pages/ResourceUploadPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// ── Support Pages ──────────────────────────────────────────
const MyTicketsPage = lazy(() => import('./pages/MyTicketsPage'));
const AdminTicketsPage = lazy(() => import('./pages/AdminTicketsPage'));
// ── New Chat Pages ────────────────────────────────────────
const ChatsPage = lazy(() => import('./pages/ChatsPage'));
const ChatDetail = lazy(() => import('./pages/ChatDetail'));

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const MOBILE_BREAKPOINT = 768;
const SIDEBAR_BREAKPOINT = 1024;

const ROUTE_TITLES = {
  '/': 'Home',
  '/login': 'Sign In',
  '/signup': 'Create Account',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/announcements': 'Announcements',
  '/opportunities': 'Opportunities',
  '/found-items': 'Found Items',
  '/classes': 'My Classes',
  '/nearby-classes': 'Nearby Classes',
  '/campus-map': 'Campus Map',
  '/blog': 'Blog',
  '/profile': 'My Profile',
  '/profile/edit': 'Edit Profile',
  '/profile/biometrics': 'Biometric Security',
  '/profile/2fa': 'Two-Factor Authentication',
  '/two-factor-setup': 'Two-Factor Authentication',
  '/sessions': 'Active Sessions',
  '/contact': 'Contact Us',
  '/about': 'About',
  '/privacy': 'Privacy Policy',
  '/admin': 'Admin Dashboard',
  '/governance': 'Governance Dashboard',
  '/notifications': 'Notifications',
  '/search': 'Search',
  '/resources/upload': 'Upload Resource',
  '/my-tickets': 'My Tickets',
  '/admin/tickets': 'Admin Tickets',
  '/chats': 'My Chats',
  '/chat': 'Chat',
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function usePageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    let title = ROUTE_TITLES[pathname];
    if (!title) {
      if (pathname.startsWith('/found-items/') && pathname.endsWith('/claim')) title = 'Claim Item';
      else if (pathname.startsWith('/found-items/')) title = 'Found Item Details';
      else if (pathname.startsWith('/announcements/')) title = 'Announcement Details';
      else if (pathname.startsWith('/opportunities/')) title = 'Opportunity Details';
      else if (pathname.startsWith('/blog/')) title = 'Blog Post';
      else if (pathname.startsWith('/venues/')) title = 'Venue Details';
      else if (pathname.startsWith('/claims/')) title = 'Claim Details';
      else if (pathname.startsWith('/admin/')) title = 'Admin Panel';
      else if (pathname.startsWith('/governance/')) title = 'Governance';
      else if (pathname.startsWith('/chat')) title = 'Chat';
      else title = 'Academe';
    }
    document.title = title ? `${title} | Academe` : 'Academe';
  }, [pathname]);
}

function usePageTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      if (window.gtag) window.gtag('config', import.meta.env.VITE_GA_ID, { page_path: pathname });
      window.dispatchEvent(new CustomEvent('page_view', { detail: { path: pathname, timestamp: Date.now() } }));
    } catch { }
  }, [pathname]);
}

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return children;
    return <Navigate to="/" replace />;
  }
  return children;
}

// ═══════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch { }
    return window.innerWidth < SIDEBAR_BREAKPOINT;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const setChatUser = useChatStore((s) => s.setUser);

  // Keep chat store's user in sync with auth user
  useEffect(() => {
    if (user) {
      setChatUser(user);
    }
  }, [user, setChatUser]);

  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => {
        const next = !prev;
        try { localStorage.setItem('sidebar_collapsed', String(next)); } catch { }
        return next;
      });
    }
  }, [isMobile]);

  const handleCloseMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setMobileSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (mobileSidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (!isMobile) handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSidebar, isMobile]);

  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.documentElement.classList.toggle('reduce-motion', mq.matches);
    const handler = e => document.documentElement.classList.toggle('reduce-motion', e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  usePageTitle();
  usePageTracking();

  if (loading) {
    return <SkeletonLoader type="page" brandName="Academe" loadingText="Loading your experience..." />;
  }

  const showChrome = user && !isAuthPage;

  return (
    <div className="app min-h-screen transition-colors duration-300 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ScrollToTop />

      <div className="watermark-overlay">
        <span className="watermark-text">ACADEME</span>
      </div>

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg">
        Skip to main content
      </a>

      {showChrome && <Navbar onToggleSidebar={handleToggleSidebar} />}

      {showChrome && (
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        </div>
      )}

      {showChrome && isMobile && (
        <>
          <div aria-hidden="true" onClick={handleCloseMobileSidebar}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
          <div role="dialog" aria-modal="true" aria-label="Navigation menu"
            className={`fixed top-0 left-0 h-full z-50 w-[280px] max-w-[85vw] transition-transform duration-300 ease-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar collapsed={false} onToggle={handleCloseMobileSidebar} isMobileOverlay />
          </div>
        </>
      )}

      <main id="main-content"
        className={`min-h-screen overflow-x-hidden transition-[padding] duration-300 ${showChrome
          ? [
            'pt-16',
            'pb-20 md:pb-8',
            sidebarCollapsed ? 'md:pl-[66px]' : 'md:pl-[238px]',
          ].join(' ')
          : ''
          }`}>
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><SkeletonLoader type="page" brandName="" loadingText="Loading page..." /></div>}>
            <div key={location.pathname} className="animate-fadeIn">
              <Routes location={location}>
                {/* Auth */}
                <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={location.state?.from || '/'} replace />} />
                <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" replace />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Home */}
                <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

                {/* Announcements */}
                <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
                <Route path="/announcements/:id" element={<ProtectedRoute><AnnouncementDetailPage /></ProtectedRoute>} />
                <Route path="/announcements/requests" element={<ProtectedRoute><AnnouncementRequestsPage /></ProtectedRoute>} />
                <Route path="/announcements/requests/new" element={<ProtectedRoute><CreateAnnouncementRequestPage /></ProtectedRoute>} />

                {/* Opportunities */}
                <Route path="/opportunities" element={<ProtectedRoute><OpportunitiesPage /></ProtectedRoute>} />
                <Route path="/opportunities/new" element={<ProtectedRoute><CreateOpportunityPage /></ProtectedRoute>} />
                <Route path="/opportunities/:id" element={<ProtectedRoute><OpportunityDetailPage /></ProtectedRoute>} />
                <Route path="/opportunities/:id/edit" element={<ProtectedRoute><EditOpportunityPage /></ProtectedRoute>} />

                {/* Found Items */}
                <Route path="/found-items" element={<ProtectedRoute><FoundItemsPage /></ProtectedRoute>} />
                <Route path="/found-items/post" element={<ProtectedRoute><PostFoundItem /></ProtectedRoute>} />
                <Route path="/found-items/my-listings" element={<ProtectedRoute><MyFoundItemsPage /></ProtectedRoute>} />
                <Route path="/found-items/:id" element={<ProtectedRoute><FoundItemDetailPage /></ProtectedRoute>} />
                <Route path="/found-items/:id/claim" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
                <Route path="/claims" element={<ProtectedRoute><ClaimListPage /></ProtectedRoute>} />
                <Route path="/claims/:claimId" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />

                {/* Classes */}
                <Route path="/classes" element={<ProtectedRoute><ClassesPage /></ProtectedRoute>} />
                <Route path="/classes/attendance" element={<ProtectedRoute><AttendanceSummary /></ProtectedRoute>} />
                <Route path="/classes/attendance/:entryId" element={<ProtectedRoute><AttendanceDetail /></ProtectedRoute>} />
                <Route path="/classes/manage" element={<ProtectedRoute allowedRoles={['class_rep', 'admin']}><ManageTimetablePage /></ProtectedRoute>} />

                {/* Location / Map */}
                <Route path="/nearby-classes" element={<ProtectedRoute><NearbyClassesPage /></ProtectedRoute>} />
                <Route path="/campus-map" element={<ProtectedRoute><CampusMapPage /></ProtectedRoute>} />
                <Route path="/venues/:venueId" element={<ProtectedRoute><VenueDetailPage /></ProtectedRoute>} />

                {/* Blog */}
                <Route path="/blog" element={<ProtectedRoute><BlogPage /></ProtectedRoute>} />
                <Route path="/blog/create" element={<ProtectedRoute><CreateBlog /></ProtectedRoute>} />
                <Route path="/blog/my-posts" element={<ProtectedRoute><MyBlogPostsPage /></ProtectedRoute>} />
                <Route path="/blog/:slug" element={<ProtectedRoute><BlogDetail /></ProtectedRoute>} />
                <Route path="/blog/:slug/edit" element={<ProtectedRoute><EditBlogPage /></ProtectedRoute>} />

                {/* Profile & Account */}
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
                <Route path="/profile/biometrics" element={<ProtectedRoute><BiometricEnrollmentPage /></ProtectedRoute>} />
                <Route path="/profile/2fa" element={<ProtectedRoute><TwoFactorSetupPage /></ProtectedRoute>} />
                <Route path="/two-factor-setup" element={<Navigate to="/profile/2fa" replace />} />
                <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />

                {/* Notifications */}
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

                {/* Search */}
                <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />

                {/* Resources */}
                <Route path="/resources/upload" element={<ProtectedRoute><ResourceUploadPage /></ProtectedRoute>} />

                {/* Static Pages */}
                <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
                <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
                <Route path="/privacy" element={<ProtectedRoute><PrivacyPage /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditLogsPage /></ProtectedRoute>} />
                <Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['admin']}><AdminRolesPage /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReportsPage /></ProtectedRoute>} />
                <Route path="/admin/stats" element={<ProtectedRoute allowedRoles={['admin']}><GovernanceStats /></ProtectedRoute>} />

                {/* Governance */}
                <Route path="/governance" element={<ProtectedRoute allowedRoles={['student_leader', 'faculty_rep']}><GovernanceDashboard /></ProtectedRoute>} />
                <Route path="/governance/stats" element={<ProtectedRoute allowedRoles={['student_leader', 'faculty_rep']}><GovernanceStats /></ProtectedRoute>} />

                {/* Support Tickets */}
                <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
                <Route path="/admin/tickets" element={<ProtectedRoute allowedRoles={['admin']}><AdminTicketsPage /></ProtectedRoute>} />

                {/* Chat – new open chat routes */}
                <Route path="/chat" element={<Navigate to="/chats" replace />} />
                <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
                <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatDetail /></ProtectedRoute>} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>

      {showChrome && (
        <>
          <BottomNav />
          <FAB />
        </>
      )}

      <style>{`
        /* ============================================
           GLOBAL OVERFLOW PROTECTION
           ============================================ */
        html, body, #root, .app {
          overflow-x: hidden !important;
          max-width: 100% !important;
          width: 100% !important;
          position: relative;
        }

        /* Prevent any element from causing horizontal scroll */
        * {
          max-width: 100vw;
          box-sizing: border-box;
        }

        /* Fix for main content area */
        main {
          overflow-x: hidden !important;
          width: 100% !important;
        }

        /* ============================================
           WATERMARK STYLES WITH KEYBOARD HANDLING
           ============================================ */
        .watermark-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        /* Hide watermark when keyboard is open (viewport height reduced) */
        @media (max-height: 450px) {
          .watermark-overlay {
            opacity: 0 !important;
            visibility: hidden !important;
            display: none !important;
          }
        }

        /* Additional keyboard detection via body class */
        body.keyboard-open .watermark-overlay {
          opacity: 0 !important;
          visibility: hidden !important;
          display: none !important;
        }

        /* Hide fixed elements when keyboard is open */
        body.keyboard-open .fixed,
        body.keyboard-open [style*="position: fixed"],
        body.keyboard-open .bottom-nav,
        body.keyboard-open .bn-nav {
          display: none !important;
        }

        .watermark-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          font-family: 'Bricolage Grotesque', 'Outfit', system-ui, sans-serif;
          font-weight: 900;
          font-size: clamp(6rem, 15vw, 12rem);
          letter-spacing: -0.05em;
          text-transform: uppercase;
          color: rgba(79, 107, 255, 0.04);
          white-space: nowrap;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .dark .watermark-text {
          color: rgba(129, 140, 248, 0.05);
        }

        /* ============================================
           ANIMATIONS
           ============================================ */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }

        /* ============================================
           RESPONSIVE SIDEBAR
           ============================================ */
        @media (max-width: 767px) {
          .sb-root { display: none !important; }
          .mobile-sidebar-drawer .sb-root { display: flex !important; }
        }

        /* ============================================
           PRINT STYLES
           ============================================ */
        @media print {
          .app { background: white !important; }
          nav, .sidebar, .bottom-nav, .offline-indicator, .fixed, .watermark-overlay { 
            display: none !important; 
          }
          main { padding: 0 !important; margin: 0 !important; }
        }

        /* ============================================
           REDUCED MOTION SUPPORT
           ============================================ */
        .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* ============================================
           SAFE AREA INSETS
           ============================================ */
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
        .pt-safe {
          padding-top: env(safe-area-inset-top, 1rem);
        }
      `}</style>
    </div>
  );
}