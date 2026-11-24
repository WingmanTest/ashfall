// Cartographer chapter loader. Builds geometry from levels/*.json (do not edit those files).
import * as THREE from "three";
import { CFG } from "./config.js";
import { fitHeight, makePerson, makeDog } from "./world.js";
import { evalCondition, applyEffects } from "./story.js";
import { rollContainer, aliasItem } from "./systems.js";
import { addItem, takeItem, hasItems } from "./inventory.js";
import { pbrMat, boxMesh, snowCap, addFacadeDetails, greedyRects, rectWorld, stampBuildings } from "./buildings.js";

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

function lootCrate() {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.4, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.95 })
  );
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
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

  async load(chapterId, { fired } = {}) {
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
    this.group = this.world.levelGroup;
    await this._buildGrid(L);
    await this._placeProps(L);
    this._placeFires(L);
    this._placeLoot(L);
    this._placeNpcs(L);
    this._placeInteractives(L);
    this._applyLocations(L);
    this._applyEnvironment(L);

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
        if (t.walkable && !t.solid) {
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
      if (t.roof) {
        const roof = new THREE.InstancedMesh(geo, stdMat(await getPbr(t.wallTex || t.floorTex) || tex, 0x3c3f44), cells.length);
        cells.forEach((cell, i) => {
          m.makeTranslation(cell.x, t.height || 4, cell.z);
          roof.setMatrixAt(i, m);
        });
        roof.instanceMatrix.needsUpdate = true;
        scene.add(roof);
      }
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
    const snowMat = pbrMat(snowP, 0xf4f7fb, { roughness: 0.92 });
    const facadeMats = { window: null, board: rustMat, door: pbrMat(concrete, 0x3a322c), frame: rustMat };
    facadeMats.window = new THREE.MeshStandardMaterial({
      color: 0x1a2228, roughness: 0.22, metalness: 0.18, emissive: 0x2a1e10, emissiveIntensity: 0.15,
    });

    // Building lots: Kenney City Kit models, one (or a few) per footprint.
    const lots = greedyRects(tiles, legend, (ch, t) => ch === "B" || t.name === "building_mass" || t.massOnly);
    this._lots = lots.map((rec) => rectWorld(rec, o, cs));
    const buildingProps = (L.props || []).filter((p) => isBuildingAsset(p.asset));
    this._buildingProps = buildingProps;
    for (const rec of lots) {
      const box = rectWorld(rec, o, cs);
      const reserved = buildingProps.some((p) => p.x >= box.minX - 0.4 && p.x <= box.maxX + 0.4 && p.z >= box.minZ - 0.4 && p.z <= box.maxZ + 0.4);
      const ok = await stampBuildings(rec, world, scene, o, cs, snowMat, {
        skip: () => reserved,
      });
      const h = 7;
      if (!ok) {
        const shell = boxMesh(box.w, h, box.d, brickMat, 2);
        shell.position.set(box.cx, h / 2, box.cz);
        scene.add(shell);
        const cap = snowCap(box.w, box.d, h, snowMat);
        cap.position.x = box.cx; cap.position.z = box.cz;
        scene.add(cap);
      }
      addFacadeDetails(scene, { ...box, h, y0: 0 }, facadeMats);
    }

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
      if (h >= 1.2 && rec.ch !== "G") {
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
        world.colliders.push({ minX: s.x - 0.35, maxX: s.x + 0.35, minZ: s.z - 0.35, maxZ: s.z + 0.35, src: "tree" });
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

    // Bind G tiles to the nearest door-like interactive
    for (const g of this.gates) {
      const ix = (g.minX + g.maxX) / 2, iz = (g.minZ + g.maxZ) / 2;
      const near = (L.interactives || []).find((it) => Math.hypot(it.x - ix, it.z - iz) < 4 && it.setsFlag);
      if (near) g.flag = near.setsFlag;
    }
  }

  async _placeProps(L) {
    const world = this.world;
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
      const lot = (this._lots || []).find((box) => p.x >= box.minX && p.x <= box.maxX && p.z >= box.minZ && p.z <= box.maxZ);
      obj.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(obj);
      let maxW = fp.maxW, maxD = fp.maxD;
      if (lot) {
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

  _placeFires(L) {
    const check = (w) => evalWhen(w, this.ctx());
    for (const s of (L.safeZones || [])) {
      if (s.when && !check(s.when)) continue;
      if (s.kind === "campfire" || s.kind === "burn_barrel") {
        this.world._addFire(this.group, s.x, s.z, s.id);
      }
    }
  }

  _placeLoot(L) {
    const check = (w) => evalWhen(w, this.ctx());
    const ch = L.chapter || L.id;
    this.world.loot = [];
    for (const l of (L.spawns?.loot || [])) {
      if (l.when && !check(l.when)) continue;
      const items = rollContainer(l.container, l.location, ch, l.guaranteed, this.systems, l.id);
      const rec = { ...l, taken: false, items, remaining: { ...items }, label: cleanLabel(l.label || l.container || "Container") };
      const mesh = lootCrate();
      mesh.position.set(l.x, 0.2, l.z);
      this.group.add(mesh);
      rec.mesh = mesh;
      this.world.loot.push(rec);
    }
  }

  _placeNpcs(L) {
    const world = this.world;
    for (const n of world.npcs) {
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
    for (const [id, s] of chosen) {
      const mesh = makePerson({ id });
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = s.rotY || 0;
      this.group.add(mesh);
      world.npcs.push({
        id, name: s.label || (id || '').replace(/_/g, ' '), x: s.x, z: s.z, rotY: s.rotY || 0,
        mesh, alive: true, dialogue: s.dialogue, behavior: s.behavior,
      });
    }
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
        const kind = this.kindOf[e.type] || e.type || "raider";
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
      if (id) game.setChapter(id);
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
    if (it.setsFlag) game.flags[it.setsFlag] = true;
    if (it.type === "craft") {
      const rec = (game.systems.recipes || []).find((r) => r.id === "cooler" || r.out?.id === "cooler" || r.id === "lake_cooler");
      if (rec && hasItems(game.inv, rec.in)) {
        for (const [id, n] of Object.entries(rec.in)) takeItem(game.inv, id, n);
        addItem(game.inv, rec.out.id, rec.out.n || 1);
        if (rec.set_flags) for (const f of rec.set_flags) game.flags[f] = true;
      }
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
    return true;
  }
}
