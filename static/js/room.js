// Room Module - Main room controller

window.roomModule = (function() {
    var player = null;
    var ws = null;
    var roomId = null;
    var isHost = false;
    var currentVideoType = 'youtube';
    var currentVideoUrl = '';
    var ytPlayer = null; // The actual YT.Player object
    var lastKnownTime = 0; // Track last known time
    
    function init(config) {
        if (window._roomInitialized) return;
        
        roomId = config.roomId;
        isHost = config.isHost;
        currentVideoType = config.videoType || 'youtube';
        currentVideoUrl = config.videoUrl || '';
        
        player = window.playerModule;
        ws = window.websocketModule;
        
        if (!player || !ws) {
            setTimeout(function() { init(config); }, 100);
            return;
        }
        
        window._roomInitialized = true;
        console.log('Room: Init - host:', isHost);
        
        player.init({ isHost: isHost, currentTime: 0, isPlaying: false });
        setupWebSocket();
        
        // Bind controls for ALL users (host controls player, non-host just sees buttons disabled)
        bindPlayerControls();
        bindCopyLink();
        bindChatControls();
        loadChatMessages();
        
        // Poll for new chat messages every 2 seconds
        setInterval(loadChatMessages, 2000);
    }
    
    function setupWebSocket() {
        ws.connect(roomId, function() {
            console.log('Room: WebSocket connected');
        }, function() {
            console.log('Room: WebSocket disconnected');
        }, function(data) {});
        
        // Both host and non-host react to sync events
        ws.on('sync_state', handleSyncState);
        ws.on('play', handlePlay);
        ws.on('pause', handlePause);
        ws.on('seek', handleSeek);
        ws.on('change_video', handleChangeVideo);
        ws.on('chat', handleChat);
    }
    
    function bindPlayerControls() {
        // Play button
        var playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                if (!isHost) return;
                doPlay();
            });
        }
        
        // Pause button
        var pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function() {
                if (!isHost) return;
                doPause();
            });
        }
        
        // Seek button
        var seekBtn = document.getElementById('seek-btn');
        if (seekBtn) {
            seekBtn.addEventListener('click', function() {
                if (!isHost) return;
                var time = parseFloat(document.getElementById('seek-time').value);
                if (!isNaN(time)) doSeek(time);
            });
        }
        
        // Listen for YouTube player events
        if (typeof YT !== 'undefined') {
            window.onYouTubeIframeAPIReady = function() {
                console.log('Room: YT API ready');
            };
        }
        
        // Change video button - host only
        var changeBtn = document.getElementById('change-video-btn');
        if (changeBtn) {
            changeBtn.addEventListener('click', function() {
                if (!isHost) return;
                var videoType = document.querySelector('input[name="video_type"]:checked').value;
                var videoUrl = '';
                
                if (videoType === 'youtube') {
                    videoUrl = document.getElementById('youtube-url').value;
                    if (!videoUrl) return alert('Enter YouTube URL');
                }
                
                // Save to server
                var formData = new FormData();
                formData.append('video_type', videoType);
                if (videoType === 'youtube') {
                    formData.append('video_url', videoUrl);
                } else {
                    var fileInput = document.getElementById('video-upload');
                    if (fileInput.files.length) {
                        formData.append('video_file', fileInput.files[0]);
                    }
                }
                
                fetch('/room/' + roomId + '/update_video/', {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': '{{ csrf_token }}' }
                }).then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success && ws) ws.sendChangeVideo(videoType, videoUrl);
                });
            });
        }
    }
    
    function getPlayer() {
        // First try global reference
        if (window._ytPlayer) {
            console.log('Room: Using global _ytPlayer');
            return window._ytPlayer;
        }
        // Try stored reference
        if (ytPlayer) return ytPlayer;
        // Try to get from DOM if player element has internal player
        var el = document.getElementById('youtube-player-container');
        if (el && el.getPlayer) {
            return el;
        }
        return null;
    }
    
    function doPlay() {
        console.log('Room: doPlay');
        var p = getPlayer();
        if (p && p.playVideo) {
            p.playVideo();
        }
        // Get time safely
        var time = 0;
        try { time = p && p.getCurrentTime ? p.getCurrentTime() : lastKnownTime; } catch(e) { time = lastKnownTime; }
        if (!time || time === 0) time = lastKnownTime;
        console.log('Room: Sending play with time:', time);
        lastKnownTime = time;
        if (ws && isHost) ws.sendPlay(time);
    }
    
    function doPause() {
        console.log('Room: doPause');
        var p = getPlayer();
        if (p && p.pauseVideo) {
            p.pauseVideo();
        }
        // Get time safely
        var time = 0;
        try { time = p && p.getCurrentTime ? p.getCurrentTime() : lastKnownTime; } catch(e) { time = lastKnownTime; }
        if (!time || time === 0) time = lastKnownTime;
        console.log('Room: Sending pause with time:', time);
        lastKnownTime = time;
        if (ws && isHost) ws.sendPause(time);
    }
    
    function doSeek(time) {
        console.log('Room: doSeek', time);
        var p = getPlayer();
        if (p && p.seekTo) {
            p.seekTo(time, true);
        }
        if (ws && isHost) ws.sendSeek(time);
    }
    
    function handleSyncState(data) {
        console.log('Room: sync_state', data);
        // Track time
        if (data.current_time !== undefined) {
            lastKnownTime = data.current_time;
        }
        // Only react if video changed
        if (data.video_url && data.video_url !== currentVideoUrl) {
            currentVideoUrl = data.video_url;
            handleChangeVideo(data.video_type, data.video_url);
        }
    }
    
    function handlePlay(time) {
        console.log('Room: handlePlay', time);
        var p = getPlayer();
        if (p) {
            try { p.seekTo(time, true); } catch(e) {}
            try { p.playVideo(); } catch(e) {}
        }
    }
    
    function handlePause(time) {
        console.log('Room: handlePause', time);
        var p = getPlayer();
        if (p) {
            try { p.seekTo(time, true); } catch(e) {}
            try { p.pauseVideo(); } catch(e) {}
        }
    }
    
    function handleSeek(time) {
        console.log('Room: handleSeek', time);
        var p = getPlayer();
        if (p) {
            try { p.seekTo(time, true); } catch(e) {}
        }
    }
    
    function handleChangeVideo(videoType, videoUrl) {
        console.log('Room: handleChangeVideo', videoType, videoUrl);
        
        currentVideoType = videoType;
        currentVideoUrl = videoUrl;
        
        var container = document.getElementById('video-player');
        if (!container) return;
        
        if (videoType === 'youtube') {
            var match = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            var videoId = match ? match[1] : null;
            
            if (videoId && typeof YT !== 'undefined') {
                container.innerHTML = '<div id="youtube-player-container"></div>';
                
                ytPlayer = new YT.Player('youtube-player-container', {
                    videoId: videoId,
                    playerVars: { autoplay: 0, controls: 1, origin: window.location.origin }
                });
                console.log('Room: YouTube player created');
            }
        } else if (videoType === 'upload') {
            container.innerHTML = '<video id="html5-video" controls style="width:100%;"><source src="' + videoUrl + '" type="video/mp4"></video>';
        }
    }
    
    function bindCopyLink() {
        var copyBtn = document.getElementById('copy-link-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(window.location.href).then(function() {
                    alert('Link copied!');
                });
            });
        }
    }
    
    function setPlayer(p) {
        ytPlayer = p;
        console.log('Room: Player set from outside');
    }
    
    function bindChatControls() {
        var chatInput = document.getElementById('chat-input');
        var chatSendBtn = document.getElementById('chat-send-btn');
        
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendChat();
            });
        }
        
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', sendChat);
        }
    }
    
    function sendChat() {
        var input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        
        var message = input.value.trim();
        input.value = '';
        
        // Show message immediately for better UX
       
        
        // Use HTTP API which works reliably
        fetch('/room/' + roomId + '/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            console.log('Room: Chat saved', data);
            // Try WebSocket for live sync to others
            if (window.websocketModule && window.websocketModule.sendChat) {
                window.websocketModule.sendChat(message);
            }
        })
        .catch(function(e) {
            console.error('Room: Chat error', e);
        });
    }
    
    var lastChatTime = 0;
var chatLoaded = false;
    
    var lastChatCount = 0;
var chatLoaded = false;

function loadChatMessages() {
    fetch('/room/' + roomId + '/chat/', {
        credentials: 'same-origin'
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.messages && data.messages.length > 0) {
            // On first load, show all messages
            if (!chatLoaded) {
                chatLoaded = true;
                data.messages.forEach(function(msg) {
                    displayChatMessage(msg);
                });
                lastChatCount = data.messages.length;
            } else if (data.messages.length > lastChatCount) {
                // On polling, only show NEW messages
                var newMsgs = data.messages.slice(lastChatCount);
                newMsgs.forEach(function(msg) {
                    displayChatMessage(msg);
                });
                lastChatCount = data.messages.length;
            }
        }
    })
    .catch(function(e) {
        console.error('Room: Chat load error', e);
    });
}
    
    function displayChatMessage(data) {
        var container = document.getElementById('chat-messages');
        if (!container) return;
        
        var msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message';
        msgDiv.innerHTML = '<span class="username">' + data.username + '</span> <span class="time">' + (data.time || '') + '</span><br><span class="text">' + escapeHtml(data.message) + '</span>';
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    function handleChat(data) {
        console.log('Room: Chat', data);
        displayChatMessage({
            username: data.username,
            message: data.message,
            time: new Date().toLocaleTimeString()
        });
    }
    
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    return { init: init, setPlayer: setPlayer };
})();