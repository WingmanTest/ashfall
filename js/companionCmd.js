// Companion command menu (TRACK / FOLLOW / STAY / GUARD / HOLD) and quest-gated
// action choices that dialogue memory must never consume or hide.
import * as THREE from "three";
import { evalCondition, setFlag } from "./story.js?v=r15.1";
import { hasItems } from "./inventory.js?v=r15.1";
import { aliasItem } from "./systems.js?v=r15.1";
import { routeTrack } from "./companionNav.js?v=r15.1";

export function isActionChoice(c) {
  if (!c) return false;
  if (c.repeatable || c.repeat || c.command || c.action || c.verb) return true;
  const kind = String(c.kind || "").toLowerCase();
  if (kind === "command" || kind === "action") return true;
  return false;
}

function talksTo(dlg, npcId) {
  if (!dlg || !npcId) return false;
  const n = String(npcId).toLowerCase();
  const slug = String(dlg.npc || "").toLowerCase();
  if (slug === n) return true;
  const id = String(dlg.id || "").toLowerCase();
  return id.includes(n);
}

function whenOk(when, game) {
  if (when == null || (Array.isArray(when) && !when.length)) return true;
  const ctx = game.levelRuntime?.ctx?.() || game._storyCtx?.() || { flags: game.flags, inv: game.inv };
  return evalCondition(when, ctx);
}

function needItems(req, inv) {
  if (!req) return true;
  const bag = Array.isArray(req)
    ? Object.fromEntries(req.map((id) => [aliasItem(id), 1]))
    : req;
  const mapped = {};
  for (const [k, v] of Object.entries(bag)) mapped[aliasItem(k)] = v;
  return hasItems(inv, mapped);
}

function flagList(c) {
  const out = [];
  if (c.flag) out.push(c.flag);
  if (c.setsFlag) out.push(c.setsFlag);
  const sf = c.set_flags;
  if (Array.isArray(sf)) out.push(...sf);
  else if (typeof sf === "string") out.push(sf);
  if (c.effects) {
    const e = c.effects;
    if (e.set_flags) out.push(...(Array.isArray(e.set_flags) ? e.set_flags : [e.set_flags]));
    if (e.flag) out.push(e.flag);
  }
  return out.filter(Boolean);
}

function actionAlreadyResolved(c, game) {
  const flags = game.flags || {};
  const fl = flagList(c);
  if (fl.length && fl.every((f) => !!flags[f])) return true;
  return false;
}

function looksLikeGiveOrAction(c) {
  if (isActionChoice(c)) return true;
  const t = String(c.text || "").toLowerCase();
  if (/^\[(give|track|follow|stay|guard|hold|hand|trade|use)\]/.test(t)) return true;
  if (/\b(give|hand) (her|him|them) the\b/.test(t) || /\bgive her the\b/.test(t)) return true;
  if (c.require_item || c.remove_item) return true;
  return false;
}

export function collectPendingActions(game, npcId) {
  const out = [];
  const story = game.story;
  const ctx = game._storyCtx?.() || { flags: game.flags, inv: game.inv };
  for (const dlg of story?.dialogues || []) {
    if (!talksTo(dlg, npcId)) continue;
    for (const [nid, node] of Object.entries(dlg.nodes || {})) {
      for (const c of node.choices || []) {
        if (!looksLikeGiveOrAction(c)) continue;
        if (c.conditions && !evalCondition(c.conditions, ctx)) continue;
        if (c.require_item && !((game.inv[aliasItem(c.require_item)] || 0) > 0)) continue;
        if (actionAlreadyResolved(c, game)) continue;
        out.push({
          ...c,
          text: c.text,
          repeatable: true,
          action: true,
          _fromDlg: dlg.id,
          _fromNode: nid,
        });
      }
    }
  }
  // de-dupe by text
  const seen = new Set();
  return out.filter((c) => {
    const k = String(c.id || c.text || "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function pathFromSetpiece(game, it) {
  const L = game.levelRuntime?.L || game.levelRuntime?.level;
  const pieces = L?.setPieces || [];
  const want = it && (it.id || it.quest);
  let sp = pieces.find((s) => s.type === "scent_trail" && (
    (it && (s.id === `sp_${it.id}` || s.item && it.requiresItems && it.requiresItems[s.item]))
    || (want && String(s.id || "").includes(String(want).replace(/^q_/, "")))
  ));
  if (!sp) sp = pieces.find((s) => s.type === "scent_trail");
  const path = (sp && sp.path) || null;
  if (!path || !path.length) return null;
  return path.map(mapPathPoint);
}

function mapPathPoint(p) {
  if (Array.isArray(p)) return { x: p[0], z: p[1] };
  return {
    x: p.x, z: p.z,
    beat: p.beat || null,
    toast: p.toast || null,
    prop: p.prop || null,
  };
}

function sameTrail(a, b) {
  if (!a || !b || !a.length || !b.length) return false;
  const a0 = a[0], b0 = b[0], aN = a[a.length - 1], bN = b[b.length - 1];
  return Math.hypot(a0.x - b0.x, a0.z - b0.z) < 1.5 && Math.hypot(aN.x - bN.x, aN.z - bN.z) < 1.5;
}

function trackLabel(it) {
  const blob = `${it.id || ""} ${it.label || ""} ${it.quest || ""}`;
  if (it.quest === "q_find_pruitt" || /pruitt/i.test(blob)) return "[TRACK] Mr. Pruitt";
  let lab = String(it.label || "").replace(/^Give Wraith the scarf:\s*/i, "").trim();
  if (!lab || /^track$/i.test(lab)) lab = "the scent";
  return lab.startsWith("[") ? lab : `[TRACK] ${lab}`;
}

export function findTrackTarget(game) {
  const L = game.levelRuntime?.L || game.levelRuntime?.level;
  if (!L) return null;
  for (const it of L.interactives || []) {
    if (it.type !== "companion_track") continue;
    if (!whenOk(it.when, game)) continue;
    if (it.requiresItems && !needItems(it.requiresItems, game.inv)) continue;
    return { ...it, label: trackLabel(it), path: pathFromSetpiece(game, it) };
  }
  for (const sp of L.setPieces || []) {
    if (sp.type !== "scent_trail") continue;
    if (sp.item && !((game.inv[aliasItem(sp.item)] || 0) > 0)) continue;
    if (!whenOk(sp.when, game) && !game.flags?.ch01_tracking) {
      // still offer once the item is in hand (the when is usually the tracking flag itself)
      if (sp.item && (game.inv[aliasItem(sp.item)] || 0) > 0) {
        /* ok */
      } else continue;
    }
    const path = (sp.path || []).map(mapPathPoint);
    return {
      id: sp.id,
      label: /pruitt/i.test(`${sp.id} ${sp.note || ""}`) ? "[TRACK] Mr. Pruitt" : "[TRACK] the scent",
      setsFlag: "ch01_tracking",
      quest: sp.quest,
      path,
    };
  }
  return null;
}

function isHumanEnemy(e) {
  if (!e || !e.alive) return false;
  if (e.hollow || e.kind === "husk" || e.kind === "tallman" || e.kind === "dog") return false;
  const k = String(e.kind || e.id || "");
  return /raider|militia|watch|human|soldier|bandit|guard|army/.test(k) || e.human === true;
}

export function collectCompanionCommands(game, npcId) {
  if (npcId !== "wraith") return [];
  const f = game.flags || {};
  if (f.wraith_alive === false || f.wraith_gone || f.wraith_lost) return [];
  const fed = !!(f.ch01_wraith_fed || f.wraith_fed);
  const injured = !!f.wraith_injured;
  const cmds = [];
  const mode = game.companionMode || (f.wraith_stay ? "stay" : "follow");
  if (fed && !injured) {
    const target = findTrackTarget(game);
    if (target) {
      cmds.push({
        text: target.label,
        id: "cmd_track_" + (target.id || "default"),
        command: "track",
        action: true,
        repeatable: true,
        end: true,
        _run: () => startTracking(game, target),
      });
    }
    if (mode === "stay" || mode === "guard" || mode === "hold") {
      cmds.push({
        text: "[FOLLOW]",
        id: "cmd_follow",
        command: "follow",
        action: true,
        repeatable: true,
        end: true,
        _run: () => setCompanionMode(game, "follow"),
      });
    } else {
      cmds.push({
        text: "[STAY]",
        id: "cmd_stay",
        command: "stay",
        action: true,
        repeatable: true,
        end: true,
        _run: () => setCompanionMode(game, "stay"),
      });
    }
    if (mode !== "guard") {
      cmds.push({
        text: "[GUARD]",
        id: "cmd_guard",
        command: "guard",
        action: true,
        repeatable: true,
        end: true,
        _run: () => setCompanionMode(game, "guard"),
      });
    }
    const rec = game.world?.companion;
    const px = rec?.x ?? game.player?.x ?? 0;
    const pz = rec?.z ?? game.player?.z ?? 0;
    const near = (game.enemies?.list || []).find((e) => isHumanEnemy(e) && Math.hypot(e.x - px, e.z - pz) < 14);
    if (near && mode !== "hold") {
      cmds.push({
        text: "[HOLD]",
        id: "cmd_hold",
        command: "hold",
        action: true,
        repeatable: true,
        end: true,
        _run: () => setCompanionMode(game, "hold"),
      });
    }
  }
  return cmds;
}

export function setCompanionMode(game, mode, target) {
  const rec = game.world?.companion;
  game.companionMode = mode || "follow";
  if (mode === "stay" || mode === "guard") {
    setFlag(game.flags, "wraith_stay", true);
    if (rec) {
      rec._holdX = rec.x;
      rec._holdZ = rec.z;
    }
    game.hud?.say?.(mode === "guard" ? "Wraith posts up." : "Wraith stays.");
  } else if (mode === "hold") {
    setFlag(game.flags, "wraith_stay", false);
    const src = rec || game.player;
    const near = (game.enemies?.list || []).find((e) => isHumanEnemy(e) && Math.hypot(e.x - src.x, e.z - src.z) < 16);
    if (rec && near) { rec._holdX = near.x; rec._holdZ = near.z; rec._holdTarget = near; }
    else if (rec) { rec._holdX = rec.x; rec._holdZ = rec.z; }
    game.hud?.say?.("Wraith holds.");
  } else if (mode === "track") {
    setFlag(game.flags, "wraith_stay", false);
    beginTrackRoute(game, target);
  } else {
    setFlag(game.flags, "wraith_stay", false);
    game.hud?.say?.("Wraith falls in.");
  }
  return mode;
}

export function startTracking(game, target) {
  target = target || findTrackTarget(game);
  if (!target) {
    game.hud?.say?.("She hasn't got a scent.");
    return false;
  }
  if (target.setsFlag) setFlag(game.flags, target.setsFlag, true);
  setFlag(game.flags, "ch01_tracking", true);
  const spawned = game.levelRuntime?.ensureConditionalNpcs?.(game);
  setCompanionMode(game, "track", target);
  syncScentTrail(game);
  if (spawned && typeof spawned.then === "function") {
    spawned.then(() => game.refreshObjective?.()).catch(() => {});
  }
  try {
    const rec = game.world?.companion;
    const A = game.audio?.impl?.engine || game.audio?.impl?.a || (typeof window !== "undefined" ? window.GameAudio : null);
    if (rec && A?.playWraith && rec._barkOnTrack !== true) {
      A.playWraith("bark", { emitter: rec.sfx || undefined });
    }
  } catch {}
  game.hud?.say?.("Wraith has the scent.");
  game.refreshObjective?.();
  return true;
}

export function restoreTracking(game) {
  if (!game?.flags?.ch01_tracking) {
    syncScentTrail(game);
    return false;
  }
  const spawned = game.levelRuntime?.ensureConditionalNpcs?.(game);
  const target = findTrackTarget(game) || { path: pathFromSetpiece(game, null), setsFlag: "ch01_tracking" };
  setCompanionMode(game, "track", target);
  syncScentTrail(game);
  if (spawned && typeof spawned.then === "function") {
    spawned.then(() => game.refreshObjective?.()).catch(() => {});
  }
  return true;
}

/** Build a walkable route from Wraith's current position along the remaining trail. */
export function beginTrackRoute(game, target) {
  const rec = game.world?.companion;
  if (!rec) return null;
  rec._arrived = false;
  rec._beatT = 0;
  rec._beatDone = null;
  rec._stuckT = 0;
  rec._repathOnce = false;
  const authored = (target && target.path && target.path.length)
    ? target.path
    : pathFromSetpiece(game, target);
  if (!authored || !authored.length) {
    rec._pathI = 0;
    return rec._path || null;
  }
  const same = sameTrail(authored, rec._authored);
  if (!same) rec._trailProg = 0;
  rec._authored = authored;
  rec._path = routeTrack(game.world, { x: rec.x, z: rec.z }, authored, {
    minIndex: rec._trailProg || 0,
  });
  rec._pathI = 0;
  if (!game.flags?.ch01_scarf_found) {
    rec._trackHint = "Follow Wraith — she's on Mr. Pruitt's scent";
    game.refreshObjective?.();
  }
  return rec._path;
}

/** Recalculate the remaining walkable trail from where she is now (stuck / FOLLOW then TRACK). */
export function repathFromHere(game) {
  const rec = game.world?.companion;
  if (!rec) return null;
  const path = rec._path || [];
  const rest = path.slice(Math.max(0, rec._pathI || 0));
  const authored = rest.length ? rest : pathFromSetpiece(game, findTrackTarget(game));
  rec._path = routeTrack(game.world, { x: rec.x, z: rec.z }, authored || []);
  rec._pathI = 0;
  rec._stuckT = 0;
  rec._repathOnce = false;
  syncScentTrail(game);
  return rec._path;
}

function disposeTrail(game) {
  const m = game._scentTrailMesh;
  if (m) {
    m.parent?.remove(m);
    m.geometry?.dispose?.();
    game._scentTrailMesh = null;
  }
}

export function syncScentTrail(game) {
  disposeTrail(game);
  if (!game?.flags?.ch01_tracking) return null;
  const rec = game.world?.companion;
  const path = (rec && rec._path && rec._path.length >= 2)
    ? rec._path
    : pathFromSetpiece(game, findTrackTarget(game) || null);
  if (!path || path.length < 2) return null;
  const pos = [], nrm = [], uv = [], idx = [];
  const pushQuad = (p0, p1, p2, p3) => {
    const base = pos.length / 3;
    for (const p of [p0, p1, p2, p3]) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(0, 1, 0);
    }
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const paw = (x, z, yaw, s = 0.22) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const rot = (lx, lz) => [x + lx * cy - lz * sy, 0.04, z + lx * sy + lz * cy];
    // diamond pad
    pushQuad(rot(-s, 0), rot(0, s * 0.7), rot(s, 0), rot(0, -s * 0.7));
  };
  let dist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const yaw = Math.atan2(dx, dz);
    const step = 1.15;
    for (let t = 0; t < len; t += step) {
      const u = t / len;
      const side = (Math.floor(dist / step) % 2 ? 1 : -1) * 0.16;
      const px = a.x + dx * u + Math.cos(yaw) * side;
      const pz = a.z + dz * u - Math.sin(yaw) * side;
      paw(px, pz, yaw);
      dist += step;
    }
  }
  if (!idx.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x5a4030, roughness: 1, metalness: 0, transparent: true, opacity: 0.72,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.kind = "scent_trail";
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  const parent = game.levelRuntime?.group || game.world?.levelGroup || game.scene;
  if (parent) parent.add(mesh);
  game._scentTrailMesh = mesh;
  return mesh;
}

export function mergeActionChoices(choices, extras) {
  const out = [...(choices || [])];
  const seen = new Set(out.map((c) => String(c.id || c.text || "")));
  for (const c of extras || []) {
    const k = String(c.id || c.text || "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}
