from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from rooms.models import Room, ChatMessage
import json


@login_required
def get_chat_messages(request, room_id):
    room = Room.objects.filter(id=room_id).first()
    if not room:
        return JsonResponse({'error': 'Room not found'}, status=404)
    
    messages = ChatMessage.objects.filter(room=room).order_by('created_at')[:50]
    
    data = [{
        'username': msg.user.username,
        'message': msg.message,
        'time': msg.created_at.strftime('%H:%M')
    } for msg in messages]
    
    return JsonResponse({'messages': data})


@login_required
@csrf_exempt
def send_chat_message(request, room_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            data = request.POST.dict()
        
        message = data.get('message', '').strip()
        if not message:
            return JsonResponse({'error': 'Empty message'}, status=400)
        
        room = Room.objects.filter(id=room_id).first()
        if not room:
            return JsonResponse({'error': 'Room not found'}, status=404)
        
        chat_msg = ChatMessage.objects.create(
            room=room,
            user=request.user,
            message=message
        )
        
        return JsonResponse({
            'success': True,
            'message': {
                'username': request.user.username,
                'message': message,
                'time': chat_msg.created_at.strftime('%H:%M')
            }
        })
    
    return JsonResponse({'error': 'Invalid method'}, status=405)