const streamUrlInput = document.getElementById('streamUrl');
const loadBtn = document.getElementById('loadBtn');
const video = document.getElementById('video');
const errorMsg = document.getElementById('errorMsg');

let hls = null;

function showError(message) {
  errorMsg.textContent = message;
}

function resetPlayer() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  video.pause();
  video.removeAttribute('src');
  video.load();
  showError('');
}

function playStream() {
  const url = streamUrlInput.value.trim();
  resetPlayer();

  if (!url) {
    showError('Please enter a valid .m3u8 URL.');
    return;
  }

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
    });
    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        showError('Playback started, but autoplay was blocked by the browser.');
      });
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        showError('The stream could not be loaded. Check the URL and CORS permissions.');
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(() => {
        showError('Playback started, but autoplay was blocked by the browser.');
      });
    });
  } else {
    showError('This browser does not support HLS playback.');
  }
}

loadBtn.addEventListener('click', playStream);
streamUrlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    playStream();
  }
});
