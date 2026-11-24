# ASHFALL Story Data: Schema (Revision 2)

All files are plain JSON (UTF-8). Ids are `snake_case`. The format is the same one `js/story.js` already loads. Revision 2 changes the **content** (new ids; see `MIGRATION_V1_TO_V2.md`), not the shape, except for the additions marked **v2**.

## Files
| File | What |
|---|---|
| `npcs.json` | `npcs[]` (15 main NPCs with trust), `minor_characters[]`, **v2** `ambient_npcs[]` (10), **v2** `traders[]` (6), `generic_speakers{}`, `factions{}` (incl. **v2** `annex`), `trust_scale` |
| `flags.json` | Every flag: `type`, `default`, `meaning`, `set_in`, `read_in`, `role`. Also `endings[]` and `pearce_family_modifier` |
| `endings.json` | `endings[id] = {title, body, tone, conditions, priority}` (5 endings) |
| `items.json` | Story item ids → description |
| `quests.json` | Quest ids → title, chapter, desc, stages |
| `gameplay_hooks.json` | Global `enemy_types` (incl. **v2** `assimilated_human`, `assimilated_animal`), **v2** `encounters` (27), `locations`, `quests`, `weather_types`, `hud_unlocks`, **v2** `seasons`, **v2** `timeline`, **v2** `assimilation`, **v2** `companion` (Wraith), **v2** `barter`; and per-chapter `chapters[]` |
| `dialogue/<scene_id>.json` | One scene per file (89) |
| `chapters/chNN_*.md` | Chapter design docs (one per chapter; the "Gameplay hooks" section is generated) |
| `authoring/*.py` | Generators for everything above. `authoring/build_all.sh` rebuilds and validates |
| `validate.py` | Integrity checker. Must report 0 errors, 0 warnings |
| `MIGRATION_V1_TO_V2.md` | Old → new id map, removed ids, per-team action lists, the retired-terms table |

## Game state the scripts expect
```js
state = {
  flags:  { kindness: 0, wraith_alive: true, tallmen_killed: 0, ... }, // defaults from flags.json
  trust:  { carly: 4, wraith: 5, ross: 1, ... },  // npcs[].trust.start, clamped to [-10, 10]
  items:  { mech_tools: 1, ... },                   // counts; take clamps at 0
  quests: { q_water: "start", ... },
  stats:  { health, warmth, satiety, hydration, stamina, radiation }  // = systems/survival.json
}
```
- **Trust exists only for `npcs[]` ids** (including `wraith`, `ross`, `wes`, `reyne`). Ambient NPCs, traders and minor characters have **no trust**; they use int flags: `lusk_rep`, `haas_rep`, `trader_<id>_rep`. `validate.py` rejects trust on any other id.

## Dialogue scene
```json
{
  "id": "ch01_lolo_porch",            // == filename
  "chapter": "ch01",
  "location": "loc_sparks_block",     // key in gameplay_hooks.locations
  "trigger": "Interact with Lolo on her porch.",   // human note for wiring
  "trigger_conditions": [ ... ],      // optional; also see chapters[].scene_conditions
  "speakers": ["narrator", "lolo", "braith"],      // every node speaker is listed
  "start": "start",
  "on_end": [ ...effects ],           // optional; run when any end node finishes
  "nodes": [ Node, ... ]
}
```

### Node: exactly ONE of `next` | `choices` | `branches` | `end`
```json
{ "id": "m3", "speaker": "lolo", "text": "≤140 chars, usually ≤90",
  "effects": [ ... ],                 // optional, applied on ENTERING the node
  "choices": [ Choice, ... ] }        // or
  "next": "m4"                        // or
  "branches": [ {"conditions":[...], "next":"a"}, {"next":"fallback"} ]  // first match wins; last is the fallback
  "end": true
```
- `speaker`: any id in `npcs[]`, `minor_characters[]`, `ambient_npcs[]`, `traders[]` or `generic_speakers` (incl. `braith` = the player, `narrator` = no portrait).
- Show a choice only if its `conditions` pass. Every choice list has at least one unconditional option (the validator enforces it).

### Choice
```json
{ "text": "[Give him the gas can]",   // ≤44 chars. [brackets] = action; otherwise Braith's spoken line
  "next": "give",
  "conditions": [ ... ],              // optional, AND
  "effects":    [ ... ] }             // optional, applied when picked (before entering next)
```

### Conditions (a list = AND)
| Form | Meaning |
|---|---|
| `{"flag":"x","eq":true}` | ops `eq ne gt gte lt lte`. Enums compare strings; an unset enum is `null` |
| `{"trust":"kit","gte":3}` | NPC trust (`npcs[]` ids only) |
| `{"item":"flare","gte":1}` | inventory count |
| `{"stat":"warmth","lt":30}` | survival stat |
| `{"any":[c1,c2]}` | OR |
| `{"not":c}` | NOT |
| `{"count_true":["a","b","c"],"gte":2}` | count of truthy flags |

### Effects (a list, in order)
| Form | Meaning |
|---|---|
| `{"set":"flag","value":v}` | set bool, int or enum |
| `{"add":"flag","value":n}` | int add. `{"add":"f","value_from":"g"}` adds another flag's value |
| `{"trust":"npc","delta":n}` | trust change (clamped) |
| `{"give":"item","qty":n}` / `{"take":"item","qty":n}` | inventory |
| `{"quest":"q_id","state":"start|update|complete|fail","stage":"..."}` | quest log |
| `{"stat":"warmth","delta":-10}` | survival stat delta |
| `{"if":[conds],"then":[effects],"else":[effects]}` | conditional |
| `{"event":"name", ...}` | engine hook, below |

### Engine events
| Event | Params | Meaning |
|---|---|---|
| `encounter` | `id` | Start a combat or set-piece encounter. Ids and enemy composition: `gameplay_hooks.encounters` (27). Resume the dialogue at `next` when it resolves |
| `minigame` | `id` | `mg_black_start` (Ch4, triggered by gameplay; listed in `chapters[ch04].minigames`) |
| `search_inventory` | `confiscate[]` | Checkpoint search animation |
| `time_skip` | `hours` | Fade |
| `npc_death` | `npc` | Remove the NPC (sets `<npc>_alive=false`). Not used by v2 data; deaths are flags. Never for `wraith` outside `ch09_wraith_hold` |
| `hud_unlock` | `hud` | Show a HUD element (`gameplay_hooks.hud_unlocks`: `hp`, `hydration`, `hunger`, `companion` Ch1; `warmth`, `temp` Ch3; `ammo_military` Ch5, `rad` Ch7, `filter` + `seal` Ch8) |
| `play_epilogue` | | Run scene `ch10_epilogue` |

## Chapter flow (`gameplay_hooks.json → chapters[]`)
1. On chapter load, apply `chapter_start_effects` (Ch1 initializes all defaults explicitly; Ch8 sets `has_gas_mask`).
2. `scenes[]` is in narrative order. Wire each to its `trigger`. Skip a scene if `scene_conditions[scene]` or its `trigger_conditions` fail.
3. On completion, apply `chapter_end_effects` (death checks for Kit/Avila/Gil and Carly leaving at Ch6; Augie and `pearce_reconciled` at Ch7; Ross and Lolo at Ch8; Walt, Wes and Kit at Ch9). **There are no medical-clock checkpoints.**
4. `levels[]` lists the level files for a chapter. **Ch7 has two** (`ch07_dead_air`, `ch07b_dixie_valley`); `level_split` says which locations live in which file.
5. Per chapter, **v2** keys: `traders[]`, `ambient_npcs[]` (must match `npcs.json` chapters; validated), `tallman_glimpses[]` (non-interactable; each `on_show` adds 1 to `tallman_glimpses`), and for Ch10 `siege` (`skip_night1_if`, `night3_single_side_if`).
6. Endings: `ch10_final` sets `ending` directly. `flags.json → endings` and `endings.json` mirror the exact conditions.

## Seasons and weather (**v2**, `gameplay_hooks.json`)
Every `chapters[]` entry carries:

| Key | Type | Meaning |
|---|---|---|
| `season` | enum `late_summer` \| `autumn` \| `late_fall` \| `nuclear_winter` | Season band. Fixed: Ch1–2 `late_summer`, Ch3–4 `autumn`, Ch5–7 `late_fall`, Ch8–10 `nuclear_winter` (validated) |
| `date` | string | In-world date, e.g. `"Day 3 (Wed Aug 26, Year 1)"` |
| `weather` | `weather_types` id | Weather at chapter start; must be allowed by the season (validated) |
| `weather_late` / `weather_after_bursts` | `weather_types` id, optional | Mid-chapter change (Ch8 `ashfall`; Ch7 `brown_sky` after the bursts) |
| `temp_c` / `night_temp_c` | int °C | Day / night temperature; `temp_c` must be inside the season's range (validated) |
| `survival_focus` | string[] | Which survival pressures the chapter leans on (`hydration`, `heat`, `dust`, `fuel`, `warmth`, `filters`, `dread`...) |

Top-level blocks:
- `seasons{season: {chapters[], months, temp_c[lo,hi], night_temp_c[lo,hi], weather[], survival, palette, notes}}`.
- `timeline{}`: anchor dates (`day_0` = Sun Aug 23 Year 1, `annex_diesel_out` = Day 16 Tue Sep 8, `bursts` = Day 104 Sat Dec 5) and one line per chapter.
- `weather_types[]`: `heat_haze`, `dust_wind`, `clear_autumn`, `autumn_wind`, `frost`, `overcast`, `sleet`, `freezing_rain`, `brown_sky`, `grey_snow`, `fallout_rain`, `ashfall`, `blizzard`, `clear_cold`.
- `hud_unlocks`: `hydration` from Ch1 (late summer is a hydration/heat game); `warmth` + `temp` from Ch3.

| Season | Ch | Temp °C (day / night) | Weather | Palette |
|---|---|---|---|---|
| `late_summer` | 1–2 | 32–36 / 15–18 | `heat_haze`, `dust_wind` | warm amber dust, white sun glare, heat shimmer |
| `autumn` | 3–4 | 12–16 / 4–6 | `clear_autumn`, `autumn_wind` | autumn gold, yellow cottonwoods |
| `late_fall` | 5–7 | −1–2 / −3 | `sleet`, `overcast`, `frost`, `brown_sky` | overcast slate grey |
| `nuclear_winter` | 8–10 | −40 to −10 / −45 to −18 | `fallout_rain`, `ashfall`, `blizzard` | ashfall blue-grey; floodlight cones and flare red only |

## Assimilated enemies: the Hollows (**v2**, Ch8–10)
- `enemy_types.assimilated_human`: display "Hollow". `code_kind: "mimic"` (fallback `husk` behavior if the engine has no mimic kind). Carries `tells[]` and `voice_lines[]` for audio barks.
- `enemy_types.assimilated_animal`: display "Hollow (animal)". `code_kind: "dog"`. Silent pack movement.
- Both have `first_chapter: "ch08"` and may appear only in Ch8–10 (validated). The ids `assimilated_human` / `assimilated_animal` match `systems/enemies.json`.
- `assimilation{}`: `in_world_term`, `tells{wraith, breath, voice, gait, light}`, `flags[]`, `encounters[]`, `scenes[]`, `foreshadow[]`, `count_rule`.
- New encounters: `enc_ch08_hollow_first` (human ×1), `enc_ch08_door_mimic` (human ×1), `enc_ch09_hollow_ambush` (human ×2), `enc_ch09_animal_pack` (animal ×5), `enc_ch10_hollow_prowlers` (human ×2 + animal ×3).
- New flags: `assimilation_discovered` (bool), `mimic_let_in` (bool; Ch9 start `column_size −1`), `assimilated_killed` (int, separate from `tallmen_killed`, never a total), `wraith_mimic_warned` (bool), `ch09_voice_followed` (bool; `column_size −1`).
- **Husks are not Hollows.** `husk` stays a separate, non-hostile-by-default enemy type that can be talked down.

## Hard story rules (validated where possible)
- **Wraith** dies only in `dialogue/ch09_wraith_hold`, via `[Order Wraith to hold the line]` plus a plain-language confirmation. `validate.py` errors if any other file sets `wraith_alive=false` or fires `npc_death` for her. At 0 HP elsewhere she is *down* (`wraith_injured`), never dead.
- **Tallmen count is unknown.** Nothing states a total. `tallmen_killed` (int) and `den_killed` (bool) ease the Ch10 siege: skip night 1 if `den_killed` or `tallmen_killed >= 2`; night 3 from one side if `den_killed` and `tallmen_killed >= 3`. Never more than 3 visible; never a horde.
- **No medical mechanic** of any kind.
- **Retired v1 terms** (table in `MIGRATION_V1_TO_V2.md`) may not appear in any other story file.
- **Late summer means late summer.** `validate.py` errors on cold-weather words (snow, frost, winter, cold, coat, gloves, sleet, freezing, shiver, October...December/January/February) in any Ch1–2 dialogue line, choice or trigger, and in `chapters/ch01*`/`ch02*` docs.
- **Hollow count is unknown,** like the Tallmen. `assimilated_killed` counts kills; nothing states how many exist.

## Writing constraints (portrait 9:16)
Node text ≤140 chars (most ≤90). Choices ≤44 chars. `validate.py` warns past those limits, on unreachable nodes, on a last branch with conditions, and on all-conditional choice lists.

## Notes for `js/story.js`
- `pickDialogue()` hides ids containing "night" during the day and "morning" at night. That's intended for `ch03_night_owl`, `ch10_siege_night1..3` and `ch01_wraith_morning`.
- `startingTrust()` should also skip `ambient_npcs`/`traders` (they have no `trust`), and speaker lookup should include `ambient_npcs`, `traders` and `generic_speakers`.
- Read encounter compositions from `gameplay_hooks.encounters` instead of the hard-coded table.
