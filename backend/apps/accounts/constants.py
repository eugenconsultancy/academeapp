"""
Account-specific constants for the Academe platform.

This file contains constants that are specific to the accounts app,
including role hierarchy, permissions mapping, and account-related defaults.
"""

from common.constants import UserRole


# ============================================
# ROLE HIERARCHY & PERMISSIONS
# ============================================

class RoleHierarchy:
    """
    Defines the role hierarchy for permission checks.
    
    Higher index = more authority.
    A role can perform actions for roles at lower indices.
    """
    ORDER = [
        UserRole.STUDENT.value,           # 0
        UserRole.CLASS_REP.value,         # 1
        UserRole.FACULTY_REP.value,       # 2
        UserRole.STUDENT_LEADER.value,    # 3
        UserRole.FACULTY_OFFICER.value,   # 4
        UserRole.ADMIN.value,             # 5
    ]
    
    @classmethod
    def can_manage_role(cls, assigner_role: str, target_role: str) -> bool:
        """
        Check if a user with assigner_role can assign/manage target_role.
        
        Rules:
        - Admin can manage all roles except Admin
        - Faculty Officer can manage Class Rep and below
        - Student Leader can NOT assign roles
        - Class Rep can NOT assign roles
        """
        if assigner_role not in cls.ORDER or target_role not in cls.ORDER:
            return False
        
        assigner_level = cls.ORDER.index(assigner_role)
        target_level = cls.ORDER.index(target_role)
        
        # Cannot assign same or higher level
        if target_level >= assigner_level:
            return False
        
        # Faculty Officer can only assign Class Rep
        if assigner_role == UserRole.FACULTY_OFFICER.value:
            return target_role == UserRole.CLASS_REP.value
        
        # Admin can assign any lower role
        if assigner_role == UserRole.ADMIN.value:
            return target_role != UserRole.ADMIN.value
        
        return False


# ============================================
# ROLE-SPECIFIC PERMISSIONS
# ============================================

class RolePermissions:
    """
    Maps roles to their specific permissions.
    
    This defines WHAT each role can DO in the system.
    Used for both backend authorization and frontend UI rendering.
    """
    
    PERMISSIONS_MAP = {
        UserRole.STUDENT.value: {
            'can_view_timetable': True,
            'can_mark_attendance': True,
            'can_view_announcements': True,
            'can_create_announcement_request': True,
            'can_view_found_items': True,
            'can_post_found_item': True,
            'can_claim_item': True,
            'can_send_tip': True,
            'can_view_opportunities': True,
            'can_like_opportunity': True,
            'can_report_opportunity': True,
            'can_create_support_ticket': True,
            'can_view_blog': True,
            'can_like_blog_post': True,
            'can_save_blog_post': True,
            'can_comment_blog_post': True,
            'can_search': True,
            'can_edit_own_profile': True,
            'can_export_own_data': True,
            'can_delete_own_account': True,
        },
        
        UserRole.CLASS_REP.value: {
            # Inherits all student permissions
            '_inherits': UserRole.STUDENT.value,
            # Additional permissions
            'can_manage_timetable': True,
            'can_create_class_announcement': True,
            'can_view_class_attendance': True,
            'can_edit_class_timetable': True,
            'can_delete_class_timetable': True,
            'can_mark_attendance_offline': True,
        },
        
        UserRole.FACULTY_REP.value: {
            '_inherits': UserRole.CLASS_REP.value,
            'can_create_faculty_announcement': True,
            'can_view_faculty_classes': True,
        },
        
        UserRole.STUDENT_LEADER.value: {
            '_inherits': UserRole.FACULTY_REP.value,
            'can_create_institution_announcement': True,
            'can_report_to_admin': True,
            'can_view_student_reports': True,
        },
        
        UserRole.FACULTY_OFFICER.value: {
            '_inherits': UserRole.STUDENT_LEADER.value,
            'can_assign_class_rep': True,
            'can_revoke_class_rep': True,
            'can_view_department_students': True,
            'can_manage_department_announcements': True,
            'can_approve_announcement_requests': True,
            'can_view_audit_logs': True,
        },
        
        UserRole.ADMIN.value: {
            '_inherits': UserRole.FACULTY_OFFICER.value,
            'can_manage_all_roles': True,
            'can_manage_institutions': True,
            'can_manage_users': True,
            'can_view_all_data': True,
            'can_delete_any_content': True,
            'can_manage_system_config': True,
            'can_view_full_audit_log': True,
            'can_export_all_data': True,
            'can_create_blog_post': True,
            'can_manage_blog': True,
            'can_approve_found_items': True,
            'can_manage_opportunities': True,
            'can_assign_any_role': True,
        },
    }
    
    @classmethod
    def get_permissions(cls, role: str) -> dict:
        """
        Get all permissions for a role, including inherited ones.
        """
        permissions = {}
        
        current_role = role
        while current_role:
            role_perms = cls.PERMISSIONS_MAP.get(current_role, {})
            # Add permissions (skip the _inherits key)
            for key, value in role_perms.items():
                if key != '_inherits':
                    permissions[key] = value
            
            # Move to inherited role
            current_role = role_perms.get('_inherits')
        
        return permissions
    
    @classmethod
    def has_permission(cls, role: str, permission: str) -> bool:
        """
        Check if a role has a specific permission.
        """
        permissions = cls.get_permissions(role)
        return permissions.get(permission, False)


# ============================================
# STUDENT ROLE DEFAULTS
# ============================================

class StudentRoleDefaults:
    """Default durations and limits for student leadership roles"""
    
    # Default role duration in days
    DEFAULT_CLASS_REP_DURATION_DAYS = 365     # 1 year
    DEFAULT_STUDENT_LEADER_DURATION_DAYS = 365
    DEFAULT_FACULTY_REP_DURATION_DAYS = 365
    
    # Maximum role duration
    MAX_ROLE_DURATION_DAYS = 730              # 2 years
    
    # Minimum role duration
    MIN_ROLE_DURATION_DAYS = 30               # 1 month
    
    # Maximum active roles per user
    MAX_CONCURRENT_ROLES = 3
    
    # Role names for display
    ROLE_DISPLAY_NAMES = {
        'class_rep': 'Class Representative',
        'student_leader': 'Student Leader',
        'faculty_rep': 'Faculty Representative',
    }


# ============================================
# ACCOUNT DEFAULTS
# ============================================

class AccountDefaults:
    """Default values for account-related settings"""
    
    # Phone number validation
    PHONE_REGEX = r'^\+?254\d{9}$'
    PHONE_EXAMPLE = "+254XXXXXXXXX"
    
    # Admission number format examples
    ADMISSION_FORMATS = [
        r'^[A-Z]\d{2}/\d{4}/\d{4}$',   # I81/1001/2020
        r'^[A-Z]\d{2}-\d{4}-\d{4}$',    # I81-1001-2020
        r'^[A-Z]{2}\d{2}/\d{5}$',       # AB12/12345
    ]
    
    # Profile
    MAX_PROFILE_PIC_SIZE_MB = 5
    ALLOWED_PROFILE_PIC_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
    
    # Security
    MAX_LOGIN_ATTEMPTS = 5
    LOGIN_LOCKOUT_MINUTES = 30
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 5
    OTP_RATE_LIMIT_SECONDS = 60          # Wait between OTP requests
    
    # Session
    MAX_ACTIVE_SESSIONS = 5
    SESSION_IDLE_TIMEOUT_MINUTES = 30
    
    # Badge display
    BADGE_DISPLAY_NAMES = {
        'login_bronze': '🥉 Bronze Scholar',
        'login_silver': '🥈 Silver Scholar',
        'login_gold': '🥇 Gold Scholar',
        'high_engager': '🔥 High Engager',
        'early_adopter': '⭐ Early Adopter',
        'top_contributor': '🏆 Top Contributor',
        'perfect_attendance': '💯 Perfect Attendance',
        'community_helper': '🤝 Community Helper',
    }
    
    # Data export
    EXPORT_EXPIRY_DAYS = 7
    ALLOWED_EXPORT_FORMATS = ['json', 'csv']


# ============================================
# USER ACTIVITY TRACKING
# ============================================

class ActivityMetrics:
    """Metrics tracked for user activity"""
    
    # Events that update last_activity
    ACTIVITY_EVENTS = [
        'login',
        'view_announcement',
        'view_opportunity',
        'mark_attendance',
        'like_post',
        'save_post',
        'comment',
        'claim_item',
        'send_tip',
        'create_ticket',
    ]
    
    # Online status TTL in seconds
    ONLINE_TTL = 120  # 2 minutes
    
    # Last seen thresholds
    RECENTLY_ACTIVE_MINUTES = 5
    ACTIVE_TODAY_HOURS = 24


# ============================================
# PASSWORD POLICIES
# ============================================

class PasswordPolicy:
    """Password strength and policy requirements"""
    
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    
    # Complexity requirements
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    # Special characters allowed
    SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Password history
    PASSWORD_HISTORY_COUNT = 5  # Can't reuse last 5 passwords
    
    # Password expiry
    PASSWORD_EXPIRY_DAYS = 90  # Force change every 90 days



# ============================================
# BIOMETRIC AUTHENTICATION SETTINGS (CLOUD)
# ============================================

class BiometricSettings:
    """Configuration for Cloud-based Face Recognition authentication"""
    
    # AWS Rekognition uses a similarity score from 0 to 100.
    # 80-90 is generally considered a highly secure threshold.
    MATCH_TOLERANCE = 80 
    
    # Toggle to globally enable/disable face login
    ENABLED = True
    
    # Security: Require Liveness Detection
    # Cloud APIs often handle liveness via specific API calls. 
    # Keep this True to ensure your UI logic still enforces the check.
    REQUIRE_LIVENESS_CHECK = True
