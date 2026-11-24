// Ashfall / Nuclear Winter palettes + grade.
//  - classic32: exact art_C palette from Echo's postprocess.py (style C) + 3 fire accents
//  - refined64: 64-colour HD-pixel ramp set, same cold ashy mood, finer value steps, real fire ramp
// Quantisation uses a 64^3 nearest-colour LUT (512x512 RGBA8), so palette size costs nothing per pixel.
import * as THREE from 'three';

export const WINTER_PALETTE_HEX = [
  0x0a0d12, 0x14171f, 0x1c2430, 0x293340, 0x3d4a59, 0x596b7a, 0x8a99ab, 0xc4d1d9,
  0xe8edf5, 0xffffff, 0x6b7a8c, 0x9cb0bf, 0x857997, 0x6a6677, 0x53535e, 0x45484f,
  0x60615e, 0x7b706a, 0x947b7c, 0xc3cbd4, 0xa9afb2, 0x8d9395, 0x707679, 0x5c6365,
  0x4a5256, 0x394248, 0x629194, 0x556566, 0x6f8789, 0x86acb7, 0x91a4b7, 0x798c9d,
];
export const FIRE_ACCENTS_HEX = [0xffd38a, 0xf08a3c, 0xa8442a];

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
    0x2a0806, 0x5a1208, 0x8c1f0a, 0xb83510, 0xd9541a, 0xee7a26, 0xf8a03a, 0xfcc45e, 0xfee39a, 0xfff6dc,
    // 2: ice teal accents
    0x4f7f86, 0x86b4bd,
  ];
}

export const PALETTES = {
  classic32: classic32(),
  refined64: refined64(),
};

export const GRADE_ASHFALL = {
  // postprocess.py apply_post(..., style 'C')
  contrast: 1.22, saturation: 0.55, brightness: 1.12,
  tint: [0.88, 0.94, 1.1], lift: [0.03, 0.04, 0.06], gamma: 0.92, crush: 0.28,
  dither: 0.07, grain: 0.035, exposure: 1.05,
};

const lutCache = new Map();
/** 64^3 nearest-colour LUT laid out as 8x8 tiles of 64x64 (x = r + (b%8)*64, y = g + (b/8)*64). */
export function buildPaletteLUT(hexes) {
  const key = hexes.join(',');
  if (lutCache.has(key)) return lutCache.get(key);
  const n = hexes.length;
  const pr = new Float32Array(n), pg = new Float32Array(n), pb = new Float32Array(n);
  hexes.forEach((h, i) => { pr[i] = ((h >> 16) & 255) / 255; pg[i] = ((h >> 8) & 255) / 255; pb[i] = (h & 255) / 255; });
  const S = 64, W = 512;
  const data = new Uint8Array(W * W * 4);
  for (let b = 0; b < S; b++) {
    const fb = b / (S - 1);
    const ox = (b & 7) * S, oy = (b >> 3) * S;
    for (let g = 0; g < S; g++) {
      const fg = g / (S - 1);
      for (let r = 0; r < S; r++) {
        const fr = r / (S - 1);
        let best = 1e9, bi = 0;
        for (let i = 0; i < n; i++) {
          const dr = fr - pr[i], dg = fg - pg[i], db = fb - pb[i];
          const d = dr * dr * 0.55 + dg * dg + db * db * 0.75; // same weights as Echo's postprocess.py
          if (d < best) { best = d; bi = i; }
        }
        const o = ((oy + g) * W + ox + r) * 4;
        data[o] = (hexes[bi] >> 16) & 255; data[o + 1] = (hexes[bi] >> 8) & 255; data[o + 2] = hexes[bi] & 255; data[o + 3] = 255;
      }
    }
  }
  const tex = new THREE.DataTexture(data, W, W, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  lutCache.set(key, tex);
  return tex;
}

export function resolvePalette(p) {
  if (p === false || p == null) return null;
  if (typeof p === 'string') {
    if (!PALETTES[p]) throw new Error('unknown palette ' + p + ' (classic32 | refined64)');
    return PALETTES[p];
  }
  return p.map((c) => (typeof c === 'number' ? c
    : c.isVector3 ? (Math.round(c.x * 255) << 16) | (Math.round(c.y * 255) << 8) | Math.round(c.z * 255)
    : (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255)));
}
