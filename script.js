const player = document.getElementById('player');
const fileInput = document.getElementById('file-input');
const fileNameDisp = document.getElementById('file-name');
const artistNameDisp = document.getElementById('artist-name');
const albumArt = document.getElementById('album-art');
const formatBadge = document.getElementById('format-badge');
const playlistContainer = document.getElementById('playlist');
const repeatBtn = document.getElementById('repeat-btn');

let playlist = [];
let currentIndex = 0;
let repeatMode = 'off';

window.onload = () => {
    player.volume = 0.05;
    
    // Auto-save preferences as requested
    localStorage.setItem('my_player_settings', JSON.stringify({
        theme: 'dark', 
        lang: 'en', 
        volume: 0.05
    }));
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("PWA Service Worker Registered"))
            .catch(err => console.log("SW Registration failed:", err));
    }
};

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        const isInitialLoad = playlist.length === 0;
        const startIndex = playlist.length;
        files.forEach(file => {
            const ext = file.name.split('.').pop();
            playlist.push({
                file: file,
                displayName: cleanFileName(file.name),
                artist: "Loading...",
                format: ext
            });
        });
        renderPlaylist();
        files.forEach((file, i) => updateMetadataInList(file, startIndex + i));
        if (isInitialLoad) playTrack(0);
    }
    e.target.value = '';
});

function cleanFileName(name) {
    return name.substring(0, name.lastIndexOf('.')) || name;
}

function renderPlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `playlist-item text-truncate ${index === currentIndex ? 'active' : ''}`;
        div.textContent = `${index + 1}. ${item.displayName}`;
        div.onclick = () => playTrack(index);
        playlistContainer.appendChild(div);
    });
}

function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const item = playlist[index];
    fileNameDisp.textContent = item.displayName;
    artistNameDisp.textContent = item.artist;
    formatBadge.textContent = item.format;
    formatBadge.style.display = 'inline-block';
    if (player.src) URL.revokeObjectURL(player.src);
    player.src = URL.createObjectURL(item.file);
    renderPlaylist();
    loadMetadata(item.file, index);
    player.play().catch(e => console.log("Playback failed:", e));
}

function updateMetadataInList(file, index) {
    jsmediatags.read(file, {
        onSuccess: function(tag) {
            if (tag.tags.title) playlist[index].displayName = tag.tags.title;
            if (tag.tags.artist) playlist[index].artist = tag.tags.artist;
            renderPlaylist();
            if (index === currentIndex) {
                fileNameDisp.textContent = playlist[index].displayName;
                artistNameDisp.textContent = playlist[index].artist;
            }
        }
    });
}

function loadMetadata(file, index) {
    albumArt.style.display = 'none';
    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const data = tag.tags.picture;
            if (data) {
                let base64String = "";
                for (let i = 0; i < data.data.length; i++) {
                    base64String += String.fromCharCode(data.data[i]);
                }
                const base64 = "data:" + data.format + ";base64," + window.btoa(base64String);
                albumArt.style.backgroundImage = `url(${base64})`;
                albumArt.style.display = 'block';
            }
        }
    });
}

function clearPlaylist() {
    playlist = [];
    currentIndex = 0;
    player.pause();
    if (player.src) URL.revokeObjectURL(player.src);
    player.removeAttribute('src'); 
    player.load();
    fileNameDisp.textContent = "No track selected";
    artistNameDisp.textContent = "";
    formatBadge.style.display = 'none';
    albumArt.style.display = 'none';
    renderPlaylist();
}

function toggleRepeat() {
    if (repeatMode === 'off') {
        repeatMode = 'one';
        repeatBtn.textContent = 'Repeat: ONE';
        repeatBtn.classList.add('active-mode');
    } else if (repeatMode === 'one') {
        repeatMode = 'all';
        repeatBtn.textContent = 'Repeat: ALL';
        repeatBtn.classList.add('active-mode');
    } else {
        repeatMode = 'off';
        repeatBtn.textContent = 'Repeat: OFF';
        repeatBtn.classList.remove('active-mode');
    }
}

function shufflePlaylist() {
    if (playlist.length <= 1) return;
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    playTrack(0);
}

function nextTrack() {
    if (repeatMode === 'one') {
        player.currentTime = 0;
        player.play();
    } else if (currentIndex + 1 < playlist.length) {
        playTrack(currentIndex + 1);
    } else if (repeatMode === 'all' && playlist.length > 0) {
        playTrack(0);
    }
}

function prevTrack() {
    if (repeatMode === 'one') {
        player.currentTime = 0;
        player.play();
    } else if (currentIndex - 1 >= 0) {
        playTrack(currentIndex - 1);
    }
}

player.onended = () => nextTrack();
