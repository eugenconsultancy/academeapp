from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from apps.accounts.api import router as accounts_router
from apps.classes.api import router as classes_router
from apps.found_items.api import router as found_items_router
from apps.announcements.api import router as announcements_router
from apps.opportunities.api import router as opportunities_router
from apps.support.api import router as support_router
from apps.blog.api import router as blog_router
from apps.search.api import router as search_router
# Make sure to import your geo router here:
from apps.geoservice.api import router as geoservice_router
from apps.governance.api import router as governance_router

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
# Fixed: Closed the parenthesis at the very end of the line
api.add_router("/geo/", geoservice_router, tags=["Geoservice"]) 
api.add_router("/governance/", governance_router, tags=["Governance"])

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]