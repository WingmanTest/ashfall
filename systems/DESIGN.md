# Systems & Balance Design — Nevada Revision 2

Sparks/Reno and the Lahontan Valley, from a late-summer blackout to a nuclear fallout winter. Player Braith Pearce with Wraith. This revision migrates every systems id to story Revision 2 and adds two user directions: an **evolving seasonal survival curve** and **nuclear-winter survival-horror enemies** (the Hollows).

## 1. Design pillars
1. **Looting is the core loop; crafting is tertiary** (8 one- or two-ingredient recipes, no workbench).
2. **Tense but fair** default: careful play is rarely starved; careless play runs short. Never a hard lock.
3. **The season is the antagonist that changes.** Ch1–2 kill you with heat and thirst, Ch3–4 with cold nights, Ch5–7 with wet cold and soldiers, Ch8–10 with lethal cold, fallout and things in the ash.
4. **Grounded horror.** Husks are sick people. Tallmen and Hollows are a creature family from the Annex, never contagious to the player, never a horde, and their numbers are never stated.
5. **Light is a weapon.** Flashlight, flares, campfires and the lamp line repel Tallmen and break Hollow mimicry, so ammo is only part of the answer.

## 2. Seasonal survival curve
| ch | season | °C day / night | cold mult day / night | thirst day / night-indoors | heat-stress threshold | rad/s outdoors | blizzard | weather weights |
|---|---|---|---|---|---|---|---|---|
| ch01 | `late_summer` | 35 / 18 | 0.0 / 0.08 | 1.75 / 1.15 | 0.2 | 0.0 | 0 | heat_haze 0.75, dust_wind 0.25 |
| ch02 | `late_summer` | 33 / 15 | 0.0 / 0.2 | 1.6 / 1.1 | 0.22 | 0.0 | 0 | dust_wind 0.6, heat_haze 0.4 |
| ch03 | `autumn` | 14 / 4 | 0.24 / 0.64 | 1.1 / 1.0 | 0.45 | 0.0 | 0 | clear_autumn 0.7, autumn_wind 0.3 |
| ch04 | `autumn` | 12 / 5 | 0.32 / 0.6 | 1.0 / 0.95 | 0.5 | 0.0 | 0 | autumn_wind 0.6, clear_autumn 0.25, frost 0.15 |
| ch05 | `late_fall` | 2 / -3 | 0.72 / 0.92 | 1.0 / 0.9 | 0.8 | 0.0 | 0.0 | sleet 0.55, overcast 0.3, frost 0.15 |
| ch06 | `late_fall` | 1 / -3 | 0.76 / 0.92 | 1.0 / 0.9 | 0.8 | 0.0 | 0.0 | overcast 0.55, sleet 0.3, frost 0.15 |
| ch07 | `late_fall` | -1 / -3 | 0.84 / 0.92 | 1.0 / 0.9 | 0.85 | 0.02 | 0.05 | overcast 0.35, brown_sky 0.35, frost 0.15, grey_snow 0.15 |
| ch08 | `nuclear_winter` | -10 / -18 | 1.2 / 1.52 | 0.95 / 0.9 | — (off) | 0.06 | 0.3 | fallout_rain 0.45, ashfall 0.35, blizzard 0.2 |
| ch09 | `nuclear_winter` | -40 / -45 | 2.4 / 2.6 | 0.95 / 0.9 | — (off) | 0.04 | 0.85 | blizzard 0.7, ashfall 0.3 |
| ch10 | `nuclear_winter` | -34 / -45 | 2.16 / 2.6 | 0.95 / 0.9 | — (off) | 0.03 | 0.4 | ashfall 0.45, clear_cold 0.35, blizzard 0.2 |

How the numbers feel with season-typical clothing at the default difficulty, from a full bar:

| | outfit (insulation) | warmth bar day / night | water bar outdoors by day |
|---|---|---|---|
| Ch1 late summer, heat_haze | tee, jeans, sneakers, cap (0.08) | never drains by day (regen +0.6/s) / ~75 min | **~11.5 min** (19 min at night/indoors) |
| Ch1 same, wearing parka + bibs + pac boots | heat_load 0.68 | — | **~4.7 min** (heat stress ×2.44; stamina costs ×1.96) |
| Ch2 late summer, dust_wind | summer kit | — / ~30 min | ~12.6 min |
| Ch3 autumn, clear | tee + flannel + work jacket + work boots + knit gloves (0.41) | ~39 min / ~15 min | ~20 min |
| Ch5 late fall, sleet | thermal + wool coat + pac boots + hat + gloves + poncho (0.63) | ~17 min / ~14 min (same kit without coat and poncho: ~11 min, plus 'wet') | ~22 min |
| Ch8 nuclear winter, fallout rain | full winter kit (0.75 cap) | ~14 min / ~11 min | ~23 min |
| Ch9 nuclear winter, blizzard | full winter kit | **~4 min** / ~4 min | ~23 min |
| Ch10 nuclear winter, ashfall | full winter kit | ~9 min / ~7 min | ~23 min |

The validator's seasonal summary reads: average daytime thirst multiplier 1.68 in Ch1–2 vs 0.95 in Ch8–10, and an average cold multiplier (60/40 day/night) of 0.056 → 0.416 → 0.832 → 2.048 across the four seasons. That makes winter about 37× colder than late summer.

**Heat stress** (late summer, and autumn days in heavy gear): `heat_load = Σ heat_penalty`, and the thresholds are 0.20–0.22 (late summer), 0.45–0.50 (autumn) and 0.80–0.85 (late fall). Nuclear winter has none. Summer clothing has a heat_penalty of 0–0.04, so the late-summer start kit sits at 0.02. A wool coat is 0.30 and a parka is 0.40–0.50. Wearing the coat you found "for later" costs water you don't have, so the player has to carry it instead and pay in weight.

**Water**: clean water is scarcest in late summer, at 0.74 / 0.62 of need in Ch1 / Ch2. The gap is meant to be filled by the Ch1 marina run (`ch01_lake_edge` gives 4 untreated water, boiled at `ch01_water_station`), by boiling Truckee / ditch / rain-barrel water at a fire, or by drinking raw water and risking 'sick'. Hot-spring water at Steamboat Creek is a trap: boiling doesn't fix the minerals, only tablets do. In nuclear winter, snow is free but carries fallout.

## 3. Pacing curve (threat per chapter, default)
ch01 3.0 · ch02 9.0 · ch03 21.6 · ch04 10.65 · ch05 30.4 · ch06 84.6 · ch07 54.3 · ch08 58.1 · ch09 100.2 · ch10 64.4

Peaks: Ch6 (the Army sweep and trench fight), Ch9 (whiteout march: Remnant picket + Tallmen + Hollow ambush + coyotes + husks), and Ch10 (siege). Ch7 adds the first Tallman and coyotes. Ch8 is dread more than volume: 2 Hollows, 2 animal Hollows and 2 Tallmen trailing husks.

## 4. Resource budget (expected found ÷ needed)
Default **tense_but_fair**:

| ch | season | food | clean water | firewood | healing | ammo | threat |
|---|---|---|---|---|---|---|---|
| ch01 | late_summer | 1.12 | 0.74 | 4.27 | 9.0 | 3.94 | 3.0 |
| ch02 | late_summer | 0.9 | 0.62 | 0.23 | 2.36 | 1.49 | 9.0 |
| ch03 | autumn | 1.06 | 0.62 | 3.35 | 1.08 | 0.69 | 21.6 |
| ch04 | autumn | 1.11 | 0.69 | 1.36 | 1.62 | 1.0 | 10.65 |
| ch05 | late_fall | 0.95 | 0.83 | 1.24 | 1.19 | 1.38 | 30.4 |
| ch06 | late_fall | 1.02 | 0.84 | 0.94 | 0.95 | 0.88 | 84.6 |
| ch07 | late_fall | 1.05 | 0.94 | 1.4 | 1.06 | 1.07 | 54.3 |
| ch08 | nuclear_winter | 1.12 | 0.79 | 1.24 | 1.16 | 0.72 | 58.1 |
| ch09 | nuclear_winter | 0.92 | 0.71 | 0.93 | 0.78 | 0.76 | 100.2 |
| ch10 | nuclear_winter | 0.92 | 0.58 | 1.45 | 1.01 | 0.95 | 64.4 |

Cumulative by Ch10: food 1.02, healing 1.09, ammo 0.92, clean water 0.74.
Other modes (cumulative by Ch10, food / healing / ammo / water): story 1.67 / 3.01 / 2.47 / 1.62; hard_winter 0.81 / 0.65 / 0.49 / 0.51; whiteout 0.7 / 0.44 / 0.3 / 0.39.

Targets: food 0.85–1.2; firewood 0.9–1.5; healing 0.75–1.2; clean water by season (late_summer 0.5–0.8, autumn/late_fall 0.55–0.95, nuclear_winter 0.45–0.9); ammo by act (blackout 0.3–1.0, collapse 0.5–1.0, civil_war 0.8–1.4, nuclear_winter 0.5–0.95). Firewood in Ch1–2 is skipped because need < 4 in summer. Food need includes Wraith (2 food items per chapter). The ammo need for Tallmen uses `budget_kill_share` 0.35, because most Tallman fights end with light rather than a kill. Ch1 healing and ammo ratios are huge only because almost no fighting is expected there.

The AR-15 still averages about 0.79 per playthrough, first from Ch3 gun safes.

## 5. Anti-hard-lock valves
Free water every season (`drink_raw` / `eat_snow`), boiling, soft health regen to 70, sleeping at safe houses, warm interiors (Galena after the Ch4 black start, and the Warm Room), traders, and story gives (Ch8 starts with 6 filters and 2 iodide). Wraith's TRACK finds caches.

## 6. Enemies added in Revision 2
- **coyote** (replaces the v1 pack animal): hp 32, speed 4.4, packs of 3–5, hit and run, flees flares. `dog` AI.
- **recovery_detail**: `remnant_patrol` at 60% HP (57). Starving, low ammo, can be talked down (Ruiz, ironwood_id, 3 canned food).
- **tallman** (`stalker`, fallback `dog`): hp 220, bullet resistance 0.35, 28 damage per strike with 40% bleed. Heat-seeks within 45 m; sealed shelters hide heat by SEAL%. Retreats 25 m after 2 s in a flashlight cone, inside a 6 m flare radius, under floodlights, or near a campfire. Strikes once, then retreats. Max 3 active; the group disengages after losing 2 or at dawn. Kill → `tallmen_killed +1`. The two torpid den Tallmen are non-hostile unless shot.
- **tallman_glimpse**: billboard set piece, Ch2–6. No collider or AI, ≥80 m away, despawns within 60 m or on LOS loss. `tallman_glimpses +1`.

### Hollows (Ch8–10): `assimilated_human` and `assimilated_animal`
| | assimilated_human ("Hollow") | assimilated_animal ("Hollow (animal)") |
|---|---|---|
| code kind | `mimic` → fallback `husk` | `mimic_beast` → fallback `dog` (story lists `dog`) |
| stats | hp 90, threat 6, walk 1.4 / lunge 5.5 m/s, 24 damage (×1.5 on the first ambush hit), stagger resistance 0.6, fire −0.4 | hp 50, threat 3, 4.6 m/s, 15 damage, 5 m pounce, fire −0.6 |
| behavior | Repeats story voice lines off-cadence ('Let me in. I have filters.', 'Braith?', 'Open the gate, Pearce.'), knocks at doors, waits at doorways and fog edges. Stands unnaturally still until you come within 6 m or light it for 1 s. 6 m lunge, prefers flanks. 1 s of light breaks the disguise (35% lunge / 65% retreat); 2 s of sustained light always makes it retreat. In the door mimic encounter, SEAL drops while the door is open. Cannot be talked down. | Packs of 3–5 moving in eerie unison. Holds 2 m outside your light radius, waits instead of circling, whimpers like a hurt dog, then pounces together. Tests the floodlight poles. Flees flares for 8 s, won't enter a campfire radius, ignores a flashlight alone. Breaks off after losing 2. |
| telegraphs | No breath plume, neck turning past the shoulders, ash-veined skin, eyes that reflect flat, wrong-cadence voice, static-like clicking breath. Wraith growls with hackles up and refuses to approach (`wraith_mimic_warned`). | Wrong synchronized gait, elongated joints, flat eyes, silent footsteps, hollow rattle, no yips. Wraith goes silent and places herself between them and Braith. |
| drops | Modest pockets: cloth, a can, batteries, a note, a bandage, rarely a filter (45% empty) | Nothing: tainted carcass, no safe meat |
| counter | `assimilated_killed +1` (separate from `tallmen_killed`; no totals) | same |
| spawns (story-mandated) | ch08 ×2 (Henley house, midnight door), ch09 ×2 (whiteout voice ambush), ch10 ×2 (siege night 2) | ch08 ×2, ch09 ×5 (river_ice pack), ch10 ×3 (pole edges) |

Husks stay distinct: sick, living people who rush food and heat, can be talked down (iodide + blanket + kindness ≥4), and get Wraith's soft whine.

## 7. Six-trader economy
Price = value × trader act multiplier (story) × seasonal category multiplier × item seasonal multiplier × wanted-good 0.7 × rep ≥3 0.85 × difficulty. Currencies evolve with the acts. In Act I it's Authority ration cards (a weekly draw of 2 rations, 4 with the essential-worker card), cigarettes, cans, batteries and ammo. In Act II the Floor pays in Silver Spur chips (`spur_chip`, value 5, honored at full value only by `trader_floor`; Dutch takes them at half), and diesel, ammo, rumors and whiskey also trade. In Act III it's filters, diesel, batteries, ammo and **warm-bunk nights** at Galena (value 30). `rumor` (value 12, weightless) is currency with Rourke and Dutch.
- **Dutch** (4th Street, Ch2/6): ×1.0 then ×1.5; gone in Act III. If rep ≤ −1 he sells your route to the Viaduct Crew (`enc_ch04_dutch_ambush`).
- **Mo** (Mustang truck stop, Ch5/8): ×2 then ×3; the last fuel in the valley; fixing her pump (`q_mo_pump`) earns standing credit.
- **Rourke** (Peavine → I-80 → Fallon → river camp): flat ×1.0; trades in stories and rumors; his escort quest earns the Annex rumor.
- **Annie** (RSCC → library → Warm Room): ×0.8 → ×1.2 → ×1.5; antibiotics, iodide and vet kits.
- **Boone** (Sparks yard, Ch5/8): ×1.5 then ×3. 1-in-3 of his Ch8 filters are expired unless you inspect them (§README).
- **Floor commissary** (Silver Spur, Ch6): takes only spur_chip; prices fall with `rep_harbor`.

## 8. Crafting (8 recipes)
bandage (cloth 2) · campfire (firewood 3 + cloth) · molotov (fuel + cloth) · torch (firewood + cloth) · splint (firewood + cloth) · clothing_patch (cloth 2) · weapon_repair (scrap 2 + wire) · boil_water (untreated water, at a campfire). There are no story recipes in v2. The Ch1 water station is a level interactive.

## 9. Tuning knobs (turn these first)
1. Late-summer heat: `chapter_climate.ch01–02.thirst_drain_mult`, the `heat_stress` coefficients, and `difficulty.heat_stress_mult`.
2. Water scarcity: `item_act_weight_mult.water_clean` and `act_modifiers.blackout.category_weight_mult.water`.
3. Cold ramp: the cold formula `(20 − temp)/25` and the blizzard `warmth_drain_mult` of 2.2.
4. Horror pressure: Tallman `threat_cost` / `budget_kill_share`, Hollow damage and lunge range, and the spawn `hostile_chance` values.
5. Economy: trader `price_mult_by_act` (owned by story) and `category_season_mult` (owned by systems).

## 10. Open items / assumptions
- Playtime estimates (~5 h total) drive every budget number. Retune after playtests.
- Boone's filter text: story dialogue says "half the box" is expired, while systems uses 1 in 3 per Loremaster's and Prime's direction. Loremaster may want to align the wording.
- `assimilated_animal` code kind: story says `dog`; systems says `mimic_beast` with fallback `dog`. They behave the same if the engine lacks `mimic_beast`.
- `radio_crystal` and `start_battery` remain only as legacy js world-spot fillers.
