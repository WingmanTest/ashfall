// Per-chapter level JSON from Cartographer (/levels/). Fallback built-in layouts.
// Never writes into /levels/.
import { LOCATIONS } from "./config.js?v=r15";
import { tryFetch, listDir } from "./load.js?v=r15";

const FALLBACK_CHAPTERS = [
  { id: "ch01", title: "Day Three", act: "I" },
  { id: "ch02", title: "The Registry", act: "I" },
  { id: "ch03", title: "The Long Cold", act: "II" },
  { id: "ch04", title: "Black Start", act: "II" },
  { id: "ch05", title: "Route 9", act: "II" },
  { id: "ch06", title: "The Trench", act: "II" },
  { id: "ch07", title: "Dead Air", act: "III" },
  { id: "ch08", title: "Ashfall", act: "III" },
  { id: "ch09", title: "The Long Night", act: "III" },
  { id: "ch10", title: "The Warm Room", act: "III" },
];

// Compact portrait map: one snowed-in corridor through Sector 4 toward the dam.
const FALLBACK_LEVEL = {
  id: "sector4_route",
  bounds: { minX: -11, maxX: 11, minZ: -96, maxZ: 16 },
  spawn: { x: 0, z: 8, yaw: 0 },
  locations: {
    loc_east_end: { name: "East End", x: 0, z: 6, safe: true },
    loc_belknap_pharmacy: { name: "Belknap Pharmacy", x: -7.2, z: -18, safe: false },
    loc_blatnik_bridge: { name: "Blatnik checkpoint", x: 0, z: -28, safe: false },
    loc_lakehead_memorial: { name: "Lakehead Memorial", x: -7.0, z: -8, safe: false },
    loc_decc_ration: { name: "DECC registry", x: 6.4, z: -44, safe: false },
    loc_lou_shack: { name: "Lou's shack", x: 7.4, z: -38, safe: true },
    loc_proctor_yard: { name: "Proctor yard", x: -8, z: -48, safe: false },
    loc_hwy53_blockade: { name: "Hwy 53 blockade", x: 0, z: -58, safe: false },
    loc_ore_docks: { name: "Ore docks", x: 8, z: -68, safe: false },
    loc_lift_bridge: { name: "Lift bridge", x: 0, z: -72, safe: false },
    loc_thomson_dam: { name: "Thomson Dam", x: 0, z: -82, safe: false },
    loc_jay_cooke: { name: "Jay Cooke", x: 0, z: -90, safe: false },
    river_ice: { name: "River ice", x: 0, z: -72, safe: false, r: 16 },
  },
  npcs: [
    { id: "theo", x: -1.1, z: 10.2, chapters: ["ch01", "ch02", "ch03", "ch07", "ch08", "ch09", "ch10"] },
    { id: "marguerite", x: -3.8, z: 7.2, chapters: ["ch01", "ch02", "ch03", "ch07", "ch08", "ch10"] },
    { id: "ray", x: 3.6, z: 6.4, chapters: ["ch01", "ch02", "ch03", "ch05", "ch09", "ch10"] },
    { id: "wren", x: -6.4, z: -18.4, chapters: ["ch01", "ch02", "ch03", "ch06", "ch09"] },
    { id: "ames", x: -6.8, z: -8.2, chapters: ["ch02", "ch04", "ch06", "ch08", "ch10"] },
    { id: "cpl_haas", x: 1.6, z: -27.5, chapters: ["ch02"] },
    { id: "haas", x: 1.6, z: -27.5, chapters: ["ch02"] },
    { id: "strand", x: 6.2, z: -43.5, chapters: ["ch02", "ch04", "ch06", "ch08", "ch10"] },
    { id: "lou", x: 6.6, z: -37.2, chapters: ["ch02", "ch03", "ch05", "ch07", "ch08"] },
    { id: "hank", x: 7.2, z: -39.0, chapters: ["ch03", "ch04", "ch05", "ch07", "ch09"] },
    { id: "bea", x: 7.6, z: -69.2, chapters: ["ch03", "ch04", "ch05", "ch06", "ch08", "ch10"] },
    { id: "jory", x: -2.4, z: -57.4, chapters: ["ch05", "ch06", "ch09", "ch10"] },
    { id: "cody", x: -3.2, z: -56.2, chapters: ["ch05", "ch06", "ch09", "ch10"] },
    { id: "ruiz", x: 2.4, z: -60.0, chapters: ["ch05", "ch06", "ch07"] },
  ],
  // Scavenging is the core loop — many named containers, not a short breadcrumb trail.
  loot: [
    { id: "home_closet", x: -2.6, z: 9.4, r: 1.5, label: "Hall closet", items: { cloth: 3, wood: 1, lineman_tools: 1 } },
    { id: "home_kitchen", x: 0.6, z: 10.6, r: 1.5, label: "Kitchen drawer", items: { ration: 1, bandage: 1, cigarettes: 1 } },
    { id: "sedan_glove", x: -1.8, z: -10, r: 1.7, label: "Wrecked sedan", items: { gas_can: 1, cloth: 1, scrap: 1 } },
    { id: "dump_home", x: 4.5, z: -7, r: 1.6, label: "Alley dumpster", items: { wood: 3, cloth: 2, ration: 1 }, table: "dumpster" },
    { id: "memorial_cabinet", x: -6.6, z: -7.4, r: 1.5, label: "Clinic cabinet", items: { bandage: 2, cloth: 1 }, table: "cabinet" },
    { id: "dump_pharm", x: -4.6, z: -17, r: 1.6, label: "Pharmacy dumpster", items: { cloth: 2, scrap: 1 }, table: "dumpster", note: "note_wren" },
    { id: "pharm_back", x: -6.6, z: -19.5, r: 1.5, label: "Pharmacy fridge", items: { insulin: 1, bandage: 2, cool_pack: 1, pharmacy_bag: 1 }, table: "fridge" },
    { id: "pharm_shelf", x: -5.4, z: -20.2, r: 1.4, label: "Rx shelf", items: { bandage: 1, cloth: 1 } },
    { id: "bridge_bag", x: -2.2, z: -27.8, r: 1.5, label: "Abandoned pack", items: { ration: 1, cloth: 1, ammo_9mm: 4 }, table: "body" },
    { id: "dump_mid", x: 4.8, z: -30, r: 1.5, label: "Iced dumpster", table: "dumpster", items: { scrap: 2, wood: 1 } },
    { id: "crate_yard", x: -5.4, z: -46, r: 1.8, label: "Yard crate", items: { radio_crystal: 1, scrap: 3, ammo_shell: 3, cloth: 1 }, table: "crate" },
    { id: "bus_battery", x: -7.4, z: -48.5, r: 1.8, label: "Dead bus", items: { start_battery: 1, wire: 2, ammo_shell: 2 } },
    { id: "yard_locker", x: -6.2, z: -50.5, r: 1.5, label: "Yard locker", table: "locker", items: { filter: 1, scrap: 2 } },
    { id: "blockade_fuel", x: 2.2, z: -58.5, r: 1.8, label: "Burned sedan", items: { fuel: 2, ammo_9mm: 8, pistol: 1, scrap: 2 } },
    { id: "blockade_crate", x: -4.0, z: -59.2, r: 1.5, label: "Checkpoint crate", table: "crate", items: { ammo_shell: 2, cloth: 1 } },
    { id: "dock_crate", x: 7.2, z: -67, r: 1.6, label: "Dock crate", items: { ration: 2, cloth: 2, wood: 2 }, table: "crate" },
    { id: "dock_bin", x: 6.4, z: -70.2, r: 1.5, label: "Fish bin", table: "dumpster", items: { cloth: 1, ration: 1 } },
    { id: "dam_filter", x: -3.2, z: -85, r: 1.6, label: "Intake locker", items: { filter: 2, scrap: 2 }, table: "locker" },
    { id: "dam_desk", x: 1.6, z: -84.2, r: 1.5, label: "Control desk", items: { wire: 2, note: 1 } },
    { id: "decc_box", x: 5.2, z: -45.2, r: 1.5, label: "Ration crate", items: { ration: 2, cloth: 1 }, table: "crate" },
  ],
  enemies: [
    { kind: "husk", x: -2.5, z: -24 },
    { kind: "husk", x: 3.2, z: -32 },
    { kind: "husk", x: -1.4, z: -74 },
    { kind: "husk", x: 2.8, z: -78 },
    { kind: "raider", x: 2.0, z: -55 },
    { kind: "raider", x: -3.5, z: -61 },
    { kind: "dog", x: -4.0, z: -47 },
    { kind: "dog", x: 3.8, z: -52 },
  ],
  fires: [
    { id: "home", x: -2.2, z: 8.5 },
    { id: "lou", x: 6.2, z: -37 },
  ],
};

export async function loadLevels() {
  const found = [];
  const files = {};
  // Always load the catalog first (listDir may only return files[] from it).
  const catalog = await tryFetch("./levels/index.json");
  if (catalog != null) { files["index.json"] = catalog; found.push("levels/index.json"); }
  else {
    const alt = await tryFetch("./levels/levels.json");
    if (alt != null) { files["levels.json"] = alt; found.push("levels/levels.json"); }
  }
  const listed = await listDir("./levels/");
  // Boot only the catalog + Ch1. Later chapters are fetched in ensureChapterLevel().
  const tryNames = ["index.json", "levels.json", "world.json", "schema.json", "id_registry.json", "ch01_day_three.json", "ch01.json"];
  const names = listed.length ? listed.filter((n) => {
    const s = String(n);
    if (!s.endsWith(".json")) return false;
    if (s === "index.json" || s === "levels.json" || s === "world.json" || s === "schema.json" || s === "id_registry.json") return true;
    return s.startsWith("ch01");
  }) : tryNames;
  for (const n of [...new Set(names)]) {
    if (!String(n).endsWith(".json")) continue;
    if (files[n]) continue;
    const data = await tryFetch("./levels/" + n);
    if (data != null) { files[n] = data; found.push("levels/" + n); }
  }
  const index = files["index.json"] || files["levels.json"] || {};
  const indexFiles = Array.isArray(index.files) ? index.files : [];
  const chapters = index.chapters || FALLBACK_CHAPTERS;
  const world = files["world.json"] || files["sector4.json"] || files["map.json"] || index.world || index.level || FALLBACK_LEVEL;
  const perChapter = {};
  for (const c of chapters) {
    const id = c.id || c;
    const fname = Object.keys(files).find((n) => n.replace(/\.json$/, "") === id || n.startsWith(id + "_"));
    if (fname) perChapter[id] = files[fname];
  }
  const locations = buildLocationCatalog(LOCATIONS, world, perChapter, files);
  return { world, chapters, perChapter, locations, indexFiles, storyVersion: index.storyVersion || 2, loadedFiles: found, source: found.length ? "levels+fallback" : "fallback" };
}

/** Map a story location id to Cartographer data: locations[], then grid terrain of the same name (e.g. river_ice). */
export function locationFromLevel(level, id) {
  if (!level || !id) return null;
  const alts = [id, id.startsWith("loc_") ? id.slice(4) : "loc_" + id];
  const list = level.locations || [];
  const hit = list.find((l) => alts.includes(l.id) || alts.includes(l.name));
  if (hit) {
    const x = hit.x ?? mid(hit.rect?.x0, hit.rect?.x1) ?? 0;
    const z = hit.z ?? mid(hit.rect?.z0, hit.rect?.z1) ?? 0;
    return { ...hit, id: hit.id || id, x, z, name: hit.name || hit.label || id, safe: !!hit.safe };
  }
  const box = bboxForLegendName(level, id) || bboxForLegendName(level, alts[1]);
  if (box) return { id, name: id.replace(/^loc_/, "").replace(/_/g, " "), ...box, safe: false, source: "grid" };
  return null;
}

function mid(a, b) {
  if (a == null || b == null) return undefined;
  return (a + b) / 2;
}

export function bboxForLegendName(level, name) {
  const g = level?.grid;
  if (!g || !g.legend || !g.tiles) return null;
  const ch = Object.keys(g.legend).find((k) => (g.legend[k] && g.legend[k].name === name) || k === name);
  if (!ch) return null;
  const origin = g.origin || { x: 0, z: 0 };
  const cs = g.cellSize || 1;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, n = 0, sx = 0, sz = 0;
  const tiles = g.tiles;
  for (let r = 0; r < tiles.length; r++) {
    const row = tiles[r];
    const s = typeof row === "string" ? row : (row && row.join ? row.join("") : "");
    for (let c = 0; c < s.length; c++) {
      if (s[c] !== ch) continue;
      const x = origin.x + (c + 0.5) * cs;
      const z = origin.z + (r + 0.5) * cs;
      sx += x; sz += z; n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  if (!n) return null;
  return {
    x: sx / n, z: sz / n, r: Math.max((maxX - minX), (maxZ - minZ)) / 2,
    rect: { type: "rect", x0: minX, z0: minZ, x1: maxX, z1: maxZ },
    terrain: name, source: "grid",
  };
}

function buildLocationCatalog(base, world, perChapter, files) {
  const out = { ...base };
  const add = (id, loc) => {
    if (!id || !loc) return;
    const prev = out[id] || {};
    out[id] = { ...prev, ...loc, id, name: loc.name || loc.label || prev.name || id };
    if (id.startsWith("loc_") && !out[id.slice(4)]) out[id.slice(4)] = out[id];
    if (!id.startsWith("loc_") && !out["loc_" + id]) out["loc_" + id] = { ...out[id], id: "loc_" + id };
  };
  if (world?.locations) {
    const w = world.locations;
    if (Array.isArray(w)) for (const l of w) add(l.id, l);
    else for (const [id, l] of Object.entries(w)) add(id, l);
  }
  for (const level of Object.values(perChapter || {})) {
    for (const l of (level.locations || [])) add(l.id, locationFromLevel(level, l.id) || l);
    // Story ids that only exist as named terrain (river_ice) or landmarks
    if (level.grid) {
      for (const [ch, meta] of Object.entries(level.grid.legend || {})) {
        const name = meta && meta.name;
        if (!name || !(name.includes("river") || name.includes("ice") || name.startsWith("loc_"))) continue;
        const box = bboxForLegendName(level, name);
        if (!box) continue;
        const prev = out[name];
        const prevArea = prev?.rect ? Math.abs((prev.rect.x1 - prev.rect.x0) * (prev.rect.z1 - prev.rect.z0)) : 0;
        const area = Math.abs((box.rect.x1 - box.rect.x0) * (box.rect.z1 - box.rect.z0));
        if (!prev || !prev.rect || area >= prevArea) add(name, { name: name.replace(/_/g, " "), ...box });
      }
    }
  }
  // Prefer the largest river_ice terrain among loaded chapter grids (usually Ch9).
  let bestIce = null, bestArea = -1;
  for (const level of Object.values({ ...(files || {}), ...(perChapter || {}) })) {
    if (!level || !level.grid) continue;
    const box = bboxForLegendName(level, "river_ice");
    if (!box) continue;
    const area = Math.abs((box.rect.x1 - box.rect.x0) * (box.rect.z1 - box.rect.z0));
    if (area > bestArea) { bestArea = area; bestIce = box; }
  }
  if (bestIce) add("river_ice", { name: "River ice", ...bestIce });
  return out;
}

export function advanceChapter(current, flags, chapters, storyVersion = 1) {
  // Rev 2 (the shipped story) ends chapters through authored chapter_end triggers.
  // The v1 flag gates below reference retired ids and must not auto-advance a
  // Rev 2 playthrough — even if storyVersion was lost and defaulted.
  if (storyVersion !== 1) return current || "ch01";
  const order = (chapters || FALLBACK_CHAPTERS).map((c) => c.id || c);
  const i = Math.max(0, order.indexOf(current));
  const f = flags || {};
  // Lightweight gates so later dialogue unlocks as the player actually does things.
  const gates = [
    null,
    () => f.insulin_found || f.insulin_given || f.ch01_pharmacy_choice || f.ch01_wren_let_go,
    () => f.ch02_registered || f.radio_delivered,
    () => f.ch03_helped_ray || f.hank_briefed || f.ch03_wren_warned,
    () => f.dam_running || f.relay_kit || f.power_priority,
    () => f.ch05_met_jory || f.jory_met,
    () => f.ch06_bridge || f.theo_side,
    () => f.radio_delivered || f.ch07_dead_air,
    () => f.ch08_ashfall || f.rad > 0,
    () => f.at_dam || f.ending_locked,
  ];
  // Advance at most one chapter when the current gate is satisfied
  const gate = gates[i];
  if (gate && gate() && i < order.length - 1) return order[i + 1];
  return current || "ch01";
}


/** Lazy-load a chapter level JSON the first time the player enters it.
 * Rev 2: file names come from levels/index.json (ch06 -> ch06_the_trench.json,
 * ch07b -> ch07b_dixie_valley.json via chapters[].levels), with a static fallback. */
const LEVEL_FILES = {
  ch01: "ch01_day_three.json", ch02: "ch02_the_registry.json", ch03: "ch03_the_long_cold.json",
  ch04: "ch04_black_start.json", ch05: "ch05_route_9.json", ch06: "ch06_the_trench.json",
  ch07: "ch07_dead_air.json", ch07b: "ch07b_dixie_valley.json", ch08: "ch08_ashfall.json",
  ch09: "ch09_the_long_night.json", ch10: "ch10_the_warm_room.json",
};
export function levelFileFor(pack, id) {
  const chapters = (pack && pack.chapters) || [];
  const files = (pack && pack.indexFiles) || [];
  for (const c of chapters) {
    if ((c.id || c) === id && c.file) return c.file;
    for (const lv of (c.levels || [])) if (String(lv).startsWith(id + "_")) return lv + ".json";
  }
  const hit = files.find((n) => String(n).startsWith(id + "_"));
  return hit || LEVEL_FILES[id] || null;
}

export async function ensureChapterLevel(pack, id) {
  if (!pack || !id) return null;
  pack.perChapter = pack.perChapter || {};
  if (pack.perChapter[id]) return pack.perChapter[id];
  const cands = [levelFileFor(pack, id), LEVEL_FILES[id], id + ".json"].filter(Boolean);
  for (const n of [...new Set(cands)]) {
    const data = await tryFetch("./levels/" + n);
    if (data && data.grid) {
      pack.perChapter[id] = data;
      pack.loadedFiles = pack.loadedFiles || [];
      pack.loadedFiles.push("levels/" + n);
      return data;
    }
  }
  return null;
}
