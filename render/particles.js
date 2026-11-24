// GPU seasonal particles (dust motes, autumn leaves, cold rain/drizzle streaks, soot + snow):
// single draw call, shader-animated, wraps around camera, lit per-vertex by sun (forward scatter),
// flashlight cone and point lights (campfire). Writes depth so the composite fogs each particle
// at its own distance. Zero extra FBOs or recompiles when switching seasons.
import * as THREE from 'three';

const VERT = /* glsl */ `
#define MAX_POINTS 4
attribute float aSeed;
uniform float uTime;
uniform vec3 uBox;
uniform vec3 uCenter;
uniform vec3 uWind;
uniform float uFall;
uniform float uViewH;
uniform float uAshRatio;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uSizeAB;     // world sizes: x = primary (snow/dust/rain), y = secondary (ash/soot/leaves/mist)
uniform vec2 uMaxPxAB;    // screen pixel caps
uniform float uSway;      // horizontal flutter amplitude
uniform float uStreak;    // >0.5 => primary particles render as angled pixel rain streaks
uniform vec3 uAmbient;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSpotPos;
uniform vec3 uSpotDir;
uniform vec3 uSpotColor;
uniform vec2 uSpotCos;
uniform float uSpotRange;
uniform vec4 uPointPos[MAX_POINTS];
uniform vec3 uPointColor[MAX_POINTS];
uniform int uPointCount;
uniform sampler2D tShadow;
uniform mat4 uShadowMatrix;
uniform float uUseShadow;
varying vec3 vColor;
varying float vFade;
varying float vSeed;
varying float vStreak;
void main() {
  bool sec = aSeed < uAshRatio;
  float r1 = fract(aSeed * 13.17);
  float isRain = (!sec && uStreak > 0.5) ? 1.0 : 0.0;
  float speed = isRain > 0.5 ? (0.85 + 0.45 * r1) : (sec ? (0.30 + 0.40 * r1) : (0.75 + 0.60 * r1));
  vec3 p = position * uBox;
  p.y -= uTime * uFall * speed;
  p.xz += uWind.xz * uTime * (sec ? 1.25 : 1.0);
  float sway = isRain > 0.5 ? 0.04 : (sec ? uSway * 1.8 : uSway);
  p.x += sin(uTime * (0.6 + r1 * 1.4) + aSeed * 40.0) * sway;
  p.z += cos(uTime * (0.5 + r1) + aSeed * 17.0) * sway * 0.85;
  vec3 rel = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = uCenter + rel;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;

  vec3 V = normalize(wp - cameraPosition);
  vec3 tint = sec ? uColorB : uColorA;
  vec3 col = uAmbient;
  float fwd = max(dot(V, uSunDir), 0.0);
  float sunVis = 1.0;
  if (uUseShadow > 0.5) {
    vec4 sc = uShadowMatrix * vec4(wp, 1.0);
    if (all(greaterThan(sc.xyz, vec3(0.0))) && all(lessThan(sc.xyz, vec3(1.0)))) {
      vec4 v = texture(tShadow, sc.xy);
      float sd = dot(v, vec4(255.0 / 256.0, 255.0 / 65536.0, 255.0 / 16777216.0, 1.0 / 16777216.0));
      sunVis = step(sc.z - 0.003, sd);
    }
  }
  col += uSunColor * (0.35 + 2.5 * pow(fwd, 6.0)) * sunVis;
  vec3 ls = uSpotPos - wp;
  float dl = length(ls);
  float cone = smoothstep(uSpotCos.x, uSpotCos.y, dot(-ls / max(dl, 1e-3), uSpotDir));
  col += uSpotColor * cone * (1.0 - smoothstep(0.0, uSpotRange, dl)) / (1.0 + dl * dl * 0.06) * 1.6;
  for (int k = 0; k < MAX_POINTS; k++) {
    if (k >= uPointCount) break;
    vec3 lp = uPointPos[k].xyz - wp;
    float d2 = dot(lp, lp);
    col += uPointColor[k] * 1.2 / (1.0 + d2) * (1.0 - smoothstep(0.0, uPointPos[k].w * uPointPos[k].w, d2));
  }
  vColor = col * tint;
  vSeed = aSeed;
  vStreak = isRain;
  float far = uBox.z * 0.5;
  vFade = (1.0 - smoothstep(far * 0.55, far, dist)) * smoothstep(0.25, 0.6, dist);
  float size = sec ? uSizeAB.y : uSizeAB.x;
  float maxPx = sec ? uMaxPxAB.y : uMaxPxAB.x;
  float minPx = isRain > 0.5 ? 2.0 : 1.0;
  gl_PointSize = clamp(size * uViewH * projectionMatrix[1][1] * 0.5 / max(dist, 0.1), minPx, maxPx);
}
`;
const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vFade;
varying float vSeed;
varying float vStreak;
void main() {
  if (vStreak > 0.5) {
    // crisp angled 1-2px raindrop streak (zero alpha-blending overhead)
    vec2 pc = gl_PointCoord - 0.5;
    if (abs(pc.x + pc.y * 0.22) > 0.15) discard;
  }
  // ordered-dither fade instead of alpha blending (no sorting, stays pixel-crisp)
  vec2 q = mod(floor(gl_FragCoord.xy), 2.0);
  float th = (q.x * 2.0 + q.y + 0.5) / 4.0;
  if (vFade < th) discard;
  gl_FragColor = vec4(vColor, 1.0);
}
`;

export function createParticles({
  count = 1400, box = [26, 14, 30], ashRatio = 0.45, fall = 1.1, wind = [0.6, 0, -0.2],
  centerAhead = 0.3, colorA = [1, 1, 1], colorB = [0.32, 0.32, 0.32],
  sizeA = 0.055, sizeB = 0.035, maxPxA = 3.0, maxPxB = 2.0, sway = 0.25, streak = 0,
} = {}) {
  const MAX = 4000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const seed = new Float32Array(MAX);
  let s = 987654321;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < MAX; i++) {
    pos[i * 3] = rnd(); pos[i * 3 + 1] = rnd(); pos[i * 3 + 2] = rnd();
    seed[i] = rnd();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setDrawRange(0, Math.min(count, MAX));

  const uniforms = {
    uTime: { value: 0 },
    uBox: { value: new THREE.Vector3(...box) },
    uCenter: { value: new THREE.Vector3() },
    uWind: { value: new THREE.Vector3(...wind) },
    uFall: { value: fall },
    uViewH: { value: 320 },
    uAshRatio: { value: ashRatio },
    uColorA: { value: new THREE.Vector3(...colorA) },
    uColorB: { value: new THREE.Vector3(...colorB) },
    uSizeAB: { value: new THREE.Vector2(sizeA, sizeB) },
    uMaxPxAB: { value: new THREE.Vector2(maxPxA, maxPxB) },
    uSway: { value: sway },
    uStreak: { value: streak ? 1 : 0 },
    uAmbient: { value: new THREE.Vector3(0.35, 0.38, 0.42) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    uSpotPos: { value: new THREE.Vector3() },
    uSpotDir: { value: new THREE.Vector3(0, 0, -1) },
    uSpotColor: { value: new THREE.Vector3() },
    uSpotCos: { value: new THREE.Vector2(0.9, 0.95) },
    uSpotRange: { value: 20 },
    uPointPos: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uPointColor: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
    uPointCount: { value: 0 },
    tShadow: { value: null },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uUseShadow: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: false, depthWrite: true });
  const points = new THREE.Points(geo, material);
  points.name = 'ashfall-particles';
  points.frustumCulled = false;
  points.renderOrder = 1;
  const fwd = new THREE.Vector3();
  let curBoxZ = box[2];
  return {
    points, uniforms, material,
    setCount(n) { geo.setDrawRange(0, Math.max(0, Math.min(Math.round(n), MAX))); },
    setConfig(cfg = {}) {
      if (cfg.box) { uniforms.uBox.value.set(...cfg.box); curBoxZ = cfg.box[2]; }
      if (cfg.wind) uniforms.uWind.value.set(...cfg.wind);
      if (cfg.fall !== undefined) uniforms.uFall.value = cfg.fall;
      if (cfg.ashRatio !== undefined) uniforms.uAshRatio.value = cfg.ashRatio;
      if (cfg.colorA) uniforms.uColorA.value.set(...cfg.colorA);
      if (cfg.colorB) uniforms.uColorB.value.set(...cfg.colorB);
      if (cfg.sizeA !== undefined) uniforms.uSizeAB.value.x = cfg.sizeA;
      if (cfg.sizeB !== undefined) uniforms.uSizeAB.value.y = cfg.sizeB;
      if (cfg.maxPxA !== undefined) uniforms.uMaxPxAB.value.x = cfg.maxPxA;
      if (cfg.maxPxB !== undefined) uniforms.uMaxPxAB.value.y = cfg.maxPxB;
      if (cfg.sway !== undefined) uniforms.uSway.value = cfg.sway;
      if (cfg.streak !== undefined) uniforms.uStreak.value = cfg.streak ? 1 : 0;
    },
    update(camera, t) {
      uniforms.uTime.value = t;
      camera.getWorldDirection(fwd);
      camera.getWorldPosition(uniforms.uCenter.value).addScaledVector(fwd, curBoxZ * centerAhead);
    },
    dispose() { geo.dispose(); material.dispose(); points.removeFromParent(); },
  };
}
