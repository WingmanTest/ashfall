import * as THREE from "three";
import { fitHeight, makePerson, makeDog } from "./world.js";

const KINDS = {
  husk: { hp: 48, spd: 1.25, dmg: 9, range: 1.45, detect: 11, color: 0xb89a8c, body: "husk" },
  raider: { hp: 70, spd: 2.1, dmg: 14, range: 1.6, detect: 16, color: 0x3a3030, body: "person" },
  dog: { hp: 28, spd: 3.4, dmg: 9, range: 1.2, detect: 15, color: 0x3b322c, body: "dog" },
  wolf: { hp: 36, spd: 3.2, dmg: 12, range: 1.25, detect: 16, color: 0x4a4a50, body: "dog" },
  looter: { hp: 50, spd: 1.9, dmg: 10, range: 1.5, detect: 12, color: 0x4a4038, body: "person" },
  watch_militia: { hp: 60, spd: 1.8, dmg: 12, range: 1.55, detect: 14, color: 0x3a3a40, body: "person" },
  bridge_boy: { hp: 58, spd: 2.0, dmg: 12, range: 1.55, detect: 14, color: 0x3a3040, body: "person" },
  desperate_family: { hp: 40, spd: 1.5, dmg: 8, range: 1.4, detect: 10, color: 0x5a4a40, body: "person" },
  authority_guard: { hp: 80, spd: 1.9, dmg: 15, range: 1.7, detect: 16, color: 0x2c3430, body: "army" },
  compact_militia: { hp: 70, spd: 2.0, dmg: 13, range: 1.6, detect: 15, color: 0x3a3f34, body: "army" },
  harbor_militia: { hp: 68, spd: 2.0, dmg: 13, range: 1.6, detect: 15, color: 0x3a3030, body: "army" },
  ironwood_patrol: { hp: 90, spd: 2.05, dmg: 16, range: 1.7, detect: 18, color: 0x2a322c, body: "army" },
  ironwood_checkpoint: { hp: 110, spd: 1.4, dmg: 18, range: 2.0, detect: 20, color: 0x2a3028, body: "army" },
  remnant_patrol: { hp: 85, spd: 1.95, dmg: 15, range: 1.7, detect: 17, color: 0x2c2c28, body: "army" },
};

const TYPE_ALIAS = {
  feral_dog: "dog",
  ironwood_drone: "ironwood_patrol",
  ironwood_mrap: "ironwood_checkpoint",
  ironwood_bradley: "ironwood_checkpoint",
};

export class EnemySystem {
  constructor(scene, zombieGltf) {
    this.scene = scene;
    this.zombieGltf = zombieGltf;
    this.list = [];
    this.clips = {};
    if (zombieGltf && zombieGltf.animations) {
      for (const c of zombieGltf.animations) this.clips[c.name] = c;
    }
  }

  mapType(type) {
    return TYPE_ALIAS[type] || (KINDS[type] ? type : "raider");
  }

  spawn(kind, x, z, opts = {}) {
    kind = this.mapType(kind);
    const def = KINDS[kind] || KINDS.raider;
    const body = def.body || "person";
    let mesh, mixer = null, actions = {};
    if (body !== "dog" && this.zombieGltf) {
      mesh = this.zombieGltf.scene.clone(true);
      fitHeight(mesh, body === "husk" ? 1.72 : 1.78);
      mixer = new THREE.AnimationMixer(mesh);
      const names = Object.keys(this.clips);
      const pick = (...cands) => {
        for (const n of cands) if (this.clips[n]) return this.clips[n];
        const low = names.find((n) => cands.some((c) => n.toLowerCase().includes(c.toLowerCase())));
        return low ? this.clips[low] : (names[0] ? this.clips[names[0]] : null);
      };
      const walk = pick("Walk", "walk", "Walking", "Run", "Idle_Walk");
      const idle = pick("Idle", "idle", "Tpose", "Idle_Attack");
      const atk = pick("Attack", "Punch", "Idle_Attack", "Bite");
      if (walk) actions.walk = mixer.clipAction(walk);
      if (idle) actions.idle = mixer.clipAction(idle);
      if (atk) { actions.atk = mixer.clipAction(atk); actions.atk.setLoop(THREE.LoopOnce, 1); }
      if (actions.walk) { actions.walk.play(); actions.walk.timeScale = body === "husk" ? 0.78 : 1.05; }
      if (body === "husk") dressHusk(mesh);
      else dressCivilian(mesh, def, body === "army");
    } else if (body === "dog") {
      mesh = makeDog(def.color);
    } else if (body === "army") {
      mesh = makePerson({ color: def.color, hood: 0x1a2018, skin: 0x8a735c });
      const helm = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: 0x2a2e28, roughness: 0.7, metalness: 0.25 })
      );
      helm.position.y = 1.55;
      mesh.add(helm);
    } else {
      mesh = makePerson({ color: def.color, hood: 0x2a2420, skin: 0xc4a07a });
    }
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const e = {
      kind, x, z, hp: def.hp, max: def.hp, def, mesh, mixer, actions,
      state: "wander", t: Math.random() * 3, vx: 0, vz: 0, alive: true, atkT: 0,
      heading: Math.random() * Math.PI * 2, hurtT: 0,
      ambient: opts.ambient !== false, encounter: opts.encounter || null,
    };
    this.list.push(e);
    this._attachSfx(e);
    return e;
  }

  setAudio(audio) { this.audio = audio; }

  clearAll() {
    for (const e of this.list) {
      try { e.sfx?.dispose?.(); } catch {}
      if (e.mesh && e.mesh.parent) e.mesh.parent.remove(e.mesh);
    }
    this.list = [];
  }

  _engine() {
    const a = this.audio;
    return a?.impl?.engine || a?.impl?.a || (typeof window !== "undefined" ? window.GameAudio : null);
  }

  _voice(kind, def) {
    if (kind === "husk" || def?.body === "husk") return "enemy_growl";
    if (kind === "dog" || kind === "wolf" || def?.body === "dog") return "dog_bark";
    return "raider_shout";
  }

  _attachSfx(e) {
    const A = this._engine();
    if (!A || typeof A.emitter !== "function" || e.sfx) return;
    try { e.sfx = A.emitter({ x: e.x, y: 1.2, z: e.z }); } catch (err) { console.warn("[enemies] sfx", err); }
  }


  seedWorld() {
    // Kept as a no-op: ambient spawns are chapter-gated via syncForChapter.
  }

  clearAmbient() {
    for (const e of this.list) {
      if (e.ambient && e.alive) this.kill(e);
    }
  }

  syncForChapter(n, world, { list } = {}) {
    this.clearAmbient();
    const allowed = [];
    // Army / Ironwood: chapters 5–6 (and remnant later). Dogs from Ch7. Husks from Ch8.
    if (n >= 5 && n <= 6) {
      allowed.push(["ironwood_patrol", 2.0, -55], ["ironwood_patrol", -3.5, -61], ["authority_guard", 1.6, -28]);
    }
    if (n === 6) allowed.push(["ironwood_checkpoint", 0.4, -72], ["ironwood_patrol", 2.4, -60]);
    if (n >= 7) allowed.push(["dog", -4.0, -47], ["dog", 3.8, -52], ["dog", 2.2, -70]);
    if (n >= 7 && n !== 8) allowed.push(["remnant_patrol", 2.0, -55]);
    if (n >= 8) {
      allowed.push(["husk", -2.5, -24], ["husk", 3.2, -32], ["husk", -1.4, -74], ["husk", 2.8, -78]);
    }
    // Honor hook counts/types if provided (still gated).
    const hook = list || [];
    for (const spec of hook) {
      const kind = this.mapType(spec.type);
      const body = (KINDS[kind] || {}).body;
      if (body === "husk" && n < 8) continue;
      if (kind === "dog" || kind === "wolf") { if (n < 7) continue; }
      if (body === "army" && n < 5) continue;
    }
    for (const [k, x, z] of allowed) this.spawn(k, x, z, { ambient: true });
  }

  update(dt, player, world, audio) {
    if (audio) this.audio = audio;
    const px = player.x, pz = player.z;
    for (const e of this.list) {
      if (!e.alive) continue;
      if (e.dormant) {
        if (e.mesh) e.mesh.visible = false;
        continue;
      }
      if (e.mixer) e.mixer.update(dt);
      e.atkT = Math.max(0, e.atkT - dt);
      e.hurtT = Math.max(0, e.hurtT - dt);
      if (e.sfx && typeof e.sfx.update === "function") e.sfx.update(e.x, 1.2, e.z);
      const dx = px - e.x, dz = pz - e.z;
      const dist = Math.hypot(dx, dz) || 1;
      let see = dist < e.def.detect && !world.inFire(e.x, e.z);
      const isDrone = e.kind === "ironwood_drone" || e.levelRef?.type === "ironwood_drone";
      if (isDrone && (world.blocksAirLOS?.(px, pz) || world.inBlindSpot?.(px, pz))) see = false;
      const drawn = player.equipped && player.equipped !== "knife";
      if (e.hostile === "conditional" && (e.hostileActive || drawn || player.flashT > 0)) e.hostileActive = true;
      const hostile = e.hostile === "never" ? false
        : e.hostile === "on_provoke" ? !!e.provoked
        : e.hostile === "conditional" ? !!e.hostileActive
        : true;
      if (see && e.state === "wander") {
        e.sfx?.play?.(this._voice(e.kind, e.def), { randomPitch: 0.06 });
      }
      if (see && hostile) e.state = dist < e.def.range * 0.95 ? "attack" : "chase";
      else if (e.state === "chase" || e.state === "attack") {
        e.t -= dt;
        if (e.t <= 0) e.state = "wander";
      }
      if (e.state === "wander") {
        if (e.patrol && e.patrol.length) {
          e.patrolI = e.patrolI || 0;
          const pt = e.patrol[e.patrolI];
          const tx = pt[0] ?? pt.x, tz = pt[1] ?? pt.z;
          const pd = Math.hypot(tx - e.x, tz - e.z);
          if (pd < 0.45) {
            e.t = (e.t || 0) - dt;
            if (e.t <= 0) {
              e.patrolI = (e.patrolI + 1) % e.patrol.length;
              e.t = e.patrolWaitSec || 0.8;
            }
          } else {
            const spd = e.def.spd * 0.45;
            const nx = e.x + ((tx - e.x) / pd) * spd * dt;
            const nz = e.z + ((tz - e.z) / pd) * spd * dt;
            const c = world.collide(nx, nz, 0.4);
            e.x = c.x; e.z = c.z;
            e.heading = Math.atan2(tx - e.x, tz - e.z);
          }
        } else {
        e.t -= dt;
        if (e.t <= 0) {
          e.heading += (Math.random() - 0.5) * 2;
          e.t = 1.5 + Math.random() * 2;
        }
        const spd = e.def.spd * 0.4;
        const nx = e.x + Math.sin(e.heading) * spd * dt;
        const nz = e.z + Math.cos(e.heading) * spd * dt;
        const c = world.collide(nx, nz, 0.4);
        e.x = c.x; e.z = c.z;
        }
      } else if (e.state === "chase") {
        const spd = e.def.spd;
        const nx = e.x + (dx / dist) * spd * dt;
        const nz = e.z + (dz / dist) * spd * dt;
        const c = world.collide(nx, nz, 0.4);
        e.x = c.x; e.z = c.z;
        e.heading = Math.atan2(dx, dz);
      } else if (e.state === "attack") {
        e.heading = Math.atan2(dx, dz);
        if (e.atkT <= 0 && dist < e.def.range) {
          e.atkT = 1.05;
          player.damage(e.def.dmg, e.kind);
          audio?.hurt();
          if (e.actions.atk) { e.actions.atk.reset().play(); }
        }
      }
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = e.heading;
      if (e.hurtT > 0 && e.mesh.traverse) {
        // flash handled by scale nudge
        e.mesh.position.y = 0.04;
      }
    }
  }

  hitScan(origin, dir, range, dmg) {
    let best = null, bestD = range;
    const inv = dir.clone().normalize();
    for (const e of this.list) {
      if (!e.alive) continue;
      const to = new THREE.Vector3(e.x - origin.x, 0.9 - origin.y, e.z - origin.z);
      const dist = to.length();
      if (dist > range + 0.4) continue;
      const nd = inv.dot(to.clone().normalize());
      if (nd < 0.88) continue;
      if (dist < bestD) { bestD = dist; best = e; }
    }
    if (best) {
      best.provoked = true;
      best.hp -= dmg;
      best.hurtT = 0.2;
      best.state = "chase";
      best.sfx?.play?.("melee_hit", { volume: 0.6 });
      if (best.hp <= 0) this.kill(best);
      return best;
    }
    return null;
  }

  kill(e) {
    e.alive = false;
    e.mesh.visible = false;
    try {
      e.sfx?.play?.("enemy_growl", { rate: 0.7, volume: 0.7 });
      if (e.sfx) setTimeout(() => { try { e.sfx.dispose?.(); } catch {} }, 2000);
    } catch {}
    try { this.onKill?.(e); } catch (err) { console.warn("onKill", err); }
  }

  living() { return this.list.filter((e) => e.alive); }
}

function dressCivilian(root, def, army) {
  const coat = new THREE.Color(def?.color || 0x3a4550);
  const skin = new THREE.Color(army ? 0x8a735c : 0xc4a07a);
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.castShadow = true;
    o.material = o.material.clone();
    const c = o.material.color;
    if (!c) return;
    const n = (o.name || o.material.name || "").toLowerCase();
    if (/head|face|skin|neck/.test(n)) c.copy(skin);
    else if (/hair|scalp/.test(n)) c.set(army ? 0x2a2420 : 0x3a3028);
    else if (/pant|leg|boot|shoe/.test(n)) c.set(army ? 0x2a2e28 : 0x2c2830);
    else c.copy(coat);
    if (o.material.roughness != null) o.material.roughness = 0.85;
    if (o.material.metalness != null) o.material.metalness = army ? 0.12 : 0.03;
  });
  if (army) {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x2a2e28, roughness: 0.7, metalness: 0.25 })
    );
    helm.position.y = 1.62;
    root.add(helm);
  }
}

function dressHusk(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (!o.material) return;
    o.material = o.material.clone();
    const c = o.material.color;
    if (!c) return;
    // Pull any green/rot tint back toward lived-in winter flesh and thin cotton.
    c.offsetHSL(-0.06, -0.35, 0.08);
    c.lerp(new THREE.Color(0xc9b09a), 0.45);
    if (o.material.roughness != null) o.material.roughness = Math.min(1, (o.material.roughness || 0.7) + 0.15);
    if (o.material.metalness != null) o.material.metalness = 0.02;
    const n = (o.name || o.material.name || "").toLowerCase();
    if (/hair|scalp/.test(n)) {
      c.set(0x8a7a6a);
      o.scale.multiplyScalar(0.55);
    }
    if (/shirt|cloth|torso|body/.test(n)) c.set(0xd8d0c4);
  });
}