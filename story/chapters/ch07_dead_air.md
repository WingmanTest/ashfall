# Chapter 7: Dead Air
**Act II → III** · July 9 · Proctor hill · Dialogue: `dialogue/ch07_*.json`

## Summary
A hot, ordinary July night. Lou is relaying shortwave traffic when every frequency goes silent at once, then comes back in fragments: Minot. Norfolk. Somebody fired. Somebody fired back. Nobody here sees a flash. Ironwood loses contact with its command. By morning half the unit has deserted and Kessler is dragging the rest into the Proctor yard. Ten days later the sky goes brown. On the last day of the chapter it snows in July, and the snow is grey.

## Goals
1. Get to Lou's shack (he called Dell on the hand radio).
2. Listen. Decide what Lou should broadcast.
3. Deal with Ruiz (if spared), who has deserted.
4. Decide where your people spend the winter: the dam or the city.

## Locations
`loc_lou_shack` → `loc_proctor_yard` (Ironwood digging in; deserters) → `loc_east_end`

## NPCs
lou, ruiz (if `ruiz_spared`), theo, marguerite, hank, kessler (loudspeaker)

## Key beats
1. **Dead air.** Lou has three versions: a federal launch on the Compact states' missile fields, a foreign strike exploiting the split, or a malfunction and a cascade. He asks Dell which one to tell people. → `ch07_lou_dead_air`
2. **Deserters.** On the road down the hill, soldiers in civilian coats. One asks the way to Wisconsin. Not hostile.
3. **Ruiz at the door.** Her ID is cut up, her rifle is still on her. "I need somewhere to be that isn't there." → `ch07_ruiz`
4. **First dogs.** Abandoned pets, gone feral, starving. The first non-human enemy appears in this chapter.
5. **Grey snow.** Dell and Theo watch it fall in July. Decide: move people to the dam, or stay in the city where the Harbor's grain is. → `ch07_where`

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Lou broadcasts "we don't know" | `lou_broadcast=truth`, kindness+1 | Ch10: people trust the council's census |
| Lou broadcasts the foreign-strike story | `lou_broadcast=foreign`, rep_authority+1 | Factions unite briefly; Kessler uses it |
| Lou broadcasts the federal-strike story | `lou_broadcast=federal`, rep_compact+1, ironwood_hostility+2 | Ironwood deserts faster; the Remnant is harder and angrier |
| Take Ruiz in | `ruiz_defected` | Ch9 gap in the picket; Ch10 stand-down; the clean demolition in Dark Water |
| Winter at the dam | `ch07_location=dam` | Warmth is secure; Ch8 is a supply run back into the city; Lou stays behind |
| Winter in the city | `ch07_location=city` | Food is near, cold is worse; Ch9 is a full exodus |

## Flags
- **Set:** `lou_broadcast`, `ruiz_defected`, `ch07_location`, `ironwood_split`, `ironwood_hostility`
- **Read:** `ruiz_spared`, `trust.ruiz`, `trust.lou`, `dam_running`, `bridge_choice`
- **Checkpoint:** insulin check → `theo_insulin_lapses`

## Gameplay hooks
- **Player does:** night walk, a radio scene, an optional ambush defense (the dog pack), and a move-out montage (load the sled).
- **Enemies:** `feral_dog` (first appearance; pack of 3–5, flee from fire/flares); `remnant_patrol` (Kessler's loyalists, hostile if `ironwood_hostility >= 3`); deserters (neutral).
- **Items:** `hand_radio`, `batteries`, `sled`, `dosimeter` (Lou gives it: **RAD unlocks on the HUD**), `flare`.
- **Weather/time:** warm night → the brown sky days → grey snow, 2 °C. The palette transitions from dusty orange to winter grey across the chapter.
