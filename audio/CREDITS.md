# Audio credits

Every sound in `audio/` is **original offline synthesis** (Python numpy + scipy, encoded with ffmpeg).
No recorded samples, no downloaded audio, no third-party sound libraries: **zero license risk**.
The project may treat these files as CC0 1.0 / public domain; attribution is optional.

- Generators: `tools/synth_lib.py` (DSP helpers), `tools/gen_sfx.py` (one-shots), `tools/gen_loops.py` (ambience + music)
- Build: `cd audio/tools && python3 build_all.py` (re-renders WAVs to `tools/_wav/`, encodes .ogg Vorbis + .m4a AAC, rewrites `manifest.js`)
- Tools used: numpy, scipy (BSD), ffmpeg with libvorbis + native AAC encoder (LGPL/GPL tools; they put no license on the output)
- Procedural fallbacks inside `audio.js` (the `SYNTH` table) are also original code.

No CC-BY assets are used, so the game needs no audio attribution screen. If someone adds a downloaded asset later,
add a row with its URL, author and license (CC0 or CC-BY only) and keep the license text in `audio/licenses/`.

| File | Length | Size (ogg+m4a) | Source | Author | License |
|---|---|---|---|---|---|
| `sfx/footstep_snow_1.ogg` / `.m4a` | 0.32s | 9 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/footstep_snow_2.ogg` / `.m4a` | 0.32s | 10 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/footstep_snow_3.ogg` / `.m4a` | 0.32s | 9 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/footstep_snow_4.ogg` / `.m4a` | 0.32s | 10 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/footstep_hard_1.ogg` / `.m4a` | 0.18s | 7 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/footstep_hard_2.ogg` / `.m4a` | 0.18s | 7 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/gun_pistol.ogg` / `.m4a` | 1.357s | 23 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/gun_rifle.ogg` / `.m4a` | 1.415s | 23 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/gun_shotgun.ogg` / `.m4a` | 1.492s | 25 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/dry_fire.ogg` / `.m4a` | 0.08s | 6 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/reload_pistol.ogg` / `.m4a` | 1.09s | 19 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/reload_shotgun.ogg` / `.m4a` | 1.18s | 19 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/melee_swing_1.ogg` / `.m4a` | 0.308s | 9 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/melee_swing_2.ogg` / `.m4a` | 0.26s | 8 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/melee_hit_1.ogg` / `.m4a` | 0.401s | 10 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/melee_hit_2.ogg` / `.m4a` | 0.2s | 7 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/craft_hammer.ogg` / `.m4a` | 1.12s | 18 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/craft_cloth.ogg` / `.m4a` | 0.591s | 14 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/ui_click.ogg` / `.m4a` | 0.04s | 5 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/ui_confirm.ogg` / `.m4a` | 0.255s | 8 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/ui_back.ogg` / `.m4a` | 0.23s | 8 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/pickup.ogg` / `.m4a` | 0.344s | 10 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/ui_error.ogg` / `.m4a` | 0.241s | 8 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/enemy_growl_1.ogg` / `.m4a` | 1.286s | 23 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/enemy_growl_2.ogg` / `.m4a` | 1.585s | 27 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/raider_shout_1.ogg` / `.m4a` | 0.92s | 18 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/raider_shout_2.ogg` / `.m4a` | 1.02s | 19 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/raider_shout_3.ogg` / `.m4a` | 0.82s | 17 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/dog_bark_1.ogg` / `.m4a` | 0.8s | 16 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/dog_bark_2.ogg` / `.m4a` | 0.8s | 16 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/player_hurt_1.ogg` / `.m4a` | 0.343s | 10 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/player_hurt_2.ogg` / `.m4a` | 0.345s | 10 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/radio_static.ogg` / `.m4a` | 1.59s | 29 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/geiger_click.ogg` / `.m4a` | 0.011s | 5 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/molotov_ignite.ogg` / `.m4a` | 1.68s | 31 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `sfx/drone_flyby.ogg` / `.m4a` | 3.477s | 57 KB | original synthesis, `tools/gen_sfx.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `amb/amb_wind.ogg` / `.m4a` | 16s loop | 186 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `amb/amb_blizzard.ogg` / `.m4a` | 16s loop | 189 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `amb/amb_fire.ogg` / `.m4a` | 10s loop | 124 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `amb/amb_war.ogg` / `.m4a` | 24s loop | 190 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `music/music_blackout.ogg` / `.m4a` | 43.636s loop | 328 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `music/music_collapse.ogg` / `.m4a` | 40s loop | 406 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `music/music_civil_war.ogg` / `.m4a` | 40s loop | 400 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |
| `music/music_nuclear_winter.ogg` / `.m4a` | 48s loop | 461 KB | original synthesis, `tools/gen_loops.py` | ASHFALL audio (Echoes, Grok Bot) | CC0 1.0 (project-owned) |

## Voice-over (`vo/`): generated speech

All NPC voices are **generated offline** with an open-weight TTS model and then processed by our own DSP. No recorded voice
actors, no voice cloning, no downloaded audio samples. Breaths, coughs, squelch clicks, static, and the gurgle and valve sounds are
original synthesis in `tools/vo/dsp.py` (CC0 1.0, project-owned).

| What | Used for | Source | Author | License | Verified |
|---|---|---|---|---|---|
| **Kokoro-82M v1.0** (model weights + the 54 voice style vectors in `voices-v1.0.bin`) | every VO line and bark | https://huggingface.co/hexgrad/Kokoro-82M | hexgrad (`@rzvzn`), architecture StyleTTS 2 by Li et al. (yl4579) | **Apache-2.0** | model card `license: apache-2.0`, read 2026-11-23 |
| Kokoro voices used (all from the same Apache-2.0 release) | blended per character (see `vo/CAST.md`) | same repo, `voices/` | hexgrad | Apache-2.0 | `af_alloy af_aoede af_bella af_heart af_jessica af_kore af_nicole af_nova af_river af_sarah af_sky am_adam am_echo am_eric am_fenrir am_liam am_michael am_onyx am_puck am_santa bf_emma bf_isabella bm_fable bm_george` |
| kokoro-onnx 0.6.1 (runtime + ONNX export of the weights, `kokoro-v1.0.onnx`) | inference | https://github.com/thewh1teagle/kokoro-onnx | thewh1teagle | MIT | LICENSE file, read 2026-11-23 |
| espeak-ng (via espeakng-loader) + phonemizer | text → phonemes (build tool only) | https://github.com/espeak-ng/espeak-ng | espeak-ng contributors | GPL-3.0 | tool only; it does not license its output, and nothing from it ships in the game |
| faster-whisper + Whisper `base.en` (CTranslate2 conversion) | **QA only**: scores takes for intelligibility, never in the output | https://github.com/SYSTRAN/faster-whisper, https://huggingface.co/Systran/faster-whisper-base.en | SYSTRAN; OpenAI (Whisper) | MIT | |
| onnxruntime, numpy, scipy, soundfile, ffmpeg (libopus, native AAC) | inference and DSP; encoding | | | MIT / BSD / LGPL tools | tools only |

**Kokoro training-data notes (from the model card).** It was trained on "permissive/non-copyrighted audio" (public domain, Apache/MIT-licensed
audio, and synthetic audio from closed commercial TTS). The CC-BY sets named on the card are **Koniwa `tnc` (CC BY 3.0)** and
**SIWIS (CC BY 4.0)**. Those attributions belong to the model's training set, not to our output. Out of courtesy, the in-game credits
line below also mentions them. The model card states it is deployed commercially and welcomes "real use cases".

**Voices considered and not used:** Piper voices were the brief's first choice, but each Piper voice has its own dataset license,
and the expressive US voices (e.g. `lessac`, from the Blizzard 2013 data) have restrictive or unclear terms. The current `piper-tts` package is
also GPL. LJSpeech (public domain) and LibriTTS-R (CC BY 4.0) Piper voices would be fine, but they're flatter than Kokoro, so we didn't use them.
Coqui XTTS-v2 was not used because of the Coqui Public Model License, which is **non-commercial**. No voice is cloned from a real person.

**Suggested in-game credits line:** "Voices generated with Kokoro-82M by hexgrad (Apache-2.0), with processing by the ASHFALL audio team.
Kokoro's training data includes SIWIS (CC BY 4.0) and Koniwa (CC BY 3.0)."

Generated files: `vo/<character>/<scene>__<node>.ogg|.m4a` (story lines) and `vo/barks/<faction>/<type>_<n>.ogg|.m4a`.
The full list with text and durations is in `vo/manifest.json`. All of them are © the project, generated with the tools above.
