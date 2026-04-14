from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts import views as accounts_views
from rooms import views as rooms_views
from rooms import api as rooms_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', accounts_views.register, name='register'),
    path('login/', accounts_views.login_view, name='login'),
    path('logout/', accounts_views.logout_view, name='logout'),
    path('dashboard/', rooms_views.dashboard, name='dashboard'),
    path('room/create/', rooms_views.create_room, name='create_room'),
    path('room/<uuid:room_id>/', rooms_views.room_detail, name='room_detail'),
    path('room/<uuid:room_id>/update_video/', rooms_views.update_video, name='update_video'),
    path('room/<uuid:room_id>/chat/', rooms_api.get_chat_messages, name='get_chat_messages'),
    path('room/<uuid:room_id>/chat/send/', rooms_api.send_chat_message, name='send_chat_message'),
    path('', accounts_views.home, name='home'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)