// ASHFALL: Lakehead - audio manager (ES module; also exposes window.GameAudio).
// Owner: audio. Zero dependencies. Every public method is a safe no-op if WebAudio is missing or fails.
//
//   import { GameAudio } from "../audio/audio.js";
//   GameAudio.init();                       // attaches first-gesture unlock (iOS/Safari safe)
//   GameAudio.play("gun_pistol");           // or a pool: GameAudio.play("footstep_snow")
//   GameAudio.setListenerFromObject(camera);// each frame (three.js camera)
//   GameAudio.emitter(e).play("enemy_growl")// 3D positional (HRTF, equalpower fallback)
//   GameAudio.playLine("ray", "ch01_ray_garage.r1")      // voiced NPC line (lazy-loaded, ducks music/ambience)
//   GameAudio.playBark("raider", "spot", { emitter })    // random non-repeating combat bark, 3D
//   GameAudio.onLine((text, who, dur) => showSubtitle(text, who, dur))
//
// See README.md for the full API.

import { MANIFEST } from "./manifest.js";

const BUSES = ["master", "sfx", "ambience", "music", "ui", "vo"];
const DEFAULT_VOL = { master: 0.9, sfx: 0.9, ambience: 0.7, music: 0.55, ui: 0.7, vo: 1.0 };
// While a story line plays: music / ambience / sfx are pulled down to these levels (barks use a lighter duck).
const VO_DUCK = { line: { music: 0.5, ambience: 0.55, sfx: 0.8 }, bark: { music: 1, ambience: 0.85, sfx: 1 } };
const VO_CACHE_SECONDS = 240; // decoded VO kept in memory (LRU), ~46 MB worst case at 48 kHz
const STORE_KEY = "ashfall.audio.v1";
export const ACTS = ["blackout", "collapse", "civil_war", "nuclear_winter"];
// Chapter (1..10) -> act music. Override via GameAudio.chapterToAct = {...} if the story changes.
export const CHAPTER_TO_ACT = { 1: "blackout", 2: "blackout", 3: "collapse", 4: "collapse", 5: "civil_war",
  6: "civil_war", 7: "civil_war", 8: "nuclear_winter", 9: "nuclear_winter", 10: "nuclear_winter" };
// Bark factions to prefetch per act (chapter changes trigger it in attachAshfallAudio).
const ACT_BARKS = { blackout: ["raider", "looter", "watch_militia", "authority_guard", "trader"],
  collapse: ["raider", "desperate_family", "authority_guard", "trader"],
  civil_war: ["ironwood", "compact_militia", "harbor_militia", "drone", "authority_guard"],
  nuclear_winter: ["remnant", "husk", "trader", "desperate_family"] };
const AMB_LAYERS = { wind: "amb_wind", blizzard: "amb_blizzard", fire: "amb_fire", war: "amb_war" };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const normText = (t) => String(t || "").replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
function driveCurve(k) { const n = 1024, c = new Float32Array(n), d = Math.tanh(k); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / d; } return c; }

// ---------------------------------------------------------------------------------------------
// Procedural fallbacks: render a Float32Array (mono) for a sound name. Used when a file is missing
// or fails to decode, or for manifest entries that only have { synth: "recipe" }.
// ---------------------------------------------------------------------------------------------
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; }
function onePoleLP(x, fc, sr) { const a = Math.exp(-2 * Math.PI * fc / sr); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function onePoleHP(x, fc, sr) { const a = Math.exp(-2 * Math.PI * fc / sr); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
function normalize(x, peak = 0.8) { let m = 0; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function noiseBurst(sr, dur, { lp = 4000, hp = 0, decay = dur / 4, seed = 1, attack = 0.002 } = {}) {
  const n = Math.max(1, Math.floor(dur * sr)), x = new Float32Array(n), r = rnd(seed);
  for (let i = 0; i < n; i++) x[i] = r();
  onePoleLP(x, lp, sr); onePoleLP(x, lp, sr); if (hp) onePoleHP(x, hp, sr);
  for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= Math.exp(-t / decay) * Math.min(1, t / attack); }
  return x;
}
function tone(sr, dur, f0, f1, { type = "sine", decay = dur / 3, amp = 1 } = {}) {
  const n = Math.floor(dur * sr), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * Math.pow(f1 / f0, t / dur); ph += 2 * Math.PI * f / sr;
    const s = type === "saw" ? ((ph / (2 * Math.PI)) % 1) * 2 - 1 : type === "square" ? Math.sign(Math.sin(ph)) : Math.sin(ph);
    x[i] = s * amp * Math.exp(-t / decay) * Math.min(1, t / 0.002);
  }
  return x;
}
function mix(len, ...parts) { const y = new Float32Array(len); for (const [x, at = 0, g = 1] of parts) for (let i = 0; i < x.length && i + at < len; i++) y[i + at] += x[i] * g; return y; }
function noiseLoop(sr, dur, { lp = 600, hp = 60, gust = 0.3, seed = 3 } = {}) {
  const n = Math.floor(dur * sr), x = new Float32Array(n), r = rnd(seed);
  for (let i = 0; i < n; i++) x[i] = r();
  onePoleLP(x, lp, sr); onePoleLP(x, lp, sr); onePoleHP(x, hp, sr);
  for (let i = 0; i < n; i++) { const t = i / n; x[i] *= 1 - gust + gust * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t) * Math.sin(2 * Math.PI * 2 * t)); }
  const X = Math.floor(sr * 0.5); for (let i = 0; i < X; i++) { const g = i / X; x[i] = x[i] * g + x[n - X + i] * (1 - g); } // crude seamless
  return normalize(x.subarray(0, n - X), 0.5);
}
const SYNTH = {
  footstep: (sr, s) => noiseBurst(sr, 0.14, { lp: 1600 + 300 * (s % 4), hp: 200, decay: 0.035, seed: 11 + s, attack: 0.008 }),
  gun: (sr, s, name) => { const heavy = /rifle|shotgun/.test(name); const L = Math.floor(sr * 0.8);
    return normalize(mix(L, [noiseBurst(sr, 0.6, { lp: heavy ? 1200 : 2200, decay: heavy ? 0.12 : 0.06, seed: 5 })], [tone(sr, 0.25, 120, 40, { decay: 0.07 }), 0, 0.9]), 0.95); },
  reload: (sr) => { const L = Math.floor(sr * 1.0), c = (s) => noiseBurst(sr, 0.03, { lp: 7000, hp: 1500, decay: 0.006, seed: s });
    return normalize(mix(L, [c(1)], [c(2), Math.floor(sr * 0.5)], [c(3), Math.floor(sr * 0.8)], [c(4), Math.floor(sr * 0.9)]), 0.6); },
  dry_fire: (sr) => normalize(noiseBurst(sr, 0.05, { lp: 8000, hp: 2500, decay: 0.006, seed: 9 }), 0.5),
  melee_swing: (sr, s) => { const x = noiseBurst(sr, 0.25, { lp: 2500, hp: 400, decay: 1, seed: 20 + s }); for (let i = 0; i < x.length; i++) x[i] *= Math.sin(Math.PI * i / x.length) ** 3; return normalize(x, 0.5); },
  melee_hit: (sr) => normalize(mix(Math.floor(sr * 0.3), [tone(sr, 0.2, 110, 50, { decay: 0.05 })], [noiseBurst(sr, 0.1, { lp: 700, decay: 0.02, seed: 31 })]), 0.9),
  craft: (sr) => { const L = Math.floor(sr * 1.0), h = () => mix(Math.floor(sr * 0.4), [tone(sr, 0.4, 860, 860, { decay: 0.12, amp: 0.5 })], [tone(sr, 0.3, 2000, 2000, { decay: 0.06, amp: 0.3 })], [noiseBurst(sr, 0.02, { lp: 8000, decay: 0.003, seed: 41 })]);
    return normalize(mix(L, [h()], [h(), Math.floor(sr * 0.33)], [h(), Math.floor(sr * 0.62)]), 0.8); },
  ui_click: (sr) => tone(sr, 0.04, 1250, 1250, { type: "square", decay: 0.012, amp: 0.25 }),
  ui_confirm: (sr) => mix(Math.floor(sr * 0.25), [tone(sr, 0.12, 587, 587, { decay: 0.05, amp: 0.3 })], [tone(sr, 0.16, 880, 880, { decay: 0.06, amp: 0.3 }), Math.floor(sr * 0.07)]),
  ui_back: (sr) => mix(Math.floor(sr * 0.25), [tone(sr, 0.1, 659, 659, { decay: 0.04, amp: 0.3 })], [tone(sr, 0.15, 440, 440, { decay: 0.05, amp: 0.3 }), Math.floor(sr * 0.07)]),
  ui_error: (sr) => tone(sr, 0.2, 220, 200, { type: "square", decay: 0.08, amp: 0.2 }),
  pickup: (sr) => tone(sr, 0.15, 660, 990, { decay: 0.06, amp: 0.3 }),
  growl: (sr, s) => normalize(mix(Math.floor(sr * 1.0), [tone(sr, 1.0, 85, 65, { type: "saw", decay: 0.5 })], [noiseBurst(sr, 1.0, { lp: 400, decay: 0.4, seed: 50 + s, attack: 0.15 })]), 0.7),
  shout: (sr, s) => normalize(mix(Math.floor(sr * 0.5), [tone(sr, 0.45, 230, 170, { type: "saw", decay: 0.2 })]), 0.7),
  bark: (sr, s) => normalize(onePoleLP(mix(Math.floor(sr * 0.45), [tone(sr, 0.14, 650, 380, { type: "saw", decay: 0.06 })], [tone(sr, 0.12, 600, 360, { type: "saw", decay: 0.05 }), Math.floor(sr * 0.22)]), 2500, sr), 0.8),
  hurt: (sr) => normalize(tone(sr, 0.25, 180, 110, { type: "saw", decay: 0.1 }), 0.6),
  radio: (sr) => normalize(noiseBurst(sr, 1.2, { lp: 3000, hp: 500, decay: 2, seed: 61, attack: 0.04 }), 0.4),
  geiger: (sr) => noiseBurst(sr, 0.01, { lp: 9000, hp: 1500, decay: 0.0015, seed: 71, attack: 0.0001 }),
  molotov: (sr) => normalize(mix(Math.floor(sr * 1.5), [noiseBurst(sr, 0.1, { lp: 9000, hp: 2500, decay: 0.03, seed: 81 })], [noiseBurst(sr, 1.4, { lp: 900, decay: 0.5, seed: 82, attack: 0.2 }), Math.floor(sr * 0.08)]), 0.9),
  drone: (sr) => normalize(tone(sr, 3.0, 190, 200, { type: "saw", decay: 99, amp: 0.3 }).map((v, i, a) => v * Math.sin(Math.PI * i / a.length) ** 2), 0.4),
  amb_wind: (sr) => noiseLoop(sr, 8, { lp: 500, gust: 0.5, seed: 3 }),
  amb_blizzard: (sr) => noiseLoop(sr, 8, { lp: 1400, gust: 0.4, seed: 4 }),
  amb_fire: (sr) => { const x = noiseLoop(sr, 6, { lp: 250, gust: 0.2, seed: 5 }); const r = rnd(6); for (let k = 0; k < 70; k++) { const at = Math.floor((r() * 0.5 + 0.5) * (x.length - 200)); for (let i = 0; i < 120; i++) x[at + i] += r() * 0.6 * Math.exp(-i / 25); } return x; },
  amb_war: (sr) => { const x = noiseLoop(sr, 12, { lp: 120, gust: 0.1, seed: 7 }); const b = tone(sr, 1.5, 60, 28, { decay: 0.35 }); for (const at of [1, 4.5, 8]) { const o = Math.floor(at * sr); for (let i = 0; i < b.length && o + i < x.length; i++) x[o + i] += b[i] * 0.8; } return x; },
  music: (sr, s, name) => { // minimal drone per act so the game is never silent
    const roots = { music_blackout: 73.4, music_collapse: 110, music_civil_war: 82.4, music_nuclear_winter: 65.4 };
    const f = roots[name] || 73.4, dur = 16, n = Math.floor(dur * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr, sw = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / dur);
      x[i] = sw * (0.5 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 1.5 * t) + 0.12 * Math.sin(2 * Math.PI * f * 2 * t)); }
    return normalize(x, 0.35); },
};
function synthFor(name) {
  const rules = [[/^footstep/, "footstep"], [/^gun_/, "gun"], [/^reload/, "reload"], [/^dry_fire/, "dry_fire"],
    [/^melee_swing/, "melee_swing"], [/^melee_hit/, "melee_hit"], [/^craft/, "craft"], [/^ui_click/, "ui_click"],
    [/^ui_confirm/, "ui_confirm"], [/^ui_back/, "ui_back"], [/^ui_error/, "ui_error"], [/^pickup/, "pickup"],
    [/growl/, "growl"], [/shout/, "shout"], [/bark/, "bark"], [/hurt/, "hurt"], [/radio/, "radio"], [/geiger/, "geiger"],
    [/molotov/, "molotov"], [/drone/, "drone"], [/^amb_wind/, "amb_wind"], [/^amb_blizzard/, "amb_blizzard"],
    [/^amb_fire/, "amb_fire"], [/^amb_war/, "amb_war"], [/^music_/, "music"]];
  for (const [re, k] of rules) if (re.test(name)) return k;
  return null;
}

// ---------------------------------------------------------------------------------------------
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ok = true;            // flips false if WebAudio is unusable -> everything no-ops
    this.unlocked = false;
    this.manifest = { ...MANIFEST };
    this.baseUrl = new URL("./", import.meta.url).href;
    this.format = null;        // "ogg" | "m4a"
    this.buffers = new Map();  // name -> AudioBuffer
    this.loading = new Map();  // name -> Promise
    this.failed = new Set();
    this.pools = new Map();    // pool -> [names]
    this.lastPick = new Map(); // pool -> last name (no immediate repeat)
    this.lastPlay = new Map(); // name -> ms (spam guard)
    this.voices = new Set();
    this.maxVoices = 28;
    this.bus = {};
    this.settings = this._loadSettings();
    this.hrtf = this.settings.hrtf !== false;
    this.amb = {};             // layer -> { name, gain, src, target }
    this.music = { name: null, gain: null, src: null, duck: 1 };
    this.pendingMusic = null;
    this._foot = { dist: 0, side: 1 };
    this._paused = false;
    this._blizzard = 0;
    this.chapterToAct = { ...CHAPTER_TO_ACT };
    this.listener = { x: 0, y: 1.6, z: 0, fx: 0, fy: 0, fz: -1 };
    this._rebuildPools();
    // voice-over state (see "voice-over" section)
    this.vo = { manifest: null, loading: null, buffers: new Map(), pending: new Map(), bags: new Map(), listeners: new Set(),
      current: null, active: new Set(), lastBark: new Map(), explicit: false, url: null };
  }

  // ------------------------------------------------------------------ setup / unlock
  init({ manifest, baseUrl, preload = "all", autoUnlock = true } = {}) {
    try {
      if (manifest) { this.manifest = { ...this.manifest, ...manifest }; this._rebuildPools(); }
      if (baseUrl) this.baseUrl = new URL(baseUrl, location.href).href;
      this._preloadPlan = preload;
      if (typeof window === "undefined") { this.ok = false; return this; }
      if (!(window.AudioContext || window.webkitAudioContext)) { this.ok = false; return this; }
      if (autoUnlock && !this._listening) {
        this._listening = true;
        const evs = ["pointerdown", "touchend", "mousedown", "keydown", "click"];
        const h = () => { this.unlock(); if (this.unlocked && this.ctx && this.ctx.state === "running") evs.forEach((e) => window.removeEventListener(e, h, true)); };
        evs.forEach((e) => window.addEventListener(e, h, true));
      }
      document.addEventListener("visibilitychange", () => this._onVisibility());
      window.addEventListener("pagehide", () => this._onVisibility(true));
    } catch (e) { this._fail(e); }
    return this;
  }

  /** Call from any user gesture (button handler). Safe to call many times. */
  unlock() {
    if (!this.ok) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        try { this.ctx = new AC({ latencyHint: "interactive" }); } catch (_) { this.ctx = new AC(); }
        this._buildGraph();
        this.format = this._detectFormat();
        this._startPreload();
      }
      if (this.ctx.state !== "running" && !document.hidden) this.ctx.resume?.().catch(() => {});
      if (!this.unlocked) {
        // iOS: play a 1-sample silent buffer inside the gesture to fully unlock output.
        const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
        s.buffer = b; s.connect(this.ctx.destination); (s.start || s.noteOn).call(s, 0);
        this.unlocked = true;
        this._applyPending();
      }
    } catch (e) { this._fail(e); }
  }

  _buildGraph() {
    const c = this.ctx;
    const comp = c.createDynamicsCompressor(); // gentle safety limiter on master
    comp.threshold.value = -6; comp.knee.value = 6; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.bus.master = c.createGain();
    this.bus.master.connect(comp); comp.connect(c.destination);
    // VO duck stage: bus -> voDuck[bus] -> master, so bus volume, dialogue duck and VO duck never fight.
    this.voDuck = {};
    for (const b of BUSES) {
      if (b === "master") continue;
      this.bus[b] = c.createGain();
      if (b === "music" || b === "ambience" || b === "sfx") {
        const d = c.createGain(); this.bus[b].connect(d); d.connect(this.bus.master); this.voDuck[b] = d;
      } else this.bus[b].connect(this.bus.master);
    }
    this.musicDuck = c.createGain(); // separate node so duck & bus volume don't fight
    this.musicDuck.connect(this.bus.music);
    for (const b of BUSES) this._applyBus(b, 0);
  }

  _detectFormat() {
    try {
      const a = document.createElement("audio");
      const ogg = a.canPlayType('audio/ogg; codecs="vorbis"');
      const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (ogg && !isIOS) return "ogg";
      if (a.canPlayType('audio/mp4; codecs="mp4a.40.2"')) return "m4a";
      return ogg ? "ogg" : "m4a";
    } catch (_) { return "m4a"; }
  }

  _fail(e) { if (this.ok) console.warn("[GameAudio] disabled:", e); this.ok = false; }

  // ------------------------------------------------------------------ settings (persisted)
  _loadSettings() {
    const d = { vol: { ...DEFAULT_VOL }, mute: {}, hrtf: true };
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s) return { ...d, ...s, vol: { ...d.vol, ...(s.vol || {}) }, mute: { ...(s.mute || {}) } }; } catch (_) {}
    return d;
  }
  _saveSettings() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.settings)); } catch (_) {} }
  _applyBus(b, ramp = 0.05) {
    const g = this.bus[b]; if (!g) return;
    let v = this.settings.mute[b] ? 0 : this.settings.vol[b];
    if (this._paused && (b === "sfx" || b === "ambience" || b === "vo")) v *= 0.0;
    if (ramp) g.gain.setTargetAtTime(v, this.ctx.currentTime, ramp); else g.gain.value = v;
  }
  setVolume(bus, v) { if (!BUSES.includes(bus)) return; this.settings.vol[bus] = clamp(+v || 0, 0, 1); this._saveSettings(); if (this.ctx) this._applyBus(bus); }
  getVolume(bus) { return this.settings.vol[bus] ?? 0; }
  setMuted(bus, m) { if (!BUSES.includes(bus)) return; this.settings.mute[bus] = !!m; this._saveSettings(); if (this.ctx) this._applyBus(bus); }
  isMuted(bus) { return !!this.settings.mute[bus]; }
  toggleMute(bus = "master") { this.setMuted(bus, !this.isMuted(bus)); return this.isMuted(bus); }
  setHRTF(on) { this.hrtf = !!on; this.settings.hrtf = this.hrtf; this._saveSettings(); }
  get buses() { return BUSES.slice(); }

  /** Game pause menu: silences world (sfx + ambience) but keeps music & UI. */
  setPaused(p) { this._paused = !!p; if (this.ctx) { this._applyBus("sfx", 0.08); this._applyBus("ambience", 0.15); this._applyBus("vo", 0.08); } }

  _onVisibility(hide) {
    if (!this.ctx) return;
    try {
      if (hide || document.hidden) this.ctx.suspend?.();
      else if (this.unlocked) this.ctx.resume?.().catch(() => {});
    } catch (_) {}
  }

  // ------------------------------------------------------------------ loading
  _rebuildPools() {
    this.pools.clear();
    for (const [name, m] of Object.entries(this.manifest)) {
      if (m.pool) { if (!this.pools.has(m.pool)) this.pools.set(m.pool, []); this.pools.get(m.pool).push(name); }
    }
  }
  _startPreload() {
    const plan = this._preloadPlan ?? "all";
    let names = Object.keys(this.manifest);
    if (Array.isArray(plan)) names = plan.flatMap((n) => this.pools.get(n) || [n]);
    else if (plan === "essential") names = names.filter((n) => !/^music_|^amb_war|drone/.test(n));
    else if (plan === "none") names = [];
    // short sfx first, then loops/music
    names.sort((a, b) => (this.manifest[a].dur || 0) - (this.manifest[b].dur || 0));
    let i = 0; const next = () => { if (i < names.length) this.load(names[i++]).finally(next); };
    for (let k = 0; k < 4; k++) next();
  }
  /** Decode one sound (or every member of a pool). Resolves to the AudioBuffer or null. */
  load(name) {
    if (!this.ok || !this.ctx) return Promise.resolve(null);
    if (this.pools.has(name)) return Promise.all(this.pools.get(name).map((n) => this.load(n)));
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
    if (this.loading.has(name)) return this.loading.get(name);
    const m = this.manifest[name];
    if (!m) return Promise.resolve(null);
    const p = (async () => {
      let buf = null;
      if (m.src) {
        const fmts = this.format === "ogg" ? ["ogg", "m4a"] : ["m4a", "ogg"];
        for (const f of fmts) {
          try { buf = await this._fetchDecode(this.baseUrl + m.src + "." + f); if (buf) break; } catch (_) {}
        }
      }
      if (!buf) buf = this._synthBuffer(name, m);
      if (buf) this.buffers.set(name, buf); else this.failed.add(name);
      this.loading.delete(name);
      return buf;
    })();
    this.loading.set(name, p);
    return p;
  }
  async _fetchDecode(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + url);
    const ab = await res.arrayBuffer();
    return await new Promise((resolve, reject) => { // callback form for old Safari
      try { const r = this.ctx.decodeAudioData(ab, resolve, reject); if (r && r.then) r.then(resolve, reject); } catch (e) { reject(e); }
    });
  }
  _synthBuffer(name, m) {
    try {
      const recipe = typeof m.synth === "function" ? m.synth : SYNTH[m.synth] || SYNTH[synthFor(name)];
      if (!recipe) return null;
      const sr = Math.min(this.ctx.sampleRate, 44100);
      const seed = (parseInt((name.match(/(\d+)$/) || [0, 0])[1], 10) || 0);
      const data = recipe(sr, seed, name);
      const b = this.ctx.createBuffer(1, data.length, sr);
      (b.copyToChannel ? b.copyToChannel(data, 0) : b.getChannelData(0).set(data));
      if (m.loop) m._synthLoop = true;
      return b;
    } catch (e) { return null; }
  }
  /** Add a procedural sound at runtime: registerSynth("beep", (sr, seed, name) => Float32Array, {bus:"ui"}) */
  registerSynth(name, fn, meta = {}) { this.manifest[name] = { bus: "sfx", ...meta, synth: fn }; this._rebuildPools(); if (this.ctx) this.load(name); }
  isReady(name) { return this.pools.has(name) ? this.pools.get(name).every((n) => this.buffers.has(n)) : this.buffers.has(name); }
  progress() { const t = Object.keys(this.manifest).length; return t ? (this.buffers.size + this.failed.size) / t : 1; }

  // ------------------------------------------------------------------ one-shots
  _resolve(name) {
    const pool = this.pools.get(name);
    if (!pool) return name;
    if (pool.length === 1) return pool[0];
    const last = this.lastPick.get(name); let pick;
    do { pick = pool[(Math.random() * pool.length) | 0]; } while (pick === last);
    this.lastPick.set(name, pick);
    return pick;
  }

  /**
   * play(name, { volume=1, rate=1, randomPitch=0 (e.g. 0.06 = ±6%), pan=0 (-1..1), delay=0 (s),
   *              bus, loop=false, position:{x,y,z} (-> 3D), minGap=0.03 (s, spam guard) })
   * Returns a handle { stop(fade), setVolume(v), source } or null.
   */
  play(name, o = {}) {
    if (!this.ok || !this.ctx || !this.unlocked) return null;
    try {
      const real = this._resolve(name);
      const m = this.manifest[real]; if (!m) return null;
      const t = now(), gap = (o.minGap ?? 0.03) * 1000;
      if (t - (this.lastPlay.get(real) || 0) < gap) return null;
      this.lastPlay.set(real, t);
      const buf = this.buffers.get(real);
      if (!buf) { this.load(real); return null; } // still decoding: skip silently (it'll be ready next time)
      if (this.voices.size >= this.maxVoices) { const oldest = this.voices.values().next().value; oldest?.stop(0.02); }
      const c = this.ctx, src = c.createBufferSource();
      src.buffer = buf;
      let rate = o.rate ?? 1;
      if (o.randomPitch) rate *= 1 + (Math.random() * 2 - 1) * o.randomPitch;
      src.playbackRate.value = rate;
      if (o.loop || m.loop) this._setLoop(src, buf, m);
      const g = c.createGain(); g.gain.value = o.volume ?? 1;
      src.connect(g);
      let out = g;
      if (o.position) out = this._spatial(g, o.position, o).node;
      else if (o.pan) out = this._panNode(g, o.pan);
      out.connect(o.output || this.bus[o.bus || m.bus || "sfx"] || this.bus.sfx);
      const when = c.currentTime + (o.delay || 0);
      src.start(when, o.offset || 0);
      const h = { source: src, gain: g, name: real, stop: (f = 0.05) => { try { g.gain.setTargetAtTime(0, c.currentTime, f / 3); src.stop(c.currentTime + f + 0.02); } catch (_) {} },
        setVolume: (v, f = 0.05) => g.gain.setTargetAtTime(v, c.currentTime, f / 3) };
      this.voices.add(h);
      src.onended = () => { this.voices.delete(h); try { out.disconnect(); } catch (_) {} };
      return h;
    } catch (e) { return null; }
  }
  _setLoop(src, buf, m) {
    src.loop = true;
    // AAC priming guard: skip leading digital silence some decoders leave in, keep loop exactly loopLen.
    const d = buf.getChannelData(0); let i = 0; const lim = Math.min(d.length, 4096);
    while (i < lim && Math.abs(d[i]) < 1e-4) i++;
    if (i >= lim) i = 0;
    const start = i / buf.sampleRate, len = m.loopLen && !m._synthLoop ? m.loopLen : buf.duration - start;
    src.loopStart = start; src.loopEnd = Math.min(buf.duration, start + len);
  }
  _panNode(input, pan) {
    const c = this.ctx;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); input.connect(p); return p; }
    const p = c.createPanner(); p.panningModel = "equalpower"; this._setPos(p, clamp(pan, -1, 1), 0, -1 + Math.abs(pan)); input.connect(p); return p;
  }

  // ------------------------------------------------------------------ 3D positional
  _spatial(input, pos, o = {}) {
    const c = this.ctx, p = c.createPanner();
    try { p.panningModel = this.hrtf ? "HRTF" : "equalpower"; } catch (_) { p.panningModel = "equalpower"; }
    p.distanceModel = o.distanceModel || "inverse";
    p.refDistance = o.refDistance ?? 2;
    p.maxDistance = o.maxDistance ?? 60;
    p.rolloffFactor = o.rolloff ?? 1.1;
    const lpf = c.createBiquadFilter(); lpf.type = "lowpass"; lpf.Q.value = 0.5;
    input.connect(lpf); lpf.connect(p);
    const node = { node: p, filter: lpf, set: (x, y, z) => { this._setPos(p, x, y, z, 0.03); lpf.frequency.setTargetAtTime(this._airCutoff(x, y, z), c.currentTime, 0.05); } };
    this._setPos(p, pos.x || 0, pos.y ?? 1.2, pos.z || 0);
    lpf.frequency.value = this._airCutoff(pos.x || 0, pos.y ?? 1.2, pos.z || 0);
    return node;
  }
  // Snow and blizzard soak up highs at distance.
  _airCutoff(x, y, z) {
    const L = this.listener, d = Math.hypot(x - L.x, y - L.y, z - L.z);
    return clamp(18000 / (1 + d * (0.06 + 0.22 * this._blizzard)), 500, 18000);
  }
  _setPos(p, x, y, z, smooth = 0) {
    const t = this.ctx.currentTime;
    if (p.positionX) {
      if (smooth) { p.positionX.setTargetAtTime(x, t, smooth); p.positionY.setTargetAtTime(y, t, smooth); p.positionZ.setTargetAtTime(z, t, smooth); }
      else { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; }
    } else p.setPosition(x, y, z);
  }
  /** Listener in world space. yaw/pitch in radians (three.js YXZ camera convention: yaw 0 looks -Z). */
  setListener(x, y, z, yaw = 0, pitch = 0) {
    const cp = Math.cos(pitch);
    this._setListenerRaw(x, y, z, -Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp, 0, 1, 0);
  }
  /** Pass a three.js camera (or any Object3D). Reads matrixWorld; call once per frame after the camera moves. */
  setListenerFromObject(obj) {
    if (!obj || !obj.matrixWorld) return;
    obj.updateMatrixWorld?.();
    const e = obj.matrixWorld.elements;
    const fl = Math.hypot(e[8], e[9], e[10]) || 1, ul = Math.hypot(e[4], e[5], e[6]) || 1;
    this._setListenerRaw(e[12], e[13], e[14], -e[8] / fl, -e[9] / fl, -e[10] / fl, e[4] / ul, e[5] / ul, e[6] / ul);
  }
  _setListenerRaw(x, y, z, fx, fy, fz, ux, uy, uz) {
    Object.assign(this.listener, { x, y, z, fx, fy, fz });
    if (!this.ctx) return;
    try {
      const L = this.ctx.listener, t = this.ctx.currentTime, k = 0.02;
      if (L.positionX) {
        L.positionX.setTargetAtTime(x, t, k); L.positionY.setTargetAtTime(y, t, k); L.positionZ.setTargetAtTime(z, t, k);
        L.forwardX.setTargetAtTime(fx, t, k); L.forwardY.setTargetAtTime(fy, t, k); L.forwardZ.setTargetAtTime(fz, t, k);
        L.upX.setTargetAtTime(ux, t, k); L.upY.setTargetAtTime(uy, t, k); L.upZ.setTargetAtTime(uz, t, k);
      } else { L.setPosition(x, y, z); L.setOrientation(fx, fy, fz, ux, uy, uz); }
    } catch (_) {}
  }
  /** One-shot at a world position. */
  play3D(name, x, y, z, o = {}) { return this.play(name, { ...o, position: { x, y, z } }); }

  /**
   * A persistent sound source that follows something (enemy, fire, radio).
   *   const em = GameAudio.emitter({ x, y: 1.2, z });   // or emitter(enemyObjWithXZ)
   *   em.update(e.x, 1.2, e.z);  em.play("enemy_growl");  em.loop("amb_fire");  em.dispose();
   * Sounds played on an emitter keep tracking its position while they ring out.
   */
  emitter(init = {}, opts = {}) {
    const self = this;
    const em = {
      x: init.x || 0, y: init.y ?? 1.2, z: init.z || 0, _nodes: new Set(), _loop: null, disposed: false,
      update(x, y, z) {
        this.x = x; this.y = y ?? this.y; this.z = z;
        for (const n of this._nodes) n.set(this.x, this.y, this.z);
      },
      play(name, o = {}) {
        if (this.disposed || !self.ok || !self.ctx || !self.unlocked) return null;
        return self._playTracked(name, { ...opts, ...o }, this);
      },
      loop(name, o = {}) {
        if (this._loop && this._loop.name === name) return this._loop;
        this.stopLoop();
        this._loop = this.play(name, { bus: "ambience", ...o, loop: true, minGap: 0 });
        return this._loop;
      },
      stopLoop(f = 0.3) { this._loop?.stop(f); this._loop = null; },
      dispose() { this.stopLoop(0.2); this.disposed = true; this._nodes.clear(); },
    };
    return em;
  }
  _playTracked(name, o, em) {
    // same as play() but keeps the spatial node in em._nodes for live position updates
    const real = this._resolve(name), m = this.manifest[real];
    if (!m) return null;
    const buf = this.buffers.get(real);
    if (!buf) { this.load(real); return null; }
    const t = now(); if (t - (this.lastPlay.get(real + "@" + (em._id ||= Math.random())) || 0) < (o.minGap ?? 0.03) * 1000) return null;
    this.lastPlay.set(real + "@" + em._id, t);
    try {
      const c = this.ctx, src = c.createBufferSource(); src.buffer = buf;
      let rate = o.rate ?? 1; if (o.randomPitch) rate *= 1 + (Math.random() * 2 - 1) * o.randomPitch;
      src.playbackRate.value = rate;
      if (o.loop || m.loop) this._setLoop(src, buf, m);
      const g = c.createGain(); g.gain.value = o.volume ?? 1; src.connect(g);
      const sp = this._spatial(g, { x: em.x, y: em.y, z: em.z }, o);
      sp.node.connect(this.bus[o.bus || m.bus || "sfx"] || this.bus.sfx);
      em._nodes.add(sp);
      if (this.voices.size >= this.maxVoices) { const oldest = this.voices.values().next().value; oldest?.stop(0.02); }
      src.start(c.currentTime + (o.delay || 0));
      const h = { source: src, gain: g, name: real, stop: (f = 0.05) => { try { g.gain.setTargetAtTime(0, c.currentTime, f / 3); src.stop(c.currentTime + f + 0.02); } catch (_) {} },
        setVolume: (v, f = 0.05) => g.gain.setTargetAtTime(v, c.currentTime, f / 3) };
      this.voices.add(h);
      src.onended = () => { this.voices.delete(h); em._nodes.delete(sp); try { sp.node.disconnect(); } catch (_) {} };
      return h;
    } catch (_) { return null; }
  }
  /** Plain distance attenuation (0..1) for code that wants volume without a PannerNode. */
  distanceGain(dist, ref = 2, max = 40, rolloff = 1.1) {
    if (dist >= max) return 0;
    const g = ref / (ref + rolloff * Math.max(0, dist - ref));
    return clamp(g * (1 - Math.pow(dist / max, 4)), 0, 1);
  }
  /** Stereo pan (-1..1) of a world point relative to the listener's facing. */
  panFor(x, z) {
    const L = this.listener, dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz) || 1;
    const rx = -L.fz, rz = L.fx; // right vector on XZ plane
    return clamp((dx * rx + dz * rz) / d, -1, 1);
  }

  // ------------------------------------------------------------------ footsteps
  /**
   * Call every frame: footsteps(dt, { moving, sprint, speed (m/s, optional), surface: "snow"|"hard" })
   * Steps fire by distance travelled, so speed changes the cadence naturally.
   */
  footsteps(dt, { moving = false, sprint = false, speed, surface = "snow", volume = 1 } = {}) {
    if (!moving) { this._foot.dist = Math.min(this._foot.dist, 0.9); return; }
    const v = speed ?? (sprint ? 4.85 : 3.15);
    const stride = sprint ? 1.65 : 1.4;
    this._foot.dist += v * dt;
    if (this._foot.dist >= stride) {
      this._foot.dist -= stride;
      this._foot.side *= -1;
      this.play("footstep_" + surface, { volume: (sprint ? 0.9 : 0.6) * volume, randomPitch: 0.07, pan: 0.12 * this._foot.side, minGap: 0.12 });
    }
  }

  /** Geiger counter: call every frame with level 0..1 (e.g. rad zone strength or stats.rad/100). */
  geiger(dt, level) {
    if (!(level > 0.01)) return;
    const rate = 0.5 + level * level * 40; // clicks per second
    if (Math.random() < 1 - Math.exp(-rate * dt)) this.play("geiger_click", { volume: 0.5 + 0.5 * Math.random(), randomPitch: 0.1, minGap: 0.012, bus: "ui" });
  }

  // ------------------------------------------------------------------ ambience
  /** Set a looping ambience layer volume (0..1) with fade. layer: wind|blizzard|fire|war or any loop name. */
  setLayer(layer, vol, fade = 1.5, sound) {
    const name = sound || AMB_LAYERS[layer] || layer;
    const L = this.amb[layer] || (this.amb[layer] = { name, target: 0, gain: null, src: null });
    if (sound && L.name !== sound && !L.src) L.name = sound;
    L.target = clamp(vol, 0, 1);
    if (!this.ctx || !this.unlocked) return;
    const c = this.ctx;
    if (L.target > 0.001 && !L.src) {
      const buf = this.buffers.get(L.name);
      if (!buf) { this.load(L.name).then((b) => { if (b) this.setLayer(layer, L.target, fade); }); return; }
      const src = c.createBufferSource(); src.buffer = buf; this._setLoop(src, buf, this.manifest[L.name] || {});
      const g = c.createGain(); g.gain.value = 0; src.connect(g); g.connect(this.bus[(this.manifest[L.name] || {}).bus || "ambience"] || this.bus.ambience);
      src.start(c.currentTime, src.loopStart + Math.random() * (src.loopEnd - src.loopStart)); // random phase so layers don't line up
      L.src = src; L.gain = g;
    }
    if (L.gain) {
      L.gain.gain.cancelScheduledValues(c.currentTime);
      L.gain.gain.setTargetAtTime(L.target, c.currentTime, Math.max(0.01, fade / 3));
      clearTimeout(L._stopT);
      if (L.target <= 0.001) L._stopT = setTimeout(() => { if (L.target <= 0.001 && L.src) { try { L.src.stop(); } catch (_) {} L.src = null; L.gain = null; } }, fade * 1000 + 500);
    }
  }
  /** Wind 0..1 (calm breeze -> strong wind). */
  setWind(v, fade = 1.5) { this._wind = clamp(v, 0, 1); this._mixWeather(fade); }
  /** Blizzard 0..1: equal-power crossfade wind -> blizzard; also muffles distant 3D sounds. */
  setBlizzard(v, fade = 3) { this._blizzard = clamp(v, 0, 1); this._mixWeather(fade); }
  _mixWeather(fade) {
    const w = this._wind ?? 0.5, b = this._blizzard || 0;
    this.setLayer("wind", (0.35 + 0.65 * w) * Math.cos(b * Math.PI / 2), fade);
    this.setLayer("blizzard", Math.sin(b * Math.PI / 2), fade);
  }
  /** Convenience: setWeather({ wind, blizzard, fire, war }) - any subset. */
  setWeather({ wind, blizzard, fire, war } = {}, fade = 2) {
    if (wind != null) this._wind = clamp(wind, 0, 1);
    if (blizzard != null) this._blizzard = clamp(+blizzard, 0, 1);
    if (wind != null || blizzard != null) this._mixWeather(fade);
    if (fire != null) this.setLayer("fire", fire, fade);
    if (war != null) this.setLayer("war", war, fade);
  }
  stopAmbience(fade = 1.5) { for (const k of Object.keys(this.amb)) this.setLayer(k, 0, fade); }

  // ------------------------------------------------------------------ music
  /** playMusic("blackout"|"collapse"|"civil_war"|"nuclear_winter" | "music_xxx", { fade=4, volume=1 }) */
  playMusic(act, { fade = 4, volume = 1 } = {}) {
    const name = act && (act.startsWith("music_") ? act : "music_" + act);
    if (!name || !this.manifest[name]) return;
    this.pendingMusic = { name, fade, volume };
    if (!this.ctx || !this.unlocked) return;
    if (this.music.name === name && this.music.src) { this.music.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, fade / 3); return; }
    const buf = this.buffers.get(name);
    if (!buf) { this.load(name).then(() => { if (this.pendingMusic?.name === name) this.playMusic(act, { fade, volume }); }); return; }
    const c = this.ctx, t = c.currentTime;
    this._stopMusicNodes(fade);
    const src = c.createBufferSource(); src.buffer = buf; this._setLoop(src, buf, this.manifest[name]);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(volume, t, fade / 3);
    src.connect(g); g.connect(this.musicDuck);
    src.start(t, src.loopStart);
    this.music = { ...this.music, name, src, gain: g };
  }
  /** Music for a chapter number (1..10) using chapterToAct. */
  setChapter(n, o) { const act = this.chapterToAct[n] || this.chapterToAct[parseInt(String(n).replace(/\D/g, ""), 10)]; if (act) this.playMusic(act, o); return act; }
  stopMusic(fade = 3) { this.pendingMusic = null; this._stopMusicNodes(fade); this.music.name = null; }
  _stopMusicNodes(fade) {
    const { src, gain } = this.music; if (!src) return;
    const t = this.ctx.currentTime;
    try { gain.gain.cancelScheduledValues(t); gain.gain.setTargetAtTime(0, t, fade / 3); src.stop(t + fade + 0.5); } catch (_) {}
    this.music.src = null; this.music.gain = null;
  }
  /** Duck music under dialogue/radio: duckMusic(true) / duckMusic(false). amount = level while ducked. */
  duckMusic(on, amount = 0.35, fade = 0.4) { if (this.musicDuck) this.musicDuck.gain.setTargetAtTime(on ? amount : 1, this.ctx.currentTime, fade / 3); }

  _applyPending() {
    if (this.pendingMusic) { const p = this.pendingMusic; this.playMusic(p.name, p); }
    for (const [k, L] of Object.entries(this.amb)) if (L.target > 0) this.setLayer(k, L.target, 2);
  }

  // ------------------------------------------------------------------ voice-over
  // Files live in audio/vo/ (see vo/manifest.json, generated by tools/vo/render.py). Everything is lazy:
  // the manifest is fetched on first use, compressed bytes are prefetched by preloadVO(), and buffers are
  // decoded on demand into a small LRU (VO_CACHE_SECONDS). Story lines duck music/ambience; barks duck lightly.
  /** Fetch vo/manifest.json once. Resolves to the manifest or null (no VO shipped -> every VO call is a no-op). */
  voReady() {
    const V = this.vo;
    if (V.manifest) return Promise.resolve(V.manifest);
    if (!V.loading) {
      const url = V.url || this.baseUrl + "vo/manifest.json";
      V.loading = (typeof fetch === "function" ? fetch(url) : Promise.reject(new Error("no fetch")))
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => {
          if (!m || !m.lines) { V.loading = null; return null; }
          V.manifest = m; V.byText = new Map();
          for (const [id, L] of Object.entries(m.lines)) { const k = normText(L.t); if (!V.byText.has(k)) V.byText.set(k, []); V.byText.get(k).push(id); }
          return m;
        })
        .catch(() => { V.loading = null; return null; });
    }
    return V.loading;
  }
  /** Line metadata { c, t, a, ch, f, d, m } or null (sync; null until voReady() resolved). */
  lineInfo(lineId) { return this.vo.manifest?.lines?.[lineId] || null; }
  hasLine(lineId) { return !!this.lineInfo(lineId); }
  /** Find the line id for a displayed text (+ optional speaker display name). Used by the zero-edit dialogue hook. */
  lineIdFor(text, speakerName) {
    const V = this.vo; if (!V.byText) return null;
    const ids = V.byText.get(normText(text)); if (!ids || !ids.length) return null;
    if (ids.length === 1 || !speakerName) return ids[0];
    const want = normText(speakerName);
    return ids.find((id) => normText(V.manifest.characters?.[V.manifest.lines[id].c]?.name || "") === want
      || want.includes(V.manifest.lines[id].c.replace(/_/g, " "))) || ids[0];
  }
  _voFormats() {
    if (!this._voFmt) {
      let opus = false;
      try { opus = !!document.createElement("audio").canPlayType('audio/ogg; codecs="opus"'); } catch (_) {}
      const isIOS = typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
      this._voFmt = opus && !isIOS ? ["ogg", "m4a"] : ["m4a", "ogg"];
    }
    return this._voFmt;
  }
  _voBytes(f, ext) {
    const V = this.vo, key = f + "." + ext;
    V.bytes ||= new Map();
    if (V.bytes.has(key)) return V.bytes.get(key);
    const p = fetch(this.baseUrl + key).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    V.bytes.set(key, p);
    p.then((ab) => { if (!ab) V.bytes.delete(key); });
    return p;
  }
  /** Decoded AudioBuffer for a VO file (no extension). LRU-cached. */
  _voLoad(f) {
    const V = this.vo;
    if (V.buffers.has(f)) { const b = V.buffers.get(f); V.buffers.delete(f); V.buffers.set(f, b); return Promise.resolve(b); }
    if (V.pending.has(f)) return V.pending.get(f);
    if (!this.ok || !this.ctx) return Promise.resolve(null);
    const p = (async () => {
      let buf = null;
      for (const ext of this._voFormats()) {
        const ab = await this._voBytes(f, ext); if (!ab) continue;
        try {
          buf = await new Promise((res, rej) => { const r = this.ctx.decodeAudioData(ab.slice(0), res, rej); if (r && r.then) r.then(res, rej); });
        } catch (_) { buf = null; }
        if (buf) break;
      }
      V.pending.delete(f);
      if (buf) {
        V.buffers.set(f, buf);
        let tot = 0; for (const b of V.buffers.values()) tot += b.duration;
        for (const [k, b] of V.buffers) { if (tot <= VO_CACHE_SECONDS) break; if (V.current?.f === k || k === f) continue; V.buffers.delete(k); tot -= b.duration; }
      }
      return buf;
    })();
    V.pending.set(f, p);
    return p;
  }
  /**
   * Prefetch compressed VO (cheap, ~2 KB per second of speech). Any subset:
   *   preloadVO({ chapter: "ch02" }) | ({ scene: "ch02_strand_registry" }) | ({ character: "ray" }) | ({ act: "civil_war" })
   *   preloadVO({ barks: ["raider", "husk"] })   // faction names or enemy kinds
   * Resolves to the number of files fetched. decode: true also decodes them (uses memory; only for a scene).
   */
  preloadVO(sel = {}) {
    return this.voReady().then((m) => {
      if (!m || typeof fetch !== "function") return 0;
      const files = [];
      if (sel.chapter || sel.scene || sel.character || sel.act) {
        for (const [id, L] of Object.entries(m.lines)) {
          if (sel.chapter && L.ch !== sel.chapter) continue;
          if (sel.scene && !id.startsWith(sel.scene + ".")) continue;
          if (sel.character && L.c !== sel.character) continue;
          if (sel.act && L.a !== sel.act) continue;
          files.push(L.f);
        }
      }
      for (const who of [].concat(sel.barks || [])) {
        const F = m.barks[who] || m.barks[m.alias?.[who]];
        if (F) for (const arr of Object.values(F)) for (const B of arr) files.push(B.f);
      }
      const fmt = this._voFormats()[0];
      let i = 0, n = 0;
      const next = () => (i < files.length
        ? (sel.decode && this.ctx ? this._voLoad(files[i++]) : this._voBytes(files[i++], fmt)).then(() => { n++; return next(); })
        : Promise.resolve());
      return Promise.all([next(), next(), next(), next()]).then(() => n);
    });
  }
  /**
   * Speak a story line. lineId = "<scene>.<node>" exactly as in story/dialogue (e.g. "ch01_ray_garage.r1").
   *   playLine("ray", "ch01_ray_garage.r1")                     // 2D, centred (dialogue)
   *   playLine("ruiz", id, { emitter: npc.sfx })                 // 3D, follows an A.emitter()
   *   playLine("bea", id, { position: {x,y,z}, radio: true })     // runtime walkie-talkie chain
   * opts: volume, rate, delay, pan, emitter, position, radio, interrupt (default true: stops the previous line),
   *       subtitle (default true), onStart(h), onEnd(h), refDistance, rolloff, maxDistance.
   * Resolves to a handle { id, character, text, duration, ended: Promise, stop(fade), setVolume(v) } or null.
   * `character` is informational (may be null); the line id decides the file.
   */
  playLine(character, lineId, o = {}) {
    if (lineId == null || typeof lineId === "object") { o = lineId || {}; lineId = character; character = null; }
    if (!this.ok) return Promise.resolve(null);
    if (o.source !== "auto") this.vo.explicit = true;
    const token = (this.vo.token = (this.vo.token || 0) + 1);
    if (o.interrupt !== false) this.stopLine(0.08);
    return this.voReady().then((m) => {
      const L = m?.lines?.[lineId];
      if (!L) { if (m && typeof console !== "undefined") console.debug?.("[GameAudio] no VO for", lineId); return null; }
      return this._voLoad(L.f).then((buf) => {
        if (!buf || token !== this.vo.token) return null;   // missing, or superseded by a newer line
        return this._voStart(buf, { ...o, kind: "line", text: L.t, who: L.c || character, id: lineId, f: L.f, baked: L.m });
      });
    });
  }
  /** Same as playLine for a dialogue node: playNode(dlg.id, nodeId). */
  playNode(sceneId, nodeId, o = {}) { return this.playLine(null, sceneId + "." + nodeId, o); }
  /**
   * Combat / ambient bark. who = bark faction ("raider", "ironwood", "husk", ...) or an enemy kind from js/enemies.js
   * ("bridge_boy", "ironwood_patrol", "remnant_patrol", "ironwood_drone", ...). type: spot|attack|hurt|death|idle|greet|trade.
   * Variants come from a shuffle bag (never the same twice in a row, all heard before repeats) and get ±3% pitch.
   * opts: emitter | position (3D), volume, minGap (s per faction+type+emitter, default 2.2), force, subtitle.
   */
  playBark(who, type = "spot", o = {}) {
    if (!this.ok) return Promise.resolve(null);
    return this.voReady().then((m) => {
      if (!m) return null;
      const fac = m.barks[who] ? who : m.alias?.[who];
      const list = fac && m.barks[fac]?.[type];
      if (!list || !list.length) return null;
      const em = o.emitter; if (em && !em._id) em._id = Math.random();
      const key = fac + "." + type + "@" + (em ? em._id : "g"), t = now();
      if (!o.force && t - (this.vo.lastBark.get(key) || 0) < (o.minGap ?? 2.2) * 1000) return null;
      let n = 0; for (const h of this.vo.active) if (h.kind === "bark") n++;
      if (!o.force && n >= 3) return null;
      this.vo.lastBark.set(key, t);
      const B = list[this._voBag(fac + "." + type, list.length)];
      return this._voLoad(B.f).then((buf) => (buf ? this._voStart(buf, {
        randomPitch: 0.03, ...o, volume: (o.volume ?? 1) * (this.vo.current ? 0.6 : 1), kind: "bark", text: B.t, who: fac, id: B.id, f: B.f, baked: B.m,
        subtitle: o.subtitle ?? this.vo.barkSubtitles }) : null));
    });
  }
  /** Subscribe to subtitles: cb(text, character, durationSeconds, handle). Fires when audio actually starts. Returns unsubscribe. */
  onLine(cb) { if (typeof cb !== "function") return () => {}; this.vo.listeners.add(cb); return () => this.vo.listeners.delete(cb); }
  /** Barks also fire onLine() when true (default false). */
  set barkSubtitles(v) { this.vo.barkSubtitles = !!v; }
  get barkSubtitles() { return !!this.vo.barkSubtitles; }
  isSpeaking() { return !!this.vo.current; }
  stopLine(fade = 0.1) { this.vo.current?.stop(fade); this.vo.current = null; }
  stopVO(fade = 0.1) { this.vo.token = (this.vo.token || 0) + 1; for (const h of [...this.vo.active]) h.stop(fade); this.vo.current = null; }
  /** Override how far a story line ducks the other buses (0..1 each), e.g. setVODuck({ music: 0.3 }). */
  setVODuck(levels = {}) { Object.assign(VO_DUCK.line, levels); this._voDuckUpdate(); }
  _voBag(key, n) {
    let b = this.vo.bags.get(key);
    if (!b || !b.left.length) {
      const left = [...Array(n).keys()];
      for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [left[i], left[j]] = [left[j], left[i]]; }
      if (n > 1 && b && left[left.length - 1] === b.last) left.unshift(left.pop());
      b = { left, last: b?.last }; this.vo.bags.set(key, b);
    }
    const i = b.left.pop(); b.last = i; return i;
  }
  _voStart(buf, o) {
    if (!this.ctx || !this.unlocked) return null;
    try {
      const c = this.ctx, src = c.createBufferSource(); src.buffer = buf;
      let rate = o.rate ?? 1; if (o.randomPitch) rate *= 1 + (Math.random() * 2 - 1) * o.randomPitch;
      src.playbackRate.value = rate;
      const g = c.createGain(); g.gain.value = o.volume ?? 1; src.connect(g);
      const dur = buf.duration / rate, when = c.currentTime + (o.delay || 0);
      let out = g, R = null, sp = null;
      if (o.radio && o.baked !== "radio" && o.baked !== "ham") { R = this._radioFx(g, when, dur); out = R.node; }
      const so = { refDistance: 2.5, rolloff: 1.0, maxDistance: 50, ...o };
      if (o.emitter && !o.emitter.disposed) { const em = o.emitter; sp = this._spatial(out, { x: em.x, y: em.y, z: em.z }, so); em._nodes.add(sp); out = sp.node; }
      else if (o.position) { sp = this._spatial(out, o.position, so); out = sp.node; }
      else if (o.pan) out = this._panNode(out, o.pan);
      out.connect(this.bus.vo);
      src.start(when);
      let done; const ended = new Promise((r) => (done = r));
      const h = { id: o.id, character: o.who, text: o.text, kind: o.kind, duration: dur, f: o.f, source: src, ended,
        stop: (f = 0.08) => { try { g.gain.setTargetAtTime(0, c.currentTime, f / 3); src.stop(c.currentTime + f + 0.02); } catch (_) {} },
        setVolume: (v, f = 0.05) => g.gain.setTargetAtTime(v, c.currentTime, f / 3) };
      this.vo.active.add(h); if (o.kind === "line") this.vo.current = h;
      this._voDuckUpdate();
      src.onended = () => {
        this.vo.active.delete(h); if (this.vo.current === h) this.vo.current = null;
        if (sp && o.emitter) o.emitter._nodes.delete(sp);
        R?.stop(); setTimeout(() => { try { out.disconnect(); } catch (_) {} }, R ? 400 : 0);
        this._voDuckUpdate();
        try { o.onEnd?.(h); } catch (_) {}
        done(h);
      };
      const fire = () => {
        if (o.subtitle === false || (o.kind !== "line" && !o.subtitle)) return;
        for (const cb of this.vo.listeners) { try { cb(o.text, o.who, dur, h); } catch (e) { console.warn("[GameAudio] onLine", e); } }
      };
      const start = () => { fire(); try { o.onStart?.(h); } catch (_) {} };
      if (o.delay) setTimeout(start, o.delay * 1000); else start();
      return h;
    } catch (e) { return null; }
  }
  _voDuckUpdate() {
    if (!this.ctx || !this.voDuck) return;
    const lvl = { music: 1, ambience: 1, sfx: 1 };
    for (const h of this.vo.active) { const d = VO_DUCK[h.kind] || VO_DUCK.bark; for (const k in lvl) lvl[k] = Math.min(lvl[k], d[k] ?? 1); }
    const apply = () => { const t = this.ctx.currentTime; for (const k in lvl) this.voDuck[k]?.gain.setTargetAtTime(lvl[k], t, lvl[k] < 1 ? 0.06 : 0.25); };
    clearTimeout(this._voDuckT);
    // ducking down is immediate; coming back up waits a beat so back-to-back lines don't pump the music
    if (Object.values(lvl).every((v) => v >= 1)) this._voDuckT = setTimeout(apply, 350); else apply();
  }
  /** Runtime walkie-talkie: band-limit + drive + static bed + squelch open/close. For lines not baked as radio. */
  _radioFx(input, when, dur) {
    const c = this.ctx;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 430; hp.Q.value = 0.8;
    const pk = c.createBiquadFilter(); pk.type = "peaking"; pk.frequency.value = 1600; pk.gain.value = 6; pk.Q.value = 1.2;
    const ws = c.createWaveShaper(); ws.curve = this._radioCurve || (this._radioCurve = driveCurve(3.5)); ws.oversample = "2x";
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2800; lp.Q.value = 0.8;
    const out = c.createGain(); out.gain.value = 0.85;
    input.connect(hp); hp.connect(pk); pk.connect(ws); ws.connect(lp); lp.connect(out);
    if (!this._noiseBuf) {
      const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 4 : 1);
      this._noiseBuf = b;
    }
    const ns = c.createBufferSource(); ns.buffer = this._noiseBuf; ns.loop = true;
    const nf = c.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 1900; nf.Q.value = 0.5;
    const ng = c.createGain(); ns.connect(nf); nf.connect(ng); ng.connect(out);
    const G = ng.gain, t0 = Math.max(c.currentTime, when - 0.06), t1 = when + dur;
    G.setValueAtTime(0, c.currentTime); G.setValueAtTime(0.35, t0); G.setTargetAtTime(0.03, t0 + 0.02, 0.015);   // key-up click
    G.setValueAtTime(0.03, t1); G.linearRampToValueAtTime(0.3, t1 + 0.02); G.setTargetAtTime(0, t1 + 0.1, 0.04); // 'kssht'
    ns.start(t0); ns.stop(t1 + 0.35);
    return { node: out, stop: () => {} };
  }

  stopAll(fade = 0.2) { for (const v of [...this.voices]) v.stop(fade); this.stopVO(fade); this.stopAmbience(fade); this.stopMusic(fade); }
  list() { return Object.keys(this.manifest); }
  poolNames() { return [...this.pools.keys()]; }
}

// ---------------------------------------------------------------------------------------------
// Drop-in replacement for the prototype's js/audio.js `AudioBus` (same method names),
// so the swap is one import line:  import { AudioBusCompat as AudioBus } from "../audio/audio.js";
// ---------------------------------------------------------------------------------------------
export class AudioBusCompat {
  constructor(engine = GameAudio) { this.a = engine; if (!engine._listening) engine.init(); }
  get unlocked() { return this.a.unlocked; }
  get ctx() { return this.a.ctx; }
  unlock() { this.a.unlock(); if (this.a.amb.wind == null) this.a.setWind(0.4); }
  setWind(amount) { this.a.setWind(amount); }
  foot(snow = true) { this.a.play(snow ? "footstep_snow" : "footstep_hard", { volume: 0.7, randomPitch: 0.07 }); }
  maybeFoot(dt, moving, sprint) { this.a.footsteps(dt, { moving, sprint }); }
  gunshot(heavy = true) { this.a.play(heavy ? "gun_shotgun" : "gun_pistol", { randomPitch: 0.03 }); }
  melee() { this.a.play("melee_swing", { randomPitch: 0.08 }); }
  hit() { this.a.play("melee_hit", { randomPitch: 0.06 }); }
  growl() { this.a.play("enemy_growl", { volume: 0.8, randomPitch: 0.08 }); }
  pickup() { this.a.play("pickup"); }
  craft() { this.a.play("craft_hammer"); }
  ui() { this.a.play("ui_click"); }
  fireloop() { this.a.setLayer("fire", 0.6, 0.3); clearTimeout(this._fT); this._fT = setTimeout(() => this.a.setLayer("fire", 0, 1.5), 1500); }
  radio() { this.a.play("radio_static", { volume: 0.7 }); }
  hurt() { this.a.play("player_hurt", { randomPitch: 0.05 }); }
}

export const GameAudio = new AudioEngine();

// ---------------------------------------------------------------------------------------------
// Zero-edit integration with Echo's js/audioHook.js: it imports ./audio/audio.js, calls
// attachAshfallAudio({ THREE, scene, camera, fallback }) and then uses the AudioBus-style methods
// below. Every method returns `true` so audioHook's `?? fallback.x()` never double-plays the old synth.
// The per-frame tick piggybacks on maybeFoot() (called every frame by game.js) to update the 3D
// listener from the camera and, if window.__ASHFALL is present, follow chapter -> act music,
// pause/dialogue ducking and the geiger counter. Explicit calls (README) override all of this.
// ---------------------------------------------------------------------------------------------
export function attachAshfallAudio(ctx = {}) {
  const A = GameAudio;
  if (!A._listening) A.init();
  const camera = ctx.camera || null;
  const G = () => (typeof window !== "undefined" ? window.__ASHFALL : null);
  const equipped = () => { try { return G()?.player?.equipped || ""; } catch (_) { return ""; } };
  let lastChapter = null, lastMode = null, autoMusic = true, started = false, lastVOChapter = null, autoVO = true, lastPanelKey = null, voT = 0;
  // Zero-edit dialogue VO: watch #panel (js/game.js _showNode) and voice the displayed line, matched by its text
  // (+ the .who name when two characters share a line). Narrator/Dell lines have no VO -> the previous line stops.
  // Switches itself off as soon as the game calls playLine()/playNode() directly (A.vo.explicit).
  const voWatch = () => {
    if (typeof document === "undefined" || now() - voT < 90) return; voT = now();
    const panel = document.getElementById("panel"); if (!panel) return;
    const lineEl = panel.classList.contains("show") ? panel.querySelector(".line") : null;
    const who = panel.querySelector(".who")?.textContent || "";
    const key = lineEl ? who + "|" + lineEl.textContent : null;
    if (key === lastPanelKey) return;
    lastPanelKey = key;
    if (!key) { A.stopLine(0.2); return; }
    A.voReady().then(() => {
      if (lastPanelKey !== key) return;
      const id = A.lineIdFor(lineEl.textContent, who);
      if (id) A.playLine(null, id, { source: "auto" }); else A.stopLine(0.12);
    });
  };
  const tick = (dt) => {
    if (camera) A.setListenerFromObject(camera);
    const g = G(); if (!g) return;
    try {
      const mode = g.mode;
      if (mode !== lastMode) {
        lastMode = mode;
        A.setPaused(mode === "pause" || mode === "title" || mode === "dead");
        A.duckMusic(mode === "dialogue" || mode === "searching", 0.4);
      }
      const ch = g.flags?.chapter || "ch01";
      if (autoMusic && ch !== lastChapter) { lastChapter = ch; A.setChapter(ch, { fade: 5 }); }
      if (ch !== lastVOChapter) {   // prefetch this chapter's lines + the act's bark factions (compressed, small)
        lastVOChapter = ch; const chId = /^ch\d\d$/.test(String(ch)) ? ch : "ch" + String(parseInt(String(ch).replace(/\D/g, ""), 10) || 1).padStart(2, "0");
        A.preloadVO({ chapter: chId, barks: ACT_BARKS[A.chapterToAct[parseInt(chId.slice(2), 10)]] || [] });
      }
      if (autoVO && !A.vo.explicit) voWatch();
      const st = g.player?.stats;
      if (st && st.rad > 8) A.geiger(dt, Math.min(1, st.rad / 100));
    } catch (_) {}
  };
  // Own rAF tick so music/listener/pause follow the game even in menus and dialogue (maybeFoot only runs in play).
  let lastT = 0;
  const loop = (t) => { const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0; lastT = t; tick(dt); requestAnimationFrame(loop); };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(loop);
  const api = {
    engine: A,
    unlock() { A.unlock(); if (!started) { started = true; if (A._wind == null) A.setWind(0.4); } return true; },
    resume() { return api.unlock(); },
    setWind(v) { const b = v >= 0.9 ? 1 : 0; if (b !== (A._blizzard > 0.5 ? 1 : 0)) A.setBlizzard(b, 4); A.setWind(Math.min(1, v), 2); return true; },
    setBlizzard(v) { A.setBlizzard(+v, 4); return true; },
    foot(snow = true) { A.play(snow ? "footstep_snow" : "footstep_hard", { volume: 0.7, randomPitch: 0.07 }); return true; },
    maybeFoot(dt, moving, sprint) { A.footsteps(dt, { moving, sprint }); return true; },
    gunshot(heavy) {
      const id = equipped();
      if (id === "molotov") A.play("molotov_ignite", { delay: 0.35 }), A.play("melee_swing", { volume: 0.6 });
      else A.play(id === "pistol" ? "gun_pistol" : id === "blaster" ? "gun_shotgun" : heavy ? "gun_shotgun" : "gun_pistol", { randomPitch: 0.03, minGap: 0 });
      return true;
    },
    melee() { A.play("melee_swing", { randomPitch: 0.08 }); return true; },
    hit() { const gun = /pistol|blaster|rifle/.test(equipped()); A.play(gun ? "melee_hit_2" : "melee_hit", { volume: gun ? 0.45 : 1, randomPitch: 0.06, delay: gun ? 0.05 : 0 }); return true; },
    growl() { A.play("enemy_growl", { volume: 0.8, randomPitch: 0.08 }); return true; },
    pickup() { A.play("pickup"); return true; },
    craft() { A.play("craft_hammer"); return true; },
    rummage() { A.play("craft_cloth", { volume: 0.6, randomPitch: 0.1 }); return true; },
    ui() {
      // game.js plays ui() right after starting a reload (reloadT = 1.1): give it the real reload sound.
      const p = G()?.player;
      if (p && p.reloadT > 1.0) { A.play(equipped() === "blaster" ? "reload_shotgun" : "reload_pistol", { minGap: 0.5 }); return true; }
      A.play("ui_click"); return true;
    },
    hurt() { A.play("player_hurt", { randomPitch: 0.05, minGap: 0.25 }); return true; },
    radio() { A.play("radio_static", { volume: 0.7 }); return true; },
    fireloop() { A.setLayer("fire", 0.6, 0.3); clearTimeout(api._fT); api._fT = setTimeout(() => A.setLayer("fire", 0, 1.5), 1500); return true; },
    play(name, o) { A.play(name, o); return true; },
    setAutoMusic(on) { autoMusic = !!on; return true; },
    /** Turn the #panel text-matching VO off/on (it also turns off by itself once you call playLine yourself). */
    setAutoVO(on) { autoVO = !!on; if (!on) A.stopLine(0.1); return true; },
    playLine(c, id, o) { return A.playLine(c, id, o); },
    playNode(s, n, o) { return A.playNode(s, n, o); },
    playBark(who, type, o) { return A.playBark(who, type, o); },
    onLine(cb) { return A.onLine(cb); },
    stopVO(f) { A.stopVO(f); return true; },
  };
  return api;
}

export { AudioEngine, SYNTH };
export default GameAudio;
if (typeof window !== "undefined") window.GameAudio = GameAudio;
