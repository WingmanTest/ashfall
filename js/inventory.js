import { ITEMS, RECIPES } from "./config.js?v=r16.1";
import { aliasItem } from "./systems.js?v=r16.1";

export function emptyInv() {
  return { knife: 1, cloth: 2, wood: 2, ration: 1 };
}

export function addItem(inv, id, n = 1) {
  id = aliasItem(id);
  const max = (ITEMS[id] && ITEMS[id].stack) || 20;
  inv[id] = Math.min(max, (inv[id] || 0) + n);
  return true;
}

export function takeItem(inv, id, n = 1) {
  id = aliasItem(id);
  if ((inv[id] || 0) < n) return false;
  inv[id] -= n;
  if (inv[id] <= 0) delete inv[id];
  return true;
}

export function hasItems(inv, need) {
  for (const [id, n] of Object.entries(need)) if ((inv[aliasItem(id)] || 0) < n) return false;
  return true;
}

export function craft(inv, recipe, world, player) {
  const needStation = recipe.requires === "near_campfire" || recipe.requires === "campfire";
  if (needStation) {
    const near = (world.inFire && world.inFire(player.x, player.z))
      || (world.fires || []).some((f) => f.on && Math.hypot(player.x - f.x, player.z - f.z) < 3.6);
    if (!near) return { ok: false, msg: "Need a campfire." };
  }
  if (!hasItems(inv, recipe.in)) return { ok: false, msg: "Missing parts." };
  for (const [id, n] of Object.entries(recipe.in)) takeItem(inv, id, n);
  if (recipe.special === "campfire") {
    world.addCampfire(world.scene, player.x + Math.sin(player.yaw) * -1.4, player.z + Math.cos(player.yaw) * -1.4);
    return { ok: true, msg: "Campfire lit." };
  }
  if (recipe.out && recipe.out.n) addItem(inv, recipe.out.id, recipe.out.n);
  return { ok: true, msg: "Made " + (ITEMS[recipe.out.id]?.name || recipe.id) };
}

export function mergeLoot(inv, items) {
  const got = [];
  for (const [id, n] of Object.entries(items)) {
    if (!n) continue;
    addItem(inv, id, n);
    got.push((ITEMS[id]?.name || id) + (n > 1 ? " ×" + n : ""));
  }
  return got;
}

export function ammoCount(inv, ammoId) {
  return inv[ammoId] || 0;
}
