import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { POST_VERT, POST_FRAG } from './shaders.js?v=r9';

const STYLE = (new URLSearchParams(location.search).get('style') || 'A').toUpperCase();

// Endesga 32 (Lospec, CC0) — used as-is for A, hue-shifted derivatives for B/C/D.
const ENDESGA32 = [
  'be4a2f','d77643','ead4aa','e4a672','b86f50','733e39','3e2731','a22633',
  'e43b44','f77622','feae34','fee761','63c74d','3e8948','265c42','193c3e',
  '124e89','0099db','2ce8f5','ffffff','c0cbdc','8b9bb4','5a6988','3a4466',
  '262b44','181425','ff0044','68386c','b55088','f6757a','e8b796','c28569'
].map(hexToColor);

function hexToColor(h) {
  const n = parseInt(h, 16);
  return new THREE.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
function rgbArr(c) { return [c.r, c.g, c.b]; }
function shiftPalette(src, hueShift, satMul, valMul, tint) {
  return src.map((col) => {
    const c = col.clone().convertSRGBToLinear();
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    hsl.h = (hsl.h + hueShift + 1) % 1;
    hsl.s = Math.min(1, hsl.s * satMul);
    hsl.l = Math.min(1, Math.max(0, hsl.l * valMul));
    c.setHSL(hsl.h, hsl.s, hsl.l);
    if (tint) c.lerp(tint, 0.28);
    return c.convertLinearToSRGB();
  });
}

function winterPalette() {
  // Cold blue-greys with hard black/white accents, derived from Endesga 32.
  const base = shiftPalette(ENDESGA32, 0.52, 0.25, 0.85, new THREE.Color(0.55, 0.66, 0.78));
  // inject high-contrast ink and snow
  base[0] = new THREE.Color(0x0a0d12);
  base[1] = new THREE.Color(0x141820);
  base[2] = new THREE.Color(0x1c2430);
  base[3] = new THREE.Color(0x2a3340);
  base[4] = new THREE.Color(0x3d4a58);
  base[5] = new THREE.Color(0x5a6a7a);
  base[6] = new THREE.Color(0x8a9aaa);
  base[7] = new THREE.Color(0xc5d0da);
  base[8] = new THREE.Color(0xe8eef4);
  base[9] = new THREE.Color(0xffffff);
  base[10] = new THREE.Color(0x6a7b8c);
  base[11] = new THREE.Color(0x9bb0c0);
  return base;
}

function toxicPalette() {
  const base = shiftPalette(ENDESGA32, 0.28, 1.15, 0.7, new THREE.Color(0.15, 0.55, 0.22));
  base[0] = new THREE.Color(0x020604);
  base[1] = new THREE.Color(0x071109);
  base[2] = new THREE.Color(0x0c1c10);
  base[3] = new THREE.Color(0x132616);
  base[4] = new THREE.Color(0x1c3a1c);
  base[5] = new THREE.Color(0x2d5a24);
  base[6] = new THREE.Color(0x3e7a28);
  base[7] = new THREE.Color(0x6ad13a);
  base[8] = new THREE.Color(0xa8f06a);
  base[9] = new THREE.Color(0xd6ff9a);
  base[10] = new THREE.Color(0x17301a);
  base[11] = new THREE.Color(0x87ff4a);
  return base;
}

function doomPalette() {
  const base = shiftPalette(ENDESGA32, -0.02, 1.25, 0.95, new THREE.Color(0.55, 0.18, 0.08));
  // keep Endesga reds/browns dominant, crush blues
  return base.map((c) => {
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    if (hsl.h > 0.45 && hsl.h < 0.72) {
      hsl.s *= 0.25;
      hsl.l *= 0.7;
      c.setHSL(hsl.h, hsl.s, hsl.l);
    }
    return c;
  });
}

const STYLES = {
  A: {
    name: 'Dusty Orange Wasteland',
    internal: [320, 180],
    palette: ENDESGA32,
    clear: 0xc8894a,
    fog: 0xd29a5b,
    fogNear: 14, fogFar: 62,
    sun: 0xffd09a, sunInt: 2.35,
    sunDir: [-0.55, 0.72, 0.35],
    hemiSky: 0xf0c27a, hemiGround: 0x6a3b22, hemiInt: 1.4,
    amb: 0x6a3a1c, ambInt: 0.7,
    ground: 'road_damaged', shoulder: 'dirt',
    buildingMaps: 'rust_coarse_01',
    weather: 0.72, weatherTint: 0xc47a48,
    dither: 0.045, scanline: 0.22, grain: 0.035, vignette: 0.55,
    contrast: 1.12, saturation: 0.92, brightness: 1.05,
    tint: [1.08, 0.92, 0.72], lift: [0.04, 0.02, 0.0], gamma: 0.95, crush: 0.05,
    flashlight: 0, flashAngle: 1, flashSoft: 0.2,
    particles: 'dust',
    hud: 'wasteland',
    buildingScale: 5.2,
  },
  B: {
    name: 'Toxic Green Night',
    internal: [320, 180],
    palette: toxicPalette(),
    clear: 0x020804,
    fog: 0x0a1a0c,
    fogNear: 8, fogFar: 38,
    sun: 0x88ff66, sunInt: 0.08,
    sunDir: [-0.2, 0.9, 0.2],
    hemiSky: 0x16331a, hemiGround: 0x031006, hemiInt: 0.35,
    amb: 0x071209, ambInt: 0.22,
    ground: 'road_damaged', shoulder: 'dirt',
    buildingMaps: 'rusty_metal',
    weather: 0.8, weatherTint: 0x3a5a38,
    dither: 0.12, scanline: 0.28, grain: 0.06, vignette: 0.85,
    contrast: 1.2, saturation: 1.05, brightness: 0.92,
    tint: [0.7, 1.15, 0.72], lift: [0.0, 0.02, 0.0], gamma: 1.05, crush: 0.12,
    flashlight: 1.0, flashAngle: 0.72, flashSoft: 0.28,
    particles: 'spores',
    hud: 'toxic',
    buildingScale: 5.2,
  },
  C: {
    name: 'Cold Nuclear Winter',
    internal: [320, 180],
    palette: winterPalette(),
    clear: 0xb8c4d0,
    fog: 0xc5d0da,
    fogNear: 10, fogFar: 48,
    sun: 0xe8eef6, sunInt: 1.55,
    sunDir: [0.35, 0.8, 0.4],
    hemiSky: 0xd8e2ec, hemiGround: 0x6a7380, hemiInt: 0.95,
    amb: 0x8a96a4, ambInt: 0.5,
    ground: 'asphalt_snow', shoulder: 'snow_02',
    buildingMaps: 'dirty_concrete',
    weather: 0.7, weatherTint: 0xa8b4c0,
    dither: 0.07, scanline: 0.12, grain: 0.04, vignette: 0.45,
    contrast: 1.35, saturation: 0.55, brightness: 1.08,
    tint: [0.85, 0.92, 1.12], lift: [0.02, 0.03, 0.05], gamma: 0.9, crush: 0.55,
    flashlight: 0, flashAngle: 1, flashSoft: 0.2,
    particles: 'snow',
    hud: 'winter',
    buildingScale: 5.2,
  },
  D: {
    name: 'Retro Doom-style',
    internal: [256, 144],
    palette: doomPalette(),
    clear: 0x6a3a22,
    fog: 0x7a4a28,
    fogNear: 12, fogFar: 50,
    sun: 0xffc080, sunInt: 2.1,
    sunDir: [-0.45, 0.7, 0.4],
    hemiSky: 0xcc8844, hemiGround: 0x3a2010, hemiInt: 1.0,
    amb: 0x4a2010, ambInt: 0.4,
    ground: 'road_damaged', shoulder: 'dirt',
    buildingMaps: 'red_brick',
    weather: 0.62, weatherTint: 0xa05030,
    dither: 0.035, scanline: 0.42, grain: 0.05, vignette: 0.5,
    contrast: 1.22, saturation: 1.15, brightness: 1.0,
    tint: [1.12, 0.88, 0.7], lift: [0.03, 0.0, 0.0], gamma: 0.92, crush: 0.18,
    flashlight: 0, flashAngle: 1, flashSoft: 0.2,
    particles: 'none',
    hud: 'doom',
    buildingScale: 5.2,
  },
};

const cfg = STYLES[STYLE] || STYLES.A;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader();

function loadTexture(url, { srgb = false, wrap = true } = {}) {
  return new Promise((resolve, reject) => {
    texLoader.load(url, (t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      t.anisotropy = 8;
      t.needsUpdate = true;
      resolve(t);
    }, undefined, reject);
  });
}

async function loadPBR(name) {
  const base = `./assets/polyhaven/${name}/${name}`;
  const [diff, nor, rough] = await Promise.all([
    loadTexture(`${base}_diff_1k.jpg`, { srgb: true }),
    loadTexture(`${base}_nor_1k.jpg`, { srgb: false }),
    loadTexture(`${base}_rough_1k.jpg`, { srgb: false }),
  ]);
  nor.colorSpace = THREE.LinearSRGBColorSpace;
  rough.colorSpace = THREE.LinearSRGBColorSpace;
  return { diff, nor, rough };
}

function loadGLB(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (g) => resolve(g), undefined, reject);
  });
}

function boxOf(obj) {
  return new THREE.Box3().setFromObject(obj);
}
function sizeOf(obj) {
  const b = boxOf(obj);
  const s = new THREE.Vector3();
  b.getSize(s);
  return s;
}
function fitHeight(obj, height, alignBottom = true) {
  const s = sizeOf(obj);
  if (s.y < 1e-6) return obj;
  const k = height / s.y;
  obj.scale.multiplyScalar(k);
  if (alignBottom) {
    obj.updateMatrixWorld(true);
    const b = boxOf(obj);
    obj.position.y += -b.min.y;
  }
  return obj;
}
function fitLength(obj, length) {
  obj.updateMatrixWorld(true);
  const s = sizeOf(obj);
  const k = length / Math.max(s.x, s.z, 1e-6);
  obj.scale.multiplyScalar(k);
  return obj;
}

function enableShadows(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

function weatherMeshes(root, maps, amount, tintHex) {
  const tint = new THREE.Color(tintHex);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    const mat = new THREE.MeshStandardMaterial({
      map: src.map || null,
      color: tint,
      roughness: 0.88,
      metalness: 0.12,
      roughnessMap: maps.rough || null,
      normalMap: maps.nor || null,
      normalScale: new THREE.Vector2(0.7, 0.7),
      envMapIntensity: 0.25,
    });
    if (src.map) {
      src.map.colorSpace = THREE.SRGBColorSpace;
      mat.map = src.map;
    }
    mat.userData.weather = amount;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.triMap = { value: maps.diff };
      shader.uniforms.triScale = { value: 0.35 };
      shader.uniforms.uWeather = { value: amount };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWN = normalize((modelMatrix * vec4(normalize(normal), 0.0)).xyz);
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWP; varying vec3 vWN;
          uniform sampler2D triMap; uniform float triScale; uniform float uWeather;
          vec3 triplanar(sampler2D tex, vec3 p, vec3 n, float s) {
            vec3 b = pow(abs(n) + 0.001, vec3(4.0));
            b /= (b.x + b.y + b.z);
            vec3 x = texture2D(tex, p.yz * s).rgb;
            vec3 y = texture2D(tex, p.xz * s).rgb;
            vec3 z = texture2D(tex, p.xy * s).rgb;
            return x * b.x + y * b.y + z * b.z;
          }
        `)
        .replace('#include <map_fragment>', `
          vec4 sampledDiffuseColor = vec4(1.0);
          #ifdef USE_MAP
            sampledDiffuseColor = texture2D(map, vMapUv);
          #endif
          vec3 dirt = triplanar(triMap, vWP, normalize(vWN), triScale);
          sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * dirt * 1.15, uWeather);
          // desaturate the original kenney atlas a bit so PBR dirt can take over
          float luma = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(luma), 0.35 * uWeather);
          diffuseColor *= sampledDiffuseColor;
        `);
    };
    mat.customProgramCacheKey = () => 'weather-' + amount.toFixed(2) + '-' + (maps.diff.uuid);
    o.material = mat;
  });
}

function pbrMaterial(maps, repeat, extras = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: maps.diff,
    normalMap: maps.nor,
    roughnessMap: maps.rough,
    roughness: extras.roughness ?? 1,
    metalness: extras.metalness ?? 0.02,
    color: extras.color ?? 0xffffff,
    ...extras.props,
  });
  for (const t of [maps.diff, maps.nor, maps.rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  return mat;
}

async function main() {
  const canvas = document.getElementById('c');
  const hudCanvas = document.getElementById('hud');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(1280, 720, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = (STYLE === 'B') ? 0.85 : 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(cfg.clear, 1);

  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/');
  ktx2Loader.detectSupport(renderer);
  loader.setKTX2Loader(ktx2Loader);


  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.clear);
  scene.fog = new THREE.Fog(cfg.fog, cfg.fogNear, cfg.fogFar);

  const camera = new THREE.PerspectiveCamera(72, 1280 / 720, 0.05, 200);
  camera.position.set(0.2, 1.58, 5.15);
  camera.lookAt(0.1, 1.15, -8);

  // --- lights ---
  const amb = new THREE.AmbientLight(cfg.amb, cfg.ambInt);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, cfg.hemiInt);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(cfg.sun, cfg.sunInt);
  sun.position.set(cfg.sunDir[0] * 30, cfg.sunDir[1] * 30, cfg.sunDir[2] * 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, -12);

  let flash, flashTarget, beam;
  if (cfg.flashlight > 0) {
    flash = new THREE.SpotLight(0xd8ffc0, 90, 32, THREE.MathUtils.degToRad(26), 0.35, 1.1);
    flash.castShadow = true;
    flash.shadow.mapSize.set(1024, 1024);
    flash.position.set(0.12, 0.0, 0.05);
    flashTarget = new THREE.Object3D();
    flashTarget.position.set(0.05, -0.15, -12);
    camera.add(flash);
    camera.add(flashTarget);
    flash.target = flashTarget;
    scene.add(camera); // ensure camera is in scene graph for children

    // visible volumetric-ish cone
    const coneGeom = new THREE.ConeGeometry(0.22, 1, 32, 1, true);
    coneGeom.translate(0, -0.5, 0);
    coneGeom.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xa8ff88,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    beam = new THREE.Mesh(coneGeom, coneMat);
    beam.position.set(0.1, -0.05, -0.2);
    beam.scale.set(6, 6, 22);
    camera.add(beam);

    // toxic fill — sickly distant glow
    const fill = new THREE.PointLight(0x66ff44, 1.6, 22, 1.6);
    fill.position.set(-3, 0.4, -16);
    scene.add(fill);
    const fill2 = new THREE.PointLight(0x88ff33, 0.7, 18, 2);
    fill2.position.set(5, 1.5, -28);
    scene.add(fill2);
  } else {
    scene.add(camera);
  }

  // --- load assets ---
  const [
    roadPBR, shoulderPBR, buildPBR, rustPBR, brickPBR, snowPBR, concretePBR,
    carGltf, zombieGltf, gunGltf,
    bA, bB, bC, bD, bE, bH, bK, bM, bP, bR, bS, bT,
    chimney, tank, tower, ctnA, ctnB, ctnC,
    cone, barrier, fence, dumpster, pole, lamp, lamp2, traffic, stop, warn,
  ] = await Promise.all([
    loadPBR(cfg.ground),
    loadPBR(cfg.shoulder),
    loadPBR(cfg.buildingMaps),
    loadPBR('rust_coarse_01'),
    loadPBR('red_brick'),
    loadPBR(STYLE === 'C' ? 'snow_02' : 'dirt'),
    loadPBR('dirty_concrete'),
    loadGLB('./assets/tevy/wrecked-sedan-lod1.glb'),
    loadGLB('./assets/quaternius/zombie.glb'),
    loadGLB('./assets/kenney/blaster/blaster-f.glb'),
    ...['building-a','building-b','building-c','building-d','building-e','building-h',
        'building-k','building-m','building-p','building-r','building-s','building-t']
      .map((n) => loadGLB(`./assets/kenney/industrial/${n}.glb`)),
    loadGLB('./assets/kenney/industrial/chimney-large.glb'),
    loadGLB('./assets/kenney/industrial/detail-tank-large.glb'),
    loadGLB('./assets/kenney/industrial/water-tower.glb'),
    loadGLB('./assets/kenney/industrial/shipping-container-a.glb'),
    loadGLB('./assets/kenney/industrial/shipping-container-b.glb'),
    loadGLB('./assets/kenney/industrial/shipping-container-c.glb'),
    loadGLB('./assets/kenney/roads/construction-cone.glb'),
    loadGLB('./assets/kenney/roads/construction-barrier.glb'),
    loadGLB('./assets/kenney/roads/construction-fence.glb'),
    loadGLB('./assets/kenney/roads/dumpster.glb'),
    loadGLB('./assets/kenney/roads/electricity-pole.glb'),
    loadGLB('./assets/kenney/roads/light-square.glb'),
    loadGLB('./assets/kenney/roads/light-square-double.glb'),
    loadGLB('./assets/kenney/roads/traffic-light.glb'),
    loadGLB('./assets/kenney/roads/road-sign-stop.glb'),
    loadGLB('./assets/kenney/roads/road-sign-warning.glb'),
  ]);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160, 1, 1),
    pbrMaterial(shoulderPBR, 18, { roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // Road strip
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(9.4, 120, 1, 1),
    pbrMaterial(roadPBR, 1, { roughness: 1, props: {} })
  );
  // fix road uv: width 9.4 should tile ~2 across, length 120 ~24 along
  road.geometry.attributes.uv.array.set ? null : 0;
  {
    const uv = road.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, u * 2.0, v * 22.0);
    }
    uv.needsUpdate = true;
  }
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -28);
  road.receiveShadow = true;
  scene.add(road);

  // curbs / sidewalks
  const curbMat = pbrMaterial(concretePBR, 6, { roughness: 0.95, color: STYLE === 'C' ? 0xcfd6de : 0x888078 });
  for (const x of [-5.15, 5.15]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 120), curbMat);
    curb.position.set(x, 0.08, -28);
    curb.castShadow = true;
    curb.receiveShadow = true;
    scene.add(curb);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 120), curbMat);
    walk.position.set(x + Math.sign(x) * 1.7, 0.04, -28);
    walk.receiveShadow = true;
    scene.add(walk);
  }

  function placeBuilding(gltf, x, z, rotY, height) {
    const obj = gltf.scene.clone(true);
    weatherMeshes(obj, buildPBR, cfg.weather, cfg.weatherTint);
    enableShadows(obj);
    fitHeight(obj, height);
    obj.position.x = x;
    obj.position.z = z;
    obj.rotation.y = rotY;
    obj.updateMatrixWorld(true);
    const b = boxOf(obj);
    obj.position.y += -b.min.y;
    // Keep the street clear: inner facade sits just outside the curb.
    obj.updateMatrixWorld(true);
    const b2 = boxOf(obj);
    const curb = 5.55;
    if (x < 0 && b2.max.x > -curb) obj.position.x += (-curb - b2.max.x);
    if (x > 0 && b2.min.x < curb) obj.position.x += (curb - b2.min.x);
    obj.updateMatrixWorld(true);
    scene.add(obj);
    return obj;
  }

  // Street walls — left (negative X, facing inward) and right
  const H = cfg.buildingScale; // ~5m+ module, we pass explicit heights
  // left side (buildings face +X toward street). Kenney buildings may face -Z by default;
  // rotate so the long facade flanks the road.
  const left = [
    [bA, -10.0, -1.2, Math.PI / 2, 6.4],
    [bE, -10.0, -9.5, Math.PI / 2, 5.8],
    [bK, -10.2, -17.5, Math.PI / 2, 6.8],
    [bD, -10.0, -26.0, Math.PI / 2, 7.2],
    [bT, -10.0, -35.0, Math.PI / 2, 5.6],
    [bA, -10.2, -44.0, Math.PI / 2, 6.6],
    [bE, -10.0, -54.0, Math.PI / 2, 6.0],
  ];
  const right = [
    [bB, 10.0, -2.8, -Math.PI / 2, 6.2],
    [bE, 10.0, -11.0, -Math.PI / 2, 5.8],
    [bT, 10.0, -19.5, -Math.PI / 2, 5.4],
    [bK, 10.2, -28.0, -Math.PI / 2, 6.8],
    [bA, 10.0, -37.0, -Math.PI / 2, 6.4],
    [bD, 10.0, -46.0, -Math.PI / 2, 7.0],
    [bB, 10.2, -55.0, -Math.PI / 2, 6.0],
  ];
  for (const row of [...left, ...right]) placeBuilding(...row);

  // skyline silhouettes in the fog
  placeBuilding(tower, -12.0, -64, 0.2, 14);
  placeBuilding(chimney, 12.0, -68, 0.1, 16);
  placeBuilding(tower, 13.0, -76, -0.3, 12);
  placeBuilding(tank, -12.5, -22, 0.4, 3.4);
  placeBuilding(tank, 12.5, -33, -0.2, 3.0);

  function placeProp(gltf, x, z, rotY, height, maps = rustPBR, weather = 0.85) {
    const obj = gltf.scene.clone(true);
    weatherMeshes(obj, maps, weather, cfg.weatherTint);
    enableShadows(obj);
    fitHeight(obj, height);
    obj.position.x = x;
    obj.position.z = z;
    obj.rotation.y = rotY;
    obj.updateMatrixWorld(true);
    const b = boxOf(obj);
    obj.position.y += -b.min.y;
    // Keep the street clear: inner facade sits just outside the curb.
    obj.updateMatrixWorld(true);
    const b2 = boxOf(obj);
    const curb = 5.55;
    if (x < 0 && b2.max.x > -curb) obj.position.x += (-curb - b2.max.x);
    if (x > 0 && b2.min.x < curb) obj.position.x += (curb - b2.min.x);
    obj.updateMatrixWorld(true);
    scene.add(obj);
    return obj;
  }

  placeProp(ctnA, -5.6, -15.5, 0.3, 2.6);
  placeProp(ctnB, -5.9, -19.2, 1.9, 2.6);
  placeProp(ctnC, 6.2, -24.0, -0.4, 2.6);
  placeProp(dumpster, 4.8, -7.8, -0.5, 1.25);
  placeProp(cone, 3.15, -5.4, 0.2, 0.75);
  placeProp(cone, 3.55, -6.1, -0.4, 0.75);
  placeProp(cone, -3.4, -9.6, 0.7, 0.75);
  placeProp(barrier, 3.7, -8.4, 0.15, 1.05);
  placeProp(barrier, -3.8, -21.0, -0.1, 1.05);
  placeProp(fence, 5.6, -17.5, Math.PI / 2, 1.6);
  placeProp(pole, -6.4, -6.5, 0.05, 7.2, concretePBR, 0.5);
  placeProp(pole, 6.4, -16.0, 0.0, 7.2, concretePBR, 0.5);
  placeProp(lamp, -5.3, 0.6, Math.PI / 2, 7.4, rustPBR, 0.55);
  placeProp(lamp2, 5.3, -11.5, -Math.PI / 2, 7.4, rustPBR, 0.55);
  placeProp(traffic, 5.4, -4.2, -Math.PI / 2, 5.0, rustPBR, 0.5);
  placeProp(stop, -5.0, -3.2, Math.PI / 2, 3.2, rustPBR, 0.4);
  placeProp(warn, 4.6, -9.8, -0.4, 3.0, rustPBR, 0.4);
  // fallen pole across a shoulder
  {
    const fallen = pole.scene.clone(true);
    weatherMeshes(fallen, rustPBR, 0.9, cfg.weatherTint);
    enableShadows(fallen);
    fitHeight(fallen, 8.5);
    fallen.rotation.z = Math.PI / 2.15;
    fallen.rotation.y = 0.4;
    fallen.position.set(2.8, 0.25, -26.5);
    scene.add(fallen);
  }

  // --- wrecked car ---
  const car = carGltf.scene;
  enableShadows(car);
  // scale to documented ~4.67 m length if needed
  car.updateMatrixWorld(true);
  let carSize = sizeOf(car);
  if (carSize.z > 0.1) {
    const long = Math.max(carSize.x, carSize.z);
    car.scale.multiplyScalar(4.67 / long);
  }
  car.position.set(-1.45, 0, -11.2);
  car.rotation.y = 0.55;
  car.updateMatrixWorld(true);
  {
    const b = boxOf(car);
    car.position.y += -b.min.y + 0.02;
  }
  // crack a door open if the node exists
  car.traverse((o) => {
    const n = (o.name || '').toLowerCase();
    if (n.includes('door_fl') || n.includes('door-fl') || n === 'door_fl') {
      o.rotation.y += 0.85;
    }
    if (n.includes('bonnet') || n.includes('hood')) {
      o.rotation.x -= 0.15;
    }
  });
  scene.add(car);

  // --- mutant / zombie ---
  const zombie = zombieGltf.scene;
  enableShadows(zombie);
  // slightly sickly tint
  zombie.traverse((o) => {
    if (o.isMesh && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.color) {
          if (STYLE === 'B') m.color.multiply(new THREE.Color(0xa0ff90));
          else if (STYLE === 'C') m.color.multiply(new THREE.Color(0xc0d0e0));
          else if (STYLE === 'D') m.color.multiply(new THREE.Color(0xffc8a0));
          else m.color.multiply(new THREE.Color(0xe8c070));
        }
        m.roughness = Math.min(1, (m.roughness ?? 0.7) + 0.1);
      }
    }
  });
  scene.add(zombie);
  const mixer = new THREE.AnimationMixer(zombie);
  const clips = zombieGltf.animations || [];
  const punch = clips.find((c) => c.name === 'Punch' || c.name.endsWith('|Punch'));
  const idleAtk = clips.find((c) => c.name === 'Idle_Attack' || c.name.endsWith('|Idle_Attack'));
  const walk = clips.find((c) => c.name === 'Walk' || c.name.endsWith('|Walk'));
  const clip = punch || idleAtk || walk || clips[0];
  if (clip) {
    const action = mixer.clipAction(clip);
    action.play();
    mixer.update(0.18); // mid-swing
  }
  zombie.updateMatrixWorld(true);
  fitHeight(zombie, 2.05);
  zombie.position.set(1.15, 0, -7.2);
  // face the camera (camera is at +Z looking toward -Z)
  zombie.rotation.y = 0; // will adjust after we see forward axis
  zombie.updateMatrixWorld(true);
  {
    const b = boxOf(zombie);
    zombie.position.y += -b.min.y;
  }
  // Model forward is +Z; camera looks toward -Z, so leave yaw near 0 to face the player.
  zombie.rotation.y = 0.22;
  zombie.rotation.x = 0.02;

  // --- viewmodel ---
  const gun = gunGltf.scene;
  gun.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = false;
      if (o.material) {
        const m = o.material.clone();
        if (STYLE === 'A') { m.color = new THREE.Color(0x9a6a3a); m.metalness = 0.45; m.roughness = 0.55; }
        if (STYLE === 'B') { m.color = new THREE.Color(0x6a8a48); m.metalness = 0.4; m.roughness = 0.5; m.emissive = new THREE.Color(0x113308); }
        if (STYLE === 'C') { m.color = new THREE.Color(0x8a96a4); m.metalness = 0.55; m.roughness = 0.4; }
        if (STYLE === 'D') { m.color = new THREE.Color(0x8a4a28); m.metalness = 0.35; m.roughness = 0.6; }
        o.material = m;
      }
    }
  });
  // blaster-f is ~1.31 m long on Z, barrel along +Z or -Z. Place in lower-right.
  const gunWrap = new THREE.Group();
  gunWrap.add(gun);
  // scale down to viewmodel size
  gun.scale.setScalar(0.55);
  gun.position.set(0, 0, 0);
  // typical Kenney blaster points along +Z; we want it pointing into the world (-Z in camera space is forward)
  gun.rotation.set(0.08, Math.PI, 0.12);
  gunWrap.position.set(0.38, -0.28, -0.7);
  camera.add(gunWrap);
  // tight FOV-independent depth: render gun over world with a slight depth bias via a second layer
  gunWrap.traverse((o) => { if (o.isMesh) o.renderOrder = 2; });

  // --- particles ---
  addParticles(scene, cfg.particles);

  // --- post ---
  const [iw, ih] = cfg.internal;
  const rt = new THREE.WebGLRenderTarget(1280, 720, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: true,
    generateMipmaps: false,
  });
  const pal = cfg.palette;
  const palArr = [];
  for (let i = 0; i < 32; i++) palArr.push(i < pal.length ? pal[i] : new THREE.Color(0, 0, 0));

  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.RawShaderMaterial({
    uniforms: {
      tDiffuse: { value: rt.texture },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uInternal: { value: new THREE.Vector2(iw, ih) },
      uPalette: { value: palArr },
      uPaletteSize: { value: 32 },
      uDither: { value: cfg.dither },
      uScanline: { value: cfg.scanline },
      uGrain: { value: cfg.grain },
      uVignette: { value: cfg.vignette },
      uContrast: { value: cfg.contrast },
      uSaturation: { value: cfg.saturation },
      uBrightness: { value: cfg.brightness },
      uTint: { value: new THREE.Vector3(...cfg.tint) },
      uLift: { value: new THREE.Vector3(...cfg.lift) },
      uGamma: { value: cfg.gamma },
      uCrush: { value: cfg.crush },
      uFlashlight: { value: cfg.flashlight },
      uFlashAngle: { value: cfg.flashAngle },
      uFlashSoft: { value: cfg.flashSoft },
      uTime: { value: 0 },
      uStyle: { value: { A: 0, B: 1, C: 2, D: 3 }[STYLE] },
    },
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  postScene.add(postQuad);

  // HUD images
  const hudImgs = await loadHudImages();

  postMat.toneMapped = false;

  function render() {
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, 1280, 720);
    renderer.setScissorTest(false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.clear();
    renderer.render(scene, camera);
    drawHUD(hudCanvas, hudImgs, STYLE, iw, ih);
  }

  render();
  window.__READY = true;
  window.__STYLE = STYLE;
  window.__render = render;
  window.__scene = scene;
  window.__camera = camera;
  window.__zombie = zombie;
  window.__renderer = renderer;
  window.__debugRaw = function() {
    renderer.setRenderTarget(null);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setViewport(0, 0, 1280, 720);
    renderer.clear();
    renderer.render(scene, camera);
  };
  const carNode = scene.children.find(c => c.name === 'Scene');
  function wb(obj) {
    const b = boxOf(obj);
    const s = new THREE.Vector3(); b.getSize(s);
    return {name: obj.name||obj.type, min: b.min.toArray(), max: b.max.toArray(), size: s.toArray()};
  }
  const boxes = [];
  scene.children.forEach(c => {
    try { boxes.push(wb(c)); } catch (e) {}
  });
  window.__DEBUG = {
    boxes,
    triangles: renderer.info.render.triangles,
    calls: renderer.info.render.calls,
    programs: renderer.info.programs && renderer.info.programs.length,
    zombie: wb(zombie),
  };
  console.log('ready', STYLE, JSON.stringify(window.__DEBUG.zombie), 'tris', window.__DEBUG.triangles, 'calls', window.__DEBUG.calls);
}

function addParticles(scene, kind) {
  if (kind === 'none') return;
  const count = kind === 'snow' ? 900 : kind === 'dust' ? 280 : 220;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 1] = Math.random() * 9 + (kind === 'snow' ? 0.2 : 0.4);
    pos[i * 3 + 2] = -Math.random() * 50 + 4;
    if (kind === 'snow') {
      const v = 0.85 + Math.random() * 0.15;
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v;
    } else if (kind === 'spores') {
      col[i * 3] = 0.35 + Math.random() * 0.4;
      col[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      col[i * 3 + 2] = 0.25;
    } else {
      const v = 0.55 + Math.random() * 0.3;
      col[i * 3] = v; col[i * 3 + 1] = v * 0.8; col[i * 3 + 2] = v * 0.5;
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: kind === 'snow' ? 0.07 : 0.05,
    vertexColors: true,
    transparent: true,
    opacity: kind === 'dust' ? 0.35 : 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
}

function loadHudImages() {
  const names = {
    face: './assets/oga/faces/face_hurt.png',
    faceIdle: './assets/oga/faces/face_idle.png',
  };
  return Promise.all(Object.entries(names).map(([k, url]) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res([k, img]);
    img.onerror = rej;
    img.src = url;
  }))).then((pairs) => Object.fromEntries(pairs));
}

function drawHUD(canvas, imgs, style, iw, ih) {
  const ctx = canvas.getContext('2d');
  const W = 1280, H = 720;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  // Draw HUD into a low-res buffer then upscale nearest.
  const off = document.createElement('canvas');
  off.width = iw; off.height = ih;
  const o = off.getContext('2d');
  o.imageSmoothingEnabled = false;

  if (style === 'D') drawDoomHUD(o, iw, ih, imgs);
  else if (style === 'A') drawWastelandHUD(o, iw, ih);
  else if (style === 'B') drawToxicHUD(o, iw, ih);
  else drawWinterHUD(o, iw, ih);

  ctx.drawImage(off, 0, 0, W, H);
}

function pixelfont(ctx, text, x, y, color, scale = 1, align = 'left') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${6 * scale}px monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function bar(ctx, x, y, w, h, t, col, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * t), h - 2);
}

function drawWastelandHUD(ctx, w, h) {
  // rusty pip-boy-ish chrome, no face (that's D)
  // crosshair
  ctx.fillStyle = '#ead4aa';
  ctx.fillRect((((w / 2) | 0) - 4), (h / 2) | 0, 9, 1);
  ctx.fillRect((w / 2) | 0, (((h / 2) | 0) - 4), 1, 9);
  ctx.fillRect((w / 2) | 0, (h / 2) | 0, 1, 1);

  // bottom panel
  ctx.fillStyle = 'rgba(30,18,12,0.72)';
  ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = '#3e2731';
  ctx.fillRect(0, h - 29, w, 1);

  pixelfont(ctx, 'HP', 8, h - 24, '#e4a672', 1.4);
  bar(ctx, 24, h - 22, 70, 8, 0.67, '#be4a2f', '#3e2731');
  pixelfont(ctx, '67', 98, h - 22, '#ead4aa', 1.4);

  pixelfont(ctx, 'RAD', 130, h - 24, '#fee761', 1.2);
  bar(ctx, 150, h - 22, 44, 6, 0.22, '#feae34', '#3e2731');

  pixelfont(ctx, 'BLASTER', w - 118, h - 24, '#e4a672', 1.2);
  pixelfont(ctx, '12 / 48', w - 48, h - 24, '#ead4aa', 1.6, 'right');
  pixelfont(ctx, 'ROUTE 9  ·  SECTOR 4', 8, 6, '#ead4aa', 1.1);
  pixelfont(ctx, 'SUNSET  18:42', w - 8, 6, '#e4a672', 1.1, 'right');
}

function drawToxicHUD(ctx, w, h) {
  const g = '#6ad13a';
  const dim = '#1c3a1c';
  // NV goggles corners
  ctx.strokeStyle = g;
  ctx.lineWidth = 1;
  const m = 10, l = 16;
  ctx.beginPath();
  ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
  ctx.moveTo(w - m, m + l); ctx.lineTo(w - m, m); ctx.lineTo(w - m - l, m);
  ctx.moveTo(m, h - m - l); ctx.lineTo(m, h - m); ctx.lineTo(m + l, h - m);
  ctx.moveTo(w - m, h - m - l); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m - l, h - m);
  ctx.stroke();

  // crosshair
  ctx.fillStyle = g;
  ctx.fillRect((((w / 2) | 0) - 5), (h / 2) | 0, 11, 1);
  ctx.fillRect((w / 2) | 0, (((h / 2) | 0) - 5), 1, 11);
  ctx.strokeStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 8, 0, 6.28);
  ctx.stroke();

  pixelfont(ctx, 'NV  ON', 8, 8, g, 1.2);
  pixelfont(ctx, 'FILTER  41%', 8, 18, g, 1.1);
  pixelfont(ctx, 'RAD  1.4  mSv', 8, 28, '#a8f06a', 1.1);

  ctx.fillStyle = 'rgba(2,8,4,0.55)';
  ctx.fillRect(0, h - 22, w, 22);
  pixelfont(ctx, 'HP  67', 8, h - 16, g, 1.3);
  bar(ctx, 48, h - 14, 60, 6, 0.67, g, dim);
  pixelfont(ctx, 'CELL  12 / 48', w - 8, h - 16, g, 1.3, 'right');
  pixelfont(ctx, 'BEAM  STABLE', w / 2, h - 16, '#3e7a28', 1.1, 'center');
}

function drawWinterHUD(ctx, w, h) {
  const ink = '#0a0d12';
  const snow = '#e8eef4';
  const ice = '#8a9aaa';
  // stencil frame
  ctx.strokeStyle = snow;
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.strokeStyle = ice;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  // high-contrast cross
  ctx.fillStyle = snow;
  ctx.fillRect((((w / 2) | 0) - 3), (h / 2) | 0, 7, 1);
  ctx.fillRect((w / 2) | 0, (((h / 2) | 0) - 3), 1, 7);

  ctx.fillStyle = 'rgba(10,13,18,0.7)';
  ctx.fillRect(8, h - 26, w - 16, 16);

  pixelfont(ctx, 'TEMP  -22 C', 12, h - 22, snow, 1.2);
  pixelfont(ctx, 'SEAL  OK', 90, h - 22, snow, 1.2);
  pixelfont(ctx, 'HP  67', 150, h - 22, snow, 1.2);
  bar(ctx, 180, h - 20, 50, 6, 0.67, snow, ink);
  pixelfont(ctx, '12 / 48', w - 14, h - 22, snow, 1.3, 'right');
  pixelfont(ctx, 'SECTOR  4   FILTER  92%', 12, 12, ice, 1.1);
  pixelfont(ctx, 'ASHFALL', w - 14, 12, snow, 1.1, 'right');
}

function drawDoomHUD(ctx, w, h, imgs) {
  // Classic boomer-shooter status bar. Original layout, not a Doom asset copy.
  const barH = 32;
  const y = h - barH;

  // stone/metal bar background
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(0, y, w, barH);
  // top highlight / bottom shade
  ctx.fillStyle = '#5a5048';
  ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = '#14110e';
  ctx.fillRect(0, h - 1, w, 1);

  // vertical dividers
  const cols = [0, 48, 100, 156, w - 70, w];
  ctx.fillStyle = '#14110e';
  for (const x of cols) ctx.fillRect(x, y + 1, 1, barH - 2);
  ctx.fillStyle = '#5a5048';
  for (const x of cols) ctx.fillRect(x + 1, y + 1, 1, barH - 2);

  // AMMO
  pixelfont(ctx, 'AMMO', 8, y + 3, '#8a7a60', 1);
  pixelfont(ctx, '12', 28, y + 12, '#ffcc33', 2.2, 'center');

  // HEALTH
  pixelfont(ctx, 'HEALTH', 54, y + 3, '#8a7a60', 1);
  pixelfont(ctx, '67%', 74, y + 12, '#ffcc33', 2.0, 'center');

  // ARMS
  pixelfont(ctx, 'ARMS', 108, y + 3, '#8a7a60', 1);
  const arms = ['1', '2', '3', '4', '5', '6'];
  arms.forEach((n, i) => {
    const ax = 108 + (i % 3) * 12;
    const ay = y + 12 + Math.floor(i / 3) * 8;
    const on = n === '2' || n === '3';
    pixelfont(ctx, n, ax, ay, on ? '#ffcc33' : '#4a4030', 1);
  });

  // FACE in its own cell, then ARMOR
  const faceX = 150;
  const faceW = 32;
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(faceX, y + 2, faceW, 28);
  const face = imgs.face || imgs.faceIdle;
  if (face) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(face, faceX + 4, y + 3, 24, 24);
  }

  // ARMOR
  pixelfont(ctx, 'ARMOR', w - 30, y + 3, '#8a7a60', 1, 'center');
  pixelfont(ctx, '32%', w - 30, y + 12, '#ffcc33', 2.0, 'center');

  // tiny crosshair (many source-ports / boomer shooters)
  ctx.fillStyle = '#ffcc33';
  ctx.fillRect((((w / 2) | 0) - 1), (h / 2 - barH / 2) | 0, 3, 1);
  ctx.fillRect((w / 2) | 0, ((((h / 2) - barH / 2) | 0) - 1), 1, 3);
}

main().catch((err) => {
  console.error(err);
  window.__ERROR = String(err && err.stack || err);
  window.__READY = 'error';
});
