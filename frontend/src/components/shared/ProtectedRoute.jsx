import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoader from './SkeletonLoader';
import { FiShield, FiAlertTriangle, FiLock } from 'react-icons/fi';

/**
 * Route protection levels
 */
export const ROUTE_PROTECTION = {
    PUBLIC: 'public',           // No authentication required
    GUEST_ONLY: 'guest_only',   // Only unauthenticated users
    AUTHENTICATED: 'auth',      // Any authenticated user
    VERIFIED: 'verified',       // Email verified users
    ROLE_BASED: 'role',         // Specific role(s) required
    PERMISSION_BASED: 'perm',   // Specific permission required
};

/**
 * Default role hierarchy (higher roles inherit lower permissions)
 */
const ROLE_HIERARCHY = {
    admin: ['admin', 'student_leader', 'faculty_rep', 'class_rep', 'teacher', 'student'],
    student_leader: ['student_leader', 'class_rep', 'student'],
    faculty_rep: ['faculty_rep', 'teacher', 'student'],
    class_rep: ['class_rep', 'student'],
    teacher: ['teacher', 'student'],
    student: ['student'],
};

/**
 * Protected Route Component
 */
export default function ProtectedRoute({
    children,
    protectionLevel = ROUTE_PROTECTION.AUTHENTICATED,
    allowedRoles = null,
    requiredPermission = null,
    requireEmailVerified = false,
    redirectTo = null,
    fallback = null,
    loadingComponent = null,
    saveLocation = true,
}) {
    const {
        user,
        loading,
        isAuthenticated,
        isAdmin,
        hasRole,
        hasPermission,
    } = useAuth();

    // ── Derive account status booleans safely from user ─────────
    // Adjust the field names to match your actual user object from the backend.
    const isEmailVerified = user?.is_email_verified ?? user?.email_verified ?? false;
    const isAccountActive = user?.is_active ?? true;   // default to true if missing
    const isAccountSuspended = user?.is_suspended ?? false;

    const location = useLocation();

    // ═════════════════════════════════════════════════════════
    // LOADING STATE
    // ═════════════════════════════════════════════════════════
    if (loading) {
        return loadingComponent || <SkeletonLoader type="page" />;
    }

    // ═════════════════════════════════════════════════════════
    // GUEST ONLY (Login/Signup pages)
    // ═════════════════════════════════════════════════════════
    if (protectionLevel === ROUTE_PROTECTION.GUEST_ONLY) {
        if (isAuthenticated) {
            const redirectPath = location.state?.from?.pathname || '/';
            return <Navigate to={redirectPath} replace />;
        }
        return children;
    }

    // ═════════════════════════════════════════════════════════
    // PUBLIC (No auth required)
    // ═════════════════════════════════════════════════════════
    if (protectionLevel === ROUTE_PROTECTION.PUBLIC) {
        return children;
    }

    // ═════════════════════════════════════════════════════════
    // AUTHENTICATED (Any logged-in user)
    // ═════════════════════════════════════════════════════════
    if (!isAuthenticated) {
        const state = saveLocation ? { from: location } : undefined;
        return <Navigate to={redirectTo || '/login'} state={state} replace />;
    }

    // ═════════════════════════════════════════════════════════
    // ACCOUNT STATUS CHECKS (now using derived booleans)
    // ═════════════════════════════════════════════════════════

    // Check if account is suspended
    if (isAccountSuspended) {
        return (
            <UnauthorizedFallback
                icon={<FiAlertTriangle className="w-12 h-12" />}
                title="Account Suspended"
                message="Your account has been suspended. Please contact support for assistance."
                fallback={fallback}
            />
        );
    }

    // Check if account is inactive
    if (!isAccountActive) {
        return (
            <UnauthorizedFallback
                icon={<FiLock className="w-12 h-12" />}
                title="Account Inactive"
                message="Your account is currently inactive. Please contact your administrator."
                fallback={fallback}
            />
        );
    }

    // ═════════════════════════════════════════════════════════
    // EMAIL VERIFICATION CHECK
    // ═════════════════════════════════════════════════════════
    if (protectionLevel === ROUTE_PROTECTION.VERIFIED || requireEmailVerified) {
        if (!isEmailVerified) {
            return <Navigate to="/verify-email" state={{ from: location }} replace />;
        }
    }

    // ═════════════════════════════════════════════════════════
    // ROLE-BASED ACCESS
    // ═════════════════════════════════════════════════════════
    if (protectionLevel === ROUTE_PROTECTION.ROLE_BASED && allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (isAdmin && roles.includes('admin')) {
            return children;
        }

        const hasAllowedRole = roles.some((role) => hasRole(role));

        if (!hasAllowedRole) {
            return (
                <UnauthorizedFallback
                    icon={<FiShield className="w-12 h-12" />}
                    title="Access Denied"
                    message={`You need one of these roles: ${roles.join(', ')}`}
                    redirectTo={redirectTo || '/'}
                    fallback={fallback}
                />
            );
        }
    }

    // ═════════════════════════════════════════════════════════
    // PERMISSION-BASED ACCESS
    // ═════════════════════════════════════════════════════════
    if (protectionLevel === ROUTE_PROTECTION.PERMISSION_BASED && requiredPermission) {
        if (isAdmin) {
            return children;
        }

        const [action, resource] = requiredPermission.split(':');

        if (!hasPermission(action, resource)) {
            return (
                <UnauthorizedFallback
                    icon={<FiShield className="w-12 h-12" />}
                    title="Insufficient Permissions"
                    message={`You need permission: ${requiredPermission}`}
                    redirectTo={redirectTo || '/'}
                    fallback={fallback}
                />
            );
        }
    }

    // ═════════════════════════════════════════════════════════
    // AUTHORIZED - RENDER CHILDREN
    // ═════════════════════════════════════════════════════════
    return children;
}

// ═══════════════════════════════════════════════════════════════
// UNAUTHORIZED FALLBACK COMPONENT (unchanged)
// ═══════════════════════════════════════════════════════════════
function UnauthorizedFallback({
    icon = null,
    title = 'Access Denied',
    message = 'You do not have permission to access this page.',
    redirectTo = '/',
    fallback = null,
}) {
    if (fallback) return fallback;

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="text-center max-w-md">
                {icon && (
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 dark:text-red-400">
                        {icon}
                    </div>
                )}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {title}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    {message}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                        href={redirectTo}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
                    >
                        Go to Home
                    </a>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS (unchanged)
// ═══════════════════════════════════════════════════════════════
export function GuestRoute({ children, redirectTo = '/' }) {
    return (
        <ProtectedRoute protectionLevel={ROUTE_PROTECTION.GUEST_ONLY} redirectTo={redirectTo}>
            {children}
        </ProtectedRoute>
    );
}

export function RoleRoute({ children, roles }) {
    return (
        <ProtectedRoute protectionLevel={ROUTE_PROTECTION.ROLE_BASED} allowedRoles={roles}>
            {children}
        </ProtectedRoute>
    );
}

export function PermissionRoute({ children, permission }) {
    return (
        <ProtectedRoute protectionLevel={ROUTE_PROTECTION.PERMISSION_BASED} requiredPermission={permission}>
            {children}
        </ProtectedRoute>
    );
}

export function VerifiedRoute({ children }) {
    return (
        <ProtectedRoute protectionLevel={ROUTE_PROTECTION.VERIFIED} requireEmailVerified={true}>
            {children}
        </ProtectedRoute>
    );
}

export function AdminRoute({ children }) {
    return (
        <ProtectedRoute protectionLevel={ROUTE_PROTECTION.ROLE_BASED} allowedRoles={['admin']} redirectTo="/admin">
            {children}
        </ProtectedRoute>
    );
}

export { ROUTE_PROTECTION, ROLE_HIERARCHY };