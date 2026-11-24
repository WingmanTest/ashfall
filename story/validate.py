#!/usr/bin/env python3
"""Validate the ASHFALL story data. Run: python3 validate.py  (from anywhere).
Exit code 0 = no errors (warnings may still print)."""
import json, glob, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
E, W = [], []
def load(p):
    try: return json.load(open(os.path.join(ROOT, p)))
    except Exception as ex: E.append(f"{p}: JSON parse error: {ex}"); return None
npcs = load("npcs.json"); flagsdoc = load("flags.json"); items = load("items.json")
quests = load("quests.json"); hooks = load("gameplay_hooks.json")
if None in (npcs, flagsdoc, items, quests, hooks): print("\n".join(E)); sys.exit(1)
FLAGS = flagsdoc["flags"]; ITEMS = set(items["items"]); QUESTS = set(quests["quests"])
NPC_IDS = {n["id"] for n in npcs["npcs"]}
SPEAKERS = NPC_IDS | {m["id"] for m in npcs["minor_characters"]} | set(npcs.get("generic_speakers", {}))
LOCS = set(hooks["locations"]); ENEMIES = set(hooks["enemy_types"])
STATS = {"health","warmth","satiety","hydration","stamina","radiation"}  # = systems/survival.json stats
OPS = {"eq","ne","gt","gte","lt","lte"}
EVENTS = {"encounter","npc_death","set_theo_side_from_location","search_inventory","time_skip","minigame","hud_unlock","play_epilogue"}

def enum_vals(f):
    t = FLAGS[f]["type"]
    return t.split(":",1)[1].split("|") if t.startswith("enum:") else None
def chk_val(f, v, where):
    ev = enum_vals(f)
    if ev is not None and v is not None and v not in ev: E.append(f"{where}: flag {f} value {v!r} not in enum {ev}")
    if FLAGS[f]["type"] == "bool" and not isinstance(v, bool): E.append(f"{where}: bool flag {f} given {v!r}")
    if FLAGS[f]["type"] == "int" and not isinstance(v, int): E.append(f"{where}: int flag {f} given {v!r}")
def cond(c, where):
    if isinstance(c, list):
        for x in c: cond(x, where)
        return
    if "any" in c: cond(c["any"], where); return
    if "not" in c: cond(c["not"], where); return
    if "count_true" in c:
        for f in c["count_true"]:
            if f not in FLAGS: E.append(f"{where}: count_true unknown flag {f}")
        return
    ops = [k for k in c if k in OPS]
    if len(ops) != 1: E.append(f"{where}: condition needs exactly one op: {c}")
    if "flag" in c:
        f = c["flag"]
        if f not in FLAGS: E.append(f"{where}: unknown flag {f}")
        elif ops and ops[0] in ("eq","ne"): chk_val(f, c[ops[0]], where)
    elif "trust" in c:
        if c["trust"] not in NPC_IDS: E.append(f"{where}: trust on unknown npc {c['trust']}")
    elif "item" in c:
        if c["item"] not in ITEMS: E.append(f"{where}: unknown item {c['item']}")
    elif "stat" in c:
        if c["stat"] not in STATS: E.append(f"{where}: unknown stat {c['stat']}")
    else: E.append(f"{where}: unknown condition {c}")
def effects(es, where):
    for e in es:
        if "set" in e:
            if e["set"] not in FLAGS: E.append(f"{where}: set unknown flag {e['set']}")
            else: chk_val(e["set"], e["value"], where)
        elif "add" in e:
            if e["add"] not in FLAGS: E.append(f"{where}: add unknown flag {e['add']}")
            elif FLAGS[e["add"]]["type"] != "int": E.append(f"{where}: add on non-int flag {e['add']}")
            if "value_from" in e and e["value_from"] not in FLAGS: E.append(f"{where}: value_from unknown {e['value_from']}")
        elif "trust" in e:
            if e["trust"] not in NPC_IDS: E.append(f"{where}: trust unknown npc {e['trust']}")
        elif "give" in e or "take" in e:
            i = e.get("give", e.get("take"))
            if i not in ITEMS: E.append(f"{where}: unknown item {i}")
        elif "quest" in e:
            if e["quest"] not in QUESTS: E.append(f"{where}: unknown quest {e['quest']}")
        elif "stat" in e:
            if e["stat"] not in STATS: E.append(f"{where}: unknown stat {e['stat']}")
        elif "event" in e:
            if e["event"] not in EVENTS: E.append(f"{where}: unknown event {e['event']}")
            if e["event"] == "npc_death" and e.get("npc") not in SPEAKERS: E.append(f"{where}: npc_death unknown npc")
        elif "if" in e:
            cond(e["if"], where); effects(e["then"], where); effects(e.get("else", []), where)
        else: E.append(f"{where}: unknown effect {e}")

scene_ids = set()
for path in sorted(glob.glob(os.path.join(ROOT, "dialogue", "*.json"))):
    rel = os.path.relpath(path, ROOT)
    d = load(rel)
    if d is None: continue
    sid = d["id"]; scene_ids.add(sid)
    if os.path.basename(path) != sid + ".json": E.append(f"{rel}: id {sid} != filename")
    if d.get("location") not in LOCS: E.append(f"{rel}: unknown location {d.get('location')}")
    ids = [n["id"] for n in d["nodes"]]
    if len(ids) != len(set(ids)): E.append(f"{rel}: duplicate node ids")
    idset = set(ids)
    if d["start"] not in idset: E.append(f"{rel}: start {d['start']} missing")
    cond(d.get("trigger_conditions", []), rel); effects(d.get("on_end", []), rel)
    edges = {}
    for n in d["nodes"]:
        w = f"{rel}#{n['id']}"
        if n["speaker"] not in SPEAKERS: E.append(f"{w}: unknown speaker {n['speaker']}")
        if len(n["text"]) > 140: W.append(f"{w}: text {len(n['text'])} chars (>140)")
        modes = [k for k in ("next","choices","branches","end") if k in n]
        if len(modes) != 1: E.append(f"{w}: node must have exactly one of next/choices/branches/end, has {modes}")
        effects(n.get("effects", []), w)
        outs = []
        if "next" in n: outs.append(n["next"])
        for b in n.get("branches", []):
            cond(b.get("conditions", []), w); outs.append(b["next"])
        if "branches" in n and n["branches"][-1].get("conditions"): W.append(f"{w}: last branch has conditions (no fallback)")
        for c in n.get("choices", []):
            if len(c["text"]) > 44: W.append(f"{w}: choice '{c['text']}' {len(c['text'])} chars (>44)")
            cond(c.get("conditions", []), w); effects(c.get("effects", []), w); outs.append(c["next"])
        if "choices" in n and all(c.get("conditions") for c in n["choices"]): W.append(f"{w}: every choice is conditional (possible soft-lock)")
        for o in outs:
            if o not in idset: E.append(f"{w}: next -> missing node {o}")
        edges[n["id"]] = outs
    seen, stack = set(), [d["start"]]
    while stack:
        x = stack.pop()
        if x in seen or x not in edges: continue
        seen.add(x); stack.extend(edges[x])
    for u in idset - seen: W.append(f"{rel}#{u}: unreachable node")

listed = set()
for ch in hooks["chapters"]:
    w = f"gameplay_hooks/{ch['id']}"
    for s in ch["scenes"]:
        listed.add(s)
        if s not in scene_ids: E.append(f"{w}: scene {s} has no dialogue file")
    for l in ch["locations"]:
        if l not in LOCS: E.append(f"{w}: unknown location {l}")
    for en in ch["enemies"]:
        if en["type"] not in ENEMIES: E.append(f"{w}: unknown enemy {en['type']}")
    for i in ch["items"] + list(ch.get("start_inventory", {})):
        if i not in ITEMS: E.append(f"{w}: unknown item {i}")
    effects(ch["chapter_start_effects"], w); effects(ch["chapter_end_effects"], w)
    for r in ch.get("crafting", []):
        effects(r["effects"], w)
        for i in [r["result"], *r["inputs"]]:
            if i not in ITEMS: E.append(f"{w}: craft unknown item {i}")
    for s, cs in ch.get("scene_conditions", {}).items():
        if s not in ch["scenes"]: E.append(f"{w}: scene_conditions for unlisted scene {s}")
        cond(cs, w)
for s in scene_ids - listed: W.append(f"dialogue/{s}: not listed in any chapter's scenes")
for e in flagsdoc["endings"]: cond(e["conditions"], f"flags.json/endings/{e['id']}")
for n in npcs["npcs"]:
    for f in n.get("fates", []): cond(f["conditions"], f"npcs.json/{n['id']}/{f['id']}")
chs = {c["id"] for c in hooks["chapters"]}
for n in npcs["npcs"]:
    for c in n["chapters"]:
        if c not in chs: E.append(f"npcs.json/{n['id']}: unknown chapter {c}")
for md in glob.glob(os.path.join(ROOT, "chapters", "*.md")):
    if os.path.basename(md)[:4] not in chs: E.append(f"{md}: chapter file without hooks entry")

for w in W: print("WARN ", w)
for e in E: print("ERROR", e)
print(f"\n{len(scene_ids)} dialogue scenes, {len(FLAGS)} flags, {len(NPC_IDS)} NPCs, {len(ITEMS)} items. {len(E)} errors, {len(W)} warnings.")
sys.exit(1 if E else 0)
