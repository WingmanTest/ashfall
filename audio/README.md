# ASHFALL: Lakehead: audio

Owner: **Echoes** (audio). Everything here is original synthesis (see `CREDITS.md`), so there is **zero license risk**.
`audio/` only: nothing outside this folder is edited.

```
audio/
  audio.js        engine (ES module, also sets window.GameAudio) + attachAshfallAudio() for js/audioHook.js
  manifest.js     AUTO-GENERATED list of sounds (name -> src, bus, dur, pool, loop, loopLen)
  sfx/ amb/ music/  every sound as .ogg (Vorbis) AND .m4a (AAC)
  test.html       portrait test bench: a button for every sound, bus sliders, weather, music, 3D pad, VO audition
  vo/             voice-over: <character>/<scene>__<node>.ogg|.m4a, barks/<faction>/, manifest.json|js, CAST.md (see §11)
  CREDITS.md      per-file source/author/license
  tools/          synth_lib.py, gen_sfx.py, gen_loops.py, build_all.py, verify.sh
  tools/vo/       VO pipeline: setup.sh, build_script.py, render.py, dsp.py, qa.py, make_cast_md.py, cast.json, barks.json
```

Size: 44 sounds, 88 files, **about 3.0 MB on disk for both formats**. A client downloads only one format (Chrome/Firefox/Android get ogg, iOS/Safari get m4a), so that's **about 1.5 MB per player**. Music is about 1 MB of that, and setting `preload: "essential"` defers it.

---

## 0. It already plugs into `js/audioHook.js`, after one loader fix

`audioHook.discoverAudio()` probes `./audio/audio.js`, and `audio.js` exports `attachAshfallAudio(ctx)`, which the hook tries first.
The adapter it returns implements every method `wrapAudio()` calls: `unlock, setWind, foot, maybeFoot, gunshot, melee, hit,
growl, pickup, craft, ui, rummage, hurt, radio, fireloop`. Each one **returns `true`**, so the hook's `?? fallback.x()` never double-plays the old synth.

**Blocking bug (Echo, `js/load.js` → `tryImport`)**: `import(url)` resolves relative to **`js/load.js`**, not the page, so
`"./audio/audio.js"` becomes `/js/audio/audio.js` (404). As a result the game currently reports `audio: builtin` even though `fetch()` finds the file.
The same thing affects every `tryImport` caller, including the render hook. One-line fix:

```js
// js/load.js, tryImport()
return await import(new URL(url, document.baseURI).href + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
```

With that patch (verified in headless Chrome by serving a patched copy), boot reports
`__INTEGRATION.audio = { source: "echoes", discovered: "./audio/audio.js" }`. You then get the following with no other edits:
- the 3D listener follows the camera passed in `attachAudio({ camera })`
- music follows `__ASHFALL.flags.chapter` (ch01–02 blackout, ch03–04 collapse, ch05–07 civil_war, ch08–10 nuclear_winter)
- sfx and ambience are silenced in `pause`/`title`/`dead` modes, and music is ducked in `dialogue`/`searching`
- a geiger counter runs from `player.stats.rad`
- `setWind(1)` (blizzard) crossfades to the blizzard loop
- `gunshot()` picks pistol, 12ga or molotov from `player.equipped`
- the `ui()` call that `tryReload()` makes becomes the real pistol or shotgun reload sound

Note: `tryImport` adds `?t=`, which makes a separate module instance. Use the engine through **`game.audio.impl.engine`**
(or `window.GameAudio`, which the last-loaded instance sets). Don't also `import` audio.js statically.

---

## 1. Init and unlock

```js
import { GameAudio as A } from "../audio/audio.js";   // or audio.impl.engine via the hook
A.init({ preload: "all" });   // "all" | "essential" (no music/war/drone) | ["gun_pistol", "footstep_snow", ...] | "none"
// init() already unlocks on the first pointerdown/touchend/keydown (iOS-safe silent-buffer trick).
// Calling A.unlock() from your own button handlers is harmless:
$("btn-new").onclick = () => { A.unlock(); newGame(); };
```
If WebAudio is missing or throws, `A.ok === false` and **every call is a no-op**. A file that fails to load or decode falls back to
a procedural WebAudio version of the same sound (the `SYNTH` table in audio.js), so the game is never silent.

## 2. SFX

```js
A.play("gun_pistol");                                   // exact file
A.play("footstep_snow", { volume: 0.7, randomPitch: 0.07, pan: -0.1 }); // pool: random variant, never the same one twice in a row
A.play("reload_shotgun", { delay: 0.05, rate: 1.1 });
const h = A.play("radio_static"); h?.stop(0.3);         // handle: stop(fade), setVolume(v, fade)
```
Options: `volume, rate, randomPitch (±fraction), pan (-1..1), delay, bus, loop, position:{x,y,z}, minGap (spam guard, default 0.03s)`.
A sound that hasn't decoded yet is skipped silently, and it starts loading.

## 3. Footsteps tied to movement

```js
// game.js update(), right after player.move():
const { moving, sprint } = this.player.move(dt, this.input, this.world, sprintOk);
A.footsteps(dt, { moving, sprint, speed: sprint ? CFG.sprint : CFG.walk, surface: "snow" }); // or "hard" on concrete/ice
```
Steps are triggered by **distance travelled** (1.4 m stride walking, 1.65 m sprinting), so cadence follows speed. Sprint steps are louder and alternate a slight left/right pan.

## 4. 3D positional enemies (PannerNode HRTF → equalpower fallback)

```js
// once per frame, after the camera moves:
A.setListenerFromObject(this.player.camera);      // reads matrixWorld (three.js YXZ camera)
// or: A.setListener(x, y, z, yaw, pitch);

// enemies.js spawn(): give each enemy an emitter
e.sfx = A.emitter({ x, y: 1.2, z });
// enemies.js update(): keep it on the body + voice state changes
e.sfx.update(e.x, 1.2, e.z);
if (see && e.state === "wander") e.sfx.play({ husk: "enemy_growl", raider: "raider_shout", dog: "dog_bark" }[e.kind], { randomPitch: 0.06 });
// attack:  A.play("player_hurt")   (non-positional, it's you)
// hitScan() hit: e.sfx.play("melee_hit", { volume: 0.6 })
// kill(e):  e.sfx.play("enemy_growl", { rate: 0.7, volume: 0.7 }); setTimeout(() => e.sfx.dispose(), 2000);

A.play3D("gun_rifle", x, 1.5, z);                  // one-shot at a point (e.g. an Ironwood rifle shot)
A.setHRTF(false);                                  // low-end phones: equalpower panning (persisted)
A.distanceGain(dist) / A.panFor(x, z);             // plain helpers if you don't want a PannerNode
```
Panner: `inverse` model, refDistance 2 m, maxDistance 60 m, rolloff 1.1, plus a distance lowpass (snow damping) that closes further
during a blizzard. Emitter sounds keep tracking the emitter while they ring out.

Fires as positional loops:
```js
for (const f of world.fires) { f.sfx = A.emitter({ x: f.x, y: 0.5, z: f.z }, { refDistance: 1.5, maxDistance: 18 }); f.sfx.loop("amb_fire"); }
// world.addCampfire() -> same thing for the new fire
```

## 5. Ambience and weather

```js
A.setWind(0.4);            // 0..1 calm -> strong
A.setBlizzard(1, 4);       // 0..1, equal-power crossfade wind -> blizzard over 4 s (also muffles distant 3D sounds)
A.setWeather({ wind: 0.5, blizzard: 0, fire: 0, war: 0.4 }); // any subset
A.setLayer("war", 0.3);    // distant artillery bed (Act II / civil_war chapters)
A.stopAmbience(2);
// game.js already does: this.audio.setWind(this.blizzard ? 1 : 0.35 + ...) -> handled by the adapter.
```
Loops are sample-exact and seamless. The AAC priming gap is skipped automatically using `loopLen` from the manifest.

## 6. Music per act (4 acts)

```js
A.playMusic("blackout");        // "blackout" | "collapse" | "civil_war" | "nuclear_winter"  (4 s crossfade)
A.setChapter("ch05");           // uses A.chapterToAct (editable map) -> civil_war
A.duckMusic(true);  A.duckMusic(false);   // dialogue / radio
A.stopMusic(3);
```
| act | chapters | loop | feel |
|---|---|---|---|
| blackout | ch01–02 | 43.6 s | D minor, sparse e-piano over a warm pad, faint dying mains hum. "Still feels like a snow day." |
| collapse | ch03–04 | 40 s | A-minor pulse ostinato with a tritone sting, clock tick, distant drum enters halfway |
| civil_war | ch05–07 | 40 s | low E drone, distant snare cadences, heavy drum, a tired horn call. Not triumphant. |
| nuclear_winter | ch08–10 | 48 s | glassy near-silence, cold C drone, breath swells, one fragile major motif (earned hope) |

## 7. Volume settings (persisted in localStorage `ashfall.audio.v1`)

```js
A.buses;                         // ["master","sfx","ambience","music","ui"]
A.setVolume("music", 0.4); A.getVolume("music");
A.setMuted("master", true); A.toggleMute("sfx"); A.isMuted("ui");
A.setPaused(true);               // pause menu: silences sfx and ambience, keeps music and ui
```
The AudioContext suspends on `visibilitychange`/`pagehide` and resumes when visible.

## 8. Sound list

Pools (call by pool name for a random variant) are in **bold**.

| name | bus | notes |
|---|---|---|
| **footstep_snow** (_1.._4) | sfx | heel thump + granular crystal crunch |
| **footstep_hard** (_1.._2) | sfx | concrete / ice |
| gun_pistol | sfx | Service 9mm |
| gun_shotgun | sfx | Makeshift 12ga (`blaster`) |
| gun_rifle | sfx | deer rifles, Ironwood troops (enemy / future weapon) |
| dry_fire | sfx | empty mag |
| reload_pistol, reload_shotgun (**reload** pool) | sfx | mag out/in + slide; 2 shells + pump |
| **melee_swing** (_1.._2) | sfx | pipe / knife whoosh |
| **melee_hit** (_1 metal ring, _2 dull thud) | sfx | |
| craft_hammer | sfx | 3 strikes on scrap |
| craft_cloth | sfx | cloth tear / rummage |
| ui_click, ui_confirm, ui_back, ui_error | ui | |
| pickup | ui | rustle + soft chime |
| **enemy_growl** (_1.._2) | sfx | husks: sick, hypothermic *people* (breathy formant groan, not a monster) |
| **raider_shout** (_1 "hey", _2 "hoh", _3 "hah") | sfx | placeholder formant shouts |
| **dog_bark** (_1 double, _2 single) | sfx | ferals |
| **player_hurt** (_1.._2) | sfx | Dell grunt |
| radio_static | sfx | Lou's shortwave |
| geiger_click | ui | use `A.geiger(dt, level0to1)` |
| molotov_ignite | sfx | glass smash + whoosh |
| drone_flyby | sfx | Act II surveillance drone set piece (3.5 s pass) |
| amb_wind, amb_blizzard, amb_fire, amb_war | ambience | loops 16 / 16 / 10 / 24 s |
| music_blackout, music_collapse, music_civil_war, music_nuclear_winter | music | loops |

## 9. Hook points found in the game (for Echo)

| where | what to call |
|---|---|
| `js/load.js` `tryImport()` | **fix import base (see §0)**, which turns everything below on automatically |
| `js/game.js` boot, `attachAudio({ THREE, scene, camera })` | already correct; camera is used for the listener |
| `js/game.js` `$("btn-new")/("btn-continue").onclick` → `audio.unlock()` | already correct |
| `js/input.js` `new Input(frame, () => audio.unlock())` | already correct |
| `js/game.js` update: `this.audio.maybeFoot(dt, moving, sprint)` (after `player.move`) | already wired; optionally `audio.impl.engine.footsteps(dt, { moving, sprint, surface })` |
| `js/game.js` `tryFire()` gun / molotov / melee branches | already wired. Add `A.play("dry_fire")` when `mags[id] <= 0` **and** there's no ammo (right now it silently fails) |
| `js/game.js` `tryReload()` → `this.audio.ui()` | adapter maps it to the reload sound; cleaner: `A.play(id === "blaster" ? "reload_shotgun" : "reload_pistol")`. No-ammo branch: `A.play("ui_error")` |
| `js/game.js` craft panel → `this.audio.craft()`; `beginSearch()` → `rummage()`; loot → `pickup()` | already wired |
| `js/game.js` blizzard cycle → `this.audio.setWind(...)` | already wired (≥0.9 = blizzard crossfade) |
| `js/game.js` `this.flags.chapter = advanceChapter(...)` | auto via `__ASHFALL`; explicit: `A.setChapter(this.flags.chapter)` when it changes |
| `js/game.js` `openDialogue()` / close | auto duck; explicit: `A.duckMusic(true/false)`; Lou's radio lines: `A.play("radio_static")` |
| `js/game.js` `tickSurvival(... radZone)` | auto geiger from `stats.rad`; explicit: `A.geiger(dt, radZone ? 0.6 : 0)` |
| `js/enemies.js` `spawn()` / `update()` / `kill()` / `hitScan()` | **needs edits** for 3D enemy voices (snippet §4). Today only `audio?.hurt()` fires on enemy attacks |
| `js/world.js` `_addFire()` / `addCampfire()` | fire emitter loop (snippet §4) |
| pause / dead / ending screens | auto via `__ASHFALL.mode`; explicit `A.setPaused(true/false)` |

`window.__ASHFALL` is your debug API. The adapter only **reads** `mode`, `flags.chapter`, `player.equipped`, `player.reloadT` and
`player.stats.rad`. If you rename those, call the explicit methods instead (`impl.setAutoMusic(false)` disables chapter following).

## 10. Regenerate and verify

```bash
cd audio/tools && python3 build_all.py   # numpy + scipy + ffmpeg; about 30 s; rewrites sfx/ amb/ music/ manifest.js
./verify.sh                               # node --check + every manifest entry exists as .ogg AND .m4a
```
Open `audio/test.html` (served over http, e.g. `python3 -m http.server` in game2/) to audition everything on a phone.

---

## 11. Voice-over: voiced NPCs + combat barks

`vo/` holds **@@NLINES@@ story lines** (every NPC node in `story/dialogue/`, @@NCHARS@@ characters) and **@@NBARKS@@ barks** (12 factions × spot/attack/hurt/death/idle/greet/trade).
They're generated offline with Kokoro-82M (Apache-2.0) and then given personality and acting by our DSP (see `vo/CAST.md` for every voice's recipe).
Narrator and Dell (the player) are not voiced on purpose; see CAST.md.
Size: **@@OGG@@ MB ogg (Opus 14 kbps) / @@M4A@@ MB m4a (AAC 16 kbps)** for @@MIN@@ min of speech. A player only fetches one format, and
**only one chapter at a time** (about @@PERCH@@ MB). Nothing VO-related is preloaded at boot apart from `vo/manifest.json` (about @@MANKB@@ KB).

### 11.1 Zero edits: it already talks
Once the `load.js` fix in §0 is in, `attachAshfallAudio()` watches `#panel`, the dialogue box `game.js _showNode()` renders. When a line appears,
it plays the matching VO (matched by text, and by the `.who` name if two characters share a line). Narrator and Dell nodes stop the previous line. Closing the panel
stops the line. On each chapter change it prefetches that chapter's lines plus the act's bark factions. This auto mode **switches itself off
the first time you call `playLine`/`playNode` yourself**, so the explicit hooks below simply take over.

### 11.2 Explicit hooks (recommended: exact, and no text matching)
```js
const A = this.audio?.impl?.engine || window.GameAudio;       // in js/game.js

// openDialogue(dlg): fetch + decode this scene's lines so the first one starts instantly
A?.preloadVO({ scene: dlg.id, decode: true });

// _showNode(entering): after `node` is resolved (id = this.dlgId)
if (entering) {
  if (node.speaker && node.speaker !== "narrator" && node.speaker !== "dell") A?.playNode(this.dlg.id, id);
  else A?.stopLine(0.15);
}

// closePanel() / _finishDialogue(): cut the line when the box closes
A?.stopLine(0.2);
```
Line ids are `"<scene id>.<node id>"` exactly as in `story/dialogue/*.json`, e.g. `playLine("ray", "ch01_ray_garage.r1")`.
Lines tagged `[Radio]`, `[Loudspeaker]` or `[Radio static]`, and Lou's broadcasts, are **already baked** with their chain, so don't add another one.

### 11.3 API
```js
A.playLine(character, lineId, { emitter | position:{x,y,z}, radio:true, volume, delay, interrupt:true, subtitle:true, onStart, onEnd })
   // -> Promise<handle|null>; handle = { id, character, text, duration, ended: Promise, stop(fade), setVolume(v) }
A.playNode(sceneId, nodeId, opts)          // same thing
A.playBark(who, type, { emitter | position, volume, minGap: 2.2, force, subtitle })
   // who = faction ("raider","looter","desperate_family","watch_militia","authority_guard","compact_militia",
   //       "harbor_militia","ironwood","remnant","husk","drone","trader") OR an enemy kind from js/enemies.js
   //       (bridge_boy→raider, ironwood_patrol/checkpoint→ironwood, remnant_patrol→remnant, ironwood_drone→drone ...)
   // type = spot | attack | hurt | death | idle | greet | trade  (missing types resolve to null, harmless)
A.onLine((text, character, duration, handle) => showSubtitle(text, character, duration))   // -> unsubscribe()
A.barkSubtitles = true;                    // barks fire onLine too (default false)
A.preloadVO({ chapter: "ch05" } | { scene } | { character: "ruiz" } | { act } | { barks: ["ironwood", "drone"] }, decode?)
A.stopLine(fade); A.stopVO(fade); A.isSpeaking(); A.hasLine(id); A.lineInfo(id); A.voReady()
A.setVODuck({ music: 0.5, ambience: 0.55, sfx: 0.8 })   // how far a story line ducks the other buses
A.setVolume("vo", 0.9)                     // new "vo" bus, persisted with the others; muted by setPaused(true)
```
Behaviour: a new story line interrupts the previous one, and the newest request wins even if an older file is still downloading.
Story lines duck music, ambience and sfx; barks duck ambience slightly. The duck releases 350 ms after the last line, so back-to-back lines don't pump.
Barks: shuffle bag (every variant heard before a repeat, never the same twice in a row), ±3% pitch, a cooldown per faction+type+emitter,
max 3 at once, and they play at 60% under a story line. `emitter` barks follow the enemy and get the same HRTF and air-absorption as SFX.
`radio:true` on a dry line adds a live walkie-talkie chain (band-pass + drive + static + squelch open/close).
Decoded VO is kept in a 240-second LRU, so memory stays bounded on phones. Compressed bytes are cached separately and are tiny.

### 11.4 Enemy barks (js/enemies.js, Echo)
```js
const A = this._engine();
// update(): where the "spot" growl/shout plays today (see && e.state === "wander")
if (A?.playBark && e.def.body !== "dog") A.playBark(e.kind, "spot", { emitter: e.sfx });
else e.sfx?.play?.(this._voice(e.kind, e.def), { randomPitch: 0.06 });
// attack branch, when e.atkT is reset:
A?.playBark(e.kind, "attack", { emitter: e.sfx, minGap: 5 });
// hitScan() when best.hurtT = 0.2, and kill(e):
A?.playBark(best.kind, "hurt", { emitter: best.sfx, minGap: 1.2 });
A?.playBark(e.kind, "death", { emitter: e.sfx, force: true });   // call before e.sfx.dispose()
// wander: occasional idle chatter
if (Math.random() < dt * 0.04) A?.playBark(e.kind, "idle", { emitter: e.sfx, minGap: 15 });
```
Dogs and wolves have no voice set, so `playBark` resolves to `null` for them and you keep `dog_bark`.

### 11.5 Regenerate when Loremaster changes dialogue
```bash
bash audio/tools/vo/setup.sh                                  # once: venv + Kokoro ONNX model (~350 MB, outside the game folder)
cd audio/tools/vo
/workspace/vo_env/venv/bin/python build_script.py             # story/dialogue + barks.json -> script.json / script.csv
/workspace/vo_env/venv/bin/python render.py                   # only re-renders lines whose text or recipe changed
/workspace/vo_env/venv/bin/python qa.py && /workspace/vo_env/venv/bin/python make_cast_md.py
../verify.sh
```
- Edit voices or acting in `cast.json` (per character: voice blend, pitch, speed, rhythm, color; per act / scene / line deltas; emotion presets).
- Edit bark text in `barks.json` (every line is a **placeholder** until Loremaster signs off).
- Or hand-edit `script.csv` (`id,character,text,act,medium,emotion`) and run `render.py --script script.csv`.
- `render.py --only ray,hank`, `--ids ch01_ray_garage.r1 --force`, `--takes 5`, `--no-asr` (skip Whisper scoring).
- Each story line is rendered 3 times (up to 5 if all are poor). The kept take has the lowest Whisper word-error rate,
  plus penalties for a stuck or too-fast tempo and for clipping. Results are in `tools/vo/_state.json` and `tools/vo/QA.md`.
