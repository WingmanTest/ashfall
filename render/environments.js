// Nevada Revision 2 — 4-act evolving seasonal atmosphere presets.
// Every preset runs inside the exact same iOS Safari mobile GPU/VRAM budget:
// zero extra FBOs, zero extra passes, zero shader recompiles on season switch.

export const ENVIRONMENT_ORDER = ['summer', 'autumn', 'late_fall', 'fallout_winter'];

export const ENVIRONMENT_ALIASES = {
  summer: 'summer', high_desert_summer: 'summer', 'high-desert-summer': 'summer', desert: 'summer', act1: 'summer',
  autumn: 'autumn', dusty_autumn: 'autumn', 'dusty-autumn': 'autumn', fall: 'autumn', act2: 'autumn',
  late_fall: 'late_fall', 'late-fall': 'late_fall', latefall: 'late_fall', civil_war_late_fall: 'late_fall',
  civil_war_fall: 'late_fall', 'civil-war-fall': 'late_fall', civil_war: 'late_fall', 'civil-war': 'late_fall',
  rain: 'late_fall', drizzle: 'late_fall', overcast: 'late_fall', act3: 'late_fall',
  fallout_winter: 'fallout_winter', 'fallout-winter': 'fallout_winter', nuclear_winter: 'fallout_winter',
  'nuclear-winter': 'fallout_winter', winter: 'fallout_winter', ashfall: 'fallout_winter', horror: 'fallout_winter',
  fallout: 'fallout_winter', act4: 'fallout_winter',
};

export const ENVIRONMENTS = {
  // Act 1 (Ch 1–2): High-Desert Summer — Sparks/Reno Nevada. Warm dry sunlight, hazy ochre-blue sky, subtle dust motes (NO snow).
  summer: {
    id: 'summer',
    label: 'High-Desert Summer',
    act: 1,
    chapters: [1, 2],
    sky: { color: 0x6298c8 },
    hemi: { sky: 0xb4d4eb, ground: 0x8d7456, intensity: 0.65 },
    ambient: { color: 0xcab89e, intensity: 0.40 },
    sun: {
      direction: [-0.36, 0.76, -0.54],
      color: 0xfff0d2,
      intensity: 1.75,
      scatter: 0.032,
      godRays: 0.22,
      anisotropy: 0.55,
    },
    fog: {
      color: 0xcdbfa6,
      density: 0.0068,
      start: 10,
      maxDist: 95,
      falloff: 0.11,
      base: 0,
      noise: 0.22,
      wind: [0.35, 0.04, -0.10],
    },
    grade: {
      contrast: 1.12,
      saturation: 0.90,
      brightness: 1.09,
      tint: [1.07, 1.01, 0.89],
      lift: [0.024, 0.019, 0.011],
      gamma: 0.95,
      crush: 0.22,
      exposure: 1.04,
      bloom: 0.40,
      warmKeep: 0.35,
      grainScale: 0.80,
    },
    palette: { refined: 'summer64', classic: 'summer32' },
    particles: {
      mode: 'dust',
      countScale: 0.35,
      ashRatio: 0.50,
      fall: 0.06,
      wind: [0.42, 0, -0.18],
      box: [22, 10, 24],
      colorA: [0.95, 0.85, 0.65],
      colorB: [0.70, 0.58, 0.42],
      sizeA: 0.030,
      sizeB: 0.022,
      maxPxA: 2.0,
      maxPxB: 1.5,
      sway: 0.32,
      streak: 0,
    },
    flashlight: { scatter: 0.022 },
    sceneHints: { ground: 0xbf9f72, groundAlt: 0x9c7a50, concrete: 0xa08b74, rust: 0x7a4a2c, snow: false, scrub: true },
  },

  // Act 2 (Ch 3–4): Dusty Autumn — crisp golden-amber late afternoon sun, longer shadows, drifting dust/leaves, cooler twilight.
  autumn: {
    id: 'autumn',
    label: 'Dusty Autumn',
    act: 2,
    chapters: [3, 4],
    sky: { color: 0x8e7c82 },
    hemi: { sky: 0xdca97a, ground: 0x4a4354, intensity: 0.64 },
    ambient: { color: 0x857a8a, intensity: 0.42 },
    sun: {
      direction: [-0.78, 0.26, -0.57],
      color: 0xffb76b,
      intensity: 1.58,
      scatter: 0.065,
      godRays: 0.45,
      anisotropy: 0.62,
    },
    fog: {
      color: 0xb9926d,
      density: 0.017,
      start: 6,
      maxDist: 70,
      falloff: 0.09,
      base: 0,
      noise: 0.45,
      wind: [0.75, -0.08, -0.25],
    },
    grade: {
      contrast: 1.18,
      saturation: 0.82,
      brightness: 1.05,
      tint: [1.07, 0.96, 0.88],
      lift: [0.028, 0.022, 0.038],
      gamma: 0.94,
      crush: 0.26,
      exposure: 1.03,
      bloom: 0.54,
      warmKeep: 0.55,
      grainScale: 0.95,
    },
    palette: { refined: 'autumn64', classic: 'autumn32' },
    particles: {
      mode: 'leaves',
      countScale: 0.65,
      ashRatio: 0.38,
      fall: 0.44,
      wind: [1.15, 0, -0.35],
      box: [24, 12, 26],
      colorA: [0.88, 0.74, 0.54],
      colorB: [0.88, 0.38, 0.14],
      sizeA: 0.032,
      sizeB: 0.068,
      maxPxA: 2.0,
      maxPxB: 3.0,
      sway: 0.48,
      streak: 0,
    },
    flashlight: { scatter: 0.045 },
    sceneHints: { ground: 0x9c7a56, groundAlt: 0x7a5a3c, concrete: 0x8a7a6c, rust: 0x7a3a1e, snow: false, scrub: true },
  },

  // Act 3 (Ch 5–7): Civil War Late Fall — cold overcast slate sky, light cold rain/drizzle, distant smoke haze, tense bleak contrast.
  late_fall: {
    id: 'late_fall',
    label: 'Civil War Late Fall',
    act: 3,
    chapters: [5, 6, 7],
    sky: { color: 0x5c6872 },
    hemi: { sky: 0x7e8d99, ground: 0x282c30, intensity: 0.48 },
    ambient: { color: 0x58626a, intensity: 0.34 },
    sun: {
      direction: [-0.30, 0.60, -0.74],
      color: 0xb6c3ce,
      intensity: 0.82,
      scatter: 0.045,
      godRays: 0.14,
      anisotropy: 0.35,
    },
    fog: {
      color: 0x6a747d,
      density: 0.029,
      start: 4,
      maxDist: 48,
      falloff: 0.075,
      base: 0,
      noise: 0.72,
      wind: [0.95, -0.30, -0.25],
    },
    grade: {
      contrast: 1.26,
      saturation: 0.48,
      brightness: 1.04,
      tint: [0.90, 0.95, 1.03],
      lift: [0.022, 0.028, 0.036],
      gamma: 0.93,
      crush: 0.30,
      exposure: 1.00,
      bloom: 0.48,
      warmKeep: 1.0,
      grainScale: 1.15,
    },
    palette: { refined: 'late_fall64', classic: 'late_fall32' },
    particles: {
      mode: 'rain',
      countScale: 1.0,
      ashRatio: 0.22,
      fall: 7.4,
      wind: [1.30, 0, -0.35],
      box: [20, 14, 22],
      colorA: [0.80, 0.88, 0.96],
      colorB: [0.46, 0.50, 0.54],
      sizeA: 0.105,
      sizeB: 0.028,
      maxPxA: 8.0,
      maxPxB: 2.0,
      sway: 0.08,
      streak: 1,
    },
    flashlight: { scatter: 0.055 },
    sceneHints: { ground: 0x4a4f52, groundAlt: 0x34383b, concrete: 0x5e646a, rust: 0x4e3226, snow: false, scrub: false },
  },

  // Act 4 (Ch 8–10): Nuclear Fallout Winter Survival Horror — sunless ash-choked sky, dark soot & snow, oppressive tight fog, stark flashlight/campfire contrast.
  fallout_winter: {
    id: 'fallout_winter',
    label: 'Nuclear Fallout Winter',
    act: 4,
    chapters: [8, 9, 10],
    sky: { color: 0x222933 },
    hemi: { sky: 0x394554, ground: 0x10141b, intensity: 0.26 },
    ambient: { color: 0x242d38, intensity: 0.18 },
    sun: {
      direction: [-0.45, 0.42, -1.0],
      color: 0x7c8b9c,
      intensity: 0.36,
      scatter: 0.075,
      godRays: 0.18,
      anisotropy: 0.45,
    },
    fog: {
      color: 0x27303c,
      density: 0.048,
      start: 3.4,
      maxDist: 30,
      falloff: 0.055,
      base: 0,
      noise: 0.85,
      wind: [0.75, -0.80, -0.20],
    },
    grade: {
      contrast: 1.28,
      saturation: 0.46,
      brightness: 1.06,
      tint: [0.84, 0.91, 1.08],
      lift: [0.018, 0.024, 0.036],
      gamma: 0.92,
      crush: 0.30,
      exposure: 1.06,
      bloom: 0.56,
      warmKeep: 1.0,
      grainScale: 1.25,
    },
    palette: { refined: 'fallout_winter64', classic: 'fallout_winter32' },
    particles: {
      mode: 'fallout',
      countScale: 1.0,
      ashRatio: 0.55,
      fall: 1.05,
      wind: [0.75, 0, -0.25],
      box: [24, 14, 26],
      colorA: [0.90, 0.94, 0.98],
      colorB: [0.14, 0.15, 0.17],
      sizeA: 0.052,
      sizeB: 0.044,
      maxPxA: 3.0,
      maxPxB: 2.5,
      sway: 0.28,
      streak: 0,
    },
    flashlight: { scatter: 0.026 },
    sceneHints: { ground: 0xc8d0d8, groundAlt: 0x8a9098, concrete: 0x5c636c, rust: 0x3e322e, snow: true, scrub: false },
  },
};

/** Map chapter number (1..10) or string ('ch01'..'ch10') to its canonical Nevada Rev 2 preset ID. */
export function environmentForChapter(chapter) {
  const n = typeof chapter === 'number' ? chapter : parseInt(String(chapter || '').replace(/\D/g, ''), 10);
  if (n >= 1 && n <= 2) return 'summer';
  if (n >= 3 && n <= 4) return 'autumn';
  if (n >= 5 && n <= 7) return 'late_fall';
  if (n >= 8) return 'fallout_winter';
  return 'fallout_winter';
}

export function resolveEnvironment(id) {
  if (typeof id === 'number') return environmentForChapter(id);
  const key = String(id || '').trim().toLowerCase();
  if (ENVIRONMENT_ALIASES[key]) return ENVIRONMENT_ALIASES[key];
  if (/^(ch|chapter)?\s*0?\d+$/.test(key)) return environmentForChapter(key);
  throw new Error('unknown environment ' + id + ' (' + ENVIRONMENT_ORDER.join(' | ') + ')');
}

export const resolveEnvironmentId = resolveEnvironment;

export function getEnvironmentConfig(id) {
  const k = resolveEnvironment(id);
  const e = ENVIRONMENTS[k];
  return {
    ...e,
    sky: { ...e.sky },
    hemi: { ...e.hemi },
    ambient: { ...e.ambient },
    sun: { ...e.sun, direction: e.sun.direction.slice() },
    fog: { ...e.fog, wind: e.fog.wind.slice() },
    grade: { ...e.grade, tint: e.grade.tint.slice(), lift: e.grade.lift.slice() },
    palette: { ...e.palette },
    particles: { ...e.particles, wind: e.particles.wind.slice(), box: e.particles.box.slice(), colorA: e.particles.colorA.slice(), colorB: e.particles.colorB.slice() },
    flashlight: { ...e.flashlight },
    sceneHints: { ...e.sceneHints },
  };
}
