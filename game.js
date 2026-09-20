// ===== WORLD =====
const WORLD_HALF = 800;

// Ground
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, map: asphaltTex, roughness: 0.95 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = settings.shadows;
scene.add(ground);

// ECDS-style 4 BIG regions
// NW: Mountain + forest
// NE: Downtown skyscrapers
// SW: Beach + palm trees + water
// SE: Industrial + airport + stunt bowl

// ============ ROADS — bigger, wider ============
const ROAD_W = 16;
const LANE = 8;

// Main cross roads through the map
for (let i = -700; i <= 700; i += 100) {
  addStreet(i, 0, ROAD_W, 1600);
  addStreet(0, i, 1600, ROAD_W);
  // yellow center lines
  const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1600), MAT.yellow);
  l1.rotation.x = -Math.PI/2; l1.position.set(i, 0.04, 0); scene.add(l1);
  const l2 = new THREE.Mesh(new THREE.PlaneGeometry(1600, 0.4), MAT.yellow);
  l2.rotation.x = -Math.PI/2; l2.position.set(0, 0.04, i); scene.add(l2);
  // crosswalks
  for (let j = -700; j <= 700; j += 100) {
    const cw = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.5), MAT.white);
    cw.rotation.x = -Math.PI/2; cw.position.set(i + 8, 0.05, j); scene.add(cw);
    const cw2 = cw.clone(); cw2.position.set(i - 8, 0.05, j); scene.add(cw2);
  }
}

// ============ NE: DOWNTOWN (big skyscrapers) ============
(function downtown() {
  const cx = 350, cz = -350;
  // Grid streets
  for (let i = -140; i <= 140; i += 70) {
    addStreet(cx + i, cz, 10, 300);
    addStreet(cx, cz + i, 300, 10);
  }
  // Tall buildings in a circle around center
  const towers = [
    [-100,-100,32,32,180],[0,-120,38,38,220],[100,-100,30,30,160],
    [-120,0,34,34,200],[0,0,42,42,240],[120,0,36,36,190],
    [-100,100,28,28,150],[0,120,40,40,210],[100,100,32,32,175],
    [-60,-60,22,22,120],[60,-60,24,24,140],
    [-60,60,20,20,110],[60,60,26,26,130]
  ];
  for (const [dx,dz,w,d,h] of towers) addBuilding(cx+dx, cz+dz, w, d, h, MAT.glass);
  // Rooftop antennas (all)
  for (const t of BUILDINGS.slice(-towers.length)) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 20, 6), MAT.darkConcrete);
    ant.position.set(t.x, t.w > 30 ? 240 : 180, t.z);
    scene.add(ant);
  }
})();

// ============ NW: MOUNTAIN + FOREST ============
(function mountain() {
  const cx = -350, cz = -350;
  // Grass ground
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), MAT.grass);
  g.rotation.x = -Math.PI/2; g.position.set(cx, 0.04, cz); g.receiveShadow = settings.shadows; scene.add(g);
  // Big mountain
  const m = new THREE.Mesh(new THREE.ConeGeometry(140, 180, 12), new THREE.MeshStandardMaterial({ color: 0x5a5a4a, roughness: 0.95 }));
  m.position.set(cx, 90, cz); m.castShadow = settings.shadows; scene.add(m);
  // Snow cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(50, 60, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  cap.position.set(cx, 140, cz); scene.add(cap);
  // Winding road up the mountain
  for (let a = 0; a < Math.PI * 3; a += 0.12) {
    const r = 130 - a * 8;
    if (r < 20) break;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), MAT.asphalt);
    seg.rotation.x = -Math.PI/2; seg.rotation.z = -a;
    seg.position.set(cx + Math.cos(a) * r, 0.06 + a * 2, cz + Math.sin(a) * r);
    scene.add(seg);
  }
  // Forest
  for (let i = 0; i < 80; i++) {
    const dx = (Math.random()-0.5)*380;
    const dz = (Math.random()-0.5)*380;
    const dist = Math.hypot(dx, dz);
    if (dist < 150) continue; // don't put trees on mountain
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 5, 6), MAT.trunk);
    t.position.set(cx+dx, 2.5, cz+dz); scene.add(t);
    const l = new THREE.Mesh(new THREE.ConeGeometry(3, 6, 8), MAT.leaf);
    l.position.set(cx+dx, 6.5, cz+dz); scene.add(l);
    const l2 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5, 8), MAT.leaf);
    l2.position.set(cx+dx, 9, cz+dz); scene.add(l2);
  }
})();

// ============ SW: BEACH + WATER + PIER ============
(function beach() {
  const cx = -350, cz = 350;
  // Sand
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), MAT.sand);
  sand.rotation.x = -Math.PI/2; sand.position.set(cx, 0.05, cz); sand.receiveShadow = settings.shadows; scene.add(sand);
  // Water (extends off-map)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), MAT.water);
  water.rotation.x = -Math.PI/2; water.position.set(cx - 100, 0.03, cz + 250); scene.add(water);
  // Boardwalk
  box(400, 0.3, 12, MAT.sidewalk, cx, 0.15, cz - 80);
  // Pier extending into water
  for (let z = 0; z < 200; z += 10) {
    box(20, 0.4, 10, MAT.concrete, cx - 100, 1.5, cz + 80 + z);
    // Support pillars
    if (z % 30 === 0) {
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3, 6), MAT.concrete);
      p1.position.set(cx - 108, 0.5, cz + 80 + z); scene.add(p1);
      const p2 = p1.clone(); p2.position.set(cx - 92, 0.5, cz + 80 + z); scene.add(p2);
    }
  }
  // Palm trees along boardwalk
  for (let i = 0; i < 40; i++) {
    const dx = (Math.random()-0.5)*380;
    const dz = 20 + Math.random()*60;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.95 }));
    t.position.set(cx+dx, 4, cz+dz); scene.add(t);
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 0), new THREE.MeshStandardMaterial({ color: 0x2a7a3a, roughness: 0.9 }));
    l.position.set(cx+dx, 9, cz+dz); scene.add(l);
  }
  // Lighthouse
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 40, 12), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 }));
  lh.position.set(cx - 150, 20, cz - 60); lh.castShadow = settings.shadows; scene.add(lh);
  const lht = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 6, 12), new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.5 }));
  lht.position.set(cx - 150, 42, cz - 60); scene.add(lht);
  const lhb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd400 }));
  lhb.position.set(cx - 150, 45, cz - 60); scene.add(lhb);
})();

// ============ SE: INDUSTRIAL + AIRPORT ============
(function industrial() {
  const cx = 350, cz = 350;
  // Grid
  for (let i = -100; i <= 100; i += 50) {
    addStreet(cx + i, cz - 150, 12, 300);
    addStreet(cx - 150, cz + i, 300, 12);
  }
  // Warehouses
  for (let i = 0; i < 20; i++) {
    const dx = (Math.random()-0.5)*300;
    const dz = (Math.random()-0.5)*300;
    if (Math.abs(dx) > 60 && Math.abs(dz) > 100) continue; // keep airport clear
    addBuilding(cx+dx, cz+dz, 30, 25, 14, MAT.industrial);
  }
  // Cargo containers (colorful stacks)
  const cc = [0xdd3322, 0x2c7cff, 0xffbf35, 0x38f7c0, 0xff6a3a, 0x8833cc];
  for (let i = 0; i < 60; i++) {
    const dx = (Math.random()-0.5)*350;
    const dz = -80 - Math.random()*80;
    const m = new THREE.MeshStandardMaterial({ color: cc[Math.floor(Math.random()*cc.length)], roughness: 0.7 });
    for (let s = 0; s < 1 + Math.floor(Math.random()*3); s++)
      box(7, 2.6, 3, m, cx+dx, 1.3 + s*2.7, cz+dz);
  }
  // Airport — huge runway
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(500, 50), MAT.runway);
  rw.rotation.x = -Math.PI/2; rw.position.set(cx, 0.02, cz + 80); rw.receiveShadow = settings.shadows; scene.add(rw);
  for (let i = -30; i <= 30; i++) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), MAT.white);
    d.rotation.x = -Math.PI/2; d.position.set(cx + i*8, 0.04, cz + 80); scene.add(d);
  }
  // Runway edge lines
  for (const sgn of [-1,1]) {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(500, 0.5), MAT.white);
    e.rotation.x = -Math.PI/2; e.position.set(cx, 0.04, cz + 80 + sgn*24); scene.add(e);
  }
  // Terminal
  addBuilding(cx - 100, cz + 130, 80, 22, 16, MAT.concrete);
  // Control tower
  box(10, 50, 10, MAT.concrete, cx + 90, 25, cz + 130);
  box(18, 8, 18, MAT.glass, cx + 90, 54, cz + 130);
  // Parked plane
  const pb = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 28, 12), MAT.concrete);
  pb.rotation.z = Math.PI/2; pb.position.set(cx - 60, 5, cz + 130); scene.add(pb);
  const wing1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 26), MAT.concrete);
  wing1.position.set(cx - 60, 5, cz + 130); scene.add(wing1);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 0.6), new THREE.MeshStandardMaterial({ color: 0x2c7cff }));
  tail.position.set(cx - 47, 8, cz + 130); scene.add(tail);
  // Hangars
  for (let i = 0; i < 3; i++) {
    const hx = cx - 100 + i * 40;
    box(35, 18, 35, MAT.industrial, hx, 9, cz + 180);
  }
})();

// ============ CENTRAL PLAZA (map center) ============
(function plaza() {
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(90, 90, 0.4, 48), MAT.sidewalk);
  plaza.position.set(0, 0.2, 0); plaza.receiveShadow = settings.shadows; scene.add(plaza);
  // Fountain
  const fb = new THREE.Mesh(new THREE.CylinderGeometry(12, 15, 3, 24), MAT.concrete);
  fb.position.set(0, 1.5, 0); scene.add(fb);
  const fw = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.6, 24), MAT.water);
  fw.position.set(0, 3.3, 0); scene.add(fw);
  const ft = new THREE.Mesh(new THREE.ConeGeometry(2.5, 10, 12), MAT.concrete);
  ft.position.set(0, 9, 0); scene.add(ft);
  const tb = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x38f7c0 }));
  tb.position.set(0, 14.5, 0); scene.add(tb);
  // Ring of trees
  for (let i = 0; i < 16; i++) {
    const a = (i/16) * Math.PI * 2;
    const tx = Math.cos(a) * 70, tz = Math.sin(a) * 70;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 4, 6), MAT.trunk);
    tr.position.set(tx, 2, tz); scene.add(tr);
    const lv = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 0), MAT.leaf);
    lv.position.set(tx, 6, tz); scene.add(lv);
  }
})();

// ============ HIGHWAY RING (elevated, big) ============
(function highway() {
  const ringR = 500;
  const seg = 64;
  for (let i = 0; i < seg; i++) {
    const a0 = (i/seg)*Math.PI*2, a1 = ((i+1)/seg)*Math.PI*2;
    const mx = Math.cos((a0+a1)/2)*ringR;
    const mz = Math.sin((a0+a1)/2)*ringR;
    const p = new THREE.Mesh(new THREE.BoxGeometry(34, 1.5, 32), MAT.concrete);
    p.position.set(mx, 14, mz); p.rotation.y = -(a0+a1)/2;
    p.castShadow = settings.shadows; p.receiveShadow = settings.shadows; scene.add(p);
    // Neon rails
    for (const sgn of [-1,1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(34, 1, 0.5), MAT.neon);
      r.position.set(mx + Math.cos(-(a0+a1)/2 + Math.PI/2)*sgn*15, 15.5, mz + Math.sin(-(a0+a1)/2 + Math.PI/2)*sgn*15);
      r.rotation.y = -(a0+a1)/2;
      scene.add(r);
    }
    // Pillar
    if (i % 4 === 0) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 14, 8), MAT.concrete);
      pil.position.set(mx, 7, mz);
      pil.castShadow = settings.shadows; scene.add(pil);
    }
  }
})();

// ============ STUNT BOWL (SE, big) ============
const BOWL = { x: 550, z: 550, r: 70, h: 45 };
(function bowl() {
  const segments = 48, rings = 6;
  for (let r = 0; r < rings; r++) {
    const t0 = r/rings, t1 = (r+1)/rings;
    const r0 = BOWL.r*(1-t0*0.15), r1 = BOWL.r*(1-t1*0.15);
    const y0 = t0*BOWL.h, y1 = t1*BOWL.h;
    for (let s = 0; s < segments; s++) {
      const a0 = (s/segments)*Math.PI*2, a1 = ((s+1)/segments)*Math.PI*2;
      const x0 = Math.cos(a0)*r0, z0 = Math.sin(a0)*r0;
      const x1 = Math.cos(a1)*r0, z1 = Math.sin(a1)*r0;
      const x2 = Math.cos(a1)*r1, z2 = Math.sin(a1)*r1;
      const x3 = Math.cos(a0)*r1, z3 = Math.sin(a0)*r1;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x0,y0,z0,x1,y0,z1,x2,y1,z2,x0,y0,z0,x2,y1,z2,x3,y1,z3]), 3));
      geo.computeVertexNormals();
      const panel = new THREE.Mesh(geo, MAT.ramp);
      panel.position.set(BOWL.x, 0, BOWL.z);
      panel.receiveShadow = settings.shadows; panel.castShadow = settings.shadows;
      scene.add(panel);
    }
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(BOWL.r*0.85, 0.6, 8, 64), MAT.neon);
  rim.rotation.x = Math.PI/2; rim.position.set(BOWL.x, BOWL.h, BOWL.z); scene.add(rim);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0xffd400, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 }));
  pad.rotation.x = -Math.PI/2; pad.position.set(BOWL.x, 0.06, BOWL.z); scene.add(pad);
  // Access ramp
  const ar = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 50), MAT.ramp);
  ar.position.set(BOWL.x, 8, BOWL.z + BOWL.r*0.75);
  ar.rotation.x = -Math.atan2(16, 50); scene.add(ar);
})();

// ============ RANDOM RAMPS all over ============
const RAMPS = [
  { x: 0, z: -200, rot: Math.PI/2, w: 16, d: 40, h: 7 },
  { x: 0, z: 200, rot: -Math.PI/2, w: 16, d: 40, h: 7 },
  { x: -200, z: 0, rot: 0, w: 16, d: 40, h: 7 },
  { x: 200, z: 0, rot: Math.PI, w: 16, d: 40, h: 7 },
  { x: 400, z: -400, rot: Math.PI/2, w: 14, d: 36, h: 6 },
  { x: -400, z: 400, rot: 0, w: 14, d: 36, h: 6 },
  { x: 500, z: -500, rot: Math.PI, w: 14, d: 36, h: 6 },
  { x: -500, z: -500, rot: -Math.PI/2, w: 14, d: 36, h: 6 },
  { x: 300, z: 300, rot: Math.PI/4, w: 12, d: 32, h: 5 },
  { x: -300, z: -300, rot: -Math.PI/4, w: 12, d: 32, h: 5 }
];
for (const r of RAMPS) {
  r._c = Math.cos(r.rot); r._s = Math.sin(r.rot);
  r._slope = r.h/r.d; r._ax = Math.sin(r.rot); r._az = Math.cos(r.rot);
  const ang = Math.atan2(r.h, r.d), len = Math.hypot(r.h, r.d);
  const g = new THREE.Group();
  g.position.set(r.x, 0, r.z); g.rotation.y = r.rot;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.6, len), MAT.ramp);
  plate.rotation.x = -ang; plate.position.y = r.h/2;
  plate.castShadow = settings.shadows; plate.receiveShadow = settings.shadows;
  g.add(plate);
  // Side rails
  for (const sgn of [-1,1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, len), new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.8 }));
    rail.rotation.x = -ang;
    rail.position.set(sgn * r.w/2, r.h/2 + 0.6, 0);
    g.add(rail);
  }
  scene.add(g);
}

// Street lamps around city
(function lamps() {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.5, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x333338, emissive: 0xffe6b0, emissiveIntensity: 0.8 });
  for (let i = -700; i <= 700; i += 100) {
    for (let j = -700; j <= 700; j += 100) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 10, 6), poleMat);
      pole.position.set(i + 20, 5, j); scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), headMat);
      head.position.set(i + 20, 10.5, j); scene.add(head);
    }
  }
})();

function rampAt(x, z) {
  for (const r of RAMPS) {
    const dx = x - r.x, dz = z - r.z;
    const lx = r._c*dx - r._s*dz;
    const lz = r._s*dx + r._c*dz;
    if (Math.abs(lx) <= r.w/2 && Math.abs(lz) <= r.d/2) return { ramp: r, lx, lz };
  }
  return null;
}
function groundHeightAt(x, z) {
  const hit = rampAt(x, z);
  if (hit) { const t = (hit.lz + hit.ramp.d/2) / hit.ramp.d; return t * hit.ramp.h; }
  return 0;
}
function hitsBuilding(x, z, radius = 2) {
  for (const b of BUILDINGS) {
    if (Math.abs(x - b.x) < b.w/2 + radius && Math.abs(z - b.z) < b.d/2 + radius) return true;
  }
  return false;
}