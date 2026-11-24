# MIGRATION: story v1 → Revision 2 (FINAL)

Revision 2 was approved on Nov 23, 2026 and is now live in `story/`. This file is the **exact old → new id map** for everyone who reads story data (Prime / `js/`, Cartographer / `levels/`, Quartermaster / `systems/`).

- **Rule of thumb:** if an old id is in a "Retired" or "Removed" row, delete it. If it's in a "Renamed" row, search-and-replace it. Ids not listed here are unchanged.
- The `story/` side is complete: `python3 story/validate.py` → 0 errors, 0 warnings. **Nothing outside `story/` was edited.** The action lists at the bottom are for the other teams.
- This is the **only** file in `story/` that may contain the retired v1 terms (the "old" column). `validate.py` reads the **Retired v1 terms** table below and fails if any of those terms appears in any other live story file.

---

## 1. Locations (`gameplay_hooks.locations`)

| Old (v1) | New (v2) | Notes |
|---|---|---|
| `loc_east_end` | `loc_sparks_block` | Home block, HUD SECTOR 4 kept |
| `loc_belknap_pharmacy` | `loc_prater_pharmacy` | |
| `loc_blatnik_bridge` | `loc_virginia_bridge` | Authority checkpoint |
| `loc_decc_ration` | `loc_rscc_registry` | Registry, ration hall; Avila's CP in Ch6 |
| `loc_lakehead_memorial` | `loc_meadows_general` | Dr. Ames |
| `loc_proctor_yard` | `loc_sparks_yard` | Convoys, Boone, Remnant base |
| `loc_ore_docks` | `loc_silver_spur` | The Floor's HQ (was the Harbor docks) |
| `loc_harbor` (js alias) | `loc_silver_spur` | |
| `loc_lift_bridge` | `loc_rail_trench` | Ch6 set piece |
| `loc_hwy53_blockade` | `loc_i80_blockade` | Compact blockade |
| `loc_lou_shack` | `loc_peavine_shack` | Augie's radio shack |
| `loc_jay_cooke` | `loc_steamboat_creek` | Approach to the plant; Salt's culvert |
| `loc_thomson_dam` | `loc_galena_station` | The prize (geothermal plant) |
| `river_ice` | `river_ice` | **Kept** (now the frozen Truckee) |
| — | `loc_sparks_marina` | **New.** Ch1 water run (`ch01_lake_edge`) |
| — | `loc_fourth_street` | **New.** Dutch's pawn shop, Marsh's motel |
| — | `loc_sparks_library` | **New.** Annie; Ch8 greenhouse |
| — | `loc_airguard_ramp` | **New.** Ch4 cart heist |
| — | `loc_tric_warehouses` | **New.** Ch5 convoy staging; Darlene |
| — | `loc_mustang_truckstop` | **New.** Mo |
| — | `loc_us50_fallon` | **New.** Ch7 Fallon checkpoint (Ross) |
| — | `loc_dixie_annex` | **New.** Ch7b Annex exterior |
| — | `loc_annex_holds` | **New.** Ch7b Annex interior |
| — | `loc_dixie_hotsprings` | **New.** Ch7b optional den |

## 2. Levels

| Old | New | Notes |
|---|---|---|
| `ch06_the_lift_bridge` | `ch06_the_trench` | Renamed. The bridge-lift puzzle becomes `freight_car_drop` (drop a stalled grain hopper into the rail trench to block the Bradley). `bridge_choice` keeps its id; values are `blocked` / `open`. |
| — | `ch07b_dixie_valley` | **New.** Second level file for story chapter `ch07` (`gameplay_hooks.chapters[ch07].levels` + `level_split`). `ch07_dead_air` = Peavine + Fallon; `ch07b_dixie_valley` = Annex exterior, holds, hot springs. |
| all other `chNN_*` level ids | unchanged | `ch01_day_three`, `ch02_the_registry`, `ch03_the_long_cold`, `ch04_black_start`, `ch05_route_9`, `ch07_dead_air`, `ch08_ashfall`, `ch09_the_long_night`, `ch10_the_warm_room` |

## 3. NPCs and speakers (`npcs.json`)

| Old | New | Notes |
|---|---|---|
| speaker `dell` | speaker `braith` | The player: Braith Pearce, 25 |
| `theo` | `carly` | Carly Redmond (girlfriend; her own side) |
| `marguerite` | `lolo` | Dolores "Lolo" Arrieta |
| `ray` | `gil` | Gil Shumway |
| `wren` | `kit` | Kit Darrow |
| `strand` | `avila` | Capt. Lorna Avila |
| `lou` | `augie` | Augie Bell |
| `hank` | `walt` | Walt Okada |
| `bea` | `roz` | Roz Tafoya |
| `jory` | `ander` | Ander Etcheverry |
| `cody` | `wes` | Wes Pearce (Braith's brother) |
| `ames`, `ruiz` | same | Ruiz's call sign is **"Engineer Two"** |
| `pruitt`, `deshawn`, `cpl_haas`, `pete_lund`, `rosa`, `kessler` | same | minor_characters |
| generic `annie_lund` | generic `lund_kid` | Pete Lund's daughter, Mia (9) |
| generic `deserter_1`, `deserter_2`, `boot_strippers`, `column`, `stranger_mother` | same | Now listed in `npcs.json.generic_speakers` (closes the "Story ids not in npcs.json" gap) |
| — | `wraith` | **New** companion (Belgian Malinois) |
| — | `ross` | **New.** Braith's father |
| — | `reyne` | **New.** Dr. Hollis Reyne (Annex) |
| — | `sfc_brandt` | **New** minor. Ch7 recovery detail |
| — | `amb_brother_amos`, `amb_lonnie`, `amb_salt`, `amb_darlene`, `amb_bike_kids`, `amb_deputy_lusk`, `amb_ruth`, `amb_pvt_marsh`, `amb_night_owl`, `amb_tolliver` | **New** `ambient_npcs[]` (no trust; use flags) |
| — | `trader_dutch`, `trader_mo`, `trader_rourke`, `trader_annie`, `trader_boone`, `trader_floor` | **New** `traders[]` (rep flag `trader_<id>_rep`) |
| — | generic `braith`, `narrator`, `authority_guard`, `ironwood_soldier`, `deserter`, `compact_rider`, `bridge_boy`, `husk`, `stranger_mother`, `lund_kid`, `column` | `generic_speakers` |
| factions `authority`, `harbor`, `compact`, `ironwood`, `bridge_boys`, `none` | same ids | Display names: Truckee Meadows Recovery Authority, The Floor, Lahontan Compact, Task Force Ironwood, The Viaduct Crew |
| — | faction `annex` | **New.** Tallmen (enemy family, no rep) |

## 4. Flags (`flags.json`)

### Renamed
| Old | New |
|---|---|
| `theo_side` | `carly_side` (enum `none|authority|harbor|compact`) |
| `marguerite_alive` | `lolo_alive` |
| `marguerite_list_seen` | `lolo_list_seen` |
| `theo_crossed_off` | `wes_crossed_off` (new meaning: Wes on Lolo's page) |
| `ray_alive` | `gil_alive` |
| `ray_knows_report` | `gil_knows_report` |
| `ch02_reported_ray` | `ch02_reported_gil` |
| `ch03_helped_ray` | `ch03_helped_gil` |
| `wren_alive` | `kit_alive` |
| `ch01_wren_let_go` | `ch01_kit_let_go` |
| `ch03_wren_warned` | `ch03_kit_warned` |
| `strand_alive` | `avila_alive` |
| `strand_stance` | `avila_stance` (`governor|directive`) |
| `hank_alive` | `walt_alive` |
| `hank_recruited` | `walt_recruited` |
| `lou_broadcast` | `augie_broadcast` (`truth|foreign|federal`) |
| `bea_alive` | `roz_alive` |
| `jory_alive` | `ander_alive` |
| `jory_met` | `ander_met` |
| `cody_alive` | `wes_alive` |
| `cody_spared` | `wes_spared` |
| `cody_prisoner` | `wes_prisoner` |
| `ch08_foot_saved` | `ch08_hand_saved` (Braith's frostbitten hand) |
| `ch02_insulin_secured` (level objective flag) | `ch02_card_secured` (essential-worker card) |
| `tallmen_remaining` (draft only) | `tallmen_killed` (int, default 0) **+** `den_killed` (bool, default false). The number at large is **unknown**; never store or show a remaining count. |
| `strand_met`, `bea_met`, `theo_talked` (placeholder only) | none: drop them |

### Kept exactly (same id, same type)
`kindness`, `rep_authority`, `rep_harbor`, `rep_compact`, `ironwood_hostility`, `has_gas_mask`, `shelter_sealed`, `dam_running` (now Galena), `dam_secret_told` (now Galena), `power_priority`, `convoy_choice`, `bridge_choice` (now `blocked|open` for the trench), `ch07_location` (`galena|city`), `final_choice`, `ending`, `ruiz_*`, `pruitt_alive`, `pruitt_cistern`, `rosa_met`, `lunds_stayed`, `filters_shared`, `husks_talked_down`, `column_size`, `ch09_sled_brought`, `ch09_ruiz_gap`, `ch09_saved`, `ames_alive`, `ch02_registered`, `ch02_crush_helped`.

### New (highlights; full list with types and meanings in `flags.json`)
**Act III Hollows (v2 addition):** `assimilation_discovered` (bool), `mimic_let_in` (bool; Ch9 start `column_size −1`), `assimilated_killed` (int; separate from `tallmen_killed`; never a total), `wraith_mimic_warned` (bool), `ch09_voice_followed` (bool; `column_size −1`).

`wraith_alive` (default true; set false **only** by `dialogue/ch09_wraith_hold`), `wraith_injured`, `wraith_led`, `ch09_wraith_hold`, `carly_left`, `carly_job`, `carly_count_doubt`, `carly_found_count`, `switchboard_built`, `ross_alive`, `ross_met`, `ross_goodbye`, `pearce_reconciled`, `fired_on_blockade`, `wes_met`, `ch03_wes_stayed`, `ch01_gas_choice` (`pruitt|generator|drive`), `ch01_voicemail_heard`, `ch01_scarf_found`, `reyne_met`, `reyne_with_you`, `reyne_secret_known`, `annex_known`, `annex_told`, `tolliver_fate`, `recovery_detail_outcome`, `tallmen_killed`, `den_killed`, `tallman_glimpses`, `tallman_seen_with_ruiz`, `cabinet_choice`, `gpu_method`, `cards_installed`, `lamp_line_built`, `siege_breaches`, `lusk_rep`, `haas_rep`, `trader_dutch_rep`, `trader_mo_rep`, `trader_rourke_rep`, `trader_annie_rep`, `trader_boone_rep`, `trader_floor_rep`.

### Level-owned flags with old names (Cartographer)
These live in `levels/*.json`, not in `flags.json`. Rename them to match the new names: `ch01_marguerite_talked` → `ch01_lolo_talked`, `ch01_theo_talked` → `ch01_carly_talked`, `ch02_theo_along` → `ch02_carly_along`, `ch03_met_bea` → `ch03_met_roz` (or drop: Roz is first met in Ch6 now), `ch03_strand_inperson` → `ch03_avila_inperson`, `ch06_theo_found` → `ch06_carly_found`, `ch06_theo_lead` → `ch06_carly_lead`, `ch08_foot_treated` → `ch08_hand_treated`, `wren_dealt` (world/loot) → `kit_dealt`, `hank_briefed` (js) → `walt_briefed`. Remove `ch01_cooler_built`. The old Ch6 bridge flags (`ch06_bridge_powered`, `ch06_bridge_lever`, `ch06_crane*`, `ch06_catwalk_*`, `ch06_boat*`, `ch06_control_house`) go with the old set piece. Use `freight_car_drop` instead.

## 5. Items (`items.json`)

| Old | New |
|---|---|
| `lineman_tools` | `mech_tools` |
| `hank_keys` | `walt_keys` |
| `dried_fish`, `grain_sack` | `grain_sack` kept (display "ration pallet"); `dried_fish` → `canned_food` |
| `priority_card` | same id; now the essential-worker card |
| `pharmacy_bag` | same id; now clinic supplies for Lolo |
| — | **New:** `water_dirty`, `water_clean`, `bucket`, `pruitt_scarf`, `vet_kit`, `gpu_cart`, `control_cards`, `lamp_kit`, `annex_log`, `rumor`, `spur_chip`, `ross_letter`, `ammo_9mm` |

## 6. Quests (`quests.json`)

| Old | New |
|---|---|
| `q_find_theo` | `q_find_wes` |
| `q_cooler` | `q_water` |
| `q_insulin` | `q_essential_card` |
| — | **v2 full list:** `q_water`, `q_find_pruitt`, `q_clinic_supplies`, `q_essential_card`, `q_hospital_diesel`, `q_find_walt`, `q_ground_power`, `q_black_start`, `q_find_wes`, `q_mo_pump`, `q_rourke_escort`, `q_control_cards`, `q_annie_greenhouse`, `q_lamp_line` |

## 7. Dialogue scenes (`dialogue/*.json`)

Every v1 scene file was deleted. These are the v1 scene ids that `levels/*.json` still reference, and their v2 replacements:

| Old | New |
|---|---|
| `ch01_theo_morning` | `ch01_carly_home` |
| `ch01_theo_night` | `ch01_voicemail` |
| `ch01_marguerite_porch` | `ch01_lolo_porch` |
| `ch01_ray_garage` | `ch01_gil_garage` |
| `ch01_wren_pharmacy` | `ch01_kit_pharmacy` |
| `ch02_haas_checkpoint`, `ch02_ames_hospital`, `ch02_ames_diesel_return` | same ids |
| `ch02_strand_registry` | `ch02_avila_registry` |
| `ch02_wren_line` | `ch02_kit_line` |
| `ch03_hank_proctor` | `ch03_augie_peavine` (Walt is met on Peavine) |
| `ch03_ray_fire` | `ch03_gil_fire` |
| `ch03_wren_warning` | `ch03_kit_warning` |
| `ch04_lunds` | same id |
| `ch05_cody` | `ch05_wes_wounded` |
| `ch05_jory_blockade` | `ch05_ander_blockade` |
| `ch05_ruiz_convoy` | same id |
| `ch06_sweep`, `ch06_ruiz_pinned` | same ids |
| `ch06_strand_break` | `ch06_avila_break` |
| `ch06_theo_side` | `ch06_carly_side` |
| `ch06_lift_bridge` | `ch06_trench` |
| `ch07_lou_dead_air` | `ch07_augie_dead_air` |
| `ch07_ruiz`, `ch07_where` | same ids |
| `ch08_ames_foot` | `ch08_ames_hand` |
| `ch08_marguerite_list` | `ch08_lolo_list` |
| `ch08_deshawn`, `ch08_door`, `ch08_husk` | same ids (`ch08_door` now ends in the midnight mimic knock; `ch08_husk` adds Wraith's whine) |
| — | **New (Act III):** `ch08_henley_house`, `ch09_voices` |
| `ch09_hank` | `ch09_walt` |
| `ch09_wren_sled` | `ch09_kit_sled` |
| `ch10_final`, `ch10_gate` | same ids |
| all other v1 scenes | retired, no direct successor |

**Placeholders now covered by real dialogue (from `levels/README.md` "Known gaps"):** Ch5 cabinet → `ch05_signal_cabinet`; Ch6 informant list → `ch06_informant_list`; Ch7 deserters → `ch07_ruiz` (speakers `deserter`) and `ch07_recovery_detail`; Ch9 dam gate → `ch09_galena_gate`.

**v2 scene list (89):** see `gameplay_hooks.json → chapters[].scenes` (authoritative order) or `README.md`.

## 8. Enemies and encounters (`gameplay_hooks.enemy_types`, `gameplay_hooks.encounters`)

| Old | New |
|---|---|
| `wolf` | `coyote` (same `dog` AI) |
| — | `tallman` (new `code_kind: stalker`; fallback `dog` AI on a tall mesh; max 3 active; heat-seeking, flees sustained light) |
| — | `tallman_glimpse` (non-interactable billboard, Ch2–6) |
| — | `recovery_detail` (variant of `remnant_patrol`, Ch7) |
| `enc_ch06_escape_house`, `enc_ch06_harbor_retaliation` | `enc_ch06_trench_fight` |
| hard-coded table in `js/story.js encounterTypes()` | read `gameplay_hooks.encounters` (27 entries, each with `chapter`, `enemies[]`, `note`) |
| — | **New:** `enc_ch04_ramp_chase`, `enc_ch04_dutch_ambush`, `enc_ch04_lund_fight`, `enc_ch07_road_tallman`, `enc_ch07_tolliver`, `enc_ch07_recovery_detail`, `enc_ch07_holds_tallman`, `enc_ch09_ice_tallmen`, `enc_ch10_siege_n1`, `enc_ch10_siege_n2`, `enc_ch10_siege_n3` |
| — | `assimilated_human` (Act III "Hollow"; `code_kind: mimic`, fallback `husk` AI; carries `tells[]`, `voice_lines[]`; Ch8–10 only) |
| — | `assimilated_animal` (Act III animal Hollow; `code_kind: dog`; silent pack; Ch8–10 only) |
| — | **New (Act III):** `enc_ch08_hollow_first` (human ×1), `enc_ch08_door_mimic` (human ×1), `enc_ch09_hollow_ambush` (human ×2), `enc_ch09_animal_pack` (animal ×5), `enc_ch10_hollow_prowlers` (human ×2 + animal ×3) |
| `husk` | unchanged id; still a living, sick person (talk-down possible). **Not** a Hollow |

## 9. Endings (`endings.json`, `flags.json.endings`)

| Old | New |
|---|---|
| `end_iron_range` | `end_stillwater` ("Stillwater") |
| `end_warm_room`, `end_ledger`, `end_dark_water`, `end_two_coats` | same ids, new text |
| Theo modifier | **Pearce family modifier** (`ross_alive`, `wes_alive`, `pearce_reconciled`). Epilogue text only, never a death rule. |

## 10. Events and rules

| Old | New |
|---|---|
| event `set_theo_side_from_location` | removed (Carly picks `carly_side` herself in `ch06_carly_side`) |
| rule `theo_checkpoint_rule` | removed |
| chapter-end medicine checks at Ch3/Ch7/Ch9 (`insulin_check` in levels) | removed; no replacement |
| `PLACEHOLDER`/`startingFlags()` defaults `theo_alive`, `hank_alive` | drop. Defaults now come from `flags.json` (`wraith_alive`, `walt_alive`, `ross_alive`, `wes_alive` … default `true`) |

## 11. REMOVED outright (no replacement)

| Kind | Ids |
|---|---|
| Items | `insulin_vial`, `cool_pack`, `lake_cooler`; `systems/items.json` legacy alias `insulin`; starting loadout `insulin_vial: 3`; loot entries in the Ch1 pharmacy and the hospital |
| Crafting | `lake_cooler` recipe (`systems/crafting.json`) |
| Flags | `theo_insulin_lapses`, `theo_alive`, `theo_helped_cooler`, `theo_skipping_known`, `ch01_cooler_built`, `ames_deal`, `insulin_found`, `insulin_given`, `insulin_held`, `insulin_check` |
| Quests | `q_cooler` / `q_insulin` / `q_find_theo` (mapped above to new quests with new content) |
| Rules | `theo_checkpoint_rule`, all chapter-end medicine checks |
| Level objects | `ch01_cooler_station` (repurpose as `ch01_water_station`), the "Build a lake-water cooler" objective, `insulin_vial` guaranteed drop |

---

## 12. Seasons and timeline (v2 addition, `gameplay_hooks.json`)

v1 started in October with frost. **v2 starts in late-summer heat.** New per-chapter key `season` (`late_summer|autumn|late_fall|nuclear_winter`) plus `night_temp_c` and `survival_focus`; new top-level `seasons{}`, `timeline{}`; new `weather_types` `heat_haze`, `dust_wind`, `clear_autumn`, `autumn_wind`.

| Ch | `season` | `date` | `weather` | `temp_c` / `night_temp_c` | `survival_focus` |
|---|---|---|---|---|---|
| ch01 | `late_summer` | Day 3 (Wed Aug 26, Year 1) | `heat_haze` | 35 / 18 | hydration, heat, spoiled_food, dust |
| ch02 | `late_summer` | Day 19 (Fri Sep 11, Year 1) | `dust_wind` | 33 / 15 | hydration, heat, crowds, dust |
| ch03 | `autumn` | Day 50 (Mon Oct 12, Year 1) | `clear_autumn` | 14 / 4 | first_cold_nights, fuel, fire |
| ch04 | `autumn` | Day 66 (Wed Oct 28, Year 1) | `autumn_wind` | 12 / 5 | cold_nights, fuel, heating |
| ch05 | `late_fall` | Day 83 (Sat Nov 14, Year 1) | `sleet` | 2 / −3 | warmth, wet_cold, wind |
| ch06 | `late_fall` | Day 96 (Fri Nov 27, Year 1) | `overcast` | 1 / −3 | warmth, wet_cold, curfew |
| ch07 | `late_fall` | Day 104 (Sat Dec 5) → mid-December | `overcast`; `weather_after_bursts: brown_sky` | −1 / −3 | warmth, wind, desert_night_cold |
| ch08 | `nuclear_winter` | January, Year 2 | `fallout_rain`; `weather_late: ashfall` | −10 / −18 | warmth, radiation, filters, seal, dread |
| ch09 | `nuclear_winter` | Early February, Year 2 | `blizzard` | −40 / −45 | warmth, exposure, column, dread |
| ch10 | `nuclear_winter` | Late February, Year 2 | `ashfall` | −34 / −45 | warmth, light, power, dread |

Anchors (`timeline`): Day 0 = Sun Aug 23, Year 1; Annex diesel out = Day 16, Tue Sep 8; bursts = Day 104, Sat Dec 5. `hud_unlocks`: Ch1 `hp`, `hydration`, `hunger`, `companion`; Ch3 `warmth`, `temp`; Ch5 `ammo_military`; Ch7 `rad`; Ch8 `filter`, `seal`. Changed lines: Tolliver held the gate **92 days** (was 271); Salt: "watching me since **September**"; Reyne: diesel ran out in **September**.

## 13. Act III: the Hollows (v2 addition)
The Tallmen assimilate people and animals into hostile **Hollows** that keep a voice and shape. The count stays unknown; `tallmen_killed`/`den_killed` are unchanged. Tells: Wraith growls with hackles up at a Hollow and whines softly at a real husk; no breath plume in sub-zero air; off-cadence borrowed voices; wrong gait; flat eye-shine. Block: `gameplay_hooks.assimilation`.

| Kind | Ids |
|---|---|
| Enemy types | `assimilated_human`, `assimilated_animal` (match `systems/enemies.json`) |
| Encounters | `enc_ch08_hollow_first`, `enc_ch08_door_mimic`, `enc_ch09_hollow_ambush`, `enc_ch09_animal_pack`, `enc_ch10_hollow_prowlers` |
| Flags | `assimilation_discovered`, `mimic_let_in`, `assimilated_killed`, `wraith_mimic_warned`, `ch09_voice_followed` |
| New scenes | `ch08_henley_house`, `ch09_voices` |
| Changed scenes | `ch07_reyne_secret` (node `many2` foreshadow), `ch08_husk` (node `h1w`), `ch08_door` (midnight knock `k1..k3`, `slot`, `wait`), `ch10_siege_night2` (`v1`, `v2w`, `v2x`, `v3`), `ch10_siege_night3` (`n0`, `n1x`, `n1v`), `ch10_epilogue` (`wr4`) |
| Speaker | generic `hollow` |
| Item text | `annex_log` gains the redacted "TISSUE INTEGRATION" page |
| Chapter effects | Ch9 start: `if mimic_let_in → column_size −1` |

## Retired v1 terms

`validate.py` reads the first column of this table and fails on any whole-word, case-insensitive match in any other `.md/.json/.py/.sh/.txt` file under `story/`.

| Old term | Replacement / note |
|---|---|
| `Dell` | Braith (`braith`) |
| `Theo` | Carly (`carly`) |
| `Superior` | Reno / Sparks, Nevada |
| `Duluth` | Reno / Sparks, Nevada |
| `Thomson Dam` | Galena Station (`loc_galena_station`) |
| `Blatnik` | Virginia Street bridge (`loc_virginia_bridge`) |
| `Hibbing` | Yerington / Fallon (Lahontan Compact) |
| `Iron Range` | Lahontan Compact / `end_stillwater` |
| `insulin` | removed (no medical mechanic) |
| `diabetes` | removed |
| `diabetic` | removed |
| `cool_pack` | removed |
| `lake_cooler` | removed |
| `tallmen_remaining` | `tallmen_killed` + `den_killed` (count unknown) |
| `marguerite` | `lolo` |
| `wren` | `kit` |
| `hank` | `walt` |
| `cody` | `wes` |
| `jory` | `ander` |
| `Lakehead` | `loc_meadows_general` |
| `Belknap` | `loc_prater_pharmacy` |
| `Jay Cooke` | `loc_steamboat_creek` |
| `ore_docks` | `loc_silver_spur` |
| `lift_bridge` | `loc_rail_trench` / `ch06_the_trench` |
| `hwy53` | `loc_i80_blockade` |
| `east_end` | `loc_sparks_block` |
| `set_theo_side_from_location` | removed |

---

## Action lists for other teams (story did not touch these)

### Cartographer (`levels/`)
1. Rename location ids per §1 in every level file; add the new locations each chapter uses (`gameplay_hooks.chapters[].locations`).
2. Rename `ch06_the_lift_bridge.json` → `ch06_the_trench.json`; replace the bridge-lift set piece with `freight_car_drop` over `loc_rail_trench`.
3. Create `ch07b_dixie_valley.json` (Annex exterior + `loc_annex_holds` interior + optional `loc_dixie_hotsprings`). Enemy budget: 6 `recovery_detail`, ≤2 active `tallman` (+2 torpid in the den, non-hostile unless shot), 3 `coyote`, Tolliver (neutral). Wing B: flooded stair, collapsed ceiling, door bent outward (not enterable).
4. Ch1: repurpose `ch01_cooler_station` → `ch01_water_station`; drop the medicine loot and cooler objective; add Wraith spawn and follow nav, a scent trail, Carly at home, a phone, and 10–15 ambient neighbors. Ch2: `ch02_insulin_secured` → `ch02_card_secured`; add the east-ridge glimpse trigger at the hospital exit.
5. Place `tallman_glimpse` billboards from `gameplay_hooks.chapters[].tallman_glimpses` (Ch2–Ch6; non-interactable, no collider or AI).
6. Update dialogue scene references per §7 and speaker/extra ids per §3; remove the `insulin_check` blocks (Ch3/Ch7/Ch9).
7. Place trader stalls and ambient NPCs per `chapters[].traders` / `chapters[].ambient_npcs` (density notes are in each `chapters/*.md`).
8. **Seasonal palettes:** Ch1–2 levels are late-summer (dust, dry lawns, no snow tiles or frost); Ch3–4 autumn; Ch5–7 sleet/frost; Ch8–10 ash and snow. See `seasons{}`.
9. **Act III spawns:** Ch8 `ch08_ashfall`: the Henley house interior on `loc_sparks_block` (Dale facing the kitchen wall; `enc_ch08_hollow_first`), the shelter door with a mail slot (`enc_ch08_door_mimic`); budget `assimilated_human` ×2, `assimilated_animal` ×2. Ch9: `assimilated_human` ×2 off the rope line, `assimilated_animal` ×5 pack on the river ice (`enc_ch09_hollow_ambush`, `enc_ch09_animal_pack`); coyotes reduced to 2. Ch10: `assimilated_human` ×2 + `assimilated_animal` ×3 past the lamp line (`enc_ch10_hollow_prowlers`).
10. Re-run `levels/tools/validate.py`.

### Quartermaster (`systems/`)
1. Remove `insulin_vial`, `cool_pack`, `lake_cooler`, the `insulin` alias, the loadout entry, the loot entries and the `lake_cooler` recipe.
2. Add items from §5 (`gpu_cart`, `control_cards`, `lamp_kit`, `annex_log`, `rumor`, `spur_chip`, `vet_kit`, `water_dirty`, `water_clean`, `bucket`, `pruitt_scarf`, `ross_letter`, `ammo_9mm`) with barter values; `mask_filter` loads into the gas mask (HUD FILTER).
3. **Act III enemy defs:** `assimilated_human` (mimic: stands still, approaches doors, plays `voice_lines`, flees sustained light, no breath-plume VFX) and `assimilated_animal` (dog AI, pack of up to 5, silent). Encounters in §13.
4. **Seasonal survival:** Ch1–2 drain `hydration` with heat (no warmth drain); `warmth` + `temp` HUD unlock at Ch3 (`hud_unlocks`); Ch8–10 warmth is the main pressure. Clothing/heat items should be summer-irrelevant in Ch1–2.
5. Rename `lineman_tools` → `mech_tools`, `hank_keys` → `walt_keys`; `wolf` → `coyote`; add enemies `tallman`, `tallman_glimpse`, `recovery_detail`.
6. `systems/enemies.json`: `strand_stance` → `avila_stance`. `loot_tables.json`: `wren_dealt` → `kit_dealt`.
7. Trader stock/price tables: `npcs.json.traders[].stock_by_act` and `price_mult_by_act`; barter rules in `gameplay_hooks.barter`.

### Echoes (audio)
1. **Mimic barks:** `enemy_types.assimilated_human.voice_lines[]` ("Let me in. I have filters.", "Morning, neighbor.", "Over here. I found the trail." in Walt's voice, "Halvorsen's here. He's fine.", "Open the gate, Pearce."...). Play them **off-cadence**: the same take repeated with identical inflection, slightly wrong pauses, no breathing between phrases. Re-use the voice of a known NPC where the scene names one (Walt, Halvorsen, Lolo, Braith).
2. **Animal distortion:** `assimilated_animal` packs move **silent** (no panting, no paw sounds on ash); one stretched, pitched-down yip when they commit.
3. **Wraith:** two distinct cues: low growl with a hackle rattle (Hollow), soft whine plus nose-nudge (real husk). These carry gameplay information; keep them clearly different.
4. **Seasons:** Ch1–2 cicadas, hot dry wind, generator hum, open-window street noise; Ch3–4 dry leaves, first wind; Ch5–7 sleet hiss; Ch8–10 ash hush, blizzard roar, lamp-line ballast hum.

### Lumen (lighting/palette)
1. Season palettes from `gameplay_hooks.seasons[].palette`: `late_summer` **amber dust** and white sun glare with heat shimmer → `autumn` **autumn gold** → `late_fall` **overcast slate** → `nuclear_winter` **ashfall blue-grey**, near-monochrome.
2. Ch7 mid-chapter shift: green sky glow at the bursts, then `brown_sky`.
3. Act III: **floodlight cones** and flare red are the only warm colors. Every living NPC gets a visible **breath plume** in sub-zero scenes; Hollows never do (it's a tell, so don't drop it for performance).
4. Ch1–2: no frost decals, snow or visible breath anywhere.

### Prime (`js/`, art)
1. Player art: Braith paper doll (`assets/paperdoll/base_body.png`), HUD portrait, Air Force-style gas mask.
2. Wraith companion: follow/sniff/growl/limp/down states, HUD mini-portrait and HP, verbs TRACK/WARN/GUARD/HOLD (`gameplay_hooks.companion`); `trust.wraith` is a normal trust value. She never dies except in `ch09_wraith_hold`.
3. `js/story.js`: drop the `theo_alive`/`hank_alive` defaults (use `flags.json` defaults); read encounters from `gameplay_hooks.encounters`; the `npcName` fallback "panel" label should say Galena; the Ch1 fallback file list should use the new Ch1 scene ids (§7); `ambient_npcs` and `traders` from `npcs.json` should be accepted as speakers.
4. `js/levels.js`, `js/game.js`, `js/data/placeholderStory.js`: replace `theo_side` → `carly_side`, `jory_met` → `ander_met`, `ch01_wren_let_go` → `ch01_kit_let_go`, `end_iron_range` → `end_stillwater`, and drop the other placeholder ids in §4/§11.
5. Read `season`, `weather_late`/`weather_after_bursts` and `night_temp_c` per chapter; the `hollow` generic speaker; encounter ids in §13. Note `pickDialogue()` keeps `ch10_siege_night2/3` (Hollow beats) to night.
6. New events to handle: `hud_unlock` (e.g. `seal`, `filter`), `play_epilogue`, `time_skip`, `minigame`, `encounter` with the new ids. The `tallman` stalker AI (heat-seek, flee sustained light, hit-and-retreat, max 3 active) and the `lamp_line_siege` set piece.
7. `pickDialogue()` hides scene ids containing "night" during the day. That's intended for `ch03_night_owl` and `ch10_siege_night1..3`.
