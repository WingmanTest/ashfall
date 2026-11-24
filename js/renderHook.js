// Clean render hook for Lumen's volumetric lighting / soft shadows / post.
// This file never writes into /render/. At boot we probe:
//   ./render/ashfall-render.js
//   ./render/index.js
//   ./render/main.js
//   ./render/lumen.js
//   ./render/integrator.js
//   ./render/src/index.js
//
// Expected integration API (any one is enough):
//   export async function attachAshfallRender(ctx)
//   export async function createRenderer(ctx)
//   export function integrate(ctx)
//   export default function / class
//
// ctx = {
//   THREE, canvas, width, height,
//   scene, camera, renderer,   // may be created by the module or by us
//   clock, quality: "mobile"|"desktop",
// }
//
// A usable module should return (or be) an object with some of:
//   renderer, composer, scene, camera,
//   update(dt, state), render(scene, camera, state),
//   resize(w, h), dispose(),
//   setWeather({ blizzard, timeOfDay, flashlight }),
//   setTimeOfDay(t)
//
// If nothing usable is found, BuiltinPipeline is used (low-res RT + winter post).

const CANDIDATES = [
  "./render/index.js",
];

export async function discoverRenderModule() {
  const tried = [];
  for (const url of CANDIDATES) {
    try {
      const r = await fetch(url, { cache: "no-store", method: "GET" });
      tried.push({ url, ok: r.ok, status: r.status });
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || !text.trim()) continue;
      // Must look like a JS module, not just a README fetched as js
      if (url.endsWith(".md")) continue;
      const href = new URL(url, document.baseURI).href;
      const mod = await import(href + (href.includes("?") ? "&" : "?") + "t=" + Date.now());
      if (isUsable(mod)) return { mod, url, tried };
    } catch (err) {
      tried.push({ url, ok: false, error: String(err && err.message || err) });
    }
  }
  // README-only probe (for the report, not executed)
  let readme = null;
  for (const u of ["./render/INTEGRATION.md", "./render/README.md"]) {
    try {
      const r = await fetch(u, { cache: "no-store" });
      if (r.ok) { readme = u; break; }
    } catch {}
  }
  return { mod: null, url: null, tried, readme };
}

function isUsable(mod) {
  if (!mod) return false;
  if (typeof mod.createRenderPipeline === "function") return true;
  if (typeof mod.attachAshfallRender === "function") return true;
  if (typeof mod.createRenderer === "function") return true;
  if (typeof mod.integrate === "function") return true;
  if (typeof mod.createAshfallPipeline === "function") return true;
  if (typeof mod.default === "function") return true;
  if (mod.default && typeof mod.default.attach === "function") return true;
  if (mod.Lumen && typeof mod.Lumen === "function") return true;
  return false;
}

export async function attachRenderModule(mod, ctx) {
  if (!mod) return null;
  try {
    if (typeof mod.createRenderPipeline === "function") return await mod.createRenderPipeline(ctx);
    if (typeof mod.attachAshfallRender === "function") return await mod.attachAshfallRender(ctx);
    if (typeof mod.createAshfallPipeline === "function") return await mod.createAshfallPipeline(ctx);
    if (typeof mod.createRenderer === "function") return await mod.createRenderer(ctx);
    if (typeof mod.integrate === "function") return await mod.integrate(ctx);
    if (typeof mod.default === "function") return await mod.default(ctx);
    if (mod.default && typeof mod.default.attach === "function") return await mod.default.attach(ctx);
    if (typeof mod.Lumen === "function") return await new mod.Lumen(ctx);
  } catch (err) {
    console.warn("[renderHook] attach failed", err);
    return null;
  }
  return null;
}

export function renderFrame(pipeline, scene, camera, state, dt) {
  if (!pipeline) return false;
  try {
    if (typeof pipeline.update === "function") pipeline.update(dt, state);
    if (typeof pipeline.setWeather === "function") {
      pipeline.setWeather({
        blizzard: state.blizzard,
        timeOfDay: state.timeOfDay,
        flashlight: state.flashlight,
        warmth: state.warmth,
      });
    } else if (typeof pipeline.setTimeOfDay === "function") {
      pipeline.setTimeOfDay(state.timeOfDay);
    }
    if (typeof pipeline.render === "function") {
      pipeline.render(scene, camera, state);
      return true;
    }
    if (pipeline.composer && typeof pipeline.composer.render === "function") {
      pipeline.composer.render();
      return true;
    }
  } catch (err) {
    console.warn("[renderHook] frame failed", err);
    return false;
  }
  return false;
}
