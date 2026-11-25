// Interior dressing: Cartographer levels/interior_previews overlays + Sculptor arch set.
// Doors and windows are cut into walls (README wall-cut rules). Door cells stay
// walk-through — we never add a collider across a doorway. Dressing props do
// not collide. Vegetation colliders are not added.
import * as THREE from "three";
import {
  ARCH_CATALOG, ARCH_DECAL_FRAMES, ARCH_TEXTURES,
  loadArchModel, makeArchInstanced, setDoorOpen, setArchSeason,
  loadFloorTexture, makeArchFloorDecals, makeArchDust, archPoseMatrix,
} from "../models/registry.js?v=r16.2";
import { gltfLoader } from "./models3d.js?v=r16.2";
import { ARCH_OPENINGS, addPunchedWall, applyWorldUV } from "./buildings.js?v=r16.2";

const KNOWN = new Set([
  "ch01_day_three", "ch02_the_registry", "ch03_the_long_cold", "ch04_black_start",
  "ch05_route_9", "ch06_the_trench", "ch07_dead_air", "ch07b_dixie_valley",
  "ch08_ashfall", "ch09_the_long_night", "ch10_the_warm_room",
]);

const REMAP = {
  arch_shelf_metal: "arch_shelf_metal_boxes",
  arch_shelf_empty: "arch_shelf_metal",
  arch_counter: "arch_counter",
  arch_workbench: "arch_workbench",
  arch_bed: "arch_bed",
  arch_sofa: "arch_couch",
  arch_armchair: "arch_chair",
  arch_fridge: "arch_fridge",
  arch_window_intact: "window_intact",
  arch_window_cracked: "window_cracked",
  arch_window_broken: "window_broken",
  arch_window_boarded: "window_boarded",
  arch_window_storefront: "window_storefront",
  arch_wall_corrugated: "arch_wall_corrugated_2m",
  arch_crate_wood: "arch_crate_large",
  arch_table: "arch_table",
  arch_table_folding: "arch_table",
  arch_chair: "arch_chair",
  arch_shelf_island: "arch_gondola_stocked",
  arch_box_cardboard: "arch_box_large",
  arch_debris_pile: "arch_debris_pile",
  arch_plank_scatter: "arch_plank_broken_a",
  arch_pipe_loose: "arch_pipe_straight",
  arch_rubble_chunks: "arch_rubble_medium",
  arch_glass_shards_3d: "arch_glass_shards_b",
  arch_cans: "arch_can_cluster",
  arch_bed_messy: "arch_bed_messy",
  arch_fridge_ajar: "arch_fridge_ajar",
  arch_counter_sink: "arch_counter_sink",
  arch_med_cabinet: "arch_med_cabinet",
  arch_gondola_looted: "arch_gondola_looted",
  arch_cot: "arch_cot",
  arch_bunk: "arch_cot",
  arch_mattress_floor: "arch_cot",
  arch_tire_stack: "arch_tire_stack",
  arch_crate_small: "arch_crate_small",
  arch_crate_broken: "arch_crate_broken",
  arch_plank_stack: "arch_plank_stack",
  arch_tire: "arch_tire",
  arch_box_collapsed: "arch_box_collapsed",
  arch_paper_pile: "arch_paper_pile",
  arch_glass_pane_fallen: "arch_glass_pane_fallen",
  arch_rubble_large: "arch_rubble_large",
  arch_box_small: "arch_box_small",
  arch_pallet_rack: "arch_shelf_metal",
  arch_cabinet_file: "arch_shelf_metal",
  arch_stove_wood: "arch_counter",
  arch_gurney: "arch_cot",
  arch_boards_overlay: "door_boards_overlay",
  arch_door_storefront_broken: "door_storefront",
  arch_door_storefront: "door_storefront",
  arch_door_residential: "door_residential_wood",
  arch_door_wood: "door_residential_wood",
  arch_door_garage: "door_garage_rollup",
  arch_door_boarded: "door_boarded",
  // Gap-fill (r16.2): Cartographer ceiling dressing had no dedicated GLBs in r16.1.
  arch_ceiling_pipes: "arch_pipe_run",
  arch_hanging_wires: "arch_pipe_run_1m",
  arch_ceiling_fixture_broken: "arch_lantern",
};

const FLOOR_TEX = {
  arch_tex_planks: "floor_wood_plank",
  arch_tex_linoleum: "floor_linoleum",
  arch_tex_carpet: "floor_carpet",
  arch_tex_concrete_stained: "floor_concrete_stained",
  arch_tex_tile_ceramic: "floor_ceramic_tile",
};

const WEAR_SUFFIX = {
  intact: "", lived_in: "", ransacked: "_dirty", flooded: "_dirty",
  boarded: "_dirty", burned: "_ash", frozen: "_ash",
};

const DECAL_REMAP = {
  papers_scatter: "papers", glass_shards: "glass_shards", rubble_dust: "debris",
  mud_tracks: "footprints", wrappers_cans: "debris", pill_scatter: "sawdust",
  rug_worn: "rug_rect", water_stain: "stain_water", scorch: "scorch",
  ash_drift: "ash_drift", snow_drift_in: "ash_drift", frost_rime: "plaster",
  plank_scrap: "debris", stain_oil: "stain_oil", stain_dark: "stain_dark",
  puddle: "puddle", footprints: "footprints", doormat: "doormat",
  leaves: "leaves", debris: "debris", papers: "papers", plaster: "plaster",
  sawdust: "sawdust",
};

const SIDE_ROT = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
const DOOR_THICK = 0.20;
const NEAR_DOOR_M = 8;

function hash01(n) {
  let h = (n * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export async function loadInteriorOverlay(levelId) {
  if (!levelId || !KNOWN.has(levelId)) return null;
  const url = `./levels/interior_previews/${levelId}.interior.json`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || data.kind !== "interior_overlay") return null;
    return data;
  } catch (err) {
    console.warn("[interior] overlay fetch failed", url, err);
    return null;
  }
}

export function remapArchId(id) {
  if (!id) return null;
  if (ARCH_CATALOG[id]) return id;
  const mapped = REMAP[id];
  if (mapped && ARCH_CATALOG[mapped]) return mapped;
  if (id.startsWith("window_") && ARCH_CATALOG[id]) return id;
  if (id.startsWith("door_") && ARCH_CATALOG[id]) return id;
  return null;
}

function legendOf(L, ch) { return (L?.grid?.legend || {})[ch] || {}; }
function tileCh(tiles, r, c) {
  if (r < 0 || c < 0 || r >= tiles.length || c >= (tiles[0]?.length || 0)) return "";
  return tiles[r][c];
}
function isInteriorCh(ch, L) {
  const t = legendOf(L, ch);
  // Only real room floors count as "inside". covered_floor / U is often an
  // outdoor over-road deck (Ch2 4th Street); treating it as interior made the
  // motel's street door look like a partition and face the wrong way.
  return !!(t.name === "interior_floor" || ch === ",");
}
function isSolidCh(ch, L) {
  return !!(legendOf(L, ch).solid);
}

function sideOpenness(tiles, L, cells, dir) {
  // cells: list of [r,c] or we pass r,c,r2,c2
  let ext = 0, inn = 0, solid = 0, n = 0;
  const { r, c, r2, c2 } = cells;
  const look = [];
  if (dir === "n") { for (let cc = c; cc <= c2; cc++) look.push([r - 1, cc]); }
  if (dir === "s") { for (let cc = c; cc <= c2; cc++) look.push([r2 + 1, cc]); }
  if (dir === "w") { for (let rr = r; rr <= r2; rr++) look.push([rr, c - 1]); }
  if (dir === "e") { for (let rr = r; rr <= r2; rr++) look.push([rr, c2 + 1]); }
  for (const [rr, cc] of look) {
    n++;
    const ch = tileCh(tiles, rr, cc);
    if (isInteriorCh(ch, L)) inn++;
    else if (isSolidCh(ch, L)) solid++;
    else ext++;
  }
  return { ext, inn, solid, n };
}

function pickExteriorSide(tiles, L, rec) {
  const scores = {};
  for (const dir of ["n", "s", "e", "w"]) {
    const s = sideOpenness(tiles, L, rec, dir);
    scores[dir] = s.ext * 4 - s.inn * 2 - s.solid;
  }
  let best = "s", bestV = -1e9;
  for (const d of ["n", "s", "e", "w"]) {
    if (scores[d] > bestV) { bestV = scores[d]; best = d; }
  }
  const internal = scores[best] < 1;
  return { side: best, internal };
}

function kitOfBuilding(overlay, buildingId, L) {
  const rooms = (overlay?.rooms || []).filter((r) => r.building === buildingId);
  if (rooms[0]?.kit) return rooms[0].kit;
  const b = (L?.buildings || []).find((x) => x.id === buildingId);
  const label = `${b?.label || ""} ${b?.interior || ""} ${buildingId || ""}`.toLowerCase();
  if (/garage|warehouse|hangar|ramp/.test(label)) return "garage_workshop";
  if (/pharmacy|pawn|store|shop|retail|registry|convention/.test(label)) return "store_retail";
  if (/clinic|hospital/.test(label)) return "clinic";
  if (/motel/.test(label)) return "motel_room";
  return "house_open";
}

function doorTypeFor(kit, label, width) {
  const s = `${kit || ""} ${label || ""}`.toLowerCase();
  if (width >= 2.8 && /garage|warehouse|hangar|parking|ramp/.test(s)) return "door_garage_rollup";
  if (/store|retail|stock|pharmacy|pawn|clinic|hospital|civic|registry|convention/.test(s)) return "door_storefront";
  return "door_residential_wood";
}

function openingSize(id) {
  return ARCH_OPENINGS[id] || ARCH_CATALOG[id]?.opening || { width: 0.98, height: 2.09, sill: 0, depth: 0.20 };
}

function seedNum(s) {
  let h = 0;
  const t = String(s || "");
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0;
  return h;
}

/**
 * Collect door + window openings from the level grid and optional overlay.
 * Door cells remain walkable; these records are for visual cuts and model poses.
 */
export function collectOpenings(L, overlay) {
  const doors = [];
  const windows = [];
  const g = L?.grid;
  if (!g) return { doors, windows, all: [] };
  const tiles = g.tiles, cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
  const legend = g.legend || {};

  // Local greedy of D tiles
  const rows = tiles.length, cols = tiles[0].length;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const drects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] !== "D" || seen[r][c]) continue;
      let c2 = c;
      while (c2 + 1 < cols && tiles[r][c2 + 1] === "D" && !seen[r][c2 + 1]) c2++;
      let r2 = r;
      grow: while (r2 + 1 < rows) {
        for (let cc = c; cc <= c2; cc++) if (tiles[r2 + 1][cc] !== "D" || seen[r2 + 1][cc]) break grow;
        r2++;
      }
      for (let rr = r; rr <= r2; rr++) for (let cc = c; cc <= c2; cc++) seen[rr][cc] = true;
      drects.push({ r, c, r2, c2 });
    }
  }

  const buildings = L.buildings || [];
  function buildingAt(x, z) {
    for (const b of buildings) {
      const R = b.rect;
      if (!R) continue;
      const minX = Math.min(R.x0, R.x1), maxX = Math.max(R.x0, R.x1);
      const minZ = Math.min(R.z0, R.z1), maxZ = Math.max(R.z0, R.z1);
      if (x >= minX - 1 && x <= maxX + 1 && z >= minZ - 1 && z <= maxZ + 1) return b;
    }
    return null;
  }

  for (const rec of drects) {
    const minX = o.x + rec.c * cs, maxX = o.x + (rec.c2 + 1) * cs;
    const minZ = o.z + rec.r * cs, maxZ = o.z + (rec.r2 + 1) * cs;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const { side, internal } = pickExteriorSide(tiles, L, rec);
    const alongX = side === "n" || side === "s";
    const widthCell = alongX ? (maxX - minX) : (maxZ - minZ);
    const b = buildingAt(cx, cz);
    const kit = kitOfBuilding(overlay, b?.id, L);
    const dtype = doorTypeFor(kit, b?.label, widthCell);
    const sz = openingSize(dtype);
    const holeW = Math.min(sz.width, Math.max(0.9, widthCell - 0.16));
    const along = alongX ? cx : cz;
    let x = cx, z = cz, rotY = SIDE_ROT[side];
    let faceX = cx, faceZ = cz;
    if (side === "s") { z = maxZ; faceZ = maxZ; }
    else if (side === "n") { z = minZ; faceZ = minZ; }
    else if (side === "e") { x = maxX; faceX = maxX; }
    else { x = minX; faceX = minX; }
    if (internal) {
      // Center the leaf in the cell so both rooms see the frame.
      if (alongX) { z = (minZ + maxZ) / 2; faceZ = z; }
      else { x = (minX + maxX) / 2; faceX = x; }
    }
    const seed = seedNum((b?.id || "door") + ":" + rec.r + "," + rec.c);
    const hand = hash01(seed) > 0.5 ? "R" : "L";
    const wallH = (b && (b.wallHeight || 4)) || 4;
    doors.push({
      kind: "door", id: dtype, x, z, y: 0, rotY, along, axis: alongX ? "z" : "x",
      width: holeW, height: sz.height, sill: 0, y0: 0, side, internal,
      cell: { minX, maxX, minZ, maxZ }, faceX, faceZ,
      buildingId: b?.id, label: b?.label, kit, hand, seed, wallH,
      depth: DOOR_THICK, openDefault: /garage|rollup/.test(dtype) ? 1 : 0,
    });
  }

  const usedWin = new Set();
  for (const room of overlay?.rooms || []) {
    for (const p of room.props || []) {
      if (p.layer !== "mount" && !/window|door/.test(p.id || "")) continue;
      const id = remapArchId(p.id);
      if (!id) continue;
      if (id.startsWith("door_")) {
        // Street / partition doors come from D tiles so we don't double-place.
        continue;
      }
      if (!id.startsWith("window_")) continue;
      const key = id + ":" + p.x.toFixed(2) + ":" + p.z.toFixed(2);
      if (usedWin.has(key)) continue;
      usedWin.add(key);
      const sz = openingSize(id);
      const side = p.wallSide || "s";
      const rotY = SIDE_ROT[side] ?? p.rotY ?? 0;
      const b = buildingAt(p.x, p.z);
      const R = b?.rect;
      let x = p.x, z = p.z, wallDepth = 2;
      if (R) {
        const minX = Math.min(R.x0, R.x1), maxX = Math.max(R.x0, R.x1);
        const minZ = Math.min(R.z0, R.z1), maxZ = Math.max(R.z0, R.z1);
        // Snap to the exterior face of the perimeter wall (2 m cells).
        if (side === "w") { x = minX; wallDepth = 2; }
        else if (side === "e") { x = maxX; wallDepth = 2; }
        else if (side === "n") { z = minZ; wallDepth = 2; }
        else { z = maxZ; wallDepth = 2; }
      }
      const along = (side === "n" || side === "s") ? (R ? p.x : x) : (R ? p.z : z);
      const sill = p.y ?? sz.sill ?? 0.9;
      windows.push({
        kind: "window", id, x, z, y: sill, rotY, along,
        axis: (side === "n" || side === "s") ? "z" : "x",
        width: sz.width, height: sz.height, sill, y0: sill, side,
        buildingId: room.building, roomId: room.id, kit: room.kit,
        wallDepth, scaleZ: wallDepth / 0.20, seed: seedNum(room.id + key),
      });
    }
  }

  return { doors, windows, all: doors.concat(windows) };
}

function floorIdFor(room, season) {
  const raw = room?.variation?.floorTex;
  let base = FLOOR_TEX[raw] || "floor_wood_plank";
  const dmg = room?.variation?.damage || "intact";
  let suffix = WEAR_SUFFIX[dmg] || "";
  if (season === "fallout_winter" && !suffix) suffix = "_ash";
  const id = base + suffix;
  if (ARCH_TEXTURES[id]) return id;
  if (ARCH_TEXTURES[base]) return base;
  return "floor_wood_plank";
}

async function placeFloors(group, rooms, season) {
  for (const room of rooms || []) {
    const bb = room.bbox;
    if (!bb || bb.length < 4) continue;
    const minX = bb[0], minZ = bb[1], maxX = bb[2], maxZ = bb[3];
    const w = Math.max(0.5, maxX - minX), d = Math.max(0.5, maxZ - minZ);
    const texId = floorIdFor(room, season);
    let map = null;
    try { map = loadFloorTexture(texId, { size: [w, d] }); } catch (err) {
      console.warn("[interior] floor tex", texId, err);
    }
    const mat = new THREE.MeshStandardMaterial({
      map, color: map ? 0xffffff : 0xc8b9a4, roughness: 0.92, metalness: 0,
    });
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((minX + maxX) / 2, 0.025, (minZ + maxZ) / 2);
    mesh.receiveShadow = true;
    mesh.userData.kind = "interior_floor";
    mesh.userData.sharedAsset = true;
    group.add(mesh);
  }
}

function poseFromProp(p) {
  const tilt = Math.hypot(p.tiltX || 0, p.tiltZ || 0);
  if (tilt > 0.8) return "overturned";
  if (tilt > 0.4) return "on_side";
  return null;
}

async function placeProps(group, props, { buildingSeed }) {
  const buckets = new Map();
  const singles = [];
  for (const p of props || []) {
    const id = remapArchId(p.id);
    if (!id) continue;
    if (id.startsWith("door_") || id.startsWith("window_")) continue; // placed with openings
    const rec = { ...p, archId: id };
    if (id.startsWith("door_")) singles.push(rec);
    else {
      if (!buckets.has(id)) buckets.set(id, []);
      buckets.get(id).push(rec);
    }
  }
  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  for (const [id, rows] of buckets) {
    if (!rows.length) continue;
    const cat = ARCH_CATALOG[id] || {};
    const poses = new Map();
    for (const row of rows) {
      let pose = null;
      if (cat.poses) {
        const guess = poseFromProp(row);
        if (guess && cat.poses[guess]) pose = guess;
        else if (row.pose && cat.poses[row.pose]) pose = row.pose;
      }
      const key = pose || "_";
      if (!poses.has(key)) poses.set(key, []);
      poses.get(key).push({ row, pose });
    }
    for (const [key, items] of poses) {
      const pose = key === "_" ? null : key;
      try {
        if (items.length === 1 || pose) {
          for (const it of items) {
            const obj = await loadArchModel(id, gltfLoader(), { pose: it.pose || undefined });
            const sc = it.row.scale == null ? 1 : it.row.scale;
            if (sc !== 1) {
              if (sc < 0) { /* never scale.x = -1 */ }
              obj.scale.setScalar(Math.abs(sc));
            }
            obj.position.set(it.row.x, it.row.y || 0, it.row.z);
            obj.rotation.y = it.row.rotY || 0;
            if (!it.pose) {
              if (it.row.tiltX) obj.rotation.x = it.row.tiltX;
              if (it.row.tiltZ) obj.rotation.z = it.row.tiltZ;
            }
            obj.userData.kind = "arch_prop";
            obj.userData.sharedAsset = true;
            obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            group.add(obj);
          }
        } else {
          const im = await makeArchInstanced(id, items.length, { loader: gltfLoader() });
          im.userData.kind = "arch_prop";
          im.userData.sharedAsset = true;
          im.castShadow = true;
          im.receiveShadow = true;
          items.forEach((it, i) => {
            const sc = Math.abs(it.row.scale == null ? 1 : it.row.scale);
            _e.set(it.row.tiltX || 0, it.row.rotY || 0, it.row.tiltZ || 0, "YXZ");
            _m.compose(_p.set(it.row.x, it.row.y || 0, it.row.z), _q.setFromEuler(_e), _s.set(sc, sc, sc));
            if (im.setMatrixAt) im.setMatrixAt(i, _m);
            else if (im.isGroup) {
              // door-style instanced group — shouldn't happen for furniture
            }
          });
          if (im.instanceMatrix) im.instanceMatrix.needsUpdate = true;
          group.add(im);
        }
      } catch (err) {
        console.warn("[interior] prop", id, err);
      }
    }
  }
}

function placeDecals(group, rooms) {
  const decals = [];
  for (const room of rooms || []) {
    for (const d of room.decals || []) {
      if (d.wall) continue;
      const frame = DECAL_REMAP[d.frame] || (ARCH_DECAL_FRAMES[d.frame] ? d.frame : null);
      if (!frame) continue;
      decals.push({ ...d, frame });
    }
  }
  if (!decals.length) return;
  try {
    const im = makeArchFloorDecals(decals.length);
    im.userData.kind = "arch_decal";
    im.userData.sharedAsset = true;
    decals.forEach((d, i) => {
      const sx = d.sizeX, sz = d.sizeZ;
      // setDecalAt uses frame size * scale; approximate with average scale.
      const fr = ARCH_DECAL_FRAMES[d.frame];
      let scale = 1;
      if (fr && sx && fr.size?.[0]) scale = sx / fr.size[0];
      im.setDecalAt(i, d.frame, d.x, d.z, d.rotY || 0, scale, d.y || 0);
    });
    group.add(im);
  } catch (err) {
    console.warn("[interior] decals", err);
  }
}

async function placeOpenings(group, openings, world, runtime) {
  const doors = [];
  for (const op of openings.doors || []) {
    try {
      const open = op.openDefault ?? 0;
      const obj = await loadArchModel(op.id, gltfLoader(), { hand: op.hand || "L", open });
      obj.position.set(op.x, op.y || 0, op.z);
      obj.rotation.y = op.rotY || 0;
      // Frames authored for 0.20 m walls. Door walls we place are 0.20 m, so scale.z = 1.
      // Never scale.x = -1 (hand is applied at load).
      obj.userData.kind = "arch_door";
      obj.userData.sharedAsset = true;
      obj.userData.doorId = op.buildingId + ":" + op.x + "," + op.z;
      obj.userData.open = open;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.add(obj);

      // Thin visual wall around the door, flush with the exterior face. No collider.
      const sz = openingSize(op.id);
      const alongX = op.axis === "z";
      const cell = op.cell;
      const thick = DOOR_THICK;
      let wallBox;
      if (alongX) {
        const z0 = op.side === "n" ? cell.minZ : op.side === "s" ? cell.maxZ - thick : (cell.minZ + cell.maxZ) / 2 - thick / 2;
        wallBox = { minX: cell.minX, maxX: cell.maxX, minZ: z0, maxZ: z0 + thick, w: cell.maxX - cell.minX, d: thick, cx: (cell.minX + cell.maxX) / 2, cz: z0 + thick / 2 };
      } else {
        const x0 = op.side === "w" ? cell.minX : op.side === "e" ? cell.maxX - thick : (cell.minX + cell.maxX) / 2 - thick / 2;
        wallBox = { minX: x0, maxX: x0 + thick, minZ: cell.minZ, maxZ: cell.maxZ, w: thick, d: cell.maxZ - cell.minZ, cx: x0 + thick / 2, cz: (cell.minZ + cell.maxZ) / 2 };
      }
      const mat = runtime._brickMat || new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.9 });
      addPunchedWall(group, wallBox, op.wallH || 4, mat, 2, [op]);

      const it = {
        id: "door_" + (op.buildingId || "b") + "_" + Math.round(op.x) + "_" + Math.round(op.z),
        type: "door", x: op.x, z: op.z, r: 2.0,
        label: open >= 0.5 ? "Close door" : "Open door",
        _archDoor: obj, open: open >= 0.5, doorType: op.id,
        walkThrough: true,
      };
      world.interactives.push(it);
      doors.push(it);
    } catch (err) {
      console.warn("[interior] door", op.id, err);
    }
  }
  for (const op of openings.windows || []) {
    try {
      const obj = await loadArchModel(op.id, gltfLoader());
      obj.position.set(op.x, op.y || op.sill || 0.9, op.z);
      obj.rotation.y = op.rotY || 0;
      const sz = Math.max(0.75, Math.min(10, op.scaleZ || (op.wallDepth || 2) / 0.20));
      obj.scale.z = sz; // README: scale.z = wall / 0.20; never scale.x = -1
      obj.userData.kind = "arch_window";
      obj.userData.sharedAsset = true;
      obj.userData.windowId = op.id;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.add(obj);
    } catch (err) {
      console.warn("[interior] window", op.id, err);
    }
  }
  return doors;
}

export async function applyInteriorDressing(runtime, overlay, scene, world, L, openings) {
  runtime._interior = runtime._interior || {};
  runtime._interior.overlay = overlay || null;
  runtime._interior.groups = [];
  runtime._interior.doors = [];
  runtime._windowAmt = 0;
  const season = L?.environment?.id || overlay?.season || "summer";
  try { setArchSeason(season); } catch (err) { console.warn("[interior] season", err); }

  const ops = openings || collectOpenings(L, overlay);
  runtime._interior.openings = ops;

  const roomsByBuilding = new Map();
  for (const room of overlay?.rooms || []) {
    const id = room.building || room.id;
    if (!roomsByBuilding.has(id)) roomsByBuilding.set(id, []);
    roomsByBuilding.get(id).push(room);
  }
  // Door-only buildings still get a group so the door mesh has a parent we can show.
  for (const d of ops.doors) {
    if (d.buildingId && !roomsByBuilding.has(d.buildingId)) roomsByBuilding.set(d.buildingId, []);
  }

  const root = new THREE.Group();
  root.name = "interior_dressing";
  scene.add(root);
  runtime._interior.root = root;

  // Place all door/window meshes on a always-visible facade group so street
  // views see doors and windows even when the room interior is culled.
  const facade = new THREE.Group();
  facade.name = "interior_facades";
  root.add(facade);
  const doorRecs = await placeOpenings(facade, ops, world, runtime);
  runtime._interior.doors = doorRecs;
  facade.visible = true;

  for (const [bid, rooms] of roomsByBuilding) {
    const g = new THREE.Group();
    g.name = "interior_" + bid;
    g.userData.buildingId = bid;
    const bboxes = rooms.map((r) => r.bbox).filter(Boolean);
    const doors = ops.doors.filter((d) => d.buildingId === bid);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const bb of bboxes) {
      minX = Math.min(minX, bb[0]); maxX = Math.max(maxX, bb[2]);
      minZ = Math.min(minZ, bb[1]); maxZ = Math.max(maxZ, bb[3]);
    }
    for (const d of doors) {
      minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x);
      minZ = Math.min(minZ, d.z); maxZ = Math.max(maxZ, d.z);
    }
    const b = (L.buildings || []).find((x) => x.id === bid);
    if (b?.rect) {
      minX = Math.min(minX, b.rect.x0, b.rect.x1);
      maxX = Math.max(maxX, b.rect.x0, b.rect.x1);
      minZ = Math.min(minZ, b.rect.z0, b.rect.z1);
      maxZ = Math.max(maxZ, b.rect.z0, b.rect.z1);
    }
    g.userData.bbox = { minX, maxX, minZ, maxZ };
    g.userData.doors = doors.map((d) => ({ x: d.x, z: d.z }));
    const broken = (ops.windows || []).some((w) => w.buildingId === bid && /broken/.test(w.id));
    const hasWin = (ops.windows || []).some((w) => w.buildingId === bid);
    g.userData.windowAmt = broken ? 0.45 : hasWin ? 0.28 : 0.08;
    try {
      await placeFloors(g, rooms, season);
      const props = rooms.flatMap((r) => r.props || []);
      await placeProps(g, props, { buildingSeed: seedNum(bid) });
      placeDecals(g, rooms);
      // Dust only in the active interior (toggled in tick).
      const atmos = rooms[0]?.atmos?.dust;
      if (atmos?.count && atmos.bbox) {
        const bb = atmos.bbox;
        const pts = makeArchDust(Math.min(80, atmos.count), {
          min: [bb[0], 0.4, bb[1]], max: [bb[2], atmos.yMax || 3.2, bb[3]],
        }, { seed: seedNum(bid) });
        pts.userData.kind = "arch_dust";
        g.add(pts);
        g.userData.dust = pts;
      }
    } catch (err) {
      console.warn("[interior] building", bid, err);
    }
    g.visible = false;
    root.add(g);
    runtime._interior.groups.push(g);
  }

  // Area overlays (sparse, non-colliding).
  if (overlay?.areas?.length) {
    const ag = new THREE.Group();
    ag.name = "interior_areas";
    ag.userData.cullM = 20;
    const props = overlay.areas.flatMap((a) => a.props || []);
    try { await placeProps(ag, props, { buildingSeed: 1 }); } catch (err) {
      console.warn("[interior] areas", err);
    }
    ag.userData.bboxes = (overlay.areas || []).map((a) => a.bbox).filter(Boolean);
    root.add(ag);
    runtime._interior.areas = ag;
  }

  try { setArchSeason(season, root); } catch {}
  try {
    await reinforceInteriors(runtime, overlay, L, world, root, ops, season);
  } catch (err) {
    console.warn("[interior] reinforce", err);
  }
  tickInteriorDressing(runtime, world?._player || { x: 0, z: 0 }, 0);
  return runtime._interior;
}

function insideBox(bb, x, z, pad = 0) {
  if (!bb) return false;
  if (Array.isArray(bb)) return x >= bb[0] - pad && z >= bb[1] - pad && x <= bb[2] + pad && z <= bb[3] + pad;
  return x >= bb.minX - pad && x <= bb.maxX + pad && z >= bb.minZ - pad && z <= bb.maxZ + pad;
}

export function tickInteriorDressing(runtime, player, dt) {
  const I = runtime?._interior;
  if (!I?.groups) return;
  const x = player?.x || 0, z = player?.z || 0;
  let active = null, best = Infinity;
  for (const g of I.groups) {
    if (insideBox(g.userData.bbox, x, z, 0.4)) {
      const d = 0;
      if (d < best) { best = d; active = g; }
    }
  }
  if (!active) {
    for (const g of I.groups) {
      for (const d of g.userData.doors || []) {
        const dist = Math.hypot(x - d.x, z - d.z);
        if (dist < NEAR_DOOR_M && dist < best) { best = dist; active = g; }
      }
    }
  }
  for (const g of I.groups) {
    const on = g === active;
    if (g.visible !== on) g.visible = on;
    if (g.userData.dust?.userData?.update && on && dt) {
      try { g.userData.dust.userData.update(dt); } catch {}
    }
  }
  if (I.areas) {
    let show = false;
    for (const bb of I.areas.userData.bboxes || []) {
      if (insideBox(bb, x, z, I.areas.userData.cullM || 20)) { show = true; break; }
    }
    I.areas.visible = show;
  }
  runtime._windowAmt = active ? (active.userData.windowAmt || 0.25) : 0;
  I.active = active;
}

export function interiorWindowAmt(runtime) {
  return runtime?._windowAmt ?? 0;
}

export function toggleArchDoor(it, game) {
  if (!it?._archDoor) return false;
  it.open = !it.open;
  try { setDoorOpen(it._archDoor, it.open ? 1 : 0); } catch (err) {
    console.warn("[interior] setDoorOpen", err);
  }
  it.label = it.open ? "Close door" : "Open door";
  game?.hud && (game.hud.say(it.open ? "Opened." : "Closed."));
  return true;
}

/** Walkability audit used by Playwright: D cells + interiors reachable, no collider in the door clear. */
export function auditQuestAccess(world, L, openings, rad = 0.38) {
  const g = L?.grid;
  if (!g) return { ok: false, error: "no grid" };
  const tiles = g.tiles, cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
  const cols = g.cols, rows = g.rows;
  const blocked = (x, z) => world.blocked?.(x, z, rad) || world.collide?.(x, z, rad, x, z) && false;

  function walkableCell(c, r) {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    const ch = tiles[r][c];
    const def = g.legend[ch] || {};
    if (def.solid) return false;
    if (def.walkable === false) return false;
    if (ch === "~" || ch === "_") return false;
    return def.walkable !== false;
  }
  function worldOf(c, r) { return { x: o.x + (c + 0.5) * cs, z: o.z + (r + 0.5) * cs }; }
  function cellOf(x, z) {
    return [Math.floor((x - o.x) / cs), Math.floor((z - o.z) / cs)];
  }

  const blockedAt = (x, z) => {
    if (typeof world.blocked === "function" && world.blocked(x, z, rad)) return true;
    const cols_ = world.colliders || [];
    for (const col of cols_) {
      if (col.walkable || col.ghost) continue;
      if (x > col.minX - rad && x < col.maxX + rad && z > col.minZ - rad && z < col.maxZ + rad) return true;
    }
    return false;
  };

  const results = [];
  for (const b of L.buildings || []) {
    if (b.kind !== "walled" || !b.doors?.length) continue;
    const doors = (openings?.doors || []).filter((d) => d.buildingId === b.id);
    const R = b.rect;
    const mid = { x: (R.x0 + R.x1) / 2, z: (R.z0 + R.z1) / 2 };
    const entry = [];
    for (const d of doors.length ? doors : b.doors.map((p) => ({ x: p[0], z: p[1], side: "s", cell: null }))) {
      // A point 1.2 m outside the door, and 1.6 m inside.
      const rot = d.rotY ?? 0;
      // +Z of the door faces the street, so outside is along +Z local.
      const fx = Math.sin(rot), fz = Math.cos(rot);
      const outside = { x: d.x + fx * 1.4, z: d.z + fz * 1.4 };
      const inside = { x: d.x - fx * 1.6, z: d.z - fz * 1.6 };
      const midDoor = { x: d.x, z: d.z };
      const blockOut = blockedAt(outside.x, outside.z);
      const blockDoor = blockedAt(midDoor.x, midDoor.z);
      const blockIn = blockedAt(inside.x, inside.z);
      entry.push({
        x: d.x, z: d.z, side: d.side,
        blockedOutside: !!blockOut, blockedDoor: !!blockDoor, blockedInside: !!blockIn,
        ok: !blockDoor && !blockIn,
      });
    }
    const ok = entry.some((e) => e.ok);
    results.push({ id: b.id, label: b.label, ok, entry });
  }
  return { ok: results.every((r) => r.ok), buildings: results };
}

/** True only inside a real enclosed room (interior_floor or a building doorway).
 *  covered_floor / U, loc.safe streets, and outdoor fires must not count. */
export function isEnclosedInterior(runtime, x, z) {
  if (!runtime) return false;
  const t = typeof runtime.tileAt === "function" ? runtime.tileAt(x, z) : null;
  if (!t) return false;
  const ch = t.ch;
  const name = t.def?.name || "";
  if (name === "covered_floor") return false;
  const isRoom = name === "interior_floor" || ch === "," || name === "door" || ch === "D" || !!t.def?.door;
  if (!isRoom) return false;
  const L = runtime.L;
  const buildings = L?.buildings || [];
  for (const b of buildings) {
    if (b.kind !== "walled" || !b.rect) continue;
    const r = b.rect;
    const minX = Math.min(r.x0, r.x1), maxX = Math.max(r.x0, r.x1);
    const minZ = Math.min(r.z0, r.z1), maxZ = Math.max(r.z0, r.z1);
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true;
  }
  if (name === "interior_floor" || ch === ",") return true;
  if (name === "door" || ch === "D" || t.def?.door) {
    const g = L?.grid;
    if (!g?.tiles) return false;
    const tiles = g.tiles, legend = g.legend || {};
    const c = t.c, r = t.r;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= tiles.length || cc >= (tiles[rr] || "").length) continue;
      const nch = tiles[rr][cc];
      const nd = legend[nch] || {};
      if (nd.name === "interior_floor" || nch === ",") return true;
    }
  }
  return false;
}

const CEIL_Y = 3.05;
const SHELL_H = 3.08;

function shellCeilMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x8a847c, roughness: 0.96, metalness: 0,
    side: THREE.DoubleSide, name: "interior_ceiling",
  });
}
function shellWallMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x9a8b7a, roughness: 0.92, metalness: 0, name: "interior_partition",
  });
}

function addCeilingPlane(parent, box, y, mat) {
  const pad = 0.02;
  const w = Math.max(0.4, box.maxX - box.minX - pad * 2);
  const d = Math.max(0.4, box.maxZ - box.minZ - pad * 2);
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(Math.PI / 2); // normal down
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((box.minX + box.maxX) / 2, y, (box.minZ + box.maxZ) / 2);
  mesh.userData.kind = "interior_ceiling";
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function addShellWall(parent, world, minX, maxX, minZ, maxZ, h, mat, src = "interior_wall") {
  const w = Math.max(0.08, maxX - minX), d = Math.max(0.08, maxZ - minZ);
  const geo = new THREE.BoxGeometry(w, h, d);
  applyWorldUV(geo, 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((minX + maxX) / 2, h / 2, (minZ + maxZ) / 2);
  mesh.userData.kind = src;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (world?.colliders) {
    world.colliders.push({ minX, maxX, minZ, maxZ, src, ch: "#" });
  }
  return mesh;
}

function roomBoxesOf(L, overlay) {
  const boxes = [];
  const seen = new Set();
  const add = (box, meta = {}) => {
    if (!box || box.maxX - box.minX < 1.2 || box.maxZ - box.minZ < 1.2) return;
    const k = [box.minX, box.minZ, box.maxX, box.maxZ].map((n) => n.toFixed(2)).join(",");
    if (seen.has(k)) return;
    seen.add(k);
    boxes.push({ ...box, ...meta });
  };
  for (const b of L?.buildings || []) {
    if (b.kind !== "walled" || !b.rect) continue;
    const r = b.rect;
    add({
      minX: Math.min(r.x0, r.x1), maxX: Math.max(r.x0, r.x1),
      minZ: Math.min(r.z0, r.z1), maxZ: Math.max(r.z0, r.z1),
    }, { id: b.id, label: b.label, kind: b.kind, source: "building" });
  }
  for (const room of overlay?.rooms || []) {
    const bb = room.bbox;
    if (!bb || bb.length < 4) continue;
    add({ minX: bb[0], minZ: bb[1], maxX: bb[2], maxZ: bb[3] }, {
      id: room.id || room.building, label: room.id, kind: room.kind, source: "room", room,
    });
  }
  return boxes;
}

function fillPerimeterGaps(parent, world, L, mat) {
  const g = L?.grid;
  if (!g?.tiles) return 0;
  const cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
  const tiles = g.tiles, legend = g.legend || {};
  const thick = 0.18;
  let n = 0;
  const isRoom = (ch) => {
    const t = legend[ch] || {};
    return t.name === "interior_floor" || ch === ",";
  };
  const isDoor = (ch) => {
    const t = legend[ch] || {};
    return !!(t.door || t.name === "door" || ch === "D");
  };
  const isSolid = (ch) => !!(legend[ch] || {}).solid;
  const neigh = (r, c) => {
    if (r < 0 || c < 0 || r >= tiles.length || c >= (tiles[r] || "").length) return "";
    return tiles[r][c];
  };
  // For each interior cell, close any edge that opens onto outdoor / empty space.
  for (let r = 0; r < tiles.length; r++) {
    const row = tiles[r] || "";
    for (let c = 0; c < row.length; c++) {
      if (!isRoom(row[c])) continue;
      const x0 = o.x + c * cs, z0 = o.z + r * cs;
      const x1 = x0 + cs, z1 = z0 + cs;
      const edges = [
        { ch: neigh(r, c - 1), minX: x0 - thick, maxX: x0, minZ: z0, maxZ: z1 },
        { ch: neigh(r, c + 1), minX: x1, maxX: x1 + thick, minZ: z0, maxZ: z1 },
        { ch: neigh(r - 1, c), minX: x0, maxX: x1, minZ: z0 - thick, maxZ: z0 },
        { ch: neigh(r + 1, c), minX: x0, maxX: x1, minZ: z1, maxZ: z1 + thick },
      ];
      for (const e of edges) {
        if (isRoom(e.ch) || isDoor(e.ch) || isSolid(e.ch)) continue;
        addShellWall(parent, world, e.minX, e.maxX, e.minZ, e.maxZ, SHELL_H, mat, "interior_wall");
        n++;
      }
    }
  }
  return n;
}

function roomHasInternalWall(L, box, cs = 2) {
  const g = L?.grid;
  if (!g?.tiles) return false;
  const o = g.origin || { x: 0, z: 0 };
  const tiles = g.tiles, legend = g.legend || {};
  const c0 = Math.floor((box.minX - o.x) / cs) + 1;
  const c1 = Math.floor((box.maxX - o.x) / cs) - 1;
  const r0 = Math.floor((box.minZ - o.z) / cs) + 1;
  const r1 = Math.floor((box.maxZ - o.z) / cs) - 1;
  let n = 0;
  for (let r = r0; r <= r1; r++) {
    const row = tiles[r];
    if (!row) continue;
    for (let c = c0; c <= c1; c++) {
      const t = legend[row[c]] || {};
      if (t.solid && t.name === "wall") n++;
    }
  }
  return n >= 3;
}

function addPartitionFor(parent, world, L, box, mat) {
  const w = box.maxX - box.minX, d = box.maxZ - box.minZ;
  if (Math.min(w, d) < 7.5 || w * d < 80) return false;
  if (roomHasInternalWall(L, box)) return false;
  const seed = seedNum((box.id || "") + ":" + box.minX + "," + box.minZ);
  const alongX = w >= d; // wall runs along the long axis (constant on the short axis)
  const gapW = 2.0;
  const thick = 0.18;
  const t = 0.35 + 0.3 * seed; // gap centre as fraction of the long axis
  if (alongX) {
    const z = box.minZ + d * (0.4 + 0.2 * hash01(seed * 17 + 3));
    const gapC = box.minX + w * t;
    const gap0 = Math.max(box.minX + 1.2, gapC - gapW / 2);
    const gap1 = Math.min(box.maxX - 1.2, gapC + gapW / 2);
    if (gap0 - box.minX > 0.8) addShellWall(parent, world, box.minX, gap0, z - thick / 2, z + thick / 2, SHELL_H, mat, "interior_partition");
    if (box.maxX - gap1 > 0.8) addShellWall(parent, world, gap1, box.maxX, z - thick / 2, z + thick / 2, SHELL_H, mat, "interior_partition");
  } else {
    const x = box.minX + w * (0.4 + 0.2 * hash01(seed * 17 + 3));
    const gapC = box.minZ + d * t;
    const gap0 = Math.max(box.minZ + 1.2, gapC - gapW / 2);
    const gap1 = Math.min(box.maxZ - 1.2, gapC + gapW / 2);
    if (gap0 - box.minZ > 0.8) addShellWall(parent, world, x - thick / 2, x + thick / 2, box.minZ, gap0, SHELL_H, mat, "interior_partition");
    if (box.maxZ - gap1 > 0.8) addShellWall(parent, world, x - thick / 2, x + thick / 2, gap1, box.maxZ, SHELL_H, mat, "interior_partition");
  }
  return true;
}

const DENSE_KITS = {
  house: ["arch_shelf_metal_boxes", "arch_shelf_metal", "arch_chair", "arch_table", "arch_couch", "arch_box_large", "arch_crate_small", "arch_paper_pile"],
  store: ["arch_gondola_stocked", "arch_shelf_metal_boxes", "arch_counter", "arch_crate_large", "arch_box_large", "arch_can_cluster"],
  garage: ["arch_workbench", "arch_shelf_metal", "arch_crate_large", "arch_crate_small", "arch_tire_stack", "arch_plank_stack"],
  clinic: ["arch_cot", "arch_med_cabinet", "arch_chair", "arch_counter", "arch_shelf_metal", "arch_box_small"],
  default: ["arch_shelf_metal", "arch_crate_large", "arch_chair", "arch_box_large", "arch_paper_pile"],
};

function kitListFor(kind) {
  const k = String(kind || "default").toLowerCase();
  if (/store|shop|pharmacy|pawn|retail/.test(k)) return DENSE_KITS.store;
  if (/garage|warehouse|workshop/.test(k)) return DENSE_KITS.garage;
  if (/clinic|hospital|med/.test(k)) return DENSE_KITS.clinic;
  if (/house|home|motel|apt|residential/.test(k)) return DENSE_KITS.house;
  return DENSE_KITS.default;
}

function densifyBox(room, existing, L, seed) {
  const box = room.bbox
    ? { minX: room.bbox[0], minZ: room.bbox[1], maxX: room.bbox[2], maxZ: room.bbox[3] }
    : room;
  if (!box) return [];
  const w = box.maxX - box.minX, d = box.maxZ - box.minZ;
  const kit = kitListFor(room.kind);
  const usable = kit.filter((id) => remapArchId(id));
  if (!usable.length) return [];
  const doors = [];
  const g = L?.grid;
  if (g?.tiles) {
    const cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
    const tiles = g.tiles, legend = g.legend || {};
    for (let r = 0; r < tiles.length; r++) {
      const row = tiles[r] || "";
      for (let c = 0; c < row.length; c++) {
        const t = legend[row[c]] || {};
        if (!(t.door || t.name === "door" || row[c] === "D")) continue;
        const x = o.x + (c + 0.5) * cs, z = o.z + (r + 0.5) * cs;
        if (x >= box.minX - 1 && x <= box.maxX + 1 && z >= box.minZ - 1 && z <= box.maxZ + 1) doors.push({ x, z });
      }
    }
  }
  const nearDoor = (x, z) => doors.some((d) => Math.hypot(d.x - x, d.z - z) < 1.35);
  const nearExist = (x, z) => (existing || []).some((p) => Math.hypot((p.x || 0) - x, (p.z || 0) - z) < 1.15);
  const inset = 0.55;
  const step = 3.2;
  const out = [];
  let i = 0;
  const sides = [
    { x0: box.minX + inset, z0: box.minZ + inset, x1: box.maxX - inset, z1: box.minZ + inset, rot: 0 },
    { x0: box.maxX - inset, z0: box.minZ + inset, x1: box.maxX - inset, z1: box.maxZ - inset, rot: -Math.PI / 2 },
    { x0: box.maxX - inset, z0: box.maxZ - inset, x1: box.minX + inset, z1: box.maxZ - inset, rot: Math.PI },
    { x0: box.minX + inset, z0: box.maxZ - inset, x1: box.minX + inset, z1: box.minZ + inset, rot: Math.PI / 2 },
  ];
  for (const s of sides) {
    const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
    const n = Math.max(1, Math.floor(len / step));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const x = s.x0 + (s.x1 - s.x0) * u;
      const z = s.z0 + (s.z1 - s.z0) * u;
      if (nearDoor(x, z) || nearExist(x, z)) continue;
      const id = usable[Math.floor(hash01(seed + i * 19) * usable.length) % usable.length];
      out.push({ id, x, y: 0, z, rotY: s.rot, scale: 1 });
      i++;
      // occasional clutter just off the wall
      if (hash01(seed + i * 31) > 0.55) {
        const clutter = ["arch_box_small", "arch_paper_pile", "arch_can_cluster", "arch_crate_small", "arch_box_collapsed"];
        const cid = clutter[Math.floor(hash01(seed + i * 47) * clutter.length) % clutter.length];
        if (remapArchId(cid)) {
          const nx = x + Math.sin(s.rot) * 0.7;
          const nz = z + Math.cos(s.rot) * 0.7;
          if (!nearDoor(nx, nz) && !nearExist(nx, nz)) out.push({ id: cid, x: nx, y: 0, z: nz, rotY: s.rot + 0.2, scale: 1 });
        }
      }
    }
  }
  return out;
}

async function reinforceInteriors(runtime, overlay, L, world, root, ops, season) {
  const shells = new THREE.Group();
  shells.name = "interior_shells";
  shells.visible = true;
  root.add(shells);
  const cMat = shellCeilMat();
  const wMat = shellWallMat();
  const boxes = roomBoxesOf(L, overlay);
  let ceilings = 0, parts = 0;
  const covered = [];
  const overlaps = (a, b) => {
    const x0 = Math.max(a.minX, b.minX), x1 = Math.min(a.maxX, b.maxX);
    const z0 = Math.max(a.minZ, b.minZ), z1 = Math.min(a.maxZ, b.maxZ);
    if (x1 <= x0 || z1 <= z0) return 0;
    const area = (x1 - x0) * (z1 - z0);
    const aa = Math.max(0.01, (a.maxX - a.minX) * (a.maxZ - a.minZ));
    return area / aa;
  };
  // Prefer tighter room boxes first so a house split into rooms gets one ceiling per room,
  // then fill any leftover building footprint.
  const ordered = boxes.slice().sort((a, b) => (a.maxX - a.minX) * (a.maxZ - a.minZ) - (b.maxX - b.minX) * (b.maxZ - b.minZ));
  const roomsFirst = ordered.filter((b) => b.source === "room").concat(ordered.filter((b) => b.source !== "room"));
  for (const box of roomsFirst) {
    const coverFrac = covered.reduce((s, c) => s + overlaps(box, c), 0);
    if (coverFrac >= 0.5) continue;
    addCeilingPlane(shells, box, CEIL_Y, cMat);
    covered.push(box);
    ceilings++;
  }
  // A slightly higher building cap covers internal door cells the room boxes miss.
  for (const box of boxes) {
    if (box.source !== "building") continue;
    addCeilingPlane(shells, box, CEIL_Y + 0.06, cMat);
    ceilings++;
  }
  const gaps = fillPerimeterGaps(shells, world, L, wMat);
  // Partitions only for large building boxes (not every overlay room, to avoid double walls).
  for (const box of boxes) {
    if (box.source !== "building") continue;
    if (addPartitionFor(shells, world, L, box, wMat)) parts++;
  }

  // Densify rooms with wall-hugging furniture from the r16.1 catalog only.
  const extra = [];
  for (const room of overlay?.rooms || []) {
    const existing = room.props || [];
    const seed = seedNum((room.id || room.building || "") + ":dense");
    extra.push(...densifyBox(room, existing.concat(extra), L, seed));
  }
  // Buildings with no overlay rooms still get a pass from the building rect + kind.
  for (const b of L?.buildings || []) {
    if (b.kind !== "walled" || !b.rect) continue;
    const has = (overlay?.rooms || []).some((r) => r.building === b.id || (r.id || "").startsWith(b.id));
    if (has) continue;
    const r = b.rect;
    const box = { minX: Math.min(r.x0, r.x1), maxX: Math.max(r.x0, r.x1), minZ: Math.min(r.z0, r.z1), maxZ: Math.max(r.z0, r.z1), kind: b.label || b.kind };
    extra.push(...densifyBox(box, extra, L, seedNum(b.id + ":dense")));
  }
  if (extra.length) {
    const dg = new THREE.Group();
    dg.name = "interior_dense";
    dg.userData.kind = "arch_prop";
    shells.add(dg);
    try { await placeProps(dg, extra, { buildingSeed: 7 }); } catch (err) {
      console.warn("[interior] densify", err);
    }
  }
  runtime._interior.shells = shells;
  runtime._interior.shellStats = { ceilings, gaps, parts, extra: extra.length };
  window.__ASHFALL_SHELLS = runtime._interior.shellStats;
}

/** Raycast straight up from inside each enterable room. A ceiling must hide the sky. */
export function auditInteriorCeilings(runtime) {
  const scene = runtime?.group || runtime?.world?.scene;
  const L = runtime?.L;
  const out = [];
  if (!scene || !L) return { ok: false, error: "no scene", samples: out };
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 1, 0);
  const points = [];
  for (const b of L.buildings || []) {
    if (b.kind !== "walled" || !b.rect) continue;
    const r = b.rect;
    const minX = Math.min(r.x0, r.x1) + 1.2, maxX = Math.max(r.x0, r.x1) - 1.2;
    const minZ = Math.min(r.z0, r.z1) + 1.2, maxZ = Math.max(r.z0, r.z1) - 1.2;
    if (maxX <= minX || maxZ <= minZ) continue;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    points.push({ id: b.id, label: b.label, x: cx, z: cz });
    points.push({ id: b.id, label: b.label, x: (minX + cx) / 2, z: (minZ + cz) / 2 });
    points.push({ id: b.id, label: b.label, x: (maxX + cx) / 2, z: (maxZ + cz) / 2 });
  }
  // Interiors that aren't tagged walled: sample tile centers.
  const g = L.grid;
  if (g?.tiles && !(L.buildings || []).some((b) => b.kind === "walled")) {
    const cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
    for (let r = 0; r < g.tiles.length; r += 2) {
      const row = g.tiles[r] || "";
      for (let c = 0; c < row.length; c += 2) {
        const def = (g.legend || {})[row[c]] || {};
        if (def.name !== "interior_floor" && row[c] !== ",") continue;
        points.push({ id: L.id, label: "interior", x: o.x + (c + 0.5) * cs, z: o.z + (r + 0.5) * cs });
      }
    }
  }
  for (const p of points) {
    // Only test points that are actually inside a room (skip if the 1.2 inset landed in a wall).
    if (!isEnclosedInterior(runtime, p.x, p.z)) continue;
    origin.set(p.x, 1.55, p.z);
    ray.set(origin, dir);
    ray.far = 8;
    const hits = ray.intersectObject(scene, true) || [];
    let ok = false, y = null, kind = null;
    for (const h of hits) {
      const obj = h.object;
      const k = (obj.userData && obj.userData.kind) || obj.name || "";
      const mat = obj.material;
      const isSky = /sky/i.test(k) || (mat && mat.depthWrite === false && !obj.receiveShadow && /sky/i.test(mat.name || ""));
      if (isSky) continue;
      if (h.point.y > 1.8 && h.point.y < 7.5) {
        ok = true; y = h.point.y; kind = k; break;
      }
    }
    out.push({ ...p, ok, y, kind });
  }
  return { ok: out.length > 0 && out.every((s) => s.ok), n: out.length, failed: out.filter((s) => !s.ok), samples: out };
}
