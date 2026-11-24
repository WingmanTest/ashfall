// Sculptor Wave 1 GLB bridge: one shared GLTFLoader, registry template cache
// (load once, clone per use), retro material tuning, and "shared asset" marks so
// World.clearLevel() never disposes geometry/materials owned by a cached template.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_CATALOG, loadModel, fitToGround, modelUrl, attachMask as regAttachMask, resolveNpcModelId } from "../models/registry.js?v=r12";

let _loader = null;
const _ready = new Map();   // id -> template-loaded boolean
const _failed = new Set();
export const modelStats = { requested: {}, loaded: {}, failed: {}, instances: {} };

export function gltfLoader() {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

function markShared(root) {
  root.traverse((o) => {
    o.userData.sharedAsset = true;
    if (o.isMesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        for (const k of ["map", "emissiveMap", "roughnessMap", "metalnessMap", "normalMap", "aoMap"]) {
          const t = m[k];
          if (t) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
        }
      }
    }
  });
  return root;
}

/** Fresh clone of a catalogued model (null on failure; never throws). */
export async function getModel(id, { castShadow = false, receiveShadow = true } = {}) {
  if (!MODEL_CATALOG[id] || _failed.has(id)) return null;
  modelStats.requested[id] = (modelStats.requested[id] || 0) + 1;
  try {
    const inst = await loadModel(id, gltfLoader(), { castShadow, receiveShadow });
    _ready.set(id, true);
    modelStats.loaded[id] = true;
    modelStats.instances[id] = (modelStats.instances[id] || 0) + 1;
    return markShared(inst);
  } catch (err) {
    _failed.add(id);
    modelStats.failed[id] = String(err && err.message || err);
    console.warn("[models] load failed", id, err);
    return null;
  }
}


/** Resolve an NPC id (story / ambient / trader / crowd) to a catalog model and clone it. */
export async function getNpcModel(id, role, opts) {
  const modelId = resolveNpcModelId(id, role);
  const inst = await getModel(modelId, opts);
  if (!inst) return null;
  inst.userData.npcId = id;
  inst.userData.model = modelId;
  return inst;
}

export function preloadModels(ids) {
  return Promise.all(ids.map((id) => getModel(id).then((m) => !!m)));
}

export async function attachBraithMask(braith) {
  try {
    const mask = await regAttachMask(braith, gltfLoader());
    markShared(mask);
    modelStats.loaded.braith_mcu2p_mask = true;
    return mask;
  } catch (err) {
    modelStats.failed.braith_mcu2p_mask = String(err && err.message || err);
    console.warn("[models] mask failed", err);
    return null;
  }
}

/** Hide/show the ball cap primitives on a Braith instance (cap off when masked). */
export function setCapVisible(braith, on) {
  braith.traverse((o) => {
    if (!o.isMesh) return;
    const n = (o.material && o.material.name) || "";
    if (/^cap/.test(n)) o.visible = !!on;
  });
}

export function modelsDebug() {
  return { ...modelStats, catalog: Object.keys(MODEL_CATALOG) };
}

export { MODEL_CATALOG, fitToGround, modelUrl, resolveNpcModelId };

if (typeof window !== "undefined") window.__ASHFALL_MODELS = { debug: modelsDebug };
