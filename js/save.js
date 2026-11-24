import { CFG } from "./config.js?v=r14";
import { stripRetiredInv } from "./systems.js?v=r14";

/** Nevada Revision 2 story/save schema. Older saves (v1: Theo, insulin, Marguerite…) can't be mapped. */
export const SAVE_STORY_VERSION = 2;
const V1_FLAG_KEYS = ["theo_alive", "theo_side", "hank_alive", "insulin_found", "insulin_given", "marguerite_alive"];

export function loadSave() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSave() {
  return !!loadSave();
}

export function writeSave(data) {
  try {
    localStorage.setItem(CFG.saveKey, JSON.stringify({ ...data, storyVersion: SAVE_STORY_VERSION, ts: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(CFG.saveKey); } catch {}
}

export function normalizeChapter(ch) {
  if (ch == null || ch === "") return "ch01";
  if (typeof ch === "number" && Number.isFinite(ch)) {
    const n = Math.max(1, Math.min(10, ch | 0));
    return "ch" + String(n).padStart(2, "0");
  }
  const s = String(ch).trim();
  const m = s.match(/^(?:ch)?\s*0*(\d+)(b?)$/i);
  if (m) {
    const n = Math.max(1, Math.min(10, parseInt(m[1], 10) || 1));
    return "ch" + String(n).padStart(2, "0") + (m[2] && n === 7 ? "b" : "");
  }
  return "ch01";
}

function asArray(v) {
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === "object") {
    return Object.keys(v).filter((k) => v[k] && v[k] !== false);
  }
  if (v == null || v === "") return [];
  return [v];
}

export function migrateSave(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, notice: "Old save incompatible — starting a fresh shift" };
  }
  const rawFlags = raw.flags && typeof raw.flags === "object" ? raw.flags : {};
  if (raw.storyVersion !== SAVE_STORY_VERSION || V1_FLAG_KEYS.some((k) => k in rawFlags)) {
    return { ok: false, v1: true, notice: "Save from before Nevada Revision 2 — starting a fresh shift" };
  }
  try {
    const flags = { ...(raw.flags && typeof raw.flags === "object" && !Array.isArray(raw.flags) ? raw.flags : {}) };
    flags.chapter = normalizeChapter(flags.chapter ?? raw.chapter ?? 1);

    const player = raw.player && typeof raw.player === "object" && !Array.isArray(raw.player)
      ? { ...raw.player }
      : {};
    if (player.pos) {
      if (Array.isArray(player.pos)) {
        if (!Number.isFinite(player.x)) player.x = player.pos[0];
        if (!Number.isFinite(player.z)) player.z = player.pos.length > 2 ? player.pos[2] : player.pos[1];
      } else if (typeof player.pos === "object") {
        if (!Number.isFinite(player.x)) player.x = player.pos.x;
        if (!Number.isFinite(player.z)) player.z = player.pos.z;
      }
    }
    if (!Number.isFinite(player.x)) player.x = 1;
    if (!Number.isFinite(player.z)) player.z = -8.5;
    if (!Number.isFinite(player.yaw)) player.yaw = 0;
    if (!player.stats || typeof player.stats !== "object") {
      player.stats = { health: 100, warmth: 82, hunger: 70, stamina: 100, rad: 0 };
    }
    if (!player.equipped) player.equipped = raw.equipped || "knife";
    if (!player.mags || typeof player.mags !== "object") player.mags = { blaster: 0, pistol: 0 };

    let inv = {};
    if (raw.inv && typeof raw.inv === "object" && !Array.isArray(raw.inv)) inv = { ...raw.inv };
    else if (raw.inventory && typeof raw.inventory === "object" && !Array.isArray(raw.inventory)) inv = { ...raw.inventory };

    inv = stripRetiredInv(inv);
    const save = {
      ...raw,
      flags,
      inv,
      player,
      notes: Array.isArray(raw.notes) ? raw.notes : [],
      firedTriggers: asArray(raw.firedTriggers),
      hudUnlocks: asArray(raw.hudUnlocks),
      trust: raw.trust && typeof raw.trust === "object" ? raw.trust : {},
      alive: raw.alive && typeof raw.alive === "object" ? raw.alive : {},
      quests: raw.quests && typeof raw.quests === "object" ? raw.quests : {},
      seen: raw.seen && typeof raw.seen === "object" ? raw.seen : {},
      dialogueMem: raw.dialogueMem && typeof raw.dialogueMem === "object" ? raw.dialogueMem : { npcs: {} },
      exploredFog: raw.exploredFog && typeof raw.exploredFog === "object" ? raw.exploredFog : {},
      shelterSeals: raw.shelterSeals && typeof raw.shelterSeals === "object" ? raw.shelterSeals : {},
      lootTaken: asArray(raw.lootTaken),
      lootLeft: raw.lootLeft && typeof raw.lootLeft === "object" ? raw.lootLeft : {},
    };
    return { ok: true, save, migrated: true };
  } catch {
    return { ok: false, notice: "Old save incompatible — starting a fresh shift" };
  }
}
