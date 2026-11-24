// Ashfall — Lumen procedural skybox (Nuclear Winter + 4 seasonal tints).
// ONE draw call: a single full-screen triangle at the far plane, view rays rebuilt per fragment.
// No textures, no render targets, no loops. three.js r170, plain ES module.
//
//   import { createSky, hudHour } from '../sky/sky.js?v=r15';
//   const sky = createSky({ scene, camera, renderer, environment: 'fallout_winter' });
//   sky.update(dt, { timeOfDay: hudHour(game.timeOfDay), weather: 'ashfall' });
//   sky.applyTo({ sun, hemi, amb, fog: scene.fog, scene, pipeline });
//
// See sky/INTEGRATION.md.
import * as THREE from 'three';

// ---------------------------------------------------------------------------------------------
// Clock helpers. game.js keeps timeOfDay in 0..1 and the HUD prints (t*24 + 6) % 24.
export const hudHour = (t) => (((t * 24 + 6) % 24) + 24) % 24;
/** Legacy world.setSky mapping (t = 0.5 is visual noon = HUD 18:00). Only if Prime keeps old lighting timing. */
export const legacyHour = (t) => (((t * 24) % 24) + 24) % 24;

// ---------------------------------------------------------------------------------------------
// Palettes per environment (sRGB hex). Keys by sun elevation: night, twilight, sunset, golden, day.
const ENV_SKY = {
  // Act 4 — the hero look: ash-choked, desaturated, sickly sun.
  fallout_winter: {
    zen: [0x05070b, 0x121620, 0x2a2c34, 0x404650, 0x4c535c],
    hor: [0x10141b, 0x34283a, 0x9c4e2c, 0x967058, 0x8f9396],
    gnd: [0x06080b, 0x14161b, 0x2a2626, 0x3e3e3e, 0x4a4c4e],
    sun: 0xd9c9a0, sunLow: 0xe0602a, moon: 0xc6cfd8, moonLight: 0x7d8fb0,
    cloudBase: 0.55, ash: 0.75, sunSize: 0.040,
    cloud: 0x2a2828, cloudLit: 0x9c9488,
  },
  summer: {
    zen: [0x070b16, 0x1a2440, 0x45608a, 0x4f7cad, 0x4f86bf],
    hor: [0x121826, 0x4a3e48, 0xd08850, 0xd8b88a, 0xd2c4a4],
    gnd: [0x080a0e, 0x1c1a1c, 0x5a4434, 0x8a7458, 0x9c8a6c],
    sun: 0xfff0d2, sunLow: 0xff9a4a, moon: 0xe4e6e8, moonLight: 0x8ea2c8,
    cloudBase: 0.10, ash: 0.0, sunSize: 0.034,
    cloud: 0x9a8a7a, cloudLit: 0xfff2dc,
  },
  autumn: {
    zen: [0x070a12, 0x1c1e34, 0x4a4a6a, 0x5a6c8c, 0x5a7fa8],
    hor: [0x131520, 0x4a3644, 0xd07a40, 0xdcae7a, 0xd8b88c],
    gnd: [0x08090c, 0x1a161a, 0x523a2c, 0x7a6048, 0x86705a],
    sun: 0xffc27a, sunLow: 0xff8a3a, moon: 0xe2e0dc, moonLight: 0x8a98bc,
    cloudBase: 0.25, ash: 0.05, sunSize: 0.036,
    cloud: 0x6a5a5a, cloudLit: 0xffd2a0,
  },
  late_fall: {
    zen: [0x06080c, 0x161a24, 0x343a46, 0x4c5662, 0x5a646e],
    hor: [0x11151b, 0x2e3036, 0x6a5a52, 0x868c90, 0x929aa0],
    gnd: [0x07090b, 0x15171a, 0x2c2a2a, 0x40444a, 0x4c5258],
    sun: 0xc8d2dc, sunLow: 0xb8805a, moon: 0xd0d6dc, moonLight: 0x7e90b0,
    cloudBase: 0.62, ash: 0.25, sunSize: 0.036,
    cloud: 0x3e4248, cloudLit: 0x9aa2aa,
  },
};
const ENV_ALIAS = {
  winter: 'fallout_winter', nuclear_winter: 'fallout_winter', fallout: 'fallout_winter', ashfall: 'fallout_winter', act4: 'fallout_winter',
  desert: 'summer', act1: 'summer', fall: 'autumn', act2: 'autumn', civil_war: 'late_fall', act3: 'late_fall',
};
const resolveEnv = (id) => {
  if (typeof id === 'number') return id <= 2 ? 'summer' : id <= 4 ? 'autumn' : id <= 7 ? 'late_fall' : 'fallout_winter';
  const k = String(id || 'fallout_winter').toLowerCase().replace(/-/g, '_');
  const m = /^(?:ch|chapter)?0?(\d+)/.exec(k);
  if (m && !ENV_SKY[k]) return resolveEnv(parseInt(m[1], 10));
  return ENV_SKY[k] ? k : (ENV_ALIAS[k] || 'fallout_winter');
};
// sun elevation (dir.y) at each key
const KEY_E = [-0.30, -0.10, 0.02, 0.16, 0.45];

// ---------------------------------------------------------------------------------------------
// Weather table. cover: cloud cover, sunVis: disc visibility, haze: horizon wash, hazeCol: wash colour,
// star: star visibility, shimmer: heat shimmer, dark: overall darkening, light: direct-light multiplier,
// drift: cloud speed, low: cloud deck lowness (bigger = lower/heavier), tint: sky tint, tintAmt.
const W = (o) => ({ cover: 0.2, sunVis: 1, haze: 0.1, hazeCol: 0x9a9a9a, star: 1, shimmer: 0, dark: 0, light: 1, drift: 1, low: 0, tint: 0x808080, tintAmt: 0, ...o });
export const SKY_WEATHER = {
  clear: W({ cover: 0.08 }),
  heat_haze: W({ cover: 0.0, sunVis: 1.0, haze: 0.42, hazeCol: 0xf0dcae, shimmer: 1, star: 0.75, light: 1.08, tint: 0xd8b880, tintAmt: 0.18 }),
  dust_wind: W({ cover: 0.22, sunVis: 0.7, haze: 0.62, hazeCol: 0xc8a070, star: 0.4, drift: 3.2, light: 0.85, tint: 0xb08858, tintAmt: 0.25 }),
  clear_autumn: W({ cover: 0.25, haze: 0.18, hazeCol: 0xe0c090 }),
  autumn_wind: W({ cover: 0.45, sunVis: 0.85, haze: 0.22, hazeCol: 0xc8a888, drift: 2.6, star: 0.6, light: 0.9 }),
  overcast: W({ cover: 0.82, sunVis: 0.35, haze: 0.3, hazeCol: 0x8a9096, star: 0.12, dark: 0.12, light: 0.62, low: 0.3 }),
  sleet: W({ cover: 0.94, sunVis: 0.1, haze: 0.5, hazeCol: 0x7c848c, star: 0.0, dark: 0.26, light: 0.48, drift: 1.8, low: 0.6 }),
  rain: W({ cover: 0.92, sunVis: 0.12, haze: 0.45, hazeCol: 0x767e86, star: 0.0, dark: 0.28, light: 0.5, drift: 1.6, low: 0.55 }),
  fallout_rain: W({ cover: 0.95, sunVis: 0.1, haze: 0.5, hazeCol: 0x6e6e5e, star: 0.0, dark: 0.32, light: 0.45, drift: 1.6, low: 0.6, tint: 0x6a6a50, tintAmt: 0.25 }),
  brown_sky: W({ cover: 0.62, sunVis: 0.42, haze: 0.55, hazeCol: 0x8a6a44, star: 0.1, dark: 0.12, light: 0.7, tint: 0x7a5a36, tintAmt: 0.45 }),
  ashfall: W({ cover: 0.86, sunVis: 0.55, haze: 0.5, hazeCol: 0x6a6662, star: 0.08, dark: 0.28, light: 0.55, drift: 1.3, low: 0.45, tint: 0x5a5652, tintAmt: 0.3 }),
  blizzard: W({ cover: 1.0, sunVis: 0.03, haze: 0.92, hazeCol: 0x9aa2aa, star: 0.0, dark: 0.12, light: 0.4, drift: 4.2, low: 1.0 }),
};
const WX_ALIAS = { ash: 'ashfall', snow: 'blizzard', storm: 'blizzard', drizzle: 'rain', dust: 'dust_wind', haze: 'heat_haze', night: 'clear', fog: 'overcast', smoke: 'brown_sky' };
const resolveWeather = (w) => {
  const k = String(w || 'clear').toLowerCase().replace(/[\s-]+/g, '_');
  return SKY_WEATHER[k] ? k : (WX_ALIAS[k] || 'overcast');
};
const WX_KEYS = ['cover', 'sunVis', 'haze', 'star', 'shimmer', 'dark', 'light', 'drift', 'low', 'tintAmt'];

// ---------------------------------------------------------------------------------------------
const VERT = /* glsl */`
void main() { gl_Position = vec4(position.xy, 1.0, 1.0); }
`;

const FRAG = /* glsl */`
uniform vec4 uViewport;     // x, y, w, h of the current viewport (px)
uniform vec4 uProj;         // 1/P00, 1/P11, P20, P21
uniform mat3 uCamRot;       // camera world rotation
uniform float uPixel;       // virtual pixel size (1 inside the low-res pipeline)
uniform float uPxPerRad;    // viewport pixels per radian (vertical)
uniform float uTime;
uniform vec3 uZen, uHor, uGnd, uHaze;
uniform float uHazeAmt, uShimmer;
uniform vec3 uSunDir, uSunCol;
uniform float uSunVis, uSunSize, uSunGlow;
uniform vec3 uMoonDir, uMoonCol;
uniform float uMoonVis, uMoonPhase, uMoonSize, uMoonHaloAmt;
uniform float uStarVis;
uniform mat3 uStarRot;
uniform float uCover, uLow;
uniform vec2 uCloudOff;
uniform vec3 uCloudDark, uCloudLit;
uniform float uBands, uLevels, uDither;
uniform vec3 uFogCol;                        // pipeline fog colour (== horizon, scene-linear)
uniform vec4 uFogP;                          // density, start, maxDist, falloff
uniform float uFogBase, uFogComp;            // fog base height, compensation 0..1

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 hash32(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
uniform sampler2D tNoise;   // 64x64 RGBA8 tileable value noise (4 independent channels), linear + repeat
// one bilinear fetch == one octave of value noise (64 lattice cells per tile)
vec4 nz(vec2 p) { return texture2D(tNoise, p * (1.0 / 64.0)); }
float bayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  vec2 a = mod(q, 2.0), b = floor(q * 0.5);
  float x = a.x * 2.0 + abs(a.x - a.y);             // 2x2 level
  float y = b.x * 2.0 + abs(b.x - b.y);
  return (x * 4.0 + y + 0.5) / 16.0;
}

void main() {
  // --- view ray from the (pixel-snapped) fragment ------------------------------------------
  vec2 fc = (floor((gl_FragCoord.xy - uViewport.xy) / uPixel) + 0.5) * uPixel;
  vec2 ndc = fc / uViewport.zw * 2.0 - 1.0;
  vec3 v = vec3((ndc.x + uProj.z) * uProj.x, (ndc.y + uProj.w) * uProj.y, -1.0);
  vec3 d = normalize(uCamRot * v);
  float dth = bayer4(fc / uPixel) - 0.5;

  // heat shimmer: wobble the horizon line
  float nearH = 1.0 - smoothstep(0.0, 0.18, abs(d.y));
  float y = d.y + uShimmer * nearH * 0.010 * sin(d.x * 70.0 + d.z * 40.0 + uTime * 3.7);

  // --- gradient ---------------------------------------------------------------------------
  float yu = clamp(y, 0.0, 1.0);
  vec3 col = mix(uHor, uZen, sqrt(yu));
  col = mix(col, uGnd, smoothstep(-0.03, -0.35, y));
  // horizon haze band (ground-haze)
  float band = exp(-abs(y) * mix(14.0, 4.0, uHazeAmt));
  col = mix(col, uHaze, band * uHazeAmt);
  col += uHaze * uShimmer * 0.12 * (1.0 - smoothstep(0.0, 0.035, abs(y))); // mirage strip

  // --- sun glow (behind clouds, dimmed by haze) ----------------------------------------------
  float sd = dot(d, uSunDir);
  float sdp = max(sd, 0.0);
  float glow = sdp * sdp * sdp * sdp; glow *= glow;            // ^8
  float glow2 = glow * glow; glow2 *= glow2;                   // ^32
  float horizonFan = sdp * sdp * nearH;                        // dusk fan along the horizon
  vec3 sunAdd = uSunCol * (glow * 0.22 + glow2 * 0.38 + horizonFan * 0.18) * uSunGlow;
  col += sunAdd * 0.5;                                            // part of the glow sits behind the clouds

  // --- stars (one hashed grid cell per fragment, no loops) --------------------------------
  float starVis = uStarVis * smoothstep(0.02, 0.2, y);
  if (starVis > 0.003) {
    vec3 sdir = uStarRot * d;
    // cells of ~6 virtual pixels; each lit star is exactly 1 pixel (bright ones a 3px plus)
    float cpr = uPxPerRad / (uPixel * 6.0);
    vec2 sp = sdir.xz / (1.0 + abs(sdir.y)) * 2.0 * cpr;
    vec2 cell = floor(sp);
    vec3 h = hash32(cell);
    if (h.x > 0.88) {
      vec2 c = 0.15 + 0.7 * h.yz;
      vec2 dd = abs(fract(sp) - c) * 6.0;              // distance in virtual pixels
      float big = step(0.99, h.x);
      float s = step(max(dd.x, dd.y), 0.5) + big * step(min(dd.x, dd.y), 0.5) * step(max(dd.x, dd.y), 1.5) * 0.6;
      float tw = 0.6 + 0.4 * sin(uTime * (1.3 + h.y * 3.0) + h.z * 40.0);
      vec3 sc = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.86, 0.7), h.z);
      col += sc * min(s, 1.0) * tw * starVis * (0.3 + 0.7 * (h.x - 0.88) / 0.12);
    }
  }

  // --- moon: hard disc, phase terminator, crater blotches -----------------------------------
  float md = dot(d, uMoonDir);
  float moonMask = 0.0;
  if (uMoonVis > 0.003 && md > 0.9) {
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir));
    vec3 u = cross(uMoonDir, r);
    vec2 mp = vec2(dot(d, r), dot(d, u)) / uMoonSize;
    float rr = dot(mp, mp);
    moonMask = step(rr, 1.0);
    vec3 n = vec3(mp, sqrt(max(1.0 - rr, 0.0)));
    float ph = uMoonPhase * 6.2831853;
    vec3 L = vec3(sin(ph), 0.15, -cos(ph));
    float lit = step(0.0, dot(n, L));
    vec4 cn = nz(mp * 3.0 + 7.0);
    float cr = cn.x * 0.6 + cn.y * 0.4;
    float shade = mix(1.0, 0.62, step(0.56, cr)) * (0.82 + 0.18 * n.z);
    vec3 mc = uMoonCol * mix(0.07, shade, lit);
    col = mix(col, mc, moonMask * uMoonVis);
  }
  float moonHalo = pow(max(md, 0.0), 300.0) * uMoonHaloAmt;    // halo, added after clouds (reads through ash)

  float cloudC = 0.0;
  // --- ash clouds: planar projection, 3 octaves + 1 shading tap, posterized ------------------
  if (uCover > 0.003) {
    float yc = max(y + 0.06, 0.02);
    vec2 cp = d.xz / yc * mix(1.1, 1.6, uLow) + uCloudOff;
    vec4 n0 = nz(cp);
    float n = n0.x * 0.55 + nz(cp * 2.13 + 11.7).y * 0.3 + nz(cp * 4.37 - 5.3).z * 0.15;
    float thr = 1.0 - uCover;
    float c = smoothstep(thr - 0.08, thr + 0.28, n + uCover * 0.18);
    // fake self-shadow: compare with a tap toward the light
    vec3 ld = uSunDir.y > -0.1 ? uSunDir : uMoonDir;
    float n2 = nz(cp + normalize(ld.xz + 1e-4) * 0.35).x;
    float lit = clamp(0.55 + (n - n2) * 2.2, 0.0, 1.0) * clamp(1.0 - c * 0.45, 0.0, 1.0);
    lit += glow * 0.8;
    float fade = smoothstep(-0.02, 0.12, y);
    c *= fade;
    c = clamp(floor(c * uBands + 0.5 + dth * 0.6) / uBands, 0.0, 1.0);
    lit = floor(lit * 3.0 + 0.5 + dth * 0.5) / 3.0;
    vec3 cc = mix(uCloudDark, uCloudLit, lit);
    cc = mix(cc, uHaze, (1.0 - fade) * uHazeAmt);
    col = mix(col, cc, c);
    cloudC = c;
  }

  // --- haze-dimmed sun: hard pixel disc that still reads through thin ash --------------------
  float disc = step(1.0 - uSunSize * uSunSize * 0.5, sd);
  float through = 1.0 - cloudC * 0.72;
  col += sunAdd * 0.5 * through;
  col = mix(col, uSunCol * 2.0, disc * uSunVis * through);
  col += uMoonCol * moonHalo * (1.0 - cloudC * 0.55);

  // --- PS1 colour quantization with ordered dither (sqrt space keeps darks) ------------------
  // --- render/ pipeline: its composite fogs sky pixels (depth 1) as if they sat at uMaxDist. Pre-compensate
  // with the same analytic height-fog transmittance so the sky keeps its contrast after the composite.
  if (uFogComp > 0.0) {
    float st = min(uFogP.y, uFogP.z);
    float L = uFogP.z - st;
    float a = uFogP.x * exp(-uFogP.w * (cameraPosition.y + d.y * st - uFogBase));
    float b = uFogP.w * d.y;
    float od = abs(b) > 1e-4 ? a * (1.0 - exp(-b * L)) / b : a * L;
    float T = exp(-od);
    vec3 cc = uFogCol + (col - uFogCol) / mix(1.0, max(T, 0.3), uFogComp);
    col = min(cc, col * 1.6 + 0.01);           // cap the boost on bright features (moon/sun) -> no bloom blow-out
  }

  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <tonemapping_fragment>
  vec3 q = sqrt(clamp(gl_FragColor.rgb, 0.0, 1.0));
  q = floor(q * uLevels + 0.5 + dth * uDither) / uLevels;
  gl_FragColor.rgb = q * q;
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------------------------
// The only texture: 64x64 RGBA8 (16 KB) deterministic value noise, linear-filtered + repeat.
function makeNoiseTexture() {
  const N = 64, data = new Uint8Array(N * N * 4);
  let s = 1337;
  for (let i = 0; i < data.length; i++) { s = (s * 16807) % 2147483647; data[i] = s & 255; }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace; t.name = 'AshfallSkyNoise';
  t.needsUpdate = true;
  return t;
}
const _c = () => new THREE.Color();
function keyColor(out, list, e, tmp) {
  if (e <= KEY_E[0]) return out.setHex(list[0]);
  for (let i = 1; i < KEY_E.length; i++) {
    if (e <= KEY_E[i]) {
      const t = (e - KEY_E[i - 1]) / (KEY_E[i] - KEY_E[i - 1]);
      return out.setHex(list[i - 1]).lerp(tmp.setHex(list[i]), t * t * (3 - 2 * t));
    }
  }
  return out.setHex(list[list.length - 1]);
}
// ---- ACES (three.js ACESFilmicToneMapping == render/ composite acesFilmic) and its exact inverse ----------
// The sky palette is authored as *display* colours; we pre-invert the tone curve so that after the renderer
// (or the pipeline composite) tone-maps the frame the sky lands on the authored colours, while staying in the
// same scene-linear space as fogged geometry (so fogColor == horizon after tone mapping too).
const ACES_IN = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const ACES_OUT = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const ACES_IN_INV = ACES_IN.clone().invert(), ACES_OUT_INV = ACES_OUT.clone().invert();
const _v3 = new THREE.Vector3();
function rrtInv(w) {
  w = Math.min(Math.max(w, 0), 1.0);
  const A = 0.0245786, B = 0.000090537, C = 0.983729, D = 0.4329510, E = 0.238081;
  const a = 1 - w * C, b = A - w * D, c = -(B + w * E);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}
function invAces(color, exposure) {
  _v3.set(Math.min(color.r, 0.97), Math.min(color.g, 0.97), Math.min(color.b, 0.97)).applyMatrix3(ACES_OUT_INV);
  _v3.set(rrtInv(_v3.x), rrtInv(_v3.y), rrtInv(_v3.z)).applyMatrix3(ACES_IN_INV).multiplyScalar(0.6 / exposure);
  return color.setRGB(Math.max(0, _v3.x), Math.max(0, _v3.y), Math.max(0, _v3.z), THREE.LinearSRGBColorSpace);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * createSky({ scene, camera, renderer?, environment?, weather?, timeOfDay?, pixelSize?, latitude?, moonPhase? })
 */
export function createSky(opts = {}) {
  const { scene, renderer = null } = opts;
  let pipeline = opts.pipeline || null;
  // 'aces' (pre-invert ACES; auto when the pipeline is used or renderer.toneMapping is ACESFilmic) | 'none'
  const toneMode = () => {
    if (opts.toneMapping) return opts.toneMapping;
    if (pipeline) return 'aces';
    return renderer && renderer.toneMapping === THREE.ACESFilmicToneMapping ? 'aces' : 'none';
  };
  const exposure = () => {
    if (opts.exposure) return opts.exposure;
    if (pipeline) { try { return pipeline.getEnvironmentConfig?.()?.grade?.exposure ?? 1; } catch { return 1; } }
    return renderer ? renderer.toneMappingExposure : 1;
  };
  let envKey = resolveEnv(opts.environment || 'fallout_winter');
  let wxKey = resolveWeather(opts.weather || 'ashfall');
  let hour = opts.timeOfDay ?? 12;
  let moonPhase = opts.moonPhase ?? 0.7;
  let time = 0;
  const wx = {}; for (const k of WX_KEYS) wx[k] = SKY_WEATHER[wxKey][k];
  const wxHaze = new THREE.Color(SKY_WEATHER[wxKey].hazeCol);
  const wxTint = new THREE.Color(SKY_WEATHER[wxKey].tint);
  const cloudOff = new THREE.Vector2(13.1, 7.7);

  const noiseTex = makeNoiseTexture();
  const U = {
    tNoise: { value: noiseTex },
    uViewport: { value: new THREE.Vector4(0, 0, 390, 844) },
    uProj: { value: new THREE.Vector4(1, 1, 0, 0) },
    uCamRot: { value: new THREE.Matrix3() },
    uPixel: { value: opts.pixelSize ?? 1 },
    uPxPerRad: { value: 500 },
    uTime: { value: 0 },
    uZen: { value: _c() }, uHor: { value: _c() }, uGnd: { value: _c() }, uHaze: { value: _c() },
    uHazeAmt: { value: 0 }, uShimmer: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: _c() },
    uSunVis: { value: 1 }, uSunSize: { value: 0.04 }, uSunGlow: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uMoonCol: { value: _c() },
    uMoonVis: { value: 0 }, uMoonHaloAmt: { value: 0 }, uMoonPhase: { value: moonPhase }, uMoonSize: { value: 0.05 },
    uStarVis: { value: 0 }, uStarRot: { value: new THREE.Matrix3() },
    uCover: { value: 0.5 }, uLow: { value: 0 }, uCloudOff: { value: cloudOff },
    uCloudDark: { value: _c() }, uCloudLit: { value: _c() },
    // Own colour posterize + ordered dither for the plain renderer path. Inside render/ pipeline the
    // composite already palette-quantizes + dithers, so passing { pipeline } turns ours off (no double dither).
    uFogCol: { value: _c() }, uFogP: { value: new THREE.Vector4(0.02, 8, 60, 0.05) }, uFogBase: { value: 0 },
    uFogComp: { value: opts.fogCompensation ?? (opts.pipeline ? 1 : 0) },
    uBands: { value: 4 }, uLevels: { value: opts.levels ?? (opts.pipeline ? 255 : 28) }, uDither: { value: opts.dither ?? (opts.pipeline ? 0 : 1) },
  };
  const material = new THREE.ShaderMaterial({
    name: 'AshfallSky', uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
    depthWrite: false, depthTest: true, fog: false, lights: false, toneMapped: true,
  });
  if (opts.precision) material.precision = opts.precision; // e.g. 'mediump' to test low-precision GPUs
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'AshfallSky';
  mesh.frustumCulled = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  // Lives in the TRANSPARENT list (transparent + NoBlending, renderOrder -1e6 => first transparent draw):
  //  * drawn after every opaque/transmissive object at depth 1.0 (LEQUAL), so geometry-covered pixels are
  //    early-z rejected and only visible sky pixels are shaded;
  //  * still before particles / other transparent objects, which blend over it;
  //  * NOT re-drawn by three's transmission pre-pass (Ch1 GLBs carry KHR transmission materials, which make
  //    three re-render the whole opaque list into an MSAA target: an opaque sky would cost +2 calls there).
  material.transparent = true;
  material.blending = THREE.NoBlending;
  mesh.renderOrder = opts.renderOrder ?? -1e6;
  const _vp = new THREE.Vector4();
  mesh.onBeforeRender = (r, _s, cam) => {
    r.getCurrentViewport(_vp);
    U.uViewport.value.copy(_vp);
    const p = cam.projectionMatrix.elements;
    U.uProj.value.set(1 / p[0], 1 / p[5], p[8], p[9]);
    U.uPxPerRad.value = _vp.w * 0.5 * p[5];
    U.uCamRot.value.setFromMatrix4(cam.matrixWorld);
    // strip scale (cameras are unscaled, but be safe)
  };
  if (scene) scene.add(mesh);

  // ---- derived state ------------------------------------------------------------------------
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
  const tmp = _c(), tmp2 = _c();
  const state = {
    dir: new THREE.Vector3(0, 1, 0), color: _c(), intensity: 1, source: 'sun',
    fogColor: _c(), skyColor: _c(), displayHorizon: _c(), displayZenith: _c(), horizonColor: _c(), zenithColor: _c(),
    ambientColor: _c(), ambientIntensity: 0.3,
    hemiSky: _c(), hemiGround: _c(), hemiIntensity: 0.4,
    day: 1, night: 0, sunElevation: 1, moonElevation: -1, weather: wxKey, environment: envKey, hour,
  };
  const lat = THREE.MathUtils.degToRad(opts.latitude ?? 39.5); // Sparks / Reno
  const starAxis = new THREE.Vector3(0, Math.sin(lat), -Math.cos(lat)).normalize();
  const _q = new THREE.Quaternion(), _m4 = new THREE.Matrix4();
  const sunTop = THREE.MathUtils.degToRad(opts.sunMaxElevation ?? 35), moonTop = THREE.MathUtils.degToRad(opts.moonMaxElevation ?? 45);
  const sinSunTop = Math.sin(sunTop), cosSunTop = Math.cos(sunTop), sinMoonTop = Math.sin(moonTop), cosMoonTop = Math.cos(moonTop);

  function envBase() {
    // optional link to render/environments.js values (light intensities), filled lazily
    return ENV_LIGHT[envKey];
  }

  function computeDirs() {
    // Equatorial arc for ~39.5°N with a low nuclear-winter sun: 06:00 rises east (+x), 12:00 culminates
    // due south (-z, ~35° up), 18:00 sets west (-x). Moon opposite, trailing ~1.3 h, culminates ~45° up.
    const a = (hour - 6) / 24 * Math.PI * 2;
    sunDir.set(Math.cos(a), Math.sin(a) * sinSunTop, -Math.sin(a) * cosSunTop - 0.08).normalize();
    const b = a + Math.PI + 0.35;
    moonDir.set(Math.cos(b), Math.sin(b) * sinMoonTop, -Math.sin(b) * cosMoonTop - 0.08).normalize();
  }

  function recompute() {
    const S = ENV_SKY[envKey], L = envBase();
    computeDirs();
    const e = sunDir.y;
    const dark = wx.dark;
    keyColor(U.uZen.value, S.zen, e, tmp);
    keyColor(U.uHor.value, S.hor, e, tmp);
    keyColor(U.uGnd.value, S.gnd, e, tmp);
    // weather tint & darkening
    const day = smooth(-0.12, 0.25, e);
    const night = 1 - day;
    if (wx.tintAmt > 0) {
      U.uZen.value.lerp(tmp.copy(wxTint).multiplyScalar(0.25 + 0.75 * day), wx.tintAmt * 0.6);
      U.uHor.value.lerp(tmp.copy(wxTint).multiplyScalar(0.25 + 0.75 * day), wx.tintAmt);
    }
    // heavy cloud decks flatten the gradient toward a grey lid
    U.uZen.value.lerp(U.uHor.value, wx.cover * 0.35);
    U.uZen.value.multiplyScalar(1 - dark); U.uHor.value.multiplyScalar(1 - dark * 0.7); U.uGnd.value.multiplyScalar(1 - dark);
    // haze colour follows light level
    U.uHaze.value.copy(wxHaze).multiplyScalar(0.12 + 0.88 * day).lerp(U.uHor.value, 0.35 + 0.4 * night);
    U.uHazeAmt.value = wx.haze;
    U.uShimmer.value = wx.shimmer * day;

    // sun
    const sunUp = smooth(-0.06, 0.04, e);
    const low = 1 - smooth(0.02, 0.35, e);
    U.uSunDir.value.copy(sunDir);
    U.uSunCol.value.setHex(S.sun).lerp(tmp.setHex(S.sunLow), low);
    const ashDim = 1 - S.ash * 0.45;
    U.uSunVis.value = sunUp * wx.sunVis * (envKey === 'fallout_winter' ? 0.8 : 1);
    // the pipeline adds its own sun in-scatter + bloom around the sun, so halve our glow there
    U.uSunGlow.value = sunUp * (0.35 + 0.65 * wx.sunVis) * ashDim * (1 + wx.shimmer * 0.3) * (pipeline ? 0.5 : 1);
    U.uSunSize.value = S.sunSize * (1 + wx.shimmer * 0.25);
    U.uSunCol.value.multiplyScalar(envKey === 'fallout_winter' ? 0.42 : 0.5); // half-bright base; disc = 2x

    // moon
    const mUp = smooth(-0.04, 0.06, moonDir.y);
    U.uMoonDir.value.copy(moonDir);
    U.uMoonCol.value.setHex(S.moon);
    U.uMoonVis.value = mUp * (0.25 + 0.75 * night) * Math.max(0, 1 - wx.cover * 0.85) * (1 - S.ash * 0.25);
    U.uMoonPhase.value = moonPhase;
    U.uMoonHaloAmt.value = mUp * night * (0.12 + 0.25 * wx.cover) * (1 - wx.haze * 0.5); // diffuse glow through ash
    U.uMoonSize.value = 0.055;

    // stars
    const starNight = smooth(-0.02, -0.2, e);
    U.uStarVis.value = starNight * wx.star * (1 - S.ash * 0.55) * Math.max(0, 1 - wx.cover);
    const rot = (hour / 24) * Math.PI * 2;
    _q.setFromAxisAngle(starAxis, rot);
    U.uStarRot.value.setFromMatrix4(_m4.makeRotationFromQuaternion(_q));

    // clouds
    U.uCover.value = Math.min(1, S.cloudBase * 0.5 + wx.cover * (1 - S.cloudBase * 0.3) + S.ash * 0.1 * (wx.cover > 0.05 ? 1 : 0));
    if (wx.cover <= 0.01 && S.cloudBase < 0.2) U.uCover.value = 0;
    U.uLow.value = wx.low;
    const lightLvl = Math.max(day, 0.08 * mUp);
    U.uCloudDark.value.setHex(S.cloud).multiplyScalar(0.12 + 0.88 * day).lerp(U.uZen.value, 0.25);
    U.uCloudLit.value.setHex(S.cloudLit).multiplyScalar(0.1 + 0.9 * lightLvl)
      .lerp(tmp.copy(U.uSunCol.value), low * day * 0.45).multiplyScalar(1 - dark * 0.6);
    if (night > 0.5) U.uCloudLit.value.lerp(tmp.setHex(S.moonLight).multiplyScalar(0.18 * mUp), night - 0.5);
    U.uBands.value = 4;

    // ---- display -> scene-linear for the tone mapper in use ------------------------------------
    state.displayHorizon.copy(U.uHor.value).lerp(U.uHaze.value, wx.haze);
    state.displayZenith.copy(U.uZen.value);
    const tm = toneMode();
    if (tm === 'aces') {
      const ex = exposure();
      for (const k of ['uZen', 'uHor', 'uGnd', 'uHaze', 'uSunCol', 'uMoonCol', 'uCloudDark', 'uCloudLit']) invAces(U[k].value, ex);
    }

    // ---- light state (sRGB colours, three's Color management converts on set) ---------------
    const wl = 0.5 + 0.5 * wx.light; // weather scales direct light relative to the preset's own noon value
    const sunI = L.sun * (0.1 + 0.9 * smooth(-0.03, 0.3, e)) * wl * (1 - low * 0.3) * sunUp;
    const moonIllum = 0.5 - 0.5 * Math.cos(moonPhase * Math.PI * 2);
    const moonI = L.moon * mUp * (0.35 + 0.65 * moonIllum) * wl * night;
    const useSun = sunI >= moonI;
    state.source = useSun ? 'sun' : 'moon';
    state.dir.copy(useSun ? sunDir : moonDir);
    if (state.dir.y < 0.08) { state.dir.y = 0.08; state.dir.normalize(); } // keep shadows sane at the horizon
    if (useSun) state.color.setHex(S.sun).lerp(tmp.setHex(S.sunLow), low);
    else state.color.setHex(S.moonLight);
    if (wx.tintAmt > 0) state.color.lerp(wxTint, wx.tintAmt * 0.4);
    state.intensity = Math.max(sunI, moonI);

    // fog = exact horizon colour seen by the shader at y = 0 (gradient + haze band)
    state.fogColor.copy(U.uHor.value).lerp(U.uHaze.value, wx.haze);
    state.horizonColor.copy(U.uHor.value);
    state.zenithColor.copy(U.uZen.value);
    state.skyColor.copy(state.fogColor);
    U.uFogCol.value.copy(state.fogColor);
    state.ambientColor.setHex(L.ambColor).lerp(state.displayHorizon, 0.5);
    state.ambientIntensity = L.amb * (0.3 + 0.7 * day) * (1 - dark * 0.3);
    // hemi sky: the preset's light colour pulled toward the current sky hue (same brightness)
    state.hemiSky.setHex(L.hemiSky);
    const hm = Math.max(state.hemiSky.r, state.hemiSky.g, state.hemiSky.b);
    tmp2.copy(state.displayZenith).lerp(state.displayHorizon, 0.5);
    tmp2.multiplyScalar(hm / Math.max(tmp2.r, tmp2.g, tmp2.b, 1e-3));
    state.hemiSky.lerp(tmp2, 0.45);
    if (night > 0.5) state.hemiSky.lerp(tmp2.setHex(S.moonLight), (night - 0.5) * 0.8);
    state.hemiGround.setHex(L.hemiGround).multiplyScalar(0.35 + 0.65 * day);
    state.hemiIntensity = L.hemi * (0.3 + 0.7 * day) * (1 - dark * 0.3);
    state.day = day; state.night = night;
    state.sunElevation = e; state.moonElevation = moonDir.y;
    state.weather = wxKey; state.environment = envKey; state.hour = hour;
  }

  const seedFog = () => {
    if (!pipeline || !pipeline.getEnvironmentConfig) return;
    try { const f = pipeline.getEnvironmentConfig()?.fog; if (f) api.setFogParams(f); } catch {}
  };
  let dirty = true;
  const api = {
    mesh, material, uniforms: U,
    /** dt seconds; o: { timeOfDay (hours 0..24), weather, environment, moonPhase (0 new..0.5 full..1), snap } */
    update(dt = 0, o = {}) {
      if (o.timeOfDay !== undefined && o.timeOfDay !== hour) { hour = ((o.timeOfDay % 24) + 24) % 24; dirty = true; }
      if (o.environment !== undefined) { const k = resolveEnv(o.environment); if (k !== envKey) { envKey = k; dirty = true; seedFog(); } }
      if (o.moonPhase !== undefined && o.moonPhase !== moonPhase) { moonPhase = o.moonPhase; dirty = true; }
      if (o.pipeline !== undefined && o.pipeline !== pipeline) {
        // e.g. game.js render fallback disposes the pipeline -> plain renderer: re-enable our own posterize,
        // drop fog compensation (THREE.Fog does not fog the sky), re-target the tone-curve inverse.
        pipeline = o.pipeline; dirty = true; seedFog();
        if (opts.levels === undefined && opts.dither === undefined) api.setPosterize(!pipeline);
        if (opts.fogCompensation === undefined) U.uFogComp.value = pipeline ? 1 : 0;
      }
      if (o.weather !== undefined) { const k = resolveWeather(o.weather); if (k !== wxKey) { wxKey = k; } }
      // ease weather parameters (no pops when a blizzard rolls in)
      const T = SKY_WEATHER[wxKey];
      const a = o.snap ? 1 : 1 - Math.exp(-dt * 0.6);
      for (const k of WX_KEYS) { const t = T[k]; if (Math.abs(wx[k] - t) > 1e-4) { wx[k] += (t - wx[k]) * a; dirty = true; } }
      wxHaze.lerp(tmp.setHex(T.hazeCol), a); wxTint.lerp(tmp.setHex(T.tint), a);
      time += dt;
      U.uTime.value = time;
      cloudOff.x += dt * 0.012 * wx.drift; cloudOff.y += dt * 0.005 * wx.drift;
      if (dirty || a < 1) { recompute(); dirty = false; }
      return state;
    },
    setWeather(w, snap = false) { return api.update(0, { weather: w, snap }); },
    setEnvironment(id) { return api.update(0, { environment: id, snap: true }); },
    setTime(h) { return api.update(0, { timeOfDay: h }); },
    /** Tell the sky the fog the render/ pipeline is using this frame (same object you pass to pipeline.setFog). */
    setFogParams(f = {}) {
      const P4 = U.uFogP.value;
      if (f.density !== undefined) P4.x = f.density;
      if (f.start !== undefined) P4.y = f.start;
      if (f.maxDist !== undefined) P4.z = f.maxDist;
      if (f.falloff !== undefined) P4.w = f.falloff;
      if (f.base !== undefined) U.uFogBase.value = f.base;
    },
    setFogCompensation(v) { U.uFogComp.value = v; },
    setPixelSize(px) { U.uPixel.value = Math.max(1, px | 0); },
    /** Toggle the sky's own posterize/dither (on for plain renderer, off when the render/ pipeline is active). */
    setPosterize(on, levels = 28) { U.uLevels.value = on ? levels : 255; U.uDither.value = on ? 1 : 0; },
    getSunDirection(out = new THREE.Vector3()) { return out.copy(sunDir); },
    getMoonDirection(out = new THREE.Vector3()) { return out.copy(moonDir); },
    getLightState() { return state; },
    isNight() { return state.night > 0.65; },
    get hour() { return hour; }, get weather() { return wxKey; }, get environment() { return envKey; },
    /**
     * Push the sky's light state into existing lights / fog / pipeline. Every field optional.
     *   sun: DirectionalLight, hemi: HemisphereLight, amb: AmbientLight, fog: THREE.Fog|FogExp2,
     *   scene: keeps scene.background (if a Color) equal to the fog colour (so old code reading it still works),
     *   pipeline: render/ pipeline -> setSun({direction,color,intensity}) + setFog({color}),
     *   distance: how far from sun.target the light is placed (default 30).
     */
    applyTo({ sun, hemi, amb, fog, scene: sc, pipeline, distance = 30, fogOnly = false } = {}) {
      const s = state;
      if (sun && !fogOnly) {
        sun.color.copy(s.color); sun.intensity = s.intensity;
        const tgt = sun.target ? sun.target.position : new THREE.Vector3();
        sun.position.copy(tgt).addScaledVector(s.dir, distance);
      }
      if (hemi && !fogOnly) { hemi.color.copy(s.hemiSky); if (hemi.groundColor) hemi.groundColor.copy(s.hemiGround); hemi.intensity = s.hemiIntensity; }
      if (amb && !fogOnly) { amb.color.copy(s.ambientColor); amb.intensity = s.ambientIntensity; }
      if (fog && fog.color) fog.color.copy(s.fogColor);
      if (sc && sc.background && sc.background.isColor) sc.background.copy(s.fogColor);
      if (pipeline) {
        if (!fogOnly && typeof pipeline.setSun === 'function') pipeline.setSun({ direction: s.dir, color: s.color, intensity: s.intensity });
        if (typeof pipeline.setFog === 'function') pipeline.setFog({ color: s.fogColor });
      }
      return s;
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
      noiseTex.dispose();
      mesh.onBeforeRender = () => {};
    },
  };
  seedFog();
  api.update(0, { snap: true });
  return api;
}

// Baseline light intensities per environment (mirrors render/environments.js noon values).
const ENV_LIGHT = {
  summer: { sun: 1.75, moon: 0.30, amb: 0.40, ambColor: 0xcab89e, hemi: 0.65, hemiSky: 0xb4d4eb, hemiGround: 0x8d7456 },
  autumn: { sun: 1.58, moon: 0.28, amb: 0.42, ambColor: 0x857a8a, hemi: 0.64, hemiSky: 0xdca97a, hemiGround: 0x4a4354 },
  late_fall: { sun: 0.82, moon: 0.20, amb: 0.34, ambColor: 0x58626a, hemi: 0.48, hemiSky: 0x7e8d99, hemiGround: 0x282c30 },
  fallout_winter: { sun: 0.36, moon: 0.12, amb: 0.18, ambColor: 0x242d38, hemi: 0.26, hemiSky: 0x394554, hemiGround: 0x10141b },
};

export const SKY_ENVIRONMENTS = Object.keys(ENV_SKY);
export const SKY_WEATHERS = Object.keys(SKY_WEATHER);
