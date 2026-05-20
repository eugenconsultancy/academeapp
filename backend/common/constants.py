from enum import Enum

class UserRole(str, Enum):
    STUDENT = 'student'
    CLASS_REP = 'class_rep'
    STUDENT_LEADER = 'student_leader'
    FACULTY_REP = 'faculty_rep'
    ADMIN = 'admin'

class ItemCategory(str, Enum):
    ID = 'id'
    BANK_CARD = 'bank_card'
    KEYS = 'keys'
    DOCUMENT = 'document'
    GADGET = 'gadget'
    OTHER = 'other'

class ClaimStatus(str, Enum):
    PENDING = 'pending'
    VERIFIED = 'verified'
    AWAITING_PAYMENT = 'awaiting_payment'
    PAYMENT_RECEIVED = 'payment_received'
    CLAIMED = 'claimed'
    REJECTED = 'rejected'
    DISPUTED = 'disputed'

class ItemStatus(str, Enum):
    PROCESSING = 'processing'
    ACTIVE = 'active'
    CLAIMED = 'claimed'
    BLUR_FAILED = 'blur_failed'
    EXPIRED = 'expired'

class AnnouncementTarget(str, Enum):
    ENTIRE_INSTITUTION = 'entire_institution'
    SPECIFIC_CLASSES = 'specific_classes'

class TicketStatus(str, Enum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'
    CLOSED = 'closed'

class BadgeType(str, Enum):
    LOGIN_BRONZE = 'login_bronze'
    LOGIN_SILVER = 'login_silver'
    LOGIN_GOLD = 'login_gold'
    HIGH_ENGAGER = 'high_engager'

BADGE_THRESHOLDS = {
    BadgeType.LOGIN_BRONZE: 10,
    BadgeType.LOGIN_SILVER: 50,
    BadgeType.LOGIN_GOLD: 200,
    BadgeType.HIGH_ENGAGER: 100,
}