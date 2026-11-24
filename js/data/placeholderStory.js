// Placeholder story used when story/dialogue and chapters are not yet present.
// Honors Loremaster's bible: Dell Kowalczyk, Theo, insulin, Lou, Hank, Thomson Dam, five endings.
// This file lives under js/data/ — never written into /story/.

export const PLACEHOLDER = {
  defaultFlags: {
    theo_alive: true,
    theo_side: "none",
    kindness: 0,
    dam_running: false,
    insulin_found: false,
    radio_delivered: false,
    chapter: "ch01",
  },
  endings: {
    end_warm_room: {
      title: "THE WARM ROOM",
      body: "The Harbor keeps the lights on in a school gym on the hill. Theo sleeps under two army blankets. You sit with your back to a radiator that actually works. Outside, the dam hums. It is not enough for a city. It is enough for a winter.",
    },
    end_ledger: {
      title: "THE LEDGER",
      body: "Strand's registry has a line for you and a line for Theo. Rations are counted. The grid comes back in strips. You sign the book. You tell yourself the book is how people stay alive. You do not always believe it.",
    },
    end_iron_range: {
      title: "IRON RANGE",
      body: "Jory's people take you north of the ore docks, into the Range. The compact is smaller than a city and meaner than a hope. Theo learns to keep a rifle clean. You keep the insulin cold in a creek. The wind does not care who won the dam.",
    },
    end_dark_water: {
      title: "DARK WATER",
      body: "The turbines stay dead. The river goes where it wants. In the East End the last of the fuel becomes smoke. You walk Theo toward a rumor on the other side of the lake. The ice is not as thick as it looks.",
    },
    end_two_coats: {
      title: "TWO COATS",
      body: "You hang Theo's coat on the chair by the stove that will not light. The second coat is yours. You sit in both of them until the shaking stops, and then a while after that. The radio still has Lou's last weather. It does not mention you.",
    },
  },
  notes: [
    { id: "note_home", title: "Kitchen list", body: "Insulin: three days if we stretch it. Cooler is failing. Theo asked if the lights come back. I said I didn't know. I should not have said that." },
    { id: "note_wren", title: "Pharmacy counter", body: "Inventory smeared in grease pencil. Insulin was in the back fridge — someone already cracked it. A kid's handwriting under the tally: DON'T CALL IT IN." },
    { id: "note_lou", title: "Lou's weather", body: "Ash aloft 400ft. Wind WNW 20-30. Dam still dark. If you have a crystal, I can talk past the Authority jammers. — L" },
    { id: "note_hank", title: "Black-start", body: "HANK: Battery on the bus in the yard. Fuel at the blockade if the boys didn't drink it. Do not open the lower gallery without a filter." },
    { id: "note_dam", title: "Thomson tag", body: "BLACK START CHECKLIST / FILTER / SEAL. Someone wrote under it: THE CITY IS A CHOICE." },
  ],
  hooks: {
    quests: [
      { id: "obj_insulin", title: "Find insulin", loc: "loc_belknap_pharmacy", hint: "Belknap Pharmacy, mid-street left." },
      { id: "obj_radio", title: "Get Lou on the air", loc: "loc_lou_shack", hint: "A crystal from a crate. Lou's shack, east of the yard." },
      { id: "obj_dam", title: "Reach Thomson Dam", loc: "loc_thomson_dam", hint: "Battery, fuel, and a filter. The river is the far end of the road." },
    ],
  },
  npcs: [], // filled from story/npcs.json when present
  dialogues: [
    // THEO — home
    {
      id: "theo_start", npc: "theo", priority: 10,
      when: { none_flags: ["insulin_found"] },
      nodes: {
        start: {
          speaker: "theo",
          text: "The cooler's making that sound again. I already checked the vial count.",
          choices: [
            { text: "I'll find more before night.", next: "brave" },
            { text: "Stay inside. Lock it.", next: "stay" },
          ],
        },
        brave: { speaker: "theo", text: "I packed the old meter. If you're late, I'm not going to panic. I'm going to count.", choices: [{ text: "[Leave]", end: true, set_flags: ["theo_talked"] }] },
        stay: { speaker: "theo", text: "Okay. I'll watch the street from the stair. Don't freeze.", choices: [{ text: "[Leave]", end: true, set_flags: ["theo_talked"], kindness: 1 }] },
      },
    },
    {
      id: "theo_insulin", npc: "theo", priority: 20,
      when: { all_flags: ["insulin_found"], none_flags: ["insulin_given"] },
      nodes: {
        start: {
          speaker: "theo",
          text: "You found it. The label's old. It might still work.",
          choices: [
            { text: "[Give him the vial]", next: "give", require_item: "insulin", remove_item: "insulin", set_flags: ["insulin_given"], complete_quest: "obj_insulin", kindness: 1, trust: { theo: 1 } },
            { text: "We hold one back. Just in case.", next: "hold" },
          ],
        },
        give: { speaker: "theo", text: "Okay. I'll put it in the bowl of snow. Thanks, Mom.", choices: [{ text: "[Leave]", end: true }] },
        hold: { speaker: "theo", text: "That's— fine. That's a plan. It's a plan.", choices: [{ text: "[Leave]", end: true, set_flags: ["insulin_held"] }] },
      },
    },
    {
      id: "theo_later", npc: "theo", priority: 5,
      when: {},
      nodes: {
        start: {
          speaker: "theo",
          text: "Radio's just snow. If you see Lou, tell him I still have his frequency written on the cabinet.",
          choices: [{ text: "I'll be back.", end: true }],
        },
      },
    },
    // MARGUERITE
    {
      id: "marg_start", npc: "marguerite", priority: 10,
      when: { none_flags: ["marg_fuel"] },
      nodes: {
        start: {
          speaker: "marguerite",
          text: "Pruitt's stove is out. I wouldn't ask if it wasn't the boy.",
          choices: [
            { text: "[Give her a fuel can]", next: "yes", require_item: "fuel", remove_item: "fuel", set_flags: ["marg_fuel"], kindness: 2, trust: { marguerite: 2 } },
            { text: "I can't spare it.", next: "no" },
            { text: "[Listen]", next: "listen" },
          ],
        },
        yes: { speaker: "marguerite", text: "You're a good one, Dell. The Harbor remembers who showed up.", choices: [{ text: "[Leave]", end: true }] },
        no: { speaker: "marguerite", text: "Then don't stand here getting warm off my porch light.", choices: [{ text: "[Leave]", end: true, set_flags: ["marg_refused"] }] },
        listen: { speaker: "marguerite", text: "Authority's taking names at the DECC. Harbor's doing soup at the docks. Pick a line and stand in it.", choices: [{ text: "[Leave]", end: true, set_flags: ["marg_talked"] }] },
      },
    },
    {
      id: "marg_later", npc: "marguerite", priority: 5,
      when: {},
      nodes: {
        start: { speaker: "marguerite", text: "Keep your collar up. Ash gets in the lungs and stays.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    // RAY
    {
      id: "ray_start", npc: "ray", priority: 10,
      when: { none_flags: ["ray_pipe"] },
      nodes: {
        start: {
          speaker: "ray",
          text: "Garage is open if you're not a thief. I got a pipe that'll do more than look like work.",
          choices: [
            { text: "[Take the pipe]", next: "take", add_item: "pipe", set_flags: ["ray_pipe"] },
            { text: "You coming out?", next: "come" },
          ],
        },
        take: { speaker: "ray", text: "Don't swing it at anyone who'd share a battery. That's all I ask.", choices: [{ text: "[Leave]", end: true }] },
        come: { speaker: "ray", text: "Not yet. When the Compact moves, maybe. Until then I fix what I can see.", choices: [{ text: "[Leave]", end: true, set_flags: ["ray_talked"] }] },
      },
    },
    {
      id: "ray_later", npc: "ray", priority: 5,
      when: {},
      nodes: {
        start: { speaker: "ray", text: "If the dam turns over, I'll hear it from here. That's the plan.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    // WREN at the pharmacy
    {
      id: "wren_pharm", npc: "wren", priority: 20,
      when: { none_flags: ["wren_dealt"] },
      nodes: {
        start: {
          speaker: "wren",
          text: "I was here first. There's one good crate left. You going to call Strand on me?",
          choices: [
            { text: "Keep it. I didn't see you.", next: "cover", set_flags: ["wren_covered", "wren_dealt"], kindness: 1, trust: { wren: 2 } },
            { text: "Split the insulin. Nobody calls.", next: "split", set_flags: ["wren_dealt", "insulin_found"], add_item: "insulin", start_quest: null, complete_quest: null, kindness: 1 },
            { text: "[Make her drop it]", next: "threat", set_flags: ["wren_dealt", "wren_robbed", "insulin_found"], add_item: "insulin", trust: { wren: -3 } },
          ],
        },
        cover: { speaker: "wren", text: "You're dumber than you look. There's a second fridge in the back. I left you one.", choices: [{ text: "[Take the vial]", end: true, add_item: "insulin", set_flags: ["insulin_found"] }] },
        split: { speaker: "wren", text: "Fine. Half is half. Don't follow me to the bridge.", choices: [{ text: "[Leave]", end: true }] },
        threat: { speaker: "wren", text: "Take it. I won't forget your face in this coat.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    {
      id: "wren_later", npc: "wren", priority: 5,
      when: { all_flags: ["wren_dealt"] },
      nodes: {
        start: { speaker: "wren", text: "Pharmacy's empty now. Keep walking.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    // LOU
    {
      id: "lou_need_crystal", npc: "lou", priority: 10,
      when: { none_flags: ["radio_delivered"] },
      nodes: {
        start: {
          speaker: "lou",
          text: "Rig's deaf without a crystal. You find one in the yard, I can punch past their jammer.",
          choices: [
            { text: "[Give the crystal]", next: "give", require_item: "radio_crystal", remove_item: "radio_crystal", set_flags: ["radio_delivered"], complete_quest: "obj_radio", trust: { lou: 2 } },
            { text: "I'll look.", end: true },
          ],
        },
        give: {
          speaker: "lou",
          text: "That's the tone. Hank has the black-start list. Dam's the only warm math left.",
          choices: [{ text: "[Leave]", end: true, start_quest: "obj_dam" }],
        },
      },
    },
    {
      id: "lou_later", npc: "lou", priority: 5,
      when: { all_flags: ["radio_delivered"] },
      nodes: {
        start: { speaker: "lou", text: "Ash aloft, wind west. If you die on the road, I won't get to say I told you.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    // HANK
    {
      id: "hank_start", npc: "hank", priority: 10,
      when: { none_flags: ["hank_briefed"] },
      nodes: {
        start: {
          speaker: "hank",
          text: "Thomson will turn over if you get me a battery and a can of fuel. Filter for the gallery or you cough blood.",
          choices: [
            { text: "Walk me through it.", next: "brief", set_flags: ["hank_briefed"], start_quest: "obj_dam", add_item: "note" },
            { text: "I have the battery.", next: "have", require_item: "start_battery" },
          ],
        },
        brief: { speaker: "hank", text: "Bus in the yard. Fuel at the blockade if the Bridge Boys didn't burn it. I'll meet you at the intake.", choices: [{ text: "[Leave]", end: true }] },
        have: { speaker: "hank", text: "Then quit talking and walk the river.", choices: [{ text: "[Leave]", end: true, set_flags: ["hank_briefed"] }] },
      },
    },
    {
      id: "hank_ready", npc: "hank", priority: 20,
      when: { all_flags: ["hank_briefed"], none_flags: ["dam_ready"] },
      nodes: {
        start: {
          speaker: "hank",
          text: "You packed for a dam, or you packed for a walk?",
          choices: [
            { text: "[Show battery and fuel]", next: "ok", require_item: "start_battery", set_flags: ["dam_ready"] },
            { text: "Not yet.", end: true },
          ],
        },
        ok: { speaker: "hank", text: "Good. I'll be at the house. Don't trust anyone who smiles at a turbine.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    {
      id: "hank_later", npc: "hank", priority: 5,
      when: {},
      nodes: {
        start: { speaker: "hank", text: "Cold doesn't care if you're tired.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    // Dam console / final choice — "strand" stands in if present, else a terminal npc id "dam_console"
    {
      id: "dam_choice", npc: "dam_console", priority: 50,
      when: { all_flags: ["at_dam"], none_flags: ["ending_locked"] },
      nodes: {
        start: {
          speaker: "hank",
          text: "She's live if we close the breaker. After that it's who gets the heat.",
          choices: [
            { text: "Give it to the Harbor.", next: "warm", set_flags: ["final_choice", "end_warm_room", "dam_running", "ending_locked"], set_ending: "end_warm_room" },
            { text: "Sign it over to Strand.", next: "ledger", set_flags: ["final_choice", "end_ledger", "dam_running", "ending_locked"], set_ending: "end_ledger" },
            { text: "Cut a feed north, with Jory.", next: "iron", set_flags: ["final_choice", "end_iron_range", "dam_running", "ending_locked"], set_ending: "end_iron_range" },
            { text: "[Sabotage the start]", next: "dark", set_flags: ["final_choice", "end_dark_water", "ending_locked"], set_ending: "end_dark_water" },
          ],
        },
        warm: { speaker: "hank", text: "Harbor it is. Soup first. Law later.", choices: [{ text: "[Continue]", end: true, set_ending: "end_warm_room" }] },
        ledger: { speaker: "hank", text: "You just made a city out of a list.", choices: [{ text: "[Continue]", end: true, set_ending: "end_ledger" }] },
        iron: { speaker: "hank", text: "Range'll take the voltage and not say thanks. That's the deal.", choices: [{ text: "[Continue]", end: true, set_ending: "end_iron_range" }] },
        dark: { speaker: "hank", text: "Then the river stays a river. Hope you can walk on it.", choices: [{ text: "[Continue]", end: true, set_ending: "end_dark_water" }] },
      },
    },
    // Strand cameo if player reaches ration-adjacent dock
    {
      id: "strand_dock", npc: "strand", priority: 10,
      when: { none_flags: ["strand_met"] },
      nodes: {
        start: {
          speaker: "strand",
          text: "Kowalczyk. Your name is already in the book. Bring the boy in and I can make the insulin official.",
          choices: [
            { text: "We'll manage.", next: "no", set_flags: ["strand_met"] },
            { text: "What does the book cost?", next: "cost", set_flags: ["strand_met"] },
          ],
        },
        no: { speaker: "strand", text: "Everyone says that until the vial is empty.", choices: [{ text: "[Leave]", end: true }] },
        cost: { speaker: "strand", text: "Work. A location. Not being a problem. That's the whole religion.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    {
      id: "bea_docks", npc: "bea", priority: 10,
      when: { none_flags: ["bea_met"] },
      nodes: {
        start: {
          speaker: "bea",
          text: "Soup's thin and it's still better than their ledger. You ever need a door, the Harbor has one.",
          choices: [
            { text: "I'll remember.", next: "ok", set_flags: ["bea_met"], kindness: 0, trust: { bea: 1 } },
            { text: "[Give a ration tin]", next: "give", require_item: "ration", remove_item: "ration", set_flags: ["bea_met", "bea_gift"], kindness: 2, trust: { bea: 2 } },
          ],
        },
        ok: { speaker: "bea", text: "Do more than remember. Show up.", choices: [{ text: "[Leave]", end: true }] },
        give: { speaker: "bea", text: "That goes in the pot. Your name goes on the warm side of the list.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
    {
      id: "jory_blockade", npc: "jory", priority: 10,
      when: { none_flags: ["jory_met"] },
      nodes: {
        start: {
          speaker: "jory",
          text: "Authority wants a city. Harbor wants a family. We want a road that still goes north.",
          choices: [
            { text: "I just need fuel.", next: "fuel", set_flags: ["jory_met"] },
            { text: "Theo isn't a faction.", next: "theo", set_flags: ["jory_met"], kindness: 1 },
          ],
        },
        fuel: { speaker: "jory", text: "Can's by the burned sedan if the dogs didn't knock it. Don't shoot my people.", choices: [{ text: "[Leave]", end: true }] },
        theo: { speaker: "jory", text: "Everyone's a faction when the heat dies. Take the can. Think later.", choices: [{ text: "[Leave]", end: true }] },
      },
    },
  ],
};
