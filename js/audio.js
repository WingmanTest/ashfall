// WebAudio SFX — synthesized, unlocked on first gesture.
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.wind = null;
    this.unlocked = false;
    this._windGain = null;
    this._footT = 0;
  }
  unlock() {
    if (this.unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);
    this._startWind();
    this.unlocked = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  _startWind() {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;
      d[i] = last;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.6;
    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0.18;
    src.connect(filter);
    filter.connect(this._windGain);
    this._windGain.connect(this.master);
    src.start();
    this.wind = src;
  }
  setWind(amount) {
    if (!this._windGain) return;
    const t = this.ctx.currentTime;
    this._windGain.gain.setTargetAtTime(0.12 + amount * 0.38, t, 0.4);
  }
  _noise(dur, vol, freq = 800, type = "lowpass") {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const n = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }
  _tone(freq, dur, vol, type = "sine", slide = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }
  foot(snow = true) {
    if (!this.ctx) return;
    this._noise(snow ? 0.09 : 0.05, 0.18, snow ? 420 : 900, "lowpass");
  }
  maybeFoot(dt, moving, sprint) {
    if (!moving) { this._footT = 0; return; }
    this._footT += dt;
    const per = sprint ? 0.32 : 0.46;
    if (this._footT >= per) {
      this._footT = 0;
      this.foot(true);
    }
  }
  gunshot(heavy = true) {
    this._noise(heavy ? 0.28 : 0.16, heavy ? 0.85 : 0.55, heavy ? 280 : 700, "lowpass");
    this._tone(heavy ? 90 : 180, 0.12, 0.3, "square", -60);
  }
  melee() {
    this._noise(0.08, 0.3, 200, "lowpass");
    this._tone(140, 0.07, 0.18, "square", -80);
  }
  hit() { this._tone(90, 0.1, 0.25, "sawtooth", -40); this._noise(0.08, 0.2, 300); }
  growl() {
    this._tone(70, 0.35, 0.16, "sawtooth", -20);
    this._noise(0.3, 0.12, 180, "lowpass");
  }
  pickup() { this._tone(660, 0.06, 0.12, "sine", 120); }
  craft() { this._tone(320, 0.08, 0.1, "triangle"); this._tone(480, 0.1, 0.08, "sine", 80); }
  ui() { this._tone(520, 0.04, 0.08, "square"); }
  fireloop() { this._noise(0.4, 0.08, 240, "lowpass"); }
  radio() { this._noise(0.5, 0.1, 1800, "bandpass"); this._tone(440, 0.2, 0.06, "sine"); }
  hurt() { this._tone(180, 0.18, 0.22, "sawtooth", -100); }
}
