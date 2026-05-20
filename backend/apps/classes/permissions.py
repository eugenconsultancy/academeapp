from common.jwt_auth import JWTAuth
from common.constants import UserRole

class IsClassRep(JWTAuth):
    def authenticate(self, request, token):
        user = super().authenticate(request, token)
        if user and user.role in [UserRole.CLASS_REP.value, UserRole.ADMIN.value]:
            return user
        return None
