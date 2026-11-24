# ASHFALL: Lakehead, level data (`/workspace/game2/levels/`)

There is one JSON level per story chapter (10 in total). Each level is a 2 m tile grid plus placed entities. Everything here is data. No engine, story, systems or asset files were modified.

```
levels/
  README.md                 this file
  schema.json               JSON Schema (draft 2020-12) for a level file
  id_registry.json          level-owned ids (scripted set pieces) + offline fallback ids
  ch01_day_three.json ... ch10_the_warm_room.json
  previews/chXX_*.png       top-down maps rendered from the JSON
  tools/
    validate.py             schema + assets + reachability + story/systems cross-checks (run this)
    render_preview.py       JSON -> previews/*.png
    build_levels.py         authoring source the JSON was generated from (+ levelkit.py helpers)
    make_schema.py, make_registry.py, build_all.sh
```

```bash
python3 levels/tools/validate.py            # expect: 10/10 levels pass  (VERBOSE=1 lists warnings)
python3 levels/tools/render_preview.py      # re-render PNGs after hand edits
```
You can edit the JSON by hand. **Don't run `build_all.sh` / `build_levels.py` afterwards**, because they regenerate and overwrite the JSON.

## Format choice

The engine (`js/world.js`) has **no level loader or level format**. Its world is one hard-coded street: buildings, props, loot, NPC positions and fires all live in `World.build()`. `index.html` currently points to `js/game.js`, which doesn't exist yet, so the engine is mid-rewrite. Rather than invent conflicting conventions, this format **adopts the engine's existing conventions exactly** so that Echo can feed it to the code that already exists:

| Engine convention (world.js / enemies.js / config.js) | Level format |
|---|---|
| 1 unit = 1 m (`CFG.walk` 3.15 m/s, `eyeH` 1.62) | `units: "meters"` |
| +x = right/east, forward = **-z**, y up, flat ground at y=0 | same. North/top of every map = -z, so the player starts at the bottom and walks "up" |
| `rotation.y` radians (three.js) | `rotY` (PI faces -z/north, 0 faces +z/south, -PI/2 east, +PI/2 west) |
| props placed with `fitHeight(obj, h)` then `position.set(x,0,z)` | prop `{asset, x, z, rotY, h, collide}`; `h` = target height for `fitHeight` |
| AABB colliders `{minX,maxX,minZ,maxZ}` | solid tiles merge into AABBs (snippet below); props with `collide:true` push `boxOf()` |
| `pbr(name)` loads `assets/polyhaven/<name>/<name>_{diff,nor,rough}_1k.jpg` | legend `floorTex` / `wallTex` are those Poly Haven names |
| loot spot `{id,x,z,r,items,label,taken}` | loot `{id,x,z,r,label,container,location,guaranteed[]}`; roll `items` from `systems/loot_tables.json` |
| `EnemySystem.spawn(kind,x,z)` kinds husk / raider / dog | enemy `type` = `systems/enemies.json` id; use its `code_kind` for `spawn()` |
| `_addFire(scene,x,z,id)`, fire radius 3.4 m | `safeZones` of kind `campfire` / `burn_barrel` |
| `setSky(timeOfDay, blizzard)`, 0 night, .25 dawn, .5 noon, .75 dusk | `environment.timeStart/timeEnd`, `set_time` action |
| `LOCATIONS` `{x,z}` used for HUD place names | `locations[]` with id, centre and rect |
| `CFG.maxEnemies` | `encounters[]` (zones with waves), capped at min(6, systems `chapter_curve.max_concurrent`) |

The ids come from the other packages: **enemies, items and containers come from `systems/`** (Quartermaster). **Area/location ids, dialogue scene ids, NPC ids and weather ids come from `story/`** (Loremaster). Levels decide only **where** things go and **when** they activate. No stats are defined here.

## Coordinates and the grid

```
grid.origin = world (x,z) of the NW corner of cell (col 0, row 0)
cell (c, r) spans  x = [ox + c*cs, ox + (c+1)*cs],  z = [oz + r*cs, oz + (r+1)*cs]      (cs = cellSize = 2 m)
cell centre       x = ox + (c+0.5)*cs,             z = oz + (r+0.5)*cs
tiles[r][c]       row 0 is the north edge (most negative z); the last row is the south edge (player start side)
```
All entity coordinates are **world meters** (not cells), so they plug straight into `position.set(x,0,z)`. Every map is laid out so the player starts near z ≈ 0..+8 (like the current engine street) and progresses toward -z.

### Tile legend (each level embeds the legend entries it uses)
| char | name | walk | solid | height m | render hint |
|---|---|---|---|---|---|
| `.` | snow_ground | ✓ | | 0 | floor `snow_02` |
| `g` | dirt_gravel | ✓ | | 0 | floor `dirt` (rail yards, trails, Ch7 summer) |
| `=` | road | ✓ | | 0 | floor `asphalt_snow` |
| `r` | road_damaged | ✓ | | 0 | floor `road_damaged` (alleys, lanes) |
| `,` | interior_floor | ✓ | | 0 | floor `dirty_concrete`, `roof:true` (ceiling at wall height) |
| `D` | door | ✓ | | 0 | opening in a wall |
| `G` | locked_gate | ✓* | ✓ | 1.8 | solid until the interactive on that cell sets its flag (Ch6 catwalk gate) |
| `#` | wall | | ✓ | 4 | box, `red_brick` |
| `H` | high_wall | | ✓ | 8 | box, `dirty_concrete` (map edges, abutments, cliffs) |
| `B` | building_mass | | ✓ | 0 | **collision only**; a Kenney building prop stands on it (fallback: draw a `red_brick` box 7 m tall) |
| `f` | fence | | ✓ | 1.3 | `rusty_corrugated_iron`, see-through for AI |
| `c` | cover_low | | ✓ | 1.0 | sandbags/planters; crouch cover (`cover:true`) |
| `x` | debris | | ✓ | 0.9 | `rust_coarse_01` (turbine housings, pylons, tables) |
| `~` | open_water | | | -0.6 | water plane; not walkable |
| `I` | river_ice | ✓ | | 0 | `snow_02` tinted blue |
| `i` | thin_ice | ✓ | | 0 | `hazard:"thin_ice"` (crack/fall sequence) |
| `_` | chasm | | | -8 | void (gorge) |
| `b` | bridge_deck | ✓ | | 0 | `rusty_metal` (deck visuals; engine stays flat) |
| `U` | covered_floor | ✓ | | 0 | roof at 5 m; `blocksAirLOS:true` (drones can't see you: overpasses, under bridges) |
| `T` | tree | | ✓ | 6 | no tree asset; draw a trunk cylinder + cone/billboard |

\* `G` counts as walkable for reachability (the gate is meant to be opened).

## Top-level fields (see schema.json for every property)

| field | meaning |
|---|---|
| `id`, `chapter`, `title`, `act`, `storyFile`, `next`, `summary`, `difficulty` | metadata; `next` = next level id (null for Ch10) |
| `grid` | `cellSize`, `cols`, `rows`, `origin`, `legend`, `tiles` |
| `environment` | `weather` (= hooks chapter weather), optional `startWeather`/`startTempC`, `tempC`, `timeStart`/`timeEnd`/`timeLocked`, `blizzard`, `snowCover`, `particles`, `fogNear/fogFar`, `palette` (assets/palettes/*.json), `warmthDrainMul`, `hud` flags, `mechanics` hints, `transitions[]` (weather changes keyed to trigger ids) |
| `locations[]` | **area ids** with centre and rect. They match `story/gameplay_hooks.json` chapter `locations` ∪ `systems/loot_tables.json` `areas[chXX]` exactly (validated). Ch9 uses `river_ice` for the river stretch |
| `landmarks[]` | labelled points (for map and HUD hints) |
| `paths.critical` / `paths.optional[]` | designer polylines (critical path, optional branches); not used at runtime |
| `spawns.player[]` | `{id,x,z,rotY,when?}`: use the first whose `when` passes |
| `spawns.npcs[]` | `{id, npc (story/npcs.json id), x,z,rotY, behavior, dialogue?, when?, label?, combatProfile?}`. Multiple entries per NPC are variants gated by `when` |
| `spawns.enemies[]` | `{id, type (systems id), x,z, rotY?, group, tier, behavior, patrol[[x,z]..]?, patrolWaitSec?, hostile (always/on_provoke/conditional/never), hostileWhen?, when?, activate (load/trigger), note?}` |
| `spawns.loot[]` | `{id, x,z, r, label, container (systems container_types key), location (area id), guaranteed[{item,n}]?, when?, setsFlag?, filler?}`. Roll contents with Quartermaster's `roll_algorithm`; `guaranteed` = that area's fixed items placed in this container. `filler:true` = auto-placed to meet the area's container budget |
| `props[]` | `{id, asset (path relative to game root), x,z, rotY, h, collide, tag?}` |
| `interactives[]` | `{id, type, x,z, r, label, requiresItems?, requiresFlags?, setsFlag?, sequenceStep?, when?}`. Types used: craft, fill, valve, lever, panel, choice_panel, minigame, balance, repair, vehicle, read, cut, trade, hide_cache, radio, load, light_fire, water_source, rescue, door_choice, ambient_audio |
| `safeZones[]` | `{id, kind (campfire/burn_barrel/indoor/sealed/tent/warm_room), x,z, r, warmth, save, sealed, when?}`: warmth restore, checkpoint save, `sealed` blocks RAD (Act III) |
| `setPieces[]` | `{id, type, path?, area?, when?, note?}`. Types: systems `ironwood_drone/mrap/bradley` + level-owned `armored_plow_truck`, `ied_mrap`, `ice_break_qte`, `house_fire` |
| `encounters[]` | `{id, area, groups[{group, wave}]}`: the enemy activation and cap system (below) |
| `stealth` (Ch6) | `routes[]` (id, label, points, note) + `blindSpots[]` (shape, note): sightline gaps and cover the AI/drone can't see into |
| `triggers[]` | `{id, on (load/enter/exit/interact/flag), once, shape (circle/rect), when?, actions[], note?}` |
| `objectives[]` | `{id, order, text (<=60 chars), optional, completeWhen[], startWhen?}`: completion is flag-driven |

### Conditions (`when`, `hostileWhen`, `completeWhen`, `requiresFlags`)
These use the same shape as `story/dialogue` conditions: a list = AND of `{ "flag": "name", "eq"|"ne"|"gt"|"gte"|"lt"|"lte": value }`. Flag names follow story/flags.json (including `trust.wren`). Level extensions:
- `{ "item": "ration_card", "gte": 1 }` checks the inventory count.
- `{ "any": [cond, cond, ...] }` is an OR.
- `"ne": null` means "flag has been set".
- The engine should set `cleared.<group>` when every member of a group is dead or fled. Waves and some triggers key off this.

### Trigger actions
`dialogue{id}` (story/dialogue scene) · `cutscene{id,text}` · `bark{speaker,text}` · `set_flag{flag,value}` · `activate_group{group}` · `set_time{value 0..1}` · `set_weather{weather,tempC?,blendSec}` · `checkpoint` (save) · `hud_unlock{stat}` · `story_check{id}` (`insulin_check`, `ch01_end_pruitt`, `ch06_death_checks`, `ch09_theo_resolve`, `endings`, all from the chapter docs / flags.json) · `start_sequence{id}` (minigames/QTE/on-rails: `seq_ch02_crush`, `seq_ch04_balance`, `seq_ch05_convoy_ride`, `seq_ch05_cabinet_choice`, `seq_ch06_sweep_timer`, `seq_ch09_thin_ice`) · `push_back` (soft gate: shove the player out of the volume) · `spawn_setpiece{id}` · `teleport{x,z}` · `chapter_end{next}`.

### Encounters and the active-enemy cap
- Every enemy `group` belongs to exactly one encounter zone. **Only the zone containing the player is live**; enemies in other zones stay dormant (not updated), and the engine should despawn or freeze a zone when the player leaves it.
- Inside a zone, groups activate by `activate:"load"` (when the zone goes live) or by an `activate_group` trigger action. A `wave` of 2 or more activates when the previous wave is cleared or fled (`cleared.<group>`). The levels include explicit triggers for this too.
- `validate.py` computes each zone's **peak simultaneous enemies**: the max over waves of the largest set of non-exclusive groups. Groups whose `when` can't both hold (for example `bridge_choice eq held` vs `ne held`, or `convoy_choice eq sabotage` vs `ne sabotage`) aren't summed. The validator fails if the peak is above **min(6, systems chapter_curve.max_concurrent)**, which is 5 for most chapters and 6 for Ch6, 9 and 10. It also fails on overlapping zones, spawns or patrol points outside their zone, and groups with no zone.
- Current peaks: Ch1 1 · Ch2 5 · Ch3 4 · Ch4 4 · Ch5 4 · Ch6 6 · Ch7 4 · Ch8 5 · Ch9 5 · Ch10 4.

## Loader integration (for Echo; no engine edits were made)

```js
// js/levelLoader.js (sketch). Uses helpers that already exist in world.js / enemies.js.
import * as THREE from "three";
import { fitHeight } from "./world.js";

export async function loadLevel(id, { world, enemies, scene, gltf, pbr, flags, inv }) {
  const L = await (await fetch(`./levels/${id}.json`)).json();
  const { cellSize: cs, cols, rows, origin: o, legend, tiles } = L.grid;
  const check = (conds = []) => conds.every((c) => c.any ? c.any.some((x) => check([x]))
      : c.item ? cmp(inv.count(c.item), c) : cmp(getFlag(flags, c.flag), c));

  // 1) Geometry: merge horizontal runs of solid tiles into AABB colliders + one box mesh per run.
  world.colliders.length = 0;
  world.bounds = { minX: o.x, maxX: o.x + cols * cs, minZ: o.z, maxZ: o.z + rows * cs };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; ) {
    const ch = tiles[r][c], t = legend[ch];
    if (!t.solid) { c++; continue; }
    let c2 = c; while (c2 + 1 < cols && tiles[r][c2 + 1] === ch) c2++;
    const minX = o.x + c * cs, maxX = o.x + (c2 + 1) * cs, minZ = o.z + r * cs, maxZ = minZ + cs;
    world.colliders.push({ minX, maxX, minZ, maxZ });
    if (!t.massOnly && t.height > 0) {               // 'B' is collision-only (building prop on top)
      const tex = t.wallTex && (await pbr(t.wallTex));
      const m = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, t.height, cs),
        new THREE.MeshStandardMaterial(tex ? { map: tex.diff, normalMap: tex.nor, roughnessMap: tex.rough } : { color: 0x2e4a34 }));
      m.position.set((minX + maxX) / 2, t.height / 2, (minZ + maxZ) / 2); scene.add(m);
    }
    c = c2 + 1;
  }
  // Floors: group cells by floorTex into InstancedMesh planes (or bake one canvas texture); water '~' / chasm '_' are visual only.

  // 2) Props
  for (const p of L.props) {
    const g = await gltf.loadAsync("./" + p.asset); const obj = g.scene;
    fitHeight(obj, p.h); obj.position.set(p.x, 0, p.z); obj.rotation.y = p.rotY || 0; scene.add(obj);
    if (p.collide) { const b = new THREE.Box3().setFromObject(obj);
      world.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z }); }
  }
  // 3) Player, NPCs (first variant whose `when` passes), fires, loot, interactives
  const spawn = L.spawns.player.find((s) => check(s.when)) || L.spawns.player[0];
  for (const s of L.safeZones) if (s.kind === "campfire" || s.kind === "burn_barrel") world._addFire(scene, s.x, s.z, s.id);
  world.loot = L.spawns.loot.filter((l) => check(l.when)).map((l) => ({ ...l, taken: false,
      items: rollContainer(l.container, l.location, L.chapter, l.guaranteed) }));   // Quartermaster's roll_algorithm
  world.interactives = L.interactives;
  // NPC meshes: reuse world._placeNpcs logic with L.spawns.npcs positions instead of the hard-coded `places` table.

  // 4) Enemies: dormant until their encounter zone is live; activate:"trigger" groups wait for activate_group.
  const SYS = await (await fetch("./systems/enemies.json")).json();
  const kindOf = Object.fromEntries(SYS.enemies.map((e) => [e.id, e.code_kind]));   // raider | dog | husk
  const zoneOf = {}; for (const z of L.encounters) for (const g of z.groups) zoneOf[g.group] = z;
  const live = new Set(L.spawns.enemies.filter((e) => e.activate === "load").map((e) => e.group));
  function tickEncounters(px, pz) {        // call each frame; spawns only inside the player's zone
    const zone = L.encounters.find((z) => inShape(z.area, px, pz));
    for (const e of L.spawns.enemies) {
      if (e._ent || !live.has(e.group) || zoneOf[e.group] !== zone || !check(e.when)) continue;
      e._ent = enemies.spawn(kindOf[e.type] || "raider", e.x, e.z); Object.assign(e._ent, { def_id: e.type, patrol: e.patrol, levelRef: e });
    }
    // despawn/freeze entities whose zone !== zone; set flags["cleared."+group] when a group is all dead/fled
  }
  // 5) Triggers: each frame test shapes (enter/exit), plus on interact and on flag change; honour `once` + `when`.
  //    activate_group -> live.add(group); dialogue -> StorySystem scene id; chapter_end -> loadLevel(next).
  return { L, spawn, tickEncounters };
}
```
`world.locationAt()` can use `L.locations` instead of `config.LOCATIONS`. The `rect` gives exact area membership, which also feeds `loot_tables.json` area modifiers.

## Chapter designs

Every map is portrait-first: a long north-south spine, streets 2–4 cells (4–8 m) wide, and one tall landmark visible straight ahead from the start (water tower, chimneys, elevator heads, the dam's lit windows). Warmth stops are about 30–40 m apart in cold chapters.

| # | Level | Size | Design summary |
|---|---|---|---|
| 1 | `ch01_day_three` | 44×92 m | Tutorial block in Superior's East End. Home (kitchen + basement cooler) → Marguerite's porch → Ray's garage via the back alley *or* the gas can in Dell's car → north up E 5th to Belknap Pharmacy at dusk (Wren in the back room, block-watch patroller on Belknap) → home. A soft gate holds dusk until the porch and fuel beats are done. The water tower is the landmark straight up the street. 1 enemy. |
| 2 | `ch02_the_registry` | 48×120 m | Narrow Blatnik deck over the bay with Cpl. Haas's single-lane checkpoint (chokepoint) → DECC plaza with a serpentine ration queue built from fences (Wren, Lou's crank radio) → registry office (Strand) → the crush escape set piece (exit via the east gate or north) → Lakehead Memorial corridor (Ames). Optional parking-garage branch with 3 looters and the hospital diesel. |
| 3 | `ch03_the_long_cold` | 52×128 m | Night fire at Ray's garage: Bridge Boys in 2 waves (4+2), with Wren's warning at the back door. Then a dawn traverse of the frozen Proctor rail yard: boxcar strings form lanes with gaps, there are 4 burn barrels, and 3 block-watch patrollers (a ration card talks you past). The route climbs a switchback to Lou's shack (Hank). Optional NE branch to the Harbor soup line (Bea). |
| 4 | `ch04_black_start` | 48×128 m | Jay Cooke trail through the trees → a 2 m-wide swinging bridge over the open gorge (balance sequence) → Thomson Dam: Lunds' camp on the powerhouse floor, then the 4-step black start in strict order (headgate wheel on the deck → exciter → synchroscope → breaker) and the feeder choice. Story standoff guards split 4 at the gate + 4 on the headgate deck. Optional river-ice scavengers. |
| 5 | `ch05_route_9` | 44×128 m | Ore docks muster (elevator, Strand, Ruiz at the MRAP) → on-rails convoy ride up ROUTE 9 → Hwy 53 overpass: a logging-truck blockade with a 1-cell gap, Jory's parley, the signal cabinet repair under fire, and Cody under the overpass. The roofed underpass breaks drone line of sight on the sabotage branch. Compact fight in 2 waves (4+4), with Ironwood 4 as the exclusive sabotage branch. The junction switch at Proctor yard is the "divert" option. |
| 6 | `ch06_the_lift_bridge` | 52×144 m | **Stealth chapter, with 12 `ironwood_patrol` in 3 fireteams on patrol loops.** (A) Day sweep in Sector 4: a street walker, a house clearer, a Dell's-house checker and a cordon guard; stealth route S1 runs out the back door, down the back alley (dumpster and hedge cover) and through the cordon gap. (B) Blatnik checkpoint: talk, bribe with `ironwood_id`, or bolt-cut onto the unlit catwalk under the deck (S2). (C) Night Canal Park: a 4-soldier loop staggered half a lap apart, plus 2 bridge-foot sentries and 2 bank walkers. Routes: S3 shop alley → Bea's boat (teleport across) → control house service door; S4 pier crates → crane (blocks the Bradley lane) → east bank flank; S5 fog-run straight through. Five marked blind spots. The held-bridge branch swaps in 6 Harbor + 4 Compact in 2 waves. Peak live: 6. |
| 7 | `ch07_dead_air` | 48×128 m | Summer dirt (no snow). A switchback climb to Lou's shack (dead air, dosimeter, RAD unlocks) → down past deserters → Proctor yard, where the Remnant digs in behind sandbags (hostile only if `ironwood_hostility>=3`). The fenced dog lot holds the **sled**: the first dogs guard it, and flares come from Lou. → East End: Ruiz at the door, sled loading, grey snow, where to winter. Weather: overcast → brown_sky → grey_snow. |
| 8 | `ch08_ashfall` | 52×144 m | Fallout rain: sealed safe zones (home, clinic, hospital corridor, Harbor stores, cistern). Husk at the family's car (talk-down), the strangers at the door, Marguerite's drawer, Deshawn's cistern. → Lakehead Memorial: pharmacy (3 looters, iodide and filters), Ames's surgery. → Ore docks: Harbor stores, the lake intake as the long water option, and Remnant guarding the elevators if the bridge was held. Ashfall transition at the docks. |
| 9 | `ch09_the_long_night` | 44×192 m | Blizzard march up the frozen river, with column escort and headcounts at stop 1 (burn barrel), stop 2 (windbreak), the warming hut (Hank's death) and the gorge fire. At the Hwy 210 picket (4 on the ice + searchlight, 2 reinforce on alarm), take Ruiz's pylon gap (west), the thin-ice detour (east), or fight. Then the ice-break QTE, then the swinging bridge, where the west cliff forces the crossing and the wolves wait. The dam lights and Jory are at the gate. Area ids: `loc_east_end` (start), `river_ice`, `loc_jay_cooke`, `loc_thomson_dam`. |
| 10 | `ch10_the_warm_room` | 48×104 m | Gate parley with Kessler, or the last battle in the snow (Remnant 4+4 in 2 waves, MRAP set piece; zero enemies if a stand-down happens) → the yard and the Lunds' greenhouse branch → the powerhouse floor → the control room table, with every surviving leader seated by `*_alive` and the final choice → epilogue. The blizzard clears to clear_cold. |

## Known gaps and conflicts (as of validation)
- **Hooks vs systems area lists disagree.** In Ch6, hooks list `loc_ore_docks` but systems has no Ch6 area for it; the level adds it as the Harbor pier/boats zone, where Theo's Harbor variant is. In Ch9, systems uses `river_ice` and hooks list `loc_east_end`; the level includes both. The validator requires the union and warns about the disagreement.
- **Missing art:** there are no trees, houses or residential buildings, no lift bridge, crane, boats, trucks, MRAP/Bradley or drone models. Stand-ins: Kenney industrial buildings for houses and shops, chimneys for the lift-bridge towers, `detail-tank` for the crane, containers for logging trucks, the wrecked sedan for the MRAP and plow truck, and `T` tiles drawn procedurally for trees.
- **Story ids not in npcs.json:** generic extras `annie_lund`, `boot_strippers`, `deserter_1/2`, `stranger_mother` and `column` (Pete Lund is `pete_lund`). They draw as generic people.
- **Container budgets:** a few hand-placed story containers are types that aren't in that area's systems budget (VERBOSE=1 lists them, about 15). Guaranteed items match systems exactly.
- **No dialogue yet** for the Ch5 cabinet choice, the Ch6 informant list, the Ch7 deserters or the Ch9 dam gate. These use `cutscene` or `start_sequence` placeholders.
- The engine is flat (no jump or stairs): decks, docks and overpasses are visual, and the "basement" is a ground-floor room.
