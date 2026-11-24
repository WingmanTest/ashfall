/** Per-NPC dialogue memory: visited nodes, consumed choices, and revisit lines. */
export function emptyDialogueMem() {
  return { npcs: {} };
}

export function npcMem(mem, npcId) {
  if (!mem) mem = emptyDialogueMem();
  if (!mem.npcs) mem.npcs = {};
  const key = String(npcId || "unknown");
  if (!mem.npcs[key]) {
    mem.npcs[key] = { seen: {}, nodes: {}, choices: {}, lastDlg: null, lastNode: null, lastLine: "", completed: {} };
  }
  return mem.npcs[key];
}

export function choiceKey(c, i = 0) {
  if (!c) return String(i);
  if (c.id) return String(c.id);
  if (c.flag) return String(c.flag);
  const s = String(c.text || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return (s || "c" + i).slice(0, 48);
}

export function choiceFlagName(dlgId, nodeId, key) {
  const d = String(dlgId || "dlg").replace(/[^a-z0-9_]+/gi, "_");
  const n = String(nodeId || "n").replace(/[^a-z0-9_]+/gi, "_");
  return `dlg_${d}_${n}_${key}`.slice(0, 80);
}

export function markNode(mem, npcId, dlgId, nodeId, text) {
  const rec = npcMem(mem, npcId);
  rec.lastDlg = dlgId;
  rec.lastNode = nodeId;
  if (text) rec.lastLine = String(text).slice(0, 180);
  rec.seen[dlgId] = true;
  const list = rec.nodes[dlgId] || (rec.nodes[dlgId] = []);
  if (nodeId && !list.includes(nodeId)) list.push(nodeId);
  return rec;
}

export function markChoice(mem, npcId, dlgId, nodeId, c, i) {
  const rec = npcMem(mem, npcId);
  const key = choiceKey(c, i);
  const slot = `${dlgId}:${nodeId}`;
  const list = rec.choices[slot] || (rec.choices[slot] = []);
  if (!list.includes(key)) list.push(key);
  rec.lastChoice = key;
  return key;
}

export function hasChoice(mem, npcId, dlgId, nodeId, c, i) {
  const rec = mem && mem.npcs && mem.npcs[npcId];
  if (!rec) return false;
  const list = rec.choices[`${dlgId}:${nodeId}`] || [];
  return list.includes(choiceKey(c, i));
}

export function markComplete(mem, npcId, dlgId) {
  const rec = npcMem(mem, npcId);
  rec.completed[dlgId] = true;
  rec.seen[dlgId] = true;
  return rec;
}

export function isDlgComplete(mem, npcId, dlgId) {
  const rec = mem && mem.npcs && mem.npcs[npcId];
  return !!(rec && rec.completed && rec.completed[dlgId]);
}

export function visitedNodes(mem, npcId, dlgId) {
  const rec = mem && mem.npcs && mem.npcs[npcId];
  return (rec && rec.nodes && rec.nodes[dlgId]) || [];
}

/** Filter already-picked choices unless they are marked repeatable. */
export function filterChoices(choices, mem, npcId, dlgId, nodeId) {
  return (choices || []).filter((c, i) => {
    if (c && (c.repeatable || c.repeat || c.info)) return true;
    return !hasChoice(mem, npcId, dlgId, nodeId, c, i);
  });
}

const FALLBACK_REVISIT = {
  carly: "She's grabbing four hours. \"Wake me if the world ends again.\"",
  lolo: "Lolo is already back at her list. She nods you on.",
  gil: "Gil wipes his hands on a rag. \"You know where I am.\"",
  kit: "Kit doesn't look up. \"Still here. Still taking.\"",
  wraith: "She watches the block, then your hands. Ready when you are.",
  wes: "Wes shrugs like the question already got answered.",
  ross: "Ross adjusts his hat. That's as much as you're getting.",
  avila: "Avila's already looking at the next list.",
  walt: "Walt keeps his eyes on the gauges.",
  ames: "Ames is still working. He doesn't waste a second visit.",
  ruiz: "Ruiz gives you a short nod. Move.",
  augie: "Augie turns the radio a hair and leaves you to it.",
  roz: "Roz is already back at the line.",
  ander: "Ander waits you out. Nothing new.",
  reyne: "Reyne has said what she's going to say.",
};

export function revisitLine(game, npcId, objText) {
  const rec = game.dialogueMem && game.dialogueMem.npcs && game.dialogueMem.npcs[npcId];
  const name = game.story?.npcName?.(npcId) || "They";
  const obj = String(objText || "").replace(/^OBJECTIVE\s+/i, "").trim();
  if (npcId === "wraith" && !(game.flags?.ch01_wraith_fed || game.flags?.wraith_fed)) {
    return "She drops the bowl at your feet again and sits.";
  }
  const canned = FALLBACK_REVISIT[npcId];
  if (canned && obj) return canned + " " + obj + ".";
  if (canned) return canned;
  if (rec && rec.lastLine && rec.lastLine.length < 90) {
    return (name !== "They" ? name + " leaves it at that." : "Nothing new.") + (obj ? " " + obj + "." : "");
  }
  if (obj) return `${name} looks at you. ${obj}.`;
  return `${name} has nothing new to say.`;
}

/** Synthetic one-line dialogue so a finished tree is never replayed from the top. */
export function makeRevisitDialogue(game, npcId, objText) {
  const text = revisitLine(game, npcId, objText);
  const name = game.story?.npcName?.(npcId) || npcId;
  return {
    id: `revisit_${npcId}`,
    npc: npcId,
    revisit: true,
    start: "start",
    nodes: {
      start: {
        speaker: npcId === "wraith" ? "narrator" : npcId,
        text,
        end: true,
        choices: [{ text: "[Leave]", end: true, repeatable: true }],
      },
    },
    _name: name,
  };
}

/** If a tree was left mid-choice, resume there with leftover options. */
export function resumeNodeId(dlg, mem, npcId) {
  if (!dlg?.nodes) return null;
  const rec = mem && mem.npcs && mem.npcs[npcId];
  if (!rec || rec.completed?.[dlg.id]) return null;
  const visited = rec.nodes?.[dlg.id] || [];
  for (let i = visited.length - 1; i >= 0; i--) {
    const id = visited[i];
    const node = dlg.nodes[id];
    if (!node || !node.choices || !node.choices.length) continue;
    const left = filterChoices(node.choices, mem, npcId, dlg.id, id);
    if (left.length) return id;
  }
  if (rec.lastNode && dlg.nodes[rec.lastNode]) {
    const n = dlg.nodes[rec.lastNode];
    if (n.next && dlg.nodes[n.next] && !visited.includes(n.next)) return n.next;
    if (!n.end) return rec.lastNode;
  }
  return null;
}

/** Fold already-seen dialogues from a prior save into memory so intros are not replayed. */
export function hydrateDialogueMem(mem, ctx, story) {
  const out = mem && mem.npcs ? mem : emptyDialogueMem();
  const flags = ctx?.flags || {};
  const seen = ctx?.seen || {};
  const list = story?.dialogues || [];
  const byId = Object.fromEntries(list.map((d) => [d.id, d]));
  const completeOf = (dlg) => {
    if (!dlg) return false;
    const npc = dlg.npc;
    if (npc && flags["talked_" + npc]) return true;
    if (dlg.id === "ch01_carly_home" && flags.ch01_carly_talked) return true;
    if (dlg.id === "ch01_lolo_porch" && flags.ch01_lolo_talked) return true;
    if (dlg.id === "ch01_wraith_morning" && (flags.ch01_wraith_fed || flags.wraith_fed)) return true;
    return false;
  };
  for (const id of Object.keys(seen)) {
    const dlg = byId[id];
    const npc = dlg?.npc;
    if (!npc) continue;
    const rec = npcMem(out, npc);
    rec.seen[id] = true;
    if (completeOf(dlg)) rec.completed[id] = true;
  }
  if (flags.ch01_carly_talked) markComplete(out, "carly", "ch01_carly_home");
  if (flags.ch01_lolo_talked) markComplete(out, "lolo", "ch01_lolo_porch");
  if (flags.ch01_wraith_fed || flags.wraith_fed) markComplete(out, "wraith", "ch01_wraith_morning");
  return out;
}

export function authoredRevisit(dlg) {
  if (!dlg?.nodes) return null;
  for (const id of ["revisit", "followup", "again", "idle", "repeat"]) {
    if (dlg.nodes[id]) return { ...dlg, start: id, revisit: true };
  }
  return null;
}

export function memHasFeed(mem, flags = {}) {
  if (flags.ch01_wraith_fed || flags.wraith_fed) return true;
  const rec = mem && mem.npcs && mem.npcs.wraith;
  if (!rec) return false;
  const nodes = rec.nodes?.ch01_wraith_morning || [];
  if (nodes.some((id) => looksLikeFeedNode(id))) return true;
  for (const [slot, list] of Object.entries(rec.choices || {})) {
    if (!/wraith/i.test(String(slot))) continue;
    if ((list || []).some((k) => looksLikeFeedChoice({ text: String(k).replace(/_/g, " ") }))) return true;
  }
  return false;
}

export function looksLikeFeedChoice(c) {
  const t = String(c && c.text || "").toLowerCase();
  if (/wait|later|not now|leave her/.test(t)) return false;
  return /feed|rations|split with her|full can|kibble|bowl/.test(t);
}

export function looksLikeFeedNode(id, node) {
  const k = String(id || "").toLowerCase();
  if (k === "full" || k === "half" || k === "fed" || k === "feed") return true;
  const t = String(node && node.text || "").toLowerCase();
  return /licks the can|split the last|eats like it's a mission/.test(t);
}
