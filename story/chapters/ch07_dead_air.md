# Chapter 7: Dead Air

*Act 2 · season `late_fall` · Day 104 (Sat Dec 5) → mid-December, Year 1 · level id(s): ch07_dead_air, ch07b_dixie_valley*

## Summary

Day 104: Saturday, December 5, into mid-December. Late fall at its coldest: frost on the Peavine towers, biting wind on US-50, desert nights below freezing at the Annex. On Peavine the sky glows green in the east; every frequency dies; Galena trips and its control racks are cooked. By noon the sky is brown and grey flakes that don't melt are falling. Before dawn a stranger staggers into Augie's shack: Dr. Hollis Reyne, the last technician from the Dixie Valley Annex. The Annex was hardened. Its spares survived. Braith drives east on US-50 with the ground power cart: through Fallon, where his father runs the checkpoint, then into the salt flats. The truck stalls in the dark and the first Tallman comes out of the night. At the Annex: Tolliver at the gate after 92 days alone, a stranded Ironwood recovery detail in the hangar, and the holds. Wing A's six holds are forced open from inside. Wing B is flooded and collapsed, its door bent outward, its manifest redacted. Nobody knows how many there were. One water-swollen page in the log mentions 'tissue integration,' and Reyne admits she doesn't know what they do outside, cold and starving.

## Goals

- Peavine: the radio dies (ch07_augie_dead_air).
- Reyne (q_control_cards).
- Ruiz (if spared).
- Through Fallon: Ross.
- The Dixie Valley road (first fight).
- Tolliver at the gate.
- The recovery detail: control_cards, lamp_kit, filters.
- The holds and the flooded wing.
- Optional: the hot-springs den.
- Home through Fallon.
- Where your people winter (ch07_location).

## NPCs

Augie, Reyne, Ruiz (and two deserters), Ross, Wes (at Fallon if free), Tolliver, SFC Brandt and the recovery detail, Rourke (Fallon).

## Key beats

- Dead air: Augie decides what to tell the valley (augie_broadcast). Ironwood splits (ironwood_split).
- Reyne: LONG SLEEP, induced torpor for casualty evacuation; the subjects were engineered, not human, never meant to kill.
- Ruiz arrives with two deserters if spared; she defects if trust.ruiz>=4.
- Fallon: the last 'normal' town. Ross at the canal bridge.
- The road: the truck stalls; headlights vs the dark; light pushes it back.
- Tolliver: 92 days alone at his post. He joins, stays, or dies.
- The hangar: SFC Brandt's starving detail. Talk (Ruiz or ironwood_id) or fight.
- The holds: the maglocks open one at a time on the cart's power. Manifest: SUBJECTS (WING A): 6. SUBJECTS (WING B): ███████. Wing B is under black water; its door is bent outward. Reyne admits she never saw B and doesn't know how many.
- Optional den: two Tallmen asleep in the steam. Kill them or walk away. Reyne begs you not to.
- Fallon again: tell Ross what the Annex holds, and say goodbye.
- Peavine: where do your people winter? Does Reyne come?

## Choices & consequences

| Choice | Consequence |
|---|---|
| Kill the sleeping Tallmen in the den | den_killed + tallmen_killed+2; eases the Ch10 siege; no kindness change. It's a question of what you are. |
| Tolliver | tolliver_fate = joined / stayed / dead. |
| Recovery detail | recovery_detail_outcome = talked / fought. |
| Tell the Compact what the Annex holds | annex_told=compact; Ross survives Act III if told or rep_compact>=1. |
| Goodbye to Ross: honest / promise / argue | ross_goodbye; honest helps pearce_reconciled. |
| Where you winter: Galena / the city | ch07_location; Reyne's choice: reyne_with_you. |

## Flags

augie_broadcast, ironwood_split, reyne_met, reyne_secret_known, reyne_with_you, ruiz_defected, annex_known, tolliver_fate, recovery_detail_outcome, tallmen_killed, den_killed, annex_told, ross_goodbye, ch07_location. End of chapter: augie_alive, pearce_reconciled.

## Level notes (for Cartographer)

Two level files under one story chapter (see the level split below). The count of Tallmen at large is UNKNOWN by design: never state a total anywhere in the game.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch07_dead_air`, `ch07b_dixie_valley`
- **Level split:**
  - `ch07_dead_air`: `loc_peavine_shack`, `loc_us50_fallon`
  - `ch07b_dixie_valley`: `loc_dixie_annex`, `loc_annex_holds`, `loc_dixie_hotsprings`
- **Season:** `late_fall` (mid Nov – mid Dec, Year 1). Palette: overcast slate grey, wet asphalt, sodium-orange dead lamps.
- **Date / weather / temperature:** Day 104 (Sat Dec 5) → mid-December, Year 1; `overcast`; -1 °C, night -3 °C. Time of day: night, day, night.
- **Survival focus:** warmth, wind, desert_night_cold. HUD unlocks: rad.

**Locations**

- `loc_peavine_shack`: Augie's radio shack under the repeater towers on Peavine Peak.
- `loc_us50_fallon`: US-50 into Fallon. Compact checkpoint at the canal bridge (Ross). The last 'normal' town.
- `loc_dixie_annex`: Dixie Valley Annex exterior: fence, guard shack (Tolliver), airstrip, hangar (recovery detail, cage four).
- `loc_annex_holds`: Annex interior: maglock corridor, Wing A torpor holds (all forced open), records room, stair to flooded/collapsed Wing B.
- `loc_dixie_hotsprings`: Hot springs 3 mi north of the Annex. Optional den: two Tallmen in torpor.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `feral_dog` ×3: Peavine road
- `remnant_patrol` ×4: Peavine, hostile if ironwood_hostility>=3
- `coyote` ×3: Dixie flats
- `recovery_detail` ×6: Hangar; talkable
- `tallman` ×1: FIRST FIGHT: enc_ch07_road_tallman (truck stalled)
- `tallman` ×1: enc_ch07_holds_tallman (Wing A last hold)
- `tallman` ×2: Optional den: torpid, non-hostile unless shot

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch07_road_tallman`: tallman×1. FIRST Tallman fight. Light pushes it back; it retreats wounded.
- `enc_ch07_tolliver`: hazard / scripted. Single armed guard (use authority_guard stats). Only if you fire.
- `enc_ch07_recovery_detail`: recovery_detail×6. Only if fought.
- `enc_ch07_holds_tallman`: tallman×1. Wing A corridor; flees to the flooded stair.

**Traders**

- `trader_rourke` (Wendell Rourke): loc_peavine_shack (Ch3), loc_i80_blockade (Ch5), loc_us50_fallon (Ch7), river_ice camp (Ch9). Trades whiskey, candles, maps, tea, reloading supplies, rumor; wants stories, rumor, salt. Rep flag `trader_rourke_rep`. Hook: Get his burros through the Ch5 canyon; reward: the Annex rumor (annex_known).

**Ambient NPCs**

- `amb_tolliver` (Mr. Tolliver): Annex contractor guard who held the gate alone for 92 days, uniform still ironed.

**Set pieces**

- Every frequency goes silent; green sky ripple in the east
- Grey ash flakes in December that don't melt (palette shifts toward Nuclear Winter)
- Truck stalled on the flats, headlights vs the dark
- annex_maglock_power
- annex_holds
- annex_hangar
- dixie_hotsprings_den
- Flooded, collapsed Wing B: door bent outward

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- None scripted in this chapter. Real Tallmen from Ch7 on.

**Items placed or awarded**

`hand_radio`, `batteries`, `dosimeter`, `flare`, `control_cards`, `lamp_kit`, `annex_log`, `mask_filter`, `gpu_cart`, `ironwood_id`, `canned_food`

**Player actions:** night_walk, drive, dialogue, night_defense_lights, power_cart_puzzle, explore_dark_interior, optional_moral_choice

**Dialogue scenes** (in order)

- `ch07_augie_dead_air` @ `loc_peavine_shack`: December 5, night. Augie's shack. Every frequency dies.
- `ch07_reyne_arrives` @ `loc_peavine_shack`: A stranger at the shack door before dawn.
- `ch07_ruiz` @ `loc_peavine_shack`: If ruiz_spared: Ruiz arrives on the radio, then in person, with two deserters. *(conditional)*
- `ch07_fallon_checkpoint` @ `loc_us50_fallon`: US-50 into Fallon: the Compact checkpoint at the canal bridge. Ross.
- `ch07_dixie_road` @ `loc_dixie_annex`: Night on the Dixie Valley road. The truck stalls. First Tallman fight (enc_ch07_road_tallman).
- `ch07_annex_gate` @ `loc_dixie_annex`: Annex gate. The guard who never left: Tolliver.
- `ch07_recovery_detail` @ `loc_dixie_annex`: Inside the hangar: the stranded Ironwood recovery detail.
- `ch07_annex_holds` @ `loc_annex_holds`: Power the maglocks with the cart (annex_maglock_power). The torpor holds. The flooded lower wing.
- `ch07_hotsprings_den` @ `loc_dixie_hotsprings`: Optional: the hot-springs den. Two Tallmen in torpor (dixie_hotsprings_den).
- `ch07_fallon_return` @ `loc_us50_fallon`: Heading home through Fallon with the control cards.
- `ch07_where` @ `loc_peavine_shack`: Back on Peavine. Where do your people winter?

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
