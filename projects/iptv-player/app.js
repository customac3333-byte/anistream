const m3uUrlInput = document.getElementById('m3uUrlInput');
const loadBtn = document.getElementById('loadBtn');
const searchBox = document.getElementById('searchBox');
const qualitySelect = document.getElementById('qualitySelect');
const channelList = document.getElementById('channelList');
const currentChannelName = document.getElementById('currentChannelName');
const statusMsg = document.getElementById('statusMsg');
const video = document.getElementById('video');
const topbar = document.querySelector('.topbar');
const backLink = document.querySelector('.back-link');

// Organized channel data by genre
let channelsData = {
  '🇳🇵 Nepali Channels': [],
  '📺 International News': [],
  '⚽ Sports': [],
  '🎭 Entertainment': []
};

// Function to parse M3U playlist
function parseM3UPlaylist(text) {
  const channels = [];
  const lines = text.split('\n');
  let currentName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Extract channel name from EXTINF line
      const match = line.match(/,(.+)$/);
      currentName = match ? match[1].trim() : 'Unknown Channel';
    } else if (line.startsWith('http') && currentName) {
      channels.push({
        name: currentName,
        url: line
      });
      currentName = '';
    }
  }
  
  return channels;
}

// Function to fetch Nepali channels from remote source
async function loadNepaliChannels() {
  try {
    statusMsg.textContent = 'Loading Nepali channels...';
    const response = await fetch('https://iptv-org.github.io/iptv/countries/np.m3u');
    const text = await response.text();
    let nepaliChannels = parseM3UPlaylist(text);
    
    // Add some test/demo streams that work with CORS (public domain/accessible)
    const demoStreams = [
      { name: '📌 DEMO: HLS Test Stream 1', url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8' },
      { name: '📌 DEMO: HLS Test Stream 2', url: 'https://media.example.com/manifest.m3u8' }
    ];
    nepaliChannels = [...demoStreams, ...nepaliChannels];
    
    if (nepaliChannels.length > 2) {
      channelsData['🇳🇵 Nepali Channels'] = nepaliChannels;
      renderChannelList();
      statusMsg.textContent = `✅ Loaded ${nepaliChannels.length - 2} live Nepali channels + 2 demo streams. Some may be geo-restricted.`;
    } else {
      statusMsg.textContent = 'Could not load Nepali channels. Please try again.';
    }
  } catch (error) {
    console.error('Error loading Nepali channels:', error);
    statusMsg.textContent = '❌ Error loading channels. Check internet connection.';
  }
}

let hls = null;
let expandedGenres = {};
let activeChannel = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resetPlayer() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function populateQualityOptions(levels) {
  qualitySelect.innerHTML = '<option value="-1">Auto</option>';
  qualitySelect.disabled = true;

  if (!levels || levels.length <= 1) {
    return;
  }

  levels.forEach((level, index) => {
    const height = level.height ? `${level.height}p` : `Level ${index + 1}`;
    const fps = level.frameRate ? ` @ ${Math.round(level.frameRate)} fps` : '';
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${height}${fps}`;
    qualitySelect.appendChild(option);
  });

  qualitySelect.disabled = false;
}

function applyQualitySelection(levelIndex) {
  if (!hls) return;

  const selectedLevel = Number(levelIndex);
  if (Number.isNaN(selectedLevel)) return;

  if (selectedLevel < 0) {
    hls.currentLevel = -1;
    hls.nextLevel = -1;
  } else {
    hls.currentLevel = selectedLevel;
    hls.nextLevel = selectedLevel;
  }
}

function playStream(url, name) {
  currentChannelName.textContent = name;
  activeChannel = name;
  qualitySelect.disabled = true;
  qualitySelect.innerHTML = '<option value="-1">Auto</option>';
  resetPlayer();

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      populateQualityOptions(data.levels || []);
      applyQualitySelection(-1);
      video.play().catch(() => {
        statusMsg.textContent = 'Playback started, but autoplay was blocked by the browser.';
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      if (qualitySelect.options.length) {
        qualitySelect.value = String(data.level);
      }
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        statusMsg.textContent = 'The stream could not be loaded. Please verify the URL or CORS access.';
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(() => {
        statusMsg.textContent = 'Playback started, but autoplay was blocked by the browser.';
      });
    });
  } else {
    statusMsg.textContent = 'This browser does not support HLS playback.';
  }
}

function renderChannelList(filteredData = channelsData) {
  channelList.innerHTML = '';

  Object.entries(filteredData).forEach(([genre, channels]) => {
    const isExpanded = expandedGenres[genre] || false;

    // Genre header (clickable to expand/collapse)
    const genreHeader = document.createElement('li');
    genreHeader.className = 'genre-header';
    genreHeader.innerHTML = `
      <div class="genre-title">
        <span class="genre-toggle">${isExpanded ? '▼' : '▶'}</span>
        <span class="genre-name">${escapeHtml(genre)}</span>
        <span class="channel-count">${channels.length}</span>
      </div>
    `;

    genreHeader.addEventListener('click', () => {
      expandedGenres[genre] = !expandedGenres[genre];
      renderChannelList(filteredData);
    });

    channelList.appendChild(genreHeader);

    // Channels (visible only if genre is expanded)
    if (isExpanded) {
      channels.forEach((channel) => {
        const channelItem = document.createElement('li');
        channelItem.className = 'channel-item';
        channelItem.setAttribute('role', 'button');
        channelItem.innerHTML = `
          <div class="channel-main">
            <span class="channel-name">${escapeHtml(channel.name)}</span>
            <span class="channel-meta">Click to play</span>
          </div>
          <span class="badge">LIVE</span>
        `;

        channelItem.addEventListener('click', () => {
          playStream(channel.url, channel.name);
        });

        channelList.appendChild(channelItem);
      });
    }
  });

  statusMsg.textContent = 'Click any genre to expand and see channels. Then click a channel to play.';
}

function filterChannels(query) {
  if (!query.trim()) {
    renderChannelList(channelsData);
    return;
  }

  const filtered = {};
  const lowerQuery = query.toLowerCase();

  Object.entries(channelsData).forEach(([genre, channels]) => {
    const filteredChannels = channels.filter(ch => ch.name.toLowerCase().includes(lowerQuery));
    if (filteredChannels.length > 0) {
      filtered[genre] = filteredChannels;
      expandedGenres[genre] = true; // Auto-expand matched genres
    }
  });

  if (Object.keys(filtered).length === 0) {
    channelList.innerHTML = '<li class="channel-item"><div class="channel-main"><span class="channel-name">No channels found.</span><span class="channel-meta">Try another search</span></div></li>';
  } else {
    renderChannelList(filtered);
  }
}

searchBox.addEventListener('input', () => {
  filterChannels(searchBox.value);
});

qualitySelect.addEventListener('change', () => {
  applyQualitySelection(qualitySelect.value);
});

loadBtn.addEventListener('click', () => {
  statusMsg.textContent = 'Paste a playlist URL and click Fetch Playlist.';
});

m3uUrlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    statusMsg.textContent = 'Feature coming soon. Use built-in channels for now.';
  }
});

channelList.addEventListener('scroll', () => {
  const scrolled = channelList.scrollTop > 24;
  topbar.classList.toggle('hidden', scrolled);
  backLink.classList.toggle('hidden', scrolled);
});

window.addEventListener('DOMContentLoaded', () => {
  loadNepaliChannels();
});
