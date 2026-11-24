# ASHFALL: Story Package (`/workspace/game2/story/`)

The narrative for Echo's first-person, portrait, pixel-art survival game. Everything here is data plus docs. Nothing outside `story/` was touched.

**Start here:** `story_bible.md` (premise, tone, factions, outline, endings) → `SCHEMA.md` (how to load) → `gameplay_hooks.json` (what to build per chapter).

## Layout
```
story/
  story_bible.md          premise, tone (dark but hopeful), setting, protagonist, timeline, factions, 3-act arc, chapter table, endings
  SCHEMA.md               data formats + engine contract
  README.md               this file
  npcs.json               12 NPCs + minor characters + factions
  flags.json              92 flags (type/default/meaning/where set/read) + 5 endings with exact conditions
  endings.json            5 endings in the shape Echo's loader expects ({title, body}) + conditions
  items.json, quests.json story item and quest IDs (items aligned with systems/items.json)
  gameplay_hooks.json     per-chapter: weather, temp, time, locations, enemies, set pieces, items, scene order, scripts
  chapters/ch01..ch10_*.md  chapter design docs, each with a "Gameplay hooks" section
  dialogue/*.json         41 branching scenes (Ch1–2 fully playable; key scenes for Ch3–10 + epilogue)
  validate.py             integrity check: JSON, node links, flags/items/quests/NPCs/locations/enemies, line lengths, reachability
  authoring/              Python scripts that generated the JSON (optional; build_all.sh regenerates and overwrites)
```

## Loading (minimal JS sketch)
```js
const scene = await (await fetch(`story/dialogue/${id}.json`)).json();
const nodes = Object.fromEntries(scene.nodes.map(n => [n.id, n]));
let node = nodes[scene.start];
function enter(n){ apply(n.effects); render(n); }
// next → enter(nodes[n.next]); branches → first whose conditions pass;
// choices → filter by conditions, on pick apply(choice.effects) then enter(nodes[choice.next]);
// end → apply(scene.on_end)
```
`check(conds)` and `apply(effects)` are ~60 lines total; their semantics are in SCHEMA.md.

## Validate after edits
```
python3 story/validate.py          # 0 errors, 0 warnings at handoff
```
Editing JSON by hand is fine. Just don't run `authoring/build_all.sh` afterwards, because it would overwrite your edits.

## Connections to Echo's mockups
- The mockup HUD strings are canon: **SECTOR 4** = Dell's block (an Authority zone number); **ROUTE 9** = the Authority's convoy route (Ch5); **TEMP / SEAL / FILTER / RAD / HP** map to stats; **ASHFALL** is the title.
- The art-style progression follows the acts: Dusty Orange (Act I–II autumn and summer) → the brown-sky transition in Ch7 → Cold Nuclear Winter (Ch8–10). Toxic Green Night (NV) fits the Ch5 and Ch6 night ops.
- Kenney industrial and road assets fit the Twin Ports: grain elevators, ore docks, water towers, containers, power poles. The wrecked sedan works for Ch8's husk scene.
- The mockup's mutant/zombie models (Quaternius zombie, Husk Mutant sprite) should be re-dressed as **husks**: sick, under-dressed humans (T-shirts in the snow, hair loss). They aren't monsters, and they appear only from Ch8.
