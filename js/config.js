export const CFG = {
  internalW: 180,
  internalH: 320,
  hudW: 360,
  hudH: 640,
  aspect: 9 / 16,
  saveKey: "ashfall.lakehead.v1",
  fov: 80,
  near: 0.08,
  far: 90,
  walk: 3.15,
  sprint: 4.85,
  lookSensDesk: 0.00205,
  lookSensTouch: 0.0034,
  eyeH: 1.62,
  gravity: 16,
  jump: 0,
  dayLenSec: 420,
  blizzardPeriod: 95,
  blizzardLen: 42,
  warmthDrain: 1.15,
  hungerDrain: 0.32,
  radTick: 0.55,
  staminaRegen: 18,
  staminaSprint: 22,
  maxEnemies: 6,
  targetFpsMobile: 30,
  // Refined pixel look. 1.5× Lumen's first-pass tiers (256/320/384).
  // Overridden at boot if render/INTEGRATION.md publishes new values.
  pixel: {
    look: "refined",
    // Heights from render/INTEGRATION.md (9:16 → 270×480 / 324×576 / 360×640).
    internalH: { low: 480, medium: 576, high: 640 },
    paletteSize: 64,
    dither: 0.032,
    grain: 0.018,
  },
  // HUD face is data, not a character. Swap these paths when the protagonist changes.
  portrait: {
    idle: "./assets/oga/faces/face_idle.png",
    hurt: "./assets/oga/faces/face_hurt.png",
  },
  paperdoll: {
    baseBody: "./assets/paperdoll/base_body.png",
  },
};



export const ITEMS = {
  scrap: { name: "Scrap metal", stack: 20, kind: "mat" },
  cloth: { name: "Cloth", stack: 20, kind: "mat" },
  wood: { name: "Dry wood", stack: 20, kind: "mat" },
  fuel: { name: "Fuel can", stack: 6, kind: "mat" },
  wire: { name: "Copper wire", stack: 12, kind: "mat" },
  filter: { name: "Air filter", stack: 6, kind: "gear" },
  mask_filter: { name: "Mask filter", stack: 6, kind: "gear" },
  gas_mask: { name: "Gas mask", stack: 1, kind: "wear" },
  bandage: { name: "Bandage", stack: 8, kind: "use", heal: 28 },
  ration: { name: "Ration tin", stack: 8, kind: "use", hunger: -35, warmth: 4 },
  insulin: { name: "Insulin vial", stack: 6, kind: "quest" },
  insulin_vial: { name: "Insulin vial", stack: 6, kind: "quest" },
  firewood: { name: "Firewood", stack: 20, kind: "mat" },
  cool_pack: { name: "Cool pack", stack: 2, kind: "quest" },
  radio_crystal: { name: "Radio crystal", stack: 1, kind: "quest" },
  start_battery: { name: "Start battery", stack: 1, kind: "quest" },
  ammo_shell: { name: "12ga shell", stack: 24, kind: "ammo" },
  ammo_9mm: { name: "9mm round", stack: 40, kind: "ammo" },
  molotov: { name: "Molotov", stack: 4, kind: "throw" },
  coat: { name: "Wool coat", stack: 1, kind: "wear", warmthResist: 0.42 },
  pipe: { name: "Lead pipe", stack: 1, kind: "melee", dmg: 22, range: 1.85 },
  knife: { name: "Shop knife", stack: 1, kind: "melee", dmg: 16, range: 1.55 },
  blaster: { name: "Makeshift 12ga", stack: 1, kind: "gun", dmg: 38, range: 18, mag: 4, ammo: "ammo_shell" },
  pistol: { name: "Service 9mm", stack: 1, kind: "gun", dmg: 18, range: 22, mag: 8, ammo: "ammo_9mm" },
  note: { name: "Torn note", stack: 20, kind: "note" },
};

export const RECIPES = [
  { id: "bandage", out: { id: "bandage", n: 1 }, in: { cloth: 2 } },
  { id: "molotov", out: { id: "molotov", n: 1 }, in: { fuel: 1, cloth: 1 } },
  { id: "coat", out: { id: "coat", n: 1 }, in: { cloth: 4 } },
  { id: "pipe", out: { id: "pipe", n: 1 }, in: { scrap: 3 } },
  { id: "filter", out: { id: "filter", n: 1 }, in: { cloth: 2, scrap: 1 } },
  { id: "campfire_kit", out: { id: "wood", n: 0 }, in: { wood: 3, scrap: 1 }, special: "campfire" },
];

export const LOCATIONS = {
  loc_east_end:        { name: "East End", x: 0, z: 6, safe: true },
  loc_belknap_pharmacy:{ name: "Belknap Pharmacy", x: -7.2, z: -18, safe: false },
  loc_blatnik_bridge:  { name: "Blatnik checkpoint", x: 0, z: -28, safe: false },
  loc_lakehead_memorial:{ name: "Lakehead Memorial", x: -7.0, z: -8, safe: false },
  loc_decc_ration:     { name: "DECC registry", x: 6.4, z: -44, safe: false },
  loc_lou_shack:       { name: "Lou's shack", x: 7.4, z: -38, safe: true },
  loc_hwy53_blockade:  { name: "Hwy 53 blockade", x: 0, z: -58, safe: false },
  loc_thomson_dam:     { name: "Thomson Dam", x: 0, z: -82, safe: false },
  loc_ore_docks:       { name: "Ore docks", x: 8, z: -68, safe: false },
  loc_proctor_yard:    { name: "Proctor yard", x: -8, z: -48, safe: false },
  loc_lift_bridge:     { name: "Lift bridge", x: 0, z: -72, safe: false },
  loc_jay_cooke:       { name: "Jay Cooke", x: 0, z: -90, safe: false },
  river_ice:           { name: "River ice", x: 0, z: -72, safe: false, r: 16 },
};

export const WEAPONS_ORDER = ["knife", "pipe", "baseball_bat", "crowbar", "fire_axe", "pistol", "blaster", "pump_shotgun", "deer_rifle", "ar15", "service_rifle", "molotov", "flare", "torch"];
