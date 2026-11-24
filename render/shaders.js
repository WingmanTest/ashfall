// Ashfall render layer — GLSL (RawShaderMaterial, GLSL3 / WebGL2).
// All passes run at the low internal resolution (or below). Nothing here
// needs float render targets; half-float is used only when supported.

export const HEADER = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;
`;

export const FULLSCREEN_VERT = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Shared helpers ------------------------------------------------------------
const COMMON = /* glsl */ `
#define PI 3.14159265359
float unpackRGBAToDepth(vec4 v) {
  const float UnpackDownscale = 255.0 / 256.0;
  const vec4 UnpackFactors4 = vec4(UnpackDownscale / 1.0, UnpackDownscale / 256.0,
                                   UnpackDownscale / 65536.0, 1.0 / 16777216.0);
  return dot(v, UnpackFactors4);
}
vec3 reconstructWorld(vec2 uv, float depth, mat4 invProj, mat4 camWorld) {
  vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 vp = invProj * ndc;
  vp /= vp.w;
  return (camWorld * vec4(vp.xyz, 1.0)).xyz;
}
// Henyey-Greenstein, normalised so isotropic == 1.0
float hgPhase(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5);
}
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1, 0, 0));
  float n010 = hash13(i + vec3(0, 1, 0));
  float n110 = hash13(i + vec3(1, 1, 0));
  float n001 = hash13(i + vec3(0, 0, 1));
  float n101 = hash13(i + vec3(1, 0, 1));
  float n011 = hash13(i + vec3(0, 1, 1));
  float n111 = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
// Optical depth of exponential height fog along a ray segment [0, L].
float fogOpticalDepth(vec3 ro, vec3 rd, float L, float dens, float base, float k) {
  float a = dens * exp(-k * (ro.y - base));
  float b = k * rd.y;
  return abs(b) > 1e-4 ? a * (1.0 - exp(-b * L)) / b : a * L;
}
`;

// Volumetric in-scatter ------------------------------------------------------
// Output rgb = average in-scattered radiance along the view ray (normalised by
// opacity, so the composite can apply exact per-pixel transmittance at full
// internal res). alpha = 1 - transmittance (for debugging).
export const VOLUME_FRAG = /* glsl */ `
${COMMON}
in vec2 vUv;
out vec4 outColor;

uniform sampler2D tDepth;
uniform sampler2D tBlue;
uniform sampler2D tShadow;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec2 uRes;
uniform float uSteps;
uniform float uMaxDist;
uniform float uFogStart;
uniform float uFrame;
uniform float uTime;

uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogBase;
uniform float uFogFalloff;
uniform float uNoiseAmt;
uniform vec3 uWind;

uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunG;
uniform mat4 uShadowMatrix;
uniform float uShadowBias;

uniform vec3 uSpotPos;
uniform vec3 uSpotDir;
uniform vec3 uSpotColor;
uniform vec2 uSpotCos;
uniform float uSpotRange;

uniform vec4 uPointPos[MAX_POINTS];
uniform vec3 uPointColor[MAX_POINTS];
uniform int uPointCount;

uniform vec2 uSunUV;
uniform float uSunVis;
uniform float uGodStrength;
uniform float uGodDecay;
uniform float uGodDensity;
uniform float uEncode;

void main() {
  float d = texture(tDepth, vUv).r;
  vec3 wp = reconstructWorld(vUv, d, uInvProj, uCamWorld);
  vec3 rd = wp - uCamPos;
  float dist = length(rd);
  rd /= max(dist, 1e-4);
  if (d >= 0.99999) dist = uMaxDist;
  float len = min(dist, uMaxDist);

  float jitter = texture(tBlue, gl_FragCoord.xy / 32.0).r;
  jitter = fract(jitter + uFrame * 0.61803398875);

  float t0 = min(uFogStart, len);
  float ds = (len - t0) / uSteps;
  vec3 scat = vec3(0.0);
  float T = 1.0;
  float phaseSun = hgPhase(dot(rd, uSunDir), uSunG);

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= uSteps) break;
    float t = t0 + (float(i) + jitter) * ds;
    vec3 p = uCamPos + rd * t;
    float dens = uFogDensity * exp(-uFogFalloff * (p.y - uFogBase));
#ifdef USE_NOISE
    // falling ash: noise field advected down + along the wind
    float n = vnoise(p * vec3(0.45, 0.3, 0.45) - uWind * uTime);
    dens *= mix(1.0, 0.35 + 1.3 * n, uNoiseAmt);
#endif
    vec3 L = uFogColor;
    float sh = 1.0;
#ifdef USE_SHADOW
    vec4 sc = uShadowMatrix * vec4(p, 1.0);
    if (all(greaterThan(sc.xyz, vec3(0.001))) && all(lessThan(sc.xyz, vec3(0.999)))) {
      float sd = unpackRGBAToDepth(texture(tShadow, sc.xy));
      sh = step(sc.z - uShadowBias, sd);
    }
#endif
    L += uSunColor * phaseSun * sh;

    // flashlight cone
    vec3 ls = uSpotPos - p;
    float dl = length(ls);
    vec3 ln = ls / max(dl, 1e-3);
    float cone = smoothstep(uSpotCos.x, uSpotCos.y, dot(-ln, uSpotDir));
    float fall = (1.0 - smoothstep(0.0, uSpotRange, dl)) / (1.0 + dl * dl * 0.08);
    L += uSpotColor * cone * fall * hgPhase(dot(ln, rd), 0.25);

    float tr = exp(-dens * ds);
    scat += T * L * (1.0 - tr);
    T *= tr;
  }

  // point lights (campfire): analytic single-scatter integral of 1/(r^2+e)
  for (int k = 0; k < MAX_POINTS; k++) {
    if (k >= uPointCount) break;
    vec3 lp = uPointPos[k].xyz - uCamPos;
    float b = dot(lp, rd);
    float h2 = max(dot(lp, lp) - b * b, 0.0) + 0.35;
    float h = sqrt(h2);
    float integ = (atan((len - b) / h) - atan(-b / h)) / h;
    float yb = uCamPos.y + rd.y * clamp(b, 0.0, len);
    float densL = uFogDensity * exp(-uFogFalloff * (yb - uFogBase));
    float Tl = exp(-densL * clamp(b, 0.0, len));
    scat += uPointColor[k] * integ * densL * Tl * uPointPos[k].w;
  }

#if GOD_SAMPLES > 0
  if (uSunVis > 0.0) {
    vec2 delta = (vUv - uSunUV) * (uGodDensity / float(GOD_SAMPLES));
    vec2 uv = vUv - delta * jitter;
    float illum = 1.0;
    float acc = 0.0;
    for (int i = 0; i < GOD_SAMPLES; i++) {
      uv -= delta;
      vec2 cuv = clamp(uv, vec2(0.0), vec2(1.0));
      float sky = step(0.99999, texture(tDepth, cuv).r);
      acc += sky * illum;
      illum *= uGodDecay;
    }
    acc /= float(GOD_SAMPLES);
    vec2 dv = (vUv - uSunUV) * vec2(uRes.x / uRes.y, 1.0);
    float radial = 1.0 - smoothstep(0.0, 1.1, length(dv));
    // only add shafts where something is between eye and sky (keeps sky clean)
    float occl = 1.0 - step(0.99999, d) * 0.6;
    scat += uSunColor * acc * uGodStrength * uSunVis * radial * occl;
  }
#endif

  float opacity = 1.0 - T;
  vec3 radiance = scat / max(opacity, 0.02);
  outColor = vec4(radiance * uEncode, opacity);
}
`;

// Bloom ------------------------------------------------------------------------
export const BLOOM_PREFILTER_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tSrc;
uniform vec2 uTexel; // of source
uniform float uThreshold;
uniform float uKnee;
void main() {
  vec3 c = texture(tSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb
         + texture(tSrc, vUv + uTexel * vec2( 0.5, -0.5)).rgb
         + texture(tSrc, vUv + uTexel * vec2(-0.5,  0.5)).rgb
         + texture(tSrc, vUv + uTexel * vec2( 0.5,  0.5)).rgb;
  c *= 0.25;
  if (!(c.r < 1e4 && c.g < 1e4 && c.b < 1e4 && c.r >= 0.0 && c.g >= 0.0 && c.b >= 0.0)) c = vec3(0.0); // NaN/Inf guard
  c = min(c, vec3(32.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  outColor = vec4(c * contrib, 1.0);
}
`;

export const BLOOM_DOWN_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = texture(tSrc, vUv).rgb * 4.0
         + texture(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb
         + texture(tSrc, vUv + uTexel * vec2( 1.0, -1.0)).rgb
         + texture(tSrc, vUv + uTexel * vec2(-1.0,  1.0)).rgb
         + texture(tSrc, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  outColor = vec4(c / 8.0, 1.0);
}
`;

export const BLOOM_UP_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tLow;
uniform sampler2D tCur;
uniform vec2 uTexel; // of low
void main() {
  vec3 low = texture(tLow, vUv + uTexel * vec2(-0.5, -0.5)).rgb
           + texture(tLow, vUv + uTexel * vec2( 0.5, -0.5)).rgb
           + texture(tLow, vUv + uTexel * vec2(-0.5,  0.5)).rgb
           + texture(tLow, vUv + uTexel * vec2( 0.5,  0.5)).rgb;
  outColor = vec4(low * 0.25 + texture(tCur, vUv).rgb, 1.0);
}
`;

// Composite: fog apply + bloom + tonemap + grade + dither + palette + grain ---
export const COMPOSITE_FRAG = /* glsl */ `
${COMMON}
in vec2 vUv;
out vec4 outColor;

uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tVol;
uniform sampler2D tBloom;
uniform vec2 uVolRes;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform float uMaxDist;
uniform float uFogStart;
uniform float uFogDensity;
uniform float uFogBase;
uniform float uFogFalloff;
uniform float uDecode;
uniform float uVolOn;
uniform vec3 uFogColor;
uniform float uBloomStrength;
uniform float uExposure;
uniform float uTime;

uniform float uContrast;
uniform float uSaturation;
uniform float uBrightness;
uniform vec3 uTint;
uniform vec3 uLift;
uniform float uGamma;
uniform float uCrush;

uniform sampler2D tLUT;   // 64^3 nearest-palette index LUT (R8, 8x8 tiles of 64x64)
uniform sampler2D tPal;   // 256x1 palette colours
uniform sampler2D tBlue;  // 32x32 blue noise
uniform int uPaletteOn;
uniform int uDitherMode;  // 0 bayer4, 1 bayer8, 2 blue noise
uniform float uNoiseMix;
uniform float uPaletteMix;
uniform float uDither;
uniform float uGrain;
uniform float uWarmKeep;
uniform float uToe;

#ifdef CHEAP_VOL
// Mobile tier: no raymarch pass / no low-res target / no bilateral upsample. In-scatter is
// evaluated analytically per pixel here: fog colour + sun phase + flashlight cone (3 fixed taps)
// + campfire glow (closed-form 1/r^2 integral). No shadows, no noise.
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunG;
uniform vec3 uSpotPos;
uniform vec3 uSpotDir;
uniform vec3 uSpotColor;
uniform vec2 uSpotCos;
uniform float uSpotRange;
uniform vec4 uPointPos[MAX_POINTS];
uniform vec3 uPointColor[MAX_POINTS];
uniform int uPointCount;
vec3 cheapScatter(vec3 rd, float t0, float len, float opacity) {
  vec3 L = uFogColor + uSunColor * hgPhase(dot(rd, uSunDir), uSunG);
  // flashlight beam: average of 3 taps along the visible segment (front-weighted)
  vec3 beam = vec3(0.0);
  float seg = len - t0;
  for (int i = 0; i < 3; i++) {
    float t = t0 + seg * (float(i) * float(i) + 0.5) / 9.5;
    vec3 ls = uSpotPos - (uCamPos + rd * t);
    float dl = length(ls);
    vec3 ln = ls / max(dl, 1e-3);
    float cone = smoothstep(uSpotCos.x, uSpotCos.y, dot(-ln, uSpotDir));
    float fall = (1.0 - smoothstep(0.0, uSpotRange, dl)) / (1.0 + dl * dl * 0.08);
    beam += cone * fall * hgPhase(dot(ln, rd), 0.25);
  }
  L += uSpotColor * beam * (1.0 / 3.0);
  vec3 scat = L * opacity;
  for (int k = 0; k < MAX_POINTS; k++) {
    if (k >= uPointCount) break;
    vec3 lp = uPointPos[k].xyz - uCamPos;
    float b = dot(lp, rd);
    float h2 = max(dot(lp, lp) - b * b, 0.0) + 0.35;
    float h = sqrt(h2);
    float integ = (atan((len - b) / h) - atan(-b / h)) / h;
    float yb = uCamPos.y + rd.y * clamp(b, 0.0, len);
    float densL = uFogDensity * exp(-uFogFalloff * (yb - uFogBase));
    scat += uPointColor[k] * integ * densL * exp(-densL * clamp(b, 0.0, len)) * uPointPos[k].w;
  }
  return scat;
}
#endif

const float B4[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
                               3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

float linDepth(float d) {
  float z = d * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 acesFilmic(vec3 color) {
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840),
                                 vec3(0.35458, 0.90834, 0.13383),
                                 vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327),
                                  vec3(-0.53108, 1.10813, -0.07276),
                                  vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
vec3 linearToSRGB(vec3 c) {
  bvec3 cutoff = lessThan(c, vec3(0.0031308));
  vec3 higher = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  vec3 lower = c * 12.92;
  return mix(higher, lower, vec3(cutoff));
}
// identical maths to Echo's postprocess.py grade() (art_C look)
vec3 grade(vec3 c, float warm) {
  // keep fire/ember hues alive through the cold grade (art_C has no warm sources)
  c = c * mix(uTint, vec3(1.0), warm);
  vec3 c0 = c;
  c = (c - 0.5) * uContrast + 0.5;
  c += uLift;
  // shadow toe (refined): contrast + lift would clip everything below ~0.066 to black. Keep a
  // gentle linear toe instead so deep shadows retain separable steps above the lifted floor.
  c = mix(c, max(c, uLift + c0 * 0.38), uToe);
  c *= uBrightness;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(luma), c, mix(uSaturation, 0.85, warm));
  c = pow(clamp(c, 0.0, 1.0), vec3(uGamma));
  vec3 sm = smoothstep(mix(0.08, 0.0, uToe), 0.92, c);
  sm = mix(sm, max(sm, c * 0.75), uToe); // crush adds punch to mids/highs, not to the darkest steps
  c = mix(c, sm, uCrush * 0.7);
  return c;
}
vec3 paletteLUT(vec3 c) {
  ivec3 q = ivec3(clamp(c, 0.0, 1.0) * 63.0 + 0.5);
  int idx = int(texelFetch(tLUT, ivec2(q.r + (q.b & 7) * 64, q.g + (q.b >> 3) * 64), 0).r * 255.0 + 0.5);
  return texelFetch(tPal, ivec2(idx, 0), 0).rgb;
}
float bayer8(ivec2 p) {
  int x = p.x & 7, y = p.y & 7, xy = x ^ y;
  int v = ((xy & 1) << 5) | ((x & 1) << 4) | ((xy & 2) << 2) | ((x & 2) << 1) | ((xy & 4) >> 1) | ((x & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

void main() {
  vec3 col = texture(tScene, vUv).rgb;
  if (!(col.r < 1e4 && col.g < 1e4 && col.b < 1e4)) col = vec3(0.0); // NaN/Inf guard
  float d = texture(tDepth, vUv).r;

  if (uVolOn > 0.5) {
    // per-pixel exact transmittance (analytic height fog)
    vec3 wp = reconstructWorld(vUv, d, uInvProj, uCamWorld);
    vec3 rd = wp - uCamPos;
    float dist = length(rd);
    rd /= max(dist, 1e-4);
    if (d >= 0.99999) dist = uMaxDist;
    float len = min(dist, uMaxDist);
    float st = min(uFogStart, len);
    float Tp = exp(-fogOpticalDepth(uCamPos + rd * st, rd, len - st, uFogDensity, uFogBase, uFogFalloff));

#ifdef CHEAP_VOL
    col = col * Tp + cheapScatter(rd, st, len, 1.0 - Tp);
#else
    // depth-aware upsample of low-res in-scatter radiance
    float dc = linDepth(d);
    vec2 vp = vUv * uVolRes - 0.5;
    vec2 f = fract(vp);
    vec2 b0 = floor(vp);
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int j = 0; j < 4; j++) {
      vec2 o = vec2(float(j & 1), float(j >> 1));
      vec2 tuv = (b0 + o + 0.5) / uVolRes;
      float dz = linDepth(texture(tDepth, tuv).r);
      float wb = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y);
      float w = (wb + 1e-3) / (0.03 + abs(dz - dc) / max(dc, 0.05));
      acc += texture(tVol, tuv).rgb * w;
      wsum += w;
    }
    vec3 rad = acc / max(wsum, 1e-5) * uDecode;
    col = col * Tp + rad * (1.0 - Tp);
#endif
  }

  col += texture(tBloom, vUv).rgb * uBloomStrength;

  col = acesFilmic(col);
  col = linearToSRGB(col);
  float warm = smoothstep(0.06, 0.3, col.r - col.b) * uWarmKeep;
  col = grade(col, warm);

  vec2 pc = floor(vUv * uRes);
  float th;
  if (uDitherMode == 1) th = bayer8(ivec2(pc));
  else if (uDitherMode == 2) th = texture(tBlue, (pc + 0.5) / 32.0).r;
  else th = (B4[int(mod(pc.y, 4.0)) * 4 + int(mod(pc.x, 4.0))] + 0.5) / 16.0;
  float n = hash12(pc + vec2(7.13, 3.17));
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // dark-adaptive dither: palette steps are finer in the deep ramp, so use less amplitude there
  float dAmt = uDither * mix(1.0, mix(0.45, 1.0, smoothstep(0.02, 0.22, luma)), uToe);
  col += (mix(th, n, uNoiseMix) - 0.5) * dAmt;

  if (uPaletteOn > 0) {
    col = mix(col, paletteLUT(col), uPaletteMix);
  }
  // grain is applied after quantisation; fade it out of the deepest shadows so blacks stay clean
  col += (hash12(pc + fract(uTime) * 61.0 + 17.0) - 0.5) * uGrain * mix(1.0, smoothstep(0.04, 0.25, luma), uToe);
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

// Final pass: nearest-neighbour upscale to the canvas + subtle CRT TV overlay.
// One cheap full-screen pass at canvas resolution (<= 3 texture taps).
// uCurve 0 => flat; all CRT terms scale to zero for 'off'.
export const BLIT_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tSrc;
uniform vec2 uInternal;   // low-res source size
uniform vec2 uCanvas;     // output size in px
uniform float uCurve;     // barrel amount (0..0.12)
uniform float uScanline;  // 0..1
uniform float uChroma;    // edge RGB offset, in source pixels
uniform float uVignette;  // 0..1
uniform float uCorner;    // rounded-corner radius (fraction of short side)
uniform float uFlicker;   // 0..0.05
uniform float uTime;

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  // aspect-aware so a portrait frame bulges evenly
  float asp = uCanvas.x / uCanvas.y;
  vec2 cc = c * vec2(asp, 1.0);
  float r2 = dot(cc, cc);
  c *= 1.0 + uCurve * r2;
  return c * 0.5 + 0.5;
}
float roundedMask(vec2 uv) {
  vec2 px = uv * uCanvas;
  vec2 half_ = uCanvas * 0.5;
  float rad = uCorner * min(uCanvas.x, uCanvas.y);
  vec2 q = abs(px - half_) - (half_ - vec2(rad));
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
  return 1.0 - smoothstep(-1.5, 0.5, dist);
}
void main() {
  vec2 uv = uCurve > 0.0 ? barrel(vUv) : vUv;
  float inside = roundedMask(uv);
  if (inside <= 0.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  vec3 col;
  if (uChroma > 0.0) {
    vec2 c = uv - 0.5;
    float e = dot(c, c) * 4.0;              // 0 centre .. ~2 corners
    vec2 off = c * e * e * uChroma / vec2(180.0, 320.0); // constant on-screen size for any internal res
    col.r = texture(tSrc, uv + off).r;
    col.g = texture(tSrc, uv).g;
    col.b = texture(tSrc, uv - off).b;
  } else {
    col = texture(tSrc, uv).rgb;            // NearestFilter does the pixel snap
  }

  // scanline period never finer than 3 canvas px (avoids moire at HD-pixel internal res)
  float rows = min(uInternal.y, uCanvas.y / 3.0);
  float sl = 0.5 + 0.5 * cos(uv.y * rows * 6.28318530718);
  col *= 1.0 - uScanline * sl * 0.5;
  vec2 vc = uv * 2.0 - 1.0;
  float vig = clamp(1.0 - dot(vc * vec2(0.9, 0.75), vc * vec2(0.9, 0.75)) * 0.55, 0.0, 1.0);
  col *= mix(1.0, vig * vig, uVignette);
  col *= 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 113.0)) ;
  outColor = vec4(col * inside, 1.0);
}
`;
