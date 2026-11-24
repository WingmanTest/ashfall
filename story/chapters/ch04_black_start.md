# Chapter 4: Black Start

*Act 2 · season `autumn` · Day 66 (Wed Oct 28, Year 1) · level id(s): ch04_black_start*

## Summary

Day 66: Wednesday, October 28. Late autumn wind, cold nights, the valley thinking about winter heat. Galena can't black-start without outside power for its pumps and controls. Braith takes a -86 ground power cart off the Air Guard ramp at Reno-Tahoe at night, tows it up the Steamboat Creek road past Salt's culvert, clears the Lund family squatting in the break room, and brings Unit 1 up with Walt. Steam lights the dark. There's a shape in the steam.

## Goals

- Take the ground power cart (q_ground_power; gpu_method).
- Tow it up Steamboat Creek.
- Deal with the Lunds.
- Black start Unit 1 (mg_black_start).
- Choose the first feeder (power_priority).

## NPCs

Walt, Salt (ambient), Pete Lund and Mia, Avila (if told), Dutch (ambush, if rep low).

## Key beats

- C-130s asleep under a cold moon. Stealth, talk or force your way to Hangar 2.
- If trader_dutch_rep<=-1: the Viaduct Crew is waiting on the Steamboat road (ch04_dutch_ambush).
- Salt in his culvert: 'They've been watching me since September.' The first person to name them.
- The Lunds: fight, pay, or make them crew (lunds_stayed).
- If dam_secret_told=authority: Avila's Guard arrives with conditions (ch04_standoff, relay_source).
- Black start. The turbine spins up; steam lit from below; a tall shape stands inside the plume.

## Choices & consequences

| Choice | Consequence |
|---|---|
| gpu_method: stealth / talk / force | force raises rep_authority loss and the ramp chase. |
| The Lunds: stay as crew / leave / fight | lunds_stayed counts toward the Warm Room. |
| First feeder: hospital / Floor / Authority | power_priority; hospital → Ames saves Braith's hand in Ch8. |

## Flags

gpu_method, dutch_betrayed, salt_met, salt_fed, lunds_stayed, relay_source, dam_running, power_priority, tallman_glimpses.

## Level notes (for Cartographer)

Level ch04_black_start: empty roads, burned cars, an airfield guard. gpu_tow set piece. Wraith won't go near the cooling towers.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch04_black_start`
- **Season:** `autumn` (October, Year 1). Palette: autumn gold, yellow cottonwoods along the Truckee, long shadows.
- **Date / weather / temperature:** Day 66 (Wed Oct 28, Year 1); `autumn_wind`; 12 °C, night 5 °C. Time of day: night, dawn.
- **Survival focus:** cold_nights, fuel, heating. HUD unlocks: none new.

**Locations**

- `loc_airguard_ramp`: Air Guard ramp, Reno-Tahoe Airport. C-130s parked in rows; -86 ground power carts by Hangar 2.
- `loc_steamboat_creek`: Steamboat Creek corridor and hot-spring vents. Salt's culvert. Approach to Galena.
- `loc_galena_station`: Galena Station geothermal plant (fictional, at the Steamboat field): well field, steam, break room, control room, fence and lamp line.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `desperate_family` ×1: Pete Lund
- `bridge_boy` ×5: Only if trader_dutch_rep<=-1 (Dutch's ambush)
- `authority_guard` ×8: Ramp sentry (1) + standoff only if dam_secret_told=authority

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch04_ramp_chase`: authority_guard×3. Tug chase off the ramp; no kills required.
- `enc_ch04_dutch_ambush`: bridge_boy×5. Only if trader_dutch_rep<=-1.
- `enc_ch04_lund_fight`: desperate_family×1. Avoidable.

**Traders**

- None in this chapter.

**Ambient NPCs**

- `amb_salt` ('Salt'): Desert hermit in a culvert by the Steamboat hot springs. First person to name the Tallmen: 'They've been watching me since September.'

**Set pieces**

- C-130s asleep under a cold moon
- gpu_tow
- Turbine spin-up; steam lit from below
- Shape in the steam

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- `glimpse_ch04_steam`: Galena steam field, ~120 m, an upright shape inside the steam plume; gone when the plume shifts.  Played inside ch04_black_start.
- `glimpse_ch04_cow`: A dead cow in a field with its chest opened; no figure.  Static prop, not a creature.

**Items placed or awarded**

`gpu_cart`, `relay_kit`, `walt_keys`, `mech_tools`, `canned_food`, `firewood`, `flashlight`

**Player actions:** stealth_or_talk, tow_vehicle, negotiate, minigame_black_start, valves_levers

**Minigames:** `mg_black_start`

**Dialogue scenes** (in order)

- `ch04_airguard_ramp` @ `loc_airguard_ramp`: Night. The Air Guard ramp at Reno-Tahoe. The -86 ground power cart.
- `ch04_dutch_ambush` @ `loc_steamboat_creek`: On the Steamboat road, if trader_dutch_rep <= -1: Dutch sold your route. *(conditional)*
- `ch04_salt_culvert` @ `loc_steamboat_creek`: Pass the culvert by the hot springs on Steamboat Creek.
- `ch04_lunds` @ `loc_galena_station`: The Lund family squatting in the plant's break room.
- `ch04_standoff` @ `loc_galena_station`: If dam_secret_told=authority: Avila's Guard arrives with conditions. *(conditional)*
- `ch04_black_start` @ `loc_galena_station`: After mg_black_start succeeds: the plant comes up.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
