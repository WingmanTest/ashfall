# Chapter 3: The Long Cold

*Act 1 · season `autumn` · Day 50 (Mon Oct 12, Year 1) · level id(s): ch03_the_long_cold*

## Summary

Day 50: Monday, October 12. Crisp high-desert autumn: fourteen degrees by day, near freezing at night, yellow cottonwoods along the Truckee. People start worrying about fuel and heat for the first time. Wes rides into Sparks on a dirt bike with a letter from Ross and a cooler of beef: come home. Gil's garage burns in the night and Carly goes in first. Augie's transmitter on Peavine needs a mechanic, and in the shack Braith meets Walt Okada, who ran Galena Station for 22 years and knows it can be restarted with outside power. Carly finds the falsified stores sheets. Something crosses the road in the dawn fog.

## Goals

- Wes arrives (ross_letter).
- Survive the fire night (enc_ch03_fire_defend / fire_rescue).
- Reach Peavine; fix Augie's transmitter (q_find_walt).
- Meet Walt; start q_black_start.
- Decide who learns about Galena.

## NPCs

Wes, Carly, Gil, Kit, Augie, Walt, Rourke (trader), Darlene, the Night Owl (radio), Brother Amos, Deputy Lusk, the Bike Kids.

## Key beats

- Dirt bike in the dust. Wes is funny, reckless and angry Braith left. He stays a week or goes home with a reply.
- Kit at the back door (only if trust.kit>=3): 'They're coming for Gil's diesel tonight.'
- The fire: Carly does the rescuing. Gil burned badly if nobody helps.
- Rourke on the Peavine road with three burros, selling whiskey and stories.
- Augie's shack: the transmitter, the lies he tells to keep people calm, and Walt.
- Night: Carly finds the falsified sheets.
- The Night Owl reads the names of the missing every night.
- Darlene's reefer trailer of frozen chicken; help her and she remembers.

## Choices & consequences

| Choice | Consequence |
|---|---|
| Who learns about Galena: Authority / Floor / Compact (via Wes) / no one | dam_secret_told; authority → ch04_standoff, compact → Ross knows in Ch5. |
| Send Wes home or let him stay | ch03_wes_stayed; trust.wes. |
| Go out during the fire | ch03_helped_gil / gil_badly_burned → gil_alive at the end of Ch6. |

## Flags

wes_met, ch03_wes_stayed, ch03_kit_warned, kit_scouted_known, gil_house_burned, ch03_helped_gil, gil_badly_burned, augie_met, augie_lie_known, walt_recruited, walt_secret_known, dam_secret_told, carly_found_count, rourke_met, darlene_helped, tallman_glimpses.

## Level notes (for Cartographer)

Level ch03_the_long_cold: half the houses dark, chimney smoke. Two fog glimpses plus a non-figure track line. Goats missing (blamed on the Viaduct Crew).

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch03_the_long_cold`
- **Season:** `autumn` (October, Year 1). Palette: autumn gold, yellow cottonwoods along the Truckee, long shadows.
- **Date / weather / temperature:** Day 50 (Mon Oct 12, Year 1); `clear_autumn`; 14 °C, night 4 °C. Time of day: day, night, dawn.
- **Survival focus:** first_cold_nights, fuel, fire. HUD unlocks: warmth, temp.

**Locations**

- `loc_sparks_block`: Braith and Carly's block, old Sparks near Prater Way. HUD SECTOR 4. Lolo's clinic, Gil's garage, the Pruitts.
- `loc_peavine_shack`: Augie's radio shack under the repeater towers on Peavine Peak.
- `loc_rscc_registry`: Reno-Sparks Convention Center: registry, ration hall, Annie's table, Ruth's class; Avila's command post in Ch6.
- `loc_tric_warehouses`: Industrial-center warehouses east of Sparks. Ch5 convoy staging; Darlene's reefer trailer.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `bridge_boy` ×6: Viaduct Crew; flee at 50% losses; warning shots work
- `watch_militia` ×3: Peavine road patrol; talk past with ration_card

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch03_fire_defend`: bridge_boy×6. Two waves (4+2); flee at 50% losses.
- `enc_ch03_fire_rescue`: hazard / scripted. house_fire heat hazard; carry Gil out.

**Traders**

- `trader_rourke` (Wendell Rourke): loc_peavine_shack (Ch3), loc_i80_blockade (Ch5), loc_us50_fallon (Ch7), river_ice camp (Ch9). Trades whiskey, candles, maps, tea, reloading supplies, rumor; wants stories, rumor, salt. Rep flag `trader_rourke_rep`. Hook: Get his burros through the Ch5 canyon; reward: the Annex rumor (annex_known).
- `trader_annie` (Annie Tran): loc_rscc_registry (Ch2 table), loc_sparks_library (Ch3+). Trades seeds, antibiotics, iodide_tablets, books, grow lights, vet_kit; wants batteries, wire, glass, labor, stories. Rep flag `trader_annie_rep`. Hook: Promise a heat line to the library atrium (Ch8). Pays off in the Warm Room epilogue.

**Ambient NPCs**

- `amb_darlene` (Darlene Okoye-Pratt): Stranded long-haul trucker with a reefer trailer of frozen chicken off USA Parkway.
- `amb_bike_kids` (The Bike Kids): A pack of 12-year-olds on bikes who run notes between houses, later for the Switchboard.
- `amb_night_owl` (The Night Owl): Anonymous radio voice reading the names of the missing every night. Radio only.
- `amb_brother_amos` (Brother Amos): Street preacher at the Virginia Street bridge who counts the dead aloud.
- `amb_deputy_lusk` (Deputy Cal Lusk): Off-duty Washoe sheriff's deputy in pajama pants and a uniform jacket; runs the block watch and the marina water line.

**Set pieces**

- Gil's garage burning in the dark
- Peavine switchbacks in the first cold wind; yellow cottonwoods along the Truckee

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- `glimpse_ch03_fog`: Edge of dawn ground fog off the Truckee by the Sparks yard, ~150 m, crossing the road on all fours.  Second-act glimpses get closer but stay distant.
- `glimpse_ch03_tracks`: Not a figure: a line of too-long tracks crossing the road; Wraith growls at nothing.  Decal only; tracks fade in 60 s.

**Items placed or awarded**

`firewood`, `wool_blanket`, `boots_insulated`, `hand_radio`, `batteries`, `rifle_ammo`, `ross_letter`, `mech_tools`, `rumor`, `whiskey`, `candles`

**Player actions:** night_defense_or_rescue, cold_traverse, repair, dialogue, trade

**Dialogue scenes** (in order)

- `ch03_wes_arrives` @ `loc_sparks_block`: Chapter start. A dirt bike in the dust, mid-morning.
- `ch03_kit_warning` @ `loc_sparks_block`: Night. Kit at the back door (if trust.kit >= 3). *(conditional)*
- `ch03_gil_fire` @ `loc_sparks_block`: Gil's garage catches fire (enc_ch03_fire_*).
- `ch03_night_owl` @ `loc_sparks_block`: Radio, late night, any night in Ch3+ (hand_radio). *(conditional)*
- `ch03_rourke_road` @ `loc_peavine_shack`: On the Peavine road: a man with burros (trader).
- `ch03_augie_peavine` @ `loc_peavine_shack`: Reach Augie's radio shack on Peavine Peak.
- `ch03_carly_count` @ `loc_rscc_registry`: Carly finds the falsified stores sheets (night, after shift).
- `ch03_plant_secret` @ `loc_sparks_block`: Decide who learns about Galena Station.
- `ch03_darlene_camp` @ `loc_tric_warehouses`: Ambient: the stranded trucker at her reefer trailer.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
