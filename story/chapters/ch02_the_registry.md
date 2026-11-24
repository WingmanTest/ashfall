# Chapter 2: The Registry
**Act I** · Day 19 (Nov 2) · Blatnik Bridge → Duluth · Dialogue: `dialogue/ch02_*.json`

## Summary
The county and Guard have formed the **Northland Restoration Authority**. To get rations you register at the DECC. Insulin is only given out through the registry, by priority card, at Lakehead Memorial. The bridge has a checkpoint. The line is three hours long and getting angry. Lou's voice comes out of somebody's crank radio, promising transformer ships.

## Goals
1. Cross the Blatnik bridge checkpoint (Cpl. Haas).
2. Register at the DECC (Strand).
3. Get Theo's insulin: a priority card from Strand, OR a direct deal with Dr. Ames, OR buy from Wren.
4. Survive the ration-line crush.

## Locations
`loc_blatnik_bridge` → `loc_decc_ration` → `loc_lakehead_memorial`

## NPCs
strand, wren, ames, lou (radio voice), theo (stays home or comes along) · minor: cpl_haas

## Key beats
1. **Checkpoint.** Haas wants ID. If you have cigarettes, you skip the search. → `ch02_haas_checkpoint`
2. **Lou on the radio.** "This is KD0LOU, still here." Rumors: transformer ships from Korea, FEMA in Saint Paul. Some are invented. → `ch02_lou_radio`
3. **The line.** Wren is lifting ration cards. A guard spots her. Dell can cover. → `ch02_wren_line`
4. **The registry desk.** Strand offers a **priority card** for Theo, then asks whether anyone on Dell's block has "undeclared fuel or food over 30 days". If you look at the clipboard, the numbers don't add up. → `ch02_strand_registry`
5. **The crush.** A rumor goes down the line that there's no more flour. The line surges. Choose: pull a kid out of the crush (kindness+1, take damage) or get clear.
6. **Hospital.** Ames is triaging in a hallway. If Dell has a priority card she gets 2 vials. If not, Ames offers a deal: find the hospital diesel. → `ch02_ames_hospital`

## Choices & consequences
| Choice | Flags | Now | Later |
|---|---|---|---|
| Register | `ch02_registered`, rep_authority+1 | Ration card. Priority card ONLY if you name a hoarder or quietly confront the numbers | Ch6: unregistered houses get a full search (ironwood_hostility+1) |
| Report Ray's stockpile | `ch02_reported_ray`, rep_authority+1, priority card | +2 insulin | Ch3: Ray's house requisitioned, then burned. Ch6: `ray_knows_report` |
| Cover for Wren | `ch02_covered_wren`, kindness+1, Wren trust+3 | Guard suspicious, lose ration card for a day | Ch3 warning |
| Confront Strand's numbers privately | `ch02_strand_truth` | Strand trust+2 | Ch10: Strand admits the falsified count; the council ending is easier |
| Pull the kid from the crush | `ch02_crush_helped`, kindness+1 | −15 health | Ch8: the kid's mother (Harbor) gives you filters |

## Flags
- **Set:** `ch02_registered`, `ch02_reported_ray`, `ch02_covered_wren`, `ch02_strand_truth`, `ch02_crush_helped`, `ch02_haas_bribed`, `kindness`, `rep_authority`
- **Read:** `ch01_wren_let_go` (Wren recognizes you), `ch01_ray_traded` (Strand knows Ray sold fuel), `ch01_pharmacy_choice`

## Gameplay hooks
- **Player does:** queue (time-skip), dialogue, short escape sequence (the crush: a movement challenge, timed), hospital corridor exploration.
- **Enemies (people only):** `authority_guard` (non-hostile, hostile if you steal); crowd crush hazard; 2–3 `looter` in the hospital parking garage if you take Ames's diesel job.
- **Items:** `ration_card`, `priority_card`, `insulin_vial`, `cigarettes`, `hospital_diesel` (side task).
- **Weather/time:** first snow, −4 °C, day. TEMP starts to matter if you stand still too long in line (warmth drains slowly).
