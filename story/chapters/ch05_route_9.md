# Chapter 5: Route 9
**Act II** · March · Port → Hwy 53 → Proctor yard · Dialogue: `dialogue/ch05_*.json`

## Summary
Washington issues the **Reconstruction Directive**: Midwest grain is requisitioned for starving eastern cities. Minnesota's governor refuses. **Task Force Ironwood**, a federal Army battalion-minus from Fort McCoy, rolls into Duluth to enforce it. Strand's Guard gets two orders from two chains of command. Because the dam is now known, Ironwood presses Dell into service: re-energize the Proctor yard signals so the grain trains can roll on ROUTE 9. The Range Compact has blockaded the Highway 53 overpass.

## Goals
1. Ride the convoy with Ironwood (Sgt. Ruiz is the engineer on the MRAP).
2. Restore the signal cabinet at the overpass under fire.
3. Decide the convoy's fate.
4. Find the wounded Compact fighter under the overpass: Cody.

## Locations
`loc_ore_docks` → `loc_hwy53_blockade` (ROUTE 9 overpass) → `loc_proctor_yard`

## NPCs
strand, ruiz (first look), jory, cody, ray (if `ray_alive`, before departure), lou (radio), bea (optional)

## Key beats
1. **The ask.** Strand, very quietly: "They didn't ask me either." Kessler's voice on the loudspeaker: tonnages, eastern death tolls. He's not lying.
2. **Convoy at night.** An MRAP searchlight on snow, drone buzz overhead. Ruiz: "You touch the cabinet, I cover you. That's the whole plan."
3. **Blockade.** Compact militia behind logging trucks. Jory comes out under a white rag to talk to Dell, not to the soldiers. → `ch05_jory_blockade`
4. **The choice at the cabinet.** *Escort*: energize the signals and the trains roll east. *Sabotage*: short the cabinet and the trains stop. *Divert*: switch the junction so half the cars go to the Harbor siding.
5. **Under the overpass.** Cody, gut-shot, 27, asks for his dad. Treat him (costs your med kit), leave him, or hand him to Ironwood as a prisoner. → `ch05_cody`

## Choices & consequences
| Choice | Flags | Later |
|---|---|---|
| Escort | `convoy_choice=escort`, rep_authority+2, rep_compact−2 | Ch6: Ironwood trusts you and the sweep skips your house; the Compact targets the dam in Ch9 |
| Sabotage | `convoy_choice=sabotage`, rep_compact+3, `ironwood_hostility`+3 | Ch6: you're on Ironwood's list; Strand is at risk if you also raise the bridge |
| Divert half | `convoy_choice=divert`, rep_harbor+2, `ironwood_hostility`+1 | Ch6: Bea owes you; Ironwood suspects |
| Save Cody | `cody_spared`, kindness+1 | Ray trust+4; Ch9 the ice choice |
| Leave / hand over Cody | `cody_alive=false` (leave) or `cody_prisoner` | Ray's fate in Ch6 |

## Flags
- **Set:** `ironwood_arrived`, `convoy_choice`, `cody_spared`, `cody_alive`, `cody_prisoner`, `jory_met`, `jory_secret_known`, `ruiz_met`, `ironwood_hostility`
- **Read:** `power_priority`, `rep_*`, `ray_alive`, `ch03_helped_ray`

## Gameplay hooks
- **Player does:** convoy ride (on-rails look and shoot, with the option to hold fire), a **repair-under-fire** at the signal cabinet, a talk scene, a medical mini-interaction.
- **Enemies:** `compact_militia` (6–8; deer rifles, a homemade armored plow truck). If sabotaging, the enemies flip to `ironwood_patrol` (4) with an `ironwood_drone` spotting (set piece: break line of sight under the overpass). `ironwood_mrap` is the escort set piece (cover for you, or a threat).
- **Items:** `med_kit`, `rifle_ammo`, `signal_fuse`, `flare`, `grain_sack`.
- **Weather/time:** freezing rain, −8 °C, night. The ice makes the overpass slippery.
- **Note:** This is the first chapter where US soldiers are in play. They are allies or enemies depending on `convoy_choice`.
