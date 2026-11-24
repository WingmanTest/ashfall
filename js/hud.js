import { CFG, ITEMS } from "./config.js?v=r14.2";

export class HUD {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = canvas.width;
    this.h = canvas.height;
    this.prompt = "";
    this.toast = "";
    this.toastT = 0;
    this.objText = "";
    this.sideText = "";
    this.loc = "";
    this.clock = "";
    this.weather = "";
    this.faceImg = null;
    this.faceIdle = null;
    this.wepT = 2.0;
    this.wepFade = 1;
    this._lastWep = null;
    const faces = (CFG.portrait || {});
    const a = new Image(); a.src = faces.hurt || "./assets/oga/faces/face_hurt.png"; this.faceImg = a;
    const b = new Image(); b.src = faces.idle || "./assets/oga/faces/face_idle.png"; this.faceIdle = b;
  }

  say(msg, t = 2.4) { this.toast = msg; this.toastT = t; }

  showWeaponName(t = 2.0) { this.wepT = t; this.wepFade = 1; }

  tick(dt) {
    if (this.toastT > 0) this.toastT -= dt;
    if (this.wepT > 0) {
      this.wepT -= dt;
      this.wepFade = this.wepT > 0.4 ? 1 : Math.max(0, this.wepT / 0.4);
    } else this.wepFade = 0;
  }

  draw(player, inv, mode, opts = {}) {
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    if (mode !== "play" && mode !== "inventory" && mode !== "craft" && mode !== "dialogue") return;

    // stencil frame ticks
    ctx.strokeStyle = "rgba(232,238,244,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 8); ctx.lineTo(10, 22);
    ctx.moveTo(10, 8); ctx.lineTo(24, 8);
    ctx.moveTo(w - 10, 8); ctx.lineTo(w - 10, 22);
    ctx.moveTo(w - 10, 8); ctx.lineTo(w - 24, 8);
    ctx.stroke();

    const s = player.stats;
    const unlocks = opts.unlocks || new Set(["hp", "warmth", "hunger", "stm", "rad"]);
    const has = (k) => !unlocks.size || unlocks.has(k) || [...unlocks].some((u) => u.toLowerCase() === k);
    const bars = [];
    // Rev 2 seasonal vitals: Summer HP/WATER/HUNGER; WARM unlocks at Ch3; RAD/FILTER in Act III.
    if (has("hp")) bars.push(["HP", s.health, "#d44", 100]);
    if (has("hydration") || has("water")) bars.push(["WATER", s.hydration ?? 75, "#5ab4e0", 100]);
    if (has("warmth") || has("temp")) bars.push(["WARM", s.warmth, "#8ec8e8", 100]);
    if (has("hunger")) bars.push(["HUNGER", s.hunger, "#d4a15a", 100]);
    if (has("rad") && (s.rad || 0) > 0.5) bars.push(["RAD", s.rad, "#c8d45a", 100]);
    if (has("filter")) bars.push(["FILTER", opts.filter ?? 0, "#9ad4a8", 100]);
    // Typography is authored for a 360×640 design grid (gameHudResize). Scale if the
    // canvas is ever a different size so labels never collide with their meters.
    const ui = w / 360;
    const px = (n) => Math.max(1, Math.round(n * ui));
    ctx.textAlign = "left";
    ctx.font = `${px(7)}px monospace`;
    const labelGap = px(5);
    const labelW = Math.ceil(Math.max(
      ctx.measureText("HP").width,
      ctx.measureText("WATER").width,
      ctx.measureText("WARM").width,
      ctx.measureText("HUNGER").width,
      ctx.measureText("FILTER").width,
      ...bars.map(([lab]) => ctx.measureText(lab).width),
    ));
    const barX = 8 + labelW + labelGap;
    const barW = Math.min(Math.round(w * 0.38), px(152));
    const barH = px(5);
    const barGap = px(8);
    let y = px(10);
    for (const [lab, v, col, max] of bars) {
      ctx.fillStyle = "rgba(10,13,18,0.55)";
      ctx.fillRect(barX, y, barW, barH);
      ctx.strokeStyle = "rgba(232,238,244,0.4)";
      ctx.strokeRect(barX, y, barW, barH);
      ctx.fillStyle = col;
      ctx.fillRect(barX, y, Math.max(0, barW * (v / max)), barH);
      ctx.fillStyle = "#e8eef4";
      ctx.font = `${px(7)}px monospace`;
      ctx.fillText(lab, 8, y + barH);
      y += barGap;
    }

    // Location / time tucked under the bars, leaving the top-right free for BAG / pause.
    const metaMax = Math.min(w * 0.62, w - px(88));
    ctx.fillStyle = "#c5d0da";
    ctx.font = `${px(8)}px monospace`;
    const loc = (this.loc || "").toUpperCase();
    const time = (this.clock || "").trim();
    const wx = (this.weather || "").trim();
    let meta = [loc, time, wx].filter(Boolean).join("  ");
    while (meta.length > 3 && ctx.measureText(meta).width > metaMax) meta = meta.slice(0, -2);
    if (meta !== [loc, time, wx].filter(Boolean).join("  ") && meta.length > 1) meta = meta.slice(0, -1) + "…";
    ctx.textAlign = "left";
    ctx.fillText(meta, 8, y + px(10));

    // Compact OBJECTIVE block: small header + 11px body (≈12px CSS on iPhone 390).
    const objRaw = String(this.objText || "");
    const objBody = objRaw.replace(/^OBJECTIVE\s+/i, "").trim();
    const objMax = metaMax;
    ctx.fillStyle = "#9aa8b4";
    ctx.font = `${px(8)}px monospace`;
    if (objBody || objRaw) ctx.fillText("OBJECTIVE", 8, y + px(22));
    ctx.fillStyle = "#e8eef4";
    ctx.font = `${px(11)}px monospace`;
    const objLines = wrapLines(ctx, objBody, objMax);
    const objY = y + px(34);
    objLines.forEach((s, i) => ctx.fillText(s, 8, objY + i * px(13)));
    const side = String(this.sideText || "").trim();
    if (side) {
      ctx.fillStyle = "#8a9aaa";
      ctx.font = `${px(8)}px monospace`;
      const sideLine = side.length > 36 ? side.slice(0, 35) + "…" : side;
      ctx.fillText("SIDE  " + sideLine, 8, objY + objLines.length * px(13) + px(2));
    }

    // Weapon name (and ammo) fade out after ~2s; only return on a swap.
    if (player.equipped !== this._lastWep) {
      this._lastWep = player.equipped;
      this.showWeaponName(2.0);
    }
    const wepBase = h - 68;
    const a = this.wepFade;
    if (a > 0.02) {
      const def = ITEMS[player.equipped];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = "left";
      ctx.fillStyle = "#e8eef4";
      ctx.font = "11px monospace";
      const wepName = (def?.name || player.equipped || "").toUpperCase();
      ctx.fillText(wepName, 10, wepBase);
      const ammo = def && def.ammo ? `${player.mags[player.equipped] || 0} / ${inv[def.ammo] || 0}` : "";
      if (ammo) {
        ctx.fillStyle = "#c5d0da";
        ctx.font = "10px monospace";
        ctx.fillText(ammo, 10, wepBase + 12);
      }
      ctx.restore();
    }

    // crosshair
    const cx = (w / 2) | 0, cy = ((h * 0.42) | 0);
    ctx.strokeStyle = "rgba(232,238,244,0.85)";
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 2, cy);
    ctx.moveTo(cx + 2, cy); ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy - 2);
    ctx.moveTo(cx, cy + 2); ctx.lineTo(cx, cy + 6);
    ctx.stroke();

    // interact prompt: just below the crosshair, never near the weapon readout
    if (this.prompt) {
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      const lines = wrapLines(ctx, this.prompt, w * 0.84);
      const py = cy + 16;
      const tw = Math.max(...lines.map((s) => ctx.measureText(s).width), 40) + 12;
      const th = lines.length * 13 + 8;
      ctx.fillStyle = "rgba(10,13,18,0.72)";
      ctx.fillRect(cx - tw / 2, py - 11, tw, th);
      ctx.fillStyle = "#e8eef4";
      lines.forEach((s, i) => ctx.fillText(s, cx, py + i * 13));
    }

    if (this.toastT > 0) {
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      const lines = wrapLines(ctx, this.toast, w - 36);
      const maxLineWidth = Math.max(0, ...lines.map((s) => ctx.measureText(s).width));
      const tw = Math.min(w - 20, maxLineWidth + 16);
      const th = lines.length * 11 + 10;
      const tx = (w - tw) / 2;
      const ty = h * 0.54;
      ctx.fillStyle = "rgba(10,13,18,0.7)";
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = "#e8eef4";
      lines.forEach((s, i) => ctx.fillText(s, w / 2, ty + 8 + i * 11));
    }

    if (opts.reloading) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#c5d0da";
      ctx.fillText("RELOAD", w / 2, h * 0.48);
    }
  }
}

function wrap(ctx, text, x, y, max, lh) {
  if (!text) return;
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > max) {
      ctx.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, y);
}

function wrapLines(ctx, text, max) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  const splitWord = (word) => {
    if (ctx.measureText(word).width <= max) return [word];
    const parts = [];
    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (chunk && ctx.measureText(next).width > max) { parts.push(chunk); chunk = ch; }
      else chunk = next;
    }
    if (chunk) parts.push(chunk);
    return parts.length ? parts : [word];
  };
  for (const raw of words) {
    for (const w of splitWord(raw)) {
      const t = line ? line + " " + w : w;
      if (line && ctx.measureText(t).width > max) { lines.push(line); line = w; }
      else line = t;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [String(text || "")];
}
