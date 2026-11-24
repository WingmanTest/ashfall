# Chapter 8: Ashfall
**Act III: Ashfall** · August–October · Duluth/Superior · Dialogue: `dialogue/ch08_*.json`

## Summary
Fallout rain comes through in late August, and then ash. Crops are dead in the field. The lake steams in a weird cold. People who drank roof runoff or slept outside are sick: hair loss, vomiting, confusion. Some go out into the snow without coats. People start calling them **husks**. Dell needs filters, iodide, clean water, and a decision about Theo's foot, which is infected because he's been skipping doses.

## Goals
1. Get iodide tablets and mask filters (Lakehead Memorial or the Harbor stores).
2. Find clean water: Deshawn's cistern (if `pruitt_alive`) or a long trip to the lake intake.
3. Get Theo's foot treated (Ames, if `ames_deal`; otherwise Marguerite, at risk).
4. Decide whether to spend supplies on strangers at the door.
5. Discover Marguerite's list.

## Locations
`loc_east_end` → `loc_lakehead_memorial` → `loc_ore_docks`

## NPCs
marguerite, ames, theo, bea, lou (only if `ch07_location=city`) · minor: deshawn, Pete Lund (husk, if Lunds were driven out)

## Key beats
1. **Fallout rain.** The dosimeter clicks. SEAL and FILTER matter now. Get indoors. Dell digs the respirator out of her truck kit; `mask_filter` cartridges go into it (`has_gas_mask`).
2. **Seal the shelter.** On reaching the East End house, Dell and Theo tape plastic/tarp over the windows (`shelter_sealed`). HUD SEAL is the current shelter's seal %; it reduces indoor radiation. → `ch08_husk` (after getting inside)
3. **The foot.** Ames: "He's been skipping. You didn't know. Next." With `ames_deal`, a clean surgery. Without it, Marguerite does it on a kitchen table (`ch08_foot_saved` depends on `trust.marguerite >= 4`). → `ch08_ames_foot`
4. **The list.** In Marguerite's clinic drawer: names, dates, doses. Theo's name is on the last page, under "if it comes to it." → `ch08_marguerite_list`
5. **Husks.** A man in a T-shirt in the snow, gums bleeding, is trying to get into a car where a family is sheltering. Some husks can be talked down with iodide and a blanket; many can't. → `ch08_husk`
6. **The door.** Strangers ask to come in: a mother whose kid you pulled from the crush (if `ch02_crush_helped`) and two others. Share filters, or keep them for Theo.
7. **Cistern** (if `pruitt_alive`): Deshawn shows you his grandpa's sealed basement cistern. Clean water for everyone. → `ch08_deshawn`

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Share filters and iodide | `filters_shared`, kindness+2 | Ch10 warm room: more names on the census; Ch9: strangers pull the sled |
| Keep supplies | `filters_shared=false` | Theo has enough for Ch9 for sure |
| Talk down a husk | `husks_talked_down`+1, kindness+1 | Ch9: a recovered husk (Pete Lund, possibly) guides you through the whiteout |
| Confront Marguerite gently / harshly / say nothing | `marguerite_list_seen`, trust ±, `marguerite_alive` | Ending: she burns the list, or uses the last dose on herself |

## Flags
- **Set:** `has_gas_mask` (chapter start), `shelter_sealed`, `ch08_foot_saved`, `marguerite_list_seen`, `marguerite_alive`, `filters_shared`, `husks_talked_down`, `pruitt_cistern`, `kindness`
- **Read:** `ames_deal`, `pruitt_alive`, `ch02_crush_helped`, `lunds_stayed`, `trust.marguerite`, `ch07_location`, `bridge_choice`

## Gameplay hooks
- **Player does:** exposure management (RAD, FILTER, SEAL), seal the shelter (tape plastic/tarp over windows), scavenging the hospital pharmacy, a moral choice at the door, an optional talk-down mechanic (approach slowly, holster the weapon, offer an item).
- **Enemies:** `husk` (radiation-sick/hypothermic people; erratic, they rush heat and food; can be talked down with `iodide_tablets` + `wool_blanket` + `kindness>=4`); `feral_dog`; `remnant_patrol` guarding the elevators if `bridge_choice=held`; `looter` at the hospital. Husk/raider break-ins and broken windows lower SEAL.
- **Items:** `iodide_tablets`, `mask_filter` (loads into Dell's utility-crew respirator; `has_gas_mask` from chapter start), `med_kit`, `antibiotics`, `water_clean`, `wool_blanket`, `dosimeter`.
- **Weather/time:** **fallout rain** (RAD up fast outdoors without a seal) → **ashfall** (visibility down), −10 °C, perpetual dusk. Day/night contrast shrinks: "day" is grey. HUD SEAL is the current shelter's seal % and reduces indoor radiation; husk/raider break-ins and broken windows lower it.
