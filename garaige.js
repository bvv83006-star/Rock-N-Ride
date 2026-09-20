const SAVE_KEY = 'rocknride_save_v8';
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { coins:0, gears:0, owned:['sedan'], selected:'sedan', upgrades:{}, bodykits:{} }; } catch { return { coins:0, gears:0, owned:['sedan'], selected:'sedan', upgrades:{}, bodykits:{} }; } };
const saveGame = s => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} };
const CAR_CLASSES = [
  { id:'sedan', name:'SEDAN', cost:0, speed:65, accel:26, grip:1.04 },
  { id:'taxi', name:'TAXI', cost:500, speed:70, accel:28, grip:1.06 },
  { id:'sports', name:'SPORTS', cost:1500, speed:82, accel:38, grip:1.14 },
  { id:'suv', name:'SUV', cost:2000, speed:70, accel:28, grip:1.18 },
  { id:'muscle', name:'MUSCLE', cost:3000, speed:88, accel:45, grip:0.98 },
  { id:'police', name:'POLICE', cost:4500, speed:92, accel:48, grip:1.20 },
  { id:'rally', name:'RALLY', cost:6000, speed:90, accel:44, grip:1.24 },
  { id:'race', name:'RACE CAR', cost:8000, speed:105, accel:55, grip:1.28 },
  { id:'super', name:'SUPERCAR', cost:15000, speed:125, accel:60, grip:1.32 },
  { id:'hyper', name:'HYPERCAR', cost:25000, speed:139, accel:75, grip:1.36 }
];
const UPGRADE_COST = { 1:3, 2:6, 3:12, 4:20, 5:30 };
const MAX_LEVEL = 5;
const BK_SPOILERS = ['none','sport','gt','jdm'];
const BK_EXHAUSTS = ['none','single','dual','quad'];
const BK_GLOWS = ['none','red','blue','green','purple','gold'];
const BK_WHEELS = ['black','chrome','gold','neon'];
let save = loadSave();
if (!save.upgrades) save.upgrades = {};
if (!save.bodykits) save.bodykits = {};
if (!save.selected) save.selected = 'sedan';
if (!Array.isArray(save.owned)) save.owned = ['sedan'];
const $ = id => document.getElementById(id);
const coinCountEl = $('coinCount');
const gearCountEl = $('gearCount');
const carsGridEl = $('carsGrid');
function getUpgrade(carId, stat) { return save.upgrades[carId]?.[stat] || 0; }
function getBodykit(carId) { if (!save.bodykits[carId]) save.bodykits[carId] = { spoiler:'none', exhaust:'none', underglow:'none', wheels:'black' }; return save.bodykits[carId]; }
function getStats(car) { return { speed: car.speed + getUpgrade(car.id,'speed')*4, accel: car.accel + getUpgrade(car.id,'accel')*3, grip: car.grip + getUpgrade(car.id,'grip')*0.05 }; }
function updateHud() { if (coinCountEl) coinCountEl.textContent = Math.floor(save.coins).toLocaleString(); if (gearCountEl) gearCountEl.textContent = Math.floor(save.gears).toLocaleString(); }
function render() {
  updateHud();
  if (!carsGridEl) return;
  carsGridEl.innerHTML = '';
  for (const car of CAR_CLASSES) {
    const owned = save.owned.includes(car.id);
    const selected = save.selected === car.id;
    const stats = getStats(car);
    const spdPct = Math.min(100, stats.speed / 1.6);
    const accPct = Math.min(100, stats.accel * 1.4);
    const grpPct = Math.min(100, (stats.grip - 0.9) * 200);
    const card = document.createElement('div');
    card.className = 'car-card' + (owned ? ' owned' : ' locked') + (selected ? ' selected' : '');
    let badge = selected ? '<span class="car-badge selected-badge">SELECTED</span>' : owned ? '<span class="car-badge owned-badge">OWNED</span>' : '<span class="car-badge">LOCKED</span>';
    let actions;
    if (!owned) {
      const canBuy = save.coins >= car.cost;
      actions = `<button class="buy" data-action="buy" data-id="${car.id}" ${canBuy ? '' : 'disabled'}>BUY · ${car.cost.toLocaleString()}</button><button disabled>—</button><button disabled>—</button>`;
    } else {
      actions = `<button class="primary" data-action="select" data-id="${car.id}" ${selected ? 'disabled' : ''}>${selected ? 'IN USE' : 'SELECT'}</button><button data-action="sell" data-id="${car.id}" class="danger" ${save.owned.length <= 1 || selected ? 'disabled' : ''}>SELL</button><button disabled>—</button>`;
    }
    let upgrades = '';
    if (owned) {
      upgrades = '<div class="upgrade-row">';
      for (const stat of ['speed','accel','grip']) {
        const lvl = getUpgrade(car.id, stat);
        const cost = UPGRADE_COST[lvl + 1];
        const canUp = lvl < MAX_LEVEL && save.gears >= cost;
        upgrades += `<button data-action="upgrade" data-id="${car.id}" data-stat="${stat}" ${canUp ? '' : 'disabled'}>${stat.toUpperCase()} ${lvl}/${MAX_LEVEL}<b>${lvl < MAX_LEVEL ? cost + '⚙' : 'MAX'}</b></button>`;
      }
      upgrades += '</div>';
      const bk = getBodykit(car.id);
      upgrades += '<div class="bk-row"><span class="bk-label">SPOILER</span>';
      for (const s of BK_SPOILERS) upgrades += `<button data-action="bk" data-id="${car.id}" data-key="spoiler" data-val="${s}" class="${bk.spoiler === s ? 'on' : ''}">${s.toUpperCase()}</button>`;
      upgrades += '</div><div class="bk-row"><span class="bk-label">EXHAUST</span>';
      for (const s of BK_EXHAUSTS) upgrades += `<button data-action="bk" data-id="${car.id}" data-key="exhaust" data-val="${s}" class="${bk.exhaust === s ? 'on' : ''}">${s.toUpperCase()}</button>`;
      upgrades += '</div><div class="bk-row"><span class="bk-label">GLOW</span>';
      for (const s of BK_GLOWS) upgrades += `<button data-action="bk" data-id="${car.id}" data-key="underglow" data-val="${s}" class="${bk.underglow === s ? 'on' : ''}">${s.toUpperCase()}</button>`;
      upgrades += '</div><div class="bk-row"><span class="bk-label">WHEELS</span>';
      for (const s of BK_WHEELS) upgrades += `<button data-action="bk" data-id="${car.id}" data-key="wheels" data-val="${s}" class="${bk.wheels === s ? 'on' : ''}">${s.toUpperCase()}</button>`;
      upgrades += '</div>';
    }
    card.innerHTML = `
      <div class="car-name-row"><span class="car-name">${car.name}</span>${badge}</div>
      <div class="car-stats">
        <span>SPD</span><span class="bar"><i style="width:${spdPct}%"></i></span>
        <span>ACC</span><span class="bar accel"><i style="width:${accPct}%"></i></span>
        <span>GRP</span><span class="bar grip"><i style="width:${grpPct}%"></i></span>
      </div>
      <div class="car-cost"><span>${owned ? 'OWNED' : '<i></i>' + car.cost.toLocaleString()}</span><span>${Math.round(stats.speed * 3.6)} km/h</span></div>
      <div class="car-actions">${actions}</div>
      ${upgrades}
    `;
    carsGridEl.appendChild(card);
  }
}
if (carsGridEl) {
  carsGridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const car = CAR_CLASSES.find(c => c.id === id);
    if (!car) return;
    if (action === 'buy') { if (save.coins < car.cost) return; save.coins -= car.cost; save.owned.push(car.id); save.selected = car.id; saveGame(save); render(); }
    else if (action === 'select') { save.selected = car.id; saveGame(save); render(); }
    else if (action === 'sell') { if (save.owned.length <= 1 || save.selected === car.id) return; save.owned = save.owned.filter(x => x !== car.id); save.coins += Math.round(car.cost * 0.5); saveGame(save); render(); }
    else if (action === 'upgrade') {
      const stat = btn.dataset.stat;
      const lvl = getUpgrade(car.id, stat);
      const cost = UPGRADE_COST[lvl + 1];
      if (lvl >= MAX_LEVEL || save.gears < cost) return;
      save.gears -= cost;
      if (!save.upgrades[car.id]) save.upgrades[car.id] = {};
      save.upgrades[car.id][stat] = lvl + 1;
      saveGame(save); render();
    }
    else if (action === 'bk') {
      const key = btn.dataset.key;
      const val = btn.dataset.val;
      const bk = getBodykit(car.id);
      if (bk[key] === val) return;
      bk[key] = val;
      saveGame(save); render();
    }
  });
}
render();