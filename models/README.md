# Ashfall models: Wave 1 style prototypes

These are low-poly models with flat-shaded facets, built to match the user's first reference image. Every model is generated from Python, so you can rebuild them any time and get the same result.

```
models/
  characters/  watch_militia.glb  braith_summer.glb  braith_mcu2p_mask.glb
  creatures/   wraith_malinois.glb
  buildings/   sparks_tract_house.glb
  nature/      sagebrush_clump.glb
  props/       charcoal_grill.glb  metal_locker.glb
  previews/    braith_with_mask_preview.glb  sheet_*.png  hero_lineup*.png
  manifest.json   catalog: tris, verts, bytes, bounds, pivot, chapters, replaces, notes
  registry.js     ES module for the engine
  tools/          glb_builder.py, humanoid.py, characters.py, creatures.py, world.py, textures.py,
                  build_prototypes.py, turntable.html, render_turntables.py, debug_view.py
```

Rebuild everything and re-verify:
```
python3 models/tools/build_prototypes.py      # writes every .glb + manifest.json, checks budgets and winding
python3 models/tools/render_turntables.py     # Playwright WebKit contact sheets; exits 1 on any console/WebGL error
```

## Conventions (every asset)
| Rule | Value |
|---|---|
| Up / forward | +Y up, model faces **+Z**. A character's right hand is at -X |
| Units | meters, real-world scale (people about 1.78 m, Wraith 0.62 m at the shoulder) |
| Pivot | centered on the ground, `min y = 0`. One exception: the MCU-2/P mask uses head-local coordinates (see below) |
| Shading | non-indexed triangles with one normal per face (crisp facets). `registry.js` also sets `flatShading = true` |
| Winding | outward-facing and counter-clockwise. The builder checks it on every closed part (each directed edge may be used once) and reports `inside-out 0` |
| Materials | matte PBR, `roughness 0.88–0.94`, `metalness 0.02–0.18`. One exception: the MCU-2/P lens (`roughness 0.40`) is slightly glossy on purpose |
| Textures | embedded 64 or 128 px palettized PNGs, `NEAREST` mag and min filtering, no mipmaps, repeat wrap |

## Triangle budgets (mobile WebGL)
| Model | Budget | Actual |
|---|---|---|
| watch_militia | 550–950 | 947 |
| braith_summer | 600–950 | 940 |
| braith_mcu2p_mask | 240–480 | 401 |
| wraith_malinois | 550–900 | 663 |
| sparks_tract_house | 450–950 | 718 |
| sagebrush_clump | 160–340 | 324 |
| charcoal_grill | 180–340 | 292 |
| metal_locker | 160–300 | 272 |

The whole hero lineup scene (house plus 7 props and actors) comes to about 4.5k triangles.

## Engine integration (`registry.js`)
`registry.js` imports `three` through the game's existing import map (`./vendor/three/three.module.js`, r170). It works with `three/addons/loaders/GLTFLoader.js` as-is.

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_CATALOG, loadModel, applyRetroMaterialTuning, fitToGround, attachMask } from './models/registry.js';

const loader = new GLTFLoader();
const braith = await loadModel('braith_summer', loader);  // loaded once, cloned on every call, already tuned
braith.position.set(x, 0, z);
scene.add(braith);

const house = await loadModel('sparks_tract_house', loader);
fitToGround(house);                    // snaps min y to 0; fitToGround(obj, 1.78) also rescales to a height

if (flags.has_gas_mask) await attachMask(braith, loader);  // parents the mask at MODEL_CATALOG.braith_mcu2p_mask.anchor
```

`applyRetroMaterialTuning(root, opts)` is safe on any glTF, including older assets. It does four things:
- enforces `NearestFilter` and `generateMipmaps = false`
- sets `flatShading = true`
- clamps roughness and metalness (it skips materials named `lens`)
- sets `castShadow` and `receiveShadow`

**Mask attachment.** `braith_mcu2p_mask.glb` is built in head-local space. Its origin is the center of the chin plane, at `[0, 1.535, 0.008]` on `braith_summer`. If you have skinned or animated heads later, parent the mask to the head bone at that offset. The ball cap is removed when the mask is worn (see `previews/braith_with_mask_preview.glb`, node `mcu2p_mask`).

**Searchables.** `charcoal_grill` and `metal_locker` have `searchable: true` in the catalog, so they can replace the primitive box stacks.

**Note for @Prime.** Nothing in `js/` has been changed yet. Wiring these models in should happen in a separate pass.

## Adding a model
1. Write `build_<thing>()` with `MeshBuilder`. Use `add_loft` / `add_tube` for organic shapes (5- to 8-sided rings), `add_shell` / `add_band` for clothing layers, and `add_prism` / `add_box` for hard surfaces and buildings.
2. Add a `SPECS` tuple: `(id, builder, path, category, (min, max) tris, ground, chapters, replaces, notes)`.
3. Run `build_prototypes.py` and `render_turntables.py`, then look at the PNGs before shipping.

## Roadmap
- **Wave 1 (Ch1–3 & heroes):** these prototypes, then the named Sparks/Reno survivors, storefronts, cottonwoods, vehicle palettes, and more searchables (cabinets, coolers, woodpiles).
- **Wave 2 (Ch4–7 & vehicles):** the remaining cast and traders, Compact and Ironwood uniforms, the convoy truck, `gpu_cart`, fuel bowser, dirt bike, freight cars, and autumn foliage.
- **Wave 3 (Ch7b–10, horror & winter):** custom Tallmen, Hollow humans and animals, sick-human Husks (retiring the zombie mesh), winter layers, sleds, and MRAP/Bradley wrecks.
