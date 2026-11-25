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
                  npc_cast.py (Wave 2 body presets + modular parts), build_npcs.py, build_all.py, render_npcs.py,
                  rig.py (skeletons, skin weights, palette atlas), anim.py (procedural clips), build_rigged.py,
                  anim_viewer.html + render_anim.py (WebKit animation previews, draw-call A/B)
```

Rebuild everything and re-verify:
```
python3 models/tools/build_all.py             # Wave 1 + Wave 2 .glb + manifest.json (same as build_prototypes.py)
python3 models/tools/render_turntables.py     # Wave 1 WebKit contact sheets; exits 1 on any console/WebGL error
python3 models/tools/render_npcs.py           # Wave 2 sheets + lineup + registry self-test; exits 1 on any error
python3 models/tools/render_anim.py           # rigged models: inspect + anim_*.png/gif + draw-call test; exits 1 on any error
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


## Animation: skeletons, looping clips, 1 draw call per character

The 21 NPC humans (`watch_militia`, the 14 main cast, the 6 archetypes) and `wraith_malinois` now ship **skinned and animated**. Each one is **1 SkinnedMesh, 1 primitive, 1 `MeshStandardMaterial`, so 1 draw call**. Its old 11–19 solid materials are collapsed into a 64×64 palette atlas (8 px swatches, `NEAREST`, no mipmaps), and a matching metallic-roughness atlas keeps every swatch's roughness and metalness. File names, triangle counts, the bind pose, y = 0 pivot, +Z forward and the colours are unchanged: an A/B render against the pre-rig files differs by about 0.1 / 765 per pixel on average. `braith_summer`, `braith_mcu2p_mask` and every prop or building are untouched and byte-identical.

| | Humans (21) | Wraith |
|---|---|---|
| Bones | 18: `root > hips > spine > chest > neck > head`, `chest > upperarm_L/R > forearm_L/R > hand_L/R`, `hips > thigh_L/R > shin_L/R > foot_L/R` | 23: `root > pelvis > spine > chest > neck > head > ear_L/R`, `pelvis > tail_1..3`, `chest > fl_upper/fl_lower/fl_paw_L/R`, `pelvis > hl_thigh/hl_shin/hl_paw_L/R` |
| Clips | `idle` (4 s), `walk`; plus `run` on watch_militia, guard_trooper, scavenger_runner, kit, ruiz | `idle` (3 s), `walk` (0.56 s), `trot` (0.40 s), `sit` (3 s looping hold) |
| Speeds (m/s at timeScale 1) | walk about 0.89–0.97 (elders walt / augie / civ_elder 0.48, slower older gait, only civ_elder slightly stooped; lolo 0.56, short steps), run about 2.1–2.25 | walk 0.98, trot 2.07 |

`_L` is the character's **left** (+X). Every bone's rest rotation is identity, so bone axes are model axes. Exact per-model values are in `manifest.json` (`clips`, `bones`, `walkSpeed` / `runSpeed` / `trotSpeed`, `clipDurations`, `drawCalls: 1`, `rigged: true`) and in `registry.js` `ANIMATIONS`.

**Root motion: none.** Clips play in place. Bone `root` never moves, and `hips` / `pelvis` only carry the vertical bob. Move the object along its path yourself and set `timeScale = pathSpeed / walkSpeed` (`clipTimeScale()`), so planted feet don't slide. Every track's first key equals its last key, so `LoopRepeat` has no pop. Every clip keys every bone, so cross-fades blend cleanly.

**Props.** Held gear is rigid-skinned to the hand: rifles, the cane, wrench, clipboard, med bag, hand mic. Slung gear is rigid to the chest: backpacks, Ross's back rifle, Walt's tube case, the radio pack. Belts, holsters and pouches stay on the hips. Coats and aprons follow both thighs partway. The cane arm automatically bends its elbow so the tip never goes into the floor.

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadNpcModel, playClip, clipTimeScale, getClips, ANIMATIONS } from './models/registry.js';

const loader = new GLTFLoader();
const npc = await loadNpcModel('carly', loader);      // skinned-safe clone: its own skeleton per instance
scene.add(npc);
const mixer = new THREE.AnimationMixer(npc);           // one mixer per instance
playClip(mixer, npc, 'idle', { offset: Math.random() * 4 });   // random offset desyncs crowds

// path follower: switch clips with cross-fades and match ground speed
function setMoving(speed) {                            // m/s along the path
  if (speed < 0.05) return playClip(mixer, npc, 'idle', { fade: 0.25 });
  const clip = speed > 1.6 && getClips('carly').includes('run') ? 'run' : 'walk';
  const a = playClip(mixer, npc, clip, { fade: clip === 'run' ? 0.2 : 0.25 });
  a.timeScale = clipTimeScale('carly', clip, speed);   // feet stay planted
}
// every frame: mixer.update(dt); npc.position.addScaledVector(dir, speed * dt); npc.rotation.y = Math.atan2(dir.x, dir.z);
```

Gotchas for the engine:
- **Clone with `cloneModel()` / `loadModel()`.** Don't use `Object3D.clone()` on a rigged model: a plain clone keeps driving the source skeleton. `SkeletonUtils` isn't vendored, so `registry.cloneModel()` carries the same algorithm. `loadModel` and `loadNpcModel` already use it, and `.animations` comes along on every clone.
- Use one `AnimationMixer` per instance and call `mixer.update(dt)` every frame. You can skip or throttle mixers for off-screen or distant NPCs (they hold their last pose).
- Recommended cross-fades: idle↔walk 0.25 s, walk↔run 0.2 s, walk↔trot 0.2 s, anything→sit 0.4 s.
- Facing is +Z, so `rotation.y = atan2(dir.x, dir.z)`.
- Skinning uses at most 3 influences per vertex (weights stored as normalized `UNSIGNED_BYTE`). The skinned mesh's bounding sphere comes from the pose on first render, and in-place clips stay inside it, so frustum culling is safe.
- The atlas material keeps `roughnessFactor 0.94` and `metallicFactor 0.18` (the clamp maxima), with per-swatch values in the MR texture, so `applyRetroMaterialTuning` leaves it unchanged.
- To attach something to a bone, use `npc.getObjectByName('hand_R')` (or `head`, `chest`, ...).

### Posture pass (2026-11-24)
The 21 humans now have an upright bind pose. `tools/build_rigged.py:upright_bind` solves it for each character:
- trunk (hips to neck) at -1° (+1.5° for civ_elder, +0.5° for walt and augie)
- head moved back so the skull sits about 1.2 cm ahead of the shoulder joints
- head lifted 2 cm along the neck
- upper-arm joints dropped 1.2 cm and moved 0.6 cm back (not on the arm holding a cane)
- head and upper arms counter-rotated so the face stays level and the arms hang the same way as before

The sculpt stoop was cut back: walt 0.075→0.020, civ_elder 0.06→0.035, augie and male_elder_slight 0.05→0.015, lolo and female_elder 0.03→0, gil and male_stocky 0.012→0.

Gait lean is now 2° for walk and walk_short, 3° for walk_elder, 4.5° for walk_elder_stoop (civ_elder only) and 5° for run. The neck and head cancel the whole lean, so the eyes stay level, and arm swing is measured from vertical.

Characters are about 2 cm taller (walt about 4 cm). Clip names, clip lengths, speeds, tri counts and the atlas are unchanged. To compare, render `python3 tools/render_anim.py posture` (output: `previews/posture_before_after.png`). The pre-fix files are in `/workspace/ashfall_rig_backup/pre_posture/`.


## Environment set

Ground detail + vegetation for every chapter, category `env` in `manifest.json` (`man.env`). Source: `tools/env.py`
(run by `tools/build_all.py`); previews `previews/env_sheet.png` and `previews/env_scene_winter.png`
(`python3 tools/render_env.py all`: headless WebKit, 0 console/page/WebGL errors).

**Rules (every env GLB):** 1 mesh / 1 primitive / 1 material / **1 draw call**. You can use it directly as an `InstancedMesh`. Ground pivot is min y = 0
(the decal quad is at y = +0.02). Units are meters, +Z is forward, +Y is up. Faces are flat-shaded and non-indexed. Textures are NEAREST, no mipmaps, SRGB, flipY = false.
Roughness is 0.9 and metalness 0.02. Vegetation and tufts share **one** 256 px atlas, `env/textures/env_atlas.png`, as an external uri, so it is uploaded once.
Ground pieces use their tiling texture, and decals use `env/textures/env_decal_atlas.png`. Alpha uses alphaTest 0.5 and is never blended.

**Ids:** Cartographer's provisional ids from `levels/ground_previews/asset_map.json` are the final ids: `remap[id].final == id`
for every entry. The list is also in `man.env.provisionalIds`. Extras are `env_tuft_cards`, `env_sidewalk_curb_corner`,
`env_road_tile_4m`, `env_road_2lane_8x4` and the `*_ash` / overlay textures.

### Models (`env/*.glb`, plus the re-exported `nature/sagebrush_clump.glb`)

| id | kind | tris | size W × H × D (m) | bounding r | collider (manifest `collider`) | variants → atlas band |
|---|---|---|---|---|---|---|
| `env_tree_cottonwood_dead` | tree | 399 | 9.89 × 6.61 × 7.67 | 5.98 | r 0.35 / h 6.61 / solid | summer_sparse_leaf→0, autumn_leaf_drop→1, late_fall_bare_wet→2, fallout_frosted→3 |
| `env_tree_pinyon_burnt` | tree | 306 | 4.32 × 3.64 × 4.88 | 2.83 | r 0.3 / h 3.64 / solid | summer_charred→0, autumn_charred→1, late_fall_charred→2, fallout_frosted→3 |
| `env_tree_bare_frosted` | tree | 394 | 2.80 × 5.72 × 2.58 | 3.15 | r 0.3 / h 5.72 / solid | fallout_frosted→3 |
| `env_tree_snag_stump` | tree | 166 | 2.09 × 2.92 × 1.86 | 1.89 | r 0.3 / h 2.92 / solid | plain→1, summer→0, late_fall_wet→2, fallout_frosted→3 |
| `env_bush_rabbitbrush` | bush | 242 | 0.88 × 0.91 × 0.74 | 0.47 | r 0.0 / h 0.91 / walk-through | summer_yellow_bloom→0, autumn_seedhead→1, late_fall_grey→2, fallout_frosted→3 |
| `env_bush_tumbleweed` | bush | 232 | 0.62 × 0.58 × 0.71 | 0.38 | r 0.0 / h 0.58 / walk-through | summer_tan→0, autumn_tan→1, late_fall_grey→2, fallout_frosted→3 |
| `env_bush_frosted` | bush | 239 | 1.85 × 0.91 × 1.57 | 1.00 | r 0.45 / h 0.91 / solid | fallout_frosted→3 |
| `env_tuft_cheatgrass` | tuft | 16 | 0.41 × 0.32 × 0.38 | 0.31 | r 0.0 / h 0.32 / walk-through | summer_straw→0, autumn_tan→1, late_fall_grey→2, fallout_frosted→3 |
| `env_tuft_weeds` | tuft | 16 | 0.44 × 0.34 × 0.40 | 0.32 | r 0.0 / h 0.34 / walk-through | summer_dry_green→0, autumn_kochia_red→1, late_fall_brown→2, fallout_frosted→3 |
| `env_tuft_frostgrass` | tuft | 16 | 0.34 × 0.24 × 0.34 | 0.22 | r 0.0 / h 0.24 / walk-through | summer_dry→0, autumn_dry→1, late_fall_rime→2, fallout_buried_ash→3 |
| `env_tuft_thistle` | tuft | 16 | 0.36 × 0.46 × 0.34 | 0.30 | r 0.0 / h 0.46 / walk-through | summer_dry→0, autumn_dry→1, late_fall_dry→2, fallout_frosted→3 |
| `env_tuft_cards` | tuft | 16 | 0.36 × 0.32 × 0.36 | 0.26 | r 0.0 / h 0.32 / walk-through | summer→0, autumn→1, late_fall→2, fallout_winter→3 |
| `env_sidewalk_curb_strip` | ground | 12 | 1.98 × 0.15 × 1.50 | 1.24 | r 0.0 / h 0.15 / walk-through | - |
| `env_sidewalk_curb_corner` | ground | 36 | 3.30 × 0.15 × 3.30 | 2.33 | r 0.0 / h 0.15 / walk-through | - |
| `env_road_tile_4m` | ground | 2 | 4.00 × 0.00 × 4.00 | 2.83 | r 0.0 / h 0.0 / walk-through | - |
| `env_road_2lane_8x4` | ground | 4 | 8.00 × 0.00 × 4.00 | 4.47 | r 0.0 / h 0.0 / walk-through | - |
| `env_decal_atlas` | decal | 2 | 1.00 × 0.00 × 1.00 | 0.71 | r 0.0 / h 0.02 / walk-through | - |
| `sagebrush_clump` | bush | 324 | 1.02 × 1.04 × 1.00 | 0.62 | r 0.45 / h 1.04 / solid | summer→0, autumn_dusty→1, late_fall_dusty→2, fallout_frosted→3 |

**Season variants** are atlas-band swaps on the **same mesh**: band = `variants[name].band`, `map.offset.y = band * 0.25`.
`setEnvSeason('summer'|'autumn'|'late_fall'|'fallout_winter')` switches every shared env material at once. Pass
`{ season }` to `getEnvMaterial` / `makeEnvInstanced` to pin one mesh to a band, for example a frosted tree in a late_fall level.
In band 3 (`fallout_winter`) every up-facing facet (normal.y > 0.45) turns to snow. `env_tree_bare_frosted` and
`env_bush_frosted` are frosted in every band.

**sagebrush_clump** is the one allowed change to an existing model. It was re-exported from 5 materials / 5 draw calls to 1 env-atlas material / 1 draw call.
The geometry is identical (the triangle sets were compared exactly), and band 0 holds its original 5 colours. In the before/after on the sheet, the mean
absolute pixel difference is 0.05 / 255. The original is backed up at `/workspace/ashfall_rig_backup/pre_env/sagebrush_clump.glb`. It loads through
`loadModel('sagebrush_clump')` as before (its GLB points at `../env/textures/env_atlas.png`). It is also in `ENV_CATALOG`
for instancing, with season bands.

### Tufts: one draw call for mixed types

`env_tuft_cards` is one crossed-card mesh. The per-instance float `tuftFrame` shifts u by 48/256 per frame:
0 cheatgrass, 1 weeds, 2 thistle, 3 frostgrass (`ENV_TUFT_FRAMES`). `setTuftAt` multiplies the scale by `ENV_TUFT_FRAME_SCALE`
(thistle 1.4, frostgrass 0.75, ...). The individual `env_tuft_*` ids remain for single-type patches.

```js
const tufts = await makeEnvTuftCards(600);               // 1 InstancedMesh, 1 draw call
for (let i = 0; i < 600; i++) tufts.setTuftAt(i, pickKind(i), x[i], z[i], rand);   // frame + jittered matrix
tufts.instanceMatrix.needsUpdate = true; tufts.computeBoundingSphere(); scene.add(tufts);
```

### Ground textures (`env/textures/`; ENV_TEXTURES; `loadGroundTexture(id, { size: [w, d] })` sets repeat = size / metersPerTile)

| id | px | m per tile | wrap | alpha |
|---|---|---|---|---|
| `env_tex_asphalt_cracked` | 128×128 | 4.0 × 4.0 m | repeat | opaque |
| `env_tex_asphalt_lanes` | 128×128 | 4.0 × 4.0 m | repeat-v | opaque |
| `env_tex_sidewalk` | 64×64 | 1.5 × 1.5 m | repeat | opaque |
| `env_tex_curb` | 64×64 | 1.0 × 0.64 m | repeat | opaque |
| `env_tex_sidewalk_curb` | 64×128 | 1.5 × 1.5 m | repeat | opaque |
| `env_tex_dirt_ashy` | 128×128 | 4.0 × 4.0 m | repeat | opaque |
| `env_tex_snow` | 128×128 | 4.0 × 4.0 m | repeat | opaque |
| `env_tex_gravel` | 64×64 | 2.0 × 2.0 m | repeat | opaque |
| `env_tex_dirt_frozen` | 64×64 | 2.0 × 2.0 m | repeat | opaque |
| `env_tex_asphalt_cracked_ash` | 128×128 | 4.0 × 4.0 m | repeat | opaque |
| `env_tex_sidewalk_ash` | 64×64 | 1.5 × 1.5 m | repeat | opaque |
| `env_tex_curb_ash` | 64×64 | 1.0 × 0.64 m | repeat | opaque |
| `env_tex_sidewalk_curb_ash` | 64×128 | 1.5 × 1.5 m | repeat | opaque |
| `env_tex_ash_overlay` | 128×128 | 2.0 × 2.0 m | repeat | alphaTest |
| `env_tex_snow_dust` | 128×128 | 2.0 × 2.0 m | repeat | alphaTest |
| `env_decal_atlas` | 256×256 | - | clamp | alphaTest |

- `env_tex_sidewalk_curb` is the uv layout of `env_sidewalk_curb_strip` / `_corner`. v 0–0.5 is the sidewalk top (1.5 m), v 0.5–0.6 the curb top,
  0.6–0.64 the arris, 0.64–0.78 the curb face and 0.78–1 the gutter. u = 1.5 m along the curb.
- Ash/snow blend: use the `*_ash` variants (same uv layout, swap with `{ texture: 'env_tex_..._ash' }`), or lay the tiling alpha
  overlays `env_tex_ash_overlay` / `env_tex_snow_dust` with `makeEnvDecal(id, { width, depth })`, plus the snow/ash decal frames.
- All tiling textures pass the wrap seam check in `render_env.py`. The joint textures are measured across the designed joint, and curb v
  is a cross-section, not a tiling direction.

### Decal atlas (`env_decal_atlas.png`, 256 px; `env_decal_atlas.glb` = 1 × 1 m unit quad at y = +0.02, long axis = local X)

One InstancedMesh draws every road marking, crack, pothole and patch through the per-instance `vec4 uvRect`
(`makeEnvDecals`). `setDecalAt(i, frame, x, z, yaw, scale)` scales the quad to the frame's metric size. Use yaw = π/2 to run a
line along Z. For a single decal use `makeEnvDecal('pothole')`, which bakes the uvs.

| frame | px [x, y, w, h] | size m | uvRect [u0, v0, u1, v1] |
|---|---|---|---|
| `lane_dash_yellow` | [0, 0, 128, 8] | [3.0, 0.12] | [0.001953, 0.001953, 0.498047, 0.029297] |
| `lane_edge_white` | [128, 0, 128, 8] | [6.0, 0.12] | [0.501953, 0.001953, 0.998047, 0.029297] |
| `stop_line` | [0, 8, 128, 16] | [3.6, 0.45] | [0.001953, 0.033203, 0.498047, 0.091797] |
| `lot_line_white` | [128, 8, 128, 8] | [5.5, 0.1] | [0.501953, 0.033203, 0.998047, 0.060547] |
| `lane_double_yellow` | [128, 16, 128, 16] | [6.0, 0.35] | [0.501953, 0.064453, 0.998047, 0.123047] |
| `crosswalk_bar` | [0, 24, 128, 28] | [2.2, 0.45] | [0.001953, 0.095703, 0.498047, 0.201172] |
| `crack_a` | [0, 64, 64, 64] | [1.6, 1.6] | [0.001953, 0.251953, 0.248047, 0.498047] |
| `crack_b` | [64, 64, 64, 64] | [1.4, 1.4] | [0.251953, 0.251953, 0.498047, 0.498047] |
| `crack_web` | [128, 64, 64, 64] | [1.9, 1.9] | [0.501953, 0.251953, 0.748047, 0.498047] |
| `patch` | [192, 64, 64, 64] | [1.6, 1.6] | [0.751953, 0.251953, 0.998047, 0.498047] |
| `pothole` | [0, 128, 64, 64] | [1.0, 1.0] | [0.001953, 0.501953, 0.248047, 0.748047] |
| `pothole_water` | [64, 128, 64, 64] | [1.0, 1.0] | [0.251953, 0.501953, 0.498047, 0.748047] |
| `pothole_ash` | [128, 128, 64, 64] | [1.0, 1.0] | [0.501953, 0.501953, 0.748047, 0.748047] |
| `manhole` | [192, 128, 64, 64] | [0.8, 0.8] | [0.751953, 0.501953, 0.998047, 0.748047] |
| `snow_patch` | [0, 192, 64, 64] | [1.6, 1.4] | [0.001953, 0.751953, 0.248047, 0.998047] |
| `ash_overlay` | [64, 192, 64, 64] | [1.6, 1.4] | [0.251953, 0.751953, 0.498047, 0.998047] |
| `curb_drift` | [128, 192, 64, 64] | [1.6, 0.8] | [0.501953, 0.751953, 0.748047, 0.998047] |
| `leaf_litter` | [192, 192, 64, 64] | [1.2, 1.2] | [0.751953, 0.751953, 0.998047, 0.998047] |

```js
const marks = await makeEnvDecals(300);
let i = 0;
for (let z = 0; z > -200; z -= 12) marks.setDecalAt(i++, 'lane_dash_yellow', cx, z, Math.PI / 2);   // 3 m dash, 9 m gap
for (let z = -3; z > -200; z -= 6) marks.setDecalAt(i++, 'lane_edge_white', curbX - 0.45, z, Math.PI / 2);
marks.setDecalAt(i++, 'stop_line', cx + 1.8, -29, 0);
for (let k = 0; k < 6; k++) marks.setDecalAt(i++, 'crosswalk_bar', curbX - 0.9 - k * 1.25, -31.6, Math.PI / 2);
marks.count = i; marks.instanceMatrix.needsUpdate = true; marks.computeBoundingSphere(); scene.add(marks);
```

### Registry helpers (`registry.js`; existing exports unchanged)

Exports: `ENV_CATALOG`, `ENV_TEXTURES`, `ENV_ATLAS`, `ENV_DECAL_FRAMES`, `ENV_TUFT_FRAMES`, `ENV_TUFT_FRAME_SCALE` and `ENV_SEASONS`.
Helpers:
- `loadEnvModel(id, loader?, { season, texture })`
- `makeEnvInstanced(id, count, opts)`
- `envJitterMatrix(id, x, z, rand, out, y)`, which applies the catalogue's scale, yaw and tilt jitter
- `makeEnvTuftCards(count)`
- `makeEnvDecals(count)`
- `makeEnvDecal(frameOrOverlay, { width, depth })`
- `loadGroundTexture(id, { size | repeat })`
- `setEnvSeason(season)`
- `getEnvMaterial`, `loadEnvGeometry`, `envTexturesReady`

Geometry and materials are shared per id or key, so N instances cost one draw call per id.

### Draw calls and placement notes (for Cartographer)

- The mock street in `env_sheet.png` has 532 env instances in 11 InstancedMeshes. In the main pass (no shadow pass) it is **15 draw calls**: 13 env, plus 2 for the NPC and the sagebrush (the house is out of frame). The winter street is
  16 calls, with the extra call from the snow-dust overlay. The budget per street is roughly one call per id you place, plus one for all tufts and one for all decals.
- Colliders: trees use a cylinder of r 0.35 (cottonwood) or 0.30 (others), at full height. Use `sagebrush_clump` / `env_bush_frosted` at r 0.45. Rabbitbrush,
  tumbleweed, tufts, decals and ground pieces are walk-through (r 0). The sidewalk strip is a 0.15 m step, not a wall.
- The `env_sidewalk_curb_strip` curb face is on x = 0, with the road on −X and the sidewalk out to +1.68. Chain the strips every 1.5 m along Z and rotate 180° for the far side.
  The `_corner` piece is a curb arc of r 3 m about its origin, from −X to −Z, and joins straight strips with their faces on x = −3 and z = −3.
- Density guide: tufts 0.5–3 per m², in clumps of 4–12, culled at 10–22 m. Rabbitbrush in clusters of 3–7, 1.5–4 m apart. Tumbleweeds against
  the downwind (east) side of fences, curbs and walls, with any rotation. Cottonwoods as singles or rows 8–15 m apart (they are wide, rXZ about 5.8 m).
  Pinyon in groves 6–12 m apart, and snags about 1 per 400–900 m². Every entry has `jitter`, `placement` and `chapters` in the manifest.


### Optional extras (Cartographer, 2026-11-24)

Added without moving any existing decal frame (existing `uvRect`s are unchanged and still valid).

| id | kind | tris | notes |
|---|---|---|---|
| `env_tree_street_frosted` | tree | 228 | Narrow high-pruned street tree for a **3 m sidewalk corridor** (`radiusXZ` 0.91 m, height 5.44 m, collider r 0.25 / h 5.44, solid). Same mesh, 4 season bands: `summer_sparse_leaf`, `autumn_leaf_drop`, `late_fall_bare_wet`, `fallout_frosted`. Parkway placement every 8–12 m. |
| `env_sidewalk_curb_corner_tight` | ground | 30 | Tight 90° corner, curb-face radius **1.5 m** (the original `env_sidewalk_curb_corner` at r 3 m is unchanged). Same orientation: from −X to −Z, sidewalk toward the origin. Joins straight strips with faces on x = −1.5 and z = −1.5. Because the 1.68 m walk is wider than R, the sidewalk is a fan to the origin; a gutter-height fill paves the pie out to the grid corner (−1.8, −1.8) so no ground shows in the intersection pocket. Sidewalk top stays at 0.15 m. |
| `env_road_2lane_8x4_ash` | ground | 2 | Same 8 × 4 m footprint as `env_road_2lane_8x4`, along Z. Tiling UVs for `env_tex_asphalt_cracked_ash` (4 m/tile); put lane markings on with the decal atlas. |

**New decal frames** (painted into leftover pixels of row 0 at x 128–255, y 32–48; neighbours keep their rects):

| frame | px [x, y, w, h] | size m | uvRect |
|---|---|---|---|
| `lane_dash_white` | [128, 32, 128, 8] | 3.0 × 0.12 | [0.501953, 0.126953, 0.998047, 0.154297] |
| `lane_solid_yellow` | [128, 40, 128, 8] | 6.0 × 0.12 (seamless along X) | [0.501953, 0.158203, 0.998047, 0.185547] |

`lane_dash_white` is a white dashed lane divider (one 3 m dash, same placement as `lane_dash_yellow`). `lane_solid_yellow` is a single solid yellow (taxi / left-edge / single no-passing line); chain every 6 m.

**Snow dust densities**

| id | coverage | recommended use |
|---|---|---|
| `env_tex_snow_dust_light` | ~12% (10–15%) | late_fall **Ch 7b** — first dusting / late flurries over road and lots |
| `env_tex_snow_dust` | ~38% | fallout_winter **Ch 8–10** — full ash-snow dusting |

Both are 128 px, 2 m/tile, RepeatWrapping, alphaTest 0.5. `makeEnvDecal('env_tex_snow_dust_light', { width, depth })` lays the light overlay.

Previews: `previews/env_extras_sheet.png` (street-tree season strip, 3 m vs tight corner, ash road, new decal frames, dust comparison, and an intersection street with tight corners + street trees: late_fall + light dust, and winter + full dust).

## Architecture set

Doors, windows, trim, wall panels, interior dressing, furniture/room kits, and tiling floor/wall textures for the
house, store, garage, clinic and warehouse interiors. They're built by `tools/arch.py` (`python3 models/tools/arch.py`,
also run by `build_all.py` after `build_prototypes.build()`). Previews come from `tools/render_arch.py` (headless
WebKit through `registry.js`).

- **Files**: `arch/*.glb` (58 models), `arch/textures/*.png` (33 textures). The manifest section is `manifest.json` → `arch`.
  It covers models, textures, atlas layout, decal frames and `roomKits`, plus the counts `arch_models`/`arch_textures`.
- **Atlas and materials**: every GLB uses one 512 px atlas, `arch_atlas.png`, plus a 128 px MR map, `arch_atlas_mr.png`.
  - The MR map follows glTF: G = roughness, B = metalness. Glass is the one glossy area (roughness ~0.45).
  - Each mesh has 1 material: `arch_atlas` (opaque) or `arch_cutout` (the same atlas with alphaTest 0.5). Only
    `window_broken` and `window_boarded_diagonal` use the cutout. Nothing is alpha-blended, so there's no sorting.
  - Textures use NEAREST filtering, no mipmaps, SRGB and RepeatWrapping.
- **Wear bands**: band 0 is `weathered` (summer, autumn, late_fall). Band 1 is `ashfall` (fallout_winter), at v + 0.5.
  - `setArchSeason(season[, root])` swaps a shared material whose texture is a clone with `offset.y = 0.5`. It's the
    same GPU image, so nothing is re-uploaded and no extra program is compiled.
  - Up-facing facets use `*_top` swatches, which carry the ash in band 1.
- **Conventions**: units are meters, faces are flat-shaded and geometry is non-indexed.
  - Openings (doors/windows): x is centred, y = 0 is the bottom of the opening (threshold, or the sill for windows),
    z = 0 is the exterior wall face, and +Z faces the street.
  - Frames are authored for a **0.20 m wall** (z 0 to -0.20). For another thickness, use `scale.z = wall / 0.20`
    (safe range 0.15-10 m).
  - Props and furniture are ground-centred (min y = 0) and face +Z.
- **Nodes**: each GLB is a root node named by id, with one child mesh per part. Doors have `frame` and `leaf` (the leaf
  node sits on its pivot); everything else has `main`. 1 draw call per part.

### Doors
| door | opening (rough) | clear | motion | leaf pivot | notes |
|---|---|---|---|---|---|
| `door_residential_wood` | 0.98 × 2.09 (depth 0.2) | 0.92 × 2.06 | swing 90° | [-0.455, 0.0, -0.1] | Stained 6-panel slab 0.91 x 2.03 m, brass knob + deadbolt both faces, jambs + stops + threshold + casing on both faces. In-swing: rotation.y 0 -> +90 deg swings the leaf into the room (-Z). |
| `door_storefront` | 1.1 × 2.17 (depth 0.115) | 1.0 × 2.12 | swing -90° | [-0.49, 0.0, -0.035] | Bronze-anodised aluminium frame + closer, glass leaf 0.98 x 2.09 m with interior push bar and exterior pull. Out-swing (egress): rotation.y 0 -> -90 deg swings the leaf out to the street (+Z). |
| `door_garage_rollup` | 3.06 × 2.48 (depth 0.2) | 2.9 × 2.4 | roll (rollMin 0.07) | [0.0, 2.4, -0.11] | Rolling steel door: steel jambs, guide channels, exterior trim, coil hood on the interior face (top y 2.94: needs >= 3.0 m of wall inside). Leaf pivot = top centre of the curtain; open = leaf.scale.y 1 -> 0.07 (rolls into the hood, leaves the bottom bar under the header: 2.23 m clear). |
| `door_boarded` | 0.98 × 2.09 (depth 0.2) | 0.92 × 2.06 | remove | [0.0, 0.0, 0.0] | Dark-trim residential frame + an old peeling painted slab 4 mm proud of the wall face (so it also works on an UNCUT wall), leaf = 4 planks + diagonal brace. setDoorOpen(obj, 1) hides the boards ("cleared"); the slab stays (swap to door_residential_wood if the player should enter). |

- `setDoorOpen(obj, t)` takes t from 0 (closed) to 1 (open):
  - swing: `leaf.rotation.y = hand · openAngle · t`.
    - The residential door swings **in** (+90°, into the room, -Z).
    - The storefront door swings **out** (-90°, to the street, +Z). It's an egress door.
  - roll: `leaf.scale.y = 1 - 0.93 t`. The curtain rolls up into the interior hood, leaving 2.23 m clear. The hood top
    is at y 2.94, so the wall needs at least 3.0 m on the inside.
  - remove (boarded): the boards are hidden when t ≥ 0.5. The old slab stays.
- **Hand**: `hand: 'R'` mirrors the geometry at load. It negates x and normal.x, swaps the triangle winding, mirrors
  the pivot and flips the angle sign, so the hinge moves to +X.
  - `makeArchInstanced` needs a separate call per hand, because InstancedMesh won't flip winding for negative-scale
    instances. Never mirror by putting `scale.x = -1` on instances.
- **Colliders**: `collider.frameBoxes` are the frame members, which are always solid. `collider.leafClosed` is the
  closed leaf box. `collider.swingRadius` is the leaf width; keep that circle clear of furniture on the swing side.
- `door_boards_overlay` (50 tris) is four planks plus a brace at z 0.03-0.10, so it sits in front of any casing.
  - It's sized for 1.0 × 2.1 m.
  - Scale it x 0.8-2.9 to cover anything up to the garage door, or x 2.2 / y 0.98 for a storefront window.

### Windows
- All windows are opaque glass: the front (+Z) has a baked faint interior and the back (-Z) has a hazy exterior.
  They're glossy via the MR map.
  - `window_cracked` adds a crack web.
  - `window_broken` cuts an alphaTest hole, so you see the real room or street through it, with shards on the sill.
  - `window_boarded` has 3 planks over a broken lite.
  - `window_boarded_diagonal` is the concept-match window: crossed planks plus one slanted board over a broken lite.
- **Opening**: residential windows are 0.90 × 1.20 (sill 0.90 m). Storefront is 2.40 × 1.80 (sill 0.45 m, frame
  depth 0.115).
- **Safe scales**: residential x 0.75-1.6, y 0.75-1.4. Storefront x 0.6-1.5, y 0.7-1.3.
- **Boarded from inside**: the planks are on the exterior (+Z) face, so to board a window from the inside, place it
  rotated 180° (the concept room does this).

### All models
| id | kind | tris | W × H × D (m) | collider | rooms | notes |
|---|---|---|---|---|---|---|
| `door_residential_wood` | door/swing | 158 | 1.09 × 2.15 × 0.25 | frame boxes + closed leaf, swing r 0.91 m | any, bedroom, living, kitchen | swing 90°, pivot [-0.455, 0.0, -0.1] |
| `door_storefront` | door/swing | 142 | 1.10 × 2.17 × 0.20 | frame boxes + closed leaf, swing r 0.98 m | store, clinic | swing -90°, pivot [-0.49, 0.0, -0.035] |
| `door_garage_rollup` | door/roll | 108 | 3.22 × 2.94 × 0.63 | frame boxes + closed leaf | garage, warehouse, store | roll, pivot [0.0, 2.4, -0.11] |
| `door_boarded` | door/boarded | 120 | 1.17 × 2.15 × 0.31 | frame boxes + closed leaf | any | remove, pivot [0.0, 0.0, 0.0] |
| `door_boards_overlay` | overlay/boards | 50 | 1.26 × 1.75 × 0.07 | none | any |  |
| `window_intact` | window/residential | 142 | 1.12 × 1.38 × 0.32 | frame box | any |  |
| `window_cracked` | window/residential | 142 | 1.12 × 1.38 × 0.32 | frame box | any |  |
| `window_broken` | window/residential | 147 | 1.12 × 1.38 × 0.33 | frame box | any | cutout |
| `window_boarded` | window/residential | 140 | 1.18 × 1.38 × 0.32 | frame box | any |  |
| `window_boarded_diagonal` | window/residential | 140 | 1.14 × 1.38 × 0.36 | frame box | any, warehouse | cutout |
| `window_storefront` | window/storefront | 50 | 2.44 × 1.82 × 0.16 | frame box | store, clinic |  |
| `arch_baseboard_2m` | trim/baseboard | 4 | 2.00 × 0.09 × 0.01 | none | any |  |
| `arch_wall_corrugated_1m` | wall_panel/panel | 46 | 1.00 × 2.40 × 0.04 | box | warehouse, garage |  |
| `arch_wall_corrugated_2m` | wall_panel/panel | 86 | 2.00 × 2.40 × 0.04 | box | warehouse, garage |  |
| `arch_wall_plank_1m` | wall_panel/panel | 14 | 1.00 × 2.40 × 0.02 | box | warehouse, garage, any |  |
| `arch_wall_plank_2m` | wall_panel/panel | 16 | 2.00 × 2.40 × 0.02 | box | warehouse, garage, any |  |
| `arch_glass_shards_a` | dressing/small | 6 | 0.33 × 0.01 × 0.32 | none | any |  |
| `arch_glass_shards_b` | dressing/small | 14 | 0.65 × 0.01 × 0.53 | none | any |  |
| `arch_glass_pane_fallen` | dressing/small | 35 | 0.90 × 0.13 × 0.64 | none | any |  |
| `arch_glass_hanging` | dressing/small | 10 | 0.78 × 1.05 × 0.00 | none | any |  |
| `arch_paper_pile` | dressing/small | 50 | 0.68 × 0.07 × 0.63 | none | any, clinic, store |  |
| `arch_debris_pile` | dressing/small | 86 | 0.84 × 0.08 × 0.51 | none | any |  |
| `arch_rubble_small` | dressing/small | 12 | 0.15 × 0.05 × 0.12 | none | any, warehouse |  |
| `arch_rubble_medium` | dressing/small | 27 | 0.45 × 0.10 × 0.28 | none | any, warehouse |  |
| `arch_rubble_large` | dressing/small | 42 | 0.82 × 0.20 × 0.59 | box | any, warehouse |  |
| `arch_can` | dressing/small | 19 | 0.07 × 0.12 × 0.07 | none | any |  |
| `arch_can_cluster` | dressing/small | 81 | 0.23 × 0.12 × 0.25 | none | any, kitchen, store |  |
| `arch_pipe_straight` | dressing/small | 40 | 1.50 × 0.11 × 0.10 | none | warehouse, garage, any |  |
| `arch_pipe_elbow` | dressing/small | 44 | 0.60 × 0.09 × 0.55 | none | warehouse, garage, any |  |
| `arch_plank_loose` | dressing/small | 10 | 2.00 × 0.03 × 0.14 | none | any, warehouse |  |
| `arch_plank_broken_a` | dressing/small | 12 | 1.12 × 0.03 × 0.14 | none | any, warehouse |  |
| `arch_plank_broken_b` | dressing/small | 24 | 0.69 × 0.05 × 0.38 | none | any, warehouse |  |
| `arch_plank_stack` | dressing/small | 60 | 1.91 × 0.15 × 0.70 | box | warehouse, garage |  |
| `arch_chair` | furniture/furniture | 88 | 0.44 × 0.92 × 0.42 | box | kitchen, living, clinic, any | poses: overturned, on_side |
| `arch_table` | furniture/furniture | 56 | 1.20 × 0.76 × 0.76 | box | kitchen, living, any | poses: overturned, on_side |
| `arch_counter` | furniture/furniture | 112 | 1.84 × 0.90 × 0.64 | box | kitchen, store |  |
| `arch_counter_sink` | furniture/furniture | 162 | 1.84 × 1.15 × 0.64 | box | kitchen, clinic |  |
| `arch_shelf_metal` | furniture/furniture | 80 | 1.23 × 2.10 × 0.46 | box | warehouse, garage, store, any | poses: toppled |
| `arch_shelf_metal_boxes` | furniture/furniture | 190 | 1.23 × 2.10 × 0.47 | box | warehouse, garage, store | poses: toppled |
| `arch_box_small` | dressing/small | 10 | 0.42 × 0.30 × 0.32 | none | any |  |
| `arch_box_large` | dressing/box | 10 | 0.70 × 0.52 × 0.52 | box | any, warehouse, store |  |
| `arch_box_collapsed` | dressing/small | 14 | 0.69 × 0.16 × 0.70 | none | any |  |
| `arch_crate_large` | furniture/crate | 70 | 1.14 × 0.85 × 0.89 | box | warehouse, garage, any |  |
| `arch_crate_small` | furniture/crate | 74 | 0.64 × 0.48 × 0.54 | box | warehouse, garage, store, any |  |
| `arch_crate_broken` | furniture/crate | 92 | 1.03 × 0.76 × 1.39 | box | warehouse, garage, any |  |
| `arch_fridge` | furniture/kitchen | 36 | 0.76 × 1.70 × 0.70 | box | kitchen |  |
| `arch_fridge_ajar` | furniture/kitchen | 46 | 0.79 × 1.70 × 1.16 | box | kitchen |  |
| `arch_bed` | furniture/bedroom | 72 | 1.44 × 1.05 × 2.05 | box | bedroom |  |
| `arch_bed_messy` | furniture/bedroom | 92 | 1.47 × 1.05 × 2.11 | box | bedroom |  |
| `arch_couch` | furniture/living | 82 | 1.90 × 0.92 × 0.89 | box | living |  |
| `arch_gondola_stocked` | furniture/store | 74 | 1.28 × 1.60 × 0.50 | box | store | poses: toppled |
| `arch_gondola_looted` | furniture/store | 114 | 1.28 × 1.60 × 0.74 | box | store | poses: toppled |
| `arch_cash_register` | dressing/store | 36 | 0.40 × 0.30 × 0.44 | none | store |  |
| `arch_workbench` | furniture/garage | 138 | 1.80 × 1.75 × 0.72 | box | garage, warehouse |  |
| `arch_tire` | dressing/garage | 80 | 0.66 × 0.63 × 0.20 | none | garage, warehouse |  |
| `arch_tire_stack` | furniture/garage | 240 | 0.73 × 0.61 × 0.68 | box | garage, warehouse |  |
| `arch_cot` | furniture/clinic | 119 | 0.74 × 0.54 × 1.90 | box | clinic, warehouse, any |  |
| `arch_med_cabinet` | furniture/clinic | 70 | 0.82 × 1.83 × 0.43 | box | clinic | poses: toppled |

- **Budgets**: doors 60-250, windows 20-150 (diagonal 160), small props 6-120 (no collider), furniture and room kits
  30-350 (box colliders). Every model passes `tools/arch.py` checks: in budget, 0 degenerate triangles, 0 same-facing
  coplanar overlaps (z-fight check).
- **Poses** (`ARCH_CATALOG[id].poses`, `loadArchModel(id, loader, { pose })` or `archPoseMatrix(id, pose, x, z, yaw)`)
  use the same mesh rotated and lifted onto the floor:
  - `overturned` (onto its back) and `on_side`: chair, table.
  - `toppled` (onto its front): the shelves, the gondolas and the medical cabinet.
- `arch_cash_register` sits on `arch_counter` at y = 0.90. `arch_glass_hanging` sits at the window origin of a
  boarded or empty frame. Wall panels are 1 or 2 m wide × 2.4 m, with the back face on z = 0, and snap along X.

### Floors and walls (`arch/textures/`, `loadFloorTexture(id, { size: [w, d] })` sets repeat = size / metersPerTile)
| texture | px | m/tile | variants |
|---|---|---|---|
| `floor_hardwood` | 128 | 2.0 | `_dirty` `_ash` |
| `floor_linoleum` | 128 | 1.2 | `_dirty` `_ash` |
| `floor_ceramic_tile` | 128 | 1.6 | `_dirty` `_ash` |
| `floor_carpet` | 64 | 1.0 | `_dirty` `_ash` |
| `floor_concrete_stained` | 128 | 4.0 | `_dirty` `_ash` |
| `floor_wood_plank` | 128 | 2.0 | `_dirty` `_ash` |
| `wall_corrugated` | 64 | 1.0 | `_dirty` `_ash` |
| `wall_drywall` | 64 | 1.0 | `_dirty` `_ash` |
| `wall_drywall_stained` | 64 | 1.0 | n/a |
| `wall_wood_panel` | 64 | 1.0 | `_dirty` `_ash` |
| `wall_brick` | 64 | 1.0 | `_dirty` `_ash` |

- Every tiling texture passes the seam check in `render_arch.py`: the wrap step is no stronger than the strongest
  interior step. Designed edge joints (the concrete saw-cut, the panel groove) are measured across the joint.
- **Decals**: `arch_floor_decals.png` is 256 px, 4 × 4 cells. The 16 frames are in `ARCH_DECAL_FRAMES`:
  rug_rect, rug_round, doormat, footprints, stain_water/oil/dark, puddle, debris, papers, glass_shards, ash_drift,
  plaster, leaves, scorch, sawdust.
  - `makeArchFloorDecals(n)` puts all of them in **one** InstancedMesh: `setDecalAt(i, frame, x, z, yaw, scale)`.
    They're lifted 1 cm, with alphaTest and polygonOffset.
- **Dust**: `makeArchDust(n, { min, max })` makes one `THREE.Points` draw call. Call `pts.userData.update(dt)` each frame.

### Registry helpers (additive; generated block `// <arch-catalog>` + `// <arch-helpers>` from `tools/arch_helpers.js`)
- Data exports: `ARCH_CATALOG`, `ARCH_TEXTURES`, `ARCH_ATLAS`, `ARCH_DECAL_FRAMES`, `ARCH_WEAR`.
- Loading:
  - `loadArchModel(id, loader, { wear, hand, open, pose })` returns a Group with `frame`/`leaf` or `main` children.
  - `loadArchGeometry(id, part, { hand })` returns the shared geometry for one part.
  - `getArchMaterial('atlas' | 'cutout', { wear })` returns the shared material.
  - `archTexturesReady()` resolves once the arch textures are loaded.
- Doors: `setDoorOpen(obj, t)` and `archLeafMatrix(id, t, hand)`.
- Instancing: `makeArchInstanced(id, n, { part, wear, hand })` returns an InstancedMesh. For doors it returns a Group
  with `.frame`/`.leaf` and `setDoorAt(i, matrix, t)`, which costs 2 draw calls for every door of that id.
- Other helpers: `archPoseMatrix`, `setArchSeason`, `loadFloorTexture`, `makeArchFloorDecals`, `makeArchDust`.

### Placement notes for Prime and Cartographer
- **Wall cut-outs**: cut a hole of `opening.width × opening.height` from y = sill (doors use 0) and place the model at
  the hole's bottom centre, on the exterior face. Casings overlap the wall face by 5-11 cm on both sides and stand
  proud of it, so there's no z-fight.
  - Rotate 180° to flip which side is the exterior.
- **Uncut "mass" walls**: `door_boarded` and `window_boarded*` already carry their own backer/void, so they can be
  stuck onto an uncut wall. Set `position.z = +0.004`. The interior half of the frame is buried in the wall and
  unseen (see the "UNCUT wall" tiles in `arch_sheet.png`).
  - Don't do this with open doors or `window_broken`: they need a real hole.
- **Grid (2 m cells, 4 m walls)**:
  - A 'D' cell takes `door_residential_wood` centred at x = 0 of the cell edge, or `door_storefront` on store blocks.
  - The garage roll-up needs a 3.06 m hole, so two cells, and at least 3.0 m of wall height inside.
  - Windows: sill 0.9 m for residential, 0.45 m for storefront.
- **Room tags**: `manifest.arch.roomKits[room]` lists the models and textures for kitchen, bedroom, living, store,
  garage, clinic, warehouse and any. Each model also carries `tags` (glass/papers/overturned/store/kitchen/...).
- **Draw calls** (main pass, measured with `renderer.info` in `render_arch.py`):

  | scene | draw calls | tris |
  |---|---|---|
  | facade (5 openings, roof, ground) | 19 | 881 |
  | storefront strip | 17 | 774 |
  | first-person interior | 23 (22 without the NPC) | about 2.0k |
  | concept-match flashlight room (16 corrugated panels in 1 InstancedMesh call, 18 rubble instances in 2 calls) | 23 | 1902 |
  | room-kit vignettes | 9-12 | 240-620 |

  Instance repeated pieces with `makeArchInstanced`: baseboards, panels, rubble, cans, tires.
- **Previews**: `previews/arch_sheet.png`, `previews/arch_in_context.png` (raw renders plus the seasonal-palette
  quantise of each), `previews/arch_room_kits.png`.

### r16 gap-fill additions (`tools/arch_gapfill.py`, additive only)
- **Atlas preservation**: all 58 original `arch/*.glb` models, `arch_floor_decals.png` (`uvRect`s + bytes), swatch slots `0..95`, and existing region coordinates in `arch_atlas.png` remain unchanged. The 3 formerly `free`/`free2`/`free3` regions now hold `metal_locker`, `radio_front`, `book_spines`, `console`, `note_photo`, `bottle_label`, `laptop_screen`, `file_cab`, and `plastic_tarp`, with 16 new base swatches + `_top` twins appended at slots `96..127`.
- **Atlas polish**: `crate` (`paint_crate_weathered`) darkened/weathered to match `refs/interior_target_lumen.png`, and `goods` / `goods_looted` (`paint_goods_groceries`) reworked into cans, boxes, and capped bottles so `arch_gondola_stocked` reads as groceries.
- **`props/metal_locker.glb` re-atlas**: merged from 5 materials to 1 material on `arch/textures/arch_atlas.png` + `arch_atlas_mr.png` (272 tris, 1 draw call, grounded `min y = 0`; backup in `/workspace/ashfall_rig_backup/pre_arch2/metal_locker.glb`).
- **59 new arch GLBs** covering all 54 items in `SCULPTOR_REQUEST.md` plus modular variants (`arch_bottle`, `arch_pipe_run_1m`, `arch_cabinet_file_open`, `arch_drum_burn`, `arch_bed_stripped`), with `placementHints` (`stackable`, `leanable`, `wallMount`, `surface`) in `manifest.json` and `ARCH_CATALOG`.
- **New poses on existing meshes** (metadata only, GLBs byte-identical): `arch_crate_large` / `arch_crate_small` (`tipped`), `arch_couch` (`overturned`), `arch_bed` (`stripped`), `arch_box_large` (`on_side`).
- **Cinder-block wall**: `wall_cinder`, `wall_cinder_dirty`, `wall_cinder_ash` (64 px, 1.0 m/tile, seam-checked).
- **Decal Atlas B (`arch_decals_b.png`, 512 × 256, 8 × 4 cells of 64 px)**: 27 floor + vertical wall decals registered in `manifest.arch.decalAtlasB` and `ARCH_DECAL_FRAMES` (`atlas: 'b'`, `wall: true|false`). Use `makeArchFloorDecals(n, { page: 'b' })` for floor decals and `makeArchWallDecals(n)` for vertical wall decals.
- **Previews**: `previews/arch_gapfill_sheet.png`, `previews/arch_cluttered_vignette.png` (36 draw calls, 2697 tris, 0 WebKit errors).
