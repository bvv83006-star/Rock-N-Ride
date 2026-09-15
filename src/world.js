import * as THREE from 'three';

export const STREETS = [-308, -220, -132, -44, 44, 132, 220, 308];
export const STREET_WIDTH = 18;
export const BLOCK_SIZE = 70;
export const SIDEWALK = 5;
export const WORLD_HALF = 420;
export const BLOCK_CENTERS = [-264, -176, -88, 0, 88, 176, 264];
export const PARK_BLOCKS = new Set([
  '-264,0','264,0','0,-264','0,264',
  '-176,-88','176,88','-176,88','176,-88',
  '-264,-264','264,264','-264,264','264,-264',
  '-88,-176','88,176','-88,176','88,-176'
]);
export const HWY_Y = 14, HWY_W = 24, HWY_HALF = 340;

export const PLATFORMS = [
  {x:0, z:-HWY_HALF, w:HWY_HALF*2, d:HWY_W, y:HWY_Y},
  {x:0, z:HWY_HALF,  w:HWY_HALF*2, d:HWY_W, y:HWY_Y},
  {x:HWY_HALF,  z:0, w:HWY_W, d:HWY_HALF*2, y:HWY_Y},
  {x:-HWY_HALF, z:0, w:HWY_W, d:HWY_HALF*2, y:HWY_Y},
];

export const RAMPS = [
  {x:0, z:-44, rot:Math.PI/2, w:14, d:40, h:7},
  {x:0, z:44,  rot:-Math.PI/2, w:14, d:40, h:7},
  {x:-44, z:0, rot:0, w:14, d:40, h:7},
  {x:44,  z:0, rot:Math.PI, w:14, d:40, h:7},
  {x:-176, z:0, rot:0, w:12, d:32, h:6},
  {x:176,  z:0, rot:Math.PI, w:12, d:32, h:6},
  {x:0, z:-176, rot:Math.PI/2, w:12, d:32, h:6},
  {x:0, z:176,  rot:-Math.PI/2, w:12, d:32, h:6},
  {x:-264, z:0, rot:0, w:12, d:32, h:6},
  {x:264,  z:0, rot:Math.PI, w:12, d:32, h:6},
  {x:0, z:-264, rot:Math.PI/2, w:12, d:32, h:6},
  {x:0, z:264,  rot:-Math.PI/2, w:12, d:32, h:6},
  {x:-44, z:-316, rot:Math.PI, w:18, d:46, h:HWY_Y},
  {x:44,  z:316,  rot:0, w:18, d:46, h:HWY_Y},
  {x:316, z:-44,  rot:-Math.PI/2, w:18, d:46, h:HWY_Y},
  {x:-316, z:44,  rot:Math.PI/2, w:18, d:46, h:HWY_Y},
];

for(const r of RAMPS){
  r._c = Math.cos(r.rot);
  r._s = Math.sin(r.rot);
  r._slope = r.h / r.d;
  r._ax = Math.sin(r.rot);
  r._az = Math.cos(r.rot);
}

export function rampAt(x, z){
  for(const r of RAMPS){
    const dx = x - r.x, dz = z - r.z;
    const lx = r._c*dx - r._s*dz;
    const lz = r._s*dx + r._c*dz;
    if(Math.abs(lx) <= r.w/2 && Math.abs(lz) <= r.d/2) return { ramp:r, lx, lz };
  }
  return null;
}

export function groundHeightAt(x, z, currentY){
  let best = 0;
  for(const p of PLATFORMS){
    const dx = x - p.x, dz = z - p.z;
    if(Math.abs(dx) <= p.w/2 && Math.abs(dz) <= p.d/2 && currentY >= p.y - 3) best = Math.max(best, p.y);
  }
  const hit = rampAt(x, z);
  if(hit){
    const t = (hit.lz + hit.ramp.d/2) / hit.ramp.d;
    const s = t * hit.ramp.h;
    if(s > best) best = s;
  }
  return best;
}

export const CHECKPOINTS = RAMPS.map(r => ({
  x: r.x - r._ax * (r.d/2 + 14),
  y: r.h + 6,
  z: r.z - r._az * (r.d/2 + 14)
}));

const WINDOW_MATS = [], LAMP_MATS = [], SIGN_MATS = [];
let LAMP_GLOW = null;

export function getWindowMats(){ return WINDOW_MATS; }
export function getLampMats(){ return LAMP_MATS; }
export function getSignMats(){ return SIGN_MATS; }
export function getLampGlow(){ return LAMP_GLOW; }

let rndSeed = 9137;
const rnd = () => (rndSeed = (rndSeed * 9301 + 49297) % 233280) / 233280;

function makeAsphaltTex(){
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#1a1a1e';
  x.fillRect(0, 0, 512, 512);
  for(let i = 0; i < 12000; i++){
    const v = (Math.random() - 0.5) * 30;
    x.fillStyle = `rgb(${26+v|0},${26+v|0},${30+v|0})`;
    x.fillRect(Math.random()*512|0, Math.random()*512|0, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSidewalkTex(){
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#8a8a92';
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(60,60,70,0.85)';
  x.lineWidth = 3;
  for(let i = 0; i <= 256; i += 32){
    x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeGlassTex(){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#2e4668');
  g.addColorStop(0.5, '#141e32');
  g.addColorStop(1, '#0a1220');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 512);
  const cw = 20, rh = 28;
  for(let py = 0; py < 512; py += rh){
    x.fillStyle = 'rgba(0,0,0,0.7)';
    x.fillRect(0, py, 256, 3);
    for(let px = 0; px < 256; px += cw){
      const lit = Math.random() < 0.35;
      x.fillStyle = lit
        ? `rgba(255,220,155,${0.5 + Math.random()*0.3})`
        : 'rgba(14,20,32,0.95)';
      x.fillRect(px + 2, py + 4, cw - 3, rh - 7);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeOfficeTex(){
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#1c1e2a';
  x.fillRect(0, 0, 256, 256);
  const cw = 32, rh = 28;
  for(let py = 0; py < 256; py += rh){
    x.fillStyle = 'rgba(0,0,0,0.6)';
    x.fillRect(0, py, 256, 3);
    for(let px = 0; px < 256; px += cw){
      const lit = Math.random() < 0.4;
      x.fillStyle = lit
        ? `rgba(255,220,155,${0.5 + Math.random()*0.3})`
        : 'rgba(14,20,32,0.95)';
      x.fillRect(px + 4, py + 5, cw - 6, rh - 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildWorld(scene){
  // Ground plane
  const groundTex = makeAsphaltTex();
  groundTex.repeat.set(80, 80);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF*2.6, WORLD_HALF*2.6),
    new THREE.MeshStandardMaterial({color:0x2a2a30, map:groundTex, roughness:0.96})
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Streets
  const asphaltTex = makeAsphaltTex();
  const asphaltMat = new THREE.MeshStandardMaterial({color:0x232326, map:asphaltTex, roughness:0.9});
  asphaltTex.repeat.set(2, 30);
  const streetLen = (STREETS[STREETS.length-1] - STREETS[0]) + STREET_WIDTH + 300;
  for(const s of STREETS){
    for(const [x, z, w, h] of [
      [s, 0, STREET_WIDTH, streetLen],
      [0, s, streetLen, STREET_WIDTH]
    ]){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), asphaltMat);
      m.rotation.x = -Math.PI/2;
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      scene.add(m);
    }
  }

  // Road markings
  const lineMat = new THREE.MeshBasicMaterial({color:0xffcc22});
  const lineW = new THREE.MeshBasicMaterial({color:0xdddddd});
  function addLine(x, z, w, h, m = lineMat){
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    o.rotation.x = -Math.PI/2;
    o.position.set(x, 0.035, z);
    scene.add(o);
  }
  for(const s of STREETS){
    addLine(s - 0.5, 0, 0.35, streetLen);
    addLine(s + 0.5, 0, 0.35, streetLen);
    addLine(0, s - 0.5, streetLen, 0.35);
    addLine(0, s + 0.5, streetLen, 0.35);
    for(let p = -360; p <= 360; p += 16){
      addLine(s - STREET_WIDTH/4, p, 0.4, 6, lineW);
      addLine(s + STREET_WIDTH/4, p, 0.4, 6, lineW);
      addLine(p, s - STREET_WIDTH/4, 6, 0.4, lineW);
      addLine(p, s + STREET_WIDTH/4, 6, 0.4, lineW);
    }
  }

  // Crosswalks
  const cwMat = new THREE.MeshBasicMaterial({color:0xf0f0f0});
  const cwGeo = new THREE.PlaneGeometry(0.9, 2.4);
  for(const sx of STREETS){
    for(const sz of STREETS){
      for(let i = -3; i <= 3; i++){
        const c1 = new THREE.Mesh(cwGeo, cwMat);
        c1.rotation.x = -Math.PI/2;
        c1.position.set(sx + i*2.4, 0.04, sz - STREET_WIDTH/2 - 2);
        scene.add(c1);
        const c2 = c1.clone();
        c2.position.z = sz + STREET_WIDTH/2 + 2;
        scene.add(c2);
        const c3 = new THREE.Mesh(cwGeo, cwMat);
        c3.rotation.x = -Math.PI/2;
        c3.rotation.z = Math.PI/2;
        c3.position.set(sx - STREET_WIDTH/2 - 2, 0.04, sz + i*2.4);
        scene.add(c3);
        const c4 = c3.clone();
        c4.position.x = sx + STREET_WIDTH/2 + 2;
        scene.add(c4);
      }
    }
  }

  // Sidewalks
  const sidewalkTex = makeSidewalkTex();
  const sidewalkMat = new THREE.MeshStandardMaterial({color:0x909098, map:sidewalkTex, roughness:0.95});
  sidewalkTex.repeat.set(8, 8);
  for(const bx of BLOCK_CENTERS){
    for(const bz of BLOCK_CENTERS){
      const w = BLOCK_SIZE + SIDEWALK*2;
      const walk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, w), sidewalkMat);
      walk.position.set(bx, 0.15, bz);
      walk.receiveShadow = true;
      scene.add(walk);
    }
  }

  // Buildings
  const glassTex = makeGlassTex();
  const officeTex = makeOfficeTex();
  const roofMat = new THREE.MeshStandardMaterial({color:0x14141a, roughness:0.9});
  const darkConcreteMat = new THREE.MeshStandardMaterial({color:0x3a3a42, roughness:0.9});

  function matFromTex(tex, rx, ry, opts = {}){
    const t = tex.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, rx), Math.max(1, ry));
    const m = new THREE.MeshStandardMaterial({
      map: t,
      emissive: 0xffffff,
      emissiveMap: t,
      emissiveIntensity: opts.emissive ?? 1.0,
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 0.75,
      metalness: opts.metalness ?? 0.15
    });
    WINDOW_MATS.push(m);
    return m;
  }

  function buildBuilding(g, w, d, h){
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w*1.1, 5, d*1.1), darkConcreteMat);
    podium.position.y = 2.5;
    podium.castShadow = true;
    podium.receiveShadow = true;
    g.add(podium);

    let y = 5, tw = w, td = d, th = h - 5;
    const tiers = 2 + Math.floor(rnd()*2);
    for(let i = 0; i < tiers; i++){
      const tierH = Math.max(8, th / (tiers - i));
      if(i > 0){ tw *= 0.82; td *= 0.82; }
      const tex = rnd() < 0.5 ? glassTex : officeTex;
      const tm = matFromTex(tex, Math.max(1, Math.round(tw/4)), Math.max(1, Math.round(tierH/4)));
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(tw, tierH, td), tm);
      mesh.position.y = y + tierH/2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      y += tierH;
      th -= tierH;
      if(th < 8) break;
    }

    const slab = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.5, 0.6, td + 0.5), roofMat);
    slab.position.y = y + 0.3;
    slab.castShadow = true;
    g.add(slab);
    y += 0.6;

    if(rnd() < 0.6){
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, 10, 6),
        new THREE.MeshStandardMaterial({color:0x1a1a1a, metalness:0.7, roughness:0.4})
      );
      ant.position.y = y + 5;
      g.add(ant);
      const bc = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({color:0xff2222}));
      bc.position.y = y + 10;
      g.add(bc);
    }
  }

  for(const bx of BLOCK_CENTERS){
    for(const bz of BLOCK_CENTERS){
      if(PARK_BLOCKS.has(`${bx},${bz}`)) continue;
      const distC = Math.hypot(bx, bz);
      const t = Math.min(1, distC / 320);
      const maxH = 160 * (1 - t) + 25 * t;
      const count = 2 + Math.floor(rnd()*3);
      const placed = [];
      for(let i = 0; i < count; i++){
        const w = 16 + rnd()*14;
        const d = 16 + rnd()*14;
        const h = 30 + rnd()*maxH;
        const half = BLOCK_SIZE/2 - Math.max(w, d)/2 - 2;
        const ox = (rnd()*2 - 1) * Math.max(2, half - 4);
        const oz = (rnd()*2 - 1) * Math.max(2, half - 4);
        let ok = true;
        for(const p of placed){
          if(Math.hypot(p.x - ox, p.z - oz) < (p.s + Math.max(w, d))/2 + 2){ ok = false; break; }
        }
        if(!ok) continue;
        placed.push({x:ox, z:oz, s:Math.max(w, d)});
        const g = new THREE.Group();
        g.position.set(bx + ox, 0, bz + oz);
        buildBuilding(g, w, d, h);
        scene.add(g);
      }
    }
  }

  // Street lamps
  const lampPoleMat = new THREE.MeshStandardMaterial({color:0x141418, roughness:0.5, metalness:0.7});
  const lampHeadMat = new THREE.MeshStandardMaterial({color:0x333338, emissive:0xffe6b0, emissiveIntensity:0.6});
  LAMP_MATS.push(lampHeadMat);
  const lampPositions = [];
  for(const s of STREETS){
    for(let p = -380; p <= 380; p += 70){
      lampPositions.push([s - STREET_WIDTH/2 - 1.5, p]);
      lampPositions.push([s + STREET_WIDTH/2 + 1.5, p + 35]);
    }
  }
  const lampPoleIM = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.18, 7, 6),
    lampPoleMat,
    lampPositions.length
  );
  const lampHeadIM = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.55, 8, 6),
    lampHeadMat,
    lampPositions.length
  );
  const _dm = new THREE.Object3D();
  for(let i = 0; i < lampPositions.length; i++){
    const [x, z] = lampPositions[i];
    _dm.position.set(x, 3.5, z);
    _dm.updateMatrix();
    lampPoleIM.setMatrixAt(i, _dm.matrix);
    _dm.position.set(x, 7.3, z);
    _dm.updateMatrix();
    lampHeadIM.setMatrixAt(i, _dm.matrix);
  }
  lampPoleIM.instanceMatrix.needsUpdate = true;
  lampHeadIM.instanceMatrix.needsUpdate = true;
  scene.add(lampPoleIM, lampHeadIM);

  // Trees in parks
  const trunkMat = new THREE.MeshStandardMaterial({color:0x4a3224, roughness:0.95});
  const leafMat = new THREE.MeshStandardMaterial({color:0x2a5a3a, roughness:0.9});
  const treeTransforms = [];
  for(const key of PARK_BLOCKS){
    const [bx, bz] = key.split(',').map(Number);
    const n = 5 + Math.floor(rnd()*5);
    for(let i = 0; i < n; i++){
      treeTransforms.push([
        bx + (rnd()*2 - 1) * (BLOCK_SIZE/2 - 6),
        bz + (rnd()*2 - 1) * (BLOCK_SIZE/2 - 6),
        0.8 + rnd()*0.6
      ]);
    }
  }
  const trunkIM = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.4, 0.55, 3, 6),
    trunkMat,
    treeTransforms.length
  );
  const leafIM = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(2.6, 0),
    leafMat,
    treeTransforms.length
  );
  for(let i = 0; i < treeTransforms.length; i++){
    const [x, z, s] = treeTransforms[i];
    _dm.position.set(x, 1.5*s + 0.3, z);
    _dm.scale.setScalar(s);
    _dm.rotation.y = rnd()*Math.PI*2;
    _dm.updateMatrix();
    trunkIM.setMatrixAt(i, _dm.matrix);
    _dm.position.set(x, 4.2*s + 0.3, z);
    _dm.updateMatrix();
    leafIM.setMatrixAt(i, _dm.matrix);
    _dm.scale.setScalar(1);
    _dm.rotation.set(0, 0, 0);
  }
  trunkIM.instanceMatrix.needsUpdate = true;
  leafIM.instanceMatrix.needsUpdate = true;
  trunkIM.castShadow = true;
  scene.add(trunkIM, leafIM);

  // Ramps
  const rampMat = new THREE.MeshStandardMaterial({color:0x2a2e38, roughness:0.7, metalness:0.4});
  const railRed = new THREE.MeshStandardMaterial({color:0xff3b30, emissive:0xff3b30, emissiveIntensity:0.8});
  const stripeMat = new THREE.MeshBasicMaterial({color:0xffe066});
  for(const r of RAMPS){
    const g = new THREE.Group();
    g.position.set(r.x, 0, r.z);
    g.rotation.y = r.rot;
    const ang = Math.atan2(r.h, r.d);
    const len = Math.hypot(r.h, r.d);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.5, len), rampMat);
    plate.rotation.x = -ang;
    plate.position.y = r.h/2;
    plate.castShadow = true;
    plate.receiveShadow = true;
    g.add(plate);
    for(const sx of [-1, 1]){
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, len), railRed);
      rail.rotation.x = -ang;
      rail.position.set(sx * r.w/2, r.h/2 + 0.55, 0);
      g.add(rail);
    }
    const st = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.2, 0.12, 1.2), stripeMat);
    st.position.set(0, r.h + 0.05, r.d/2 - 0.4);
    st.rotation.x = -ang;
    g.add(st);
    scene.add(g);
  }

  return { WINDOW_MATS, LAMP_MATS, SIGN_MATS };
}

export function applyTimeOfDay(scene, renderer, sun, moon, hemi, amb, hour){
  const sunT = (hour - 6) / 12 * Math.PI;
  const sx = Math.cos(sunT) * 300;
  const sy = Math.sin(sunT) * 300;
  sun.position.set(sx, Math.max(-40, sy), 150);
  sun.target.position.set(0, 0, 0);
  moon.position.set(-sx, Math.max(30, -sy), -150);
  const dayness = Math.max(0, Math.min(1, (Math.sin(sunT) + 0.15) / 0.8));
  sun.intensity = dayness * 2.4;
  moon.intensity = (1 - dayness) * 0.4;
  hemi.intensity = 0.3 + dayness * 0.6;
  amb.intensity = 0.2 + dayness * 0.25;
  const night = 1 - dayness;
  for(const m of WINDOW_MATS) m.emissiveIntensity = 0.15 + night * 1.7;
  for(const m of LAMP_MATS) m.emissiveIntensity = 0.2 + night * 1.8;
}