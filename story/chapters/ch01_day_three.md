# Chapter 1: Day Three

*Act 1 · season `late_summer` · Day 3 (Wed Aug 26, Year 1) · level id(s): ch01_day_three*

## Summary

Day 3 after the storm: Wednesday, August 26. Late summer in Sparks, ninety-five by noon, dust on the wind, no AC, every fridge on the block dead. Carly comes home after 70 hours on a dying dispatch floor. The water pressure is failing in the heat, so Braith and Wraith haul water from the Sparks Marina and boil it. Wraith learns to track by finding old Mr. Pruitt, who wandered off to feed the ducks. Lolo needs clinic supplies, and the Prater Way pharmacy is already being looted at dusk by a girl named Kit. Braith has one can of gas and three places it could go. At night, windows open for any breeze, the phone finally plays a voicemail from Day 0: his father, Ross, cut off mid-sentence.

## Goals

- Talk to Carly (ch01_carly_home).
- Feed Wraith first (companion tutorial; +trust.wraith).
- Get water running: q_water (water_dirty → boil → water_clean).
- Check on Lolo; find Mr. Pruitt with Wraith's TRACK (q_find_pruitt).
- Decide the gas can (ch01_gas_choice).
- Pharmacy at dusk for Lolo's clinic (q_clinic_supplies).
- Home before dark: the voicemail.

## NPCs

Carly, Wraith, Lolo, Gil, Kit, Mr. Pruitt, Deshawn (mentioned), Deputy Cal Lusk (ambient), the Bike Kids (ambient).

## Key beats

- Morning kitchen: Carly home, grey and wired. She makes a joke a second after the bad news. Braith decides nothing yet.
- Wraith in the yard: feed her before yourself and she remembers (trust.wraith).
- The marina water line run by Deputy Lusk. Bucket, shore, boil. Lusk is a decent man getting scared.
- Lolo on her porch: Mr. Pruitt is missing and his oxygen concentrator needs power. She gives Braith the scarf (pruitt_scarf).
- Wraith tracks Pruitt to the irrigation canal (ch01_scarf_found).
- Gil's garage: siphoned Maverik diesel, a trade for Braith's flight-line tools.
- Dusk, the pharmacy: Kit with a backpack and a knife she doesn't want to use.
- Night: the voicemail. 'Come home, both of you, before—' The playable family stake begins here.

## Choices & consequences

| Choice | Consequence |
|---|---|
| Gas can: Pruitt's concentrator / the house generator / keep it for the drive to Yerington | ch01_gas_choice; pruitt survives Act I only if fuel goes to him (pruitt_alive at chapter end). 'drive' changes Wes's opening lines in Ch3. |
| Pharmacy: share with Kit / take everything / leave a note | ch01_pharmacy_choice, ch01_kit_let_go, trust.kit. Covering for Kit in Ch2 builds the Ch3 warning and the Ch9 sled. |
| Trade tools to Gil | ch01_gil_traded; ch01_knows_gil_siphoned feeds the Ch2 'report Gil' choice. |

## Flags

ch01_gas_choice, ch01_fuel_to_pruitt, pruitt_alive, ch01_pharmacy_choice, ch01_kit_let_go, ch01_scarf_found, ch01_voicemail_heard, ch01_gil_traded, ch01_knows_gil_siphoned, lusk_rep, trust.carly, trust.wraith, trust.kit, trust.lolo, trust.gil.

## Level notes (for Cartographer)

Level ch01_day_three: rename the two location ids; repurpose ch01_cooler_station as ch01_water_station (boil/store); ch01_lake_edge becomes the marina shore. Remove the old pharmacy medicine loot. Add Wraith spawn and follow nav, a scent-trail interactive, Carly at home, a phone/voicemail interactive and 10–15 ambient neighbors. Late-summer heat: grills, kids on bikes, open windows, the block watch, dust haze.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch01_day_three`
- **Season:** `late_summer` (late Aug – mid Sep, Year 1). Palette: warm amber dust, white sun glare, heat shimmer.
- **Date / weather / temperature:** Day 3 (Wed Aug 26, Year 1); `heat_haze`; 35 °C, night 18 °C. Time of day: morning, dusk, night.
- **Survival focus:** hydration, heat, spoiled_food, dust. HUD unlocks: hp, hydration, hunger, companion.

**Locations**

- `loc_sparks_block`: Braith and Carly's block, old Sparks near Prater Way. HUD SECTOR 4. Lolo's clinic, Gil's garage, the Pruitts.
- `loc_sparks_marina`: Sparks Marina lake. Ch1 water run (interactive ch01_lake_edge).
- `loc_prater_pharmacy`: Corner pharmacy on Prater Way. Looted Day 2.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `looter` ×1: Kit; non-hostile unless attacked
- `watch_militia` ×2: Deputy Lusk + 1; hostile only if you run with drugs or draw

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch01_watch_standoff`: watch_militia×2. Wraith steps in front; ends if you holster or run.

**Traders**

- None in this chapter.

**Ambient NPCs**

- `amb_deputy_lusk` (Deputy Cal Lusk): Off-duty Washoe sheriff's deputy in pajama pants and a uniform jacket; runs the block watch and the marina water line.
- `amb_bike_kids` (The Bike Kids): A pack of 12-year-olds on bikes who run notes between houses, later for the Switchboard.

**Set pieces**

- Marina water line
- Wraith's scent trail to the canal
- Looted pharmacy at dusk
- The voicemail

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- None scripted in this chapter.

**Items placed or awarded**

`gas_can`, `mech_tools`, `diesel_jug`, `canned_food`, `candles`, `bucket`, `water_dirty`, `water_clean`, `pruitt_scarf`, `pharmacy_bag`, `flashlight`

**Start inventory:** `gas_can`×1, `mech_tools`×1, `canned_food`×3, `candles`×2, `bucket`×1, `flashlight`×1

**Interactives:** `ch01_water_station`, `ch01_lake_edge`, `ch01_phone`

**Player actions:** explore, scavenge, companion_track, boil_water, trade, dialogue, stealth_optional

**Dialogue scenes** (in order)

- `ch01_carly_home` @ `loc_sparks_block`: Game start. Kitchen, morning. Carly comes in the back door.
- `ch01_wraith_morning` @ `loc_sparks_block`: Interact with Wraith in the yard (companion tutorial).
- `ch01_marina_water` @ `loc_sparks_marina`: Reach the shore at the Sparks Marina (ch01_lake_edge).
- `ch01_lolo_porch` @ `loc_sparks_block`: Interact with Lolo on her porch.
- `ch01_pruitt_found` @ `loc_sparks_block`: Wraith's scent trail ends at the irrigation canal behind the block. *(conditional)*
- `ch01_gil_garage` @ `loc_sparks_block`: Interact with Gil in his garage.
- `ch01_block_ambient` @ `loc_sparks_block`: Walk the block mid-day (ambient barks; any order).
- `ch01_kit_pharmacy` @ `loc_prater_pharmacy`: Enter the Prater Way pharmacy at dusk (for Lolo's clinic supplies).
- `ch01_voicemail` @ `loc_sparks_block`: Night. Home. After the pharmacy. Chapter end.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
