// Visual dressing for Cartographer solid tiles. Colliders stay merged AABBs.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { fitHeight } from "./world.js?v=r16.1";

export const KENNEY_BUILDINGS = [
  "assets/kenney/industrial/building-a.glb",
  "assets/kenney/industrial/building-b.glb",
  "assets/kenney/industrial/building-c.glb",
  "assets/kenney/industrial/building-d.glb",
  "assets/kenney/industrial/building-e.glb",
  "assets/kenney/industrial/building-f.glb",
  "assets/kenney/industrial/building-h.glb",
  "assets/kenney/industrial/building-k.glb",
  "assets/kenney/industrial/building-m.glb",
  "assets/kenney/industrial/building-s.glb",
  "assets/kenney/industrial/building-r.glb",
  "assets/kenney/industrial/building-t.glb",
  "assets/kenney/industrial/building-p.glb",
];

export function pbrMat(pbr, color = 0xffffff, extras = {}) {
  if (!pbr) return new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extras });
  const m = new THREE.MeshStandardMaterial({
    map: pbr.diff || null,
    roughness: extras.roughness ?? 0.86, color, ...extras,
  });
  if (pbr.nor) m.normalMap = pbr.nor;
  if (pbr.rough) m.roughnessMap = pbr.rough;
  if (m.map) { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.anisotropy = 1; }
  if (m.normalMap) { m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping; }
  if (m.roughnessMap) { m.roughnessMap.wrapS = m.roughnessMap.wrapT = THREE.RepeatWrapping; }
  return m;
}

/** Repeat UVs in world metres so brick/metal doesn't stretch across a long merged wall. */
export function applyWorldUV(geo, tile = 2) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  let uv = geo.attributes.uv;
  if (!uv) {
    uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    geo.setAttribute("uv", uv);
  }
  if (!nrm) geo.computeVertexNormals();
  const N = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    let u, v;
    if (Math.abs(ny) >= Math.abs(nx) && Math.abs(ny) >= Math.abs(nz)) {
      u = x / tile; v = z / tile;
    } else if (Math.abs(nx) >= Math.abs(nz)) {
      u = z / tile; v = y / tile;
    } else {
      u = x / tile; v = y / tile;
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geo;
}

export function boxMesh(w, h, d, mat, tile = 2) {
  const geo = new THREE.BoxGeometry(w, h, d);
  applyWorldUV(geo, tile);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = h >= 1.2;
  m.receiveShadow = true;
  return m;
}

export function snowCap(w, d, y, mat, lift = 0.08) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, lift, d + 0.12), mat);
  m.position.y = y + lift * 0.5;
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

function hash(n) {
  let h = (n * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Window / door / boarded variation on a wall face (low poly). */
export function addFacadeDetails(group, { minX, maxX, minZ, maxZ, h, y0 = 0 }, mats) {
  if (h < 2.2) return;
  const w = maxX - minX, d = maxZ - minZ;
  const longX = w >= d;
  const len = longX ? w : d;
  if (len < 2.2) return;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const faces = longX
    ? [{ nx: 0, nz: 1, len: w }, { nx: 0, nz: -1, len: w }]
    : [{ nx: 1, nz: 0, len: d }, { nx: -1, nz: 0, len: d }];
  const winMat = mats.window || new THREE.MeshStandardMaterial({
    color: 0x1a2228, roughness: 0.25, metalness: 0.15, emissive: 0x1a1408, emissiveIntensity: 0.12,
  });
  const boardMat = mats.board || new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 });
  const doorMat = mats.door || new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 });
  const frameMat = mats.frame || new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.8 });

  for (const f of faces) {
    const seed = (cx * 13 + cz * 17 + f.nx * 3 + f.nz * 5) | 0;
    const nWin = Math.max(1, Math.min(4, Math.floor(f.len / 2.6)));
    const faceX = cx + f.nx * (w / 2 + 0.03);
    const faceZ = cz + f.nz * (d / 2 + 0.03);
    // Door on the first long face of ground-floor walls
    if (h >= 2.6 && f.len >= 3.2 && hash(seed) > 0.35) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.85, 0.08), doorMat);
      const along = (hash(seed + 3) - 0.5) * (f.len * 0.4);
      if (f.nx === 0) { door.position.set(cx + along, y0 + 0.95, faceZ); door.rotation.y = 0; }
      else { door.position.set(faceX, y0 + 0.95, cz + along); door.rotation.y = Math.PI / 2; }
      group.add(door);
    }
    const rows = h >= 6 ? 2 : 1;
    for (let row = 0; row < rows; row++) {
      const wy = y0 + 1.55 + row * Math.min(2.6, (h - 2.2) / rows);
      if (wy + 0.5 > y0 + h) continue;
      for (let i = 0; i < nWin; i++) {
        const t = (i + 0.5) / nWin - 0.5;
        const along = t * (f.len - 1.1);
        const boarded = hash(seed + i * 17 + row * 9) > 0.62;
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.86, 0.06),
          boarded ? boardMat : winMat
        );
        if (f.nx === 0) win.position.set(cx + along, wy, faceZ);
        else win.position.set(faceX, wy, cz + along);
        if (f.nx !== 0) win.rotation.y = Math.PI / 2;
        group.add(win);
        if (!boarded && hash(seed + i + 40) > 0.7) {
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.07), frameMat);
          lintel.position.copy(win.position);
          lintel.position.y += 0.48;
          lintel.rotation.copy(win.rotation);
          group.add(lintel);
        }
      }
    }
  }
}

/** Greedy rectangles of tiles matching `want`. */
export function greedyRects(tiles, legend, want) {
  const rows = tiles.length, cols = tiles[0].length;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const out = [];
  const ok = (r, c) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || seen[r][c]) return false;
    const ch = tiles[r][c];
    return want(ch, legend[ch] || {});
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!ok(r, c)) continue;
      let c2 = c;
      while (ok(r, c2 + 1)) c2++;
      let r2 = r;
      grow: while (r2 + 1 < rows) {
        for (let cc = c; cc <= c2; cc++) if (!ok(r2 + 1, cc)) break grow;
        r2++;
      }
      for (let rr = r; rr <= r2; rr++) for (let cc = c; cc <= c2; cc++) seen[rr][cc] = true;
      out.push({ r, c, r2, c2, ch: tiles[r][c] });
    }
  }
  return out;
}

export function rectWorld(rect, origin, cs) {
  const minX = origin.x + rect.c * cs;
  const maxX = origin.x + (rect.c2 + 1) * cs;
  const minZ = origin.z + rect.r * cs;
  const maxZ = origin.z + (rect.r2 + 1) * cs;
  return {
    minX, maxX, minZ, maxZ,
    w: maxX - minX, d: maxZ - minZ,
    cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
  };
}

export async function stampBuildings(rect, world, group, origin, cs, snowMat, opts = {}) {
  const box = rectWorld(rect, origin, cs);
  if (opts.skip && opts.skip(box, rect)) return "reserved";
  const tryGLB = world.tryGLB;
  if (!tryGLB) return false;
  const longX = box.w >= box.d;
  const long = Math.max(box.w, box.d);
  const short = Math.min(box.w, box.d);
  const count = Math.max(1, Math.min(3, Math.round(long / 9)));
  const step = long / count;
  let placed = 0;
  for (let i = 0; i < count; i++) {
    const seed = ((rect.r * 131 + rect.c * 17 + i * 29) | 0);
    const path = KENNEY_BUILDINGS[Math.floor(hash(seed) * KENNEY_BUILDINGS.length)];
    let src = world.prefabs[path];
    if (!src && tryGLB) {
      src = await tryGLB("./" + path);
      if (src) world.prefabs[path] = src;
    }
    if (!src) continue;
    const obj = (src.scene || src).clone(true);
    const h = 6.5 + hash(seed + 4) * 4;
    fitHeight(obj, h);
    let x = box.cx, z = box.cz;
    if (longX) x = box.minX + (i + 0.5) * step;
    else z = box.minZ + (i + 0.5) * step;
    obj.position.set(x, 0, z);
    // Face the longer outer side; slight yaw jitter.
    obj.rotation.y = (longX ? Math.PI / 2 : 0) + (hash(seed + 8) - 0.5) * 0.08;
    const targetW = (longX ? step : short) * 0.92;
    const targetD = (longX ? short : step) * 0.92;
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj);
    const bw = Math.max(0.4, b.max.x - b.min.x);
    const bd = Math.max(0.4, b.max.z - b.min.z);
    const sx = Math.max(0.15, Math.min(1.6, targetW / bw));
    const sz = Math.max(0.15, Math.min(1.6, targetD / bd));
    obj.scale.x *= sx;
    obj.scale.z *= sz;
    obj.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(obj);
    let dx = 0, dz = 0;
    const pad = 0.12;
    if (b2.min.x < box.minX + pad) dx = (box.minX + pad) - b2.min.x;
    if (b2.max.x > box.maxX - pad) dx = (box.maxX - pad) - b2.max.x;
    if (b2.min.z < box.minZ + pad) dz = (box.minZ + pad) - b2.min.z;
    if (b2.max.z > box.maxZ - pad) dz = (box.maxZ - pad) - b2.max.z;
    obj.position.x += dx; obj.position.z += dz;
    obj.userData.kind = "building";
    dressMeshPBR(obj, pickPbr(world, seed), 2);
    group.add(obj);
    world.farProps.push(obj);
    if (snowMat) {
      const cap = snowCap(targetW, targetD, h - 0.15, snowMat, 0.1);
      cap.position.x = x;
      cap.position.z = z;
      group.add(cap);
    }
    placed++;
  }
  return placed > 0;
}

function pickPbr(world, seed) {
  const mats = world.mats || {};
  const r = hash(seed + 11);
  if (r < 0.45) return mats.brick;
  if (r < 0.7) return mats.concrete;
  if (r < 0.88) return mats.corr;
  return mats.rustc || mats.rust || mats.brick;
}

/** Apply Poly Haven PBR and metre-scale UVs to a placed GLB so kit walls aren't flat gray. */
export function dressMeshPBR(root, pbr, tile = 2) {
  if (!pbr) return;
  root.updateMatrixWorld(true);
  const tmp = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.material = pbrMat(pbr, 0xf3e6d8);
    o.geometry = o.geometry.clone();
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const N = geo.attributes.normal;
    if (!pos) return;
    if (!N) geo.computeVertexNormals();
    const NN = geo.attributes.normal;
    let uv = geo.attributes.uv;
    if (!uv) {
      uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
      geo.setAttribute("uv", uv);
    }
    o.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (NN) nrm.fromBufferAttribute(NN, i).transformDirection(o.matrixWorld);
      else nrm.set(0, 1, 0);
      let u, v;
      if (Math.abs(nrm.y) >= Math.abs(nrm.x) && Math.abs(nrm.y) >= Math.abs(nrm.z)) {
        u = tmp.x / tile; v = tmp.z / tile;
      } else if (Math.abs(nrm.x) >= Math.abs(nrm.z)) {
        u = tmp.z / tile; v = tmp.y / tile;
      } else {
        u = tmp.x / tile; v = tmp.y / tile;
      }
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
  });
}

/**
 * Collapse many small same-size BoxGeometry meshes (windows, doors, lintels)
 * into one InstancedMesh per (material, size). Cuts hundreds of draw calls
 * on dressed streets without changing how the facades look.
 */
export function instanceSmallBoxes(group, maxDim = 2.2) {
  if (!group) return 0;
  const buckets = new Map();
  for (const o of group.children) {
    if (!o || !o.isMesh || o.isInstancedMesh) continue;
    if (o.userData && (o.userData.kind || o.userData.groundDressing || o.userData.sharedAsset || o.userData.modelId)) continue;
    const geo = o.geometry;
    if (!geo || geo.type !== "BoxGeometry" || !geo.parameters) continue;
    const { width, height, depth } = geo.parameters;
    if (Math.max(width, height, depth) > maxDim) continue;
    const mat = o.material;
    if (!mat || Array.isArray(mat)) continue;
    const key = mat.uuid + "|" + width + "|" + height + "|" + depth;
    let b = buckets.get(key);
    if (!b) {
      b = { mat, geo, items: [] };
      buckets.set(key, b);
    }
    b.items.push(o);
  }
  let merged = 0;
  for (const b of buckets.values()) {
    if (b.items.length < 2) continue;
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.items.length);
    im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    im.castShadow = b.items.some((o) => o.castShadow);
    im.receiveShadow = b.items.some((o) => o.receiveShadow);
    im.frustumCulled = false;
    im.userData.kind = "facade_instanced";
    im.userData.sharedAsset = true;
    let i = 0;
    for (const o of b.items) {
      o.updateWorldMatrix(true, false);
      im.setMatrixAt(i++, o.matrixWorld);
      if (o.parent) o.parent.remove(o);
    }
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere?.();
    group.add(im);
    merged += b.items.length;
  }
  return merged;
}

/** Authored opening sizes (meters). Sill is 0 for doors. */
export const ARCH_OPENINGS = {
  door_residential_wood: { width: 0.98, height: 2.09, sill: 0, depth: 0.20 },
  door_storefront: { width: 1.10, height: 2.17, sill: 0, depth: 0.115 },
  door_garage_rollup: { width: 3.06, height: 2.48, sill: 0, depth: 0.20 },
  door_boarded: { width: 0.98, height: 2.09, sill: 0, depth: 0.20 },
  window_intact: { width: 0.90, height: 1.20, sill: 0.90, depth: 0.20 },
  window_cracked: { width: 0.90, height: 1.20, sill: 0.90, depth: 0.20 },
  window_broken: { width: 0.90, height: 1.20, sill: 0.90, depth: 0.20 },
  window_boarded: { width: 0.90, height: 1.20, sill: 0.90, depth: 0.20 },
  window_boarded_diagonal: { width: 0.90, height: 1.20, sill: 0.90, depth: 0.20 },
  window_storefront: { width: 2.40, height: 1.80, sill: 0.45, depth: 0.115 },
};

/** Subtract axis-aligned rectangles in 2D (x/y). */
export function subtractRects(rects, hole) {
  const out = [];
  for (const r of rects) {
    const x0 = Math.max(r.x0, hole.x0), x1 = Math.min(r.x1, hole.x1);
    const y0 = Math.max(r.y0, hole.y0), y1 = Math.min(r.y1, hole.y1);
    if (x0 >= x1 - 1e-4 || y0 >= y1 - 1e-4) { out.push(r); continue; }
    if (r.x0 < hole.x0 - 1e-4) out.push({ x0: r.x0, x1: hole.x0, y0: r.y0, y1: r.y1 });
    if (r.x1 > hole.x1 + 1e-4) out.push({ x0: hole.x1, x1: r.x1, y0: r.y0, y1: r.y1 });
    const mx0 = Math.max(r.x0, hole.x0), mx1 = Math.min(r.x1, hole.x1);
    if (mx1 - mx0 > 1e-4) {
      if (r.y0 < hole.y0 - 1e-4) out.push({ x0: mx0, x1: mx1, y0: r.y0, y1: hole.y0 });
      if (r.y1 > hole.y1 + 1e-4) out.push({ x0: mx0, x1: mx1, y0: hole.y1, y1: r.y1 });
    }
  }
  return out;
}

/**
 * Split a wall AABB into leftover boxes around openings.
 * openings: { axis: 'x'|'z', along, y0, width, height }
 * `axis` is the thin axis the hole goes through; `along` is the hole centre on the long axis.
 */
export function cutWallBoxes(box, openings, h) {
  const height = h ?? box.h ?? (box.maxY - (box.minY || 0));
  const minY = box.minY || 0;
  const longX = (box.maxX - box.minX) >= (box.maxZ - box.minZ);
  let rects = longX
    ? [{ x0: box.minX, x1: box.maxX, y0: minY, y1: minY + height }]
    : [{ x0: box.minZ, x1: box.maxZ, y0: minY, y1: minY + height }];
  for (const op of openings || []) {
    const along = op.along;
    const half = (op.width || 1) / 2;
    const y0 = (op.y0 ?? op.sill ?? 0);
    const y1 = y0 + (op.height || 1);
    const hole = { x0: along - half, x1: along + half, y0, y1 };
    rects = subtractRects(rects, hole);
  }
  const pieces = [];
  for (const r of rects) {
    if (r.x1 - r.x0 < 0.04 || r.y1 - r.y0 < 0.04) continue;
    if (longX) {
      pieces.push({ minX: r.x0, maxX: r.x1, minZ: box.minZ, maxZ: box.maxZ, minY: r.y0, maxY: r.y1 });
    } else {
      pieces.push({ minX: box.minX, maxX: box.maxX, minZ: r.x0, maxZ: r.x1, minY: r.y0, maxY: r.y1 });
    }
  }
  return pieces;
}

export function openingsHittingBox(openings, box, pad = 0.35) {
  const hit = [];
  for (const op of openings || []) {
    const half = (op.width || 1) / 2 + pad;
    const thin = op.axis || ((box.maxX - box.minX) >= (box.maxZ - box.minZ) ? "z" : "x");
    if (thin === "z") {
      if (op.z < box.minZ - pad || op.z > box.maxZ + pad) continue;
      if (op.along + half < box.minX || op.along - half > box.maxX) continue;
    } else {
      if (op.x < box.minX - pad || op.x > box.maxX + pad) continue;
      if (op.along + half < box.minZ || op.along - half > box.maxZ) continue;
    }
    hit.push(op);
  }
  return hit;
}

/** Build a (possibly punched) wall mesh. No colliders are added here. */
export function addPunchedWall(scene, box, h, mat, tile, openings) {
  const holes = openingsHittingBox(openings, box);
  const longX = (box.maxX - box.minX) >= (box.maxZ - box.minZ);
  if (!holes.length) {
    const mesh = boxMesh(box.w ?? (box.maxX - box.minX), h, box.d ?? (box.maxZ - box.minZ), mat, tile);
    mesh.position.set(box.cx ?? (box.minX + box.maxX) / 2, h / 2, box.cz ?? (box.minZ + box.maxZ) / 2);
    mesh.userData.kind = "wall";
    scene.add(mesh);
    return mesh;
  }
  const pieces = cutWallBoxes(box, holes.map((op) => ({
    ...op,
    along: op.along,
    width: op.width,
    height: op.height,
    y0: op.y0 ?? op.sill ?? 0,
  })), h);
  const geos = [];
  for (const p of pieces) {
    const w = p.maxX - p.minX, d = p.maxZ - p.minZ, hh = p.maxY - p.minY;
    if (w < 0.03 || d < 0.03 || hh < 0.03) continue;
    const geo = new THREE.BoxGeometry(w, hh, d);
    applyWorldUV(geo, tile);
    geo.translate((p.minX + p.maxX) / 2, (p.minY + p.maxY) / 2, (p.minZ + p.maxZ) / 2);
    geos.push(geo);
  }
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = h >= 1.2;
  mesh.receiveShadow = true;
  mesh.userData.kind = "wall_cut";
  mesh.userData.openings = holes.length;
  scene.add(mesh);
  return mesh;
}

export function isWalledBuildingWall(box, walledRects, pad = 0.6) {
  for (const b of walledRects || []) {
    const overlap = !(box.maxX < b.minX - pad || box.minX > b.maxX + pad || box.maxZ < b.minZ - pad || box.minZ > b.maxZ + pad);
    if (overlap) return true;
  }
  return false;
}

export function walledBuildingBoxes(L) {
  const out = [];
  for (const b of L?.buildings || []) {
    if (b.kind !== "walled" || !b.rect) continue;
    const r = b.rect;
    out.push({
      id: b.id, label: b.label, minX: Math.min(r.x0, r.x1), maxX: Math.max(r.x0, r.x1),
      minZ: Math.min(r.z0, r.z1), maxZ: Math.max(r.z0, r.z1),
    });
  }
  return out;
}
