# ASHFALL: Truckee Meadows — Story Bible (Revision 2, FINAL)

*Portrait 9:16, first-person, pixel-art survival. Nuclear winter in the high desert. This bible is the canon reference; ids in `code` match the data files. Approved Nov 23, 2026.*

---

## 1. Pitch

**Logline.** When a solar storm kills the grid, a 25-year-old ex-Air Force jet mechanic in Sparks, Nevada chooses to stay with the woman he loves instead of going home to his family's ranch. Then the country goes to war, his father and brother end up on the other side of it, and something that used to live behind powered doors in the desert starts walking toward the only warm place in the valley.

**Central question.** *Who gets the warmth?* The ground makes heat forever. People decide who it reaches, and Braith's own family is on more than one side of that answer.

**Tone.** Dark but hopeful. Losses are permanent and often delayed. `kindness` is a mechanic that pays off later. The best ending is earned hope, not rescue. Act I and early Act II are strictly people vs. people. Act III (Ch8–10) turns to grounded survival horror: the Tallmen assimilate people and animals into **Hollows** that keep their voices (§5a). Paranoia at the door, never gore, and the hope at the end is harder won for it.

**Hard rules**
- No chosen one. No "the government planned it all": the Annex is one more system that failed when the power did.
- No cartoon soldiers or raiders. No zombies. **No hordes, ever**: never more than 3 Tallmen visible at once.
- **The number of Tallmen is unknown**, to the player and to every character. Nobody states a total.
- **No medical clock** of any kind.
- **Wraith can die in exactly one place**: the signposted, confirmed Ch9 choice `ch09_wraith_hold`.
- Carly is never kidnapped, never rescued as a prize, and no scripted beat kills her.

---

## 2. The leads

### Braith Pearce (player, speaker `braith`), 25
- Grew up on his family's hay ranch outside Yerington (Mason Valley, Walker River water). Enlisted at 18; four years as an F-15E crew chief at Mountain Home AFB. On a TDY to the Fallon range he saw a fenced hangar at Dixie Valley that nobody was allowed to look at. Left the ranch after a fight with his father about staying. Now an A&P mechanic at Reno Stead.
- **Skills the story uses:** turbines (Galena's ORC units), hydraulics, generators and ground support equipment (the -86 ground power cart, `gpu_cart`: powers Galena in Ch4 and the Annex maglocks in Ch7), fuel handling, radio repair, and his Air Force gas mask (`has_gas_mask`, Ch8).
- **Voice.** Quiet and dry, flight-line shorthand. Fixes things when he's scared. Calls Wraith "partner" and Carly "Dispatch."
- **Arc: mechanic → steward.** Fixing the machine was the easy part. The list of who gets it is the job.

### Carly Redmond (`carly`), 26
- Six years a Washoe County 911 dispatcher. Grew up in foster care in Reno; the valley's people are her only family, which is why she won't leave on Day 0.
- **Voice.** Fast, precise triage language ("Address? Breathing? Okay."), and a dark joke a second after bad news.
- **Arc: triage → census.** Ch1 home after 70 hours on a dying dispatch floor. Ch2 takes a registry job (`carly_job`). Ch3 finds the falsified count (`carly_found_count`). Ch6 has quit and, with Augie, builds **the Switchboard** (`switchboard_built`), a hand-cranked radio relay between neighborhoods, and picks her own side (`carly_side`). Act III runs shelter intake; in the best ending the census board is hers.
- **Agency.** If `trust.carly <= -3` at the end of Ch6 she leaves (`carly_left`) and sits at her faction's table in Ch10. She does the rescuing at least twice (Ch3 fire, Ch8 door).

### Wraith (`wraith`), 4, Belgian Malinois
- Bred for the military working dog program, washed out as "too soft on the bite." Bright, intense, a little neurotic.
- **Verbs** (`gameplay_hooks.companion`): **TRACK** (scent from an item, e.g. `pruitt_scarf`), **WARN** (growls before enemies are visible; she sees Tallmen first), **GUARD** (posted at a door: fewer break-ins, holds SEAL at night), **HOLD** (pins one human; refuses Tallmen).
- **Hurt and care.** `wraith_injured`: she limps and can't TRACK until `vet_kit` or rest. At 0 HP she is **down**, never dead: carried or on the sled; recovers next chapter.
- **The only death:** Ch9, only if `wraith_injured`, when Tallmen corner the column on the ice. The choice "[Order Wraith to hold the line]" opens a confirmation: *"She's hurt. If you give this order, Wraith will not come back."* Confirming sets `ch09_wraith_hold` and `wraith_alive=false`. The alternatives are carrying her (column −2, health and stamina cost) or fighting.
- **Payoff.** `trust.wraith >= 5` and healthy: in the Ch9 whiteout she leads the column to Galena (`wraith_led`).

### The Pearces: the personal stake
- **Ross Pearce (`ross`), 58.** Hay rancher, widower, stubborn, decent. Becomes Ander's lieutenant in the Lahontan Compact. His Day 0 voicemail cuts off mid-sentence ("Come home, both of you, before—"). Met at the I-80 blockade (Ch5) and the Fallon checkpoint (Ch7). Survives Act III if Braith told the Compact what the Annex holds (`annex_told=compact`) or `rep_compact >= 1`.
- **Wes Pearce (`wes`), 19.** Funny, reckless, idolizes Braith and resents him for leaving. Rides a dirt bike to Sparks in Ch3 with `ross_letter` and a cooler of beef. Wounded at the blockade (Ch5): spared (`wes_spared`), left to Compact medics, or taken prisoner by Ironwood (`wes_prisoner`, freed by Ruiz in Ch6 or at the Ch10 gate). In Ch9 the ice may force "Wes or the sled."
- **Pearce family modifier** (read by every epilogue; never a death rule): `pearce_reconciled` is true at the end of Ch7 if Braith did **not** fire on the blockade AND (he pulled Wes out OR gave Ross an honest goodbye). The epilogue then plays a letter and a reunion, a letter, a one-line letter, or news of Ross's death.

---

## 3. Setting

The Reno/Sparks valley (Truckee Meadows): high desert at 4,500 ft between the Sierra and the Virginia Range. Casinos, railroad, I-80, giant warehouses, sage. The story starts in a late-summer heat wave (95 °F, dust, no AC) and walks the calendar down through a crisp October and a sleeting November to the December 5 bursts. Normal winters are dry; nuclear winter makes this one Siberian (§6). Ch7 adds the road east on US-50 through Fallon to the empty salt flats of Dixie Valley.

**Galena Station** (fictional, at the real Steamboat Springs geothermal field) sits on 160 °C water that comes out of the ground whether or not the country exists. It can't restart without outside power for its pumps and controls. Internal flag names `dam_running` and `dam_secret_told` are kept from v1 and mean Galena.

| id | Place | Role |
|---|---|---|
| `loc_sparks_block` | Braith and Carly's block, old Sparks near Prater Way (HUD SECTOR 4) | Home: Ch1/3/6/8 |
| `loc_prater_pharmacy` | Corner pharmacy on Prater Way | Ch1 dusk, Kit |
| `loc_sparks_marina` | Sparks Marina lake | Ch1 water run |
| `loc_virginia_bridge` | Virginia Street bridge over the Truckee | Authority checkpoint |
| `loc_rscc_registry` | Reno-Sparks Convention Center | Registry, ration hall; Avila's CP (Ch6) |
| `loc_meadows_general` | Truckee Meadows General (fictional) | Dr. Ames |
| `loc_fourth_street` | 4th Street motel row and pawn shop | Dutch; Marsh; Viaduct Crew turf |
| `loc_sparks_yard` | Union Pacific yard, Sparks | Convoys; Boone; Remnant base (Act III) |
| `loc_silver_spur` | The Silver Spur, a dead downtown casino (fictional) | The Floor's HQ; the Switchboard |
| `loc_sparks_library` | Sparks library | Annie's seed library; greenhouse (Act III) |
| `loc_airguard_ramp` | Air Guard ramp, Reno-Tahoe Airport | Ch4 cart heist |
| `loc_tric_warehouses` | Industrial-center warehouses east of Sparks | Ch5 convoy staging; Darlene |
| `loc_mustang_truckstop` | Truck stop at the I-80 Mustang exit | Mo |
| `loc_i80_blockade` | I-80 in the Truckee canyon | Compact blockade (Ch5) |
| `loc_rail_trench` | The sunken rail trench through downtown Reno | Ch6 set piece |
| `loc_peavine_shack` | Augie's radio shack on Peavine Peak | Ch3, Ch7 |
| `loc_us50_fallon` | US-50 into Fallon, canal-bridge checkpoint | Ch7: Ross |
| `loc_dixie_annex` | Dixie Valley Annex exterior: fence, guard shack, airstrip, hangar | Ch7b |
| `loc_annex_holds` | Annex interior: maglock corridor, Wing A holds, records room, stair to flooded Wing B | Ch7b |
| `loc_dixie_hotsprings` | Hot springs 3 mi north of the Annex | Ch7b optional den |
| `loc_steamboat_creek` | Steamboat Creek corridor, hot-spring vents | Approach to Galena; Salt |
| `loc_galena_station` | Galena Station geothermal plant | **The prize** |
| `river_ice` | The frozen Truckee | Ch9 march |

---

## 4. Factions

| id | Display name | Leader | Pitch |
|---|---|---|---|
| `authority` | Truckee Meadows Recovery Authority | Capt. Lorna Avila (`avila`) | County emergency management plus Nevada Guard: registry, ration cards, sectors. Right that counting keeps people alive; wrong that the count is a lie, and in Act II it ships the valley's stocks west. |
| `harbor` | The Floor | Roz Tafoya (`roz`) | Casino workers, churches and UNR students feeding 3,000 a day from dead casino kitchens; Silver Spur chips (`spur_chip`) as scrip. "Here" quietly shrinks to "us," and they buy guns. |
| `compact` | Lahontan Compact | Ander Etcheverry (`ander`); Ross is his lieutenant | Fallon and Mason Valley farms allied with the state bloc. Right that the Directive strips Nevada for California; their blockade starves Reno's care homes. |
| `ironwood` | Task Force Ironwood | Maj. Dale Kessler (`kessler`) | Federal Army battalion-minus from Fort Irwin enforcing the Reconstruction Directive. Tired kids under a contested chain of command. After Ch7, the Remnant holds the Sparks yard. Hostility tracked by `ironwood_hostility`. |
| `bridge_boys` | The Viaduct Crew | none (Kit runs for them) | Laid-off warehouse kids and motel residents under the I-80 viaduct. |
| `annex` | Tallmen | — | Not a faction: the escaped LONG SLEEP subjects. No rep, no dialogue. Reyne is the Annex's only human voice. |

---

## 5. The Tallmen

**Origin.** The **Dixie Valley Annex** was a small biocontainment site run by a defense contractor. Its program, **LONG SLEEP**, studied induced torpor for casualty evacuation. The subjects were engineered, cold-adapted mammals grown from a primate base line: *not human*, and never designed to kill. To wake from torpor they have to take in heat, and they learned to take it from living bodies.

**Escape.** Containment was powered: chilled holds, maglocks, 14 days of diesel, staff on rotation. Staff left one by one for their families. On Day 16 the diesel ran out, the holds warmed and the subjects woke. Dr. Hollis Reyne, the last technician, opened the outer door to get out and didn't close it (`reyne_secret_known`).

**How many? Nobody knows.**
- The manifest Braith finds in the records room reads: **SUBJECTS (WING A): 6. SUBJECTS (WING B): ███████. B-WING ACCESS: LEVEL 5 ONLY.**
- Wing A's six holds are all forced open from the inside.
- The stair to Wing B ends in black water under a collapsed ceiling; the Wing B door is bent *outward*.
- Reyne held Level 3. She never saw Wing B, and she says so.
- The game never states, implies, or stores a total. `tallmen_killed` (int) counts kills; `den_killed` (bool) records the Ch7 den choice. Neither is shown as "remaining."

**Look.** 7–8 ft, thin and long-limbed. Ash-grey skin that vanishes against ash and snow, flat reflective eyes. They move on all fours and stand to look. They don't infect, rot or come back.

**Rules (gameplay and writing)**
1. **Heat draws them**: fires, engines, bodies, the plant.
2. **Light pushes them back.** Sustained flashlight, flare, torch or floodlight makes them retreat. `flare` is a weapon; `lamp_kit` builds the Ch10 lamp line.
3. **Cold makes them stronger.** In the late-summer heat of Ch1–2 they're barely seen; as autumn turns to late fall they're active longer, then in daylight. Nuclear winter is their habitat arriving.
4. **Sealed rooms hide you.** `shelter_sealed` leaks less heat, and they pass the building by.
5. **Prey order:** livestock and dogs, then lone people, especially **husks** (sick, freezing humans, not infected). Where husks gather, Tallmen follow.
6. **Dogs know.** Wraith sees them first and won't fight them.
7. **They learn.** They test perimeters, remember which lights fail, and retreat when hurt. **Never more than 3 visible at once.**

| Ch | What the player sees | Interactable |
|---|---|---|
| 1 | Nothing | — |
| 2 | Hospital exit at dusk: Wraith freezes; a thin upright shape on the east ridge for ~2 s (`glimpse_ch02_ridge`) | No |
| 3 | Fog crossings; too-long tracks; missing goats blamed on the Viaduct Crew | No |
| 4 | A shape in Galena's steam; a frozen cow with its chest open | No |
| 5 | Ironwood radio: "contact, not human, repeat not—"; one lit by a flare on the hillside | No |
| 6 | The alley: one looks straight at Braith at 25 m and leaves on all fours. Ruiz sees it too (`tallman_seen_with_ruiz`) | No |
| 7 | **First fights:** the Dixie Valley road; Wing A. Optional den with 2 in torpor | Yes (1 at a time) |
| 8 | Pairs hunting husks in the ash; unsealed houses visited; **the first Hollows** | Yes (≤2, plus Hollows) |
| 9 | Pairs and threes shadow the column in the whiteout; voices off the rope; an assimilated coyote pack | Yes (≤3, plus Hollows) |
| 10 | **The siege** of the lamp line: patient, probing; Hollows call names past the lamps | Yes (≤3, plus Hollows) |

Every scripted glimpse adds 1 to `tallman_glimpses` (journal/achievement).

### 5a. The Hollows (Act III, Ch8–10)

**What they are.** The Tallmen don't only take heat. What they feed on and leave alive in the deep cold, people and animals, comes back *wrong*: assimilated, hostile, and still wearing the shape and voice of who they were. In-world they're called **Hollows**. Machine ids: **`assimilated_human`** and **`assimilated_animal`** (`gameplay_hooks.enemy_types`). Nobody in the story explains the biology. The only hint is one redacted page in `annex_log` ("TISSUE INTEGRATION, FIELD TRIAL: ███") and Reyne's line in Ch7 (`ch07_reyne_secret`, node `many2`) and Ch8.

**Tone.** Grounded survival horror: mimicry and paranoia, not gore. Every knock at the door becomes a question. The horror is that a Hollow sounds like a neighbor, and refusing a real freezing person is also a cost.

**Husks are not Hollows.** Husks are still-living, sick, freezing people. They breathe steam, cough, shiver and can be talked down (`husks_talked_down`). Hollows can't.

**The tells (all diegetic, no UI marker):**
1. **Wraith.** She growls low with her hackles up at a Hollow, and whines softly and noses the hand of a real husk. Sets `wraith_mimic_warned`. If Wraith is dead, the player loses this tell; the writing always gives a fallback.
2. **Breath.** No breath plume in sub-zero air. Living NPCs always show one.
3. **Voice.** Off-cadence, repeating the same phrases, using voices of people who are provably elsewhere (the woman asleep in the garage, Walt asleep on the sled, Halvorsen dead in Ch7).
4. **Gait and stance.** Facing walls, standing too still, then moving too fast. Animal Hollows move in step and make no sound.
5. **Light.** Flat eye-shine like the Tallmen; they flinch from sustained light.

**Rules.** Hollows are never counted in total, like the Tallmen. `assimilated_killed` (int) counts kills, separate from `tallmen_killed`. Opening the door to one (`mimic_let_in`) or following a voice in the whiteout (`ch09_voice_followed`) each cost one person from the Ch9 column. The column's rule, written on the shelter wall in Ch8: **CHECK FOR BREATH. ASK THE DOG. NOBODY OPENS ALONE.** In Ch9–10: *nobody answers a voice.*

| Scene | Ch | Beat | Encounter |
|---|---|---|---|
| `ch07_reyne_secret` (`many2`) | 7 | Foreshadow: "There was a page... 'Integration.'" | — |
| `ch08_husk` | 8 | Wraith whines at a real husk (contrast) | — |
| `ch08_henley_house` | 8 | Dale Henley facing the wall, "Morning, neighbor" | `enc_ch08_hollow_first` |
| `ch08_door` | 8 | The midnight knock in a sleeping woman's voice | `enc_ch08_door_mimic` |
| `ch09_voices` | 9 | Walt's voice off the rope; the silent coyote pack | `enc_ch09_hollow_ambush`, `enc_ch09_animal_pack` |
| `ch10_siege_night2` / `night3` | 10 | Halvorsen at the fence; voices between the lamps | `enc_ch10_hollow_prowlers` |

---

## 6. Seasons and timeline

The story runs from late summer, Year 1, to late February, Year 2. The weather is a slope: heat and dust, then a crisp autumn, then sleet and frost, then the December bursts and nuclear winter. **Ch1–2 have no frost, snow, coats, cold breath or "October."** Narration states hot and above-zero temperatures in °F ("Ninety-five by noon"); data and deep cold use °C ("Minus thirty-four").

| Season (`season`) | Chapters | Months | Temp (°C) | Weather | Survival pressure | Palette |
|---|---|---|---|---|---|---|
| `late_summer` | 1–2 | late Aug – mid Sep | 32–36 day, 15–18 night | `heat_haze`, `dust_wind` | hydration, heat, spoiled food, dust | warm amber dust, white sun glare |
| `autumn` | 3–4 | October | 12–16 day, 4–6 night | `clear_autumn`, `autumn_wind` | first cold nights, fuel, heating | autumn gold, yellow cottonwoods |
| `late_fall` | 5–7 | mid Nov – mid Dec | 2 to −3 | `sleet`, `overcast`, `frost`, `brown_sky` | warmth, fuel | overcast slate grey |
| `nuclear_winter` | 8–10 | Jan – late Feb, Year 2 | −10 to −45 | `fallout_rain` → `ashfall` → `blizzard` | warmth, filters, seal, dread | ashfall blue-grey; floodlight cones and flare red the only warm colors |

| When | Event | Ch | Season / temp |
|---|---|---|---|
| Sun Aug 23, Day 0 | Geomagnetic storm; grid down. Ross's call cuts out. | — | late summer |
| Wed Aug 26, Day 3 | Ninety-five by noon. Water pressure failing; pharmacy looted. | 1 | `late_summer`, 35 / 18 °C |
| Tue Sep 8, Day 16 | *(unseen)* Annex diesel runs out; the holds warm; Reyne opens the door. | — | — |
| Fri Sep 11, Day 19 | Ninety-one and dust. Recovery Authority registry. First glimpse. | 2 | `late_summer`, 33 / 15 °C |
| Mon Oct 12, Day 50 | First near-freezing night. Wes arrives. Walt and the plant plan. | 3 | `autumn`, 14 / 4 °C |
| Wed Oct 28, Day 66 | Black start at Galena. | 4 | `autumn`, 12 / 5 °C |
| Sat Nov 14, Day 83 | Reconstruction Directive; Ironwood arrives; Route 9 in the sleet. | 5 | `late_fall`, 2 / −3 °C |
| Fri Nov 27, Day 96 | Martial law; fighting in the rail trench. | 6 | `late_fall`, 1 / −3 °C |
| Sat Dec 5, Day 104 → mid-Dec | Distant high-altitude bursts: green sky, radios die, Galena's control racks cooked; brown sky by noon, ash that isn't snow. The Annex expedition (Tolliver: 92 days alone). | 7 | `late_fall`, −1 / −3 °C |
| January, Year 2 | Fallout rain, then ashfall. The first Hollows. | 8 | `nuclear_winter`, −10 / −18 °C |
| Early February, Year 2 | Blizzard. The Truckee freezes. The column. | 9 | `nuclear_winter`, −40 / −45 °C |
| Late February, Year 2 | Ashfall. The lamp-line siege and the vote. | 10 | `nuclear_winter`, −34 / −45 °C |

Machine-readable copies: `gameplay_hooks.json` → `seasons`, `timeline`, and per-chapter `season`, `date`, `weather`, `temp_c`, `night_temp_c`, `survival_focus`; `hud_unlocks` (hydration from Ch1, warmth from Ch3).

---

## 7. Chapters

Full design per chapter (beats, choices, flags, locations, enemies, traders, ambient NPCs, set pieces, items, weather and temperature) is in `chapters/`.

| # | Level id(s) | Title | Spine | Key choices |
|---|---|---|---|---|
| 1 | `ch01_day_three` | Day Three | Carly home; water from the marina; Wraith tracks Mr. Pruitt; Kit at the pharmacy; the voicemail | Gas can (Pruitt / generator / drive); Kit |
| 2 | `ch02_the_registry` | The Registry | Checkpoint, ration line, registry, the essential-worker card; Carly's job; the crush; the first glimpse | Report Gil? Cover Kit? Back Carly? |
| 3 | `ch03_the_long_cold` | The Long Cold | Wes and Ross's letter; Gil's fire; Peavine, Augie and Walt; Carly finds the count | Who learns about Galena; Wes stays or goes |
| 4 | `ch04_black_start` | Black Start | Ground power cart heist; Salt; the Lunds; Unit 1 up; a shape in the steam | First feeder |
| 5 | `ch05_route_9` | Route 9 | Convoy vs. blockade; Ross on the barricade; Wes wounded; Ruiz ("Engineer Two") | Escort / sabotage / divert; Wes |
| 6 | `ch06_the_trench` | The Trench | Sweep; informant list; Carly's side; Avila breaks or doesn't; Ruiz pinned; freight car over the trench; the alley | Hide neighbors; spare Ruiz; block or open |
| 7 | `ch07_dead_air` + `ch07b_dixie_valley` | Dead Air | Radios die; Reyne; Fallon and Ross; the Dixie Valley road; Tolliver; the recovery detail; the holds and the flooded wing; the den | Den kill; Tolliver; tell the Compact; Ross goodbye; where to winter |
| 8 | `ch08_ashfall` | Ashfall | Mask and seal; husks; the Henley house (first Hollow); the midnight knock; Lolo's list; Boone's filters; Annie's greenhouse; the control cards | Open the door (and the midnight knock); filters for strangers |
| 9 | `ch09_the_long_night` | The Long Night | The column on the ice; the picket; the voice in the whiteout and the coyote pack; the ice breaks; Wraith; Walt | Person or sled; Wraith's hold (only if injured) |
| 10 | `ch10_the_warm_room` | The Warm Room | Lamp line siege over three nights, Hollows calling names; Kessler at the gate; the vote | `final_choice` |

**What the plant needs (why Ch7 is mandatory).** The December 5 bursts fry Galena's PLC and control modules. The nearest hardened spares are at the Annex: `control_cards` (install at Galena in Ch8 or at the Ch9 gate), `lamp_kit` (hardened floodlights for Ch10) and a filter cache (`mask_filter`) that seeds Ch8.

### The Annex (Ch7, level `ch07b_dixie_valley`)
- **Tolliver** (`amb_tolliver`), the contractor guard who held the gate alone for 92 days. Joins, stays, or dies (`tolliver_fate`).
- **The recovery detail**: SFC Brandt (`sfc_brandt`) and five starving Ironwood soldiers sent to secure the Annex before the split. Talk them out (Ruiz defected, or `ironwood_id`) or fight (`recovery_detail_outcome`).
- **Set pieces:** `annex_maglock_power` (the cart powers the dead maglocks; doors open one at a time in the dark), `annex_holds` (Wing A: six holds, all open; Wing B: flooded and collapsed, door bent outward), `annex_hangar` (the fenced hangar Braith saw on TDY), `dixie_hotsprings_den` (optional).
- **The den:** two Tallmen asleep in the steam. Killing them sets `den_killed` and adds 2 to `tallmen_killed`; Reyne begs you not to. No kindness change. It's a question of what you are.

### Ch10, the siege (never a horde)
- **Night 1, the test:** a far lamp goes out, its cable chewed. **Skipped** if `den_killed` or `tallmen_killed >= 2`.
- **Night 2, the probe:** the cooling-water line under the lights; clamp it under watch.
- **Kessler at the gate** (between nights 2 and 3): stand-down if (`ruiz_defected` or `avila_stance=governor`) and `ironwood_hostility < 5`; otherwise `enc_ch10_gate_battle`.
- **Night 3, the push:** at the weakest lit sector; from **one side only** if `den_killed` and `tallmen_killed >= 3`. Never more than 3 visible; they break off at dawn or after losing 2. Each breach (`siege_breaches`) costs one named survivor in the epilogue census.
- Wraith's barking tells you which side. Braith's job is keeping the lights and lines working, with fighting as the fallback. Kills thin them; nothing tells you how many are left.

**Delayed payoffs**
- Ch1 gas to Pruitt → Ch8 Deshawn's clean cistern.
- Ch2 covering for Kit → Ch3 fire warning → Ch9 sled.
- Ch4 first line to the hospital → Ch8 Ames saves Braith's hand.
- Ch5 pulling Wes out → Ch7 Ross lets you through Fallon; part of `pearce_reconciled`.
- Ch6 sparing Ruiz → Ch7 she talks down the recovery detail → Ch9 the picket gap.
- Feeding Wraith first → Ch9 she finds the trail.
- Ch7 den or road kills → Ch10 siege eased.

---

## 8. Endings

| id | Title | Tone | Conditions (`flags.json` / `endings.json`) |
|---|---|---|---|
| `end_warm_room` | The Warm Room | earned hope | `final_choice=council`, `dam_running`, `kindness>=5`, at least 3 of (`pruitt_alive`, `kit_alive`, `gil_alive`, `wes_alive`, `lolo_alive`, `ruiz_defected`, `lunds_stayed`), and one of (`rep_harbor>=2`, `avila_stance=governor`, `ruiz_defected`) |
| `end_ledger` | The Ledger | order | `final_choice=authority`, `avila_alive`, `rep_authority>=3` |
| `end_stillwater` | Stillwater | survival by abandonment | `final_choice=compact`, `ander_alive`, `rep_compact>=3` |
| `end_dark_water` | Dark Water | bleak sacrifice | `final_choice=shutdown` |
| `end_two_coats` | Two Coats | alone together | fallback: `leave`, or a choice whose conditions fail |

- **The Warm Room.** A council of all three factions plus the strangers you took in. Galena heats the hospital and Annie's greenhouse; the lamp line burns every night. Carly's census board covers a wall. No rescue, just a plan for this winter.
- **The Ledger.** Avila runs the plant from a triage list of 412 names; the valley had 30,000. Braith keeps the turbines.
- **Stillwater.** The Compact hauls the ORC units east to the Stillwater field near Fallon. Braith goes home to Ross and Wes, if they're alive. Reno goes dark behind him.
- **Dark Water.** Braith wrecks the wellheads so nobody kills for Galena again. The valley goes cold, the Tallmen go still, and the long walk south begins. Who survives depends on `kindness`.
- **Two Coats.** Before dawn: two packs, Wraith at heel if alive, Carly if she stayed. If `kit_alive`, her voice on a stolen radio is the last thing you hear.

The epilogue (`ch10_epilogue`) plays the ending, then the Pearce family modifier, then Carly (`carly_left`), then Wraith (`wraith_alive`).

---

## 9. Cast

### Main NPCs (`npcs[]`, with trust)
| id | Name | Faction | Hook |
|---|---|---|---|
| `carly` | Carly Redmond, 26 | none → her choice | Dispatcher; the Switchboard; her own side |
| `wraith` | Wraith, 4 | — | Companion; sees the Tallmen first |
| `ross` | Ross Pearce, 58 | compact | Braith's father; Ander's lieutenant |
| `wes` | Wes Pearce, 19 | compact | Braith's brother; wounded at the blockade |
| `lolo` | Dolores "Lolo" Arrieta, 68 | harbor | Retired ICU nurse next door; keeps a list of people she helped die. Wes is on it in Ch8 if he's with you, wounded |
| `gil` | Gil Shumway, 66 | none | Retired UP diesel mechanic with siphoned diesel; holds a grudge if reported |
| `kit` | Kit Darrow, 19 | bridge_boys | Viaduct Crew runner; meds and rumors |
| `avila` | Capt. Lorna Avila, 44 | authority | Runs the Authority; 41 days of food, not the number on the board |
| `augie` | Augie Bell, 71 | none | Ham operator on Peavine (KK7AUG); three versions of the war |
| `walt` | Walt Okada, 73 | none | Ran Galena 22 years; black start and the well field; dying |
| `ames` | Dr. Samuel Ames, 52 | none | Last attending at Meadows General |
| `roz` | Roz Tafoya, 49 | harbor | Feeds 3,000 a day from the Silver Spur; buys guns |
| `ander` | Ander Etcheverry, 61 | compact | Compact leader; his blockade starves his aunt's care home |
| `ruiz` | Sgt. Nadia Ruiz, 31 | ironwood | Combat engineer, call sign **"Engineer Two"**; saw the Tallman; can defect (`ruiz_defected`) |
| `reyne` | Dr. Hollis Reyne, 39 | annex | Annex biologist (Level 3); left the door open |

### Minor characters
`pruitt` (Mr. Earl Pruitt, 84, oxygen concentrator), `deshawn` (his grandson, 16; the Ch8 cistern), `cpl_haas` (bored, decent checkpoint corporal; `haas_rep`), `pete_lund` (father squatting at Galena; crew or a Ch8 husk), `rosa` (Rosa Esparza, the Floor; mother of Mateo), `kessler` (Maj. Dale Kessler, Ironwood/Remnant), `sfc_brandt` (recovery detail).

### Ambient NPCs (`ambient_npcs[]`; flags, not trust)
| id | Who | Chapters | Arc |
|---|---|---|---|
| `amb_brother_amos` | Street preacher who counts the dead aloud | 2, 3, 6, 8 | Burial crew in Act II; husk or chaplain |
| `amb_lonnie` | Lonnie Vance, lounge singer in a sequined jacket | 2, 6, 10 | Sings on the Switchboard; sings at the Warm Room |
| `amb_salt` | Desert hermit in a Steamboat culvert | 4, 9 | First to name the Tallmen; dead or following (`salt_fed`) |
| `amb_darlene` | Darlene Okoye-Pratt, stranded trucker with frozen chicken | 3, 5, 8 | Joins Mo if warned (`darlene_with_mo`) |
| `amb_bike_kids` | 12-year-olds on bikes | 1, 3, 6, 8, 10 | Switchboard runners; one dies in the sweep unless neighbors were hidden |
| `amb_deputy_lusk` | Deputy Cal Lusk, block watch | 1, 3, 6 | `lusk_rep`; turns cold if Gil was reported |
| `amb_ruth` | Ruth Calloway, retired teacher | 2, 6, 8, 10 | The Warm Room school |
| `amb_pvt_marsh` | Pvt. Danny Marsh, 19, Ironwood deserter | 6, 9 | Hidden or turned in (`ch06_marsh_hidden`) |
| `amb_night_owl` | Radio voice reading the names of the missing | 3, 8 | Radio only |
| `amb_tolliver` | Annex contractor guard | 7, 9 | `tolliver_fate` |

### Traders (`traders[]`; rep flag `trader_<id>_rep`)
| id | Who | Where | Trades / wants | Hook |
|---|---|---|---|---|
| `trader_dutch` | Dutch Albertson, pawnbroker | `loc_fourth_street`, Ch2, 6 | tools, guns, cigarettes, stolen meds / batteries, ammo, jewelry, rumors | **Betrayal:** at rep ≤ −1 he sells your route (`ch04_dutch_ambush`) |
| `trader_mo` | Maureen "Mo" Kessinger, truck stop | `loc_mustang_truckstop`, Ch5, 8 | diesel, gas, chains, sled parts / labor, parts, food | **Quest** `q_mo_pump` |
| `trader_rourke` | Wendell Rourke, prospector with burros | moves: Peavine (3), canyon (5), Fallon (7), river camp (9) | whiskey, candles, maps, rumors / stories, salt | **Quest** `q_rourke_escort`; sells the Annex rumor |
| `trader_annie` | Annie Tran, seed librarian | registry table (2), library (3, 8, 10) | seeds, antibiotics, iodide, books / batteries, wire, glass, labor | **Quest** `q_annie_greenhouse` |
| `trader_boone` | SSgt. Tyrell Boone, back-door supply sergeant | `loc_sparks_yard`, Ch5, 8 | MREs, filters, ammo, dosimeter / cigarettes, whiskey, silence | **Betrayal:** expired filters (`boone_filters_tested`, `boone_exposed`) |
| `trader_floor` | Floor commissary | `loc_silver_spur`, Ch6 | meals, firewood, blankets / `spur_chip`, labor | Spend chips earned from Floor jobs |

**Barter.** Scrip lasts only while its issuer does: ration cards (Act I–II), Silver Spur chips (Act II). In Act III the currency is fuel, filters, batteries, ammo and warm-bunk nights at Galena. Information (`rumor`) is currency with Rourke and Dutch. Prices ×1.0 / ×1.5 / ×2.5 by act.

### Population density (Cartographer)
| Ch | Who's around |
|---|---|
| 1 | Busy block: porches, grills, kids, the watch, Lusk (10–15 ambient) |
| 2 | Crowds: the ration line, guards, squatters (densest level) |
| 3 | Thinning: chimney smoke, Darlene's camp, bike kids, Rourke, the Night Owl |
| 4 | Sparse: Salt, the Lunds, an airfield guard |
| 5 | Two armed camps: the blockade and the convoy; Rourke's burros |
| 6 | Occupied city: curfew, faces in windows, Marsh, sweep teams, Dutch's last week |
| 7 | Desert emptiness: Peavine, Fallon (the last "normal" town), then Tolliver alone |
| 8 | Shelter interiors (10–20 people), husks and Tallmen outside, Annie, Boone |
| 9 | The column (5–25 by `column_size`), Rourke's river camp, Salt, pickets |
| 10 | Galena: everyone you saved |
