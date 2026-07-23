const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const pads = Array.from(document.querySelectorAll('.pad'));
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let activeOscillators = new Map();

function playTone(frequency) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.5);
}

function drawVisualizer() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  const barWidth = width / 24;
  for (let i = 0; i < 24; i += 1) {
    const amplitude = 0.18 + Math.sin(Date.now() / 180 + i * 0.5) * 0.16 + Math.random() * 0.04;
    const barHeight = amplitude * height;
    ctx.fillStyle = i % 2 === 0 ? '#22d3ee' : '#a78bfa';
    ctx.fillRect(i * barWidth + 6, height / 2 - barHeight / 2, barWidth - 8, barHeight);
  }
  requestAnimationFrame(drawVisualizer);
}

pads.forEach((pad) => {
  pad.addEventListener('click', () => playTone(Number(pad.dataset.frequency)));
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toUpperCase();
  const matchedPad = pads.find((pad) => pad.dataset.note === key);
  if (matchedPad) {
    playTone(Number(matchedPad.dataset.frequency));
    matchedPad.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 180 });
  }
});

drawVisualizer();
