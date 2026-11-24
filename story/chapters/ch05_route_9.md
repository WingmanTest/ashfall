# Chapter 5: Route 9

*Act 2 · season `late_fall` · Day 83 (Sat Nov 14, Year 1) · level id(s): ch05_route_9*

## Summary

Day 83: Saturday, November 14. Cold, overcast late fall: sleet, wind down the canyon, a few degrees above freezing. The federal Reconstruction Directive requisitions the valley's warehouses for California; Nevada joins the state bloc, and Task Force Ironwood arrives. Convoy Route 9 runs west out of the industrial center under Ironwood escort, and the Lahontan Compact blocks the I-80 canyon with hay trucks. Ross is on the barricade. Wes is hit under the overpass. In the sleet the soldiers fire tracers at something that isn't people.

## Goals

- Ride the convoy (Sgt. Ruiz, call sign 'Engineer Two').
- The signal cabinet (cabinet_choice).
- Decide the convoy (convoy_choice).
- Find Wes (q_find_wes).
- Optional: Mo's pump (q_mo_pump), Rourke's burros (q_rourke_escort), Boone's back door.

## NPCs

Ruiz, Ander, Ross, Wes, Kessler (radio), Mo, Rourke, Boone, Darlene.

## Key beats

- Ruiz briefs drivers at the warehouses. She's tired and fair.
- The convoy halts at the canyon. The rail signal cabinet controls the crossing gates and floodlights.
- Ander walks out to talk. Ross stands behind him and doesn't look at Braith.
- Escort, sabotage or divert. Whatever you pick, someone shoots.
- Under the overpass: Wes is hit. Treat him, leave him to Compact medics, or Ironwood takes him.
- Ironwood radio: 'contact, not human, repeat not—'. A flare shows one figure mid-stride on the hillside.
- Rourke sells the Annex rumor for an escort (annex_known).

## Choices & consequences

| Choice | Consequence |
|---|---|
| Convoy: escort / sabotage / divert half to the Floor | convoy_choice; escort may set fired_on_blockade (breaks pearce_reconciled). |
| Signal cabinet: fix / jam / flood the canyon with light | cabinet_choice. |
| Wes: pull him out / leave him | wes_spared (+Ross lets you through Fallon free) or wes_prisoner (Ironwood detainee; freed by Ruiz in Ch6 or at the Ch10 gate). |

## Flags

ironwood_arrived, ruiz_met, ander_met, ross_met, convoy_choice, fired_on_blockade, cabinet_choice, wes_spared, wes_prisoner, mo_met, darlene_with_mo, boone_met, annex_known, tallman_glimpses.

## Level notes (for Cartographer)

Level ch05_route_9: two armed camps (blockade cook fires, the convoy) and Rourke's roadside camp on the canyon shoulder. The armored plow truck reskins as a hay-truck barricade.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch05_route_9`
- **Season:** `late_fall` (mid Nov – mid Dec, Year 1). Palette: overcast slate grey, wet asphalt, sodium-orange dead lamps.
- **Date / weather / temperature:** Day 83 (Sat Nov 14, Year 1); `sleet`; 2 °C, night -3 °C. Time of day: dusk, night.
- **Survival focus:** warmth, wet_cold, wind. HUD unlocks: ammo_military.

**Locations**

- `loc_tric_warehouses`: Industrial-center warehouses east of Sparks. Ch5 convoy staging; Darlene's reefer trailer.
- `loc_i80_blockade`: I-80 in the Truckee canyon east of Sparks. Compact blockade, rail signal cabinet, overpass.
- `loc_mustang_truckstop`: Truck stop at the I-80 Mustang exit. Mo's fuel market.
- `loc_sparks_yard`: Union Pacific yard, Sparks. Convoys; Boone's back door; Remnant base in Act III.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `compact_militia` ×8: If escort/divert
- `ironwood_patrol` ×4: If sabotage
- `ironwood_drone` ×1: Spotter; break LOS under overpass
- `ironwood_mrap` ×1: Escort or threat

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch05_compact_attack`: compact_militia×8. Escort path. Sets fired_on_blockade via dialogue.
- `enc_ch05_ironwood_turn`: ironwood_patrol×4, ironwood_drone×1. Sabotage path.
- `enc_ch05_crossfire`: compact_militia×4, ironwood_patrol×4. Divert path.

**Traders**

- `trader_mo` (Maureen 'Mo' Kessinger): loc_mustang_truckstop. Trades diesel_jug, gas_can, tire chains, sled parts; wants mechanic labor, parts, canned_food. Rep flag `trader_mo_rep`. Hook: Fix her transfer pump for standing credit (+3 rep, free diesel). With Darlene (darlene_with_mo) she survives Act III.
- `trader_rourke` (Wendell Rourke): loc_peavine_shack (Ch3), loc_i80_blockade (Ch5), loc_us50_fallon (Ch7), river_ice camp (Ch9). Trades whiskey, candles, maps, tea, reloading supplies, rumor; wants stories, rumor, salt. Rep flag `trader_rourke_rep`. Hook: Get his burros through the Ch5 canyon; reward: the Annex rumor (annex_known).
- `trader_boone` (SSgt. Tyrell Boone): loc_sparks_yard. Trades canned_food (MREs), mask_filter, rifle_ammo, dosimeter; wants cigarettes, whiskey, silence, diesel_jug. Rep flag `trader_boone_rep`. Hook: About half his Act III filters are expired (boone_filters_tested reveals it). Expose him to Ruiz (boone_exposed) and Kessler shoots him; his stock drops as loot.

**Ambient NPCs**

- `amb_darlene` (Darlene Okoye-Pratt): Stranded long-haul trucker with a reefer trailer of frozen chicken off USA Parkway.

**Set pieces**

- MRAP searchlight on sleet
- Hay-truck blockade in the canyon (armored_plow_truck reskin)
- Tracers into the dark at something that isn't people

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- `glimpse_ch05_flare`: Hillside above the canyon, ~70 m, lit by the flare: one figure, mid-stride, then gone.  Ironwood radio chatter plays: 'contact, not human, repeat not—'.

**Items placed or awarded**

`med_kit`, `rifle_ammo`, `signal_fuse`, `flare`, `grain_sack`, `diesel_jug`, `mask_filter`, `whiskey`, `cigarettes`, `rumor`

**Start inventory:** `med_kit`×1, `signal_fuse`×1

**Player actions:** convoy_onrails_shoot_or_hold, repair_under_fire, dialogue, medical, trade

**Dialogue scenes** (in order)

- `ch05_ruiz_convoy` @ `loc_tric_warehouses`: Convoy staging at the warehouses. Sgt. Ruiz briefs drivers.
- `ch05_signal_cabinet` @ `loc_i80_blockade`: The convoy halts at the canyon. Rail signal cabinet controls the crossing gates and floodlights.
- `ch05_ander_blockade` @ `loc_i80_blockade`: Ander Etcheverry walks out to talk.
- `ch05_wes_wounded` @ `loc_i80_blockade`: Under the overpass: Wes is hit.
- `ch05_mo_truckstop` @ `loc_mustang_truckstop`: Mo's truck stop at the Mustang exit (trader; q_mo_pump).
- `ch05_rourke_canyon` @ `loc_i80_blockade`: Rourke's burros stuck at the blockade (q_rourke_escort).
- `ch05_boone_backdoor` @ `loc_sparks_yard`: SSgt. Boone's back door at the Sparks yard depot (trader).

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
