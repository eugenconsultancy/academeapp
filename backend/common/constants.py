"""
Common constants used across the Academe platform.

This file contains all enumerations, choices, thresholds,
and standardized action types for the entire application.
"""

from enum import Enum


# ============================================
# USER ROLES
# ============================================

class UserRole(Enum):
    """
    User roles in the platform.
    
    Hierarchy (highest to lowest):
    ADMIN > FACULTY_OFFICER > STUDENT_LEADER > FACULTY_REP > CLASS_REP > STUDENT
    """
    ADMIN = "admin"
    FACULTY_OFFICER = "faculty_officer"
    STUDENT_LEADER = "student_leader"
    FACULTY_REP = "faculty_rep"
    CLASS_REP = "class_rep"
    STUDENT = "student"


# ============================================
# BADGE TYPES & THRESHOLDS
# ============================================

class BadgeType(Enum):
    LOGIN_BRONZE = "login_bronze"
    LOGIN_SILVER = "login_silver"
    LOGIN_GOLD = "login_gold"
    HIGH_ENGAGER = "high_engager"
    EARLY_ADOPTER = "early_adopter"
    TOP_CONTRIBUTOR = "top_contributor"
    PERFECT_ATTENDANCE = "perfect_attendance"
    COMMUNITY_HELPER = "community_helper"


BADGE_THRESHOLDS = {
    BadgeType.LOGIN_BRONZE: 10,
    BadgeType.LOGIN_SILVER: 50,
    BadgeType.LOGIN_GOLD: 100,
    BadgeType.HIGH_ENGAGER: 25,
    BadgeType.EARLY_ADOPTER: 1,
    BadgeType.TOP_CONTRIBUTOR: 50,
    BadgeType.PERFECT_ATTENDANCE: 100,
    BadgeType.COMMUNITY_HELPER: 10,
}


# ============================================
# ANNOUNCEMENT TARGETS
# ============================================

class AnnouncementTarget(Enum):
    ENTIRE_INSTITUTION = "entire_institution"
    SPECIFIC_CLASS = "specific_class"
    DEPARTMENT = "department"
    FACULTY = "faculty"
    STUDENT_LEADERS = "student_leaders"
    CLASS_REPS = "class_reps"


# ============================================
# FOUND ITEM CATEGORIES & STATUSES
# ============================================

class ItemCategory(Enum):
    ID_CARD = "id"
    BANK_CARD = "bank_card"
    KEYS = "keys"
    GADGET = "gadget"
    DOCUMENT = "document"
    CLOTHING = "clothing"
    BAG = "bag"
    OTHER = "other"


class ItemStatus(Enum):
    PROCESSING = "processing"
    ACTIVE = "active"
    PENDING_CLAIM = "pending_claim"
    CLAIMED = "claimed"
    HANDED_OVER = "handed_over"
    ARCHIVED = "archived"
    BLUR_FAILED = "blur_failed"
    DISPUTED = "disputed"


class ClaimStatus(Enum):
    PENDING = "pending"
    OWNERSHIP_VERIFIED = "ownership_verified"
    EVIDENCE_SUBMITTED = "evidence_submitted"
    SECURITY_VERIFIED = "security_verified"
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_RECEIVED = "payment_received"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class TicketStatus(Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    AWAITING_USER = "awaiting_user"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class OpportunityCategory(Enum):
    INTERNSHIP = "internship"
    SCHOLARSHIP = "scholarship"
    ATTACHMENT = "attachment"
    CONCERT = "concert"
    WORKSHOP = "workshop"
    COMPETITION = "competition"
    JOB = "job"
    VOLUNTEER = "volunteer"
    OTHER = "other"


class TransactionType(Enum):
    STUDENT_PAYMENT = "student_payment"
    FINDER_PAYOUT = "finder_payout"
    PLATFORM_FEE = "platform_fee"
    REFUND = "refund"


class TransactionStatus(Enum):
    INITIATED = "initiated"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"
    PENDING_RETRY = "pending_retry"


class SplitStatus(Enum):
    PAID_TO_PLATFORM_ONLY = "paid_to_platform_only"
    FINDER_PAID = "finder_paid"
    FULLY_SETTLED = "fully_settled"


# ============================================
# SCHOLARSHIP REVIEW STATUS
# ============================================
class ScholarshipReviewStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    REVIEWED = "reviewed"


# ============================================
# AUDIT LOG ACTION TYPES
# ============================================

class AuditAction:
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
    ROLE_EXPIRED = "ROLE_EXPIRED"
    ROLE_REVOKED = "ROLE_REVOKED"
    ROLE_RENEWED = "ROLE_RENEWED"
    ROLE_MODIFIED = "ROLE_MODIFIED"
    USER_CREATED = "USER_CREATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_REACTIVATED = "USER_REACTIVATED"
    USER_DELETED = "USER_DELETED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    SESSION_REVOKED = "SESSION_REVOKED"
    ALL_SESSIONS_REVOKED = "ALL_SESSIONS_REVOKED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED"
    OTP_SENT = "OTP_SENT"
    OTP_VERIFIED = "OTP_VERIFIED"
    ANNOUNCEMENT_CREATED = "ANNOUNCEMENT_CREATED"
    ANNOUNCEMENT_UPDATED = "ANNOUNCEMENT_UPDATED"
    ANNOUNCEMENT_DELETED = "ANNOUNCEMENT_DELETED"
    ANNOUNCEMENT_REPORTED = "ANNOUNCEMENT_REPORTED"
    REPORT_RESOLVED = "REPORT_RESOLVED"
    ITEM_POSTED = "ITEM_POSTED"
    ITEM_APPROVED = "ITEM_APPROVED"
    ITEM_REJECTED = "ITEM_REJECTED"
    ITEM_UPDATED = "ITEM_UPDATED"
    ITEM_DELETED = "ITEM_DELETED"
    ITEM_IMAGE_BLURRED = "ITEM_IMAGE_BLURRED"
    ITEM_IMAGE_BLUR_FAILED = "ITEM_IMAGE_BLUR_FAILED"
    ITEM_PII_SCRUBBED = "ITEM_PII_SCRUBBED"
    CLAIM_SUBMITTED = "CLAIM_SUBMITTED"
    CLAIM_OWNERSHIP_VERIFIED = "CLAIM_OWNERSHIP_VERIFIED"
    CLAIM_OWNERSHIP_REJECTED = "CLAIM_OWNERSHIP_REJECTED"
    CLAIM_SECURITY_VERIFIED = "CLAIM_SECURITY_VERIFIED"
    CLAIM_EVIDENCE_SUBMITTED = "CLAIM_EVIDENCE_SUBMITTED"
    CLAIM_APPROVED = "CLAIM_APPROVED"
    CLAIM_REJECTED = "CLAIM_REJECTED"
    CLAIM_COMPLETED = "CLAIM_COMPLETED"
    CLAIM_PAYMENT_INITIATED = "CLAIM_PAYMENT_INITIATED"
    CLAIM_PAYMENT_RECEIVED = "CLAIM_PAYMENT_RECEIVED"
    OPPORTUNITY_CREATED = "OPPORTUNITY_CREATED"
    OPPORTUNITY_EXPIRED = "OPPORTUNITY_EXPIRED"
    OPPORTUNITY_DELETED = "OPPORTUNITY_DELETED"
    OPPORTUNITY_REPORTED = "OPPORTUNITY_REPORTED"
    TIMETABLE_CREATED = "TIMETABLE_CREATED"
    TIMETABLE_UPDATED = "TIMETABLE_UPDATED"
    TIMETABLE_DELETED = "TIMETABLE_DELETED"
    ATTENDANCE_MARKED = "ATTENDANCE_MARKED"
    ATTENDANCE_VERIFIED = "ATTENDANCE_VERIFIED"
    DATA_EXPORT_REQUESTED = "DATA_EXPORT_REQUESTED"
    DATA_EXPORT_DOWNLOADED = "DATA_EXPORT_DOWNLOADED"
    DATA_DELETION_REQUESTED = "DATA_DELETION_REQUESTED"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    CONFIGURATION_CHANGED = "CONFIGURATION_CHANGED"
    MAINTENANCE_STARTED = "MAINTENANCE_STARTED"
    MAINTENANCE_ENDED = "MAINTENANCE_ENDED"


# ============================================
# NOTIFICATION TYPES
# ============================================

class NotificationType:
    WELCOME = "welcome"
    ANNOUNCEMENT = "announcement"
    ANNOUNCEMENT_URGENT = "announcement_urgent"
    ATTENDANCE_REMINDER = "attendance_reminder"
    CLASS_REMINDER = "class_reminder"
    ITEM_FOUND = "item_found"
    CLAIM_UPDATE = "claim_update"
    CLAIM_APPROVED = "claim_approved"
    CLAIM_REJECTED = "claim_rejected"
    TIP_RECEIVED = "tip_received"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_EXPIRED = "role_expired"
    ROLE_EXPIRING_SOON = "role_expiring_soon"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_FAILED = "payment_failed"
    TICKET_UPDATED = "ticket_updated"
    BADGE_EARNED = "badge_earned"
    OPPORTUNITY_EXPIRING = "opportunity_expiring"
    SYSTEM = "system"
    # New
    SCHOLARSHIP_REVIEW_READY = "scholarship_review_ready"


class ReportReason(Enum):
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    MISINFORMATION = "misinformation"
    HARASSMENT = "harassment"
    SCAM = "scam"
    EXPIRED = "expired"
    DUPLICATE = "duplicate"
    OTHER = "other"


class TicketCategory(Enum):
    TECHNICAL = "technical"
    ACCOUNT = "account"
    FEATURE = "feature"
    BUG = "bug"
    BILLING = "billing"
    OTHER = "other"


class SyncMethod(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    QR_CODE = "qr_code"
    LOCATION = "location"
    MANUAL = "manual"


class DayOfWeek(Enum):
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


# ============================================
# PLATFORM CONFIGURATION DEFAULTS
# ============================================

class PlatformDefaults:
    DEFAULT_ATTENDANCE_RADIUS_METERS = 100
    ATTENDANCE_WINDOW_BEFORE_MINUTES = 10
    ATTENDANCE_WINDOW_AFTER_MINUTES = 30
    RECOVERY_FEE_AMOUNT = "100.00"
    PLATFORM_FEE_PERCENTAGE = 50
    FINDER_PAYOUT_PERCENTAGE = 50
    AUTO_CONFIRM_CLAIM_DAYS = 7
    PII_SCRUB_DELAY_DAYS = 7
    DEFAULT_EXPIRY_DAYS = 21
    MAX_EXPIRY_DAYS = 60
    DEFAULT_OPPORTUNITY_EXPIRY_DAYS = 120
    REFRESH_TOKEN_EXPIRY_DAYS = 30
    ACCESS_TOKEN_EXPIRY_MINUTES = 10080 # 7 days
    ONLINE_STATUS_TTL_SECONDS = 120
    AUDIT_LOG_RETENTION_DAYS = 365
    FEED_CACHE_TIMEOUT_SECONDS = 3600
    GEOCODE_CACHE_TIMEOUT_SECONDS = 2592000


class ScopeType(Enum):
    CLASS = "class"
    DEPARTMENT = "department"
    FACULTY = "faculty"
    INSTITUTION = "institution"


BLOG_CATEGORY_DEFAULTS = [
    {"icon": "📚", "name": "Course Critiques", "slug": "course-critiques", "description": "Honest reviews of university courses"},
    {"icon": "💰", "name": "Student Marketplace", "slug": "student-marketplace", "description": "Buy, sell, and trade student items"},
    {"icon": "💡", "name": "Academic Tips", "slug": "academic-tips", "description": "Study hacks and academic advice"},
    {"icon": "🎓", "name": "Career Advice", "slug": "career-advice", "description": "Internship and career guidance"},
    {"icon": "🏠", "name": "Campus Life", "slug": "campus-life", "description": "Events, clubs, and experiences"},
    {"icon": "🔧", "name": "Tools & Resources", "slug": "tools-resources", "description": "Recommended tools for students"},
]


class ImageProcessing:
    MAX_IMAGE_SIZE_MB = 10
    ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
    BLUR_GAUSSIAN_KERNEL = (99, 99)
    BLUR_GAUSSIAN_SIGMA = 30
    BLURRED_IMAGE_QUALITY = 85
    FACE_DETECTION_SCALE_FACTOR = 1.1
    FACE_DETECTION_MIN_NEIGHBORS = 5
    FACE_DETECTION_MIN_SIZE = (30, 30)
    BLUR_REGION_PADDING = 20
    ADDRESS_REGION_THRESHOLD = 0.7