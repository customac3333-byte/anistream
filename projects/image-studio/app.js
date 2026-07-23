const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const presetSelect = document.getElementById('presetSelect');
const controlsPanel = document.getElementById('controls');
const controlTitle = document.getElementById('controlTitle');
const exportFormat = document.getElementById('exportFormat');
const jpegQuality = document.getElementById('jpegQuality');
const exportBtn = document.getElementById('exportBtn');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');
const rotateLeftBtn = document.getElementById('rotateLeftBtn');
const rotateRightBtn = document.getElementById('rotateRightBtn');
const flipHBtn = document.getElementById('flipHBtn');
const flipVBtn = document.getElementById('flipVBtn');
const toolButtons = Array.from(document.querySelectorAll('.tool-btn'));
const cropOverlay = document.getElementById('cropOverlay');

let originalImage = null;
let currentImage = null;
let history = [];
let activeTool = 'adjust';
let state = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 100,
  vibrance: 100,
  temperature: 0,
  hue: 0,
  invert: 0,
  rotation: 0,
  flipX: 1,
  flipY: 1,
  crop: null,
  bgMode: 'none',
  bgColor: '#ffffff',
  bgTolerance: 20,
  preset: 'none',
};

function snapshot() {
  return {
    image: new Image(),
    state: JSON.parse(JSON.stringify(state)),
  };
}

function pushHistory() {
  history.push(JSON.parse(JSON.stringify(state)));
  if (history.length > 12) history.shift();
}

function setCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

function drawImage() {
  if (!currentImage) return;
  const { width, height } = currentImage;
  setCanvasSize(width, height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.flipX, state.flipY);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.drawImage(currentImage, -width / 2, -height / 2, width, height);
  ctx.restore();
  if (state.crop) {
    const { x, y, width: cw, height: ch } = state.crop;
    cropOverlay.innerHTML = `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:${ch}px;border:2px solid #22d3ee;box-shadow:inset 0 0 0 9999px rgba(5,8,22,.65)"></div>`;
  } else {
    cropOverlay.innerHTML = '';
  }
}

function applyFiltersToImage(imageData) {
  const data = imageData.data;
  const brightness = state.brightness / 100;
  const contrast = state.contrast / 100;
  const saturation = state.saturation / 100;
  const exposure = state.exposure / 100;
  const vibrance = state.vibrance / 100;
  const temperature = state.temperature / 100;
  const hue = state.hue;
  const invert = state.invert / 100;
  const width = imageData.width;
  const height = imageData.height;

  // This function iterates over the canvas pixel array and adjusts channel values.
  // Each pixel contributes four values: red, green, blue, and alpha.
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    let a = data[i + 3];

    if (a === 0) continue;

    // Brightness and exposure are applied as multiplicative scalar changes.
    r *= brightness * exposure;
    g *= brightness * exposure;
    b *= brightness * exposure;

    // Contrast is adjusted around the midpoint by scaling away from 128.
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // Saturation modifies the intensity of color relative to grayscale.
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;

    // Vibrance boosts muted colors more than saturated ones.
    const max = Math.max(r, g, b);
    const factor = 1 + (max > 128 ? (max - 128) / 128 : 0) * vibrance;
    r *= factor;
    g *= factor;
    b *= factor;

    // Temperature shifts warm/cool tones by balancing red and blue channels.
    if (temperature > 0) {
      r *= 1 + temperature * 0.3;
      b *= 1 - temperature * 0.2;
    } else {
      r *= 1 - Math.abs(temperature) * 0.2;
      b *= 1 + Math.abs(temperature) * 0.3;
    }

    // Hue rotation is applied by shifting the color wheel in RGB space.
    const hueRad = (hue * Math.PI) / 180;
    const cos = Math.cos(hueRad);
    const sin = Math.sin(hueRad);
    const newR = r * cos + b * sin;
    const newB = b * cos - r * sin;
    r = newR;
    b = newB;

    // Invert creates a negative effect by subtracting the channel from 255.
    if (invert > 0) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // Portrait film styling adds a soft, diffused, warm-toned finish with a subtle vignette.
    if (state.preset === 'portrait') {
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      const dist = Math.sqrt((x - width / 2) ** 2 + (y - height / 2) ** 2);
      const vignette = 1 - Math.min(1, dist / (Math.max(width, height) * 0.65));
      const shadowLift = y > height * 0.72 ? 0.94 - (y - height * 0.72) / (height * 0.28) * 0.08 : 1;
      const grain = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      r = r * (0.96 + vignette * 0.04) * shadowLift + (grain - 0.5) * 4;
      g = g * (0.97 + vignette * 0.03) * shadowLift + (grain - 0.5) * 3;
      b = b * (0.92 + vignette * 0.04) * shadowLift + (grain - 0.5) * 2;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
    data[i + 3] = a;
  }

  return imageData;
}

function processImage() {
  if (!originalImage) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalImage.naturalWidth || originalImage.width;
  tempCanvas.height = originalImage.naturalHeight || originalImage.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(originalImage, 0, 0, tempCanvas.width, tempCanvas.height);
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const processed = applyFiltersToImage(imageData);
  tempCtx.putImageData(processed, 0, 0);
  currentImage = new Image();
  currentImage.src = tempCanvas.toDataURL('image/png');
  currentImage.onload = () => drawImage();
}

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      currentImage = img;
      state = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        exposure: 100,
        vibrance: 100,
        temperature: 0,
        hue: 0,
        invert: 0,
        rotation: 0,
        flipX: 1,
        flipY: 1,
        crop: null,
        bgMode: 'none',
        bgColor: '#ffffff',
        bgTolerance: 20,
        preset: 'none',
      };
      drawImage();
      renderControls();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function renderControls() {
  controlsPanel.innerHTML = '';

  if (activeTool === 'adjust') {
    controlTitle.textContent = 'Adjustments';
    addRange('Brightness', 'brightness', 50, 150, 1);
    addRange('Contrast', 'contrast', 50, 150, 1);
    addRange('Saturation', 'saturation', 0, 200, 1);
    addRange('Exposure', 'exposure', 50, 150, 1);
    addRange('Vibrance', 'vibrance', 0, 200, 1);
    addRange('Temperature', 'temperature', -100, 100, 1);
    addRange('Hue Rotate', 'hue', 0, 360, 1);
    addRange('Invert', 'invert', 0, 100, 1);
  } else if (activeTool === 'grade') {
    controlTitle.textContent = 'Color Grade';
    addButton('Cinematic Teal & Orange', () => applyPreset('cinematic'));
    addButton('Cinematic Portrait Film', () => applyPreset('portrait'));
    addButton('Vintage Warm', () => applyPreset('vintage'));
    addButton('Cyberpunk Neon', () => applyPreset('cyberpunk'));
    addButton('Classic B&W', () => applyPreset('bw'));
  } else if (activeTool === 'crop') {
    controlTitle.textContent = 'Crop & Size';
    addSelect('Aspect Ratio', 'cropPreset', ['Freeform', '1:1', '4:3', '16:9', '9:16', 'US Passport', 'EU Passport', 'Indian Passport', 'ID Badge']);
    addRange('Background Fill', 'bgTolerance', 0, 100, 1);
    addButton('Apply Crop', () => applyCropPreset());
    addButton('Clear Crop', () => { state.crop = null; drawImage(); });
  } else if (activeTool === 'effects') {
    controlTitle.textContent = 'Effects';
    addButton('Remove Background (Simple)', () => removeBackground());
    addButton('Reset Background', () => { state.bgMode = 'none'; processImage(); });
  } else if (activeTool === 'bg') {
    controlTitle.textContent = 'Background Removal';
    addRange('Tolerance', 'bgTolerance', 0, 100, 1);
    addButton('Remove Matching Background', () => removeBackground());
    addButton('Use White Fill', () => { state.bgColor = '#ffffff'; removeBackground(); });
    addButton('Use Blue Fill', () => { state.bgColor = '#1d4ed8'; removeBackground(); });
  }
}

function addRange(label, key, min, max, step) {
  const wrap = document.createElement('div');
  wrap.className = 'control-group';
  wrap.innerHTML = `<label>${label}<span>${state[key]}</span></label><input type="range" min="${min}" max="${max}" step="${step}" value="${state[key]}" data-key="${key}" />`;
  wrap.querySelector('input').addEventListener('input', (event) => {
    state[key] = Number(event.target.value);
    wrap.querySelector('span').textContent = state[key];
    processImage();
  });
  controlsPanel.appendChild(wrap);
}

function addSelect(label, key, options) {
  const wrap = document.createElement('div');
  wrap.className = 'control-group';
  wrap.innerHTML = `<label>${label}</label><select data-key="${key}">${options.map((option) => `<option value="${option}">${option}</option>`).join('')}</select>`;
  wrap.querySelector('select').addEventListener('change', (event) => {
    const value = event.target.value;
    if (value !== 'Freeform') {
      applyCropPreset(value);
    }
  });
  controlsPanel.appendChild(wrap);
}

function addButton(label, handler) {
  const wrap = document.createElement('div');
  wrap.className = 'control-group';
  const button = document.createElement('button');
  button.textContent = label;
  button.addEventListener('click', handler);
  wrap.appendChild(button);
  controlsPanel.appendChild(wrap);
}

function applyPreset(name) {
  const presets = {
    cinematic: { brightness: 110, contrast: 118, saturation: 112, exposure: 104, vibrance: 120, temperature: -18, hue: -8, invert: 0, preset: 'cinematic' },
    portrait: { brightness: 96, contrast: 90, saturation: 88, exposure: 104, vibrance: 118, temperature: 16, hue: 4, invert: 0, preset: 'portrait' },
    vintage: { brightness: 96, contrast: 110, saturation: 95, exposure: 102, vibrance: 110, temperature: 22, hue: 12, invert: 0, preset: 'vintage' },
    cyberpunk: { brightness: 104, contrast: 112, saturation: 140, exposure: 108, vibrance: 140, temperature: -30, hue: 200, invert: 0, preset: 'cyberpunk' },
    bw: { brightness: 100, contrast: 100, saturation: 0, exposure: 100, vibrance: 100, temperature: 0, hue: 0, invert: 0, preset: 'bw' },
  };
  Object.assign(state, presets[name]);
  renderControls();
  processImage();
}

function applyCropPreset(preset = 'Freeform') {
  if (!originalImage) return;
  const width = originalImage.naturalWidth || originalImage.width;
  const height = originalImage.naturalHeight || originalImage.height;
  let cropWidth = width;
  let cropHeight = height;
  const presetsMap = {
    '1:1': [1, 1],
    '4:3': [4, 3],
    '16:9': [16, 9],
    '9:16': [9, 16],
    'US Passport': [2, 2],
    'EU Passport': [35, 45],
    'Indian Passport': [35, 35],
    'ID Badge': [3, 4],
  };
  const selected = presetsMap[preset] || [1, 1];
  if (selected[0] === 35 && selected[1] === 45) {
    cropWidth = width * 0.28;
    cropHeight = height * 0.36;
  } else if (selected[0] === 35 && selected[1] === 35) {
    cropWidth = width * 0.28;
    cropHeight = height * 0.28;
  } else if (selected[0] === 3 && selected[1] === 4) {
    cropWidth = width * 0.24;
    cropHeight = height * 0.32;
  } else if (selected[0] === 2 && selected[1] === 2) {
    cropWidth = width * 0.3;
    cropHeight = height * 0.3;
  } else {
    const ratio = selected[0] / selected[1];
    cropHeight = Math.min(height, width / ratio);
    cropWidth = cropHeight * ratio;
  }
  state.crop = { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
  drawImage();
}

function removeBackground() {
  if (!originalImage) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalImage.naturalWidth || originalImage.width;
  tempCanvas.height = originalImage.naturalHeight || originalImage.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(originalImage, 0, 0, tempCanvas.width, tempCanvas.height);
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  const tolerance = state.bgTolerance;
  const target = hexToRgb(state.bgColor || '#ffffff');
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.abs(r - target.r) <= tolerance && Math.abs(g - target.g) <= tolerance && Math.abs(b - target.b) <= tolerance) {
      data[i + 3] = 0;
    }
  }
  tempCtx.putImageData(imageData, 0, 0);
  currentImage = new Image();
  currentImage.src = tempCanvas.toDataURL('image/png');
  currentImage.onload = () => drawImage();
}

function hexToRgb(hex) {
  const sanitized = hex.replace('#', '');
  const value = sanitized.length === 3 ? sanitized.split('').map((char) => char + char).join('') : sanitized;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rotateImage(direction) {
  state.rotation += direction === 'left' ? -90 : 90;
  drawImage();
}

function flipImage(direction) {
  if (direction === 'horizontal') state.flipX *= -1;
  if (direction === 'vertical') state.flipY *= -1;
  drawImage();
}

function exportImage() {
  if (!currentImage) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);
  const mime = exportFormat.value === 'jpeg' ? 'image/jpeg' : 'image/png';
  const link = document.createElement('a');
  link.download = `studio-canvas.${exportFormat.value}`;
  link.href = tempCanvas.toDataURL(mime, exportFormat.value === 'jpeg' ? jpegQuality.value : undefined);
  link.click();
}

fileInput.addEventListener('change', (event) => {
  if (event.target.files[0]) loadImage(event.target.files[0]);
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.style.borderColor = '#22d3ee';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = 'rgba(255,255,255,0.12)';
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.style.borderColor = 'rgba(255,255,255,0.12)';
  if (event.dataTransfer.files[0]) loadImage(event.dataTransfer.files[0]);
});

presetSelect.addEventListener('change', (event) => {
  if (event.target.value !== 'none') {
    applyPreset(event.target.value);
  }
});

undoBtn.addEventListener('click', () => {
  if (history.length) {
    const previous = history.pop();
    Object.assign(state, previous);
    renderControls();
    processImage();
  }
});

resetBtn.addEventListener('click', () => {
  state = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 100,
    vibrance: 100,
    temperature: 0,
    hue: 0,
    invert: 0,
    rotation: 0,
    flipX: 1,
    flipY: 1,
    crop: null,
    bgMode: 'none',
    bgColor: '#ffffff',
    bgTolerance: 20,
    preset: 'none',
  };
  renderControls();
  processImage();
});

rotateLeftBtn.addEventListener('click', () => rotateImage('left'));
rotateRightBtn.addEventListener('click', () => rotateImage('right'));
flipHBtn.addEventListener('click', () => flipImage('horizontal'));
flipVBtn.addEventListener('click', () => flipImage('vertical'));

exportBtn.addEventListener('click', exportImage);

toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    toolButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    activeTool = button.dataset.tool;
    renderControls();
  });
});

renderControls();
