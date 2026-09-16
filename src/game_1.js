import * as THREE from 'three';
import {
  CAR_CLASSES, getCarClass, makeCar, preloadAllCars,
  randomClassId, randomColor, TRAFFIC_COLORS
} from './cars.js';
import {
  STREETS, STREET_WIDTH, WORLD_HALF, HWY_Y, HWY_W, HWY_HALF,
  PLATFORMS, RAMPS, CHECKPOINTS, rampAt, groundHeightAt,
  buildWorld, applyTimeOfDay
} from './world.js';

const $ = id => document.getElementById(id);
const canvasEl = $('canvas');
const menuEl = $('menu');
const hudEl = $('hud');
const infoEl = $('info');
const clockEl = $('clock');
const speedEl = $('speedEl');
const gearEl = $('gearEl');
const nitroEl = $('nitroEl');
const scoreEl = $('scoreEl');
const cpEl = $('cpEl');
const airEl = $('airEl');
const bestAirEl = $('bestAirEl');
const carClassEl = $('carClassEl');
const airPop = $('airPop');
const swapHint = $('swapHint');
const fsBtn = $('fsBtn');
const pauseBtn = $('pauseBtn');
const startBtn = $('startBtn');
const paintRow = $('paintRow');
const carGrid = $('carGrid');
const coinCountEl = $('coinCount');
const clockValEl = $('clockEl');
const driftInfoEl = $('driftInfo');
const driftScoreEl = $('driftScore');
const driftMultEl = $('driftMult');
const abilityInfoEl = $('abilityInfo');
const abilityNameEl = $('abilityName');
const abilityTimerEl = $('abilityTimer');
const p1Ctl = $('p1Ctl');
const pedalCtl = $('pedalCtl');
const loadingEl = $('loading');

const SAVE_KEY = 'rocknride_save_v7';
function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {coins:0}; }
  catch { return {coins:0}; }
}
function saveGame(s){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
}
const save = loadSave();
coinCountEl.textContent = Math.floor(save.coins).toLocaleString();

// ===== Scene =====
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xa8c8e0, 0.0014);

const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 1800);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const isMobile = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.3 : 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasEl.appendChild(renderer.domElement);

// ===== Lights =====
const hemi = new THREE.HemisphereLight(0x88bbee, 0x2a2a30, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
const shadowSize = isMobile ? 1024 : 2048;
sun.shadow.mapSize.set(shadowSize, shadowSize);
Object.assign(sun.shadow.camera, { left:-250, right:250, top:250, bottom:-250, near:1, far:800 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

const amb = new THREE.AmbientLight(0x3a4560, 0.4);
scene.add(amb);

const moon = new THREE.DirectionalLight(0x9ab8ff, 0);
scene.add(moon, moon.target);

const skyMat = new THREE.MeshBasicMaterial({ color: 0x80b8e8, side: THREE.BackSide, fog: false });
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), skyMat);
skyMesh.frustumCulled = false;
scene.add(skyMesh);

// ===== World =====
buildWorld(scene);

// ===== Player =====
let playerColor = 0xff3b30;
let player = makeCar('sedan', playerColor, { headlight: true });
player.position.set(132, 0, 132);
player.rotation.y = -Math.PI/2;
scene.add(player);

const P = {
  x: 132, z: 132, y: 0, heading: -Math.PI/2,
  speed: 0, vy: 0,
  airborne: false, airTime: 0, bestAir: 0,
  nitro: 100, gear: 1, score: 0, coins: 0, cpIndex: 0,
  hudAt: 0, clockAt: 0,
  carClass: 'sedan', swapCooldown: 0,
  drifting: false, driftScore: 0, driftMultiplier: 1, driftTimer: 0,
  slipX: 0, slipZ: 0
};

// ===== Abilities =====
const ABILITY_COOLDOWN = {
  none: 0, teleport: 20, nitrofill: 15, offroad: 15, burnout: 14,
  siren: 16, powerslide: 14, driftgod: 18, hyper: 22, afterburner: 20
};
const ABILITY_DURATION = {
  none: 0, teleport: 0, nitrofill: 0, offroad: 5, burnout: 0,
  siren: 5, powerslide: 5, driftgod: 5, hyper: 3, afterburner: 3
};

const abilityState = { active: false, timeLeft: 0, cooldown: 0, name: '—', key: 'none' };

function triggerAbility(){
  if(!started || paused) return;
  if(abilityState.cooldown > 0) return;
  const cls = getCarClass(P.carClass);
  if(cls.ability === 'none') return;

  abilityState.name = cls.abilityName;
  abilityState.key = cls.ability;
  const dur = ABILITY_DURATION[cls.ability] || 5;
  const cd = ABILITY_COOLDOWN[cls.ability] || 15;

  if(cls.ability === 'nitrofill'){
    P.nitro = 100;
    showSwapHint('NITRO FILLED!');
  } else if(cls.ability === 'burnout'){
    P.speed = Math.min(P.speed + 30, cls.speed * 1.3);
    showSwapHint('BURNOUT!');
  } else if(cls.ability === 'teleport'){
    P.x += -Math.sin(P.heading) * 40;
    P.z += -Math.cos(P.heading) * 40;
    showSwapHint('TELEPORT!');
  } else if(cls.ability === 'afterburner'){
    abilityState.active = true;
    abilityState.timeLeft = dur;
    P.speed = Math.max(P.speed, cls.speed * 1.2);
    P.nitro = 100;
    showSwapHint('AFTERBURNER!');
  } else {
    abilityState.active = true;
    abilityState.timeLeft = dur;
    showSwapHint(cls.abilityName + ' ACTIVE');
  }

  abilityState.cooldown = cd;
  updateAbilityButton();
}

function updateAbilityButton(){
  const btn = $('abilityBtn');
  if(!btn) return;
  const cls = getCarClass(P.carClass);
  if(cls.ability === 'none'){
    btn.style.opacity = '0.3';
    btn.textContent = '—';
  } else if(abilityState.cooldown > 0){
    btn.style.opacity = '0.5';
    btn.textContent = Math.ceil(abilityState.cooldown) + 's';
  } else {
    btn.style.opacity = '1';
    btn.textContent = cls.abilityName;
  }
}

function updateAbility(dt){
  if(abilityState.cooldown > 0){
    abilityState.cooldown -= dt;
    if(abilityState.cooldown < 0) abilityState.cooldown = 0;
    updateAbilityButton();
  }
  if(abilityState.active){
    abilityState.timeLeft -= dt;
    if(abilityState.timeLeft <= 0){
      abilityState.active = false;
      abilityState.timeLeft = 0;
      abilityState.name = '—';
      abilityState.key = 'none';
    }
  }
  if(abilityState.active){
    abilityInfoEl.classList.add('show');
    abilityNameEl.textContent = abilityState.name;
    abilityTimerEl.textContent = abilityState.timeLeft.toFixed(1) + 's';
  } else {
    abilityInfoEl.classList.remove('show');
  }
}

// ===== Multiplayer =====
const socket = (typeof io !== 'undefined') ? io() : null;
if(socket) window.addEventListener('beforeunload', () => socket.disconnect());
const otherPlayers = {};

function addOtherPlayer(info, id){
  if(!socket || id === socket.id || otherPlayers[id]) return;
  const mesh = makeCar(info.carClass || 'sedan', info.color ?? 0xff3b30);
  mesh.position.set(info.x ?? 0, info.y ?? 0, info.z ?? 0);
  mesh.rotation.y = info.rotY ?? 0;
  scene.add(mesh);
  otherPlayers[id] = { mesh };
}
function removeOtherPlayer(id){
  const o = otherPlayers[id];
  if(!o) return;
  scene.remove(o.mesh);
  delete otherPlayers[id];
}
if(socket){
  socket.on('currentPlayers', players => {
    Object.keys(players).forEach(id => { if(id !== socket.id) addOtherPlayer(players[id], id); });
  });
  socket.on('newPlayer', info => addOtherPlayer(info, info.id));
  socket.on('playerMoved', info => {
    const o = otherPlayers[info.id];
    if(!o) return;
    o.mesh.position.set(info.x, info.y, info.z);
    o.mesh.rotation.y = info.rotY;
  });
  socket.on('playerDisconnected', id => removeOtherPlayer(id));
}

// ===== Traffic =====
const trafficCars = [];
const hwyTraffic = [];
const parkedCars = [];

function spawnTraffic(){
  for(let i = 0; i < 34; i++){
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const street = STREETS[Math.floor(Math.random()*STREETS.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = dir * (STREET_WIDTH/4);
    const c = makeCar(randomClassId(), randomColor());
    scene.add(c);
    const baseSpeed = 14 + Math.random()*10;
    trafficCars.push({
      type:'traffic', mesh:c, axis, street, dir, lane,
      pos:(Math.random()*2 - 1)*360, speed:baseSpeed, baseSpeed,
      taken:false, respawnAt:0
    });
  }
  for(let i = 0; i < 14; i++){
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const side = Math.random() < 0.5 ? -1 : 1;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const off = dir * (HWY_W/6);
    const c = makeCar(randomClassId(), randomColor());
    scene.add(c);
    const baseSpeed = 26 + Math.random()*10;
    hwyTraffic.push({
      type:'hwy', mesh:c, axis, side, dir, off,
      pos:(Math.random()*2 - 1)*320, speed:baseSpeed, baseSpeed,
      taken:false, respawnAt:0
    });
  }
  for(const s of STREETS){
    for(let p = -360; p <= 360; p += 34){
      if(Math.abs(Math.abs(p) - Math.abs(s)) < 30) continue;
      if(Math.random() < 0.3){
        const c = makeCar(randomClassId(), randomColor());
        c.position.set(s + STREET_WIDTH/2 - 2.5, 0.3, p);
        c.rotation.y = Math.PI;
        scene.add(c);
        parkedCars.push({ type:'parked', mesh:c, taken:false, respawnAt:0, x:c.position.x, z:c.position.z, rot:c.rotation.y });
      }
    }
  }
}

// ===== Coins =====
const coinGeo = new THREE.TorusGeometry(0.7, 0.22, 6, 14);
const coinMat = new THREE.MeshStandardMaterial({ color:0xffd24a, emissive:0xffb020, emissiveIntensity:1.4, metalness:0.9, roughness:0.2 });
const coinPickups = [];

function spawnCoins(){
  for(let i = 0; i < 60; i++){
    const x = (Math.random()*2 - 1) * 370;
    const z = (Math.random()*2 - 1) * 370;
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.position.set(x, 1.5, z);
    m.rotation.x = Math.PI/2;
    scene.add(m);
    coinPickups.push({ mesh:m, x, z, spin:Math.random()*Math.PI*2, taken:false, respawnAt:0 });
  }
}

// ===== Menu =====
let selectedCarClass = 'sedan';

function renderCarTiles(){
  carGrid.innerHTML = '';
  for(const c of CAR_CLASSES){
    const can = save.coins >= c.cost;
    const d = document.createElement('button');
    d.className = 'car-tile' + (c.id === selectedCarClass ? ' active' : '') + (can ? '' : ' locked');
    d.innerHTML = `
      ${c.ability !== 'none' ? `<span class="ability-tag">${c.abilityName}</span>` : ''}
      <span class="car-name">${c.name}</span>
      <div class="bars">
        <span>SPD</span><span class="bar"><i style="width:${Math.min(100, c.speed/1.4)}%"></i></span>
        <span>ACC</span><span class="bar"><i style="width:${Math.min(100, c.accel*1.4)}%"></i></span>
      </div>
      <span class="cost ${c.cost === 0 ? 'free' : ''}">${c.cost === 0 ? 'FREE' : c.cost + '¢'}</span>`;
    d.addEventListener('click', () => {
      if(!can) return;
      selectedCarClass = c.id;
      renderCarTiles();
      updateStartButton();
    });
    carGrid.appendChild(d);
  }
}

function updateStartButton(){
  const total = getCarClass(selectedCarClass).cost;
  startBtn.innerHTML = total === 0
    ? `START ENGINE <span>›</span>`
    : `START ENGINE — ${total}¢ <span>›</span>`;
}

renderCarTiles();
updateStartButton();

paintRow.addEventListener('click', e => {
  const btn = e.target.closest('button[data-color]');
  if(!btn) return;
  paintRow.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  playerColor = parseInt(btn.dataset.color.slice(1), 16);
  if(player.userData.bodyMaterial) player.userData.bodyMaterial.color.setHex(playerColor);
});

// ===== Input =====
const keys = {};
const blockKeys = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright','shift','e'];
let started = false, paused = false, camMode = 0;

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if(blockKeys.includes(k)) e.preventDefault();
  if(k === 'c') camMode = (camMode + 1) % 3;
  if(k === 'escape' && started) setPaused(!paused);
  if(k === 'e') triggerAbility();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function bindTouch(el, key){
  const on = e => { e.preventDefault(); keys[key] = true; };
  const off = e => { e.preventDefault(); keys[key] = false; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
}
document.querySelectorAll('[data-key]').forEach(el => bindTouch(el, el.dataset.key));

document.getElementById('abilityBtn')?.addEventListener('pointerdown', e => {
  e.preventDefault();
  triggerAbility();
});

function setPaused(v){ paused = v; pauseBtn.textContent = v ? '▶' : 'Ⅱ'; }

// ===== Audio =====
let audioCtx = null, engineOsc = null, engineGain = null, engineFilter = null;

function initAudio(){
  if(audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  } catch(e){ console.warn('Audio failed', e); }
}
function updateEngineSound(speed){
  if(!audioCtx) return;
  const s = Math.abs(speed);
  engineOsc.frequency.setTargetAtTime(50 + s*6, audioCtx.currentTime, 0.1);
  engineFilter.frequency.setTargetAtTime(300 + s*15, audioCtx.currentTime, 0.1);
  engineGain.gain.setTargetAtTime(s > 1 ? 0.04 + s*0.002 : 0.015, audioCtx.currentTime, 0.1);
}
function playCoinSound(){
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

// ===== Effects =====
const skidGeo = new THREE.PlaneGeometry(0.5, 1.3);
const skidBaseMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.4, depthWrite:false });
const skidMarks = [];
let skidIdx = 0;
const MAX_SKID = 120;
for(let i = 0; i < MAX_SKID; i++){
  const m = new THREE.Mesh(skidGeo, skidBaseMat.clone());
  m.rotation.x = -Math.PI/2;
  m.visible = false;
  scene.add(m);
  skidMarks.push({ mesh:m, life:0 });
}
function addSkidMark(x, z, rotY){
  const s = skidMarks[skidIdx];
  s.mesh.position.set(x, 0.05, z);
  s.mesh.rotation.z = rotY;
  s.mesh.visible = true;
  s.mesh.material.opacity = 0.55;
  s.life = 3.5;
  skidIdx = (skidIdx + 1) % MAX_SKID;
}

const smokeGeo = new THREE.SphereGeometry(0.5, 5, 5);
const smokeMat = new THREE.MeshBasicMaterial({ color:0xdddddd, transparent:true, opacity:0.5, depthWrite:false });
const smokeParts = [];
let smokeIdx = 0;
const MAX_SMOKE = 50;
for(let i = 0; i < MAX_SMOKE; i++){
  const m = new THREE.Mesh(smokeGeo, smokeMat.clone());
  m.visible = false;
  scene.add(m);
  smokeParts.push({ mesh:m, life:0, vx:0, vy:0, vz:0 });
}
function spawnSmoke(x, y, z){
  const p = smokeParts[smokeIdx];
  p.mesh.position.set(x, y, z);
  p.mesh.scale.setScalar(0.5 + Math.random()*0.5);
  p.mesh.visible = true;
  p.mesh.material.opacity = 0.6;
  p.vx = (Math.random() - 0.5) * 2;
  p.vy = 1.5 + Math.random() * 1.5;
  p.vz = (Math.random() - 0.5) * 2;
  p.life = 1.0;
  smokeIdx = (smokeIdx + 1) % MAX_SMOKE;
}

// ===== Take over =====
function showSwapHint(text, bad = false){
  swapHint.textContent = text;
  swapHint.classList.toggle('bad', bad);
  swapHint.classList.add('show');
  clearTimeout(swapHint._t);
  swapHint._t = setTimeout(() => swapHint.classList.remove('show'), 1600);
}

function tryTakeOver(target){
  if(P.swapCooldown > 0) return;
  const clsId = target.mesh.userData.classId || 'sedan';
  const cls = getCarClass(clsId);
  const owned = Math.floor(save.coins + P.coins);
  if(owned < cls.cost){
    showSwapHint(`NEED ${cls.cost}¢ FOR ${cls.name}`, true);
    P.swapCooldown = 0.8;
    return;
  }
  let cost = cls.cost;
  if(P.coins >= cost) P.coins -= cost;
  else {
    cost -= P.coins; P.coins = 0;
    save.coins -= cost;
    if(save.coins < 0) save.coins = 0;
    saveGame(save);
    coinCountEl.textContent = Math.floor(save.coins + P.coins).toLocaleString();
  }
  const pos = target.mesh.position.clone();
  const rotY = target.mesh.rotation.y;
  scene.remove(target.mesh);
  target.taken = true;
  target.respawnAt = performance.now() + 6000;
  scene.remove(player);
  player = makeCar(clsId, playerColor, { headlight: true });
  player.position.set(pos.x, P.y, pos.z);
  scene.add(player);
  P.carClass = clsId;
  P.heading = rotY;
  P.speed *= 0.6;
  P.swapCooldown = 2.0;
  carClassEl.textContent = cls.name;
  abilityState.cooldown = 0;
  abilityState.active = false;
  updateAbilityButton();
  showSwapHint(`SHIFTED INTO ${cls.name}`);
}

function respawnVehicle(veh){
  const clsId = randomClassId();
  const newMesh = makeCar(clsId, randomColor());
  scene.remove(veh.mesh);
  veh.mesh = newMesh;
  veh.taken = false;
  veh.respawnAt = 0;
  if(veh.type === 'parked'){
    newMesh.position.set(veh.x, 0.3, veh.z);
    newMesh.rotation.y = veh.rot;
  } else if(veh.type === 'traffic'){
    veh.pos = (Math.random()*2 - 1) * 360;
    newMesh.position.set(
      veh.axis === 'x' ? veh.pos : veh.street + veh.lane,
      0.3,
      veh.axis === 'x' ? veh.street + veh.lane : veh.pos
    );
  } else {
    veh.pos = (Math.random()*2 - 1) * 320;
    if(veh.axis === 'x') newMesh.position.set(veh.pos, HWY_Y + 0.3, veh.side*HWY_HALF + veh.off);
    else newMesh.position.set(veh.side*HWY_HALF + veh.off, HWY_Y + 0.3, veh.pos);
  }
  scene.add(newMesh);
}

// ===== Player update =====
function updatePlayer(dt){
  updateAbility(dt);
  let cls = getCarClass(P.carClass);

  if(abilityState.active){
    if(abilityState.key === 'offroad') cls = { ...cls, grip: cls.grip * 1.5 };
    if(abilityState.key === 'powerslide') cls = { ...cls, grip: cls.grip * 0.7 };
    if(abilityState.key === 'hyper') cls = { ...cls, speed: cls.speed * 1.5 };
    if(abilityState.key === 'afterburner') cls = { ...cls, speed: cls.speed * 1.4, accel: cls.accel * 2.5 };
  }

  const throttle = keys['w'] ? 1 : 0;
  const brake = keys['s'] ? 1 : 0;
  const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
  const driftKey = keys[' '];
  const nitro = keys['shift'] && P.nitro > 0 && !P.airborne;

  if(throttle) P.speed += (nitro ? cls.accel*1.6 : cls.accel) * dt;
  if(brake) P.speed -= 38 * dt;
  if(!throttle && !brake){
    P.speed -= Math.sign(P.speed) * Math.min(Math.abs(P.speed), 6*dt);
  }
  if(P.airborne){
    P.speed -= Math.sign(P.speed) * Math.min(Math.abs(P.speed), 1.5*dt);
  }
  const inAfterburner = abilityState.active && abilityState.key === 'afterburner';
  if(nitro && !inAfterburner) P.nitro = Math.max(0, P.nitro - 24*dt);
  else if(!inAfterburner) P.nitro = Math.min(100, P.nitro + 4.5*dt);

  P.speed = Math.max(-22, Math.min(nitro ? cls.speed*1.35 : cls.speed, P.speed));

  const speedAbs = Math.abs(P.speed);
  const canDrift = speedAbs > 12 && !P.airborne;

  if(driftKey && canDrift){
    if(!P.drifting){
      P.drifting = true;
      P.driftTimer = 0;
      P.driftScore = 0;
      P.driftMultiplier = 1;
    }
    P.driftTimer += dt;
    P.driftMultiplier = Math.min(8, 1 + P.driftTimer * 0.7);
    if(abilityState.active && abilityState.key === 'driftgod'){
      P.driftMultiplier = Math.min(20, P.driftMultiplier * 2);
    }
    P.driftScore += Math.round(speedAbs * dt * 12 * P.driftMultiplier);
  } else {
    if(P.drifting){
      if(P.driftScore > 50){
        P.score += P.driftScore;
        P.coins += Math.round(P.driftScore / 200);
        airPop.textContent = `+${P.driftScore} DRIFT ×${P.driftMultiplier.toFixed(1)}`;
        airPop.classList.add('on');
        clearTimeout(airPop._t);
        airPop._t = setTimeout(() => airPop.classList.remove('on'), 1200);
      }
      P.drifting = false;
      P.driftScore = 0;
      P.driftMultiplier = 1;
    }
  }

  if(!P.airborne){
    const gripMult = P.drifting ? 0.35 : 1.0;
    const grip = Math.min(speedAbs/18, 1) * cls.grip * gripMult;
    P.heading += steer * dt * 2.1 * grip * Math.sign(P.speed || 1);
  } else {
    P.heading += steer * dt * 1.1;
  }

  const vx = -Math.sin(P.heading) * P.speed;
  const vz = -Math.cos(P.heading) * P.speed;

  if(P.drifting){
    const slide = steer * dt * 8 * P.driftMultiplier;
    P.slipX += Math.cos(P.heading) * slide;
    P.slipZ -= Math.sin(P.heading) * slide;
    P.slipX *= 0.92;
    P.slipZ *= 0.92;
  } else {
    P.slipX *= 0.85;
    P.slipZ *= 0.85;
  }

  let nx = P.x + (vx + P.slipX) * dt;
  let nz = P.z + (vz + P.slipZ) * dt;

  let blocked = false;
  const hitRamp = rampAt(nx, nz);
  if(hitRamp){
    const t = (hitRamp.lz + hitRamp.ramp.d/2) / hitRamp.ramp.d;
    const surface = t * hitRamp.ramp.h;
    if(!P.airborne && surface > P.y + 1.2) blocked = true;
  }
  if(blocked) P.speed *= -0.25;
  else { P.x = nx; P.z = nz; }

  const bx = WORLD_HALF - 8;
  if(P.x < -bx){ P.x = -bx; P.speed *= 0.6; }
  if(P.x > bx){ P.x = bx; P.speed *= 0.6; }
  if(P.z < -bx){ P.z = -bx; P.speed *= 0.6; }
  if(P.z > bx){ P.z = bx; P.speed *= 0.6; }

  const here = rampAt(P.x, P.z);
  let rampSurface = 0, rampSlope = 0, rampAx = 0, rampAz = 0;
  if(here){
    const t = (here.lz + here.ramp.d/2) / here.ramp.d;
    rampSurface = t * here.ramp.h;
    rampSlope = here.ramp._slope;
    rampAx = here.ramp._ax;
    rampAz = here.ramp._az;
  }
  const gh = groundHeightAt(P.x, P.z, P.y);

  if(P.airborne){
    P.vy -= 26*dt;
    P.y += P.vy * dt;
    P.airTime += dt;
    if(P.y <= gh){
      P.y = gh; P.vy = 0; P.airborne = false;
      if(P.airTime > 0.35){
        const reward = Math.round(P.airTime*900 + P.bestAir*40);
        P.score += reward;
        P.coins += Math.round(reward/40);
        if(P.airTime > P.bestAir) P.bestAir = P.airTime;
        airPop.textContent = `+${reward} AIR`;
        airPop.classList.add('on');
        clearTimeout(airPop._t);
        airPop._t = setTimeout(() => airPop.classList.remove('on'), 900);
      }
      P.airTime = 0;
    }
  } else {
    if(gh < P.y - 0.15){
      P.airborne = true; P.airTime = 0;
      if(rampSurface > 0){
        const along = vx*rampAx + vz*rampAz;
        P.vy = Math.max(-3, Math.min(14, rampSlope * along));
      } else P.vy = 0;
    } else {
      P.y = gh;
      if(rampSurface > 0){
        const along = vx*rampAx + vz*rampAz;
        P.vy = Math.max(-3, Math.min(14, rampSlope * along));
      } else P.vy = 0;
    }
  }

  P.gear = Math.max(1, Math.min(6, Math.ceil(Math.abs(P.speed)/10)));
  player.position.set(P.x, P.y, P.z);
  player.rotation.y = P.heading;
  updateEngineSound(P.speed);

  if(abilityState.active && abilityState.key === 'afterburner' && !P.airborne){
    const bx2 = P.x + Math.sin(P.heading) * 2.2;
    const bz2 = P.z + Math.cos(P.heading) * 2.2;
    spawnSmoke(bx2, 0.4, bz2);
    spawnSmoke(bx2, 0.4, bz2);
    spawnSmoke(bx2, 0.6, bz2);
    addSkidMark(bx2, bz2, P.heading);
  }

  if(P.drifting && speedAbs > 15 && !P.airborne){
    const backX = P.x - Math.sin(P.heading)*1.6;
    const backZ = P.z - Math.cos(P.heading)*1.6;
    const lX = backX + Math.cos(P.heading)*0.9;
    const lZ = backZ - Math.sin(P.heading)*0.9;
    const rX = backX - Math.cos(P.heading)*0.9;
    const rZ = backZ + Math.sin(P.heading)*0.9;
    addSkidMark(lX, lZ, P.heading);
    addSkidMark(rX, rZ, P.heading);
    if(Math.random() < 0.6){
      spawnSmoke(lX, 0.3, lZ);
      spawnSmoke(rX, 0.3, rZ);
    }
  }

  const cp = CHECKPOINTS[P.cpIndex];
  if(Math.hypot(P.x - cp.x, P.y - cp.y, P.z - cp.z) < 4.4){
    P.score += 1500;
    P.coins += 25;
    P.cpIndex = (P.cpIndex + 1) % CHECKPOINTS.length;
  }

  for(const c of coinPickups){
    if(c.taken) continue;
    if(Math.hypot(P.x - c.x, P.z - c.z) < 2.5 && Math.abs(P.y - 1.5) < 3){
      c.taken = true;
      c.respawnAt = performance.now() + 15000;
      c.mesh.visible = false;
      P.coins += 5;
      P.score += 200;
      playCoinSound();
    }
  }

  if(P.swapCooldown > 0) P.swapCooldown -= dt;
  else {
    const TARGET_R = 3.2;
    for(const t of trafficCars){
      if(t.taken) continue;
      if(Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z) < TARGET_R){
        tryTakeOver(t); break;
      }
    }
    if(!P.swapCooldown){
      for(const t of hwyTraffic){
        if(t.taken) continue;
        if(Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z) < TARGET_R){
          tryTakeOver(t); break;
        }
      }
    }
  }

  if(socket && started && !paused){
    if(!P._lastNet) P._lastNet = 0;
    const now = performance.now();
    if(now - P._lastNet > 60){
      socket.emit('playerMovement', {
        x: P.x, y: P.y, z: P.z,
        rotY: P.heading, carClass: P.carClass, color: playerColor
      });
      P._lastNet = now;
    }
  }
}

function updateTraffic(dt){
  const bound = 360;
  const sirenActive = abilityState.active && abilityState.key === 'siren';
  for(const t of trafficCars){
    if(t.taken){ if(performance.now() > t.respawnAt) respawnVehicle(t); continue; }
    if(sirenActive){
      const d = Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z);
      t.speed = d < 30 ? 42 : t.baseSpeed;
    } else {
      t.speed = t.baseSpeed;
    }
    t.pos += t.dir * t.speed * dt;
    if(t.pos > bound) t.pos = -bound;
    if(t.pos < -bound) t.pos = bound;
    if(t.axis === 'x'){
      t.mesh.position.set(t.pos, 0.3, t.street + t.lane);
      t.mesh.rotation.y = t.dir > 0 ? -Math.PI/2 : Math.PI/2;
    } else {
      t.mesh.position.set(t.street + t.lane, 0.3, t.pos);
      t.mesh.rotation.y = t.dir > 0 ? Math.PI : 0;
    }
  }
  for(const t of hwyTraffic){
    if(t.taken){ if(performance.now() > t.respawnAt) respawnVehicle(t); continue; }
    t.pos += t.dir * t.speed * dt;
    if(t.pos > bound) t.pos = -bound;
    if(t.pos < -bound) t.pos = bound;
    if(t.axis === 'x'){
      t.mesh.position.set(t.pos, HWY_Y + 0.3, t.side*HWY_HALF + t.off);
      t.mesh.rotation.y = t.dir > 0 ? -Math.PI/2 : Math.PI/2;
    } else {
      t.mesh.position.set(t.side*HWY_HALF + t.off, HWY_Y + 0.3, t.pos);
      t.mesh.rotation.y = t.dir > 0 ? Math.PI : 0;
    }
  }
}

function updateCoins(now){
  for(const c of coinPickups){
    if(c.taken && now > c.respawnAt){ c.taken = false; c.mesh.visible = true; }
    if(!c.taken){
      c.mesh.rotation.z += 0.02;
      c.mesh.position.y = 1.5 + Math.sin(now*0.003 + c.spin)*0.3;
    }
  }
}

// ===== Camera =====
const camTarget = new THREE.Vector3();
const camLook = new THREE.Vector3();
function updateCamera(dt){
  if(camMode === 0){
    camTarget.set(P.x + Math.sin(P.heading)*11, P.y + 5.5, P.z + Math.cos(P.heading)*11);
    camLook.set(P.x, P.y + 1.3, P.z);
  } else if(camMode === 1){
    camTarget.set(P.x - Math.sin(P.heading)*0.4, P.y + 1.55, P.z - Math.cos(P.heading)*0.4);
    camLook.set(P.x - Math.sin(P.heading)*14, P.y + 1.1, P.z - Math.cos(P.heading)*14);
  } else {
    camTarget.set(P.x, P.y + 45, P.z + 0.5);
    camLook.set(P.x, P.y, P.z);
  }
  const k = 1 - Math.pow(0.0015, dt);
  camera.position.lerp(camTarget, k);
  camera.lookAt(camLook);
}

// ===== HUD =====
let timeOfDay = 12.5;
const SECONDS_PER_HOUR = 22;
function updateHud(t){
  if(!started) return;
  if(t - P.hudAt > 60){
    P.hudAt = t;
    speedEl.textContent = Math.round(Math.abs(P.speed)*3.6);
    gearEl.textContent = P.speed < -0.4 ? 'R' : P.speed < 0.7 ? 'N' : String(P.gear);
    nitroEl.style.width = P.nitro.toFixed(0) + '%';
    scoreEl.textContent = P.score.toLocaleString();
    cpEl.textContent = `${P.cpIndex}/${CHECKPOINTS.length}`;
    airEl.textContent = P.airTime.toFixed(1) + 's';
    bestAirEl.textContent = P.bestAir.toFixed(2) + 's';
  }
  if(t - P.clockAt > 200){
    P.clockAt = t;
    const hh = Math.floor(timeOfDay) % 24;
    const mm = Math.floor((timeOfDay - Math.floor(timeOfDay)) * 60);
    clockValEl.textContent = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
    coinCountEl.textContent = Math.floor(save.coins + P.coins).toLocaleString();
  }
  if(P.drifting && P.driftScore > 0){
    driftInfoEl.classList.add('show');
    driftScoreEl.textContent = P.driftScore;
    driftMultEl.textContent = P.driftMultiplier.toFixed(1);
  } else {
    driftInfoEl.classList.remove('show');
  }
}

// ===== Main loop =====
let last = performance.now();
function loop(now){
  const dt = Math.min(0.034, (now - last)/1000);
  last = now;
  if(started && !paused){
    updatePlayer(dt);
    timeOfDay = (timeOfDay + dt * SECONDS_PER_HOUR / 60) % 24;
  }
  updateTraffic(dt);
  updateCoins(now);
  for(const s of skidMarks){
    if(s.life > 0){
      s.life -= dt;
      s.mesh.material.opacity = Math.max(0, s.life * 0.16);
      if(s.life <= 0) s.mesh.visible = false;
    }
  }
  for(const p of smokeParts){
    if(p.life > 0){
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.multiplyScalar(1 + dt * 1.5);
      p.mesh.material.opacity = Math.max(0, p.life * 0.5);
      if(p.life <= 0) p.mesh.visible = false;
    }
  }
  updateCamera(dt);
  updateHud(now);
  applyTimeOfDay(scene, renderer, sun, moon, hemi, amb, timeOfDay);
  sun.target.position.set(P.x, 0, P.z);
  sun.position.set(P.x + sun.position.x * 0.3, sun.position.y, P.z + sun.position.z * 0.3);
  sun.target.updateMatrixWorld();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function resize(){
  const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ===== Start =====
function startGameWithFallback(){
  try {
    spawnTraffic();
    spawnCoins();
    started = true;
    setPaused(false);
    initAudio();
    updateAbilityButton();
    menuEl.style.display = 'none';
    hudEl.style.display = '';
    infoEl.style.display = '';
    clockEl.style.display = '';
    if(isMobile){
      p1Ctl.style.display = 'flex';
      pedalCtl.style.display = 'flex';
    }
    loadingEl.classList.add('hide');
    last = performance.now();
  } catch(e){
    console.error('Start failed:', e);
    loadingEl.textContent = 'ERROR: ' + (e.message || e).slice(0, 50);
  }
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = 'LOADING CARS…';
  loadingEl.classList.remove('hide');
  loadingEl.textContent = 'LOADING CARS 0/10…';

  try {
    await preloadAllCars((done, total) => {
      loadingEl.textContent = `LOADING CARS ${done}/${total}…`;
    });

    try {
      scene.remove(player);
      P.carClass = selectedCarClass;
      player = makeCar(selectedCarClass, playerColor, { headlight: true });
      player.position.set(P.x, P.y, P.z);
      player.rotation.y = P.heading;
      scene.add(player);
      carClassEl.textContent = getCarClass(selectedCarClass).name;
    } catch(e) {
      console.warn('Player car swap failed:', e);
    }

    startGameWithFallback();
  } catch(err){
    console.error('GAME ERROR:', err);
    startGameWithFallback();
  }
  startBtn.disabled = false;
});

pauseBtn.addEventListener('click', () => {
  if(!started) return;
  if(!paused){
    save.coins += P.coins;
    saveGame(save);
    coinCountEl.textContent = Math.floor(save.coins).toLocaleString();
    P.coins = 0;
  }
  setPaused(!paused);
});

fsBtn.addEventListener('click', () => document.documentElement.requestFullscreen?.());

setInterval(() => {
  if(started && !paused && P.coins > 0){
    save.coins += P.coins;
    P.coins = 0;
    saveGame(save);
  }
}, 8000);

requestAnimationFrame(loop);