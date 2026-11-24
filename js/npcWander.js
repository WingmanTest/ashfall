// Story / ambient NPC patrol and wander. Quest posts stay nearby; talking or
// approaching stops them, they face the player and idle, then resume.
import { ANIMATIONS } from "../models/registry.js?v=r15.2";
import { attachMixer, setLocomotion, updateMixer, faceToward, disposeMixer, isRigged, refreshNameplate } from "./npcAnim.js?v=r15.2";

const APPROACH_R = 3.4;
const TALK_HOLD = 0.6;

function hash(n) {
  let h = (n * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function seedOf(id) {
  let s = 1;
  const t = String(id || "");
  for (let i = 0; i < t.length; i++) s = (s * 33 + t.charCodeAt(i)) >>> 0;
  return s;
}

function walkable(world, x, z, rad = 0.32) {
  if (!world) return true;
  if (typeof world.blocked === "function") return !world.blocked(x, z, rad);
  return true;
}

function visibility(player, x, z) {
  const dx = x - (player?.x || 0), dz = z - (player?.z || 0);
  const dist = Math.hypot(dx, dz);
  if (dist < 10) return { visible: true, dist };
  const yaw = player?.yaw || 0;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const dot = dist > 0.001 ? (dx * fx + dz * fz) / dist : 1;
  return { visible: dist < 34 && dot > -0.2, dist };
}

// Offsets from the NPC's home post (works in every chapter).
const AUTHORED_OFFS = {
  carly: [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: -3 }, { x: 3.5, z: -2 }],
  lolo: [{ x: 0, z: 0 }, { x: 2.2, z: 0 }, { x: 0.4, z: -2 }, { x: 2, z: -1.4 }],
  gil: [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0.5, z: -3 }, { x: 3, z: -2 }],
  pruitt: [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 2.5 }],
  kit: [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 3 }],
};

function slug(id) {
  return String(id || "").toLowerCase().replace(/^npc_/, "").replace(/-/g, "_");
}

function sameNpc(a, b) {
  const x = slug(a), y = slug(b);
  return !!(x && y && x === y);
}

function authoredFor(rec, home) {
  const offs = AUTHORED_OFFS[slug(rec.id)];
  if (!offs) return null;
  return offs.map((p) => ({ x: home.x + p.x, z: home.z + p.z }));
}

function radiusFor(rec) {
  const b = String(rec.behavior || rec.role || "idle");
  if (rec.companion) return 0;
  if (/queue|water_line|checkpoint/.test(b)) return 1.35;
  if (/huddle|hide_from_sweep|preach|teach|sing|radio_voice|trade|column_follow|guard_gate/.test(b)) return 2.1;
  if (/ride_loop|patrol_block/.test(b)) return 8.5;
  if (/ambient_chores/.test(b)) return 5.2;
  if (/carly|lolo|gil|pruitt|kit|deshawn/.test(String(rec.id || ""))) return 3.2;
  return 3.0;
}

function walkSpeed(rec) {
  const id = rec.model || rec.mesh?.userData?.model;
  const a = ANIMATIONS[id];
  if (a?.walkSpeed) return a.walkSpeed;
  return 0.9;
}

function makeLoop(world, home, radius, n, seed) {
  const pts = [];
  if (walkable(world, home.x, home.z)) pts.push({ x: home.x, z: home.z });
  for (let i = 0; i < n * 10 && pts.length < n; i++) {
    const a = hash(seed + i * 17) * Math.PI * 2;
    const r = radius * (0.35 + hash(seed + i + 41) * 0.65);
    const x = home.x + Math.cos(a) * r;
    const z = home.z + Math.sin(a) * r;
    if (walkable(world, x, z)) pts.push({ x, z });
  }
  if (pts.length < 2) {
    const tries = [
      { x: home.x + Math.min(1.6, radius), z: home.z },
      { x: home.x, z: home.z + Math.min(1.6, radius) },
      { x: home.x - Math.min(1.4, radius), z: home.z },
    ];
    for (const p of tries) if (walkable(world, p.x, p.z)) pts.push(p);
  }
  return pts.length ? pts : [{ x: home.x, z: home.z }];
}

function ensurePath(rec, world) {
  const st = rec._w || (rec._w = {});
  if (st.path && st.path.length) return st;
  const home = { x: rec.homeX ?? rec.x, z: rec.homeZ ?? rec.z };
  st.home = home;
  st.r = rec.wanderR || radiusFor(rec);
  const authored = authoredFor(rec, home);
  let path = null;
  if (authored) {
    path = authored.filter((p) => walkable(world, p.x, p.z));
  }
  const n = /queue|water_line|huddle|hide|preach|teach|sing|trade/.test(String(rec.behavior || "")) ? 2 : 3;
  if (!path || path.length < 2) path = makeLoop(world, home, st.r, n + 1, seedOf(rec.id));
  st.path = path;
  st.i = Math.floor(hash(seedOf(rec.id) + 9) * path.length) % path.length;
  st.wait = hash(seedOf(rec.id) + 3) * 2.2;
  st.hold = 0;
  return st;
}

function pauseLen(rec) {
  const b = String(rec.behavior || "");
  if (/queue|water_line|preach|teach|sing|huddle|hide|trade/.test(b)) return 2.8 + hash(seedOf(rec.id) + 21) * 3.5;
  if (/ambient_chores|ride_loop|patrol_block/.test(b)) return 0.7 + hash(seedOf(rec.id)) * 1.8;
  return 1.4 + hash(seedOf(rec.id) + 5) * 2.6;
}

function engaged(rec, game, player) {
  if (rec.scripted) return "scripted";
  if (game?.mode === "dialogue" && (sameNpc(game.dlg?.npc, rec.id) || sameNpc(game._talkNpc, rec.id))) return "talk";
  if (player && Math.hypot((player.x || 0) - rec.x, (player.z || 0) - rec.z) < APPROACH_R) return "near";
  return null;
}

function stepToward(world, rec, tx, tz, dt, spd) {
  const dx = tx - rec.x, dz = tz - rec.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.28) return 0;
  const step = Math.min(spd, d / Math.max(dt, 1e-3));
  let nx = rec.x + (dx / d) * step * dt;
  let nz = rec.z + (dz / d) * step * dt;
  if (world?.collide) {
    const c = world.collide(nx, nz, 0.3, rec.x, rec.z);
    nx = c.x; nz = c.z;
  }
  const moved = Math.hypot(nx - rec.x, nz - rec.z);
  rec.x = nx; rec.z = nz;
  if (rec.mesh) faceToward(rec.mesh, tx, tz, dt, 7);
  return moved / Math.max(dt, 1e-3);
}

export function bindNpc(rec, world) {
  if (!rec?.mesh) return rec;
  rec.homeX = rec.homeX ?? rec.x;
  rec.homeZ = rec.homeZ ?? rec.z;
  rec.wanderR = rec.wanderR || radiusFor(rec);
  const model = rec.model || rec.mesh.userData?.model;
  if (isRigged(model)) {
    attachMixer(rec.mesh, model);
    refreshNameplate(rec.mesh);
  }
  if (rec.companion) return rec;
  ensurePath(rec, world);
  return rec;
}

export function tickNpc(rec, dt, game) {
  if (!rec?.mesh || rec.alive === false || rec.companion) return;
  const world = game?.world;
  const player = game?.player;
  const vis = visibility(player, rec.x, rec.z);
  if (!rec.mesh.userData.mixer && isRigged(rec.model || rec.mesh.userData.model)) {
    attachMixer(rec.mesh, rec.model || rec.mesh.userData.model);
  }
  const st = ensurePath(rec, world);
  st.hold = Math.max(0, (st.hold || 0) - dt);

  // Off-screen AI is cheap: only advance wait / periodically keep them near home.
  if (!vis.visible && vis.dist > 30) {
    updateMixer(rec.mesh, dt, vis);
    return;
  }

  const why = engaged(rec, game, player);
  let speed = 0;
  if (why === "scripted") {
    const p = rec.scripted;
    const d = Math.hypot((p.x ?? rec.x) - rec.x, (p.z ?? rec.z) - rec.z);
    if (d > 0.4) speed = stepToward(world, rec, p.x, p.z, dt, walkSpeed(rec));
    else if (player) faceToward(rec.mesh, player.x, player.z, dt, 6);
  } else if (why === "talk" || why === "near") {
    st.hold = TALK_HOLD;
    if (player) faceToward(rec.mesh, player.x, player.z, dt, 8);
    speed = 0;
  } else if (st.hold > 0) {
    speed = 0;
  } else if (st.wait > 0) {
    st.wait -= dt;
    speed = 0;
  } else {
    const path = st.path || [st.home];
    const i = ((st.i % path.length) + path.length) % path.length;
    const wp = path[i] || st.home;
    // Stay in the post radius so quest spots remain reliable.
    const hx = st.home.x, hz = st.home.z;
    const away = Math.hypot(rec.x - hx, rec.z - hz);
    const target = away > st.r * 1.15 ? st.home : wp;
    speed = stepToward(world, rec, target.x, target.z, dt, walkSpeed(rec));
    const d = Math.hypot(target.x - rec.x, target.z - rec.z);
    if (d < 0.4 || speed < 0.04) {
      if (target === st.home && away > st.r) {
        /* keep walking home next tick */
      } else {
        st.i = (i + 1) % path.length;
        st.wait = pauseLen(rec);
      }
    }
  }

  const baseY = rec.mesh.userData.baseY;
  rec.mesh.position.set(rec.x, Number.isFinite(baseY) ? baseY : rec.mesh.position.y, rec.z);
  setLocomotion(rec.mesh, speed, { sit: false, modelId: rec.model || rec.mesh.userData.model });
  updateMixer(rec.mesh, dt, vis);
}

export function haltForTalk(rec, player) {
  if (!rec?.mesh) return;
  const st = rec._w || (rec._w = {});
  st.hold = TALK_HOLD;
  if (player) {
    const dx = player.x - rec.x, dz = player.z - rec.z;
    if (Math.hypot(dx, dz) > 0.02) rec.mesh.rotation.y = Math.atan2(dx, dz);
  }
  const baseY = rec.mesh.userData.baseY;
  rec.mesh.position.set(rec.x, Number.isFinite(baseY) ? baseY : rec.mesh.position.y, rec.z);
  setLocomotion(rec.mesh, 0, { modelId: rec.model || rec.mesh.userData.model });
}

export function findNpc(world, id) {
  const want = slug(id);
  return (world?.npcs || []).find((n) => slug(n.id) === want) || null;
}

export function pinNpc(rec, x, z) {
  if (!rec) return;
  rec.scripted = { x, z };
}

export function unpinNpc(rec) {
  if (!rec) return;
  rec.scripted = null;
}

export { disposeMixer, visibility };
