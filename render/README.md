# Ashfall render layer (`render/`)

Lighting, shadows, volumetrics and post for the portrait 9:16 pixel-art survival game.
Matches the chosen **art_C "Cold Nuclear Winter"** mockup. The grade maths is copied exactly from `postprocess.py` style C.
The default **refined** look renders at about 1.9× the art_C pixel density with a 64-colour cold palette and a soft 8×8 dither.
The original **classic** look is still available: art_C's exact 32-colour palette, 4×4 dither and density.
Uses three.js **r170**, plain ES modules, imported as bare `three` through the same CDN importmap as `index.html`. No bundler.

## Quick start

```js
import { createRenderPipeline } from './render/index.js';

const pipeline = createRenderPipeline({
  renderer, scene, camera,      // the game's existing objects
  tier: 'auto',                 // 'auto' | 'low' | 'medium' | 'high'
  look: 'refined',              // 'refined' (default) | 'classic'   (alias: style)
  crt: 'low',                   // 'off' | 'low' | 'med' (independent of tier)
  sun: mySunDirectionalLight,   // optional; otherwise the first shadow-casting DirectionalLight is used
});
pipeline.setSun({ direction: [-0.45, 0.42, -1] });       // toward the sun
pipeline.addCampfire([-2.3, 0, -4.6]);
function frame(dt) { pipeline.render(dt); }               // replaces renderer.render(scene, camera)
addEventListener('resize', () => pipeline.resize());       // after renderer.setSize(...)
```

## Frame structure

| # | pass | resolution | notes |
|---|------|-----------|-------|
| 0 | sun shadow map (+ flashlight spot shadow on medium/high) | – / 512 / 1024 / 2048 | none on mobile. Fitted to the view frustum on refresh frames (low: every 2nd frame) and snapped to whole texels |
| 1 | scene | internal × sceneScale | half-float target when supported, plus a depth texture. `scene.fog` is turned off (the volume pass replaces it) |
| 2 | volumetric in-scatter + god rays (not on mobile) | ⅓–½ internal | raymarched height fog. Blue-noise jitter plus a golden-ratio temporal offset per frame. Falling-ash noise, sun phase with shadow-map occlusion, flashlight cone, analytic campfire glow, radial god rays |
| 3 | bloom | ½ … 1/16 internal | prefilter (soft knee, NaN guard), then 4-tap down and tent up |
| 4 | composite | internal | exact per-pixel fog transmittance (analytic) × depth-aware upsampled scatter radiance (mobile: analytic in-scatter computed right here), then bloom, ACES, sRGB, art_C grade, dither (Bayer 4/8 or blue noise), palette LUT, grain |
| 5 | CRT blit | canvas (default framebuffer) | nearest-neighbour upscale. Barrel curve, rounded corners, scanlines, edge-only RGB offset, vignette and flicker, all in one pass with ≤3 taps. The scanline period is never finer than 3 canvas px, so there's no moiré at HD-pixel res |

Internal resolution is the look's `internalHeight` with a matching width. For 9:16 that's 270×480 / 324×576 / 360×640 in refined, and 144×256 / 180×320 / 216×384 in classic. The mobile tier (432 refined / 256 classic nominal) snaps to an integer divisor of the canvas height.

## Looks: `refined` (default) vs `classic`

| | **refined** (default, HD-pixel, Blasphemous/Dead Cells density) | **classic** (round-1 / art_C density) |
|---|---|---|
| internal res (9:16) low / med / high | **270×480 / 324×576 / 360×640** | 144×256 / 180×320 / 216×384 |
| upscale on 1080×1920 | 4× / 3.33× / 3× | 7.5× / 6× / 5× |
| scene supersample | 1× on all tiers | 2×2 on high |
| volumetrics res | ⅓ / ⅓ / ½ of internal | ½ |
| bloom levels | 3 / 4 / 5 (same screen-space blur radius) | 2 / 3 / 4 |
| palette | `refined64` (64 colours) | `classic32` (art_C 32 + 3 fire) |
| dither | Bayer **8×8**, amount **0.032**, no noise mix | Bayer 4×4, amount 0.07, 15% noise mix |
| grain | 0.018 | 0.035 |
| flame texels | scale with internal res (about 18×29 at 576) | 10×16 |

**refined64** is built from ramps in `palette.js` (rebalanced in round 3 for night scenes):
- **8 deep blacks** (`#030406` to `#1e2532`, cold-tinted) so that unlit interiors get real steps instead of 2–3 flat entries
- 16-step cold value ramp from `#242b38` to snow
- 8 steel/slate blues
- 9 warm ash-greys/browns (lets lit wood read warm under a white flashlight)
- 5 rusts
- 5 sickly greens
- a 10-step fire ramp (ember red to white-hot)
- 2 ice teals

Quantisation in both looks goes through a 64³ nearest-colour LUT (a 512×512 RGBA8 texture built once per palette, roughly 0.1–0.3 s of JS at startup). The palette pass is one `texelFetch` regardless of palette size, so it's cheaper than round 1's 32-colour loop.

## Quality tiers (shared features; resolution comes from the look)

| feature | **mobile** (phones, iOS) | low | medium | high |
|---|---|---|---|---|
| refined internal res | 432 nominal, **snapped to an integer upscale** (390×844 → 196×422 = 2×) | 270×480 | 324×576 | 360×640 |
| sun shadow | **off (0 shadow passes)** | 512, PCF, 18 m, refreshed every 2nd frame | 1024, PCF soft, 28 m, every frame | 2048, PCF soft, 40 m, every frame |
| flashlight spot shadow | off | **off** (was 256 in round 3) | 256 | 512 (demo hero overrides 1024) |
| volumetric fog | **analytic, in the composite** (no target, no upsample): height fog, sun phase, flashlight cone (3 taps), campfire glow | raymarch 6 steps @ ⅓ res, no noise, no shadow | 12 steps, ash noise, shadowed shafts | 20 steps, ash noise, shadowed shafts |
| god rays (screen-space) | off | off | 16 taps | 32 taps |
| bloom levels (refined) | 2 | 3 | 4 | 5 |
| campfire glow lights | ≤2 | ≤2 | ≤4 | ≤4 |
| lit snow/ash particles | 450 | 600 | 1400 | 2600 |
| passes / frame | **6** | 9 | 11 + 2 shadow | 13 + 2 shadow |

`'phone'` is an alias for `'mobile'`. On the mobile tier, palette, dither, grade, toe, CRT, campfire flames/embers and lit particles are identical to the other tiers.

**`auto`**:
- **Every phone and iPad goes to `mobile` at boot**, before the first frame. Detection covers the iPhone/iPad/Android UA, iPadOS desktop-mode UA (MacIntel + maxTouchPoints > 1), `userAgentData.mobile`, an "Apple GPU" renderer string with touch, and small coarse-pointer touch screens.
- Software GL starts at low; Intel HD/UHD 2xx–6xx at medium; other desktops at high.
- On a phone, an explicit `low`/`medium`/`high` is clamped to `mobile` unless `allowHeavyOnMobile: true` is passed.

**Adaptive downgrade** (frame-time EMA above 1.12 × the 33.3 ms budget for about 60 frames) steps through this chain:
**high → medium → low → mobile → classic look on the same tier**.
- The step from refined to classic can be turned off with `lookFallback: false`.
- Stepping back up is off by default; `allowUpgrade: true` turns it on.

**Shadow scheduling:** the pipeline sets `renderer.shadowMap.autoUpdate = false` and refreshes on `T.shadow.updateEvery` frames, refitting and re-rendering together. The shadow matrix only changes with the map, so a skipped frame lags slightly but never misaligns. `shadowUpdateEvery: N` overrides it.

### GPU memory per tier (exact, from `getMemoryReport()`; refined look)

Targets have no MSAA, no stencil and no mipmaps; only the scene target has depth (a `DepthTexture`). Half-float scene/bloom/volume targets use 8 B/px; LDR fallback uses 4 B/px.

| tier @ canvas | internal | FBOs | scene+depth | post | bloom | volume | shadow maps | LUT | **owned** | + canvas (est.) |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile @ 390×844 (iPhone, DPR cap 1) | 196×422 | 5 | 969 KB | 323 KB | 363 KB | 0 | 0 | 257 KB | **1.87 MB** | 3.8 MB → 5.6 MB |
| mobile @ 1170×2532 (DPR 3) | 196×422 | 5 | same | | | | | | **1.87 MB** | 33.9 MB → 35.8 MB |
| mobile @ 1080×1920 | 270×480 | 5 | 1.52 MB | 506 KB | 569 KB | 0 | 0 | 257 KB | **2.79 MB** | |
| low @ 1080×1920 | 270×480 | 9 | 1.52 MB | 506 KB | 647 KB | 113 KB | 2 MB (512²) | 257 KB | **4.97 MB** | |
| medium @ 1080×1920 | 324×576 | 12 | 2.19 MB | 729 KB | 962 KB | 162 KB | 8 MB + 0.5 MB | 257 KB | **12.7 MB** | |
| high @ 1080×1920 | 360×640 | 14 | 2.70 MB | 900 KB | 1.17 MB | 0.45 MB | 32 MB + 2 MB | 257 KB | **39.4 MB** | |

Shadow maps are RGBA-packed depth plus a depth renderbuffer (8 B/texel), which is why 2048² costs 32 MB. Full per-profile numbers are in `screenshots/audit_gpu.json`.

### Startup cost
* **Palette LUT** is built on the GPU now: one 512×512 draw into an **R8** index target plus a 256×1 palette texture (257 KB, was 1 MB RGBA8). CPU submit time is 1.3–2.4 ms in SwiftShader. The old JS brute-force build (16.8M distance evals) took ~28 ms on desktop V8 and much longer on phones, and ran again on each look switch. Results match the CPU reference bit for bit except 2 exact float ties. A CPU builder (`computePaletteIndices`, block-pruned) remains as the fallback if the R8 FBO is incomplete.
* **Blue noise** is pre-baked (1 KB base64). It was generated at boot (~2M ops, ~11 ms in node); `generateBlueNoise()` reproduces it exactly.
* **Half-float check** (once, 4×4 targets): it requires the extension, then a complete RGBA16F+depth FBO, then writing 2.0, LINEAR-sampling it back into RGBA8 and reading ~128, all with `gl.getError() === 0`. Anything else means LDR. In LDR the scene target is **sRGB8_ALPHA8**, so 8 bits are spent perceptually (no dark banding), and the bloom threshold drops to 0.82.
* Shader programs compile on first use. `await pipeline.warmup()` precompiles them behind a loading screen (it uses `compileAsync` when available).

### Round-4 audit timings (SwiftShader, synthetic audit scene: 60 boxes + ground + 2 campfires; median ms with GPU sync)

Relative only; SwiftShader is CPU rendering. The mobile tier's real-device win is zero shadow passes, 5 FBOs and no volume target, and that barely shows on a 60-box scene.

| tier | refined @1080×1920 | classic @1080×1920 | refined @ iPhone 390×844 canvas |
|---|---|---|---|
| mobile | 29.8 | 17.4 | **14.3** (196×422) |
| low | 29.0 | 19.0 | – (clamped to mobile) |
| medium | 42.0 | 23.8 | – |
| high | 59.0 | 45.3 | – |

### Measured cost (headless Chromium + SwiftShader, i.e. CPU software GL)

Only the relative numbers mean anything here. Echo's scene, 1080×1920 canvas, full frame with a GPU sync (`screenshots/timings_looks.json`), all in ms:

| look / tier | internal | frame | shadows + scene | volume | bloom | composite | CRT blit* |
|---|---|---|---|---|---|---|---|
| classic low | 144×256 | 97 | 77 | 1.5 | 1.1 | 2.0 | 13 |
| classic medium | 180×320 | 137 | 109 | 4.2 | 2.1 | 3.2 | 16 |
| classic high | 216×384 (2× SS) | 346 | 306 | 8.0 | 2.8 | 4.8 | 14 |
| **refined low** | 270×480 | 183 | 139 | 2.1 | 3.3 | 7.0 | 15 |
| **refined medium** | 324×576 | 242 | 195 | 5.6 | 4.5 | 9.4 | 14 |
| **refined high** | 360×640 | 275 | 216 | 15.5 | 5.0 | 9.4 | 12 |
| BEFORE: Echo's renderer at native 540×960, no post (round 1) | | 357 | | | | | |

\*The CRT blit runs at canvas resolution (here 2 MP). On SwiftShader that's CPU work; on a GPU it's a trivial 1–3-tap pass.

How these compare:
- Refined costs about 1.8× classic at the same tier, because scene fill grows by (res ratio)².
- Refined high is cheaper than classic high because it drops the 2×2 supersample.
- The heaviest refined pass, the medium scene at 187k px, is still about 6% of an iPhone's native 3 MP fill.

## API

`createRenderPipeline(opts)` returns an object with these members:

| member | |
|---|---|
| `render(dt)` | renders one frame to the canvas. `dt` is in seconds and also drives adaptive quality |
| `resize(w?, h?)` | canvas size in device pixels (defaults to the drawing-buffer size). Reallocates targets **only if the internal size changes**, otherwise it just updates uniforms. Internal size never scales with DPR. Updates `camera.aspect` unless `updateCamera: false` |
| `setTier('auto'\|'mobile'\|'low'\|'medium'\|'high')`, `getTier()`, `onTierChange = fn` | phones are clamped to `mobile` unless `allowHeavyOnMobile` |
| `setCRT('off'\|'low'\|'med' \| {curve, scanline, chroma, vignette, corner, flicker})`, `getCRT()` | |
| `setFlashlight(bool \| {enabled, color, intensity, angle(deg), range, penumbra, offset:[x,y,z], pitch, scatter, sway, shadow, shadowMapSize})` | the flashlight follows the camera; the offset is in camera space. On/off changes intensity, never visibility (no shader recompiles). `shadow` overrides the tier per scene |
| `setSun({direction:[x,y,z] (toward sun), color, intensity, scatter, godRays, anisotropy})` | |
| `setFog({color, density, falloff, base, start, maxDist, noise, wind: Vector3})` | |
| `setGrade({contrast, saturation, brightness, tint, lift, gamma, crush, dither, grain, exposure, bloom, bloomThreshold, paletteMix, warmKeep})` | |
| `setLook('refined'\|'classic')`, `setStyle(...)` (alias), `getLook()` | switches resolution, palette, dither and grain together, then rebuilds the targets |
| `setPalette('refined64'\|'classic32'\|hexArray\|false)`, `getPalette()` | can be set independently of the look (e.g. refined res with classic32) |
| `setDither({pattern:'bayer8'\|'bayer4'\|'blue', amount, noiseMix})`, `getDither()` | amount 0–0.15. Refined uses 0.032 |
| `addCampfire(pos, {intensity, color, range, glow})` returns a handle; `removeCampfire(h)` | merged logs+stones (2 draws), 3 flame cards and embers. Lighting comes from a **fixed pool of 2 scene PointLights** that follow the nearest fires, so adding fires never recompiles shaders. Call `removeCampfire` when a level unloads |
| `addPointLight(light, {glow})`, `removePointLight(light)` | registers any light for volumetric glow and particle lighting |
| `hooks.beforeCRT(renderer, postRT, {width,height})` | draws a HUD at internal res. It gets curved with the screen |
| `hooks.afterCRT(renderer, {width,height})` | draws to the canvas after the CRT pass, so it stays flat and crisp |
| `stats` | `{tier, look, palette, internal, frameMs, gpuish, calls, triangles, halfFloat, passes, passCount, shadowPasses, targetBuilds}` |
| `getMemoryReport()` | exact bytes per target, shadow map and LUT, plus FBO count and a canvas estimate |
| `caps` | `{halfFloatVerified, hdrReason, mobile, ios, lutMs, lutPath, glRenderer, …}` |
| `warmup()` | async; precompiles shaders and renders one frame (call it behind a loading screen) |
| `profile = true` | per-pass timings. This adds GPU syncs, so use it in dev only |
| `sun`, `flashlight`, `particles`, `internalSize`, `adaptive` | |
| `dispose()` | frees every GPU resource it created; restores `scene.fog`, `renderer.shadowMap` settings, `sun.castShadow`/`mapSize`; idempotent; `renderer.info.memory` returns to baseline (see INTEGRATION §0) |

Other options: `look`/`style` ('refined'), `lookFallback` (true), `targetFps` (30), `adaptive` (true), `allowUpgrade` (false), `takeOverFog` (true), `particles` (true), `fog`, `grade`, `palette`, `flashlight` (true), `flashlightOptions`, `particleOptions`, `forceLDR` (tests the 8-bit fallback), `mobile` (force true/false; default is detected), `allowHeavyOnMobile` (false), `shadowUpdateEvery` (tier default).

## Darks / night tuning (round 3)

The art_C grade (contrast 1.22 + lift) clipped every sRGB value below about 0.066 to black. That's fine for a bright day and fatal at night. The refined look now has:
- **Shadow toe** (`grade.toe`, 1 in refined, 0 in classic): `c = mix(c, max(c, lift + c0*0.38), toe)` keeps a gentle linear slope through the bottom of the curve, and the low crush edge goes from 0.08 to 0. Daytime shots are practically unchanged; dark gun and wall detail survives.
- **Dark-adaptive dither and grain**: dither amplitude is scaled to 45% below luma 0.02 and ramps to 100% by 0.22, and grain fades out below 0.04 to 0.25. Blacks therefore read as quiet steps rather than fizzing noise.
- **The 8 deep-black palette entries** above.
- **Particles are occluded by the sun shadow map** (vertex fetch), so moonlight only lights motes near the window. Inside the house, dust shows up only in the flashlight beam.
- **Flashlight shadow on medium/high** (256² / 512²; the dark-house demo sets 1024² on high). Round 3 added it to low; the round-4 iPhone audit removed it there because it costs a second full-scene depth pass. Turn it on per scene with `setFlashlight({shadow: true, shadowMapSize})`.
- `particleOptions: {count, box, ashRatio, fall, wind, centerAhead}` lets an interior use slow dust instead of snowfall.

The classic look keeps toe 0 on purpose (the original art_C crush), so its darks go flat and Bayer-4 noisy. Compare `darkhouse_classic_medium.png` with `darkhouse_refined_medium.png`.

## Demos and tests

* `render/demo/existing.html?style=C&look=refined|classic&tier=medium&crt=low[&mood=dusk][&mode=before][&freeze=1][&w=1080&h=1920]` loads **Echo's unmodified `js/main.js` scene** and applies the pipeline at runtime.
* `render/demo/darkhouse.html?shot=main|hero&look=refined|classic&tier=…&crt=low` is an abandoned house at night: near-black ambient, faint moonlit window with snow, broken furniture, dust motes, and the flashlight as the key light. `python3 render/tools/capture_darkhouse.py name.png:shot:tier:look[:crt] …` captures it.
* `render/demo/index.html?tier=…&crt=…&mood=dusk` is a synthetic snowy-ruins scene with no assets.
* `render/demo/audit.html` + `python3 render/tools/audit_gpu.py` is the **GPU/RAM audit**. It runs desktop, iPhone UA (390×844 @ DPR 3, canvas capped to 1), iPhone at full DPR 3, iPadOS masked UA, forced LDR and no-float-extension profiles. It checks texture/geometry growth across resize/setTier/setLook/setCRT/setPalette/campfire/flashlight cycles, the return to baseline after dispose (twice), `gl.getError()`, console errors and shader-program stability, and it measures LUT time, VRAM, passes and draw calls per tier. Output: `screenshots/audit_gpu.json`. The exit code is non-zero on any failure.
* `python3 render/tools/capture_mobile.py` writes the mobile-vs-other-tier screenshots (`mobile_*.png`, `mobile_compare_sheet.png`, iPhone-native `mobile_iphone_native_*_x3.png`).
* Keys: `0/1/2/3` switch tier (0 = mobile), `L` toggles the look, `C` cycles CRT, `F` toggles the flashlight.
* `python3 render/tools/capture.py all --bench` writes screenshots and `timings.json` into `render/screenshots/`. `python3 render/tools/profile.py` writes the per-pass timings. `python3 render/tools/capture_looks.py` writes the classic-vs-refined shots, `compare_classic_vs_refined.png`, `zoom_pixel_detail_classic_vs_refined.png` and `timings_looks.json`.
* Note: the round-1 `after_*.png` / `compare_before_after.png` were captured with the classic look, before refined existed.

## Nevada Revision 2 Seasonal Presets (`environments.js`)
Use `pipeline.setEnvironment(id)` (or `environment` option in `createRenderPipeline`) with `'summer'` (Ch 1–2), `'autumn'` (Ch 3–4), `'late_fall'` (Ch 5–7), or `'fallout_winter'` (Ch 8–10), or pass a chapter number/id (`1..10`, `'ch01'..'ch10'`). All 4 acts share the exact same mobile GPU/VRAM budget (`1,913.7 KB` owned on iPhone 390×844, 6 passes, 0 shadow passes, 0 leaks across 16 switches). Preview in `render/demo/existing.html?env=summer|autumn|late_fall|fallout_winter` (press `E` to cycle) or regenerate comparison sheets with `python3 render/tools/capture_nevada.py`. See `INTEGRATION.md` §0a for full API and Prime integration notes.
