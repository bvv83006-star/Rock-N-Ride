const SETTINGS_KEY = 'rocknride_settings_v1';

const DEFAULTS = {
  steerType: 'buttons',
  tiltSens: 50,
  steerSens: 70,
  autoAccel: false,
  invertSteer: false,
  vibration: true,

  gfxQuality: 'medium',
  shadows: true,
  bloom: true,
  motionBlur: false,
  drawDist: 70,

  volMaster: 100,
  volEngine: 80,
  volMusic: 60,
  volSfx: 100,

  units: 'kmh',
  minimap: true,
  damage: false,
  showFps: false,
  traffic: 'medium',
  camera: 'chase'
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return { ...DEFAULTS, ...saved };
  } catch { return { ...DEFAULTS }; }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

const $ = id => document.getElementById(id);
let settings = loadSettings();

// ===== TABS =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    tab.classList.add('on');
    const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`);
    if (panel) panel.classList.add('on');
  });
});

// ===== SEGMENTED BUTTONS =====
function setupSegmented(containerId, key, parser = v => v) {
  const el = $(containerId);
  if (!el) return;
  el.querySelectorAll('.seg').forEach(seg => {
    const val = parser(seg.dataset.val);
    seg.classList.toggle('on', settings[key] === val);
    seg.addEventListener('click', () => {
      el.querySelectorAll('.seg').forEach(s => s.classList.remove('on'));
      seg.classList.add('on');
      settings[key] = val;
      saveSettings(settings);
    });
  });
}

// ===== TOGGLES =====
function setupToggle(id, key) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle('on', settings[key]);
  el.addEventListener('click', () => {
    settings[key] = !settings[key];
    el.classList.toggle('on', settings[key]);
    saveSettings(settings);
  });
}

// ===== SLIDERS =====
function setupSlider(id, labelId, key, suffix = '%') {
  const slider = $(id);
  const label = $(labelId);
  if (!slider || !label) return;
  slider.value = settings[key];
  label.textContent = settings[key] + suffix;
  slider.addEventListener('input', () => {
    settings[key] = parseInt(slider.value);
    label.textContent = settings[key] + suffix;
    saveSettings(settings);
  });
}

// ===== WIRE UP =====
setupSegmented('steerType', 'steerType');
setupSegmented('gfxQuality', 'gfxQuality');
setupSegmented('units', 'units');
setupSegmented('traffic', 'traffic');
setupSegmented('camera', 'camera');

setupToggle('autoAccel', 'autoAccel');
setupToggle('invertSteer', 'invertSteer');
setupToggle('vibration', 'vibration');
setupToggle('shadows', 'shadows');
setupToggle('bloom', 'bloom');
setupToggle('motionBlur', 'motionBlur');
setupToggle('minimap', 'minimap');
setupToggle('damage', 'damage');
setupToggle('showFps', 'showFps');

setupSlider('tiltSens', 'tiltVal', 'tiltSens');
setupSlider('steerSens', 'steerVal', 'steerSens');
setupSlider('drawDist', 'distVal', 'drawDist');
setupSlider('volMaster', 'volMasterVal', 'volMaster');
setupSlider('volEngine', 'volEngineVal', 'volEngine');
setupSlider('volMusic', 'volMusicVal', 'volMusic');
setupSlider('volSfx', 'volSfxVal', 'volSfx');

// ===== SAVE & CLOSE =====
const saveBtn = $('saveBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    saveSettings(settings);
    window.location.href = '/';
  });
}