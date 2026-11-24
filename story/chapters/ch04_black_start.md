# Chapter 4: Black Start
**Act II: The Split** · Late January · Jay Cooke → Thomson Dam · Dialogue: `dialogue/ch04_*.json`

## Summary
Hank and Dell (with Theo, or help depending on `dam_secret_told`) walk up the frozen St. Louis River to Thomson hydro station. Someone is already living in the powerhouse: the Lunds, a farm family from Esko with three kids, who've been burning the plant's manuals for heat. Restarting Unit 2 means opening the headgates, faking a relay, and bringing a dead machine up by hand. Then the first line has to go *somewhere*.

## Goals
1. Reach the dam (Jay Cooke swinging bridge, frozen gorge).
2. Deal with the Lunds in the powerhouse.
3. Get a relay: Authority kit (if told Strand), Harbor-stolen kit (if told Bea), or Hank's improvised bypass (a longer, dangerous minigame).
4. Black start: headgate wheel → exciter → sync → close breaker.
5. Choose the first line.

## Locations
`loc_jay_cooke` → `loc_thomson_dam` (headgate deck, powerhouse floor, control room)

## NPCs
hank, theo, bea or strand (depending on `dam_secret_told`) · minor: the Lund family (Pete Lund, 40, and wife Annie, with kids)

## Key beats
1. **Swinging bridge.** Ice and wind. A short balance sequence. Hank tells a story that turns out to be the startup sequence.
2. **The Lunds.** Pete has a shotgun and three hungry kids. Options: talk (share food, they stay as plant hands), threaten (they leave into the cold), or pay. → `ch04_lunds`
3. **Standoff** (if `dam_secret_told=authority`): Guard soldiers arrive. If `trust.strand < 2` a nervous private fires and Hank is hit (`hank_alive=false`, so Theo/Dell must finish the start alone).
4. **Black start.** Hank coughs blood; Dell learns his secret if she presses. The turbine spins up; lights flicker across the control room. → `ch04_black_start`
5. **The first line.** One feeder can be energized. Hospital (Lakehead Memorial), Harbor (ore docks, elevators, soup kitchens), or Authority (DECC, comms, the Proctor rail signals).

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Lunds stay | `lunds_stayed`, kindness+1 | Ch9: the Lunds keep the plant warm and unlock the side door |
| Lunds driven out | `lunds_stayed=false` | Ch8: Pete Lund is among the husks (`ch08` special encounter) |
| Power → hospital | `power_priority=hospital`, `ames_deal` | Ch8: Ames saves Theo's foot; Theo's insulin is secure |
| Power → Harbor | `power_priority=harbor`, rep_harbor+2 | Ch6: the Harbor can raise the lift bridge |
| Power → Authority | `power_priority=authority`, rep_authority+2, Hank trust−3 | Ch5: Ironwood learns of the dam through Authority comms |

## Flags
- **Set:** `lunds_stayed`, `hank_alive`, `hank_secret_known`, `relay_source`, `dam_running`, `power_priority`, `ames_deal`
- **Read:** `dam_secret_told`, `trust.strand`, `ch01_ray_traded` (no lineman tools = Hank's tools, longer), `hank_recruited`

## Gameplay hooks
- **Player does:** traverse (swinging bridge balance), negotiate or fight the Lunds, the **black-start minigame** (4 steps, mistakes trip the breaker and drain time), lever/valve interaction.
- **Enemies (people only):** Lund family (`desperate_family`, 1 armed adult, hostile only if threatened); optional `bridge_boy` scavengers (2) on the river ice; `authority_guard` squad (story-driven standoff).
- **Items:** `relay_kit`, `hank_keys`, `lineman_tools`, `canned_food`, `firewood`.
- **Weather/time:** snow, −24 °C, day → night. When the lights come on at night, the control room is the first warm space in the game (a big warmth restore).
