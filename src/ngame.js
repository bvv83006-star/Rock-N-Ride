import * as THREE from 'three';
import {
  CAR_CLASSES, getCarClass, makeCar, preloadAllCars,
  randomClassId, randomColor
} from './cars.js';
import {
  STREETS, STREET_WIDTH, WORLD_HALF, HWY_Y, HWY_W, HWY_HALF,
  CHECKPOINTS, rampAt, groundHeightAt,
  buildWorld, applyTimeOfDay
} from './world.js';
import { startMusic, stopMusic } from './music.js';

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
const musicBtn = $('musicBtn');
const gearModeBtn = $('gearModeBtn');
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
const userAvatarEl = $('userAvatar');
const userNameEl = $('userName');
const chatBoxEl = $('chatBox');
const chatMessagesEl = $('chatMessages');
const chatInputEl = $('chatInput');
const chatSendEl = $('chatSend');
const chatToggleEl = $('chatToggle');
const startOverlay = $('startOverlay');
const startOverlayBtn = $('startOverlayBtn');
const startColors = $('startColors');

const playerName = (localStorage.getItem('username') || 'Player').slice(0, 20);
const savedColor = localStorage.getItem('playerColor') || '#ff3b30';
let playerColor = parseInt(savedColor.replace('#',''), 16);

if(userNameEl) userNameEl.textContent = playerName;
if(userAvatarEl) userAvatarEl.textContent = playerName.charAt(0).toUpperCase();

const SAVE_KEY = 'rocknride_save_v7';
function loadSave(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {coins:0}; } catch { return {coins:0}; } }
function saveGame(s){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }
const save = loadSave();
if(coinCountEl) coinCountEl.textContent = Math.floor(save.coins).toLocaleString();

// ===== TILT =====
let tiltActive = false;
let tiltGamma = 0;
async function requestTilt(){
  if(typeof DeviceOrientationEvent === 'undefined') return;
  try {
    if(typeof DeviceOrientationEvent.requestPermission === 'function'){
      const r = await DeviceOrientationEvent.requestPermission();
      if(r !== 'granted') return;
    }
    window.addEventListener('deviceorientation', e => { tiltGamma = e.gamma || 0; });
    tiltActive = true;
  } catch(e){}
}

// ===== GEAR MODE =====
let gearMode = localStorage.getItem('gearMode') || 'auto';
function updateGearModeButton(){
  if(!gearModeBtn) return;
  if(gearMode === 'auto'){ gearModeBtn.textContent = '⚙ A'; gearModeBtn.classList.remove('off'); }
  else if(gearMode === 'manual'){ gearModeBtn.textContent = '⚙ M'; gearModeBtn.classList.remove('off'); }
  else { gearModeBtn.textContent = '⚙ OFF'; gearModeBtn.classList.add('off'); }
}
updateGearModeButton();

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

const hemi = new THREE.HemisphereLight(0x88bbee, 0x2a2a30, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
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

buildWorld(scene);

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
  slipX: 0, slipZ: 0,
  glitchCooldown: 0
};

const ABILITY_COOLDOWN = { none:0, teleport:20, nitrofill:15, offroad:15, burnout:14, siren:16, powerslide:14, driftgod:18, hyper:22, afterburner:20 };
const ABILITY_DURATION = { none:0, teleport:0, nitrofill:0, offroad:5, burnout:0, siren:5, powerslide:5, driftgod:5, hyper:3, afterburner:3 };
const abilityState = { active:false, timeLeft:0, cooldown:0, name:'—', key:'none' };

function triggerAbility(){
  if(!started || paused) return;
  if(abilityState.cooldown > 0) return;
  const cls = getCarClass(P.carClass);
  if(cls.ability === 'none') return;
  abilityState.name = cls.abilityName;
  abilityState.key = cls.ability;
  const dur = ABILITY_DURATION[cls.ability] || 5;
  const cd = ABILITY_COOLDOWN[cls.ability] || 15;
  if(cls.ability === 'nitrofill'){ P.nitro = 100; showSwapHint('NITRO FILLED!'); }
  else if(cls.ability === 'burnout'){ P.speed = Math.min(P.speed + 30, cls.speed * 1.3); showSwapHint('BURNOUT!'); }
  else if(cls.ability === 'teleport'){ P.x += -Math.sin(P.heading) * 40; P.z += -Math.cos(P.heading) * 40; showSwapHint('TELEPORT!'); }
  else if(cls.ability === 'afterburner'){ abilityState.active = true; abilityState.timeLeft = dur; P.speed = Math.max(P.speed, cls.speed*1.2); P.nitro = 100; showSwapHint('AFTERBURNER!'); }
  else { abilityState.active = true; abilityState.timeLeft = dur; showSwapHint(cls.abilityName + ' ACTIVE'); }
  abilityState.cooldown = cd;
  updateAbilityButton();
}

function updateAbilityButton(){
  const btn = $('abilityBtn');
  if(!btn) return;
  const cls = getCarClass(P.carClass);
  if(cls.ability === 'none'){ btn.style.opacity = '0.55'; btn.textContent = 'NO PWR'; }
  else if(abilityState.cooldown > 0){ btn.style.opacity = '0.5'; btn.textContent = Math.ceil(abilityState.cooldown) + 's'; }
  else { btn.style.opacity = '1'; btn.textContent = cls.abilityName; }
}

function updateAbility(dt){
  if(abilityState.cooldown > 0){ abilityState.cooldown -= dt; if(abilityState.cooldown < 0) abilityState.cooldown = 0; updateAbilityButton(); }
  if(abilityState.active){
    abilityState.timeLeft -= dt;
    if(abilityState.timeLeft <= 0){ abilityState.active = false; abilityState.timeLeft = 0; abilityState.name = '—'; abilityState.key = 'none'; }
  }
  if(abilityInfoEl){
    if(abilityState.active){ abilityInfoEl.classList.add('show'); abilityNameEl.textContent = abilityState.name; abilityTimerEl.textContent = abilityState.timeLeft.toFixed(1) + 's'; }
    else abilityInfoEl.classList.remove('show');
  }
}

const socket = (typeof io !== 'undefined') ? io() : null;
if(socket) window.addEventListener('beforeunload', () => socket.disconnect());
const otherPlayers = {};

function addOtherPlayer(info, id){
  if(!socket || id === socket.id || otherPlayers[id]) return;
  const mesh = makeCar(info.carClass || 'sedan', info.color ?? 0xff3b30);
  mesh.position.set(info.x ?? 0, info.y ?? 0, info.z ?? 0);
  mesh.rotation.y = info.rotY ?? 0;
  scene.add(mesh);
  otherPlayers[id] = { mesh, name: info.name || 'Player' };
}
function removeOtherPlayer(id){
  const o = otherPlayers[id];
  if(!o) return;
  scene.remove(o.mesh);
  delete otherPlayers[id];
}
if(socket){
  socket.on('connect', () => socket.emit('setInfo', { name: playerName, color: playerColor }));
  socket.on('currentPlayers', players => Object.keys(players).forEach(id => { if(id !== socket.id) addOtherPlayer(players[id], id); }));
  socket.on('newPlayer', info => addOtherPlayer(info, info.id));
  socket.on('playerMoved', info => {
    const o = otherPlayers[info.id];
    if(!o) return;
    o.mesh.position.set(info.x, info.y, info.z);
    o.mesh.rotation.y = info.rotY;
    if(info.name) o.name = info.name;
  });
  socket.on('playerDisconnected', id => removeOtherPlayer(id));
  socket.on('chatMessage', data => {
    if(!data || !data.text) return;
    const mine = data.id === socket.id;
    addChatMessage(data.name || 'Player', data.text, mine);
    if(!mine) showBubble(data.id, data.text);
  });
}

const trafficCars = [], hwyTraffic = [], parkedCars = [];
function spawnTraffic(){
  for(let i = 0; i < 34; i++){
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const street = STREETS[Math.floor(Math.random()*STREETS.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = dir * (STREET_WIDTH/4);
    const c = makeCar(randomClassId(), randomColor());
    scene.add(c);
    const baseSpeed = 14 + Math.random()*10;
    trafficCars.push({ type:'traffic', mesh:c, axis, street, dir, lane, pos:(Math.random()*2-1)*360, speed:baseSpeed, baseSpeed, taken:false, respawnAt:0 });
  }
  for(let i = 0; i < 14; i++){
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const side = Math.random() < 0.5 ? -1 : 1;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const off = dir * (HWY_W/6);
    const c = makeCar(randomClassId(), randomColor());
    scene.add(c);
    const baseSpeed = 26 + Math.random()*10;
    hwyTraffic.push({ type:'hwy', mesh:c, axis, side, dir, off, pos:(Math.random()*2-1)*320, speed:baseSpeed, baseSpeed, taken:false, respawnAt:0 });
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

const coinGeo = new THREE.TorusGeometry(0.7, 0.22, 6, 14);
const coinMat = new THREE.MeshStandardMaterial({ color:0xffd24a, emissive:0xffb020, emissiveIntensity:1.4, metalness:0.9, roughness:0.2 });
const coinPickups = [];
function spawnCoins(){
  for(let i = 0; i < 60; i++){
    const x = (Math.random()*2 - 1) * 370;
    const z = (Math.random()*2 - 1) * 370;
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.position.set(x, 1.5, z); m.rotation.x = Math.PI/2;
    scene.add(m);
    coinPickups.push({ mesh:m, x, z, spin:Math.random()*Math.PI*2, taken:false, respawnAt:0 });
  }
}