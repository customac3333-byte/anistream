const windowEl = document.getElementById('window-notepad');
const clockEl = document.getElementById('clock');
const closeBtn = document.querySelector('.close-btn');

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

windowEl.addEventListener('mousedown', (event) => {
  isDragging = true;
  offsetX = event.clientX - windowEl.offsetLeft;
  offsetY = event.clientY - windowEl.offsetTop;
  windowEl.style.zIndex = '10';
});

document.addEventListener('mousemove', (event) => {
  if (!isDragging) return;
  windowEl.style.left = `${event.clientX - offsetX}px`;
  windowEl.style.top = `${event.clientY - offsetY}px`;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

closeBtn.addEventListener('click', () => {
  windowEl.style.display = 'none';
});

updateClock();
setInterval(updateClock, 1000);
