import { evalCondition } from "./story.js?v=r14";

/** Companion tutorial and any objective marked side/tutorial stay off the main HUD. */
export function isSideObjective(o) {
  if (!o) return false;
  if (o.side === true || o.track === "side" || o.kind === "side") return true;
  if (o.quest && /^q_companion|tutorial/i.test(o.quest)) return true;
  const t = String(o.text || o.id || "");
  if (/companion tutorial|feed wraith/i.test(t)) return true;
  return false;
}

export function isObjectiveComplete(o, ctx) {
  if (!o) return true;
  if (o.completeWhen) return !!evalCondition(o.completeWhen, ctx);
  return false;
}

export function isObjectiveStarted(o, ctx) {
  if (!o) return false;
  if (o.startWhen && !evalCondition(o.startWhen, ctx)) return false;
  return true;
}

export function flagsOf(when) {
  const out = [];
  const walk = (w) => {
    if (!w) return;
    if (Array.isArray(w)) return w.forEach(walk);
    if (typeof w === "string") return out.push(w);
    if (typeof w === "object") {
      if (w.flag) out.push(w.flag);
      for (const k of ["all", "any", "and", "or", "allOf", "anyOf"]) if (w[k]) walk(w[k]);
    }
  };
  walk(when);
  return out;
}

function questDef(game, id) {
  const defs = game.story?.quests || game.story?.questDefs || {};
  if (Array.isArray(defs)) return defs.find((q) => q.id === id) || null;
  return (id && defs[id]) || null;
}

function flagLabel(flag) {
  return String(flag || "")
    .replace(/^(ch\d+_)/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function listLevelObjectives(game) {
  return ((game.levelRuntime?.L?.objectives) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function partitionObjectives(game) {
  const ctx = game._storyCtx ? game._storyCtx() : { flags: game.flags || {} };
  const all = listLevelObjectives(game);
  const main = [], side = [], doneMain = [], doneSide = [];
  for (const o of all) {
    if (!isObjectiveStarted(o, ctx)) continue;
    const done = isObjectiveComplete(o, ctx);
    const sideish = isSideObjective(o);
    if (done) (sideish ? doneSide : doneMain).push(o);
    else (sideish ? side : main).push(o);
  }
  return { main, side, doneMain, doneSide, ctx };
}

export function currentMainObjective(game) {
  return partitionObjectives(game).main[0] || null;
}

export function currentSideObjective(game) {
  return partitionObjectives(game).side[0] || null;
}

export function stepsFor(game, o, ctx) {
  if (!o) return [];
  const flags = flagsOf(o.completeWhen);
  const steps = [];
  if (flags.length) {
    for (const f of flags) {
      steps.push({ id: f, text: flagLabel(f), done: !!(ctx.flags && ctx.flags[f]) });
    }
  } else {
    steps.push({ id: o.id, text: o.text, done: isObjectiveComplete(o, ctx) });
  }
  return steps;
}

export function buildQuestLog(game) {
  const parts = partitionObjectives(game);
  const ctx = parts.ctx;
  const pack = (o, section, collapsed) => {
    const def = o.quest ? questDef(game, o.quest) : null;
    const steps = stepsFor(game, o, ctx);
    const done = isObjectiveComplete(o, ctx);
    return {
      id: o.id,
      quest: o.quest || null,
      title: def?.title || o.text,
      desc: def?.desc || "",
      section,
      current: !done && !collapsed,
      collapsed: !!collapsed || done,
      done,
      steps,
    };
  };
  const currentMain = parts.main[0] || null;
  const entries = [
    ...parts.main.map((o) => pack(o, "main", o !== currentMain)),
    ...parts.side.map((o) => pack(o, "side", false)),
    ...parts.doneMain.map((o) => pack(o, "main", true)),
    ...parts.doneSide.map((o) => pack(o, "side", true)),
  ];
  return { currentMain, currentSide: parts.side[0] || null, entries, ...parts };
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function renderQuestLogHtml(game) {
  const log = buildQuestLog(game);
  const block = (title, list, empty) => {
    if (!list.length) return `<div class="q-sec"><div class="q-h">${esc(title)}</div><p class="q-empty">${esc(empty)}</p></div>`;
    return `<div class="q-sec"><div class="q-h">${esc(title)}</div>${list.map((e) => {
      const steps = (e.steps || []).map((s) =>
        `<li class="${s.done ? "done" : ""}"><span class="q-box">${s.done ? "☑" : "☐"}</span>${esc(s.text)}</li>`
      ).join("");
      const body = e.collapsed && e.done
        ? ""
        : `${e.desc ? `<p class="q-desc">${esc(e.desc)}</p>` : ""}<ul class="q-steps">${steps}</ul>`;
      return `<button type="button" class="q-card ${e.done ? "is-done" : "is-live"} ${e.collapsed ? "is-collapsed" : ""}" data-qid="${esc(e.id)}">
        <div class="q-title"><span>${esc(e.title)}</span><span class="q-state">${e.done ? "DONE" : (e.current ? "NOW" : "")}</span></div>
        ${body}
      </button>`;
    }).join("")}</div>`;
  };
  const liveMain = log.entries.filter((e) => e.section === "main" && !e.done);
  const liveSide = log.entries.filter((e) => e.section === "side" && !e.done);
  const done = log.entries.filter((e) => e.done);
  return `<div class="quest-log">
    ${block("MAIN", liveMain, "No active main objective.")}
    ${block("SIDE", liveSide, "No side quests.")}
    ${block("COMPLETED", done, "Nothing finished yet.")}
  </div>`;
}

export function noteSideQuestUpdate(game, beforeText, afterText) {
  if (!game?.hud) return;
  if (beforeText === afterText) return;
  if (!afterText) {
    game.hud.say("Side quest complete.", 3.2);
    return;
  }
  const line = String(afterText).replace(/^OBJECTIVE\s+/i, "").trim();
  if (line) game.hud.say("SIDE  " + line, 3.6);
}
