/** Stylized low-poly people: shared geos, 128px nearest face textures, idle + look-at. */
import * as THREE from "three";

const TRAITS = {
  theo:        { coat: 0x4a5560, pants: 0x2a3038, boot: 0x1c1814, hood: 0x2a3038, skin: 0xb88860, hair: 0x6a6560, hairStyle: "short", beard: "stubble", glasses: false, iris: "#3a4a28", brow: "heavy", lined: true },
  marguerite:  { coat: 0x5a4638, pants: 0x3a2e26, boot: 0x2a1c16, hood: 0x3a2e26, skin: 0xc4a07a, hair: 0x5a3a28, hairStyle: "bun", beard: "none", glasses: true, iris: "#4a3a28", brow: "soft", lined: true },
  ray:         { coat: 0x3e4a3a, pants: 0x2a3228, boot: 0x2a2420, hood: 0x2a3228, skin: 0xb89068, hair: 0x3a3028, hairStyle: "cap", beard: "beard", glasses: false, iris: "#3a3020", brow: "heavy" },
  wren:        { coat: 0x3a3a48, pants: 0x1c1c24, boot: 0x1a1818, hood: 0x1c1c24, skin: 0xc8a888, hair: 0x1c1410, hairStyle: "hood", beard: "none", glasses: false, iris: "#2a3a4a", brow: "sharp" },
  lou:         { coat: 0x4a4a40, pants: 0x2c2c28, boot: 0x2a2018, hood: 0x2c2c28, skin: 0xc4a07a, hair: 0x8a7a60, hairStyle: "short", beard: "stubble", glasses: true, iris: "#4a5040" },
  hank:        { coat: 0x4a4038, pants: 0x2a2420, boot: 0x1c1612, hood: 0x2a2420, skin: 0xb07a58, hair: 0x2a2018, hairStyle: "beanie", beard: "beard", glasses: false, iris: "#2a2018", brow: "heavy", lined: true },
  strand:      { coat: 0x3a4450, pants: 0x1c242c, boot: 0x161418, hood: 0x1c242c, skin: 0xc8b090, hair: 0xc8c0b0, hairStyle: "short", beard: "none", glasses: false, iris: "#4a6070" },
  bea:         { coat: 0x5a3a38, pants: 0x3a2424, boot: 0x2a1818, hood: 0x3a2424, skin: 0xc09070, hair: 0x2a1814, hairStyle: "bangs", beard: "none", glasses: false, iris: "#3a2018" },
  jory:        { coat: 0x3a3f34, pants: 0x22261e, boot: 0x1a1c16, hood: 0x22261e, skin: 0xc4a888, hair: 0x3a3020, hairStyle: "short", beard: "stubble", glasses: false, iris: "#3a4a30" },
  cody:        { coat: 0x4a4038, pants: 0x2a2420, boot: 0x1c1814, hood: 0x2a2420, skin: 0xd0b090, hair: 0x8a6038, hairStyle: "short", beard: "none", glasses: false, iris: "#3a5528" },
  ames:        { coat: 0x4a4e55, pants: 0x2a2e34, boot: 0x1c1c20, hood: 0x2a2e34, skin: 0xb89878, hair: 0x4a4038, hairStyle: "beanie", beard: "stubble", glasses: false, iris: "#304050", lined: true },
  cpl_haas:    { coat: 0x3a4450, pants: 0x1a2028, boot: 0x161418, hood: 0x1a2028, skin: 0xb89070, hair: 0x2a2820, hairStyle: "short", beard: "none", glasses: false, iris: "#2a3028", brow: "heavy" },
  haas:        { coat: 0x3a4450, pants: 0x1a2028, boot: 0x161418, hood: 0x1a2028, skin: 0xb89070, hair: 0x2a2820, hairStyle: "short", beard: "none", glasses: false, iris: "#2a3028", brow: "heavy" },
  ruiz:        { coat: 0x3a4038, pants: 0x1c1c18, boot: 0x161410, hood: 0x1c1c18, skin: 0x8a6238, hair: 0x1a1210, hairStyle: "short", beard: "stubble", glasses: false, iris: "#2a2010" },
  husk:        { coat: 0x4a4038, pants: 0x2a2420, boot: 0x1a1612, hood: 0x2a2018, skin: 0x8a735c, hair: 0x3a3028, hairStyle: "wisps", beard: "none", glasses: false, iris: "#4a3020", scar: true, hollow: true },
  raider:      { coat: 0x3a3430, pants: 0x2a2420, boot: 0x1a1612, hood: 0x2a2420, skin: 0xc4a07a, hair: 0x1c1410, hairStyle: "hood", beard: "stubble", glasses: false, iris: "#3a2018", brow: "heavy" },
  looter:      { coat: 0x3e3a34, pants: 0x2a2620, boot: 0x1a1612, hood: 0x2a2620, skin: 0xc0a080, hair: 0x3a2a20, hairStyle: "beanie", beard: "none", glasses: false, iris: "#3a3020" },
  army:        { coat: 0x3a4034, pants: 0x2a3228, boot: 0x1c1c18, hood: 0x1a2018, skin: 0x8a735c, hair: 0x2a2820, hairStyle: "short", beard: "stubble", glasses: false, iris: "#2a3020", brow: "heavy" },
};

let GEOS;
function geos() {
  if (GEOS) return GEOS;
  GEOS = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 8, 6),
    sphereLo: new THREE.SphereGeometry(1, 6, 5),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
    hood: new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58),
  };
  return GEOS;
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.02, ...extra });
}

function add(parent, geo, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (sx != null) m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cssHex(n) {
  return "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6);
}

function shade(hex, amt) {
  const n = typeof hex === "number" ? hex : parseInt(String(hex).replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export function paintFace(t) {
  const S = 32, P = 4;
  const c = document.createElement("canvas");
  c.width = c.height = S * P;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const skin = cssHex(t.skin);
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * P, y * P, w * P, h * P); };
  px(0, 0, S, S, skin);
  px(8, 2, 16, 8, shade(t.skin, t.hollow ? -30 : -12));
  if (t.hairStyle !== "bald") {
    const hair = cssHex(t.hair);
    px(6, 0, 20, 6, hair);
    px(5, 2, 4, 7, hair);
    px(23, 2, 4, 7, hair);
    if (t.hairStyle === "bangs" || t.hairStyle === "bun") px(8, 5, 16, 3, hair);
  }
  const browY = 11;
  const browC = shade(t.hair || t.skin, t.brow === "soft" ? 20 : -20);
  const browH = t.brow === "heavy" ? 2 : 1;
  px(8, browY, 6, browH, browC);
  px(18, browY, 6, browH, browC);
  // eyes: sclera, iris, pupil, lids
  const eyeY = 13;
  for (const ex of [9, 19]) {
    if (t.hollow) {
      px(ex, eyeY, 5, 4, "#1a100c");
      px(ex + 1, eyeY + 1, 3, 2, t.iris || "#4a3020");
    } else {
      px(ex, eyeY, 6, 4, "#f4f1ea");
      px(ex + 1, eyeY, 4, 4, t.iris || "#3a4a30");
      px(ex + 2, eyeY + 1, 2, 2, "#0a0a0a");
      px(ex + 2, eyeY + 1, 1, 1, "#e8eef4");
      px(ex, eyeY, 6, 1, shade(t.skin, -30));
      px(ex, eyeY + 4, 6, 1, shade(t.skin, -12));
    }
  }
  // nose bridge + tip
  px(15, 14, 2, 5, shade(t.skin, -18));
  px(14, 18, 4, 2, shade(t.skin, -28));
  // mouth
  px(13, 22, 6, 1, t.hollow ? "#3a2018" : "#5a302c");
  px(14, 23, 4, 1, shade(t.skin, -8));
  if (t.lined) {
    px(7, 17, 3, 1, shade(t.skin, -22));
    px(22, 17, 3, 1, shade(t.skin, -22));
    px(12, 25, 8, 1, shade(t.skin, -16));
  }
  if (t.beard === "stubble") {
    const st = shade(t.hair || t.skin, -45);
    for (let y = 21; y <= 26; y++) {
      for (let x = 11; x <= 20; x++) {
        if (y <= 23 && x >= 13 && x <= 18) continue;
        if (((x * 5) ^ (y * 11) ^ (x * y)) % 3 === 1) px(x, y, 1, 1, st);
      }
    }
  }
  if (t.beard === "beard") {
    px(10, 21, 12, 7, cssHex(t.hair));
    px(13, 22, 6, 1, shade(t.skin, -20));
  }
  if (t.glasses) {
    px(8, 13, 6, 4, "#1a1a1a");
    px(9, 14, 4, 2, "#8aa0b8");
    px(18, 13, 6, 4, "#1a1a1a");
    px(19, 14, 4, 2, "#8aa0b8");
    px(14, 14, 4, 1, "#1a1a1a");
  }
  if (t.scar) {
    px(20, 10, 1, 8, "#8a5048");
    px(21, 11, 1, 6, shade(t.skin, -35));
  }
  if (t.freckles) {
    for (const [x, y] of [[12, 18], [19, 19], [11, 20], [20, 17]]) px(x, y, 1, 1, shade(t.skin, -30));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function resolveTraits(opts = {}) {
  const base = TRAITS[opts.id] || TRAITS[opts.role] || {};
  const coat = opts.color ?? opts.coat ?? base.coat ?? 0x3a4550;
  const hood = opts.hood ?? base.hood ?? 0x2a3038;
  const skin = opts.skin ?? base.skin ?? 0xc4a07a;
  return { ...base, ...opts, coat, hood, skin, pants: opts.pants ?? base.pants ?? 0x2a3038, boot: opts.boot ?? base.boot ?? 0x1c1814, hair: opts.hair ?? base.hair ?? 0x2a2420, hairStyle: opts.hairStyle ?? base.hairStyle ?? "short", iris: opts.iris ?? base.iris ?? "#3a4a30" };
}

/**
 * Articulated stylized human, ~400–550 tris, 128×128 nearest face.
 * Faces +Z. Options: id, color/coat, hood, skin, role.
 */
export function makePerson(opts = {}) {
  const t = resolveTraits(opts);
  const G = geos();
  const root = new THREE.Group();
  const coatM = mat(t.coat);
  const pantsM = mat(t.pants);
  const bootM = mat(t.boot);
  const skinM = mat(t.skin, { roughness: 0.65 });
  const hairM = mat(t.hair, { roughness: 0.95 });
  const hoodMtl = mat(t.hood, { side: THREE.DoubleSide, roughness: 1 });

  const hips = add(root, G.box, pantsM, 0, 0.70, 0, 0.36, 0.16, 0.22);
  add(root, G.box, pantsM, -0.09, 0.50, 0, 0.12, 0.28, 0.12);
  add(root, G.box, pantsM, 0.09, 0.50, 0, 0.12, 0.28, 0.12);
  add(root, G.box, pantsM, -0.09, 0.28, 0, 0.10, 0.26, 0.10);
  add(root, G.box, pantsM, 0.09, 0.28, 0, 0.10, 0.26, 0.10);
  add(root, G.box, bootM, -0.09, 0.10, 0.02, 0.13, 0.12, 0.20);
  add(root, G.box, bootM, 0.09, 0.10, 0.02, 0.13, 0.12, 0.20);

  const chest = new THREE.Group();
  chest.position.y = 0.96;
  root.add(chest);
  add(chest, G.box, coatM, 0, 0, 0.01, 0.44, 0.50, 0.26);
  add(chest, G.box, coatM, -0.22, 0.16, 0, 0.16, 0.14, 0.22);
  add(chest, G.box, coatM, 0.22, 0.16, 0, 0.16, 0.14, 0.22);
  add(chest, G.box, mat(shade(t.coat, 24)), 0, 0.18, 0.135, 0.28, 0.08, 0.05);
  add(chest, G.box, mat(0x1a1a1a), 0, -0.02, 0.135, 0.03, 0.36, 0.02);
  add(chest, G.box, mat(shade(t.coat, -18)), -0.12, -0.12, 0.14, 0.12, 0.10, 0.04);
  add(chest, G.box, mat(shade(t.coat, -18)), 0.12, -0.12, 0.14, 0.12, 0.10, 0.04);
  add(chest, G.box, mat(0x2a2420), 0, -0.22, 0, 0.46, 0.05, 0.28);
  if (t.hairStyle !== "hood") {
    add(chest, G.box, mat(0x3a342c), 0, 0.04, -0.16, 0.28, 0.32, 0.10);
  }
  add(chest, G.box, coatM, -0.30, 0.06, 0, 0.10, 0.28, 0.10);
  add(chest, G.box, coatM, 0.30, 0.06, 0, 0.10, 0.28, 0.10);
  add(chest, G.box, coatM, -0.32, -0.16, 0.02, 0.09, 0.24, 0.09);
  add(chest, G.box, coatM, 0.32, -0.16, 0.02, 0.09, 0.24, 0.09);
  add(chest, G.box, mat(shade(t.hood, -10)), -0.32, -0.30, 0.02, 0.11, 0.08, 0.11);
  add(chest, G.box, mat(shade(t.hood, -10)), 0.32, -0.30, 0.02, 0.11, 0.08, 0.11);

  const head = new THREE.Group();
  head.position.y = 1.34;
  root.add(head);
  add(head, G.cyl, skinM, 0, -0.02, 0, 0.07, 0.12, 0.07);
  add(head, G.sphere, skinM, 0, 0.20, -0.01, 0.15, 0.16, 0.132);
  add(head, G.box, skinM, 0, 0.08, 0.03, 0.18, 0.12, 0.15);
  add(head, G.box, skinM, 0, 0.02, 0.08, 0.08, 0.07, 0.08);
  add(head, G.sphereLo, skinM, -0.155, 0.18, 0, 0.035, 0.05, 0.03);
  add(head, G.sphereLo, skinM, 0.155, 0.18, 0, 0.035, 0.05, 0.03);
  // nose is painted on the face plane (a 3D box here poked through the face)

  const faceTex = paintFace(t);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.20),
    new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.7,
      metalness: 0,
      emissive: 0xffffff,
      emissiveMap: faceTex,
      emissiveIntensity: 0.5,
    })
  );
  face.position.set(0, 0.155, 0.162);
  face.scale.set(1, 1, 1);
  face.castShadow = false;
  head.add(face);

  if (t.hairStyle === "hood") {
    const hood = add(head, G.hood, hoodMtl, 0, 0.22, -0.02, 0.20, 0.20, 0.20);
    hood.rotation.x = 0.22;
  } else if (t.hairStyle === "beanie" || t.hairStyle === "cap") {
    add(head, G.sphere, hairM, 0, 0.28, 0, 0.16, 0.08, 0.16);
    if (t.hairStyle === "cap") add(head, G.box, hairM, 0, 0.22, 0.14, 0.18, 0.02, 0.10);
  } else if (t.hairStyle === "bun") {
    add(head, G.sphere, hairM, 0, 0.28, -0.02, 0.16, 0.08, 0.16);
    add(head, G.sphereLo, hairM, 0, 0.34, -0.08, 0.07, 0.07, 0.07);
  } else if (t.hairStyle === "wisps") {
    add(head, G.box, hairM, -0.08, 0.30, -0.04, 0.04, 0.08, 0.08);
    add(head, G.box, hairM, 0.06, 0.28, -0.06, 0.05, 0.07, 0.08);
  } else if (t.hairStyle !== "bald") {
    add(head, G.sphere, hairM, 0, 0.28, -0.02, 0.155, 0.07, 0.15);
  }
  if (t.hairStyle === "bangs") {
    add(head, G.box, hairM, 0, 0.26, 0.12, 0.18, 0.05, 0.06);
  }

  root.userData.actor = true;
  root.userData.head = head;
  root.userData.chest = chest;
  root.userData.hips = hips;
  root.userData.t = Math.random() * 10;
  root.userData.faceTex = faceTex;
  return root;
}

const _look = new THREE.Vector3();
export function tickActor(root, dt, player) {
  if (!root?.userData?.actor) return;
  const u = root.userData;
  u.t = (u.t || 0) + dt;
  if (u.chest) u.chest.scale.y = 1 + Math.sin(u.t * 2.1) * 0.018;
  root.position.y = (root.userData.baseY || 0) + Math.sin(u.t * 1.7) * 0.008;
  if (u.head && player) {
    const dx = player.x - root.position.x;
    const dz = player.z - root.position.z;
    const want = Math.atan2(dx, dz);
    let dyaw = want - root.rotation.y;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    u.head.rotation.y = THREE.MathUtils.clamp(dyaw, -0.75, 0.75);
    const dist = Math.hypot(dx, dz) || 1;
    const pitch = Math.atan2((player.y || 0) + 1.45 - (root.position.y + 1.52), dist);
    u.head.rotation.x = THREE.MathUtils.clamp(-pitch, -0.28, 0.35);
  }
  _look.set(0, 0, 0);
}

export { TRAITS };
