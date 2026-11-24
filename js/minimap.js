/** B_round minimap: fixed-north circular map, per Cartographer NOTES.md. */
import { currentMainObjective } from "./questTrack.js?v=r15.2";

const PLOT = 78;
const BEZEL = 6;
const SRC = PLOT + BEZEL * 2; // 90
const SCALE = 2;
const VIEW_R = 22;
const PPM = PLOT / (VIEW_R * 2); // 78/44
const SIGHT = 18;
const PATH_DILATE = 13;
const CONE_DEG = 70;
const CONE_M = 14;
const PANEL_A = 140;
const REDRAW_MS = 140;

const TERRAIN = {
  snow_ground: [170, 182, 194],
  dirt_gravel: [110, 100, 86],
  dry_dirt: [160, 136, 96],
  road: [96, 104, 110],
  road_damaged: [88, 90, 92],
  asphalt_dry: [110, 104, 96],
  interior_floor: [140, 132, 116],
  door: [180, 130, 50],
  wall: [74, 50, 44],
  high_wall: [48, 50, 54],
  building_mass: [52, 56, 62],
  fence: [100, 68, 44],
  cover_low: [120, 104, 64],
  debris: [86, 70, 56],
  open_water: [36, 58, 78],
  river_ice: [150, 178, 194],
  thin_ice: [110, 150, 170],
  chasm: [16, 18, 22],
  bridge_deck: [96, 86, 74],
  covered_floor: [72, 80, 86],
  locked_gate: [150, 50, 40],
  tree: [36, 62, 44],
  sagebrush: [90, 110, 70],
};

let bindsCache = null;
let bindsTried = false;

export async function loadObjectiveBinds() {
  if (bindsTried) return bindsCache;
  bindsTried = true;
  try {
    const res = await fetch("./levels/objective_binds.json");
    if (res.ok) bindsCache = await res.json();
  } catch (_) { /* hook file is optional */ }
  return bindsCache;
}

function hexrgb(h) {
  const s = String(h || "").replace("#", "");
  if (s.length !== 6) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function tileColor(def) {
  if (!def) return [40, 42, 46];
  if (def.preview) {
    const c = hexrgb(def.preview);
    if (c) return c.map((v) => Math.round(v * 0.72));
  }
  if (TERRAIN[def.name]) return TERRAIN[def.name];
  if (def.solid || def.name === "wall") return TERRAIN.wall;
  if (def.water) return TERRAIN.open_water;
  return [90, 90, 90];
}

function chapterKey(id) {
  return String(id || "ch01").replace(/_.*$/, "") || "ch01";
}

function ensureFog(game, L) {
  game.exploredFog = game.exploredFog || {};
  const id = chapterKey(L?.id || L?.chapter || game.flags?.chapter);
  const cols = L?.grid?.cols || 1;
  const rows = L?.grid?.rows || 1;
  let rec = game.exploredFog[id];
  if (!rec || rec.cols !== cols || rec.rows !== rows || !rec.bits) {
    rec = { cols, rows, bits: new Uint8Array(Math.ceil(cols * rows / 8)) };
    if (game.exploredFog[id]?.pack) unpackFog(rec, game.exploredFog[id].pack);
    game.exploredFog[id] = rec;
    seedFog(game, L, rec);
  }
  return rec;
}

function fogIndex(rec, c, r) {
  if (c < 0 || r < 0 || c >= rec.cols || r >= rec.rows) return -1;
  return r * rec.cols + c;
}

function fogGet(rec, c, r) {
  const i = fogIndex(rec, c, r);
  if (i < 0) return false;
  return !!(rec.bits[i >> 3] & (1 << (i & 7)));
}

function fogSet(rec, c, r) {
  const i = fogIndex(rec, c, r);
  if (i < 0) return;
  rec.bits[i >> 3] |= 1 << (i & 7);
}

export function packExploredFog(explored) {
  const out = {};
  for (const [k, rec] of Object.entries(explored || {})) {
    if (!rec?.bits) continue;
    let s = "";
    for (let i = 0; i < rec.bits.length; i++) s += String.fromCharCode(rec.bits[i]);
    out[k] = { cols: rec.cols, rows: rec.rows, pack: btoa(s) };
  }
  return out;
}

function unpackFog(rec, pack) {
  try {
    const raw = atob(pack);
    const bits = rec.bits;
    for (let i = 0; i < raw.length && i < bits.length; i++) bits[i] = raw.charCodeAt(i) & 255;
  } catch (_) { /* ignore bad saves */ }
}

export function restoreExploredFog(game, packed) {
  game.exploredFog = {};
  for (const [k, v] of Object.entries(packed || {})) {
    const rec = { cols: v.cols || 1, rows: v.rows || 1, bits: new Uint8Array(Math.ceil(((v.cols || 1) * (v.rows || 1)) / 8)) };
    if (v.pack) unpackFog(rec, v.pack);
    game.exploredFog[k] = rec;
  }
}

function worldToCell(L, x, z) {
  const g = L?.grid;
  if (!g) return [0, 0];
  const cs = g.cellSize || 2, ox = g.origin?.x || 0, oz = g.origin?.z || 0;
  return [Math.floor((x - ox) / cs), Math.floor((z - oz) / cs)];
}

function stampDisk(rec, L, x, z, radiusM) {
  const g = L?.grid;
  if (!g) return;
  const cs = g.cellSize || 2;
  const [cc, rr] = worldToCell(L, x, z);
  const rad = Math.ceil(radiusM / cs);
  const r2 = radiusM * radiusM;
  for (let r = rr - rad; r <= rr + rad; r++) {
    for (let c = cc - rad; c <= cc + rad; c++) {
      const wx = (g.origin?.x || 0) + (c + 0.5) * cs;
      const wz = (g.origin?.z || 0) + (r + 0.5) * cs;
      const dx = wx - x, dz = wz - z;
      if (dx * dx + dz * dz <= r2) fogSet(rec, c, r);
    }
  }
}

function seedFog(game, L, rec) {
  const spawn = L?.spawns?.player?.[0] || { x: game.player?.x || 0, z: game.player?.z || 0 };
  stampDisk(rec, L, spawn.x, spawn.z, SIGHT);
  if (game.player) stampDisk(rec, L, game.player.x, game.player.z, SIGHT);
}

function stampWalkedPath(game, L, rec) {
  const path = pathPoints(L);
  const cut = walkedPrefix(game.player, path);
  for (let i = 0; i < cut; i++) stampDisk(rec, L, path[i].x, path[i].z, PATH_DILATE);
}

function exploreAround(game, L) {
  if (!L?.grid || !game.player) return;
  const rec = ensureFog(game, L);
  stampDisk(rec, L, game.player.x, game.player.z, SIGHT);
  stampWalkedPath(game, L, rec);
}

function resolvePoint(game, hint) {
  if (!hint) return null;
  if (typeof hint.x === "number" && typeof hint.z === "number") return { x: hint.x, z: hint.z };
  const L = game.levelRuntime?.L;
  const world = game.world;
  const tryNpc = (id) => {
    const n = (world?.npcs || []).find((x) => x.id === id || x.data?.id === id);
    return n ? { x: n.x, z: n.z } : null;
  };
  const tryIt = (id) => {
    const it = (world?.interactives || L?.interactives || []).find((x) => x.id === id);
    return it && it.x != null ? { x: it.x, z: it.z } : null;
  };
  const trySafe = (id) => {
    const s = (L?.safeZones || []).find((x) => x.id === id);
    return s ? { x: s.x, z: s.z } : null;
  };
  const tryLoc = (id) => {
    const loc = (L?.locations || []).find((x) => x.id === id);
    if (!loc) return null;
    if (loc.x != null) return { x: loc.x, z: loc.z };
    const r = loc.rect;
    if (r) return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
    return null;
  };
  const tryLm = (id) => {
    const lm = (L?.landmarks || []).find((x) => x.id === id || x.name === id);
    return lm && lm.x != null ? { x: lm.x, z: lm.z } : null;
  };
  return tryNpc(hint.npc)
    || tryIt(hint.interactive)
    || tryIt(hint.interactiveAlt)
    || trySafe(hint.safeZone)
    || tryLoc(hint.location)
    || tryLm(hint.landmark)
    || (hint.x != null ? { x: hint.x, z: hint.z } : null);
}

export function boundObjectivePosition(game) {
  const o = currentMainObjective(game);
  if (!o) return null;
  const L = game.levelRuntime?.L;
  const ch = chapterKey(L?.id || L?.chapter || game.flags?.chapter);
  const hook = bindsCache && (bindsCache[ch] || bindsCache[L?.id || ""]);
  const hint = hook && (hook[o.id] || hook[o.quest]);
  let pt = resolvePoint(game, hint);
  if (pt) return { ...pt, id: o.id, text: o.text };
  const text = String(o.text || "").toLowerCase();
  const world = game.world;
  for (const n of world?.npcs || []) {
    const name = String(n.name || n.id || "").toLowerCase();
    const id = String(n.id || "").toLowerCase();
    if (id && text.includes(id)) return { x: n.x, z: n.z, id: o.id, text: o.text };
    if (name && name.length > 2 && text.includes(name.split(" ")[0])) return { x: n.x, z: n.z, id: o.id, text: o.text };
  }
  for (const it of world?.interactives || L?.interactives || []) {
    const lab = String(it.label || it.id || "").toLowerCase();
    if (lab && text.includes(lab.split(":")[0].trim())) return { x: it.x, z: it.z, id: o.id, text: o.text };
  }
  const path = L?.paths?.critical;
  if (path && path.length) {
    const last = path[path.length - 1];
    const x = Array.isArray(last) ? last[0] : last.x;
    const z = Array.isArray(last) ? last[1] : last.z;
    return { x, z, id: o.id, text: o.text };
  }
  return null;
}

function pathPoints(L) {
  return (L?.paths?.critical || []).map((p) => Array.isArray(p) ? { x: p[0], z: p[1] } : p);
}

function walkedPrefix(player, path) {
  if (!player || !path.length) return 0;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = Math.hypot(player.x - path[i].x, player.z - path[i].z);
    if (d < bestD) { bestD = d; best = i; }
  }
  return bestD < 10 ? best + 1 : best;
}

export function createMinimap(canvas) {
  const view = canvas;
  view.width = SRC * SCALE;
  view.height = SRC * SCALE;
  const vctx = view.getContext("2d");
  const buf = document.createElement("canvas");
  buf.width = SRC;
  buf.height = SRC;
  const bctx = buf.getContext("2d");
  const lo = document.createElement("canvas");
  lo.width = Math.max(16, Math.round(VIEW_R * 2)); // 1 px/m
  lo.height = lo.width;
  const lctx = lo.getContext("2d");
  let last = 0, lastX = 0, lastZ = 0, lastYaw = 0, lastCh = "";

  function toPlot(px, pz, x, z) {
    const cx = BEZEL + PLOT / 2, cy = BEZEL + PLOT / 2;
    return [cx + (x - px) * PPM, cy + (z - pz) * PPM];
  }

  function clipDisk(ctx) {
    ctx.beginPath();
    ctx.arc(BEZEL + PLOT / 2, BEZEL + PLOT / 2, PLOT / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  function draw(game) {
    const L = game.levelRuntime?.L;
    const p = game.player;
    if (!L?.grid || !p) return;
    exploreAround(game, L);
    const rec = ensureFog(game, L);
    const g = L.grid;
    const cs = g.cellSize || 2;
    const legend = g.legend || {};
    const tiles = g.tiles || [];
    const px = p.x, pz = p.z;

    // Low-res terrain (1 px/m), then nearest-neighbour up into the 78px plot.
    const loR = lo.width / 2;
    const loPpm = lo.width / (VIEW_R * 2);
    const loData = lctx.createImageData(lo.width, lo.height);
    const ld = loData.data;
    for (let y = 0; y < lo.height; y++) {
      for (let x = 0; x < lo.width; x++) {
        const wx = px + (x - loR + 0.5) / loPpm;
        const wz = pz + (y - loR + 0.5) / loPpm;
        const [cc, rr] = worldToCell(L, wx, wz);
        const ch = (tiles[rr] && tiles[rr][cc]) || " ";
        const col = tileColor(legend[ch]);
        const i = (y * lo.width + x) * 4;
        const explored = fogGet(rec, cc, rr);
        const dx = x - loR, dy = y - loR;
        if (dx * dx + dy * dy > loR * loR) {
          ld[i + 3] = 0;
          continue;
        }
        if (explored) {
          ld[i] = col[0]; ld[i + 1] = col[1]; ld[i + 2] = col[2]; ld[i + 3] = PANEL_A;
        } else {
          // Dark hash inside the circle only.
          const hash = ((x >> 1) + (y >> 1)) & 1;
          const v = hash ? 22 : 14;
          ld[i] = v; ld[i + 1] = v + 2; ld[i + 2] = v + 4; ld[i + 3] = PANEL_A;
        }
      }
    }
    lctx.putImageData(loData, 0, 0);

    bctx.clearRect(0, 0, SRC, SRC);
    bctx.imageSmoothingEnabled = false;
    bctx.save();
    clipDisk(bctx);
    bctx.drawImage(lo, 0, 0, lo.width, lo.height, BEZEL, BEZEL, PLOT, PLOT);

    // Gold dashed remainder of the critical path, clipped ~7px inside the disc.
    const path = pathPoints(L);
    const cut = walkedPrefix(p, path);
    const remain = path.slice(Math.max(0, cut - 1));
    if (remain.length > 1) {
      bctx.save();
      bctx.beginPath();
      bctx.arc(BEZEL + PLOT / 2, BEZEL + PLOT / 2, PLOT / 2 - 7, 0, Math.PI * 2);
      bctx.clip();
      bctx.strokeStyle = "rgb(212,168,58)";
      bctx.lineWidth = 1;
      bctx.setLineDash([3, 2]);
      bctx.beginPath();
      for (let i = 0; i < remain.length; i++) {
        const [sx, sy] = toPlot(px, pz, remain[i].x, remain[i].z);
        if (i === 0) bctx.moveTo(sx, sy);
        else bctx.lineTo(sx, sy);
      }
      bctx.stroke();
      bctx.setLineDash([]);
      bctx.restore();
    }

    const inSight = (x, z) => Math.hypot(x - px, z - pz) <= SIGHT;

    // Loot
    for (const Loot of game.world?.loot || []) {
      if (Loot.taken) continue;
      const [sx, sy] = toPlot(px, pz, Loot.x, Loot.z);
      if (Math.hypot(sx - (BEZEL + PLOT / 2), sy - (BEZEL + PLOT / 2)) > PLOT / 2 - 1) continue;
      bctx.fillStyle = Loot.filler ? "rgba(200,170,80,0.55)" : "rgb(212,168,58)";
      bctx.beginPath();
      bctx.moveTo(sx, sy - 1.6);
      bctx.lineTo(sx + 1.6, sy);
      bctx.lineTo(sx, sy + 1.6);
      bctx.lineTo(sx - 1.6, sy);
      bctx.closePath();
      bctx.fill();
    }
    // Loot-like interactives as gold pips (not every door and sign).
    for (const it of game.world?.interactives || []) {
      if (it.taken || it.used) continue;
      const typ = String(it.type || it.kind || "");
      if (!/loot|cache|container|pickup|search|stash/i.test(typ) && !it.loot) continue;
      const [sx, sy] = toPlot(px, pz, it.x, it.z);
      if (Math.hypot(sx - (BEZEL + PLOT / 2), sy - (BEZEL + PLOT / 2)) > PLOT / 2 - 1) continue;
      bctx.fillStyle = "rgb(212,168,58)";
      bctx.beginPath();
      bctx.moveTo(sx, sy - 1.6);
      bctx.lineTo(sx + 1.6, sy);
      bctx.lineTo(sx, sy + 1.6);
      bctx.lineTo(sx - 1.6, sy);
      bctx.closePath();
      bctx.fill();
    }
    // Safe zones
    for (const s of L.safeZones || []) {
      const [sx, sy] = toPlot(px, pz, s.x, s.z);
      if (Math.hypot(sx - (BEZEL + PLOT / 2), sy - (BEZEL + PLOT / 2)) > PLOT / 2 - 2) continue;
      bctx.fillStyle = "rgb(186,154,110)";
      const kind = String(s.kind || "");
      if (/campfire|burn_barrel|tent|camp/i.test(kind)) {
        bctx.beginPath();
        bctx.moveTo(sx, sy - 2.4);
        bctx.lineTo(sx + 1.6, sy + 1.6);
        bctx.lineTo(sx - 1.6, sy + 1.6);
        bctx.closePath();
        bctx.fill();
      } else {
        bctx.fillRect(sx - 1.6, sy - 0.4, 3.2, 2.2);
        bctx.beginPath();
        bctx.moveTo(sx - 2.2, sy - 0.4);
        bctx.lineTo(sx, sy - 2.4);
        bctx.lineTo(sx + 2.2, sy - 0.4);
        bctx.closePath();
        bctx.fill();
      }
    }
    // Enemies: red plus, only in current sight
    for (const e of game.enemies?.list || []) {
      if (!e.alive || e.dormant) continue;
      if (!inSight(e.x, e.z)) continue;
      const [sx, sy] = toPlot(px, pz, e.x, e.z);
      if (Math.hypot(sx - (BEZEL + PLOT / 2), sy - (BEZEL + PLOT / 2)) > PLOT / 2 - 1) continue;
      bctx.strokeStyle = "rgb(200,48,40)";
      bctx.lineWidth = 1;
      bctx.beginPath();
      bctx.moveTo(sx - 1.6, sy); bctx.lineTo(sx + 1.6, sy);
      bctx.moveTo(sx, sy - 1.6); bctx.lineTo(sx, sy + 1.6);
      bctx.stroke();
    }

    // Rim-clamped cyan objective diamond
    const obj = boundObjectivePosition(game);
    if (obj) {
      let [sx, sy] = toPlot(px, pz, obj.x, obj.z);
      const cx = BEZEL + PLOT / 2, cy = BEZEL + PLOT / 2;
      const dx = sx - cx, dy = sy - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const rim = PLOT / 2 - 6;
      if (dist > rim) {
        sx = cx + dx / dist * rim;
        sy = cy + dy / dist * rim;
      }
      bctx.fillStyle = "rgb(80, 220, 230)";
      bctx.beginPath();
      bctx.moveTo(sx, sy - 2.6);
      bctx.lineTo(sx + 2.6, sy);
      bctx.lineTo(sx, sy + 2.6);
      bctx.lineTo(sx - 2.6, sy);
      bctx.closePath();
      bctx.fill();
    }

    // View cone, 70°, 14 m, clipped to the disc
    const yaw = p.yaw || 0;
    const lookAng = Math.atan2(-Math.sin(yaw), Math.cos(yaw)); // clockwise from north, canvas needs conversion
    // Canvas: 0 is +x (east), clockwise is down. North is -Y, which is -PI/2 in canvas.
    const canvasFwd = lookAng - Math.PI / 2;
    const half = (CONE_DEG * Math.PI) / 180 / 2;
    const reach = CONE_M * PPM;
    const cx = BEZEL + PLOT / 2, cy = BEZEL + PLOT / 2;
    bctx.fillStyle = "rgba(200, 220, 230, 0.22)";
    bctx.beginPath();
    bctx.moveTo(cx, cy);
    bctx.arc(cx, cy, reach, canvasFwd - half, canvasFwd + half);
    bctx.closePath();
    bctx.fill();

    // Player arrow (white chevron, cyan core). Rotates; map does not.
    bctx.save();
    bctx.translate(cx, cy);
    bctx.rotate(canvasFwd + Math.PI / 2); // tip toward look
    bctx.fillStyle = "#e8eef4";
    bctx.beginPath();
    bctx.moveTo(0, -3.4);
    bctx.lineTo(2.2, 2.4);
    bctx.lineTo(0, 1.2);
    bctx.lineTo(-2.2, 2.4);
    bctx.closePath();
    bctx.fill();
    bctx.fillStyle = "rgb(80, 220, 230)";
    bctx.fillRect(-0.7, -0.6, 1.4, 2.2);
    bctx.restore();
    bctx.restore(); // end disc clip

    // Bezel
    bctx.strokeStyle = "rgba(28, 34, 40, 0.84)";
    bctx.lineWidth = BEZEL;
    bctx.beginPath();
    bctx.arc(cx, cy, PLOT / 2 + BEZEL / 2, 0, Math.PI * 2);
    bctx.stroke();
    bctx.strokeStyle = "rgba(200, 220, 230, 0.85)";
    bctx.lineWidth = 1;
    bctx.beginPath();
    bctx.arc(cx, cy, PLOT / 2 + 0.5, 0, Math.PI * 2);
    bctx.stroke();
    // Ticks 12/3/6/9 + lighter 45°
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2;
      const major = i % 2 === 0;
      const r0 = PLOT / 2 + (major ? 0.5 : 1.2);
      const r1 = PLOT / 2 + BEZEL - (major ? 0.5 : 1.6);
      bctx.strokeStyle = major ? "rgba(200,220,230,0.9)" : "rgba(200,220,230,0.4)";
      bctx.lineWidth = 1;
      bctx.beginPath();
      bctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      bctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      bctx.stroke();
    }
    // Gold N locked at 12 o'clock + inner lip triangle
    bctx.fillStyle = "rgb(212,168,58)";
    bctx.font = "5px monospace";
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.fillText("N", cx, BEZEL / 2 + 0.5);
    bctx.beginPath();
    bctx.moveTo(cx, BEZEL + 1.2);
    bctx.lineTo(cx - 2, BEZEL + 3.6);
    bctx.lineTo(cx + 2, BEZEL + 3.6);
    bctx.closePath();
    bctx.fill();

    vctx.imageSmoothingEnabled = false;
    vctx.clearRect(0, 0, view.width, view.height);
    vctx.drawImage(buf, 0, 0, SRC, SRC, 0, 0, SRC * SCALE, SRC * SCALE);
  }

  function tick(game, now) {
    const mode = game.mode;
    const show = mode === "play" || mode === "dialogue";
    view.style.display = show ? "block" : "none";
    if (!show) return;
    const p = game.player;
    const ch = chapterKey(game.flags?.chapter);
    const moved = !p || Math.hypot((p.x || 0) - lastX, (p.z || 0) - lastZ) > 0.35
      || Math.abs((p.yaw || 0) - lastYaw) > 0.06
      || ch !== lastCh
      || now - last > 700;
    if (!moved && now - last < REDRAW_MS) return;
    if (now - last < REDRAW_MS && !moved) return;
    last = now;
    if (p) { lastX = p.x; lastZ = p.z; lastYaw = p.yaw; }
    lastCh = ch;
    try { draw(game); } catch (err) {
      if (!tick._warned) { tick._warned = true; console.warn("[minimap]", err); }
    }
  }

  return { tick, draw, canvas: view };
}
