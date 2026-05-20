import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';

// ============================================
// Lazy-loaded pages for code splitting
// ============================================

// Auth pages
const LoginPage = lazy(() => import('../pages/LoginPage'));
const SignupPage = lazy(() => import('../pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));

// Main pages
const HomePage = lazy(() => import('../pages/HomePage'));
const AnnouncementsPage = lazy(() => import('../pages/AnnouncementsPage'));
const AnnouncementDetailPage = lazy(() => import('../pages/AnnouncementDetailPage'));
const OpportunitiesPage = lazy(() => import('../pages/OpportunitiesPage'));
const OpportunityDetailPage = lazy(() => import('../pages/OpportunityDetailPage'));
const FoundItemsPage = lazy(() => import('../pages/FoundItemsPage'));
const FoundItemDetailPage = lazy(() => import('../pages/FoundItemDetailPage'));
const PostFoundItem = lazy(() => import('../pages/PostFoundItem'));
const ClaimDetail = lazy(() => import('../pages/ClaimDetail'));
const ClaimListPage = lazy(() => import('../pages/ClaimListPage'));
const ClassesPage = lazy(() => import('../pages/ClassesPage'));

// ============================================
// GEO-SERVICE PAGES
// ============================================
const NearbyClassesPage = lazy(() => import('../pages/NearbyClassesPage'));
const CampusMapPage = lazy(() => import('../pages/CampusMapPage'));
const VenueDetailPage = lazy(() => import('../pages/VenueDetailPage'));

// Blog pages
const BlogPage = lazy(() => import('../pages/BlogPage'));
const BlogDetail = lazy(() => import('../pages/BlogDetail'));
const CreateBlog = lazy(() => import('../pages/CreateBlog'));

// Account pages
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SessionsPage = lazy(() => import('../pages/SessionsPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));

// Announcement Request pages
const AnnouncementRequestsPage = lazy(() => import('../pages/AnnouncementRequestsPage'));
const CreateAnnouncementRequestPage = lazy(() => import('../pages/CreateAnnouncementRequestPage'));

// Admin pages
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminAuditLogsPage = lazy(() => import('../pages/AdminAuditLogsPage'));
const AdminRolesPage = lazy(() => import('../pages/AdminRolesPage'));
const AdminReportsPage = lazy(() => import('../pages/AdminReportsPage'));

// Governance pages
const GovernanceDashboard = lazy(() => import('../pages/GovernanceDashboard'));
const GovernanceStats = lazy(() => import('../pages/GovernanceStats'));

// Special pages
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// ============================================
// App Router Component
// ============================================

export default function AppRouter() {
    const { user, loading } = useAuth();

    // Show branded skeleton while checking authentication
    if (loading) {
        return <SkeletonLoader type="page" />;
    }

    const isAdmin = user?.role === 'admin';
    const isStudentLeader = user?.role === 'student_leader' || user?.role === 'faculty_rep' || isAdmin;
    const isClassRep = user?.role === 'class_rep' || isAdmin;

    return (
        <Suspense fallback={<SkeletonLoader type="page" />}>
            <Routes>
                {/* ============================================ */}
                {/* PUBLIC ROUTES - No authentication required  */}
                {/* ============================================ */}
                {!user ? (
                    <>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        {/* Redirect all unknown routes to login */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    <>
                        {/* ============================================ */}
                        {/* MAIN ROUTES                                  */}
                        {/* ============================================ */}
                        <Route path="/" element={<HomePage />} />

                        {/* Announcements */}
                        <Route path="/announcements" element={<AnnouncementsPage />} />
                        <Route path="/announcements/:id" element={<AnnouncementDetailPage />} />

                        {/* Announcement Requests (students request leaders) */}
                        <Route path="/announcements/requests" element={<AnnouncementRequestsPage />} />
                        <Route path="/announcements/requests/new" element={<CreateAnnouncementRequestPage />} />

                        {/* Opportunities */}
                        <Route path="/opportunities" element={<OpportunitiesPage />} />
                        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />

                        {/* Found Items */}
                        <Route path="/found-items" element={<FoundItemsPage />} />
                        <Route path="/found-items/:id" element={<FoundItemDetailPage />} />
                        <Route path="/found-items/post" element={<PostFoundItem />} />
                        <Route path="/found-items/:id/claim" element={<ClaimDetail />} />

                        {/* Claims */}
                        <Route path="/claims" element={<ClaimListPage />} />
                        <Route path="/claims/:claimId" element={<ClaimDetail />} />

                        {/* Classes */}
                        <Route path="/classes" element={<ClassesPage />} />

                        {/* ============================================ */}
                        {/* GEO-SERVICE ROUTES                           */}
                        {/* ============================================ */}
                        <Route path="/nearby-classes" element={<NearbyClassesPage />} />
                        <Route path="/campus-map" element={<CampusMapPage />} />
                        <Route path="/venues/:venueId" element={<VenueDetailPage />} />

                        {/* ============================================ */}
                        {/* BLOG ROUTES                                  */}
                        {/* ============================================ */}
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/create" element={<CreateBlog />} />
                        <Route path="/blog/:slug" element={<BlogDetail />} />

                        {/* ============================================ */}
                        {/* ACCOUNT ROUTES                               */}
                        {/* ============================================ */}
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/sessions" element={<SessionsPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />

                        {/* ============================================ */}
                        {/* ADMIN ROUTES                                 */}
                        {/* ============================================ */}
                        {isAdmin && (
                            <>
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
                                <Route path="/admin/roles" element={<AdminRolesPage />} />
                                <Route path="/admin/reports" element={<AdminReportsPage />} />
                                <Route path="/admin/stats" element={<GovernanceStats />} />
                            </>
                        )}

                        {/* ============================================ */}
                        {/* GOVERNANCE ROUTES (Admin + Leaders)          */}
                        {/* ============================================ */}
                        {isStudentLeader && (
                            <>
                                <Route path="/governance" element={<GovernanceDashboard />} />
                                <Route path="/governance/stats" element={<GovernanceStats />} />
                            </>
                        )}

                        {/* ============================================ */}
                        {/* 404 - Catch all unknown routes              */}
                        {/* ============================================ */}
                        <Route path="*" element={<NotFoundPage />} />
                    </>
                )}
            </Routes>
        </Suspense>
    );
}