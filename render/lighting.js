// Sun shadow fitting, camera-following flashlight, campfire (light + flame + embers).
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _mi = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _zero = new THREE.Vector3(0, 0, 0);
const _zup = new THREE.Vector3(0, 0, 1);
const _center = new THREE.Vector3();

/**
 * Fit a DirectionalLight's ortho shadow camera to the first `distance` metres of the
 * view frustum (bounding sphere => rotation-stable), snapped to whole shadow texels
 * so edges don't shimmer as the player moves.
 */
export function fitSunShadow(sun, camera, sunDir, distance) {
  const cam = camera;
  const tanY = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));
  const tanX = tanY * cam.aspect;
  const near = cam.near;
  const far = Math.min(distance, cam.far);
  // sphere around frustum slice: centre on the view axis
  const k = Math.sqrt(1 + tanX * tanX + tanY * tanY);
  const zc = Math.min(far, 0.5 * (far + near) * k * k);
  const radius = Math.sqrt((far - zc) ** 2 + (far * tanX) ** 2 + (far * tanY) ** 2);
  cam.getWorldDirection(_fwd);
  const center = cam.getWorldPosition(_center).addScaledVector(_fwd, zc);

  // snap in light space
  const mapSize = sun.shadow.mapSize.x;
  const texel = (2 * radius) / mapSize;
  _m.lookAt(_zero, _fwd.copy(sunDir).negate(), Math.abs(sunDir.y) > 0.99 ? _zup : _up);
  _mi.copy(_m).invert();
  center.applyMatrix4(_mi);
  center.x = Math.floor(center.x / texel) * texel;
  center.y = Math.floor(center.y / texel) * texel;
  center.applyMatrix4(_m);

  const back = 40; // casters behind the slice (buildings between sun and view)
  sun.target.position.copy(center);
  sun.target.updateMatrixWorld();
  sun.position.copy(center).addScaledVector(sunDir, radius + back);
  sun.updateMatrixWorld();
  const sc = sun.shadow.camera;
  sc.left = -radius; sc.right = radius; sc.top = radius; sc.bottom = -radius;
  sc.near = 0.5; sc.far = 2 * radius + back;
  sc.updateProjectionMatrix();
  sun.shadow.normalBias = texel * 0.8;
  sun.shadow.bias = -0.0004;
}

export function setShadowMapSize(light, size) {
  if (light.shadow.mapSize.x === size) return;
  light.shadow.mapSize.set(size, size);
  if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
}

/** Flashlight: a SpotLight living in the scene root that copies the camera pose each frame. */
export function createFlashlight({ color = 0xdfe8ff, intensity = 38, range = 26, angleDeg = 22, penumbra = 0.45, offset = [-0.05, 0.02, -0.75] } = {}) {
  // default offset puts the lamp just ahead of the viewmodel so the gun isn't blown out by it
  const light = new THREE.SpotLight(color, intensity, range, THREE.MathUtils.degToRad(angleDeg), penumbra, 1.4);
  light.name = 'ashfall-flashlight';
  light.castShadow = false;
  light.shadow.mapSize.set(256, 256);
  light.shadow.camera.near = 0.2;
  light.shadow.bias = -0.0006;
  light.target.name = 'ashfall-flashlight-target';
  const off = new THREE.Vector3(...offset);
  // NOTE: never toggle light.visible: three.js keys every lit shader on the number of visible
  // lights, so a visibility flip recompiles ALL scene materials (multi-100 ms hitch on iPhone).
  // On/off is done with intensity instead; `baseIntensity` holds the user value.
  return {
    light,
    offset: off,
    enabled: true,
    baseIntensity: intensity,
    sway: 0,
    pitch: 0.12, // aim slightly below the crosshair so the pool lands a few metres ahead
    update(camera, t) {
      camera.updateMatrixWorld();
      light.position.copy(off).applyMatrix4(camera.matrixWorld);
      camera.getWorldDirection(_fwd);
      // tiny lag/sway keeps the beam alive
      const s = this.sway;
      _fwd.x += Math.sin(t * 1.3) * 0.01 * s;
      _fwd.y += Math.sin(t * 2.1) * 0.008 * s - this.pitch;
      light.target.position.copy(light.position).addScaledVector(_fwd.normalize(), 10);
      light.target.updateMatrixWorld();
      light.visible = true;
      light.intensity = this.enabled ? this.baseIntensity : 0;
    },
  };
}

// --- Campfire -----------------------------------------------------------------
const FLAME_VERT = /* glsl */ `
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
void main() {
  vUv = uv;
  // camera-facing billboard (cylindrical)
  vec3 centre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCam = cameraPosition - centre; toCam.y = 0.0; toCam = normalize(toCam);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.0);
  vec3 wp = centre + right * position.x * scale.x + vec3(0.0, 1.0, 0.0) * position.y * scale.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;
const FLAME_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uIntensity;
uniform vec2 uTexels;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main() {
  vec2 uv = vUv;
  // quantise to chunky texels so the flame reads as pixel art
  uv = (floor(uv * uTexels) + 0.5) / uTexels;
  float t = uTime * 2.2 + uSeed * 10.0;
  float n = n2(vec2(uv.x * 4.0, uv.y * 3.0 - t)) * 0.6 + n2(vec2(uv.x * 9.0, uv.y * 7.0 - t * 1.7)) * 0.4;
  float w = (1.0 - uv.y) * 0.55 + 0.05;
  float shape = w - abs(uv.x - 0.5) - (n - 0.5) * 0.35 * uv.y;
  if (shape < 0.0 || uv.y > 0.95) discard;
  float heat = clamp(shape * 3.2 + (1.0 - uv.y) * 0.4, 0.0, 1.0);
  vec3 col = mix(vec3(0.9, 0.18, 0.04), vec3(1.0, 0.62, 0.22), smoothstep(0.15, 0.6, heat));
  col = mix(col, vec3(1.0, 0.92, 0.7), smoothstep(0.7, 1.0, heat));
  gl_FragColor = vec4(col * uIntensity * (0.7 + 0.6 * heat), 1.0);
}
`;
const EMBER_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uViewH;
varying float vHeat;
void main() {
  float life = fract(uTime * (0.25 + aSeed * 0.3) + aSeed * 7.0);
  vec3 p = position;
  p.y += life * (1.6 + aSeed);
  p.x += sin(uTime * 2.0 + aSeed * 30.0) * 0.15 * life + life * 0.3 * (aSeed - 0.5);
  p.z += cos(uTime * 1.7 + aSeed * 20.0) * 0.15 * life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vHeat = 1.0 - life;
  gl_PointSize = clamp(0.03 * uViewH * projectionMatrix[1][1] * 0.5 / -mv.z, 1.0, 2.0);
}
`;
const EMBER_FRAG = /* glsl */ `
varying float vHeat;
void main() {
  if (vHeat < 0.15) discard;
  gl_FragColor = vec4(vec3(1.0, 0.45, 0.12) * (1.0 + 4.0 * vHeat), 1.0);
}
`;

// Shared, merged campfire base (4 logs + 9 stones) in one geometry with 2 groups => 2 draw calls
// per campfire instead of 13, and one geometry upload shared by every campfire.
let baseGeo = null, baseRefs = 0;
function mergedBase() {
  if (baseGeo) { baseRefs++; return baseGeo; }
  const parts = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  const logG = new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6).toNonIndexed();
  for (let i = 0; i < 4; i++) {
    e.set(0, (i / 4) * Math.PI * 2, Math.PI / 2 - 0.35, 'YXZ');
    m.compose(new THREE.Vector3(0, 0.12, 0), q.setFromEuler(e), sc.set(1, 1, 1));
    parts.push({ g: logG.clone().applyMatrix4(m), grp: 0 });
  }
  logG.dispose();
  const stG = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, r = 0.11 + 0.03 * Math.sin(i * 7.0);
    m.compose(new THREE.Vector3(Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5), q.identity(), sc.set(r, r, r));
    parts.push({ g: stG.clone().applyMatrix4(m), grp: 1 });
  }
  stG.dispose();
  let total = 0; for (const p of parts) total += p.g.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  const geo = new THREE.BufferGeometry();
  let off = 0, groupStart = 0, curGrp = 0;
  for (const p of parts) {
    if (p.grp !== curGrp) { geo.addGroup(groupStart, off - groupStart, curGrp); groupStart = off; curGrp = p.grp; }
    pos.set(p.g.attributes.position.array, off * 3);
    nor.set(p.g.attributes.normal.array, off * 3);
    off += p.g.attributes.position.count;
    p.g.dispose();
  }
  geo.addGroup(groupStart, off - groupStart, curGrp);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.computeBoundingSphere();
  baseGeo = geo; baseRefs = 1;
  return geo;
}
function releaseBase() {
  if (--baseRefs <= 0 && baseGeo) { baseGeo.dispose(); baseGeo = null; baseRefs = 0; }
}

/**
 * @param {object} o
 * @param {boolean} [o.addLight=true]  false: the PointLight is NOT parented into the scene (the pipeline
 *   drives a fixed-size light pool instead, so adding fires never changes the scene light count).
 */
export function createCampfire({ position = new THREE.Vector3(), color = 0xff7428, intensity = 6, range = 12, glow = 1.0, addLight = true } = {}) {
  const group = new THREE.Group();
  group.name = 'ashfall-campfire';
  group.position.copy(position);

  const light = new THREE.PointLight(color, intensity, range, 1.6);
  light.position.set(0, 0.55, 0);
  light.castShadow = false; // point shadows = 6 extra passes; not worth it on phones
  if (addLight) group.add(light);
  else light.userData.anchor = group; // world pos = group.matrixWorld * light.position

  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: 0.95, emissive: 0x401204, emissiveIntensity: 0.6});
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 1});
  const base = new THREE.Mesh(mergedBase(), [logMat, stoneMat]);
  base.castShadow = true; base.receiveShadow = true;
  base.userData.sharedGeometry = true;
  group.add(base);

  const flameUniforms = [];
  const flameGeo = new THREE.PlaneGeometry(1, 1); // shared by the 3 flame cards
  flameGeo.translate(0, 0.5, 0);
  flameGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1.2); // billboarded in VS
  for (let i = 0; i < 3; i++) {
    const u = { uTime: { value: 0 }, uSeed: { value: i * 0.37 }, uIntensity: { value: 3.0 }, uTexels: { value: new THREE.Vector2(10, 16) } };
    flameUniforms.push(u);
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, fog: false });
    const flame = new THREE.Mesh(flameGeo, mat);
    flame.scale.set(0.55 - i * 0.1, 0.9 - i * 0.15, 1);
    flame.position.set((i - 1) * 0.06, 0.1, (i - 1) * 0.04);
    group.add(flame);
  }

  const EMB = 48;
  const eg = new THREE.BufferGeometry();
  const ep = new Float32Array(EMB * 3);
  const es = new Float32Array(EMB);
  for (let i = 0; i < EMB; i++) {
    ep[i * 3] = (Math.sin(i * 12.9898) * 0.5) * 0.4;
    ep[i * 3 + 1] = 0.3;
    ep[i * 3 + 2] = (Math.cos(i * 78.233) * 0.5) * 0.4;
    es[i] = (Math.sin(i * 43.17) * 0.5 + 0.5);
  }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  eg.setAttribute('aSeed', new THREE.BufferAttribute(es, 1));
  const emberU = { uTime: { value: 0 }, uViewH: { value: 320 } };
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial({ uniforms: emberU, vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG, fog: false }));
  eg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.0, 0), 1.6);
  group.add(embers);

  const baseI = intensity;
  return {
    group, light, glow,
    update(t, viewH) {
      // layered flicker
      const f = 0.82 + 0.1 * Math.sin(t * 9.1) + 0.06 * Math.sin(t * 23.7 + 1.3) + 0.05 * Math.sin(t * 4.3);
      light.intensity = baseI * f;
      light.position.x = Math.sin(t * 7.0) * 0.03;
      const k = Math.max(1, viewH / 320);
      for (const u of flameUniforms) { u.uTime.value = t; u.uIntensity.value = 1.1 + 0.5 * f; u.uTexels.value.set(Math.round(10 * k), Math.round(16 * k)); }
      emberU.uTime.value = t;
      emberU.uViewH.value = viewH;
    },
    dispose() {
      group.traverse((o) => {
        if (o.geometry && !o.userData.sharedGeometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm.dispose());
      });
      releaseBase();
      light.removeFromParent(); light.dispose();
      group.removeFromParent();
    },
  };
}
