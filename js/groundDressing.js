// Ground dressing v2: roads, curbs, decals, instanced vegetation from
// levels/ground_previews/<id>.ground.json. Optional — a missing overlay is a no-op.
import * as THREE from "three";
import {
  setEnvSeason, makeEnvInstanced, makeEnvTuftCards, makeEnvDecals, makeEnvDecal,
  loadGroundTexture,
} from "../models/registry.js?v=r15.1";
import { gltfLoader } from "./models3d.js?v=r15.1";

const KNOWN_OVERLAYS = new Set(['ch01_day_three', 'ch02_the_registry', 'ch03_the_long_cold', 'ch04_black_start', 'ch05_route_9', 'ch06_the_trench', 'ch07_dead_air', 'ch07b_dixie_valley', 'ch08_ashfall', 'ch09_the_long_night', 'ch10_the_warm_room']);

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _tmp = new THREE.Matrix4();

export async function loadGroundOverlay(levelId) {
  if (!levelId || !KNOWN_OVERLAYS.has(levelId)) return null;
  const url = `./levels/ground_previews/${levelId}.ground.json`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || data.formatVersion !== 2) return null;
    return data;
  } catch (err) {
    console.warn("[ground] overlay fetch failed", url, err);
    return null;
  }
}

export function floorSkipSet(overlay) {
  const s = new Set();
  for (const pair of overlay?.roads?.floorSkipCells || []) {
    if (Array.isArray(pair) && pair.length >= 2) s.add(pair[0] + "," + pair[1]);
  }
  return s;
}

export function decorateFloorMaterial(ch, mat, overlay, cellSize) {
  const gt = overlay?.groundTextures?.[ch];
  if (!gt?.texture || !mat) return mat;
  try {
    const mpt = gt.metersPerTile || [cellSize, cellSize];
    const map = loadGroundTexture(gt.texture, { size: [cellSize, cellSize] });
    mat.map = map;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  } catch (err) {
    console.warn("[ground] floor tex", ch, err);
  }
  return mat;
}

function composeRow(x, y, z, rotY, scale, tiltX, tiltZ) {
  _e.set(tiltX || 0, rotY || 0, tiltZ || 0, "YXZ");
  const sc = scale == null ? 1 : scale;
  return _m.compose(_p.set(x, y || 0, z), _q.setFromEuler(_e), _s.set(sc, sc, sc)).clone();
}

async function placeInstances(overlay, group, world, cull) {
  const inst = overlay.instances || {};
  for (const [id, rec] of Object.entries(inst)) {
    const rows = rec.data || [];
    const count = rec.count || rows.length;
    if (!count || !rows.length) continue;
    const fields = rec.fields || ["x", "z", "rotY", "scale", "tiltX", "tiltZ"];
    const idx = Object.fromEntries(fields.map((f, i) => [f, i]));
    const isTuft = id === "env_tuft_cards" || rec.role === "tuft";
    const isBush = /bush|sagebrush|tumbleweed|rabbitbrush/i.test(id) || rec.role === "bush";
    let mesh;
    try {
      if (isTuft) mesh = await makeEnvTuftCards(count, { loader: gltfLoader() });
      else mesh = await makeEnvInstanced(id, count, rec.texture ? { texture: rec.texture, loader: gltfLoader() } : { loader: gltfLoader() });
    } catch (err) {
      console.warn("[ground] instance", id, err);
      continue;
    }
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const x = row[idx.x], z = row[idx.z];
      const rotY = row[idx.rotY] || 0;
      const scale = idx.scale != null ? row[idx.scale] : 1;
      const tiltX = idx.tiltX != null ? row[idx.tiltX] : 0;
      const tiltZ = idx.tiltZ != null ? row[idx.tiltZ] : 0;
      const mat = composeRow(x, 0, z, rotY, scale, tiltX, tiltZ);
      mesh.setMatrixAt(i, mat);
      if (isTuft && idx.tuftFrame != null) {
        try { mesh.setFrameAt(i, row[idx.tuftFrame]); } catch (err) { console.warn("[ground] tuft frame", err); }
      }
      // r15.1: vegetation is decorative — do not add plant AABBs (they trapped the player).
      if (isTuft || isBush) items.push({ x, z, matrix: mat, frame: isTuft && idx.tuftFrame != null ? row[idx.tuftFrame] : null });
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere?.();
    mesh.frustumCulled = false;
    if (items.length) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (isTuft) mesh.castShadow = false;
    mesh.userData.kind = isTuft ? "tuft" : (rec.solid ? "plant" : "bush");
    mesh.userData.groundDressing = true;
    group.add(mesh);
    if (items.length) {
      cull.push({ mesh, items, cullM: rec.cullM || (isTuft ? 22 : 40), isTuft });
    }
  }
}

async function placePieces(overlay, group) {
  const pieces = overlay.roads?.pieces || {};
  for (const [id, rec] of Object.entries(pieces)) {
    const rows = rec.data || [];
    const count = rec.count || rows.length;
    if (!count || !rows.length) continue;
    const fields = rec.fields || ["x", "z", "rotY"];
    const idx = Object.fromEntries(fields.map((f, i) => [f, i]));
    let mesh;
    try {
      mesh = await makeEnvInstanced(id, count, rec.texture ? { texture: rec.texture, loader: gltfLoader() } : { loader: gltfLoader() });
    } catch (err) {
      console.warn("[ground] piece", id, err);
      continue;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lift = idx.lift != null ? row[idx.lift] : 0;
      const y = lift ? 0.004 : 0;
      mesh.setMatrixAt(i, composeRow(row[idx.x], y, row[idx.z], row[idx.rotY] || 0, 1, 0, 0));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere?.();
    mesh.frustumCulled = false;
    mesh.userData.kind = "road_piece";
    mesh.userData.groundDressing = true;
    group.add(mesh);
  }
}

async function placeDecals(overlay, group) {
  const dec = overlay.roads?.decals;
  if (!dec) return;
  const rows = dec.data || (Array.isArray(dec) ? dec : []);
  const count = dec.count || rows.length;
  if (!count || !rows.length) return;
  const fields = dec.fields || ["x", "z", "rotY", "sizeX", "sizeZ", "frame"];
  const idx = Object.fromEntries(fields.map((f, i) => [f, i]));
  let mesh;
  try {
    mesh = await makeEnvDecals(count, { loader: gltfLoader() });
  } catch (err) {
    console.warn("[ground] decals", err);
    return;
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try { mesh.setFrameAt(i, row[idx.frame]); } catch (err) { console.warn("[ground] decal frame", row[idx.frame], err); }
    _e.set(0, row[idx.rotY] || 0, 0);
    mesh.setMatrixAt(i, _tmp.compose(
      _p.set(row[idx.x], 0, row[idx.z]),
      _q.setFromEuler(_e),
      _s.set(row[idx.sizeX] || 1, 1, row[idx.sizeZ] || 1),
    ).clone());
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere?.();
  mesh.frustumCulled = false;
  mesh.userData.kind = "decal";
  mesh.userData.groundDressing = true;
  group.add(mesh);
}

function placeGroundOverlays(overlay, group) {
  for (const entry of overlay.groundOverlays || []) {
    if (!entry?.texture || !entry.rects?.length) continue;
    try {
      const mpt = entry.metersPerTile;
      const mptX = Array.isArray(mpt) ? mpt[0] : (mpt || 8);
      const mptZ = Array.isArray(mpt) ? mpt[1] : (mpt || 8);
      const y = entry.y ?? 0.03;
      const proto = makeEnvDecal(entry.texture, { width: mptX, depth: mptZ });
      const mat = proto.material;
      const pos = [], uv = [], idx = [];
      let base = 0;
      for (const rect of entry.rects) {
        const [x0, z0, x1, z1] = rect;
        const u = (x1 - x0) / mptX, v = (z1 - z0) / mptZ;
        pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
        uv.push(0, 0, u, 0, u, v, 0, v);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        base += 4;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = "ground_overlay_" + entry.texture;
      mesh.userData.kind = "ground_overlay";
      mesh.userData.groundDressing = true;
      group.add(mesh);
    } catch (err) {
      console.warn("[ground] overlay plane", entry.texture, err);
    }
  }
}

export async function applyGroundDressing(runtime, overlay, group, world) {
  runtime._groundCull = [];
  runtime._groundOverlay = overlay || null;
  if (!overlay) return null;
  try {
    if (overlay.season) setEnvSeason(overlay.season);
  } catch (err) {
    console.warn("[ground] setEnvSeason", overlay.season, err);
  }
  await placeInstances(overlay, group, world, runtime._groundCull);
  await placePieces(overlay, group);
  await placeDecals(overlay, group);
  placeGroundOverlays(overlay, group);
  return overlay;
}

export function tickGroundDressing(runtime, player, dt) {
  const list = runtime?._groundCull;
  if (!list || !list.length || !player) return;
  runtime._groundCullT = (runtime._groundCullT || 0) + (dt || 0);
  if (runtime._groundCullT < 0.25) return;
  runtime._groundCullT = 0;
  const px = player.x, pz = player.z;
  for (const rec of list) {
    const mesh = rec.mesh;
    if (!mesh || !mesh.isInstancedMesh) continue;
    const r2 = (rec.cullM || 22) * (rec.cullM || 22);
    let n = 0;
    for (const it of rec.items) {
      const dx = it.x - px, dz = it.z - pz;
      if (dx * dx + dz * dz > r2) continue;
      mesh.setMatrixAt(n, it.matrix);
      if (rec.isTuft && it.frame != null && mesh.setFrameAt) {
        try { mesh.setFrameAt(n, it.frame); } catch {}
      }
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (n) mesh.computeBoundingSphere?.();
  }
}

export function replacesSagebrush(overlay) {
  return !!(overlay && overlay.replacesBuiltin && overlay.replacesBuiltin.sagebrushScatter);
}
