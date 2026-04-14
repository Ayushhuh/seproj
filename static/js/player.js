// Player Module - Simplified

window.playerModule = (function() {
    var isHost = false;
    
    function init(config) {
        isHost = config.isHost;
        console.log('Player: Init - isHost:', isHost);
    }
    
    function play() {
        var p = document.getElementById('youtube-player-container');
        if (p && p.playVideo) p.playVideo();
    }
    
    function pause() {
        var p = document.getElementById('youtube-player-container');
        if (p && p.pauseVideo) p.pauseVideo();
    }
    
    function seek(time) {
        var p = document.getElementById('youtube-player-container');
        if (p && p.seekTo) p.seekTo(time, true);
    }
    
    function getCurrentTime() {
        var p = document.getElementById('youtube-player-container');
        return p && p.getCurrentTime ? p.getCurrentTime() : 0;
    }
    
    return { init: init, play: play, pause: pause, seek: seek, getCurrentTime: getCurrentTime };
})();