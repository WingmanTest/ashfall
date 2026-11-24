// Ashfall / Nevada Revision 2 seasonal palettes + grade.
//  - classic32 / refined64: original Nuclear Winter / art_C palettes
//  - summer64/32, autumn64/32, late_fall64/32, fallout_winter64/32: Nevada 4-act palettes
// Quantisation uses a 64^3 nearest-colour index LUT (512x512 R8 + 256x1 palette), so palette size costs nothing per pixel.
import * as THREE from 'three';

export const WINTER_PALETTE_HEX = [
  0x0a0d12, 0x14171f, 0x1c2430, 0x293340, 0x3d4a59, 0x596b7a, 0x8a99ab, 0xc4d1d9,
  0xe8edf5, 0xffffff, 0x6b7a8c, 0x9cb0bf, 0x857997, 0x6a6677, 0x53535e, 0x45484f,
  0x60615e, 0x7b706a, 0x947b7c, 0xc3cbd4, 0xa9afb2, 0x8d9395, 0x707679, 0x5c6365,
  0x4a5256, 0x394248, 0x629194, 0x556566, 0x6f8789, 0x86acb7, 0x91a4b7, 0x798c9d,
];
export const FIRE_ACCENTS_HEX = [0xffd38a, 0xf08a3c, 0xa8442a];
const FIRE_RAMP_10 = [
  0x2a0806, 0x5a1208, 0x8c1f0a, 0xb83510, 0xd9541a,
  0xee7a26, 0xf8a03a, 0xfcc45e, 0xfee39a, 0xfff6dc,
];

function classic32() {
  const list = WINTER_PALETTE_HEX.slice();
  [18, 17, 12].forEach((slot, i) => { list[slot] = FIRE_ACCENTS_HEX[i]; });
  return list;
}

// sample n colours along a piecewise-linear sRGB ramp through `keys`
function ramp(keys, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (keys.length - 1);
    const k = Math.min(keys.length - 2, Math.floor(t));
    const f = t - k;
    const a = keys[k], b = keys[k + 1];
    let c = 0;
    for (const sh of [16, 8, 0]) {
      const va = (a >> sh) & 255, vb = (b >> sh) & 255;
      c |= Math.round(va + (vb - va) * f) << sh;
    }
    out.push(c);
  }
  return out;
}

function refined64() {
  return [
    // 8: deep cold blacks (night interiors / flashlight falloff). Floor ~= lifted black of the grade.
    0x030406, 0x07090d, 0x0a0d12, 0x0d1117, 0x11151d, 0x151a23, 0x191f2a, 0x1e2532,
    // 16: main cold value ramp (dark slate -> snow), slight blue bias in the mids
    ...ramp([0x242b38, 0x2f3846, 0x3e4958, 0x566272, 0x707d8d, 0x8c99a8,
      0xa8b4c1, 0xc4cdd7, 0xdde3ea, 0xf2f5f8, 0xffffff], 16),
    // 8: steel / slate blue (shadowed snow, sky gradients)
    ...ramp([0x1a2533, 0x2b3a4b, 0x405366, 0x6a8299, 0x9fb2c4], 8),
    // 9: ash warm-grey (concrete, ash drifts) incl. one warm near-black for firelit shadow
    0x120e0b, ...ramp([0x221d19, 0x3a332d, 0x554c44, 0x766c62, 0x9c9288, 0xbdb5ac], 8),
    // 5: rust / brown (also lit wood)
    ...ramp([0x2a1812, 0x4a2c20, 0x6e4430, 0x8f5d40, 0xa8785a], 5),
    // 5: sickly green-grey (husks, lichen)
    ...ramp([0x1c2620, 0x2f4034, 0x4a5e4c, 0x6b7f66, 0x8fa08a], 5),
    // 10: fire ramp (embers -> white-hot)
    ...FIRE_RAMP_10,
    // 2: ice teal accents
    0x4f7f86, 0x86b4bd,
  ];
}

// Act 1 (Ch 1-2): High-Desert Summer (Sparks / Reno, NV) — dry ochre, arid blue sky, sage, terracotta. NO snow wash.
function summer64() {
  return [
    // 8: deep warm-slate shadow steps (interiors / shaded rock)
    0x050507, 0x0a0a0d, 0x101014, 0x17161b, 0x1f1d22, 0x28252b, 0x322e34, 0x3d383e,
    // 12: dry desert sand / ochre / sun-bleached concrete
    ...ramp([0x473d31, 0x6a5a46, 0x8f7a5d, 0xb59b78, 0xd4bc96, 0xebdab9, 0xfbf4e4], 12),
    // 10: hazy ochre-blue Nevada sky (zenith cerulean -> dusty horizon)
    ...ramp([0x3c5878, 0x55779a, 0x7098ba, 0x8eb4cf, 0xb0cad9, 0xd4ddd9], 10),
    // 8: sagebrush / dry juniper / scrub greens
    ...ramp([0x273024, 0x3b4834, 0x546349, 0x728062, 0x949f7f], 8),
    // 8: terracotta / Sierra red-rock / sun-baked timber & rust
    ...ramp([0x3b2016, 0x5e3322, 0x834a31, 0xa86644, 0xc7885f], 8),
    // 8: sun-baked asphalt / warm concrete grey
    ...ramp([0x312f2e, 0x4c4845, 0x6b655f, 0x8d857c, 0xb2a99e, 0xd5cec4], 8),
    // 10: fire / glare accents
    ...FIRE_RAMP_10,
  ];
}
function summer32() {
  return [
    0x070709, 0x141318, 0x242127, 0x38333a,
    ...ramp([0x544738, 0x887358, 0xbe9f78, 0xe8d5b2, 0xfbf4e4], 7),
    ...ramp([0x405c7c, 0x6b92b5, 0x9cc0d6, 0xd2dcd8], 6),
    ...ramp([0x2d3829, 0x526147, 0x859473], 4),
    ...ramp([0x4a281b, 0x884c32, 0xc48259], 4),
    ...ramp([0x3e3a38, 0x736c66, 0xb0a79d, 0xd8d1c7], 4),
    ...FIRE_ACCENTS_HEX,
  ];
}

// Act 2 (Ch 3-4): Dusty Autumn — crisp golden-amber late sun, rust leaves, cool twilight violet-slate shadows.
function autumn64() {
  return [
    // 8: deep twilight violet-slate shadow steps
    0x05050a, 0x0a0912, 0x100f1b, 0x181625, 0x211e30, 0x2b273c, 0x363148, 0x433d56,
    // 12: golden-amber afternoon sunlight & ochre dust
    ...ramp([0x4a3420, 0x704d2c, 0x996939, 0xc48849, 0xe4ab63, 0xf7cf8a, 0xfff0c9], 12),
    // 10: burnt rust / autumn leaves / weathered cedar
    ...ramp([0x361812, 0x592517, 0x82371d, 0xab4e25, 0xcf6d34, 0xe3924c], 10),
    // 10: cooler twilight mauve-slate sky & shadow greys
    ...ramp([0x3c3a4c, 0x545063, 0x70697a, 0x8f8491, 0xb09fa2, 0xd0beb8], 10),
    // 8: dried prairie olive / brush
    ...ramp([0x292b1f, 0x41432d, 0x5d5e3e, 0x7e7a54, 0xa39b6e], 8),
    // 6: cool dusk asphalt & steel
    ...ramp([0x2d323d, 0x484f5c, 0x69707d, 0x8d939e], 6),
    // 10: fire / sunset embers
    ...FIRE_RAMP_10,
  ];
}
function autumn32() {
  return [
    0x07060d, 0x141220, 0x242034, 0x38324a,
    ...ramp([0x593d24, 0x966738, 0xd49650, 0xf6cd87, 0xfff0c9], 7),
    ...ramp([0x421c14, 0x82371d, 0xc96832, 0xe3924c], 5),
    ...ramp([0x423f52, 0x6e6778, 0xa49499, 0xcfbbba], 6),
    ...ramp([0x313324, 0x5e5e3f, 0x968e64], 4),
    ...ramp([0x333845, 0x5f6673, 0x8b919c], 3),
    ...FIRE_ACCENTS_HEX,
  ];
}

// Act 3 (Ch 5-7): Civil War Late Fall — cold overcast slate, rain-slick charcoal, distant smoke haze, bleak contrast.
function lateFall64() {
  return [
    // 8: deep wet charcoal-slate blacks
    0x040507, 0x080a0d, 0x0d1014, 0x13171c, 0x1a1f25, 0x222830, 0x2b323b, 0x353d47,
    // 16: cold overcast slate & wet asphalt / concrete ramp
    ...ramp([0x3b434c, 0x49525c, 0x59636d, 0x6b7580, 0x7f8994, 0x959fa8, 0xadb6be, 0xc8cfd6, 0xe4e8ec], 16),
    // 10: storm-blue drizzle & cold overcast sky
    ...ramp([0x1f2b36, 0x2f404f, 0x435768, 0x5c7284, 0x7a90a2, 0x9eb2c2], 10),
    // 8: damp olive-drab / mud / military fatigues
    ...ramp([0x24241e, 0x37382d, 0x4e4e3f, 0x676654, 0x85836f], 8),
    // 6: wet brick / rusted iron / dried blood-rust
    ...ramp([0x2c1714, 0x49251f, 0x69382e, 0x894f40], 6),
    // 6: distant smoke-plume neutral greys
    ...ramp([0x5a5856, 0x777572, 0x96938f, 0xb8b5b0], 6),
    // 10: fire / flare / burning-wreck ramp
    ...FIRE_RAMP_10,
  ];
}
function lateFall32() {
  return [
    0x06070a, 0x12161b, 0x21272e, 0x333b44,
    ...ramp([0x404852, 0x5e6873, 0x828c96, 0xaeb7bf, 0xe2e6ea], 9),
    ...ramp([0x222f3b, 0x3e5162, 0x647b8e, 0x9bb0c0], 6),
    ...ramp([0x2a2a22, 0x4d4d3e, 0x7b7966], 4),
    ...ramp([0x361c18, 0x63352b, 0x884f40], 3),
    ...ramp([0x5f5d5b, 0x888581, 0xb5b2ad], 3),
    ...FIRE_ACCENTS_HEX,
  ];
}

// Act 4 (Ch 8-10): Nuclear Fallout Winter Survival Horror — sunless soot-choked darks, stark pale snow & fire contrast.
function falloutWinter64() {
  return [
    // 10: ultra-graded deep dread blacks & soot shadows (Tallman silhouettes in fog/flashlight falloff)
    0x020305, 0x05070a, 0x080b10, 0x0c1017, 0x10151e, 0x151b26, 0x1a222f, 0x202938, 0x273242, 0x2f3b4d,
    // 14: sunless ash-blue to stark pale fallout snow
    ...ramp([0x364252, 0x455264, 0x576578, 0x6b798c, 0x8290a2, 0x9ba8b8, 0xb7c2cf, 0xd4dce4, 0xedf1f6, 0xffffff], 14),
    // 8: dead frost steel-blue
    ...ramp([0x182534, 0x26394d, 0x395066, 0x536e85, 0x7692a8], 8),
    // 8: dark soot / ash-drift warm-grey
    0x110e0c, ...ramp([0x1e1a17, 0x332d28, 0x4d453e, 0x6a6158, 0x8b8278, 0xaea69d], 7),
    // 5: scorched timber / blood-rust
    ...ramp([0x26120e, 0x452019, 0x663428, 0x874e3b, 0xa36c52], 5),
    // 5: sickly assimilated / rad-lichen green-grey
    ...ramp([0x16211a, 0x26382b, 0x3c5240, 0x587058, 0x7a9278], 5),
    // 12: stark fire & flashlight glare ramp (deep coal -> roaring campfire -> white-hot)
    0x1e0604, 0x3c0b06, ...FIRE_RAMP_10,
    // 2: eerie ice-cyan accents
    0x467982, 0x7bb0ba,
  ];
}
function falloutWinter32() {
  return [
    0x030407, 0x0b0f16, 0x151c27, 0x222c3c, 0x303c4e,
    ...ramp([0x3c4859, 0x5e6c80, 0x8b99ab, 0xc3cdd8, 0xf4f7fa], 8),
    ...ramp([0x1a2838, 0x354b61, 0x5d7891, 0x85a0b5], 5),
    ...ramp([0x1d1916, 0x443d37, 0x756c63, 0xa9a198], 4),
    ...ramp([0x341914, 0x68362a, 0x9b644c], 3),
    ...ramp([0x1b2920, 0x3e5442, 0x718870], 3),
    0x5a1208, 0xc84414, 0xf69a36, 0xfff0c8,
  ];
}

export const PALETTES = {
  classic32: classic32(),
  refined64: refined64(),
  summer64: summer64(),
  summer32: summer32(),
  autumn64: autumn64(),
  autumn32: autumn32(),
  late_fall64: lateFall64(),
  late_fall32: lateFall32(),
  fallout_winter64: falloutWinter64(),
  fallout_winter32: falloutWinter32(),
};

export const GRADE_ASHFALL = {
  // postprocess.py apply_post(..., style 'C')
  contrast: 1.22, saturation: 0.55, brightness: 1.12,
  tint: [0.88, 0.94, 1.1], lift: [0.03, 0.04, 0.06], gamma: 0.92, crush: 0.28,
  dither: 0.07, grain: 0.035, exposure: 1.05,
};

const lutCache = new Map();
const W8 = [0.55, 1.0, 0.75]; // channel weights, same as Echo's postprocess.py
export const lutStats = { lastBuildMs: 0, builds: 0, cacheHits: 0 };

/**
 * Exact nearest-palette index for every cell of a 64^3 RGB grid (same result as brute force),
 * laid out as 8x8 tiles of 64x64 (x = r + (b%8)*64, y = g + (b/8)*64). Returns Uint8Array(512*512).
 * Speed: the grid is split into 8^3 coarse blocks; per block only palette entries whose min
 * distance to the block can beat the best max distance are tested (typically 2-6 of 64), so
 * ~1.5M distance evals instead of 16.8M brute force (~10x faster, a few ms).
 */
export function computePaletteIndices(hexes) {
  const n = Math.min(256, hexes.length);
  const pr = new Float32Array(n), pg = new Float32Array(n), pb = new Float32Array(n);
  for (let i = 0; i < n; i++) { const h = hexes[i]; pr[i] = ((h >> 16) & 255) / 255; pg[i] = ((h >> 8) & 255) / 255; pb[i] = (h & 255) / 255; }
  const S = 64, W = 512, B = 4, inv = 1 / (S - 1);
  const out = new Uint8Array(W * W);
  const cand = new Uint8Array(n);
  const minD = new Float32Array(n);
  const axisMin = (p, lo, hi) => (p < lo ? lo - p : p > hi ? p - hi : 0);
  const axisMax = (p, lo, hi) => Math.max(Math.abs(p - lo), Math.abs(p - hi));
  for (let cb = 0; cb < S / B; cb++) {
    const blo = cb * B * inv, bhi = (cb * B + B - 1) * inv;
    for (let cg = 0; cg < S / B; cg++) {
      const glo = cg * B * inv, ghi = (cg * B + B - 1) * inv;
      for (let cr = 0; cr < S / B; cr++) {
        const rlo = cr * B * inv, rhi = (cr * B + B - 1) * inv;
        let bestMax = Infinity;
        for (let i = 0; i < n; i++) {
          let a = axisMin(pr[i], rlo, rhi), b = axisMin(pg[i], glo, ghi), c = axisMin(pb[i], blo, bhi);
          minD[i] = a * a * W8[0] + b * b * W8[1] + c * c * W8[2];
          a = axisMax(pr[i], rlo, rhi); b = axisMax(pg[i], glo, ghi); c = axisMax(pb[i], blo, bhi);
          const mx = a * a * W8[0] + b * b * W8[1] + c * c * W8[2];
          if (mx < bestMax) bestMax = mx;
        }
        let nc = 0;
        for (let i = 0; i < n; i++) if (minD[i] <= bestMax) cand[nc++] = i;
        for (let b = cb * B; b < cb * B + B; b++) {
          const fb = b * inv, ox = (b & 7) * S, oy = (b >> 3) * S;
          for (let g = cg * B; g < cg * B + B; g++) {
            const fg = g * inv, row = (oy + g) * W + ox;
            for (let r = cr * B; r < cr * B + B; r++) {
              const fr = r * inv;
              let best = Infinity, bi = 0;
              for (let k = 0; k < nc; k++) {
                const i = cand[k];
                const dr = fr - pr[i], dg = fg - pg[i], db = fb - pb[i];
                const d = dr * dr * 0.55 + dg * dg + db * db * 0.75;
                if (d < best || (d === best && i < bi)) { best = d; bi = i; }
              }
              out[row + r] = bi;
            }
          }
        }
      }
    }
  }
  return out;
}

/**
 * Returns the palette LUT texture: a 512x512 R8 index map (256 KB, was 1 MB RGBA8) with
 * `.userData.palette` = 256x1 RGBA8 palette texture. Both are cached per palette; dispose()
 * on the pipeline frees their GPU copies (the JS data stays cached so re-upload is free).
 */
export function buildPaletteLUT(hexes) {
  const key = hexes.join(',');
  if (lutCache.has(key)) { lutStats.cacheHits++; return lutCache.get(key); }
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const idx = computePaletteIndices(hexes);
  const tex = new THREE.DataTexture(idx, 512, 512, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  const pd = new Uint8Array(256 * 4);
  hexes.slice(0, 256).forEach((h, i) => { pd[i * 4] = (h >> 16) & 255; pd[i * 4 + 1] = (h >> 8) & 255; pd[i * 4 + 2] = h & 255; pd[i * 4 + 3] = 255; });
  const pal = new THREE.DataTexture(pd, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  pal.minFilter = pal.magFilter = THREE.NearestFilter;
  pal.generateMipmaps = false;
  pal.needsUpdate = true;
  tex.userData.palette = pal;
  lutCache.set(key, tex);
  lutStats.lastBuildMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  lutStats.builds++;
  return tex;
}

// ---- GPU LUT build: one 512x512 draw (~0.1-1 ms) instead of ~16.8M JS distance evals ----------
const LUT_VERT = `precision highp float;
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const LUT_FRAG = `precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D tPal;
uniform int uCount;
out vec4 outColor;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 c = vec3(float(p.x & 63), float(p.y & 63), float((p.x >> 6) + (p.y >> 6) * 8)) / 63.0;
  float best = 1e9; int bi = 0;
  for (int i = 0; i < 256; i++) {
    if (i >= uCount) break;
    vec3 d = c - texelFetch(tPal, ivec2(i, 0), 0).rgb;
    float dd = dot(d * d, vec3(0.55, 1.0, 0.75));
    if (dd < best) { best = dd; bi = i; }
  }
  outColor = vec4(float(bi) / 255.0, 0.0, 0.0, 1.0);
}`;
const gpuCache = new Map(); // key -> { rt, renderer } (texture.userData.palette = pal tex)
let gpuQuad = null;
function makePalTex(hexes) {
  const pd = new Uint8Array(256 * 4);
  hexes.slice(0, 256).forEach((h, i) => { pd[i * 4] = (h >> 16) & 255; pd[i * 4 + 1] = (h >> 8) & 255; pd[i * 4 + 2] = h & 255; pd[i * 4 + 3] = 255; });
  const pal = new THREE.DataTexture(pd, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  pal.minFilter = pal.magFilter = THREE.NearestFilter;
  pal.generateMipmaps = false;
  pal.needsUpdate = true;
  return pal;
}
/**
 * Build the index LUT on the GPU into a 512x512 R8 render target. Falls back to the CPU
 * builder if the R8 FBO is incomplete or anything throws. Returns a texture with
 * `.userData.palette`. Cached per palette (and per renderer).
 */
export function buildPaletteLUTGPU(renderer, hexes, maxCache = 4) {
  const key = hexes.join(',');
  const hit = gpuCache.get(key);
  if (hit && hit.renderer === renderer) { lutStats.cacheHits++; gpuCache.delete(key); gpuCache.set(key, hit); return hit.rt.texture; }
  if (hit) { hit.rt.texture.userData.palette.dispose(); hit.rt.dispose(); gpuCache.delete(key); }
  const t0 = performance.now();
  let rt = null;
  let pal = null;
  try {
    if (!gpuQuad) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      const mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: LUT_VERT, fragmentShader: LUT_FRAG,
        uniforms: { tPal: { value: null }, uCount: { value: 0 } }, depthTest: false, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
      const scene = new THREE.Scene(); scene.add(mesh);
      gpuQuad = { geo, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
    }
    rt = new THREE.WebGLRenderTarget(512, 512, { format: THREE.RedFormat, type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false });
    pal = makePalTex(hexes);
    gpuQuad.mat.uniforms.tPal.value = pal;
    gpuQuad.mat.uniforms.uCount.value = Math.min(256, hexes.length);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    const gl = renderer.getContext();
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    if (!ok) throw new Error('R8 FBO incomplete');
    renderer.render(gpuQuad.scene, gpuQuad.cam);
    renderer.setRenderTarget(prev);
    rt.texture.userData.palette = pal;
    rt.texture.userData.gpu = true;
    gpuCache.set(key, { rt, renderer });
    const limit = Math.max(1, maxCache | 0);
    while (gpuCache.size > limit) {
      const [k0, v0] = gpuCache.entries().next().value;
      v0.rt.texture.userData.palette.dispose(); v0.rt.dispose(); gpuCache.delete(k0);
    }
    lutStats.lastBuildMs = performance.now() - t0;
    lutStats.builds++;
    lutStats.path = 'gpu';
    return rt.texture;
  } catch (err) {
    if (pal) pal.dispose();
    if (rt) rt.dispose();
    try { renderer.setRenderTarget(null); } catch (e) { /* ignore */ }
    lutStats.path = 'cpu';
    return buildPaletteLUT(hexes);
  }
}

/** Free GPU copies of every cached LUT (JS data kept). Called by pipeline.dispose(). */
export function releasePaletteLUTs() {
  for (const t of lutCache.values()) { t.dispose(); t.userData.palette.dispose(); }
  for (const { rt } of gpuCache.values()) { rt.texture.userData.palette.dispose(); rt.dispose(); }
  gpuCache.clear();
  if (gpuQuad) { gpuQuad.geo.dispose(); gpuQuad.mat.dispose(); gpuQuad = null; }
}
/** Drop the JS cache too (tests / memory pressure). */
export function clearPaletteCache() { releasePaletteLUTs(); lutCache.clear(); }

export function resolvePalette(p) {
  if (p === false || p == null) return null;
  if (typeof p === 'string') {
    if (!PALETTES[p]) throw new Error('unknown palette ' + p + ' (' + Object.keys(PALETTES).join(' | ') + ')');
    return PALETTES[p];
  }
  return p.map((c) => (typeof c === 'number' ? c
    : c.isVector3 ? (Math.round(c.x * 255) << 16) | (Math.round(c.y * 255) << 8) | Math.round(c.z * 255)
    : (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255)));
}
