const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const mediaPool = document.getElementById('mediaPool');
const inspector = document.getElementById('inspector');
const timelineRuler = document.getElementById('timelineRuler');
const timelineTracks = document.getElementById('timelineTracks');
const importMediaInput = document.getElementById('importMedia');
const importMusicInput = document.getElementById('importMusic');
const timeDisplay = document.querySelector('.time-display');
const tabs = Array.from(document.querySelectorAll('.tab'));
const transportButtons = Array.from(document.querySelectorAll('[data-transport]'));
const topActionButtons = Array.from(document.querySelectorAll('.top-actions button, .top-actions label'));

const AppState = {
  project: {
    name: 'Untitled Edit',
    theme: 'dark',
    width: 1280,
    height: 720,
    fps: 30,
    duration: 10,
  },
  timeline: {
    tracks: [],
    playhead: 0,
    playing: false,
    markers: [],
    zoom: 1,
  },
  selection: null,
  effects: {},
  text: [],
  filters: {},
  playback: { speed: 1, volume: 1, muted: false },
  export: { fps: 30, resolution: '1080p', bitrate: '5 Mbps', codec: 'webm' },
  history: [],
  redo: [],
  media: [],
  currentTool: 'transform',
  renderLoop: null,
  lastFrame: 0,
  previewScale: 1,
};

let activeMedia = [];
let audioContext = null;
let masterGain = null;
let compressor = null;
let biquad = null;
let currentAudioSource = null;
let mediaElement = null;
let mediaURL = null;
let currentFrameImage = null;

function init() {
  setupAudioGraph();
  bindEvents();
  seedTimeline();
  renderInspector();
  renderTimeline();
  renderMediaPool();
  animate();
  loadSavedState();
}

function setupAudioGraph() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  compressor = audioContext.createDynamicsCompressor();
  biquad = audioContext.createBiquadFilter();
  biquad.type = 'lowpass';
  biquad.frequency.setValueAtTime(22050, audioContext.currentTime);
  masterGain.connect(compressor);
  compressor.connect(biquad);
  biquad.connect(audioContext.destination);
  masterGain.gain.setValueAtTime(1, audioContext.currentTime);
}

function seedTimeline() {
  AppState.timeline.tracks = [
    { id: 'video-1', type: 'video', name: 'Video Track', clips: [] },
    { id: 'audio-1', type: 'audio', name: 'Audio Track', clips: [] },
    { id: 'text-1', type: 'text', name: 'Text Track', clips: [] },
  ];
  renderTimeline();
}

function bindEvents() {
  importMediaInput.addEventListener('change', (event) => importFiles(event.target.files));
  importMusicInput.addEventListener('change', (event) => importFiles(event.target.files));
  document.addEventListener('keydown', handleKeyboardShortcuts);
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    AppState.currentTool = tab.dataset.tab;
    renderInspector();
  }));

  transportButtons.forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.transport;
    if (action === 'play') togglePlayback(true);
    if (action === 'pause') togglePlayback(false);
    if (action === 'stop') stopPlayback();
    if (action === 'prev') stepPlayhead(-1);
    if (action === 'next') stepPlayhead(1);
  }));

  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => handleTopAction(button.dataset.action)));
}

function handleTopAction(action) {
  switch (action) {
    case 'undo':
      if (AppState.history.length) {
        const last = AppState.history.pop();
        AppState.redo.push(last);
        renderInspector();
      }
      break;
    case 'redo':
      if (AppState.redo.length) {
        const next = AppState.redo.pop();
        AppState.history.push(next);
        renderInspector();
      }
      break;
    case 'save':
      localStorage.setItem('studio-video-state', JSON.stringify(AppState));
      break;
    case 'reset':
      AppState.timeline = { tracks: [], playhead: 0, playing: false, markers: [], zoom: 1 };
      seedTimeline();
      break;
    case 'screenshot':
      captureFrame();
      break;
    case 'fullscreen':
      document.documentElement.requestFullscreen?.();
      break;
    case 'render':
      renderPreview();
      break;
    case 'export':
      exportProject();
      break;
    case 'theme':
      document.body.classList.toggle('light');
      break;
  }
}

function handleKeyboardShortcuts(event) {
  const key = event.key.toLowerCase();
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlayback(!AppState.timeline.playing);
  }
  if (key === 'j') stepPlayhead(-1);
  if (key === 'k') togglePlayback(false);
  if (key === 'l') stepPlayhead(1);
  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault();
    handleTopAction('undo');
  }
  if ((event.ctrlKey || event.metaKey) && key === 'y') {
    event.preventDefault();
    handleTopAction('redo');
  }
  if (key === 'delete') removeSelection();
  if ((event.ctrlKey || event.metaKey) && key === 's') {
    event.preventDefault();
    handleTopAction('save');
  }
}

function importFiles(files) {
  Array.from(files).forEach((file) => {
    const id = crypto.randomUUID();
    const entry = {
      id,
      name: file.name,
      type: detectType(file),
      size: formatBytes(file.size),
      file,
      duration: 5,
      width: 1280,
      height: 720,
      resolution: '1920x1080',
      codec: file.type || 'binary',
      frameRate: 30,
      aspectRatio: '16:9',
      createdAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    };
    AppState.media.push(entry);
    AppState.timeline.tracks[0].clips.push({ id, type: entry.type === 'video' ? 'video' : 'image', name: file.name, source: entry });
    if (entry.type === 'audio') AppState.timeline.tracks[1].clips.push({ id, type: 'audio', name: file.name, source: entry });
    if (entry.type === 'image') AppState.timeline.tracks[2].clips.push({ id, type: 'image', name: file.name, source: entry });
  });
  renderMediaPool();
  renderTimeline();
}

function detectType(file) {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  return 'asset';
}

function formatBytes(size) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

function renderMediaPool() {
  mediaPool.innerHTML = '';
  AppState.media.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'media-item';
    card.innerHTML = `
      <strong>${item.name}</strong>
      <div>${item.type}</div>
      <div>${item.size}</div>
      <div>${item.resolution} • ${item.frameRate}fps</div>
    `;
    card.addEventListener('dblclick', () => loadIntoPreview(item));
    mediaPool.appendChild(card);
  });
}

function loadIntoPreview(item) {
  AppState.selection = item;
  if (item.type === 'video' || item.type === 'audio') {
    if (mediaElement) mediaElement.remove();
    mediaElement = document.createElement('video');
    mediaElement.src = item.url;
    mediaElement.preload = 'auto';
    mediaElement.muted = true;
    mediaElement.playbackRate = AppState.playback.speed;
    mediaElement.addEventListener('loadedmetadata', () => {
      currentFrameImage = item;
      renderPreview();
    });
  }
  renderInspector();
}

function renderInspector() {
  inspector.innerHTML = '';
  if (!AppState.selection) {
    inspector.innerHTML = '<p>Select a clip or asset to inspect its transform and effect controls.</p>';
    return;
  }

  const section = document.createElement('div');
  section.innerHTML = `
    <div class="control-group">
      <label>Scale</label>
      <input type="range" min="20" max="200" value="100" />
    </div>
    <div class="control-group">
      <label>Rotation</label>
      <input type="range" min="0" max="360" value="0" />
    </div>
    <div class="control-group">
      <label>Opacity</label>
      <input type="range" min="0" max="100" value="100" />
    </div>
    <div class="control-group">
      <label>Brightness</label>
      <input type="range" min="0" max="200" value="100" />
    </div>
    <div class="control-group">
      <label>Contrast</label>
      <input type="range" min="0" max="200" value="100" />
    </div>
    <div class="control-group">
      <label>LUT Preset</label>
      <select>
        <option>Cinematic</option>
        <option>Teal Orange</option>
        <option>Cyberpunk</option>
        <option>Vintage Film</option>
        <option>Warm Gold</option>
        <option>Cold Blue</option>
        <option>Noir</option>
        <option>HDR Pop</option>
      </select>
    </div>
    <div class="control-group">
      <label>Master Volume</label>
      <input type="range" min="0" max="100" value="100" />
    </div>
    <div class="control-group">
      <label>Text Overlay</label>
      <input type="text" value="StudioVideo Express" />
    </div>
  `;
  inspector.appendChild(section);
}

function renderTimeline() {
  timelineRuler.innerHTML = '';
  timelineTracks.innerHTML = '';
  const ruler = document.createElement('div');
  ruler.textContent = '00:00:00:00 00:00:10:00';
  timelineRuler.appendChild(ruler);
  AppState.timeline.tracks.forEach((track) => {
    const trackCard = document.createElement('div');
    trackCard.className = 'track';
    trackCard.innerHTML = `<strong>${track.name}</strong><div>${track.clips.length} clips</div>`;
    timelineTracks.appendChild(trackCard);
  });
}

function animate(now = 0) {
  if (AppState.timeline.playing) {
    const delta = now - AppState.lastFrame;
    if (delta > 33) {
      AppState.timeline.playhead += delta / 1000 * AppState.playback.speed * AppState.project.fps;
      AppState.lastFrame = now;
      renderPreview();
      updateTimeDisplay();
    }
  }
  requestAnimationFrame(animate);
}

function togglePlayback(shouldPlay) {
  AppState.timeline.playing = shouldPlay;
  if (shouldPlay) {
    AppState.lastFrame = performance.now();
    if (audioContext.state === 'suspended') audioContext.resume();
  }
}

function stopPlayback() {
  AppState.timeline.playing = false;
}

function stepPlayhead(amount) {
  AppState.timeline.playhead += amount * 1;
  AppState.timeline.playhead = Math.max(0, Math.min(AppState.project.duration * AppState.project.fps, AppState.timeline.playhead));
  updateTimeDisplay();
  renderPreview();
}

function updateTimeDisplay() {
  const frame = Math.floor(AppState.timeline.playhead) % AppState.project.fps;
  const seconds = Math.floor(AppState.timeline.playhead / AppState.project.fps);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}:${String(frame).padStart(2, '0')}`;
}

function captureFrame() {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'frame.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function renderPreview() {
  if (!canvas) return;
  const width = 1280;
  const height = 720;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(AppState.previewScale, AppState.previewScale);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.strokeRect(-width / 2 + 80, -height / 2 + 80, width - 160, height - 160);
  ctx.restore();
  if (AppState.selection && AppState.selection.type === 'video' && mediaElement) {
    ctx.drawImage(mediaElement, 0, 0, width, height);
  }
  drawSafeZone();
  drawGrid();
}

function drawSafeZone() {
  ctx.strokeStyle = 'rgba(94,234,212,0.75)';
  ctx.strokeRect(80, 80, 1120, 560);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * 72);
    ctx.lineTo(1280, i * 72);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 128, 0);
    ctx.lineTo(i * 128, 720);
    ctx.stroke();
  }
}

function exportProject() {
  const blob = new Blob(['{"project":"studio-video-express"}'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'studio-video-project.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function removeSelection() {
  if (!AppState.selection) return;
  AppState.media = AppState.media.filter((entry) => entry.id !== AppState.selection.id);
  AppState.timeline.tracks.forEach((track) => {
    track.clips = track.clips.filter((clip) => clip.source?.id !== AppState.selection.id);
  });
  AppState.selection = null;
  renderMediaPool();
  renderTimeline();
}

function loadSavedState() {
  const saved = localStorage.getItem('studio-video-state');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(AppState, parsed);
    renderMediaPool();
    renderTimeline();
  }
}

init();
