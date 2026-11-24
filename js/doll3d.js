/**
 * 3D rotatable inventory character (BAG screen).
 * One persistent low-power WebGLRenderer (lazy singleton) rendered at 144×200 and
 * scaled up with image-rendering: pixelated. The rAF loop only runs while the
 * canvas is mounted in the BAG tab; gear meshes rebuild (and dispose) on change.
 */
import * as THREE from "three";
import { paintFace } from "./actors.js?v=r11";
import { getModel, attachBraithMask, setCapVisible, fitToGround } from "./models3d.js?v=r11";

const W = 144, H = 200;
const PLAYER = {
  skin: 0xc49a74, hair: 0x4a3828, hairStyle: "short", beard: "stubble",
  glasses: false, iris: "#3a4a5a", brow: "heavy", lined: false,
};

let S = null; // singleton state
const stats = { renderersCreated: 0, mounts: 0, unmounts: 0, frames: 0, gearBuilds: 0, lastError: 0, contextLost: 0 };

function G() {
  return S.geos;
}

function mkGeos() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 8, 6),
    sphereLo: new THREE.SphereGeometry(1, 6, 4),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
    cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
    cone: new THREE.ConeGeometry(1, 1, 6),
    cap: new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hood: new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
    disc: new THREE.CircleGeometry(1, 20),
  };
}

function hexNum(h) {
  if (typeof h === "number") return h;
  return parseInt(String(h || "#777777").replace("#", ""), 16);
}
function shadeN(hex, amt) {
  const n = hexNum(hex);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return (r << 16) | (g << 8) | b;
}
function css(n) { return "#" + (hexNum(n) >>> 0).toString(16).padStart(6, "0"); }

/** Tiny 16×16 pixel-art fabric textures (nearest filtered). */
function fabricTex(pattern, base) {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const x = c.getContext("2d");
  x.fillStyle = css(base); x.fillRect(0, 0, 16, 16);
  const px = (i, j, col) => { x.fillStyle = css(col); x.fillRect(i, j, 1, 1); };
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const h = ((i * 73856093) ^ (j * 19349663)) >>> 0;
    if (pattern === "plaid") {
      if (i % 8 < 2 || j % 8 < 2) px(i, j, shadeN(base, (i % 8 < 2 && j % 8 < 2) ? -50 : -28));
      else if (i % 8 === 4 || j % 8 === 4) px(i, j, shadeN(base, 26));
    } else if (pattern === "denim") {
      if ((i + j) % 3 === 0) px(i, j, shadeN(base, 14));
      if (h % 11 === 0) px(i, j, shadeN(base, -14));
    } else if (pattern === "knit") {
      if (j % 2 === 0 && i % 2 === 0) px(i, j, shadeN(base, -18));
      if (j % 4 === 1) px(i, j, shadeN(base, 10));
    } else if (pattern === "quilt") {
      if (j % 5 === 0) px(i, j, shadeN(base, -26));
      else if (h % 13 === 0) px(i, j, shadeN(base, 12));
    } else {
      if (h % 7 === 0) px(i, j, shadeN(base, -12));
      else if (h % 9 === 0) px(i, j, shadeN(base, 10));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/** Visual spec for every equippable we know about; unknown ids get regex fallbacks. */
const LOOK = {
  // head
  wool_hat: { slot: "head", kind: "beanie", color: 0x8a2f2f, pattern: "knit" },
  balaclava: { slot: "head", kind: "balaclava", color: 0x22262c, pattern: "knit" },
  ball_cap: { slot: "head", kind: "cap", color: 0x2c4a6a },
  hard_hat: { slot: "head", kind: "hardhat", color: 0xd8a420 },
  // torso
  work_jacket: { slot: "torso", kind: "jacket", color: 0x7a6040, pattern: "canvas" },
  coat: { slot: "torso", kind: "coat", color: 0x3e3a40, pattern: "canvas" },
  military_parka: { slot: "torso", kind: "parka", color: 0x5b6142, pattern: "quilt" },
  arctic_parka: { slot: "torso", kind: "parka", color: 0xc4532e, pattern: "quilt" },
  flannel_shirt: { slot: "torso", kind: "shirt", color: 0x8a2a24, pattern: "plaid" },
  vest: { slot: "torso", kind: "vest", color: 0x4a5040, pattern: "quilt" },
  // base
  cotton_tee: { slot: "base", kind: "tee", color: 0xb8b2a4 },
  thermal_underlayer: { slot: "base", kind: "tee", color: 0x8a8070, pattern: "knit" },
  // hands
  knit_gloves: { slot: "hands", color: 0x4a4440 },
  insulated_gloves: { slot: "hands", color: 0x1e2226, bulky: true },
  // legs
  jeans: { slot: "legs", kind: "jeans", color: 0x34485e, pattern: "denim" },
  snow_pants: { slot: "legs", kind: "insulated", color: 0x23272d, pattern: "quilt" },
  cargo_pants: { slot: "legs", kind: "cargo", color: 0x4e4c3a, pattern: "canvas" },
  // feet
  sneakers: { slot: "feet", kind: "sneaker", color: 0x5a6270, sole: 0xe0ddd4 },
  work_boots: { slot: "feet", kind: "boot", color: 0x6a4428, sole: 0x1c1610 },
  boots_insulated: { slot: "feet", kind: "winter", color: 0x2a2a2e, sole: 0x141414 },
  // wrap
  wool_blanket: { slot: "wrap", kind: "blanket", color: 0x6a4a3a, pattern: "plaid" },
  rain_poncho: { slot: "wrap", kind: "poncho", color: 0x3e5a3a },
};

function lookFor(slot, id, def) {
  if (!id) return null;
  const known = LOOK[id];
  if (known) return { ...known, color: def?.tint ? hexNum(def.tint) : known.color };
  const t = def?.tint || def?.color;
  const color = t ? hexNum(t) : null;
  const s = String(id);
  if (slot === "head") {
    if (/hard/.test(s)) return { slot, kind: "hardhat", color: color ?? 0xd8a420 };
    if (/cap/.test(s)) return { slot, kind: "cap", color: color ?? 0x2c4a6a };
    if (/hood|bala/.test(s)) return { slot, kind: "balaclava", color: color ?? 0x22262c, pattern: "knit" };
    return { slot, kind: "beanie", color: color ?? 0x5a4a6a, pattern: "knit" };
  }
  if (slot === "face") {
    if (/scarf/.test(s)) return { slot, kind: "scarf", color: color ?? 0x8a3a2a, pattern: "knit" };
    if (/bandana/.test(s)) return { slot, kind: "bandana", color: color ?? 0x7a2020 };
    if (/goggle/.test(s)) return { slot, kind: "goggles", color: color ?? 0x2a2a2a };
    return { slot, kind: "gasmask", color: 0x23282a };
  }
  if (slot === "torso") return { slot, kind: /parka|winter/.test(s) ? "parka" : /coat/.test(s) ? "coat" : /vest/.test(s) ? "vest" : /shirt|tee|flannel/.test(s) ? "shirt" : "jacket", color: color ?? 0x4a5058, pattern: "canvas" };
  if (slot === "legs") return { slot, kind: /snow|insul/.test(s) ? "insulated" : "jeans", color: color ?? 0x3a4050, pattern: "denim" };
  if (slot === "feet") return { slot, kind: /winter|insul/.test(s) ? "winter" : /boot/.test(s) ? "boot" : "sneaker", color: color ?? 0x4a3a2a, sole: 0x1c1610 };
  if (slot === "hands") return { slot, color: color ?? 0x3a3a3a };
  if (slot === "base") return { slot, kind: "tee", color: color ?? 0x9a9488 };
  if (slot === "wrap") return { slot, kind: "blanket", color: color ?? 0x5a4a3a, pattern: "plaid" };
  return { slot, color: color ?? 0x777777 };
}

function weaponKindOf(id, def) {
  const s = String(id || "");
  if (/flashlight/.test(s)) return "flashlight";
  if (/torch|flare/.test(s)) return "torch";
  if (/molotov/.test(s)) return "molotov";
  if (/knife/.test(s)) return "knife";
  if (/axe/.test(s)) return "axe";
  if (/bat/.test(s)) return "bat";
  if (/crowbar/.test(s)) return "crowbar";
  if (/wrench/.test(s)) return "wrench";
  if (/pipe/.test(s)) return "pipe";
  if (/shotgun|blaster|12ga/.test(s)) return "shotgun";
  if (/rifle|ar15|carbine/.test(s)) return "rifle";
  if (/pistol|revolver|9mm/.test(s)) return "pistol";
  if (def?.kind === "gun") return "pistol";
  if (def?.kind === "throw") return "molotov";
  return "pipe";
}

function ensure() {
  if (S) return S;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.id = "doll3d-canvas";
  canvas.className = "doll3d";
  canvas.setAttribute("aria-label", "3D character — drag to rotate");
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: "low-power",
    preserveDrawingBuffer: false, depth: true, stencil: false,
  });
  stats.renderersCreated++;
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x0c1016, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stats.contextLost++; });

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0c1016, 6, 12);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 30);
  camera.position.set(0, 1.02, 3.75);
  camera.lookAt(0, 0.86, 0);

  // Warm key, cool winter rim, soft hemi fill.
  scene.add(new THREE.HemisphereLight(0x8a9ab0, 0x1a1410, 0.75));
  const key = new THREE.DirectionalLight(0xffd2a0, 2.1);
  key.position.set(1.6, 2.6, 2.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7ab4ff, 1.9);
  rim.position.set(-2.2, 1.8, -2.6);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x5a6a80, 0.5);
  fill.position.set(-2, 0.6, 2);
  scene.add(fill);

  S = {
    canvas, renderer, scene, camera,
    geos: mkGeos(),
    yaw: 0.35, vel: 0, sway: 0, idleT: 0, t: 0,
    dragging: false, dragged: false, lastX: 0, lastT: 0, moved: 0,
    raf: 0, last: 0, running: false,
    sig: "", gear: null, gearMats: [], gearTex: [],
    hint: null, game: null,
  };
  buildStage();
  buildBody();
  bindDrag();
  loadBraithGLB();
  return S;
}

/**
 * Sculptor's braith_summer.glb replaces the procedural body once loaded (the procedural rig stays
 * as the instant fallback while it streams, and if it ever fails). Same single renderer.
 */
function loadBraithGLB() {
  if (S.glbState) return;
  S.glbState = "loading";
  getModel("braith_summer").then((g) => {
    if (!S || !g) { if (S) S.glbState = "failed"; return; }
    g.rotation.set(0, 0, 0);
    g.position.set(0, 0, 0);
    fitToGround(g, 1.66);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    g.name = "braith_glb";
    S.body.root.add(g);
    S.glb = g;
    S.glbState = "ready";
    stats.glb = true;
    applyGlbVisibility();
    if (S.game) syncMask(S.game);
  }).catch(() => { if (S) S.glbState = "failed"; });
}

function applyGlbVisibility() {
  if (!S || !S.glb) return;
  const B = S.body;
  for (const part of [B.hips, B.chest, B.head]) part.visible = false;
  // Procedural gear meshes ride on the hidden rig; the GLB is already dressed.
  for (const g of S.gear || []) if (g) g.visible = false;
}

function syncMask(game) {
  if (!S || !S.glb) return;
  const gear = game?.player?.gear || {};
  const masked = !!gear.face || !!game?.player?.filterOn;
  if (masked && !S.mask && !S.maskLoading) {
    S.maskLoading = true;
    attachBraithMask(S.glb).then((mk) => {
      S.maskLoading = false;
      if (!mk) return;
      S.mask = mk;
      const still = !!(S.game?.player?.gear?.face) || !!S.game?.player?.filterOn;
      mk.visible = still;
      setCapVisible(S.glb, !still);
      stats.mask = true;
    });
  } else if (S.mask) {
    S.mask.visible = masked;
    setCapVisible(S.glb, !masked);
  } else setCapVisible(S.glb, true);
}

function m(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02, flatShading: true, ...extra });
}
function box(parent, mat, x, y, z, sx, sy, sz, geo) {
  const mesh = new THREE.Mesh(geo || G().box, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

function buildStage() {
  // Turntable pedestal + soft shadow disc.
  const ped = new THREE.Mesh(G().cyl, m(0x1a2028, { roughness: 1 }));
  ped.scale.set(0.62, 0.05, 0.62);
  ped.position.y = -0.025;
  S.scene.add(ped);
  const rimRing = new THREE.Mesh(G().cyl, m(0x2c3846, { roughness: 1 }));
  rimRing.scale.set(0.64, 0.02, 0.64);
  rimRing.position.y = -0.045;
  S.scene.add(rimRing);
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(16, 16, 2, 16, 16, 16);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const sh = new THREE.Mesh(G().disc, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.002;
  sh.scale.setScalar(0.42);
  S.scene.add(sh);
}

function buildBody() {
  const root = new THREE.Group();
  S.scene.add(root);
  S.root = root;
  const skinM = m(PLAYER.skin, { roughness: 0.7 });
  const hairM = m(PLAYER.hair, { roughness: 1 });
  S.skinM = skinM;
  // Body parts (the "naked" base layer is a dark undersuit so missing slots still read clean).
  const under = m(0x2a2c30);
  const hips = new THREE.Group(); hips.position.y = 0.72; root.add(hips);
  const pelvis = box(hips, under, 0, 0, 0, 0.36, 0.16, 0.22);
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.09 * sx, -0.06, 0); hips.add(leg);
    const thigh = box(leg, under, 0, -0.16, 0, 0.13, 0.30, 0.13);
    const shin = box(leg, under, 0, -0.42, 0, 0.11, 0.26, 0.11);
    legs.push({ leg, thigh, shin });
  }
  const chest = new THREE.Group(); chest.position.y = 0.98; root.add(chest);
  const torso = box(chest, under, 0, 0, 0, 0.42, 0.48, 0.24);
  const arms = [];
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(0.27 * sx, 0.18, 0); chest.add(shoulder);
    const upper = box(shoulder, under, 0.02 * sx, -0.13, 0, 0.10, 0.27, 0.10);
    const elbow = new THREE.Group(); elbow.position.set(0.02 * sx, -0.27, 0); shoulder.add(elbow);
    const fore = box(elbow, under, 0, -0.12, 0.0, 0.09, 0.24, 0.09);
    const hand = box(elbow, skinM, 0, -0.28, 0.0, 0.085, 0.09, 0.085);
    const grip = new THREE.Group(); grip.position.set(0, -0.29, 0.02); elbow.add(grip);
    shoulder.rotation.z = 0.07 * sx;
    arms.push({ shoulder, upper, elbow, fore, hand, grip });
  }
  const head = new THREE.Group(); head.position.y = 1.32; root.add(head);
  box(head, skinM, 0, 0.0, 0, 0.075, 0.12, 0.075, G().cyl); // neck
  box(head, skinM, 0, 0.21, -0.01, 0.15, 0.165, 0.135, G().sphere);
  box(head, skinM, 0, 0.09, 0.03, 0.18, 0.12, 0.15);
  box(head, skinM, -0.155, 0.19, 0, 0.035, 0.05, 0.03, G().sphereLo);
  box(head, skinM, 0.155, 0.19, 0, 0.035, 0.05, 0.03, G().sphereLo);
  const faceTex = paintFace(PLAYER);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.2), new THREE.MeshStandardMaterial({
    map: faceTex, roughness: 0.7, metalness: 0, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.35,
  }));
  face.position.set(0, 0.165, 0.163);
  head.add(face);
  const hair = box(head, hairM, 0, 0.29, -0.02, 0.157, 0.075, 0.152, G().sphere);
  S.body = { root, hips, pelvis, legs, chest, torso, arms, head, hair, under };
}

function clearGear() {
  if (S.gear) {
    S.gear.forEach((g) => g.parent && g.parent.remove(g));
  }
  for (const mt of S.gearMats) mt.dispose();
  for (const t of S.gearTex) t.dispose();
  S.gear = [];
  S.gearMats = [];
  S.gearTex = [];
}
function gm(color, pattern, extra) {
  let map = null;
  if (pattern) { map = fabricTex(pattern, color); S.gearTex.push(map); }
  const mt = m(map ? 0xffffff : color, map ? { map, ...extra } : extra);
  S.gearMats.push(mt);
  return mt;
}
function gbox(parent, mat, x, y, z, sx, sy, sz, geo) {
  const mesh = box(parent, mat, x, y, z, sx, sy, sz, geo);
  S.gear.push(mesh);
  return mesh;
}

function gearSignature(game) {
  const g = game?.player?.gear || {};
  const parts = [];
  for (const k of Object.keys(g).sort()) parts.push(k + ":" + (g[k]?.id || ""));
  parts.push("eq:" + (game?.player?.equipped || ""));
  return parts.join("|");
}

function buildGear(game) {
  clearGear();
  stats.gearBuilds++;
  const B = S.body;
  const items = game?.systems?.items || {};
  const gear = game?.player?.gear || {};
  const idOf = (slot) => gear[slot]?.id || null;
  const L = (slot) => { const id = idOf(slot); return id ? lookFor(slot, id, items[id]) : null; };
  const head = L("head"), face = gear.face ? (gear.face.virtual ? lookFor("face", "gas_mask", null) : L("face")) : null;
  const torso = L("torso"), base = L("base"), hands = L("hands"), legs = L("legs"), feet = L("feet"), wrap = L("wrap");
  const pack = L("back") || L("pack");

  // ---- base / torso layers
  const shirt = base ? gm(base.color, base.pattern) : null;
  const top = torso || null;
  const topM = top ? gm(top.color, top.pattern) : (shirt || B.under);
  const sleeveM = topM;
  // torso shell
  const bulk = top?.kind === "parka" ? 0.06 : top?.kind === "coat" ? 0.03 : top ? 0.02 : 0;
  gbox(B.chest, topM, 0, 0, 0.005, 0.44 + bulk, 0.5, 0.26 + bulk);
  if (top) {
    // collar + zip / placket + pockets
    const trim = gm(shadeN(top.color, top.kind === "parka" ? 30 : -22));
    gbox(B.chest, trim, 0, 0.23, 0.0, 0.34 + bulk, 0.07, 0.28 + bulk);
    gbox(B.chest, gm(0x15161a), 0, -0.01, 0.135 + bulk / 2, 0.025, 0.42, 0.02);
    gbox(B.chest, trim, -0.12, -0.13, 0.14 + bulk / 2, 0.12, 0.1, 0.03);
    gbox(B.chest, trim, 0.12, -0.13, 0.14 + bulk / 2, 0.12, 0.1, 0.03);
    if (top.kind === "parka") {
      // fur-lined hood bunched behind the neck
      gbox(B.chest, gm(0xd8d0c0, "knit"), 0, 0.28, -0.1, 0.36, 0.12, 0.14);
      gbox(B.chest, topM, 0, 0.2, -0.17, 0.32, 0.2, 0.1);
    }
    if (top.kind === "coat" || top.kind === "parka") {
      // long hem over the hips
      gbox(B.hips, topM, 0, -0.08, 0.005, 0.44 + bulk, 0.26, 0.26 + bulk);
      gbox(B.hips, gm(0x15161a), 0, -0.08, 0.135 + bulk / 2, 0.025, 0.24, 0.02);
    }
    if (top.kind === "vest" && shirt) {
      // vest shows shirt sleeves
    }
  } else if (shirt) {
    gbox(B.chest, gm(shadeN(base.color, -20)), 0, 0.22, 0.0, 0.2, 0.04, 0.25);
  }
  // belt
  gbox(B.chest, gm(0x2a2018), 0, -0.235, 0, 0.45 + bulk, 0.05, 0.27 + bulk);
  gbox(B.chest, gm(0x9a8a60, null, { metalness: 0.6, roughness: 0.4 }), 0, -0.235, 0.14 + bulk / 2, 0.05, 0.04, 0.02);
  // sleeves
  const armM = top && top.kind !== "vest" ? sleeveM : (shirt || B.under);
  for (const a of B.arms) {
    gbox(a.shoulder, armM, a.upper.position.x, -0.13, 0, 0.12 + bulk, 0.29, 0.12 + bulk);
    gbox(a.elbow, armM, 0, -0.11, 0, 0.11 + bulk, 0.24, 0.11 + bulk);
    if (top && (top.kind === "parka" || top.kind === "coat")) gbox(a.elbow, gm(shadeN(top.color, -26)), 0, -0.23, 0, 0.12 + bulk, 0.04, 0.12 + bulk);
    if (hands) {
      const gl = gm(hands.color, "knit");
      const s = hands.bulky ? 0.11 : 0.095;
      gbox(a.elbow, gl, 0, -0.28, 0, s, 0.1, s);
    }
  }
  // ---- legs
  const legM = legs ? gm(legs.color, legs.pattern) : B.under;
  const lb = legs?.kind === "insulated" ? 0.03 : 0.01;
  gbox(B.hips, legM, 0, 0, 0, 0.38 + lb, 0.17, 0.24 + lb);
  for (const l of B.legs) {
    gbox(l.leg, legM, 0, -0.16, 0, 0.14 + lb, 0.31, 0.14 + lb);
    gbox(l.leg, legM, 0, -0.41, 0, 0.125 + lb, 0.27, 0.125 + lb);
    if (legs?.kind === "jeans") gbox(l.leg, gm(shadeN(legs.color, 28)), 0, -0.12, 0.072 + lb, 0.1, 0.01, 0.005);
    if (legs?.kind === "cargo") gbox(l.leg, gm(shadeN(legs.color, -18)), 0.07 * Math.sign(l.leg.position.x), -0.2, 0, 0.04, 0.12, 0.1);
    if (legs?.kind === "insulated") gbox(l.leg, gm(shadeN(legs.color, -14)), 0, -0.29, 0, 0.16, 0.03, 0.16);
  }
  // ---- feet
  for (const l of B.legs) {
    const f = feet || { kind: "sock", color: 0x2a2a2a, sole: 0x1a1a1a };
    const tall = f.kind === "winter" ? 0.2 : f.kind === "boot" ? 0.15 : 0.1;
    const wide = f.kind === "winter" ? 0.16 : 0.135;
    const upperM = gm(f.color, f.kind === "winter" ? "quilt" : null);
    gbox(l.leg, upperM, 0, -0.6 + tall / 2 + 0.02, 0.025, wide, tall, 0.22);
    gbox(l.leg, upperM, 0, -0.6 + 0.05, 0.12, wide * 0.95, 0.07, 0.06);
    gbox(l.leg, gm(f.sole), 0, -0.645, 0.03, wide + 0.01, 0.03, 0.24);
    if (f.kind === "sneaker") gbox(l.leg, gm(0xe8e4dc), 0, -0.6, 0.15, wide * 0.8, 0.04, 0.02);
    if (f.kind === "boot" || f.kind === "winter") gbox(l.leg, gm(shadeN(f.color, -30)), 0, -0.6 + tall + 0.01, 0.02, wide + 0.01, 0.025, 0.2);
    if (f.kind === "winter") gbox(l.leg, gm(0xd8d0c0, "knit"), 0, -0.6 + tall + 0.035, 0.02, wide + 0.02, 0.04, 0.2);
  }
  // ---- head
  B.hair.visible = !(head && (head.kind === "balaclava" || head.kind === "beanie" || head.kind === "hardhat"));
  if (head) {
    const hm = gm(head.color, head.pattern);
    if (head.kind === "beanie") {
      gbox(B.head, hm, 0, 0.3, -0.01, 0.168, 0.13, 0.16, G().cap);
      gbox(B.head, gm(shadeN(head.color, -24), "knit"), 0, 0.3, -0.01, 0.172, 0.035, 0.165, G().cyl);
      gbox(B.head, gm(0xe8e0d0, "knit"), 0, 0.44, -0.01, 0.04, 0.04, 0.04, G().sphereLo);
    } else if (head.kind === "cap") {
      gbox(B.head, hm, 0, 0.29, -0.01, 0.162, 0.09, 0.155, G().cap);
      gbox(B.head, hm, 0, 0.3, 0.14, 0.15, 0.018, 0.12);
    } else if (head.kind === "hardhat") {
      gbox(B.head, gm(head.color, null, { roughness: 0.4 }), 0, 0.3, -0.01, 0.18, 0.13, 0.17, G().cap);
      gbox(B.head, gm(head.color, null, { roughness: 0.4 }), 0, 0.3, 0.0, 0.22, 0.015, 0.21, G().cyl);
    } else if (head.kind === "balaclava") {
      gbox(B.head, hm, 0, 0.2, -0.015, 0.165, 0.18, 0.15, G().hood);
      gbox(B.head, hm, 0, 0.27, -0.03, 0.17, 0.12, 0.15, G().cap);
      gbox(B.head, hm, 0, 0.06, 0.03, 0.19, 0.12, 0.16);
      gbox(B.head, hm, 0, 0.0, 0, 0.09, 0.1, 0.09, G().cyl);
    }
  }
  // ---- face / mask
  if (face) {
    if (face.kind === "gasmask") {
      const mk = gm(0x23282a, null, { roughness: 0.6 });
      gbox(B.head, mk, 0, 0.12, 0.13, 0.16, 0.14, 0.1);
      const lens = gm(0x6a8aa0, null, { roughness: 0.2, metalness: 0.4, emissive: 0x1a2a34 });
      gbox(B.head, lens, -0.055, 0.18, 0.18, 0.045, 0.04, 0.01, G().cyl).rotation.x = Math.PI / 2;
      gbox(B.head, lens, 0.055, 0.18, 0.18, 0.045, 0.04, 0.01, G().cyl).rotation.x = Math.PI / 2;
      const can = gm(0x4a5240, null, { roughness: 0.5, metalness: 0.3 });
      for (const sx of [-1, 1]) {
        const c = gbox(B.head, can, 0.085 * sx, 0.06, 0.2, 0.045, 0.08, 0.045, G().cyl6);
        c.rotation.x = Math.PI / 2 - 0.3; c.rotation.z = 0.5 * sx;
      }
      gbox(B.head, gm(0x15161a), 0, 0.18, 0, 0.17, 0.02, 0.16, G().cyl);
    } else if (face.kind === "scarf" || face.kind === "bandana") {
      gbox(B.head, gm(face.color, face.pattern), 0, 0.05, 0.03, 0.2, 0.11, 0.18);
      if (face.kind === "scarf") gbox(B.chest, gm(face.color, face.pattern), 0.1, 0.1, 0.15, 0.06, 0.2, 0.03);
    } else if (face.kind === "goggles") {
      gbox(B.head, gm(0x1a1a1a), 0, 0.2, 0.15, 0.17, 0.05, 0.06);
      gbox(B.head, gm(0x8aa0b8, null, { metalness: 0.5, roughness: 0.2 }), 0, 0.2, 0.18, 0.14, 0.035, 0.01);
    }
  }
  // ---- wrap
  if (wrap) {
    const wm = gm(wrap.color, wrap.pattern);
    if (wrap.kind === "poncho") {
      gbox(B.chest, wm, 0, 0.02, 0, 0.62, 0.5, 0.34, G().cone).rotation.y = Math.PI / 6;
    } else {
      gbox(B.chest, wm, 0, 0.18, -0.02, 0.56, 0.1, 0.34);
      gbox(B.chest, wm, 0, -0.05, -0.16, 0.5, 0.5, 0.05);
      gbox(B.chest, wm, -0.24, 0.0, 0.0, 0.06, 0.38, 0.3);
      gbox(B.chest, wm, 0.24, 0.0, 0.0, 0.06, 0.38, 0.3);
    }
  }
  // ---- satchel (always — it's the BAG) with cross strap
  const strap = gm(0x3a2a1c);
  const satM = gm(0x5a4630, "canvas");
  const sbulk = bulk / 2;
  const st = gbox(B.chest, strap, 0, 0.0, 0.14 + sbulk, 0.035, 0.62, 0.015);
  st.rotation.z = -0.62;
  const st2 = gbox(B.chest, strap, 0, 0.0, -0.14 - sbulk, 0.035, 0.62, 0.015);
  st2.rotation.z = 0.62;
  gbox(B.hips, satM, -0.24 - sbulk, 0.02, 0.02, 0.09, 0.2, 0.22);
  gbox(B.hips, gm(0x4a3824), -0.25 - sbulk, 0.08, 0.02, 0.1, 0.08, 0.23);
  // ---- backpack (if a pack slot exists in this build)
  if (pack) {
    const pm = gm(pack.color || 0x3a4a3a, "canvas");
    gbox(B.chest, pm, 0, 0.02, -0.22 - sbulk, 0.34, 0.44, 0.18);
    gbox(B.chest, gm(shadeN(pack.color || 0x3a4a3a, -20)), 0, -0.1, -0.32 - sbulk, 0.26, 0.16, 0.05);
    gbox(B.chest, gm(0x5a3a2a), 0, 0.27, -0.24 - sbulk, 0.3, 0.1, 0.12, G().cyl).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) gbox(B.chest, strap, 0.12 * sx, 0.05, 0.14 + sbulk, 0.04, 0.42, 0.015);
  }
  // ---- weapons
  const mainId = gear.main_hand?.id || game?.player?.equipped || null;
  const offId = gear.off_hand?.id || null;
  const [lArm, rArm] = B.arms;
  rArm.shoulder.rotation.x = 0; rArm.elbow.rotation.x = 0;
  lArm.shoulder.rotation.x = 0; lArm.elbow.rotation.x = 0;
  if (mainId) {
    const k = weaponKindOf(mainId, items[mainId]);
    buildWeapon(rArm.grip, k);
    if (k === "rifle" || k === "shotgun") { rArm.shoulder.rotation.x = -0.15; rArm.elbow.rotation.x = -0.9; }
    else if (k === "pistol" || k === "flashlight") { rArm.elbow.rotation.x = -0.55; }
    else { rArm.elbow.rotation.x = -0.35; }
  }
  if (offId) {
    const k = weaponKindOf(offId, items[offId]);
    buildWeapon(lArm.grip, k);
    lArm.elbow.rotation.x = -0.45;
  }
  S.mainKind = mainId ? weaponKindOf(mainId, items[mainId]) : null;
}

function buildWeapon(grip, k) {
  const metal = gm(0x2a2e33, null, { metalness: 0.6, roughness: 0.45 });
  const steel = gm(0x9aa4ac, null, { metalness: 0.7, roughness: 0.3 });
  const wood = gm(0x6a4428, "canvas");
  const g = new THREE.Group();
  grip.add(g);
  S.gear.push(g);
  const b = (mat, x, y, z, sx, sy, sz, geo) => box(g, mat, x, y, z, sx, sy, sz, geo);
  if (k === "knife") {
    b(gm(0x1c1a18), 0, 0, 0, 0.03, 0.09, 0.03);
    b(steel, 0, 0, 0.11, 0.012, 0.035, 0.16);
    b(metal, 0, 0, 0.035, 0.05, 0.05, 0.012);
  } else if (k === "pistol") {
    b(metal, 0, -0.01, 0, 0.035, 0.1, 0.05).rotation.x = -0.25;
    b(metal, 0, 0.05, 0.06, 0.035, 0.05, 0.17);
    b(gm(0x101214), 0, 0.05, 0.15, 0.02, 0.02, 0.01);
  } else if (k === "shotgun" || k === "rifle") {
    const long = k === "rifle" ? 0.62 : 0.5;
    b(wood, 0, -0.03, -0.12, 0.05, 0.08, 0.22);
    b(metal, 0, 0.0, 0.08, 0.055, 0.07, 0.2);
    b(metal, 0, 0.02, 0.08 + long / 2, 0.022, 0.022, long, G().cyl).rotation.x = Math.PI / 2;
    if (k === "shotgun") b(wood, 0, -0.02, 0.3, 0.05, 0.05, 0.14);
    else b(metal, 0, 0.06, 0.08, 0.025, 0.03, 0.12);
    g.rotation.x = -0.6;
  } else if (k === "axe") {
    b(wood, 0, 0, 0.1, 0.035, 0.035, 0.6);
    b(gm(0x9a2a1c, null, { metalness: 0.4 }), 0, 0.06, 0.38, 0.02, 0.14, 0.09);
    b(steel, 0, 0.13, 0.38, 0.022, 0.03, 0.1);
    g.rotation.x = 0.5;
  } else if (k === "bat") {
    b(wood, 0, 0, 0.25, 0.04, 0.04, 0.55, G().cyl6).rotation.x = Math.PI / 2;
    b(wood, 0, 0, 0.48, 0.06, 0.06, 0.18, G().cyl6).rotation.x = Math.PI / 2;
    g.rotation.x = 0.6;
  } else if (k === "crowbar" || k === "pipe" || k === "wrench") {
    const mat = k === "crowbar" ? gm(0x7a1c1c, null, { metalness: 0.5 }) : steel;
    b(mat, 0, 0, 0.22, 0.03, 0.03, 0.5, G().cyl6).rotation.x = Math.PI / 2;
    if (k === "crowbar") b(mat, 0, 0.05, 0.47, 0.025, 0.12, 0.025).rotation.x = 0.6;
    if (k === "wrench") b(mat, 0, 0, 0.48, 0.03, 0.1, 0.06);
    if (k === "pipe") b(metal, 0, 0, 0.46, 0.045, 0.045, 0.05, G().cyl6).rotation.x = Math.PI / 2;
    g.rotation.x = 0.6;
  } else if (k === "flashlight") {
    b(gm(0x1a1c20, null, { metalness: 0.5 }), 0, 0, 0.06, 0.03, 0.03, 0.18, G().cyl).rotation.x = Math.PI / 2;
    b(gm(0xffe6a0, null, { emissive: 0xffd070, emissiveIntensity: 1.6 }), 0, 0, 0.16, 0.038, 0.02, 0.038, G().cyl).rotation.x = Math.PI / 2;
  } else if (k === "torch") {
    b(wood, 0, 0, 0.12, 0.03, 0.03, 0.3, G().cyl6).rotation.x = Math.PI / 2;
    b(gm(0xff8a30, null, { emissive: 0xff6a10, emissiveIntensity: 2 }), 0, 0, 0.3, 0.05, 0.08, 0.05, G().cone).rotation.x = Math.PI / 2;
    g.rotation.x = 0.9;
  } else if (k === "molotov") {
    b(gm(0x3a5a3a, null, { roughness: 0.2 }), 0, 0, 0.04, 0.04, 0.12, 0.04, G().cyl);
    b(gm(0xd8d0c0), 0, 0.09, 0.04, 0.02, 0.06, 0.02);
  }
}

function bindDrag() {
  const c = S.canvas;
  c.style.touchAction = "none";
  const down = (e) => {
    S.dragging = true; S.moved = 0;
    S.lastX = e.clientX; S.lastT = performance.now();
    S.vel = 0;
    try { c.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const move = (e) => {
    if (!S.dragging) return;
    const r = c.getBoundingClientRect();
    const dx = e.clientX - S.lastX;
    const now = performance.now();
    const dyaw = (dx / Math.max(60, r.width)) * Math.PI * 1.6;
    S.yaw += dyaw;
    S.moved += Math.abs(dx);
    const dt = Math.max(8, now - S.lastT) / 1000;
    S.vel = S.vel * 0.4 + (dyaw / dt) * 0.6;
    S.lastX = e.clientX; S.lastT = now;
    S.idleT = 0;
    if (S.moved > 6 && !S.dragged) { S.dragged = true; if (S.hint) S.hint.classList.add("gone"); }
  };
  const up = (e) => {
    if (!S.dragging) return;
    S.dragging = false;
    if (performance.now() - S.lastT > 90) S.vel = 0;
    S.vel = Math.max(-9, Math.min(9, S.vel));
    try { c.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  c.addEventListener("pointerdown", down);
  c.addEventListener("pointermove", move);
  c.addEventListener("pointerup", up);
  c.addEventListener("pointercancel", up);
}

function frame(now) {
  if (!S || !S.running) return;
  if (!S.canvas.isConnected) { stopDoll3D(); return; }
  S.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (S.last || now)) / 1000);
  S.last = now;
  S.t += dt;
  if (!S.dragging) {
    S.yaw += S.vel * dt;
    S.vel *= Math.pow(0.04, dt);
    if (Math.abs(S.vel) < 0.02) S.vel = 0;
    S.idleT += dt;
  }
  const swayTarget = (!S.dragging && S.idleT > 1.4) ? 0.21 : 0;
  S.sway += (swayTarget - S.sway) * Math.min(1, dt * 1.5);
  const B = S.body;
  B.root.rotation.y = S.yaw + Math.sin(S.t * 0.55) * S.sway;
  B.chest.scale.y = 1 + Math.sin(S.t * 2.0) * 0.016;
  B.chest.position.y = 0.98 + Math.sin(S.t * 2.0) * 0.004;
  B.head.position.y = 1.32 + Math.sin(S.t * 2.0) * 0.006;
  B.head.rotation.y = Math.sin(S.t * 0.37) * 0.18 * (S.sway / 0.21 || 0);
  B.head.rotation.x = Math.sin(S.t * 0.6) * 0.03;
  for (const [i, a] of B.arms.entries()) a.shoulder.rotation.z = (i ? 1 : -1) * (0.07 + Math.sin(S.t * 2.0) * 0.012);
  S.renderer.render(S.scene, S.camera);
  stats.frames++;
}

/** Mount (or re-mount) the singleton 3D doll in `host`, sync gear, start the loop. */
export function mountDoll3D(host, game) {
  ensure();
  S.game = game;
  if (S.canvas.parentNode !== host) host.appendChild(S.canvas);
  if (!S.hint || !S.hint.isConnected || S.hint.parentNode !== host) {
    const h = document.createElement("div");
    h.className = "doll3d-hint" + (S.dragged ? " gone" : "");
    h.textContent = "↻ DRAG";
    host.appendChild(h);
    S.hint = h;
  }
  syncDoll3D(game);
  stats.mounts++;
  if (!S.running) {
    S.running = true;
    S.last = 0;
    S.raf = requestAnimationFrame(frame);
  }
  return S.canvas;
}

export function syncDoll3D(game) {
  if (!S) return;
  const sig = gearSignature(game);
  if (sig !== S.sig || !S.gear) {
    S.sig = sig;
    buildGear(game);
  }
  applyGlbVisibility();
  syncMask(game);
}

export function stopDoll3D() {
  if (!S) return;
  if (S.running) stats.unmounts++;
  S.running = false;
  if (S.raf) cancelAnimationFrame(S.raf);
  S.raf = 0;
  S.dragging = false;
}

/** True when this click on the canvas was really a drag (suppress slot pick). */
export function doll3DWasDrag() {
  return !!S && S.moved > 6;
}

export function doll3DDebug() {
  const gl = S?.renderer?.getContext?.();
  return {
    ...stats,
    exists: !!S,
    running: !!S?.running,
    yaw: S ? S.yaw : 0,
    displayYaw: S ? S.body.root.rotation.y : 0,
    glError: gl ? gl.getError() : null,
    isWebGL2: !!(gl && typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext),
    contextLost: gl ? gl.isContextLost() : null,
    gearMeshes: S?.gear?.length || 0,
    glb: S?.glbState || null,
    masked: !!(S?.mask && S.mask.visible),
    mainKind: S?.mainKind || null,
    sig: S?.sig || "",
    width: W, height: H,
    geometries: S?.renderer?.info?.memory?.geometries ?? null,
    textures: S?.renderer?.info?.memory?.textures ?? null,
    programs: S?.renderer?.info?.programs?.length ?? null,
  };
}

/** Render one frame synchronously and read back pixels (test hook). */
export function doll3DSnapshot() {
  if (!S) return null;
  S.renderer.render(S.scene, S.camera);
  const gl = S.renderer.getContext();
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let nonBg = 0, hash = 0;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if (Math.abs(r - 12) + Math.abs(g - 16) + Math.abs(b - 22) > 24) nonBg++;
    hash = (Math.imul(hash, 31) + r * 3 + g * 5 + b * 7) | 0;
  }
  return { nonBg, total: W * H, hash, glError: gl.getError() };
}

if (typeof window !== "undefined") {
  window.__ASHFALL_DOLL3D = { debug: doll3DDebug, snapshot: doll3DSnapshot, stats };
}
