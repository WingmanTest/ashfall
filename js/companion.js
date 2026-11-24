// Wraith (Braith's Malinois) — follow + Hollow/husk "tells" (Echoes README §12–14, Rev 2).
// Pure gameplay glue: positions world.companion's mesh near the player and fires
// playWraith cues once per threat within range. Never throws.

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

function _moveToward(game, rec, tx, tz, dt, spd) {
  const dx = tx - rec.x, dz = tz - rec.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.28) return false;
  const step = Math.min(spd, d / Math.max(dt, 1e-3));
  let nx = rec.x + (dx / d) * step * dt;
  let nz = rec.z + (dz / d) * step * dt;
  if (game.world?.collide) { const c = game.world.collide(nx, nz, 0.3, rec.x, rec.z); nx = c.x; nz = c.z; }
  rec.x = nx; rec.z = nz;
  const want = Math.atan2(dx, dz);
  let dy = want - rec.mesh.rotation.y;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  rec.mesh.rotation.y += dy * Math.min(1, dt * 8);
  return true;
}

function _leadAlongPath(game, rec, dt) {
  const path = rec._path;
  if (!path || !path.length) return false;
  if (rec._pathI == null) rec._pathI = 0;
  while (rec._pathI < path.length - 1) {
    const p = path[rec._pathI];
    if (Math.hypot(rec.x - p.x, rec.z - p.z) < 1.1) rec._pathI++;
    else break;
  }
  const i = Math.min(rec._pathI, path.length - 1);
  const p = path[i];
  const far = Math.hypot((game.player?.x || 0) - rec.x, (game.player?.z || 0) - rec.z);
  const spd = far > 10 ? 6.4 : 4.4;
  return _moveToward(game, rec, p.x, p.z, dt, spd);
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
  st.moving = false;
  if (mode === "track") {
    const far = Math.hypot(p.x - rec.x, p.z - rec.z);
    if (far > 28 && rec._path && rec._path.length) {
      const wp = rec._path[Math.min(rec._pathI || 0, rec._path.length - 1)];
      rec.x = wp.x; rec.z = wp.z;
    }
    st.moving = _leadAlongPath(game, rec, dt);
  } else if (mode === "stay" || mode === "guard" || mode === "hold") {
    const hx = rec._holdX ?? rec.x, hz = rec._holdZ ?? rec.z;
    if (mode === "hold" && rec._holdTarget && rec._holdTarget.alive) {
      rec._holdX = rec._holdTarget.x; rec._holdZ = rec._holdTarget.z;
    }
    st.moving = _moveToward(game, rec, rec._holdX ?? hx, rec._holdZ ?? hz, dt, 3.4);
  } else if (companionFollows(game)) {
    // Target: behind and slightly right of Braith's facing.
    const yaw = p.yaw || 0;
    const tx = p.x + Math.sin(yaw) * 1.6 + Math.cos(yaw) * 0.9;
    const tz = p.z + Math.cos(yaw) * 1.6 - Math.sin(yaw) * 0.9;
    const d = Math.hypot(tx - rec.x, tz - rec.z);
    const far = Math.hypot(p.x - rec.x, p.z - rec.z);
    if (far > 24) {
      rec.x = tx; rec.z = tz;
    } else if (d > 0.35 && far > FOLLOW_GAP * 0.6) {
      st.moving = _moveToward(game, rec, tx, tz, dt, far > 6 ? 6.2 : 3.8);
    }
  }
  rec.mesh.position.set(rec.x, st.moving ? Math.abs(Math.sin(st.t * 11)) * 0.035 : 0, rec.z);
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
