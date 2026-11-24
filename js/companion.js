// Wraith (Braith's Malinois) — follow + Hollow/husk "tells" (Echoes README §12–14, Rev 2).
// Pure gameplay glue: positions world.companion's mesh near the player and fires
// playWraith cues once per threat within range. Never throws.

import { attachMixer, setLocomotion, updateMixer } from "./npcAnim.js?v=r16";
import { repathFromHere } from "./companionCmd.js?v=r16";

const FOLLOW_GAP = 2.2;     // she trots to ~2.2 m behind/right of Braith
const TELL_RANGE = 12;
const _tmp = { x: 0, z: 0 };

function audioEngine(game) {
  return game.audio?.impl?.engine || game.audio?.impl?.a || (typeof window !== "undefined" ? window.GameAudio : null) || null;
}

export function companionFollows(game) {
  const f = game.flags || {};
  if (f.wraith_alive === false || f.wraith_gone || f.wraith_lost) return false;
  const mode = game.companionMode || (f.wraith_stay ? "stay" : "follow");
  if (mode === "stay" || mode === "guard" || mode === "hold") return false;
  if (mode === "track") return false; // lead is handled in tickCompanion
  const ch = String(f.chapter || "ch01");
  if (ch !== "ch01") return true;
  return !!(f.ch01_wraith_fed || f.wraith_fed || f.wraith_following);
}

function _placeWalkable(game, rec, x, z) {
  const world = game.world;
  if (world?.collide) {
    const c = world.collide(x, z, 0.3, rec.x, rec.z);
    x = c.x; z = c.z;
  }
  if (world?.blocked?.(x, z, 0.2) && world.unstuckFrom) {
    const u = world.unstuckFrom(x, z, 0.3, { x: game.player?.x ?? x, z: game.player?.z ?? z });
    x = u.x; z = u.z;
  }
  rec.x = x; rec.z = z;
}

function _moveToward(game, rec, tx, tz, dt, spd) {
  const dx = tx - rec.x, dz = tz - rec.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.28) return 0;
  const step = Math.min(spd, d / Math.max(dt, 1e-3));
  let nx = rec.x + (dx / d) * step * dt;
  let nz = rec.z + (dz / d) * step * dt;
  if (game.world?.collide) { const c = game.world.collide(nx, nz, 0.3, rec.x, rec.z); nx = c.x; nz = c.z; }
  const used = Math.hypot(nx - rec.x, nz - rec.z) / Math.max(dt, 1e-3);
  rec.x = nx; rec.z = nz;
  const want = Math.atan2(dx, dz);
  let dy = want - rec.mesh.rotation.y;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  rec.mesh.rotation.y += dy * Math.min(1, dt * 8);
  return used;
}

function _pruittNear(game, rec) {
  const n = (game.world?.npcs || []).find((p) => p.id === "pruitt" && p.alive !== false);
  if (!n) return false;
  return Math.hypot(rec.x - n.x, rec.z - n.z) < 4.2;
}

function _finishArrival(game, rec) {
  if (rec._arrived) return;
  rec._arrived = true;
  rec._beatT = 0;
  rec._pathI = (rec._path || []).length;
  rec._trackHint = "Wraith found Mr. Pruitt — talk to him";
  game.hud?.say?.("Wraith found him.");
  game.refreshObjective?.();
}

function _leadAlongPath(game, rec, dt) {
  const path = rec._path;
  if (!path || !path.length) return 0;
  if (rec._arrived) return 0;
  if (rec._pathI == null) rec._pathI = 0;

  // Auto-sniff / pause beat — sit, toast once, then continue. No player action.
  if (rec._beatT > 0) {
    rec._beatT -= dt;
    if (rec._beatT <= 0) {
      rec._beatT = 0;
      const wp = path[rec._pathI];
      if (wp && wp.authoredI != null) rec._trailProg = Math.max(rec._trailProg || 0, wp.authoredI + 1);
      rec._pathI = Math.min((rec._pathI || 0) + 1, path.length);
    }
    rec._stuckT = 0;
    return 0;
  }

  while (rec._pathI < path.length) {
    const wp = path[rec._pathI];
    const last = rec._pathI >= path.length - 1;
    if (Math.hypot(rec.x - wp.x, rec.z - wp.z) < (last ? 1.4 : 1.1)) {
      if (wp.beat && rec._beatDone !== rec._pathI) {
        rec._beatDone = rec._pathI;
        rec._beatT = 1.15;
        if (wp.toast) game.hud?.say?.(wp.toast);
        return 0;
      }
      if (wp.authoredI != null) rec._trailProg = Math.max(rec._trailProg || 0, wp.authoredI + 1);
      if (last) {
        _finishArrival(game, rec);
        return 0;
      }
      rec._pathI++;
    } else break;
  }

  if (rec._pathI >= path.length) {
    _finishArrival(game, rec);
    return 0;
  }
  if (_pruittNear(game, rec) && rec._pathI >= path.length - 2) {
    _finishArrival(game, rec);
    return 0;
  }

  const i = Math.min(rec._pathI, path.length - 1);
  const p = path[i];
  const far = Math.hypot((game.player?.x || 0) - rec.x, (game.player?.z || 0) - rec.z);
  const spd = far > 10 ? 2.45 : 2.15;
  const used = _moveToward(game, rec, p.x, p.z, dt, spd) || 0;
  const stillFar = Math.hypot(rec.x - p.x, rec.z - p.z) > 1.1;
  if (used < 0.05 && stillFar) {
    rec._stuckT = (rec._stuckT || 0) + dt;
    if (rec._stuckT > 1.6) {
      const ang = (rec.mesh?.rotation.y || 0) + Math.PI / 2;
      const sx = rec.x + Math.sin(ang) * 1.2;
      const sz = rec.z + Math.cos(ang) * 1.2;
      if (game.world && !game.world.blocked?.(sx, sz, 0.3)) {
        rec.x = sx; rec.z = sz;
      } else if (game.world?.unstuckFrom) {
        const u = game.world.unstuckFrom(rec.x, rec.z, 0.3, p);
        rec.x = u.x; rec.z = u.z;
      }
      rec._stuckT = 0;
      rec._repathOnce = false;
      try { repathFromHere(game); } catch {}
    } else if (rec._stuckT > 0.8 && !rec._repathOnce) {
      rec._repathOnce = true;
      try { repathFromHere(game); } catch {}
    }
  } else {
    rec._stuckT = 0;
    rec._repathOnce = false;
  }
  return used;
}

export function tickCompanion(game, dt) {
  const rec = game.world?.companion;
  if (!rec || !rec.mesh || rec.alive === false) return;
  const p = game.player;
  if (!p) return;
  const st = rec._c || (rec._c = { t: 0, told: new WeakSet(), barkCd: 0, moving: false });
  st.t += dt;
  st.barkCd = Math.max(0, st.barkCd - dt);
  const mode = game.companionMode || ((game.flags || {}).wraith_stay ? "stay" : "follow");
  let speed = 0;
  if (mode === "track") {
    const far = Math.hypot(p.x - rec.x, p.z - rec.z);
    if (far > 28 && rec._path && rec._path.length) {
      const wp = rec._path[Math.min(rec._pathI || 0, rec._path.length - 1)];
      _placeWalkable(game, rec, wp.x, wp.z);
    }
    speed = _leadAlongPath(game, rec, dt) || 0;
  } else if (mode === "stay" || mode === "guard" || mode === "hold") {
    const hx = rec._holdX ?? rec.x, hz = rec._holdZ ?? rec.z;
    if (mode === "hold" && rec._holdTarget && rec._holdTarget.alive) {
      rec._holdX = rec._holdTarget.x; rec._holdZ = rec._holdTarget.z;
    }
    speed = _moveToward(game, rec, rec._holdX ?? hx, rec._holdZ ?? hz, dt, 1.8) || 0;
  } else if (companionFollows(game)) {
    // Target: behind and slightly right of Braith's facing.
    const yaw = p.yaw || 0;
    const tx = p.x + Math.sin(yaw) * 1.6 + Math.cos(yaw) * 0.9;
    const tz = p.z + Math.cos(yaw) * 1.6 - Math.sin(yaw) * 0.9;
    const d = Math.hypot(tx - rec.x, tz - rec.z);
    const far = Math.hypot(p.x - rec.x, p.z - rec.z);
    if (far > 24) {
      _placeWalkable(game, rec, tx, tz);
    } else if (d > 0.35 && far > FOLLOW_GAP * 0.6) {
      speed = _moveToward(game, rec, tx, tz, dt, far > 6 ? 2.35 : 1.85) || 0;
    }
  }
  st.moving = speed > 0.05;
  // r14: clips carry the vertical bob — do not bob the object.
  const baseY = rec.mesh.userData.baseY;
  rec.mesh.position.set(rec.x, Number.isFinite(baseY) ? baseY : 0, rec.z);
  if (!rec.mesh.userData.mixer) attachMixer(rec.mesh, rec.model || rec.mesh.userData.model || "wraith_malinois");
  const sit = ((mode === "stay") || (mode === "track" && (rec._arrived || rec._beatT > 0))) && !st.moving;
  setLocomotion(rec.mesh, speed, { sit, modelId: rec.model || rec.mesh.userData.model || "wraith_malinois" });
  const dist = Math.hypot(p.x - rec.x, p.z - rec.z);
  updateMixer(rec.mesh, dt, { dist, visible: dist < 28 });
  // 3D emitter for her cues.
  const A = audioEngine(game);
  if (A && typeof A.emitter === "function" && !rec.sfx) {
    try { rec.sfx = A.emitter({ x: rec.x, y: 0.6, z: rec.z }); } catch {}
  }
  rec.sfx?.update?.(rec.x, 0.6, rec.z);
  // Tells: once per threat. Hollows -> hollow_tell (+ wraith_mimic_warned), husks -> husk_tell,
  // Tallmen -> low growl.
  const list = game.enemies?.list || [];
  for (const e of list) {
    if (!e.alive || st.told.has(e)) continue;
    const r = Math.hypot(e.x - rec.x, e.z - rec.z);
    if (r > TELL_RANGE + (e.kind === "tallman" ? 4 : 0)) continue;
    let cue = null;
    if (e.hollow) cue = "hollow_tell";
    else if (e.kind === "husk") cue = "husk_tell";
    else if (e.kind === "tallman") cue = "growl";
    if (!cue) continue;
    st.told.add(e);
    if (st.barkCd > 0) continue;
    st.barkCd = 2.5;
    try { A?.playWraith?.(cue, { emitter: rec.sfx || undefined }); } catch {}
    if (cue === "hollow_tell" && game.flags) {
      if (!game.flags.wraith_mimic_warned) game.hud?.say?.("Wraith won't go near it. Something's wrong with that one.");
      game.flags.wraith_mimic_warned = true;
    }
  }
  void _tmp;
}

export function disposeCompanion(rec) {
  try { rec?.sfx?.dispose?.(); } catch {}
  if (rec) rec.sfx = null;
}
