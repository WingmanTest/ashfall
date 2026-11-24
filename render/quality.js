// Quality tiers + device detection + runtime frame-time adaptive downgrade.

export const TIER_ORDER = ['mobile', 'low', 'medium', 'high'];

// internalHeight: low-res render height (width follows canvas aspect). Heights per look live in LOOKS.
// sceneScale: scene rendered at N x internal then box-filtered.
// shadow.updateEvery: re-render the shadow map every N frames (1 = every frame). The sun shadow is
//   view-fitted and texel-snapped; the shadow matrix only changes when the map is re-rendered, so
//   skipping frames lags the shadow slightly but never misaligns it.
// volume.mode: 'raymarch' (low-res raymarch target + bilateral upsample) | 'analytic' (no extra pass:
//   fog, sun phase, flashlight cone and campfire glow evaluated per pixel in the composite).
export const TIERS = {
  // iPhone Safari / phones: ZERO shadow passes, no volume target, 2-level bloom, light particles.
  // Passes per frame: scene, bloom x3 (tiny), composite, CRT blit = 6.
  mobile: {
    internalHeight: 432, sceneScale: 1, snap: true,
    shadow: { enabled: false, mapSize: 512, type: 'pcf', distance: 16, radius: 1, updateEvery: 4 },
    flashShadow: false, flashShadowSize: 256,
    volume: { enabled: true, mode: 'analytic', scale: 0, steps: 0, noise: false, shadow: false },
    godSamples: 0,
    bloom: { levels: 2 },
    particles: 450,
    maxPoints: 2,
  },
  low: {
    internalHeight: 256, sceneScale: 1,
    shadow: { enabled: true, mapSize: 512, type: 'pcf', distance: 18, radius: 1, updateEvery: 2 },
    flashShadow: false, flashShadowSize: 256, // spot shadow = a 2nd full-scene depth pass; off on low
    volume: { enabled: true, mode: 'raymarch', scale: 0.5, steps: 6, noise: false, shadow: false },
    godSamples: 0,
    bloom: { levels: 2 },
    particles: 600,
    maxPoints: 2,
  },
  medium: {
    internalHeight: 320, sceneScale: 1,
    shadow: { enabled: true, mapSize: 1024, type: 'pcfsoft', distance: 28, radius: 1, updateEvery: 1 },
    flashShadow: true, flashShadowSize: 256,
    volume: { enabled: true, mode: 'raymarch', scale: 0.5, steps: 12, noise: true, shadow: true },
    godSamples: 16,
    bloom: { levels: 3 },
    particles: 1400,
    maxPoints: 4,
  },
  high: {
    internalHeight: 384, sceneScale: 2,
    shadow: { enabled: true, mapSize: 2048, type: 'pcfsoft', distance: 40, radius: 1, updateEvery: 1 },
    flashShadow: true, flashShadowSize: 512,
    volume: { enabled: true, mode: 'raymarch', scale: 0.5, steps: 20, noise: true, shadow: true },
    godSamples: 32,
    bloom: { levels: 4 },
    particles: 2600,
    maxPoints: 4,
  },
};
Object.defineProperty(TIERS, 'phone', { value: TIERS.mobile, enumerable: false }); // alias

export function getGLInfo(renderer) {
  let str = '';
  try {
    const gl = renderer.getContext();
    // WEBGL_debug_renderer_info is deprecated/hidden on newer Safari & Firefox: RENDERER is
    // then a masked string ("Apple GPU", "WebKit WebGL"), which is still enough for Apple detection.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    str = (dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER);
  } catch (e) { /* ignore */ }
  return String(str || '');
}

/**
 * Phone / tablet detection that survives iPadOS "desktop mode" UA masking and hidden GPU strings.
 * true for: iPhone/iPod/iPad UA, Android, iPadOS (MacIntel + touch), Apple GPU + touch,
 * any coarse-pointer touch device with a small screen.
 */
export function isMobileDevice(renderer) {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const touch = (navigator.maxTouchPoints || 0) > 1;
  if (/iPhone|iPad|iPod|Android|Mobi/i.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && touch) return true; // iPadOS 13+ desktop UA
  if (navigator.userAgentData && navigator.userAgentData.mobile) return true;
  if (renderer && touch && /Apple (GPU|A\d|M\d)/i.test(getGLInfo(renderer))) return true;
  try {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const small = typeof screen !== 'undefined' && Math.min(screen.width, screen.height) <= 920;
    if (coarse && touch && small) return true;
  } catch (e) { /* ignore */ }
  return false;
}
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
}

/** 'auto' resolution. Phones (incl. every iOS/iPadOS device) start on 'mobile' at boot. */
export function detectTier(renderer) {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const glStr = getGLInfo(renderer);
  if (isMobileDevice(renderer)) return 'mobile';
  if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(glStr)) return 'low';
  if (/Intel.*(HD|UHD) Graphics [2-6]\d\d\b/i.test(glStr)) return 'medium';
  void ua;
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
    this.minTier = 'mobile';
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
      mobile: { internalHeight: 256, sceneScale: 1, volScale: 0, bloomLevels: 2 },
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
      // mobile: 432 nominal; snapped per canvas to an integer upscale (390x844 @1x -> 422 = exactly 2x)
      mobile: { internalHeight: 432, sceneScale: 1, volScale: 0, bloomLevels: 2 },
      low: { internalHeight: 480, sceneScale: 1, volScale: 0.3333, bloomLevels: 3 },
      medium: { internalHeight: 576, sceneScale: 1, volScale: 0.3333, bloomLevels: 4 },
      high: { internalHeight: 640, sceneScale: 1, volScale: 0.5, bloomLevels: 5 },
    },
    flameTexels: [16, 26],
  },
};

/** Back-compat (Prime's hot-fix): any tier config -> the mobile-safe tier config. */
export function applyMobileQuality(T, look = 'refined') {
  return { ...getTierConfig(look, 'mobile'), internalHeight: Math.min((T && T.internalHeight) || 432, getTierConfig(look, 'mobile').internalHeight) };
}

export function getTierConfig(look, tier) {
  if (tier === 'phone') tier = 'mobile';
  const base = TIERS[tier];
  const o = (LOOKS[look] || LOOKS.refined).tiers[tier];
  return {
    ...base,
    shadow: { ...base.shadow },
    internalHeight: o.internalHeight,
    sceneScale: o.sceneScale,
    volume: { ...base.volume, scale: o.volScale },
    bloom: { levels: o.bloomLevels },
  };
}
