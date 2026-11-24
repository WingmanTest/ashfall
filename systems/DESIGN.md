# ASHFALL: Lakehead — Systems & Balance Design (v1)

Owner: Quartermaster (systems/balance). Data lives in `/workspace/game2/systems/`; schema is in `README.md`.
Numbers are authored at the **default mode, `tense_but_fair` (all multipliers 1.0)**. Every other mode is a multiplier set in `difficulty.json`.

## 1. Design pillars

1. **Warmth is the key stat.** It drains the fastest outdoors, it's driven by the chapter's climate, night, weather and blizzards, and it multiplies every other pressure (cold raises hunger, slows stamina, adds aim sway). Fire is the main "save point" of the body.
2. **Scavenging is the core loop; crafting is tertiary.** There are 8 recipes, each with 1–2 ingredients and no stations except a lit campfire. Clothing, weapons, ammo, food, meds and purification tablets come **only from loot**, so every cupboard matters.
3. **Tense but fair.** Per chapter, the player finds about **1.0–1.2×** the food they need, **0.5–0.85×** the clean water (the gap is covered by snow/lake water that costs firewood or tablets, or costs warmth if eaten raw), and **0.6–1.0×** the ammo they'd need to shoot everything. Being short on something is normal. Being hard-locked is designed out (see §6).
4. **Story-true enemies.** Ch1–4 are people only. The federal Army arrives in Ch5. Dogs appear from Ch7, wolves from Ch9. **Husks** (sick, freezing *people*) appear from Ch8. There are no zombies, mutants or ghouls. Radiation is a hazard and never a monster source. This gating is enforced by `tools/validate.py`.
5. **Escalation follows four systems acts** that Echo asked for, mapped onto Loremaster's 3 story acts:

| Systems act | Story act | Chapters | Feel |
|---|---|---|---|
| `blackout` | I The Dark | ch01 Day Three, ch02 The Registry | Canned food in cupboards, mild cold (6 °C → −4 °C), few guns. People are the threat. |
| `collapse` | I→II | ch03 The Long Cold, ch04 Black Start | The deep cold hits (−30 °C). Firewood and clothing matter most. Pipe shotguns and deer rifles appear. |
| `civil_war` | II The Split | ch05 Route 9, ch06 The Lift Bridge, ch07 Dead Air | Spring and summer warmth, guns and ammo flow, Ironwood fireteams and checkpoints. Ch7 brings the first dogs and the dosimeter. |
| `nuclear_winter` | III Ashfall | ch08 Ashfall, ch09 The Long Night, ch10 The Warm Room | −45 °C, fallout rain, husks, ferals and the Remnant. Everything is scarce. |

## 2. Time model
- The game ticks in **real seconds** (`dt`). `CFG.dayLenSec = 420`, so **1 real s = 3.43 in-game minutes** and a 24 h day takes 7 real minutes.
- Every rate in `survival.json` is given as `per_real_second` (authoritative) and `per_game_minute` (for UI).
- Chapter length estimates (real minutes), used for the budget: 25 / 25 / 30 / 30 / 30 / 35 / 25 / 35 / 40 / 20, about **5 h total**.

## 3. Survival model (default)

| Stat | Range | Base rate (real s) | Empties in | Main pressure |
|---|---|---|---|---|
| Warmth | 0–100 | −0.30 outdoors × climate × weather × (1 − insulation) | ~16 min (Ch1 day, start clothes; ~11 min at night) to **~2.6 min** (Ch9 blizzard night, good clothes) | climate, night ×1.4, blizzard ×2.2, wet ×1.75 |
| Satiety (`stats.hunger`) | 0–100 | −0.055 | ~30 min | cold ×1.25, rad ×1.3 |
| Hydration (new) | 0–100 | −0.075 | ~22 min | sprint ×1.3, sick ×1.5 |
| Stamina | 0–100 | +18 / −22 sprint | — | warmth, hunger, thirst thresholds |
| Radiation (dose) | 0–100 | zones 0.12 / 0.4 / 1.0, fallout rain 0.25 | — | mask_filter ×0.2, iodide ×0.5, SEAL |
| Health | 0–100 | soft regen +0.04 up to 70 | — | meds above 70 |

Thresholds go from mild (stamina regen) to moderate (aim sway, speed) to lethal (health drain). Damage only starts at **warmth < 20, satiety < 10, hydration < 10 and rad ≥ 75**, which gives the player a long warning band.

**Recommended code changes** (Echo, in `Player.tickSurvival`): warmth drain 1.15 → 0.30 base × modifiers, hunger drain 0.32 → 0.055, fire regen 28 → 5/s, hypothermia damage 6 → 1.2/s, rad natural decay 0.15 → 0.01. The current values empty warmth in ~70 s and hunger in ~5 min. That works for a demo but would make a 30-minute chapter impossible.

## 4. Pacing curve

| Ch | Act | Climate (°C, weather) | ambient_cold | Expected threat | Enemy mix (story hooks) |
|---|---|---|---|---|---|
| ch01 | blackout | 6, overcast | 0.5 | 2 | looter, watch_militia (mostly non-hostile) |
| ch02 | blackout | −4, snow | 0.7 | 9 | 3 looters (garage); 6 authority_guard neutral |
| ch03 | collapse | −30, clear_cold | 1.25 | 23 | bridge_boy raid ×6, watch_militia |
| ch04 | collapse | −24, snow | 1.15 | 13 | Lunds, 2 bridge_boys, Authority standoff |
| ch05 | civil_war | −8, freezing_rain | 0.85 | 30 | compact_militia ×8 **or** ironwood_patrol ×4; drone, MRAP |
| ch06 | civil_war | 4, drizzle | 0.4 | **85 (spike)** | ironwood_patrol ×12, checkpoint, drones, Bradley; Harbor/Compact if held |
| ch07 | civil_war | 2, brown_sky | 0.5 | 16 (breather) | feral_dog ×4, Remnant (conditional) |
| ch08 | nuclear_winter | −10, fallout_rain | 0.9 | 31 | husk ×6, feral_dog ×5, looters, Remnant |
| ch09 | nuclear_winter | −45, blizzard | 1.8 | **69 (cold + combat peak)** | Remnant ×8, picket, wolves ×5, husk ×4 |
| ch10 | nuclear_winter | −38, clear_cold | 1.5 | 28 (0 if stand-down) | Remnant ×8, MRAP |

The curve has two peaks: **Ch6 (combat)** and **Ch9 (cold plus combat)**, with Ch7 as a deliberate breather before Act III. Ch6 uses the story's count of 12 patrols. Level design should offer stealth and sweep-avoid routes so the full count is rarely fought at once (`max_concurrent` 6).

## 5. Resource budget (default mode, expected values)

Generated by `tools/validate.py` → `budget_report.json`. The **found** column includes container loot × act modifiers, guaranteed story/level items, the story `start_inventory`, and 75% of expected enemy drops. Ratios = found / needed.

Model assumptions: needs come from chapter minutes × drain. Clean water counts bottled + boiled water + tablets × 35. Firewood need = 3 per campfire, with half of lost warmth recovered at scripted heated places and ~60 warmth per fire stop. Damage expected = 4.5 hp per expected threat point. Healing = meds + soft regen + one safe-house sleep (+30). Gun damage needed = enemy hp ÷ (1 − bullet resist) × gun share of kills (0.2 / 0.35 / 0.6 / 0.5 by act). Ammo is converted at 55% hit rate.

| Ch | Act | Min | Satiety need / found | Clean-water hydr. need / found | Firewood need / found (fires) | Dmg expected / healing | Gun dmg need / found | 9mm · 12ga · rifle · 5.56 found | Threat (exp.) |
|---|---|---|---|---|---|---|---|---|---|
| ch01 | blackout | 25 | 86 / 103 (**1.2**) | 112 / 52 (**0.46**) | 3.3 / 5.7 (0.8) | 8 / 121 (**14.95**) | 8 / 36 (**4.48**) | 1 · 1 · 0.4 · 0.0 | 1.8 |
| ch02 | blackout | 25 | 87 / 101 (**1.16**) | 112 / 73 (**0.65**) | 4.3 / 5.2 (1.1) | 40 / 96 (**2.36**) | 48 / 68 (**1.41**) | 3 · 1 · 0.4 · 0.0 | 9.0 |
| ch03 | collapse | 30 | 111 / 132 (**1.19**) | 135 / 84 (**0.62**) | 10.2 / 11.1 (3.1) | 103 / 105 (**1.02**) | 168 / 170 (**1.01**) | 4 · 2 · 3.0 · 0.3 | 22.8 |
| ch04 | collapse | 30 | 109 / 98 (**0.9**) | 135 / 102 (**0.76**) | 7.5 / 8.8 (2.2) | 58 / 77 (**1.32**) | 94 / 96 (**1.02**) | 4 · 1 · 0.8 · 0.6 | 12.9 |
| ch05 | civil_war | 30 | 108 / 118 (**1.09**) | 135 / 116 (**0.86**) | 6.5 / 6.8 (1.8) | 137 / 153 (**1.12**) | 368 / 510 (**1.39**) | 9 · 3 · 5.2 · 15.4 | 30.4 |
| ch06 | civil_war | 35 | 120 / 137 (**1.15**) | 158 / 100 (**0.64**) | 3.2 / 2.2 (0.7) | 381 / 332 (**0.87**) | 995 / 947 (**0.95**) | 10 · 4 · 2.1 · 54.0 | 84.6 |
| ch07 | civil_war | 25 | 86 / 94 (**1.09**) | 112 / 61 (**0.54**) | 2.9 / 3.2 (0.6) | 71 / 75 (**1.05**) | 174 / 180 (**1.04**) | 3 · 2 · 1.0 · 6.3 | 15.8 |
| ch08 | nuclear_winter | 35 | 136 / 143 (**1.05**) | 158 / 85 (**0.54**) | 5.7 / 6.9 (1.6) | 141 / 154 (**1.09**) | 350 / 247 (**0.7**) | 6 · 2 · 1.8 · 7.0 | 31.3 |
| ch09 | nuclear_winter | 40 | 175 / 184 (**1.05**) | 180 / 137 (**0.76**) | 18.6 / 18.7 (5.9) | 312 / 272 (**0.87**) | 632 / 445 (**0.7**) | 5 · 1 · 0.8 · 26.3 | 69.3 |
| ch10 | nuclear_winter | 20 | 78 / 95 (**1.23**) | 90 / 55 (**0.62**) | 3.6 / 1.9 (0.9) | 126 / 105 (**0.83**) | 253 / 205 (**0.81**) | 3 · 1 · 0.4 · 11.5 | 28.0 |

**Cumulative** (with carry-over), default: food 1.1, healing 1.08, ammo 0.94, clean water 0.65 by Ch10. In other words, a player who scavenges well has a thin surplus, and one who skips rooms or fights everything runs dry in Act III.

Other modes (cumulative by Ch10; reports in `budget_report.<mode>.json`):

| Mode | Food | Healing | Ammo | Clean water |
|---|---|---|---|---|
| story | ~2.0 | ~3.0 | ~2.3 | ~1.3 |
| **tense_but_fair** (default) | **1.1** | **1.08** | **0.94** | **0.65** |
| hard_winter | ~0.87 | ~0.64 | ~0.48 | ~0.49 |
| whiteout | ~0.73 | ~0.42 | ~0.28 | ~0.38 |

Hard Winter and Whiteout are below 1.0 on food by design. They assume traders, skipped fights, and the free snow/lake water valve. **Whiteout + Permadeath is meant to be lost sometimes.**

Early chapters (Ch1–2) show high healing and ammo ratios because almost nothing there is hostile. The absolute amounts are tiny (a few rounds and bandages) and form a starter buffer.

## 6. Anti-hard-lock valves
- **Thirst:** snow and lake water are always available (`eat_snow` costs −6 warmth; `water_dirty` can make you sick 30% of the time, and in Act IV adds +6 rad). Boiling costs firewood, and tablets make it fully clean.
- **Cold:** heated safe houses and scripted burn barrels on every Ch3/Ch9 route. A campfire costs only 3 firewood + 1 cloth, and woodpiles appear in every cold chapter.
- **Food:** traders (Ray, Wren, Bea, Lou, Ames) take barter at any time, and Ch2 has the ration hand-out. Starvation damage starts slowly (−0.15/s below 10).
- **Ammo:** melee is always available and repairable (`weapon_repair` = scrap 2 + wire 1). Enemies flee, surrender and can be talked to. Dogs and wolves flee fire and flares.
- **Story items** (`quest: true`) are never scaled by difficulty and are always guaranteed.

## 7. Crafting (tertiary, 8 recipes)
`bandage` (cloth 2) · `campfire` (firewood 3 + cloth 1, placed) · `molotov` (fuel + cloth) · `torch` (firewood + cloth) · `splint` (firewood + cloth) · `clothing_patch` (cloth 2) · `weapon_repair` (scrap 2 + wire 1, melee only) · `boil_water` (water_dirty, near a campfire). There is also the story one-off `lake_cooler` (bucket + wire, Ch1, per hooks). Materials are trimmed to **cloth, firewood, fuel, scrap, wire**. The `coat`, `pipe` and `filter` recipes from config.js are removed (now loot-only).

## 8. Combat numbers
- TTK at default: a looter (60 hp) takes 3 pipe hits or 4 pistol hits. An Ironwood soldier (100 hp, 30% bullet resist) takes ~8 pistol rounds, 4 close shotgun blasts or 3 deer-rifle body shots (1–2 with headshots). A feral dog takes 2 knife hits. A husk takes 3 pipe hits.
- Guns are loud (35–70 m noise radius) and alert enemies. Melee is quiet (2–5 m). This is the stealth/ammo trade-off.
- 5.56 rifles (M4A1 `service_rifle`, civilian `ar15`) have 30-round mags but are ammo-limited: 5.56 is a trickle in collapse (≈0.3–0.6 rounds expected per chapter), flows in Ch5–6 (≈16 / 55) and Ch9 (≈26), and is scarce elsewhere.

## 9. Progression & economy
- **Gear-gated** with no XP: lineman_tools → crowbar → bolt_cutters → dosimeter / sled → mask_filter (Ch8). Clothing insulation is the real power curve (expected 0.30 → 0.62 combined).
- **Perks:** pick 1 of 3 at the end of ch02, ch04, ch06 and ch08 (pool of 10, all small: −12% cold drain, +40% heals, etc.).
- **Barter:** 1 ration tin = value 10. Buy price = value × act price multiplier × trader markup × difficulty; selling returns 50%. Food costs 2.2× and rad gear 2.5× in nuclear winter, while ammo is cheaper during the civil war (0.8×). Trust ≥ 3 gives a 15% discount.

## 10. Tuning knobs (first ones to turn)
| Symptom in playtest | Knob |
|---|---|
| Cold feels unfair | `survival.chapter_climate.<ch>.ambient_cold`, `stats.warmth.base_drain`, `weather_modifiers.blizzard` |
| Too much/too little food | `loot_tables.act_modifiers.<act>.category_weight_mult.food`, kitchen_cabinet counts in `areas` |
| Ammo glut in civil war | `act_modifiers.civil_war.category_weight_mult.ammo` (1.4), military_crate ammo_556 qty |
| Fights too hard | `enemies.<id>.attack.accuracy`, `hostile_chance` in `chapter_curve.spawns` |
| Whole game too easy/hard | add a mode in `difficulty.json`; never edit base files for that |
Re-run `python3 tools/validate.py` after any change. It re-prints the budget table and warns when a ratio leaves its target band (`progression.resource_budget.targets_ratio_found_over_needed`).

## 11. AR-15 (added at user request)
`ar15` is a civilian semi-auto AR-15 in 5.56 (`ammo_556`, shared with the M4A1).

| | `ar15` (civilian) | `service_rifle` (M4A1, military) |
|---|---|---|
| Damage / headshot | 24 / ×2.0 | 24 / ×2.0 (same cartridge) |
| Fire modes | **semi only**, 3.5 shots/s | semi 4.0/s **+ auto 11/s** (spread ×2.5) |
| Magazine / reload | 30 / 2.6 s | 30 / 2.4 s |
| Range / falloff / spread | 45 m / 22 m / 1.2° (ADS ×0.5, iron sights) | 45 m / 25 m / 1.0° (ADS ×0.4, red dot) |
| Durability | **320**, 4% jam when < 50% | 500, no jam |
| Value / weight | 90 / 3.0 kg | 110 / 3.3 kg |
| First act | **collapse** (Ch3) | civil_war (Ch5) |

**Where it drops:** `gun_safe` (new rare hand-placed container: ch03 east end prepper house, ch04 Jay Cooke hunting cabin, ch06 and ch08 east end), `supply_cache` (w 0.12), `car_trunk` (w 0.06), and drops from bridge_boy (0.12), watch_militia (0.2), compact_militia (0.35, and 20% of them carry one) and harbor_militia (0.15). In collapse its weight is ×0.6 (`item_act_weight_mult`). Expected finds per playthrough are about 0.75 (≈0.1 per chapter in Ch3–4 and ≈0.2 in Ch5–6). Most players see one around Ch3–6. Ironwood and Remnant soldiers now drop their M4A1 (w 0.25), so the military rifle becomes reachable in Ch6–9.

**5.56 budget:** `ammo_556` now unlocks in collapse at ×0.25 weight (≈0.3 rounds in Ch3, ≈0.6 in Ch4), so an early AR-15 is mostly a prize you can't feed yet. A whole act of collapse yields less than one magazine. Civil-war totals are unchanged in kind: Compact militia drops (w 1.2, 3–8 rounds) add ≈4 rounds in Ch5. Gun safes added a little 9mm/rifle ammo to Ch3–4, offset by removing one dam locker in Ch4. Ch3–4 ammo ratios sit at ≈1.0 (target band 0.5–1.0).
