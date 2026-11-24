// Data-driven items / recipes / weapons / enemies / loot / survival.
// Loads /systems/*.json when Quartermaster has written them. Never writes there.
import { ITEMS as BASE_ITEMS, RECIPES as BASE_RECIPES, CFG } from "./config.js";
import { tryFetch, loadJsonDir, listDir } from "./load.js";

export const ITEM_ALIAS = {
  insulin_vial: "insulin",
  insulin_vials: "insulin",
  gas_can: "fuel",
  fuel_can: "fuel",
  petrol: "fuel",
  canned_food: "ration",
  ration_tin: "ration",
  rag: "cloth",
  rags: "cloth",
  scrap_metal: "scrap",
  shell: "ammo_shell",
  shells: "ammo_shell",
  "12ga": "ammo_shell",
  "9mm": "ammo_9mm",
  shotgun: "blaster",
  makeshift_12ga: "blaster",
  service_pistol: "pistol",
  wool_coat: "coat",
  lead_pipe: "pipe",
  shop_knife: "knife",
  medkit: "bandage",
  bandages: "bandage",
};

export function aliasItem(id) {
  if (!id) return id;
  return ITEM_ALIAS[id] || id;
}

function asItemMap(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const m = {};
    for (const it of raw) {
      const id = it.id || it.key;
      if (id) m[id] = { ...it, name: it.name || id };
    }
    return m;
  }
  if (raw.items && !raw.name) {
    return asItemMap(raw.items);
  }
  return raw;
}

function asRecipeList(raw) {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : (raw.recipes || raw.list || null);
  if (!list) return null;
  return list.map((r) => {
    const inn = r.in || r.inputs || r.need || r.ingredients || {};
    const inMap = Array.isArray(inn)
      ? Object.fromEntries(inn.map((x) => [aliasItem(x.id || x.item), x.n || x.qty || 1]))
      : Object.fromEntries(Object.entries(inn).map(([k, v]) => [aliasItem(k), v]));
    const out = r.out || r.output || { id: r.id, n: r.qty || 1 };
    const outObj = Array.isArray(out) ? out[0] : out;
    return {
      id: r.id || outObj.id || outObj.item,
      out: { id: aliasItem(outObj.id || outObj.item || r.id), n: outObj.n || outObj.qty || 1 },
      in: inMap,
      special: r.special || r.flag || null,
      set_flags: r.set_flags || null,
    };
  });
}

export async function loadSystems() {
  const found = [];
  const tryNames = [
    "items.json", "recipes.json", "weapons.json", "enemies.json",
    "loot.json", "loot_tables.json", "survival.json", "survival_rates.json",
    "index.json", "systems.json", "crafting.json", "ammo.json", "difficulty.json",
  ];
  const files = {};
  const listed = await listDir("./systems/");
  const names = listed.length ? listed : tryNames;
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const data = await tryFetch("./systems/" + n);
    if (data != null) { files[n] = data; found.push("systems/" + n); }
  }
  const idx = files["index.json"] || files["systems.json"] || {};

  const items = {
    ...BASE_ITEMS,
    ...asItemMap(files["items.json"] || idx.items),
  };
  // Story / bible extras so dialogue give/take always resolve
  const extras = {
    gas_can: { name: "Gas can", stack: 6, kind: "mat" },
    lineman_tools: { name: "Lineman tools", stack: 1, kind: "quest" },
    insulin_vial: { name: "Insulin vial", stack: 6, kind: "quest" },
    cool_pack: items.cool_pack || { name: "Cool pack", stack: 2, kind: "quest" },
    priority_card: { name: "Priority card", stack: 1, kind: "quest" },
    ration_card: { name: "Ration card", stack: 1, kind: "quest" },
    pharmacy_bag: { name: "Pharmacy bag", stack: 1, kind: "quest" },
    cigarettes: { name: "Cigarettes", stack: 4, kind: "mat" },
    canned_food: { name: "Canned food", stack: 8, kind: "use", hunger: -35, warmth: 4 },
    cooler: { name: "Lake-water cooler", stack: 1, kind: "quest" },
    relay_kit: { name: "Relay kit", stack: 1, kind: "quest" },
    note: items.note || { name: "Torn note", stack: 20, kind: "note" },
  };
  for (const [k, v] of Object.entries(extras)) if (!items[k]) items[k] = v;

  let recipes = asRecipeList(files["recipes.json"] || files["crafting.json"] || idx.recipes) || BASE_RECIPES.slice();
  // Keep crafting a short flat list — never a tree. Cap at 8; prefer Quartermaster order.
  if (recipes.length > 8) recipes = recipes.slice(0, 8);
  // Ensure a cooler recipe exists for the ch01 beat if Quartermaster didn't add one
  if (!recipes.some((r) => r.id === "cooler" || r.special === "cooler" || r.out?.id === "cooler")) {
    if (recipes.length < 8) {
      recipes.push({
        id: "cooler",
        out: { id: "cooler", n: 1 },
        in: { cloth: 1, wood: 1, scrap: 1 },
        set_flags: ["ch01_cooler_built"],
      });
    }
  }

  const weaponsRaw = files["weapons.json"] || idx.weapons || null;
  const weaponsById = {};
  if (weaponsRaw) {
    for (const key of ["melee", "ranged", "thrown"]) {
      for (const w of weaponsRaw[key] || []) if (w && w.id) weaponsById[w.id] = w;
    }
  }
  // Overlay Quartermaster weapon stats onto the item catalog (magazine, damage, fire_modes…).
  for (const [id, w] of Object.entries(weaponsById)) {
    const prev = items[id] || {};
    items[id] = {
      ...prev,
      ...w,
      name: prev.name || w.name || id,
      kind: prev.kind || (w.type === "melee" ? "melee" : w.type === "thrown" || w.type === "held_offhand" ? "throw" : "gun"),
      mag: w.magazine ?? prev.mag,
      dmg: w.damage ?? prev.dmg,
      ammo: w.ammo ?? prev.ammo,
    };
  }
  const weapons = weaponsById;
  const itemsFile = files["items.json"] || {};
  const carry = itemsFile.carry || { base_capacity_kg: 22, overweight_soft_kg: 22, overweight_hard_kg: 30, overweight_move_mult: 0.8 };
  const paperdoll = itemsFile.paperdoll || null;
  const startingLoadout = itemsFile.starting_loadout || null;
  const enemies = files["enemies.json"] || idx.enemies || null;
  const loot = files["loot.json"] || files["loot_tables.json"] || idx.loot || defaultLootTables();
  const survival = {
    warmthDrain: CFG.warmthDrain,
    hungerDrain: CFG.hungerDrain,
    radTick: CFG.radTick,
    staminaRegen: CFG.staminaRegen,
    staminaSprint: CFG.staminaSprint,
    ...(files["survival.json"] || files["survival_rates.json"] || idx.survival || {}),
  };

  const difficulty = files["difficulty.json"] || idx.difficulty || null;
  const difficultyId = difficulty?.default_mode || "tense_but_fair";
  const difficultyMode = (Array.isArray(difficulty?.modes) ? difficulty.modes.find((m) => m.id === difficultyId) : null)
    || { id: difficultyId, multipliers: {} };

  return { items, recipes, weapons, weaponsById, enemies, loot, survival, difficulty, difficultyMode, carry, paperdoll, startingLoadout, itemsFile, loadedFiles: found };
}

function rngFrom(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function randint(rng, pair) {
  if (Array.isArray(pair)) {
    const a = pair[0] ?? 0, b = pair[1] ?? a;
    return a + Math.floor(rng() * (b - a + 1));
  }
  return pair ?? 1;
}

function scaleQty(n, mult, rng) {
  if (!mult || mult === 1) return Math.max(1, n);
  const raw = n * mult;
  const base = Math.floor(raw);
  const extra = (rng() < (raw - base)) ? 1 : 0;
  return Math.max(1, base + extra);
}

/** Map story/hooks area ids onto systems loot areas when they disagree. */
export const AREA_ALIASES = {
  loc_ore_docks: ["loc_ore_docks", "loc_lift_bridge", "loc_harbor"],
};

export function resolveLootArea(loot, chapter, location) {
  const ch = String(chapter || "").replace(/_.*$/, "");
  const areas = (loot && loot.areas && (loot.areas[ch] || loot.areas[chapter])) || [];
  const ids = [location, ...(AREA_ALIASES[location] || [])].filter(Boolean);
  for (const id of ids) {
    const hit = areas.find((a) => a.location === id || a.id === id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Quartermaster roll_algorithm from systems/loot_tables.json.
 * guaranteed items are always added; empty_chance only applies to the random filler.
 */
export function rollContainer(containerId, location, chapter, guaranteed, systems, seed) {
  const loot = systems?.loot || {};
  const types = loot.container_types || {};
  const ctype = types[containerId] || types[containerId?.replace(/-/g, "_")] || null;
  const items = systems?.items || {};
  const catOf = (id) => (items[id] && items[id].category) || "material";
  const actMap = loot.acts || {};
  const ch = String(chapter || "ch01").replace(/_.*$/, "") || "ch01";
  let act = "blackout";
  for (const [name, list] of Object.entries(actMap)) {
    if (Array.isArray(list) && list.includes(ch)) { act = name; break; }
  }
  const actMod = (loot.act_modifiers && loot.act_modifiers[act]) || { empty_chance_add: 0, category_weight_mult: {} };
  const gates = loot.item_act_gate || {};
  const actOrder = Object.keys(actMap);
  const actUnlocked = (id) => {
    const need = gates[id];
    if (!need) return true;
    return actOrder.indexOf(act) >= actOrder.indexOf(need);
  };
  const area = resolveLootArea(loot, ch, location);
  const bias = area?.category_bias || {};
  const mul = systems?.difficultyMode?.multipliers || {};
  const rng = rngFrom(seed || `${ch}:${location}:${containerId}`);
  const out = {};
  const add = (id, n) => {
    id = aliasItem(id);
    if (n > 0) out[id] = (out[id] || 0) + n;
  };
  if (Array.isArray(guaranteed)) {
    for (const g of guaranteed) add(g.item || g.id, g.n || g.qty || 1);
  } else if (guaranteed && typeof guaranteed === "object") {
    for (const [id, n] of Object.entries(guaranteed)) add(id, n);
  }
  if (!ctype) return out;
  const emptyP = clamp((ctype.empty_chance || 0) + (actMod.empty_chance_add || 0) + (mul.loot_empty_add || 0), 0, 0.95);
  if (rng() < emptyP) return out;
  const n = randint(rng, ctype.rolls || [1, 1]);
  const entries = ctype.entries || [];
  for (let i = 0; i < n; i++) {
    const weights = entries.map((e) => {
      const id = e.item;
      if (!actUnlocked(id)) return 0;
      const cat = catOf(id);
      const itemMul = loot.item_act_weight_mult?.[id]?.[act] ?? 1;
      return (e.weight || 1) * (actMod.category_weight_mult?.[cat] ?? 1) * (bias[cat] ?? 1) * itemMul;
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) continue;
    let pick = rng() * sum;
    let entry = entries[0];
    for (let k = 0; k < entries.length; k++) {
      pick -= weights[k];
      if (pick <= 0) { entry = entries[k]; break; }
    }
    const cat = catOf(entry.item);
    let qMul = mul.loot_mult ?? 1;
    if (cat === "ammo") qMul = mul.ammo_mult ?? qMul;
    else if (cat === "med") qMul = mul.med_mult ?? qMul;
    else if (cat === "food" || cat === "water") qMul = mul.food_mult ?? qMul;
    if (cat === "quest") qMul = 1;
    add(entry.item, scaleQty(randint(rng, entry.qty || [1, 1]), qMul, rng));
  }
  return out;
}


/** Roll an enemy drop table (same algorithm as containers, including item_act_weight_mult). */
export function rollDrops(dropTable, location, chapter, systems, seed) {
  if (!dropTable) return {};
  const fake = { ...dropTable };
  // Reuse rollContainer by temporarily stuffing the table into loot.container_types.
  const loot = systems?.loot || {};
  const types = loot.container_types || (loot.container_types = {});
  const key = "__drop_" + (seed || "x");
  types[key] = fake;
  const out = rollContainer(key, location, chapter, null, systems, seed);
  delete types[key];
  return out;
}

export function getWeapon(systems, id) {
  return systems?.weapons?.[id] || systems?.weaponsById?.[id] || systems?.items?.[id] || {};
}

export function currentAct(systems, chapter) {
  const loot = systems?.loot || {};
  const actMap = loot.acts || {};
  const ch = String(chapter || "ch01").replace(/_.*$/, "") || "ch01";
  for (const [name, list] of Object.entries(actMap)) {
    if (Array.isArray(list) && list.includes(ch)) return name;
  }
  return "blackout";
}

function defaultLootTables() {
  return {
    dumpster: { cloth: [0, 3], scrap: [0, 2], wood: [0, 2], ration: [0, 1], cigarettes: [0, 1] },
    crate: { scrap: [1, 3], wire: [0, 2], cloth: [0, 1], ammo_shell: [0, 2] },
    fridge: { ration: [0, 2], insulin: [0, 1], bandage: [0, 1] },
    glovebox: { cigarettes: [0, 2], ammo_9mm: [0, 4], cloth: [0, 1] },
    body: { cloth: [0, 2], ammo_9mm: [0, 3], bandage: [0, 1], scrap: [0, 1] },
    locker: { cloth: [1, 2], ammo_shell: [0, 3], filter: [0, 1], scrap: [0, 2] },
    cabinet: { bandage: [0, 2], ration: [0, 1], cloth: [0, 2] },
  };
}

export function rollTable(table, rng = Math.random) {
  const out = {};
  if (!table) return out;
  for (const [id, spec] of Object.entries(table)) {
    let n = 0;
    if (Array.isArray(spec)) {
      const [a, b] = spec;
      n = a + Math.floor(rng() * (b - a + 1));
    } else if (typeof spec === "number") n = spec;
    else if (spec && typeof spec === "object") {
      const chance = spec.chance ?? 1;
      if (rng() > chance) continue;
      const a = spec.min ?? 0, b = spec.max ?? spec.n ?? 1;
      n = a + Math.floor(rng() * (b - a + 1));
    }
    if (n > 0) out[aliasItem(id)] = n;
  }
  return out;
}
