# Chapter 6: The Trench

*Act 2 · season `late_fall` · Day 96 (Fri Nov 27, Year 1) · level id(s): ch06_the_trench*

## Summary

Day 96: Friday, November 27. Grey skies, sleet, nights below freezing. Martial law. A 'typhoid' quarantine sweep of Sector 4 is really a weapons search. Informant lists go up on lampposts. Carly has quit the registry and is building the Switchboard with Augie. Avila must choose between federal orders and the governor. At night, in an alley off Fourth Street, a Tallman looks straight at Braith and leaves. In the rail trench an IED flips an MRAP door onto Sgt. Ruiz, and a Bradley is coming. A freight car sits on the siding above.

## Goals

- Survive the sweep.
- Find Carly at the Silver Spur.
- Avila's command post.
- Reach the trench.
- Ruiz under the MRAP door.
- Block or open the trench.

## NPCs

Carly, Avila, Roz, Ruiz, Kessler, Gil, Lolo, Pvt. Marsh, Dutch (last week), the Floor commissary, Lusk, Lonnie, Ruth, Brother Amos, the Bike Kids.

## Key beats

- Loudspeakers. Hide the Pruitts' food and Lolo's morphine, or don't. Wraith on GUARD may be hurt (wraith_injured).
- The informant list with Braith's name on it if he reported Gil.
- Pvt. Marsh in Room 9: hide him or turn him in.
- Carly picks her own side (carly_side) and the Switchboard comes up.
- Avila: governor or directive (avila_stance).
- The alley glimpse at 25 m. Ruiz sees it too.
- Ruiz pinned: spare her and she tells you about the pencil marks on her list (and frees Wes if he's a prisoner).
- The trench: drop the freight car (bridge_choice=blocked) or let the Bradley through (open).

## Choices & consequences

| Choice | Consequence |
|---|---|
| Hide neighbors | ch06_hid_neighbors; a Bike Kid dies in the sweep if not. |
| Hide or turn in Marsh | ch06_marsh_hidden; kindness vs ironwood_hostility. |
| Spare Ruiz | ruiz_spared → ch07_ruiz, defection if trust.ruiz>=4. |
| Block or open the trench | bridge_choice; open → final fight, the Floor's warehouses emptied; sabotage+blocked → Avila dies. |

## Flags

ch06_hid_neighbors, ch06_informant_torn, gil_knows_report, ch06_marsh_hidden, carly_side, switchboard_built, avila_stance, ruiz_spared, ruiz_list_seen, ruiz_secret_known, ch06_bradley_tip, bridge_choice, roz_guns_known, tallman_seen_with_ruiz, wraith_injured. End of chapter: kit_alive, avila_alive, gil_alive, carly_left.

## Level notes (for Cartographer)

Level renamed: the v1 Ch6 level file becomes ch06_the_trench (see MIGRATION_V1_TO_V2.md). Silent streets, curfew, a few faces in windows. freight_car_drop replaces the old bridge set piece.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch06_the_trench`
- **Season:** `late_fall` (mid Nov – mid Dec, Year 1). Palette: overcast slate grey, wet asphalt, sodium-orange dead lamps.
- **Date / weather / temperature:** Day 96 (Fri Nov 27, Year 1); `overcast`; 1 °C, night -3 °C. Time of day: day, night.
- **Survival focus:** warmth, wet_cold, curfew. HUD unlocks: none new.

**Locations**

- `loc_sparks_block`: Braith and Carly's block, old Sparks near Prater Way. HUD SECTOR 4. Lolo's clinic, Gil's garage, the Pruitts.
- `loc_fourth_street`: 4th Street motel row and Silver State Pawn (Dutch). Viaduct Crew turf. Marsh's motel (Ch6).
- `loc_silver_spur`: The Silver Spur, a dead downtown casino (fictional). The Floor's HQ and kitchens; Carly's Switchboard in Ch6.
- `loc_rscc_registry`: Reno-Sparks Convention Center: registry, ration hall, Annie's table, Ruth's class; Avila's command post in Ch6.
- `loc_rail_trench`: The sunken rail trench through downtown Reno. Bradley set piece; freight car on the siding; the alley glimpse.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `ironwood_patrol` ×12: Fireteams of 4
- `ironwood_checkpoint` ×1
- `ironwood_drone` ×2: Rain reduces detection
- `ironwood_bradley` ×1: Setpiece; freight_car_drop blocks it
- `compact_militia` ×4: Only if bridge_choice=open (last fight)
- `harbor_militia` ×6: Only if bridge_choice=open (last fight)

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch06_trench_fight`: compact_militia×4, harbor_militia×6. Engine-triggered after ch06_trench if bridge_choice=open.

**Traders**

- `trader_dutch` (Dutch Albertson): loc_fourth_street. Trades tools, guns, cigarettes, stolen meds, ammo_9mm; wants batteries, ammo, jewelry, rumor. Rep flag `trader_dutch_rep`. Hook: If trader_dutch_rep<=-1 he sells your Galena route to the Viaduct Crew (ch04_dutch_ambush).
- `trader_floor` (Floor commissary): loc_silver_spur. Trades canned_food, firewood, wool_blanket; wants labor, spur_chip. Rep flag `trader_floor_rep`. Hook: Spend spur_chip earned from Floor jobs.

**Ambient NPCs**

- `amb_pvt_marsh` (Pvt. Danny Marsh): Ironwood deserter hiding in a 4th Street motel after refusing to clear a house with kids in it.
- `amb_deputy_lusk` (Deputy Cal Lusk): Off-duty Washoe sheriff's deputy in pajama pants and a uniform jacket; runs the block watch and the marina water line.
- `amb_lonnie` (Lonnie Vance): Silver Spur lounge singer in a gold sequined jacket, singing Sinatra in the ration line for crackers.
- `amb_brother_amos` (Brother Amos): Street preacher at the Virginia Street bridge who counts the dead aloud.
- `amb_bike_kids` (The Bike Kids): A pack of 12-year-olds on bikes who run notes between houses, later for the Switchboard.
- `amb_ruth` (Ruth Calloway): Retired second-grade teacher running a class on yoga mats in the convention center ('FRACTIONS (FOOD)').

**Set pieces**

- Quarantine sweep house-to-house
- ied_mrap (Ruiz pinned)
- freight_car_drop into the rail trench
- The alley glimpse

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- `glimpse_ch06_alley`: Far end of the alley under a dead sodium light, ~25 m (CLOSEST glimpse; still non-interactable): it looks at Braith, then leaves on all fours.  Exception to the 80 m rule, scripted inside ch06_alley_glimpse; player input locked for 4 s.

**Items placed or awarded**

`rifle_ammo`, `med_kit`, `ironwood_id`, `bolt_cutters`, `spur_chip`, `vet_kit`

**Player actions:** stealth_hide_items, checkpoint, urban_night_battle, physics_puzzle_freight_car

**Dialogue scenes** (in order)

- `ch06_sweep` @ `loc_sparks_block`: Morning. Loudspeakers. Ironwood quarantine sweep in Sector 4.
- `ch06_informant_list` @ `loc_sparks_block`: The informant list taped to a lamppost (v1 gap: now has dialogue).
- `ch06_marsh_motel` @ `loc_fourth_street`: 4th Street motel: a young deserter hiding in Room 9.
- `ch06_carly_side` @ `loc_silver_spur`: Find Carly: she's left the registry and is building the Switchboard.
- `ch06_avila_break` @ `loc_rscc_registry`: Avila's command post. Federal orders versus the governor.
- `ch06_floor_commissary` @ `loc_silver_spur`: Commissary counter in the Silver Spur kitchens (trader_floor). Optional.
- `ch06_alley_glimpse` @ `loc_rail_trench`: Night, on the way to the trench. An alley off Fourth Street. (Close glimpse, non-combat.)
- `ch06_ruiz_pinned` @ `loc_rail_trench`: The trench. An IED has flipped an MRAP door onto Sgt. Ruiz.
- `ch06_trench` @ `loc_rail_trench`: Set piece: the freight car on the siding above the trench.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
