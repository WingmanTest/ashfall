/**
 * First-person and world-pickup weapons.
 * Prefers real CC0 / CC-BY GLBs (see WEAPON_SOURCES). Fallback / unique
 * items (pipe shotgun, road flare) are multi-part procedural models built
 * to systems/weapons.json real_world_reference. Never a bare cone.
 *
 * Convention: after prepare(), the barrel/shaft points along -Z and the
 * AABB is centered at the origin. mountViewmodel places the gun in the
 * lower-right of a 9:16 frame, yawed inward toward the crosshair.
 */
import * as THREE from "three";

export const WEAPON_SOURCES = {
  pistol: {
    file: "./assets/weapons/pistol.glb",
    title: "Glock",
    author: "CreativeTrio",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/0nDixXrcs0",
    length: 0.202,
    lift: 5.0,
  },
  ar15: {
    file: "./assets/weapons/ar15.glb",
    title: "Assault Rifle",
    author: "Quaternius",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/Bgvuu4CUMV",
    length: 0.84,
    lift: 1.7,
  },
  service_rifle: {
    file: "./assets/weapons/service_rifle.glb",
    title: "Assault Rifle",
    author: "Quaternius",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/Bgvuu4CUMV",
    length: 0.76,
    lift: 1.7,
    dress: "m4",
  },
  pump_shotgun: {
    file: "./assets/weapons/pump_shotgun.glb",
    title: "Shotgun Pump West",
    author: "Pichuliru",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/NfQETBKOiw",
    length: 1.02,
    lift: 1.6,
  },
  deer_rifle: {
    file: "./assets/weapons/deer_rifle.glb",
    title: "Sniper Rifle",
    author: "Quaternius",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/ASOMZIErq3",
    length: 1.10,
    lift: 1.5,
  },
  knife: {
    file: "./assets/weapons/knife.glb",
    title: "Hunters Knife",
    author: "CreativeTrio",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/a2avVUVeYD",
    length: 0.22,
    lift: 1.6,
  },
  pipe: {
    file: "./assets/weapons/pipe.glb",
    title: "Pipe",
    author: "CreativeTrio",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/03iCPYXZpJ",
    length: 0.60,
    lift: 1.4,
  },
  baseball_bat: {
    file: "./assets/weapons/baseball_bat.glb",
    title: "Baseball Bat",
    author: "Pichuliru",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/POXTjdMP2c",
    length: 0.84,
    lift: 1.2,
  },
  crowbar: {
    file: "./assets/weapons/crowbar.glb",
    title: "Crowbar",
    author: "Pichuliru",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/OS8gAoeDtM",
    length: 0.91,
    lift: 1.3,
  },
  fire_axe: {
    file: "./assets/weapons/fire_axe.glb",
    title: "Fire Axe",
    author: "Pichuliru",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/0kgjDkCRmx",
    length: 0.91,
    lift: 1.3,
  },
  molotov: {
    file: "./assets/weapons/molotov.glb",
    title: "Molotov",
    author: "CreativeTrio",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/jsmWZYqVlM",
    length: 0.30,
    lift: 1.3,
  },
  torch: {
    file: "./assets/weapons/torch.glb",
    title: "Wooden Torch",
    author: "Quaternius",
    license: "CC0 1.0",
    url: "https://poly.pizza/m/pNsfJzhXiD",
    length: 0.50,
    lift: 1.3,
  },
  flashlight: {
    file: "./assets/weapons/flashlight.glb",
    title: "Flashlight",
    author: "Bruno Oliveira",
    license: "CC-BY 3.0",
    url: "https://poly.pizza/m/8t1DZLLvofk",
    length: 0.25,
    lift: 1.2,
  },
};

export const VIEWMODEL_IDS = [
  "pistol", "ar15", "service_rifle", "blaster", "pump_shotgun", "deer_rifle",
  "knife", "pipe", "baseball_bat", "crowbar", "fire_axe",
  "molotov", "flare", "torch", "flashlight",
];

/** Degrees stored as radians in the pose. Lower-right 9:16 FPS hold. */
const HOLD = {
  pistol:        { pos: [0.13, -0.17, -0.36], rot: [0.06, -0.34, 0.10] },
  ar15:          { pos: [0.16, -0.20, -0.52], rot: [0.05, -0.30, 0.06] },
  service_rifle: { pos: [0.16, -0.20, -0.50], rot: [0.05, -0.30, 0.06] },
  blaster:       { pos: [0.17, -0.22, -0.48], rot: [0.06, -0.32, 0.07] },
  pump_shotgun:  { pos: [0.17, -0.21, -0.52], rot: [0.05, -0.30, 0.06] },
  deer_rifle:    { pos: [0.16, -0.20, -0.54], rot: [0.05, -0.28, 0.05] },
  knife:         { pos: [0.16, -0.20, -0.40], rot: [0.55, -0.95, 0.70] },
  pipe:          { pos: [0.18, -0.22, -0.44], rot: [0.50, -0.90, 0.55] },
  baseball_bat:  { pos: [0.18, -0.24, -0.46], rot: [0.48, -0.88, 0.50] },
  crowbar:       { pos: [0.18, -0.22, -0.44], rot: [0.50, -0.92, 0.58] },
  fire_axe:      { pos: [0.18, -0.24, -0.46], rot: [0.48, -0.90, 0.52] },
  molotov:       { pos: [0.16, -0.20, -0.40], rot: [0.28, -0.70, 0.22] },
  flare:         { pos: [0.16, -0.20, -0.40], rot: [0.30, -0.72, 0.22] },
  torch:         { pos: [0.16, -0.22, -0.42], rot: [0.35, -0.80, 0.30] },
  flashlight:    { pos: [0.15, -0.18, -0.38], rot: [0.18, -0.55, 0.18] },
};
const HOLD_ADS = { pos: [0.04, -0.10, -0.34], rot: [0.02, -0.10, 0.02] };

export function weaponKind(id) {
  if (["knife", "pipe", "baseball_bat", "crowbar", "fire_axe"].includes(id)) return "melee";
  if (["molotov", "flare"].includes(id)) return "thrown";
  if (id === "torch" || id === "flashlight") return "held_offhand";
  return "gun";
}

export function holdPose(id, aiming = false) {
  const base = HOLD[id] || HOLD.pistol;
  if (!aiming || weaponKind(id) !== "gun") return base;
  const t = 0.85;
  return {
    pos: base.pos.map((v, i) => v + (HOLD_ADS.pos[i] - v) * t),
    rot: base.rot.map((v, i) => v + (HOLD_ADS.rot[i] - v) * t),
  };
}

let LIBRARY = {};
export function setWeaponLibrary(lib) { LIBRARY = lib || {}; }
export function getWeaponLibrary() { return LIBRARY; }

export const WEAPON_FILES = Object.fromEntries(
  Object.entries(WEAPON_SOURCES).map(([id, s]) => [id, s.file])
);

/* ---------- materials (procedural fallbacks / dressing) ---------- */
const MAT = {};
function mat(key, params) {
  if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial(params);
  return MAT[key];
}
const M = {
  gun: () => mat("gun", { color: 0x3a4048, metalness: 0.62, roughness: 0.38 }),
  poly: () => mat("poly", { color: 0x32363c, metalness: 0.08, roughness: 0.78 }),
  steel: () => mat("steel", { color: 0x6a727a, metalness: 0.78, roughness: 0.32 }),
  steelDk: () => mat("steelDk", { color: 0x3a4148, metalness: 0.7, roughness: 0.4 }),
  bore: () => mat("bore", { color: 0x1a1c1e, metalness: 0.4, roughness: 0.7 }),
  wood: () => mat("wood", { color: 0x7a5330, metalness: 0.02, roughness: 0.86 }),
  woodLt: () => mat("woodLt", { color: 0x8a6238, metalness: 0.02, roughness: 0.85 }),
  rust: () => mat("rust", { color: 0x6a4a38, metalness: 0.35, roughness: 0.7 }),
  tape: () => mat("tape", { color: 0x2a2a2a, metalness: 0, roughness: 0.95 }),
  clamp: () => mat("clamp", { color: 0x8a9096, metalness: 0.7, roughness: 0.4 }),
  tan: () => mat("tan", { color: 0x9a7a52, metalness: 0.06, roughness: 0.68 }),
  red: () => mat("red", { color: 0xa82018, metalness: 0.12, roughness: 0.55 }),
  paper: () => mat("paper", { color: 0x9a2020, metalness: 0, roughness: 0.9 }),
  cap: () => mat("cap", { color: 0x1c1c1c, metalness: 0.1, roughness: 0.7 }),
  white: () => mat("white", { color: 0xd8d8d4, metalness: 0, roughness: 0.85 }),
  glow: () => mat("glow", { color: 0xff6a20, emissive: 0xcc4010, emissiveIntensity: 0.9, roughness: 0.6 }),
  glass: () => mat("glass", { color: 0x3a6a48, metalness: 0.1, roughness: 0.12, transparent: true, opacity: 0.7 }),
  glassClr: () => mat("glassClr", { color: 0xa8c4d0, metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.4 }),
  optic: () => mat("optic", { color: 0x3a3e44, metalness: 0.5, roughness: 0.4 }),
};

function box(parent, w, h, d, material, x, y, z, rotX = 0, rotZ = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  if (rotX) m.rotation.x = rotX;
  if (rotZ) m.rotation.z = rotZ;
  m.castShadow = false;
  m.frustumCulled = false;
  parent.add(m);
  return m;
}
function cyl(parent, rTop, rBot, h, seg, material, x, y, z, rotX = 0, rotZ = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.set(x, y, z);
  m.rotation.x = rotX;
  m.rotation.z = rotZ;
  m.castShadow = false;
  m.frustumCulled = false;
  parent.add(m);
  return m;
}
function torus(parent, r, tube, seg, material, x, y, z, rotX = 0) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, seg), material);
  m.position.set(x, y, z);
  m.rotation.x = rotX;
  m.castShadow = false;
  m.frustumCulled = false;
  parent.add(m);
  return m;
}

function markMuzzle(g) {
  const muz = new THREE.Object3D();
  muz.name = "muzzle";
  g.add(muz);
  g.userData.muzzle = muz;
  return g;
}

/* ---------- GLB prepare ---------- */

function bakeSkins(root) {
  root.updateMatrixWorld(true);
  const skinned = [];
  root.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
  for (const mesh of skinned) {
    const skel = mesh.skeleton;
    if (skel) { skel.pose(); skel.update(); }
    mesh.updateMatrixWorld(true);
    const geom = mesh.geometry.clone();
    const pos = geom.attributes.position;
    const idx = geom.attributes.skinIndex;
    const wt = geom.attributes.skinWeight;
    if (skel && idx && wt) {
      const bones = skel.bones;
      const inv = skel.boneInverses;
      const applied = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]));
      const vertex = new THREE.Vector3();
      const acc = new THREE.Vector3();
      const tmp = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        vertex.fromBufferAttribute(pos, i);
        acc.set(0, 0, 0);
        for (let j = 0; j < 4; j++) {
          const w = wt.getComponent(i, j);
          if (!w) continue;
          const bi = idx.getComponent(i, j);
          tmp.copy(vertex).applyMatrix4(applied[bi]);
          acc.addScaledVector(tmp, w);
        }
        pos.setXYZ(i, acc.x, acc.y, acc.z);
      }
      pos.needsUpdate = true;
      if (geom.attributes.normal) geom.computeVertexNormals();
      geom.deleteAttribute("skinIndex");
      geom.deleteAttribute("skinWeight");
    }
    const baked = new THREE.Mesh(geom, mesh.material);
    baked.name = mesh.name;
    baked.castShadow = mesh.castShadow;
    baked.receiveShadow = mesh.receiveShadow;
    // Positions were baked with bone matrixWorld, so they are already in world
    // space. Put the mesh at the root with identity transform.
    baked.position.set(0, 0, 0);
    baked.rotation.set(0, 0, 0);
    baked.scale.set(1, 1, 1);
    root.add(baked);
    if (mesh.parent) mesh.parent.remove(mesh);
  }
}

function brightenMap(map, gain = 2.4) {
  const img = map.image;
  if (!img || !img.width) return map;
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const lift = 48;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, lift + d[i] * gain);
    d[i + 1] = Math.min(255, lift + d[i + 1] * gain);
    d[i + 2] = Math.min(255, lift + d[i + 2] * gain);
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = map.flipY;
  tex.wrapS = map.wrapS; tex.wrapT = map.wrapT;
  tex.needsUpdate = true;
  return tex;
}

function liftMaterial(mat, lift = 1.5) {
  if (!mat) return;
  if (mat.map) {
    mat.map.colorSpace = THREE.SRGBColorSpace;
    if (lift > 1.2 && !mat.userData._brightened) {
      mat.map = brightenMap(mat.map, Math.max(1.6, lift * 0.85));
      mat.userData._brightened = true;
    }
    mat.color.setRGB(1.35, 1.32, 1.28);
    if (mat.metalness < 0.2) mat.metalness = 0.38;
    if (mat.roughness < 0.28 || mat.roughness > 0.85) mat.roughness = 0.42;
  } else if (mat.color) {
    const l = 0.2126 * mat.color.r + 0.7152 * mat.color.g + 0.0722 * mat.color.b;
    const target = l < 0.04 ? 0.20 : l < 0.12 ? 0.26 : l < 0.2 ? 0.32 : l;
    if (target > l && l > 0) mat.color.multiplyScalar(Math.min(8, target / l));
    // Clamp channels to a gunmetal ceiling so we don't blow out.
    mat.color.r = Math.min(mat.color.r, 0.62);
    mat.color.g = Math.min(mat.color.g, 0.64);
    mat.color.b = Math.min(mat.color.b, 0.68);
  }
  if (typeof mat.roughness === "number") {
    if (mat.roughness > 0.85) mat.roughness = 0.48;
    else if (mat.roughness < 0.22) mat.roughness = 0.32;
  }
  if (typeof mat.metalness === "number" && mat.metalness < 0.15 && !mat.map) {
    mat.metalness = 0.42;
  }
  mat.envMapIntensity = 1.0;
  mat.needsUpdate = true;
}

function findNode(root, substr) {
  let found = null;
  const key = substr.toLowerCase();
  root.traverse((o) => {
    if (!found && o.name && o.name.toLowerCase().includes(key)) found = o;
  });
  return found;
}

function addAimpoint(parent) {
  const g = new THREE.Group();
  // M68 CCO / Aimpoint-style tube
  cyl(g, 0.018, 0.018, 0.068, 14, M.optic(), 0, 0.0, 0, Math.PI / 2, 0);
  cyl(g, 0.021, 0.021, 0.012, 14, M.steelDk(), 0, 0.0, 0.028, Math.PI / 2, 0);
  cyl(g, 0.021, 0.021, 0.01, 14, M.steelDk(), 0, 0.0, -0.028, Math.PI / 2, 0);
  cyl(g, 0.011, 0.011, 0.005, 12, M.glassClr(), 0, 0.0, -0.036, Math.PI / 2, 0);
  box(g, 0.02, 0.016, 0.036, M.optic(), 0, -0.018, 0);
  // short top rail under the optic
  box(g, 0.016, 0.006, 0.08, M.steelDk(), 0, -0.028, 0.01);
  parent.add(g);
  return g;
}

function addTanMag(parent, length = 0.10) {
  const g = new THREE.Group();
  box(g, 0.03, 0.11, length, M.tan(), 0, -0.02, 0);
  box(g, 0.028, 0.02, 0.04, M.tan(), 0, 0.045, 0.02);
  parent.add(g);
  return g;
}

function nearMesh(node, box) {
  if (!node) return false;
  node.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  node.getWorldPosition(p);
  const c = box.getCenter(new THREE.Vector3());
  const span = box.getSize(new THREE.Vector3()).length();
  return p.distanceTo(c) < Math.max(0.35, span * 0.75);
}

function dressM4(root) {
  const box = meshBox(root);
  // Local placement on a centered rifle (barrel along -Z, stock toward +Z).
  const scope = new THREE.Group();
  scope.position.set(0, box.max.y + 0.012, -0.03);
  root.add(scope);
  addAimpoint(scope);
  const mag = new THREE.Group();
  mag.position.set(0.01, -0.11, 0.01);
  root.add(mag);
  addTanMag(mag, 0.11);
  // Lift very-black materials, tint any already-present mag-like mid mesh via material name
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [].concat(o.material);
    for (const m of mats) {
      const n = (m.name || "").toLowerCase();
      if (n.includes("black") || n.includes("grey") || n.includes("gray")) {
        liftMaterial(m, 2.4);
      }
    }
  });
}


function meshBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let any = false;
  const tmp = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    if (any) box.union(tmp);
    else { box.copy(tmp); any = true; }
  });
  return any ? box : new THREE.Box3().setFromObject(root);
}

function principalAlign(root) {
  root.updateMatrixWorld(true);
  const box = meshBox(root);
  const size = box.getSize(new THREE.Vector3());
  // Rotate so the longest axis lies on Z.
  if (size.x >= size.y && size.x >= size.z) {
    root.rotation.y += -Math.PI / 2;
  } else if (size.y >= size.x && size.y >= size.z) {
    root.rotation.x += Math.PI / 2;
  }
  root.updateMatrixWorld(true);
}

function muzzleTowardNegZ(root) {
  // Compare cross-section at the two Z ends; the thinner end is the muzzle.
  root.updateMatrixWorld(true);
  const box = meshBox(root);
  const min = box.min, max = box.max;
  const z0 = min.z, z1 = max.z;
  const span = z1 - z0 || 1;
  const near = z0 + span * 0.08, far = z1 - span * 0.08;
  let minSpread = 0, maxSpread = 0, nMin = 0, nMax = 0;
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    o.updateMatrixWorld(true);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.z < near) { minSpread += Math.abs(v.x) + Math.abs(v.y); nMin++; }
      else if (v.z > far) { maxSpread += Math.abs(v.x) + Math.abs(v.y); nMax++; }
    }
  });
  const aMin = nMin ? minSpread / nMin : 1;
  const aMax = nMax ? maxSpread / nMax : 1;
  // If the +Z end is thinner, rotate 180° so the thin end (muzzle) faces -Z.
  if (aMax < aMin * 0.92) {
    root.rotation.y += Math.PI;
    root.updateMatrixWorld(true);
  }
}

function centerAtOrigin(root) {
  root.updateMatrixWorld(true);
  const box = meshBox(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.sub(c);
  root.updateMatrixWorld(true);
}

function scaleToLength(root, length) {
  root.updateMatrixWorld(true);
  const box = meshBox(root);
  const size = box.getSize(new THREE.Vector3());
  const cur = Math.max(size.x, size.y, size.z, 1e-4);
  const s = length / cur;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
}

function bakeWorld(src) {
  const g = new THREE.Group();
  src.updateMatrixWorld(true);
  const meshes = [];
  src.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  // Preserve empty attach nodes (magazine, scope) by cloning the hierarchy
  // but baking mesh geometry into world space of a wrapper... Simpler: add
  // the cloned scene and reset after align on the wrapper.
  g.add(src);
  return g;
}

function cloneMats(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) o.material = o.material.map((m) => m.clone());
    else o.material = o.material.clone();
    const mats = [].concat(o.material);
    o.castShadow = false;
    o.frustumCulled = false;
    o.layers.enable(0);
    o.layers.enable(1);
    for (const m of mats) {
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
}

export function prepareLoadedModel(id, scene) {
  const spec = WEAPON_SOURCES[id] || { length: 0.4, lift: 1.5 };
  const wrapper = new THREE.Group();
  const src = scene.clone(true);
  wrapper.add(src);
  cloneMats(wrapper);
  // Keep skinned meshes (Pichuliru guns). Baking bind pose can collapse a missing skeleton.
  // Skinned Pichuliru meshes render correctly in bind pose; do not bake.
  wrapper.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) { o.skeleton.pose(); o.skeleton.update(); } });
  wrapper.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) liftMaterial(m, spec.lift || 1.5);
  });
  // Align the whole wrapper so baked skins and attach nodes move together.
  principalAlign(wrapper);
  muzzleTowardNegZ(wrapper);
  scaleToLength(wrapper, spec.length || 0.4);
  centerAtOrigin(wrapper);
  if (spec.dress === "m4") dressM4(wrapper);
  centerAtOrigin(wrapper);
  markMuzzle(wrapper);
  // Place a muzzle marker at the -Z end.
  wrapper.updateMatrixWorld(true);
  const box = meshBox(wrapper);
  if (wrapper.userData.muzzle) wrapper.userData.muzzle.position.set(0, 0, box.min.z);
  wrapper.name = "weapon_" + id;
  wrapper.userData.weaponId = id;
  wrapper.userData.source = spec;
  return wrapper;
}

/* ---------- procedural uniques ---------- */
function pipeShotgun() {
  // Improvised double-barrel 12ga slam-fire: two 3/4" pipes, hose clamps, 2x4 stock.
  const g = new THREE.Group();
  const L = 0.55;
  const r = 0.0115; // ~3/4" OD / 2 is 0.0095; slightly oversized for readability
  const gap = 0.015;
  for (const y of [gap, -gap]) {
    cyl(g, r, r, L, 14, M.steelDk(), 0, y, -L / 2, Math.PI / 2, 0);
    // hollow muzzle
    cyl(g, r * 0.72, r * 0.72, 0.008, 12, M.bore(), 0, y, -L + 0.001, Math.PI / 2, 0);
    cyl(g, r * 1.08, r * 1.08, 0.01, 12, M.steel(), 0, y, -0.03, Math.PI / 2, 0);
  }
  // hose clamps
  for (const z of [-0.08, -0.22, -0.40]) {
    torus(g, gap + r, 0.0024, 10, M.clamp(), 0, 0, z, 0);
    torus(g, gap + r, 0.0024, 10, M.clamp(), 0, 0, z, Math.PI / 2);
  }
  // 2x4 stock (38×89 mm, shortened)
  box(g, 0.038, 0.055, 0.22, M.wood(), 0, -0.01, 0.10);
  box(g, 0.038, 0.09, 0.04, M.wood(), 0, -0.04, 0.20); // butt
  // trigger / hammer
  box(g, 0.018, 0.028, 0.05, M.steel(), 0, -0.032, 0.01);
  box(g, 0.006, 0.022, 0.012, M.steel(), 0, -0.048, 0.00);
  // tape wrap
  cyl(g, 0.034, 0.034, 0.05, 10, M.tape(), 0, 0, -0.14, Math.PI / 2, 0);
  markMuzzle(g);
  g.userData.muzzle.position.set(0, 0, -L);
  return g;
}

function flare() {
  // Orion-style 30 cm road fusee.
  const g = new THREE.Group();
  const L = 0.30;
  cyl(g, 0.013, 0.013, L - 0.04, 14, M.paper(), 0, 0, -L / 2 + 0.02, Math.PI / 2, 0);
  // white mid band + black cap
  cyl(g, 0.0135, 0.0135, 0.025, 14, M.white(), 0, 0, -0.06, Math.PI / 2, 0);
  cyl(g, 0.014, 0.014, 0.03, 12, M.cap(), 0, 0, 0.01, Math.PI / 2, 0);
  box(g, 0.008, 0.006, 0.018, M.steel(), 0.012, 0, 0.01); // striker
  cyl(g, 0.01, 0.008, 0.03, 10, M.glow(), 0, 0, -L + 0.02, Math.PI / 2, 0);
  markMuzzle(g);
  g.userData.muzzle.position.set(0, 0, -L);
  return g;
}

const FACTORIES = { blaster: pipeShotgun, flare };

export function createWeaponModel(id) {
  if (LIBRARY[id]) {
    try { return prepareLoadedModel(id, LIBRARY[id]); }
    catch (err) { console.warn("prepare weapon", id, err); }
  }
  const fn = FACTORIES[id];
  const g = fn ? fn() : pipeShotgun();
  g.name = "weapon_" + id;
  g.userData.weaponId = id;
  g.traverse((o) => { if (o.isMesh) { o.layers.enable(0); o.layers.enable(1); } });
  return g;
}

/**
 * Lower-right 9:16 FPS hold, ~15–22° inward yaw, never centered on the
 * crosshair. ADS eases rifles/pistols toward the sight picture.
 */
export function mountViewmodel(vmRoot, model, id, aiming = false) {
  while (vmRoot.children.length) vmRoot.remove(vmRoot.children[0]);
  vmRoot.add(model);
  const hold = holdPose(id || model.userData.weaponId, aiming);
  vmRoot.position.set(hold.pos[0], hold.pos[1], hold.pos[2]);
  vmRoot.rotation.set(hold.rot[0], hold.rot[1], hold.rot[2]);
  return model.userData.muzzle;
}

export function applyHold(vmRoot, id, aiming, sway = [0, 0, 0], extraRot = [0, 0, 0]) {
  const hold = holdPose(id, aiming);
  vmRoot.position.set(hold.pos[0] + sway[0], hold.pos[1] + sway[1], hold.pos[2] + sway[2]);
  vmRoot.rotation.set(hold.rot[0] + extraRot[0], hold.rot[1] + extraRot[1], hold.rot[2] + extraRot[2]);
}

export function installViewmodelLights(camera) {
  // Layer 1: lights only the viewmodel, so the world isn't double-lit.
  camera.layers.enable(1);
  const key = new THREE.DirectionalLight(0xfff3e4, 2.2);
  key.position.set(0.45, 0.65, 0.35);
  key.layers.set(1);
  key.name = "vmKey";
  const rim = new THREE.DirectionalLight(0x9bb8d0, 1.15);
  rim.position.set(-0.55, 0.25, -0.15);
  rim.layers.set(1);
  rim.name = "vmRim";
  const fill = new THREE.DirectionalLight(0xe8eef4, 0.7);
  fill.position.set(-0.2, 0.15, 0.6);
  fill.layers.set(1);
  fill.name = "vmFill";
  camera.add(key, rim, fill);
  return { key, rim, fill };
}

export function createWorldPickup(id) {
  const g = createWeaponModel(id);
  g.rotation.x = -Math.PI / 2;
  g.position.y = 0.04;
  g.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = true; }
  });
  return g;
}

export function countTris(root) {
  let n = 0;
  root.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const idx = o.geometry.index;
      const pos = o.geometry.attributes.position;
      n += idx ? idx.count / 3 : pos.count / 3;
    }
  });
  return n;
}
