from common.jwt_auth import JWTAuth
from common.constants import UserRole
from ninja.errors import HttpError
from functools import wraps

class JWTAuthService(JWTAuth):
    """Base authentication – only validates the JWT token."""
    pass

def has_roles(allowed_roles: list):
    """
    Decorator to enforce role-based authorization.
    Returns 401 if not authenticated, 403 if authenticated but wrong role.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            user = getattr(request, 'auth', None) or getattr(request, 'user', None)
            if not user:
                raise HttpError(401, "Authentication required")
            if user.role not in [role.value for role in allowed_roles]:
                raise HttpError(403, "You do not have permission to perform this action.")
            return view_func(request, *args, **kwargs)
        return wrapped
    return decorator