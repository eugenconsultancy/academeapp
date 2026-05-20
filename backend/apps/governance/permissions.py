from common.jwt_auth import JWTAuth
from common.constants import UserRole


class IsAdmin(JWTAuth):
    """Only admin users can access."""
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        if user and user.role == UserRole.ADMIN.value:
            return user
        return None


class IsAdminOrStudentLeader(JWTAuth):
    """Admin or student leaders can access."""
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        if user and user.role in [
            UserRole.ADMIN.value,
            UserRole.STUDENT_LEADER.value,
            UserRole.FACULTY_REP.value,
        ]:
            return user
        return None