# ASHFALL: Revision 2 Proposal (for review, NOT implemented)

> **Status: proposal only, v2** (updated with your answers: no insulin, Carly and Wraith, the lab is visitable, Tallmen never a horde, more NPCs and traders). Nothing in `story/`, `levels/`, `systems/` or the code has changed. The live draft (Dell / Superior, WI) stays authoritative until you approve this.
> Working title: **ASHFALL: Truckee Meadows**.

---

## 1. Pitch

**Logline.** When a solar storm kills the grid, a 25-year-old ex-Air Force jet mechanic in Sparks, Nevada chooses to stay with the woman he loves instead of going home to his family's ranch. Then the country goes to war, his father and brother end up on the other side of it, and something that used to live behind powered doors in the desert starts walking toward the only warm place in the valley.

**Premise.** On October 14 a geomagnetic storm burns out the transformers that hold up the North American grid. **Braith Pearce** fixes turboprops at Reno Stead Airport. Before that he spent four years as an F-15E crew chief. He lives in Sparks with his girlfriend **Carly Redmond**, a Washoe County 911 dispatcher, and **Wraith**, a Belgian Malinois who washed out of the military working dog program. On Day 0 his father's last phone call cuts out mid-sentence: *"Come home, both of you, before—"*. Carly won't leave her console, so Braith stays. The rest of the game is the price of that choice. Twelve miles south, the **Galena Station geothermal plant** (fictional, sited at the real Steamboat Springs field) sits on 160 °C water that comes out of the ground whether or not the country exists. It can't restart without outside power for its pumps and controls, and Braith knows how to take an aircraft ground-power cart off the Air Guard ramp and make it do that. From then on every faction wants him, including the one his father and brother join. When the sky goes grey and the Truckee freezes, Galena is the last warm building for a hundred miles, and the heat draws people and *other things*.

**Central question.** *Who gets the warmth?* The ground makes heat forever. People decide who it reaches, and Braith's own family is on more than one side of that answer.

**Personal stake (replaces Theo's insulin).** No medical clock. The stake is **a split family in a splitting country**:
- **Carly**, who makes her own choices and may take a side Braith doesn't (she's never a dependent).
- **Wraith**, who relies on him completely.
- **Ross and Wes Pearce** (father and 19-year-old brother) on the hay ranch in Yerington, who join the **Lahontan Compact**. Every faction choice Braith makes in Act II is a choice for or against his own family.

This is tracked by the **Pearce family modifier** (§8), which replaces the Theo modifier.

**Why geothermal.** In nuclear winter a hydro plant fails when the river freezes; geothermal doesn't, so the prize gets more valuable as the world ends. It also gives the Tallmen a reason to come.

**Tone.** Dark but hopeful, unchanged. Losses are permanent and often delayed. `kindness` is a mechanic that pays off later. The best ending is earned hope, not rescue. Act I and early Act II are strictly people vs. people.

**Hard rules that carry over:** no chosen one. No "the government planned it all"; the Annex is one more system that failed when the power did. No cartoon soldiers or raiders, no zombies, no hordes.

---

## 2. The leads

### Braith Pearce (player), 25
- **Background.** Grew up on his family's hay ranch outside Yerington (Mason Valley, Walker River water). Enlisted at 18 and spent four years as an F-15E crew chief at Mountain Home AFB. On a TDY to the Fallon range he saw a fenced hangar at Dixie Valley that nobody was allowed to look at. Left the ranch after a fight with his father about staying. Now an A&P mechanic at Stead.
- **Skills the story uses:** turbines (Galena's ORC units), hydraulics, generators and ground support equipment (the **-86 ground power cart** powers Galena in Ch4 and the Annex doors in Ch7), fuel handling, avionics and radio repair, and his Air Force gas mask (`has_gas_mask`, Ch8).
- **Voice.** Quiet and dry, with flight-line shorthand. He fixes things when he's scared. Calls Wraith "partner" and Carly "Dispatch."
- **Arc: from mechanic to steward.** He starts out believing that fixing the machine fixes everything. He learns the machine was the easy part; the list of who gets it is the job.

### Carly Redmond (girlfriend), 26
- **Background.** Six years as a 911 dispatcher at the Washoe regional center. Grew up in foster care in Reno, so the valley's people are the only family she has. That's why she won't leave on Day 0.
- **Voice.** Fast, precise, triage language ("Address? Breathing? Okay."), and a dark joke a second after any bad news.
- **Arc: from triage to census.** Ch1: she comes home after 70 hours on a dying dispatch floor. Ch2: she takes a job on the Authority's registry because she believes counting saves people. Ch3–4: she finds out the count is falsified. Ch5–6: she quits and, with Augie, builds **the Switchboard**, a hand-cranked radio relay between neighborhoods. Act III: she runs shelter intake. In the good ending the census board on the plant wall is hers.
- **Agency rules.** She chooses her own side (`carly_side`, Ch6) and leaves Braith if `carly_trust` falls below the threshold, after which she's at her faction's table in Ch10. She does the rescuing at least twice (Ch3 fire, Ch8 door). She's never kidnapped or rescued, and no scripted beat kills her.

### Wraith (Belgian Malinois), 4
- **Background.** Bred for the MWD program and washed out for being "too soft on the bite." Braith adopted her two years ago. Bright, intense, a little neurotic.
- **Companion verbs:**
  - **Track:** follows a scent from an item and finds caches and people.
  - **Warn:** growls or freezes before enemies are visible. She's **the first to notice the Tallmen**.
  - **Guard:** posted at a door or camp, she cuts theft and break-ins.
  - **Hold:** pins one human enemy. She refuses to engage Tallmen.
- **Hurt and care.** She has HP and warmth and eats from your food. `wraith_injured` means she limps and can't track until treated with `vet_kit` or rest. **At 0 HP anywhere else she goes down** (carried on your back or the sled, recovers by the next chapter). She never dies in combat, cutscenes, endings or off-screen.
- **The only way Wraith can die:** in Ch9, if `wraith_injured` is true when the column is cornered on the river ice, a single explicit choice appears: **"[Order Wraith to hold the line]"**, with a plain-language confirmation ("She's hurt. If you give this order she will not come back."). If you choose it, the column escapes and Wraith dies holding the line. A quiet scene follows. No other path sets `wraith_alive = false`.
- **Payoff.** High `wraith_trust` (feeding her first, not leaving her tied up) means that in Ch9's whiteout she leads the column to Galena when the trail is gone.

### The Pearces (personal stake)
- **Ross Pearce, 58.** Hay rancher, widower, stubborn, proud, decent. He becomes a Compact lieutenant under Ander. Heard on radio in Act I, met at the I-80 blockade (Ch5) and at the Fallon checkpoint (Ch7).
- **Wes Pearce, 19.** Braith's brother: funny, reckless, idolizes Braith and resents him for leaving. Rides a dirt bike to Sparks in Ch3 with a letter from Ross and a cooler of beef. Joins the Compact and is wounded at the blockade (Ch5). In Ch9: save Wes or the sled.

---

## 3. Setting: Truckee Meadows and the Lahontan Valley

The Reno/Sparks valley: high desert at 4,500 ft between the Sierra and the Virginia Range. Casinos, railroad, I-80, giant warehouses, sage. Normal winters are dry; nuclear winter makes them Siberian. Ch7 adds the road east: US-50 through Fallon to the empty salt flats of **Dixie Valley**.

| New id | Place | Role |
|---|---|---|
| `loc_sparks_block` | Braith and Carly's block, old Sparks near Prater Way (HUD **SECTOR 4** kept) | Home: Ch1/3/6/8 |
| `loc_prater_pharmacy` | Corner pharmacy on Prater Way | Looted Day 2 |
| `loc_sparks_marina` | Sparks Marina (a real lake in town) | Ch1 water run (uses `ch01_lake_edge`) |
| `loc_virginia_bridge` | Virginia Street bridge over the Truckee | Authority checkpoint |
| `loc_rscc_registry` | Reno-Sparks Convention Center | Ration hub and registry |
| `loc_meadows_general` | Truckee Meadows General (fictional) | Dr. Ames |
| `loc_fourth_street` | 4th Street motel row and pawn shop | Dutch's shop, Viaduct Crew turf |
| `loc_sparks_yard` | Union Pacific yard, Sparks | Convoys; Act III Remnant base; Boone's back door |
| `loc_silver_spur` | The Silver Spur, a dead downtown casino (fictional) | The Floor's HQ |
| `loc_sparks_library` | Sparks library and community garden | Annie's seed library; later a greenhouse |
| `loc_airguard_ramp` | Air Guard ramp, Reno-Tahoe Airport | Ch4 cart heist |
| `loc_tric_warehouses` | Industrial-center warehouses east of Sparks | Ch5 requisition; Darlene's reefer trailer |
| `loc_mustang_truckstop` | Truck stop at the I-80 Mustang exit | Mo's fuel market |
| `loc_i80_blockade` | I-80 in the Truckee canyon | Compact blockade |
| `loc_rail_trench` | The sunken rail trench through downtown Reno | Ch6 set piece |
| `loc_peavine_shack` | Augie's radio shack on Peavine Peak | Shortwave |
| `loc_us50_fallon` | US-50 into Fallon; Compact checkpoint at the canal bridge | Ch7: Ross |
| `loc_dixie_annex` | Dixie Valley Annex: fence, guard shack, airstrip, hangar | Ch7 (the lab, exterior) |
| `loc_annex_holds` | Annex interior: maglock corridor, torpor holds, records room | Ch7 (the lab, interior) |
| `loc_dixie_hotsprings` | Hot springs 3 mi from the Annex | Ch7 optional: Tallman den |
| `loc_steamboat_creek` | Steamboat Creek corridor and hot-spring vents | Approach to Galena; Salt's culvert |
| `loc_galena_station` | Galena Station geothermal plant | **The prize** |
| `river_ice` | **Kept.** The frozen Truckee | Ch9 march |

---

## 4. Factions

Keep the internal ids and rep flags; change only display names and leaders.

| Internal id | Display name | Leader | Pitch |
|---|---|---|---|
| `authority` (joinable) | **Truckee Meadows Recovery Authority** | Capt. Lorna Avila, Nevada Guard | Counting keeps people alive, but the count is a lie, and in Act II it ships the valley's stocks west under federal orders. |
| `harbor` (joinable) | **The Floor** | Roz Tafoya, casino head chef and union steward | Feeds the city from dead casino kitchens; casino chips are its scrip. "Here" quietly shrinks to "us," and they buy guns. |
| `compact` (joinable) | **Lahontan Compact** | Ander Etcheverry, Basque sheep rancher (Ross Pearce is his lieutenant) | Fallon and Mason Valley farms, allied with the state bloc. Right that the Directive strips Nevada for California; their blockade starves Reno's care homes. |
| `ironwood` (hostile, Act II–III) | **Task Force Ironwood** | Maj. Dale Kessler | Federal Army from Fort Irwin. Sweeps, drones, MRAPs, one Bradley. They're tired kids, and some can be spared or turned (Ruiz). The Remnant holds the Sparks yard after Ch7. |
| `bridge_boys` (hostile, Act I–II) | **The Viaduct Crew** | none; Kit runs for them | Laid-off warehouse kids and motel residents under the I-80 viaduct. |
| **new** `annex` (enemy family) | **Tallmen** | n/a | The escaped lab organisms. No rep, no dialogue. |

---

## 5. The Tallmen

**Origin.** The **Dixie Valley Annex** was a small biocontainment site run by a defense contractor. Its program, **LONG SLEEP**, studied induced torpor for casualty evacuation. The subjects were engineered, cold-adapted mammals grown from a primate base line: *not human*, and never designed to kill. To wake from torpor they have to take in heat, and they learned to take it from living bodies.

**Escape.** Containment was powered: chilled holds, maglocks, 14 days of diesel, staff on rotation. Staff left one by one for their families. On Day 16 the diesel ran out, the holds warmed and the subjects woke. Dr. Hollis Reyne, the last technician, opened the outer door to get out and didn't close it.

**Count (finite).** There were **14 subjects. 11 escaped. 3 died in their holds.** They're **sterile**, so they can't breed. Every one you kill is gone forever (`tallmen_remaining`, starts at 11). They're never a horde, at any point.

**Look.** 7–8 ft, thin and long-limbed. Ash-grey skin that vanishes against snow, flat reflective eyes. They move on all fours and stand to look. They don't infect, rot or come back.

**Rules (gameplay and writing):**
1. **Heat draws them** (fires, engines, bodies, the plant).
2. **Light pushes them back.** Sustained flashlight, flare, torch or floodlight makes them retreat. `flare` becomes a weapon.
3. **Cold makes them stronger.** As winter deepens they're active longer, then in daylight. *Nuclear winter is their habitat arriving.*
4. **Sealed rooms hide you.** `shelter_sealed` leaks less heat, and they pass the building by.
5. **Prey order:** livestock and dogs, then lone people, especially **husks** (still sick, freezing humans, not infected). Where husks gather, Tallmen follow.
6. **Dogs know.** Wraith sees them first and won't fight them.
7. **They learn.** They test perimeters, remember which lights fail, and retreat when hurt. **Never more than 3 visible at once.**

| Ch | What the player sees | Interactable? |
|---|---|---|
| 1 | Nothing | n/a |
| 2 (end) | Hospital exit at dusk: Wraith freezes and stares east. A thin upright shape on the far ridge for about 2 seconds, then gone. No HUD cue, no sting. | No |
| 3 | 2–3 glimpses at the edge of fog. Goats missing (blamed on the Viaduct Crew). Tracks too long and too far apart. | No |
| 4 | A shape in Galena's steam field. A frozen cow with its chest open. Wraith won't go near the cooling towers. | No |
| 5 | Ironwood radio: "contact, not human, repeat not—", then tracers into the dark. A flare shows one at mid-distance. | No |
| 6 | One stands at the end of an alley during the night sweep, looks at Braith, and leaves. Ruiz sees it too. | No |
| 7 | **First fights.** Lone Tallmen on the Dixie Valley road and at the Annex. Optional den with 2 torpid Tallmen at the hot springs. Reyne explains the rules and the count. | **Yes** (1–2) |
| 8 | Pairs hunting husks in the ash. Unsealed shelters get visited. | Yes (≤2) |
| 9 | Pairs and threes shadow the march in the whiteout. Wraith's warnings decide who lives. | Yes (≤3) |
| 10 | **The siege** (§7, Ch10): the survivors test the lamp line, probing and patient. | Yes (≤3) |

---

## 6. Timeline

| When | Event | Ch |
|---|---|---|
| Oct 14, Day 0 | Grid down. Ross's call cuts out. | — |
| Day 3 | Water pressure failing, pharmacy looted. | 1 |
| Day 16 | *(unseen)* Annex diesel runs out. | — |
| Day 19 | Recovery Authority forms. First glimpse. | 2 |
| Day 60 | Record cold. Wes arrives. Walt and the plant plan. | 3 |
| Late January | Black start at Galena. | 4 |
| March | The **Reconstruction Directive** requisitions the valley's warehouses for California. Nevada joins the compact bloc. Ironwood arrives. | 5 |
| May | Martial law, fighting in the rail trench. | 6 |
| July 9 | High-altitude bursts somewhere far off: the sky glows green, radios and electronics die again, **Galena trips and its control racks are cooked**. The expedition to the Annex. | 7 |
| August | Brown sky, fallout rain. | 8 |
| Midwinter, Year 2 | −40 °C. The Truckee freezes. | 9–10 |

---

## 7. Chapters

Level ids are kept except Ch6. Ch7 is big; see Cartographer notes in §11d.

| # (level id) | Title | Summary | Key choice | Enemies |
|---|---|---|---|---|
| 1 `ch01_day_three` | **Day Three** | Carly comes home after 70 hours on dispatch. Pressure's failing, so you haul water from the marina and boil it. You learn Wraith's tracking by finding Mr. Pruitt's lost scarf. Lolo needs clinic supplies, so you go to the pharmacy at dusk, where Kit is already looting it. At the end, the dead phone and Ross's voicemail. | The gas can: Pruitt's oxygen concentrator, the house generator, or **the drive to Yerington**? (Keeping it for the drive sets up Ch3 differently.) Let Kit go? | looter (Kit), watch_militia |
| 2 `ch02_the_registry` | **The Registry** | Checkpoint at the Virginia Street bridge, ration line, registry. The Authority wants Braith's hands for its motor pool in exchange for an **essential-worker card** (`priority_card`: extra rations plus a travel pass). Carly takes a registry job. The line stampedes. **First glimpse at dusk.** | Report Gil's diesel to fast-track the card? Cover for Kit? Back Carly's job or argue? | authority_guard (neutral), looter |
| 3 `ch03_the_long_cold` | **The Long Cold** | Record cold. Wes rides in with Ross's letter: *come home*. Gil's house burns and Carly goes in first. Braith fixes Augie's transmitter on Peavine and meets Walt. Carly finds the falsified count. 2–3 glimpses. | Who do you tell about the plant: Authority, Floor, the Compact (through Wes), or no one? Send Wes home with a reply or keep him? | bridge_boy, watch_militia |
| 4 `ch04_black_start` | **Black Start** | Night heist of the -86 ground power cart off the Air Guard ramp. Tow it up Steamboat Creek (Salt's culvert), clear the Lund family squatting in the plant, and bring Unit 1 up. Steam lights the dark. A shape in the steam. | Who gets the first line: hospital, the Floor, or the Authority? | desperate_family, bridge_boy, authority_guard (if told) |
| 5 `ch05_route_9` | **Route 9** | The Directive empties the warehouses. Convoy "Route 9" runs west under Ironwood escort; the Compact blocks the canyon. **Ross is on the barricade; Wes is wounded in the crossfire.** Drone, MRAP searchlight, tracers at something that isn't people. | Escort, sabotage, or divert half to the Floor? Pull Wes out (cost: you're seen by Ironwood) or leave him to the Compact medics? | compact_militia, ironwood_patrol, drone, mrap |
| 6 `ch06_the_trench` | **The Trench** | Martial law. A "typhoid" sweep of Sector 4 that's really a weapons search. Ruiz pinned under an MRAP door. Braith drops a stalled freight car to block the Bradley in the rail trench, or lets it pass. The alley Tallman. Carly picks her side. | Hide neighbors? Spare Ruiz? Block or open the trench? Push Avila to break with Ironwood? | ironwood_patrol, checkpoint, drones, bradley, militias |
| 7 `ch07_dead_air` (+ `ch07b_dixie_valley`) | **Dead Air** | *Part 1:* July 9 on Peavine. The sky glows, Augie's radio dies, Galena goes dark with its control racks fried. Reyne staggers into the shack and says the Annex was hardened: its spares survived. *Part 2:* the expedition east on US-50 (Ross at the Fallon checkpoint asks Braith to stay), then **the Annex** (§7a). | Stay with Ross, or go back? Kill the sleeping Tallmen in the den? Bring Reyne? Tell the Compact what the Annex holds? Where your people winter (`ch07_location`)? | remnant_patrol (recovery detail), coyote, **tallman ×1–2** (+2 torpid, optional) |
| 8 `ch08_ashfall` | **Ashfall** | Fallout rain. Braith digs out his Air Force mask (`has_gas_mask`). Seal the shelter (`seal_shelter`), which keeps out fallout and Tallmen. Husks in the ash with pairs of Tallmen following them. Carly runs the door. Lolo's list. Install the Annex control cards at Galena (if wintering there). | Filters and iodide for strangers? Open the door? | husk, feral_dog, looter, remnant_patrol, **tallman ≤2** |
| 9 `ch09_the_long_night` | **The Long Night** | A blizzard march along the frozen Truckee (`river_ice`) and up Steamboat Creek. Ruiz (if defected) finds the gap in the picket. The ice breaks. Tallmen in the whiteout. Wraith leads if the trail is lost. | Save Wes or the sled. Wraith's **Hold** order appears only here, only if she's injured, and it's signposted. | remnant_patrol, checkpoint, drone (visual), coyote, husk, **tallman ≤3** |
| 10 `ch10_the_warm_room` | **The Warm Room** | **The siege of the lamp line**, then the control room vote (below). | Final choice, which sets the ending | remnant_patrol / mrap (if no stand-down), **tallman ≤3 at a time** |

### 7a. The Annex (Ch7, Part 2)
- **Why go:** Galena needs **`control_cards`** (hardened PLC and control modules) to restart after the July bursts, and the Annex is the nearest hardened site. Also **`lamp_kit`** (hardened floodlights for Ch10) and a **filter cache** that seeds Ch8.
- **What the player learns** (from `annex_log`, Reyne, and the place itself): LONG SLEEP, the count (14/11/3), that they're sterile, the rules, that they followed the rail line and the Truckee west toward heat, and that an evacuation order was drafted and never sent. That's bureaucracy, not a conspiracy. Reyne's secret: she left the door open.
- **Enemies:**
  - The Ironwood **recovery detail**: 6 starving soldiers sent to secure the Annex before the split, now stranded. Hostile by default; Ruiz (if defected) or `ironwood_id` can talk them out.
  - 1–2 Tallmen inside the holds.
  - Coyotes on the flats.
  - **Tolliver**, the contractor guard who never left his post. Armed and neutral.
- **Set pieces:**
  - `annex_maglock_power`: hook the ground power cart to the dead maglocks; the doors open one at a time, slowly, in the dark.
  - `annex_holds`: 14 glass holds, 11 open, 3 with dead subjects in them.
  - `annex_hangar`: the fenced hangar Braith saw on TDY, holding the spares.
  - `dixie_hotsprings_den` (optional): two torpid Tallmen in the steam. Killing them drops `tallmen_remaining` by 2 and makes Ch10 easier; Reyne begs you not to. It's morally neutral (no kindness change); it's a question of what you are.

### 7b. Ch10, the siege (consistent with "never a horde")
The few survivors (`tallmen_remaining`, typically 3–7) come for the brightest heat in the valley, and they're patient. The level compresses three nights:
- **Night 1, the test:** one lamp on the far side goes out. A cut cable, chewed.
- **Night 2, the probe:** a sentry is taken from the dark side, or the cooling-water line is broken (Braith repairs it under pressure).
- **Night 3, the push:** they come at the weakest lit sector. Never more than 3 visible at once, and they break off at dawn or after losing 2.

Wraith's warnings show *which side*. Braith's job is keeping the lights and lines working, with fighting as the fallback. If `tallmen_remaining <= 3`, skip straight to Night 3. Then comes the control-room vote, unless the Remnant (if it didn't stand down) attacks between Nights 2 and 3.

**Delayed payoffs (examples):**
- Ch1 gas to Pruitt: in Ch8 Deshawn shows you a clean cistern.
- Ch2 covering for Kit: in Ch3 she warns you about the fire; in Ch9 she brings the sled.
- Ch4 first line to the hospital: in Ch8 Ames saves Braith's frostbitten hand.
- Ch5 pulling Wes out: in Ch7 Ross lets you through Fallon without a toll.
- Ch6 sparing Ruiz: in Ch7 she talks down the recovery detail; in Ch9 she shows you the picket gap.
- Feeding Wraith first: in Ch9 she finds the trail.

---

## 8. Endings (same five-ending structure)

**Pearce family modifier** (replaces the Theo modifier, applied to every ending): it reads `wes_alive`, `ross_alive` and `pearce_reconciled`. `pearce_reconciled` is true if you didn't fire on the blockade in Ch5 AND you either pulled Wes out in Ch5 or gave Ross an honest goodbye in Ch7. The epilogue gets a letter, a radio voice or a reunion accordingly. There's no checkpoint death rule.

| id | Title | What happens |
|---|---|---|
| `end_warm_room` | **The Warm Room** *(earned hope)* | A council of all three factions plus the strangers you took in. Galena heats the hospital and Annie's greenhouse dome; the lamp line burns every night. Carly's census board covers a wall. If reconciled, Ross sends seed hay on the spring sled. No rescue, just a plan for this winter. |
| `end_ledger` | **The Ledger** *(order)* | Avila runs the plant from a triage list of 412 names; the valley had 30,000. Braith keeps the turbines. Carly keeps the list (if `carly_side` is the Authority) or is not on it. |
| `end_stillwater` | **Stillwater** *(survival by abandonment)* | The Compact hauls the ORC units east to the Stillwater geothermal field near Fallon. Braith goes home to Ross and Wes. Reno goes dark behind you, and the last Tallmen drift toward its final warm windows. |
| `end_dark_water` | **Dark Water** *(bleak sacrifice)* | Braith wrecks the wellheads so nobody kills for Galena again. The valley goes cold, the Tallmen sink into torpor, and the long walk south begins. Who survives depends on `kindness`. |
| `end_two_coats` | **Two Coats** *(fallback)* | Before dawn: two packs, Wraith at heel (if alive), Carly (if still with you). If `kit_alive`, her voice on a stolen radio is the last thing you hear. |

`end_warm_room` count list: `pruitt_alive`, `kit_alive`, `gil_alive`, `wes_alive`, `lolo_alive`, `ruiz_defected`, `lunds_stayed` (at least 3). The other conditions are unchanged.

---

## 9. Main NPC cast

| id | Name | Hook | Replaces |
|---|---|---|---|
| `carly` | Carly Redmond | Dispatcher, builds the Switchboard; her own side and arc | `theo` (the "picks a side" role only) |
| `wraith` | Wraith (dog) | Tracks, warns, guards; sees the Tallmen first | **new** companion |
| `ross` | Ross Pearce | Braith's father, Compact lieutenant, Ch5/Ch7 | **new** |
| `wes` | Wes Pearce | Braith's brother, Compact rider, wounded Ch5 | `cody` |
| `lolo` | Dolores "Lolo" Arrieta | Retired ICU nurse next door; keeps a list of people she helped die, and Wes is on it in Ch8 if he's with you, wounded | `marguerite` |
| `gil` | Gil Shumway | Retired UP diesel mechanic with 200 gal of diesel; holds a grudge if reported | `ray` |
| `kit` | Kit Darrow | 19, Viaduct Crew runner; trades meds and rumors | `wren` |
| `avila` | Capt. Lorna Avila | Runs the Authority; 41 days of food, not 140 | `strand` |
| `augie` | Augie Bell | Ham operator on Peavine; three versions of the war | `lou` |
| `walt` | Walt Okada | Ran Galena for 22 years; black-start and the well field | `hank` |
| `ames` | Dr. Samuel Ames | Last attending at Meadows General | kept |
| `roz` | Roz Tafoya | Feeds 3,000 a day from the Silver Spur; buys guns | `bea` |
| `ander` | Ander Etcheverry | Compact leader; his blockade starves his aunt's care home | `jory` |
| `ruiz` | Sgt. Nadia Ruiz | Defectable Ironwood engineer; saw the Tallman | kept |
| `reyne` | Dr. Hollis Reyne | Annex biologist; left the door open | **new** |

---

## 10. A world still semi-inhabited

### 10a. Ambient and minor NPCs

| id | Who | Met | How they change |
|---|---|---|---|
| `pruitt` / `deshawn` | Mr. Pruitt (oxygen) and his grandson | Ch1, Ch8 | Kept. Pruitt dies in Ch2 without the gas can; Deshawn and the cistern in Ch8 |
| `cpl_haas` | Bored, decent checkpoint corporal | Ch2, Ch6 | Kept. Bribable; deserts in Ch7 if you were kind |
| `pete_lund` | Father squatting in Galena | Ch4 | Kept. Stays as plant crew (`lunds_stayed`) |
| `rosa` | Floor mother of Mateo (8) | Ch2, Ch8 | Kept. Filter tip in Ch8 |
| `kessler` | Ironwood commander | Ch9–10 | Kept |
| `amb_brother_amos` | Street preacher at the Virginia bridge who counts the dead aloud | Ch2, 3, 6, 8 | Runs a burial crew in Act II. Act III: becomes a husk, or the Warm Room chaplain if given a coat in Ch3 |
| `amb_lonnie` | Casino lounge singer still in his sequined jacket, singing in the ration line for food | Ch2, 6, 10 | Sings on Carly's Switchboard in Act II. Last heard in Two Coats, or sings at the Warm Room |
| `amb_salt` | Desert hermit in a culvert by the Steamboat hot springs: "they've been watching me since November" | Ch4, 9 | The first person to *name* the Tallmen. Ch9: dead in his culvert, or warmed and following the column if you left him a lamp |
| `amb_darlene` | Stranded long-haul trucker with a reefer trailer of frozen chicken | Ch3, 5 | Generous in Act I; armed and hoarding by Act II; requisitioned in Ch5 unless you warn her (then she joins Mo) |
| `amb_bike_kids` | Pack of 12-year-olds on bikes who run messages for the Switchboard | Ch3–8 | Act II scouts (reveal map icons). One dies in the Ch6 sweep unless neighbors were hidden. Act III: the Warm Room's runners |
| `amb_deputy_lusk` | Off-duty sheriff's deputy guarding his cul-de-sac; the watch militia leader | Ch1, 3, 6 | Joins the Authority, or turns hostile to strangers if Gil was reported. Act III: shuts his cul-de-sac to everyone and dies there |
| `amb_ruth` | Retired schoolteacher teaching kids in the convention center | Ch2, 6, 10 | Act III: the Warm Room school, if the Floor or a council holds |
| `amb_pvt_marsh` | 19-year-old Ironwood deserter hiding in a 4th Street motel | Ch6, 9 | Hide him or turn him in (`ironwood_hostility` vs `kindness`). Ch9: joins Ruiz, or is shot by the Remnant |
| `amb_night_owl` | Anonymous radio voice reading the names of the missing every night (**radio only**) | Ch3–9 | Carly's rival, then ally. Ch8: you learn it's Ruth |
| `amb_tolliver` | Annex contractor guard who stayed at his post for 9 months | Ch7 | Comes back with you (badly needed armed guard), stays, or shoots you if you threaten Reyne |

### 10b. Traders

**Barter economy:** every item has a `barter_value`, and traders add `wants` multipliers. Scrip only lasts while its issuer does: **Authority ration cards** (Act I–II), **Silver Spur chips** at the Floor (Act II). In Act III the currency is **fuel, filters, batteries, ammo, and warm-bunk nights** at Galena. **Info** (`rumor` tokens from Augie, Night Owl, the Annex log) is currency with Rourke and Dutch.

| id | Trader (personality) | Where / when | Trades | Wants | Shift by act | Hook |
|---|---|---|---|---|---|---|
| `trader_dutch` | **Dutch Albertson**: 4th Street pawnbroker, cheerful, cynical, everything has a price | `loc_fourth_street`, Ch1–6 | Tools, guns, cigarettes, stolen meds | Batteries, ammo, jewelry, rumors | I: takes cash for a week, then barter only. II: fences Ironwood gear, prices ×1.5. III: gone | **Betrayal:** if `trader_dutch_rep` is low he sells your plant route to the Viaduct Crew (Ch4 ambush) or to Ironwood (Ch6) |
| `trader_mo` | **Maureen "Mo" Kessinger**: truck-stop owner, gruff, fair, hates freeloaders | `loc_mustang_truckstop`, Ch3–9 | Diesel, gasoline, Jet-A, tire chains, sled parts | Mechanic labor, parts, food | I: fuel plentiful. II: taxed by both Compact and Ironwood, prices ×2. III: the last fuel in the valley, sold for warm bunks | **Quest** `q_mo_pump`: fix her tank pump (Braith's skill) for standing credit. If Darlene joins her, she survives Act III |
| `trader_rourke` | **Wendell Rourke**: Virginia City prospector with a burro string, storyteller, liar | Moves: Ch3 Peavine road, Ch5 canyon, Ch7 Fallon, Ch9 river camp | Odd goods: whiskey, candles, maps, tea, reloading supplies | **Stories and info** (`rumor` tokens), salt | Prices stable; stock gets weirder | **Quest** `q_rourke_escort`: get his burros through the canyon in Ch5. He's the first to sell you an Annex rumor |
| `trader_annie` | **Annie Tran**: librarian running a seed library, gentle, unbudging | `loc_sparks_library`, Ch2–10 | Seeds, antibiotics, iodide, books (+kindness), grow lights | Batteries, wire, glass, labor | I: generous. II: rations antibiotics. III: her greenhouse needs Galena heat; becomes a council member | **Quest** `q_annie_greenhouse`: run a heat line to the library dome (Ch8). Needed for the Warm Room flavor |
| `trader_boone` | **SSgt. Tyrell Boone**: Ironwood supply sergeant selling out the back door, charming, scared | `loc_sparks_yard`, Ch5–8 | MREs, `mask_filter`, ammo, `dosimeter` | Cigarettes, whiskey, silence | II: needs `ironwood_id` or a bribe. III: Remnant prices ×3 | **Betrayal:** some of his filters are expired (one in three fails in Ch8 unless you test them). If you expose him to Ruiz, Kessler shoots him and his stock drops as loot |

Plus **Kit** (meds and rumors, Act I–II) and the **Floor commissary** (`trader_floor`, generic, Silver Spur chips, Act II).

### 10c. Population density per chapter (for Cartographer)

| Ch | Who's around | Notes |
|---|---|---|
| 1 | Busy: neighbors on porches, kids, people cooking on grills, a block-watch, Deputy Lusk | Feels like a snow day. 10–15 ambient figures |
| 2 | Crowds: the ration line (Lonnie, Brother Amos, Ruth's class), guards, squatters | Densest level. Generic `crowd_*` barks |
| 3 | Thinning: smoke from chimneys, Darlene's camp, bike kids, Rourke on the Peavine road, the Night Owl on radio | Half the houses dark |
| 4 | Sparse: Salt's culvert, the Lunds, an airfield guard | Empty roads, burned cars |
| 5 | Two armed camps: the blockade (cook fires, Ross) and the convoy; Rourke's burros | Roadside camp on the canyon shoulder |
| 6 | Occupied city: curfew, a few people in windows, Marsh in a motel, sweep teams, Dutch's last week | Silent streets, loudspeakers |
| 7 | Desert emptiness: Peavine, the Fallon checkpoint (a functioning farm town), then nothing; Tolliver alone at the Annex | Fallon is the last "normal" place in the game |
| 8 | Shelter interiors: 10–20 people inside, husks and Tallmen outside; Annie's library; Boone | Doors and windows matter (SEAL) |
| 9 | The column (5–25 people by `column_size`), a river camp (Rourke), Salt (dead or alive), pickets | No one else alive on the ice |
| 10 | Galena: everyone you saved. Faction tables, kids at Ruth's school, Lonnie singing | The most people since Ch2: proof of what you built |

---

## 11. Impact for the developers

**Principle:** keep the schema, event hooks, mechanic flags, internal faction ids and the 5-ending structure. All dialogue is rewritten; speaker `dell` becomes `braith`.

### 11a. REMOVED (insulin and diabetes mechanic, for everyone)
| Where | Id(s) | Action |
|---|---|---|
| Items (story + systems) | `insulin_vial`, `cool_pack`, `lake_cooler` | **Remove**, including the `systems/items.json` legacy alias `insulin`, starting loadout `insulin_vial: 3`, and loot table entries (Ch1 pharmacy, hospital) |
| Crafting | `lake_cooler` recipe (`systems/crafting.json`) | **Remove** |
| Flags | `theo_insulin_lapses`, `theo_alive`, `theo_helped_cooler`, `theo_skipping_known`, `theo_crossed_off`, `ch01_cooler_built`, `ames_deal`, `ch02_insulin_secured` (level flag) | **Remove** |
| Rules | `theo_checkpoint_rule` and the chapter-end insulin checks at Ch3/Ch7/Ch9 (`gameplay_hooks` chapter scripts) | **Remove**; replaced by the Pearce family modifier (no death checkpoint) |
| Quests | `q_cooler`, `q_insulin`, `q_find_theo` | **Remove**; add `q_water`, `q_essential_card`, `q_find_wes` |
| Repurposed | `priority_card` (now an essential-worker card), `pharmacy_bag` (clinic supplies for Lolo), `ch08_foot_saved` → `ch08_hand_saved` (Braith's hand) | Same mechanics, new meaning |
| Dialogue | `ch01_theo_morning`, `ch01_theo_night`, `ch06_theo_side` | Become `ch01_carly_home`, `ch01_voicemail`, `ch06_carly_side` |

### 11b. Renamed and added ids
| Type | Old | New |
|---|---|---|
| Location | `loc_east_end` · `loc_belknap_pharmacy` · `loc_blatnik_bridge` · `loc_decc_ration` · `loc_lakehead_memorial` · `loc_proctor_yard` · `loc_ore_docks` · `loc_lift_bridge` · `loc_hwy53_blockade` · `loc_lou_shack` · `loc_jay_cooke` · `loc_thomson_dam` | `loc_sparks_block` · `loc_prater_pharmacy` · `loc_virginia_bridge` · `loc_rscc_registry` · `loc_meadows_general` · `loc_sparks_yard` · `loc_silver_spur` · `loc_rail_trench` · `loc_i80_blockade` · `loc_peavine_shack` · `loc_steamboat_creek` · `loc_galena_station` |
| Location (add) | — | `loc_sparks_marina`, `loc_fourth_street`, `loc_sparks_library`, `loc_airguard_ramp`, `loc_tric_warehouses`, `loc_mustang_truckstop`, **`loc_us50_fallon`, `loc_dixie_annex`, `loc_annex_holds`, `loc_dixie_hotsprings`** |
| Location (kept) | `river_ice` | `river_ice` |
| Level | `ch06_the_lift_bridge` | `ch06_the_trench`; **add** `ch07b_dixie_valley` (see 11d) |
| NPC | theo · marguerite · ray · wren · strand · lou · hank · bea · jory · cody | carly · lolo · gil · kit · avila · augie · walt · roz · ander · wes |
| NPC (add) | — | `wraith`, `ross`, `reyne`; ambient `amb_brother_amos`, `amb_lonnie`, `amb_salt`, `amb_darlene`, `amb_bike_kids`, `amb_deputy_lusk`, `amb_ruth`, `amb_pvt_marsh`, `amb_night_owl`, `amb_tolliver`; traders `trader_dutch`, `trader_mo`, `trader_rourke`, `trader_annie`, `trader_boone`, `trader_floor` |
| NPC (kept) | ames, ruiz, pruitt, deshawn, cpl_haas, kessler, pete_lund, rosa | same |
| Speaker | `dell` | `braith` |
| Faction | all 5 | unchanged ids; **add** `annex` (enemy family) |
| Enemy | `wolf` | `coyote` (same `dog` AI) |
| Enemy (add) | — | **`tallman`** (new `code_kind: stalker`: heat-seek, flee sustained light, hit-and-retreat, max 3 active; fallback: `dog` AI on a tall mesh). **`recovery_detail`** (variant of `remnant_patrol`, Ch7). Gating: `glimpse_from: ch02`, `tallman_from: ch07` |
| Enemy (kept) | looter, bridge_boy, watch_militia, desperate_family, authority_guard, compact_militia, harbor_militia, ironwood_*, remnant_patrol, feral_dog, husk | same ids, reskins/display names only |
| Set piece (add) | — | `tallman_glimpse` (Ch2–6: far billboard, no collider/AI, despawns after 2–3 s or on approach), `gpu_tow` (Ch4), `freight_car_drop` (Ch6), `annex_maglock_power`, `annex_holds`, `annex_hangar`, `dixie_hotsprings_den` (Ch7), `lamp_line_siege` (Ch10) |
| Item | `lineman_tools` · `hank_keys` | `mech_tools` · `walt_keys` |
| Item (add) | — | `gpu_cart` (quest), `control_cards` (quest, Ch7→8), `lamp_kit`, `annex_log` (lore), `vet_kit`, `rumor` (info token), `spur_chip` (scrip) |
| Item (display only) | `dried_fish`, `grain_sack` | "jerky", "ration pallet" |
| Ending | `end_iron_range` | `end_stillwater` |

### 11c. Flags
- **Kept exactly:** `has_gas_mask`, `seal_shelter` (event), `shelter_sealed`, `kindness`, `final_choice` (same enum), `dam_running` and `dam_secret_told` (now mean Galena), `ch07_location` (set at the end of Ch7), `power_priority`, `convoy_choice`, `bridge_choice` (block/open the trench), `ironwood_*`, `rep_*`, `ruiz_*`, `pruitt_*`, `rosa_*`, `lunds_stayed`, `filters_shared`, `husks_talked_down`, `column_size`, `ch09_*`, `ending`.
- **Prefix rename:** `theo_side` → `carly_side`. `marguerite_*` → `lolo_*`, `ray_*` → `gil_*`, `wren_*` → `kit_*`, `strand_*` → `avila_*`, `lou_*` → `augie_*`, `hank_*` → `walt_*`, `bea_*` → `roz_*`, `jory_*` → `ander_*`, `cody_*` → `wes_*`.
- **Add:**
  - Companions and family: `carly_trust` (int), `carly_left`, `wraith_alive` (only set false by Ch9 `ch09_wraith_hold`), `wraith_injured`, `wraith_trust` (int), `ross_alive`, `ross_met`, `pearce_reconciled`, `wes_crossed_off`, `ch01_gas_choice` (pruitt|generator|drive).
  - The Annex and Tallmen: `reyne_met`, `reyne_with_you`, `reyne_secret_known`, `annex_known`, `annex_told` (compact|none), `den_killed`, `tallmen_remaining` (int, 11), `tallman_glimpses` (int), `lamp_line_built`.
  - Traders: `trader_<id>_rep` (int) per trader.

### 11d. Art, levels and Cartographer notes
- **Protagonist art must change to Braith:** `assets/paperdoll/base_body.png` (48×96) and the **HUD portrait**; `face_gas_mask` becomes an Air Force-style mask. **New:** Wraith (follow/sniff/growl/limp/down states plus HUD mini-portrait and HP), Carly, Ross, Wes, Reyne, Tallman (mesh plus far silhouette), trader stalls/carts, Rourke's burros.
- **Backdrop:** high desert (Sierra west, Peavine north, sage). Ch2 needs a **distant east ridge** for the glimpse.
- **Ch1 `ch01_day_three`:** rename the two location ids. Add `loc_sparks_marina` around the existing `ch01_lake_edge` (now a water run: `water_dirty` then boil). **Repurpose `ch01_cooler_station` as `ch01_water_station`** (boil/store). Rewrite objectives "Build a lake-water cooler" and "Pharmacy: insulin" as "Get water running" and "Pharmacy: supplies for Lolo." Remove the `insulin_vial` loot and guaranteed drop. Add Wraith spawn, follow nav and a scent-trail interactive. Add Carly at home, ambient neighbors (10–15), and a phone/voicemail interactive. October in Reno: **dry, light frost, no snow.**
- **Ch2 `ch02_the_registry`:** rename the three location ids. Replace the `ch02_insulin_secured` objective with `ch02_card_secured` (essential-worker card via registry, Ames's diesel job, or Kit). Keep `ch02_crank_radio` and `ch02_crush_kid`. Add Wraith, ambient crowd (Lonnie, Brother Amos, Ruth), and **one `tallman_glimpse` set piece and trigger** at the hospital exit, at dusk, facing the east ridge.
- **Ch7: recommend two level files under one story chapter.** `ch07_dead_air` (Peavine shack, then the road east with the Fallon checkpoint at `loc_us50_fallon`) and **`ch07b_dixie_valley`** (`loc_dixie_annex` exterior with airstrip and hangar; `loc_annex_holds` interior: maglock corridor, 14 holds, records room; optional `loc_dixie_hotsprings` den 3 mi out). Annex palette: sodium-orange emergency lighting dead, so light comes from your flashlight and the cart's work lamps. Enemy budget: 6 recovery detail, ≤2 active Tallmen (+2 torpid), 3 coyotes, Tolliver (neutral).
- Trader stalls are placeable entities (`trader_*` with `stock_table` by act). Ambient NPCs use the density table in §10c.
- Re-run `levels/tools/validate.py` and `story/validate.py` after implementation.

---

## 12. Open questions for you

1. **Braith's family:** OK to add his father **Ross** and brother **Wes** on the Compact side as the main personal stake, with Wes replacing the old Cody role?
2. **What the plant needs:** OK for July's distant high-altitude bursts to fry Galena's controls, so the Annex trip is a must-do in Ch7? Or should the Annex be optional, with lore plus lamps only?
3. **Tallmen count:** OK that they're finite and sterile (11 at large), so a careful player can thin them before the Ch10 siege, including the morally loaded choice to kill two sleeping ones?
