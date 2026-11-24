# Credits

All third-party assets used in these art-direction mockups are CC0 or CC-BY as listed below.
Local copies live under `assets/`. Original zip archives are kept in `assets/downloads/` for provenance.

## 3D models

### Kenney — City Kit (Industrial) 2.0 — CC0 1.0
- Author: Kenney (www.kenney.nl)
- Source: https://kenney.nl/assets/city-kit-industrial
- Mirror used: https://opengameart.org/content/city-kit-industrial
- File: `assets/downloads/kenney_city-kit-industrial_2.0.zip`
- License: Creative Commons CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/)
- Used: industrial building modules, water tower, chimney, tanks, shipping containers (`assets/kenney/industrial/`)

### Kenney — City Kit (Roads) 2.2 — CC0 1.0
- Author: Kenney (www.kenney.nl)
- Source: https://kenney.nl/assets/city-kit-roads
- Mirror used: https://opengameart.org/content/city-kit-roads
- File: `assets/downloads/kenney_city-kit-roads_2.2.zip`
- License: CC0 1.0
- Used: construction cones/barriers/fence, dumpster, electricity poles, street lights, traffic light, road signs (`assets/kenney/roads/`)

### Kenney — Blaster Kit 2.1 — CC0 1.0
- Author: Kenney (www.kenney.nl)
- Source: https://kenney.nl/assets/blaster-kit
- Mirror used: https://opengameart.org/content/blaster-kit
- File: `assets/downloads/kenney_blaster-kit_2.1.zip`
- License: CC0 1.0
- Used: `blaster-f.glb` as the first-person viewmodel (`assets/kenney/blaster/`)

### tevy — Burnt-Out Sedan v1 (LOD1) — CC0 1.0
- Author: tevy
- Source: https://tevy.dev/models/wrecked-sedan
- File: `assets/tevy/wrecked-sedan-lod1.glb` (from https://tevy.dev/models/wrecked-sedan/v1/lod1.glb)
- License: CC0 1.0
- Used: wrecked car in the mid-ground of the street

### Quaternius — Zombie Apocalypse Kit (Zombie) — CC0 1.0
- Author: Quaternius
- Pack page: https://quaternius.com/packs/zombieapocalypsekit.html
- Model listing: https://poly.pizza/m/VlXjG0N8Eg (Public Domain / CC0)
- File: `assets/quaternius/zombie.glb` (from https://static.poly.pizza/c4002f69-6979-42e8-ad6e-2f4e14fc3a9d.glb)
- License: CC0 1.0
- Used: mutant/zombie enemy (Punch animation pose)

## Textures

### Poly Haven — CC0 1.0
- Source / license: https://polyhaven.com/license (all Poly Haven assets are CC0)
- API: https://api.polyhaven.com/files/{id}
- 1K JPG maps (diffuse, GL normal, roughness, ARM) stored under `assets/polyhaven/`:
  - `road_damaged` — https://polyhaven.com/a/road_damaged
  - `dirt` — https://polyhaven.com/a/dirt
  - `rust_coarse_01` — https://polyhaven.com/a/rust_coarse_01
  - `rusty_metal` — https://polyhaven.com/a/rusty_metal
  - `rusty_corrugated_iron` — https://polyhaven.com/a/rusty_corrugated_iron
  - `dirty_concrete` — https://polyhaven.com/a/dirty_concrete
  - `asphalt_snow` — https://polyhaven.com/a/asphalt_snow
  - `snow_02` — https://polyhaven.com/a/snow_02
  - `red_brick` — https://polyhaven.com/a/red_brick

## 2D / HUD

### knekko — The Major Guy — CC0 1.0
- Source: https://opengameart.org/content/the-major-guy
- File: `assets/oga/faces/toughguyfaces.png` (and cropped HUD faces beside it)
- License: CC0
- Used: status-bar face in the Retro Doom-style mockup (art_D)

### Ragnar Random — FPS Weapon Sprites — CC0 1.0
- Source: https://opengameart.org/content/fps-weapon-sprites
- File: `assets/downloads/fps_weapon_sprites.zip`
- License: CC0 (sprites by Ragnar Random, derivative of works by Quaternius)
- Note: shotgun frames were downloaded as a fallback viewmodel; the rendered mockups use the Kenney 3D blaster.

### HorrorMovieRei — Husk Mutant — CC0 1.0
- Source: https://opengameart.org/content/husk-mutant
- File: `assets/downloads/husk_mutant.zip` and `assets/oga/husk/`
- License: CC0
- Note: kept as a CC0 mutant sprite reference; the rendered enemy is the Quaternius 3D zombie.

### Nmn — Monster mutant for FPS game — CC0 1.0
- Source: https://opengameart.org/content/monster-mutant-for-fps-game
- File: `assets/oga/hindring_paletted.png`
- License: CC0
- Note: downloaded as an alternate retro mutant sheet; not composited into the final screenshots.

## Palettes

### ENDESGA — Endesga 32 — CC0
- Source: https://lospec.com/palette-list/endesga-32
- File: `assets/palettes/endesga-32.json`
- License: CC0 (as listed on Lospec)
- Used: 32-color quantization for Dusty Orange Wasteland (art_A). Toxic Green Night, Nuclear Winter, and Retro Doom palettes are hue/value derivatives of this same CC0 set, applied in the post-process shader.

## Engine / code

- three.js r170 (MIT) — https://github.com/mrdoob/three.js
- Scene, lighting, triplanar weathering, flashlight cone, and post-process shaders (CRT scanlines, film grain, Bayer dither, palette mapping, vignette, color grading, fog) authored for this mockup.

## Post-processing

Art-direction look (internal-resolution pixelation, Bayer dither, CRT scanlines, film grain, vignette, color grading, and Endesga-32 / derived palette mapping) is implemented both as WebGL shaders (`js/shaders.js`) and as an equivalent offline pass (`postprocess.py`) used to produce the 1280×720 screenshots from in-engine WebGL scene captures under `assets/raw/`.

## ASHFALL: Lakehead (portrait game)

Playable first-person survival game in this folder (`index.html`, `js/`). Portrait 9:16, phone-first. Same CC0 / CC-BY asset packs listed above (Kenney, tevy wrecked sedan, Quaternius zombie, Poly Haven PBR, OpenGameArt faces). Additional baked-in HUD faces from `assets/oga/faces/`.

Story text, NPC bible, and branching dialogue under `story/` are by the Loremaster pack (loaded at runtime; this project does not modify those files).

Volumetric lighting, soft shadows, winter grade/palette, and the CRT overlay (barrel warp, scanlines, chroma, vignette) under `render/` are by the Lumen pack, integrated through `js/renderHook.js` via `createRenderPipeline`.

`audio/`, `levels/`, and `systems/` are reserved for the Echoes, Cartographer, and Quartermaster packs. The engine loads JSON / modules from those folders when present and otherwise uses built-in placeholders (`js/data/placeholderStory.js`, `js/audio.js`, `js/levels.js`, `js/systems.js`, `js/config.js`).

WebAudio fallback SFX in `js/audio.js` are synthesized at runtime (no sample packs).



### First-person / world weapons
Viewmodels prefer real CC0 / CC-BY low-poly meshes, scaled and re-oriented in engine. Gameplay names describe a real-world reference from `systems/weapons.json`; they are not manufacturer-licensed replicas.

| In-game | Model | Author | License | Source |
| --- | --- | --- | --- | --- |
| Service 9mm (Glock 17-style) | Glock | CreativeTrio | CC0 1.0 | https://poly.pizza/m/0nDixXrcs0 |
| AR-15 (civilian carbine) | Assault Rifle | Quaternius (Ultimate Guns Pack) | CC0 1.0 | https://poly.pizza/m/Bgvuu4CUMV |
| Service rifle (M4A1) | Assault Rifle (with engine-added Aimpoint-style optic and tan magazine) | Quaternius (Ultimate Guns Pack) | CC0 1.0 | https://poly.pizza/m/Bgvuu4CUMV |
| Pump shotgun (Remington 870-style) | Shotgun Pump West | Pichuliru | CC0 1.0 | https://poly.pizza/m/NfQETBKOiw |
| Deer rifle (Remington 700-style) | Sniper Rifle | Quaternius (Ultimate Guns Pack) | CC0 1.0 | https://poly.pizza/m/ASOMZIErq3 |
| Shop knife (Mora-style) | Hunters Knife | CreativeTrio | CC0 1.0 | https://poly.pizza/m/a2avVUVeYD |
| Lead pipe | Pipe | CreativeTrio | CC0 1.0 | https://poly.pizza/m/03iCPYXZpJ |
| Baseball bat | Baseball Bat | Pichuliru | CC0 1.0 | https://poly.pizza/m/POXTjdMP2c |
| Crowbar | Crowbar | Pichuliru | CC0 1.0 | https://poly.pizza/m/OS8gAoeDtM |
| Fire axe | Fire Axe | Pichuliru | CC0 1.0 | https://poly.pizza/m/0kgjDkCRmx |
| Molotov | Molotov | CreativeTrio | CC0 1.0 | https://poly.pizza/m/jsmWZYqVlM |
| Torch | Wooden Torch | Quaternius | CC0 1.0 | https://poly.pizza/m/pNsfJzhXiD |
| Flashlight (Maglite-style) | Flashlight | Bruno Oliveira | CC-BY 3.0 | https://poly.pizza/m/8t1DZLLvofk |

Original pack pages: CreativeTrio https://poly.pizza/u/CreativeTrio ; Pichuliru https://poly.pizza/u/Pichuliru ; Quaternius Ultimate Guns Pack https://poly.pizza/bundle/Ultimate-Guns-Pack-cpgUfI4t2F and https://quaternius.com/packs/ultimategun.html . Source GLBs (unmodified downloads) live in `assets/downloads/weapons/`. Runtime copies are under `assets/weapons/`. The M4A1 uses the same Quaternius assault-rifle mesh as a base (the Pichuliru “Assault Rifle West” candidate is a skinned rig that would not render reliably here). An Aimpoint-style optic, a short rail, and a tan magazine are added in engine so it reads differently from the civilian AR-15 (A2 front sight, carry handle, black mag, no optic).

No realistic CC0/CC-BY GLB was found for the improvised double-barrel pipe shotgun or the Orion-style road flare; those two (and any failed-load fallbacks) are original multi-part models built to the `real_world_reference` notes. Paper-doll layers under `assets/paperdoll/` remain original 48×96 pixel art in the refined64 palette; the base body is a generic adult in winter gear. HUD portraits are swapped through `CFG.portrait`. Kenney Blaster Kit models are no longer used as viewmodels.
