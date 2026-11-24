# Chapter 6: The Lift Bridge
**Act II** · May · Superior (SECTOR 4) → Canal Park · Dialogue: `dialogue/ch06_*.json`

## Summary
There's typhoid in Sector 4, and it's real. Ironwood uses it as cover: a quarantine sweep searching for guns, food over 14 days, and "Compact sympathizers." Dell's street is on the list. That night the Harbor tries to run the elevator grain out by boat through the Duluth ship canal before Ironwood seizes it. The Aerial Lift Bridge is down. Dell can raise it, *if* the dam's power reaches it. The port war goes hot, and this is where the Army becomes an enemy you fight.

## Goals
1. Survive the sweep and decide what to hide (the Pruitts' food, Marguerite's morphine, your rifle).
2. Find Theo, who has gone to join someone.
3. Reach the lift bridge control house across the canal.
4. Raise it or hold it.

## Locations
`loc_east_end` (quarantine sweep, daytime) → `loc_blatnik_bridge` (Ironwood checkpoint) → `loc_lift_bridge` / Canal Park (night battle)

## NPCs
ruiz, strand, bea, theo, wren, ray, marguerite, ames (field hospital) · minor: kessler (loudspeaker), deshawn

## Key beats
1. **The sweep.** Ruiz's squad goes house to house. If Dell hides the Pruitts' food under her floor, Ruiz finds it, looks at Deshawn, and says "clear." → `ch06_sweep`
2. **The list.** An informant list is nailed to the checkpoint. If `ch02_reported_ray`, Ray reads Dell's name on it (`ray_knows_report`).
3. **Theo's choice.** He's at the docks with a Harbor crew, or with Cody's Compact cell, or carrying water for Ironwood. → `ch06_theo_side`
4. **Strand on the bridge.** Two radios, two chains of command. If `ch02_strand_truth` or `trust.strand >= 4`, Dell can push her to stand with the governor and pull the Guard out of Ironwood's line. → `ch06_strand_break`
5. **Canal battle.** A Bradley on the pier, drones over Canal Park, Harbor boats waiting. An IED flips an MRAP door onto Ruiz. → `ch06_ruiz_pinned`
6. **The control house.** Raise the bridge (the boats escape with grain) or hold it down (Ironwood takes the elevators). → `ch06_lift_bridge`

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Hide neighbors' food | `ch06_hid_neighbors`, kindness+1, Ruiz trust+2 | Ch8: cistern (with `pruitt_alive`) |
| Theo's side: allow / forbid | `theo_side` | Endings: Theo stays with that faction |
| Strand breaks with Ironwood | `strand_stance=governor`, rep_authority stays aligned with you | Ch10: Remnant stands down more easily. Ironwood hostility+2 |
| Strand stays with the Directive | `strand_stance=directive` | Ch10: `end_ledger` absorbs the Remnant |
| Spare Ruiz | `ruiz_spared`, kindness+1 | Ch7 defection |
| Raise bridge | `bridge_choice=raised`, rep_harbor+3, rep_authority−3, `ironwood_hostility`+3 | The Harbor has food in Act III |
| Hold bridge | `bridge_choice=held`, rep_authority+2, rep_harbor−3 | Ironwood holds the elevators; Ch8 grain is rationed by the Remnant |

**Death checks at the end of the chapter**
- `wren_alive=false` if `trust.wren < 3`.
- `strand_alive=false` if `convoy_choice=sabotage` AND `bridge_choice=raised`.
- `ray_alive=false` if `bridge_choice=held` AND `cody_alive=false`, or if `ray_house_burned` AND NOT `ch03_helped_ray`.

## Gameplay hooks
- **Player does:** stealth during the sweep (hide items in the floor cache; a timer while the squad clears houses), a checkpoint (talk, bribe, or sneak), a **night urban battle**, and the bridge control puzzle (power routing + lever).
- **Enemies:** `ironwood_patrol` (fireteams of 4), `ironwood_checkpoint` (static, sandbags, a searchlight), `ironwood_drone` (spotter set piece; hide under cover or it calls fire), `ironwood_bradley` (set piece; never fought directly; avoid its lanes, or disable the pier crane to block it). If `bridge_choice=held`, `compact_militia` and Harbor longshoremen (`harbor_militia`) become the enemies in the last fight instead.
- **Items:** `floor_cache`, `rifle_ammo`, `med_kit`, `ironwood_id` (from Ruiz if spared), `bolt_cutters`.
- **Weather/time:** cold drizzle, 4 °C, day → night. Fog off the lake cuts drone visibility (a mechanic: fog = safer).
