// Ashfall render pipeline: low-res scene + shadows + volumetrics + bloom + grade/palette
// + nearest upscale with subtle CRT. three.js r170, WebGL2.
import * as THREE from 'three';
import {
  HEADER, FULLSCREEN_VERT, VOLUME_FRAG, BLOOM_PREFILTER_FRAG, BLOOM_DOWN_FRAG,
  BLOOM_UP_FRAG, COMPOSITE_FRAG, BLIT_FRAG,
} from './shaders.js';
import { TIERS, TIER_ORDER, detectTier, AdaptiveQuality, CRT_PRESETS, LOOKS, getTierConfig, applyMobileQuality } from './quality.js';
import { GRADE_ASHFALL, PALETTES, buildPaletteLUT, resolvePalette } from './palette.js';
import { getBlueNoiseTexture } from './bluenoise.js';
import { fitSunShadow, setShadowMapSize, createFlashlight, createCampfire } from './lighting.js';
import { createParticles } from './particles.js';

const MAX_POINTS = 4;
const _v3 = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _col = new THREE.Color();

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
 * @param {'auto'|'low'|'medium'|'high'} [o.tier]
 */
export function createRenderPipeline(o) {
  const { renderer, scene, camera } = o;
  const opts = {
    tier: 'auto', targetFps: 30, adaptive: true, allowUpgrade: false,
    takeOverFog: true, updateCamera: true, particles: true, crt: 'low',
    ...o,
  };
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const mobile = !!(opts.mobile || /iPhone|iPad|iPod|Android/i.test(ua)
    || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // ---- capabilities -----------------------------------------------------------
  const ext = renderer.extensions;
  let halfFloat = !opts.forceLDR && !!(ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float'));
  let hdrType = halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const volEncode = halfFloat ? 1.0 : 0.5;

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
  sun.castShadow = true;
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
  let paletteName = opts.palette === undefined ? LOOKS[look].palette : (typeof opts.palette === 'string' ? opts.palette : 'custom');
  let paletteHex = resolvePalette(opts.palette === undefined ? LOOKS[look].palette : opts.palette);
  if (userGrade.dither !== undefined) dither.amount = userGrade.dither;
  const crt = { ...CRT_PRESETS.low };
  let crtName = 'low';

  // ---- flashlight + particles ----------------------------------------------------
  const flash = createFlashlight(opts.flashlightOptions || {});
  flash.enabled = opts.flashlight !== false;
  scene.add(flash.light, flash.light.target);
  const flashState = { scatter: 0.05 };

  const parts = opts.particles ? createParticles(opts.particleOptions || {}) : null;
  if (parts) scene.add(parts.points);

  const pointLights = []; // { light, glow, campfire? }

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
    uEncode: { value: volEncode },
  };
  const volMat = raw(VOLUME_FRAG, volU, { MAX_STEPS: 24, MAX_POINTS, GOD_SAMPLES: 0 });

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
    uDecode: { value: 1 / volEncode }, uVolOn: { value: 1 }, uFogColor: volU.uFogColor,
    uBloomStrength: { value: grade.bloom }, uExposure: { value: grade.exposure }, uTime: { value: 0 },
    uContrast: { value: grade.contrast }, uSaturation: { value: grade.saturation }, uBrightness: { value: grade.brightness },
    uTint: { value: new THREE.Vector3(...grade.tint) }, uLift: { value: new THREE.Vector3(...grade.lift) },
    uGamma: { value: grade.gamma }, uCrush: { value: grade.crush },
    tLUT: { value: paletteHex ? buildPaletteLUT(paletteHex) : white }, tBlue: { value: blue },
    uPaletteOn: { value: paletteHex ? 1 : 0 }, uDitherMode: { value: 1 }, uNoiseMix: { value: 0 },
    uPaletteMix: { value: grade.paletteMix }, uDither: { value: grade.dither }, uGrain: { value: grade.grain }, uWarmKeep: { value: 1 }, uToe: { value: 1 },
  };
  const compMat = raw(COMPOSITE_FRAG, compU);

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

  function makeRT(w, h, { type = THREE.UnsignedByteType, filter = THREE.LinearFilter, depth = false } = {}) {
    const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type, minFilter: filter, magFilter: filter, generateMipmaps: false, depthBuffer: depth,
      colorSpace: THREE.NoColorSpace,
    });
    if (depth) {
      rt.depthTexture = new THREE.DepthTexture(Math.max(1, w), Math.max(1, h));
      rt.depthTexture.type = THREE.UnsignedIntType;
    }
    return rt;
  }
  function testRT(type) {
    let rt;
    try {
      rt = makeRT(4, 4, { type, depth: true });
      renderer.setRenderTarget(rt);
      renderer.clear();
      const gl = renderer.getContext();
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      renderer.setRenderTarget(null);
      if (rt.depthTexture) rt.depthTexture.dispose();
      rt.dispose();
      return !!ok;
    } catch (err) {
      try { renderer.setRenderTarget(null); } catch {}
      try { if (rt) { if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); } } catch {}
      return false;
    }
  }
  if (halfFloat && !testRT(THREE.HalfFloatType)) {
    halfFloat = false;
    hdrType = THREE.UnsignedByteType;
  }
  function disposeTargets() {
    [sceneRT, volRT, postRT, ...down, ...up].forEach((rt) => { if (rt) { if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); } });
    down = []; up = [];
  }
  function buildTargets() {
    disposeTargets();
    const s = T.sceneScale;
    try {
      sceneRT = makeRT(size.iw * s, size.ih * s, { type: hdrType, depth: true });
    } catch (err) {
      hdrType = THREE.UnsignedByteType;
      halfFloat = false;
      sceneRT = makeRT(size.iw * s, size.ih * s, { type: hdrType, depth: true });
    }
    const vs = T.volume.scale;
    volRT = makeRT(Math.ceil(size.iw * vs), Math.ceil(size.ih * vs), { type: hdrType, filter: THREE.NearestFilter });
    postRT = makeRT(size.iw, size.ih, { filter: THREE.NearestFilter });
    let bw = size.iw, bh = size.ih;
    for (let i = 0; i < T.bloom.levels; i++) {
      bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
      down.push(makeRT(bw, bh, { type: hdrType }));
      if (i < T.bloom.levels - 1) up.push(makeRT(bw, bh, { type: hdrType }));
    }
    compU.uVolRes.value.set(volRT.width, volRT.height);
    compU.uRes.value.set(size.iw, size.ih);
    volU.uRes.value.set(volRT.width, volRT.height);
    blitU.uInternal.value.set(size.iw, size.ih);
    blitU.uCanvas.value.set(size.w, size.h);
  }

  function resize(width, height) {
    if (width === undefined) {
      const v = renderer.getDrawingBufferSize(new THREE.Vector2());
      width = v.x; height = v.y;
    }
    size.w = width; size.h = height;
    size.ih = T.internalHeight;
    size.iw = Math.max(2, Math.round((T.internalHeight * width / height) / 2) * 2);
    if (opts.updateCamera && camera.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    buildTargets();
  }

  function markMaterialsDirty() {
    scene.traverse((c) => {
      if (!c.material) return;
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { m.needsUpdate = true; });
    });
  }

  function setTier(name) {
    if (name === 'auto') name = detectTier(renderer);
    if (!TIERS[name]) throw new Error('unknown tier ' + name);
    const prevType = renderer.shadowMap.type;
    tierName = name; T = getTierConfig(look, name);
    if (mobile) T = applyMobileQuality(T);
    renderer.shadowMap.enabled = T.shadow.enabled;
    renderer.shadowMap.type = T.shadow.type === 'pcfsoft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    sun.castShadow = T.shadow.enabled;
    setShadowMapSize(sun, T.shadow.mapSize);
    flash.light.castShadow = T.flashShadow;
    if (T.flashShadow) setShadowMapSize(flash.light, flashState.shadowSize || T.flashShadowSize);
    volMat.defines.MAX_STEPS = T.volume.steps;
    volMat.defines.GOD_SAMPLES = T.godSamples;
    if (T.volume.noise) volMat.defines.USE_NOISE = ''; else delete volMat.defines.USE_NOISE;
    if (T.volume.shadow) volMat.defines.USE_SHADOW = ''; else delete volMat.defines.USE_SHADOW;
    volMat.needsUpdate = true;
    volU.uSteps.value = T.volume.steps;
    compU.uVolOn.value = T.volume.enabled ? 1 : 0;
    if (parts) parts.setCount(T.particles);
    if (prevType !== renderer.shadowMap.type) markMaterialsDirty();
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
      if (look === 'refined' && opts.lookFallback !== false) {
        console.info('[ashfall-render] refined/low over budget -> classic/medium');
        tierName = 'medium';
        api.setLook('classic');
      }
    },
  });
  adaptive.enabled = opts.adaptive;

  // ---- per-frame -------------------------------------------------------------------
  let time = 0, frame = 0;
  const stats = { tier: 'medium', frameMs: 0, gpuish: 0, calls: 0, triangles: 0, internal: [0, 0], halfFloat, passes: {} };

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

    // point lights
    const n = Math.min(pointLights.length, T.maxPoints, MAX_POINTS);
    volU.uPointCount.value = n;
    for (let i = 0; i < n; i++) {
      const p = pointLights[i];
      p.light.getWorldPosition(_v3);
      const c = _col.copy(p.light.color).multiplyScalar(p.light.visible ? p.light.intensity : 0);
      volU.uPointPos.value[i].set(_v3.x, _v3.y, _v3.z, p.glow * 0.03);
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
        const p = pointLights[i];
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
    const t0 = performance.now();
    mark(null);
    time += dt; frame++;
    adaptive.sample(dt * 1000, tierName);

    if (T.shadow.enabled) fitSunShadow(sun, camera, sunDir, T.shadow.distance);
    flash.update(camera, time);
    for (const p of pointLights) if (p.campfire) p.campfire.update(time, size.ih);
    if (parts) parts.update(camera, time);
    updateUniforms();

    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    // 1. scene at low internal res
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    stats.calls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
    mark('shadows+scene');

    // 2. volumetric in-scatter (+ god rays)
    if (T.volume.enabled) {
      volU.tDepth.value = sceneRT.depthTexture;
      pass(volMat, volRT);
      compU.tVol.value = volRT.texture;
    }
    mark('volume+godrays');

    // 3. bloom mip chain
    preU.tSrc.value = sceneRT.texture;
    preU.uTexel.value.set(1 / sceneRT.width, 1 / sceneRT.height);
    pass(preMat, down[0]);
    for (let i = 1; i < down.length; i++) {
      downU.tSrc.value = down[i - 1].texture;
      downU.uTexel.value.set(1 / down[i - 1].width, 1 / down[i - 1].height);
      pass(downMat, down[i]);
    }
    let bloomTex = down[down.length - 1].texture;
    for (let i = down.length - 2; i >= 0; i--) {
      const low = i === down.length - 2 ? down[down.length - 1] : up[i + 1];
      upU.tLow.value = low.texture;
      upU.tCur.value = down[i].texture;
      upU.uTexel.value.set(1 / low.width, 1 / low.height);
      pass(upMat, up[i]);
      bloomTex = up[i].texture;
    }

    mark('bloom');
    // 4. composite -> low-res sRGB, palette-quantised
    compU.tScene.value = sceneRT.texture;
    compU.tDepth.value = sceneRT.depthTexture;
    compU.tBloom.value = bloomTex;
    pass(compMat, postRT);
    mark('composite');

    if (api.hooks.beforeCRT) {
      renderer.autoClear = false;
      api.hooks.beforeCRT(renderer, postRT, { width: size.iw, height: size.ih });
      renderer.autoClear = true;
    }

    // 5. nearest upscale + CRT to the canvas
    blitU.tSrc.value = postRT.texture;
    pass(blitMat, null);
    mark('crt-blit');

    if (api.hooks.afterCRT) {
      renderer.autoClear = false;
      api.hooks.afterCRT(renderer, { width: size.w, height: size.h });
    }
    renderer.autoClear = prevAutoClear;

    stats.gpuish = performance.now() - t0;
    stats.frameMs += (dt * 1000 - stats.frameMs) * 0.1;
    stats.tier = tierName; stats.look = look; stats.palette = paletteName;
    stats.internal = [size.iw, size.ih];
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
      if (typeof v === 'boolean') { flash.enabled = v; return; }
      if (v.enabled !== undefined) flash.enabled = v.enabled;
      const L = flash.light;
      if (v.color !== undefined) L.color.set(v.color);
      if (v.intensity !== undefined) L.intensity = v.intensity;
      if (v.angle !== undefined) L.angle = THREE.MathUtils.degToRad(v.angle);
      if (v.range !== undefined) L.distance = v.range;
      if (v.penumbra !== undefined) L.penumbra = v.penumbra;
      if (v.offset) flash.offset.set(...v.offset);
      if (v.scatter !== undefined) flashState.scatter = v.scatter;
      if (v.sway !== undefined) flash.sway = v.sway;
      if (v.pitch !== undefined) flash.pitch = v.pitch;
      if (v.shadowMapSize !== undefined) { flashState.shadowSize = v.shadowMapSize; if (flash.light.castShadow) setShadowMapSize(flash.light, v.shadowMapSize); }
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
      Object.assign(fog, v);
      if (v.color !== undefined && !(v.color instanceof THREE.Color)) fog.color = new THREE.Color(v.color);
    },
    setGrade(v) { Object.assign(grade, v); },
    /** 'classic32' | 'refined64' | hex[] | [[r,g,b]...] | false (no quantisation) */
    setPalette(v) {
      const hex = resolvePalette(v);
      paletteName = v === false ? 'off' : typeof v === 'string' ? v : 'custom';
      paletteHex = hex;
      compU.uPaletteOn.value = hex ? 1 : 0;
      if (hex) compU.tLUT.value = buildPaletteLUT(hex);
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
      Object.assign(dither, L.dither);
      grade.dither = userGrade.dither ?? L.dither.amount;
      grade.grain = userGrade.grain ?? L.grain;
      grade.toe = userGrade.toe ?? L.toe;
      api.setPalette(L.palette);
      setTier(tierName);
    },
    getLook: () => look,
    addPointLight(light, { glow = 1 } = {}) { pointLights.push({ light, glow }); return light; },
    removePointLight(light) { const i = pointLights.findIndex((p) => p.light === light); if (i >= 0) pointLights.splice(i, 1); },
    addCampfire(position, o2 = {}) {
      const cf = createCampfire({ position: position.isVector3 ? position : new THREE.Vector3(...position), ...o2 });
      scene.add(cf.group);
      pointLights.push({ light: cf.light, glow: cf.glow, campfire: cf });
      return cf;
    },
    removeCampfire(cf) { api.removePointLight(cf.light); cf.dispose(); },
    dispose() {
      disposeTargets();
      [volMat, preMat, downMat, upMat, compMat, blitMat].forEach((m) => m.dispose());
      quadGeo.dispose(); white.dispose();
      flash.light.removeFromParent(); flash.light.target.removeFromParent(); flash.light.dispose();
      if (parts) parts.dispose();
      for (const p of pointLights) if (p.campfire) p.campfire.dispose();
      pointLights.length = 0;
      if (ownSun) sun.removeFromParent();
      if (opts.takeOverFog) scene.fog = sceneFog;
      renderer.setRenderTarget(null);
    },
  };

  setCRT(opts.crt);
  setTier(opts.tier);
  return api;
}

export { TIERS, TIER_ORDER, detectTier, CRT_PRESETS, LOOKS, getTierConfig, applyMobileQuality, PALETTES };
