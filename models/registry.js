// Ashfall model registry (Wave 1 prototypes + Wave 2 main cast & archetypes).
// ES module for the game engine. Uses the same three.js r170 the game loads through its import map:
//   "three": "./vendor/three/three.module.js", "three/addons/": "./vendor/three/addons/"
//
//   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
//   import { loadModel, fitToGround } from './models/registry.js?v=r13';
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
      return root;
    }));
  }
  const src = await _cache.get(id);
  const inst = src.clone(true);   // geometry/materials shared; transforms independent
  return inst;
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
