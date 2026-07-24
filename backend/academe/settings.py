# backend/academe/settings.py
import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-secret-key-here')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'corsheaders',
    'storages',
    'channels',
    
    'apps.accounts',
    'apps.classes',
    'apps.found_items',
    'apps.announcements',
    'apps.opportunities',
    'apps.support',
    'apps.blog',
    'apps.search',
    'apps.geoservice',
    'apps.governance',
    'apps.notifications',
    'apps.chat',
    'common',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # <-- Must be the very first item!
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    
    # IMPORTANT: AuthenticationMiddleware MUST come before UpdateLastSeenMiddleware
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'common.middleware.RateLimitMiddleware',
    
    # UpdateLastSeenMiddleware must be AFTER AuthenticationMiddleware
    'common.middleware.UpdateLastSeenMiddleware',
]

ROOT_URLCONF = 'academe.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'academe.wsgi.application'
ASGI_APPLICATION = 'academe.asgi.application'

# ============================================
# DATABASE - PostgreSQL with fallback to DATABASE_URL
# ============================================
if os.getenv('DATABASE_URL'):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=os.getenv('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'academe_db',
            'USER': 'academe_user',
            'PASSWORD': 'my_secure_password_123',
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }

# ============================================
# CHANNEL LAYERS - Production Redis configuration
# ============================================
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

if not DEBUG and REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
                "capacity": 1500,
                "expiry": 10,
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

AUTH_USER_MODEL = 'accounts.User'

# ============================================
# AUTHENTICATION & PASSWORD VALIDATION
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        },
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# ============================================
# STATIC & MEDIA FILES
# ============================================
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# EMAIL CONFIGURATION
# ============================================
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@academe.com')

# Get current Ngrok URL from environment or use the known default
NGROK_URL = os.getenv('NGROK_URL', 'https://granitic-imbricately-dede.ngrok-free.dev')

# IMPORTANT: NEVER set CORS_ALLOW_ALL_ORIGINS = True when CORS_ALLOW_CREDENTIALS = True
# because the browser will reject the response (CORS spec forbids '*' with credentials).
CORS_ALLOW_ALL_ORIGINS = False   # Keep this False always

CORS_ALLOW_CREDENTIALS = True

# Critical headers for both REST and WebSocket
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "ngrok-skip-browser-warning",
    "idempotency-key",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip",
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

# ── Allowed origins ──────────────────────────────────────────
# Add ALL origins that may send requests (Vite dev servers, Ngrok, etc.)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://10.5.50.15:5173",
    "https://granitic-imbricately-dede.ngrok-free.dev",
]

# Dynamically add your current Vite network IP (so phone on same Wi‑Fi works)
# Option 1: read from environment variable (recommended)
DEV_CLIENT_ORIGIN = os.getenv("DEV_CLIENT_ORIGIN")
if DEV_CLIENT_ORIGIN:
    CORS_ALLOWED_ORIGINS.append(DEV_CLIENT_ORIGIN)
else:
    # Option 2: hardcode your current IP as fallback (update if it changes)
    CORS_ALLOWED_ORIGINS.append("http://192.168.43.52:5173")

# Add the Ngrok URL from env if different from the default
if NGROK_URL and NGROK_URL not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(NGROK_URL)

# If DEBUG, allow extra localhost ports (but still no wildcard)
if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5174",
        "http://localhost:5175",
    ])

# ── CSRF Trusted Origins ─────────────────────────────────────
# Needed for session authentication & WebSocket upgrade requests
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://granitic-imbricately-dede.ngrok-free.dev",
]

if NGROK_URL:
    CSRF_TRUSTED_ORIGINS.append(NGROK_URL)

# Also trust the Vite network IP
if DEV_CLIENT_ORIGIN:
    CSRF_TRUSTED_ORIGINS.append(DEV_CLIENT_ORIGIN)
else:
    CSRF_TRUSTED_ORIGINS.append("http://192.168.43.52:5173")

# ── Proxy / Ngrok security ───────────────────────────────────
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Session security (adjust for development) - defined once later

# ============================================
# CELERY CONFIGURATION
# ============================================
if DEBUG:
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'cache+memory://'
else:
    CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Nairobi'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_TASK_SOFT_TIME_LIMIT = 20 * 60

# ============================================
# JWT CONFIGURATION (for Django Ninja JWT)
# ============================================
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)

NINJA_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'type',
    'JTI_CLAIM': 'jti',
}

# ============================================
# AWS S3 CONFIGURATION
# ============================================
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
AWS_DEFAULT_ACL = 'private'
AWS_S3_ENCRYPTION = True
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Use S3 for file storage in production, local filesystem in development
if not DEBUG and all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME]):
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

AWS_PRIVATE_BUCKET_NAME = os.getenv('AWS_PRIVATE_BUCKET_NAME', AWS_STORAGE_BUCKET_NAME)
AWS_PUBLIC_BUCKET_NAME = os.getenv('AWS_PUBLIC_BUCKET_NAME', AWS_STORAGE_BUCKET_NAME)

# ============================================
# FIREBASE / PUSH NOTIFICATIONS
# ============================================
FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS_PATH')
FCM_ENABLED = bool(FIREBASE_CREDENTIALS and os.path.exists(FIREBASE_CREDENTIALS)) if FIREBASE_CREDENTIALS else False

# ============================================
# PAYMENT INTEGRATION
# ============================================
INTASEND_SECRET_KEY = os.getenv('INTASEND_SECRET_KEY')
INTASEND_PUBLISHABLE_KEY = os.getenv('INTASEND_PUBLISHABLE_KEY')

# ============================================
# RATE LIMITING
# ============================================
OTP_RATE_LIMIT = 3
OTP_RATE_WINDOW = 3600  # seconds

# Chat rate limits (aligned with project specification)
CHAT_RATE_LIMIT_MESSAGES_PER_DAY = 60     # 60 messages per day as per requirement
CHAT_RATE_LIMIT_CONVERSATIONS_PER_HOUR = 10
CHAT_RATE_LIMIT_REPORTS_PER_HOUR = 5
CHAT_TYPING_RATE_LIMIT_PER_MINUTE = 5
CHAT_MESSAGE_EDIT_WINDOW_SECONDS = 300   # 5 minutes

# ============================================
# CHAT SPECIFIC SETTINGS
# ============================================
MAX_DAILY_MESSAGES = CHAT_RATE_LIMIT_MESSAGES_PER_DAY
CHAT_MESSAGE_DELETE_FOR_EVERYONE_WINDOW_SECONDS = 3600   # 1 hour
CHAT_PRESENCE_TTL_SECONDS = 300                          # 5 minutes
CHAT_TYPING_INDICATOR_TIMEOUT_MS = 5000
CHAT_MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024               # 10 MB
CHAT_ALLOWED_ATTACHMENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
]

# ============================================
# ATTENDANCE CONFIGURATION
# ============================================
ATTENDANCE_WINDOW_BEFORE = 10
ATTENDANCE_WINDOW_AFTER = 10
SYNC_GRACE_PERIOD = 30

# ============================================
# ESCROW / FOUND ITEMS
# ============================================
ESCROW_AUTO_CONFIRM_DAYS = 7
ESCROW_FEE_PERCENTAGE = 50
PLATFORM_FEE_PERCENTAGE = 50

# ============================================
# SEARCH CONFIGURATION
# ============================================
SEARCH_BACKEND = 'django.db.models.Q'

# ============================================
# FILE UPLOAD LIMITS
# ============================================
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB for chat file uploads
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000

# ============================================
# WEBSOCKET CONFIGURATION
# ============================================
WEBSOCKET_HEARTBEAT_INTERVAL = 30  # seconds
WEBSOCKET_HEARTBEAT_TIMEOUT = 10  # seconds
WEBSOCKET_MAX_CONNECTIONS_PER_USER = 5

# ============================================
# CACHING - Redis for production
# ============================================
if not DEBUG and REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'PARSER_CLASS': 'redis.connection.HiredisParser',
                'CONNECTION_POOL_CLASS': 'redis.BlockingConnectionPool',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'timeout': 20,
                    # Low timeouts for fail-fast behavior
                    'socket_connect_timeout': 0.5, 
                    'socket_timeout': 0.5,
                },
                'MAX_CONNECTIONS': 1000,
                'PICKLE_VERSION': -1,
            },
            'KEY_PREFIX': 'academe',
            'TIMEOUT': 300,  # 5 minutes default
        }
    }
    
    # Session cache
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }

# Session cookie settings
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF cookie settingsa
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read CSRF token
CSRF_COOKIE_SAMESITE = 'Lax'

# ============================================
# SECURITY SETTINGS (Production)
# ============================================
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SAMESITE = 'Strict'

# ============================================
# LOGGING CONFIGURATION
# ============================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'level': 'INFO',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'academe.log',
            'formatter': 'verbose',
            'level': 'WARNING',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.chat': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'websocket': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
if not LOGS_DIR.exists():
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

# ============================================
# JAZZMIN – ADMIN PANEL CONFIGURATION
# ============================================
JAZZMIN_SETTINGS = {
    "site_title": "Academe Admin",
    "site_header": "Academe",
    "site_brand": "Academe",
    "site_logo": None,
    "login_logo": None,
    "login_logo_dark": None,
    "site_logo_classes": "img-circle",
    "site_icon": None,
    "welcome_sign": "Welcome to Academe Administration",
    "copyright": "Academe – Student Affairs Platform",
    
    # FIX: Must be a single string, not a list
    "search_model": "accounts.User", 
    
    "user_avatar": "profile_pic",
    
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Support", "url": "/admin/support/supportticket/", "permissions": ["support.view_supportticket"]},
        {"model": "accounts.User"},
        {"app": "chat"},
    ],
    
    "usermenu_links": [
        {"name": "View Site", "url": "/", "new_window": True},
        {"name": "Support", "url": "/admin/support/supportticket/", "permissions": ["support.view_supportticket"]},
        {"model": "accounts.User"},
    ],
    
    "show_sidebar": True,
    "navigation_expanded": False,
    "hide_apps": [],
    "hide_models": [],
    
    "order_with_respect_to": [
        "accounts",
        "chat",
        "governance",
        "announcements",
        "opportunities",
        "classes",
        "found_items",
        "support",
        "blog",
    ],
    
    "custom_links": {
        "chat": [{
            "name": "View Conversations",
            "url": "admin:chat_conversation_changelist",
            "icon": "fas fa-comments",
            "permissions": ["chat.view_conversation"]
        }],
        "governance": [{
            "name": "Audit Logs",
            "url": "admin:governance_auditlog_changelist",
            "icon": "fas fa-history",
        }],
    },
    
    "icons": {
        "accounts.User": "fas fa-user-graduate",
        "accounts.Badge": "fas fa-medal",
        "accounts.StudentRole": "fas fa-user-tag",
        "accounts.UserSession": "fas fa-history",
        "chat.Conversation": "fas fa-comments",
        "chat.Message": "fas fa-comment-dots",
        "chat.BlockList": "fas fa-ban",
        "chat.Report": "fas fa-flag",
        "chat.ConversationParticipant": "fas fa-user-cog",
        "found_items.FoundItem": "fas fa-box-open",
        "found_items.Claim": "fas fa-hand-holding-heart",
        "announcements.Announcement": "fas fa-bullhorn",
        "opportunities.Opportunity": "fas fa-briefcase",
        "classes.ClassGroup": "fas fa-layer-group",
        "classes.AttendanceEntry": "fas fa-calendar-check",
        "classes.TimetableEntry": "fas fa-clock",
        "support.SupportTicket": "fas fa-ticket-alt",
        "support.TicketReply": "fas fa-reply",
        "blog.BlogPost": "fas fa-blog",
        "blog.BlogComment": "fas fa-comment",
        "governance.AuditLog": "fas fa-history",
        "governance.Vote": "fas fa-vote-yea",
        "governance.Survey": "fas fa-poll",
        "notifications.Notification": "fas fa-bell",
        "auth.Group": "fas fa-users",
        "auth.User": "fas fa-user",
    },
    
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    
    "related_modal_active": True,
    "custom_css": "admin/css/custom_admin.css",
    "custom_js": None,
    "show_ui_builder": False,
    
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "accounts.user": "vertical_tabs",
        "chat.conversation": "carousel",
    },
    
    "language_chooser": False,
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": True,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": False,
    "accent": "accent-primary",
    "navbar": "navbar-dark bg-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": True,
    "theme": "slate",
    "dark_mode_theme": "slate",
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
    },
    "actions_sticky_top": True,
}

ADMIN_SITE_HEADER = "Academe Administration"
ADMIN_SITE_TITLE = "Academe Admin Portal"
ADMIN_INDEX_TITLE = "Welcome to Academe Dashboard"
ADMIN_LIST_PER_PAGE = 20

# ============================================
# CUSTOM APP CONFIGURATIONS
# ============================================
# Disable automatic trailing slash redirects to prevent POST data loss
APPEND_SLASH = False
# Notification settings
NOTIFICATION_EXPIRY_DAYS = 30
NOTIFICATION_BATCH_SIZE = 100

# Blog settings
BLOG_POSTS_PER_PAGE = 10
BLOG_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

# Governance settings
GOVERNANCE_VOTE_EXPIRY_DAYS = 7
GOVERNANCE_SURVEY_RESPONSE_LIMIT = 1000

# Support ticket settings
SUPPORT_TICKET_AUTO_CLOSE_DAYS = 7
SUPPORT_TICKET_ESCALATION_HOURS = 48