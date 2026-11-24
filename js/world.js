import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { LOCATIONS } from "./config.js?v=r15.1";
import { isMobileClient } from "./device.js?v=r15.1";
import { tickActor, tickStaticNpc } from "./actors.js?v=r15.1";
import { tickNpc, bindNpc, disposeMixer } from "./npcWander.js?v=r15.1";

export function makeLoader(renderer) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const ktx2 = new KTX2Loader()
    .setTranscoderPath(new URL("../vendor/three/addons/libs/basis/", import.meta.url).href);
  ktx2.detectSupport(renderer);
  loader.setKTX2Loader(ktx2);
  return loader;
}

function loadGLB(loader, url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}
function loadTex(loader, url, srgb = false, wrap = true) {
  return new Promise((resolve, reject) => {
    loader.load(url, (t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
      if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      t.anisotropy = 1;
      resolve(t);
    }, undefined, reject);
  });
}
function boxOf(o) { return new THREE.Box3().setFromObject(o); }
function sizeOf(o) { const s = new THREE.Vector3(); boxOf(o).getSize(s); return s; }
export function fitHeight(obj, height, alignBottom = true) {
  const s = sizeOf(obj);
  if (s.y < 1e-6) return obj;
  obj.scale.multiplyScalar(height / s.y);
  if (alignBottom) {
    obj.updateMatrixWorld(true);
    obj.position.y += -boxOf(obj).min.y;
  }
  return obj;
}

export { makePerson, tickActor, tickStaticNpc } from "./actors.js?v=r15.1";

export function makeDog(color = 0x3b322c) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.7), mat);
  body.position.y = 0.32;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.26), mat);
  head.position.set(0, 0.42, 0.42);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.22), mat);
  tail.position.set(0, 0.4, -0.42);
  g.add(body, head, tail);
  for (const x of [-0.1, 0.1]) for (const z of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), mat);
    leg.position.set(x, 0.11, z);
    g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

function labelSprite(text) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(10,13,18,0.7)";
  ctx.fillRect(20, 16, 216, 36);
  ctx.strokeStyle = "#e8eef4";
  ctx.strokeRect(20, 16, 216, 36);
  ctx.fillStyle = "#e8eef4";
  ctx.font = "22px monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1.4, 0.35, 1);
  spr.position.y = 1.95;
  return spr;
}

export class World {
  constructor() {
    this.colliders = [];
    this.loot = [];
    this.npcs = [];
    this.fires = [];
    this.interactives = [];
    this.particles = null;
    this.lights = {};
    this.props = {};
    this.farProps = [];
    this.audio = null;
    this.bounds = { minX: -11, maxX: 11, minZ: -96, maxZ: 16 };
    this.locations = { ...LOCATIONS };
  }

  setLocations(map) {
    if (map && typeof map === "object") this.locations = map;
  }

  async ensureWeapon(id) {
    if (!id) return null;
    this.gunModels = this.gunModels || {};
    if (this.gunModels[id]) return this.gunModels[id];
    if (!this.tryGLB) return null;
    const gltf = await this.tryGLB(`./assets/weapons/${id}.glb`);
    if (gltf && (gltf.scene || gltf)) {
      this.gunModels[id] = gltf.scene || gltf;
      return this.gunModels[id];
    }
    return null;
  }

  async ensureZombie() {
    if (this.zombieGltf) return this.zombieGltf;
    if (!this.tryGLB) return null;
    const g = await this.tryGLB("./assets/quaternius/zombie.glb");
    this.zombieGltf = g;
    return g;
  }

  async build(scene, renderer, story) {
    if (this._built) return this;
    this.scene = scene;
    const gltf = makeLoader(renderer);
    const texL = new THREE.TextureLoader();
    const mobile = isMobileClient();
    const pbr = async (name) => {
      const b = `./assets/polyhaven/${name}/${name}`;
      if (mobile) {
        // Albedo-only 512px JPGs — skip 1k normal / roughness / ARM on phones.
        try {
          const diff = await loadTex(texL, `${b}_diff_512.jpg`, true);
          return { diff, nor: null, rough: null };
        } catch (e) {
          const diff = await loadTex(texL, `${b}_diff_1k.jpg`, true);
          return { diff, nor: null, rough: null };
        }
      }
      const [diff, nor, rough] = await Promise.all([
        loadTex(texL, `${b}_diff_1k.jpg`, true),
        loadTex(texL, `${b}_nor_1k.jpg`, false),
        loadTex(texL, `${b}_rough_1k.jpg`, false),
      ]);
      return { diff, nor, rough };
    };
    const tryGLB = async (url) => {
      try { return await loadGLB(gltf, url); } catch (e) { console.warn("glb fail", url, e); return null; }
    };

    const [snow, road, brick, rust, concrete, corr, rustc, dirt, sedanG, roadDry] = await Promise.all([
      pbr("snow_02"),
      pbr("asphalt_snow"),
      pbr("red_brick"),
      pbr("rusty_metal"),
      pbr("dirty_concrete"),
      pbr("rusty_corrugated_iron"),
      pbr("rust_coarse_01"),
      pbr("dirt"),
      tryGLB("./assets/tevy/wrecked-sedan-lod1.glb"),
      pbr("road_damaged").catch(() => null),
    ]);
    this.mats = { snow, road, brick, rust, concrete, corr, rustc, dirt };
    this.zombieGltf = null;
    this.gunModels = this.gunModels || {};
    const knifeG = await tryGLB("./assets/weapons/knife.glb");
    if (knifeG && (knifeG.scene || knifeG)) this.gunModels.knife = knifeG.scene || knifeG;
    this._weaponIds = ["pistol","ar15","service_rifle","pump_shotgun","deer_rifle","knife","pipe","baseball_bat","crowbar","fire_axe","molotov","torch","flashlight"];
    this._built = true;

    // Ground + road
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 140),
      new THREE.MeshStandardMaterial({
        map: snow.diff, ...(snow.nor ? { normalMap: snow.nor } : {}), ...(snow.rough ? { roughnessMap: snow.rough } : {}), roughness: 0.85, color: 0xd8e2ec,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -40);
    snow.diff.repeat.set(18, 30);
    if (snow.nor) snow.nor.repeat.set(18, 30);
    if (snow.rough) snow.rough.repeat.set(18, 30);
    ground.receiveShadow = true;
    // Sits just under the level floor tiles (no z-fight); only the horizon beyond the level shows it.
    ground.position.y = -0.05;
    ground.scale.set(3, 2.2, 1);
    scene.add(ground);
    this._ground = ground;

    const roadMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 120),
      new THREE.MeshStandardMaterial({
        map: road.diff, ...(road.nor ? { normalMap: road.nor } : {}), ...(road.rough ? { roughnessMap: road.rough } : {}), roughness: 0.95, color: 0xc5cdd4,
      })
    );
    road.diff.repeat.set(2, 22);
    if (road.nor) road.nor.repeat.set(2, 22);
    if (road.rough) road.rough.repeat.set(2, 22);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.02, -40);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);
    this._roadMesh = roadMesh;
    // Seasonal ground sets (Rev 2): dry dirt / asphalt for Ch1–7, snow only where snowCover > 0.
    const rep = (t, x, y) => { if (!t) return null; const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
    this._groundSets = {
      snow: { map: snow.diff, normalMap: snow.nor || null, roughnessMap: snow.rough || null, color: 0xd8e2ec },
      dry: { map: rep(dirt.diff, 54, 66), normalMap: rep(dirt.nor, 54, 66), roughnessMap: rep(dirt.rough, 54, 66), color: 0xc9a87c },
      roadSnow: { map: road.diff, normalMap: road.nor || null, roughnessMap: road.rough || null, color: 0xc5cdd4 },
      roadDry: roadDry ? { map: rep(roadDry.diff, 2, 22), normalMap: rep(roadDry.nor, 2, 22), roughnessMap: rep(roadDry.rough, 2, 22), color: 0xb8ada0 } : null,
    };

    // Lighting
    const amb = new THREE.AmbientLight(0xb8c4d4, 0.35);
    const hemi = new THREE.HemisphereLight(0xc9d6e6, 0x3a4038, 0.45);
    const sun = new THREE.DirectionalLight(0xe8eef6, 1.15);
    sun.position.set(18, 28, 8);
    sun.castShadow = renderer.shadowMap.enabled && !mobile;
    sun.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 110;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.0009;
    scene.add(amb, hemi, sun, sun.target);
    sun.target.position.set(0, 0, -40);
    this.lights = { amb, hemi, sun };

    const flash = new THREE.SpotLight(0xdce8f4, 0, 22, Math.PI / 7, 0.4, 1.15);
    flash.castShadow = false;
    scene.add(flash, flash.target);
    this.lights.flash = flash;

    this.pbr = pbr;
    this.tryGLB = tryGLB;
    this.gltf = gltf;
    this.prefabs = {};
    this.pbrCache = { snow_02: snow, asphalt_snow: road, red_brick: brick, rusty_metal: rust, dirty_concrete: concrete, rusty_corrugated_iron: corr, rust_coarse_01: rustc, dirt, road_damaged: roadDry || road };
    this.levelGroup = new THREE.Group();
    this.levelGroup.name = "level";
    scene.add(this.levelGroup);
    this.blocksAirLOS = () => false;
    this.inBlindSpot = () => false;

    if (!this._skipPlaceholder) {
    // Buildings along the street (fallback if no chapter level is loaded)
    const bNames = ["building-a", "building-c", "building-d", "building-e", "building-f", "building-h", "building-k", "building-m", "building-s"];
    const blds = {};
    await Promise.all(bNames.map(async (n) => {
      const g = await tryGLB(`./assets/kenney/industrial/${n}.glb`);
      if (g) blds[n] = g.scene;
    }));
    const placeB = (name, x, z, h = 9, rot = 0) => {
      const src = blds[name];
      if (!src) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(6, h, 8),
          new THREE.MeshStandardMaterial({ map: brick.diff, color: 0x8a9098, roughness: 0.9 })
        );
        box.position.set(x, h / 2, z);
        box.castShadow = true;
        scene.add(box);
        this.farProps.push(box);
        this.colliders.push({ minX: x - 3.2, maxX: x + 3.2, minZ: z - 4.2, maxZ: z + 4.2 });
        return box;
      }
      const obj = src.clone(true);
      fitHeight(obj, h);
      obj.position.set(x, 0, z);
      obj.rotation.y = rot;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);
      this.farProps.push(obj);
      obj.updateMatrixWorld(true);
      const b = boxOf(obj);
      this.colliders.push({ minX: b.min.x + 0.15, maxX: b.max.x - 0.15, minZ: b.min.z + 0.15, maxZ: b.max.z - 0.15 });
      return obj;
    };

    // Left side (negative X) — facades outside the curb (~±5.5)
    const left = [
      ["building-h", -9.2, 8, 10],
      ["building-a", -9.4, -4, 9],
      ["building-c", -9.6, -28, 11], // pharmacy block
      ["building-k", -9.8, -50, 10],
      ["building-m", -10.0, -72, 12],
    ];
    const right = [
      ["building-d", 9.2, 4, 9],
      ["building-f", 9.5, -16, 10],
      ["building-s", 9.3, -38, 7], // lou near
      ["building-e", 9.8, -60, 11],
      ["building-h", 9.6, -80, 10],
    ];
    for (const [n, x, z, h] of left) placeB(n, x, z, h, Math.PI / 2);
    for (const [n, x, z, h] of right) placeB(n, x, z, h, -Math.PI / 2);

    // Props
    const addProp = async (url, x, z, h, rot = 0) => {
      const g = await tryGLB(url);
      if (!g) return null;
      const o = g.scene;
      fitHeight(o, h);
      o.position.set(x, 0, z);
      o.rotation.y = rot;
      const big = h >= 3;
      o.traverse((m) => { if (m.isMesh) { m.castShadow = big; m.receiveShadow = true; } });
      scene.add(o);
      this.farProps.push(o);
      return o;
    };
    await addProp("./assets/kenney/industrial/chimney-large.glb", -10, -8, 14);
    await addProp("./assets/kenney/industrial/water-tower.glb", 2.2, -84, 14);
    await addProp("./assets/kenney/industrial/detail-tank-large.glb", -3.4, -86, 6, 0.2);
    await addProp("./assets/kenney/industrial/shipping-container-a.glb", -5.6, -46, 2.4, 0.1);
    await addProp("./assets/kenney/industrial/shipping-container-b.glb", 5.8, -22, 2.4, -0.2);
    await addProp("./assets/kenney/roads/electricity-pole.glb", -5.1, 2, 8);
    await addProp("./assets/kenney/roads/electricity-pole.glb", 5.1, -14, 8);
    await addProp("./assets/kenney/roads/electricity-pole.glb", -5.1, -34, 8);
    await addProp("./assets/kenney/roads/electricity-pole.glb", 5.1, -64, 8);
    await addProp("./assets/kenney/roads/construction-barrier.glb", -1.6, -56, 1.1, 0.1);
    await addProp("./assets/kenney/roads/construction-barrier.glb", 1.8, -57, 1.1, -0.2);
    await addProp("./assets/kenney/roads/construction-fence.glb", 4.4, -56, 1.6, 0.1);
    await addProp("./assets/kenney/roads/dumpster.glb", -4.8, -17, 1.4, 0.4);
    await addProp("./assets/kenney/roads/dumpster.glb", 4.6, -7, 1.4, -0.3);
    await addProp("./assets/kenney/roads/road-sign-stop.glb", 4.2, -0.5, 2.4);
    await addProp("./assets/kenney/roads/road-sign-warning.glb", -4.2, -54, 2.6);
    await addProp("./assets/kenney/roads/construction-cone.glb", 2.4, -55.2, 0.7);
    await addProp("./assets/kenney/roads/light-square.glb", 5.0, 10, 5.5);

    if (sedanG) {
      const car = sedanG.scene;
      fitHeight(car, 1.45);
      car.position.set(-1.8, 0, -10);
      car.rotation.y = 0.5;
      car.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(car);
      this.props.sedan = car;
      const b = boxOf(car);
      this.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z });
    }
    // second wreck at blockade
    if (sedanG) {
      const car2 = sedanG.scene.clone(true);
      fitHeight(car2, 1.45);
      car2.position.set(1.6, 0, -59);
      car2.rotation.y = -1.1;
      car2.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
      scene.add(car2);
    }

    // Home stoop / campfire
    this._addFire(scene, -2.2, 8.5, "home");
    this._addFire(scene, 6.2, -37, "lou");

    // Low walls at map ends
    const endWall = (z) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(24, 8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x6a727a, roughness: 0.95 })
      );
      m.position.set(0, 4, z);
      scene.add(m);
      this.colliders.push({ minX: -12, maxX: 12, minZ: z - 0.8, maxZ: z + 0.8 });
    };
    endWall(15.5);
    endWall(-94);

    // Unlit Points snow removed — Lumen pipeline owns lit GPU snow/ash.
    this.particles = null;
    this._pCount = 0;

    // Loot spots
    this.loot = [
      { id: "dump_pharm", x: -4.6, z: -17, r: 1.6, items: { cloth: 2, scrap: 1, insulin: 0, note: 1 }, note: "note_wren", label: "Dumpster", taken: false },
      { id: "crate_yard", x: -5.4, z: -46, r: 1.8, items: { radio_crystal: 1, scrap: 3, ammo_shell: 3, cloth: 1 }, label: "Yard crate", taken: false },
      { id: "dump_home", x: 4.5, z: -7, r: 1.6, items: { wood: 3, cloth: 2, ration: 1, fuel: 1 }, label: "Dumpster", taken: false },
      { id: "blockade_fuel", x: 2.2, z: -58.5, r: 1.8, items: { fuel: 2, ammo_9mm: 8, pistol: 1, scrap: 2 }, label: "Burned sedan", taken: false },
      { id: "bus_battery", x: -7.4, z: -48.5, r: 1.8, items: { start_battery: 1, wire: 2, ammo_shell: 2 }, label: "Bus battery", taken: false },
      { id: "pharm_back", x: -6.6, z: -19.5, r: 1.5, items: { insulin: 1, bandage: 2, cool_pack: 1, ration: 1 }, label: "Pharmacy fridge", taken: false, flag: "wren_dealt" },
      { id: "dam_filter", x: -3.2, z: -85, r: 1.6, items: { filter: 2, scrap: 2 }, label: "Intake locker", taken: false },
      { id: "dock_crate", x: 7.2, z: -67, r: 1.6, items: { ration: 2, cloth: 2, wood: 2 }, label: "Dock crate", taken: false },
    ];
    for (const L of this.loot) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1, emissive: 0x1a1408, emissiveIntensity: 0.3 })
      );
      marker.position.set(L.x, 0.28, L.z);
      scene.add(marker);
      L.mesh = marker;
    }

    // Dam console interactive
    const consoleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x2a3036, emissive: 0x1a3a28, emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.5 })
    );
    consoleMesh.position.set(0.4, 0.7, -83.6);
    scene.add(consoleMesh);
    this.interactives.push({
      id: "dam_console", type: "console", x: 0.4, z: -83.6, r: 2.0, label: "Black-start panel",
    });

    // NPCs from story + placements
    this._placeNpcs(scene, story);
    } // end placeholder street

    return this;
  }

  bindPipeline(pipeline) {
    this.pipeline = pipeline || null;
    // The pipeline owns the flashlight. A leftover intensity-0 SpotLight is
    // still a scene light (every lit fragment loops over it).
    if (this.pipeline && this.lights?.flash) {
      try { this.lights.flash.target?.removeFromParent?.(); } catch {}
      try { this.lights.flash.removeFromParent?.(); } catch {}
      try { this.lights.flash.dispose?.(); } catch {}
      this.lights.flash = null;
    }
    for (const f of this.fires) this.stripHostFireLight(f);
  }

  stripHostFireLight(f) {
    if (!f) return;
    if (f.light) {
      try { f.light.removeFromParent?.(); } catch {}
      try { f.light.dispose?.(); } catch {}
      f.light = null;
    }
    if (f.flame) f.flame.visible = false;
  }

  clearLevel() {
    const g = this.levelGroup;
    for (const f of this.fires) {
      try { f.sfx?.stop?.(); } catch {}
      if (f.lumen && this.pipeline?.removeCampfire) {
        try { this.pipeline.removeCampfire(f.lumen); } catch {}
      }
      f.lumen = null;
      this.stripHostFireLight(f);
      if (f.flame?.parent) f.flame.parent.remove(f.flame);
      if (f.logs?.parent) f.logs.parent.remove(f.logs);
      disposeMesh(f.flame, this.pbrCache);
      disposeMesh(f.logs, this.pbrCache);
    }
    for (const n of this.npcs || []) disposeMixer(n.mesh);
    if (g) {
      g.traverse((o) => disposeMesh(o, this.pbrCache));
      const kids = [...g.children];
      for (const c of kids) g.remove(c);
    }
    this.fires = [];
    this.loot = [];
    this.npcs = [];
    this.interactives = [];
    this.colliders = [];
    this.farProps = [];
  }

  _placeNpcs(scene, story) {
    const places = {
      theo: { x: -1.1, z: 10.2, color: 0x4a5560, hood: 0x2a3038 },
      marguerite: { x: -3.8, z: 7.2, color: 0x5a4638, hood: 0x3a2e26 },
      ray: { x: 3.6, z: 6.4, color: 0x3e4a3a, hood: 0x2a3228 },
      wren: { x: -6.4, z: -18.4, color: 0x3a3a48, hood: 0x1c1c24 },
      lou: { x: 6.6, z: -37.2, color: 0x4a4a40, hood: 0x2c2c28 },
      hank: { x: 7.2, z: -39.0, color: 0x4a4038, hood: 0x2a2420 },
      strand: { x: 6.8, z: -66.5, color: 0x3a4450, hood: 0x1c242c },
      bea: { x: 7.6, z: -69.2, color: 0x5a3a38, hood: 0x3a2424 },
      jory: { x: -2.4, z: -57.4, color: 0x3a3f34, hood: 0x22261e },
      cody: { x: -3.2, z: -56.2, color: 0x4a4038, hood: 0x2a2420 },
      ames: { x: -6.8, z: -8.2, color: 0x4a4e55, hood: 0x2a2e34 },
      cpl_haas: { x: 1.6, z: -27.5, color: 0x3a4450, hood: 0x1a2028 },
      haas: { x: 1.6, z: -27.5, color: 0x3a4450, hood: 0x1a2028 },
      ruiz: { x: 2.4, z: -60.0, color: 0x3a4038, hood: 0x1c1c18 },
      dam_console: null,
    };
    const list = [];
    const seen = new Set();
    const push = (n) => { if (n && n.id && !seen.has(n.id) && places[n.id]) { seen.add(n.id); list.push(n); } };
    if (story) {
      for (const n of story.npcs || []) push(n);
      for (const n of story.minor || []) push(n);
    }
    if (!list.length) {
      for (const id of Object.keys(places)) if (id !== "dam_console") push({ id, name: id });
    }
    for (const npc of list) {
      const p = places[npc.id];
      if (!p) continue;
      const g = makePerson({ id: npc.id, color: p.color, hood: p.hood });
      g.position.set(p.x, 0, p.z);
      const name = npc.name || npc.id;
      g.add(labelSprite(name.toUpperCase()));
      scene.add(g);
      this.npcs.push({
        id: npc.id,
        name,
        x: p.x, z: p.z, y: 0,
        mesh: g,
        r: 2.0,
        data: npc,
        alive: true,
      });
    }
    // ensure dam_console can be talked to even without a body (handled as interactive)
    this.npcs.push({
      id: "dam_console", name: "Thomson panel", x: 0.4, z: -83.6, y: 0, mesh: null, r: 2.1, data: { id: "dam_console", name: "Thomson panel" }, alive: true, hidden: true,
    });
  }

  _addFire(scene, x, z, id) {
    // When the Lumen pipeline is attached it owns campfire lighting (a fixed
    // 2-light pool). A host PointLight, even at intensity 0, still changes
    // the scene light count and recompiles every material.
    let glow = null;
    if (!this.pipeline) {
      glow = new THREE.PointLight(0xff8844, 2.2, 8.5, 1.6);
      glow.position.set(x, 0.7, z);
      scene.add(glow);
    }
    const logs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0x331408, emissiveIntensity: 0.6 })
    );
    logs.position.set(x, 0.15, z);
    scene.add(logs);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa55, transparent: true, opacity: 0.85 })
    );
    flame.position.set(x, 0.5, z);
    scene.add(flame);
    const rec = { id, x, z, r: 3.4, light: glow, flame, logs, on: true, sfx: null };
    this.fires.push(rec);
    this._attachFireSfx(rec);
  }

  addCampfire(scene, x, z) {
    this._addFire(scene, x, z, "crafted_" + this.fires.length);
    const last = this.fires[this.fires.length - 1];
    if (last && this.pipeline?.addCampfire) {
      try { last.lumen = this.pipeline.addCampfire([last.x, 0.02, last.z]); } catch {}
      this.stripHostFireLight(last);
    }
    return last;
  }

  bindAudio(audio) {
    this.audio = audio;
    for (const f of this.fires) this._attachFireSfx(f);
  }

  _attachFireSfx(f) {
    const A = this.audio?.impl?.engine || this.audio?.impl?.a || (typeof window !== "undefined" ? window.GameAudio : null);
    if (!A || typeof A.emitter !== "function" || f.sfx) return;
    try {
      f.sfx = A.emitter({ x: f.x, y: 0.5, z: f.z }, { refDistance: 1.5, maxDistance: 18 });
      f.sfx.loop("amb_fire");
    } catch (err) { console.warn("[world] fire sfx", err); }
  }

  cull(cam, dist = 42) {
    const x = cam.position.x, z = cam.position.z;
    const d2 = dist * dist;
    for (const o of this.farProps) {
      if (!o || !o.position) continue;
      const dx = o.position.x - x, dz = o.position.z - z;
      o.visible = (dx * dx + dz * dz) < d2;
    }
  }

  /** Rev 2: bind Lumen's active preset + the level environment (season, snowCover). */
  setEnvironment(cfg, levelEnv = {}) {
    this.envCfg = cfg || null;
    this.levelEnv = levelEnv || {};
    const hints = (cfg && cfg.sceneHints) || {};
    const cover = Number(levelEnv.snowCover);
    this.snowy = Number.isFinite(cover) ? cover > 0 : !!hints.snow;
    this.season = (cfg && cfg.id) || levelEnv.season || null;
    const G = this._groundSets;
    const apply = (mesh, set, tint) => {
      if (!mesh || !set) return;
      const m = mesh.material;
      m.map = set.map || null; m.normalMap = set.normalMap || null; m.roughnessMap = set.roughnessMap || null;
      m.color.set(tint != null ? tint : set.color);
      m.needsUpdate = true;
    };
    if (G) {
      apply(this._ground, this.snowy ? G.snow : G.dry, this.snowy ? null : (hints.ground ?? null));
      apply(this._roadMesh, this.snowy ? G.roadSnow : (G.roadDry || G.roadSnow), this.snowy ? null : 0xb8ada0);
    }
    // Cartographer: falling snow only where snowCover > 0 (Ch1–2 dry, zero snow).
    if (this.particles) this.particles.visible = this.snowy;
    // Level grids bring their own roads; the boot strip would z-fight them.
    if (this._roadMesh) this._roadMesh.visible = !this._levelLoaded;
    this._c1 = this._c1 || new THREE.Color();
    this._c2 = this._c2 || new THREE.Color();
    this._c3 = this._c3 || new THREE.Color();
    return this.snowy;
  }

  setSky(timeOfDay, blizzard) {
    if (this.envCfg) return this._setSkyEnv(timeOfDay, blizzard);
    // 0 night, 0.25 dawn, 0.5 noon, 0.75 dusk, 1 night
    const t = timeOfDay;
    const day = Math.max(0, Math.cos((t - 0.5) * Math.PI * 2) * 0.5 + 0.5);
    const night = 1 - day;
    const sun = this.lights.sun;
    const amb = this.lights.amb;
    const hemi = this.lights.hemi;
    const ang = (t - 0.25) * Math.PI * 2;
    sun.position.set(Math.cos(ang) * 28, Math.max(2.5, Math.sin(ang) * 30), 10);
    sun.intensity = 0.15 + day * 1.1 * (blizzard ? 0.45 : 1);
    sun.color.set(night > 0.7 ? 0x8899bb : 0xe8eef6);
    amb.intensity = 0.12 + day * 0.28;
    hemi.intensity = 0.18 + day * 0.32;
    hemi.color.set(blizzard ? 0x9aa8b8 : (night > 0.6 ? 0x4a5870 : 0xc9d6e6));
    const fogCol = blizzard
      ? new THREE.Color().setHSL(0.6, 0.05, 0.35 + day * 0.2)
      : new THREE.Color().setHSL(0.6, 0.08, 0.12 + day * 0.42);
    this.scene.background = fogCol.clone();
    if (this.scene.fog) {
      this.scene.fog.color.copy(fogCol);
      this.scene.fog.near = blizzard ? 3 : 8;
      this.scene.fog.far = blizzard ? 18 : (night > 0.6 ? 32 : 55);
    }
    if (this.particles) {
      this.particles.material.opacity = blizzard ? 0.95 : 0.55;
      this.particles.material.size = blizzard ? 0.11 : 0.06;
      this.particles.material.color.set(blizzard && night > 0.4 ? 0xb0b4ba : 0xe8eef4);
    }
    return { day, night, blizzard };
  }

  _setSkyEnv(t, blizzard) {
    const E = this.envCfg;
    const winter = E.id === "fallout_winter";
    const bz = !!blizzard && winter; // blizzards only exist in nuclear winter
    const day = Math.max(0, Math.cos((t - 0.5) * Math.PI * 2) * 0.5 + 0.5);
    const night = 1 - day;
    const sun = this.lights.sun, amb = this.lights.amb, hemi = this.lights.hemi;
    const ang = (t - 0.25) * Math.PI * 2;
    sun.position.set(Math.cos(ang) * 28, Math.max(2.5, Math.sin(ang) * 30), 10);
    sun.intensity = (E.sun?.intensity ?? 1.2) * (0.1 + day * 0.9) * (bz ? 0.45 : 1);
    sun.color.set(E.sun?.color ?? 0xe8eef6);
    if (night > 0.7) sun.color.lerp(this._c1.set(0x8899bb), 0.7);
    amb.color.set(E.ambient?.color ?? 0xb8c4d4);
    amb.intensity = (E.ambient?.intensity ?? 0.35) * (0.28 + day * 0.72);
    hemi.color.set(E.hemi?.sky ?? 0xc9d6e6);
    if (hemi.groundColor) hemi.groundColor.set(E.hemi?.ground ?? 0x3a4038);
    hemi.intensity = (E.hemi?.intensity ?? 0.45) * (0.3 + day * 0.7);
    const fog = this._c2.set(E.fog?.color ?? 0x9aa8b8);
    const sky = this._c3.set(E.sky?.color ?? 0x9aa8b8).lerp(fog, 0.45);
    if (bz) sky.lerp(this._c1.set(0x8a9098), 0.6);
    sky.lerp(this._c1.set(0x070a10), night * 0.88);
    fog.lerp(this._c1.set(0x070a10), night * 0.85);
    if (!this.scene.background || !this.scene.background.isColor) this.scene.background = new THREE.Color();
    this.scene.background.copy(sky);
    if (this.scene.fog) {
      this.scene.fog.color.copy(fog);
      const far = E.fog?.maxDist ?? 55;
      this.scene.fog.near = bz ? 3 : (E.fog?.start ?? 8) * (night > 0.6 ? 0.6 : 1);
      this.scene.fog.far = bz ? 18 : far * (night > 0.6 ? 0.6 : 1);
    }
    return { day, night, blizzard: bz };
  }

  updateParticles(dt, cam, blizzard) {
    if (!this.particles) return;
    if (this.particles.visible === false) { this._tickFires(); return; }
    const pos = this.particles.geometry.attributes.position;
    const arr = pos.array;
    const speed = blizzard ? 9 : 2.8;
    const drift = blizzard ? 6 : 1.4;
    for (let i = 0; i < this._pCount; i++) {
      arr[i * 3] += dt * drift * (i % 2 ? 1 : 0.5);
      arr[i * 3 + 1] -= dt * speed * (0.5 + (i % 5) * 0.12);
      arr[i * 3 + 2] += dt * drift * 0.4;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3] = cam.position.x + (Math.random() - 0.5) * 28;
        arr[i * 3 + 1] = 8 + Math.random() * 8;
        arr[i * 3 + 2] = cam.position.z + (Math.random() - 0.5) * 28;
      }
    }
    pos.needsUpdate = true;
    this._tickFires();
  }

  _tickFires() {
    for (const f of this.fires) {
      if (!f.on) {
        if (f.light) f.light.intensity = 0;
        if (f.flame) f.flame.visible = false;
        continue;
      }
      if (f.flame && !f.lumen) {
        f.flame.visible = true;
        f.flame.scale.y = 0.85 + Math.sin(performance.now() * 0.012 + f.x) * 0.2;
      }
      if (f.light) f.light.intensity = 1.8 + Math.sin(performance.now() * 0.02) * 0.5;
    }
  }

  tickPeople(dt, player, game) {
    const ctx = game || { player, world: this, mode: "play" };
    for (const n of this.npcs) {
      if (!n.mesh || n.alive === false) continue;
      if (n.companion) continue;
      if (n.mesh.userData?.actor) tickActor(n.mesh, dt, player);
      else if (n.mesh.userData?.mixer || n.model) tickNpc(n, dt, ctx);
      else tickStaticNpc(n.mesh, dt, player, { companion: !!n.companion });
    }
  }

  _clampToBounds(x, z, rad = 0) {
    const b = this.bounds || { minX: -11, maxX: 11, minZ: -96, maxZ: 16 };
    const pad = Math.max(rad, 0.05);
    return {
      x: Math.max(b.minX + pad, Math.min(b.maxX - pad, x)),
      z: Math.max(b.minZ + pad, Math.min(b.maxZ - pad, z)),
    };
  }

  blocked(x, z, rad = 0.38) {
    const b = this.bounds;
    if (!b) return true;
    if (x < b.minX + rad || x > b.maxX - rad || z < b.minZ + rad || z > b.maxZ - rad) return true;
    if (!this._isPlayableFloor(x, z)) return true;
    for (const c of this.colliders) {
      if (c.walkable || c.ghost) continue;
      if (x > c.minX - rad && x < c.maxX + rad && z > c.minZ - rad && z < c.maxZ + rad) return true;
    }
    return false;
  }

  _isPlayableFloor(x, z) {
    if (typeof this.tileQuery === "function") {
      const t = this.tileQuery(x, z);
      if (!t) return false;
      const def = t.def || {};
      if (t.ch === "~" || t.ch === "_" || def.water || def.name === "open_water") return false;
      if (def.solid) return false;
      if (def.walkable === false) return false;
    }
    return true;
  }

  /**
   * Axis-separated sliding collision. Resolves X then Z over a few iterations,
   * capping each push so a corner / overlapping pair can never launch the
   * player across the map. Always re-clamps to playable bounds at the end.
   */
  collide(x, z, rad = 0.35, fromX = null, fromZ = null) {
    const CAP = 0.7;
    const ox = fromX == null ? x : fromX;
    const oz = fromZ == null ? z : fromZ;
    let { x: nx, z: nz } = this._clampToBounds(x, z, rad);
    const cols = this.colliders || [];
    for (let iter = 0; iter < 5; iter++) {
      let hit = false;
      for (const c of cols) {
        if (c.walkable || c.ghost) continue;
        const minX = c.minX - rad, maxX = c.maxX + rad;
        const minZ = c.minZ - rad, maxZ = c.maxZ + rad;
        if (nx <= minX || nx >= maxX || nz <= minZ || nz >= maxZ) continue;
        const dx1 = nx - minX, dx2 = maxX - nx;
        const push = Math.min(dx1, dx2, CAP);
        nx = dx1 <= dx2 ? nx - push : nx + push;
        hit = true;
      }
      ({ x: nx, z: nz } = this._clampToBounds(nx, nz, rad));
      for (const c of cols) {
        if (c.walkable || c.ghost) continue;
        const minX = c.minX - rad, maxX = c.maxX + rad;
        const minZ = c.minZ - rad, maxZ = c.maxZ + rad;
        if (nx <= minX || nx >= maxX || nz <= minZ || nz >= maxZ) continue;
        const dz1 = nz - minZ, dz2 = maxZ - nz;
        const push = Math.min(dz1, dz2, CAP);
        nz = dz1 <= dz2 ? nz - push : nz + push;
        hit = true;
      }
      ({ x: nx, z: nz } = this._clampToBounds(nx, nz, rad));
      if (!hit) break;
    }
    // Unplayable floor (water, solid tiles, voids) is treated as a collider
    // and resolved as an axis slide from the previous position so corners don't stutter.
    if (this.blocked(nx, nz, rad)) {
      const okX = !this.blocked(nx, oz, rad);
      const okZ = !this.blocked(ox, nz, rad);
      if (okX && !okZ) return this._clampToBounds(nx, oz, rad);
      if (okZ && !okX) return this._clampToBounds(ox, nz, rad);
      if (okX && okZ) {
        const dx = Math.abs(nx - ox), dz = Math.abs(nz - oz);
        return this._clampToBounds(dx >= dz ? nx : ox, dx >= dz ? oz : nz, rad);
      }
      return this._clampToBounds(ox, oz, rad);
    }
    return this._clampToBounds(nx, nz, rad);
  }

  unstuckFrom(x, z, rad = 0.42, fallback = null) {
    const ok = (px, pz) => !this.blocked(px, pz, rad);
    if (ok(x, z)) return { x, z, moved: false };
    const rings = [1, 1.5, 2, 3, 4, 6, 8, 10, 12, 16];
    for (const r of rings) {
      const steps = Math.max(12, Math.round(10 * r));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        if (ok(px, pz)) return { x: px, z: pz, moved: true };
      }
    }
    const fb = fallback || { x: 0, z: 0 };
    return { x: fb.x, z: fb.z, moved: true, spawn: true };
  }

  gatherVisualBoxes() {
    const out = [];
    const box = new THREE.Box3();
    const add = (o) => {
      if (!o || !o.updateMatrixWorld) return;
      try {
        o.updateMatrixWorld(true);
        box.setFromObject(o);
        if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;
        const w = box.max.x - box.min.x, d = box.max.z - box.min.z;
        if (w > 80 || d > 80) return; // skip giant floor batches
        out.push({
          kind: o.userData?.kind || (o.type || "mesh"),
          minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z,
        });
      } catch {}
    };
    for (const o of this.farProps || []) add(o);
    if (this.levelGroup) this.levelGroup.traverse((o) => { if (o.isMesh && o.userData?.kind) add(o); });
    return out;
  }

  inFire(x, z) {
    for (const f of this.fires) {
      if (f.on && Math.hypot(x - f.x, z - f.z) < f.r) return f;
    }
    return null;
  }

  nearestInteract(x, z, maxR = 2.2) {
    let best = null, bestD = maxR;
    let pet = null;
    for (const n of this.npcs) {
      if (!n.alive) continue;
      const d = Math.hypot(x - n.x, z - n.z);
      // Wraith trots at heel: she is only the target when nothing else is in reach.
      if (n.companion) { if (d < maxR && (!pet || d < pet.d)) pet = { type: "npc", obj: n, d }; continue; }
      if (d < bestD) { bestD = d; best = { type: "npc", obj: n, d }; }
    }
    for (const L of this.loot) {
      if (L.taken) continue;
      const d = Math.hypot(x - L.x, z - L.z);
      if (d < Math.min(bestD, L.r)) { bestD = d; best = { type: "loot", obj: L, d }; }
    }
    for (const I of this.interactives) {
      const d = Math.hypot(x - I.x, z - I.z);
      if (d < Math.min(bestD, I.r)) { bestD = d; best = { type: I.type, obj: I, d }; }
    }
    return best || pet;
  }

  locationAt(x, z) {
    let best = null, bestScore = Infinity;
    const locs = this.locations || LOCATIONS;
    for (const [id, loc] of Object.entries(locs)) {
      if (!loc) continue;
      const r = loc.rect;
      let inside = false, d, area = loc.r ? Math.PI * loc.r * loc.r : 200;
      if (r && r.x0 != null) {
        inside = x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
        if (!inside) continue;
        const cx = loc.x ?? (r.x0 + r.x1) / 2;
        const cz = loc.z ?? (r.z0 + r.z1) / 2;
        d = Math.hypot(x - cx, z - cz);
        area = Math.max(1, (r.x1 - r.x0) * (r.z1 - r.z0));
      } else {
        if (loc.x == null || loc.z == null) continue;
        d = Math.hypot(x - loc.x, z - loc.z);
        const max = loc.r || 14;
        if (d > max) continue;
        inside = true;
        area = max * max * 4;
      }
      // Prefer tighter / named shelters over a long corridor like river_ice.
      const score = area * 0.02 + d;
      if (inside && score < bestScore) {
        bestScore = score;
        best = { id, ...loc, d };
      }
    }
    return best;
  }

  isIndoor(x, z) {
    if (this.inFire(x, z)) return true;
    if (this.safeZoneAt) {
      const s = this.safeZoneAt(x, z);
      if (s && (s.kind === "indoor" || s.kind === "sealed" || s.kind === "warm_room" || s.warmth)) return true;
    }
    if (this.blocksAirLOS && this.blocksAirLOS(x, z)) return true;
    const loc = this.locationAt(x, z);
    return !!(loc && loc.safe);
  }
}

function isCachedTexture(tex, cache) {
  if (!tex || !cache) return false;
  for (const entry of Object.values(cache)) {
    if (!entry) continue;
    if (entry === tex || entry.diff === tex || entry.nor === tex || entry.rough === tex || entry.ao === tex || entry.map === tex) return true;
  }
  return false;
}

function disposeMesh(o, pbrCache) {
  if (!o) return;
  // GLB clones share geometry/materials with the cached registry template.
  if (o.userData && o.userData.sharedAsset) return;
  try { o.geometry?.dispose?.(); } catch {}
  const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of mats) {
    if (!m) continue;
    for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"]) {
      const tex = m[key];
      if (tex && !isCachedTexture(tex, pbrCache)) {
        try { tex.dispose(); } catch {}
      }
    }
    try { m.dispose(); } catch {}
  }
}
