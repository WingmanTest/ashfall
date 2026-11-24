# ASHFALL — Story Bible

> Working title: **ASHFALL: Lakehead**
> First-person, portrait, pixel-art survival. Three acts: **Blackout → Civil War → Nuclear Winter**.
> Tone: **dark but hopeful.** People die. Small kindnesses don't save the world, but they decide who is still beside you at the end.

---

## 1. Premise (one paragraph)

On October 14th a geomagnetic storm burns out the high-voltage transformers that hold up the North American grid. Replacements take years to build, and they are built overseas. **Adele "Dell" Kowalczyk** is a 41-year-old utility lineworker in Superior, Wisconsin. Her son Theo, 15, has Type 1 diabetes. His insulin needs to stay cold and it has to be replaced. Dell can't fix the country, but she knows how to *black-start* a small hydro plant: the Thomson Dam on the St. Louis River, 20 miles upstream. That skill makes her valuable to every faction that forms out of the dark. When the country splits and then the sky goes grey, the only warm, lit building for a hundred miles is the one she helped switch on. **Who gets the power** is the question the whole game asks.

## 2. Tone & themes

**Dark but hopeful.**
- Losses are permanent and often happen offscreen, *later*, because of something you did or didn't do three chapters ago.
- Kindness is a **mechanic** (`kindness` counter and specific flags). It doesn't win fights. It shows up later as a door that opens, a warning shouted, a filter left on your step, a person who is still alive to help you.
- The good ending is **earned hope**. It has no rescue, no restored America, no spring. It's a warm room run by people who chose each other, with a hard, specific plan for getting through one more winter. In the best ending some people are still missing, but the lights are on.
- Never cruel for spectacle. Horror comes from scarcity and from good people doing arithmetic.

**Themes**
1. *Who counts?* Rationing is a list, and every list leaves somebody off.
2. *Skill vs. stake.* Dell isn't chosen. She's a tradesperson with a kid. Many people could restart the dam. She's just the one who's there.
3. *Neighbors.* The same person can be a hoarder, a thief, a savior and a casualty.
4. *Orders vs. conscience.* When the chain of command splits, soldiers have to choose who they are. So does everyone else.
5. *Rumor as weather.* Nobody knows the truth about anything big. Players never get a definitive answer to "who fired first". Lou, the radio man, gives three versions.

**Avoid (hard rules for writers)**
- No "raiders are just evil." Every hostile group has a reason you can hear if you listen.
- No chosen one, no secret bloodline, no "it was the government all along." The blackout is a natural event hitting an unprepared system. The war is people. The bombs are an unknowable mess.
- **Acts I and early II are strictly people vs. people:** neighbors, gangs, desperate families, militias, looters. No mutants and no animal packs before Ch7.
- **The US military as enemy is never cartoonish.** Federal troops are tired kids under a contested chain of command, following orders that are legal on paper. Some can be talked to, spared, or turned.
- No B-movie monsters. Act III "husks" are **radiation-sick, hypothermic, starving people** who've lost judgment. "Ferals" are starving dog packs and wolves. They are dangerous and they *are* enemies, but the writing treats them as people and animals.

## 3. Setting: the Twin Ports (Duluth, MN / Superior, WI)

A cold, hilly, industrial lake city on the western tip of Lake Superior: ore docks, grain elevators, rail yards, a famous lift bridge, and miles of frozen forest in every direction. Winters already hit −30 °C. The setting fits Echo's mockups exactly (industrial stacks, water towers, containers, snowy asphalt).

**Key locations** (IDs match `gameplay_hooks.json`):
| ID | Place | Notes |
|---|---|---|
| `loc_east_end` | Dell's block, East End, Superior WI | Authority designation **SECTOR 4** (matches mockup HUD) |
| `loc_belknap_pharmacy` | Corner pharmacy on Belknap St | Looted on day 2 |
| `loc_blatnik_bridge` | High bridge between the cities | Authority checkpoint |
| `loc_decc_ration` | Duluth convention center | Authority ration hub and registry |
| `loc_lakehead_memorial` | Lakehead Memorial Hospital (fictional) | Insulin, Dr. Ames |
| `loc_proctor_yard` | Proctor rail yard | Grain trains go east |
| `loc_ore_docks` | Ore docks and grain elevators | Harbor stronghold |
| `loc_lift_bridge` | Aerial Lift Bridge, Canal Park | Act II set piece |
| `loc_hwy53_blockade` | Highway 53 north (ROUTE 9 convoy road) | Range Compact blockade |
| `loc_lou_shack` | Lou's radio shack, Proctor hill | Shortwave, rumors |
| `loc_jay_cooke` | Jay Cooke State Park forest | Swinging bridge, wolves |
| `loc_thomson_dam` | Thomson hydro station | The prize |

"ROUTE 9" in the HUD is the Authority's numbered convoy route from the port to Proctor. "FILTER" and "SEAL" become meaningful in Act III.

## 4. Protagonist

**Adele "Dell" Kowalczyk** (41). Journeyman lineworker, Lakehead Power Cooperative. Divorced; her ex is in Milwaukee and is never heard from again. She's dry, practical, and allergic to speeches. She swears in Polish when she's scared, a habit from her grandmother. She has climbed poles in ice storms for 18 years.
- **Personal stake:** Theo's insulin. A vial lasts about 30 days once opened, and it needs to stay cool, not frozen. In the blackout that means a basement, lake water, or a fridge with power.
- **Skill:** She knows the Thomson plant's black-start procedure from a mutual-aid drill. Hank taught it to her.
- **Flaw:** She trusts systems, until she sees the list.
- She is the player. She has a voice, but it's terse, and choices are written as Dell's short lines.

## 5. Timeline

| When | Event | Act |
|---|---|---|
| Oct 14, Day 0 | Aurora down to Texas. Grid collapses coast to coast. | I |
| Day 3 | Water pressure drops, phones die, the pharmacy is looted. **Ch1** | I |
| Day 19 | The county and National Guard form the **Northland Restoration Authority**. Ration registry. **Ch2** | I |
| Day 60 (December) | First deep cold. Neighbors turn. Hank's dam plan. **Ch3** | I |
| Late Jan | Black start at Thomson. **Ch4** | II |
| March | The federal "Reconstruction Directive" requisitions Midwest grain for eastern cities. Minnesota's governor refuses and joins the state-compact bloc. A federal unit, **Task Force Ironwood** (an Army brigade element out of Fort McCoy, WI), arrives to enforce it. The Guard's chain of command splits: governor vs. federal orders. Range Compact blockade. **Ch5** | II |
| May | Martial law in the port: sweeps, confiscation, a "typhoid quarantine" in Sector 4. Fighting at the Lift Bridge. **Ch6** | II |
| July 9 | Radio goes dark. Nobody here sees flashes. Lou hears three stories. Ironwood loses contact with its command; half the unit deserts, and the rest dig in under Maj. Kessler. **Ch7** | II→III |
| August | Brown sky, snow in August, crops fail, fallout rain. **Ch8** | III |
| Midwinter, Year 2 | −45 °C. The dam is the last warm place. **Ch9–10** | III |

**What happened nationally (writer-only truth, never confirmed in game):** During the civil war, control of western ICBM fields and an East Coast command split. There was a limited exchange; which side launched first, and at whom, is truly unknown even to the writers. Soot from burning cities did the rest. In game, keep it to rumor.

## 6. Factions

Each faction is right about something.

### Northland Restoration Authority ("the Authority")
Leader: **Capt. Yvonne Strand**. County emergency management plus National Guard and police. Registry, ration cards, sector numbers, curfew.
- *Right about:* without counting, everyone starves at once.
- *Wrong about:* the count is a lie (Strand falsifies it to prevent panic), and in Act II it ships local grain east under federal orders.
- Rep flag: `rep_authority`

### The Harbor
Leader: **Bea Salvesen**. Longshore union, church kitchens, and the Seafarers' center, run as mutual aid from the ore docks and grain elevators.
- *Right about:* food should stay with the people who live here.
- *Wrong about:* "the people who live here" quietly shrinks to "people we know". They also trade grain for guns.
- Rep flag: `rep_harbor`

### The Range Compact ("the Compact")
Leader: **Jory Maki**. Iron Range miners, farmers, and union locals from up Highway 53, allied with the national state-compact movement.
- *Right about:* the Directive is taking food from starving northerners to feed someone else's city.
- *Wrong about:* their blockade also starves the Range's own nursing homes, and Jory knows it.
- Rep flag: `rep_compact`

### Task Force Ironwood (federal Army, Act II–III enemy)
Commander: **Maj. Dale Kessler** (heard on radio and loudspeakers, met only in Ch9–10). A battalion-minus of active-duty soldiers sent to enforce the Directive's grain requisition. They have MRAPs, one Bradley, small surveillance drones, and checkpoints.
- *Right about:* the eastern cities are starving worse, and the orders are legal on paper.
- *Wrong about:* "legal" stopped meaning anything when the country split. Sweeps and confiscation turn into collective punishment. The Sector 4 "quarantine" is real typhoid used as cover for a weapons search.
- **Contested chain of command:** Strand's Guard is ordered by the governor to resist and by the Pentagon to assist. Dell's choices in Ch5–6 push Strand one way (`strand_stance`). Individual soldiers can be spared, can desert, or can join you. See **Sgt. Nadia Ruiz**.
- After Ch7 (radio silence) the unit splits. Deserters scatter; the **Ironwood Remnant** under Kessler holds Proctor yard and wants the dam.
- Rep flag: none. Track with `ironwood_hostility` (int).

### Non-faction hostiles (enemies for Echo)
- **Act I (people only):** looters, the **Bridge Boys** (a scavenger and raider crew of laid-off young men and teenagers working under the Blatnik bridge; hungry and armed; Wren runs for them), desperate families defending a house, neighborhood watch militias with deer rifles.
- **Act II:** the above, plus Compact militia, Authority/Guard checkpoints (if you go against them), and **Ironwood** military patrols, checkpoints, surveillance drones (set piece: hide when one is overhead), and an MRAP and Bradley (set pieces: you avoid or disable them, never duel them).
- **Ferals (Ch7 onward only):** dog packs abandoned and starving after the second winter begins, and wolves in the Jay Cooke woods.
- **Husks** (Act III): radiation-sick, hypothermic, starving people. They strip off coats (paradoxical undressing), wander, and attack anyone carrying heat or food. Some can be talked down if you carry `iodide_tablets` and `kindness >= 4` (see Ch8).

## 7. Three-act arc

**Act I: The Dark (Ch1–3).** Slow decay. Day 3 still feels like a snow day. By Day 60 people are burning furniture and reporting each other for hoarding. Systems try (rations, registry) and people try (Marguerite's clinic, Ray's generator). Every early kindness costs Theo something: fuel, insulin, or time.

**Act II: The Split (Ch4–7).** Dell lights Thomson Dam, and now she has something everyone wants. The Directive's grain requisition turns local tension into a shooting war over the port. **Task Force Ironwood** arrives in Ch5, and in Ch6 the US Army becomes an enemy you fight: patrols, checkpoints, drones, armor. It's also an army of people you can spare, turn, or desert alongside. Players decide where power, grain, and the lift bridge go. Theo is old enough to pick a side without her.

**Act III: Ashfall (Ch8–10).** Nuclear winter. Politics shrink to the size of a building. FILTER, SEAL, RAD, and TEMP dominate. The last act is a blizzard march to the dam and a final decision about who lives inside its warmth.

## 8. Chapter-by-chapter outline

Full detail is in `chapters/chXX_*.md`; machine-readable hooks are in `gameplay_hooks.json`.

| # | Title | Objective | Set piece | Key choice |
|---|---|---|---|---|
| 1 | Day Three | Keep Theo's insulin cool. Get fuel. | The looted pharmacy at dusk | Give the gas can to Marguerite for Mr. Pruitt's oxygen machine, or keep it |
| 2 | The Registry | Register at the DECC and get Theo priority insulin | The ration line breaks into a stampede on the bridge | Report Ray's stockpile for a priority card? Cover for Wren? |
| 3 | The Long Cold | Survive the first −30 night. Recruit Hank. | Ray's house on fire in a blizzard | Who do you tell about the dam: Authority, Harbor, or no one? |
| 4 | Black Start | Reach Thomson and restart Unit 2 | A desperate family squatting in the powerhouse; the turbines spinning up in the dark | Who gets the first power line: hospital, Harbor, or Authority? |
| 5 | Route 9 | The grain-train convoy, now escorted by Ironwood | Highway 53 blockade at night; an Ironwood MRAP's searchlight | Escort the train, sabotage it, or divert half to the Harbor. Spare the wounded Cody? |
| 6 | The Lift Bridge | Get Theo out of the martial-law sweep | Sector 4 quarantine sweep; drone overhead; raising the lift bridge as a Bradley holds the canal | Hide neighbors from confiscation? Spare Sgt. Ruiz? Raise or hold the bridge? Push Strand to break with Ironwood? |
| 7 | Dead Air | Find out what happened | Lou's shack as the radio goes silent; the first grey snow in July | Leave the city for the dam, or stay with your people |
| 8 | Ashfall | Filters, iodide, food. Bring people in. | Fallout rain over the docks; first husks | Spend filters and iodide on strangers? Marguerite's list |
| 9 | The Long Night | Blizzard march up the river to the dam | Whiteout in Jay Cooke; wolves; Ironwood Remnant patrols; husks at the swinging bridge | Save Cody or the supply sled. Ruiz (if defected) cuts a path through the Remnant's lines |
| 10 | The Warm Room | Decide who controls the dam | The control room vote | Final choice → ending |

## 9. Endings

Evaluated at the end of Ch10 by `final_choice` plus conditions. Full logic is in `endings` inside `flags.json`; the summary is here. **Theo's fate** is a separate modifier applied to every ending.

| ID | Name | Requires | What happens |
|---|---|---|---|
| `end_warm_room` | **The Warm Room** (earned hope) | `final_choice=="council"` AND `dam_running` AND `kindness>=5` AND at least 3 of {`pruitt_alive`, `wren_alive`, `ray_alive`, `cody_alive`, `marguerite_alive`, `ruiz_defected`, `lunds_stayed`} AND someone with guns backs the table: (`rep_harbor>=2` OR `strand_stance=="governor"` OR `ruiz_defected`). The council option only appears if `kindness>=5` and `dam_running`; if the rest fails, the room splits → `end_two_coats`. | A council drawn from all three factions and the strangers you took in. The dam heats the hospital and one elevator converted into a greenhouse. Bea, Strand (if alive), and Jory sit at one table, and they hate it. Final narration: the census board, with names, more than the Authority's list ever held. No rescue is coming. They have a plan for one more winter, and then another. |
| `end_ledger` | **The Ledger** (order) | `final_choice=="authority"` AND `rep_authority>=3` AND `strand_alive`. Kessler's Remnant folds into Strand's command if `strand_stance=="directive"`; otherwise Strand has to fight them first, and wins at a cost. | Strand runs the dam on a triage list. Theo's insulin is guaranteed. The list has 412 names; the city had 9,000 in December. Dell has a desk job and a warm bed. Last image: Dell erasing a name. |
| `end_iron_range` | **The Iron Range** (the Compact) | `final_choice=="compact"` AND `rep_compact>=3` AND `jory_alive` | Jory's people strip turbines and transformers and haul them north to the Range's deep mine shafts, which stay a constant +7 °C. Duluth is left dark. Survivors on the Range farm mushrooms and potatoes under lamps 700 m down. Dell watches the city go black from the Hwy 53 overlook. |
| `end_dark_water` | **Dark Water** (always available) | `final_choice=="shutdown"` | Dell opens the spillways and wrecks Unit 2 so nobody kills for it again. With `ruiz_defected` it's a clean demolition; without her, Dell does it by hand, and you lose HP and a companion. Everyone has to walk south over the ice toward rumored camps. Bleak, but who survives the walk depends on `kindness` and on who is still with you. |
| `end_two_coats` | **Two Coats** (fallback) | No other ending's requirements met, or `final_choice=="leave"` | Dell and Theo (if alive) slip out with what they can carry. There is no epilogue census. Wren's voice on a stolen radio is the last thing you hear, if `wren_alive`. |

Also, in `end_warm_room`, if `ruiz_defected` OR `strand_stance=="governor"`, the Ironwood Remnant stands down without a fight. Otherwise there is one last battle in the snow before the epilogue.

**Theo modifier**
- At three checkpoints (end of Ch3, Ch7, Ch9) the game runs: if `insulin_vial == 0` AND NOT `dam_running` AND NOT `ames_deal`, then `theo_insulin_lapses += 1`. A running dam means a working fridge.
- `theo_alive = false` if `theo_insulin_lapses >= 2`.
- If Theo joined a faction (`theo_side`) whose ending you didn't pick, he's alive but he stays with them. In the epilogue there's a letter.

**How choices feed endings (design intent)**
- `kindness` comes from small costly acts: giving fuel, covering for Wren, sharing filters, carrying Mr. Pruitt. Each one costs Theo something in the moment.
- Faction rep comes from big public choices (Ch4–6).
- Delayed consequences, examples:
  - Ch1 fuel to Pruitt → Ch8 Pruitt's grandson shows you the clean cistern.
  - Ch2 covering for Wren → Ch3 she warns you about the fire → Ch9 she brings the sled.
  - Ch2 reporting Ray → Ch3 his house is requisitioned and burned → Ch6 Cody wants you dead.
  - Ch4 power to the hospital → Ch8 Dr. Ames saves Theo's foot.
  - Ch6 sparing Sgt. Ruiz → Ch9 she shows you a gap in the Remnant's picket line.
  - Ch6 hiding the Pruitts from the confiscation sweep → Ch8 the cistern.

## 10. Writing style for dialogue (portrait screen)

- **≤ 90 characters per line; ≤ 3 lines per node.** One thought per node.
- Choices are ≤ 40 characters, written as Dell's words or actions in brackets: `[Give the gas can]`.
- Every NPC has a verbal tic or rhythm. See `npcs.json` → `voice`.
- Grim humor is fine. Speeches are not.
