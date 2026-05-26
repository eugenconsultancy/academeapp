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
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function usePageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    let title = ROUTE_TITLES[pathname];
    if (!title) {
      // Dynamic route matching – order matters (more specific first)
      if (pathname.startsWith('/found-items/') && pathname.endsWith('/claim')) {
        title = 'Claim Item';
      } else if (pathname.startsWith('/found-items/')) {
        title = 'Found Item Details';
      } else if (pathname.startsWith('/announcements/')) {
        title = 'Announcement Details';
      } else if (pathname.startsWith('/opportunities/')) {
        title = 'Opportunity Details';
      } else if (pathname.startsWith('/blog/')) {
        title = 'Blog Post';
      } else if (pathname.startsWith('/venues/')) {
        title = 'Venue Details';
      } else if (pathname.startsWith('/claims/')) {
        title = 'Claim Details';
      } else if (pathname.startsWith('/admin/')) {
        title = 'Admin Panel';
      } else if (pathname.startsWith('/governance/')) {
        title = 'Governance';
      } else {
        title = 'Academe';
      }
    }
    document.title = title ? `${title} | Academe` : 'Academe';
  }, [pathname]);
}

function usePageTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      if (window.gtag) {
        window.gtag('config', import.meta.env.VITE_GA_ID, { page_path: pathname });
      }
      // Custom event (if needed elsewhere)
      window.dispatchEvent(
        new CustomEvent('page_view', {
          detail: { path: pathname, timestamp: Date.now() },
        })
      );
    } catch {
      // Analytics not available
    }
  }, [pathname]);
}

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Admin can access everything
    if (user.role === 'admin') return children;
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    // Default: collapsed on mobile (width < 1024), expanded on desktop
    return window.innerWidth < 1024;
  });

  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(
    location.pathname
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // Storage unavailable
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSidebar]);

  // Dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Reduced motion support
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('reduce-motion', prefersReducedMotion);
  }, []);

  usePageTitle();
  usePageTracking();

  // Show loading skeleton while auth is being checked
  if (loading) {
    return (
      <SkeletonLoader
        type="page"
        brandName="Academe"
        loadingText="Loading your experience..."
      />
    );
  }

  return (
    <div className="app min-h-screen transition-colors duration-300 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ScrollToTop />

      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Navbar & Sidebar — only when authenticated and not on auth pages */}
      {user && !isAuthPage && (
        <>
          <Navbar onToggleSidebar={handleToggleSidebar} />
          <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        </>
      )}

      <main
        id="main-content"
        className={`min-h-screen transition-all duration-300 ${user && !isAuthPage ? 'pt-16 md:pl-16 pb-20 md:pb-8' : ''
          }`}
      >
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <SkeletonLoader type="page" brandName="" loadingText="Loading page..." />
              </div>
            }
          >
            <div key={location.pathname} className="animate-fadeIn">
              <Routes location={location}>
                {/* ── Public / Auth Routes ───────────────────── */}
                <Route
                  path="/login"
                  element={
                    !user ? (
                      <LoginPage />
                    ) : (
                      <Navigate to={location.state?.from || '/'} replace />
                    )
                  }
                />
                <Route
                  path="/signup"
                  element={!user ? <SignupPage /> : <Navigate to="/" replace />}
                />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* ── Home ──────────────────────────────────── */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Announcements ─────────────────────────── */}
                <Route
                  path="/announcements"
                  element={
                    <ProtectedRoute>
                      <AnnouncementsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/announcements/:id"
                  element={
                    <ProtectedRoute>
                      <AnnouncementDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/announcements/requests"
                  element={
                    <ProtectedRoute>
                      <AnnouncementRequestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/announcements/requests/new"
                  element={
                    <ProtectedRoute>
                      <CreateAnnouncementRequestPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Opportunities ─────────────────────────── */}
                <Route
                  path="/opportunities"
                  element={
                    <ProtectedRoute>
                      <OpportunitiesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/opportunities/new"
                  element={
                    <ProtectedRoute>
                      <CreateOpportunityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/opportunities/:id"
                  element={
                    <ProtectedRoute>
                      <OpportunityDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/opportunities/:id/edit"
                  element={
                    <ProtectedRoute>
                      <EditOpportunityPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Found Items ───────────────────────────── */}
                <Route
                  path="/found-items"
                  element={
                    <ProtectedRoute>
                      <FoundItemsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/found-items/post"
                  element={
                    <ProtectedRoute>
                      <PostFoundItem />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/found-items/my-listings"
                  element={
                    <ProtectedRoute>
                      <MyFoundItemsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/found-items/:id"
                  element={
                    <ProtectedRoute>
                      <FoundItemDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/found-items/:id/claim"
                  element={
                    <ProtectedRoute>
                      <ClaimDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/claims"
                  element={
                    <ProtectedRoute>
                      <ClaimListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/claims/:claimId"
                  element={
                    <ProtectedRoute>
                      <ClaimDetail />
                    </ProtectedRoute>
                  }
                />

                {/* ── Classes ────────────────────────────────── */}
                <Route
                  path="/classes"
                  element={
                    <ProtectedRoute>
                      <ClassesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/classes/attendance"
                  element={
                    <ProtectedRoute>
                      <AttendanceSummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/classes/attendance/:entryId"
                  element={
                    <ProtectedRoute>
                      <AttendanceDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/classes/manage"
                  element={
                    <ProtectedRoute allowedRoles={['class_rep', 'admin']}>
                      <ManageTimetablePage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Location / Map ────────────────────────── */}
                <Route
                  path="/nearby-classes"
                  element={
                    <ProtectedRoute>
                      <NearbyClassesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campus-map"
                  element={
                    <ProtectedRoute>
                      <CampusMapPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/venues/:venueId"
                  element={
                    <ProtectedRoute>
                      <VenueDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Blog ───────────────────────────────────── */}
                <Route
                  path="/blog"
                  element={
                    <ProtectedRoute>
                      <BlogPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blog/create"
                  element={
                    <ProtectedRoute>
                      <CreateBlog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blog/my-posts"
                  element={
                    <ProtectedRoute>
                      <MyBlogPostsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blog/:slug"
                  element={
                    <ProtectedRoute>
                      <BlogDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blog/:slug/edit"
                  element={
                    <ProtectedRoute>
                      <EditBlogPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Profile & Account ──────────────────────── */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/edit"
                  element={
                    <ProtectedRoute>
                      <ProfileEditPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/biometrics"
                  element={
                    <ProtectedRoute>
                      <BiometricEnrollmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/2fa"
                  element={
                    <ProtectedRoute>
                      <TwoFactorSetupPage />
                    </ProtectedRoute>
                  }
                />
                {/* Redirect legacy /two-factor-setup to new path */}
                <Route
                  path="/two-factor-setup"
                  element={<Navigate to="/profile/2fa" replace />}
                />
                <Route
                  path="/sessions"
                  element={
                    <ProtectedRoute>
                      <SessionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Notifications ─────────────────────────── */}
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Search ────────────────────────────────── */}
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <SearchResultsPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Resources ─────────────────────────────── */}
                <Route
                  path="/resources/upload"
                  element={
                    <ProtectedRoute>
                      <ResourceUploadPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Static Pages ────────────────────────────── */}
                <Route
                  path="/contact"
                  element={
                    <ProtectedRoute>
                      <ContactPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <AboutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/privacy"
                  element={
                    <ProtectedRoute>
                      <PrivacyPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Admin ──────────────────────────────────── */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminAuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/roles"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminRolesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/stats"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <GovernanceStats />
                    </ProtectedRoute>
                  }
                />

                {/* ── Governance ──────────────────────────────── */}
                <Route
                  path="/governance"
                  element={
                    <ProtectedRoute allowedRoles={['student_leader', 'faculty_rep']}>
                      <GovernanceDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/governance/stats"
                  element={
                    <ProtectedRoute allowedRoles={['student_leader', 'faculty_rep']}>
                      <GovernanceStats />
                    </ProtectedRoute>
                  }
                />

                {/* ── 404 Catch-All ──────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom Navigation & FAB — mobile only, authenticated */}
      {user && !isAuthPage && (
        <>
          <BottomNav />
          <FAB />
        </>
      )}

      {/* ── Global Styles ───────────────────────────────── */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }

        @media print {
          .app {
            background: white !important;
          }
          nav,
          .sidebar,
          .bottom-nav,
          .offline-indicator,
          .fixed {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }

        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
    </div>
  );
}