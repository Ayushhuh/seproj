from django import forms
from .models import Room


class RoomForm(forms.ModelForm):
    class Meta:
        model = Room
        fields = ['video_type', 'video_url', 'video_file']


class YouTubeForm(forms.Form):
    video_url = forms.URLField(
        label='YouTube URL',
        widget=forms.URLInput(attrs={'placeholder': 'https://www.youtube.com/watch?v=...'})
    )