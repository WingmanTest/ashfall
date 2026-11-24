// Interior dressing: Cartographer levels/interior_previews overlays + Sculptor arch set.
// Doors and windows are cut into walls (README wall-cut rules). Door cells stay
// walk-through — we never add a collider across a doorway. Dressing props do
// not collide. Vegetation colliders are not added.
import * as THREE from "three";
import {
  ARCH_CATALOG, ARCH_DECAL_FRAMES, ARCH_TEXTURES,
  loadArchModel, makeArchInstanced, setDoorOpen, setArchSeason,
  loadFloorTexture, makeArchFloorDecals, makeArchDust, archPoseMatrix,
} from "../models/registry.js?v=r16.1";
import { gltfLoader } from "./models3d.js?v=r16.1";
import { ARCH_OPENINGS, addPunchedWall, applyWorldUV } from "./buildings.js?v=r16.1";

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
