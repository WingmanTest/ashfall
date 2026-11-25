/** B_round minimap: fixed-north circular map, per Cartographer NOTES.md. */
import { boundObjectivePosition, currentSideObjectiveTarget, loadObjectiveBinds, chapterKey } from "./objectiveNav.js?v=r16.3";
export { boundObjectivePosition, loadObjectiveBinds, currentSideObjectiveTarget };

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

    // Solid gold guide to the CURRENT objective only. (The old gold dashed
    // stroke was L.paths.critical — a static whole-chapter tour, not a
    // live quest pointer — and was removed in r16.3.)
    {
      const obj = boundObjectivePosition(game);
      if (obj) {
        const cx = BEZEL + PLOT / 2, cy = BEZEL + PLOT / 2;
        let [ex, ey] = toPlot(px, pz, obj.x, obj.z);
        const dx = ex - cx, dy = ey - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const rim = PLOT / 2 - 6;
        if (dist > rim) {
          ex = cx + dx / dist * rim;
          ey = cy + dy / dist * rim;
        }
        bctx.save();
        bctx.beginPath();
        bctx.arc(cx, cy, PLOT / 2 - 3, 0, Math.PI * 2);
        bctx.clip();
        bctx.strokeStyle = "rgb(236, 196, 52)";
        bctx.lineWidth = 2;
        bctx.setLineDash([]);
        bctx.lineCap = "round";
        bctx.beginPath();
        bctx.moveTo(cx, cy);
        bctx.lineTo(ex, ey);
        bctx.stroke();
        bctx.restore();
      }
    }

    // Dashed copper guide to the current SIDE job (visually distinct from the solid gold main line).
    {
      const sideObj = currentSideObjectiveTarget(game);
      if (sideObj) {
        const cx = BEZEL + PLOT / 2, cy = BEZEL + PLOT / 2;
        let [ex, ey] = toPlot(px, pz, sideObj.x, sideObj.z);
        const dx = ex - cx, dy = ey - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const rim = PLOT / 2 - 6;
        if (dist > rim) {
          ex = cx + dx / dist * rim;
          ey = cy + dy / dist * rim;
        }
        bctx.save();
        bctx.beginPath();
        bctx.arc(cx, cy, PLOT / 2 - 3, 0, Math.PI * 2);
        bctx.clip();
        bctx.strokeStyle = "rgb(200, 132, 64)";
        bctx.lineWidth = 1.5;
        bctx.setLineDash([3, 3]);
        bctx.lineCap = "round";
        bctx.beginPath();
        bctx.moveTo(cx, cy);
        bctx.lineTo(ex, ey);
        bctx.stroke();
        bctx.setLineDash([]);
        bctx.restore();
      }
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
    view._ashGame = game;
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
    if (api.isOpen()) drawWorldMap(game);
  }

  const api = { tick, draw, canvas: view, isOpen: () => false, open() {}, close() {}, toggle() {} };
  bindWorldMap(api, view, tick);
  return api;
}

function buildingLabel(b) {
  return String(b?.label || b?.name || "").trim();
}

function bindWorldMap(api, mini, tick) {
  const wrap = document.getElementById("worldmap");
  const canvas = document.getElementById("worldmap-canvas");
  const closeBtn = document.getElementById("worldmap-close");
  if (!wrap || !canvas) return;
  let open = false;
  let gameRef = null;

  function setOpen(on, game) {
    open = !!on;
    if (game) gameRef = game;
    const g = game || gameRef;
    wrap.classList.toggle("show", open);
    wrap.hidden = !open;
    document.body.classList.toggle("map-open", open);
    if (g) {
      g._mapOpen = open;
      if (open) {
        document.exitPointerLock?.();
        try { g.input?.resetTouch?.(); } catch {}
        drawWorldMap(g);
      }
    }
  }
  api.isOpen = () => open;
  api.open = (game) => setOpen(true, game);
  api.close = (game) => setOpen(false, game);
  api.toggle = (game) => setOpen(!open, game);

  const onToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    gameRef = mini._ashGame || gameRef || window.__ASHFALL_GAME;
    setOpen(!open, gameRef);
  };
  mini.addEventListener("pointerdown", onToggle);
  mini.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
  closeBtn?.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setOpen(false, gameRef); });
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.id === "worldmap-hint" || e.target.id === "worldmap-bar" || e.target.id === "worldmap-title") {
      setOpen(false, gameRef);
    }
  });
}

export function drawWorldMap(game) {
  const canvas = document.getElementById("worldmap-canvas");
  const wrap = document.getElementById("worldmap");
  if (!canvas || !wrap || !wrap.classList.contains("show")) return;
  const L = game.levelRuntime?.L;
  const p = game.player;
  if (!L?.grid || !p) return;
  const g = L.grid;
  const cs = g.cellSize || 2;
  const tiles = g.tiles || [];
  const legend = g.legend || {};
  const cols = g.cols || (tiles[0] && tiles[0].length) || 1;
  const rows = g.rows || tiles.length || 1;
  const origin = g.origin || { x: 0, z: 0 };
  const worldW = cols * cs;
  const worldH = rows * cs;

  const bar = document.getElementById("worldmap-bar");
  const hint = document.getElementById("worldmap-hint");
  const cssW = Math.max(64, wrap.clientWidth || 390);
  const cssH = Math.max(64, (wrap.clientHeight || 844) - (bar?.offsetHeight || 40) - (hint?.offsetHeight || 28));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
  }
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, W, H);

  const padL = Math.round(22 * dpr);
  const padR = Math.round(52 * dpr); // leave the corner minimap chip clear
  const padT = Math.round(36 * dpr);
  const padB = Math.round(16 * dpr);
  const scale = Math.min((W - padL - padR) / worldW, (H - padT - padB) / worldH);
  const ox = padL + (W - padL - padR - worldW * scale) / 2;
  const oy = padT + (H - padT - padB - worldH * scale) / 2;
  const toS = (x, z) => [ox + (x - origin.x) * scale, oy + (z - origin.z) * scale];

  // Terrain
  for (let r = 0; r < rows; r++) {
    const row = tiles[r] || "";
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      const col = tileColor(legend[ch]);
      const [sx, sy] = toS(origin.x + c * cs, origin.z + r * cs);
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillRect(sx, sy, Math.ceil(cs * scale) + 0.5, Math.ceil(cs * scale) + 0.5);
    }
  }

  // Building footprints (subtle)
  ctx.lineWidth = Math.max(1, 1 * dpr);
  for (const b of L.buildings || []) {
    const R = b.rect;
    if (!R) continue;
    const minX = Math.min(R.x0, R.x1), maxX = Math.max(R.x0, R.x1);
    const minZ = Math.min(R.z0, R.z1), maxZ = Math.max(R.z0, R.z1);
    const [x0, y0] = toS(minX, minZ);
    const [x1, y1] = toS(maxX, maxZ);
    ctx.strokeStyle = "rgba(200,220,230,0.35)";
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }

  // Solid gold guide to the current objective, then the cyan diamond.
  const obj = boundObjectivePosition(game);
  if (obj) {
    const [ox2, oy2] = toS(obj.x, obj.z);
    const [px2, py2] = toS(p.x, p.z);
    ctx.strokeStyle = "rgb(236, 196, 52)";
    ctx.lineWidth = Math.max(2, 2 * dpr);
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px2, py2);
    ctx.lineTo(ox2, oy2);
    ctx.stroke();
  }
  const sideObj = currentSideObjectiveTarget(game);
  if (sideObj) {
    const [oxs, oys] = toS(sideObj.x, sideObj.z);
    const [pxs, pys] = toS(p.x, p.z);
    ctx.strokeStyle = "rgb(200, 132, 64)";
    ctx.lineWidth = Math.max(1.5, 1.5 * dpr);
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pxs, pys);
    ctx.lineTo(oxs, oys);
    ctx.stroke();
    ctx.setLineDash([]);
    const s = Math.max(4, 5 * dpr);
    ctx.fillStyle = "rgb(200, 132, 64)";
    ctx.beginPath();
    ctx.moveTo(oxs, oys - s);
    ctx.lineTo(oxs + s, oys);
    ctx.lineTo(oxs, oys + s);
    ctx.lineTo(oxs - s, oys);
    ctx.closePath();
    ctx.fill();
  }
  if (obj) {
    const [sx, sy] = toS(obj.x, obj.z);
    const s = Math.max(5, 6 * dpr);
    ctx.fillStyle = "rgb(80, 220, 230)";
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s, sy);
    ctx.lineTo(sx, sy + s);
    ctx.lineTo(sx - s, sy);
    ctx.closePath();
    ctx.fill();
  }

  // Player
  {
    const [sx, sy] = toS(p.x, p.z);
    const yaw = p.yaw || 0;
    const lookAng = Math.atan2(-Math.sin(yaw), Math.cos(yaw));
    const canvasFwd = lookAng - Math.PI / 2;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(canvasFwd + Math.PI / 2);
    const s = Math.max(5, 6 * dpr);
    ctx.fillStyle = "#e8eef4";
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.2);
    ctx.lineTo(s * 0.75, s * 0.8);
    ctx.lineTo(0, s * 0.4);
    ctx.lineTo(-s * 0.75, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgb(80, 220, 230)";
    ctx.fillRect(-s * 0.22, -s * 0.2, s * 0.44, s * 0.75);
    ctx.restore();
  }

  // Building name labels sit above each building, then fall back inside the
  // footprint. They are always clamped fully on-screen (and clear of the minimap chip).
  const margin = Math.round(8 * dpr);
  const chipR = Math.round(62 * dpr); // #minimap in the top-right of the portrait HUD
  const fontPx = Math.max(10, Math.round(11 * dpr));
  ctx.font = `${fontPx}px ui-monospace, Cascadia Code, DejaVu Sans Mono, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.letterSpacing = "0.04em";
  const placed = [];
  const labels = [];
  for (const b of L.buildings || []) {
    const name = buildingLabel(b);
    if (!name) continue;
    const R = b.rect;
    if (!R) continue;
    const minX = Math.min(R.x0, R.x1), maxX = Math.max(R.x0, R.x1);
    const minZ = Math.min(R.z0, R.z1), maxZ = Math.max(R.z0, R.z1);
    labels.push({ name, minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2 });
  }
  labels.sort((a, b) => a.minZ - b.minZ);

  const maxTextW = Math.max(40, W - margin * 2 - 4 * dpr);
  function wrapName(name, maxW) {
    if (ctx.measureText(name).width <= maxW) return [name];
    const words = name.split(/(\s+)/).filter((s) => s.trim().length);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (ctx.measureText(trial).width <= maxW) cur = trial;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [name];
  }
  function inChip(left, top, right, bot) {
    // canvas top-right corner is under the circular minimap chip
    return right > W - chipR && top < chipR;
  }
  function blocked(left, top, right, bot, skip) {
    if (left < margin || right > W - margin || top < margin || bot > H - margin) return true;
    if (inChip(left, top, right, bot)) return true;
    const cx = (left + right) / 2, cy = (top + bot) / 2, tw = right - left, th = bot - top;
    return placed.some((q, i) => {
      if (i === skip) return false;
      return Math.abs(q.x - cx) < (q.w + tw) / 2 + 3 * dpr && Math.abs(q.y - cy) < (q.h + th) / 2 + 2 * dpr;
    });
  }
  function clampBox(x, y, tw, th) {
    let left = x - tw / 2, right = x + tw / 2, top = y - th, bot = y;
    if (inChip(left, top, right, bot)) {
      x = W - chipR - tw / 2 - margin;
      left = x - tw / 2; right = x + tw / 2;
    }
    if (left < margin) { x = margin + tw / 2; left = x - tw / 2; right = x + tw / 2; }
    if (right > W - margin) { x = W - margin - tw / 2; left = x - tw / 2; right = x + tw / 2; }
    if (top < margin) { y = margin + th; top = y - th; bot = y; }
    if (bot > H - margin) { y = H - margin; top = y - th; bot = y; }
    return { x, y, left, right, top, bot };
  }

  for (const lab of labels) {
    const [bx0, by0] = toS(lab.minX, lab.minZ);
    const [bx1, by1] = toS(lab.maxX, lab.maxZ);
    const bLeft = Math.min(bx0, bx1), bRight = Math.max(bx0, bx1);
    const bTop = Math.min(by0, by1), bBot = Math.max(by0, by1);
    const cx = (bLeft + bRight) / 2;
    const lines = wrapName(lab.name, Math.min(maxTextW, Math.max(80 * dpr, bRight - bLeft + 36 * dpr)));
    const lineH = fontPx + 2 * dpr;
    const tw = Math.max(...lines.map((s) => ctx.measureText(s).width));
    const th = lines.length * lineH + 4 * dpr;
    const padX = 3 * dpr;
    const candidates = [
      { x: cx, y: bTop - 4 * dpr },            // above (north)
      { x: cx, y: bTop + th + 6 * dpr },       // just inside the top
      { x: cx, y: (bTop + bBot) / 2 + th / 2 },
      { x: cx, y: bBot - 4 * dpr },
      { x: bLeft + tw / 2 + 6 * dpr, y: bTop + th + 6 * dpr },
      { x: bRight - tw / 2 - 6 * dpr, y: bTop + th + 6 * dpr },
    ];
    let pick = null;
    for (const c of candidates) {
      const b = clampBox(c.x, c.y, tw + padX * 2, th);
      if (!blocked(b.left, b.top, b.right, b.bot)) { pick = b; break; }
    }
    if (!pick) pick = clampBox(cx, Math.max(bTop + th + 4 * dpr, margin + th), tw + padX * 2, th);
    placed.push({ x: pick.x, y: (pick.top + pick.bot) / 2, w: tw + padX * 2, h: th });
    ctx.fillStyle = "rgba(10,13,18,0.78)";
    ctx.fillRect(pick.left, pick.top, pick.right - pick.left, pick.bot - pick.top);
    ctx.fillStyle = "#e8eef4";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    lines.forEach((line, i) => {
      ctx.fillText(line, pick.x, pick.top + (i + 1) * lineH);
    });
  }

  // Gold N at the top of the plot
  ctx.fillStyle = "rgb(212,168,58)";
  ctx.font = `${Math.max(10, Math.round(10 * dpr))}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", W / 2, Math.max(10 * dpr, oy - 10 * dpr));
}
