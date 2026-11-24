# Integrating `render/` into Prime's (formerly Echo's) game: proposed changes (not applied)

I did not modify any file outside `render/`. `render/demo/existing.html` does all of the steps below at **runtime**
to prove they work. To make them permanent, apply them in `js/main.js` / `index.html`:

## 0. iPhone Safari safety (round 4 audit) — what Prime should change
Read-only review of the live build (`js/game.js`, `js/world.js`, `js/levelLoader.js`, `js/device.js`, `js/player.js`, `js/inventory.js`).
Line numbers are approximate (`game.js` was changing while I read it).

**Already handled inside `render/` (no action needed):**
* `tier: 'auto'` and `tier: 'low'` now resolve to the new **`'mobile'`** tier on every phone/iPad. It also catches iPadOS
  desktop-mode UA (MacIntel + touch), `userAgentData.mobile`, an Apple GPU string with touch, and small coarse-pointer
  touch screens. If a phone asks for medium/high (e.g. `?tier=high`), it is clamped to mobile unless you pass
  `allowHeavyOnMobile: true`. Prime's `mobile: isMobileClient()` option is honoured.
* Toggling the flashlight (`setFlashlight(player.flashlight || night)`, every frame) used to flip `light.visible`.
  three.js keys every lit shader on the number of visible lights, so **each toggle recompiled every scene material**.
  It now toggles intensity only: 0 new programs across 20 toggles (verified).
* `addCampfire` used to add a new `PointLight` per fire. That changes the light count, so **every added fire recompiled
  every material** (a likely cause of the freeze right after NEW SHIFT, which adds a campfire per world fire). Campfire
  lights now come from a fixed pool of 2 scene lights that follow the nearest fires: 0 new programs across 6 add/remove cycles.
* `resize()` no longer reallocates targets when the internal size doesn't change (iOS fires `resize` on every URL-bar
  show/hide). Internal targets never scale with DPR, and the final CRT pass draws straight to the canvas (`null`).

**Please change on your side:**
1. **Remove the fire lights you keep at intensity 0** (`world.js` `_addFire` ~L500 `glow` PointLight; `game.js` ~L633/L1769
   `f.light.intensity = 0`). A light at intensity 0 is still a light: every lit fragment loops over it, and creating or
   removing one recompiles every material. When the pipeline is present, don't create `glow` at all (or `removeFromParent()`
   it during the loading bar, not mid-game). Same for `world.lights.flash` (`world.js` ~L244, intensity-0 SpotLight; the
   pipeline owns the flashlight) and `player.js` ~L61 `muzzle` PointLight (intensity 0 most of the time; use an emissive
   sprite, or keep it but never add/remove it at runtime).
2. **Double fire on `light_fire`** (`levelLoader.js` ~L721–723): `_addFire()` adds a 2.2-intensity glow light, a cone flame
   and logs, and then `pipe.addCampfire()` adds the pipeline's fire on top. Use only `pipe.addCampfire` when a pipeline
   exists, and store it on the fire record (`rec.lumen = …`). The same applies to `inventory.js` ~L32 `world.addCampfire`.
3. **Campfire + level leak on chapter change** (`world.js` `clearLevel()` ~L427): it removes meshes from the scene but
   never `dispose()`s their geometries, materials or textures, and never calls `pipeline.removeCampfire(f.lumen)`. Old
   pipeline campfires stay in the scene (and on the GPU) in the next chapter. Add:
   ```js
   for (const f of this.fires) { if (f.lumen) game.pipeline?.removeCampfire(f.lumen); f.lumen = null; }
   // and dispose what you remove from levelGroup (skip shared/cached PBR textures):
   g.traverse((o) => { o.geometry?.dispose(); /* materials/textures only if not in pbrCache */ });
   ```
4. **Shadow throttle in `_render()`** (`game.js` ~L1571: `shadowMap.autoUpdate = false; needsUpdate every 3 frames`):
   the pipeline now owns shadow scheduling (`T.shadow.updateEvery`, refit and re-render together, so they never
   misalign) and overrides `needsUpdate` every frame. Delete that block, or pass `shadowUpdateEvery: 3` to
   `createRenderPipeline` to keep your cadence on desktop. The mobile tier has **no** shadow pass at all.
5. `renderer.shadowMap.enabled = !isMobileClient()` and `sun.castShadow` / `mapSize` in `world.js`: fine. The pipeline
   sets these per tier and **restores your values on `dispose()`**.
6. **Optional warm-up** behind the NEW SHIFT loading bar, so the first gameplay frame doesn't compile shaders
   (~300–400 ms first frame in SwiftShader; real devices are faster, but it's still a visible hitch):
   `await pipeline.warmup();` (uses `renderer.compileAsync` / KHR_parallel_shader_compile when available).
7. DPR: `canvasDpr()` returning 1 on phones is good (390×844 canvas). The mobile tier snaps its internal height to an
   integer upscale of the canvas: 844 → **196×422 = exactly 2×**. At DPR 3 (1170×2532) the targets are still 196×422,
   only the final blit grows; the canvas itself is then about 35 MB vs 4 MB, so keep the cap.
8. Optional: create the renderer with `depth: false, stencil: false` **when the pipeline is attached** (the pipeline
   never draws depth-tested geometry to the canvas). That saves the canvas depth buffer (1.3 MB at 390×844 and 12 MB at DPR 3).
   Keep `depth: true` for the builtin fallback path.
9. `pixel.js` `parseIntegrationPixel()` reads the first "W×H / W×H / W×H" triple in this file as tier heights, but
   `applyPixelTiers` isn't called and heights now live in `LOOKS` (`quality.js`), so the parse has no effect. Safe to delete.

**`dispose()` contract:** it frees every target and depth texture, the post materials and quad, the LUT, palette,
blue-noise and white textures, the flashlight and its shadow map, the campfire light pool, particles, pipeline campfires
and the shadow maps it resized. It restores `renderer.shadowMap.{enabled,type,autoUpdate}`, `sun.castShadow`/`mapSize`
and `scene.fog`, clears hooks, and is idempotent. Lights you passed to `addPointLight` stay yours. Verified:
`renderer.info.memory` returns to baseline after dispose, and again after a recreate→dispose.

**Recommended boot call (current code already matches this):**
```js
pipeline = createRenderPipeline({
  renderer, scene, camera, sun: world.lights.sun,
  tier: 'auto',               // phones -> 'mobile' at boot (no heavy first frame); desktop -> low/medium/high
  look, crt, targetFps: 30, adaptive: true,
  particles: true, takeOverFog: true, updateCamera: true, flashlight: true,
  mobile: isMobileClient(),   // optional, the pipeline detects phones itself
  // shadowUpdateEvery: 3,    // desktop only, if you want to keep your cadence
});
await pipeline.warmup?.();     // behind the loading bar
```

## 1. Portrait 9:16 canvas (index.html)
The current page is fixed at 1280×720 landscape. Proposed CSS:
```css
html, body { margin:0; height:100%; background:#000; overflow:hidden; }
#c { height:min(100vh, calc(100vw*16/9)); aspect-ratio:9/16; image-rendering:pixelated; display:block; margin:auto; }
```
Size the drawing buffer to the device's physical pixels (`renderer.setSize(cssW*dpr, cssH*dpr, false)`, `setPixelRatio(1)`), then call `pipeline.resize()`.
The refined internal heights (480/576/640) upscale by integer or near-integer factors on common phones:
1080×1920 gives 4× / 3.33× / 3×, and 1170×2532 gives about 5.3× / 4.4× / 4×. For perfectly even pixels on a desktop window, use a canvas height
that's a multiple of the internal height (e.g. 1920 or 1280 for 640).

## 2. Use the pipeline instead of `renderer.render` (js/main.js, `render()` ~L766)
```js
import { createRenderPipeline } from '../render/index.js';
// after scene / camera / sun are built:
const pipeline = createRenderPipeline({
  renderer, scene, camera, sun,
  tier: 'auto',          // phones -> 'mobile'; desktop auto-detect, then adaptive downgrade (high→medium→low→mobile, then classic look)
  look: 'refined',       // default; 'classic' = round-1 art_C density/palette
  crt: 'low',
});
// optional fine-tuning (these are the refined defaults):
// pipeline.setPalette('refined64');                       // or 'classic32'
// pipeline.setDither({ pattern: 'bayer8', amount: 0.032 }); // 'bayer4' | 'blue'
// settings menu: pipeline.setLook(userPrefersClassic ? 'classic' : 'refined');
pipeline.setSun({ direction: [-0.45, 0.42, -1] });     // low sun ahead => backlit shafts
pipeline.addCampfire([-2.3, 0.02, -4.6]);
// in the loop:
pipeline.render(dt);
```
* Remove the unused `rt` / `postMat` / `postScene` (lines ~715–764). The pipeline replaces them, and that 1280×720 **HalfFloat**
  target would only waste memory on phones.
* `renderer.toneMapping` / `toneMappingExposure` stop mattering: tone mapping now happens in the composite pass (same ACES curve).
* `scene.fog` (linear Fog) gets set to `null` by the pipeline, which replaces it with volumetric height fog. `dispose()` restores it.
* Sun shadow setup (`mapSize 2048`, fixed ±25 m frustum) gets overridden per tier and per frame, so the code there can stay as is.

## 3. Camera / viewmodel for portrait
* `camera.fov` 72 → **80** (vertical). In 9:16 the horizontal FOV is otherwise only about 44°.
* `gunWrap.position (0.38,-0.28,-0.7)` → **(0.17,-0.3,-0.62)**. At 9:16 the gun sits off-screen right.

## 4. Particles
* Remove `addParticles(scene, cfg.particles)` (unlit `PointsMaterial`). The pipeline adds lit GPU snow and ash
  (sun forward scatter, flashlight, campfire) that wrap around the camera.

## 5. HUD
* Echo's HUD is a 2D canvas laid over the WebGL canvas. That still works, and it stays **un-curved** (crisp) above the CRT.
  To size it for 9:16, draw it at `pipeline.internalSize` and upscale it with `image-rendering: pixelated`.
* Alternative: draw it in WebGL through `pipeline.hooks.afterCRT` (flat) or `hooks.beforeCRT` (curved with the screen, quantised with the pixels).

## 6. Materials
* No material changes are required. The weather `onBeforeCompile` shaders are compatible.
* Optional: drop `anisotropy = 8` on textures. At 180×320 it costs bandwidth for no visible gain on iPhone.

## 7. Look / palette / dither
* Default is `look: 'refined'`. To keep exactly the round-1 look: `look: 'classic'`.
* Mixing is allowed: `pipeline.setLook('refined'); pipeline.setPalette('classic32');`.
* HUD: at refined res the HUD can be drawn at `pipeline.internalSize` (e.g. 324×576) for crisper text, or at half that and upscaled 2× for chunkier type.

## 7b. Interiors / night
* For indoor areas, swap the snowfall for dust and drop the ambient. No changes outside render/ are needed:
```js
pipeline.setFog({ color: 0x07090c, density: 0.05, falloff: 0, start: 0.4, maxDist: 25 });
pipeline.setSun({ intensity: 0.7, color: 0x9fb4d8, scatter: 0.05 });   // moon through windows
pipeline.setFlashlight({ enabled: true, intensity: 22, angle: 26, penumbra: 0.7, range: 16, scatter: 0.045 });
// particles: createRenderPipeline({ ..., particleOptions: { box:[7,3.2,8], ashRatio:1, fall:0.03, wind:[0.04,0,0.02] } })
```
* Keep Echo's hemisphere/ambient at about 0.05 or lower indoors. The refined grade toe keeps those darks readable, so don't raise ambient to compensate.
* See `demo/darkhouse.js` for the full setup.

## 8. Mockup style switch
* The pipeline's default grade and palette are art_C. For the other mockup styles, pass
  `grade: {...}` and `palette: [...hex]` (A/B/D values are in `postprocess.py`).
