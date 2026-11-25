/** Resolve the current quest objective to a map/nav point, and face it on load. */
import { currentMainObjective, currentSideObjective, listLevelObjectives, isObjectiveComplete, isObjectiveStarted, isSideObjective, flagsOf } from "./questTrack.js?v=r16.3";

const WALL_LIMIT = 3.2;
const DOOR_ARRIVE = 2.2;

let bindsCache = null;
let bindsTried = false;

export function chapterKey(id) {
  return String(id || "ch01").replace(/_.*$/, "") || "ch01";
}

export async function loadObjectiveBinds() {
  if (bindsTried) return bindsCache;
  bindsTried = true;
  try {
    const res = await fetch("./levels/objective_binds.json");
    if (res.ok) bindsCache = await res.json();
  } catch (_) { /* hook file is optional */ }
  return bindsCache;
}

export function getObjectiveBinds() {
  return bindsCache;
}

/** Test hook: allow Playwright to inject or reload binds without a refetch cache miss. */
export function setObjectiveBinds(obj) {
  bindsCache = obj || bindsCache;
  bindsTried = true;
}

function xz(x, z, extra) {
  if (x == null || z == null || Number.isNaN(+x) || Number.isNaN(+z)) return null;
  return extra ? { x: +x, z: +z, ...extra } : { x: +x, z: +z };
}

function npcMatches(n, want) {
  if (!want) return false;
  const w = String(want).toLowerCase();
  const ids = [n.id, n.npc, n.data?.id, n.data?.npc]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  if (ids.includes(w) || ids.includes("npc_" + w)) return true;
  return ids.some((s) => s === w || s.endsWith("_" + w));
}

function allNpcs(game) {
  const L = game.levelRuntime?.L;
  const world = game.world;
  const out = [];
  const seen = new Set();
  for (const n of [...(world?.npcs || []), ...((L?.spawns || {}).npcs || [])]) {
    const key = (n.id || n.npc || "") + "@" + n.x + "," + n.z;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function shapeCenter(shape) {
  if (!shape) return null;
  if (shape.x != null && shape.z != null) return xz(shape.x, shape.z);
  if (shape.type === "circle" && shape.x != null) return xz(shape.x, shape.z);
  if (shape.x0 != null && shape.z0 != null) {
    return xz((shape.x0 + (shape.x1 ?? shape.x0)) / 2, (shape.z0 + (shape.z1 ?? shape.z0)) / 2);
  }
  return null;
}

function tryNpc(game, id) {
  if (!id) return null;
  const n = allNpcs(game).find((x) => npcMatches(x, id));
  return n && n.x != null ? xz(n.x, n.z, { kind: "npc", ref: id }) : null;
}

function tryIt(game, id) {
  if (!id) return null;
  const L = game.levelRuntime?.L;
  const it = (game.world?.interactives || L?.interactives || []).find((x) => x.id === id);
  return it && it.x != null ? xz(it.x, it.z, { kind: "interactive", ref: id }) : null;
}

function trySafe(game, id) {
  if (!id) return null;
  const s = (game.levelRuntime?.L?.safeZones || []).find((x) => x.id === id);
  return s ? xz(s.x, s.z, { kind: "safeZone", ref: id }) : null;
}

function tryLoc(game, id) {
  if (!id) return null;
  const loc = (game.levelRuntime?.L?.locations || []).find((x) => x.id === id);
  if (!loc) return null;
  if (loc.x != null) return xz(loc.x, loc.z, { kind: "location", ref: id });
  const r = loc.rect || loc.shape;
  const c = shapeCenter(r);
  return c ? { ...c, kind: "location", ref: id } : null;
}

function tryLm(game, id) {
  if (!id) return null;
  const lm = (game.levelRuntime?.L?.landmarks || []).find((x) => x.id === id || x.name === id);
  return lm && lm.x != null ? xz(lm.x, lm.z, { kind: "landmark", ref: id }) : null;
}

function tryTrigger(game, id) {
  if (!id) return null;
  const L = game.levelRuntime?.L;
  const t = [...(L?.triggers || []), ...(L?.zones || [])].find((x) => x.id === id);
  if (!t) return null;
  const c = shapeCenter(t.shape || t) || (t.x != null ? xz(t.x, t.z) : null);
  return c ? { ...c, kind: "trigger", ref: id } : null;
}

function buildingById(L, id) {
  if (!id || !L) return null;
  return (L.buildings || []).find((b) => b.id === id || b.label === id) || null;
}

function doorPoints(b) {
  return (b?.doors || []).map((d) => Array.isArray(d) ? { x: d[0], z: d[1] } : { x: d.x, z: d.z }).filter((d) => d.x != null && d.z != null);
}

function tryBuilding(game, id) {
  if (!id) return null;
  const L = game.levelRuntime?.L;
  const b = buildingById(L, id);
  if (!b) return null;
  const p = game.player;
  const doors = doorPoints(b);
  if (doors.length) {
    let best = doors[0], bestD = Infinity;
    for (const d of doors) {
      const dist = p ? Math.hypot((p.x || 0) - d.x, (p.z || 0) - d.z) : 0;
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return xz(best.x, best.z, { kind: "door", ref: id, building: b.id });
  }
  const R = b.rect;
  if (R) return xz((R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2, { kind: "building", ref: id });
  return null;
}

export function resolveHint(game, hint) {
  if (!hint) return null;
  if (typeof hint.x === "number" && typeof hint.z === "number") return xz(hint.x, hint.z, { kind: "point" });
  return tryNpc(game, hint.npc)
    || tryIt(game, hint.interactive)
    || tryIt(game, hint.interactiveAlt)
    || tryBuilding(game, hint.building)
    || tryTrigger(game, hint.trigger)
    || tryTrigger(game, hint.triggerAlt)
    || trySafe(game, hint.safeZone)
    || tryLoc(game, hint.location)
    || tryLm(game, hint.landmark)
    || (hint.x != null ? xz(hint.x, hint.z, { kind: "point" }) : null);
}

function inBuilding(b, x, z, pad = 0.35) {
  const R = b?.rect;
  if (!R || x == null || z == null) return false;
  const minX = Math.min(R.x0, R.x1) - pad, maxX = Math.max(R.x0, R.x1) + pad;
  const minZ = Math.min(R.z0, R.z1) - pad, maxZ = Math.max(R.z0, R.z1) + pad;
  return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
}

function buildingContaining(L, x, z) {
  return (L?.buildings || []).find((b) => b.kind === "walled" && inBuilding(b, x, z, 0.2)) || null;
}

/** If the destination is inside a walled building and the player is still outside, aim at the nearest street door. */
export function navTarget(game, dest) {
  if (!dest) return null;
  const L = game.levelRuntime?.L;
  const p = game.player;
  if (!L || !p) return dest;
  const b = buildingById(L, dest.building) || buildingContaining(L, dest.x, dest.z);
  if (!b || b.kind !== "walled") return dest;
  if (inBuilding(b, p.x, p.z, 0.6)) return dest;
  const doors = doorPoints(b);
  if (!doors.length) return dest;
  let best = doors[0], bestD = Infinity;
  for (const d of doors) {
    const dist = Math.hypot(p.x - d.x, p.z - d.z);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  if (bestD < DOOR_ARRIVE) return dest;
  return { x: best.x, z: best.z, kind: "door", via: "door", building: b.id, dest: { x: dest.x, z: dest.z } };
}

function inferFromObjective(game, o) {
  const L = game.levelRuntime?.L;
  const text = String(o?.text || "").toLowerCase();
  if (!text) return null;
  const flags = flagsOf(o.completeWhen);
  for (const f of flags) {
    const it = (L?.interactives || []).find((x) => x.setsFlag === f);
    if (it && it.x != null) return xz(it.x, it.z, { kind: "interactive", ref: it.id });
  }
  for (const n of allNpcs(game)) {
    const names = [n.npc, n.name, n.label, n.id].filter(Boolean).map((s) => String(s).toLowerCase());
    for (const name of names) {
      const token = name.replace(/^npc_/, "").replace(/_/g, " ").split(" ")[0];
      if (token.length > 2 && text.includes(token)) return xz(n.x, n.z, { kind: "npc", ref: n.npc || n.id });
    }
  }
  for (const b of L?.buildings || []) {
    const lab = String(b.label || b.id || "").toLowerCase();
    if (lab.length > 3 && text.includes(lab.split("(")[0].trim())) {
      return tryBuilding(game, b.id);
    }
  }
  for (const loc of L?.locations || []) {
    const name = String(loc.name || loc.id || "").toLowerCase();
    if (name.length > 3 && text.includes(name.split("·")[0].trim().toLowerCase())) {
      return tryLoc(game, loc.id);
    }
  }
  for (const it of L?.interactives || []) {
    const lab = String(it.label || it.id || "").toLowerCase();
    const head = lab.split(":")[0].trim();
    if (head.length > 3 && text.includes(head)) return xz(it.x, it.z, { kind: "interactive", ref: it.id });
  }
  return null;
}

function pickHint(game, o) {
  const L = game.levelRuntime?.L;
  const ch = chapterKey(L?.id || L?.chapter || game.flags?.chapter);
  const hook = bindsCache && (bindsCache[ch] || bindsCache[L?.id || ""]);
  const hint = hook && (hook[o.id] || hook[o.quest]);
  if (!hint) return null;
  const ctx = game._storyCtx ? game._storyCtx() : { flags: game.flags || {} };
  const flags = ctx.flags || {};
  if (Array.isArray(hint.steps) && hint.steps.length) {
    const step = hint.steps.find((s) => s && s.flag && !flags[s.flag]) || hint.steps[hint.steps.length - 1];
    return step || hint;
  }
  return hint;
}

/**
 * Current main-objective target, re-resolved every call (objective / step / chapter / save).
 * Indoor items route to the building door until the player is at or inside it.
 */
export function currentObjectiveTarget(game, opts = {}) {
  const o = currentMainObjective(game);
  if (!o) return null;
  const hint = pickHint(game, o);
  let pt = resolveHint(game, hint) || inferFromObjective(game, o);
  if (!pt) return null;
  if (opts.skipDoorRoute) return { ...pt, id: o.id, text: o.text };
  const nav = navTarget(game, pt);
  return { ...nav, id: o.id, text: o.text, destKind: pt.kind, destRef: pt.ref };
}

/** Back-compat alias used by the minimap / full map. */
export function boundObjectivePosition(game) {
  return currentObjectiveTarget(game);
}

/** Active side-job target (e.g. diesel valve, then Ames). */
export function currentSideObjectiveTarget(game, opts = {}) {
  const o = currentSideObjective(game);
  if (!o) return null;
  const hint = pickHint(game, o);
  let pt = resolveHint(game, hint) || inferFromObjective(game, o);
  if (!pt) return null;
  if (opts.skipDoorRoute) return { ...pt, id: o.id, text: o.text, side: true };
  const nav = navTarget(game, pt);
  return { ...nav, id: o.id, text: o.text, side: true, destKind: pt.kind, destRef: pt.ref };
}

export function yawToward(x, z, tx, tz) {
  return Math.atan2(-(tx - x), -(tz - z));
}

export function wallAheadDistance(world, x, z, yaw, maxDist = WALL_LIMIT, rad = 0.32, step = 0.2) {
  if (!world?.blocked) return Infinity;
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
  for (let t = step; t <= maxDist + 1e-6; t += step) {
    if (world.blocked(x + dx * t, z + dz * t, rad)) return t;
  }
  return Infinity;
}

function angDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

export function pickSpawnYaw(game, x, z, authoredYaw) {
  const world = game.world;
  const L = game.levelRuntime?.L;
  const dest = currentObjectiveTarget(game);
  const cands = [];
  const push = (yaw, tag) => {
    if (yaw == null || Number.isNaN(+yaw)) return;
    cands.push({ yaw, tag, hit: wallAheadDistance(world, x, z, yaw, 8) });
  };
  let objYaw = null;
  if (dest) {
    objYaw = yawToward(x, z, dest.x, dest.z);
    const dist = Math.hypot(dest.x - x, dest.z - z);
    const hit = wallAheadDistance(world, x, z, objYaw, Math.min(12, Math.max(3.2, dist)));
    const far = dist > 60;
    const blocked = Number.isFinite(hit) && hit < Math.min(8, Math.max(0, dist - 0.6));
    if (!far && !blocked) return objYaw;
    push(objYaw, "objective");
  }
  if (authoredYaw != null) push(authoredYaw, "authored");
  const path = (L?.paths?.critical || []).map((p) => Array.isArray(p) ? { x: p[0], z: p[1] } : p);
  const fwd = path.find((p) => Math.hypot(p.x - x, p.z - z) > 2.5);
  if (fwd) push(yawToward(x, z, fwd.x, fwd.z), "path");
  for (let i = 0; i < 16; i++) push((i / 16) * Math.PI * 2, "scan");
  const prefer = objYaw != null ? objYaw : (authoredYaw ?? 0);
  const clear = cands.filter((c) => c.hit > WALL_LIMIT);
  const pool = clear.length ? clear : cands;
  pool.sort((a, b) => (clear.length ? angDiff(a.yaw, prefer) - angDiff(b.yaw, prefer) : 0) || b.hit - a.hit);
  return pool[0]?.yaw ?? prefer;
}

export function orientPlayerToObjective(game, { authoredYaw } = {}) {
  const p = game.player;
  if (!p) return null;
  const yaw = pickSpawnYaw(game, p.x, p.z, authoredYaw ?? p.yaw);
  p.yaw = yaw;
  p.pitch = 0;
  p.syncCamera?.();
  const info = {
    yaw,
    pitch: 0,
    x: p.x,
    z: p.z,
    wall: wallAheadDistance(game.world, p.x, p.z, yaw, 6),
    target: currentObjectiveTarget(game),
  };
  game.__ASHFALL_SPAWN_FACE = info;
  if (typeof window !== "undefined") window.__ASHFALL_SPAWN_FACE = info;
  return info;
}

function triggerCenter(t) {
  return shapeCenter(t.shape || t) || (t.x != null ? xz(t.x, t.z) : null);
}

function isCheckpointTrigger(t) {
  if (!t) return false;
  if (t.type === "checkpoint") return true;
  const acts = t.actions || t.onEnter || t.effects || [];
  return acts.some((a) => a && a.type === "checkpoint");
}

export function shouldOrientOnLoad(game) {
  const p = game.player;
  const L = game.levelRuntime?.L;
  if (!p) return false;
  const spawn = game.levelRuntime?.spawn || (L?.spawns?.player || [])[0];
  if (spawn && Math.hypot(p.x - spawn.x, p.z - spawn.z) <= 4.5) return true;
  for (const t of L?.triggers || []) {
    if (!isCheckpointTrigger(t)) continue;
    const c = triggerCenter(t);
    if (!c) continue;
    const sh = t.shape || t;
    if (sh.x0 != null) {
      const pad = 3;
      if (p.x >= Math.min(sh.x0, sh.x1) - pad && p.x <= Math.max(sh.x0, sh.x1) + pad
        && p.z >= Math.min(sh.z0, sh.z1) - pad && p.z <= Math.max(sh.z0, sh.z1) + pad) return true;
    } else if (Math.hypot(p.x - c.x, p.z - c.z) <= 4.5) return true;
  }
  return false;
}

/** Every main + side objective (and each bind step) must resolve to a point. */
export function auditObjectives(game) {
  const L = game.levelRuntime?.L;
  const ch = chapterKey(L?.id || L?.chapter || game.flags?.chapter);
  const hook = bindsCache && (bindsCache[ch] || bindsCache[L?.id || ""]);
  const ctx = game._storyCtx ? game._storyCtx() : { flags: game.flags || {} };
  const saved = { ...(ctx.flags || {}) };
  const rows = [];
  const objs = listLevelObjectives(game);
  for (const o of objs) {
    const hint = hook && (hook[o.id] || hook[o.quest]);
    const steps = Array.isArray(hint?.steps) && hint.steps.length
      ? hint.steps
      : [hint || {}];
    // Clear step flags so each step can be resolved independently.
    for (const s of steps) {
      if (s?.flag) ctx.flags[s.flag] = false;
    }
    for (const s of steps) {
      const use = s && (s.npc || s.interactive || s.building || s.trigger || s.location || s.safeZone || s.x != null)
        ? s
        : hint;
      let pt = resolveHint(game, use) || inferFromObjective(game, o);
      if (s?.flag) ctx.flags[s.flag] = true;
      rows.push({
        id: o.id,
        text: o.text,
        side: !!isSideObjective(o),
        step: s?.flag || o.id,
        ok: !!pt,
        x: pt?.x, z: pt?.z, kind: pt?.kind, ref: pt?.ref,
      });
    }
  }
  ctx.flags = Object.assign(ctx.flags, saved);
  const missing = rows.filter((r) => !r.ok);
  return { chapter: ch, n: rows.length, ok: missing.length === 0, missing, rows };
}

export function auditSpawnFacing(game) {
  const p = game.player;
  const yaw = p?.yaw ?? 0;
  const wall = wallAheadDistance(game.world, p.x, p.z, yaw, 6);
  return {
    x: p.x, z: p.z, yaw, pitch: p.pitch,
    wall,
    ok: !(Number.isFinite(wall) && wall <= WALL_LIMIT),
    target: currentObjectiveTarget(game),
  };
}
