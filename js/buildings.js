// Visual dressing for Cartographer solid tiles. Colliders stay merged AABBs.
import * as THREE from "three";
import { fitHeight } from "./world.js?v=r12";

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
