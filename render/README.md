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
| 0 | sun shadow map (+ flashlight spot shadow, all tiers) | 512 / 1024 / 2048 | fitted to the view frustum each frame and snapped to whole texels |
| 1 | scene | internal × sceneScale | half-float target when supported, plus a depth texture. `scene.fog` is turned off (the volume pass replaces it) |
| 2 | volumetric in-scatter + god rays | ⅓–½ internal | raymarched height fog. Blue-noise jitter plus a golden-ratio temporal offset per frame. Falling-ash noise, sun phase with shadow-map occlusion, flashlight cone, analytic campfire glow, radial god rays |
| 3 | bloom | ½ … 1/16 internal | prefilter (soft knee, NaN guard), then 4-tap down and tent up |
| 4 | composite | internal | exact per-pixel fog transmittance (analytic) × depth-aware upsampled scatter radiance, then bloom, ACES, sRGB, art_C grade, dither (Bayer 4/8 or blue noise), palette LUT, grain |
| 5 | CRT blit | canvas | nearest-neighbour upscale. Barrel curve, rounded corners, scanlines, edge-only RGB offset, vignette and flicker, all in one pass with ≤3 taps. The scanline period is never finer than 3 canvas px, so there's no moiré at HD-pixel res |

Internal resolution is the look's `internalHeight` with a matching width. For 9:16 that's 270×480 / 324×576 / 360×640 in refined, and 144×256 / 180×320 / 216×384 in classic.

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

| feature | low | medium | high |
|---|---|---|---|
| sun shadow | 512, PCF, 18 m | 1024, PCF soft, 28 m | 2048, PCF soft, 40 m |
| flashlight spot shadow | 256 | 256 | 512 (demo hero overrides 1024) |
| volumetric fog | 6 steps, no noise, no shadow | 12 steps, ash noise, shadowed shafts | 20 steps, ash noise, shadowed shafts |
| god rays (screen-space) | off | 16 taps | 32 taps |
| flashlight cone scatter, campfire glow | yes (≤2 lights) | yes (≤4) | yes (≤4) |
| lit snow/ash particles | 600 | 1400 | 2600 |

**`auto`**: software GL starts at low. iOS starts at medium on 6+ cores with ≥3 GB, otherwise low. Android starts at low, or medium on Adreno 640+ / Mali-G7x. Desktop starts at high.

**Adaptive downgrade** (frame-time EMA above 1.12 × the 33.3 ms budget for about 60 frames) steps through this chain:
**refined/high → refined/medium → refined/low → classic/medium → classic/low**.
- The step from refined to classic can be turned off with `lookFallback: false`.
- Stepping back up is off by default; `allowUpgrade: true` turns it on.

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
| `resize(w?, h?)` | rebuilds the targets. Defaults to the renderer's drawing-buffer size. Updates `camera.aspect` unless `updateCamera: false` |
| `setTier('auto'\|'low'\|'medium'\|'high')`, `getTier()`, `onTierChange = fn` | |
| `setCRT('off'\|'low'\|'med' \| {curve, scanline, chroma, vignette, corner, flicker})`, `getCRT()` | |
| `setFlashlight(bool \| {enabled, color, intensity, angle(deg), range, penumbra, offset:[x,y,z], pitch, scatter, sway})` | the flashlight follows the camera; the offset is in camera space |
| `setSun({direction:[x,y,z] (toward sun), color, intensity, scatter, godRays, anisotropy})` | |
| `setFog({color, density, falloff, base, start, maxDist, noise, wind: Vector3})` | |
| `setGrade({contrast, saturation, brightness, tint, lift, gamma, crush, dither, grain, exposure, bloom, bloomThreshold, paletteMix, warmKeep})` | |
| `setLook('refined'\|'classic')`, `setStyle(...)` (alias), `getLook()` | switches resolution, palette, dither and grain together, then rebuilds the targets |
| `setPalette('refined64'\|'classic32'\|hexArray\|false)`, `getPalette()` | can be set independently of the look (e.g. refined res with classic32) |
| `setDither({pattern:'bayer8'\|'bayer4'\|'blue', amount, noiseMix})`, `getDither()` | amount 0–0.15. Refined uses 0.032 |
| `addCampfire(pos, {intensity, color, range, glow})` returns a handle; `removeCampfire(h)` | adds a PointLight, a pixel-flame billboard and embers |
| `addPointLight(light, {glow})`, `removePointLight(light)` | registers any light for volumetric glow and particle lighting |
| `hooks.beforeCRT(renderer, postRT, {width,height})` | draws a HUD at internal res. It gets curved with the screen |
| `hooks.afterCRT(renderer, {width,height})` | draws to the canvas after the CRT pass, so it stays flat and crisp |
| `stats` | `{tier, look, palette, internal, frameMs, gpuish, calls, triangles, halfFloat, passes}` |
| `profile = true` | per-pass timings. This adds GPU syncs, so use it in dev only |
| `sun`, `flashlight`, `particles`, `internalSize`, `adaptive` | |
| `dispose()` | frees everything and restores `scene.fog` |

Other options: `look`/`style` ('refined'), `lookFallback` (true), `targetFps` (30), `adaptive` (true), `allowUpgrade` (false), `takeOverFog` (true), `particles` (true), `fog`, `grade`, `palette`, `flashlight` (true), `flashlightOptions`, `particleOptions`, `forceLDR` (tests the 8-bit fallback).

## Darks / night tuning (round 3)

The art_C grade (contrast 1.22 + lift) clipped every sRGB value below about 0.066 to black. That's fine for a bright day and fatal at night. The refined look now has:
- **Shadow toe** (`grade.toe`, 1 in refined, 0 in classic): `c = mix(c, max(c, lift + c0*0.38), toe)` keeps a gentle linear slope through the bottom of the curve, and the low crush edge goes from 0.08 to 0. Daytime shots are practically unchanged; dark gun and wall detail survives.
- **Dark-adaptive dither and grain**: dither amplitude is scaled to 45% below luma 0.02 and ramps to 100% by 0.22, and grain fades out below 0.04 to 0.25. Blacks therefore read as quiet steps rather than fizzing noise.
- **The 8 deep-black palette entries** above.
- **Particles are occluded by the sun shadow map** (vertex fetch), so moonlight only lights motes near the window. Inside the house, dust shows up only in the flashlight beam.
- **Flashlight shadow on every tier** (low and medium 256², high 512²; the dark-house demo sets 1024² on high). It can be overridden with `setFlashlight({shadowMapSize})`.
- `particleOptions: {count, box, ashRatio, fall, wind, centerAhead}` lets an interior use slow dust instead of snowfall.

The classic look keeps toe 0 on purpose (the original art_C crush), so its darks go flat and Bayer-4 noisy. Compare `darkhouse_classic_medium.png` with `darkhouse_refined_medium.png`.

## Demos and tests

* `render/demo/existing.html?style=C&look=refined|classic&tier=medium&crt=low[&mood=dusk][&mode=before][&freeze=1][&w=1080&h=1920]` loads **Echo's unmodified `js/main.js` scene** and applies the pipeline at runtime.
* `render/demo/darkhouse.html?shot=main|hero&look=refined|classic&tier=…&crt=low` is an abandoned house at night: near-black ambient, faint moonlit window with snow, broken furniture, dust motes, and the flashlight as the key light. `python3 render/tools/capture_darkhouse.py name.png:shot:tier:look[:crt] …` captures it.
* `render/demo/index.html?tier=…&crt=…&mood=dusk` is a synthetic snowy-ruins scene with no assets.
* Keys: `1/2/3` switch tier, `L` toggles the look, `C` cycles CRT, `F` toggles the flashlight.
* `python3 render/tools/capture.py all --bench` writes screenshots and `timings.json` into `render/screenshots/`. `python3 render/tools/profile.py` writes the per-pass timings. `python3 render/tools/capture_looks.py` writes the classic-vs-refined shots, `compare_classic_vs_refined.png`, `zoom_pixel_detail_classic_vs_refined.png` and `timings_looks.json`.
* Note: the round-1 `after_*.png` / `compare_before_after.png` were captured with the classic look, before refined existed.
