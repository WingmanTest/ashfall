# Chapter 10: The Warm Room

*Act 3 · season `nuclear_winter` · Late February, Year 2 · level id(s): ch10_the_warm_room*

## Summary

Late February, Year 2. −34 °C, ash falling. Galena is the brightest heat in the valley, and the Tallmen come for it: patient, probing, never a horde. With them come the Hollows, calling names from past the lamp line in borrowed voices while assimilated animals test the dark edge of every pole. Braith builds the lamp line with the Annex lamp_kit. Three nights compress into one level. Between the second and third night, Kessler's Remnant comes to the gate. Then the control-room vote decides who gets the warmth. The hope is real, and harder won.

## Goals

- Build the lamp line (q_lamp_line).
- Night 1: the test (skipped if you thinned them at Dixie Valley).
- Night 2: the probe.
- Kessler at the gate.
- Night 3: the push.
- The vote (final_choice).

## NPCs

Everyone you saved: Carly, Wraith, Avila, Roz, Ander, Ruiz, Reyne, Kessler, Kit, Lolo, Gil, Ames, Augie, Annie, Lonnie, Ruth, the Bike Kids.

## Key beats

- Night 1, the test: a far lamp goes out, its cable chewed. Repair it while watched. SKIPPED if den_killed or tallmen_killed>=2.
- Night 2, the probe: a Hollow calls from past the north fence in Halvorsen's voice; animal prowlers test the poles (enc_ch10_hollow_prowlers). The cooling-water line under the lights. Clamp it.
- Night 3 voices between the lamps: Halvorsen's, Lolo's, Braith's own calling for Wraith. Nobody answers. That's the rule.
- The gate: Kessler stands down if (ruiz_defected or avila_stance=governor) and ironwood_hostility<5; otherwise enc_ch10_gate_battle. A prisoner Wes is freed here.
- Night 3, the push: at the weakest lit sector. One side only if den_killed and tallmen_killed>=3. Never more than 3 visible; they break off at dawn or after losing 2. Each breach costs a named survivor in the epilogue census.
- The vote: council / Authority / Compact / shut it down / leave.
- Epilogue: the ending, then the Pearce family modifier, then Carly, then Wraith.

## Choices & consequences

| Choice | Consequence |
|---|---|
| final_choice | council → The Warm Room (if conditions met) / authority → The Ledger / compact → Stillwater / shutdown → Dark Water / leave or failed council → Two Coats. |

## Flags

assimilated_killed, wraith_mimic_warned, lamp_line_built, siege_breaches, remnant_stood_down, final_choice, ending, tallmen_killed (read), den_killed (read).

## Level notes (for Cartographer)

Level ch10_the_warm_room: the most people since Ch2. Faction tables, Ruth's school, Lonnie singing. lamp_line_siege set piece.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch10_the_warm_room`
- **Season:** `nuclear_winter` (January – late February, Year 2). Palette: ashfall blue-grey, near-monochrome; floodlight cones and flare red are the only warm colors.
- **Date / weather / temperature:** Late February, Year 2; `ashfall`; -34 °C, night -45 °C. Time of day: night, day, night, night, day.
- **Survival focus:** warmth, light, power, dread. HUD unlocks: none new.

**Locations**

- `loc_galena_station`: Galena Station geothermal plant (fictional, at the Steamboat field): well field, steam, break room, control room, fence and lamp line.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `tallman` ×3: Night 1 (one lamp test), night 2 (probe), night 3 (push). Never more than 3 visible.
- `assimilated_human` ×2: Call names from past the lamp line (enc_ch10_hollow_prowlers)
- `assimilated_animal` ×3: Test the dark edge of each pole
- `remnant_patrol` ×8: Only if no stand-down (enc_ch10_gate_battle)
- `ironwood_mrap` ×1: Same

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch10_siege_n1`: tallman×1. Repair a cut lamp cable while watched. Usually no attack.
- `enc_ch10_siege_n2`: tallman×2. Clamp the cooling-water line under the lights.
- `enc_ch10_hollow_prowlers`: assimilated_human×2, assimilated_animal×3. Siege night 2 (ch10_siege_night2): Hollows call names from past the lamp line; animal prowlers test each pole's dark edge. Night 3 reuses their voice barks between lamps.
- `enc_ch10_siege_n3`: tallman×3. Push on one side (if den_killed and tallmen_killed>=3) or two. Disengage after losing 2 or at dawn.
- `enc_ch10_gate_battle`: remnant_patrol×8, ironwood_mrap×1. Only if the Remnant doesn't stand down.

**Traders**

- `trader_annie` (Annie Tran): loc_rscc_registry (Ch2 table), loc_sparks_library (Ch3+). Trades seeds, antibiotics, iodide_tablets, books, grow lights, vet_kit; wants batteries, wire, glass, labor, stories. Rep flag `trader_annie_rep`. Hook: Promise a heat line to the library atrium (Ch8). Pays off in the Warm Room epilogue.

**Ambient NPCs**

- `amb_lonnie` (Lonnie Vance): Silver Spur lounge singer in a gold sequined jacket, singing Sinatra in the ration line for crackers.
- `amb_ruth` (Ruth Calloway): Retired second-grade teacher running a class on yoga mats in the convention center ('FRACTIONS (FOOD)').
- `amb_bike_kids` (The Bike Kids): A pack of 12-year-olds on bikes who run notes between houses, later for the Switchboard.

**Set pieces**

- lamp_line_siege
- Voices past the lamp line; Hollow prowlers testing poles (enc_ch10_hollow_prowlers)
- Control room at 18 °C
- Dawn through the ash

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- None scripted in this chapter. Real Tallmen from Ch7 on.

**Items placed or awarded**

`lamp_kit`, `flare`, `rifle_ammo`

**Player actions:** perimeter_repair_under_pressure, light_management, gate_defense_optional, dialogue, ending

**Siege:** skip night 1 if `{"any": [{"flag": "den_killed", "eq": true}, {"flag": "tallmen_killed", "gte": 2}]}`; night 3 single side if `[{"flag": "den_killed", "eq": true}, {"flag": "tallmen_killed", "gte": 3}]`. 

**Dialogue scenes** (in order)

- `ch10_siege_night1` @ `loc_galena_station`: Siege night 1 (the test). SKIPPED if den_killed or tallmen_killed>=2. *(conditional)*
- `ch10_siege_night2` @ `loc_galena_station`: Siege night 2 (the probe). Hollows call from the dark; prowlers test the poles (enc_ch10_hollow_prowlers).
- `ch10_gate` @ `loc_galena_station`: Between night 2 and 3: Kessler's Remnant at the gate.
- `ch10_siege_night3` @ `loc_galena_station`: Siege night 3 (the push). Never more than 3 visible. They break off at dawn or after losing 2.
- `ch10_final` @ `loc_galena_station`: The control room vote. The final choice.
- `ch10_epilogue` @ `loc_galena_station`: Triggered by event play_epilogue. Branches on ending, then the Pearce family modifier, then Carly and Wraith.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
