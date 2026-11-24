# Chapter 9: The Long Night

*Act 3 · season `nuclear_winter` · Early February, Year 2 · level id(s): ch09_the_long_night*

## Summary

Early February, Year 2. −40 °C, −45 at night. The Truckee is frozen. Braith leads a column of everyone who trusts him from Sparks up the river ice and Steamboat Creek to Galena in a blizzard. The Remnant has a picket on the Glendale bridge. In the whiteout a voice calls from off the rope line in Walt's voice while Walt sleeps on the sled; then a silent pack of assimilated coyotes walks out of the ash in step. The ice breaks. Tallmen shadow the column in pairs and threes. If Wraith is hurt, the one signposted choice that can kill her appears. Walt doesn't make it to the gate.

## Goals

- Lead the column (column_size).
- Pass the picket at the Glendale bridge.
- The ice.
- Salt's culvert.
- Survive the whiteout.
- Reach Galena; install the control cards if not done.

## NPCs

Carly, Wraith, Kit (sled), Ruiz, Walt, Salt, Wes, Pvt. Marsh, Tolliver (if joined), Rourke (river camp), Kessler (picket).

## Key beats

- Kit arrives with an Army sled (trust.kit>=5).
- The picket: Ruiz's gap (ch09_ruiz_gap), an ironwood_id, or an assault.
- The voice in the whiteout (ch09_voices): Walt's voice off the rope while Walt sleeps on the sled. Follow it, hold with flares, or walk on. Then the silent coyote pack (enc_ch09_animal_pack).
- The ice breaks: save a person or the sled (ch09_saved). Who the person is depends on who's in the column: Wes, Kit, or a kid.
- If wraith_injured, Tallmen corner the column: [Order Wraith to hold the line] → a plain-language confirmation → she holds and doesn't come back. Or carry her (column −2, health and stamina cost), or fight.
- Wraith leads through the whiteout if she's healthy and trust.wraith>=5.
- Salt's culvert: dead, or warm and following if he was fed or left a flashlight.
- Walt on the sled near the end. The steam over the ridge.

## Choices & consequences

| Choice | Consequence |
|---|---|
| Save a person or the sled | ch09_saved; Wes/Kit deaths resolve at chapter end. |
| Order Wraith to hold the line (only if injured; confirmed) | ch09_wraith_hold; the ONLY place wraith_alive becomes false. |
| Carry Wraith | column_size −2; stat costs. |
| The voice: follow / hold the rope / walk on | ch09_voice_followed (column −1), assimilated_killed. |

## Flags

ch09_voice_followed, assimilated_killed, wraith_mimic_warned, column_size, ch09_sled_brought, ch09_ruiz_gap, ch09_saved, ch09_wraith_hold, wraith_alive, wraith_led, tallmen_killed, cards_installed. End of chapter: walt_alive=false, wes_alive/kit_alive.

## Level notes (for Cartographer)

Level ch09_the_long_night: the column of 5–25 people, a river camp (Rourke), pickets. Nobody else alive on the ice. Tallmen ≤3.

## Gameplay hooks

*Generated from `gameplay_hooks.json` and `npcs.json` by `authoring/chapters.py`.*

- **Level file(s):** `ch09_the_long_night`
- **Season:** `nuclear_winter` (January – late February, Year 2). Palette: ashfall blue-grey, near-monochrome; floodlight cones and flare red are the only warm colors.
- **Date / weather / temperature:** Early February, Year 2; `blizzard`; -40 °C, night -45 °C. Time of day: polar_noon, night.
- **Survival focus:** warmth, exposure, column, dread. HUD unlocks: none new.

**Locations**

- `loc_sparks_block`: Braith and Carly's block, old Sparks near Prater Way. HUD SECTOR 4. Lolo's clinic, Gil's garage, the Pruitts.
- `river_ice`: The frozen Truckee from Sparks east to the Steamboat Creek confluence. Ch9 blizzard march; Glendale bridge picket.
- `loc_steamboat_creek`: Steamboat Creek corridor and hot-spring vents. Salt's culvert. Approach to Galena.
- `loc_galena_station`: Galena Station geothermal plant (fictional, at the Steamboat field): well field, steam, break room, control room, fence and lamp line.

**Enemies** (max active counts; Tallmen are never a horde, never more than 3 visible)

- `remnant_patrol` ×8
- `ironwood_checkpoint` ×1
- `ironwood_drone` ×1: Grounded by blizzard; visual only
- `coyote` ×2
- `assimilated_animal` ×5: Silent pack on river_ice (enc_ch09_animal_pack)
- `assimilated_human` ×2: Voice ambush in the whiteout (enc_ch09_hollow_ambush)
- `husk` ×4
- `tallman` ×3: Max 3 active; shadow the column in the whiteout; probe stragglers

**Encounters** (`gameplay_hooks.encounters`)

- `enc_ch09_picket_assault`: remnant_patrol×6, ironwood_checkpoint×1
- `enc_ch09_hollow_ambush`: assimilated_human×2. Whiteout voice ambush (ch09_voices): a Hollow calls in Walt's voice off the rope line. Following it costs one column member.
- `enc_ch09_animal_pack`: assimilated_animal×5. Assimilated coyote pack on river_ice (ch09_voices). Silent; flee flares; break off after losing 2.
- `enc_ch09_ice_tallmen`: tallman×3. Max 3; they test, then break off after losing 1.

**Traders**

- `trader_rourke` (Wendell Rourke): loc_peavine_shack (Ch3), loc_i80_blockade (Ch5), loc_us50_fallon (Ch7), river_ice camp (Ch9). Trades whiskey, candles, maps, tea, reloading supplies, rumor; wants stories, rumor, salt. Rep flag `trader_rourke_rep`. Hook: Get his burros through the Ch5 canyon; reward: the Annex rumor (annex_known).

**Ambient NPCs**

- `amb_salt` ('Salt'): Desert hermit in a culvert by the Steamboat hot springs. First person to name the Tallmen: 'They've been watching me since September.'
- `amb_pvt_marsh` (Pvt. Danny Marsh): Ironwood deserter hiding in a 4th Street motel after refusing to clear a house with kids in it.
- `amb_tolliver` (Mr. Tolliver): Annex contractor guard who held the gate alone for 92 days, uniform still ironed.

**Set pieces**

- Whiteout on the river
- A voice off the rope line in Walt's voice (enc_ch09_hollow_ambush)
- Silent assimilated coyote pack on the ice (enc_ch09_animal_pack)
- Searchlight picket on the Glendale bridge
- ice_break_qte
- Wraith's hold (only if wraith_injured)
- Steam over the ridge

**Tallman glimpses** (non-interactable billboards; no collider or AI)

- None scripted in this chapter. Real Tallmen from Ch7 on.

**Items placed or awarded**

`sled`, `firewood`, `tent_tarp`, `flare`, `rifle_ammo`, `mask_filter`, `wool_blanket`, `ironwood_id`, `control_cards`

**Player actions:** blizzard_march, escort_column, stealth_or_assault, timed_choice, companion_lead

**Dialogue scenes** (in order)

- `ch09_kit_sled` @ `loc_sparks_block`: Before the march: Kit arrives with an Army sled (if trust.kit>=5 and kit_alive). *(conditional)*
- `ch09_picket` @ `river_ice`: The Remnant picket at the Glendale bridge over the frozen Truckee.
- `ch09_voices` @ `river_ice`: Whiteout on the river: a mimic calls in Walt's voice (enc_ch09_hollow_ambush), then an assimilated coyote pack (enc_ch09_animal_pack).
- `ch09_ice` @ `river_ice`: Set piece: the ice breaks (ice_break_qte). Save a person or the sled.
- `ch09_wraith_hold` @ `river_ice`: If wraith_injured: Tallmen corner the column on the ice. The ONE signposted choice that can kill Wraith. *(conditional)*
- `ch09_salt` @ `loc_steamboat_creek`: Salt's culvert on Steamboat Creek.
- `ch09_walt` @ `loc_steamboat_creek`: Walt, on the sled, near the end. *(conditional)*
- `ch09_wraith_lead` @ `loc_steamboat_creek`: If wraith_alive and NOT wraith_injured and trust.wraith>=5: trail lost in the whiteout; Wraith leads. *(conditional)*
- `ch09_galena_gate` @ `loc_galena_station`: Arrival at Galena's gate (v1 gap: gate scene). Install the control cards if not done.

**Chapter start/end effects:** see `gameplay_hooks.json` → `chapters[].chapter_start_effects` / `chapter_end_effects`.
