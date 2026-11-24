// Ashfall model registry (Wave 1 prototypes + Wave 2 main cast & archetypes).
// ES module for the game engine. Uses the same three.js r170 the game loads through its import map:
//   "three": "./vendor/three/three.module.js", "three/addons/": "./vendor/three/addons/"
//
//   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
//   import { loadModel, fitToGround } from './models/registry.js?v=r15';
//   const loader = new GLTFLoader();
//   const militia = await loadModel('watch_militia', loader);   // cached, cloned per call
//   scene.add(militia);
//
// Conventions for every asset: +Y up, faces +Z, meters, pivot on the ground (min y = 0),
// flat-shaded non-indexed triangles, matte PBR, NEAREST-sampled PNG textures without mipmaps.
import * as THREE from 'three';

const BASE = new URL('./', import.meta.url);

export const MODEL_CATALOG = Object.freeze({
  watch_militia:       { path: 'characters/watch_militia.glb',       category: 'character', height: 1.78, chapters: [1, 2, 3] },
  braith_summer:       { path: 'characters/braith_summer.glb',       category: 'character', height: 1.78, chapters: [1, 2] },
  braith_mcu2p_mask:   { path: 'characters/braith_mcu2p_mask.glb',   category: 'attachment', attach: 'head', chapters: [8, 9, 10],
                         // head-local anchor on braith_summer (chin plane centre); parent the mask here
                         anchor: [0, 1.535, 0.008] },
  braith_with_mask:    { path: 'previews/braith_with_mask_preview.glb', category: 'preview', height: 1.78, chapters: [8] },
  wraith_malinois:     { path: 'creatures/wraith_malinois.glb',     category: 'creature', height: 0.84, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  sparks_tract_house:  { path: 'buildings/sparks_tract_house.glb',  category: 'building', height: 4.5, chapters: [1, 3, 6, 8] },
  sagebrush_clump:     { path: 'nature/sagebrush_clump.glb',        category: 'nature', height: 1.05, chapters: [1, 2, 3, 4, 5, 7] },
  charcoal_grill:      { path: 'props/charcoal_grill.glb',          category: 'prop', height: 0.96, searchable: true, chapters: [1, 3] },
  metal_locker:        { path: 'props/metal_locker.glb',            category: 'prop', height: 1.95, searchable: true, chapters: [1, 2, 4, 5, 6] },
  // ---- Wave 2: 14 main story NPCs (keys = story/npcs.json ids) ----
  carly:             { path: 'characters/carly.glb', category: 'character', height: 1.67, collider: { radius: 0.2, height: 1.67 }, tris: 842, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  lolo:              { path: 'characters/lolo.glb', category: 'character', height: 1.59, collider: { radius: 0.23, height: 1.59 }, tris: 790, chapters: [1, 2, 3, 6, 8, 10] },
  gil:               { path: 'characters/gil.glb', category: 'character', height: 1.78, collider: { radius: 0.24, height: 1.78 }, tris: 872, chapters: [1, 2, 3] },
  kit:               { path: 'characters/kit.glb', category: 'character', height: 1.70, collider: { radius: 0.2, height: 1.70 }, tris: 930, chapters: [1, 2, 3, 6, 8, 9, 10] },
  ross:              { path: 'characters/ross.glb', category: 'character', height: 1.89, collider: { radius: 0.23, height: 1.89 }, tris: 1039, chapters: [5, 7, 9, 10] },
  avila:             { path: 'characters/avila.glb', category: 'character', height: 1.73, collider: { radius: 0.2, height: 1.73 }, tris: 782, chapters: [2, 3, 4, 6, 10] },
  augie:             { path: 'characters/augie.glb', category: 'character', height: 1.71, collider: { radius: 0.2, height: 1.71 }, tris: 942, chapters: [3, 6, 7] },
  ames:              { path: 'characters/ames.glb', category: 'character', height: 1.82, collider: { radius: 0.23, height: 1.82 }, tris: 996, chapters: [2, 4, 6, 10] },
  wes:               { path: 'characters/wes.glb', category: 'character', height: 1.77, collider: { radius: 0.2, height: 1.77 }, tris: 786, chapters: [3, 5, 7, 8, 9, 10] },
  walt:              { path: 'characters/walt.glb', category: 'character', height: 1.71, collider: { radius: 0.2, height: 1.71 }, tris: 918, chapters: [4, 7, 10] },
  roz:               { path: 'characters/roz.glb', category: 'character', height: 1.68, collider: { radius: 0.24, height: 1.68 }, tris: 816, chapters: [2, 3, 6, 8, 10] },
  ander:             { path: 'characters/ander.glb', category: 'character', height: 1.84, collider: { radius: 0.26, height: 1.84 }, tris: 1030, chapters: [5, 7, 10] },
  ruiz:              { path: 'characters/ruiz.glb', category: 'character', height: 1.74, collider: { radius: 0.2, height: 1.74 }, tris: 904, chapters: [5, 6, 7, 9, 10] },
  reyne:             { path: 'characters/reyne.glb', category: 'character', height: 1.71, collider: { radius: 0.22, height: 1.71 }, tris: 1028, chapters: [7, 8, 10] },
  // ---- Wave 2: reusable Nevada archetypes (secondary / ambient / traders / guards) ----
  civ_summer_a:      { path: 'characters/civ_summer_a.glb', category: 'archetype', height: 1.79, collider: { radius: 0.21, height: 1.79 }, tris: 748, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], roles: ["civilian", "neighbor", "ambient"] },
  civ_summer_b:      { path: 'characters/civ_summer_b.glb', category: 'archetype', height: 1.64, collider: { radius: 0.21, height: 1.64 }, tris: 958, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], roles: ["civilian", "neighbor", "ambient"] },
  civ_elder:         { path: 'characters/civ_elder.glb', category: 'archetype', height: 1.68, collider: { radius: 0.2, height: 1.68 }, tris: 752, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], roles: ["elder", "civilian", "ambient"] },
  trader_wanderer:   { path: 'characters/trader_wanderer.glb', category: 'archetype', height: 1.82, collider: { radius: 0.23, height: 1.82 }, tris: 1020, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], roles: ["trader", "merchant", "wanderer"] },
  scavenger_runner:  { path: 'characters/scavenger_runner.glb', category: 'archetype', height: 1.75, collider: { radius: 0.2, height: 1.75 }, tris: 904, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], roles: ["scavenger", "runner", "youth"] },
  guard_trooper:     { path: 'characters/guard_trooper.glb', category: 'archetype', height: 1.83, collider: { radius: 0.21, height: 1.83 }, tris: 923, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], roles: ["guard", "soldier", "deputy", "checkpoint"] },
});

const _cache = new Map();

/** URL of a catalogued model, resolved relative to this module. */
export function modelUrl(id) {
  const e = MODEL_CATALOG[id];
  if (!e) throw new Error(`[models] unknown model id "${id}"`);
  return new URL(e.path, BASE).href;
}

/**
 * Load (once) and return a fresh clone of a catalogued model.
 * @param {string} id  key of MODEL_CATALOG
 * @param {import('three/addons/loaders/GLTFLoader.js').GLTFLoader} gltfLoader
 * @param {{tune?: boolean, castShadow?: boolean, receiveShadow?: boolean}} [opts]
 * @returns {Promise<THREE.Object3D>}
 */
export async function loadModel(id, gltfLoader, opts = {}) {
  if (!gltfLoader) throw new Error('[models] loadModel needs a GLTFLoader instance');
  if (!_cache.has(id)) {
    _cache.set(id, gltfLoader.loadAsync(modelUrl(id)).then((gltf) => {
      const root = gltf.scene;
      root.name = id;
      if (opts.tune !== false) applyRetroMaterialTuning(root, opts);
      root.userData.modelId = id;
      root.userData.catalog = MODEL_CATALOG[id];
      root.animations = gltf.animations || [];   // rigged models: AnimationClips travel with every clone
      return root;
    }));
  }
  const src = await _cache.get(id);
  const inst = cloneModel(src);   // geometry/materials shared; transforms (and skeletons) independent
  return inst;
}

/**
 * Clone a loaded model. Static models: plain `clone(true)`. Rigged models (SkinnedMesh): every clone gets its own
 * skeleton re-bound to its own cloned bones (same algorithm as three/addons SkeletonUtils.clone, which is not
 * vendored) - a plain clone(true) of a SkinnedMesh would keep driving the SOURCE skeleton.
 * `.animations` is copied by reference, so `new THREE.AnimationMixer(inst)` + `playClip()` just work.
 */
export function cloneModel(source) {
  let skinned = false;
  source.traverse((o) => { if (o.isSkinnedMesh) skinned = true; });
  if (!skinned) return source.clone(true);
  const sourceLookup = new Map();
  const cloneLookup = new Map();
  const clone = source.clone(true);
  (function walk(a, b) {
    sourceLookup.set(b, a); cloneLookup.set(a, b);
    for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]);
  })(source, clone);
  clone.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const src = sourceLookup.get(node);
    node.skeleton = src.skeleton.clone();
    node.bindMatrix.copy(src.bindMatrix);
    node.skeleton.bones = src.skeleton.bones.map((b) => cloneLookup.get(b));
    node.bind(node.skeleton, node.bindMatrix);
  });
  return clone;
}

/**
 * Enforce the Ashfall retro look on any loaded glTF scene:
 * NEAREST texture filtering without mipmaps, flat shading, matte roughness/metalness bounds, shadow flags.
 * Materials whose name contains "lens" keep their (deliberately) lower roughness.
 */
export function applyRetroMaterialTuning(root, { castShadow = true, receiveShadow = true,
  roughness = [0.88, 0.94], metalness = [0.02, 0.18] } = {}) {
  const seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = castShadow;
    o.receiveShadow = receiveShadow;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      if ('flatShading' in m) m.flatShading = true;
      const glossyException = /lens/i.test(m.name || '');
      if (!glossyException && 'roughness' in m) m.roughness = THREE.MathUtils.clamp(m.roughness, roughness[0], roughness[1]);
      if ('metalness' in m) m.metalness = THREE.MathUtils.clamp(m.metalness, metalness[0], metalness[1]);
      for (const key of ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'aoMap']) {
        const t = m[key];
        if (!t) continue;
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        t.anisotropy = 1;
        t.needsUpdate = true;
      }
      m.needsUpdate = true;
    }
  });
  return root;
}

/**
 * Place an object on the ground (min y = 0) and optionally uniformly scale it so its height equals targetHeight.
 * Keeps x/z position. Returns the object.
 */
export function fitToGround(obj, targetHeight) {
  obj.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(obj);
  if (targetHeight && targetHeight > 0) {
    const h = box.max.y - box.min.y;
    if (h > 1e-6) obj.scale.multiplyScalar(targetHeight / h);
    obj.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(obj);
  }
  obj.position.y -= box.min.y;
  obj.updateMatrixWorld(true);
  return obj;
}

/** Parent the MCU-2/P mask onto a Braith instance at the head anchor. */
export async function attachMask(braith, gltfLoader) {
  const mask = await loadModel('braith_mcu2p_mask', gltfLoader);
  mask.position.fromArray(MODEL_CATALOG.braith_mcu2p_mask.anchor);
  mask.name = 'mcu2p_mask';
  braith.add(mask);
  return mask;
}

// ---------------------------------------------------------------------------------------------------
// Wave 2: NPC -> model resolution
// ---------------------------------------------------------------------------------------------------

/** Exact story/npcs.json `npcs[].id` -> MODEL_CATALOG key.  Use: `NPC_MODEL_MAP[npc.id]`. */
export const NPC_MODEL_MAP = Object.freeze({
  braith: 'braith_summer',          // player (Ch8+: attachMask or braith_with_mask preview)
  wraith: 'wraith_malinois',        // companion dog (creature, not humanoid)
  carly: 'carly', lolo: 'lolo', gil: 'gil', kit: 'kit', ross: 'ross',
  avila: 'avila', augie: 'augie', ames: 'ames', wes: 'wes', walt: 'walt',
  roz: 'roz', ander: 'ander', ruiz: 'ruiz', reyne: 'reyne',
});

/** Reusable archetypes by role (deterministically picked by resolveNpcModelId). */
export const ARCHETYPE_POOL = Object.freeze({
  civilian:  ['civ_summer_a', 'civ_summer_b', 'civ_elder'],
  neighbor:  ['civ_summer_a', 'civ_summer_b'],
  elder:     ['civ_elder'],
  trader:    ['trader_wanderer'],
  wanderer:  ['trader_wanderer'],
  scavenger: ['scavenger_runner'],
  runner:    ['scavenger_runner'],
  youth:     ['scavenger_runner', 'civ_summer_b'],
  guard:     ['guard_trooper', 'watch_militia'],
  soldier:   ['guard_trooper'],
  militia:   ['watch_militia', 'guard_trooper'],
  ambient:   ['civ_summer_a', 'civ_summer_b', 'civ_elder', 'scavenger_runner', 'trader_wanderer'],
});

/** Hand-picked archetypes for named secondary characters (npcs.json minor_characters / ambient_npcs / traders). */
export const SECONDARY_NPC_MODEL_MAP = Object.freeze({
  pruitt: 'civ_elder', deshawn: 'scavenger_runner', cpl_haas: 'guard_trooper', pete_lund: 'civ_summer_a',
  rosa: 'civ_summer_b', kessler: 'guard_trooper', sfc_brandt: 'guard_trooper',
  amb_brother_amos: 'civ_elder', amb_lonnie: 'civ_summer_a', amb_salt: 'trader_wanderer',
  amb_darlene: 'civ_summer_b', amb_bike_kids: 'scavenger_runner', amb_deputy_lusk: 'guard_trooper',
  amb_ruth: 'civ_elder', amb_pvt_marsh: 'guard_trooper', amb_tolliver: 'guard_trooper',
  trader_dutch: 'trader_wanderer', trader_mo: 'trader_wanderer', trader_rourke: 'trader_wanderer',
  trader_annie: 'trader_wanderer', trader_boone: 'trader_wanderer', trader_floor: 'civ_summer_b',
});

const ROLE_ALIASES = [
  [/guard|deputy|checkpoint|patrol|authority|ironwood|soldier|trooper|picket|pvt|cpl|sgt|sfc|maj/i, 'guard'],
  [/militia|watch/i, 'militia'],
  [/trader|merchant|vendor|pawn|prospect|hermit|wander/i, 'trader'],
  [/scav|runner|kid|teen|youth|courier|bridge|viaduct/i, 'runner'],
  [/elder|old|retire|grand|senior|resident/i, 'elder'],
  [/neighbor|civil|survivor|refugee|worker|crowd|ambient/i, 'civilian'],
];

function _hash(str) {           // FNV-1a 32-bit: stable across sessions and platforms
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/**
 * Resolve any NPC to a MODEL_CATALOG key, deterministically (same id -> same model every run):
 *   1. main cast / braith / wraith via NPC_MODEL_MAP,
 *   2. named secondaries via SECONDARY_NPC_MODEL_MAP,
 *   3. otherwise hash(id) into ARCHETYPE_POOL[role] (role string is fuzzy-matched; default 'ambient').
 * @param {string} id     npc id (e.g. 'carly', 'amb_ruth', 'crowd_17')
 * @param {string} [role] free-form role / faction hint (e.g. 'guard', 'trader', 'Ironwood checkpoint')
 * @returns {string} MODEL_CATALOG key
 */
export function resolveNpcModelId(id, role) {
  const key = String(id ?? '');
  if (NPC_MODEL_MAP[key]) return NPC_MODEL_MAP[key];
  if (SECONDARY_NPC_MODEL_MAP[key]) return SECONDARY_NPC_MODEL_MAP[key];
  let pool = ARCHETYPE_POOL[role];
  if (!pool) {
    const hint = `${role ?? ''} ${key}`;
    const hit = ROLE_ALIASES.find(([re]) => re.test(hint));
    pool = ARCHETYPE_POOL[hit ? hit[1] : 'ambient'];
  }
  return pool[_hash(key) % pool.length];
}

/** Convenience: resolve + load in one call.  `await loadNpcModel(npc.id, loader, npc.role)` */
export async function loadNpcModel(id, gltfLoader, role, opts) {
  const modelId = resolveNpcModelId(id, role);
  const obj = await loadModel(modelId, gltfLoader, opts);
  obj.userData.npcId = id;
  return obj;
}

// ---------------------------------------------------------------------------------------------------
// Animation (rigged characters + Wraith).  Clips are IN PLACE: bone "root" never moves; drive the
// object's position along your path and match playback to ground speed with clipTimeScale().
// ---------------------------------------------------------------------------------------------------

// <anim-catalog> generated by tools/build_all.py - do not edit by hand
// clips are in place (root bone fixed); *Speed = ground speed in m/s the clip was authored at (timeScale 1)
export const ANIMATIONS = Object.freeze({
  watch_militia:     { clips: ["idle", "walk", "run"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.945, runSpeed: 2.222, durations: { idle: 4.0, walk: 0.92, run: 0.7 } },
  carly:             { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.889, durations: { idle: 4.0, walk: 0.92 } },
  lolo:              { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.56, durations: { idle: 4.0, walk: 0.88 } },
  gil:               { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.932, durations: { idle: 4.0, walk: 0.92 } },
  kit:               { clips: ["idle", "walk", "run"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.886, runSpeed: 2.082, durations: { idle: 4.0, walk: 0.92, run: 0.7 } },
  ross:              { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.969, durations: { idle: 4.0, walk: 0.92 } },
  avila:             { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.915, durations: { idle: 4.0, walk: 0.92 } },
  augie:             { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.482, durations: { idle: 4.0, walk: 1.12 } },
  ames:              { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.963, durations: { idle: 4.0, walk: 0.92 } },
  wes:               { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.938, durations: { idle: 4.0, walk: 0.92 } },
  walt:              { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.479, durations: { idle: 4.0, walk: 1.12 } },
  roz:               { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.894, durations: { idle: 4.0, walk: 0.92 } },
  ander:             { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.953, durations: { idle: 4.0, walk: 0.92 } },
  ruiz:              { clips: ["idle", "walk", "run"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.9, runSpeed: 2.117, durations: { idle: 4.0, walk: 0.92, run: 0.7 } },
  reyne:             { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.909, durations: { idle: 4.0, walk: 0.92 } },
  civ_summer_a:      { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.937, durations: { idle: 4.0, walk: 0.92 } },
  civ_summer_b:      { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.873, durations: { idle: 4.0, walk: 0.92 } },
  civ_elder:         { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.479, durations: { idle: 4.0, walk: 1.12 } },
  trader_wanderer:   { clips: ["idle", "walk"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.949, durations: { idle: 4.0, walk: 0.92 } },
  scavenger_runner:  { clips: ["idle", "walk", "run"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.923, runSpeed: 2.17, durations: { idle: 4.0, walk: 0.92, run: 0.7 } },
  guard_trooper:     { clips: ["idle", "walk", "run"], bones: 18, skeleton: 'humanoid', walkSpeed: 0.958, runSpeed: 2.252, durations: { idle: 4.0, walk: 0.92, run: 0.7 } },
  wraith_malinois:   { clips: ["idle", "walk", "trot", "sit"], bones: 23, skeleton: 'quadruped', walkSpeed: 0.979, trotSpeed: 2.065, durations: { idle: 3.0, walk: 0.56, trot: 0.4, sit: 3.0 } },
});
export const HUMANOID_BONES = Object.freeze(["root", "hips", "spine", "chest", "neck", "head", "upperarm_L", "forearm_L", "hand_L", "upperarm_R", "forearm_R", "hand_R", "thigh_L", "shin_L", "foot_L", "thigh_R", "shin_R", "foot_R"]);
export const QUADRUPED_BONES = Object.freeze(["root", "pelvis", "spine", "chest", "neck", "head", "ear_L", "ear_R", "tail_1", "tail_2", "tail_3", "fl_upper_L", "fl_lower_L", "fl_paw_L", "fl_upper_R", "fl_lower_R", "fl_paw_R", "hl_thigh_L", "hl_shin_L", "hl_paw_L", "hl_thigh_R", "hl_shin_R", "hl_paw_R"]);
// </anim-catalog>

/** true if the model ships a skeleton + clips. */
export function isRigged(id) { return !!ANIMATIONS[id]; }

/** Clip names for a model id (e.g. ['idle','walk','run']); [] for static models. */
export function getClips(id) { return ANIMATIONS[id] ? ANIMATIONS[id].clips.slice() : []; }

/**
 * playback rate so the feet don't slide: clip authored at ANIMATIONS[id][clip+'Speed'] m/s.
 * e.g. action.timeScale = clipTimeScale('carly', 'walk', npcSpeed)
 */
export function clipTimeScale(id, clip, metersPerSecond) {
  const a = ANIMATIONS[id];
  const v = a && a[clip + 'Speed'];
  return v ? metersPerSecond / v : 1;
}

/**
 * Start (or cross-fade to) a looping clip on a rigged instance.
 * @param {THREE.AnimationMixer} mixer  one mixer per instance: new THREE.AnimationMixer(inst)
 * @param {THREE.Object3D} root         the instance returned by loadModel / loadNpcModel
 * @param {string} name                 'idle' | 'walk' | 'run' | 'trot' | 'sit'
 * @param {{fade?: number, timeScale?: number, loop?: boolean, offset?: number}} [opts]
 *        fade: cross-fade seconds (default 0.25); offset: start time (randomise per NPC to desync crowds)
 * @returns {THREE.AnimationAction|null}
 */
export function playClip(mixer, root, name, { fade = 0.25, timeScale = 1, loop = true, offset = 0 } = {}) {
  const clip = THREE.AnimationClip.findByName(root.animations || [], name);
  if (!clip) { console.warn(`[models] ${root.userData?.modelId ?? root.name}: no clip "${name}"`); return null; }
  const next = mixer.clipAction(clip, root);
  const prev = root.userData._clipAction;
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  next.clampWhenFinished = !loop;
  next.timeScale = timeScale;
  if (prev === next) { next.timeScale = timeScale; return next; }
  next.reset();
  if (offset) next.time = offset % clip.duration;
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.play();
  if (prev && fade > 0) prev.crossFadeTo(next, fade, false);
  else if (prev) prev.stop();
  root.userData._clipAction = next;
  return next;
}

// ---------------------------------------------------------------------------------------------------
// Environment set (env/): dead/frosted trees, bushes, alpha tuft cards, road/sidewalk/curb pieces,
// tiling ground textures and alpha decals.  Every env mesh = 1 geometry + 1 SHARED material = 1 draw call,
// ready for THREE.InstancedMesh.  Trees, bushes and tufts all share ONE 256 px atlas (env/textures/env_atlas.png)
// with 4 season bands; setEnvSeason() swaps every env mesh at once (no reload, no new materials).
//
//   import { makeEnvInstanced, envJitterMatrix, loadGroundTexture, setEnvSeason } from './models/registry.js?v=r15';
//   setEnvSeason('autumn');                                       // once per level (summer|autumn|late_fall|fallout_winter)
//   const trees = await makeEnvInstanced('env_tree_cottonwood_dead', 12);  // shared geometry + material
//   const m = new THREE.Matrix4();
//   for (let i = 0; i < 12; i++) trees.setMatrixAt(i, envJitterMatrix('env_tree_cottonwood_dead', x[i], z[i], rand, m));
//   trees.instanceMatrix.needsUpdate = true; trees.computeBoundingSphere(); scene.add(trees);
//   const tufts = await makeEnvTuftCards(600);                  // ONE draw call for mixed tuft types
//   tufts.setTuftAt(i, 'thistle', x, z, rand);                  // frame + jittered matrix per instance
//   const marks = await makeEnvDecals(200);                     // ONE draw call for every road marking / crack / pothole
//   marks.setDecalAt(i, 'lane_dash_yellow', x, z, yaw);         // frame + its metric size per instance
//   const road = new THREE.MeshStandardMaterial({ map: loadGroundTexture('env_tex_asphalt_cracked', { size: [8, 60] }) });
// ---------------------------------------------------------------------------------------------------
// <env-catalog> generated by tools/env.py (build_all.py) - do not edit by hand
// material: 'atlas' (opaque, env_atlas) | 'cutout' (env_atlas sprites, alphaTest) | 'ground' | 'decal'
export const ENV_CATALOG = Object.freeze({
  env_tree_cottonwood_dead:    { path: 'env/env_tree_cottonwood_dead.glb', kind: 'tree', material: 'atlas', texture: 'env_atlas', tris: 399, height: 6.611, radius: 5.841, frosted: false, collider: {"radius": 0.35, "height": 6.61, "solid": true}, variants: {"summer_sparse_leaf": 0, "autumn_leaf_drop": 1, "late_fall_bare_wet": 2, "fallout_frosted": 3}, jitter: {"scale": [0.85, 1.25], "rotY": "full", "tiltDeg": 3}, chapters: [1, 2, 3, 4, 5, 6, 7] },
  env_tree_pinyon_burnt:       { path: 'env/env_tree_pinyon_burnt.glb', kind: 'tree', material: 'atlas', texture: 'env_atlas', tris: 306, height: 3.643, radius: 3.951, frosted: false, collider: {"radius": 0.3, "height": 3.64, "solid": true}, variants: {"summer_charred": 0, "autumn_charred": 1, "late_fall_charred": 2, "fallout_frosted": 3}, jitter: {"scale": [0.8, 1.2], "rotY": "full", "tiltDeg": 4}, chapters: [5, 6, 7, 8, 9, 10] },
  env_tree_bare_frosted:       { path: 'env/env_tree_bare_frosted.glb', kind: 'tree', material: 'atlas', texture: 'env_atlas', tris: 394, height: 5.723, radius: 1.958, frosted: true, collider: {"radius": 0.3, "height": 5.72, "solid": true}, variants: {"fallout_frosted": 3}, jitter: {"scale": [0.85, 1.15], "rotY": "full", "tiltDeg": 2}, chapters: [8, 9, 10] },
  env_tree_snag_stump:         { path: 'env/env_tree_snag_stump.glb', kind: 'tree', material: 'atlas', texture: 'env_atlas', tris: 166, height: 2.924, radius: 1.567, frosted: false, collider: {"radius": 0.3, "height": 2.92, "solid": true}, variants: {"plain": 1, "summer": 0, "late_fall_wet": 2, "fallout_frosted": 3}, jitter: {"scale": [0.75, 1.25], "rotY": "full", "tiltDeg": 0}, chapters: [3, 4, 8, 9, 10] },
  env_bush_rabbitbrush:        { path: 'env/env_bush_rabbitbrush.glb', kind: 'bush', material: 'atlas', texture: 'env_atlas', tris: 242, height: 0.909, radius: 0.455, frosted: false, collider: {"radius": 0.0, "height": 0.91, "solid": false}, variants: {"summer_yellow_bloom": 0, "autumn_seedhead": 1, "late_fall_grey": 2, "fallout_frosted": 3}, jitter: {"scale": [0.7, 1.3], "rotY": "full", "tiltDeg": 5}, chapters: [1, 2, 3, 4, 7] },
  env_bush_tumbleweed:         { path: 'env/env_bush_tumbleweed.glb', kind: 'bush', material: 'atlas', texture: 'env_atlas', tris: 232, height: 0.581, radius: 0.387, frosted: false, collider: {"radius": 0.0, "height": 0.58, "solid": false}, variants: {"summer_tan": 0, "autumn_tan": 1, "late_fall_grey": 2, "fallout_frosted": 3}, jitter: {"scale": [0.7, 1.35], "rotY": "full", "tiltDeg": 25, "note": "any rotation works (it is a ball)"}, chapters: [3, 4, 5, 6, 7] },
  env_bush_frosted:            { path: 'env/env_bush_frosted.glb', kind: 'bush', material: 'atlas', texture: 'env_atlas', tris: 239, height: 0.905, radius: 0.983, frosted: true, collider: {"radius": 0.45, "height": 0.91, "solid": true}, variants: {"fallout_frosted": 3}, jitter: {"scale": [0.8, 1.25], "rotY": "full", "tiltDeg": 4}, chapters: [8, 9, 10] },
  env_tuft_cheatgrass:         { path: 'env/env_tuft_cheatgrass.glb', kind: 'tuft', material: 'cutout', texture: 'env_atlas', tris: 16, height: 0.32, radius: 0.298, frosted: false, collider: {"radius": 0.0, "height": 0.32, "solid": false}, variants: {"summer_straw": 0, "autumn_tan": 1, "late_fall_grey": 2, "fallout_frosted": 3}, jitter: {"scale": [0.7, 1.4], "rotY": "full", "tiltDeg": 6}, chapters: [1, 2, 3, 4] },
  env_tuft_weeds:              { path: 'env/env_tuft_weeds.glb', kind: 'tuft', material: 'cutout', texture: 'env_atlas', tris: 16, height: 0.34, radius: 0.27, frosted: false, collider: {"radius": 0.0, "height": 0.34, "solid": false}, variants: {"summer_dry_green": 0, "autumn_kochia_red": 1, "late_fall_brown": 2, "fallout_frosted": 3}, jitter: {"scale": [0.7, 1.4], "rotY": "full", "tiltDeg": 6}, chapters: [1, 2, 5, 6, 7] },
  env_tuft_frostgrass:         { path: 'env/env_tuft_frostgrass.glb', kind: 'tuft', material: 'cutout', texture: 'env_atlas', tris: 16, height: 0.24, radius: 0.21, frosted: false, collider: {"radius": 0.0, "height": 0.24, "solid": false}, variants: {"summer_dry": 0, "autumn_dry": 1, "late_fall_rime": 2, "fallout_buried_ash": 3}, jitter: {"scale": [0.7, 1.4], "rotY": "full", "tiltDeg": 6}, chapters: [5, 6, 7, 8, 9, 10] },
  env_tuft_thistle:            { path: 'env/env_tuft_thistle.glb', kind: 'tuft', material: 'cutout', texture: 'env_atlas', tris: 16, height: 0.46, radius: 0.203, frosted: false, collider: {"radius": 0.0, "height": 0.46, "solid": false}, variants: {"summer_dry": 0, "autumn_dry": 1, "late_fall_dry": 2, "fallout_frosted": 3}, jitter: {"scale": [0.7, 1.4], "rotY": "full", "tiltDeg": 6}, chapters: [3, 4, 8, 9, 10] },
  env_tuft_cards:              { path: 'env/env_tuft_cards.glb', kind: 'tuft', material: 'tuftcards', texture: 'env_atlas', tris: 16, height: 0.32, radius: 0.231, frosted: false, collider: {"radius": 0.0, "height": 0.32, "solid": false}, variants: {"summer": 0, "autumn": 1, "late_fall": 2, "fallout_winter": 3}, jitter: {"scale": [0.7, 1.4], "rotY": "full", "tiltDeg": 6, "note": "multiply by tuftFrames[f].scale"}, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  env_sidewalk_curb_strip:     { path: 'env/env_sidewalk_curb_strip.glb', kind: 'ground', material: 'ground', texture: 'env_tex_sidewalk_curb', tris: 12, height: 0.15, radius: 1.84, frosted: false, collider: {"radius": 0.0, "height": 0.15, "solid": false}, variants: {}, jitter: {"scale": [1, 1], "rotY": "snap 90 deg"}, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  env_sidewalk_curb_corner:    { path: 'env/env_sidewalk_curb_corner.glb', kind: 'ground', material: 'ground', texture: 'env_tex_sidewalk_curb', tris: 36, height: 0.15, radius: 3.3, frosted: false, collider: {"radius": 0.0, "height": 0.15, "solid": false}, variants: {}, jitter: {"scale": [1, 1], "rotY": "snap 90 deg"}, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  env_road_tile_4m:            { path: 'env/env_road_tile_4m.glb', kind: 'ground', material: 'ground', texture: 'env_tex_asphalt_cracked', tris: 2, height: 0.0, radius: 2.828, frosted: false, collider: {"radius": 0.0, "height": 0.0, "solid": false}, variants: {}, jitter: {"scale": [1, 1], "rotY": "snap 90 deg"}, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  env_road_2lane_8x4:          { path: 'env/env_road_2lane_8x4.glb', kind: 'ground', material: 'ground', texture: 'env_tex_asphalt_lanes', tris: 4, height: 0.0, radius: 4.472, frosted: false, collider: {"radius": 0.0, "height": 0.0, "solid": false}, variants: {}, jitter: {"scale": [1, 1], "rotY": "snap 90 deg"}, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  env_decal_atlas:             { path: 'env/env_decal_atlas.glb', kind: 'decal', material: 'decalatlas', texture: 'env_decal_atlas', tris: 2, height: 0.0, radius: 0.707, frosted: false, collider: {"radius": 0.0, "height": 0.02, "solid": false}, variants: {}, jitter: {"scale": [0.8, 1.25], "rotY": "full"}, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  sagebrush_clump:             { path: 'nature/sagebrush_clump.glb', kind: 'bush', material: 'atlas', texture: 'env_atlas', tris: 324, height: 1.041, radius: 0.562, frosted: false, collider: {"radius": 0.45, "height": 1.04, "solid": true}, variants: {"summer": 0, "autumn_dusty": 1, "late_fall_dusty": 2, "fallout_frosted": 3}, jitter: {"scale": [0.75, 1.3], "rotY": "full", "tiltDeg": 4}, chapters: [1, 2, 3, 4, 5, 7] },
});
export const ENV_TEXTURES = Object.freeze({
  env_tex_asphalt_cracked:     { path: 'env/textures/env_tex_asphalt_cracked.png', kind: 'ground', metersPerTile: [4.0, 4.0], wrap: 'repeat', alpha: false, px: 128 },
  env_tex_asphalt_lanes:       { path: 'env/textures/env_tex_asphalt_lanes.png', kind: 'ground', metersPerTile: [4.0, 4.0], wrap: 'repeat-v', alpha: false, px: 128 },
  env_tex_sidewalk:            { path: 'env/textures/env_tex_sidewalk.png', kind: 'ground', metersPerTile: [1.5, 1.5], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_curb:                { path: 'env/textures/env_tex_curb.png', kind: 'ground', metersPerTile: [1.0, 0.64], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_sidewalk_curb:       { path: 'env/textures/env_tex_sidewalk_curb.png', kind: 'ground', metersPerTile: [1.5, 1.5], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_dirt_ashy:           { path: 'env/textures/env_tex_dirt_ashy.png', kind: 'ground', metersPerTile: [4.0, 4.0], wrap: 'repeat', alpha: false, px: 128 },
  env_tex_snow:                { path: 'env/textures/env_tex_snow.png', kind: 'ground', metersPerTile: [4.0, 4.0], wrap: 'repeat', alpha: false, px: 128 },
  env_tex_gravel:              { path: 'env/textures/env_tex_gravel.png', kind: 'ground', metersPerTile: [2.0, 2.0], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_dirt_frozen:         { path: 'env/textures/env_tex_dirt_frozen.png', kind: 'ground', metersPerTile: [2.0, 2.0], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_asphalt_cracked_ash: { path: 'env/textures/env_tex_asphalt_cracked_ash.png', kind: 'ground', metersPerTile: [4.0, 4.0], wrap: 'repeat', alpha: false, px: 128 },
  env_tex_sidewalk_ash:        { path: 'env/textures/env_tex_sidewalk_ash.png', kind: 'ground', metersPerTile: [1.5, 1.5], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_curb_ash:            { path: 'env/textures/env_tex_curb_ash.png', kind: 'ground', metersPerTile: [1.0, 0.64], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_sidewalk_curb_ash:   { path: 'env/textures/env_tex_sidewalk_curb_ash.png', kind: 'ground', metersPerTile: [1.5, 1.5], wrap: 'repeat', alpha: false, px: 64 },
  env_tex_ash_overlay:         { path: 'env/textures/env_tex_ash_overlay.png', kind: 'overlay', metersPerTile: [2.0, 2.0], wrap: 'repeat', alpha: true, px: 128 },
  env_tex_snow_dust:           { path: 'env/textures/env_tex_snow_dust.png', kind: 'overlay', metersPerTile: [2.0, 2.0], wrap: 'repeat', alpha: true, px: 128 },
  env_decal_atlas:             { path: 'env/textures/env_decal_atlas.png', kind: 'decal_atlas', metersPerTile: null, wrap: 'clamp', alpha: true, px: 256 },
  env_atlas:                  { path: 'env/textures/env_atlas.png', kind: 'atlas', metersPerTile: null, wrap: 'repeat', alpha: true, px: 256 },
});
export const ENV_ATLAS = Object.freeze({ path: 'env/textures/env_atlas.png', size: 256, bandOffsetV: 0.25, seasons: ["summer", "autumn", "late_fall", "fallout_winter"] });
export const ENV_DECAL_FRAMES = Object.freeze({
  lane_dash_yellow:    { uvRect: [0.001953, 0.001953, 0.498047, 0.029297], size: [3.0, 0.12] },
  lane_edge_white:     { uvRect: [0.501953, 0.001953, 0.998047, 0.029297], size: [6.0, 0.12] },
  stop_line:           { uvRect: [0.001953, 0.033203, 0.498047, 0.091797], size: [3.6, 0.45] },
  lot_line_white:      { uvRect: [0.501953, 0.033203, 0.998047, 0.060547], size: [5.5, 0.1] },
  lane_double_yellow:  { uvRect: [0.501953, 0.064453, 0.998047, 0.123047], size: [6.0, 0.35] },
  crosswalk_bar:       { uvRect: [0.001953, 0.095703, 0.498047, 0.201172], size: [2.2, 0.45] },
  crack_a:             { uvRect: [0.001953, 0.251953, 0.248047, 0.498047], size: [1.6, 1.6] },
  crack_b:             { uvRect: [0.251953, 0.251953, 0.498047, 0.498047], size: [1.4, 1.4] },
  crack_web:           { uvRect: [0.501953, 0.251953, 0.748047, 0.498047], size: [1.9, 1.9] },
  patch:               { uvRect: [0.751953, 0.251953, 0.998047, 0.498047], size: [1.6, 1.6] },
  pothole:             { uvRect: [0.001953, 0.501953, 0.248047, 0.748047], size: [1.0, 1.0] },
  pothole_water:       { uvRect: [0.251953, 0.501953, 0.498047, 0.748047], size: [1.0, 1.0] },
  pothole_ash:         { uvRect: [0.501953, 0.501953, 0.748047, 0.748047], size: [1.0, 1.0] },
  manhole:             { uvRect: [0.751953, 0.501953, 0.998047, 0.748047], size: [0.8, 0.8] },
  snow_patch:          { uvRect: [0.001953, 0.751953, 0.248047, 0.998047], size: [1.6, 1.4] },
  ash_overlay:         { uvRect: [0.251953, 0.751953, 0.498047, 0.998047], size: [1.6, 1.4] },
  curb_drift:          { uvRect: [0.501953, 0.751953, 0.748047, 0.998047], size: [1.6, 0.8] },
  leaf_litter:         { uvRect: [0.751953, 0.751953, 0.998047, 0.998047], size: [1.2, 1.2] },
});
export const ENV_TUFT_FRAMES = Object.freeze({"cheatgrass": 0, "weeds": 1, "thistle": 2, "frostgrass": 3}); // per-instance tuftFrame; u stride 48/256
export const ENV_TUFT_FRAME_SCALE = Object.freeze({"cheatgrass": 1.0, "weeds": 1.05, "thistle": 1.4, "frostgrass": 0.75});
// </env-catalog>

export const ENV_SEASONS = Object.freeze(['summer', 'autumn', 'late_fall', 'fallout_winter']);
const _envGeo = new Map();       // id -> Promise<BufferGeometry> (shared by every mesh / InstancedMesh of that id)
const _envTex = new Map();       // texture id -> THREE.Texture (shared base texture)
const _envMat = new Map();       // material key -> THREE.Material (shared)
let _envLoaderP = null;
let _envSeasonBand = 0;
const _atlasBySeason = new Map(); // season -> atlas texture (same image Source, different v offset)
const DECAL_LIFT = 0.015;         // m; decal quads are lifted + polygonOffset so they never z-fight

function _envLoader(loader) {
  if (loader) return Promise.resolve(loader);
  if (!_envLoaderP) _envLoaderP = import('three/addons/loaders/GLTFLoader.js').then((m) => new m.GLTFLoader());
  return _envLoaderP;
}

function _retro(t, wrap) {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.anisotropy = 1;
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;                                  // glTF uv convention (v from the top), same as the GLB pieces
  const w = wrap === 'clamp' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapS = wrap === 'repeat-v' ? THREE.ClampToEdgeWrapping : w;
  t.wrapT = w;
  return t;                                         // no needsUpdate here: TextureLoader flags it once the image is in
}

const _envTexState = new Map();  // id -> { loaded, clones: [], promise }
function _envTexture(id) {
  if (!_envTex.has(id)) {
    const e = ENV_TEXTURES[id];
    if (!e) throw new Error(`[models] unknown env texture "${id}"`);
    const st = { loaded: false, clones: [], promise: null };
    let t;
    st.promise = new Promise((resolve, reject) => {
      t = new THREE.TextureLoader().load(new URL(e.path, BASE).href, () => {
        st.loaded = true;
        for (const c of st.clones) c.needsUpdate = true;   // clones share the image Source (one GPU upload)
        st.clones.length = 0;
        resolve(t);
      }, undefined, reject);
    });
    t.name = id;
    _envTexState.set(id, st);
    _envTex.set(id, _retro(t, e.wrap));
  }
  return _envTex.get(id);
}

/** Clone of a shared env texture (same Source); safe to create before the image has loaded. */
function _envTexClone(id) {
  const base = _envTexture(id);
  const t = base.clone();
  const st = _envTexState.get(id);
  if (!st.loaded) { t.version = 0; st.clones.push(t); }
  return t;
}

/** Resolves when every env texture requested so far has loaded (optional: await before the first frame). */
export function envTexturesReady() {
  return Promise.all([..._envTexState.values()].map((s) => s.promise));
}

/** Season-banded atlas texture (shares the image Source with every other season: one GPU upload). */
function _atlas(season) {
  const band = season == null ? -1 : ENV_SEASONS.indexOf(season);
  const key = band < 0 ? '__current' : season;
  if (!_atlasBySeason.has(key)) {
    const t = key === '__current' ? _envTexture('env_atlas') : _envTexClone('env_atlas');
    t.offset.set(0, (band < 0 ? _envSeasonBand : band) * ENV_ATLAS.bandOffsetV);   // uniform only: no re-upload
    _atlasBySeason.set(key, t);
  }
  return _atlasBySeason.get(key);
}

/**
 * Switch every env mesh that uses the default (shared) materials to a season band at once.
 * @param {'summer'|'autumn'|'late_fall'|'fallout_winter'} season   e.g. levels/index.json chapter.season
 */
export function setEnvSeason(season) {
  const band = ENV_SEASONS.indexOf(season);
  if (band < 0) throw new Error(`[models] unknown season "${season}"`);
  _envSeasonBand = band;
  if (_atlasBySeason.has('__current')) _atlasBySeason.get('__current').offset.set(0, band * ENV_ATLAS.bandOffsetV);
  return band;
}

/**
 * Shared material for an env id.  `season` pins an atlas material to one band regardless of setEnvSeason
 * (e.g. one frosted tree in an autumn level); omit it to follow setEnvSeason.  `texture` swaps a ground/decal
 * piece to another ENV_TEXTURES id with the same uv layout (asphalt -> asphalt_ash, sidewalk -> sidewalk_ash, ...).
 * Materials are cached per key, so every caller shares them.
 */
export function getEnvMaterial(id, { season, texture } = {}) {
  const e0 = ENV_CATALOG[id];
  if (!e0) throw new Error(`[models] unknown env id "${id}"`);
  // ground / decal pieces may swap to another texture with the same uv layout (e.g. 'env_tex_asphalt_lanes_ash')
  const e = texture && (e0.material === 'ground' || e0.material === 'decal') ? { ...e0, texture } : e0;
  const onAtlas = e.material === 'atlas' || e.material === 'cutout' || e.material === 'tuftcards';
  const pinned = onAtlas && season ? season : '';
  const key = `${e.material}|${onAtlas ? 'env_atlas' : e.texture}|${pinned}`;
  if (_envMat.has(key)) return _envMat.get(key);
  let m;
  if (e.material === 'atlas') {
    m = new THREE.MeshStandardMaterial({ map: _atlas(pinned || null), roughness: 0.9, metalness: 0.02, flatShading: true });
  } else if (e.material === 'cutout') {
    // alpha-tested (NOT blended): no sorting, no fringe; cards carry explicit back faces + up normals
    m = new THREE.MeshStandardMaterial({ map: _atlas(pinned || null), roughness: 0.92, metalness: 0.02, alphaTest: 0.5 });
  } else if (e.material === 'tuftcards') {
    m = new THREE.MeshStandardMaterial({ map: _atlas(pinned || null), roughness: 0.92, metalness: 0.02, alphaTest: 0.5 });
    _patchUv(m, 'tuftcards', 'attribute float tuftFrame;', `vMapUv.x += tuftFrame * ${ENV_TUFT_STRIDE_U.toFixed(6)};`);
  } else if (e.material === 'decalatlas') {
    m = new THREE.MeshStandardMaterial({ map: _envTexture(e.texture), roughness: 0.92, metalness: 0.02, alphaTest: 0.5,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    _patchUv(m, 'decalatlas', 'attribute vec4 uvRect;', 'vMapUv = uvRect.xy + uv * (uvRect.zw - uvRect.xy);');
  } else if (e.material === 'decal') {
    m = new THREE.MeshStandardMaterial({ map: _envTexture(e.texture), roughness: 0.92, metalness: 0.02, alphaTest: 0.5,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  } else {
    m = new THREE.MeshStandardMaterial({ map: _envTexture(e.texture), roughness: 0.92, metalness: 0.02 });
  }
  m.name = key;
  _envMat.set(key, m);
  return m;
}

const ENV_TUFT_STRIDE_U = 48 / 256;   // tuft sprite width in the atlas (u per tuftFrame)
/** inject a per-instance uv rule after three's <uv_vertex> chunk (map uv = vMapUv in r170) */
function _patchUv(m, tag, decl, rule) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${decl}`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\n${rule}\n#endif`);
  };
  m.customProgramCacheKey = () => `env_${tag}`;
}

/** Shared BufferGeometry of an env GLB (loaded once). */
export function loadEnvGeometry(id, gltfLoader) {
  if (!ENV_CATALOG[id]) return Promise.reject(new Error(`[models] unknown env id "${id}"`));
  if (!_envGeo.has(id)) {
    _envGeo.set(id, _envLoader(gltfLoader).then((loader) => loader.loadAsync(new URL(ENV_CATALOG[id].path, BASE).href))
      .then((gltf) => {
        let geo = null;
        gltf.scene.traverse((o) => {
          if (!o.isMesh || geo) return;
          geo = o.geometry;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mm of mats) { if (mm.map) mm.map.dispose(); mm.dispose(); }   // the shared env material replaces it
        });
        geo.computeBoundingSphere();
        geo.name = id;
        return geo;
      }));
  }
  return _envGeo.get(id);
}

function _envFlags(obj, kind) {
  obj.castShadow = kind === 'tree' || kind === 'bush';
  obj.receiveShadow = true;
  return obj;
}

/**
 * One env mesh (shared geometry + shared material).  For crowds of the same id use makeEnvInstanced().
 * @param {string} id   key of ENV_CATALOG (e.g. 'env_tree_cottonwood_dead')
 * @param {GLTFLoader} [gltfLoader]  optional; a private loader is created lazily if omitted
 * @param {{season?: string, texture?: string}} [opts]
 */
export async function loadEnvModel(id, gltfLoader, opts = {}) {
  const geo = await loadEnvGeometry(id, gltfLoader);
  const mesh = new THREE.Mesh(geo, getEnvMaterial(id, opts));
  mesh.name = id;
  mesh.userData.modelId = id;
  mesh.userData.catalog = ENV_CATALOG[id];
  return _envFlags(mesh, ENV_CATALOG[id].kind);
}

/**
 * InstancedMesh of `count` copies of an env id: 1 draw call for all of them.
 * Fill with setMatrixAt (see envJitterMatrix), then instanceMatrix.needsUpdate = true and computeBoundingSphere().
 * @param {string} id
 * @param {number} count
 * @param {{loader?: GLTFLoader, season?: string, texture?: string}} [opts]   texture: ground/decal swap (see getEnvMaterial)
 * @returns {Promise<THREE.InstancedMesh>}
 */
export async function makeEnvInstanced(id, count, { loader, season, texture } = {}) {
  const geo = await loadEnvGeometry(id, loader);
  const im = new THREE.InstancedMesh(geo, getEnvMaterial(id, { season, texture }), count);
  im.name = `${id}_x${count}`;
  im.userData.modelId = id;
  im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  return _envFlags(im, ENV_CATALOG[id].kind);
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
/**
 * Placement matrix with the catalogue's recommended jitter (scale range, random yaw or 90-deg snap, small tilt).
 * @param {string} id
 * @param {number} x  @param {number} z  world position (y = ground height, default 0)
 * @param {() => number} [rand]  seeded RNG for deterministic levels (default Math.random)
 * @param {THREE.Matrix4} [out]
 * @param {number} [y]
 */
export function envJitterMatrix(id, x, z, rand = Math.random, out = new THREE.Matrix4(), y = 0) {
  const j = ENV_CATALOG[id].jitter || {};
  const sc = j.scale ? j.scale[0] + (j.scale[1] - j.scale[0]) * rand() : 1;
  const yaw = j.rotY === 'full' ? rand() * Math.PI * 2 : (String(j.rotY || '').startsWith('snap') ? Math.floor(rand() * 4) * Math.PI / 2 : 0);
  const tilt = THREE.MathUtils.degToRad(j.tiltDeg || 0);
  _e.set((rand() * 2 - 1) * tilt, yaw, (rand() * 2 - 1) * tilt, 'YXZ');
  return out.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.setScalar(sc));
}

/**
 * Tiling ground / decal texture: RepeatWrapping (ClampToEdge for decals), NEAREST, no mipmaps, SRGB, flipY false.
 * Shared per id; pass `size: [widthM, depthM]` (or `repeat`) to get a clone whose repeat gives the correct
 * world scale on a PlaneGeometry(width, depth) (repeat = size / ENV_TEXTURES[id].metersPerTile).
 * @param {string} id   key of ENV_TEXTURES (e.g. 'env_tex_asphalt_lanes')
 * @param {{size?: [number, number], repeat?: [number, number]}} [opts]
 */
export function loadGroundTexture(id, { size, repeat } = {}) {
  if (!size && !repeat) return _envTexture(id);
  const t = _envTexClone(id);
  const mpt = ENV_TEXTURES[id].metersPerTile || [1, 1];
  const r = repeat || [size[0] / mpt[0], size[1] / mpt[1]];
  t.repeat.set(r[0], r[1]);                         // uniform only: shares the GPU texture with the base
  return t;
}

/**
 * Flat decal (or overlay) mesh lying on the ground: alphaTest 0.5 + polygonOffset, lifted 1.5 cm.
 * @param {string} texId   a tiling overlay ('env_tex_ash_overlay', 'env_tex_snow_dust') or a decal-atlas frame
 *                          ('pothole', 'env_decal_crack_a', 'stop_line' ... see ENV_DECAL_FRAMES)
 * @param {{width?: number, depth?: number}} [opts]   defaults to the texture's decal size; tiling overlays repeat
 */
export function makeEnvDecal(texId, { width, depth } = {}) {
  if (!ENV_TEXTURES[texId] && ENV_DECAL_FRAMES[String(texId).replace(/^env_decal_/, '')]) {
    return makeEnvDecalFrame(texId, { width, depth });
  }
  const e = ENV_TEXTURES[texId];
  if (!e) throw new Error(`[models] unknown env texture "${texId}"`);
  const w = width || e.metersPerTile[0], d = depth || e.metersPerTile[1];
  const key = `decalplane|${texId}|${e.wrap === 'clamp' ? '' : w + 'x' + d}`;
  let mat = _envMat.get(key);
  if (!mat) {
    const map = e.wrap === 'clamp' ? _envTexture(texId) : loadGroundTexture(texId, { size: [w, d] });
    mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0.02, alphaTest: 0.5,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mat.name = key;
    _envMat.set(key, mat);
  }
  const geo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(0, DECAL_LIFT, 0);
  const m = new THREE.Mesh(geo, mat);
  m.name = texId; m.receiveShadow = true;
  return m;
}

/** geometry view that shares the base attributes (no copy) so an instanced attribute can be added per mesh */
function _shareGeo(geo) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
  g.boundingSphere = geo.boundingSphere; g.name = geo.name;
  return g;
}

/**
 * Mixed tufts in ONE InstancedMesh / draw call (env_tuft_cards + per-instance 'tuftFrame').
 * @param {number} count
 * @param {{loader?: GLTFLoader, season?: string}} [opts]
 * @returns {Promise<THREE.InstancedMesh>}  with setTuftAt(i, frame, x, z, rand?, y?) and setFrameAt(i, frame);
 *   frame = 'cheatgrass' | 'weeds' | 'thistle' | 'frostgrass' or 0-3 (ENV_TUFT_FRAMES).  Call
 *   instanceMatrix.needsUpdate = true, tuftFrame needsUpdate (done by the setters) and computeBoundingSphere().
 */
export async function makeEnvTuftCards(count, { loader, season } = {}) {
  const g = _shareGeo(await loadEnvGeometry('env_tuft_cards', loader));
  const fr = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  g.setAttribute('tuftFrame', fr);
  const im = new THREE.InstancedMesh(g, getEnvMaterial('env_tuft_cards', { season }), count);
  im.name = `env_tuft_cards_x${count}`;
  im.userData.modelId = 'env_tuft_cards';
  const m4 = new THREE.Matrix4();
  im.setFrameAt = (i, f) => {
    const k = typeof f === 'number' ? f : ENV_TUFT_FRAMES[f];
    if (k === undefined) throw new Error(`[models] unknown tuft frame "${f}"`);
    fr.setX(i, k); fr.needsUpdate = true;
  };
  im.setTuftAt = (i, f, x, z, rand = Math.random, y = 0) => {
    im.setFrameAt(i, f);
    const name = typeof f === 'number' ? Object.keys(ENV_TUFT_FRAMES).find((n) => ENV_TUFT_FRAMES[n] === f) : f;
    envJitterMatrix('env_tuft_cards', x, z, rand, m4, y);
    m4.scale(_s.setScalar(ENV_TUFT_FRAME_SCALE[name] || 1));
    im.setMatrixAt(i, m4);
  };
  return _envFlags(im, 'tuft');
}

/**
 * Every decal in ONE InstancedMesh / draw call: env_decal_atlas unit quad + per-instance 'uvRect' (ENV_DECAL_FRAMES).
 * @param {number} count
 * @returns {Promise<THREE.InstancedMesh>} with setDecalAt(i, frame, x, z, yaw = 0, scale = 1, y = 0)
 *   (scales the unit quad to the frame's metric size; long axis = local X) and setFrameAt(i, frame).
 */
export async function makeEnvDecals(count, { loader } = {}) {
  const g = _shareGeo(await loadEnvGeometry('env_decal_atlas', loader));
  const rect = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  g.setAttribute('uvRect', rect);
  const im = new THREE.InstancedMesh(g, getEnvMaterial('env_decal_atlas'), count);
  im.name = `env_decals_x${count}`;
  im.userData.modelId = 'env_decal_atlas';
  im.castShadow = false; im.receiveShadow = true;
  im.setFrameAt = (i, f) => {
    const fr = ENV_DECAL_FRAMES[String(f).replace(/^env_decal_/, '')];
    if (!fr) throw new Error(`[models] unknown decal frame "${f}"`);
    rect.setXYZW(i, ...fr.uvRect); rect.needsUpdate = true;
    return fr;
  };
  im.setDecalAt = (i, f, x, z, yaw = 0, scale = 1, y = 0) => {
    const fr = im.setFrameAt(i, f);
    _e.set(0, yaw, 0);
    im.setMatrixAt(i, new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e),
      _s.set(fr.size[0] * scale, 1, fr.size[1] * scale)));
  };
  return im;
}

/**
 * Single decal mesh for one atlas frame (uvs baked, shares the env_decal_atlas material), e.g. 'pothole_water',
 * 'stop_line', 'env_decal_crack_web'.  Many of them: use makeEnvDecals().
 * @param {string} frame  key of ENV_DECAL_FRAMES (optional 'env_decal_' prefix)
 * @param {{width?: number, depth?: number}} [opts]  default = the frame's metric size
 */
export function makeEnvDecalFrame(frame, { width, depth } = {}) {
  const name = String(frame).replace(/^env_decal_/, '');
  const fr = ENV_DECAL_FRAMES[name];
  if (!fr) throw new Error(`[models] unknown decal frame "${frame}"`);
  const geo = new THREE.PlaneGeometry(width || fr.size[0], depth || fr.size[1]).rotateX(-Math.PI / 2).translate(0, 0.02, 0);
  const uv = geo.attributes.uv; const [u0, v0, u1, v1] = fr.uvRect;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + (1 - uv.getY(i)) * (v1 - v0));
  const key = 'decalframe|env_decal_atlas';
  let mat = _envMat.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ map: _envTexture('env_decal_atlas'), roughness: 0.92, metalness: 0.02,
      alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mat.name = key; _envMat.set(key, mat);
  }
  const m = new THREE.Mesh(geo, mat);
  m.name = `env_decal_${name}`; m.receiveShadow = true;
  return m;
}
