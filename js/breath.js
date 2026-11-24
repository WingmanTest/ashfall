// Cold-breath puffs for LIVING NPCs/enemies (Quartermaster). Never on Hollows (assimilated_*),
// Tallmen, or the dead. Pooled sprites, one shared texture/material set — no per-frame allocation.
import * as THREE from "three";

const MAX = 24;
const NO_BREATH = new Set(["tallman", "assimilated_human", "assimilated_animal", "husk"]);

function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  grd.addColorStop(0, "rgba(240,244,248,0.85)");
  grd.addColorStop(1, "rgba(240,244,248,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

export class BreathSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.tex = null;
    this.on = false;
    this._acc = 0;
  }
  _ensure() {
    if (this.pool.length) return;
    this.tex = puffTexture();
    for (let i = 0; i < MAX; i++) {
      const m = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, opacity: 0, fog: true });
      const s = new THREE.Sprite(m);
      s.visible = false;
      s.renderOrder = 3;
      s.userData.life = 0;
      s.userData.sharedAsset = true; // world.clearLevel must not dispose the pool
      this.scene.add(s);
      this.pool.push(s);
    }
  }
  /** cold: boolean (ambient temp <= 0 °C). sources: [{x,z,y,head,kind,alive,phase}] */
  update(dt, cold, sources, cam) {
    if (!cold) {
      if (this.on) for (const s of this.pool) s.visible = false;
      this.on = false;
      return;
    }
    this._ensure();
    this.on = true;
    this._acc += dt;
    if (this._acc > 0.12) {
      this._acc = 0;
      for (const src of sources) {
        if (!src || src.alive === false || NO_BREATH.has(src.kind) || src.hollow) continue;
        if (cam && Math.hypot(src.x - cam.position.x, src.z - cam.position.z) > 22) continue;
        src._bt = (src._bt || Math.random() * 3) + 0.12;
        if (src._bt < 2.6) continue; // one subtle exhale every ~2.6 s
        src._bt = 0;
        const s = this.pool.find((p) => !p.visible);
        if (!s) break;
        const yaw = src.yaw || 0;
        s.position.set(src.x + Math.sin(yaw) * 0.22, src.y ?? 1.55, src.z + Math.cos(yaw) * 0.22);
        s.userData.vx = Math.sin(yaw) * 0.25;
        s.userData.vz = Math.cos(yaw) * 0.25;
        s.userData.life = 1.1;
        s.scale.setScalar(0.12);
        s.material.opacity = 0.32;
        s.visible = true;
      }
    }
    for (const s of this.pool) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      s.position.x += u.vx * dt;
      s.position.z += u.vz * dt;
      s.position.y += 0.12 * dt;
      s.scale.setScalar(0.12 + (1.1 - u.life) * 0.32);
      s.material.opacity = 0.32 * (u.life / 1.1);
    }
  }
}
