from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/room/(?P<room_id>[a-f0-9\-]+)/$', consumers.RoomConsumer.as_asgi()),
]