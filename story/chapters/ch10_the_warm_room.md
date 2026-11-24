# Chapter 10: The Warm Room
**Act III** · Midwinter · Thomson Dam · Dialogue: `dialogue/ch10_final.json`

## Summary
The dam's control room is 18 °C. It's the warmest room for a hundred miles, and everyone has come for it. Bea's Harbor people. Jory's Compact, if they're still standing. Strand, if alive, with a clipboard. Kessler's Remnant, outside in the snow with the last diesel and the last guns. The turbine can heat this building, the Lunds' greenhouse, and maybe one more thing. Dell started it, so they all look at her.

## Goals
1. Hold the gate long enough to talk (or fight, if `ironwood_hostility >= 5` and no stand-down).
2. Hear each faction's offer.
3. Decide who controls the dam.

## Locations
`loc_thomson_dam` (gate, powerhouse floor, control room)

## NPCs
Everyone still alive: bea, jory, strand, ruiz, ray, cody, wren, marguerite, ames, theo · minor: kessler

## Key beats
1. **The gate.** Kessler offers a trade: his diesel and guns for "operational control." With `ruiz_defected` she talks her old squad down. With `strand_stance=governor`, Strand orders the Guard soldiers in his ranks to stand down. Otherwise, a fight in the snow (the last battle).
2. **The room.** Each leader makes a pitch: Strand (a list that saves most), Jory (strip it and take it underground), Bea (the Harbor runs it). Dell can propose a council if `kindness >= 5`.
3. **The choice.** → `ch10_final`
4. **Epilogue.** The census board, or the list, or the black city, or the long walk south.

## Endings
See `story_bible.md §9` and `flags.json → endings` for exact conditions.
- `end_warm_room`: the council. Earned hope.
- `end_ledger`: Strand's list.
- `end_iron_range`: the Compact goes underground.
- `end_dark_water`: shut it down, walk south.
- `end_two_coats`: leave with Theo.

## Flags
- **Set:** `final_choice`, `ending`
- **Read:** nearly everything. See `flags.json → endings`.

## Gameplay hooks
- **Player does:** gate defense (optional battle), a big dialogue, the ending sequence.
- **Enemies:** `remnant_patrol` ×8 and an `ironwood_mrap` set piece (only if no stand-down).
- **Items:** none new.
- **Weather/time:** blizzard clears for the first time in months. In `end_warm_room` the epilogue gets one shaft of weak sun through the ash. That's the earned-hope image. It isn't spring.
