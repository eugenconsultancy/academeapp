import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-secret-key-here')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')



# Jazzmin should always be before django.contrib.admin
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'corsheaders',
    'storages',
    
    # Local apps
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
    'common',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'common.middleware.RateLimitMiddleware',
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

# DATABASES - SQLite for Development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,  # Max seconds o wait for a database lock to clear
        },
    }
}

AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_PASSWORD')

# Cross origin RS
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',')

# Celery
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Nairobi'

# JWT Settings
NINJA_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# AWS S3
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
AWS_DEFAULT_ACL = 'private'
AWS_S3_ENCRYPTION = True

if DEBUG and not AWS_ACCESS_KEY_ID:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Firebase FOR PUSH NOTIFICATIONS
FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS_PATH')

# ==============================================================================
# 💳 INTASEND PRODUCTION PAYMENT INTEGRATION
# ==============================================================================
INTASEND_SECRET_KEY = 'ISSecretKey_live_899f0bd8-6a95-435d-bb1f-6d8803411fd2'
INTASEND_PUBLISHABLE_KEY = 'ISPubKey_live_442dc7f8-5a18-49e2-b533-ce825a6893b9'

# Rate Limiting
OTP_RATE_LIMIT = 3
OTP_RATE_WINDOW = 3600

# Attendance
ATTENDANCE_WINDOW_BEFORE = 10
ATTENDANCE_WINDOW_AFTER = 10
SYNC_GRACE_PERIOD = 30

# Escrow and Platform Rules
ESCROW_AUTO_CONFIRM_DAYS = 7
ESCROW_FEE_PERCENTAGE = 50
PLATFORM_FEE_PERCENTAGE = 50

# Search
SEARCH_BACKEND = 'django.db.models.Q'

# File upload limits
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024   # 10 MB

# ============================================
# JAZZMIN – MODERN SAAS DASHBOARD (Top Nav + Contextual Sidebar)
# ============================================
JAZZMIN_SETTINGS = {
    "site_title": "Academe Admin",
    "site_header": "Academe",
    "site_brand": "Academe",
    "welcome_sign": "Welcome to Academe",
    "copyright": "Academe – Student Affairs Platform",

    # Sidebar: we are using a custom contextual sidebar, not the default.
    "show_sidebar": False,  # hide Jazzmin sidebar completely
    "navigation_expanded": False,
    "hide_apps": [],
    "hide_models": [],

    # Top menu (replaced by custom top nav in JS)
    "topmenu_links": [],

    "usermenu_links": [
        {"name": "Profile", "model": "accounts.User"},
        {"name": "Logout", "url": "admin:logout"},
    ],

    "icons": {
        "accounts.User": "fas fa-user-graduate",
        "accounts.Badge": "fas fa-medal",
        "found_items.FoundItem": "fas fa-box-open",
        "announcements.Announcement": "fas fa-bullhorn",
        "opportunities.Opportunity": "fas fa-briefcase",
        "classes.ClassGroup": "fas fa-layer-group",
        "support.SupportTicket": "fas fa-ticket-alt",
        "auth.Group": "fas fa-users-cog",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    "related_modal_active": True,
    "custom_css": "admin/css/custom_admin.css",
    "custom_js": "admin/js/theme_toggle.js",
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "language_chooser": False,
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": True,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-purple",
    "navbar": "navbar-dark bg-dark",
    "no_navbar_border": True,
    "navbar_fixed": False,       # we handle our own fixed top nav
    "sidebar_fixed": False,      # we use custom sidebar
    "sidebar": "sidebar-dark-purple",
    "sidebar_nav_flat_style": True,
    "theme": "slate",
    "dark_mode_theme": "darkly",
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

# ── DASHBOARD LAYOUT ──────────────────────────
JAZZMIN_DASHBOARD = {
    "title": "Academe Admin Portal",
    "sections": [
        # Quick Stats Row
        {
            "name": "Quick Stats",
            "column": 0,
            "row": 0,
            "span": 12,
            "widgets": [
                {"type": "stat_card", "title": "Total Users", "model": "accounts.User", "count": True, "icon": "fas fa-users", "color": "primary"},
                {"type": "stat_card", "title": "Found Items", "model": "found_items.FoundItem", "count": True, "icon": "fas fa-box-open", "color": "success"},
                {"type": "stat_card", "title": "Announcements", "model": "announcements.Announcement", "count": True, "icon": "fas fa-bullhorn", "color": "warning"},
                {"type": "stat_card", "title": "Open Tickets", "model": "support.SupportTicket", "filters": {"status": "open"}, "icon": "fas fa-ticket-alt", "color": "danger"},
            ],
        },
        # Feature Tiles + Activity Feed
        {
            "name": "Model Quick Access",
            "column": 0,
            "row": 1,
            "span": 8,
            "widgets": [
                {
                    "type": "model_list",
                    "models": [
                        "accounts.User",
                        "found_items.FoundItem",
                        "announcements.Announcement",
                        "opportunities.Opportunity",
                        "classes.ClassGroup",
                        "support.SupportTicket",
                    ],
                    "columns": 3,
                    "icon": "fas fa-th",
                },
            ],
        },
        {
            "name": "Recent Activity",
            "column": 1,
            "row": 1,
            "span": 4,
            "widgets": [
                {
                    "type": "recent_actions",
                    "limit": 8,
                    "icon": "fas fa-clock",
                    "scrollable": True,
                },
            ],
        },
    ],
}

# ============================================
# 🖼️ ADMIN CUSTOMIZATION
# ============================================

# Admin site customization
ADMIN_SITE_HEADER = "Academe Administration"
ADMIN_SITE_TITLE = "Academe Admin Portal"
ADMIN_INDEX_TITLE = "Welcome to Academe Dashboard"

# Number of items per page in admin
ADMIN_LIST_PER_PAGE = 20