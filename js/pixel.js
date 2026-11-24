// Pixel-art look knobs. Defaults live in CFG.pixel; Lumen's INTEGRATION.md wins when it lands.
import { CFG } from "./config.js?v=r14";

export function pixelConfig() {
  return {
    look: CFG.pixel?.look || "refined",
    internalH: { ...(CFG.pixel?.internalH || { low: 480, medium: 576, high: 640 }) },
    paletteSize: CFG.pixel?.paletteSize || 64,
    dither: CFG.pixel?.dither ?? 0.032,
    grain: CFG.pixel?.grain ?? 0.018,
  };
}

/** Parse "216×384 / 270×480 / 324×576" or "internalHeight: 480" from Lumen's INTEGRATION.md. */
export function parseIntegrationPixel(md) {
  if (!md || typeof md !== "string") return null;
  const out = {};
  const res = md.match(/(\d+)\s*[×x]\s*(\d+)\s*\/\s*(\d+)\s*[×x]\s*(\d+)\s*\/\s*(\d+)\s*[×x]\s*(\d+)/);
  if (res) {
    const a = [+res[1], +res[3], +res[5]];
    const b = [+res[2], +res[4], +res[6]];
    // 9:16 listings put width first (270×480); a bare height list is also possible.
    const hs = (b[0] >= a[0]) ? b : a;
    out.internalH = { low: hs[0], medium: hs[1], high: hs[2] };
  }
  const bare = md.match(/internal heights?\s*\((\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\)/i);
  if (bare && !out.internalH) out.internalH = { low: +bare[1], medium: +bare[2], high: +bare[3] };
  if (/refined64/i.test(md)) out.paletteSize = 64;
  if (/look:\s*'refined'/i.test(md)) out.look = "refined";
  const pal = md.match(/palette(?: size)?\s*(?:(?:of|to|=|:)\s*)(\d{2,3})/i)
    || md.match(/(\d{2,3})\s*[- ]colou?r palette/i);
  if (pal) out.paletteSize = +pal[1];
  const dither = md.match(/dither(?: strength)?\s*(?:(?:to|=|:)\s*)(0\.\d+)/i);
  if (dither) out.dither = +dither[1];
  return Object.keys(out).length ? out : null;
}

export async function loadLumenPixelOverrides() {
  const cfg = pixelConfig();
  try {
    const r = await fetch(new URL("./render/INTEGRATION.md", document.baseURI).href, { cache: "no-store" });
    if (r.ok) {
      const parsed = parseIntegrationPixel(await r.text());
      if (parsed?.internalH) cfg.internalH = { ...cfg.internalH, ...parsed.internalH };
      if (parsed?.paletteSize) cfg.paletteSize = parsed.paletteSize;
      if (parsed?.dither != null) cfg.dither = parsed.dither;
      cfg.source = parsed ? "integration+config" : "config";
    }
  } catch {
    cfg.source = "config";
  }
  return cfg;
}

/** Mutate Lumen's exported TIERS so setTier/resize pick up our heights. Does not write render/. */
export function applyPixelTiers(TIERS, cfg) {
  if (!TIERS || !cfg?.internalH) return;
  for (const [k, h] of Object.entries(cfg.internalH)) {
    if (TIERS[k] && h) TIERS[k].internalHeight = h;
  }
}

/** Finer winter ramp (up to paletteSize) with a few fire accents. Pipeline may cap at 32 until Lumen expands it. */
export function winterPalette(size = 48) {
  const n = Math.max(32, Math.min(64, size | 0));
  const stops = [
    0x0a0d12, 0x10141c, 0x161b24, 0x1c2430, 0x243040, 0x2e3c4c, 0x3d4a59, 0x4c5c6c,
    0x596b7a, 0x6b7a8c, 0x7a8c9c, 0x8a99ab, 0x9cb0bf, 0xb0c0cc, 0xc4d1d9, 0xd6e0e8,
    0xe8edf5, 0xf4f7fb, 0xffffff, 0x857997, 0x6a6677, 0x53535e, 0x45484f, 0x60615e,
    0x7b706a, 0x8d9395, 0x707679, 0x5c6365, 0x4a5256, 0x394248, 0x2a3238, 0x629194,
    0x556566, 0x6f8789, 0x86acb7, 0x91a4b7, 0x798c9d, 0x5a6e80, 0x4a5a68, 0x3a4854,
    0xffd38a, 0xf0a25a, 0xf08a3c, 0xd46832, 0xa8442a, 0x7a2e1e, 0x5a3a32, 0x8a6a58,
  ];
  const out = stops.slice(0, n);
  while (out.length < n) {
    const a = stops[out.length % stops.length];
    out.push(a);
  }
  return out;
}

export function paletteVectors(hexes, THREE) {
  return hexes.map((h) => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255));
}
