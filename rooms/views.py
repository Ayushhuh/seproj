from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Room, Participant
from .forms import RoomForm
import re


def extract_youtube_id(url):
    patterns = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
        r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


@login_required
def dashboard(request):
    user_rooms = Room.objects.filter(host=request.user)
    participating_rooms = Participant.objects.filter(user=request.user).select_related('room')
    return render(request, 'rooms/dashboard.html', {
        'user_rooms': user_rooms,
        'participating_rooms': participating_rooms,
    })


@login_required
def create_room(request):
    if request.method == 'POST':
        room = Room.objects.create(host=request.user)
        Participant.objects.create(user=request.user, room=room)
        messages.success(request, 'Room created successfully!')
        return redirect('room_detail', room_id=room.id)
    return render(request, 'rooms/create_room.html')


@login_required
def room_detail(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    
    is_host = room.host == request.user
    
    participant, created = Participant.objects.get_or_create(
        user=request.user,
        room=room
    )
    
    participants = Participant.objects.filter(room=room).select_related('user')
    
    youtube_id = None
    if room.video_type == 'youtube' and room.video_url:
        youtube_id = extract_youtube_id(room.video_url)
    
    return render(request, 'rooms/room_detail.html', {
        'room': room,
        'is_host': is_host,
        'participants': participants,
        'youtube_id': youtube_id,
    })


@login_required
def join_room(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    participant, created = Participant.objects.get_or_create(
        user=request.user,
        room=room
    )
    return redirect('room_detail', room_id=room.id)


@csrf_exempt
@login_required
def update_video(request, room_id):
    if request.method == 'POST':
        import json
        room = get_object_or_404(Room, id=room_id)
        
        if room.host != request.user:
            return JsonResponse({'error': 'Only host can change video'}, status=403)
        
        video_type = request.POST.get('video_type')
        
        if video_type == 'youtube':
            video_url = request.POST.get('video_url')
            room.video_type = 'youtube'
            room.video_url = video_url
            room.video_file = None
        else:
            video_file = request.FILES.get('video_file')
            if video_file:
                room.video_type = 'upload'
                room.video_file = video_file
                room.video_url = None
        
        room.current_time = 0
        room.is_playing = False
        room.save()
        
        return JsonResponse({
            'success': True, 
            'room_id': str(room.id),
            'video_url': room.video_file.url if room.video_file else None
        })
    
    return JsonResponse({'error': 'Invalid method'}, status=405)