# story/ — ASHFALL: Truckee Meadows (Revision 2, FINAL APPROVED)

Narrative data for the game. `js/story.js` loads this folder live.

**Status (Nov 23, 2026):** Revision 2 is implemented. `python3 story/validate.py` → **0 errors, 0 warnings**. All v1 content has been removed; the id map for other teams is in **`MIGRATION_V1_TO_V2.md`**.

## What's here
| Path | Contents |
|---|---|
| `story_bible.md` | The world, cast, Tallmen rules, the Hollows (§5a), seasons and timeline (§6), chapters, endings |
| `revision2_proposal.md` | The approved design record (FINAL APPROVED header; decisions at approval in §12) |
| `chapters/` | 10 chapter docs, `ch01_day_three.md` … `ch10_the_warm_room.md` (Ch7 covers both `ch07_dead_air` and `ch07b_dixie_valley`) |
| `dialogue/` | 89 scenes. Ch1–Ch2 are fully playable; Ch3–Ch10 cover every key beat, every trader, the Annex, the Ch9 Wraith choice, the Act III Hollows, the Ch10 siege and a branching epilogue for all 5 endings |
| `npcs.json` | 15 main NPCs, 7 minor, 10 ambient, 6 traders, generic speakers, 7 factions |
| `flags.json` / `endings.json` | 148 flags with types, defaults, meanings, set/read sites; 5 endings |
| `items.json` / `quests.json` | 45 story items; 14 quests |
| `gameplay_hooks.json` | Seasons, timeline, assimilation (Hollows) block; per-chapter levels, season, weather, day/night temperature, survival focus, locations, enemies, encounters, traders, ambient NPCs, set pieces, Tallman glimpses, scenes, start/end effects |
| `SCHEMA.md` | Data format, events and hard rules |
| `MIGRATION_V1_TO_V2.md` | Old → new ids, removed ids, action lists for Cartographer / Quartermaster / Prime, retired terms |
| `validate.py` | Integrity checker |
| `authoring/` | Python generators; `authoring/build_all.sh` rebuilds every JSON file and chapter doc, then validates |

## Seasons at a glance
| Ch | `season` | Date | Weather | °C day / night |
|---|---|---|---|---|
| 1 | `late_summer` | Day 3, Wed Aug 26, Year 1 | `heat_haze` | 35 / 18 |
| 2 | `late_summer` | Day 19, Fri Sep 11 | `dust_wind` | 33 / 15 |
| 3 | `autumn` | Day 50, Mon Oct 12 | `clear_autumn` | 14 / 4 |
| 4 | `autumn` | Day 66, Wed Oct 28 | `autumn_wind` | 12 / 5 |
| 5 | `late_fall` | Day 83, Sat Nov 14 | `sleet` | 2 / −3 |
| 6 | `late_fall` | Day 96, Fri Nov 27 | `overcast` | 1 / −3 |
| 7 | `late_fall` | Day 104, Sat Dec 5 → mid-Dec | `overcast` → `brown_sky` | −1 / −3 |
| 8 | `nuclear_winter` | January, Year 2 | `fallout_rain` → `ashfall` | −10 / −18 |
| 9 | `nuclear_winter` | Early February | `blizzard` | −40 / −45 |
| 10 | `nuclear_winter` | Late February | `ashfall` | −34 / −45 |

Ch1–2 are a heat-and-hydration game (no frost, snow, coats or cold breath; the validator lints for it). Warmth matters from Ch3.

## Act III: the Hollows
From Ch8 the Tallmen leave **Hollows**: assimilated people (`assimilated_human`) and animals (`assimilated_animal`) that keep a voice and a shape. Tells: Wraith growls with hackles up (she whines at real husks), no breath plume in the cold, off-cadence borrowed voices. Scenes `ch08_henley_house`, `ch08_door`, `ch09_voices`, `ch10_siege_night2/3`. The count is unknown; `assimilated_killed` only counts kills.

## Editing
Edit the generator in `authoring/` (`d01.py`…`d10.py` dialogue, `npcs.py`, `hooks.py`, `meta.py` items/quests, `flags.py` flags/endings, `chapters.py` chapter docs), then run:
```sh
sh story/authoring/build_all.sh
```
Hand edits to generated JSON are overwritten by the next build.

## Ids at a glance
- Player speaker `braith`. Companions `carly`, `wraith`. Family `ross`, `wes`.
- Main: `lolo`, `gil`, `kit`, `avila`, `augie`, `walt`, `ames`, `roz`, `ander`, `ruiz` ("Engineer Two"), `reyne`.
- Minor: `pruitt`, `deshawn`, `cpl_haas`, `pete_lund`, `rosa`, `kessler`, `sfc_brandt`.
- Ambient: `amb_brother_amos`, `amb_lonnie`, `amb_salt`, `amb_darlene`, `amb_bike_kids`, `amb_deputy_lusk`, `amb_ruth`, `amb_pvt_marsh`, `amb_night_owl`, `amb_tolliver`.
- Traders: `trader_dutch`, `trader_mo`, `trader_rourke`, `trader_annie`, `trader_boone`, `trader_floor`.
- Enemies (v2 Act III): `assimilated_human`, `assimilated_animal`. Seasons: `late_summer`, `autumn`, `late_fall`, `nuclear_winter`.
- Endings: `end_warm_room`, `end_ledger`, `end_stillwater`, `end_dark_water`, `end_two_coats`.
