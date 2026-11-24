# Chapter 3: The Long Cold
**Act I** · Day 60 (Dec 13) · Superior → Proctor · Dialogue: `dialogue/ch03_*.json`

## Summary
The first real cold: −30 °C. People burn their furniture. The block watch is a militia now. A family down the street was turned away by everyone and froze in their car. Dell needs to get to Hank in Proctor because he has an idea about the dam. Before she can go, the Bridge Boys hit Ray's house.

## Goals
1. Get through the night of the fire.
2. Cross the frozen city to Proctor (exposure: warmth management).
3. Find Hank at Lou's radio shack.
4. Decide who learns about the dam.

## Locations
`loc_east_end` (night, fire) → `loc_proctor_yard` (frozen rail yard) → `loc_lou_shack` · optional: `loc_ore_docks` (Harbor soup line, Bea)

## NPCs
wren, ray, hank, lou, bea (optional), strand (radio or in person), marguerite, theo

## Key beats
1. **Wren's warning** (only if `trust.wren >= 3`): "Don't sleep tonight, Sparky. The garage across the alley." → `ch03_wren_warning`
2. **The fire.** The Bridge Boys break into Ray's garage for the diesel. If `ch02_reported_ray` is set, the Authority already requisitioned it and the boys find nothing, so they burn the house out of spite. Help Ray defend, help him escape, or stay inside with Theo. → `ch03_ray_fire`
3. **Frozen walk.** The rail yard at dawn: frozen bodies in a boxcar, people stripping a dead man's boots. Burn barrels give warmth stops.
4. **Hank and Lou.** The shack hums on a car battery. Hank: Thomson Unit 2 can black-start on its own if someone opens the headgates and fakes the relay. He needs a relay kit from the Authority depot, or time. → `ch03_hank_proctor`
5. **Who to tell?** Strand will send soldiers to secure it. Bea will send volunteers and keep it. Or tell no one. → `ch03_dam_secret`

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Defend Ray / help him out / stay in | `ray_house_burned`, `ch03_helped_ray`, kindness | `ray_alive` stays true unless you stay in AND `ray_house_burned` (he's badly burned, and his fate is checked in Ch6) |
| Tell Strand | `dam_secret_told=authority`, rep_authority+2 | Ch4: soldiers arrive mid-start; Hank may be shot (if `trust.strand<2`) |
| Tell Bea | `dam_secret_told=harbor`, rep_harbor+2 | Ch4: Harbor volunteers help; Strand learns later (trust −2) |
| Tell no one | `dam_secret_told=none`, Hank trust+2 | Ch4: harder trip, no help, nobody owed |

## Flags
- **Set:** `ch03_wren_warned`, `ray_house_burned`, `ch03_helped_ray`, `ray_alive`, `hank_recruited`, `lou_met`, `dam_secret_told`, `hank_secret_known`
- **Read:** `ch02_reported_ray`, `trust.wren`, `ch01_ray_traded`
- **Checkpoint (end of chapter):** insulin check → `theo_insulin_lapses`

## Gameplay hooks
- **Player does:** night defense (short firefight or stealth carry), long cold traverse with warmth stops, scavenging boots/coats, dialogue.
- **Enemies (people only):** 4–6 `bridge_boy` (fire raid, can be scared off by firing over their heads, fleeing at 50% losses); `watch_militia` patrol in Proctor (avoid, or talk past them with a ration card).
- **Items:** `firewood`, `wool_blanket`, `boots_insulated`, `hand_radio`, `batteries`, `rifle_ammo`.
- **Weather/time:** clear, −30 °C, night → dawn. **TEMP is the main threat**: warmth drains fast outside; burn barrels and indoor spaces restore it.
