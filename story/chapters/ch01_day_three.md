# Chapter 1: Day Three
**Act I: The Dark** · Oct 17 · Superior, WI (SECTOR 4) · Dialogue: `dialogue/ch01_*.json`

## Summary
Three days without power. People still mostly treat it like a snow day. Kids bike in the street, someone grills everything in their freezer, rumors fly. Dell's problem is small and urgent: Theo has one open vial of insulin plus two spares. The spares need to stay cool, and the pharmacy on Belknap was broken into last night.

## Goals
1. Wake up and talk with Theo (tutorial: move, look, interact).
2. Build a lake-water cooler for the insulin (tutorial: scavenge + craft). Optional, but it sets `ch01_cooler_built`.
3. Get fuel or a power source: Ray's garage (trade) or the gas can in your car.
4. Check on Marguerite. Mr. Pruitt's oxygen concentrator is dying.
5. Go to Belknap Pharmacy at dusk for insulin.
6. Get home before dark (curfew is self-imposed; the block watch has rifles).

## Locations
`loc_east_end` (home, Marguerite's porch, Ray's garage, the alley) → `loc_belknap_pharmacy`

## NPCs present
theo, marguerite, ray, wren · minor: pruitt (offscreen)

## Key beats
1. **Morning.** Theo jokes about "unlimited screen-free time." He's scared. The fridge smells. → `ch01_theo_morning`
2. **The cooler.** Basement, a picnic cooler, lake water hauled in buckets. Theo helps if you ask (+trust).
3. **Marguerite's porch.** Mr. Pruitt (84, home oxygen) needs a generator. Marguerite knows Dell has a full gas can in her car. → `ch01_marguerite_porch`
4. **Ray's garage.** His generator hums. He's selling fuel for tools, cash, or guns. Dell's lineman tools are worth a lot to him. → `ch01_ray_garage`
5. **Belknap Pharmacy at dusk.** The glass is smashed. Inside, Wren is filling a bag, and a block-watch guy is coming up the street with a deer rifle. → `ch01_wren_pharmacy`
6. **Night.** Candles. Theo asks if they'll be okay. → `ch01_theo_night`

## Choices & consequences
| Choice | Flags | Now | Later |
|---|---|---|---|
| Give gas can to Pruitt | `ch01_fuel_to_pruitt`, kindness+1 | No fuel for you, so you need Ray or the cooler | `pruitt_alive` → Ch6 hide the Pruitts → Ch8 Deshawn's clean cistern |
| Trade lineman tools to Ray | `ch01_ray_traded` | Diesel jug, Ray trust+2 | Ch4: you need Hank's tools instead (slower black start) |
| Pharmacy: let Wren go (`left_note`) / split (`took_one`) / take her bag (`took_all`) / call the watch (`called_watch`) | `ch01_pharmacy_choice`, `ch01_wren_let_go` | Insulin count varies | Wren's trust → Ch3 warning → Ch9 sled |

## Flags
- **Set:** `ch01_cooler_built`, `ch01_fuel_to_pruitt`, `ch01_ray_traded`, `ch01_pharmacy_choice`, `ch01_wren_let_go`, `kindness`
- **Read:** none (first chapter)
- **Chapter-end script:** `pruitt_alive = ch01_fuel_to_pruitt`

## Gameplay hooks
- **Player does:** explore the block, scavenge (candles, canned food, buckets, lake water), craft `lake_cooler`, trade at Ray's, sneak or talk through the pharmacy.
- **Enemies (people only):** 1 `looter` inside the pharmacy (Wren, non-hostile unless attacked); 1 `watch_militia` (block watch, hostile only if you run with drugs or draw a weapon).
- **Items:** `insulin_vial` (start 1 open + 2), `gas_can`, `lineman_tools`, `diesel_jug`, `canned_food`, `candles`, `bucket`, `pharmacy_bag`.
- **Weather/time:** overcast, 6 °C, morning → dusk. TEMP isn't a threat yet. Hunger is introduced. No RAD/FILTER on the HUD yet (hidden until Act III).
- **Tutorial:** move/look, interact, inventory, craft, dialogue.
