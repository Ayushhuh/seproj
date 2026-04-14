import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rooms.models import Room, Participant, ChatMessage

logger = logging.getLogger(__name__)


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'room_{self.room_id}'
            
            self.user = self.scope['user']
            logger.info(f"WebSocket connect: room={self.room_id}, user={self.user}")
            
            if not self.user.is_authenticated:
                logger.warning("WebSocket: User not authenticated")
                await self.close()
                return
            
            room_exists = await self.room_exists()
            if not room_exists:
                logger.warning(f"WebSocket: Room {self.room_id} does not exist")
                await self.close()
                return
            
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            
            await self.send_room_state()
            logger.info(f"WebSocket: Connected to room {self.room_id}")
        except Exception as e:
            logger.error(f"WebSocket connect error: {e}")
            await self.close()
    
    async def disconnect(self, code):
        logger.info(f"WebSocket disconnect: code={code}")
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        if not self.user.is_authenticated:
            return
        
        data = json.loads(text_data)
        msg_type = data.get('type')
        
        # Handle chat messages - anyone in room can send
        if msg_type == 'chat':
            message = data.get('message', '').strip()
            if message:
                username = self.user.username
                # Save to database
                await self.save_chat_message(message)
                # Broadcast to all
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_chat',
                        'username': username,
                        'message': message,
                    }
                )
            return
        
        # Handle video change events
        if data.get('type') == 'change_video':
            is_host = await self.is_host()
            if not is_host:
                return
            
            video_type = data.get('video_type')
            video_url = data.get('video_url')
            
            await self.update_video_info(video_type, video_url)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'video_changed',
                    'video_type': video_type,
                    'video_url': video_url,
                }
            )
            return
        
        # Handle playback events
        is_host = await self.is_host()
        if not is_host:
            return
        
        event_type = data.get('type')
        timestamp = data.get('timestamp')
        
        await self.update_room_state(event_type, timestamp)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'broadcast_event',
                'event_type': event_type,
                'timestamp': timestamp,
            }
        )
    
    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps({
            'type': event['event_type'],
            'timestamp': event['timestamp'],
        }))
    
    async def broadcast_chat(self, event):
        logger.info(f"Broadcasting chat: {event}")
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'username': event['username'],
            'message': event['message'],
        }))
    
    async def video_changed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'change_video',
            'video_type': event['video_type'],
            'video_url': event['video_url'],
        }))
    
    async def send_room_state(self):
        try:
            room = await self.get_room()
            if room:
                await self.send(text_data=json.dumps({
                    'type': 'sync_state',
                    'video_type': room.video_type,
                    'video_url': room.video_url,
                    'current_time': room.current_time,
                    'is_playing': room.is_playing,
                }))
                logger.info(f"Sent sync_state for room {self.room_id}")
        except Exception as e:
            logger.error(f"Error sending sync_state: {e}")
    
    @database_sync_to_async
    def room_exists(self):
        return Room.objects.filter(id=self.room_id).exists()
    
    @database_sync_to_async
    def is_host(self):
        return Room.objects.filter(id=self.room_id, host=self.user).exists()
    
    @database_sync_to_async
    def get_room(self):
        try:
            return Room.objects.get(id=self.room_id)
        except Room.DoesNotExist:
            return None
    
    @database_sync_to_async
    def update_room_state(self, event_type, timestamp):
        try:
            room = Room.objects.get(id=self.room_id)
            if event_type in ['play', 'pause', 'seek']:
                room.current_time = timestamp
                if event_type == 'play':
                    room.is_playing = True
                elif event_type == 'pause':
                    room.is_playing = False
                room.save()
        except Room.DoesNotExist:
            pass
    
    @database_sync_to_async
    def update_video_info(self, video_type, video_url):
        try:
            room = Room.objects.get(id=self.room_id)
            room.video_type = video_type
            room.video_url = video_url
            room.current_time = 0
            room.is_playing = False
            room.save()
        except Room.DoesNotExist:
            pass
    
    @database_sync_to_async
    def save_chat_message(self, message):
        try:
            room = Room.objects.get(id=self.room_id)
            ChatMessage.objects.create(room=room, user=self.user, message=message)
        except Room.DoesNotExist:
            pass