from common.jwt_auth import JWTAuth
from common.constants import UserRole

class IsAdmin(JWTAuth):
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        if user and user.role == UserRole.ADMIN.value:
            return user
        return None

class IsClassRep(JWTAuth):
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        if user and user.role in [UserRole.CLASS_REP.value, UserRole.ADMIN.value]:
            return user
        return None

class IsStudentLeader(JWTAuth):
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        if user and user.role in [UserRole.STUDENT_LEADER.value, UserRole.FACULTY_REP.value, UserRole.ADMIN.value]:
            return user
        return None

class IsOwner:
    def check_object_permissions(self, request, obj):
        return obj.user == request.user
