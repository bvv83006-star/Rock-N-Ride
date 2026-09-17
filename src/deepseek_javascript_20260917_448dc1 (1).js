import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const MODEL_FLIP = Math.PI;

export const CAR_CLASSES = [
  {id:'sedan',   name:'SEDAN',    cost:0,    speed:65,  accel:26, grip:1.04, model:'/models/sedan.glb',   ability:'none',       abilityName:'NONE'},
  {id:'taxi',    name:'TAXI',     cost:80,   speed:70,  accel:28, grip:1.06, model:'/models/taxi.glb',    ability:'teleport',   abilityName:'TELEPORT'},
  {id:'sports',  name:'SPORTS',   cost:150,  speed:82,  accel:38, grip:1.14, model:'/models/sports.glb',  ability:'nitrofill',  abilityName:'NITRO FILL'},
  {id:'suv',     name:'SUV',      cost:220,  speed:70,  accel:28, grip:1.18, model:'/models/suv.glb',     ability:'offroad',    abilityName:'OFF-ROAD'},
  {id:'muscle',  name:'MUSCLE',   cost:300,  speed:88,  accel:45, grip:0.98, model:'/models/muscle.glb',  ability:'burnout',    abilityName:'BURNOUT'},
  {id:'police',  name:'POLICE',   cost:450,  speed:92,  accel:48, grip:1.20, model:'/models/police.glb',  ability:'siren',      abilityName:'SIREN'},
  {id:'rally',   name:'RALLY',    cost:600,  speed:90,  accel:44, grip:1.24, model:'/models/rally.glb',   ability:'powerslide', abilityName:'POWERSLIDE'},
  {id:'race',    name:'RACE CAR', cost:800,  speed:105, accel:55, grip:1.28, model:'/models/race.glb',    ability:'driftgod',   abilityName:'DRIFT GOD'},
  {id:'super',   name:'SUPERCAR', cost:1500, speed:125, accel:60, grip:1.32, model:'/models/super.glb',   ability:'hyper',      abilityName:'HYPERSPEED'},
  {id:'hyper',   name:'HYPERCAR', cost:2500, speed:139, accel:75, grip:1.36, model:'/models/hyper.glb',   ability:'afterburner',abilityName:'AFTERBURNER'}
];

export function getCarClass(id){
  return CAR_CLASSES.find(c => c.id === id) || CAR_CLASSES[0];
}

const modelCache = {};
let loadedCount = 0;

export function preloadAllCars(onProgress){
  return Promise.all(CAR_CLASSES.map(c => new Promise(resolve => {
    try {
      loader.load(c.model,
        (gltf) => {
          try {
            const scene = gltf.scene;
            const box = new THREE.Box3().setFromObject(scene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const scale = 4.5 / Math.max(size.x, size.z, 0.1);
            scene.scale.setScalar(scale);
            const box2 = new THREE.Box3().setFromObject(scene);
            scene.position.y -= box2.min.y;
            scene.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
            modelCache[c.id] = scene;
          } catch(e){}
          loadedCount++;
          if(onProgress) onProgress(loadedCount, CAR_CLASSES.length);
          resolve();
        },
        undefined,
        () => { loadedCount++; if(onProgress) onProgress(loadedCount, CAR_CLASSES.length); resolve(); }
      );
    } catch(e) {
      loadedCount++;
      if(onProgress) onProgress(loadedCount, CAR_CLASSES.length);
      resolve();
    }
  })));
}

function makeFallbackBox(colorHex){
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.8, 4.5),
    new THREE.MeshStandardMaterial({color: colorHex, metalness: 0.7, roughness: 0.3})
  );
  body.position.y = 0.5; body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.55, 2),
    new THREE.MeshStandardMaterial({color: 0x111820, metalness: 0.4, roughness: 0.15})
  );
  cabin.position.set(0, 1.15, 0.2);
  g.add(cabin);
  g.userData.wheels = [];
  g.userData.bodyMaterial = body.material;
  return g;
}

export function makeCar(classId, colorHex, opts = {}){
  const cls = getCarClass(classId);
  const template = modelCache[cls.id];
  const outer = new THREE.Group();
  outer.userData.classId = cls.id;
  outer.userData.wheels = [];

  if(!template){
    const fb = makeFallbackBox(colorHex);
    outer.add(fb);
    outer.userData.bodyMaterial = fb.userData.bodyMaterial;
    return outer;
  }

  let model;
  try { model = template.clone(true); }
  catch(e) {
    const fb = makeFallbackBox(colorHex);
    outer.add(fb);
    outer.userData.bodyMaterial = fb.userData.bodyMaterial;
    return outer;
  }

  model.rotation.y = MODEL_FLIP;
  outer.add(model);

  try {
    let biggestMesh = null, biggestVol = 0;
    model.traverse(o => {
      if(o.isMesh){
        const b = new THREE.Box3().setFromObject(o);
        const s = new THREE.Vector3();
        b.getSize(s);
        const vol = s.x * s.y * s.z;
        if(vol > biggestVol){ biggestVol = vol; biggestMesh = o; }
      }
    });
    if(biggestMesh && biggestMesh.material){
      biggestMesh.material = biggestMesh.material.clone();
      biggestMesh.material.color.setHex(colorHex);
      outer.userData.bodyMaterial = biggestMesh.material;
    }
  } catch(e){}

  if(opts.headlight){
    try {
      const spot = new THREE.SpotLight(0xfff0d0, 8, 40, 0.5, 0.6, 1.2);
      spot.position.set(0, 1, -2);
      spot.target.position.set(0, 0, -20);
      outer.add(spot, spot.target);
    } catch(e){}
  }
  return outer;
}

export function randomClassId(){
  const r = Math.random();
  if(r < 0.30) return 'sedan';
  if(r < 0.50) return 'taxi';
  if(r < 0.65) return 'sports';
  if(r < 0.78) return 'suv';
  if(r < 0.88) return 'muscle';
  if(r < 0.94) return 'police';
  if(r < 0.98) return 'rally';
  return 'race';
}

export const TRAFFIC_COLORS = [
  0xdd3322, 0x2c7cff, 0xffbf35, 0x38f7c0, 0xffffff,
  0x222222, 0x8833cc, 0xff6a3a, 0x4a90d9, 0xcc2244,
  0x00d9ff, 0xff1493, 0x39ff14, 0xffa500, 0x8b4513
];

export function randomColor(){
  return TRAFFIC_COLORS[Math.floor(Math.random()*TRAFFIC_COLORS.length)];
}