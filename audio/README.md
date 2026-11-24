# ASHFALL: Truckee Meadows: audio (Revision 2, Nevada)

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

Size: **92 sounds, 184 files: 3.76 MB ogg / 3.12 MB m4a** (non-VO). A client downloads only one format (Chrome/Firefox/Android get ogg,
iOS/Safari get m4a), so that's **about 3.1–3.8 MB per player**. Music is ~1 MB of that (`preload: "essential"` defers it).

> **Revision 2 (Nevada) for Prime:** seasons → **§12**, Tallmen / Hollows / Wraith (incl. the Hollow-vs-husk **Wraith tell**) → **§13**,
> copy-paste game hooks → **§14**. Every v1 sound name and API method still works unchanged.

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
A.footsteps(dt, { moving, sprint, speed: sprint ? CFG.sprint : CFG.walk });          // Rev 2: surface = season default
A.footsteps(dt, { moving, sprint, surface: indoor ? "hard" : undefined });            // "snow"|"hard"|"dirt"|"gravel"|"wet" (§12)
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
| act | chapters / season | loop | feel (Revision 2 rewrite, same keys) |
|---|---|---|---|
| blackout | ch01–02 · late summer | 48 s | dry heat stillness: heat-haze shimmer, slow analog "lub-dub" pulse, sparse Karplus-Strong acoustic plucks in D dorian, dusty pad. No snow. |
| collapse | ch03–04 · dusty autumn | 40 s | hollow resonant gusts tuned to the chords, dark A-minor drone with a ♭2/tritone shadow, walking muted low pluck pulse, loose-sign rim tick |
| civil_war | ch05–07 · late fall | 37.5 s | exhausted and cold: E-phrygian drone, tired bowed low line, distant heavy drum, far anvil/iron strikes, faint snare roll, rain hiss |
| nuclear_winter | ch08–10 · fallout winter | 48 s | survival-horror dread: sub-harmonic tritone floor, bowed-metal partials swelling out of nothing, dread cluster, far metal groan, only a faint fragile bell motif |

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
| amb_wind, amb_fire | ambience | v1 loops 16 / 10 s (amb_wind = cold wind layer in late_fall + winter) |
| amb_blizzard, amb_war | ambience | **Rev 2 regenerated**: 20 s howling ash-blizzard (dread) / 32 s distant war + siren + radio squelch |
| amb_summer_wind, amb_cicadas, amb_stillness | ambience | Rev 2 · summer loops 20 / 24 / 16 s |
| amb_autumn_wind, amb_dry_brush | ambience | Rev 2 · autumn loops 18 / 16 s |
| amb_fall_rain, amb_sleet | ambience | Rev 2 · late fall loops 20 / 16 s |
| amb_subzero_creaks, amb_ash_hush, amb_floodlight_hum | ambience | Rev 2 · winter loops 24 / 16 / 12 s (floodlight also works as an emitter loop on a lamp pole) |
| music_blackout, music_collapse, music_civil_war, music_nuclear_winter | music | **Rev 2 regenerated** loops (§6) |
| **footstep_dirt** / **footstep_gravel** / **footstep_wet** (_1.._4) | sfx | Rev 2 · dry dirt, desert gravel, wet/cold hard ground |
| power_hum_drop | sfx | Rev 2 · Ch1 opening: mains hum + fridge spin down, relay clack |
| tallman_stalk (loop) · **tallman_call** · **tallman_click** · tallman_ambush | sfx | Rev 2 · Tallmen (§13) |
| assim_human_stalk (loop) · **assim_human_call** · assim_human_lunge | sfx | Rev 2 · Hollows, human (§13) |
| **assim_animal_scrape** · **assim_animal_chitter** · assim_animal_call · assim_animal_lunge | sfx | Rev 2 · Hollows, animal (§13) |
| **wraith_growl** · **wraith_bark** · **wraith_whine** · wraith_pant (loop) · wraith_hollow_tell · wraith_husk_tell | sfx | Rev 2 · Wraith (§13) |

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
cd audio/tools && python3 build_all.py   # numpy + scipy + ffmpeg; about 60 s; rewrites sfx/ amb/ music/ manifest.js; prints loop-seam report
./verify.sh                               # node --check + every manifest entry exists as .ogg AND .m4a + Rev 2 keys/pools present
```
Open `audio/test.html` (served over http, e.g. `python3 -m http.server` in game2/) to audition everything on a phone.

---

## 11. Voice-over: voiced NPCs + combat barks

`vo/` holds the **Revision 2 (Nevada) cast: 485 story lines** (every voiced node in `story/dialogue/`, 47 speakers incl. 5 Hollow mimicry lines)
and **199 barks** (15 factions incl. `deserter`, `boot_strippers` and 18 `hollow` mimic barks in borrowed voices), plus 23 Wraith action cues
(`M.cues`, played as companion SFX, no TTS). They're generated offline with Kokoro-82M (Apache-2.0) and then given personality and acting by
our DSP (see `vo/CAST.md` for every voice's recipe). Narrator and Braith (the player) are not voiced on purpose; see CAST.md.
Size: **5.69 MB ogg (Opus 14 kbps) / 6.40 MB m4a (AAC 12 kbps, 16 kHz)** for 58 min of speech (barks 0.82 / 1.02 MB). A player only fetches one format, and
**only one chapter at a time** (0.24 to 0.92 MB of Opus; ch07 is the largest). Nothing VO-related is preloaded at boot apart from `vo/manifest.json` (about 160 KB).

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

---

## 12. Revision 2: seasons (ambience beds, wind/storm sound, footsteps, music)

`setChapter()` now crossfades **music and seasonal ambience** and sets the **default footstep surface**. game.js already calls
`this.audio.impl.setChapter(n)` on chapter load, and the adapter also follows `__ASHFALL.flags.chapter`, so with **zero game edits**:

| chapters | season (`gameplay_hooks` id) | music | `wind` layer → | `blizzard` layer (storm) → | beds (default level) | footsteps |
|---|---|---|---|---|---|---|
| ch01–02 | `summer` (`late_summer`) | music_blackout | amb_summer_wind | amb_autumn_wind (dust front) | cicadas 0.45, stillness 0.30 | dirt |
| ch03–04 | `autumn` | music_collapse | amb_autumn_wind | none: storms push wind harder | dry_brush 0.42 | dirt |
| ch05–07 | `late_fall` | music_civil_war | amb_wind (cold gusts) | none: storms push wind harder | fall_rain 0.32, sleet 0.22, war 0.30 | wet |
| ch08–10 | `winter` (`nuclear_winter`) | music_nuclear_winter | amb_wind | amb_blizzard | ash_hush 0.40, subzero_creaks 0.38, floodlight 0.10 | snow |

So game.js's blizzard cycle (`audio.setWind(1)`) can't put a blizzard in Ch1 any more: in summer it becomes a dust gust front, in
autumn/late fall a harder wind. (Visually the blizzard cycle still runs in every chapter; you may want to gate it by season.)

```js
const A = game.audio.impl.engine;               // or window.GameAudio
A.setChapter("ch03");                            // music + beds + footsteps (returns "collapse", as in v1)
A.setChapter(5, { music: false });               // ambience/footsteps only     · { ambience: false } = music only
A.setSeason("late_fall", { fade: 4 });           // explicit: summer | autumn | late_fall | winter (also late_summer, nuclear_winter)
A.setSeason("winter", { beds: 0.6, music: true });// beds = 0..1 scale of the bed layers; music:true also plays the act loop
A.autoSeason = false;                            // stop setChapter() from touching ambience (then drive it yourself)
A.getSeason();  A.seasonFor("ch07");             // "late_fall"
A.setWeatherType("sleet");                       // story weather ids: heat_haze dust_wind clear clear_autumn autumn_wind frost overcast
                                                 // drizzle sleet freezing_rain clear_cold brown_sky snow grey_snow fallout_rain ashfall blizzard
A.setLayer("floodlight", 0.3);                   // any bed by layer name: summer_wind cicadas stillness autumn_wind dry_brush fall_rain
                                                 // sleet war subzero_creaks ash_hush floodlight (+ v1 wind blizzard fire war)
A.setWind(0.6); A.setBlizzard(1);                // unchanged API; sound follows the season (table above)
A.play("power_hum_drop");                        // Ch1 opening sting: the power dies
// lamp-line pole: positional hum instead of the bed
pole.sfx = A.emitter({ x, y: 4, z }, { refDistance: 2, maxDistance: 20 }); pole.sfx.loop("amb_floodlight_hum", { volume: 0.6 });
```
Note: a season change sets every bed layer, including `war` (0 outside late_fall). If you drive `war` yourself, set it after `setChapter`.

**Footsteps.** `surface` omitted → season default (`A.surfaceFor()`); before any season is set it stays `"snow"` (v1 behaviour).
```js
A.footsteps(dt, { moving, sprint });                         // per frame, seasonal surface (already what maybeFoot() does)
A.footsteps(dt, { moving, sprint, surface: "hard" });        // indoors / concrete / ice
A.playFootstep({ surface: "gravel", sprint: true });          // one step now; also { position } or { emitter } for NPC steps
// surfaces: snow hard dirt gravel wet  · aliases: concrete asphalt ice wood floor indoor -> hard, sand dust earth grass -> dirt,
// stone rubble -> gravel, mud puddle rain -> wet, ash powder -> snow.  audio.foot() = seasonal, foot(false) = hard.
```

## 13. Revision 2: Act III creatures and Wraith (3D, HRTF)

All creature/Wraith sounds are **mono, near-dry** (short ash-damped tails) for the PannerNode; distance muffling closes further in a
blizzard. Story canon (Loremaster, `gameplay_hooks.assimilation`) is baked in: **Hollows have no breath** (their stalk loop is gait,
drag and joint clicks only), **Hollow voices are borrowed phrases repeated with identical intonation, off-cadence** (not sick/wet:
that's a husk), and **Hollow animals are near-silent** (paws landing in unnatural unison; the only vocal is one pitched-down yip).

```js
// enemies.js spawn():   e.sfx = A.emitter({ x, y: 1.6, z });        (Tallmen are tall: y 2.2 sounds right)
// kind ids accepted: "tallman" | "stalker" (code_kind) | "assimilated_human" | "hollow" | "assimilated_animal"
A.playCreature(e.kind, "stalk", { emitter: e.sfx });   // seamless loop that follows the body (tallman, assimilated_human)
A.playCreature(e.kind, "spot",  { emitter: e.sfx });   // on first sight
A.playCreature(e.kind, "call",  { emitter: e.sfx });   // mimicry from the dark (Tallman far call / Hollow borrowed phrase / animal yip)
A.playCreature(e.kind, "lunge", { emitter: e.sfx });   // attack wind-up; tallman "ambush" = cold sting + rush when it reveals itself
A.playCreature(e.kind, "hurt" | "retreat" | "death", { emitter: e.sfx });
A.stopCreature(e.sfx);                                 // stop the stalk loop (also on kill/despawn, before e.sfx.dispose())
A.playCreature("tallman", "call", { position: { x, y: 2.2, z } }); // or { x, y, z } / no position = 2D
```
| kind | events → sound |
|---|---|
| tallman | stalk (loop: hollow shallow breathing, claw scrape, clicks) · idle/spot/click/chitter → tallman_click · call/mimic → tallman_call (stretched, wrong-formant human fragments, long far tail) · ambush/lunge/attack → tallman_ambush · hurt · retreat · death |
| assimilated_human (Hollow) | stalk (loop: uneven long-short gait, dragged foot, joint pops, NO breathing) · idle/spot/call/mimic → assim_human_call ("Brai-th?" ×3 / "Mor-ning nei-ghbor" ×2, sample-identical repeats, second throat) · lunge/attack/ambush → assim_human_lunge · hurt · death |
| assimilated_animal (Hollow) | stalk/move/scrape/spot → assim_animal_scrape (3–5 paws within 6 ms) · idle/chitter → assim_animal_chitter (quiet bone rattle) · call/yip → assim_animal_call (single pitched-down yip, cut dead) · lunge/attack/ambush → assim_animal_lunge (rush, scrabble, teeth snap, barely voiced) |

Spoken Hollow lines (generic speaker `hollow`) are rendered in the Rev 2 VO pass: `playMimic(borrow)` / `playBark("hollow", "mimic", { borrow })` / `playLine`; these
SFX are the non-verbal layer.

### Wraith (Braith's Belgian Malinois)
```js
wraith.sfx = A.emitter({ x, y: 0.6, z }, { refDistance: 1.5 });
A.playWraith("growl", { emitter: wraith.sfx });  // WARN verb: low protective growl (also "warn", "tallman")
A.playWraith("bark",  { emitter: wraith.sfx });  // sharp Malinois warning bark; Ch10: bark from the threat side
A.playWraith("whine");                           // anxious whine (no emitter = close beside the player, slight pan)
const pant = A.playWraith("pant"); pant?.stop(0.5); // calm/alert panting loop
A.playWraith("hollow_tell", { emitter: wraith.sfx }); // GAMEPLAY TELL, see below
A.playWraith("husk_tell",   { emitter: wraith.sfx });
```

### ⚠ The Wraith tell (gameplay-critical): Hollow vs. real husk
Players must be able to tell **by ear alone** whether the figure in the ash is a Hollow or a living, freezing husk:

| cue | when | sound | how it differs (measured) |
|---|---|---|---|
| `wraith_hollow_tell` | Wraith near an **assimilated_human / assimilated_animal** (set `wraith_mimic_warned`) | 2.6 s: **LOW growl** (f0 ≈ 88 Hz) with a **hackle rattle** (14 Hz pulsing + teeth chatter + collar-tag shake), ends in a lip-curl snarl | noisy (spectral flatness 0.25), 31 % of energy below 400 Hz, rhythmic |
| `wraith_husk_tell` | Wraith near a **real husk** / living stranger | 1.6 s: **two soft sniffs + a gentle HIGH whine** (f0 950–1250 Hz), no growl at all | tonal (flatness 0.04), 0 % below 400 Hz, 94 % in 700–1600 Hz, 6 dB quieter |

Rules for Prime: play exactly one tell per encounter, on Wraith's emitter, **before** the figure is readable on screen (Wraith's WARN
verb fires before enemies are visible). Never use `wraith_growl` for a husk or `wraith_whine` for a Hollow; the generic growl/whine
pools are fine for Tallmen and everyday moods, but the two `*_tell` sounds are reserved for this mechanic.
```js
// e.g. in the Wraith/companion update, once per newly-noticed figure within ~12 m:
if (fig.kind === "assimilated_human" || fig.kind === "assimilated_animal") { A.playWraith("hollow_tell", { emitter: wraith.sfx }); flags.wraith_mimic_warned = true; }
else if (fig.kind === "husk") A.playWraith("husk_tell", { emitter: wraith.sfx });
```
The test bench has an A/B button (`test.html` → WRAITH → "A/B GAMEPLAY TELL").

## 14. Copy-paste hooks for Prime (Revision 2)

| where | add |
|---|---|
| nothing (already wired) | `game.js` chapter load → `audio.impl.setChapter(n)` now also switches season beds + footsteps; `maybeFoot()` uses the seasonal surface |
| `game.js` chapter load, after `this._weather = ...` | `this.audio.impl.setWeatherType?.(this._weather);` (story weather ids → layer mix) |
| `game.js` update, footsteps | optional: `engine.footsteps(dt, { moving, sprint, surface: indoor ? "hard" : undefined })` |
| `game.js` Ch1 first frame / blackout moment | `engine.play("power_hum_drop")` |
| `enemies.js` `_voice()` / spawn / update / kill | for kinds `tallman`/`stalker`/`assimilated_human`/`assimilated_animal`: `engine.playCreature(e.kind, "stalk"/"spot"/"call"/"lunge"/"death", { emitter: e.sfx })`; `engine.stopCreature(e.sfx)` on kill. Keep `husk` on `enemy_growl` (husks are people). |
| companion (Wraith) | `wraith.sfx = engine.emitter(...)`; WARN → `playWraith("growl")`; TRACK → `playWraith("bark")`; Hollow/husk detection → the tell (§13) |
| lamp line / Galena floodlights | `pole.sfx.loop("amb_floodlight_hum")` (§12) or `engine.setLayer("floodlight", 0.3)` |
| `manifest.js` | auto-generated; new keys listed in §8. `tools/verify.sh` fails if any Rev 2 key/pool is missing |

`engine` = `game.audio.impl.engine` (or `window.GameAudio`). The adapter (`game.audio.impl`) also exposes `setChapter`, `setSeason`,
`setWeatherType`, `playFootstep`, `playCreature`, `stopCreature`, `playWraith`.

