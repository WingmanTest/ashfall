# Chapter 9: The Long Night
**Act III** · Midwinter, Year 2 · St. Louis River → Jay Cooke → Thomson · Dialogue: `dialogue/ch09_*.json`

## Summary
−45 °C. The city is a freezer. Everyone still alive is moving to the dam, the last place with heat. Dell leads a column of whoever she gathered: neighbors, strangers, maybe Cody, maybe the Lunds' kids. They go up the frozen river by sled, through the Jay Cooke woods, past Kessler's Remnant picket on the Hwy 210 bridge. Hank, if he's alive, won't make it to spring, and he knows it.

## Goals
1. Lead the column up the river (each stop: warmth, a headcount).
2. Get past the Remnant picket line.
3. Survive the whiteout and the wolves.
4. Choose at the ice break.
5. Reach the dam.

## Locations
`loc_east_end` / `loc_thomson_dam` (start depends on `ch07_location`) → `river_ice` → `loc_jay_cooke` → `loc_thomson_dam`

## NPCs
hank, theo, cody, wren, ruiz, ray, jory (at the dam gate) · minor: kessler (radio), Pete Lund

## Key beats
1. **Headcount.** The column's size = 4 + (filters_shared ? 4 : 0) + (lunds_stayed ? 3 : 0) + husks_talked_down. It's shown on screen as names.
2. **Wren's sled** (if `trust.wren >= 5` AND `wren_alive`): she arrives out of the blizzard with a stolen Ironwood sled full of food. "Told you I'd owe you, Sparky."
3. **The picket.** Kessler's loyalists hold the bridge. With `ruiz_defected`, she knows the gap at shift change. Without her: fight through or detour across thin ice. → `ch09_picket`
4. **Hank's last panel.** Before the end, in a warming hut, he teaches Theo the startup. Then he dies quietly. → `ch09_hank`
5. **The ice break.** The river cracks. Cody (if alive) and the supply sled both go in. You can reach one. → `ch09_ice`
6. **Wolves at the swinging bridge.** Then the lights of the dam through the snow.

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Save Cody | `ch09_saved=cody`, Ray trust+5 | Fewer supplies; Ch10 Jory owes you (rep_compact+2) |
| Save the sled | `ch09_saved=sled`, `cody_alive=false` | Supplies for the column; Ray never forgives you (if alive) |
| Fight through the picket | `ironwood_hostility`+2 | Ch10: the Remnant attacks |
| Use Ruiz's gap | `ch09_ruiz_gap` | Ch10: Ruiz's former squad can stand down |

## Flags
- **Set:** `ch09_sled_brought`, `ch09_ruiz_gap`, `ch09_saved`, `cody_alive`, `hank_alive` (false at the end), `column_size`
- **Read:** `trust.wren`, `wren_alive`, `ruiz_defected`, `filters_shared`, `lunds_stayed`, `husks_talked_down`, `cody_alive`
- **Checkpoint:** insulin check → `theo_insulin_lapses`; then `theo_alive` is resolved.

## Gameplay hooks
- **Player does:** **blizzard march** (warmth is critical; burn barrels or tents at each stop; visibility near zero), escort (column NPCs can freeze if you push too fast), a stealth or assault on the picket, the ice-break reaction choice (a timed QTE choice).
- **Enemies:** `remnant_patrol` and an `ironwood_checkpoint` (bridge picket, searchlight), `ironwood_drone` grounded by blizzard (a visual set piece, harmless), `wolf` (pack of 4–6 in Jay Cooke), `husk` (wanderers drawn to the column's heat).
- **Items:** `sled`, `firewood`, `tent_tarp`, `flare`, `rifle_ammo`, `mask_filter`, `wool_blanket`.
- **Weather/time:** **blizzard**, −45 °C, polar night (dim grey noon). TEMP is the main threat for the whole chapter.
