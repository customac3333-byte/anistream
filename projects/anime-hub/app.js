// ========================================================
// AniStream Direct HLS Engine (ani-cli inspired)
// Uses AniList GraphQL + Open Source Stream Resolvers
// ========================================================

const ANILIST_API = 'https://graphql.anilist.co';
const FALLBACK_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const EMBED_SERVERS = [
  {
    name: 'Server 1 (2embed)',
    getUrl: (anime, ep) => {
      const title = anime.title.english || anime.title.romaji || '';
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `https://2embed.org/embed/anime/${slug}-episode-${ep}`;
    }
  },
  {
    name: 'Server 2 (VidSrc)',
    getUrl: (anime, ep) => {
      const title = anime.title.english || anime.title.romaji || '';
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `https://vidsrc.me/embed/anime?title=${encodeURIComponent(slug)}&episode=${ep}`;
    }
  },
  {
    name: 'Server 3 (Fallback Player)',
    getUrl: () => FALLBACK_VIDEO_URL
  }
];

let currentState = {
  view: 'grid',
  animeList: [],
  selectedAnime: null,
  selectedEpisode: 1,
  totalEpisodes: 1,
  favorites: JSON.parse(localStorage.getItem('animeHub_favorites')) || [],
  continueWatching: JSON.parse(localStorage.getItem('animeHub_continue')) || {},
  activeServer: 0
};

const elements = {
  searchInput: document.getElementById('searchInput'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  gridView: document.getElementById('gridView'),
  detailsView: document.getElementById('detailsView'),
  playerView: document.getElementById('playerView'),
  gridTitle: document.getElementById('gridTitle'),
  animeGrid: document.getElementById('animeGrid'),
  heroBanner: document.getElementById('heroBanner'),
  detailTitle: document.getElementById('detailTitle'),
  detailMeta: document.getElementById('detailMeta'),
  detailSynopsis: document.getElementById('detailSynopsis'),
  detailGenres: document.getElementById('detailGenres'),
  episodeGrid: document.getElementById('episodeGrid'),
  favoriteToggle: document.getElementById('favoriteToggle'),
  watchBtn: document.getElementById('watchBtn'),
  playerTitle: document.getElementById('playerTitle'),
  playerEpisode: document.getElementById('playerEpisode'),
  videoPlayer: document.getElementById('videoPlayer'),
  prevEpisodeBtn: document.getElementById('prevEpisodeBtn'),
  nextEpisodeBtn: document.getElementById('nextEpisodeBtn'),
  currentEpNum: document.getElementById('currentEpNum'),
  totalEpNum: document.getElementById('totalEpNum'),
  serverSelect: document.getElementById('serverSelect'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  errorMessage: document.getElementById('errorMessage'),
  trendingBtn: document.getElementById('trendingBtn'),
  popularBtn: document.getElementById('popularBtn'),
  libraryBtn: document.getElementById('libraryBtn'),
  continueStrip: document.getElementById('continueStrip'),
};

// ===== STATE & STORAGE =====
function setLoading(show) {
  elements.loadingSpinner?.classList.toggle('hidden', !show);
}

function showError(msg) {
  elements.errorMessage.textContent = msg;
  elements.errorMessage.classList.remove('hidden');
  setTimeout(() => elements.errorMessage.classList.add('hidden'), 5000);
}

function saveState() {
  localStorage.setItem('animeHub_favorites', JSON.stringify(currentState.favorites));
  localStorage.setItem('animeHub_continue', JSON.stringify(currentState.continueWatching));
  renderContinueStrip();
}

function renderContinueStrip() {
  const entries = Object.values(currentState.continueWatching || {})
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 4);

  if (!entries.length) {
    elements.continueStrip.classList.add('hidden');
    return;
  }

  elements.continueStrip.classList.remove('hidden');
  elements.continueStrip.innerHTML = `
    <div class="continue-strip-inner">
      <strong>Continue Watching:</strong>
      ${entries.map(e => `<button class="continue-chip" data-id="${e.id}">${e.title} • Ep ${e.episode}</button>`).join('')}
    </div>
  `;

  elements.continueStrip.querySelectorAll('.continue-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const anime = currentState.animeList.find(a => a.id === Number(btn.dataset.id)) || 
                    currentState.favorites.find(a => a.id === Number(btn.dataset.id));
      if (anime) showDetailsView(anime);
    });
  });
}

// ===== ANILIST DATA FETCHING =====
async function fetchTrendingAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          idMal
          title { english romaji }
          coverImage { large medium }
          bannerImage
          format
          status
          episodes
          nextAiringEpisode { episode }
          averageScore
          genres
          description
        }
      }
    }
  `;
  try {
    setLoading(true);
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    currentState.animeList = data.data.Page.media || [];
    return currentState.animeList;
  } catch (err) {
    showError('Could not fetch anime list.');
    return [];
  } finally {
    setLoading(false);
  }
}

// ===== EMBED PLAYER LOADER =====
function loadEmbedPlayer(animeTitle, episodeNum) {
  const anime = currentState.selectedAnime;
  if (!anime) return;

  const server = EMBED_SERVERS[currentState.activeServer];
  const selectedUrl = server?.getUrl ? server.getUrl(anime, episodeNum) : FALLBACK_VIDEO_URL;

  elements.videoPlayer.src = selectedUrl;
  elements.videoPlayer.title = `${server.name} • ${animeTitle} • Episode ${episodeNum}`;
}

function attachPlayerFallbackHandler() {
  if (elements.videoPlayer && typeof elements.videoPlayer.addEventListener === 'function') {
    elements.videoPlayer.addEventListener('load', () => {
      if (elements.videoPlayer.src === FALLBACK_VIDEO_URL) {
        showError('Selected stream provider is unavailable. Demo fallback is active.');
      }
    });
  }
}

// ===== VIEW SWITCHING & RENDERING =====
function switchView(viewName) {
  elements.gridView.classList.toggle('visible', viewName === 'grid');
  elements.gridView.classList.toggle('hidden', viewName !== 'grid');
  
  elements.detailsView.classList.toggle('visible', viewName === 'details');
  elements.detailsView.classList.toggle('hidden', viewName !== 'details');
  
  elements.playerView.classList.toggle('visible', viewName === 'player');
  elements.playerView.classList.toggle('hidden', viewName !== 'player');

  // Pause playback if exiting player view
  if (viewName !== 'player' && elements.videoPlayer && elements.videoPlayer.tagName === 'VIDEO' && typeof elements.videoPlayer.pause === 'function') {
    elements.videoPlayer.pause();
  }
}

function renderAnimeGrid(animes) {
  elements.animeGrid.innerHTML = '';
  animes.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'anime-card';
    const title = anime.title.english || anime.title.romaji;
    
    card.innerHTML = `
      <div class="anime-poster">
        <img src="${anime.coverImage.large}" alt="${title}" />
      </div>
      <div class="card-info">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          <span class="badge">${anime.format || 'TV'}</span>
          <span class="badge score-badge">${anime.averageScore ? anime.averageScore + '%' : 'N/A'}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => showDetailsView(anime));
    elements.animeGrid.appendChild(card);
  });
}

function showDetailsView(anime) {
  currentState.selectedAnime = anime;
  
  let eps = anime.episodes || (anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 12);
  currentState.totalEpisodes = Math.max(1, eps);
  currentState.selectedEpisode = currentState.continueWatching[anime.id]?.episode || 1;

  const title = anime.title.english || anime.title.romaji;
  elements.detailTitle.textContent = title;
  elements.heroBanner.innerHTML = `<img src="${anime.bannerImage || anime.coverImage.large}" alt="banner"/>`;
  elements.detailMeta.innerHTML = `<span>📺 ${anime.format || 'TV'}</span> • <span>🎬 ${currentState.totalEpisodes} Episodes</span>`;
  elements.detailSynopsis.textContent = (anime.description || '').replace(/<[^>]*>/g, '');
  
  renderEpisodeGrid();
  switchView('details');
}

function renderEpisodeGrid() {
  elements.episodeGrid.innerHTML = '';
  for (let i = 1; i <= currentState.totalEpisodes; i++) {
    const btn = document.createElement('button');
    btn.className = `episode-btn ${i === currentState.selectedEpisode ? 'active' : ''}`;
    btn.textContent = `Ep ${i}`;
    btn.addEventListener('click', () => {
      currentState.selectedEpisode = i;
      startPlayer();
    });
    elements.episodeGrid.appendChild(btn);
  }
}

function startPlayer() {
  const anime = currentState.selectedAnime;
  const title = anime.title.english || anime.title.romaji;

  elements.playerTitle.textContent = title;
  elements.playerEpisode.textContent = `Episode ${currentState.selectedEpisode}`;
  elements.currentEpNum.textContent = currentState.selectedEpisode;
  elements.totalEpNum.textContent = currentState.totalEpisodes;

  elements.prevEpisodeBtn.disabled = currentState.selectedEpisode <= 1;
  elements.nextEpisodeBtn.disabled = currentState.selectedEpisode >= currentState.totalEpisodes;

  loadEmbedPlayer(title, currentState.selectedEpisode);

  currentState.continueWatching[anime.id] = {
    id: anime.id,
    title: title,
    episode: currentState.selectedEpisode,
    timestamp: Date.now()
  };
  saveState();

  switchView('player');
}

// ===== EVENT LISTENERS =====
elements.trendingBtn?.addEventListener('click', async () => {
  const list = await fetchTrendingAnime();
  renderAnimeGrid(list);
  switchView('grid');
});

elements.watchBtn?.addEventListener('click', () => {
  currentState.selectedEpisode = 1;
  startPlayer();
});

elements.prevEpisodeBtn?.addEventListener('click', () => {
  if (currentState.selectedEpisode > 1) {
    currentState.selectedEpisode--;
    startPlayer();
  }
});

elements.nextEpisodeBtn?.addEventListener('click', () => {
  if (currentState.selectedEpisode < currentState.totalEpisodes) {
    currentState.selectedEpisode++;
    startPlayer();
  }
});

document.querySelector('.back-details-btn')?.addEventListener('click', () => switchView('grid'));
document.querySelector('.back-player-btn')?.addEventListener('click', () => switchView('details'));

elements.serverSelect?.addEventListener('change', (e) => {
  currentState.activeServer = parseInt(e.target.value);
  if (currentState.selectedAnime) {
    const title = currentState.selectedAnime.title.english || currentState.selectedAnime.title.romaji;
    loadEmbedPlayer(title, currentState.selectedEpisode);
  }
});

// ===== INIT =====
async function init() {
  attachPlayerFallbackHandler();
  const list = await fetchTrendingAnime();
  renderAnimeGrid(list);
  renderContinueStrip();
  switchView('grid');
}

document.addEventListener('DOMContentLoaded', init);