// Procedural Roblox-meme-style background music
// Generates the "tuh nu na nu nuuuuu" vibe using oscillators

let musicCtx = null;
let musicPlaying = false;
let musicTimeout = null;

const MELODY = [
  // [note frequency in Hz, duration in beats]
  // "tuh nu na nu nuuuuu"
  [523.25, 0.5],  // C5 - tuh
  [659.25, 0.5],  // E5 - nu
  [587.33, 0.5],  // D5 - na
  [698.46, 0.5],  // F5 - nu
  [783.99, 1.5],  // G5 - nuuuuuu (long)
  [659.25, 0.5],  // E5
  [523.25, 1.0],  // C5
  [0, 0.5],       // rest

  // Second phrase
  [587.33, 0.5],  // D5
  [698.46, 0.5],  // F5
  [659.25, 0.5],  // E5
  [783.99, 0.5],  // G5
  [880.00, 1.5],  // A5
  [783.99, 0.5],  // G5
  [587.33, 1.0],  // D5
  [0, 1.0],       // rest
];

const BASS = [
  [130.81, 2.0],  // C3
  [146.83, 2.0],  // D3
  [164.81, 2.0],  // E3
  [130.81, 2.0],  // C3
  [146.83, 2.0],  // D3
  [164.81, 2.0],  // E3
  [196.00, 2.0],  // G3
  [130.81, 2.0],  // C3
];

let beatDuration = 0.28; // seconds per beat (~107 BPM)
let melodyIndex = 0;
let bassIndex = 0;
let melodyTimer = 0;
let bassTimer = 0;

function playNote(freq, dur, type = 'square', vol = 0.06){
  if(!musicCtx || freq <= 0) return;
  const osc = musicCtx.createOscillator();
  const gain = musicCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = musicCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.9);

  // Filter for that warm "chip" tone
  const filter = musicCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicCtx.destination);
  osc.start(now);
  osc.stop(now + dur);
}

function tickMusic(){
  if(!musicPlaying || !musicCtx) return;
  const now = musicCtx.currentTime;
  const step = 0.05;

  // Melody
  if(now >= melodyTimer){
    const [freq, beats] = MELODY[melodyIndex];
    const dur = beats * beatDuration;
    playNote(freq, dur, 'square', 0.05);
    melodyTimer = now + dur;
    melodyIndex = (melodyIndex + 1) % MELODY.length;
  }

  // Bass
  if(now >= bassTimer){
    const [freq, beats] = BASS[bassIndex];
    const dur = beats * beatDuration;
    playNote(freq, dur, 'triangle', 0.08);
    bassTimer = now + dur;
    bassIndex = (bassIndex + 1) % BASS.length;
  }

  musicTimeout = setTimeout(tickMusic, step * 1000);
}

export function startMusic(){
  if(musicPlaying) return;
  try {
    if(!musicCtx){
      musicCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(musicCtx.state === 'suspended') musicCtx.resume();
    musicPlaying = true;
    const now = musicCtx.currentTime;
    melodyTimer = now;
    bassTimer = now;
    melodyIndex = 0;
    bassIndex = 0;
    tickMusic();
    console.log('🎵 Music started');
  } catch(e){
    console.warn('Music failed', e);
  }
}

export function stopMusic(){
  musicPlaying = false;
  if(musicTimeout) clearTimeout(musicTimeout);
}

export function setMusicVolume(v){
  // No-op for procedural music, volume is baked into playNote
}