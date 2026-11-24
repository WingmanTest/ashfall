import { CFG, ITEMS } from "./config.js";

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
    this.loc = "";
    this.clock = "";
    this.weather = "";
    this.faceImg = null;
    this.faceIdle = null;
    const faces = (CFG.portrait || {});
    const a = new Image(); a.src = faces.hurt || "./assets/oga/faces/face_hurt.png"; this.faceImg = a;
    const b = new Image(); b.src = faces.idle || "./assets/oga/faces/face_idle.png"; this.faceIdle = b;
  }

  say(msg, t = 2.4) { this.toast = msg; this.toastT = t; }

  tick(dt) { if (this.toastT > 0) this.toastT -= dt; }

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
    if (has("hp")) bars.push(["HP", s.health, "#d44", 100]);
    if (has("warmth") || has("temp")) bars.push(["WARM", s.warmth, "#8ec8e8", 100]);
    if (has("hunger")) bars.push(["HUNGER", s.hunger, "#d4a15a", 100]);
    if (has("stm") || has("stamina")) bars.push(["STM", s.stamina, "#c8d4c0", 100]);
    if (has("rad") || has("radiation")) bars.push(["RAD", s.rad, "#7cdb6a", 100]);
    if (has("filter")) bars.push(["FILTER", opts.filter ?? 0, "#9ad4a8", 100]);
    if (has("seal")) bars.push(["SEAL", opts.seal ?? 0, "#c5d0da", 100]);
    let y = 14;
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    for (const [lab, v, col, max] of bars) {
      ctx.fillStyle = "rgba(10,13,18,0.55)";
      ctx.fillRect(28, y, 120, 8);
      ctx.strokeStyle = "rgba(232,238,244,0.45)";
      ctx.strokeRect(28, y, 120, 8);
      ctx.fillStyle = col;
      ctx.fillRect(28, y, Math.max(0, 120 * (v / max)), 8);
      ctx.fillStyle = "#e8eef4";
      ctx.fillText(lab, 12, y + 7);
      y += 11;
    }

    // face
    const face = s.health < 40 || player.hurtT > 0 ? this.faceImg : this.faceIdle;
    if (face && face.complete) {
      ctx.fillStyle = "rgba(10,13,18,0.5)";
      ctx.fillRect(w - 58, 10, 44, 44);
      ctx.drawImage(face, w - 56, 12, 40, 40);
    }

    // location (left) and clock/weather (right of bars, left of the face) — never overlap.
    ctx.fillStyle = "#c5d0da";
    ctx.font = "9px monospace";
    const loc = (this.loc || "SECTOR 4").toUpperCase();
    const time = (this.clock || "").trim();
    const wx = (this.weather || "").trim();
    const right = (time + (wx ? "  " + wx : "")).trim();
    const faceX = w - 58;
    ctx.textAlign = "right";
    ctx.fillText(right, faceX - 4, y + 10);
    const timeW = ctx.measureText(right).width;
    const locMax = faceX - 8 - timeW - 12;
    ctx.textAlign = "left";
    let locDraw = loc;
    while (locDraw.length > 3 && ctx.measureText(locDraw).width > locMax) locDraw = locDraw.slice(0, -2);
    if (locDraw !== loc && locDraw.length > 1) locDraw = locDraw.slice(0, -1) + "…";
    ctx.fillText(locDraw, 12, y + 10);

    // objective
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8eef4";
    ctx.font = "11px monospace";
    wrap(ctx, this.objText || "", 12, y + 26, w - 24, 13);

    // coat / filter pips
    ctx.font = "9px monospace";
    ctx.fillStyle = "#8a9aaa";
    let pip = 12;
    if (player.coatOn) { ctx.fillText("COAT", pip, h - 118); pip += 36; }
    if (player.filterOn && !has("filter")) { ctx.fillText("FILTER", pip, h - 118); }

    // weapon / ammo bottom (leave room for touch)
    const def = ITEMS[player.equipped];
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8eef4";
    ctx.font = "12px monospace";
    const ammo = def && def.ammo ? `${player.mags[player.equipped] || 0} / ${inv[def.ammo] || 0}` : "";
    ctx.fillText((def?.name || player.equipped).toUpperCase(), 12, h - 96);
    if (ammo) {
      ctx.fillStyle = "#c5d0da";
      ctx.fillText(ammo, 12, h - 82);
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

    // prompt
    if (this.prompt) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8eef4";
      ctx.font = "12px monospace";
      ctx.fillText(this.prompt, w / 2, h * 0.62);
    }

    if (this.toastT > 0) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(10,13,18,0.7)";
      const tw = Math.min(w - 24, ctx.measureText(this.toast).width + 16);
      ctx.fillRect((w - tw) / 2, h * 0.54, tw, 22);
      ctx.fillStyle = "#e8eef4";
      ctx.font = "11px monospace";
      ctx.fillText(this.toast, w / 2, h * 0.54 + 15);
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
