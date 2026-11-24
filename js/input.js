import { CFG } from "./config.js?v=r14";

const JOY_DEAD = 0.14;

/** Radial deadzone + smoothstep response. Output length is 0..1, direction preserved. */
export function shapeJoy(x, y, dead = JOY_DEAD) {
  const len = Math.hypot(x || 0, y || 0);
  if (len < dead) return { x: 0, y: 0 };
  const t = Math.min(1, (len - dead) / (1 - dead));
  const shaped = t * t * (3 - 2 * t);
  const s = shaped / len;
  return { x: (x || 0) * s, y: (y || 0) * s };
}


export class Input {
  constructor(frame, onUnlock) {
    this.frame = frame;
    this.keys = Object.create(null);
    this.moveX = 0;
    this.moveZ = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.fire = false;
    this.fireDown = false;
    this.interact = false;
    this.reload = false;
    this.sprint = false;
    this.autoSprint = false;
    this._fwdTime = 0;
    this.aim = false;
    this.fireMode = false;
    this.inv = false;
    this.craft = false;
    this.swap = false;
    this.pause = false;
    this.locked = false;
    this.touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this._joy = { active: false, id: null, x: 0, y: 0, cx: 0, cy: 0 };
    this._look = { active: false, id: null, lx: 0, ly: 0 };
    this.onUnlock = onUnlock;
    if (this.touch) document.body.classList.add("touch");
    this._bind();
  }

  _bind() {
    const f = this.frame;
    window.addEventListener("keydown", (e) => {
      this.onUnlock?.();
      this.keys[e.code] = true;
      if (["Space", "Tab", "KeyI", "KeyC", "KeyE", "KeyR"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyI" || e.code === "Tab") this.inv = true;
      if (e.code === "KeyC") this.craft = true;
      if (e.code === "KeyE") this.interact = true;
      if (e.code === "KeyR") this.reload = true;
      if (e.code === "KeyV") this.fireMode = true;
      if (e.code === "KeyF") this.aim = true;
      if (e.code === "Escape") this.pause = true;
      if (e.code === "Digit1") this.slot = 1;
      if (e.code === "Digit2") this.slot = 2;
      if (e.code === "Digit3") this.slot = 3;
      if (e.code === "Digit4") this.slot = 4;
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    f.addEventListener("mousedown", (e) => {
      this.onUnlock?.();
      if (!this.touch && !this.locked && e.button === 0) {
        f.requestPointerLock?.();
      }
      if (e.button === 0) { this.fire = true; this.fireDown = true; }
      if (e.button === 2) this.aim = true;
    });
    window.addEventListener("mouseup", (e) => { if (e.button === 0) this.fire = false; if (e.button === 2) this.aim = false; });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keyup", (e) => { if (e.code === "KeyF") this.aim = false; });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === f || document.pointerLockElement === document.getElementById("view");
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    });
    f.addEventListener("contextmenu", (e) => e.preventDefault());

    // Touch joystick
    const joy = document.getElementById("joy");
    const knob = document.getElementById("joy-knob");
    const look = document.getElementById("look-pad");
    const setBtn = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => { e.preventDefault(); e.stopPropagation(); this.onUnlock?.(); this[prop] = true; if (prop === "fire") this.fireDown = true; };
      // One-shot buttons (interact) latch until the game loop consumes them, so a
      // quick tap that starts and ends between two frames is never lost.
      const latch = prop === "interact";
      const up = (e) => { e.preventDefault(); if (!latch) this[prop] = false; };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", up);
    };
    setBtn("btn-fire", "fire");
    setBtn("btn-melee", "fire");
    setBtn("btn-reload", "reload");
    setBtn("btn-interact", "interact");
    setBtn("btn-aim", "aim");
    setBtn("btn-mode", "fireMode");
    document.getElementById("btn-inv")?.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this.onUnlock?.(); this.inv = true; });
    document.getElementById("btn-swap")?.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this.onUnlock?.(); this.swap = true; });
    document.getElementById("btn-craft")?.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this.onUnlock?.(); this.craft = true; });
    document.getElementById("btn-pause")?.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this.onUnlock?.(); this.pause = true; });

    const joyStart = (e) => {
      if (this._joy.active) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const r = joy.getBoundingClientRect();
      this._joy.active = true;
      this._joy.id = t.identifier ?? t.pointerId;
      // r8: floating origin — the stick centres wherever the thumb lands.
      this._joy.cx = t.clientX;
      this._joy.cy = t.clientY;
      this._joyMove(t.clientX, t.clientY, knob, r);
      this.onUnlock?.();
      e.preventDefault();
    };
    const joyMove = (e) => {
      if (!this._joy.active) return;
      const list = e.changedTouches || [e];
      for (const t of list) {
        if ((t.identifier ?? t.pointerId) !== this._joy.id) continue;
        const r = joy.getBoundingClientRect();
        this._joyMove(t.clientX, t.clientY, knob, r);
      }
      e.preventDefault();
    };
    const joyEnd = (e) => {
      const t = e && (e.changedTouches ? e.changedTouches[0] : e);
      if (t && this._joy.id != null && (t.identifier ?? t.pointerId) !== this._joy.id) return;
      this._joy.active = false;
      this._joy.id = null;
      this._joy.x = 0; this._joy.y = 0;
      if (knob) knob.style.transform = "translate(0,0)";
    };
    // Pointer Events only — iOS 13+ and Playwright. Avoid pairing with touch*
    // handlers, which double-apply movement on Safari.
    joy.addEventListener("pointerdown", (e) => { joyStart(e); joy.setPointerCapture?.(e.pointerId); }, { passive: false });
    joy.addEventListener("pointermove", joyMove, { passive: false });
    joy.addEventListener("pointerup", joyEnd);
    joy.addEventListener("pointercancel", joyEnd);

    const lookStart = (e) => {
      if (this._look.active) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      this._look.active = true;
      this._look.id = t.identifier ?? t.pointerId;
      this._look.lx = t.clientX;
      this._look.ly = t.clientY;
      this.onUnlock?.();
      e.preventDefault();
    };
    const lookMove = (e) => {
      if (!this._look.active) return;
      const list = e.changedTouches || [e];
      for (const t of list) {
        if ((t.identifier ?? t.pointerId) !== this._look.id) continue;
        this.lookX += (t.clientX - this._look.lx);
        this.lookY += (t.clientY - this._look.ly);
        this._look.lx = t.clientX;
        this._look.ly = t.clientY;
      }
      e.preventDefault();
    };
    const lookEnd = (e) => {
      const t = e && (e.changedTouches ? e.changedTouches[0] : e);
      if (t && this._look.id != null && (t.identifier ?? t.pointerId) !== this._look.id) return;
      this._look.active = false;
      this._look.id = null;
    };
    look.addEventListener("pointerdown", (e) => { lookStart(e); look.setPointerCapture?.(e.pointerId); }, { passive: false });
    look.addEventListener("pointermove", lookMove, { passive: false });
    look.addEventListener("pointerup", lookEnd);
    look.addEventListener("pointercancel", lookEnd);

    const cancelAll = () => this.resetTouch();
    window.addEventListener("pointercancel", cancelAll);
    window.addEventListener("touchcancel", cancelAll, { passive: true });
    window.addEventListener("blur", cancelAll);
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAll(); });
  }

  /** Drop all touch-stick / hold state. Call whenever a menu covers #touch
   *  or a pointer is cancelled, so a hidden pointerup cannot latch movement. */
  resetTouch() {
    this.clearInputs();
  }

  clearInputs() {
    this._joy.active = false;
    this._joy.id = null;
    this._joy.x = 0;
    this._joy.y = 0;
    this._look.active = false;
    this._look.id = null;
    this.moveX = 0;
    this.moveZ = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.autoSprint = false;
    this._fwdTime = 0;
    this.sprint = !!(this.keys["ShiftLeft"] || this.keys["ShiftRight"]);
    this.fire = false;
    this.fireDown = false;
    this.aim = false;
    this.reload = false;
    this.interact = false;
    this.fireMode = false;
    this.inv = false;
    this.craft = false;
    this.swap = false;
    this.pause = false;
    const knob = document.getElementById("joy-knob");
    if (knob) knob.style.transform = "translate(0, 0)";
    document.getElementById("joy")?.classList.remove("sprint");
  }

  _joyMove(x, y, knob, r) {
    let dx = x - this._joy.cx;
    let dy = y - this._joy.cy;
    const max = 44; // px drag radius for full speed
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    this._joy.x = dx / max;
    this._joy.y = dy / max;
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  sample() {
    const k = this.keys;
    let mx = 0, mz = 0;
    if (k["KeyA"] || k["ArrowLeft"]) mx -= 1;
    if (k["KeyD"] || k["ArrowRight"]) mx += 1;
    if (k["KeyW"] || k["ArrowUp"]) mz -= 1;
    if (k["KeyS"] || k["ArrowDown"]) mz += 1;
    if (this.touch) {
      const shaped = shapeJoy(this._joy.x, this._joy.y);
      mx += shaped.x;
      mz += shaped.y;
    }
    const mlen = Math.hypot(mx, mz);
    if (mlen > 1) { mx /= mlen; mz /= mlen; }
    this.moveX = mx;
    this.moveZ = mz;
    const keySprint = !!(k["ShiftLeft"] || k["ShiftRight"]);
    this.sprint = keySprint || this.autoSprint;
  }

  tickAutoSprint(dt, allowed) {
    const fwd = -this.moveZ; // negative moveZ is forward
    const joy = document.getElementById("joy");
    if (!this.touch || !allowed) {
      this.autoSprint = false;
      this._fwdTime = 0;
      joy?.classList.remove("sprint");
      if (!this.keys["ShiftLeft"] && !this.keys["ShiftRight"]) this.sprint = false;
      return;
    }
    if (fwd >= 0.72) {
      this._fwdTime += dt;
      if (this._fwdTime >= 1.2) this.autoSprint = true;
    } else if (this.autoSprint && fwd >= 0.55) {
      // hold sprint while still pushing clearly forward
    } else {
      this.autoSprint = false;
      this._fwdTime = 0;
    }
    this.sprint = this.autoSprint || !!(this.keys["ShiftLeft"] || this.keys["ShiftRight"]);
    joy?.classList.toggle("sprint", this.autoSprint);
  }

  consumeLook(touch) {
    const s = touch ? CFG.lookSensTouch : CFG.lookSensDesk;
    const x = this.lookX * s;
    const y = this.lookY * s;
    this.lookX = 0;
    this.lookY = 0;
    return { x, y };
  }

  consume(flag) {
    const v = this[flag];
    this[flag] = false;
    return v;
  }
}
