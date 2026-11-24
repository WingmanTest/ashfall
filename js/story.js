// Data-driven story loader. Reads /story/ when present. NEVER writes there.
// Full Loremaster contract (SCHEMA.md): condition ops, not, count_true,
// if/then/else, value_from, on_end, flags.ending, chapter start/end scripts.
import { tryFetch, loadJsonDir, listDir } from "./load.js?v=r15.1";
import { aliasItem } from "./systems.js?v=r15.1";

const STORY_ROOT = "./story/";

const CMP_OPS = ["eq", "ne", "gt", "gte", "lt", "lte"];

export function invCount(inv, id) {
  if (!inv || !id) return 0;
  const a = aliasItem(id);
  let n = inv[id] || 0;
  if (a && a !== id) n += inv[a] || 0;
  return n;
}

export function cmpOp(left, cond) {
  const used = CMP_OPS.filter((k) => cond[k] !== undefined);
  if (!used.length) {
    return left != null && left !== false && left !== 0 && left !== "";
  }
  const op = used[0];
  const right = cond[op];
  if (op === "eq") return left === right;
  if (op === "ne") return left !== right;
  if (left == null) return false;
  const l = typeof left === "number" || typeof right === "number" ? Number(left) : left;
  const r = typeof left === "number" || typeof right === "number" ? Number(right) : right;
  if (typeof l === "number" && Number.isNaN(l)) return false;
  if (op === "gt") return l > r;
  if (op === "gte") return l >= r;
  if (op === "lt") return l < r;
  if (op === "lte") return l <= r;
  return false;
}

export function readStat(ctx, name) {
  const p = ctx.player?.stats || ctx.stats || {};
  if (name === "satiety") return p.satiety ?? p.hunger ?? 0;
  if (name === "hydration") return p.hydration ?? p.hunger ?? 0;
  if (name === "radiation") return p.radiation ?? p.rad ?? 0;
  return p[name] ?? 0;
}

// Retroactive item -> flag satisfaction (r9 progression fix). Registered by game.js:
// returns the item id that satisfies a "picked up X" style flag, or null.
let _itemForFlag = null;
export function registerItemFlagResolver(fn) { _itemForFlag = typeof fn === "function" ? fn : null; }
export function itemForFlag(name) { return _itemForFlag ? _itemForFlag(name) : null; }

export function evalCondition(cond, ctx) {
  if (cond == null) return true;
  if (Array.isArray(cond)) return cond.every((c) => evalCondition(c, ctx));
  if (typeof cond !== "object") return !!cond;
  if (cond.not !== undefined) return !evalCondition(cond.not, ctx);
  // Multi-path objectives: ANY route satisfies an OR group (never treated as AND).
  const anyOf = cond.any || cond.or || cond.anyOf || cond.oneOf || cond.either || cond.routes_any;
  if (Array.isArray(anyOf)) return anyOf.some((c) => evalCondition(c, ctx));
  const allOf = cond.all || cond.and || cond.allOf;
  if (Array.isArray(allOf)) return allOf.every((c) => evalCondition(c, ctx));
  if (Array.isArray(cond.any_flags)) return cond.any_flags.some((f) => evalCondition({ flag: f }, ctx));
  if (cond.none) return !cond.none.some((c) => evalCondition(c, ctx));
  const flags = ctx.flags || {};
  const inv = ctx.inventory || ctx.items || {};
  const trust = ctx.trust || {};
  if (cond.count_true) {
    const n = cond.count_true.reduce((acc, f) => acc + (flags[f] ? 1 : 0), 0);
    return cmpOp(n, cond);
  }
  if (cond.item) return cmpOp(invCount(inv, cond.item), cond);
  if (cond.has_item) return invCount(inv, cond.has_item) > 0;
  if (cond.flag != null) {
    const v = flags[cond.flag];
    let left = v === undefined ? null : v;
    // "picked up X" flags are satisfied by simply holding X (no soft-lock if looted early).
    if (!left && _itemForFlag && (cond.eq === undefined || cond.eq === true)) {
      const it = _itemForFlag(cond.flag);
      if (it && invCount(inv, it) > 0) left = true;
    }
    return cmpOp(left, cond);
  }
  if (cond.trust != null) return cmpOp(trust[cond.trust] ?? 0, cond);
  if (cond.stat) return cmpOp(readStat(ctx, cond.stat), cond);
  return false;
}

export function evalWhen(when, ctx) {
  if (!when || typeof when !== "object") return true;
  if (Array.isArray(when) || when.flag != null || when.item || when.trust != null
    || when.stat || when.count_true || when.not || when.any || when.all || when.conditions) {
    if (when.conditions && !when.flag && !when.item && !when.count_true) {
      if (!evalCondition(when.conditions, ctx)) return false;
    } else if (when.flag != null || when.item || when.trust != null || when.stat
      || when.count_true || when.not || when.any || when.all || Array.isArray(when)) {
      if (!evalCondition(when, ctx)) return false;
    }
  }
  const flags = ctx.flags || {};
  const has = (id) => invCount(ctx.inventory || {}, id) > 0;
  if (Array.isArray(when.all_flags)) {
    for (const f of when.all_flags) if (!flags[f]) return false;
  }
  if (Array.isArray(when.any_flags)) {
    if (when.any_flags.length && !when.any_flags.some((f) => flags[f])) return false;
  }
  if (Array.isArray(when.none_flags)) {
    for (const f of when.none_flags) if (flags[f]) return false;
  }
  if (when.has_item && !has(when.has_item)) return false;
  if (when.lacks_item && has(when.lacks_item)) return false;
  if (when.min_kindness != null && (ctx.kindness ?? flags.kindness ?? 0) < when.min_kindness) return false;
  if (when.max_kindness != null && (ctx.kindness ?? flags.kindness ?? 0) > when.max_kindness) return false;
  if (when.quest) {
    const st = (ctx.quests || {})[when.quest];
    const want = when.questState || when.quest_state || "active";
    if ((st || "inactive") !== want) return false;
  }
  if (when.chapter && ctx.chapter && when.chapter !== ctx.chapter) return false;
  if (when.min_trust && when.npc) {
    const t = (ctx.trust || {})[when.npc] ?? 0;
    if (t < when.min_trust) return false;
  }
  return true;
}

export const FLAG_ALIASES = {
  carly_talked: "ch01_carly_talked",
  ch01_carly_talked: "carly_talked",
  lolo_talked: "ch01_lolo_talked",
  ch01_lolo_talked: "lolo_talked",
  wraith_fed: "ch01_wraith_fed",
  ch01_wraith_fed: "wraith_fed",
};

/** Objective-complete flags written when the matching conversation is finished. */
export const DIALOGUE_OBJECTIVE_FLAGS = {
  ch01_carly_home: ["ch01_carly_talked"],
  ch01_lolo_porch: ["ch01_lolo_talked"],
};

export function setFlag(flags, name, value = true) {
  if (!flags || !name) return;
  flags[name] = value;
  const alias = FLAG_ALIASES[name];
  if (alias) flags[alias] = value;
}

export function dialogueCompleteFlags(dlg) {
  if (!dlg) return [];
  if (DIALOGUE_OBJECTIVE_FLAGS[dlg.id]) return DIALOGUE_OBJECTIVE_FLAGS[dlg.id];
  return [];
}

export function dialogueIsComplete(dlg, ctx) {
  const flags = dialogueCompleteFlags(dlg);
  if (flags.length) return flags.some((f) => !!(ctx.flags && ctx.flags[f]));
  return !!(ctx.seen && dlg && ctx.seen[dlg.id]);
}

export function applyEffects(effects, ctx) {
  if (!effects) return;
  const list = Array.isArray(effects) ? effects : [effects];
  const flags = ctx.flags;
  const trust = ctx.trust;
  const addItem = ctx.addItem;
  const takeItem = ctx.takeItem;
  const player = ctx.player;
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    if (e.if) {
      const ok = evalCondition(e.if, ctx);
      applyEffects(ok ? e.then : e.else, ctx);
      continue;
    }
    if (e.set != null) {
      setFlag(flags, e.set, e.value !== undefined ? e.value : true);
      // Current ch08 draft sets this flag directly; also honor a dedicated event.
      if (e.set === "shelter_sealed" && flags.shelter_sealed) ctx.onEvent?.("seal_shelter", e);
    }
    if (e.unset) setFlag(flags, e.unset, false);
    if (e.add != null) {
      const n = e.value_from != null ? (Number(flags[e.value_from]) || 0) : (e.value ?? 1);
      flags[e.add] = (Number(flags[e.add]) || 0) + n;
    }
    if (e.trust && e.delta != null) {
      const id = e.trust;
      trust[id] = Math.max(-10, Math.min(10, (trust[id] || 0) + e.delta));
    }
    if (e.give) addItem?.(e.give, e.qty ?? 1);
    if (e.take) takeItem?.(e.take, e.qty ?? 1);
    if (e.stat && e.delta != null && player?.stats) {
      const key = e.stat === "satiety" ? "hunger" : e.stat === "radiation" ? (player.stats.rad != null ? "rad" : "radiation") : e.stat;
      if (player.stats[key] != null) {
        player.stats[key] = Math.max(0, Math.min(100, player.stats[key] + e.delta));
      } else if (key === "hydration") {
        player.stats.hydration = Math.max(0, Math.min(100, (player.stats.hydration ?? 70) + e.delta));
      }
    }
    if (e.quest && ctx.setQuest) ctx.setQuest(e.quest, e.state || "start", e.stage);
    if (e.event) {
      if (e.event === "npc_death" && e.npc) {
        if (ctx.alive) ctx.alive[e.npc] = false;
        flags[e.npc + "_alive"] = false;
      }
      if (e.event === "search_inventory" && Array.isArray(e.confiscate)) {
        for (const id of e.confiscate) takeItem?.(id, 99);
      }
      ctx.onEvent?.(e.event, e);
    }
    // Legacy placeholder fields only — canonical ending is flags.ending via {"set":"ending","value"}
    if (e.set_ending) flags.ending = e.set_ending;
    if (e.set_flags) for (const f of e.set_flags) setFlag(flags, f, true);
  }
}

export function resolveBranches(branches, ctx) {
  if (!branches || !branches.length) return null;
  for (const b of branches) {
    if (!b.conditions || evalCondition(b.conditions, ctx)) return b.next;
  }
  return null;
}

function inferNpc(d, fileHint) {
  if (d.npc || d.npc_id) return d.npc || d.npc_id;
  const skip = new Set(["narrator", "dell", "braith", "you", "adele", "adele_kowalczyk", "player"]);
  const speakers = d.speakers || [];
  const hit = speakers.find((s) => s && !skip.has(String(s).toLowerCase()));
  if (hit) return hit === "haas" ? "cpl_haas" : hit;
  const base = (fileHint || d.id || "").replace(/\.json$/, "");
  const m = base.match(/^ch\d+_(.+)$/);
  if (m) {
    const slug = m[1].split("_")[0];
    if (!["the", "a", "where", "sweep", "final", "gate", "door"].includes(slug)) {
      return slug === "haas" ? "cpl_haas" : slug;
    }
  }
  return null;
}

export function normalizeDialogue(raw, fileHint = "") {
  const pack = Array.isArray(raw) ? raw : raw?.dialogues || raw?.trees || [raw];
  const list = [];
  for (const d of pack) {
    if (!d || typeof d !== "object") continue;
    const id = d.id || d.dialogue_id || fileHint.replace(/\.json$/, "");
    let start = d.start || "start";
    let nodes = d.nodes || d.tree || null;
    if (Array.isArray(nodes)) {
      const map = {};
      for (const n of nodes) {
        if (!n || !n.id) continue;
        map[n.id] = {
          text: n.text || n.line || "",
          speaker: n.speaker,
          choices: n.choices || [],
          next: n.next,
          end: n.end,
          effects: n.effects,
          branches: n.branches,
        };
      }
      nodes = map;
    } else if (!nodes && Array.isArray(d.lines)) {
      nodes = {};
      d.lines.forEach((ln, i) => {
        const nid = ln.id || (i === 0 ? "start" : `n${i}`);
        nodes[nid] = { text: ln.text || ln.line || "", speaker: ln.speaker, choices: ln.choices || [], next: ln.next, end: ln.end, effects: ln.effects, branches: ln.branches };
      });
    } else if (!nodes && (d.text || d.line)) {
      nodes = { start: { text: d.text || d.line, speaker: d.speaker, choices: d.choices || [{ text: "[Leave]", end: true }] } };
    }
    if (!nodes) continue;
    if (typeof start !== "string") start = "start";
    if (!nodes[start]) {
      const first = Object.keys(nodes)[0];
      if (first) start = first;
    }
    if (nodes.start && start !== "start" && !nodes[start]) start = "start";
    const npc = inferNpc(d, fileHint);
    list.push({
      id,
      npc,
      location: d.location || d.loc || null,
      chapter: d.chapter || d.ch || (String(id).match(/^(ch\d+)/) || [])[1] || null,
      priority: d.priority ?? 0,
      when: d.when || d.conditions || d.if || {},
      trigger: d.trigger || null,
      trigger_conditions: d.trigger_conditions || null,
      on_end: d.on_end || d.onEnd || null,
      nodes,
      start,
      title: d.title || null,
      speakers: d.speakers || null,
    });
  }
  return list;
}

export class StorySystem {
  constructor() {
    this.source = "placeholder";
    this.bible = "";
    this.npcs = [];
    this.minor = [];
    this.dialogues = [];
    this.chapters = [];
    this.hooks = null;
    this.endings = {};
    this.flagsMeta = null;
    this.notesCatalog = [];
    this.loadedFiles = [];
    this.quests = [];
    this.defaultFlags = {};
    this.ambient = [];
    this.traders = [];
    this.generic = {};
  }

  async load() {
    // Skip the long story bible on boot (not needed to play). Load core data + Ch1 only.
    const npcs = await tryFetch(STORY_ROOT + "npcs.json");
    const hooks = await tryFetch(STORY_ROOT + "gameplay_hooks.json");
    const flags = await tryFetch(STORY_ROOT + "flags.json");
    const endings = await tryFetch(STORY_ROOT + "endings.json");
    const questsFile = await tryFetch(STORY_ROOT + "quests.json");
    const storyItems = await tryFetch(STORY_ROOT + "items.json");

    if (npcs) {
      this.npcs = npcs.npcs || npcs.characters || [];
      this.minor = npcs.minor_characters || npcs.minor || [];
      // Rev 2 speakers: ambient NPCs, the 6 traders, and generic speakers (incl. "hollow").
      this.ambient = npcs.ambient_npcs || [];
      this.traders = npcs.traders || [];
      this.generic = npcs.generic_speakers || {};
      this.loadedFiles.push("story/npcs.json");
    }
    if (hooks) { this.hooks = hooks; this.loadedFiles.push("story/gameplay_hooks.json"); }
    if (flags) { this.flagsMeta = flags; this.loadedFiles.push("story/flags.json"); }
    if (endings) { this.endings = endings.endings || endings; this.loadedFiles.push("story/endings.json"); }
    if (questsFile) { this.questDefs = questsFile.quests || questsFile; this.loadedFiles.push("story/quests.json"); }
    if (storyItems) { this.storyItems = storyItems.items || storyItems; this.loadedFiles.push("story/items.json"); }

    const dlgListed = await listDir(STORY_ROOT + "dialogue/");
    const dlgWant = (dlgListed.length ? dlgListed : [
      "ch01_theo_morning.json", "ch01_theo_night.json", "ch01_marguerite_porch.json",
      "ch01_ray_garage.json", "ch01_wren_pharmacy.json",
    ]).filter((n) => n.endsWith(".json") && /ch01/.test(n));
    const dlgFiles = [];
    for (const n of dlgWant) {
      const data = await tryFetch(STORY_ROOT + "dialogue/" + n);
      if (data != null) dlgFiles.push({ name: n, data });
    }
    for (const f of dlgFiles) {
      this.dialogues.push(...normalizeDialogue(f.data, f.name));
      this.loadedFiles.push("story/dialogue/" + f.name);
    }

    const chListed = await listDir(STORY_ROOT + "chapters/");
    const chWant = (chListed.length ? chListed : ["ch01_day_three.md"]).filter((n) => /ch01/.test(n));
    const chFilesMd = [];
    const chFilesJs = [];
    for (const n of chWant) {
      const data = await tryFetch(STORY_ROOT + "chapters/" + n);
      if (data == null) continue;
      if (n.endsWith(".md")) chFilesMd.push({ name: n, data });
      else if (n.endsWith(".json")) chFilesJs.push({ name: n, data });
    }
    for (const f of [...chFilesMd, ...chFilesJs]) {
      this.loadedFiles.push("story/chapters/" + f.name);
      if (typeof f.data === "string") {
        const id = (f.name.match(/ch\d+/) || [f.name.replace(/\..+$/, "")])[0];
        const title = (f.data.match(/^#\s+(.+)$/m) || [null, f.name])[1];
        this.chapters.push({ id, title, markdown: f.data });
      } else if (Array.isArray(f.data)) this.chapters.push(...f.data);
      else if (f.data.chapters) this.chapters.push(...f.data.chapters);
      else this.chapters.push(f.data);
    }

    const { PLACEHOLDER } = await import("./data/placeholderStory.js?v=r15.1");
    if (!this.npcs.length) this.npcs = PLACEHOLDER.npcs;
    if (!Object.keys(this.endings).length) this.endings = PLACEHOLDER.endings;
    this.notesCatalog = PLACEHOLDER.notes;
    const ids = new Set(this.dialogues.map((d) => d.id));
    // Story files always win; placeholder only fills missing ids (e.g. dam_console).
    for (const d of PLACEHOLDER.dialogues) {
      if (!ids.has(d.id)) this.dialogues.push({ ...d, placeholder: true });
    }
    if (!this.hooks) this.hooks = PLACEHOLDER.hooks;
    this._storyLoaded = new Set(["ch01"]);
    this.quests = this.questDefs || (this.hooks && this.hooks.quests) || PLACEHOLDER.hooks.quests;
    this.defaultFlags = { ...(PLACEHOLDER.defaultFlags) };
    const catalog = this.flagsMeta && (this.flagsMeta.flags || this.flagsMeta.defaults);
    if (catalog && !Array.isArray(catalog)) {
      for (const [k, meta] of Object.entries(catalog)) {
        if (meta && typeof meta === "object" && "default" in meta) this.defaultFlags[k] = meta.default;
        else if (this.flagsMeta.defaults) { /* skip */ }
        else this.defaultFlags[k] = meta;
      }
    }
    if (this.flagsMeta && this.flagsMeta.defaults) Object.assign(this.defaultFlags, this.flagsMeta.defaults);
    this.source = this.loadedFiles.length ? "story+placeholder" : "placeholder";
    return this;
  }


  /** Fetch remaining story files for a chapter the first time it is entered. */
  async ensureChapterStory(id) {
    const ch = String(id || "ch01");
    // ch07b (Dixie Valley) shares the ch07 dialogue files.
    const prefix = (ch.match(/^ch\d+/) || [ch.replace(/_.*$/, "")])[0];
    if (this._storyLoaded && this._storyLoaded.has(prefix)) return;
    this._storyLoaded = this._storyLoaded || new Set(["ch01"]);
    const dlgListed = await listDir(STORY_ROOT + "dialogue/");
    const have = new Set(this.loadedFiles.map((f) => f.split("/").pop()));
    const names = (dlgListed.length ? dlgListed : []).filter((n) => n.endsWith(".json") && n.startsWith(prefix) && !have.has(n));
    for (const n of names) {
      const data = await tryFetch(STORY_ROOT + "dialogue/" + n);
      if (data != null) {
        this.dialogues.push(...normalizeDialogue(data, n));
        this.loadedFiles.push("story/dialogue/" + n);
      }
    }
    const chListed = await listDir(STORY_ROOT + "chapters/");
    for (const n of (chListed.length ? chListed : []).filter((n) => n.startsWith(prefix) && !have.has(n))) {
      const data = await tryFetch(STORY_ROOT + "chapters/" + n);
      if (data == null) continue;
      this.loadedFiles.push("story/chapters/" + n);
      if (typeof data === "string") {
        const id0 = (n.match(/ch\d+/) || [n.replace(/\..+$/, "")])[0];
        const title = (data.match(/^#\s+(.+)$/m) || [null, n])[1];
        this.chapters.push({ id: id0, title, markdown: data });
      } else if (data && typeof data === "object") {
        this.chapters.push(data);
      }
    }
    this._storyLoaded.add(prefix);
  }

  startingFlags() {
    const f = { ...(this.defaultFlags || {}) };
    // Rev 2: defaults come from story/flags.json only (no v1 theo/hank/insulin defaults).
    for (const k of ["theo_alive", "hank_alive", "insulin_found", "insulin_given"]) delete f[k];
    if (f.kindness === undefined) f.kindness = 0;
    if (f.tallmen_killed === undefined) f.tallmen_killed = 0;
    if (f.assimilated_killed === undefined) f.assimilated_killed = 0;
    if (!f.chapter) f.chapter = "ch01";
    return f;
  }

  chapterDef(id) {
    const list = this.hooks?.chapters || [];
    return list.find((c) => (c.id || c.chapter) === id) || null;
  }

  sceneAllowed(sceneId, ctx) {
    const d = this.dialogues.find((x) => x.id === sceneId);
    if (d?.trigger_conditions && !evalCondition(d.trigger_conditions, ctx)) return false;
    const ch = this.chapterDef(ctx.chapter || d?.chapter);
    const sc = ch?.scene_conditions && ch.scene_conditions[sceneId];
    if (sc && !evalCondition(sc, ctx)) return false;
    return true;
  }

  applyChapterStart(id, ctx) {
    const ch = this.chapterDef(id);
    if (ch?.chapter_start_effects) applyEffects(ch.chapter_start_effects, ctx);
  }

  applyChapterEnd(id, ctx) {
    const ch = this.chapterDef(id);
    if (ch?.chapter_end_effects) applyEffects(ch.chapter_end_effects, ctx);
  }

  encounterTypes(encId) {
    const enc = this.hooks?.encounters?.[encId];
    if (enc && Array.isArray(enc.enemies) && enc.enemies.length) {
      return enc.enemies.map((e) => ({ type: e.type, count: e.count || 1 }));
    }
    return this._legacyEncounterTypes(encId);
  }

  _legacyEncounterTypes(encId) {
    // Hooks list per-chapter enemy types; map known encounter ids to a composition.
    const table = {
      enc_ch01_watch_standoff: [{ type: "watch_militia", count: 2 }],
      enc_ch02_crush: [{ type: "looter", count: 3 }],
      enc_ch03_fire_defend: [{ type: "bridge_boy", count: 4 }],
      enc_ch03_fire_rescue: [{ type: "bridge_boy", count: 2 }],
      enc_ch05_compact_attack: [{ type: "compact_militia", count: 4 }],
      enc_ch05_ironwood_turn: [{ type: "ironwood_patrol", count: 4 }],
      enc_ch05_crossfire: [{ type: "ironwood_patrol", count: 3 }, { type: "compact_militia", count: 3 }],
      enc_ch06_escape_house: [{ type: "ironwood_patrol", count: 4 }],
      enc_ch06_harbor_retaliation: [{ type: "harbor_militia", count: 4 }],
      enc_ch08_husk: [{ type: "husk", count: 3 }],
      enc_ch09_picket_assault: [{ type: "remnant_patrol", count: 4 }, { type: "husk", count: 2 }],
      enc_ch10_gate_battle: [{ type: "remnant_patrol", count: 6 }],
    };
    return table[encId] || [];
  }

  chapterEnemies(id) {
    return this.chapterDef(id)?.enemies || [];
  }

  startingTrust() {
    const t = {};
    for (const n of this.npcs) t[n.id] = n.trust?.start ?? 0;
    for (const n of this.minor) t[n.id] = n.trust?.start ?? 0;
    return t;
  }

  npcById(id) {
    if (!id) return null;
    const alt = id === "haas" ? "cpl_haas" : id === "cpl_haas" ? "haas" : null;
    const m = (n) => n && (n.id === id || n.id === alt);
    return this.npcs.find(m) || this.minor.find(m)
      || (this.ambient || []).find(m) || (this.traders || []).find(m)
      || (this.generic && this.generic[id] ? { id, name: id === "hollow" ? "???" : id.replace(/_/g, " "), generic: true } : null)
      || null;
  }

  traderById(id) {
    return (this.traders || []).find((t) => t.id === id) || null;
  }

  npcName(id) {
    const n = this.npcById(id);
    return n?.name || (id === "dam_console" ? "Galena panel" : id || "");
  }

  _npcMatch(d, npcId) {
    if (!npcId) return !d.npc;
    const aliases = [npcId];
    if (npcId === "cpl_haas") aliases.push("haas");
    if (npcId === "haas") aliases.push("cpl_haas");
    const id = String(d.id || "");
    // Prefer trees named for this NPC so scene beats that merely mention them
    // (voicemail, pharmacy, marina) are not offered as a walk-up conversation.
    if (aliases.some((a) => new RegExp("(?:^|_)" + a + "(?:_|$)", "i").test(id))) return true;
    if (aliases.includes(d.npc)) {
      const slug = id.replace(/^ch\d+b?_/, "").split("_")[0];
      if (aliases.includes(slug)) return true;
    }
    return false;
  }

  _timeOfDayOk(d, npcId, ctx, chapter) {
    const id = d.id || "";
    if (d.tutorial || /tutorial|companion/i.test(id)) return true;
    const morn = /morning/i.test(id);
    const night = /night/i.test(id) && !morn;
    if (!morn && !night) return true;
    const siblings = this.dialogues.filter((x) => this._npcMatch(x, npcId) && (!x.chapter || x.chapter === chapter));
    if (morn && ctx.night) {
      if (siblings.some((x) => /night/i.test(x.id || "") && !/morning/i.test(x.id || ""))) return false;
    }
    if (night && !ctx.night) {
      if (siblings.some((x) => /morning/i.test(x.id || "") && !/night/i.test(x.id || ""))) return false;
    }
    return true;
  }

  _dialogueMemDone(d, ctx) {
    if (!d) return false;
    const mem = ctx.dialogueMem;
    const rec = mem && mem.npcs && mem.npcs[d.npc];
    if (rec && rec.completed && rec.completed[d.id]) return true;
    return false;
  }

  pickDialogue(npcId, ctx) {
    const seen = ctx.seen || {};
    const chapter = ctx.chapter || "ch01";
    let cands = this.dialogues
      .filter((d) => this._npcMatch(d, npcId))
      .filter((d) => !d.chapter || d.chapter === chapter)
      .filter((d) => this.sceneAllowed(d.id, { ...ctx, npc: npcId }))
      .filter((d) => evalWhen(d.when, { ...ctx, npc: npcId }))
      .filter((d) => !d.trigger_conditions || evalCondition(d.trigger_conditions, ctx))
      .filter((d) => this._timeOfDayOk(d, npcId, ctx, chapter))
      .sort((a, b) => {
        const as = seen[a.id] ? 0 : 1;
        const bs = seen[b.id] ? 0 : 1;
        if (bs !== as) return bs - as;
        const ac = a.chapter === chapter ? 1 : 0;
        const bc = b.chapter === chapter ? 1 : 0;
        if (bc !== ac) return bc - ac;
        return (b.priority || 0) - (a.priority || 0);
      });
    // Don't replay a one-shot if something unseen exists; allow a fallback replay
    // Real story files always beat placeholder filler (e.g. theo_start vs ch01_theo_morning).
    const storyCands = cands.filter((d) => !d.placeholder);
    if (storyCands.length) cands = storyCands;
    // Never fall back to replaying a finished intro tree — revisit is synthesized by the game.
    return cands.find((d) => !this._dialogueMemDone(d, ctx)) || null;
  }

  pickLocationDialogue(locId, ctx) {
    const seen = ctx.seen || {};
    const chapter = ctx.chapter || "ch01";
    const cands = this.dialogues
      .filter((d) => d.location === locId && !d.npc)
      .filter((d) => !d.chapter || d.chapter === chapter)
      .filter((d) => this.sceneAllowed(d.id, ctx))
      .filter((d) => !seen[d.id])
      .filter((d) => evalWhen(d.when, ctx));
    return cands[0] || null;
  }

  endingText(id) {
    const e = this.endings[id];
    if (!e) return { title: id, body: "The wind takes the rest of the page." };
    if (typeof e === "string") return { title: id, body: e };
    return { title: e.title || id, body: e.body || e.text || e.outcome || "" };
  }

  resolveEnding(flags, ctx = {}) {
    // Canonical store: flags.ending (set by ch10_final). final_ending is legacy only.
    if (flags.ending) return flags.ending;
    if (flags.final_ending) return flags.final_ending;
    const ctxAll = { flags, inventory: ctx.inventory || {}, trust: ctx.trust || {}, ...ctx };
    const fromFile = this.flagsMeta?.endings;
    const list = Array.isArray(fromFile)
      ? fromFile
      : Object.entries(this.endings || {}).map(([id, e]) => ({ id, ...(typeof e === "object" ? e : { body: e }) }));
    const ranked = [...list].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    for (const e of ranked) {
      if (e.conditions && evalCondition(e.conditions, ctxAll)) return e.id;
    }
    return "end_two_coats";
  }
}
