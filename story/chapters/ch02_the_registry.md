# Chapter 2: The Registry

*Act 1 · season `late_summer` · Day 19 (Fri Sep 11, Year 1) · level id(s): ch02_the_registry*

## Summary

Day 19: Friday, September 11. Still late summer: ninety-one degrees, dust, hot wind off the desert. The Truckee Meadows Recovery Authority has a checkpoint on the Virginia Street bridge, a ration hall in the convention center and a registry. Captain Avila wants Braith's hands in her motor pool and offers an essential-worker card (priority_card: extra rations and a travel pass). Carly takes a registry job because she believes counting saves people. The line surges in the heat and people go down. Leaving Meadows General at dusk, Wraith stops dead and stares at the east ridge. Something tall stands on the skyline for two seconds.

## Goals

- Cross the checkpoint (Cpl. Haas).
- Register with Avila; earn the essential-worker card (q_essential_card).
- See Carly at the registry desk.
- Survive the crush (enc_ch02_crush).
- Ames at Meadows General; optional diesel job (q_hospital_diesel).
- Home at dusk (the first glimpse).

## NPCs

Avila, Carly, Kit, Augie (crank radio in the line), Ames, Cpl. Haas, Rosa, Annie (trader), Dutch (trader, optional), Lonnie, Ruth, Brother Amos.

## Key beats

- Haas at the bridge: a dog joke, a bag search, cigarettes (haas_rep).
- The line: Augie's crank radio (KK7AUG, three versions of the war), Lonnie singing for food, Kit lifting ration cards.
- Avila's desk: the card, the price, and the real number, 41 days of food, not the one on the board.
- Carly at the registry: back her or argue.
- The crush: pull Mateo out for Rosa (ch02_crush_helped).
- Annie's seed-and-book table; Ruth's class on yoga mats; Dutch's pawn shop for the brave.
- Ames: the hospital's tanker is empty. Bring diesel and he remembers.
- Dusk, hospital exit: glimpse_ch02_ridge. No HUD cue, no sting.

## Choices & consequences

| Choice | Consequence |
|---|---|
| Report Gil's diesel to fast-track the card | ch02_reported_gil → Gil's fire in Ch3, gil_knows_report in Ch6, Lusk turns hostile. |
| Cover for Kit in the line | ch02_covered_kit → ch03_kit_warned; trust.kit toward the Ch9 sled. |
| Back Carly's registry job or argue | ch02_backed_carly, carly_job, trust.carly; shapes her Ch6 side. |
| Tell Carly the real count | carly_count_doubt → she finds the falsified sheets in Ch3. |

## Flags

ch02_registered, ch02_card_secured, ch02_reported_gil, ch02_covered_kit, ch02_avila_truth, ch02_exposed_numbers, ch02_crush_helped, rosa_met, carly_job, ch02_backed_carly, carly_count_doubt, augie_heard, lonnie_fed, annie_met, dutch_met, ames_trade_hinted, haas_rep, tallman_glimpses.

## Level notes (for Cartographer)

Level ch02_the_registry: rename the three location ids; replace the old objective flag with ch02_card_secured; keep ch02_crank_radio and ch02_crush_kid. Densest crowd level in the game. Add a distant east ridge on the backdrop for the glimpse trigger at the hospital exit.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch02_the_registry`
- **Season:** `late_summer` (late Aug – mid Sep, Year 1). Palette: warm amber dust, white sun glare, heat shimmer.
- **Date / weather / temperature:** Day 19 (Fri Sep 11, Year 1); `dust_wind`; 33 °C, night 15 °C. Time of day: day, dusk.
- **Survival focus:** hydration, heat, crowds, dust. HUD unlocks: none new.

**Locations**

- `loc_virginia_bridge`: Virginia Street bridge over the Truckee. Authority checkpoint (Cpl. Haas).
- `loc_rscc_registry`: Reno-Sparks Convention Center: registry, ration hall, Annie's table, Ruth's class; Avila's command post in Ch6.
- `loc_meadows_general`: Truckee Meadows General Hospital (fictional). Dr. Ames. Parking ramp level 3 tanker.
- `loc_fourth_street`: 4th Street motel row and Silver State Pawn (Dutch). Viaduct Crew turf. Marsh's motel (Ch6).

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `authority_guard` ×6: Neutral
- `looter` ×3: Parking ramp squatters (q_hospital_diesel); can be talked off

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch02_crush`: hazard / scripted. Crowd crush hazard; timed escape.

**Traders**

- `trader_dutch` (Dutch Albertson): loc_fourth_street. Trades tools, guns, cigarettes, stolen meds, ammo_9mm; wants batteries, ammo, jewelry, rumor. Rep flag `trader_dutch_rep`. Hook: If trader_dutch_rep<=-1 he sells your Galena route to the Viaduct Crew (ch04_dutch_ambush).
- `trader_annie` (Annie Tran): loc_rscc_registry (Ch2 table), loc_sparks_library (Ch3+). Trades seeds, antibiotics, iodide_tablets, books, grow lights, vet_kit; wants batteries, wire, glass, labor, stories. Rep flag `trader_annie_rep`. Hook: Promise a heat line to the library atrium (Ch8). Pays off in the Warm Room epilogue.

**Ambient NPCs**

- `amb_lonnie` (Lonnie Vance): Silver Spur lounge singer in a gold sequined jacket, singing Sinatra in the ration line for crackers.
- `amb_brother_amos` (Brother Amos): Street preacher at the Virginia Street bridge who counts the dead aloud.
- `amb_ruth` (Ruth Calloway): Retired second-grade teacher running a class on yoga mats in the convention center ('FRACTIONS (FOOD)').

**Set pieces**

- Ration-line crush (enc_ch02_crush)
- Dusk ridge glimpse at the hospital exit

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- `glimpse_ch02_ridge`: East ridge, ~600 m, single upright silhouette on the skyline.  FIRST glimpse. Scene ch02_ridge_glimpse plays the reaction.

**Items placed or awarded**

`ration_card`, `priority_card`, `cigarettes`, `hospital_diesel`, `antibiotics`, `med_kit`, `batteries`, `ammo_9mm`

**Player actions:** dialogue, queue_timeskip, timed_escape, explore_hospital, trade

**Dialogue scenes** (in order)

- `ch02_haas_checkpoint` @ `loc_virginia_bridge`: Approach the Virginia Street bridge checkpoint.
- `ch02_augie_radio` @ `loc_rscc_registry`: Pass the man with a crank radio in the ration line.
- `ch02_lonnie_line` @ `loc_rscc_registry`: Ambient: the singer in the ration line.
- `ch02_kit_line` @ `loc_rscc_registry`: In the ration line: Kit lifting ration cards.
- `ch02_annie_table` @ `loc_rscc_registry`: Annie's seed-and-book swap table by the registry hall doors (trader).
- `ch02_avila_registry` @ `loc_rscc_registry`: Reach the registry desk.
- `ch02_carly_desk` @ `loc_rscc_registry`: Talk to Carly at her registry table.
- `ch02_crush` @ `loc_rscc_registry`: Set piece: the ration line surges (enc_ch02_crush).
- `ch02_ruth_class` @ `loc_rscc_registry`: Ambient: Ruth teaching kids in the convention hall corner.
- `ch02_ames_hospital` @ `loc_meadows_general`: Find Dr. Ames in the hospital hallway.
- `ch02_ames_diesel_return` @ `loc_meadows_general`: Return to Ames with hospital_diesel. *(conditional)*
- `ch02_dutch_pawn` @ `loc_fourth_street`: Optional: Silver State Pawn on 4th Street (trader).
- `ch02_ridge_glimpse` @ `loc_meadows_general`: Leave the hospital at dusk (tallman_glimpse, east ridge). Wraith stops.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
