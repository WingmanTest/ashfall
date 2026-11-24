// Clean audio hook for Echoes' manager in /audio/. Never writes there.
// If a usable module is present it is used; otherwise the built-in WebAudio synth (js/audio.js).
import { AudioBus } from "./audio.js?v=r14.1";
import { tryImport, listDir } from "./load.js?v=r14.1";

const CANDIDATES = [
  "./audio/audio.js",
];

function isUsable(mod) {
  if (!mod) return false;
  if (typeof mod.AudioBusCompat === "function") return true;
  const fns = [
    "attachAshfallAudio", "createAudio", "createAudioManager", "createManager",
    "integrate", "default",
  ];
  if (fns.some((k) => typeof mod[k] === "function")) return true;
  if (typeof mod.AudioManager === "function" || typeof mod.AudioBus === "function") return true;
  if (mod.default && (typeof mod.default.attach === "function" || typeof mod.default.play === "function")) return true;
  return false;
}

async function attach(mod, ctx) {
  // Echoes: init with preload "essential" BEFORE attach (attach only inits when not yet listening),
  // so the 1,368 VO files stream lazily instead of preloading on iPhone.
  try {
    const A = mod.GameAudio || (typeof window !== "undefined" ? window.GameAudio : null);
    if (A && !A._listening && typeof A.init === "function") A.init({ preload: "essential" });
  } catch (err) { console.warn("[audio] essential init", err); }
  if (typeof mod.attachAshfallAudio === "function") return await mod.attachAshfallAudio(ctx);
  if (typeof mod.AudioBusCompat === "function") return new mod.AudioBusCompat(mod.GameAudio);
  if (typeof mod.createAudioManager === "function") return await mod.createAudioManager(ctx);
  if (typeof mod.createAudio === "function") return await mod.createAudio(ctx);
  if (typeof mod.createManager === "function") return await mod.createManager(ctx);
  if (typeof mod.integrate === "function") return await mod.integrate(ctx);
  if (typeof mod.default === "function") return await mod.default(ctx);
  if (typeof mod.AudioManager === "function") return new mod.AudioManager(ctx);
  if (typeof mod.AudioBus === "function") return new mod.AudioBus(ctx);
  if (mod.default && typeof mod.default.attach === "function") return await mod.default.attach(ctx);
  if (mod.default && typeof mod.default.play === "function") return mod.default;
  return null;
}

export async function discoverAudio() {
  const tried = [];
  const listed = await listDir("./audio/").catch(() => []);
  const extra = listed.filter((n) => n.endsWith(".js")).map((n) => "./audio/" + n);
  for (const url of [...CANDIDATES, ...extra]) {
    const mod = await tryImport(url);
    tried.push({ url, ok: !!mod });
    if (mod && isUsable(mod)) return { mod, url, tried };
  }
  return { mod: null, url: null, tried };
}

function call(impl, names, args) {
  if (!impl) return;
  for (const n of names) {
    if (typeof impl[n] === "function") {
      try { return impl[n](...args); } catch (e) { console.warn("[audioHook]", n, e); return; }
    }
  }
  if (typeof impl.play === "function") {
    try { return impl.play(names[0], ...args); } catch {}
  }
  if (typeof impl.sfx === "function") {
    try { return impl.sfx(names[0], ...args); } catch {}
  }
}

export function wrapAudio(impl, fallback) {
  const a = impl || fallback;
  const fb = fallback;
  return {
    impl: a,
    source: impl ? "echoes" : "builtin",
    unlock() { call(a, ["unlock", "resume", "start"], []) || fb.unlock(); },
    setWind(v) { call(a, ["setWind", "wind", "setAmbience"], [v]) ?? fb.setWind(v); },
    foot(snow) { call(a, ["foot", "footstep", "footsteps"], [snow]) ?? fb.foot(snow); },
    maybeFoot(dt, moving, sprint) {
      if (typeof a.maybeFoot === "function") return a.maybeFoot(dt, moving, sprint);
      fb.maybeFoot(dt, moving, sprint);
    },
    gunshot(heavy) { call(a, ["gunshot", "shot", "fire"], [heavy]) ?? fb.gunshot(heavy); },
    melee() { call(a, ["melee", "swing"], []) ?? fb.melee(); },
    hit() { call(a, ["hit", "impact"], []) ?? fb.hit(); },
    growl() { call(a, ["growl", "enemy"], []) ?? fb.growl(); },
    pickup() { call(a, ["pickup", "loot", "take"], []) ?? fb.pickup(); },
    craft() { call(a, ["craft"], []) ?? fb.craft(); },
    ui() { call(a, ["ui", "click"], []) ?? fb.ui(); },
    rummage() { call(a, ["rummage", "search", "open"], []) ?? fb.craft(); },
    hurt() { call(a, ["hurt", "pain"], []) ?? fb.hurt(); },
    radio() { call(a, ["radio"], []) ?? fb.radio(); },
    fireloop() { call(a, ["fireloop", "fire"], []) ?? fb.fireloop(); },
  };
}

export async function attachAudio(ctx) {
  const fallback = new AudioBus();
  const disc = await discoverAudio();
  let impl = null;
  if (disc.mod) {
    try { impl = await attach(disc.mod, { ...ctx, fallback }); } catch (e) {
      console.warn("[audioHook] attach failed", e);
    }
  }
  const bus = wrapAudio(impl, fallback);
  bus.discovered = disc.url;
  bus.tried = disc.tried;
  return bus;
}

export function engineOf(bus) {
  return bus?.impl?.engine || bus?.impl?.a || bus?.engine || (typeof window !== "undefined" ? window.GameAudio : null) || null;
}
