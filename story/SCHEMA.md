# ASHFALL Story Data: Schema

All files are plain JSON (UTF-8). IDs are `snake_case`. Echo's repo had **no existing dialogue, NPC, quest or flag format**: `/workspace/game2/` is a three.js art-direction mockup. So this schema is new. It's designed to be trivial to interpret in JS.

## Files
| File | What |
|---|---|
| `npcs.json` | 12 interactable NPCs (`npcs[]`), `minor_characters[]`, `generic_speakers{}`, `factions{}` |
| `flags.json` | Every flag: `type`, `default`, `meaning`, `set_in`, `read_in`, `role`. Also `endings[]` and `theo_checkpoint_rule` |
| `items.json` | Story item IDs → description |
| `quests.json` | Quest IDs → title, chapter, stages |
| `gameplay_hooks.json` | Per-chapter hooks: weather, temp, time of day, locations, enemies, set pieces, items, start inventory, scene order, scene conditions, chapter start/end scripts. Also global `enemy_types`, `locations`, `weather_types`, `hud_unlocks` |
| `dialogue/<scene_id>.json` | One scene per file (41 of them) |
| `chapters/chXX_*.md` | Human-readable chapter design docs |
| `validate.py` | Integrity checker (run after any edit) |

## Game state the scripts expect
```js
state = {
  flags:  { kindness: 0, ... },          // defaults from flags.json
  trust:  { theo: 5, marguerite: 2, ... },// npcs.json -> trust.start, clamp to [-10, 10]
  items:  { insulin_vial: 3, ... },        // counts; take clamps at 0
  quests: { q_cooler: "start", ... },
  stats:  { health, warmth, satiety, hydration, stamina, radiation } // = systems/survival.json
}
```

## Dialogue scene
```json
{
  "id": "ch01_marguerite_porch",       // == filename
  "chapter": "ch01",
  "location": "loc_east_end",          // key in gameplay_hooks.locations
  "trigger": "Interact with Marguerite on her porch.",   // human note for wiring
  "trigger_conditions": [ ... ],       // optional; also see gameplay_hooks.chapters[].scene_conditions
  "speakers": ["marguerite", "dell", "narrator"],
  "start": "start",
  "on_end": [ ...effects ],            // optional; run when any end node finishes
  "nodes": [ Node, ... ]
}
```

### Node: exactly ONE of `next` | `choices` | `branches` | `end`
```json
{ "id": "m3", "speaker": "marguerite", "text": "≤140 chars, usually ≤90",
  "effects": [ ... ],                  // optional, applied on ENTERING the node
  "choices": [ Choice, ... ] }         // or
  "next": "m4"                          // or
  "branches": [ {"conditions":[...], "next":"a"}, {"next":"fallback"} ]  // auto-route: first match wins; last is the fallback
  "end": true
```
- `speaker`: an npc id, a minor character id, `dell` (player), or `narrator` (no portrait).
- Show a choice only if its `conditions` pass. Suggestion: hide locked choices; `validate.py` warns if every choice in a node is conditional.

### Choice
```json
{ "text": "[Give her the gas can]",     // ≤44 chars. [brackets] = action, otherwise Dell's spoken line
  "next": "give",
  "conditions": [ ... ],                // optional, AND
  "effects":    [ ... ] }               // optional, applied when picked (before entering next)
```

### Conditions (a list = AND)
| Form | Meaning |
|---|---|
| `{"flag":"x","eq":true}` | ops: `eq ne gt gte lt lte`. For enums, compare strings; an unset enum is `null` |
| `{"trust":"wren","gte":3}` | NPC trust |
| `{"item":"insulin_vial","gte":1}` | inventory count |
| `{"stat":"warmth","lt":30}` | survival stat |
| `{"any":[c1,c2]}` | OR |
| `{"not":c}` | NOT |
| `{"count_true":["a","b","c"],"gte":2}` | count of truthy flags |

### Effects (a list, in order)
| Form | Meaning |
|---|---|
| `{"set":"flag","value":v}` | set bool, int, or enum |
| `{"add":"flag","value":n}` | int add. `{"add":"f","value_from":"g"}` adds another flag's value |
| `{"trust":"npc","delta":n}` | trust change (clamped) |
| `{"give":"item","qty":n}` / `{"take":"item","qty":n}` | inventory |
| `{"quest":"q_id","state":"start|update|complete|fail","stage":"..."}` | quest log |
| `{"stat":"warmth","delta":-10}` | survival stat delta (stat names = systems/survival.json: health, warmth, satiety, hydration, stamina, radiation) |
| `{"if":[conds],"then":[effects],"else":[effects]}` | conditional |
| `{"event":"name", ...}` | engine hook, see below |

### Engine events (Echo implements)
| Event | Params | Meaning |
|---|---|---|
| `encounter` | `id` | Start a combat or set-piece encounter. IDs: `enc_ch01_watch_standoff`, `enc_ch02_crush`, `enc_ch03_fire_defend`, `enc_ch03_fire_rescue`, `enc_ch05_compact_attack`, `enc_ch05_ironwood_turn`, `enc_ch05_crossfire`, `enc_ch06_escape_house`, `enc_ch06_harbor_retaliation`, `enc_ch08_husk`, `enc_ch09_picket_assault`, `enc_ch10_gate_battle`. Enemy composition is in `gameplay_hooks.json`. Resume the dialogue at `next` after the encounter resolves |
| `minigame` | `id` | `mg_jumper_bridge` (Ch6). `mg_black_start` is triggered by gameplay, not dialogue (Ch4) |
| `search_inventory` | `confiscate[]` | Checkpoint search animation |
| `time_skip` | `hours` | Fade |
| `npc_death` | `npc` | Remove the NPC from the world |
| `hud_unlock` | `hud` | Show a HUD meter (`radiation`, Ch7) |
| `set_theo_side_from_location` | | Set `theo_side` to the faction whose area he's found in (`harbor` at docks, `compact` with Cody's cell, `authority` with Ironwood/Guard). Echo picks the area by highest `rep_*` |
| `play_epilogue` | | Run scene `ch10_epilogue` |

## Chapter flow (gameplay_hooks.json)
1. On chapter load: apply `chapter_start_effects` (Ch1 initializes all defaults explicitly, too).
2. Scenes in `scenes[]` are listed in narrative order. Wire each to its `trigger` (an NPC interact, or entering a location). Skip a scene if its `scene_conditions[scene]` fail.
3. On chapter completion: apply `chapter_end_effects`. These hold the Theo insulin checkpoints (Ch3, Ch7, Ch9) and the death checks (Ch6).
4. Endings: `ch10_final` sets `ending` directly. `flags.json → endings` mirrors the exact conditions for UI and debugging.

## Writing constraints (portrait)
Node text ≤140 chars (most are ≤90). Choices ≤44 chars. `validate.py` warns past those limits.

## Compatibility with Echo's `js/story.js` (as of 2026-11-23, 1:58 PM PST)
Echo's loader already reads this format: array nodes, `next`, `branches`, `effects`, `conditions`, `endings.json`, and `gameplay_hooks.json → quests[]`. These are the gaps between it and the data:
1. **Condition ops:** flag conditions use `gt`, `lt`, `lte` in addition to eq/ne/gte. Trust uses `lt` and `lte` (e.g. `ch06_theo_side`, Ch6/Ch7 end scripts). Item uses `lt` (Theo checkpoint). Today, unknown ops fall through as `!!v` or `true`.
2. **`count_true`** (used in the `ch10_final` Warm Room branch and `endings.json`) and **`not`** are not handled. Today `count_true` returns `true`, which makes the good ending too easy.
3. **`{"if":...,"then":...,"else":...}`** effects (chapter scripts, `ch01_theo_night`/`ch08_marguerite_list` on_end) and **`value_from`** (Ch9 column size) are not handled.
4. Scene-level **`on_end`** isn't read by `normalizeDialogue`.
5. The ending is set via `{"set":"ending","value":"end_..."}` (→ `flags.ending`). Echo's loader also stores `e.ending` as `flags.final_ending`, so read `flags.ending`.
6. Events beyond `npc_death` and `search_inventory` (`encounter`, `minigame`, `time_skip`, `hud_unlock`, `set_theo_side_from_location`, `play_epilogue`) need handlers.
7. Speaker id `cpl_haas` is used (Echo's loader already aliases `haas`).
