// Ashfall render pipeline: low-res scene + shadows + volumetrics + bloom + grade/palette
// + nearest upscale with subtle CRT. three.js r170, WebGL2.
import * as THREE from 'three';
import {
  HEADER, FULLSCREEN_VERT, VOLUME_FRAG, BLOOM_PREFILTER_FRAG, BLOOM_DOWN_FRAG,
  BLOOM_UP_FRAG, COMPOSITE_FRAG, BLIT_FRAG,
} from './shaders.js?v=r14.1';
import { TIERS, TIER_ORDER, detectTier, AdaptiveQuality, CRT_PRESETS, LOOKS, getTierConfig, applyMobileQuality, isMobileDevice, isIOS } from './quality.js?v=r14.1';
import { GRADE_ASHFALL, PALETTES, buildPaletteLUTGPU, releasePaletteLUTs, lutStats, resolvePalette } from './palette.js?v=r14.1';
import { ENVIRONMENTS, ENVIRONMENT_ORDER, resolveEnvironment, environmentForChapter, getEnvironmentConfig } from './environments.js?v=r14.1';
import { getBlueNoiseTexture } from './bluenoise.js?v=r14.1';
import { fitSunShadow, setShadowMapSize, createFlashlight, createCampfire } from './lighting.js?v=r14.1';
import { createParticles } from './particles.js?v=r14.1';

const MAX_POINTS = 4;
const POINT_POOL = 2; // fixed number of scene PointLights for campfires (constant => no shader recompiles)
const _v3 = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _col = new THREE.Color();
const _m4 = new THREE.Matrix4();

function raw(frag, uniforms, defines = {}) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: HEADER + frag,
    uniforms, defines,
    depthTest: false, depthWrite: false,
  });
}

/**
 * @param {object} o
 * @param {THREE.WebGLRenderer} o.renderer
 * @param {THREE.Scene} o.scene
 * @param {THREE.PerspectiveCamera} o.camera
 * @param {'auto'|'mobile'|'low'|'medium'|'high'} [o.tier]  'auto' => 'mobile' on phones/iOS
 * @param {boolean} [o.mobile]  force (true) / forbid (false) the phone path; default: detected
 * @param {boolean} [o.allowHeavyOnMobile=false]  let a phone run low/medium/high when asked explicitly
 * @param {number} [o.shadowUpdateEvery]  override the tier's shadow refresh interval (frames)
 */
export function createRenderPipeline(o) {
  const { renderer, scene, camera } = o;
  const opts = {
    tier: 'auto', targetFps: 30, adaptive: true, allowUpgrade: false,
    takeOverFog: true, updateCamera: true, particles: true, crt: 'low',
    ...o,
  };
  const mobile = opts.mobile === false ? false : (!!opts.mobile || isMobileDevice(renderer));
  const gl = renderer.getContext();
  let disposed = false;

  // ---- host state we touch (restored by dispose) -------------------------------
  const hostShadow = { enabled: renderer.shadowMap.enabled, type: renderer.shadowMap.type, autoUpdate: renderer.shadowMap.autoUpdate };
  const hostClearColor = renderer.getClearColor(new THREE.Color());
  const hostClearAlpha = renderer.getClearAlpha();
  const hostSceneBg = scene.background && scene.background.isColor ? scene.background.clone() : null;
  let envTouchedSky = false;
  let hemiLight = opts.hemiLight || null;
  let ambientLight = opts.ambientLight || null;
  let hostHemi = null, hostAmb = null;

  // ---- capabilities (half-float verified later, after the quad helpers exist) ----
  const ext = renderer.extensions;
  const hfExt = !!(ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float'));
  let halfFloat = !opts.forceLDR && hfExt;
  let hdrType = halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const caps = { webgl2: renderer.capabilities.isWebGL2 !== false, hfExt, halfFloatVerified: false, hdrReason: opts.forceLDR ? 'forceLDR' : (hfExt ? 'pending' : 'no EXT_color_buffer_(half_)float'), maxTextureSize: renderer.capabilities.maxTextureSize, glRenderer: '' };

  // ---- sun --------------------------------------------------------------------
  let sun = opts.sun || null;
  if (!sun) scene.traverse((c) => { if (!sun && c.isDirectionalLight && c.castShadow) sun = c; });
  if (!sun) scene.traverse((c) => { if (!sun && c.isDirectionalLight) sun = c; });
  let ownSun = false;
  if (!sun) {
    sun = new THREE.DirectionalLight(0xe8eef6, 1.5);
    sun.position.set(0.35, 0.8, 0.4);
    scene.add(sun); ownSun = true;
  }
  if (!sun.target.parent) scene.add(sun.target);
  const hostSun = { castShadow: sun.castShadow, mapSize: sun.shadow.mapSize.x, ownTarget: false, color: sun.color.clone(), intensity: sun.intensity };
  // (castShadow is set per tier; never force it on here: the mobile tier has no shadow pass at all)
  const sunDir = new THREE.Vector3().subVectors(sun.position, sun.target.position).normalize();
  const sunState = { scatter: 0.05 };

  // ---- fog --------------------------------------------------------------------
  const sceneFog = scene.fog;
  const fog = {
    color: new THREE.Color(sceneFog ? sceneFog.color : 0xc5d0da),
    density: 0.026, falloff: 0.08, base: 0, start: 4, maxDist: 60, noise: 0.65,
    wind: new THREE.Vector3(0.5, -0.6, -0.15),
    ...(opts.fog || {}),
  };
  if (!(fog.color instanceof THREE.Color)) fog.color = new THREE.Color(fog.color);
  if (opts.takeOverFog) scene.fog = null;

  // ---- grade / palette / crt -------------------------------------------------------
  let look = LOOKS[opts.look || opts.style] ? (opts.look || opts.style) : 'refined';
  const userGrade = opts.grade || {};
  const grade = { ...GRADE_ASHFALL, dither: LOOKS[look].dither.amount, grain: LOOKS[look].grain, toe: LOOKS[look].toe, warmKeep: 1.0, bloom: 0.55, bloomThreshold: halfFloat ? 1.1 : 0.82, paletteMix: 1.0, ...(opts.grade || {}) };
  const DITHER_MODES = { bayer4: 0, bayer8: 1, blue: 2 };
  const dither = { ...LOOKS[look].dither };
  const initialEnvKey = opts.environment != null ? resolveEnvironment(opts.environment)
    : (opts.chapter != null ? environmentForChapter(opts.chapter) : null);
  let envName = null;
  let particleCountScale = 1.0;
  let blizzardActive = false;
  const initPalName = opts.palette !== undefined ? opts.palette
    : (initialEnvKey ? ENVIRONMENTS[initialEnvKey].palette[look] : LOOKS[look].palette);
  let paletteName = typeof initPalName === 'string' ? initPalName : (initPalName === false ? 'off' : 'custom');
  let paletteHex = resolvePalette(initPalName);
  if (userGrade.dither !== undefined) dither.amount = userGrade.dither;
  const crt = { ...CRT_PRESETS.low };
  let crtName = 'low';

  // ---- flashlight + particles ----------------------------------------------------
  const flash = createFlashlight(opts.flashlightOptions || {});
  flash.enabled = opts.flashlight !== false;
  scene.add(flash.light, flash.light.target);
  // fixed campfire light pool: nearest POINT_POOL campfires drive these each frame; the rest are
  // glow-only. Adding/removing fires therefore never changes the scene light count (no recompiles).
  const pool = [];
  for (let i = 0; i < POINT_POOL; i++) {
    const pl = new THREE.PointLight(0xff7428, 0, 12, 1.6);
    pl.name = 'ashfall-campfire-light-' + i;
    pl.castShadow = false;
    scene.add(pl);
    pool.push(pl);
  }
  const flashState = { scatter: 0.05 };

  const parts = opts.particles ? createParticles(opts.particleOptions || {}) : null;
  if (parts) scene.add(parts.points);

  const pointLights = []; // { light, glow, campfire?, pooled?, anchor?, pos, d2 }
  const sorted = [];

  // ---- shared resources ----------------------------------------------------------
  const blue = getBlueNoiseTexture();
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;

  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(quadGeo);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function pass(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  const volU = {
    tDepth: { value: null }, tBlue: { value: blue }, tShadow: { value: white },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uCamPos: { value: new THREE.Vector3() }, uRes: { value: new THREE.Vector2() },
    uSteps: { value: 12 }, uMaxDist: { value: fog.maxDist }, uFogStart: { value: fog.start }, uFrame: { value: 0 }, uTime: { value: 0 },
    uFogColor: { value: new THREE.Vector3() }, uFogDensity: { value: fog.density },
    uFogBase: { value: fog.base }, uFogFalloff: { value: fog.falloff }, uNoiseAmt: { value: fog.noise },
    uWind: { value: fog.wind },
    uSunDir: { value: sunDir }, uSunColor: { value: new THREE.Vector3() }, uSunG: { value: 0.4 },
    uShadowMatrix: { value: new THREE.Matrix4() }, uShadowBias: { value: 0.002 },
    uSpotPos: { value: new THREE.Vector3() }, uSpotDir: { value: new THREE.Vector3() },
    uSpotColor: { value: new THREE.Vector3() }, uSpotCos: { value: new THREE.Vector2() }, uSpotRange: { value: 20 },
    uPointPos: { value: Array.from({ length: MAX_POINTS }, () => new THREE.Vector4()) },
    uPointColor: { value: Array.from({ length: MAX_POINTS }, () => new THREE.Vector3()) },
    uPointCount: { value: 0 },
    uSunUV: { value: new THREE.Vector2() }, uSunVis: { value: 0 },
    uGodStrength: { value: 0.35 }, uGodDecay: { value: 0.96 }, uGodDensity: { value: 0.85 },
    uEncode: { value: halfFloat ? 1.0 : 0.5 },
  };
  const volMat = raw(VOLUME_FRAG, volU, { MAX_STEPS: 12, MAX_POINTS, GOD_SAMPLES: 0 });

  const preU = { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: grade.bloomThreshold }, uKnee: { value: 0.5 } };
  const preMat = raw(BLOOM_PREFILTER_FRAG, preU);
  const downU = { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } };
  const downMat = raw(BLOOM_DOWN_FRAG, downU);
  const upU = { tLow: { value: null }, tCur: { value: null }, uTexel: { value: new THREE.Vector2() } };
  const upMat = raw(BLOOM_UP_FRAG, upU);

  const compU = {
    tScene: { value: null }, tDepth: { value: null }, tVol: { value: white }, tBloom: { value: null },
    uVolRes: { value: new THREE.Vector2(1, 1) }, uRes: { value: new THREE.Vector2() },
    uNear: { value: camera.near }, uFar: { value: camera.far },
    uInvProj: volU.uInvProj, uCamWorld: volU.uCamWorld, uCamPos: volU.uCamPos,
    uMaxDist: volU.uMaxDist, uFogStart: volU.uFogStart, uFogDensity: volU.uFogDensity, uFogBase: volU.uFogBase, uFogFalloff: volU.uFogFalloff,
    uDecode: { value: halfFloat ? 1.0 : 2.0 }, uVolOn: { value: 1 }, uFogColor: volU.uFogColor,
    uBloomStrength: { value: grade.bloom }, uExposure: { value: grade.exposure }, uTime: { value: 0 },
    uContrast: { value: grade.contrast }, uSaturation: { value: grade.saturation }, uBrightness: { value: grade.brightness },
    uTint: { value: new THREE.Vector3(...grade.tint) }, uLift: { value: new THREE.Vector3(...grade.lift) },
    uGamma: { value: grade.gamma }, uCrush: { value: grade.crush },
    tLUT: { value: white }, tPal: { value: white }, tBlue: { value: blue },
    uPaletteOn: { value: paletteHex ? 1 : 0 }, uDitherMode: { value: 1 }, uNoiseMix: { value: 0 },
    uPaletteMix: { value: grade.paletteMix }, uDither: { value: grade.dither }, uGrain: { value: grade.grain }, uWarmKeep: { value: 1 }, uToe: { value: 1 },
  };
  // analytic (mobile) volume path reads the volume uniforms directly
  Object.assign(compU, {
    uSunDir: volU.uSunDir, uSunColor: volU.uSunColor, uSunG: volU.uSunG,
    uSpotPos: volU.uSpotPos, uSpotDir: volU.uSpotDir, uSpotColor: volU.uSpotColor, uSpotCos: volU.uSpotCos, uSpotRange: volU.uSpotRange,
    uPointPos: volU.uPointPos, uPointColor: volU.uPointColor, uPointCount: volU.uPointCount,
  });
  const compMat = raw(COMPOSITE_FRAG, compU, { MAX_POINTS });
  const lutCacheLimit = mobile ? 2 : 4;
  function bindLUT(hex) {
    if (!hex) { compU.tLUT.value = white; compU.tPal.value = white; return; }
    const t = buildPaletteLUTGPU(renderer, hex, lutCacheLimit);
    compU.tLUT.value = t; compU.tPal.value = t.userData.palette;
  }

  const blitU = {
    tSrc: { value: null }, uInternal: { value: new THREE.Vector2() }, uCanvas: { value: new THREE.Vector2() },
    uCurve: { value: 0 }, uScanline: { value: 0 }, uChroma: { value: 0 }, uVignette: { value: 0 },
    uCorner: { value: 0 }, uFlicker: { value: 0 }, uTime: { value: 0 },
  };
  const blitMat = raw(BLIT_FRAG, blitU);

  // ---- targets -------------------------------------------------------------------
  let sceneRT = null, volRT = null, postRT = null, down = [], up = [];
  let tierName = 'medium', T = TIERS.medium;
  const size = { w: 1, h: 1, iw: 1, ih: 1 };

  // Every target: no MSAA (samples 0), no stencil, no mipmaps. Depth only on the scene target,
  // as a sampled DepthTexture (DEPTH_COMPONENT24 / UnsignedInt; core in WebGL2, fine on ANGLE-Metal).
  function makeRT(w, h, { type = THREE.UnsignedByteType, filter = THREE.LinearFilter, depth = false, colorSpace = THREE.NoColorSpace } = {}) {
    const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type, minFilter: filter, magFilter: filter, generateMipmaps: false, depthBuffer: depth,
      stencilBuffer: false, samples: 0, colorSpace,
    });
    if (depth) {
      rt.depthTexture = new THREE.DepthTexture(Math.max(1, w), Math.max(1, h));
      rt.depthTexture.format = THREE.DepthFormat;
      rt.depthTexture.type = THREE.UnsignedIntType;
    }
    return rt;
  }
  function freeRT(rt) { if (!rt) return; if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); }
  function drainGLErrors() { let n = 0; while (gl.getError() !== gl.NO_ERROR && n < 16) n++; return n; }

  /**
   * Verify half-float really works on this GPU/driver before using it (WebKit ANGLE-Metal can
   * report the extension yet render black / raise INVALID_OPERATION):
   *  1. FBO with RGBA16F colour + depth texture must be FRAMEBUFFER_COMPLETE
   *  2. write 2.0 (above LDR range) into it, then LINEAR-sample it into an RGBA8 target at 0.25x
   *     and read back ~128 (checks storage > 1.0, renderability and half-float linear filtering)
   *  3. gl.getError() must stay NO_ERROR
   */
  function verifyHalfFloat() {
    let rt = null, out = null;
    const testMat = raw(`in vec2 vUv; out vec4 outColor; uniform sampler2D tSrc; uniform float uMode;
      void main(){ outColor = uMode < 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(texture(tSrc, vec2(0.5)).rgb * 0.25, 1.0); }`,
      { tSrc: { value: null }, uMode: { value: 0 } });
    const prevTarget = renderer.getRenderTarget();
    try {
      drainGLErrors();
      rt = makeRT(4, 4, { type: THREE.HalfFloatType, depth: true, filter: THREE.LinearFilter });
      out = makeRT(1, 1, { type: THREE.UnsignedByteType });
      renderer.setRenderTarget(rt);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return 'half-float FBO incomplete';
      testMat.uniforms.uMode.value = 0; pass(testMat, rt);
      testMat.uniforms.uMode.value = 1; testMat.uniforms.tSrc.value = rt.texture; pass(testMat, out);
      const px = new Uint8Array(4);
      renderer.readRenderTargetPixels(out, 0, 0, 1, 1, px);
      const err = gl.getError();
      if (err !== gl.NO_ERROR) return 'GL error 0x' + err.toString(16);
      if (px[0] < 110 || px[0] > 146) return 'half-float readback ' + px[0] + ' (expected ~128)';
      return 'ok';
    } catch (e) {
      return 'exception: ' + (e && e.message || e);
    } finally {
      renderer.setRenderTarget(prevTarget);
      freeRT(rt); freeRT(out); testMat.dispose();
      drainGLErrors();
    }
  }
  function applyHDRMode() {
    hdrType = halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
    volU.uEncode.value = halfFloat ? 1.0 : 0.5;
    compU.uDecode.value = halfFloat ? 1.0 : 2.0;
    if (userGrade.bloomThreshold === undefined) grade.bloomThreshold = halfFloat ? 1.1 : 0.82;
    stats.halfFloat = halfFloat;
  }

  function disposeTargets() {
    [sceneRT, volRT, postRT, ...down, ...up].forEach(freeRT);
    sceneRT = volRT = postRT = null;
    down = []; up = [];
    targetKey = '';
  }
  let targetKey = '';
  function buildTargets() {
    const s = T.sceneScale;
    const vs = T.volume.enabled && T.volume.mode === 'raymarch' ? T.volume.scale : 0;
    const key = [size.iw, size.ih, s, vs, T.bloom.levels, hdrType].join('|');
    if (key === targetKey && sceneRT) { updateSizeUniforms(); return false; } // nothing to reallocate
    disposeTargets();
    // LDR fallback stores the scene as sRGB8_ALPHA8 (hardware encode/decode) so 8 bits are spent
    // perceptually: linear RGBA8 would band badly in the night/dark interiors.
    const sceneCS = halfFloat ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    try {
      sceneRT = makeRT(size.iw * s, size.ih * s, { type: hdrType, depth: true, colorSpace: sceneCS });
    } catch (err) {
      halfFloat = false; caps.hdrReason = 'scene RT alloc failed'; applyHDRMode();
      sceneRT = makeRT(size.iw * s, size.ih * s, { type: hdrType, depth: true, colorSpace: THREE.SRGBColorSpace });
    }
    volRT = vs > 0 ? makeRT(Math.ceil(size.iw * vs), Math.ceil(size.ih * vs), { type: hdrType, filter: THREE.NearestFilter }) : null;
    postRT = makeRT(size.iw, size.ih, { filter: THREE.NearestFilter });
    let bw = size.iw, bh = size.ih;
    for (let i = 0; i < T.bloom.levels; i++) {
      bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
      down.push(makeRT(bw, bh, { type: hdrType }));
      if (i < T.bloom.levels - 1) up.push(makeRT(bw, bh, { type: hdrType }));
    }
    targetKey = key;
    stats.targetBuilds = (stats.targetBuilds || 0) + 1;
    updateSizeUniforms();
    return true;
  }
  function updateSizeUniforms() {
    if (volRT) { compU.uVolRes.value.set(volRT.width, volRT.height); volU.uRes.value.set(volRT.width, volRT.height); }
    compU.uRes.value.set(size.iw, size.ih);
    blitU.uInternal.value.set(size.iw, size.ih);
    blitU.uCanvas.value.set(size.w, size.h);
  }

  /**
   * Internal targets depend ONLY on the tier's pixel-art height and the canvas aspect, never on
   * devicePixelRatio (a DPR-3 canvas just gets a larger final blit). Unchanged internal size =>
   * no reallocation, only uniforms (iOS fires resize on every URL-bar show/hide).
   */
  function resize(width, height) {
    if (disposed) return;
    if (width === undefined) {
      const v = renderer.getDrawingBufferSize(new THREE.Vector2());
      width = v.x; height = v.y;
    }
    width = Math.max(1, width | 0); height = Math.max(1, height | 0);
    size.w = width; size.h = height;
    let ih = T.internalHeight;
    if (T.snap) {
      // integer upscale: 844 -> 422 (2x), 1688 -> 422 (4x), 2532 -> 422 (6x), 1920 -> 480 (4x)
      const k = Math.max(1, Math.round(height / T.internalHeight));
      ih = Math.round(height / k);
    }
    ih = Math.max(64, Math.min(ih, height, T.internalHeight * 1.2) & ~1);
    size.ih = ih;
    size.iw = Math.max(2, Math.round((ih * width / height) / 2) * 2);
    if (opts.updateCamera && camera.isPerspectiveCamera) {
      const asp = width / height;
      if (Math.abs(camera.aspect - asp) > 1e-6) { camera.aspect = asp; camera.updateProjectionMatrix(); }
    }
    buildTargets();
  }

  function markMaterialsDirty() {
    scene.traverse((c) => {
      if (!c.material) return;
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { m.needsUpdate = true; });
    });
  }

  function resolveTier(name) {
    if (name === 'phone') name = 'mobile';
    if (!name || name === 'auto') name = mobile ? 'mobile' : detectTier(renderer);
    if (!TIERS[name]) throw new Error('unknown tier ' + name + ' (' + TIER_ORDER.join('|') + '|auto)');
    // phones never start heavy unless the host explicitly opts in (jetsam/freeze risk on iOS)
    if (mobile && name !== 'mobile' && !opts.allowHeavyOnMobile) name = 'mobile';
    return name;
  }
  function setDefine(mat, key, val) {
    const cur = mat.defines[key];
    if (val === undefined || val === false) { if (key in mat.defines) { delete mat.defines[key]; mat.needsUpdate = true; } return; }
    const v = val === true ? '' : val;
    if (cur !== v) { mat.defines[key] = v; mat.needsUpdate = true; }
  }
  let shadowCountdown = 0;
  function setTier(name) {
    if (disposed) return;
    name = resolveTier(name);
    const prevType = renderer.shadowMap.type;
    const prevEnabled = renderer.shadowMap.enabled;
    tierName = name; T = getTierConfig(look, name);
    if (opts.shadowUpdateEvery) T.shadow.updateEvery = opts.shadowUpdateEvery;
    renderer.shadowMap.enabled = T.shadow.enabled;
    renderer.shadowMap.type = T.shadow.type === 'pcfsoft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false; // pipeline schedules shadow refreshes (T.shadow.updateEvery)
    renderer.shadowMap.needsUpdate = T.shadow.enabled;
    shadowCountdown = 0;
    sun.castShadow = T.shadow.enabled;
    if (T.shadow.enabled) setShadowMapSize(sun, T.shadow.mapSize);
    else if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } // free VRAM
    flash.light.castShadow = T.flashShadow;
    if (T.flashShadow) setShadowMapSize(flash.light, flashState.shadowSize || T.flashShadowSize);
    else if (flash.light.shadow.map) { flash.light.shadow.map.dispose(); flash.light.shadow.map = null; }
    const rm = T.volume.enabled && T.volume.mode === 'raymarch';
    if (rm) {
      setDefine(volMat, 'MAX_STEPS', T.volume.steps);
      setDefine(volMat, 'GOD_SAMPLES', T.godSamples);
      setDefine(volMat, 'USE_NOISE', !!T.volume.noise);
      setDefine(volMat, 'USE_SHADOW', !!T.volume.shadow);
      volU.uSteps.value = T.volume.steps;
    }
    setDefine(compMat, 'CHEAP_VOL', T.volume.enabled && T.volume.mode === 'analytic');
    compU.uVolOn.value = T.volume.enabled ? 1 : 0;
    if (parts) parts.setCount(Math.round(T.particles * particleCountScale));
    if (prevType !== renderer.shadowMap.type && prevEnabled && T.shadow.enabled) markMaterialsDirty();
    adaptive.reset();
    resize(size.w > 1 ? size.w : undefined, size.h > 1 ? size.h : undefined);
    if (api.onTierChange) api.onTierChange(name);
  }

  function setCRT(v) {
    if (typeof v === 'string') { crtName = v; Object.assign(crt, CRT_PRESETS[v] || CRT_PRESETS.off); }
    else { crtName = 'custom'; Object.assign(crt, v); }
  }

  const adaptive = new AdaptiveQuality({
    targetFps: opts.targetFps, allowUpgrade: opts.allowUpgrade,
    onChange: (t, why) => {
      if (t) { console.info('[ashfall-render] tier', why, '->', t); setTier(t); return; }
      // refined/low still over budget: fall back to the classic (lower-res) look at medium, then low
      // still over budget on the lightest tier: drop to the classic (lower-res) look, same tier
      if (look === 'refined' && opts.lookFallback !== false) {
        console.info('[ashfall-render] refined/' + tierName + ' over budget -> classic/' + tierName);
        api.setLook('classic');
      }
    },
  });
  adaptive.enabled = opts.adaptive;

  // ---- per-frame -------------------------------------------------------------------
  let time = 0, frame = 0;
  const stats = { tier: 'medium', environment: null, frameMs: 0, gpuish: 0, calls: 0, triangles: 0, internal: [0, 0], halfFloat, passes: {} };

  function updateUniforms() {
    camera.updateMatrixWorld();
    const camPos = camera.getWorldPosition(volU.uCamPos.value);
    volU.uInvProj.value.copy(camera.projectionMatrixInverse);
    volU.uCamWorld.value.copy(camera.matrixWorld);
    compU.uNear.value = camera.near; compU.uFar.value = camera.far;
    volU.uFrame.value = frame % 64;
    volU.uTime.value = time;
    compU.uTime.value = time;
    blitU.uTime.value = time;
    volU.uFogColor.value.set(fog.color.r, fog.color.g, fog.color.b);
    volU.uFogDensity.value = fog.density; volU.uFogFalloff.value = fog.falloff;
    volU.uFogBase.value = fog.base; volU.uMaxDist.value = fog.maxDist; volU.uFogStart.value = fog.start; volU.uNoiseAmt.value = fog.noise;

    // sun
    const sc = _col.copy(sun.color).multiplyScalar(sun.intensity * sunState.scatter);
    volU.uSunColor.value.set(sc.r, sc.g, sc.b);
    if (sun.shadow.map && T.volume.shadow) {
      volU.tShadow.value = sun.shadow.map.texture;
      volU.uShadowMatrix.value.copy(sun.shadow.matrix);
    } else volU.tShadow.value = white;
    // sun on screen for god rays
    const fwd = camera.getWorldDirection(_v3b);
    const facing = fwd.dot(sunDir);
    _v3.copy(camPos).addScaledVector(sunDir, 500).project(camera);
    volU.uSunUV.value.set(_v3.x * 0.5 + 0.5, _v3.y * 0.5 + 0.5);
    const edge = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(_v3.x), Math.abs(_v3.y)), 1.2, 2.2);
    volU.uSunVis.value = facing > 0 ? THREE.MathUtils.smoothstep(facing, 0.0, 0.35) * edge : 0;

    // flashlight
    const L = flash.light;
    const on = flash.enabled;
    volU.uSpotPos.value.copy(L.position);
    volU.uSpotDir.value.subVectors(L.target.position, L.position).normalize();
    const fc = _col.copy(L.color).multiplyScalar(on ? L.intensity * flashState.scatter : 0);
    volU.uSpotColor.value.set(fc.r, fc.g, fc.b);
    volU.uSpotCos.value.set(Math.cos(L.angle), Math.cos(L.angle * (1 - L.penumbra * 0.8)));
    volU.uSpotRange.value = L.distance || 30;

    // point lights: nearest first (was: registration order, so far fires could steal the glow)
    for (const p of pointLights) {
      if (p.campfire) p.campfire.group.updateMatrixWorld();
      if (p.light.parent) p.light.getWorldPosition(p.pos);
      else p.pos.copy(p.light.position).applyMatrix4(p.anchor ? p.anchor.matrixWorld : _m4.identity());
      p.d2 = p.pos.distanceToSquared(camPos);
    }
    sorted.length = 0;
    for (const p of pointLights) sorted.push(p);
    sorted.sort((a, b) => a.d2 - b.d2);
    // drive the fixed scene light pool from the nearest pooled campfires
    let pi = 0;
    for (const p of sorted) {
      if (!p.pooled || pi >= pool.length) continue;
      const pl = pool[pi++];
      pl.position.copy(p.pos); pl.color.copy(p.light.color);
      pl.intensity = p.light.intensity; pl.distance = p.light.distance; pl.decay = p.light.decay;
    }
    for (; pi < pool.length; pi++) pool[pi].intensity = 0;
    const n = Math.min(sorted.length, T.maxPoints, MAX_POINTS);
    volU.uPointCount.value = n;
    for (let i = 0; i < n; i++) {
      const p = sorted[i];
      const c = _col.copy(p.light.color).multiplyScalar(p.light.visible ? p.light.intensity : 0);
      volU.uPointPos.value[i].set(p.pos.x, p.pos.y, p.pos.z, p.glow * 0.03);
      volU.uPointColor.value[i].set(c.r, c.g, c.b);
    }

    if (parts) {
      const u = parts.uniforms;
      u.uViewH.value = size.ih;
      u.uSunDir.value.copy(sunDir);
      const s2 = _col.copy(sun.color).multiplyScalar(sun.intensity * 0.35);
      u.uSunColor.value.set(s2.r, s2.g, s2.b);
      u.uAmbient.value.set(fog.color.r * 0.55, fog.color.g * 0.55, fog.color.b * 0.55);
      u.uSpotPos.value.copy(volU.uSpotPos.value);
      u.uSpotDir.value.copy(volU.uSpotDir.value);
      const sp = _col.copy(L.color).multiplyScalar(on ? L.intensity * 0.06 : 0);
      u.uSpotColor.value.set(sp.r, sp.g, sp.b);
      u.uSpotCos.value.copy(volU.uSpotCos.value);
      u.uSpotRange.value = volU.uSpotRange.value;
      u.uPointCount.value = n;
      if (sun.shadow.map && sun.castShadow) { u.tShadow.value = sun.shadow.map.texture; u.uShadowMatrix.value.copy(sun.shadow.matrix); u.uUseShadow.value = 1; }
      else { u.tShadow.value = white; u.uUseShadow.value = 0; }
      for (let i = 0; i < n; i++) {
        const p = sorted[i];
        u.uPointPos.value[i].set(volU.uPointPos.value[i].x, volU.uPointPos.value[i].y, volU.uPointPos.value[i].z, p.light.distance || 12);
        u.uPointColor.value[i].copy(volU.uPointColor.value[i]).multiplyScalar(0.08);
      }
    }

    compU.uBloomStrength.value = grade.bloom; compU.uExposure.value = grade.exposure;
    compU.uContrast.value = grade.contrast; compU.uSaturation.value = grade.saturation;
    compU.uBrightness.value = grade.brightness; compU.uTint.value.set(...grade.tint);
    compU.uLift.value.set(...grade.lift); compU.uGamma.value = grade.gamma; compU.uCrush.value = grade.crush;
    compU.uDither.value = grade.dither; compU.uGrain.value = grade.grain; compU.uPaletteMix.value = grade.paletteMix;
    compU.uWarmKeep.value = grade.warmKeep; compU.uToe.value = grade.toe;
    compU.uDitherMode.value = DITHER_MODES[dither.pattern] ?? 1; compU.uNoiseMix.value = dither.noiseMix;
    preU.uThreshold.value = grade.bloomThreshold;

    blitU.uCurve.value = crt.curve; blitU.uScanline.value = crt.scanline; blitU.uChroma.value = crt.chroma;
    blitU.uVignette.value = crt.vignette; blitU.uCorner.value = crt.corner; blitU.uFlicker.value = crt.flicker;
  }

  // optional per-pass profiling (forces GPU syncs: dev only)
  const _px = new Uint8Array(4);
  let _pt = 0;
  function mark(name) {
    if (!api.profile) return;
    renderer.setRenderTarget(null);
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px);
    const now = performance.now();
    if (name) stats.passes[name] = (stats.passes[name] || 0) * 0.8 + (now - _pt) * 0.2;
    _pt = now;
  }

  function render(dt = 1 / 60) {
    if (disposed) return;
    const t0 = performance.now();
    mark(null);
    time += dt; frame++;
    adaptive.sample(dt * 1000, tierName);
    let passes = 0, shadowPasses = 0;

    // shadow scheduling: refit + re-render the map only on refresh frames. The shadow matrix is
    // updated together with the map, so lit surfaces stay consistent between refreshes.
    if (T.shadow.enabled) {
      const doShadow = shadowCountdown <= 0;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = doShadow;
      if (doShadow) {
        fitSunShadow(sun, camera, sunDir, T.shadow.distance);
        shadowCountdown = Math.max(1, T.shadow.updateEvery | 0);
        shadowPasses = 1 + (T.flashShadow && flash.enabled ? 1 : 0);
      }
      shadowCountdown--;
    }
    flash.update(camera, time);
    for (const p of pointLights) if (p.campfire) p.campfire.update(time, size.ih);
    if (parts) parts.update(camera, time);
    updateUniforms();

    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    // 1. scene at low internal res
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    passes++;
    stats.calls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
    mark('shadows+scene');

    // 2. volumetric in-scatter (+ god rays)
    if (volRT) {
      volU.tDepth.value = sceneRT.depthTexture;
      pass(volMat, volRT); passes++;
      compU.tVol.value = volRT.texture;
    } else compU.tVol.value = white;
    mark('volume+godrays');

    // 3. bloom mip chain
    preU.tSrc.value = sceneRT.texture;
    preU.uTexel.value.set(1 / sceneRT.width, 1 / sceneRT.height);
    pass(preMat, down[0]); passes++;
    for (let i = 1; i < down.length; i++) {
      downU.tSrc.value = down[i - 1].texture;
      downU.uTexel.value.set(1 / down[i - 1].width, 1 / down[i - 1].height);
      pass(downMat, down[i]); passes++;
    }
    let bloomTex = down[down.length - 1].texture;
    for (let i = down.length - 2; i >= 0; i--) {
      const low = i === down.length - 2 ? down[down.length - 1] : up[i + 1];
      upU.tLow.value = low.texture;
      upU.tCur.value = down[i].texture;
      upU.uTexel.value.set(1 / low.width, 1 / low.height);
      pass(upMat, up[i]); passes++;
      bloomTex = up[i].texture;
    }

    mark('bloom');
    // 4. composite -> low-res sRGB, palette-quantised
    compU.tScene.value = sceneRT.texture;
    compU.tDepth.value = sceneRT.depthTexture;
    compU.tBloom.value = bloomTex;
    pass(compMat, postRT); passes++;
    mark('composite');

    if (api.hooks.beforeCRT) {
      renderer.autoClear = false;
      api.hooks.beforeCRT(renderer, postRT, { width: size.iw, height: size.ih });
      renderer.autoClear = true;
    }

    // 5. nearest upscale + CRT to the canvas
    blitU.tSrc.value = postRT.texture;
    pass(blitMat, null); passes++; // straight to the default framebuffer
    mark('crt-blit');

    if (api.hooks.afterCRT) {
      renderer.autoClear = false;
      api.hooks.afterCRT(renderer, { width: size.w, height: size.h });
    }
    renderer.autoClear = prevAutoClear;

    stats.gpuish = performance.now() - t0;
    stats.frameMs += (dt * 1000 - stats.frameMs) * 0.1;
    stats.tier = tierName; stats.look = look; stats.palette = paletteName; stats.environment = envName;
    stats.internal = [size.iw, size.ih];
    stats.passCount = passes; stats.shadowPasses = shadowPasses;
  }

  // ---- memory report -----------------------------------------------------------------
  function bpp(tex) {
    const t = tex.type;
    const ch = tex.format === THREE.RedFormat ? 1 : 4;
    const b = t === THREE.HalfFloatType ? 2 : (t === THREE.FloatType ? 4 : 1);
    return ch * b;
  }
  function rtBytes(rt) {
    if (!rt) return 0;
    let n = rt.width * rt.height * bpp(rt.texture);
    if (rt.depthTexture) n += rt.width * rt.height * 4;
    else if (rt.depthBuffer) n += rt.width * rt.height * 4;
    return n;
  }
  function shadowBytes(light) {
    if (!light.castShadow) return 0;
    const s = light.shadow.mapSize; // RGBA8 packed depth + depth renderbuffer
    return s.x * s.y * 8;
  }
  /** Exact bytes of everything this pipeline owns on the GPU (+ canvas estimate). */
  function getMemoryReport() {
    const targets = { scene: rtBytes(sceneRT), volume: rtBytes(volRT), post: rtBytes(postRT),
      bloom: [...down, ...up].reduce((a, r) => a + rtBytes(r), 0) };
    const shadows = { sun: shadowBytes(sun), flashlight: shadowBytes(flash.light) };
    const lut = compU.tLUT.value === white ? 0 : 512 * 512 + 256 * 4;
    const textures = { lut, blueNoise: 32 * 32, white: 4 };
    const fboCount = [sceneRT, volRT, postRT, ...down, ...up].filter(Boolean).length
      + (sun.castShadow ? 1 : 0) + (flash.light.castShadow ? 1 : 0);
    const owned = Object.values(targets).reduce((a, b) => a + b, 0) + shadows.sun + shadows.flashlight + lut + 1028;
    const canvas = size.w * size.h * (4 + 4 + 4); // front+back colour + depth (estimate)
    return { tier: tierName, look, internal: [size.iw, size.ih], canvas: [size.w, size.h], halfFloat,
      targets, shadows, textures, fboCount, ownedBytes: owned, canvasBytesEstimate: canvas,
      ownedKB: +(owned / 1024).toFixed(1), totalMB: +((owned + canvas) / 1048576).toFixed(2) };
  }

  // ---- public API --------------------------------------------------------------------
  const api = {
    render, resize, setTier, setCRT, _renderer: renderer,
    hooks: { beforeCRT: opts.hudBeforeCRT || null, afterCRT: opts.hudAfterCRT || null },
    onTierChange: null,
    profile: false,
    getTier: () => tierName,
    getCRT: () => crtName,
    setStyle: (n) => api.setLook(n),
    get stats() { return stats; },
    get sun() { return sun; },
    get flashlight() { return flash.light; },
    get particles() { return parts; },
    get internalSize() { return { width: size.iw, height: size.ih }; },
    adaptive,
    setFlashlight(v) {
      if (typeof v === 'boolean') { flash.enabled = v; return; } // intensity toggle, never visibility
      if (!v) return;
      if (v.enabled !== undefined) flash.enabled = v.enabled;
      const L = flash.light;
      if (v.color !== undefined) L.color.set(v.color);
      if (v.intensity !== undefined) flash.baseIntensity = v.intensity;
      if (v.angle !== undefined) L.angle = THREE.MathUtils.degToRad(v.angle);
      if (v.range !== undefined) L.distance = v.range;
      if (v.penumbra !== undefined) L.penumbra = v.penumbra;
      if (v.offset) flash.offset.set(...v.offset);
      if (v.scatter !== undefined) flashState.scatter = v.scatter;
      if (v.sway !== undefined) flash.sway = v.sway;
      if (v.pitch !== undefined) flash.pitch = v.pitch;
      if (v.shadowMapSize !== undefined) { flashState.shadowSize = v.shadowMapSize; if (flash.light.castShadow) setShadowMapSize(flash.light, v.shadowMapSize); }
      if (v.shadow !== undefined && v.shadow !== T.flashShadow) { // per-scene override (e.g. interiors on low)
        T.flashShadow = !!v.shadow; flash.light.castShadow = T.flashShadow && renderer.shadowMap.enabled;
        if (flash.light.castShadow) setShadowMapSize(flash.light, flashState.shadowSize || T.flashShadowSize);
      }
    },
    setSun(v) {
      if (v.direction) sunDir.set(...(Array.isArray(v.direction) ? v.direction : v.direction.toArray())).normalize();
      if (v.color !== undefined) sun.color.set(v.color);
      if (v.intensity !== undefined) sun.intensity = v.intensity;
      if (v.scatter !== undefined) sunState.scatter = v.scatter;
      if (v.godRays !== undefined) volU.uGodStrength.value = v.godRays;
      if (v.anisotropy !== undefined) volU.uSunG.value = v.anisotropy;
      if (!T.shadow.enabled) { sun.position.copy(sun.target.position).addScaledVector(sunDir, 30); }
    },
    setFog(v) {
      if (!v) return;
      const { wind, color, ...rest } = v;
      Object.assign(fog, rest);
      if (color !== undefined) {
        if (color instanceof THREE.Color) fog.color.copy(color);
        else fog.color.set(color);
      }
      if (wind !== undefined) {
        if (Array.isArray(wind)) fog.wind.set(wind[0], wind[1], wind[2]);
        else if (wind.isVector3) fog.wind.copy(wind);
      }
    },
    setGrade(v) { Object.assign(grade, v); },
    /** 'classic32' | 'refined64' | hex[] | [[r,g,b]...] | false (no quantisation) */
    setPalette(v) {
      const hex = resolvePalette(v);
      paletteName = v === false ? 'off' : typeof v === 'string' ? v : 'custom';
      paletteHex = hex;
      compU.uPaletteOn.value = hex ? 1 : 0;
      bindLUT(hex);
    },
    getPalette: () => paletteName,
    /** { pattern: 'bayer4'|'bayer8'|'blue', amount: 0..0.15, noiseMix: 0..1 } */
    setDither(v) {
      Object.assign(dither, v);
      if (v.amount !== undefined) grade.dither = v.amount;
    },
    getDither: () => ({ ...dither, amount: grade.dither }),
    /** 'refined' (HD-pixel, default) | 'classic' (art_C density). Resets palette, dither, grain. */
    setLook(name) {
      if (!LOOKS[name]) throw new Error('unknown look ' + name);
      look = name;
      const L = LOOKS[name];
      const envCfg = envName ? ENVIRONMENTS[envName] : null;
      Object.assign(dither, L.dither);
      grade.dither = userGrade.dither ?? L.dither.amount;
      grade.grain = userGrade.grain ?? (L.grain * (envCfg ? (envCfg.grade.grainScale ?? 1) : 1));
      grade.toe = userGrade.toe ?? L.toe;
      api.setPalette(envCfg ? envCfg.palette[name] : L.palette);
      setTier(tierName);
    },
    getLook: () => look,
    /**
     * Switch Nevada Revision 2 seasonal atmosphere preset ('summer' | 'autumn' | 'late_fall' | 'fallout_winter',
     * or chapter number 1..10 / 'ch01'..'ch10'). Zero target rebuilds, zero shader recompiles, mobile-safe.
     * Returns the resolved preset config (including recommended sky, hemi, ambient, sun, fog, particles).
     */
    setEnvironment(id, overrides = {}) {
      if (disposed) return null;
      const key = resolveEnvironment(id);
      const cfg = getEnvironmentConfig(key);
      envName = key;
      blizzardActive = false;

      // 1. sun & fog
      api.setSun({ ...cfg.sun, ...(overrides.sun || {}) });
      api.setFog({ ...cfg.fog, ...(overrides.fog || {}) });

      // 2. grade (keep active look's dither, toe, and grain scaling)
      const L = LOOKS[look] || LOOKS.refined;
      const g = cfg.grade;
      const { grainScale = 1, ...gradeFields } = g;
      Object.assign(grade, {
        ...GRADE_ASHFALL,
        ...gradeFields,
        tint: g.tint.slice(),
        lift: g.lift.slice(),
        dither: dither.amount,
        grain: userGrade.grain ?? (L.grain * grainScale),
        toe: userGrade.toe ?? L.toe,
        bloomThreshold: userGrade.bloomThreshold ?? (halfFloat ? 1.1 : 0.82),
        paletteMix: 1.0,
        ...(overrides.grade || {}),
      });

      // 3. palette (GPU-built LUT, cached; 0 target rebuilds)
      const pal = overrides.palette !== undefined ? overrides.palette : cfg.palette[look];
      api.setPalette(pal);

      // 4. particles (same single BufferGeometry + ShaderMaterial; uniform update only)
      const pCfg = { ...cfg.particles, ...(overrides.particles || {}) };
      particleCountScale = pCfg.countScale ?? 1.0;
      if (parts) {
        parts.setConfig(pCfg);
        parts.setCount(Math.round(T.particles * particleCountScale));
      }

      // 5. flashlight scatter
      if (overrides.flashlight && typeof overrides.flashlight === 'object') {
        api.setFlashlight({ scatter: cfg.flashlight.scatter, ...overrides.flashlight });
      } else {
        flashState.scatter = cfg.flashlight.scatter;
      }

      // 6. optional sky & scene hemisphere/ambient light sync (restored on dispose)
      if (opts.syncSky !== false && overrides.syncSky !== false) {
        const skyCol = (overrides.sky && overrides.sky.color !== undefined) ? overrides.sky.color : cfg.sky.color;
        renderer.setClearColor(skyCol, 1);
        if (scene.background && scene.background.isColor) scene.background.set(skyCol);
        envTouchedSky = true;
      }
      if (opts.syncLights !== false && overrides.syncLights !== false) {
        if (!hemiLight || !ambientLight) {
          scene.traverse((c) => {
            if (!hemiLight && c.isHemisphereLight) hemiLight = c;
            if (!ambientLight && c.isAmbientLight) ambientLight = c;
          });
        }
        if (hemiLight) {
          if (!hostHemi) hostHemi = { sky: hemiLight.color.clone(), ground: hemiLight.groundColor.clone(), intensity: hemiLight.intensity };
          const h = { ...cfg.hemi, ...(overrides.hemi || {}) };
          hemiLight.color.set(h.sky);
          hemiLight.groundColor.set(h.ground);
          hemiLight.intensity = h.intensity;
        }
        if (ambientLight) {
          if (!hostAmb) hostAmb = { color: ambientLight.color.clone(), intensity: ambientLight.intensity };
          const a = { ...cfg.ambient, ...(overrides.ambient || {}) };
          ambientLight.color.set(a.color);
          ambientLight.intensity = a.intensity;
        }
      }

      stats.environment = envName;
      return cfg;
    },
    getEnvironment: () => envName,
    getEnvironmentConfig: (id) => getEnvironmentConfig(id ?? envName ?? 'fallout_winter'),
    /**
     * Convenience wrapper compatible with both preset strings/chapters ('summer' | 'autumn' | 'late_fall' | 'fallout_winter' | 1..10)
     * and Prime's per-frame object call setWeather({ blizzard, timeOfDay, flashlight, environment?, chapter? }).
     */
    setWeather(arg, overrides) {
      if (disposed || arg == null) return envName;
      if (typeof arg === 'string' || typeof arg === 'number') return api.setEnvironment(arg, overrides);
      if (typeof arg === 'object') {
        const target = arg.environment ?? arg.preset ?? arg.act ?? arg.chapter;
        if (target != null) api.setEnvironment(target, arg);
        if (arg.blizzard !== undefined && arg.blizzard !== blizzardActive) {
          blizzardActive = !!arg.blizzard;
          if (parts && (envName === null || envName === 'fallout_winter')) {
            const baseP = envName ? ENVIRONMENTS[envName].particles : { wind: [0.6, 0, -0.2], fall: 1.1, countScale: 1.0 };
            if (blizzardActive) {
              parts.setConfig({ wind: [baseP.wind[0] * 2.6, 0, baseP.wind[2] * 2.2], fall: baseP.fall * 1.7 });
              parts.setCount(Math.round(T.particles * Math.min(1.25, (baseP.countScale ?? 1) * 1.25)));
            } else {
              parts.setConfig({ wind: baseP.wind, fall: baseP.fall });
              parts.setCount(Math.round(T.particles * particleCountScale));
            }
          }
        }
      }
      return envName;
    },
    /** Host-owned light (already in the scene): adds only its volumetric glow. */
    addPointLight(light, { glow = 1 } = {}) {
      if (!pointLights.some((p) => p.light === light)) pointLights.push({ light, glow, pos: new THREE.Vector3(), d2: 0 });
      return light;
    },
    removePointLight(light) { const i = pointLights.findIndex((p) => p.light === light); if (i >= 0) pointLights.splice(i, 1); },
    /** Campfire = merged logs/stones + flame cards + embers + glow. Its light is served from a fixed
     *  pool of POINT_POOL scene lights (nearest fires), so adding fires never recompiles shaders. */
    addCampfire(position, o2 = {}) {
      const cf = createCampfire({ position: position.isVector3 ? position : new THREE.Vector3(...position), ...o2, addLight: false });
      scene.add(cf.group);
      pointLights.push({ light: cf.light, glow: cf.glow, campfire: cf, pooled: true, anchor: cf.group, pos: new THREE.Vector3(), d2: 0 });
      return cf;
    },
    removeCampfire(cf) {
      if (!cf) return;
      const i = pointLights.findIndex((p) => p.campfire === cf);
      if (i >= 0) pointLights.splice(i, 1);
      cf.dispose();
    },
    getMemoryReport,
    get caps() { return { ...caps }; },
    get flashlightEnabled() { return flash.enabled; },
    /**
     * Optional: call behind a loading screen. Compiles scene + post shaders (parallel compile when
     * KHR_parallel_shader_compile exists) and renders one frame, so the first gameplay frame
     * doesn't stall on shader compilation.
     */
    async warmup() {
      if (disposed) return;
      try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { /* ignore */ }
      render(1 / 60);
    },
    /**
     * Frees every GPU resource this pipeline created and restores what it changed on the host:
     * targets + depth textures, post materials/geometry, LUT/palette/blue-noise/white textures,
     * flashlight (+ its shadow map), campfire light pool, particles, pipeline campfires,
     * shadow maps it resized, renderer.shadowMap settings, sun.castShadow/mapSize, scene.fog.
     * Host-owned lights passed to addPointLight are left alone. Safe to call twice.
     */
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeTargets();
      [volMat, preMat, downMat, upMat, compMat, blitMat].forEach((m) => m.dispose());
      quadGeo.dispose(); white.dispose(); blue.dispose();
      releasePaletteLUTs();
      flash.light.removeFromParent(); flash.light.target.removeFromParent(); flash.light.dispose();
      for (const pl of pool) { pl.removeFromParent(); pl.dispose(); }
      pool.length = 0;
      if (parts) parts.dispose();
      for (const p of pointLights) if (p.campfire) p.campfire.dispose();
      pointLights.length = 0; sorted.length = 0;
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      if (ownSun) { sun.removeFromParent(); sun.target.removeFromParent(); sun.dispose(); }
      else {
        sun.castShadow = hostSun.castShadow;
        sun.shadow.mapSize.set(hostSun.mapSize, hostSun.mapSize);
        if (envName) { sun.color.copy(hostSun.color); sun.intensity = hostSun.intensity; }
      }
      if (envTouchedSky) {
        renderer.setClearColor(hostClearColor, hostClearAlpha);
        if (hostSceneBg && scene.background && scene.background.isColor) scene.background.copy(hostSceneBg);
      }
      if (hostHemi && hemiLight) { hemiLight.color.copy(hostHemi.sky); hemiLight.groundColor.copy(hostHemi.ground); hemiLight.intensity = hostHemi.intensity; }
      if (hostAmb && ambientLight) { ambientLight.color.copy(hostAmb.color); ambientLight.intensity = hostAmb.intensity; }
      renderer.shadowMap.enabled = hostShadow.enabled;
      renderer.shadowMap.type = hostShadow.type;
      renderer.shadowMap.autoUpdate = hostShadow.autoUpdate;
      renderer.shadowMap.needsUpdate = true;
      if (opts.takeOverFog) scene.fog = sceneFog;
      api.hooks.beforeCRT = api.hooks.afterCRT = null;
      api.onTierChange = null;
      renderer.setRenderTarget(null);
    },
    get disposed() { return disposed; },
  };

  // verify half-float renderability for real before allocating anything big
  if (halfFloat) {
    const r = verifyHalfFloat();
    caps.halfFloatVerified = r === 'ok';
    caps.hdrReason = r === 'ok' ? 'verified' : r;
    if (r !== 'ok') { halfFloat = false; console.info('[ashfall-render] HDR off:', r); }
  }
  applyHDRMode();
  try { caps.glRenderer = (gl.getParameter(gl.RENDERER) || '') + ''; } catch (e) { /* ignore */ }
  caps.mobile = mobile; caps.ios = isIOS();
  {
    const t0 = performance.now();
    bindLUT(paletteHex);
    caps.lutMs = +(performance.now() - t0).toFixed(2);
    caps.lutPath = lutStats.path;
  }

  setCRT(opts.crt);
  setTier(opts.tier);
  if (initialEnvKey) api.setEnvironment(initialEnvKey);
  return api;
}

export { TIERS, TIER_ORDER, detectTier, isMobileDevice, CRT_PRESETS, LOOKS, getTierConfig, applyMobileQuality, PALETTES, ENVIRONMENTS, ENVIRONMENT_ORDER, resolveEnvironment, environmentForChapter, getEnvironmentConfig };
