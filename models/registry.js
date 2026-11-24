// Ashfall model registry (Wave 1 prototypes).
// ES module for the game engine. Uses the same three.js r170 the game loads through its import map:
//   "three": "./vendor/three/three.module.js?v=r9", "three/addons/": "./vendor/three/addons/"
//
//   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
//   import { loadModel, fitToGround } from './models/registry.js?v=r9';
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
