// Cartographer chapter loader. Builds geometry from levels/*.json (do not edit those files).
import * as THREE from "three";
import { CFG } from "./config.js?v=r15.2";
import { fitHeight, makePerson, makeDog } from "./world.js?v=r15.2";
import { evalCondition, applyEffects, setFlag } from "./story.js?v=r15.2";
import { rollContainer, aliasItem } from "./systems.js?v=r15.2";
import { addItem, takeItem, hasItems } from "./inventory.js?v=r15.2";
import { pbrMat, boxMesh, snowCap, addFacadeDetails, greedyRects, rectWorld, stampBuildings, instanceSmallBoxes } from "./buildings.js?v=r15.2";
import { getModel, fitToGround, getNpcModel, resolveNpcModelId, MODEL_CATALOG } from "./models3d.js?v=r15.2";
import { coverBuildingRoofs, extractShingleMaterial, fallbackShingleMat } from "./roofs.js?v=r15.2";
import { startTracking } from "./companionCmd.js?v=r15.2";
import { bindNpc, disposeMixer } from "./npcWander.js?v=r15.2";
import {
  loadGroundOverlay, floorSkipSet, decorateFloorMaterial,
  applyGroundDressing, tickGroundDressing, replacesSagebrush,
} from "./groundDressing.js?v=r15.2";

const SNOW_HEX = 0xeef2f6;
function stripSnow(obj) {
  obj.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === SNOW_HEX) o.visible = false; });
  return obj;
}
/** Build one InstancedMesh per GLB primitive (few draw calls for many copies). */
function instanceGLB(src, mats) {
  const out = [];
  src.updateMatrixWorld(true);
  src.traverse((o) => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, mats.length);
    const tmp = new THREE.Matrix4();
    mats.forEach((m, i) => { tmp.multiplyMatrices(m, o.matrixWorld); im.setMatrixAt(i, tmp); });
    im.instanceMatrix.needsUpdate = true;
    im.userData.sharedAsset = true;
    im.castShadow = false; im.receiveShadow = true;
    im.frustumCulled = false;
    out.push(im);
  });
  return out;
}

function cleanLabel(s) {
  return String(s || "").replace(/\s*\(\s*filler\s*\)/gi, "").replace(/\s{2,}/g, " ").trim();
}


export function inShape(shape, x, z) {
  if (!shape) return false;
  if (shape.type === "rect" || (shape.x0 != null && shape.z0 != null)) {
    return x >= shape.x0 && x <= shape.x1 && z >= shape.z0 && z <= shape.z1;
  }
  const r = shape.r ?? shape.radius ?? 0;
  const dx = x - (shape.x ?? 0), dz = z - (shape.z ?? 0);
  return dx * dx + dz * dz <= r * r;
}

export function evalWhen(when, ctx) {
  if (when == null || (Array.isArray(when) && !when.length)) return true;
  return evalCondition(when, ctx);
}

function stdMat(pbr, color = 0x8899aa) {
  if (!pbr) return new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mat = new THREE.MeshStandardMaterial({
    map: pbr.diff || null, roughness: 0.88, color,
  });
  if (pbr.nor) mat.normalMap = pbr.nor;
  if (pbr.rough) mat.roughnessMap = pbr.rough;
  return mat;
}


function isBuildingAsset(asset) {
  const a = String(asset || "").toLowerCase();
  return /building[-_/]/.test(a) || /\/building/.test(a);
}

function assetKind(asset) {
  const a = String(asset || "").toLowerCase();
  if (isBuildingAsset(a)) return "building";
  if (/water-tower|watertower/.test(a)) return "tower";
  if (/chimney/.test(a)) return "chimney";
  if (/electricity-pole|utility-pole/.test(a)) return "pole";
  if (/traffic-light|light-square|light-post/.test(a)) return "light";
  if (/road-sign|sign-/.test(a)) return "sign";
  if (/dumpster/.test(a)) return "dumpster";
  if (/barrier/.test(a)) return "barrier";
  if (/sedan|car|truck|vehicle/.test(a)) return "car";
  return "prop";
}

/** Max visual XZ size and tight collider half-extents, by kind. */
function tightFootprint(kind) {
  switch (kind) {
    case "building": return { maxW: 10, maxD: 10, colW: 0, colD: 0 };
    case "tower": return { maxW: 3.2, maxD: 3.2, colW: 1.15, colD: 1.15 };
    case "chimney": return { maxW: 2.2, maxD: 2.2, colW: 0, colD: 0 };
    case "pole": return { maxW: 0.65, maxD: 0.65, colW: 0.28, colD: 0.28 };
    case "light": return { maxW: 0.8, maxD: 0.8, colW: 0.3, colD: 0.3 };
    case "sign": return { maxW: 0.65, maxD: 0.65, colW: 0.22, colD: 0.22 };
    case "dumpster": return { maxW: 1.7, maxD: 1.2, colW: 0.8, colD: 0.55 };
    case "barrier": return { maxW: 1.9, maxD: 0.55, colW: 0.9, colD: 0.25 };
    case "car": return { maxW: 2.4, maxD: 5.4, colW: 1.05, colD: 2.3 };
    default: return { maxW: 1.6, maxD: 1.6, colW: 0.5, colD: 0.5 };
  }
}

// ---------- r8: loot containers ARE the props (no generic crate beside a dumpster) ----------
const _pm = new Map();
function pmat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!_pm.has(key)) _pm.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
  return _pm.get(key);
}
function part(g, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** Which world prop a loot container represents. */
export function lootPropKind(l) {
  const lab = String(l.label || "").toLowerCase();
  const c = String(l.container || "").toLowerCase();
  if (/trash|garbage|\bbin\b|bus shelter/.test(lab)) return "trashcan";
  if (c === "dumpster" || /dumpster/.test(lab)) return "dumpster";
  if (c === "car_trunk" || /\bcar\b|trunk|sedan|truck/.test(lab)) return "car";
  if (/drum|barrel|diesel/.test(lab)) return "barrel";
  if (c === "medicine_cabinet") return "medcabinet";
  if (c === "kitchen_cabinet") return /woodpile/.test(lab) ? "woodpile" : "cabinet";
  if (c === "locker") return /crate/.test(lab) ? "crate" : "locker";
  if (c === "wardrobe") return /box|garage/.test(lab) ? "crate" : "wardrobe";
  if (c === "toolbox") return "toolbox";
  if (c === "woodpile") return "woodpile";
  if (c === "corpse" || c === "body") return "corpse";
  if (c === "military_crate") return "milcrate";
  if (c === "supply_cache") return /boots|pack|bag/.test(lab) ? "corpse" : "crate";
  return "crate";
}

/** Recognisable low-poly prop for a loot spot that has no decorative prop nearby. */
export function makeLootProp(kind) {
  const g = new THREE.Group();
  g.userData.kind = "loot_" + kind;
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const C = (rt, rb, h, n = 10) => new THREE.CylinderGeometry(rt, rb, h, n);
  switch (kind) {
    case "trashcan": {
      const body = pmat(0x5d6a62, { metalness: 0.35, roughness: 0.6 });
      part(g, C(0.3, 0.26, 0.82, 12), body, 0, 0.41, 0);
      for (const y of [0.2, 0.62]) part(g, C(0.305, 0.305, 0.04, 12), pmat(0x48534c, { metalness: 0.4 }), 0, y, 0);
      part(g, C(0.33, 0.33, 0.06, 12), pmat(0x6b7770, { metalness: 0.35 }), 0, 0.85, 0);
      part(g, B(0.16, 0.05, 0.04), pmat(0x3a403c), 0, 0.9, 0);
      part(g, C(0.33, 0.33, 0.012, 12), pmat(0xeef2f6), 0, 0.885, 0); // snow
      break;
    }
    case "dumpster": {
      const body = pmat(0x2f5a3a, { metalness: 0.3, roughness: 0.7 });
      part(g, B(1.6, 1.0, 1.05), body, 0, 0.55, 0);
      const lid = part(g, B(1.66, 0.07, 1.12), pmat(0x1f2a22), 0, 1.09, -0.02);
      lid.rotation.x = -0.06;
      for (const x of [-0.65, 0.65]) part(g, C(0.07, 0.07, 0.08, 8), pmat(0x111111), x, 0.05, 0.42);
      part(g, B(1.68, 0.06, 1.14), pmat(0xeef2f6), 0, 1.15, -0.02);
      break;
    }
    case "car": {
      const paint = pmat(0x6b2e24, { metalness: 0.3, roughness: 0.65 });
      part(g, B(1.8, 0.62, 4.2), paint, 0, 0.6, 0);
      part(g, B(1.6, 0.55, 2.1), paint, 0, 1.18, -0.2);
      part(g, B(1.62, 0.42, 1.9), pmat(0x1a2228, { roughness: 0.25, metalness: 0.2 }), 0, 1.2, -0.2);
      const trunk = part(g, B(1.7, 0.08, 1.0), pmat(0x4a2018, { metalness: 0.3 }), 0, 0.95, 1.6);
      trunk.rotation.x = -0.35;
      for (const [x, z] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) {
        const w = part(g, C(0.33, 0.33, 0.22, 10), pmat(0x141414), x, 0.33, z);
        w.rotation.z = Math.PI / 2;
      }
      part(g, B(1.84, 0.08, 4.0), pmat(0xeef2f6), 0, 1.47, -0.2).scale.set(0.85, 1, 0.5);
      break;
    }
    case "barrel": {
      part(g, C(0.3, 0.3, 0.9, 12), pmat(0x2a4a7a, { metalness: 0.4, roughness: 0.55 }), 0, 0.45, 0);
      for (const y of [0.25, 0.65]) part(g, C(0.31, 0.31, 0.04, 12), pmat(0x223a60), 0, y, 0);
      break;
    }
    case "medcabinet": {
      part(g, B(0.8, 1.5, 0.42), pmat(0xd8dcd8, { roughness: 0.5 }), 0, 0.75, 0);
      part(g, B(0.02, 1.4, 0.43), pmat(0x9aa0a0), 0, 0.75, 0.005);
      part(g, B(0.22, 0.06, 0.01), pmat(0xb02020), 0, 1.2, 0.215);
      part(g, B(0.06, 0.22, 0.01), pmat(0xb02020), 0, 1.2, 0.215);
      break;
    }
    case "cabinet": {
      part(g, B(1.1, 0.9, 0.55), pmat(0x6a4a30), 0, 0.45, 0);
      part(g, B(1.16, 0.05, 0.6), pmat(0x8a8478), 0, 0.92, 0);
      part(g, B(0.02, 0.8, 0.56), pmat(0x3a2818), 0, 0.45, 0.005);
      for (const x of [-0.08, 0.08]) part(g, B(0.03, 0.12, 0.03), pmat(0xb0a890, { metalness: 0.6 }), x, 0.62, 0.29);
      break;
    }
    case "locker": {
      const steel = pmat(0x4a5a6a, { metalness: 0.45, roughness: 0.55 });
      part(g, B(0.62, 1.9, 0.52), steel, 0, 0.95, 0);
      for (let i = 0; i < 3; i++) part(g, B(0.36, 0.03, 0.01), pmat(0x2a343e), 0, 1.65 - i * 0.06, 0.262);
      part(g, B(0.04, 0.16, 0.03), pmat(0xc0c0c0, { metalness: 0.7 }), 0.22, 1.0, 0.27);
      break;
    }
    case "wardrobe": {
      part(g, B(1.05, 1.95, 0.58), pmat(0x4a3424), 0, 0.975, 0);
      part(g, B(0.02, 1.8, 0.59), pmat(0x2a1c12), 0, 0.975, 0.005);
      for (const x of [-0.07, 0.07]) part(g, B(0.03, 0.18, 0.03), pmat(0xb0a070, { metalness: 0.6 }), x, 1.0, 0.31);
      break;
    }
    case "toolbox": {
      part(g, B(1.3, 0.08, 0.65), pmat(0x6a5038), 0, 0.86, 0);
      for (const [x, z] of [[-0.58, -0.26], [0.58, -0.26], [-0.58, 0.26], [0.58, 0.26]]) part(g, B(0.07, 0.82, 0.07), pmat(0x4a3828), x, 0.41, z);
      part(g, B(0.62, 0.28, 0.3), pmat(0xa82a20, { metalness: 0.35, roughness: 0.5 }), 0.1, 1.04, 0);
      part(g, B(0.3, 0.04, 0.04), pmat(0x222222), 0.1, 1.22, 0);
      break;
    }
    case "woodpile": {
      const wood = pmat(0x6a4a2c), end = pmat(0xa07a50);
      let i = 0;
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
        const x = (k - (3 - row) / 2) * 0.24, y = 0.12 + row * 0.21;
        const log = part(g, C(0.11, 0.11, 1.1, 7), i++ % 2 ? wood : end, x, y, 0);
        log.rotation.x = Math.PI / 2;
      }
      part(g, B(1.2, 0.1, 0.9), pmat(0x7a6040), 0.15, 0.05, 0.6).rotation.y = 0.3;
      break;
    }
    case "corpse": {
      const cloth = pmat(0x2e3238);
      part(g, B(0.5, 0.2, 1.1), cloth, 0, 0.11, 0);
      part(g, new THREE.SphereGeometry(0.15, 8, 6), pmat(0xb8a898), 0, 0.15, -0.68);
      part(g, B(0.38, 0.28, 0.32), pmat(0x4a5a3a), 0.38, 0.14, 0.2);
      part(g, B(0.52, 0.04, 1.0), pmat(0xeef2f6), 0, 0.23, 0.08).scale.set(0.9, 1, 0.6);
      break;
    }
    case "milcrate": {
      part(g, B(1.0, 0.55, 0.6), pmat(0x4a5230, { roughness: 0.9 }), 0, 0.28, 0);
      part(g, B(1.02, 0.08, 0.62), pmat(0x353b22), 0, 0.5, 0);
      part(g, B(0.5, 0.1, 0.01), pmat(0xd8d0a0), 0, 0.3, 0.305);
      break;
    }
    default: {
      part(g, B(0.7, 0.55, 0.7), pmat(0x5a4a32), 0, 0.28, 0);
      part(g, B(0.72, 0.06, 0.72), pmat(0x3a2e20), 0, 0.42, 0);
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 1.6, 5),
    new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 })
  );
  trunk.position.y = 0.8;
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x2e4a34, roughness: 0.95 })
  );
  crown.position.y = 2.3;
  trunk.castShadow = crown.castShadow = false;
  g.add(trunk, crown);
  return g;
}

export class LevelRuntime {
  constructor({ world, enemies, scene, systems, story, flags, inv, maxEnemies }) {
    this.world = world;
    this.enemies = enemies;
    this.scene = scene;
    this.systems = systems;
    this.story = story;
    this.flags = flags;
    this.inv = inv;
    this.maxEnemies = maxEnemies || CFG.maxEnemies || 6;
    this.L = null;
    this.live = new Set();
    this.zoneOf = {};
    this.kindOf = {};
    this.inside = new Set();
    this.fired = new Set();
    this.gates = [];
    this.covered = [];
    this.blindSpots = [];
    this.safeZones = [];
    this.spawn = null;
    this.group = null;
  }

  bind(game) {
    this.game = game;
    this.flags = game.flags;
    this.inv = game.inv;
  }

  ctx() {
    const g = this.game;
    return {
      flags: (g && g.flags) || this.flags || {},
      inventory: (g && g.inv) || this.inv || {},
      items: (g && g.inv) || this.inv || {},
      trust: (g && g.trust) || {},
      chapter: (g && g.flags && g.flags.chapter) || (this.L && this.L.chapter),
    };
  }

  async load(chapterId, { fired, onProgress } = {}) {
    const prog = (pct, label) => { try { onProgress?.(pct, label); } catch {} };
    const levels = this.game?.levels || this.levels;
    const L = (levels?.perChapter && (levels.perChapter[chapterId] || levels.perChapter[chapterId?.replace(/_.*$/, "")]))
      || Object.values(levels?.perChapter || {}).find((x) => x.chapter === chapterId || x.id === chapterId || x.id?.startsWith(chapterId));
    if (!L || !L.grid) return null;
    this.L = L;
    this.fired = fired || this.fired || new Set();
    this.inside = new Set();
    this.live = new Set();
    this.zoneOf = {};
    this.gates = [];
    this.covered = [];
    this.blindSpots = (L.stealth && L.stealth.blindSpots) || [];
    this.safeZones = L.safeZones || [];

    const enemiesSrc = this.systems?.enemies;
    const list = enemiesSrc?.enemies || (Array.isArray(enemiesSrc) ? enemiesSrc : []);
    this.kindOf = Object.fromEntries(list.map((e) => [e.id || e.type, e.code_kind || e.kind || e.id]));

    for (const z of (L.encounters || [])) {
      for (const g of (z.groups || [])) this.zoneOf[g.group] = { zone: z, wave: g.wave || 1 };
    }
    for (const e of (L.spawns?.enemies || [])) {
      e._ent = null;
      if (e.activate === "load") this.live.add(e.group);
    }

    this.world.clearLevel?.();
    this.world._levelLoaded = true;
    this.group = this.world.levelGroup;
    prog(42, "Terrain");
    await this._buildGrid(L);
    prog(55, "Props");
    await this._placeProps(L);
    this._placeFires(L);
    prog(62, "Loot");
    await this._placeLoot(L);
    prog(68, "People");
    await this._placeNpcs(L);
    this._placeInteractives(L);
    this._applyLocations(L);
    this._applyEnvironment(L);
    prog(78, "Ready");

    const check = (w) => evalWhen(w, this.ctx());
    this.spawn = (L.spawns?.player || []).find((s) => check(s.when)) || (L.spawns?.player || [])[0] || { x: 0, z: 6, rotY: 0 };
    this.world.tileQuery = (x, z) => this.tileAt(x, z);
    this.world.blocksAirLOS = (x, z) => this.blocksAirLOS(x, z);
    this.world.inBlindSpot = (x, z) => this.blindSpots.some((b) => inShape(b.shape || b, x, z));
    this.world.safeZoneAt = (x, z) => this.safeZoneAt(x, z);
    return this;
  }

  tileAt(x, z) {
    const g = this.L?.grid;
    if (!g) return null;
    const cs = g.cellSize || 2, o = g.origin || { x: 0, z: 0 };
    const c = Math.floor((x - o.x) / cs);
    const r = Math.floor((z - o.z) / cs);
    if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return null;
    const ch = g.tiles[r][c];
    return { ch, c, r, def: g.legend[ch], x: o.x + (c + 0.5) * cs, z: o.z + (r + 0.5) * cs };
  }

  blocksAirLOS(x, z) {
    if (this.covered.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)) return true;
    const t = this.tileAt(x, z);
    return !!(t && t.def && (t.def.blocksAirLOS || t.def.roof || t.def.name === "covered_floor" || t.def.name === "interior_floor"));
  }

  safeZoneAt(x, z) {
    const check = (w) => evalWhen(w, this.ctx());
    for (const s of this.safeZones) {
      if (!check(s.when) && s.when) continue;
      if (Math.hypot(x - s.x, z - s.z) <= (s.r || 3)) return s;
    }
    return null;
  }

  async _buildGrid(L) {
    const { cellSize: cs, cols, rows, origin: o, legend, tiles } = L.grid;
    const world = this.world;
    const scene = this.group;
    world.bounds = { minX: o.x, maxX: o.x + cols * cs, minZ: o.z, maxZ: o.z + rows * cs };
    this._cores = [];
    world.colliders = world.colliders || [];
    world.colliders.length = 0;

    const pbrCache = world.pbrCache || {};
    const getPbr = async (name) => {
      if (!name) return null;
      if (pbrCache[name]) return pbrCache[name];
      if (!world.pbr) return null;
      try { pbrCache[name] = await world.pbr(name); } catch { pbrCache[name] = null; }
      return pbrCache[name];
    };
    world.pbrCache = pbrCache;

    this._ground = await loadGroundOverlay(L.id);
    const skipFloor = floorSkipSet(this._ground);

    // Floors grouped by legend char
    const floors = new Map();
    const specials = [];
    for (let r = 0; r < rows; r++) {
      const row = tiles[r];
      for (let c = 0; c < cols; c++) {
        const ch = row[c];
        const t = legend[ch] || {};
        const x = o.x + (c + 0.5) * cs;
        const z = o.z + (r + 0.5) * cs;
        if (t.walkable && !t.solid && !skipFloor.has(c + "," + r)) {
          if (!floors.has(ch)) floors.set(ch, []);
          floors.get(ch).push({ x, z, t, ch, c, r });
        }
        if (ch === "T") specials.push({ kind: "tree", x, z });
        if (ch === "~" || ch === "_") {
          world.colliders.push({ minX: x - cs / 2, maxX: x + cs / 2, minZ: z - cs / 2, maxZ: z + cs / 2, src: ch === "~" ? "water" : "chasm" });
          specials.push({ kind: ch === "~" ? "water" : "chasm", x, z, t });
        }
        if (t.roof || t.blocksAirLOS || t.name === "covered_floor" || t.name === "interior_floor") {
          this.covered.push({ minX: x - cs / 2, maxX: x + cs / 2, minZ: z - cs / 2, maxZ: z + cs / 2 });
        }
      }
    }

    for (const [ch, cells] of floors) {
      const t = legend[ch] || {};
      const tex = await getPbr(t.floorTex);
      const color = t.ice ? 0xb9d3e3 : (t.preview ? parseInt(String(t.preview).replace("#", ""), 16) : 0xd9e1e8);
      const mat = stdMat(tex, color);
      decorateFloorMaterial(ch, mat, this._ground, cs);
      const geo = new THREE.PlaneGeometry(cs, cs);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
      mesh.receiveShadow = true;
      const m = new THREE.Matrix4();
      cells.forEach((cell, i) => {
        m.makeTranslation(cell.x, t.ice ? 0.01 : (ch === "=" || ch === "r" ? 0.015 : 0), cell.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      world.farProps.push(mesh);
      // r13: per-cell upward-facing roof planes were culled from inside (sky showed
      // through) and sat flush with wall tops, so buildings looked open-topped.
      // Merged pitched / parapet roofs are stamped in coverBuildingRoofs().
    }

    // Colliders: merge horizontal runs. Visuals are dressed separately (Kenney / UV-mapped PBR).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; ) {
        const ch = tiles[r][c];
        const t = legend[ch] || {};
        if (!t.solid) { c++; continue; }
        let c2 = c;
        while (c2 + 1 < cols && tiles[r][c2 + 1] === ch) c2++;
        const minX = o.x + c * cs, maxX = o.x + (c2 + 1) * cs, minZ = o.z + r * cs, maxZ = minZ + cs;
        const src = ch === "B" ? "building_mass" : ch === "H" ? "boundary" : ch === "c" ? "cover" : ch === "#" ? "wall" : ch === "G" ? "gate" : "solid";
        const col = { minX, maxX, minZ, maxZ, gate: ch === "G", src, ch };
        world.colliders.push(col);
        if (ch === "G") this.gates.push({ col, mesh: null, flag: null, minX, maxX, minZ, maxZ });
        c = c2 + 1;
      }
    }

    const brick = await getPbr("red_brick");
    const concrete = await getPbr("dirty_concrete");
    const corr = await getPbr("rusty_corrugated_iron");
    const rust = await getPbr("rust_coarse_01") || await getPbr("rusty_metal");
    const snowP = await getPbr("snow_02");
    const brickMat = pbrMat(brick, 0xf6e4d4);
    const concMat = pbrMat(concrete, 0xe8e0d4);
    const corrMat = pbrMat(corr, 0xffffff);
    const rustMat = pbrMat(rust, 0xffffff);
    // Nevada Rev 2: snow caps only where the level actually has snow cover (Ch 1–7 are dry).
    this._snowy = (Number(L.environment?.snowCover) || 0) > 0;
    const snowMat = this._snowy ? pbrMat(snowP, 0xf4f7fb, { roughness: 0.92 }) : null;
    const facadeMats = { window: null, board: rustMat, door: pbrMat(concrete, 0x3a322c), frame: rustMat };
    facadeMats.window = new THREE.MeshStandardMaterial({
      color: 0x1a2228, roughness: 0.22, metalness: 0.18, emissive: 0x2a1e10, emissiveIntensity: 0.15,
    });

    // Building lots: Kenney City Kit models, one (or a few) per footprint.
    const lots = greedyRects(tiles, legend, (ch, t) => ch === "B" || t.name === "building_mass" || t.massOnly);
    this._lots = lots.map((rec) => rectWorld(rec, o, cs));
    const buildingProps = (L.props || []).filter((p) => isBuildingAsset(p.asset));
    this._buildingProps = buildingProps;
    this._coreMatEarly = concMat;
    const chNum = parseInt(String(L.chapter || L.id || "").replace(/\D/g, ""), 10) || 0;
    const houseLots = new Set();
    if ([1, 2, 3, 6, 8].includes(chNum)) {
      const houses = (L.buildings || []).filter((b) => b.kind === "mass" && /house/i.test(b.label || "") && b.rect);
      let budget = 4; // Lumen: 13-material GLB, keep on-screen instances modest
      for (const rec of lots) {
        if (budget <= 0) break;
        const box = rectWorld(rec, o, cs);
        const hit = houses.find((b) => box.cx > Math.min(b.rect.x0, b.rect.x1) && box.cx < Math.max(b.rect.x0, b.rect.x1) && box.cz > Math.min(b.rect.z0, b.rect.z1) && box.cz < Math.max(b.rect.z0, b.rect.z1));
        if (!hit) continue;
        const n = Math.max(1, Math.min(budget, Math.round(Math.max(box.w, box.d) / 10)));
        houseLots.add(rec); rec._houses = n; budget -= n;
      }
    }
    this._tractHouses = 0;
    this._tractBoxes = [];
    this._lotRoofs = [];
    this._roofMeshes = [];
    for (const rec of lots) {
      const box = rectWorld(rec, o, cs);
      if (houseLots.has(rec) && await this._placeTractHouses(scene, box, rec._houses, L)) {
        this._tractBoxes.push({ ...box });
        this._lotRoofs.push({ box, skip: true, source: "tract" });
        continue;
      }
      const reserved = buildingProps.some((p) => p.x >= box.minX - 0.4 && p.x <= box.maxX + 0.4 && p.z >= box.minZ - 0.4 && p.z <= box.maxZ + 0.4);
      const ok = await stampBuildings(rec, world, scene, o, cs, snowMat, {
        skip: () => reserved,
      });
      const h = 7;
      if (!ok) {
        // Procedural shell: solid box + its own windows/doors flush on the walls.
        const shell = boxMesh(box.w, h, box.d, brickMat, 2);
        shell.position.set(box.cx, h / 2, box.cz);
        shell.userData.kind = "building_shell";
        scene.add(shell);
        addFacadeDetails(scene, { ...box, h, y0: 0 }, facadeMats);
        this._lotRoofs.push({ box, y: h, source: "shell", house: houseLots.has(rec) });
      } else if (ok !== "reserved") {
        // r8: Kenney GLB lot. The kit model carries its own windows/doors, so never
        // stamp procedural facades on the lot edge (they floated in midair in r7).
        // A solid inset core fills any gap/setback in the GLB so there is always a wall.
        this._addLotCore(scene, box, 5.6, concMat);
        this._lotRoofs.push({ box, y: 7.2, source: "kenney", house: houseLots.has(rec) });
      }
      // ok === "reserved": a level-authored building prop fills this lot in _placeProps.
    }

    this._coreMat = concMat;
    // Thin walls, fences, cover, debris, gates — UV-mapped PBR + snow caps + window variation.
    const wallRects = greedyRects(tiles, legend, (ch, t) => {
      if (!t.solid) return false;
      if (ch === "B" || t.name === "building_mass" || t.massOnly) return false;
      return true;
    });
    for (const rec of wallRects) {
      const t = legend[rec.ch] || {};
      const box = rectWorld(rec, o, cs);
      const h = t.height || 4;
      let mat = brickMat, tile = 2;
      if (t.wallTex === "dirty_concrete" || rec.ch === "H") { mat = concMat; tile = 3; }
      else if (t.wallTex === "rusty_corrugated_iron" || rec.ch === "f") { mat = corrMat; tile = 1.4; }
      else if (t.wallTex === "rust_coarse_01" || rec.ch === "x" || rec.ch === "c") { mat = rustMat; tile = 1.6; }
      else if (t.wallTex === "red_brick") { mat = brickMat; tile = 2; }
      else {
        const tex = await getPbr(t.wallTex);
        mat = pbrMat(tex, 0xffffff);
      }
      const mesh = boxMesh(box.w, h, box.d, mat, tile);
      mesh.position.set(box.cx, h / 2, box.cz);
      scene.add(mesh);
      if (h < 2.2) world.farProps.push(mesh);
      if (h >= 2.4 && rec.ch !== "f") addFacadeDetails(scene, { ...box, h, y0: 0 }, facadeMats);
      if (snowMat && h >= 1.2 && rec.ch !== "G") {
        const cap = snowCap(box.w, box.d, h, snowMat, rec.ch === "H" ? 0.14 : 0.08);
        cap.position.x = box.cx;
        cap.position.z = box.cz;
        scene.add(cap);
      }
      if (rec.ch === "G") {
        const g = this.gates.find((x) => Math.abs(x.minX - box.minX) < 0.1 && Math.abs(x.minZ - box.minZ) < 0.1)
          || this.gates.find((x) => x.mesh == null && x.minX < box.cx && x.maxX > box.cx);
        if (g) g.mesh = mesh;
      }
    }

    for (const s of specials) {
      if (s.kind === "tree") {
        const tree = makeTree();
        tree.position.set(s.x, 0, s.z);
        tree.rotation.y = (s.x * 5 + s.z) % 3;
        scene.add(tree);
        world.farProps.push(tree);
        // r15.2: no leftover vegetation colliders (trees are decoration).
      } else if (s.kind === "water") {
        const w = new THREE.Mesh(
          new THREE.PlaneGeometry(cs, cs),
          new THREE.MeshStandardMaterial({ color: 0x2f4a63, roughness: 0.3, metalness: 0.2 })
        );
        w.rotation.x = -Math.PI / 2;
        w.position.set(s.x, -0.2, s.z);
        scene.add(w);
      }
    }

    // Nevada sagebrush on scrub tiles (instanced: ~5 draw calls for the whole field).
    // Ground overlay v2 already places sagebrush_clump where it belongs.
    if (!replacesSagebrush(this._ground)) {
      await this._placeSagebrush(L, floors, scene);
    }
    try {
      await applyGroundDressing(this, this._ground, scene, world);
    } catch (err) {
      console.warn("[ground] apply failed", err);
    }

    if (!this._shingleMat) {
      try {
        const src = await getModel("sparks_tract_house", { receiveShadow: true });
        if (src) this._shingleMat = extractShingleMaterial(src);
      } catch {}
    }
    try {
      coverBuildingRoofs(this, L, scene, {
        shingle: this._shingleMat || fallbackShingleMat(),
        snow: snowMat,
        gable: brickMat,
        flat: concMat,
        rects: { greedyRects, rectWorld },
      });
    } catch (err) { console.warn("[roofs]", err); }

    try {
      const n = instanceSmallBoxes(scene);
      if (n) console.info("[buildings] instanced", n, "facade boxes");
    } catch (err) { console.warn("[buildings] instanceSmallBoxes", err); }

    // Bind G tiles to the nearest door-like interactive
    for (const g of this.gates) {
      const ix = (g.minX + g.maxX) / 2, iz = (g.minZ + g.maxZ) / 2;
      const near = (L.interactives || []).find((it) => Math.hypot(it.x - ix, it.z - iz) < 4 && it.setsFlag);
      if (near) g.flag = near.setsFlag;
    }
  }

  async _placeTractHouses(scene, box, n, L) {
    const src = await getModel("sparks_tract_house", { receiveShadow: true });
    if (!src) return false;
    if (!this._shingleMat) this._shingleMat = extractShingleMaterial(src);
    const alongX = box.w >= box.d;
    const seg = (alongX ? box.w : box.d) / n;
    const mapMidZ = (this.world.bounds.minZ + this.world.bounds.maxZ) / 2;
    for (let i = 0; i < n; i++) {
      const h = i === 0 ? src : await getModel("sparks_tract_house");
      if (!h) break;
      // Face the street: long lots along X face +/-Z, deep lots face toward x = 0.
      h.rotation.y = alongX ? (box.cz < mapMidZ ? 0 : Math.PI) : (box.cx < 0 ? Math.PI / 2 : -Math.PI / 2);
      h.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(h);
      const cw = alongX ? seg : box.w, cd = alongX ? box.d : seg;
      const fx = (cw * 0.94) / Math.max(0.1, b.max.x - b.min.x);
      const fz = (cd * 0.94) / Math.max(0.1, b.max.z - b.min.z);
      const swap = Math.abs(Math.sin(h.rotation.y)) > 0.7;
      const uni = Math.max(0.6, Math.min(1.6, Math.min(fx, fz)));
      h.scale.set((swap ? fz : fx), uni, (swap ? fx : fz));
      h.scale.x = Math.max(0.5, Math.min(2.2, h.scale.x));
      h.scale.z = Math.max(0.5, Math.min(2.2, h.scale.z));
      const cx = alongX ? box.minX + seg * (i + 0.5) : box.cx;
      const cz = alongX ? box.cz : box.minZ + seg * (i + 0.5);
      h.position.set(cx, 0, cz);
      h.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(h);
      h.position.x += cx - (b.min.x + b.max.x) / 2;
      h.position.z += cz - (b.min.z + b.max.z) / 2;
      fitToGround(h);
      if (!this._snowy) stripSnow(h);
      h.userData.kind = "building";
      h.userData.model = "sparks_tract_house";
      scene.add(h);
      this.world.farProps.push(h);
      this._tractHouses++;
    }
    // Solid inset core: the B tiles are the collider; the core guarantees no see-through gap.
    this._addLotCore(scene, box, 2.2, this._coreMatEarly || null);
    return true;
  }

  async _placeSagebrush(L, floors, scene) {
    const cells = [];
    for (const [ch, list] of floors) {
      const t = L.grid.legend[ch] || {};
      if (/sage|scrub/i.test(t.name || "")) cells.push(...list);
    }
    const season = String(L.environment?.season || "");
    if (!cells.length || /winter/.test(season)) { this._sage = 0; return; }
    const src = await getModel("sagebrush_clump");
    if (!src) { this._sage = 0; return; }
    const mats = [];
    let h = 2166136261;
    const rnd = () => { h = (Math.imul(h ^ 0x9e37, 16777619) + 1013904223) >>> 0; return h / 4294967296; };
    const maxN = 90;
    const step = Math.max(1, Math.floor(cells.length / maxN));
    for (let i = 0; i < cells.length && mats.length < maxN; i += step) {
      const c = cells[i];
      const m = new THREE.Matrix4();
      const s = 0.7 + rnd() * 0.6;
      m.compose(new THREE.Vector3(c.x + (rnd() - 0.5) * 1.2, 0, c.z + (rnd() - 0.5) * 1.2),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28), new THREE.Vector3(s, s, s));
      mats.push(m);
    }
    for (const im of instanceGLB(src, mats)) { im.userData.kind = "sagebrush"; scene.add(im); }
    this._sage = mats.length;
  }

  async _placeProps(L) {
    const world = this.world;
    this._decor = [];
    const tryGLB = world.tryGLB;
    for (const p of (L.props || [])) {
      let obj = null;
      if (p.asset && tryGLB) {
        const src = world.prefabs[p.asset] || await tryGLB("./" + p.asset);
        if (src) {
          world.prefabs[p.asset] = src;
          obj = (src.scene || src).clone(true);
        }
      }
      if (!obj) {
        const h = p.h || 2;
        obj = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, h, 1.6),
          new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.9 })
        );
        obj.position.y = h / 2;
      } else {
        fitHeight(obj, p.h || 2);
      }
      obj.position.x = p.x;
      obj.position.z = p.z;
      obj.rotation.y = p.rotY || 0;
      const kind = assetKind(p.asset);
      const fp = tightFootprint(kind);
      const tol = kind === "building" ? 0.4 : 0;
      const lot = (this._lots || []).find((box) => p.x >= box.minX - tol && p.x <= box.maxX + tol && p.z >= box.minZ - tol && p.z <= box.maxZ + tol);
      obj.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(obj);
      let maxW = fp.maxW, maxD = fp.maxD;
      if (lot && kind === "building") {
        // r8: a building prop owns its whole lot (colliders are the full lot). Fit the
        // model to the lot footprint and centre it, then back it with a solid core so
        // the hull is never smaller than the walls the player bumps into.
        const lw = lot.maxX - lot.minX, ld = lot.maxZ - lot.minZ;
        const bw0 = Math.max(0.05, b.max.x - b.min.x), bd0 = Math.max(0.05, b.max.z - b.min.z);
        const fx = Math.max(0.3, Math.min(2.4, (lw * 0.94) / bw0));
        const fz = Math.max(0.3, Math.min(2.4, (ld * 0.94) / bd0));
        const swap = Math.abs(Math.sin(obj.rotation.y)) > 0.7;
        obj.scale.x *= swap ? fz : fx;
        obj.scale.z *= swap ? fx : fz;
        obj.updateMatrixWorld(true);
        b = new THREE.Box3().setFromObject(obj);
        obj.position.x += (lot.minX + lot.maxX) / 2 - (b.min.x + b.max.x) / 2;
        obj.position.z += (lot.minZ + lot.maxZ) / 2 - (b.min.z + b.max.z) / 2;
        obj.updateMatrixWorld(true);
        b = new THREE.Box3().setFromObject(obj);
        maxW = Infinity; maxD = Infinity;
        this._addLotCore(this.group, lot, Math.max(3, (b.max.y - b.min.y) * 0.82), this._coreMat);
      } else if (lot) {
        maxW = Math.min(maxW, Math.max(0.6, (lot.maxX - lot.minX) - 0.5));
        maxD = Math.min(maxD, Math.max(0.6, (lot.maxZ - lot.minZ) - 0.5));
      }
      const bw = Math.max(0.05, b.max.x - b.min.x);
      const bd = Math.max(0.05, b.max.z - b.min.z);
      const shrink = Math.min(1, maxW / bw, maxD / bd);
      if (shrink < 0.999) {
        obj.scale.x *= shrink;
        obj.scale.z *= shrink;
        obj.updateMatrixWorld(true);
        b = new THREE.Box3().setFromObject(obj);
      }
      if (lot) {
        const pad = 0.15;
        let dx = 0, dz = 0;
        if (b.min.x < lot.minX + pad) dx = (lot.minX + pad) - b.min.x;
        if (b.max.x > lot.maxX - pad) dx = (lot.maxX - pad) - b.max.x;
        if (b.min.z < lot.minZ + pad) dz = (lot.minZ + pad) - b.min.z;
        if (b.max.z > lot.maxZ - pad) dz = (lot.maxZ - pad) - b.max.z;
        if (dx || dz) {
          obj.position.x += dx;
          obj.position.z += dz;
          obj.updateMatrixWorld(true);
          b = new THREE.Box3().setFromObject(obj);
        }
      }
      obj.userData.kind = kind;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = !!p.collide; o.receiveShadow = true; } });
      this.group.add(obj);
      world.farProps.push(obj);
      if (kind === "dumpster" || kind === "car" || /trash|bin|barrel/.test(String(p.asset || "").toLowerCase())) {
        const dk = kind === "dumpster" || kind === "car" ? kind : (/barrel/.test(p.asset) ? "barrel" : "trashcan");
        this._decor.push({ id: p.id || ("prop_" + this._decor.length), kind: dk, obj, x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2, box: b.clone(), bound: null });
      }
      // Buildings / chimneys sitting on solid lots already have tile colliders —
      // never add a huge GLB AABB that spills into alleys or the street.
      const covered = !!(lot && (kind === "building" || kind === "chimney" || kind === "tower"));
      if (p.collide && !covered && fp.colW > 0) {
        if (kind === "car") {
          world.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, src: p.id || "car", kind });
        } else {
          const cx = p.x, cz = p.z;
          world.colliders.push({
            minX: cx - fp.colW, maxX: cx + fp.colW,
            minZ: cz - fp.colD, maxZ: cz + fp.colD,
            src: p.id || kind, kind,
          });
        }
      }
    }
  }

  /** Solid inset hull inside a GLB building lot (hidden when the GLB covers it). */
  _addLotCore(parent, box, h, mat) {
    const w = (box.maxX - box.minX) * 0.82, d = (box.maxZ - box.minZ) * 0.82;
    if (w < 0.5 || d < 0.5) return null;
    const core = boxMesh(w, h, d, mat || new THREE.MeshStandardMaterial({ color: 0x6a625a, roughness: 0.92 }), 2.5);
    core.position.set((box.minX + box.maxX) / 2, h / 2, (box.minZ + box.maxZ) / 2);
    core.userData.kind = "building_core";
    parent.add(core);
    (this._cores || (this._cores = [])).push(core);
    return core;
  }

  _placeFires(L) {
    const check = (w) => evalWhen(w, this.ctx());
    for (const s of (L.safeZones || [])) {
      if (s.when && !check(s.when)) continue;
      if (s.kind === "campfire" || s.kind === "burn_barrel") {
        this.world._addFire(this.group, s.x, s.z, s.id);
      }
    }
  }

  async _placeLoot(L) {
    const check = (w) => evalWhen(w, this.ctx());
    const ch = L.chapter || L.id;
    const world = this.world;
    world.loot = [];
    const decor = this._decor || [];
    const kinds = { dumpster: "assets/kenney/roads/dumpster.glb", car: "assets/tevy/wrecked-sedan-lod1.glb" };
    const prefab = async (kind) => {
      const path = kinds[kind];
      if (!path || !world.tryGLB) return null;
      let src = world.prefabs?.[path];
      if (!src) { try { src = await world.tryGLB("./" + path); } catch { src = null; } if (src && world.prefabs) world.prefabs[path] = src; }
      return src ? (src.scene || src).clone(true) : null;
    };
    // Point on a prop's footprint edge closest to p (where the player actually stands to search it).
    const edgePoint = (d, px, pz) => {
      const b = d.box, inset = 0.15;
      return {
        x: Math.max(b.min.x + inset, Math.min(b.max.x - inset, px)),
        z: Math.max(b.min.z + inset, Math.min(b.max.z - inset, pz)),
      };
    };
    const bind = (rec, d, l) => {
      d.bound = rec.id;
      if (d.kind === "car") {
        // Search at the trunk end of the car (the end nearer the authored loot point).
        const b = d.box, longZ = (b.max.z - b.min.z) >= (b.max.x - b.min.x);
        const pt = longZ
          ? { x: d.x, z: Math.abs(l.z - b.min.z) < Math.abs(l.z - b.max.z) ? b.min.z + 0.2 : b.max.z - 0.2 }
          : { z: d.z, x: Math.abs(l.x - b.min.x) < Math.abs(l.x - b.max.x) ? b.min.x + 0.2 : b.max.x - 0.2 };
        rec.x = pt.x; rec.z = pt.z; rec.r = Math.max(l.r || 1.6, 1.8);
      } else {
        const pt = edgePoint(d, d.x, d.z);
        rec.x = pt.x; rec.z = pt.z;
        const half = Math.max(d.box.max.x - d.box.min.x, d.box.max.z - d.box.min.z) / 2;
        rec.r = Math.max(l.r || 1.6, Math.min(2.2, half + 1.1));
      }
      rec.prop = d.obj; rec.propKind = d.kind; rec.boundProp = d.id; rec.mesh = null;
    };
    for (const l of (L.spawns?.loot || [])) {
      if (l.when && !check(l.when)) continue;
      const items = rollContainer(l.container, l.location, ch, l.guaranteed, this.systems, l.id);
      const rec = { ...l, taken: false, items, remaining: { ...items }, label: cleanLabel(l.label || l.container || "Container") };
      const kind = lootPropKind(l);
      const propBound = l.render === "prop" || !!l.propRef;
      let best = l.propRef ? decor.find((d) => !d.bound && d.id === l.propRef) || null : null;
      let bestD = propBound ? 6 : 3.5;
      if (!best) for (const d of decor) {
        if (d.bound || d.kind !== kind) continue;
        const dd = Math.hypot(d.x - l.x, d.z - l.z);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      if (best) {
        bind(rec, best, l);
      } else if (propBound) {
        // Cartographer: render === "prop" / propRef means the car/dumpster IS the container.
        // Never add a lootCrate() next to it; keep it searchable at its authored point.
        rec.prop = null; rec.propKind = kind; rec.mesh = null;
      } else {
        let obj = null;
        if (kind === "locker") obj = await getModel("metal_locker");
        else if (/grill|bbq|barbecue/i.test(String(l.label || ""))) obj = await getModel("charcoal_grill");
        if (obj) {
          fitToGround(obj);
          obj.userData.model = kind === "locker" ? "metal_locker" : "charcoal_grill";
        } else obj = await prefab(kind);
        if (obj && obj.userData.model) {
          // Sculptor searchable already at real scale.
        } else if (obj) {
          fitHeight(obj, kind === "car" ? 1.5 : 1.2);
          obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
        } else {
          obj = makeLootProp(kind);
          if (!this._snowy) stripSnow(obj);
        }
        obj.position.x = l.x; obj.position.z = l.z;
        obj.rotation.y = Number.isFinite(l.rotY) ? l.rotY : (((l.x * 7 + l.z * 3) % 4) | 0) * (Math.PI / 2);
        obj.userData.kind = "loot_" + kind;
        obj.userData.lootId = l.id;
        this.group.add(obj);
        rec.prop = obj; rec.propKind = kind; rec.mesh = null;
      }
      world.loot.push(rec);
    }
    // Sculptor charcoal grill: a searchable backyard grill beside the home in Ch1 / Ch3.
    const chN = parseInt(String(ch || "").replace(/\D/g, ""), 10) || 0;
    const home = (L.buildings || []).find((b) => /_home$/.test(b.id || "") && b.rect);
    if ((chN === 1 || chN === 3) && home) {
      const doors = home.doors || [];
      const x0 = Math.min(home.rect.x0, home.rect.x1), x1 = Math.max(home.rect.x0, home.rect.x1);
      const cands = [];
      for (const [dx, dz] of doors) for (const off of [2.5, 3.5, 4.5]) {
        const out = dx <= x0 + 1.5 ? -off : (dx >= x1 - 1.5 ? off : 0);
        if (!out) continue;
        cands.push([dx + out, dz + 2.2], [dx + out, dz - 2.2]);
      }
      const free = (x, z) => {
        const t = this.tileAt(x, z);
        if (!t || !t.def || !t.def.walkable || t.def.solid) return false;
        return !(world.colliders || []).some((c) => x > c.minX - 0.6 && x < c.maxX + 0.6 && z > c.minZ - 0.6 && z < c.maxZ + 0.6)
          && !world.loot.some((r) => Math.hypot(r.x - x, r.z - z) < 1.6);
      };
      const spot = cands.find(([x, z]) => free(x, z));
      const grill = spot ? await getModel("charcoal_grill") : null;
      if (grill) {
        fitToGround(grill);
        grill.position.x = spot[0]; grill.position.z = spot[1];
        grill.rotation.y = spot[0] < home.rect.x0 ? Math.PI / 2 : -Math.PI / 2;
        grill.userData.kind = "loot_grill"; grill.userData.model = "charcoal_grill";
        this.group.add(grill);
        world.colliders.push({ minX: spot[0] - 0.35, maxX: spot[0] + 0.35, minZ: spot[1] - 0.35, maxZ: spot[1] + 0.35, src: "grill", kind: "prop" });
        const id = "search_grill_" + (L.id || ch);
        const items = rollContainer("kitchen_cabinet", home.location || null, ch, null, this.systems, id) || {};
        world.loot.push({ id, x: spot[0], z: spot[1], r: 1.6, label: "Charcoal grill", container: "kitchen_cabinet", items, remaining: { ...items }, taken: false, prop: grill, propKind: "grill" });
      }
    }
    // Street dumpsters / cars / bins with no authored container are searchable too.
    const locId = (x, z) => {
      let best = null, bd = Infinity;
      for (const l of (L.spawns?.loot || [])) { const d = Math.hypot(l.x - x, l.z - z); if (l.location && d < bd) { bd = d; best = l.location; } }
      return best || (L.locations && L.locations[0] && L.locations[0].id) || null;
    };
    for (const d of decor) {
      if (d.bound) continue;
      const container = d.kind === "car" ? "car_trunk" : "dumpster";
      const id = "search_" + d.id;
      const label = d.kind === "car" ? "Car trunk" : d.kind === "trashcan" ? "Trash can" : d.kind === "barrel" ? "Barrel" : "Dumpster";
      const items = rollContainer(container, locId(d.x, d.z), ch, null, this.systems, id) || {};
      const rec = { id, x: d.x, z: d.z, r: 1.6, label, container, items, remaining: { ...items }, taken: false, auto: true };
      bind(rec, d, { x: d.x, z: d.box.max.z, r: 1.6 });
      world.loot.push(rec);
    }
  }

  async _placeNpcs(L) {
    const world = this.world;
    for (const n of world.npcs) {
      disposeMixer(n.mesh);
      if (n.mesh && n.mesh.parent) n.mesh.parent.remove(n.mesh);
    }
    world.npcs = [];
    const check = (w) => evalWhen(w, this.ctx());
    const chosen = new Map();
    for (const s of (L.spawns?.npcs || [])) {
      const id = s.npc || s.id;
      if (s.when && !check(s.when)) continue;
      if (chosen.has(id)) continue;
      chosen.set(id, s);
    }
    world.companion = null;
    const swaps = [];
    for (const [id, s] of chosen) {
      const isWraith = id === "wraith" || !!s.companion;
      const mesh = isWraith ? makeDog(0x8a6a44) : makePerson({ id });
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = s.rotY || 0;
      this.group.add(mesh);
      const role = s.role || (s.trader ? "trader" : "") || (s.crowd ? "civilian" : "") || s.label || s.behavior || "";
      const rec = {
        id, name: s.label || (id || "").replace(/_/g, " "), x: s.x, z: s.z, rotY: s.rotY || 0,
        homeX: s.x, homeZ: s.z,
        mesh, alive: true, dialogue: s.dialogue, behavior: s.behavior,
        companion: !!isWraith, trader: /^trader_/.test(id) ? id : (s.trader || null),
        role, r: isWraith ? 1.6 : 2.0,
      };
      world.npcs.push(rec);
      if (isWraith) world.companion = rec;
      // Placeholder stays if the GLB fails to load.
      swaps.push(this._swapNpcModel(rec, id, role, isWraith));
    }
    await Promise.all(swaps);
  }

  /** Add NPCs whose `when` just became true, without wiping anyone already placed (e.g. mid-session TRACK). */
  async ensureConditionalNpcs() {
    const L = this.L;
    const world = this.world;
    if (!L || !world) return [];
    const check = (w) => evalWhen(w, this.ctx());
    const have = new Set((world.npcs || []).map((n) => n.id));
    const added = [];
    const swaps = [];
    for (const s of (L.spawns?.npcs || [])) {
      const id = s.npc || s.id;
      if (!id || have.has(id)) continue;
      if (s.when && !check(s.when)) continue;
      const isWraith = id === "wraith" || !!s.companion;
      if (isWraith && world.companion) continue;
      const mesh = isWraith ? makeDog(0x8a6a44) : makePerson({ id });
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = s.rotY || 0;
      this.group.add(mesh);
      const role = s.role || (s.trader ? "trader" : "") || (s.crowd ? "civilian" : "") || s.label || s.behavior || "";
      const rec = {
        id, name: s.label || (id || "").replace(/_/g, " "), x: s.x, z: s.z, rotY: s.rotY || 0,
        homeX: s.x, homeZ: s.z,
        mesh, alive: true, dialogue: s.dialogue, behavior: s.behavior,
        companion: !!isWraith, trader: /^trader_/.test(id) ? id : (s.trader || null),
        role, r: isWraith ? 1.6 : 2.0,
      };
      world.npcs.push(rec);
      have.add(id);
      if (isWraith) world.companion = rec;
      added.push(rec);
      swaps.push(this._swapNpcModel(rec, id, role, isWraith));
    }
    await Promise.all(swaps);
    return added;
  }

  /** Replace a placeholder actor mesh with a Sculptor GLB once the template is loaded. */
  async _swapModel(rec, modelId) {
    return this._applySwappedMesh(rec, await getModel(modelId), modelId);
  }

  async _swapNpcModel(rec, npcId, role, isWraith) {
    const modelId = isWraith ? "wraith_malinois" : resolveNpcModelId(npcId, role);
    const m = isWraith ? await getModel(modelId) : await getNpcModel(npcId, role);
    return this._applySwappedMesh(rec, m, modelId || (m && m.userData && m.userData.model));
  }

  _applySwappedMesh(rec, m, modelId) {
    const group = this.group;
    if (!m || !rec.mesh || rec.mesh.parent !== group) return false;
    const x = rec.mesh.position.x, z = rec.mesh.position.z, yaw = rec.mesh.rotation.y;
    const vis = rec.mesh.visible;
    // Heights are authored on the GLB. fitToGround(obj) only snaps min y to 0 —
    // never pass a height or Lolo/Ross (and the rest) flatten to the same size.
    m.position.set(x, 0, z);
    m.rotation.y = yaw;
    fitToGround(m);
    m.visible = vis;
    m.userData.kind = rec.companion ? "wraith" : "npc";
    m.userData.model = modelId || m.userData.model;
    m.userData.npcId = rec.id;
    m.userData.baseY = m.position.y;
    m.userData.baseYaw = yaw;
    const cat = MODEL_CATALOG[m.userData.model];
    if (cat && cat.collider && cat.collider.radius) rec.r = rec.companion ? 1.6 : Math.max(2.0, (cat.collider.radius || 0.2) + 1.8);
    group.remove(rec.mesh);
    rec.mesh = m;
    rec.model = m.userData.model;
    rec.homeX = rec.homeX ?? x;
    rec.homeZ = rec.homeZ ?? z;
    group.add(m);
    bindNpc(rec, this.world);
    return true;
  }

  _placeInteractives(L) {
    this.world.interactives = (L.interactives || []).map((it) => ({ ...it, r: it.r || 1.8 }));
  }

  _applyLocations(L) {
    // Only the current chapter's areas are live, so Ch9 river_ice and Ch1 loc_east_end stay separate
    // and a leftover Blatnik rect cannot steal the Ch1 street label.
    const prev = this.world.locations || {};
    const catalog = {};
    for (const loc of (L.locations || [])) {
      const old = prev[loc.id] || {};
      catalog[loc.id] = {
        ...old,
        ...loc,
        name: old.name || loc.name || loc.label || loc.id.replace(/^loc_/, "").replace(/_/g, " "),
      };
    }
    this.world.setLocations(catalog);
  }

  _applyEnvironment(L) {
    const env = L.environment || {};
    const g = this.game;
    if (!g) return;
    if (env.timeStart != null && !env.timeLocked !== false) {
      if (g.timeOfDay == null || g.flags?.chapter === L.chapter || L.id?.startsWith(g.flags?.chapter)) {
        g.timeOfDay = env.timeStart;
      }
    }
    if (env.timeStart != null && (g._bootEnv || String(g.flags?.chapter || "") === String(L.chapter || "") || String(g.flags?.chapter || "").startsWith("ch" + String(L.chapter || "").replace(/\D/g, "").padStart(2, "0")))) {
      g.timeOfDay = env.timeStart;
    }
    if (env.blizzard) g.blizzard = true;
    if (env.weather === "blizzard") g.blizzard = true;
    if (env.weather && env.weather !== "blizzard") g.blizzard = !!env.blizzard;
    if (env.timeLocked) g._lockWeather = true;
    g._weather = env.weather;
    if (env.warmthDrainMul) g._warmthDrainMul = env.warmthDrainMul;
  }

  tick(dt, game) {
    if (!this.L) return;
    this.bind(game);
    this._updateGates();
    this.tickEncounters(game.player.x, game.player.z);
    this.tickTriggers(game);
    tickGroundDressing(this, game.player, dt);
  }

  _updateGates() {
    const flags = this.ctx().flags;
    const cols = this.world.colliders;
    for (const g of this.gates) {
      if (!g.flag) continue;
      const open = !!flags[g.flag];
      if (open && !g.open) {
        g.open = true;
        if (g.mesh) g.mesh.visible = false;
        const i = cols.indexOf(g.col);
        if (i >= 0) cols.splice(i, 1);
      }
    }
  }

  playerZone(x, z) {
    return (this.L.encounters || []).find((z) => inShape(z.area, x, z)) || null;
  }

  tickEncounters(px, pz) {
    const L = this.L;
    const zone = this.playerZone(px, pz);
    const check = (w) => evalWhen(w, this.ctx());
    const flags = this.ctx().flags;
    const living = this.enemies.list.filter((e) => e.alive && !e.dormant);
    const cap = Math.min(this.maxEnemies, 6);

    // Activate next wave when previous wave's groups are cleared.
    if (zone) {
      const groups = zone.groups || [];
      const waves = [...new Set(groups.map((g) => g.wave || 1))].sort((a, b) => a - b);
      for (const w of waves) {
        const atWave = groups.filter((g) => (g.wave || 1) === w);
        const prev = groups.filter((g) => (g.wave || 1) === w - 1);
        const prevCleared = w === 1 || prev.every((g) => flags["cleared." + g.group]);
        if (prevCleared) for (const g of atWave) this.live.add(g.group);
      }
    }

    for (const e of (L.spawns?.enemies || [])) {
      const zinfo = this.zoneOf[e.group];
      const inLiveZone = zone && zinfo && zinfo.zone === zone;
      const shouldExist = this.live.has(e.group) && inLiveZone && check(e.when);
      if (shouldExist && !e._ent && living.length < cap) {
        // Keep the story type when the engine has a dedicated body for it (tallman, Hollows,
        // watch_militia GLB...); otherwise fall back to systems code_kind.
        const kind = this.enemies.hasKind?.(e.type) ? e.type : (this.kindOf[e.type] || e.type || "raider");
        const ent = this.enemies.spawn(kind, e.x, e.z, { ambient: false, encounter: zone?.id });
        if (ent) {
          ent.patrol = e.patrol;
          ent.patrolWaitSec = e.patrolWaitSec || 0.8;
          ent.heading = e.rotY || ent.heading;
          ent.hostile = e.hostile || "always";
          ent.hostileWhen = e.hostileWhen;
          ent.levelRef = e;
          ent.group = e.group;
          e._ent = ent;
        }
      }
      if (e._ent) {
        e._ent.dormant = !inLiveZone;
        if (e._ent.mesh) e._ent.mesh.visible = !e._ent.dormant && e._ent.alive;
      }
    }

    // cleared.<group> when every member is dead or fled
    const byGroup = {};
    for (const e of (L.spawns?.enemies || [])) {
      if (!this.live.has(e.group) && !e._ent) continue;
      (byGroup[e.group] ||= []).push(e);
    }
    for (const [group, members] of Object.entries(byGroup)) {
      const allDown = members.every((e) => !e._ent || !e._ent.alive);
      if (allDown && members.some((e) => e._ent)) flags["cleared." + group] = true;
    }
  }

  tickTriggers(game) {
    if (game?._loadingLevel || game?._chapterBusy) return;
    const L = this.L;
    const p = game.player;
    const check = (w) => evalWhen(w, this.ctx());
    for (const t of (L.triggers || [])) {
      if (t.once && this.fired.has(t.id)) continue;
      if (t.when && !check(t.when)) continue;
      const on = t.on || "enter";
      if (on === "load") {
        this._fireTrigger(t, game);
        continue;
      }
      if (on === "flag") {
        if (check(t.when || t.flag)) this._fireTrigger(t, game);
        continue;
      }
      if (on === "enter" || on === "exit") {
        const now = inShape(t.shape, p.x, p.z);
        const was = this.inside.has(t.id);
        if (now) this.inside.add(t.id); else this.inside.delete(t.id);
        if (on === "enter" && now && !was) this._fireTrigger(t, game);
        if (on === "exit" && !now && was) this._fireTrigger(t, game);
      }
    }
  }

  interactTriggers(game) {
    const p = game.player;
    const check = (w) => evalWhen(w, this.ctx());
    for (const t of (this.L?.triggers || [])) {
      if (t.on !== "interact") continue;
      if (t.once && this.fired.has(t.id)) continue;
      if (t.when && !check(t.when)) continue;
      if (inShape(t.shape, p.x, p.z)) this._fireTrigger(t, game);
    }
  }

  fireLoadTriggers(game) {
    for (const t of (this.L?.triggers || [])) {
      if (t.on === "load" && !(t.once && this.fired.has(t.id))) this._fireTrigger(t, game);
    }
  }

  _fireTrigger(t, game) {
    if (t.once) this.fired.add(t.id);
    for (const a of (t.actions || [])) this._runAction(a, t, game);
  }

  _runAction(a, t, game) {
    if (!a) return;
    const type = a.type || a.event;
    const flags = game.flags;
    if (type === "set_flag") flags[a.flag] = a.value !== undefined ? a.value : true;
    if (type === "activate_group") this.live.add(a.group);
    if (type === "set_time") game.timeOfDay = a.value;
    if (type === "set_weather") {
      game._weather = a.weather;
      if (a.weather === "blizzard") game.blizzard = true;
      else if (a.blizzard != null) game.blizzard = !!a.blizzard;
      else game.blizzard = false;
    }
    if (type === "checkpoint") game.save?.();
    if (type === "hud_unlock" && a.stat) game.hudUnlocks?.add(a.stat);
    if (type === "dialogue" && a.id) {
      const dlg = game.story.dialogues.find((d) => d.id === a.id);
      if (dlg) game.openDialogue(dlg);
    }
    if (type === "cutscene") {
      const text = a.text || "";
      if (text) game.hud.say(text, 4);
    }
    if (type === "bark") {
      if (a.text) game.hud.say(a.text, 3);
    }
    if (type === "push_back") this._pushBack(t, game);
    if (type === "teleport") {
      game.player.x = a.x; game.player.z = a.z;
    }
    if (type === "chapter_end") {
      const next = a.next || this.L?.next;
      const id = (next || "").replace(/_.*$/, "") || next;
      // Queue the change so a chapter-end dialogue (e.g. the Ch1 voicemail)
      // can finish, and so we never start a second setChapter while one is loading.
      if (id) {
        if (typeof game.requestChapter === "function") game.requestChapter(id);
        else game.setChapter(id);
      }
    }
    if (type === "story_check") this._storyCheck(a.id, game);
    if (type === "start_sequence") {
      // Later-chapter QTEs / on-rails set pieces are stubbed.
      if (a.id) game.hud.say("Hold on.");
      flags[a.id] = true;
    }
    if (type === "spawn_setpiece") {
      flags["setpiece_" + (a.id || "stub")] = true;
    }
  }

  _storyCheck(id, game) {
    const hooks = game.story?.hooks || {};
    const table = hooks.story_checks || hooks.checks || {};
    if (table[id]) {
      applyEffects(table[id], game._ctxFx?.() || this.ctx());
      return;
    }
    if (id === "endings" && game.flags.ending) game.showEnding?.(game.flags.ending);
  }

  _pushBack(t, game) {
    const p = game.player;
    const s = t.shape || {};
    if (s.type === "rect" || s.x0 != null) {
      const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
      const dx = p.x - cx, dz = p.z - cz;
      const len = Math.hypot(dx, dz) || 1;
      p.x += (dx / len) * 1.4;
      p.z += (dz / len) * 1.4;
    } else {
      const dx = p.x - (s.x || 0), dz = p.z - (s.z || 0);
      const len = Math.hypot(dx, dz) || 1;
      p.x += (dx / len) * 1.4;
      p.z += (dz / len) * 1.4;
    }
  }

  useInteractive(it, game) {
    const check = (w) => evalWhen(w, this.ctx());
    if (it.when && !check(it.when)) { game.hud.say("Not now."); return false; }
    if (it.requiresFlags && !evalWhen(it.requiresFlags.map ? it.requiresFlags : it.requiresFlags, this.ctx())
        && !(Array.isArray(it.requiresFlags) && it.requiresFlags.every((f) => typeof f === "string" ? game.flags[f] : evalWhen(f, this.ctx())))) {
      game.hud.say("Not yet.");
      return false;
    }
    if (Array.isArray(it.requiresFlags) && it.requiresFlags.every((f) => typeof f === "string")) {
      if (it.requiresFlags.some((f) => !game.flags[f])) { game.hud.say("Not yet."); return false; }
    }
    if (it.requiresItems) {
      const need = Array.isArray(it.requiresItems)
        ? Object.fromEntries(it.requiresItems.map((id) => [aliasItem(id), 1]))
        : it.requiresItems;
      if (!hasItems(game.inv, need)) { game.hud.say("You don't have that."); return false; }
    }
    if (it.setsFlag) setFlag(game.flags, it.setsFlag, true);
    if (it.givesItems) {
      const bag = Array.isArray(it.givesItems)
        ? Object.fromEntries(it.givesItems.map((id) => [id, 1]))
        : it.givesItems;
      for (const [id, n] of Object.entries(bag || {})) {
        const qty = typeof n === "number" ? n : 1;
        if (game.giveItem) game.giveItem(id, qty);
        else addItem(game.inv, aliasItem(id), qty);
      }
    }
    if (it.type === "feed" || it.setsFlag === "ch01_wraith_fed") {
      setFlag(game.flags, "ch01_wraith_fed", true);
      if (game.quests) game.quests.q_companion_tutorial = "done";
    }
    if (it.type === "companion_track") {
      try { startTracking(game, it); } catch (err) { console.warn("[track]", err); }
      game.refreshObjective?.();
      game.reconcileInventoryObjectives?.("interactive");
      return true;
    }
    if (it.type === "craft") {
      const pool = [...(game.systems.storyRecipes || []), ...(game.systems.recipes || [])];
      const rec = pool.find((r) => (it.setsFlag && (r.set_flags || []).includes(it.setsFlag)))
        || pool.find((r) => r.id === "cooler" || r.out?.id === "cooler" || r.id === "lake_cooler" || r.out?.id === "lake_cooler");
      if (rec && hasItems(game.inv, rec.in)) {
        for (const [id, n] of Object.entries(rec.in)) takeItem(game.inv, id, n);
        addItem(game.inv, rec.out.id, rec.out.n || 1);
        if (rec.set_flags) for (const f of rec.set_flags) game.flags[f] = true;
      }
      game.refreshObjective?.();
    }
    if (it.type === "fill" && it.requiresItems) {
      /* flag already set — player hauled the water */
    }
    if (it.type === "light_fire") {
      // World.addCampfire attaches a Lumen campfire when a pipeline is bound
      // and skips the host PointLight, so we do not double-light (which used
      // to recompile every material).
      this.world.addCampfire(this.group || this.scene, it.x, it.z);
    }
    if (it.type === "read" && it.label) game.hud.say(it.label);
    game.hud.say(it.label || "Done.");
    game.refreshObjective?.();
    game.reconcileInventoryObjectives?.("interactive");
    return true;
  }
}
