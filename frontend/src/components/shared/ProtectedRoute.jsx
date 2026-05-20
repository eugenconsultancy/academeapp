import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoader from './SkeletonLoader';

export default function ProtectedRoute({ children, requiredRole = null }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <SkeletonLoader type="page" />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
}