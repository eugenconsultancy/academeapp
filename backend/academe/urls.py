# C:\Users\GATARA-BJTU\academe\backend\academe\urls.py

from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

# Imports for serving static/media files in development
from django.conf import settings
from django.conf.urls.static import static

from apps.accounts.api import router as accounts_router
from apps.classes.api import router as classes_router
from apps.found_items.api import router as found_items_router
from apps.announcements.api import router as announcements_router
from apps.opportunities.api import router as opportunities_router
from apps.support.api import router as support_router
from apps.blog.api import router as blog_router
from apps.search.api import router as search_router
from apps.geoservice.api import router as geoservice_router
from apps.governance.api import router as governance_router
from apps.notifications.api import router as notifications_router
from apps.chat.api import router as chat_router

api = NinjaAPI(
    title="Academe API",
    version="1.0.0",
)

api.add_router("/accounts/", accounts_router, tags=["Accounts"])
api.add_router("/classes/", classes_router, tags=["Classes"])
api.add_router("/found-items/", found_items_router, tags=["Found Items"])
api.add_router("/announcements/", announcements_router, tags=["Announcements"])
api.add_router("/opportunities/", opportunities_router, tags=["Opportunities"])
api.add_router("/support/", support_router, tags=["Support"])
api.add_router("/search/", search_router, tags=["Search"])
api.add_router("/blog/", blog_router, tags=["Blog"])
api.add_router("/geo/", geoservice_router, tags=["Geoservice"])
api.add_router("/governance/", governance_router, tags=["Governance"])
api.add_router("/notifications/", notifications_router, tags=["Notifications"])
api.add_router("/chat/", chat_router, tags=["Chat"])

# Health check
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok', 'version': '1.0.0'})

urlpatterns = [
    path('health/', health_check),   # ← changed from 'api/health/' to match the proxy-stripped path
    path('admin/', admin.site.urls),
    path('', api.urls),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)