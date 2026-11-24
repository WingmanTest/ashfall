# Ashfall models: Wave 1 style prototypes + Wave 2 cast

These are low-poly models with flat-shaded facets, built to match the user's first reference image. Every model is generated from Python, so you can rebuild them any time and get the same result.

```
models/
  characters/  watch_militia.glb  braith_summer.glb  braith_mcu2p_mask.glb
               Wave 2 main cast: carly lolo gil kit ross avila augie ames wes walt roz ander ruiz reyne (.glb)
               Wave 2 archetypes: civ_summer_a civ_summer_b civ_elder trader_wanderer scavenger_runner guard_trooper (.glb)
  creatures/   wraith_malinois.glb
  buildings/   sparks_tract_house.glb
  nature/      sagebrush_clump.glb
  props/       charcoal_grill.glb  metal_locker.glb
  previews/    braith_with_mask_preview.glb  sheet_*.png  hero_lineup*.png
  manifest.json   catalog: tris, verts, bytes, bounds, pivot, chapters, replaces, notes
  registry.js     ES module for the engine
  tools/          glb_builder.py, humanoid.py, characters.py, creatures.py, world.py, textures.py,
                  build_prototypes.py, turntable.html, render_turntables.py, debug_view.py,
                  npc_cast.py (Wave 2 body presets + modular parts), build_npcs.py, build_all.py, render_npcs.py
```

Rebuild everything and re-verify:
```
python3 models/tools/build_all.py             # Wave 1 + Wave 2 .glb + manifest.json (same as build_prototypes.py)
python3 models/tools/render_turntables.py     # Wave 1 WebKit contact sheets; exits 1 on any console/WebGL error
python3 models/tools/render_npcs.py           # Wave 2 sheets + lineup + registry self-test; exits 1 on any error
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
| braith_summer | 650–1050 | 1024 |
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


## Wave 2: main story cast + reusable archetypes
All 20 are built by `tools/build_npcs.py` from `tools/npc_cast.py`: the unchanged Wave 1 `build_body` rig plus a
body preset (height, shoulder/waist/hip/depth, bust, belly, stoop, head scale) applied as a smooth
orientation-preserving warp, and modular parts (hair: ponytail / bun / bob / fringe; headgear: ball cap, cowboy hat,
boonie, beanie, patrol cap, beret, helmet + goggles, hard hat, headphones, hood; face: beards, glasses; layers:
open jackets, coat skirts, aprons, plate carriers, collars; props: radios, lanyards, stethoscope, holsters,
backpacks, satchels, clipboard, wrench, rifle, cane). Budget 700–1,050 tris each, every part `inside-out 0`,
no textures (flat matte colours only), so one model is roughly 11–19 draw calls until the palette-atlas pass.

| id (npcs.json) | Name | Tris | Height (incl. headgear) | Size | Body preset |
|---|---|---|---|---|---|
| `carly` | Carly Redmond | 842 | 1.67 m | 68.2 KB | female_slender |
| `lolo` | Dolores 'Lolo' Arrieta | 790 | 1.59 m | 64.5 KB | female_elder |
| `gil` | Gil Shumway | 872 | 1.78 m | 70.9 KB | male_stocky |
| `kit` | Kit Darrow | 930 | 1.70 m | 75.0 KB | female_athletic |
| `ross` | Ross Pearce | 1039 | 1.89 m | 85.1 KB | male_broad |
| `avila` | Capt. Lorna Avila | 782 | 1.73 m | 65.8 KB | female_athletic |
| `augie` | Augie Bell | 942 | 1.71 m | 75.2 KB | male_elder_slight |
| `ames` | Dr. Samuel Ames | 996 | 1.82 m | 80.2 KB | male_tall |
| `wes` | Wes Pearce | 786 | 1.77 m | 62.4 KB | male_lean_youth |
| `walt` | Walt Okada | 918 | 1.71 m | 75.4 KB | custom |
| `roz` | Roz Tafoya | 816 | 1.68 m | 66.9 KB | female_sturdy |
| `ander` | Ander Etcheverry | 1030 | 1.84 m | 83.3 KB | male_broad |
| `ruiz` | Sgt. Nadia Ruiz | 904 | 1.74 m | 75.6 KB | female_athletic |
| `reyne` | Dr. Hollis Reyne | 1028 | 1.71 m | 83.1 KB | female_slender |

| Archetype | Use | Tris | Height | Roles |
|---|---|---|---|---|
| `civ_summer_a` | Sparks neighbor (summer, A) | 748 | 1.79 m | civilian, neighbor, ambient |
| `civ_summer_b` | Sparks neighbor (summer, B) | 958 | 1.64 m | civilian, neighbor, ambient |
| `civ_elder` | Older Nevada resident | 752 | 1.68 m | elder, civilian, ambient |
| `trader_wanderer` | Nevada trader / prospector | 1020 | 1.82 m | trader, merchant, wanderer |
| `scavenger_runner` | Scavenger / runner | 904 | 1.75 m | scavenger, runner, youth |
| `guard_trooper` | Patrol / checkpoint guard | 923 | 1.83 m | guard, soldier, deputy, checkpoint |

Preview sheets: `previews/sheet_npcs_ch1_2.png`, `sheet_npcs_cast_a.png`, `sheet_npcs_cast_b.png`,
`sheet_archetypes.png`, `lineup_all_14_npcs.png`.

### Integration for @Prime (`NPC_MODEL_MAP` / `ARCHETYPE_POOL`)
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NPC_MODEL_MAP, ARCHETYPE_POOL, resolveNpcModelId, loadNpcModel, loadModel, MODEL_CATALOG }
  from './models/registry.js';

const loader = new GLTFLoader();

// 1) Main story NPCs: exact story/npcs.json ids (plus 'braith' and 'wraith')
const carly = await loadModel(NPC_MODEL_MAP['carly'], loader);    // == loadModel('carly', loader)

// 2) Anyone at all (main cast, minor_characters, ambient_npcs, traders, crowds, guards):
//    deterministic, so the same id always gets the same body; crowds hash across the pool -> no clone look
const id = resolveNpcModelId(npc.id, npc.role);                   // 'amb_ruth' -> 'civ_elder', ('crowd_7','guard') -> 'guard_trooper' | 'watch_militia'
const body = await loadNpcModel(npc.id, loader, npc.role);        // resolve + load + userData.npcId
body.position.set(x, 0, z);                                         // pivot is on the ground, faces +Z
scene.add(body);

// Collider hint per model:
const { radius, height } = MODEL_CATALOG[id].collider;
```
Notes:
- `NPC_MODEL_MAP.wraith` points at the dog (`creature`, 0.87 m tall), not a humanoid; skip humanoid-only logic for it.
- `SECONDARY_NPC_MODEL_MAP` pre-assigns the named minor / ambient / trader ids from `npcs.json`
  (e.g. `pruitt` → civ_elder, `deshawn` → scavenger_runner, `cpl_haas` → guard_trooper, `trader_*` → trader_wanderer).
- Role strings are fuzzy-matched (`/guard|deputy|checkpoint|ironwood|.../` → guard pool, `/trader|pawn|.../` → trader, etc.);
  unknown roles fall back to the `ambient` pool. Pass a pool key (`'guard'`, `'trader'`, `'civilian'` …) to be exact.
- Models are static (no skeleton yet). Heights are real: Lolo 1.59 m … Ross 1.89 m with hat. Don't `fitToGround(obj, 1.78)` them
  or the height differences are lost; `fitToGround(obj)` (no height) is fine.
- Canon checks that changed the brief: **Kit is a young woman** (story: "a girl", "her voice"), **Roz** reads as a woman
  (canon gives no pronoun; Silver Spur head chef → chef's apron + holstered pistol), **Ames** works at
  Truckee Meadows General, **Ander** (Basque) wears a black txapela/beret to separate him from Ross's cattleman hat.
- Progressive wear (dirt / ash / torn variants for Acts II–III) is planned as recoloured material sets on the same meshes.
