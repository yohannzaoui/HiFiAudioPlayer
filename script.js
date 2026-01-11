/**
 * HiFi Audio Player - Core Engine
 * Stable Base v4.0 [2026-01-11]
 */

const player = document.getElementById('player');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const volumeBar = document.getElementById('volume-bar');
const volumeContainer = document.getElementById('volume-container');
const playlistContainer = document.getElementById('playlist');
const fileInput = document.getElementById('file-input');

let playlist = [];
let currentIndex = 0;
let isShuffle = false;
let repeatMode = 'OFF'; // Options: OFF, ONE, ALL

// --- 1. INITIALIZATION & STORAGE ---

window.addEventListener('load', () => {
    // Restore Volume from Preferences
    const savedVol = localStorage.getItem('hifi-volume') || 0.05;
    player.volume = savedVol;
    volumeBar.style.width = (savedVol * 100) + '%';
    document.getElementById('volume-percent').innerText = Math.round(savedVol * 100) + '%';
});

// --- 2. FILE HANDLING ---

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const isFirstLoad = playlist.length === 0;

    files.forEach(file => {
        playlist.push({
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: URL.createObjectURL(file),
            file: file
        });
    });

    renderPlaylist();
    if (isFirstLoad) playTrack(0);
});

// --- 3. CORE PLAYBACK FUNCTIONS ---

function renderPlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
        div.innerText = `${index + 1}. ${track.name}`;
        div.onclick = () => playTrack(index);
        playlistContainer.appendChild(div);
    });
}

function playTrack(index) {
    if (!playlist[index]) return;
    
    currentIndex = index;
    player.src = playlist[index].url;
    
    player.play().then(() => {
        playPauseBtn.innerText = 'PAUSE';
    }).catch(e => console.error("Playback error:", e));

    document.getElementById('file-name').innerText = playlist[index].name;
    renderPlaylist();
    extractMetadata(playlist[index].file);
}

function extractMetadata(file) {
    if (typeof jsmediatags === "undefined") return;

    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const t = tag.tags;
            document.getElementById('artist-name').innerText = t.artist || "Unknown Artist";
            
            // Format Badge
            const ext = file.name.split('.').pop().toUpperCase();
            const badge = document.getElementById('format-badge');
            badge.innerText = ext;
            badge.style.display = 'inline-block';

            // Album Art
            const art = t.picture;
            if (art) {
                let base64String = "";
                for (let i = 0; i < art.data.length; i++) base64String += String.fromCharCode(art.data[i]);
                document.getElementById('album-art').src = `data:${art.format};base64,${window.btoa(base64String)}`;
                document.getElementById('art-container').style.display = 'block';
            } else {
                document.getElementById('art-container').style.display = 'none';
            }
        },
        onError: () => {
            document.getElementById('artist-name').innerText = "Unknown Artist";
            document.getElementById('art-container').style.display = 'none';
        }
    });
}

// --- 4. NAVIGATION (MODIFIED FOR REPEAT: ONE) ---

function nextTrack() {
    if (playlist.length === 0) return;
    
    if (repeatMode === 'ONE') {
        // En mode REPEAT: ONE, Next rejoue le même titre
        playTrack(currentIndex);
    } else {
        // Logique normale ou Shuffle
        let idx = isShuffle ? Math.floor(Math.random() * playlist.length) : (currentIndex + 1) % playlist.length;
        playTrack(idx);
    }
}

function prevTrack() {
    if (playlist.length === 0) return;

    if (repeatMode === 'ONE') {
        // En mode REPEAT: ONE, Back rejoue le même titre
        playTrack(currentIndex);
    } else {
        // Titre précédent
        let idx = (currentIndex - 1 + playlist.length) % playlist.length;
        playTrack(idx);
    }
}

// Handle automatic end of track
player.onended = () => {
    if (repeatMode === 'ONE') {
        player.currentTime = 0;
        player.play();
    } else if (repeatMode === 'ALL' || currentIndex < playlist.length - 1) {
        nextTrack();
    } else {
        playPauseBtn.innerText = 'PLAY';
    }
};

// --- 5. UI CONTROLS & TOGGLES ---

playPauseBtn.onclick = () => {
    if (playlist.length === 0) return;
    if (player.paused) {
        player.play();
        playPauseBtn.innerText = 'PAUSE';
    } else {
        player.pause();
        playPauseBtn.innerText = 'PLAY';
    }
};

function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('shuffle-btn').classList.toggle('shuffle-active', isShuffle);
}

function toggleRepeat() {
    const btn = document.getElementById('repeat-btn');
    if (repeatMode === 'OFF') {
        repeatMode = 'ONE';
        btn.innerText = 'REPEAT: ONE';
        btn.classList.add('rep-one');
    } else if (repeatMode === 'ONE') {
        repeatMode = 'ALL';
        btn.innerText = 'REPEAT: ALL';
        btn.classList.replace('rep-one', 'rep-all');
    } else {
        repeatMode = 'OFF';
        btn.innerText = 'REPEAT: OFF';
        btn.classList.remove('rep-all');
    }
}

function toggleMute() {
    player.muted = !player.muted;
    const btn = document.getElementById('mute-btn');
    btn.classList.toggle('mute-active', player.muted);
    btn.innerText = player.muted ? 'Mute: ON' : 'Mute: OFF';
}

// --- 6. BARS & PROGRESS LOGIC ---

player.ontimeupdate = () => {
    if (player.duration) {
        const pct = (player.currentTime / player.duration) * 100;
        progressBar.style.width = pct + '%';
        document.getElementById('current-time').innerText = formatTime(player.currentTime);
        document.getElementById('duration').innerText = formatTime(player.duration);
    }
};

progressContainer.onclick = (e) => {
    if (!player.duration) return;
    const rect = progressContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    player.currentTime = pct * player.duration;
};

volumeContainer.onclick = (e) => {
    const rect = volumeContainer.getBoundingClientRect();
    const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.volume = vol;
    volumeBar.style.width = (vol * 100) + '%';
    document.getElementById('volume-percent').innerText = Math.round(vol * 100) + '%';
    localStorage.setItem('hifi-volume', vol);
};

// --- 7. UTILS ---

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function clearPlaylist() {
    playlist = [];
    player.pause();
    player.src = "";
    renderPlaylist();
    document.getElementById('file-name').innerText = 'No track selected';
    document.getElementById('artist-name').innerText = '';
    document.getElementById('art-container').style.display = 'none';
    document.getElementById('format-badge').style.display = 'none';
}