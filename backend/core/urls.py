import os
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse, FileResponse, JsonResponse
from django.conf import settings
from django.conf.urls.static import static

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR.parent / 'frontend' / 'dist'

def serve_react_app(request):
    index_file = FRONTEND_DIST / 'index.html'
    if index_file.exists():
        with open(index_file, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return JsonResponse({
        'name': 'Event & Workshop QR Check-In API',
        'status': 'online',
        'message': 'Backend is running. Run npm run dev in frontend or npm run build to serve the UI.'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('events.urls')),
]

# Serve assets from React dist
if (FRONTEND_DIST / 'assets').exists():
    urlpatterns += static('/assets/', document_root=str(FRONTEND_DIST / 'assets'))

# Catch-all to serve React SPA
urlpatterns += [
    re_path(r'^(?!api|admin|assets).*$', serve_react_app, name='react-app'),
]
