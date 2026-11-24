import * as THREE from "three";
import { CFG, ITEMS, WEAPONS_ORDER } from "./config.js?v=r10";
import { combinedInsulation } from "./equipment.js?v=r10";
import { fitHeight } from "./world.js?v=r10";
import { createWeaponModel, setWeaponLibrary, mountViewmodel, applyHold, installViewmodelLights, weaponKind } from "./weapons/viewmodels.js?v=r10";

export function defaultStats() {
  return {
    health: 100,
    warmth: 82,
    hunger: 70,
    hydration: 75,
    stamina: 100,
    rad: 0,
  };
}

export class Player {
  constructor(camera, scene, gunModels) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = -0.08;
    this.x = 0;
    this.y = CFG.eyeH;
    this.z = 8;
    this.vy = 0;
    this.stats = defaultStats();
    this.equipped = "knife";
    this.mags = { blaster: 0, pistol: 0 };
    this.recoil = 0;
    this.bob = 0;
    this.flashT = 0;
    this.hurtT = 0;
    this.attackCD = 0;
    this.reloadT = 0;
    this.alive = true;
    this.coatOn = false;
    this.filterOn = false;
    this.filterCharge = 0;
    this.flashlight = false;
    this.wDur = {};
    this.jammed = {};
    this.fireMode = {};
    this.aiming = false;
    this.swingT = 0;
    this._t = 0;
    this._noDamageT = 10;
    this._buildViewmodel(scene, gunModels);
  }

  _buildViewmodel(scene, gunModels) {
    if (gunModels) setWeaponLibrary(gunModels);
    this.vm = new THREE.Group();
    this.vm.layers.enable(1);
    this.camera.add(this.vm);
    if (!this._vmLights) this._vmLights = installViewmodelLights(this.camera);
    this.vmParts = {};
    // Only the starting knife is built up front. Other viewmodels lazy-load with their GLB.
    try { this.vmParts.knife = createWeaponModel("knife"); } catch (err) { console.warn("viewmodel knife", err); }
    const muzzle = new THREE.PointLight(0xffcc88, 0, 4, 2);
    this.muzzle = muzzle;
    const flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    );
    this.muzzleFlash = flash;
    this.showWeapon();
  }

  attachWeaponLibrary(gunModels) {
    if (gunModels) setWeaponLibrary(gunModels);
    if (!this.vmParts.knife) {
      try { this.vmParts.knife = createWeaponModel("knife"); } catch {}
    }
    this.showWeapon();
  }

  buildViewmodelFor(id) {
    if (!id || this.vmParts[id]) return this.vmParts[id];
    try { this.vmParts[id] = createWeaponModel(id); }
    catch (err) { console.warn("viewmodel", id, err); }
    return this.vmParts[id];
  }

  showWeapon() {
    while (this.vm.children.length) this.vm.remove(this.vm.children[0]);
    const part = this.vmParts[this.equipped];
    const kind = (this._weaponKind || "gun");
    if (part) {
      mountViewmodel(this.vm, part, this.equipped, !!this.aiming);
      const muz = part.userData.muzzle || part;
      if (this.muzzle) { part.add(this.muzzle); this.muzzle.position.set(0, 0, 0); }
      if (this.muzzleFlash) { part.add(this.muzzleFlash); this.muzzleFlash.position.set(0, 0, -0.04); }
    } else {
      this.vm.position.set(0, -0.02, 0);
      if (this.muzzle) this.vm.add(this.muzzle);
      if (this.muzzleFlash) this.vm.add(this.muzzleFlash);
    }
  }

  applyLook(lx, ly) {
    this.yaw -= lx;
    this.pitch -= ly;
    const lim = 1.25;
    if (this.pitch < -lim) this.pitch = -lim;
    if (this.pitch > lim) this.pitch = lim;
  }

  tryEquip(id, inv) {
    if (!ITEMS[id]) return false;
    if ((inv[id] || 0) <= 0 && ITEMS[id].kind !== "melee") return false;
    if (!WEAPONS_ORDER.includes(id) && ITEMS[id].kind !== "gun" && ITEMS[id].kind !== "melee" && ITEMS[id].kind !== "throw") return false;
    this.equipped = id;
    if (!this.vmParts[id]) this.buildViewmodelFor(id);
    this.showWeapon();
    return true;
  }

  move(dt, input, world, sprintOk) {
    const overSoft = this.carryState?.overSoft;
    const sprint = sprintOk && !overSoft && input.sprint && this.stats.stamina > 2 && (input.moveX || input.moveZ);
    const spd = (sprint ? CFG.sprint : CFG.walk) * (overSoft ? (this.carryState.moveMul || 0.8) : 1) * dt;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    // moveX strafe, moveZ forward in input (neg is forward from WASD W)
    const fx = s * input.moveZ + c * input.moveX;
    const fz = c * input.moveZ - s * input.moveX;
    let nx = this.x + fx * spd;
    let nz = this.z + fz * spd;
    const hit = world.collide(nx, nz, 0.38);
    this.x = hit.x;
    this.z = hit.z;
    const moving = Math.hypot(input.moveX, input.moveZ) > 0.08;
    if (sprint && moving) this.stats.stamina = Math.max(0, this.stats.stamina - CFG.staminaSprint * dt);
    else this.stats.stamina = Math.min(100, this.stats.stamina + CFG.staminaRegen * dt * (this.stats.hunger > 0 ? 1 : 0.35));
    this.bob += dt * (moving ? (sprint ? 11 : 7) : 2);
    return { moving, sprint };
  }

  syncCamera() {
    const bobY = Math.sin(this.bob) * 0.025;
    const bobX = Math.cos(this.bob * 0.5) * 0.015;
    this.camera.position.set(this.x + bobX, this.y + bobY, this.z);
    this.camera.rotation.set(this.pitch + this.recoil * 0.04, this.yaw, 0, "YXZ");
    const melee = weaponKind(this.equipped) === "melee";
    const idleX = Math.sin(this._t * 1.15) * 0.006 + Math.sin(this.bob) * 0.004;
    const idleY = Math.cos(this._t * 0.9) * 0.005 + Math.sin(this.bob * 2) * 0.006;
    let swing = 0;
    if (this.swingT > 0) {
      const u = 1 - this.swingT / 0.28;
      swing = Math.sin(Math.min(1, u) * Math.PI);
    }
    const ads = !!this.aiming;
    applyHold(
      this.vm,
      this.equipped,
      ads,
      [idleX * (ads ? 0.2 : 1), idleY * (ads ? 0.2 : 1) - this.recoil * 0.02, this.recoil * 0.03],
      [-this.recoil * 0.14 - (melee ? swing * 0.85 : 0), idleX * 0.25 * (ads ? 0.2 : 1), melee ? swing * 0.55 : this.recoil * 0.03]
    );
    if (this.flashT > 0) {
      this.muzzle.intensity = 10;
      if (this.muzzleFlash) {
        this.muzzleFlash.material.opacity = Math.min(1, this.flashT * 14);
        this.muzzleFlash.scale.setScalar(0.7 + this.flashT * 8);
        this.muzzleFlash.rotation.z = this._t * 13;
      }
    } else {
      this.muzzle.intensity = 0;
      if (this.muzzleFlash) this.muzzleFlash.material.opacity = 0;
    }
  }

  startSwing() { this.swingT = 0.28; }

  tickSurvival(dt, env = {}) {
    const {
      blizzard, night, inFire, radZone, indoor, seal, hasGasMask, sprinting,
      weather, chapter, survival: S, difficulty,
    } = env;
    this._t += dt;
    if (this.swingT > 0) this.swingT = Math.max(0, this.swingT - dt);
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.flashT > 0) this.flashT -= dt;
    if (this.hurtT > 0) { this.hurtT -= dt; this._noDamageT = 0; }
    else this._noDamageT = (this._noDamageT || 0) + dt;
    if (this.attackCD > 0) this.attackCD -= dt;
    if (this.reloadT > 0) this.reloadT -= dt;

    if (!this.stats.hydration && this.stats.hydration !== 0) this.stats.hydration = 75;
    const statsDef = (S && S.stats) || {};
    const climate = (S && S.chapter_climate && S.chapter_climate[chapter]) || {};
    const wdef = (S && S.weather_modifiers && S.weather_modifiers[weather || (blizzard ? "blizzard" : "overcast")]) || {};
    const envm = (S && S.environment_modifiers) || {};
    const mul = (difficulty && difficulty.multipliers) || {};
    const prs = (def, fallback) => (def && def.base_drain && def.base_drain.per_real_second) ?? fallback;

    // Warmth
    const wBase = prs(statsDef.warmth, 0.30);
    // Quartermaster: chapter_climate[ch].night_cold_mult is ABSOLUTE at night (it replaces
    // ambient_cold); never stack it with an environment night multiplier.
    const hasNightAbs = typeof climate.night_cold_mult === "number";
    const coldBase = night && hasNightAbs ? climate.night_cold_mult : (climate.ambient_cold ?? 1);
    let wMul = coldBase * (mul.warmth_drain_mult ?? 1);
    if (indoor && inFire) { /* regen replaces drain */ }
    else if (inFire) { /* near_fire regen */ }
    else {
      if (indoor) wMul *= (envm.indoors_heated && false) ? 1 : (envm.indoors_unheated?.warmth_drain_mult ?? 0.35);
      else wMul *= (envm.outdoors?.warmth_drain_mult ?? 1);
      if (night && !hasNightAbs) {
        const nm = Number(envm.night?.warmth_drain_mult);
        wMul *= (Number.isFinite(nm) ? nm : 1.4) * (wdef.night_extra_mult ?? 1);
      }
      if (blizzard) wMul *= (envm.blizzard?.warmth_drain_mult ?? wdef.warmth_drain_mult ?? 2.2);
      else if (wdef.warmth_drain_mult) wMul *= wdef.warmth_drain_mult;
      if (sprinting) wMul *= (envm.sprinting?.warmth_drain_mult ?? 0.8);
      const items = env.items || ITEMS;
      const insul = this.gear ? combinedInsulation(this.gear, items) : (this.coatOn ? Math.min(0.75, ITEMS.coat?.warmthResist || 0.42) : 0);
      wMul *= (1 - insul);
    }
    if (inFire) {
      const regen = envm.near_fire?.warmth_regen_per_real_second ?? 5;
      this.stats.warmth = Math.min(100, this.stats.warmth + regen * dt);
    } else if (indoor && envm.indoors_heated && this._heated) {
      this.stats.warmth = Math.min(100, this.stats.warmth + (envm.indoors_heated.warmth_regen_per_real_second ?? 2) * dt);
    } else if (coldBase <= 0 && (climate.ambient_warmth_regen_per_real_second || 0) > 0) {
      // Late-summer Sparks: no cold drain; warmth drifts back up.
      this.stats.warmth = Math.min(100, this.stats.warmth + climate.ambient_warmth_regen_per_real_second * dt);
    } else {
      this.stats.warmth = Math.max(0, this.stats.warmth - wBase * (Number.isFinite(wMul) ? wMul : 1) * dt);
    }

    // Satiety / hunger (code stores fullness)
    let hMul = 1 * (mul.satiety_drain_mult ?? 1);
    if (this.stats.warmth < 40) hMul *= 1.25;
    if (this.stats.rad > 25) hMul *= 1.3;
    if (sprinting) hMul *= 1.2;
    this.stats.hunger = Math.max(0, this.stats.hunger - prs(statsDef.satiety, 0.055) * hMul * dt);

    // Hydration
    let dMul = 1 * (mul.hydration_drain_mult ?? 1);
    const thirst = (night || indoor) ? (climate.thirst_drain_mult_night_or_indoors ?? climate.thirst_drain_mult) : climate.thirst_drain_mult;
    if (typeof thirst === "number" && thirst > 0) dMul *= thirst;
    if (sprinting) dMul *= 1.3;
    if (inFire) dMul *= 1.2;
    this.stats.hydration = Math.max(0, this.stats.hydration - prs(statsDef.hydration, 0.075) * dMul * dt);

    // Stamina regen already handled in move(); apply warmth/hunger/thirst floors
    const stam = statsDef.stamina || {};
    // Radiation
    const radDef = statsDef.radiation || {};
    const decay = radDef.natural_decay_per_real_second ?? 0.01;
    const zones = radDef.zone_gain_per_real_second || { rad_low: 0.12, rad_med: 0.4, rad_high: 1.0, fallout_rain_outdoors: 0.25 };
    let radGain = 0;
    const wxRad = wdef.radiation_zone_outdoors;
    if (!indoor && wxRad) radGain = zones[wxRad] ?? 0;
    if (radZone) radGain = Math.max(radGain, indoor ? (zones.rad_low ?? 0.12) : (zones.rad_med ?? 0.4));
    if (indoor && radGain) {
      const s = Math.max(0, Math.min(100, seal ?? 0));
      radGain *= (1 - s / 100) * 0.4;
    }
    if (hasGasMask && this.filterOn && this.filterCharge > 0) {
      radGain *= (radDef.mitigation?.mask_filter_active ?? 0.2);
      this.filterCharge = Math.max(0, this.filterCharge - dt * 0.7);
      if (this.filterCharge <= 0) this.filterOn = false;
    }
    if (radGain > 0) this.stats.rad = Math.min(100, this.stats.rad + radGain * dt * (mul.radiation_gain_mult ?? 1));
    else this.stats.rad = Math.max(0, this.stats.rad - decay * dt);

    // Threshold damage
    const dmgMul = mul.survival_damage_mult ?? 1;
    if (this.stats.warmth <= 0) this.damage(1.2 * dt * dmgMul, "hypothermia");
    else if (this.stats.warmth <= 20) this.damage(0.25 * dt * dmgMul, "hypothermia");
    if (this.stats.hunger <= 0) this.damage(0.2 * dt * dmgMul, "starvation");
    if (this.stats.hydration <= 0) this.damage(0.6 * dt * dmgMul, "dehydration");
    else if (this.stats.hydration <= 10) this.damage(0.2 * dt * dmgMul, "dehydration");
    if (this.stats.rad >= 100) this.damage(2.0 * dt * dmgMul, "radiation");
    else if (this.stats.rad >= 80) this.damage(0.15 * dt * dmgMul, "radiation");

    // Soft health regen
    const soft = statsDef.health?.soft_regen;
    if (soft && this._noDamageT >= (soft.requires?.no_damage_for_real_seconds ?? 10)
        && this.stats.hunger >= (soft.requires?.satiety_min ?? 50)
        && this.stats.hydration >= (soft.requires?.hydration_min ?? 50)
        && this.stats.warmth >= (soft.requires?.warmth_min ?? 50)
        && this.stats.health < (soft.cap ?? 70)) {
      this.stats.health = Math.min(soft.cap ?? 70, this.stats.health + (soft.per_real_second ?? 0.04) * dt);
    }

  }

  damage(n, reason) {
    if (!this.alive) return;
    this.stats.health = Math.max(0, this.stats.health - n);
    this.hurtT = Math.min(0.6, this.hurtT + 0.15);
    this.lastReason = reason;
    if (this.stats.health <= 0) this.alive = false;
  }

  useItem(id, inv) {
    if (id === "filter" || id === "mask_filter" || id === "gas_mask") {
      const have = (inv[id] || 0) || (inv.filter || 0) || (inv.mask_filter || 0);
      if (have <= 0 && id !== "gas_mask") return false;
      if (!this._allowFilter) return false;
      const slot = (inv[id] || 0) > 0 ? id : ((inv.mask_filter || 0) > 0 ? "mask_filter" : "filter");
      if (id !== "gas_mask" && (inv[slot] || 0) > 0) {
        inv[slot]--;
        if (inv[slot] <= 0) delete inv[slot];
      }
      this.filterOn = true;
      this.filterCharge = Math.min(100, (this.filterCharge || 0) + (id === "gas_mask" ? 0 : 100));
      if (id === "gas_mask") this.filterCharge = Math.max(this.filterCharge, 1);
      return true;
    }
    const def = ITEMS[id];
    if (!def || (inv[id] || 0) <= 0) return false;
    if (def.kind === "use") {
      inv[id]--;
      if (inv[id] <= 0) delete inv[id];
      if (def.heal) this.stats.health = Math.min(100, this.stats.health + def.heal);
      // hunger field is negative when the item fills the stomach
      if (def.hunger) this.stats.hunger = Math.min(100, Math.max(0, this.stats.hunger - def.hunger));
      if (def.warmth) this.stats.warmth = Math.min(100, this.stats.warmth + def.warmth);
      return true;
    }
    if (id === "coat") { this.coatOn = true; return true; }
    return false;
  }

  serialize() {
    return {
      x: this.x, z: this.z, yaw: this.yaw, pitch: this.pitch,
      stats: { ...this.stats }, equipped: this.equipped, mags: { ...this.mags },
      coatOn: this.coatOn, filterOn: this.filterOn, filterCharge: this.filterCharge, alive: this.alive,
      wDur: { ...this.wDur }, jammed: { ...this.jammed }, fireMode: { ...this.fireMode },
    };
  }
  restore(d) {
    if (!d) return;
    this.x = d.x ?? this.x; this.z = d.z ?? this.z;
    this.yaw = d.yaw ?? 0; this.pitch = d.pitch ?? 0;
    if (d.stats) this.stats = { ...this.stats, ...d.stats };
    this.equipped = d.equipped || this.equipped;
    this.mags = { ...this.mags, ...(d.mags || {}) };
    this.coatOn = !!d.coatOn; this.filterOn = !!d.filterOn;
    if (d.filterCharge != null) this.filterCharge = d.filterCharge;
    this.alive = d.alive !== false;
    if (d.wDur) this.wDur = { ...d.wDur };
    if (d.jammed) this.jammed = { ...d.jammed };
    if (d.fireMode) this.fireMode = { ...d.fireMode };
    this.showWeapon();
  }

  toggleFireMode(modes) {
    if (!modes || modes.length < 2) return this.fireMode[this.equipped] || modes?.[0] || "semi";
    const cur = this.fireMode[this.equipped] || modes[0];
    const i = (modes.indexOf(cur) + 1) % modes.length;
    this.fireMode[this.equipped] = modes[i];
    return modes[i];
  }
}
