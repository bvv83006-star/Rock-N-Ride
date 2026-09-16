// Procedural chip-tune — "tuh nu na nu nuuuuu" vibe
// Layers: bass + melody + kick + hi-hat

let ctx = null;
let master = null;
let playing = false;
let nextStepTime = 0;
let stepIdx = 0;
let timer = null;

// 120 BPM
const BEAT = 0.5;             // seconds per beat
const STEP = BEAT / 2;        // 8th notes
const LOOKAHEAD = 0.15;       // schedule this far ahead

// "tuh nu na nu nuuuuu" melody (frequencies in Hz, duration in 8th-steps)
const MELODY = [
  // Phrase 1
  { f: 523.25, d: 1, v: 1.0 },   // tuh  (C5)
  { f: 659.25, d: 1, v: 0.9 },   // nu   (E5)
  { f: 783.99, d: 1, v: 0.95 },  // na   (G5)
  { f: 659.25, d: 1, v: 0.9 },   // nu   (E5)
  { f: 1046.50, d: 6, v: 1.0 },  // nuuuuu (C6, long)
  { f: 0, d: 2, v: 0 },           // rest

  // Phrase 2
  { f: 587.33, d: 1, v: 1.0 },   // (D5)
  { f: 698.46, d: 1, v: 0.9 },   // (F5)
  { f: 880.00, d: 1, v: 0.95 },  // (A5)
  { f: 698.46, d: 1, v: 0.9 },   // (F5)
  { f: 1174.66, d: 6, v: 1.0 },  // (D6, long)
  { f: 0, d: 4, v: 0 },           // rest

  // Phrase 3 — variation down
  { f: 493.88, d: 1, v: 1.0 },   // (B4)
  { f: 587.33, d: 1, v: 0.9 },   // (D5)
  { f: 698.46, d: 1, v: 0.95 },  // (F5)
  { f: 587.33, d: 1, v: 0.9 },   // (D5)
  { f: 880.00, d: 4, v: 1.0 },   // (A5)
  { f: 783.99, d: 2, v: 0.85 },  // (G5)
  { f: 659.25, d: 2, v: 0.9 },   // (E5)
  { f: 0, d: 2, v: 0 },           // rest
];

// Bass line (8th notes, one per step but only on strong beats)
const BASS_PATTERN = [
  130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0,  // C3
  146.83, 0, 146.83, 0, 146.83, 0, 146.83, 0,  // D3
  164.81, 0, 164.81, 0, 164.81, 0, 164.81, 0,  // E3
  130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0,  // C3
];

let melodyPos = 0;          // index into MELODY
let melodyRemaining = 0;    // 8th-steps left on current note
let bassStep = 0;

function noteFreq(freq, dur, type, vol, startTime){
  if(freq <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.9);
  osc.connect(gain);
  gain.connect(master);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.05);
}

function kick(time){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + 0.2);
}

function hat(time){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  osc.type = 'square';
  osc.frequency.value = 8000;
  gain.gain.setValueAtTime(0.06, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + 0.06);
}

function schedule(){
  if(!playing) return;
  const now = ctx.currentTime;
  while(nextStepTime < now + LOOKAHEAD){
    const t = nextStepTime;

    // Kick every 4th 8th note (quarter notes)
    if(stepIdx % 4 === 0) kick(t);

    // Hat on off-beats
    if(stepIdx % 2 === 1) hat(t);

    // Bass
    const bf = BASS_PATTERN[bassStep % BASS_PATTERN.length];
    if(bf > 0) noteFreq(bf, STEP * 1.6, 'triangle', 0.14, t);
    bassStep++;

    // Melody
    if(melodyRemaining <= 0){
      const note = MELODY[melodyPos % MELODY.length];
      melodyRemaining = note.d;
      if(note.f > 0){
        const dur = note.d * STEP * 0.92;
        noteFreq(note.f, dur, 'square', 0.055 * note.v, t);
      }
      melodyPos++;
    }
    melodyRemaining--;

    nextStepTime += STEP;
    stepIdx++;
  }
  timer = setTimeout(schedule, 25);
}

export function startMusic(){
  if(playing) return;
  try {
    if(!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if(ctx.state === 'suspended') ctx.resume();
    playing = true;
    nextStepTime = ctx.currentTime + 0.1;
    stepIdx = 0;
    melodyPos = 0;
    melodyRemaining = 0;
    bassStep = 0;
    schedule();
    console.log('🎵 Music started');
  } catch(e){
    console.warn('Music failed', e);
  }
}

export function stopMusic(){
  playing = false;
  if(timer){ clearTimeout(timer); timer = null; }
}

export function isMusicPlaying(){ return playing; }  [164.81, 2.0],  // E3
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
