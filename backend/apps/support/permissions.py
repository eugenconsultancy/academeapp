# backend/apps/support/permissions.py
from common.jwt_auth import JWTAuth
from common.constants import UserRole
import logging

logger = logging.getLogger(__name__)


class IsAdmin(JWTAuth):
    """
    Custom authentication class that only allows admin users.
    Returns the user if authenticated AND has admin role, otherwise None.
    """
    
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        
        if user is None:
            logger.debug(f"Admin auth failed: No user found for token")
            return None
        
        if user.role == UserRole.ADMIN.value:
            logger.debug(f"Admin auth successful: user={user.id}, role={user.role}")
            return user
        
        logger.warning(f"Admin auth failed: user={user.id} has role={user.role}, expected admin")
        return None


class IsSupportStaff(JWTAuth):
    """
    Authentication class for support staff (admin or support team).
    """
    
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        
        if user is None:
            return None
        
        # Allow admin and support staff roles
        allowed_roles = [UserRole.ADMIN.value, 'support_staff', 'support_agent']
        
        if user.role in allowed_roles:
            return user
        
        logger.warning(f"Support staff auth failed: user={user.id} has role={user.role}")
        return None