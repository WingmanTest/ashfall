// Merged pitched-shingle and flat-parapet roofs for procedural / level-built buildings.
// One (or a few) draw calls per chapter. Interiors get a downward-facing ceiling so the sky is not visible.
import * as THREE from "three";

function accum() {
  return { pos: [], nrm: [], uv: [], idx: [] };
}

function vert(a, x, y, z, nx, ny, nz, u, v) {
  a.pos.push(x, y, z);
  a.nrm.push(nx, ny, nz);
  a.uv.push(u, v);
  return a.pos.length / 3 - 1;
}

function uvOf(p, nx, ny, nz, tile) {
  if (Math.abs(ny) >= Math.abs(nx) && Math.abs(ny) >= Math.abs(nz)) return [p[0] / tile, p[2] / tile];
  if (Math.abs(nx) >= Math.abs(nz)) return [p[2] / tile, p[1] / tile];
  return [p[0] / tile, p[1] / tile];
}

function quad(a, p0, p1, p2, p3, tile = 1.4) {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p3[0] - p0[0], by = p3[1] - p0[1], bz = p3[2] - p0[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;
  const i0 = vert(a, p0[0], p0[1], p0[2], nx, ny, nz, ...uvOf(p0, nx, ny, nz, tile));
  const i1 = vert(a, p1[0], p1[1], p1[2], nx, ny, nz, ...uvOf(p1, nx, ny, nz, tile));
  const i2 = vert(a, p2[0], p2[1], p2[2], nx, ny, nz, ...uvOf(p2, nx, ny, nz, tile));
  const i3 = vert(a, p3[0], p3[1], p3[2], nx, ny, nz, ...uvOf(p3, nx, ny, nz, tile));
  a.idx.push(i0, i1, i2, i0, i2, i3);
}

function tri(a, p0, p1, p2, tile = 2) {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;
  const i0 = vert(a, p0[0], p0[1], p0[2], nx, ny, nz, ...uvOf(p0, nx, ny, nz, tile));
  const i1 = vert(a, p1[0], p1[1], p1[2], nx, ny, nz, ...uvOf(p1, nx, ny, nz, tile));
  const i2 = vert(a, p2[0], p2[1], p2[2], nx, ny, nz, ...uvOf(p2, nx, ny, nz, tile));
  a.idx.push(i0, i1, i2);
}

function toGeo(a) {
  if (!a.idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(a.nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(a.uv, 2));
  g.setIndex(a.idx);
  return g;
}

function boxOf(minX, maxX, minZ, maxZ) {
  return {
    minX, maxX, minZ, maxZ,
    w: maxX - minX, d: maxZ - minZ,
    cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
  };
}

const HOUSE_RE = /house|home|cabin|shack|cottage|residence|neighbor|duplex|bungalow|pruitt|lolo|annie/;
const COMM_RE = /pharmacy|shop|store|garage|motel|pawn|casino|convention|rscc|clinic|marina|hospital|depot|station|warehouse|industrial|commercial|office|ramp|market|registry|checkpoint|yard|dock/;

export function classifyRoof(foot) {
  const text = `${foot.id || ""} ${foot.label || ""} ${foot.kind || ""}`.toLowerCase();
  if (COMM_RE.test(text) && !/house|home/.test(text)) return "flat";
  if (HOUSE_RE.test(text) && !COMM_RE.test(text)) return "pitched";
  const w = foot.w || (foot.maxX - foot.minX);
  const d = foot.d || (foot.maxZ - foot.minZ);
  const area = w * d;
  const long = Math.max(w, d);
  if (foot.source === "interior" && long <= 18 && area <= 220) return "pitched";
  if (foot.house) return "pitched";
  if (long <= 14 && area <= 150 && foot.source !== "kenney") return "pitched";
  return "flat";
}

export function extractShingleMaterial(root) {
  if (!root) return null;
  let named = null;
  let high = null;
  let highY = -Infinity;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      const name = `${o.name || ""} ${mat.name || ""}`.toLowerCase();
      if (/shingle|roof|asphalt/.test(name)) named = mat;
    }
    try {
      const b = new THREE.Box3().setFromObject(o);
      const midY = (b.min.y + b.max.y) * 0.5;
      if (midY > highY) {
        highY = midY;
        high = Array.isArray(o.material) ? o.material[0] : o.material;
      }
    } catch {}
  });
  const src = named || (highY > 2.2 ? high : null) || named;
  if (!src) return null;
  const mat = src.clone();
  mat.side = THREE.FrontSide;
  mat.roughness = Math.max(mat.roughness ?? 0, 0.86);
  mat.metalness = mat.metalness ?? 0.02;
  if (mat.map) {
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.anisotropy = 1;
    mat.map.needsUpdate = true;
  }
  return mat;
}

export function fallbackShingleMat() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#3a3532";
  g.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 16; row++) {
    const off = (row % 2) * 8;
    for (let col = -1; col < 16; col++) {
      const x = col * 16 + off, y = row * 8;
      const v = 48 + ((row * 13 + col * 7) % 22);
      g.fillStyle = `rgb(${v + 8},${v},${v - 4})`;
      g.fillRect(x + 1, y + 1, 14, 6);
      g.strokeStyle = "rgba(20,16,14,0.55)";
      g.strokeRect(x + 0.5, y + 0.5, 15, 7);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: tex, color: 0xffffff, roughness: 0.92, metalness: 0.02, name: "shingle_fallback",
  });
}

function fallbackFlatMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x3c3f44, roughness: 0.95, metalness: 0.04, name: "roof_tar",
  });
}

function fallbackCeilingMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x8a8176, roughness: 0.96, metalness: 0, name: "ceiling",
    emissive: 0x3a3530, emissiveIntensity: 0.28,
  });
}

function fallbackGableMat() {
  return new THREE.MeshStandardMaterial({
    color: 0xcbb59a, roughness: 0.9, metalness: 0, name: "gable",
  });
}

function overlaps(a, b, frac = 0.62) {
  const x0 = Math.max(a.minX, b.minX), x1 = Math.min(a.maxX, b.maxX);
  const z0 = Math.max(a.minZ, b.minZ), z1 = Math.min(a.maxZ, b.maxZ);
  if (x1 <= x0 || z1 <= z0) return false;
  const area = (x1 - x0) * (z1 - z0);
  const aa = Math.max(0.01, (a.maxX - a.minX) * (a.maxZ - a.minZ));
  return area / aa >= frac || area / Math.max(0.01, (b.maxX - b.minX) * (b.maxZ - b.minZ)) >= frac;
}

function insideTract(box, tracts) {
  if (!tracts || !tracts.length) return false;
  return tracts.some((t) => overlaps(box, t, 0.45));
}

function addPitched(sh, gable, soffit, snow, box, eaveY, snowy) {
  const { minX, maxX, minZ, maxZ, w, d, cx, cz } = box;
  const alongX = w >= d;
  const eave = 0.4;
  const short = Math.min(w, d);
  const rise = Math.max(1.15, Math.min(2.45, short * 0.32));
  const ridgeY = eaveY + rise;
  const tile = 1.4;
  if (alongX) {
    const x0 = minX - eave, x1 = maxX + eave;
    const z0 = minZ - eave, z1 = maxZ + eave;
    sh && quad(sh, [x0, eaveY, z0], [x0, ridgeY, cz], [x1, ridgeY, cz], [x1, eaveY, z0], tile);
    sh && quad(sh, [x1, eaveY, z1], [x1, ridgeY, cz], [x0, ridgeY, cz], [x0, eaveY, z1], tile);
    if (snow) {
      const y = 0.05;
      quad(snow, [x0, eaveY + y, z0], [x0, ridgeY + y, cz], [x1, ridgeY + y, cz], [x1, eaveY + y, z0], tile);
      quad(snow, [x1, eaveY + y, z1], [x1, ridgeY + y, cz], [x0, ridgeY + y, cz], [x0, eaveY + y, z1], tile);
    }
    gable && tri(gable, [minX, eaveY, minZ], [minX, ridgeY, cz], [minX, eaveY, maxZ], 2);
    gable && tri(gable, [maxX, eaveY, maxZ], [maxX, ridgeY, cz], [maxX, eaveY, minZ], 2);
    soffit && quad(soffit, [x0, eaveY - 0.03, minZ], [x1, eaveY - 0.03, minZ], [x1, eaveY - 0.03, z0], [x0, eaveY - 0.03, z0], 2);
    soffit && quad(soffit, [x1, eaveY - 0.03, maxZ], [x0, eaveY - 0.03, maxZ], [x0, eaveY - 0.03, z1], [x1, eaveY - 0.03, z1], 2);
    soffit && quad(soffit, [minX, eaveY - 0.03, z0], [minX, eaveY - 0.03, z1], [x0, eaveY - 0.03, z1], [x0, eaveY - 0.03, z0], 2);
    soffit && quad(soffit, [maxX, eaveY - 0.03, z1], [maxX, eaveY - 0.03, z0], [x1, eaveY - 0.03, z0], [x1, eaveY - 0.03, z1], 2);
  } else {
    const z0 = minZ - eave, z1 = maxZ + eave;
    const x0 = minX - eave, x1 = maxX + eave;
    sh && quad(sh, [x0, eaveY, z1], [cx, ridgeY, z1], [cx, ridgeY, z0], [x0, eaveY, z0], tile);
    sh && quad(sh, [x1, eaveY, z0], [cx, ridgeY, z0], [cx, ridgeY, z1], [x1, eaveY, z1], tile);
    if (snow) {
      const y = 0.05;
      quad(snow, [x0, eaveY + y, z1], [cx, ridgeY + y, z1], [cx, ridgeY + y, z0], [x0, eaveY + y, z0], tile);
      quad(snow, [x1, eaveY + y, z0], [cx, ridgeY + y, z0], [cx, ridgeY + y, z1], [x1, eaveY + y, z1], tile);
    }
    gable && tri(gable, [minX, eaveY, minZ], [maxX, eaveY, minZ], [cx, ridgeY, minZ], 2);
    gable && tri(gable, [maxX, eaveY, maxZ], [minX, eaveY, maxZ], [cx, ridgeY, maxZ], 2);
    soffit && quad(soffit, [minX, eaveY - 0.03, z0], [minX, eaveY - 0.03, z1], [x0, eaveY - 0.03, z1], [x0, eaveY - 0.03, z0], 2);
    soffit && quad(soffit, [maxX, eaveY - 0.03, z1], [maxX, eaveY - 0.03, z0], [x1, eaveY - 0.03, z0], [x1, eaveY - 0.03, z1], 2);
    soffit && quad(soffit, [x0, eaveY - 0.03, minZ], [x1, eaveY - 0.03, minZ], [x1, eaveY - 0.03, z0], [x0, eaveY - 0.03, z0], 2);
    soffit && quad(soffit, [x1, eaveY - 0.03, maxZ], [x0, eaveY - 0.03, maxZ], [x0, eaveY - 0.03, z1], [x1, eaveY - 0.03, z1], 2);
  }
  void snowy;
  return ridgeY;
}

function addFlat(flat, snow, box, roofY) {
  const e = 0.16;
  const { minX, maxX, minZ, maxZ } = box;
  const x0 = minX - e, x1 = maxX + e, z0 = minZ - e, z1 = maxZ + e;
  const y = roofY;
  const tile = 3;
  quad(flat, [x0, y, z1], [x0, y, z0], [x1, y, z0], [x1, y, z1], tile);
  if (snow) {
    const ys = y + 0.05;
    quad(snow, [x0, ys, z1], [x0, ys, z0], [x1, ys, z0], [x1, ys, z1], tile);
  }
  const ph = 0.48, pt = 0.18;
  // parapet: four walls, outward faces + inward + top
  const addWall = (a, b, c, d) => quad(flat, a, b, c, d, 1.6);
  // +Z
  addWall([x0, y, z1], [x1, y, z1], [x1, y + ph, z1], [x0, y + ph, z1]);
  addWall([x1, y, z1 - pt], [x0, y, z1 - pt], [x0, y + ph, z1 - pt], [x1, y + ph, z1 - pt]);
  addWall([x0, y + ph, z1], [x1, y + ph, z1], [x1, y + ph, z1 - pt], [x0, y + ph, z1 - pt]);
  // -Z
  addWall([x1, y, z0], [x0, y, z0], [x0, y + ph, z0], [x1, y + ph, z0]);
  addWall([x0, y, z0 + pt], [x1, y, z0 + pt], [x1, y + ph, z0 + pt], [x0, y + ph, z0 + pt]);
  addWall([x0, y + ph, z0 + pt], [x1, y + ph, z0 + pt], [x1, y + ph, z0], [x0, y + ph, z0]);
  // +X
  addWall([x1, y, z1], [x1, y, z0], [x1, y + ph, z0], [x1, y + ph, z1]);
  addWall([x1 - pt, y, z0], [x1 - pt, y, z1], [x1 - pt, y + ph, z1], [x1 - pt, y + ph, z0]);
  addWall([x1 - pt, y + ph, z0], [x1 - pt, y + ph, z1], [x1, y + ph, z1], [x1, y + ph, z0]);
  // -X
  addWall([x0, y, z0], [x0, y, z1], [x0, y + ph, z1], [x0, y + ph, z0]);
  addWall([x0 + pt, y, z1], [x0 + pt, y, z0], [x0 + pt, y + ph, z0], [x0 + pt, y + ph, z1]);
  addWall([x0, y + ph, z1], [x0 + pt, y + ph, z1], [x0 + pt, y + ph, z0], [x0, y + ph, z0]);
}

function addCeiling(ceil, box, y) {
  const pad = 0.04;
  const { minX, maxX, minZ, maxZ } = box;
  const x0 = minX + pad, x1 = maxX - pad, z0 = minZ + pad, z1 = maxZ - pad;
  // winding so the normal points down (visible from inside looking up)
  quad(ceil, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], 2.4);
}

function labelFor(box, buildings) {
  if (!buildings) return {};
  let best = null, bestA = 0;
  for (const b of buildings) {
    const r = b.rect;
    if (!r) continue;
    const bb = boxOf(Math.min(r.x0, r.x1), Math.max(r.x0, r.x1), Math.min(r.z0, r.z1), Math.max(r.z0, r.z1));
    if (!overlaps(box, bb, 0.25)) continue;
    const a = Math.min(box.w * box.d, bb.w * bb.d);
    if (a > bestA) { bestA = a; best = b; }
  }
  return best ? { id: best.id, label: best.label, kind: best.kind } : {};
}

function wallHeightAround(L, box, fallback = 4) {
  const g = L?.grid;
  if (!g) return fallback;
  const cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
  const legend = g.legend || {}, tiles = g.tiles || [];
  const c0 = Math.max(0, Math.floor((box.minX - o.x) / cs) - 1);
  const c1 = Math.min((g.cols || 0) - 1, Math.floor((box.maxX - o.x) / cs) + 1);
  const r0 = Math.max(0, Math.floor((box.minZ - o.z) / cs) - 1);
  const r1 = Math.min((g.rows || 0) - 1, Math.floor((box.maxZ - o.z) / cs) + 1);
  let h = fallback;
  for (let r = r0; r <= r1; r++) {
    const row = tiles[r];
    if (!row) continue;
    for (let c = c0; c <= c1; c++) {
      const t = legend[row[c]] || {};
      if (t.solid && (t.height || 0) >= 2) h = Math.max(h, t.height);
    }
  }
  return h;
}

function meshOf(geo, mat, kind, shadows = true) {
  if (!geo || !mat) return null;
  const m = new THREE.Mesh(geo, mat);
  m.userData.kind = kind;
  m.castShadow = !!shadows;
  m.receiveShadow = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/**
 * Stamp merged roofs over interior footprints and uncovered building lots.
 * runtime may supply: _tractBoxes, _lotRoofs [{box, y, kind, skip}], _shingleMat, _snowy
 */
export function coverBuildingRoofs(runtime, L, scene, mats = {}) {
  const shingle = mats.shingle || runtime?._shingleMat || fallbackShingleMat();
  const flat = mats.flat || fallbackFlatMat();
  const ceilMat = mats.ceiling || fallbackCeilingMat();
  const gableMat = mats.gable || fallbackGableMat();
  const snowMat = mats.snow || null;
  const snowy = !!(snowMat && ((Number(L?.environment?.snowCover) || 0) > 0 || runtime?._snowy));
  if (snowy) {
    try { shingle.color = (shingle.color || new THREE.Color(0xffffff)).clone().lerp(new THREE.Color(0xe4eaf0), 0.28); } catch {}
    try { flat.color = (flat.color || new THREE.Color(0x3c3f44)).clone().lerp(new THREE.Color(0xe8eef4), 0.4); } catch {}
  }

  const shA = accum(), flatA = accum(), ceilA = accum(), gableA = accum(), snowA = snowy ? accum() : null;
  const covered = [];
  const buildings = L?.buildings || [];
  const tracts = runtime?._tractBoxes || [];

  const take = (foot) => {
    if (!foot || foot.w < 1.2 || foot.d < 1.2) return;
    if (insideTract(foot, tracts)) return;
    if (covered.some((c) => overlaps(foot, c, 0.7))) return;
    const meta = { ...foot, ...labelFor(foot, buildings) };
    const kind = classifyRoof(meta);
    const wallH = foot.y || wallHeightAround(L, foot, kind === "flat" ? 7 : 4);
    const eaveY = wallH + 0.08;
    if (kind === "pitched") {
      addPitched(shA, gableA, ceilA, snowA, foot, eaveY, snowy);
      if (foot.interior !== false && (foot.source === "interior" || foot.ceiling)) {
        addCeiling(ceilA, foot, Math.min(Math.max(3.35, eaveY - 0.22), eaveY - 0.12));
      }
    } else {
      addFlat(flatA, snowA, foot, eaveY);
      if (foot.interior !== false && (foot.source === "interior" || foot.ceiling)) {
        addCeiling(ceilA, foot, Math.min(Math.max(3.35, eaveY - 0.22), eaveY - 0.12));
      }
    }
    covered.push(foot);
  };

  const g = L?.grid;
  if (g?.tiles && g.legend) {
    const { greedyRects, rectWorld } = mats.rects || {};
    if (typeof greedyRects === "function") {
      const recs = greedyRects(g.tiles, g.legend, (ch, t) => !!(t.roof || t.blocksAirLOS || t.name === "covered_floor" || t.name === "interior_floor"));
      for (const rec of recs) {
        const box = rectWorld(rec, g.origin || { x: 0, z: 0 }, g.cellSize || 2);
        take({ ...box, source: "interior", ceiling: true });
      }
    }
  }

  for (const rec of runtime?._lotRoofs || []) {
    if (!rec || rec.skip || !rec.box) continue;
    take({ ...rec.box, y: rec.y, house: rec.house, source: rec.source || "lot", id: rec.id, label: rec.label, interior: false });
  }

  for (const b of buildings) {
    const r = b.rect;
    if (!r) continue;
    const box = boxOf(Math.min(r.x0, r.x1), Math.max(r.x0, r.x1), Math.min(r.z0, r.z1), Math.max(r.z0, r.z1));
    if (box.w < 1.6 || box.d < 1.6) continue;
    const ceiling = b.kind === "walled" || /home|interior/.test(`${b.id || ""} ${b.label || ""}`.toLowerCase());
    take({ ...box, source: "building", id: b.id, label: b.label, kind: b.kind, ceiling, interior: ceiling });
  }

  const add = (geo, mat, kind, shadows) => {
    const m = meshOf(geo, mat, kind, shadows);
    if (!m) return;
    scene.add(m);
    if (runtime) {
      runtime._roofMeshes = runtime._roofMeshes || [];
      runtime._roofMeshes.push(m);
    }
  };
  add(toGeo(shA), shingle, "roof", true);
  add(toGeo(flatA), flat, "roof", true);
  add(toGeo(gableA), gableMat, "roof", true);
  add(toGeo(ceilA), ceilMat, "roof_ceiling", false);
  if (snowA) add(toGeo(snowA), snowMat, "roof_snow", false);
  return covered.length;
}
