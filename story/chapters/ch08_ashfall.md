# Chapter 8: Ashfall

*Act 3 · season `nuclear_winter` · January, Year 2 · level id(s): ch08_ashfall*

## Summary

January, Year 2. Nuclear winter arrives: fallout rain, then ash, −10 °C by day. Braith digs his Air Force mask out of his deployment bag (has_gas_mask) and seals the shelter with plastic and tarp (shelter_sealed). Husks, still-living people who are sick and freezing, walk in the ash, and pairs of Tallmen follow them. Then the horror turns: a tall shape goes into the Henleys' unsealed house, and the next morning Dale Henley is standing in his kitchen, facing the wall, with no breath in the cold, saying 'Morning, neighbor' on a loop. The Tallmen don't just feed on warmth; they keep what's left. From here on, every knock at the door is a question: a freezing person who needs help, or a Hollow wearing someone's voice? Wraith can tell. She whines at the sick and growls at the wrong. Carly runs the door. Lolo keeps a notebook. If the people winter at Galena, the Annex control cards go in.

## Goals

- The mask.
- Seal the shelter (HUD SEAL).
- Braith's hand (Ames).
- Strangers at the door.
- Lolo's list.
- Filters: Boone or the Annex cache.
- Annie's greenhouse (q_annie_greenhouse).
- Install the control cards (if wintering at Galena).

## NPCs

Carly, Lolo, Ames, Deshawn, Boone, Annie, Rosa, Pete Lund (as a husk), Mo, Darlene, Ruth, the Night Owl, Brother Amos, the Bike Kids.

## Key beats

- The mask from the bag. Filters load in (FILTER on the HUD).
- Seal: break-ins and broken windows lower SEAL. Sealed buildings leak less heat, and the Tallmen pass them by.
- A husk at the truck: talk him down (kindness>=4) or fight. It may be Pete Lund.
- Strangers at the door from Sun Valley: share filters or not.
- Lolo's notebook: the people she helped die. Wes is on the 'if it comes to it' page if he's with you, wounded.
- Ames saves the hand if the hospital got power.
- Deshawn's clean cistern (if Pruitt lived).
- Boone's filters: test them. About half are expired. Expose him and Kessler shoots him.
- A tall shape entering the Henleys' unsealed house.
- The Henley kitchen (ch08_henley_house): Dale facing the wall, no breath, 'Morning, neighbor.' First Hollow (enc_ch08_hollow_first). Reyne (if with you): 'They keep what's left.'
- Midnight at the sealed door (ch08_door): 'Let me in, I have filters' in the voice of a woman asleep in the garage. Wraith growls. Open it, check the slot for breath, or wait for dawn (enc_ch08_door_mimic).

## Choices & consequences

| Choice | Consequence |
|---|---|
| Open the door / share filters | filters_shared, kindness, column_size later. |
| The midnight knock: open / check the slot / wait | mimic_let_in (column_size −1 in Ch9), assimilated_killed, assimilation_discovered. |
| Lolo's list: confront / let it be | lolo_alive (false if trust.lolo<=-1 after the list), wes_crossed_off. |
| Boone: test / expose | boone_filters_tested, boone_exposed. |

## Flags

assimilation_discovered, mimic_let_in, assimilated_killed, wraith_mimic_warned, has_gas_mask, shelter_sealed, ch08_hand_saved, husks_talked_down, pete_lund_recovered, filters_shared, lolo_list_seen, wes_crossed_off, pruitt_cistern, boone_filters_tested, boone_exposed, cards_installed. End of chapter: ross_alive, lolo_alive.

## Level notes (for Cartographer)

Level ch08_ashfall: shelter interiors with 10–20 people; doors and windows matter (SEAL). Tallmen ≤2 active, hunting husks; Hollows knock and call from the ash. Act III palette: ashfall blue-grey; render a breath plume on every living NPC (the Hollow tell).

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch08_ashfall`
- **Season:** `nuclear_winter` (January – late February, Year 2). Palette: ashfall blue-grey, near-monochrome; floodlight cones and flare red are the only warm colors.
- **Date / weather / temperature:** January, Year 2; `fallout_rain`; -10 °C, night -18 °C. Time of day: grey_day, night.
- **Survival focus:** warmth, radiation, filters, seal, dread. HUD unlocks: filter, seal.

**Locations**

- `loc_sparks_block`: Braith and Carly's block, old Sparks near Prater Way. HUD SECTOR 4. Lolo's clinic, Gil's garage, the Pruitts.
- `loc_meadows_general`: Truckee Meadows General Hospital (fictional). Dr. Ames. Parking ramp level 3 tanker.
- `loc_sparks_yard`: Union Pacific yard, Sparks. Convoys; Boone's back door; Remnant base in Act III.
- `loc_sparks_library`: Sparks library on Pyramid Way. Annie's seed library; glass atrium greenhouse (Act III).
- `loc_galena_station`: Galena Station geothermal plant (fictional, at the Steamboat field): well field, steam, break room, control room, fence and lamp line.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `husk` ×6
- `feral_dog` ×5
- `looter` ×3: Hospital
- `remnant_patrol` ×4: Sparks yard, if bridge_choice=open
- `assimilated_human` ×2: Hollows: the Henley house, the midnight door; knock and call from the ash
- `assimilated_animal` ×2: Assimilated dogs in the ash; silent
- `tallman` ×2: Pairs following husks; visit unsealed houses at night

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch08_husk`: husk×1. A sick man. Not a monster.
- `enc_ch08_hollow_first`: assimilated_human×1. FIRST Hollow: Dale Henley in his kitchen (ch08_henley_house). Interior, flashlight only. Sets up the paranoia.
- `enc_ch08_door_mimic`: assimilated_human×1. Only if the player opens the door to the midnight knock (ch08_door). Close quarters in the hallway; SEAL drops while open.

**Traders**

- `trader_boone` (SSgt. Tyrell Boone): loc_sparks_yard. Trades canned_food (MREs), mask_filter, rifle_ammo, dosimeter; wants cigarettes, whiskey, silence, diesel_jug. Rep flag `trader_boone_rep`. Hook: About half his Act III filters are expired (boone_filters_tested reveals it). Expose him to Ruiz (boone_exposed) and Kessler shoots him; his stock drops as loot.
- `trader_annie` (Annie Tran): loc_rscc_registry (Ch2 table), loc_sparks_library (Ch3+). Trades seeds, antibiotics, iodide_tablets, books, grow lights, vet_kit; wants batteries, wire, glass, labor, stories. Rep flag `trader_annie_rep`. Hook: Promise a heat line to the library atrium (Ch8). Pays off in the Warm Room epilogue.
- `trader_mo` (Maureen 'Mo' Kessinger): loc_mustang_truckstop. Trades diesel_jug, gas_can, tire chains, sled parts; wants mechanic labor, parts, canned_food. Rep flag `trader_mo_rep`. Hook: Fix her transfer pump for standing credit (+3 rep, free diesel). With Darlene (darlene_with_mo) she survives Act III.

**Ambient NPCs**

- `amb_darlene` (Darlene Okoye-Pratt): Stranded long-haul trucker with a reefer trailer of frozen chicken off USA Parkway.
- `amb_brother_amos` (Brother Amos): Street preacher at the Virginia Street bridge who counts the dead aloud.
- `amb_ruth` (Ruth Calloway): Retired second-grade teacher running a class on yoga mats in the convention center ('FRACTIONS (FOOD)').
- `amb_bike_kids` (The Bike Kids): A pack of 12-year-olds on bikes who run notes between houses, later for the Switchboard.
- `amb_night_owl` (The Night Owl): Anonymous radio voice reading the names of the missing every night. Radio only.

**Set pieces**

- Fallout rain over Sparks
- Seal the shelter: plastic/tarp over windows (sets shelter_sealed; HUD SEAL). Break-ins and broken windows lower SEAL. Sealed buildings leak less heat: Tallmen pass them by.
- Husk at the truck (Wraith whines: a real, sick person)
- A tall shape entering the Henleys' unsealed house
- The Henley kitchen: first Hollow (enc_ch08_hollow_first)
- Midnight knock: a mimic at the sealed door (enc_ch08_door_mimic)

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- None scripted in this chapter. Real Tallmen from Ch7 on.

**Items placed or awarded**

`iodide_tablets`, `mask_filter`, `med_kit`, `antibiotics`, `water_clean`, `wool_blanket`, `diesel_jug`, `batteries`, `canned_food`

**Start inventory:** `mask_filter`×6, `iodide_tablets`×2

**Player actions:** exposure_management, seal_shelter, scavenge, talk_down, moral_choice, trade

**Dialogue scenes** (in order)

- `ch08_mask` @ `loc_sparks_block`: Chapter start. Fallout rain. Braith digs out his Air Force mask (sets has_gas_mask via hooks).
- `ch08_seal` @ `loc_sparks_block`: Seal the shelter (seal_shelter event; sets shelter_sealed).
- `ch08_husk` @ `loc_sparks_block`: A husk at your truck in the fallout rain (talk-down possible).
- `ch08_henley_house` @ `loc_sparks_block`: Morning after a tall shape entered the Henleys' unsealed house. First discovery of assimilation (enc_ch08_hollow_first).
- `ch08_door` @ `loc_sparks_block`: Strangers at the sealed door (real). Then, past midnight, a mimic knocks (enc_ch08_door_mimic).
- `ch08_lolo_list` @ `loc_sparks_block`: Lolo's clinic. A notebook left open.
- `ch08_ames_hand` @ `loc_meadows_general`: Frostbite in Braith's right hand. Ames (if power_priority=hospital, he's ready).
- `ch08_deshawn` @ `loc_sparks_block`: If pruitt_alive: Deshawn's cistern. *(conditional)*
- `ch08_boone_filters` @ `loc_sparks_yard`: Boone's back door, Act III (trader). Some of his filters are expired.
- `ch08_annie_greenhouse` @ `loc_sparks_library`: Annie's library atrium (q_annie_greenhouse).

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
