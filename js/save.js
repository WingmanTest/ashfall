import { CFG } from "./config.js?v=r15.2";
import { stripRetiredInv } from "./systems.js?v=r15.2";

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
  const m = s.match(/^(?:ch)?\s*0*(\d+)(b)?/i);
  if (m) {
    const n = Math.max(1, Math.min(10, parseInt(m[1], 10) || 1));
    return "ch" + String(n).padStart(2, "0") + (m[2] && n === 7 ? "b" : "");
  }
  return "ch01";
}

export function chapterNum(ch) {
  return parseInt(String(normalizeChapter(ch)).replace(/\D/g, ""), 10) || 1;
}

/** Short / full chapter label for HUD, pause menu, quest log, and save toast. */
export function chapterHeading(ch, story) {
  const id = normalizeChapter(ch);
  const n = chapterNum(id);
  const title = String(story?.chapterDef?.(id)?.title || "").trim();
  return {
    id,
    n,
    title,
    short: "CH." + n,
    full: title ? ("CHAPTER " + n + " — " + title.toUpperCase()) : ("CHAPTER " + n),
  };
}

function asArray(v) {
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === "object") {
    return Object.keys(v).filter((k) => v[k] && v[k] !== false);
  }
  if (v == null || v === "") return [];
  return [v];
}

/** Ch2 start (ch02_the_registry.json spawn_default). */
export const CH02_SPAWN = { x: -1, z: 1, yaw: Math.PI };

const CH02_VISIT_FLAGS = [
  "ch02_glimpse_seen", "ch02_registered", "ch02_avila_met", "ch02_haas_met",
  "ch02_ames_met", "ch02_dusk", "ch02_crush_started",
];

export function ch01Complete(flags) {
  const f = flags || {};
  return !!(f.ch01_voicemail_heard || f.ch01_phone_used);
}

export function ch02Visited(flags) {
  const f = flags || {};
  return CH02_VISIT_FLAGS.some((k) => !!f[k]);
}

/** Flags for a Ch1-complete start at the beginning of Ch2 (dev jump / rescue). */
export function applyCh1CompleteFlags(flags) {
  const f = flags || {};
  f.ch01_phone_used = true;
  f.ch01_voicemail_heard = true;
  if (f.ch01_pharmacy_choice == null) f.ch01_pharmacy_choice = "shared";
  f.ch01_wraith_fed = true;
  f.wraith_fed = true;
  f.wraith_following = true;
  f.wraith_alive = true;
  if (f.ch01_night == null) f.ch01_night = true;
  f.ch01_carly_talked = f.ch01_carly_talked || true;
  f.ch01_water_boiled = f.ch01_water_boiled || true;
  f.ch01_lolo_talked = f.ch01_lolo_talked || true;
  f.ch01_scarf_found = f.ch01_scarf_found || true;
  if (!f.ch01_gas_choice) f.ch01_gas_choice = "pruitt";
  f.ch01_pharmacy_done = f.ch01_pharmacy_done || true;
  return f;
}

/** Stamp completeWhen flags / quests for every chapter before dest (jump / rescue). */
export function completePriorChapterProgress(flags, quests, levels, destId) {
  const destN = chapterNum(destId);
  const f = flags || {};
  const q = quests || {};
  if (destN > 1) applyCh1CompleteFlags(f);
  const per = levels?.perChapter || {};
  const setWhen = (when) => {
    if (!when) return;
    if (Array.isArray(when)) return when.forEach(setWhen);
    if (typeof when === "string") {
      if (f[when] == null || f[when] === false) f[when] = true;
      return;
    }
    if (typeof when === "object") {
      if (when.flag) {
        if (f[when.flag] == null || f[when.flag] === false) {
          f[when.flag] = (when.eq != null ? when.eq : true);
        }
      }
      for (const k of ["all", "any", "and", "or", "allOf", "anyOf", "then"]) {
        if (when[k]) setWhen(when[k]);
      }
    }
  };
  for (const L of Object.values(per)) {
    const n = chapterNum(L.chapter || L.id);
    if (!n || n >= destN) continue;
    for (const o of L.objectives || []) {
      setWhen(o.completeWhen);
      if (o.quest) q[o.quest] = "complete";
    }
  }
  return { flags: f, quests: q };
}

/**
 * r15: the r14.2 voicemail bug could stamp a save as ch03 (or leave it at
 * ch01/ch02) without any Ch2 play. One-time rescue: start of Ch2, keep Ch1
 * flags and inventory. `r15_ch02_rescue` prevents resetting position again.
 */
export function shouldRescueToCh02(flags) {
  const f = flags || {};
  if (f.r15_ch02_rescue) return false;
  if (ch02Visited(f)) return false;
  const ch = normalizeChapter(f.chapter);
  const n = parseInt(String(ch).replace(/\D/g, ""), 10) || 1;
  if (ch01Complete(f) && n <= 3) return true;
  if (n === 3) return true; // in Ch3 but never visited Ch2
  return false;
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
    let rescuedToCh02 = false;
    if (shouldRescueToCh02(flags)) {
      flags.chapter = "ch02";
      flags.r15_ch02_rescue = true;
      applyCh1CompleteFlags(flags);
      rescuedToCh02 = true;
    }

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
    if (rescuedToCh02) {
      player.x = CH02_SPAWN.x;
      player.z = CH02_SPAWN.z;
      player.yaw = CH02_SPAWN.yaw;
      player.pitch = 0;
    }
    if (!player.stats || typeof player.stats !== "object") {
      player.stats = { health: 100, warmth: 82, hunger: 70, stamina: 100, rad: 0 };
    }
    if (!player.equipped) player.equipped = raw.equipped || "knife";
    if (!player.mags || typeof player.mags !== "object") player.mags = { blaster: 0, pistol: 0 };

    let inv = {};
    if (raw.inv && typeof raw.inv === "object" && !Array.isArray(raw.inv)) inv = { ...raw.inv };
    else if (raw.inventory && typeof raw.inventory === "object" && !Array.isArray(raw.inventory)) inv = { ...raw.inventory };

    inv = stripRetiredInv(inv);
    let firedTriggers = asArray(raw.firedTriggers);
    const quests = raw.quests && typeof raw.quests === "object" ? { ...raw.quests } : {};
    let timeOfDay = raw.timeOfDay;
    if (rescuedToCh02) {
      firedTriggers = firedTriggers.filter((id) => {
        const s = String(id);
        if (/^t_ch0([3-9]|10|7b)/.test(s)) return false;
        if (s === "t_ch02_end") return false;
        return true;
      });
      delete quests.q_find_walt;
      if (!quests.q_essential_card) quests.q_essential_card = "start";
      if (timeOfDay == null || timeOfDay < 0.3 || timeOfDay > 0.8) timeOfDay = 0.45;
    }
    const save = {
      ...raw,
      flags,
      inv,
      player,
      notes: Array.isArray(raw.notes) ? raw.notes : [],
      firedTriggers,
      hudUnlocks: asArray(raw.hudUnlocks),
      trust: raw.trust && typeof raw.trust === "object" ? raw.trust : {},
      alive: raw.alive && typeof raw.alive === "object" ? raw.alive : {},
      quests,
      seen: raw.seen && typeof raw.seen === "object" ? raw.seen : {},
      dialogueMem: raw.dialogueMem && typeof raw.dialogueMem === "object" ? raw.dialogueMem : { npcs: {} },
      exploredFog: raw.exploredFog && typeof raw.exploredFog === "object" ? raw.exploredFog : {},
      shelterSeals: raw.shelterSeals && typeof raw.shelterSeals === "object" ? raw.shelterSeals : {},
      lootTaken: asArray(raw.lootTaken),
      lootLeft: raw.lootLeft && typeof raw.lootLeft === "object" ? raw.lootLeft : {},
    };
    if (rescuedToCh02 && timeOfDay != null) save.timeOfDay = timeOfDay;
    return { ok: true, save, migrated: true, rescuedToCh02 };
  } catch {
    return { ok: false, notice: "Old save incompatible — starting a fresh shift" };
  }
}
