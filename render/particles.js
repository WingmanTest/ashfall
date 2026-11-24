// GPU snow + ash: fully shader-animated, wraps around the camera, lit per-vertex by
// sun (forward scatter), flashlight cone and point lights (campfire). Writes depth so the
// composite fogs each flake at its own distance. Opaque square points => crisp pixels.
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
void main() {
  bool ash = aSeed < uAshRatio;
  float r1 = fract(aSeed * 13.17);
  float speed = ash ? 0.25 + 0.35 * r1 : 0.75 + 0.6 * r1;
  vec3 p = position * uBox;
  p.y -= uTime * uFall * speed;
  p.xz += uWind.xz * uTime * (ash ? 1.25 : 1.0);
  p.x += sin(uTime * (0.6 + r1 * 1.4) + aSeed * 40.0) * (ash ? 0.5 : 0.25);
  p.z += cos(uTime * (0.5 + r1) + aSeed * 17.0) * 0.25;
  vec3 rel = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = uCenter + rel;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;

  vec3 V = normalize(wp - cameraPosition);
  float albedo = ash ? 0.32 : 1.0;
  vec3 col = uAmbient;
  float fwd = max(dot(V, uSunDir), 0.0);
  float sunVis = 1.0;
  if (uUseShadow > 0.5) { // vertex-fetch the sun shadow map: flakes/motes under roofs or behind walls stay dark
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
  vColor = col * albedo;
  vSeed = aSeed;
  float far = uBox.z * 0.5;
  vFade = (1.0 - smoothstep(far * 0.55, far, dist)) * smoothstep(0.25, 0.6, dist);
  float size = ash ? 0.035 : 0.055;
  // world-size flakes; max caps keep near flakes from turning into big squares at HD-pixel res
  gl_PointSize = clamp(size * uViewH * projectionMatrix[1][1] * 0.5 / max(dist, 0.1), 1.0, ash ? 2.0 : 3.0);
}
`;
const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vFade;
varying float vSeed;
void main() {
  // ordered-dither fade instead of alpha blending (no sorting, stays pixel-crisp)
  vec2 q = mod(floor(gl_FragCoord.xy), 2.0);
  float th = (q.x * 2.0 + q.y + 0.5) / 4.0;
  if (vFade < th) discard;
  gl_FragColor = vec4(vColor, 1.0);
}
`;

export function createParticles({ count = 1400, box = [26, 14, 30], ashRatio = 0.45, fall = 1.1, wind = [0.6, 0, -0.2], centerAhead = 0.3 } = {}) {
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
  return {
    points, uniforms, material,
    setCount(n) { geo.setDrawRange(0, Math.max(0, Math.min(n, MAX))); },
    update(camera, t) {
      uniforms.uTime.value = t;
      camera.getWorldDirection(fwd);
      camera.getWorldPosition(uniforms.uCenter.value).addScaledVector(fwd, box[2] * centerAhead);
    },
    dispose() { geo.dispose(); material.dispose(); points.removeFromParent(); },
  };
}
