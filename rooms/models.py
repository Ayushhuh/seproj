import uuid
from django.db import models
from django.conf import settings


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_rooms'
    )
    video_type = models.CharField(
        max_length=10,
        choices=[('youtube', 'YouTube'), ('upload', 'Upload')],
        default='youtube'
    )
    video_url = models.CharField(max_length=500, blank=True, null=True)
    video_file = models.FileField(upload_to='videos/', blank=True, null=True)
    current_time = models.FloatField(default=0.0)
    is_playing = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room {self.id} - Host: {self.host.username}"


class ChatMessage(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='chat_messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username}: {self.message[:20]}..."


class Participant(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='participations'
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'room')

    def __str__(self):
        return f"{self.user.username} in {self.room.id}"