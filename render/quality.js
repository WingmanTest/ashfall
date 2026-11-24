// Quality tiers + device detection + runtime frame-time adaptive downgrade.

export const TIER_ORDER = ['low', 'medium', 'high'];

// internalHeight: low-res render height (width follows canvas aspect; 9:16 => 144/180/216 wide)
// sceneScale: scene rendered at N x internal then box-filtered (2 => 4x SSAA, matches the
//             area-averaged look of Echo's offline art_C pipeline)
export const TIERS = {
  low: {
    internalHeight: 256, sceneScale: 1,
    shadow: { enabled: true, mapSize: 512, type: 'pcf', distance: 18, radius: 1 },
    flashShadow: true, flashShadowSize: 256, // flashlight is often the key light (interiors), keep its shadow
    volume: { enabled: true, scale: 0.5, steps: 6, noise: false, shadow: false },
    godSamples: 0,
    bloom: { levels: 2 },
    particles: 600,
    maxPoints: 2,
  },
  medium: {
    internalHeight: 320, sceneScale: 1,
    shadow: { enabled: true, mapSize: 1024, type: 'pcfsoft', distance: 28, radius: 1 },
    flashShadow: true, flashShadowSize: 256,
    volume: { enabled: true, scale: 0.5, steps: 12, noise: true, shadow: true },
    godSamples: 16,
    bloom: { levels: 3 },
    particles: 1400,
    maxPoints: 4,
  },
  high: {
    internalHeight: 384, sceneScale: 2,
    shadow: { enabled: true, mapSize: 2048, type: 'pcfsoft', distance: 40, radius: 1 },
    flashShadow: true, flashShadowSize: 512,
    volume: { enabled: true, scale: 0.5, steps: 20, noise: true, shadow: true },
    godSamples: 32,
    bloom: { levels: 4 },
    particles: 2600,
    maxPoints: 4,
  },
};

export function getGLInfo(renderer) {
  const gl = renderer.getContext();
  let str = '';
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    str = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch (e) { /* ignore */ }
  return String(str || '');
}

export function detectTier(renderer) {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const glStr = getGLInfo(renderer);
  const isIOS = /iPhone|iPad|iPod/.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const mem = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 8;
  if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(glStr)) return 'low';
  if (isIOS) {
    // iPhone Safari was falling over at medium + full-res FBOs / volumetrics. Stay on low.
    return 'low';
  }
  if (isAndroid || /Mobi/i.test(ua)) {
    if (/Adreno \(TM\) (6[4-9]|7\d)\d|Mali-G(7[1-9]|71[0-9])|Immortalis/i.test(glStr) && mem >= 4) return 'medium';
    return 'low';
  }
  if (/Intel.*(HD|UHD) Graphics [2-6]\d\d\b/i.test(glStr)) return 'medium';
  return 'high';
}

// Watches frame time; steps the tier down when frames stay over budget,
// optionally back up after a long stretch well under budget.
export class AdaptiveQuality {
  constructor({ targetFps = 30, allowUpgrade = false, onChange = () => {} } = {}) {
    this.budget = 1000 / targetFps;
    this.allowUpgrade = allowUpgrade;
    this.onChange = onChange;
    this.ema = this.budget * 0.5;
    this.over = 0;
    this.under = 0;
    this.warmup = 45;
    this.enabled = true;
    this.minTier = 'low';
  }
  reset() { this.over = 0; this.under = 0; this.warmup = 45; }
  sample(dtMs, tier) {
    if (!this.enabled || !(dtMs > 0) || dtMs > 250) return; // skip tab switches / stalls
    if (this.warmup > 0) { this.warmup--; this.ema = dtMs; return; }
    this.ema += (dtMs - this.ema) * 0.08;
    const idx = TIER_ORDER.indexOf(tier);
    if (this.ema > this.budget * 1.12) {
      this.over++; this.under = 0;
      if (this.over > 60) {
        this.reset();
        if (idx > TIER_ORDER.indexOf(this.minTier)) this.onChange(TIER_ORDER[idx - 1], 'downgrade');
        else this.onChange(null, 'floor'); // already at the lowest tier: pipeline may drop the look
      }
    } else if (this.allowUpgrade && this.ema < this.budget * 0.55) {
      this.under++; this.over = Math.max(0, this.over - 1);
      if (this.under > 600 && idx < TIER_ORDER.length - 1) {
        this.reset();
        this.onChange(TIER_ORDER[idx + 1], 'upgrade');
      }
    } else {
      this.over = Math.max(0, this.over - 1);
    }
  }
}

// CRT overlay strength presets — independent of tier.
export const CRT_PRESETS = {
  off: { curve: 0, scanline: 0, chroma: 0, vignette: 0.25, corner: 0, flicker: 0 },
  low: { curve: 0.025, scanline: 0.10, chroma: 0.35, vignette: 0.40, corner: 0.035, flicker: 0.0 },
  med: { curve: 0.055, scanline: 0.18, chroma: 0.7, vignette: 0.55, corner: 0.06, flicker: 0.012 },
};

// ---- Looks: 'refined' (default, HD-pixel) vs 'classic' (original art_C density) -------------
// Per-tier overrides merged over TIERS. Refined heights give integer-ish upscales on common
// 9:16 / 19.5:9 phones (1080x1920: 4x / 3.33x / 3x; 1170x2532: ~5.3x / 4.4x / 4x).
export const LOOKS = {
  classic: {
    palette: 'classic32',
    dither: { pattern: 'bayer4', amount: 0.07, noiseMix: 0.15 },
    grain: 0.035,
    toe: 0,
    tiers: {
      low: { internalHeight: 256, sceneScale: 1, volScale: 0.5, bloomLevels: 2 },
      medium: { internalHeight: 320, sceneScale: 1, volScale: 0.5, bloomLevels: 3 },
      high: { internalHeight: 384, sceneScale: 2, volScale: 0.5, bloomLevels: 4 },
    },
    flameTexels: [10, 16],
  },
  refined: {
    palette: 'refined64',
    dither: { pattern: 'bayer8', amount: 0.032, noiseMix: 0.0 },
    grain: 0.018,
    toe: 1, // shadow toe + dark-adaptive dither/grain (see palette.js deep ramp)
    tiers: {
      low: { internalHeight: 480, sceneScale: 1, volScale: 0.3333, bloomLevels: 3 },
      medium: { internalHeight: 576, sceneScale: 1, volScale: 0.3333, bloomLevels: 4 },
      high: { internalHeight: 640, sceneScale: 1, volScale: 0.5, bloomLevels: 5 },
    },
    flameTexels: [16, 26],
  },
};

export function applyMobileQuality(T) {
  return {
    ...T,
    internalHeight: Math.min(T.internalHeight || 480, 480),
    sceneScale: 1,
    shadow: { ...(T.shadow || {}), enabled: false, mapSize: 512, type: 'pcf', distance: 16, radius: 1 },
    flashShadow: false,
    volume: { ...(T.volume || {}), enabled: false, scale: 0.5, steps: 0, noise: false, shadow: false },
    godSamples: 0,
    bloom: { levels: Math.min((T.bloom && T.bloom.levels) || 2, 2) },
    particles: Math.min(T.particles || 200, 200),
    maxPoints: 1,
  };
}

export function getTierConfig(look, tier) {
  const base = TIERS[tier];
  const o = (LOOKS[look] || LOOKS.refined).tiers[tier];
  return {
    ...base,
    internalHeight: o.internalHeight,
    sceneScale: o.sceneScale,
    volume: { ...base.volume, scale: o.volScale },
    bloom: { levels: o.bloomLevels },
  };
}
