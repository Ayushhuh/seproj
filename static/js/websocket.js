// WebSocket Module - Simplified

window.websocketModule = (function() {
    var ws = null;
    var roomId = null;
    var onConnectCb = null;
    var onDisconnectCb = null;
    var handlers = {};
    
    function connect(id, onConnect, onDisconnect, onMsg) {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        
        roomId = id;
        onConnectCb = onConnect;
        onDisconnectCb = onDisconnect;
        
        var url = 'ws://' + window.location.host + '/ws/room/' + roomId + '/';
        console.log('WS: Connecting to', url);
        
        try {
            ws = new WebSocket(url);
        } catch(e) {
            console.error('WS: Error', e);
            return;
        }
        
        ws.onopen = function() {
            console.log('WS: Connected');
            if (onConnectCb) onConnectCb();
        };
        
        ws.onclose = function(e) {
            console.log('WS: Disconnected', e.code);
            if (onDisconnectCb) onDisconnectCb();
        };
        
        ws.onerror = function(e) {
            console.error('WS: Error', e);
        };
        
        ws.onmessage = function(e) {
            try {
                var data = JSON.parse(e.data);
                console.log('WS: Received', data);
                
                if (data.type === 'sync_state' && handlers.sync_state) handlers.sync_state(data);
                else if (data.type === 'play' && handlers.play) handlers.play(data.timestamp);
                else if (data.type === 'pause' && handlers.pause) handlers.pause(data.timestamp);
                else if (data.type === 'seek' && handlers.seek) handlers.seek(data.timestamp);
                else if (data.type === 'change_video' && handlers.change_video) handlers.change_video(data.video_type, data.video_url);
            } catch(err) {
                console.error('WS: Parse error', err);
            }
        };
    }
    
    function send(type, data) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        
        var msg = { type: type };
        for (var k in data) msg[k] = data[k];
        
        try {
            ws.send(JSON.stringify(msg));
            console.log('WS: Sent', msg);
            return true;
        } catch(e) {
            console.error('WS: Send error', e);
            return false;
        }
    }
    
    function sendPlay(time) { send('play', { timestamp: time }); }
    function sendPause(time) { send('pause', { timestamp: time }); }
    function sendSeek(time) { send('seek', { timestamp: time }); }
    function sendChangeVideo(type, url) { send('change_video', { video_type: type, video_url: url }); }
    
    function on(type, handler) {
        handlers[type] = handler;
    }
    
    return {
        connect: connect, send: send,
        sendPlay: sendPlay, sendPause: sendPause, sendSeek: sendSeek, sendChangeVideo: sendChangeVideo,
        on: on
    };
})();