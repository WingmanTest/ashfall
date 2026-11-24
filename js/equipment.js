/** Equipment slots, paper-doll layer resolution, carry weight, insulation. */
export const GEAR_SLOTS = ["head", "face", "torso", "base", "hands", "legs", "feet", "wrap"];
export const WEAPON_SLOTS = ["main_hand", "off_hand"];
export const ALL_SLOTS = [...GEAR_SLOTS, ...WEAPON_SLOTS];
export const SLOT_LABELS = {
  head: "Head", face: "Face", torso: "Torso", base: "Base",
  hands: "Hands", legs: "Legs", feet: "Feet", wrap: "Wrap",
  main_hand: "Main", off_hand: "Off / Holster",
};
export const SLOT_COLORS = {
  head: "#8a2f2f", face: "#1a2228", torso: "#3e4958", base: "#6b625a",
  hands: "#8f5d40", legs: "#405366", feet: "#4a2c20", wrap: "#8c1f0a",
  main_hand: "#8d9395", off_hand: "#fcc45e",
};

export function itemSlot(def, id) {
  if (!def) return null;
  if (def.slot && GEAR_SLOTS.includes(def.slot)) return def.slot;
  if (def.category === "weapon" || def.kind === "gun" || def.kind === "melee" || def.type === "ranged" || def.type === "melee") return "main_hand";
  if (def.kind === "throw" || def.type === "thrown") return "main_hand";
  if (id === "flashlight" || def.paperdoll_layer?.startsWith("off_hand") || def.type === "held_offhand") return "off_hand";
  return def.slot || null;
}

export function layerName(def, id, slot) {
  if (def?.paperdoll_layer) return def.paperdoll_layer;
  return (slot || itemSlot(def, id) || "item") + "_" + id;
}

export function itemWeight(def) {
  return def?.weight_kg ?? def?.weight ?? 0;
}

export function emptyGear() {
  const g = {};
  for (const s of ALL_SLOTS) g[s] = null;
  return g;
}

/** Combined clothing insulation: 1 - Π(1 - r_i), cap 0.75. */
export function combinedInsulation(gear, items) {
  let prod = 1;
  for (const s of GEAR_SLOTS) {
    const piece = gear?.[s];
    if (!piece) continue;
    const def = items[piece.id] || {};
    const r = def.insulation || 0;
    prod *= (1 - r);
  }
  return Math.min(0.75, 1 - prod);
}

export function combinedWetResist(gear, items) {
  let m = 0;
  for (const s of GEAR_SLOTS) {
    const piece = gear?.[s];
    if (!piece) continue;
    m = Math.max(m, (items[piece.id] || {}).wet_resist || 0);
  }
  return m;
}

export function carryWeight(inv, gear, items) {
  let kg = 0;
  const worn = new Set();
  for (const s of ALL_SLOTS) {
    const piece = gear?.[s];
    if (piece?.id) { kg += itemWeight(items[piece.id]); worn.add(piece.id); }
  }
  for (const [id, n] of Object.entries(inv || {})) {
    if (!n || worn.has(id)) continue;
    kg += itemWeight(items[id]) * n;
  }
  return kg;
}

export function carryState(inv, gear, items, carry) {
  const kg = carryWeight(inv, gear, items);
  const soft = carry?.overweight_soft_kg ?? 22;
  const hard = carry?.overweight_hard_kg ?? 30;
  const moveMul = carry?.overweight_move_mult ?? 0.8;
  return { kg, soft, hard, moveMul, overSoft: kg > soft, overHard: kg >= hard };
}

export function canAddWeight(inv, gear, items, carry, id, n = 1) {
  const st = carryState(inv, gear, items, carry);
  const add = itemWeight(items[id]) * n;
  return st.kg + add <= st.hard + 1e-6;
}

/**
 * Resolve paper-doll layers from the items.json `paperdoll` block.
 * Face mask comes from the has_gas_mask flag (no lootable mask item).
 * Off-hand is flashlight-when-on or a held torch, hidden if main is two-handed.
 */
export function resolveDollLayers(player, flags, items, paperdoll) {
  const L = {};
  const gear = player.gear || {};
  for (const s of GEAR_SLOTS) {
    const piece = gear[s];
    if (piece?.id && items[piece.id]) L[s] = items[piece.id];
  }
  for (const f of (paperdoll?.flag_layers || [])) {
    if (flags?.[f.flag]) L[f.slot] = { paperdoll_layer: f.layer };
  }
  const main = items[player.equipped];
  if (main?.paperdoll_layer) L.main_hand = main;
  if (!main?.two_handed) {
    if (player.equipped === "torch" || player.torchHeld) L.off_hand = items.torch;
    else if (player.flashlight) L.off_hand = items.flashlight;
  } else {
    delete L.off_hand;
  }
  const order = paperdoll?.draw_order || ["base", "legs", "feet", "torso", "hands", "wrap", "face", "head", "main_hand", "off_hand"];
  const baseSrc = paperdoll?.base_body || "assets/paperdoll/base_body.png";
  const layers = [{ slot: "body", src: baseSrc, tint: null }];
  for (const s of order) {
    if (!L[s]?.paperdoll_layer) continue;
    layers.push({
      slot: s,
      src: `assets/paperdoll/${L[s].paperdoll_layer}.png`,
      tint: L[s].tint || null,
      id: L[s].id,
    });
  }
  return layers;
}

export function wearItem(player, inv, id, items, flags) {
  const def = items[id];
  if (!def) return { ok: false, msg: "Unknown item." };
  const slot = itemSlot(def, id);
  if (!slot) return { ok: false, msg: "Can't wear that." };
  if (slot === "face" && !flags?.has_gas_mask) return { ok: false, msg: "No mask yet." };
  if ((inv[id] || 0) <= 0 && player.gear?.[slot]?.id !== id) return { ok: false, msg: "You don't have that." };
  player.gear = player.gear || emptyGear();
  const prev = player.gear[slot];
  if (prev?.id && prev.id !== id) {
    inv[prev.id] = (inv[prev.id] || 0) + 1;
  }
  if (player.gear[slot]?.id !== id) {
    inv[id] = (inv[id] || 0) - 1;
    if (inv[id] <= 0) delete inv[id];
  }
  player.gear[slot] = { id, durability: def.durability ?? 100 };
  if (slot === "torso") player.coatOn = true;
  if (slot === "main_hand") {
    player.equipped = id;
    player.showWeapon?.();
  }
  return { ok: true, slot };
}

export function removeGear(player, inv, slot) {
  const piece = player.gear?.[slot];
  if (!piece) return false;
  inv[piece.id] = (inv[piece.id] || 0) + 1;
  player.gear[slot] = null;
  if (slot === "torso") player.coatOn = !!player.gear.torso;
  if (slot === "main_hand") {
    player.equipped = "knife";
    player.showWeapon?.();
  }
  return true;
}
