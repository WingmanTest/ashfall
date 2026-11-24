# Integrating `render/` into Echo's game: proposed changes (not applied)

I did not modify any file outside `render/`. `render/demo/existing.html` does all of the steps below at **runtime**
to prove they work. To make them permanent, apply them in `js/main.js` / `index.html`:

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
  tier: 'auto',          // auto-detect, then adaptive downgrade (refined → classic as the last resort)
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
