import * as THREE from "three";
import { CFG, WEAPONS_ORDER } from "./config.js?v=r15";
import { weaponKind } from "./weapons/viewmodels.js?v=r15";
import { Input } from "./input.js?v=r15";
import { HUD } from "./hud.js?v=r15";
import { World } from "./world.js?v=r15";
import { Player } from "./player.js?v=r15";
import { EnemySystem } from "./enemies.js?v=r15";
import { addItem, takeItem, hasItems, craft, emptyInv, mergeLoot } from "./inventory.js?v=r15";
import { openCharacterSheet } from "./inventoryUI.js?v=r15";
import {
  emptyDialogueMem, markNode, markChoice, markComplete, filterChoices, resumeNodeId,
  makeRevisitDialogue, authoredRevisit, hydrateDialogueMem, looksLikeFeedChoice,
  looksLikeFeedNode, choiceFlagName, memHasFeed,
} from "./dialogueMem.js?v=r15";
import { currentMainObjective, currentSideObjective, isSideObjective, noteSideQuestUpdate, renderQuestLogHtml } from "./questTrack.js?v=r15";
import { createMinimap, loadObjectiveBinds, packExploredFog, restoreExploredFog } from "./minimap.js?v=r15";
import { stopDoll3D } from "./doll3d.js?v=r15";
import { emptyGear, wearItem, carryState, canAddWeight, combinedInsulation } from "./equipment.js?v=r15";
import { StorySystem, applyEffects, evalCondition, resolveBranches, setFlag, dialogueCompleteFlags, dialogueIsComplete, registerItemFlagResolver } from "./story.js?v=r15";
import { loadSystems, aliasItem, rollContainer, rollDrops, getWeapon, stripRetiredInv } from "./systems.js?v=r15";
import { tickCompanion, disposeCompanion } from "./companion.js?v=r15";
import { collectCompanionCommands, collectPendingActions, mergeActionChoices, startTracking, restoreTracking, findTrackTarget, setCompanionMode } from "./companionCmd.js?v=r15";
import { pinNpc, unpinNpc, haltForTalk, findNpc } from "./npcWander.js?v=r15";
import { BreathSystem } from "./breath.js?v=r15";
import { openTradeModal } from "./trade.js?v=r15";
import { preloadModels } from "./models3d.js?v=r15";
import { loadLevels, advanceChapter, ensureChapterLevel } from "./levels.js?v=r15";
import { isMobileClient, canvasDpr } from "./device.js?v=r15";
import { LevelRuntime } from "./levelLoader.js?v=r15";
import { attachAudio } from "./audioHook.js?v=r15";
import { discoverRenderModule, attachRenderModule } from "./renderHook.js?v=r15";
import { createRenderPipeline, TIERS, environmentForChapter } from "../render/index.js?v=r15";
import { loadLumenPixelOverrides, applyPixelTiers, winterPalette } from "./pixel.js?v=r15";
import { loadSave, hasSave, writeSave, clearSave, migrateSave, applyCh1CompleteFlags, normalizeChapter, CH02_SPAWN } from "./save.js?v=r15";
import { createSky, hudHour } from "../sky/sky.js?v=r15";

window.__ASHFALL_MODULE = true;
window.__ASHFALL_BUILD = "r15";
if (window.__ASHFALL_EXPECTED_BUILD && window.__ASHFALL_EXPECTED_BUILD !== "r15") {
  if (typeof window.__ashfallBustStaleBuild === "function") window.__ashfallBustStaleBuild(window.__ASHFALL_BUILD);
}

const $ = (id) => document.getElementById(id);
const frame = $("frame");
const view = $("view");
const hudCanvas = $("hud");
const panel = $("panel");

function showLoad(pct, label) {
  const el = $("loader");
  if (!el) return;
  el.classList.add("show");
  const n = Math.max(0, Math.min(100, Math.round(pct || 0)));
  const fill = $("load-fill");
  const text = $("load-pct");
  if (fill) fill.style.width = n + "%";
  if (text) text.textContent = (label || "Loading") + " " + n + "%…";
}
function hideLoad() {
  $("loader")?.classList.remove("show");
}
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error((label || "load") + " timed out after " + ms + " ms")), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}
const CHAPTER_LOAD_MS = 30000;
function showError(err) {
  const msg = String(err && (err.stack || err.message) || err);
  const el = $("boot-error");
  const pre = $("boot-error-pre");
  const title = $("boot-error-title");
  const dismiss = $("boot-error-dismiss");
  const runtime = !!window.__ASHFALL_BOOTED;
  if (title) title.textContent = runtime ? "RUNTIME ERROR" : "ASHFALL FAILED TO LOAD";
  if (pre) pre.textContent = msg;
  if (el) {
    el.classList.toggle("runtime", runtime);
    el.classList.add("show");
  }
  if (dismiss) {
    dismiss.hidden = !runtime;
    dismiss.onclick = () => { el?.classList.remove("show"); };
  }
  window.__ERROR = msg;
  try { console.error(err); } catch {}
}
function cleanLabel(s) {
  return String(s || "").replace(/\s*\(\s*filler\s*\)/gi, "").replace(/\s{2,}/g, " ").trim();
}
function showSaveNotice(msg) {
  const el = $("save-notice");
  if (el) {
    el.hidden = false;
    el.textContent = msg;
    el.classList.add("show");
  }
  window.__SAVE_NOTICE = msg;
  try { console.warn(msg); } catch {}
}
function bindTap(id, fn) {
  const el = $(id);
  if (!el) return;
  let locked = false;
  const go = (e) => {
    if (e) {
      try { e.preventDefault(); e.stopPropagation(); } catch {}
    }
    if (locked) return;
    locked = true;
    setTimeout(() => { locked = false; }, 450);
    try { fn(e); } catch (err) { showError(err); }
  };
  el.addEventListener("pointerup", go);
  el.addEventListener("click", go);
}

function showScreen(id) {
  for (const s of document.querySelectorAll(".screen")) s.classList.remove("show");
  if (id) $(id)?.classList.add("show");
}

let _touchInput = null;
function setMenuOpen(on) {
  document.body.classList.toggle("menu-open", !!on);
  if (on) document.exitPointerLock?.();
  // Opening or closing a menu hides/shows #touch; drop any latched stick
  // before the matching pointerup can be lost.
  _touchInput?.resetTouch?.();
}
function bindTouchInput(input) { _touchInput = input; }
function setPlaying(on) {
  document.body.classList.toggle("playing", !!on);
}

class Game {
  constructor(ctx) {
    Object.assign(this, ctx);
    this.mode = "title";
    this.timeOfDay = 0.38;
    this.blizzard = false;
    this.blizzardT = 0;
    this.dayN = 0;
    this.acc = 0;
    this.saveAcc = 0;
    this.flags = this.story.startingFlags();
    this.trust = this.story.startingTrust();
    this.alive = {};
    this.inv = emptyInv();
    this.quests = {};
    this.hudUnlocks = new Set((this.story.hooks?.hud_unlocks?.ch01) || ["hp", "hydration", "hunger"]);
    this.seen = {};
    this.dialogueMem = emptyDialogueMem();
    this.exploredFog = {};
    this.notes = [];
    this.firedTriggers = new Set();
    this.levelRuntime = null;
    this._loadingLevel = false;
    this.lootOpen = null;
    this.dlg = null;
    this.dlgId = "start";
    this.searchT = 0;
    this.toast = "";
    this.fps = 60;
    this._fpsT = 0;
    this._frames = 0;
    this.last = performance.now();
    this.ray = new THREE.Raycaster();
    this._ended = false;
    this.shelterSeals = {};
    this.breath = new BreathSystem(this.world.scene);
    // Rev 2: holding a quest item satisfies item-gated flags everywhere (objectives, branches, triggers).
    registerItemFlagResolver((flag) => this._itemForFlag(flag));
    this._breakInCd = 0;
    this._bootHook();
    this._bindUi();
    this._initMinimap();
  }

  _initMinimap() {
    try {
      let el = $("minimap");
      if (!el) {
        el = document.createElement("canvas");
        el.id = "minimap";
        (document.getElementById("frame") || document.body).appendChild(el);
      }
      this.minimap = createMinimap(el);
      loadObjectiveBinds();
    } catch (err) {
      console.warn("[minimap] init", err);
    }
  }

  _bootHook() {
    if (this.enemies) this.enemies.onKill = (e) => this._dropEnemyLoot(e);
    const self = this;
    window.__ASHFALL = {
      get ready() { return true; },
      get game() { return self; },
      reconcile: (why) => self.reconcileInventoryObjectives(why || "debug"),
      get mode() { return self.mode; },
      get flags() { return self.flags; },
      get player() { return self.player; },
      get inv() { return self.inv; },
      get fps() { return self.fps; },
      get autoSprint() { return !!self.input.autoSprint; },
      interact: () => self.interact(),
      leaveDialogue: () => self.leaveDialogue(),
      get sprinting() { return !!self.input.sprint; },
      get loot() { return self.world && self.world.loot; },
      storyFiles: self.story.loadedFiles,
      systemsFiles: self.systems.loadedFiles,
      levelsFiles: self.levels.loadedFiles,
      render: self.renderInfo,
      pixel: self.pixel,
      audio: self.audio.source,
      startGame: (opts) => self.newGame(opts),
      loadGame: () => self.continueGame(),
      setTime: (t) => { self.timeOfDay = t; },
      setBlizzard: (v) => { self.blizzard = !!v; self._lockWeather = true; },
      giveItem: (id, n = 1) => addItem(self.inv, aliasItem(id), n),
      equipGear: (id) => {
        id = aliasItem(id);
        if (!self.inv[id]) addItem(self.inv, id, 1);
        const def = self.systems.items[id] || {};
        if (def.kind === "gun" || def.kind === "melee" || def.kind === "throw" || def.type === "ranged" || def.type === "melee") {
          self.player.tryEquip(id, self.inv);
          self.player.gear = self.player.gear || {};
          self.player.gear.main_hand = { id, durability: self.player.wDur[id] ?? def.durability ?? 100 };
          return true;
        }
        return !!wearItem(self.player, self.inv, id, self.systems.items, self.flags).ok;
      },
      beginInvDrag: (id) => !!(self.beginInvDrag && self.beginInvDrag(id)),


      openInv: () => self.openInventory(),
      openCraft: () => self.openCraft(),
      openLoot: (id) => {
        const L = self.world.loot.find((x) => x.id === id) || self.world.loot.find((x) => !x.taken);
        if (L) self.beginSearch(L);
      },
      spawnEnemy: (kind = "husk") => {
        const p = self.player;
        const e = self.enemies.spawn(kind, p.x - Math.sin(p.yaw) * 3.2, p.z - Math.cos(p.yaw) * 3.2, { ambient: false });
        if (e) { e.hostile = "always"; e.dormant = false; e.state = "chase"; }
        return !!e;
      },
      forceFight: (kind = "watch_militia") => {
        const p = self.player;
        addItem(self.inv, "pistol", 1);
        addItem(self.inv, "ammo_9mm", 18);
        p.tryEquip("pistol", self.inv);
        p.mags.pistol = (this._wep("pistol").magazine || 15);
        const dist = 2.15;
        const x = p.x - Math.sin(p.yaw) * dist + Math.cos(p.yaw) * 0.35;
        const z = p.z - Math.cos(p.yaw) * dist - Math.sin(p.yaw) * 0.35;
        const e = self.enemies.spawn(kind, x, z, { ambient: false, encounter: "test_fight" });
        if (e) {
          e.hostile = "always";
          e.hostileActive = true;
          e.dormant = false;
          e.state = "chase";
          e.heading = Math.atan2(p.x - e.x, p.z - e.z);
          if (e.mesh) e.mesh.visible = true;
        }
        return !!(e && e.mesh);
      },
      fire: () => self.tryFire(),
      toggleFireMode: () => self.toggleFireMode(),
      setHealth: (n) => { self.player.stats.health = n; },
      teleport: (x, z, yaw) => {
        const hit = self.world?.collide ? self.world.collide(x, z, 0.38) : { x, z };
        const b = self.world?.bounds;
        let px = hit.x, pz = hit.z;
        if (b) {
          px = Math.max(b.minX + 0.4, Math.min(b.maxX - 0.4, px));
          pz = Math.max(b.minZ + 0.4, Math.min(b.maxZ - 0.4, pz));
        }
        self.player.x = px; self.player.z = pz;
        if (yaw != null) self.player.yaw = yaw;
      },
      completeObjective: (id) => { self.quests[id] = "done"; },
      triggerEnding: (id) => self.showEnding(id || self.story.resolveEnding(self.flags, self._storyCtx())),
      setChapter: (id, opts) => self.setChapter(id, opts),
      requestChapter: (id, opts) => self.requestChapter(id, opts),
      loadStage: () => self._loadStage || null,
      closeUi: () => self.closePanel(),
      get world() { return self.world; },
      get bounds() { return self.world && self.world.bounds; },
      get colliders() { return (self.world && self.world.colliders) || []; },
      unstuck: () => self.unstuck(),
      cycleWeapon: () => self.cycleWeapon(),
      resetTouch: () => self.input && self.input.resetTouch && self.input.resetTouch(),
      say: (msg, dur) => self.hud && self.hud.say(String(msg||''), dur == null ? 8 : dur),
      get objective() { return self.objectiveText(); },
      get prompt() { return (self.hud && self.hud.prompt) || ""; },
      get quests() { return self.quests; },
      craftRecipes: () => (self.activeCraftRecipes ? self.activeCraftRecipes() : []).map((r) => ({
        id: r.id, out: r.out?.id, name: r.name, isObjective: !!r.isObjective, in: r.in, set_flags: r.set_flags || [],
      })),
      doll3d: () => (window.__ASHFALL_DOLL3D ? window.__ASHFALL_DOLL3D.debug() : null),
      talk: (id) => self._openNpcTalk(id),
      startTracking: (target) => startTracking(self, target),
      restoreTracking: () => restoreTracking(self),
      advanceCompanion: (seconds = 1) => {
        const step = 1 / 30;
        const n = Math.max(1, Math.round(Number(seconds) / step));
        for (let i = 0; i < n; i++) tickCompanion(self, step);
        const rec = self.world && self.world.companion;
        return rec ? { x: rec.x, z: rec.z, arrived: !!rec._arrived, pathI: rec._pathI, toast: self.hud && self.hud.toast, objective: self.objectiveText() } : null;
      },
      findTrackTarget: () => findTrackTarget(self),
      setCompanionMode: (mode, target) => setCompanionMode(self, mode, target),
      pinNpc: (id, x, z) => {
        const n = (self.world.npcs || []).find((p) => p.id === id || p.id === "npc_" + id);
        if (n) pinNpc(n, x, z);
        return !!n;
      },
      unpinNpc: (id) => {
        const n = (self.world.npcs || []).find((p) => p.id === id || p.id === "npc_" + id);
        if (n) unpinNpc(n);
        return !!n;
      },
      npcState: () => (self.world.npcs || []).map((n) => ({
        id: n.id, model: n.model || n.mesh?.userData?.model, x: n.x, z: n.z,
        homeX: n.homeX, homeZ: n.homeZ, behavior: n.behavior,
        companion: !!n.companion, scripted: !!n.scripted,
        clip: n.mesh?.userData?.animClip || null,
        mixer: !!n.mesh?.userData?.mixer,
        wait: n._w?.wait || 0, hold: n._w?.hold || 0, i: n._w?.i,
      })),
      measureMove: (seconds = 1.4, fps = 60, sprint = false) => self._measureMove(seconds, fps, sprint),
      get inputState() {
        const i = self.input || {};
        const joy = i._joy || {};
        return {
          moveX: i.moveX, moveZ: i.moveZ, sprint: !!i.sprint, autoSprint: !!i.autoSprint,
          fwdTime: i._fwdTime || 0, fire: !!i.fire, aim: !!i.aim,
          joyActive: !!joy.active, joyX: joy.x || 0, joyY: joy.y || 0, joyId: joy.id ?? null,
          joyClass: (document.getElementById('joy')||{}).className || '',
        };
      },
      wepFade: () => self.hud && self.hud.wepFade,
      wepName: () => (self.player && self.player.equipped),

      weaponChrome: () => {
        const vis = (id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const s = getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden";
        };
        return {
          kind: self._syncWeaponChrome?.() || null,
          equipped: self.player && self.player.equipped,
          classes: document.body.className,
          fire: vis("btn-fire"), aim: vis("btn-aim"), reload: vis("btn-reload"),
          melee: vis("btn-melee"), swap: vis("btn-swap"), use: vis("btn-interact"),
        };
      },
      dumpColliders: () => ({
        bounds: self.world.bounds,
        spawn: self.levelRuntime && self.levelRuntime.spawn,
        colliders: (self.world.colliders || []).map((c) => ({...c})),
        visuals: self.world.gatherVisualBoxes ? self.world.gatherVisualBoxes() : [],
        loot: (self.world.loot || []).map((L) => ({ id: L.id, x: L.x, z: L.z, label: L.label })),
        player: { x: self.player.x, z: self.player.z },
      }),
      openCraft: () => self.openCraft(),
      openInv: () => self.openInventory("bag"),
      openQuests: () => self.openInventory("quests"),
      get dialogueMem() { return self.dialogueMem; },
      get sideObjective() { return self.sideObjectiveText(); },
      get questLogHtml() { return renderQuestLogHtml(self); },
      setFlag: (name, value = true) => setFlag(self.flags, name, value),
      reconcileFeed: () => self.reconcileFeedAndDialogue(),
      minimap: () => {
        const el = document.getElementById("minimap");
        if (!el) return { ok: false };
        const cs = getComputedStyle(el);
        return {
          ok: true,
          display: cs.display,
          width: el.clientWidth,
          height: el.clientHeight,
          buf: el.width,
          visible: cs.display !== "none" && el.clientWidth > 0,
        };
      },
    };
  }

  _bindUi() {
    const unlock = () => { try { this.audio?.unlock(); } catch {} };
    bindTap("btn-new", () => { unlock(); this.newGame(); });
    bindTap("btn-continue", () => { unlock(); this.continueGame(); });
    $("btn-continue").style.display = hasSave() ? "" : "none";
    bindTap("btn-notes-title", () => this.openNotes(true));
    bindTap("btn-resume", () => this.resume());
    bindTap("btn-unstuck", () => this.unstuck());
    if ($("btn-look")) {
      const cur = (this.pipeline && this.pipeline.getLook && this.pipeline.getLook()) || this.look || localStorage.getItem("ashfall.look") || "refined";
      $("btn-look").textContent = "LOOK: " + String(cur).toUpperCase();
      bindTap("btn-look", () => this.cycleLook());
    }
    if ($("btn-crt")) {
      const cur = (this.pipeline && this.pipeline.getCRT && this.pipeline.getCRT()) || localStorage.getItem("ashfall.crt") || "low";
      $("btn-crt").textContent = "CRT: " + String(cur).toUpperCase();
      bindTap("btn-crt", () => this.cycleCRT());
    }
    bindTap("btn-save", () => { this.save(); this.hud.say("Saved."); });
    bindTap("btn-notes", () => this.openNotes(false));
    if ($("btn-quests")) bindTap("btn-quests", () => this.openInventory("quests"));
    bindTap("btn-quit", () => this.toTitle());
    bindTap("btn-restart", () => this.newGame());
    bindTap("btn-menu", () => this.toTitle());
    bindTap("btn-ending-menu", () => this.toTitle());

    const pending = window.__ASHFALL_PENDING;
    window.__ASHFALL_PENDING = null;
    if (pending === "btn-new") this.newGame();
    else if (pending === "btn-continue") this.continueGame();
    else if (pending === "btn-notes-title") this.openNotes(true);
  }

  cycleLook() {
    const cur = (this.pipeline && this.pipeline.getLook && this.pipeline.getLook()) || this.look || localStorage.getItem("ashfall.look") || "refined";
    const next = cur === "classic" ? "refined" : "classic";
    this.look = next;
    try { this.pipeline?.setLook(next); } catch (e) { console.warn("[look]", e); }
    try { localStorage.setItem("ashfall.look", next); } catch {}
    if ($("btn-look")) $("btn-look").textContent = "LOOK: " + next.toUpperCase();
    if (this.pipeline) {
      sizeView(this.renderer, this.pipeline);
      gameHudResize(this.hud, this.pipeline);
    }
    this.audio?.ui();
  }

  cycleCRT() {
    const order = ["off", "low", "med"];
    const cur = (this.pipeline && this.pipeline.getCRT && this.pipeline.getCRT()) || this.crt || localStorage.getItem("ashfall.crt") || "low";
    const next = order[(Math.max(0, order.indexOf(cur)) + 1) % order.length];
    this.crt = next;
    try { this.pipeline?.setCRT(next); } catch {}
    try { localStorage.setItem("ashfall.crt", next); } catch {}
    if ($("btn-crt")) $("btn-crt").textContent = "CRT: " + next.toUpperCase();
    this.audio?.ui();
  }

  toTitle() {
    this.mode = "title";
    setPlaying(false);
    setMenuOpen(false);
    panel.classList.remove("show", "char-sheet");
    showScreen("title");
    $("btn-continue").style.display = hasSave() ? "" : "none";
  }

  newGame(opts = {}) {
    showLoad(8, "Loading");
    this.flags = this.story.startingFlags();
    this.trust = this.story.startingTrust();
    this.alive = {};
    this.inv = emptyInv();
    this.quests = {};
    this._acquired = {};
    this.traderStock = {};
    this.hudUnlocks = new Set((this.story.hooks?.hud_unlocks?.ch01) || ["hp", "hydration", "hunger"]);
    this.seen = {};
    this.dialogueMem = emptyDialogueMem();
    this.exploredFog = {};
    this._lastSideText = "";
    this.notes = [this.story.notesCatalog?.[0]].filter(Boolean);
    this.timeOfDay = 0.38;
    this.blizzard = false;
    this.blizzardT = 0;
    this.dayN = 0;
    this._ended = false;
    this.shelterSeals = {};
    this.firedTriggers = new Set();
    this._breakInCd = 0;
    this.player.filterCharge = 0;
    this.player.filterOn = false;
    this.player._allowFilter = false;
    this.player.restore({
      x: this.levels.world.spawn?.x ?? 0,
      z: this.levels.world.spawn?.z ?? 8,
      yaw: this.levels.world.spawn?.yaw ?? 0,
      pitch: -0.08,
      stats: { health: 100, warmth: 100, hunger: 82, hydration: 85, stamina: 100, rad: 0 },
      equipped: "knife", mags: { blaster: 0, pistol: 0 },
      coatOn: false, filterOn: false, alive: true,
    });
    for (const L of this.world.loot) {
      L.taken = false;
      L.remaining = { ...(L.items || {}) };
      if (L.mesh) L.mesh.visible = true;
    }
    for (const e of this.enemies.list) {
      e.alive = true;
      e.hp = e.max;
      if (e.mesh) e.mesh.visible = true;
    }
    // r8: grant ch01 survival basics (bucket, flashlight, …) from items.json starting_loadout.
    const adds = this.systems?.startingLoadout?.systems_additions_ch01 || {};
    for (const [id, n] of Object.entries(adds)) {
      // items.json firewood has legacy_id "wood" (emptyInv's id) — fold the legacy stack into the
      // canonical id so recipes/loot (which use firewood) see one "Dry wood" stack.
      const legacy = this.systems?.items?.[id]?.legacy_id;
      if (legacy && legacy !== id && this.inv[legacy]) {
        addItem(this.inv, id, this.inv[legacy]);
        delete this.inv[legacy];
      }
      const have = this.inv[aliasItem(id)] || 0;
      if (n > have) addItem(this.inv, id, n - have);
    }
    const worn = this.systems?.startingLoadout?.equipped_ch01 || [];
    for (const id of worn) {
      if (!this.inv[id]) addItem(this.inv, id, 1);
      wearItem(this.player, this.inv, id, this.systems.items, this.flags);
    }
    const jump = normalizeChapter((opts && opts.chapter) || "ch01");
    if (jump && jump !== "ch01") {
      applyCh1CompleteFlags(this.flags);
      this.flags.chapter = jump;
      this.flags.r15_ch02_rescue = true;
      if (jump === "ch02") {
        this.quests.q_essential_card = this.quests.q_essential_card || "start";
        this.timeOfDay = 0.45;
      }
    }
    return this.setChapter(jump, { endPrevious: false, fireLoad: true, teleport: true }).then(() => {
      hideLoad();
      // fireLoadTriggers may have opened the opening dialogue — do not dismiss it.
      if (this.mode === "dialogue" || panel.classList.contains("show")) {
        showScreen(null);
        setMenuOpen(true);
        this.mode = "dialogue";
      } else {
        this.enterPlay();
      }
    }).catch((err) => {
      hideLoad();
      showError(err);
    });
  }

  continueGame() {
    showLoad(8, "Loading");
    const startFresh = (notice) => {
      const msg = notice || "Old save incompatible — starting a fresh shift";
      showSaveNotice(msg);
      try { this.hud?.say(msg); } catch {}
      try { clearSave(); } catch {}
      return this.newGame();
    };
    try {
      const raw = loadSave();
      if (!raw) return this.newGame();
      const mig = migrateSave(raw);
      if (!mig.ok) return startFresh(mig.notice);
      const s = mig.save;
      for (const k of ["theo_alive", "hank_alive", "insulin_found", "insulin_given"]) delete s.flags?.[k];
      this.flags = { ...this.story.startingFlags(), ...(s.flags || {}) };
      this.flags.chapter = s.flags.chapter;
      this.trust = { ...this.story.startingTrust(), ...(s.trust || {}) };
      this.alive = s.alive || {};
      this.inv = stripRetiredInv(s.inv || emptyInv());
      this.quests = s.quests || {};
      this.traderStock = s.traderStock || {};
      this._acquired = s.acquired || {};
      this.seen = s.seen || {};
      this.dialogueMem = hydrateDialogueMem(s.dialogueMem || emptyDialogueMem(), { flags: this.flags, seen: this.seen }, this.story);
      restoreExploredFog(this, s.exploredFog || {});
      this.notes = Array.isArray(s.notes) ? s.notes : [];
      this.timeOfDay = s.timeOfDay ?? 0.4;
      this.blizzard = !!s.blizzard;
      this.dayN = s.dayN || 0;
      this.player.restore(s.player);
      this.shelterSeals = { ...(s.shelterSeals || {}) };
      this._breakInCd = 0;
      const taken = new Set(s.lootTaken || []);
      for (const L of this.world.loot) {
        if (taken.has(L.id)) {
          L.taken = true;
          L.remaining = {};
          if (L.mesh) L.mesh.visible = false;
        } else {
          L.taken = false;
          L.remaining = s.lootLeft?.[L.id] || { ...(L.items || {}) };
        }
      }
      const ch = this.flags.chapter || "ch01";
      this.hudUnlocks = new Set(["hp", "hydration", "hunger"]);
      const hookUnlocks = this.story.hooks?.hud_unlocks || {};
      const n = this._chapterNum(ch);
      for (const [cid, list] of Object.entries(hookUnlocks)) {
        if (this._chapterNum(cid) <= n) {
          for (const u of list) {
            if (String(u).toLowerCase() === "seal" && !this.flags.shelter_sealed) continue;
            this.hudUnlocks.add(u);
          }
        }
      }
      if (s.hudUnlocks) for (const u of s.hudUnlocks) this.hudUnlocks.add(u);
      if (this.flags.shelter_sealed && !Object.keys(this.shelterSeals).length) {
        this.shelterSeals.loc_east_end = 100;
        this.hudUnlocks.add("seal");
      }
      this._syncEnemiesForChapter(ch);
      this._syncAliveFromFlags();
      this.firedTriggers = new Set(s.firedTriggers || []);
      return this.setChapter(ch, { endPrevious: false, fireLoad: false, teleport: false }).then(() => {
        this.player.restore(s.player);
        if (mig.rescuedToCh02) {
          try { this.save(); } catch {}
        }
        hideLoad();
        this.enterPlay();
        this.reconcileInventoryObjectives("restore");
      }).catch((err) => {
        console.warn("[continue]", err);
        return startFresh("Old save incompatible — starting a fresh shift");
      });
    } catch (err) {
      console.warn("[continue]", err);
      return startFresh("Old save incompatible — starting a fresh shift");
    }
  }

  snapshot() {
    return {
      flags: this.flags,
      trust: this.trust,
      alive: this.alive,
      inv: this.inv,
      quests: this.quests,
      seen: this.seen,
      dialogueMem: this.dialogueMem || emptyDialogueMem(),
      exploredFog: packExploredFog(this.exploredFog),
      notes: this.notes,
      timeOfDay: this.timeOfDay,
      blizzard: this.blizzard,
      dayN: this.dayN,
      player: this.player.serialize(),
      lootTaken: this.world.loot.filter((l) => l.taken).map((l) => l.id),
      lootLeft: Object.fromEntries(this.world.loot.filter((l) => !l.taken).map((l) => [l.id, l.remaining || l.items])),
      shelterSeals: { ...this.shelterSeals },
      hudUnlocks: [...this.hudUnlocks],
      firedTriggers: [...(this.firedTriggers || [])],
      traderStock: this.traderStock || {},
      acquired: this._acquired || {},
      storyVersion: 2,
    };
  }

  save() { writeSave(this.snapshot()); }

  enterPlay() {
    this.mode = "play";
    setPlaying(true);
    setMenuOpen(false);
    panel.classList.remove("show", "char-sheet");
    showScreen(null);
  }

  resume() { this.enterPlay(); }

  pause() {
    if (this.mode !== "play") return;
    this.mode = "pause";
    setMenuOpen(true);
    this.save();
    showScreen("pause");
  }

  _storyCtx() {
    return {
      flags: this.flags,
      inventory: this.inv,
      trust: this.trust,
      quests: this.quests,
      kindness: this.flags.kindness || 0,
      chapter: this.flags.chapter || "ch01",
      seen: this.seen,
      dialogueMem: this.dialogueMem,
      night: this._night(),
      alive: this.alive,
    };
  }

  _night() {
    if (this.sky) return this.sky.isNight();
    const t = this.timeOfDay;
    const day = Math.max(0, Math.cos((t - 0.5) * Math.PI * 2) * 0.5 + 0.5);
    return day < 0.35;
  }

  _ctxFx() {
    return {
      flags: this.flags,
      inventory: this.inv,
      trust: this.trust,
      player: this.player,
      alive: this.alive,
      addItem: (id, n) => { const r = addItem(this.inv, aliasItem(id), n); this.noteAcquired(id, n || 1); return r; },
      takeItem: (id, n) => takeItem(this.inv, aliasItem(id), n),
      setQuest: (id, state, stage) => {
        this.quests[id] = state === "start" ? "active" : (state === "update" ? (stage || "active") : (state || "done"));
      },
      onEvent: (name, ev) => this.handleStoryEvent(name, ev),
    };
  }

  handleStoryEvent(name, ev) {
    ev = ev || {};
    // Only interruptive beats hold the dialogue; status events must not clobber them.
    if (name === "encounter" || name === "minigame" || name === "play_epilogue") {
      this._pendingEvent = { name, ev };
    }
    if (name === "npc_death" && ev.npc) {
      const n = this.world.npcs.find((x) => x.id === ev.npc);
      if (n) { n.alive = false; if (n.mesh) n.mesh.visible = false; }
    }
    if (name === "hud_unlock" && ev.hud) {
      this.hudUnlocks.add(ev.hud);
      if (String(ev.hud).toLowerCase() === "seal") this._sealShelter(ev);
    }
    if (name === "seal_shelter") this._sealShelter(ev);
    if (name === "time_skip") this._timeSkip(ev.hours || 1);
    if (name === "set_theo_side_from_location") this._setTheoSideFromLocation();
  }

  _currentShelterId() {
    const x = this.player.x, z = this.player.z;
    const inFire = this.world.inFire(x, z);
    const loc = this.world.locationAt(x, z);
    if (loc && loc.safe) return loc.id;
    if (inFire) {
      if (loc && loc.id) return loc.id;
      return "loc_east_end";
    }
    return null;
  }

  _sealPct(id) {
    if (!id) return 0;
    const v = this.shelterSeals[id];
    return v == null ? 0 : Math.max(0, Math.min(100, v));
  }

  _sealShelter(ev = {}) {
    const loc = this.world.locationAt(this.player.x, this.player.z);
    const id = ev.shelter || ev.location || ev.id || this._currentShelterId() || loc?.id || "loc_east_end";
    let pct = ev.percent ?? ev.pct ?? ev.seal ?? ev.value;
    if (pct === true || pct == null || pct === "shelter_sealed") pct = 100;
    pct = Math.max(0, Math.min(100, Number(pct) || 100));
    this.flags.shelter_sealed = true;
    this.hudUnlocks.add("seal");
    this.shelterSeals[id] = Math.max(this.shelterSeals[id] || 0, pct);
  }

  _damageShelterSeal(amount, reason) {
    const id = this._currentShelterId();
    if (!id || !this.shelterSeals[id]) return;
    const next = Math.max(0, (this.shelterSeals[id] || 0) - amount);
    this.shelterSeals[id] = next;
    if (this.flags.shelter_sealed && next < 100) {
      // Flag stays as "was sealed once"; the HUD percent is the live value.
    }
    if (reason && amount >= 8) this.hud.say(reason === "window" ? "A window gives." : "The seal takes a hit.");
  }

  _setTheoSideFromLocation() {
    const r = [
      ["harbor", this.flags.rep_harbor || 0],
      ["compact", this.flags.rep_compact || 0],
      ["authority", this.flags.rep_authority || 0],
    ].sort((a, b) => b[1] - a[1]);
    this.flags.theo_side = r[0][1] > 0 ? r[0][0] : "none";
  }

  _timeSkip(hours) {
    const days = hours / 24;
    this.timeOfDay = (this.timeOfDay + days) % 1;
    const skip = Math.min(20, hours * 0.35);
    this.player.tickSurvival(0, {
      blizzard: this.blizzard, night: this._night(),
      inFire: false, radZone: false, indoor: false, seal: 0,
      hasGasMask: !!this.flags.has_gas_mask,
      weather: this._weather, chapter: this.flags.chapter,
      survival: this.systems?.survival, difficulty: this.systems?.difficultyMode,
    });
    // Story time-skips: flat cost from survival.json (not a rate tick).
    this.player.stats.hunger = Math.max(0, this.player.stats.hunger - 15);
    this.player.stats.hydration = Math.max(0, (this.player.stats.hydration ?? 75) - 15);
    this.player.stats.warmth = Math.min(this.player.stats.warmth, 60);
    void skip;
    this.hud.say(hours >= 8 ? "A long stretch passes." : "Hours slip.");
    const el = document.getElementById("fade");
    if (el) {
      el.style.opacity = "1";
      setTimeout(() => { el.style.opacity = "0"; }, 500);
    }
  }

  requestChapter(id, opts) {
    if (!id) return null;
    const dest = String(id).replace(/_.*$/, "") || String(id);
    this._pendingChapter = dest;
    this._pendingChapterOpts = opts || { endPrevious: true, fireLoad: true, teleport: true };
    // Finish the current conversation first (voicemail / chapter-end dialogue).
    if (this.mode === "dialogue" && this.dlg) return null;
    if (this._chapterBusy || this._loadingLevel) return null;
    return this._flushPendingChapter();
  }

  _flushPendingChapter() {
    const id = this._pendingChapter;
    if (!id || this._chapterBusy || this._loadingLevel) return null;
    if (this.mode === "dialogue" && this.dlg) return null;
    this._pendingChapter = null;
    const opts = this._pendingChapterOpts || { endPrevious: true, fireLoad: true, teleport: true };
    this._pendingChapterOpts = null;
    const cur = String(this.flags.chapter || "").replace(/_.*$/, "") || this.flags.chapter;
    if (cur === id) return null;
    return this.setChapter(id, opts);
  }

  async setChapter(id, { endPrevious = true, fireLoad = true, teleport = true } = {}) {
    if (this._chapterBusy) {
      this.requestChapter(id, { endPrevious, fireLoad, teleport });
      return;
    }
    this._chapterBusy = true;
    this._loadStage = "start";
    this.input?.resetTouch?.();
    try {
    showLoad(20, "Loading");
    this._loadStage = "story";
    this.enemies.flags = this.flags;
    disposeCompanion(this.world.companion);
    try {
      if (this.story?.ensureChapterStory) await this.story.ensureChapterStory(id);
      if (this.levels) await ensureChapterLevel(this.levels, id);
    } catch (err) {
      console.warn("[chapter] lazy load", id, err);
    }
    showLoad(40, "Loading world");
    this._loadStage = "world";
    const prev = this.flags.chapter;
    if (endPrevious && prev && prev !== id) {
      this.story.applyChapterEnd(prev, this._ctxFx());
      this._syncAliveFromFlags();
    }
    this.flags.chapter = id;
    this.story.applyChapterStart(id, this._ctxFx());
    const unlocks = this.story.hooks?.hud_unlocks?.[id];
    if (unlocks) {
      for (const u of unlocks) {
        if (String(u).toLowerCase() === "seal" && !this.flags.shelter_sealed) continue;
        this.hudUnlocks.add(u);
      }
    }
    if (this.levelRuntime) {
      this._loadingLevel = true;
      try {
        this.enemies.clearAll?.();
        this.levelRuntime.bind(this);
        const ok = await withTimeout(
          this.levelRuntime.load(id, {
            fired: this.firedTriggers,
            onProgress: (pct, label) => { this._loadStage = label || this._loadStage; showLoad(pct, label || "Loading"); },
          }),
          CHAPTER_LOAD_MS,
          "chapter " + id,
        );
        if (ok && teleport && this.levelRuntime.spawn) {
          const sp = this.levelRuntime.spawn;
          this.player.x = sp.x;
          this.player.z = sp.z;
          if (sp.rotY != null) this.player.yaw = sp.rotY;
          this.player.pitch = 0;
          this.player.syncCamera?.();
        }
        // Ch1 JSON spawn is inside the house facing a tight interior (the
        // live_pages_check shot looked like a close wall/floor). Start on the
        // open street looking down the road toward the wrecked sedan.
        if (ok && teleport && id === "ch01") {
          this.player.x = 1.0;
          this.player.z = -8.5;
          this.player.yaw = 0;
          this.player.pitch = 0;
          this.player.syncCamera?.();
        }
        showLoad(80, "Lighting");
        this._loadStage = "lighting";
        this._applyChapterEnvironment(id);
        this._attachLumenFires();
        if (this.pipeline?.warmup) {
          try { await withTimeout(this.pipeline.warmup(), 8000, "pipeline warmup"); } catch (err) { console.warn("[pipeline] warmup", err); }
        }
        this.world.bindAudio?.(this.audio);
        if (fireLoad) this.levelRuntime.fireLoadTriggers(this);
        this.dialogueMem = hydrateDialogueMem(this.dialogueMem || emptyDialogueMem(), this._storyCtx(), this.story);
        if ((this.flags.chapter || "ch01") === "ch01" && !this.flags.ch01_wraith_fed && this.quests && !this.quests.q_companion_tutorial) {
          this.quests.q_companion_tutorial = "active";
        }
        this.reconcileFeedAndDialogue();
        this.refreshObjective();
        try { restoreTracking(this); } catch (err) { console.warn("[track] restore", err); }
      } catch (err) {
        console.warn("[level] load failed", id, err);
        showError(err);
        this._syncEnemiesForChapter(id);
      }
      this._loadingLevel = false;
    } else {
      this._syncEnemiesForChapter(id);
    }
    const climate = this.systems?.survival?.chapter_climate?.[id] || {};
    const envWx = this.levelRuntime?.level?.environment?.weather || this.levelRuntime?.environment?.weather;
    this._weather = climate.weather || envWx || this._weather || "overcast";
    const n = parseInt(String(id).replace(/\D/g, ""), 10);
    if (!this.levelRuntime) this._applyChapterEnvironment(id);
    this.audio?.impl?.setChapter?.(n);
    this.audio?.impl?.a?.setChapter?.(n);
    const A = this._audioEngine();
    try { A?.setWeatherType?.(this._weather); } catch {}
    if (!this._isWinter()) { this.blizzard = false; this.blizzardT = 0; }
    showLoad(100, "Loading");
    this.reconcileInventoryObjectives("chapter");
    } catch (err) {
      console.warn("[chapter] setChapter failed", id, err);
      showError(err);
    } finally {
      this._loadingLevel = false;
      this._chapterBusy = false;
      this._loadStage = "done";
      // The in-game loader must never linger over gameplay (r8 bug).
      hideLoad();
      try { this._flushPendingChapter(); } catch (err) { console.warn("[chapter] flush", err); }
    }
  }

  _audioEngine() {
    return this.audio?.impl?.engine || this.audio?.impl?.a || window.GameAudio || null;
  }

  _chapterClimate() {
    const ch = this.flags.chapter || "ch01";
    const cc = this.systems?.survival?.chapter_climate || {};
    return cc[ch] || cc[ch.replace(/b$/, "")] || {};
  }

  _isWinter() {
    const env = this.world.season || this._envCfg?.id;
    if (env) return env === "fallout_winter";
    return this._chapterNum(this.flags.chapter) >= 8;
  }

  /** Lumen preset + world season/ground for a chapter (ch07b -> ch7 = late_fall). */
  _applyChapterEnvironment(id) {
    const n = this._chapterNum(id);
    const L = this.levelRuntime?.L || null;
    const lvEnv = L?.environment || {};
    let cfg = null;
    try {
      if (this.pipeline?.setEnvironment) cfg = this.pipeline.setEnvironment(lvEnv.season && /^(summer|autumn|late_fall|fallout_winter)$/.test(lvEnv.season) ? lvEnv.season : n);
    } catch (err) { console.warn("[env] setEnvironment", err); }
    if (!cfg) {
      try { cfg = { id: environmentForChapter(n), sceneHints: { snow: n >= 8 } }; } catch {}
    }
    this._envCfg = cfg;
    this.world.setEnvironment?.(cfg, lvEnv);
  }

  /** Attach Lumen campfire lights for the current level's fires (host point lights stripped). */
  _attachLumenFires() {
    const p = this.pipeline;
    if (!p) return;
    for (const f of this.world.fires || []) {
      if (f.lumen) continue;
      try {
        if (typeof p.addCampfire === "function") {
          f.lumen = p.addCampfire([f.x, 0.02, f.z]);
          this.world.stripHostFireLight?.(f);
        } else if (typeof p.addPointLight === "function" && f.light) {
          p.addPointLight(f.light, { glow: 1.1 });
        }
      } catch (err) { console.warn("[fires]", err); }
    }
  }

  // ---- Retroactive inventory -> objective reconciliation (user playtest fix) ----
  _itemFlagRules() {
    const L = this.levelRuntime?.L || null;
    if (this._ifr && this._ifrLevel === L) return this._ifr;
    const R = {
      ch02_card_secured: "priority_card",
      ch07b_cards_taken: "control_cards",
      got_fuel: "gas_can",
      has_gas_mask: "gas_mask",
      ch08_masked: "gas_mask",
    };
    const soft = new Set(); // routes that only count items gained in play (not starting stock)
    // Universal alternate routes: any interactive that both sets a flag and hands out an item
    // (boil station -> water_clean, deployment bag -> gas mask, Hold A6 -> control cards ...)
    // is also satisfied by holding that item, however it was obtained (loot, craft, trade, NPC).
    const items = this.systems?.items || {};
    for (const it of L?.interactives || []) {
      if (!it.setsFlag || R[it.setsFlag] || !it.givesItems) continue;
      const ids = Array.isArray(it.givesItems) ? it.givesItems : Object.keys(it.givesItems);
      const id = ids.map((x) => aliasItem(x)).find((x) => items[x] && items[x].category !== "material");
      if (id) { R[it.setsFlag] = id; soft.add(it.setsFlag); }
    }
    this._ifrSoft = soft;
    this._ifr = R;
    this._ifrLevel = L;
    return R;
  }

  /**
   * Multi-route ("OR") objectives whose single completion flag is only set on one route in data.
   * Each resolver returns true when it changed flags. Generic shape so new chapters can add routes.
   */
  reconcileFeedAndDialogue() {
    this.dialogueMem = hydrateDialogueMem(this.dialogueMem || emptyDialogueMem(), this._storyCtx(), this.story);
    let changed = false;
    const startTrust = this.story?.startingTrust?.()?.wraith ?? 0;
    const fed = !!(this.flags.ch01_wraith_fed || this.flags.wraith_fed
      || memHasFeed(this.dialogueMem, this.flags)
      || (this.seen?.ch01_wraith_morning && (this.trust?.wraith || 0) > startTrust));
    if (fed && !this.flags.ch01_wraith_fed) {
      setFlag(this.flags, "ch01_wraith_fed", true);
      changed = true;
    }
    if (this.flags.ch01_wraith_fed) {
      if (this.quests && this.quests.q_companion_tutorial !== "done") this.quests.q_companion_tutorial = "done";
      markComplete(this.dialogueMem, "wraith", "ch01_wraith_morning");
    }
    return changed;
  }

  _markWraithFed() {
    if (this.flags.ch01_wraith_fed) return false;
    setFlag(this.flags, "ch01_wraith_fed", true);
    if (this.quests) this.quests.q_companion_tutorial = "done";
    markComplete(this.dialogueMem || (this.dialogueMem = emptyDialogueMem()), "wraith", this.dlg?.id || "ch01_wraith_morning");
    return true;
  }

  _resolveObjectiveRoutes() {
    const f = this.flags;
    let changed = this.reconcileFeedAndDialogue() || false;
    // Ch1 "Fuel: Gil's garage OR the gas can": Lolo's porch sets ch01_gas_choice; Gil's diesel route
    // ("Ask Gil. I'll go with you." -> diesel_jug) never did. Bringing Gil's diesel resolves it.
    if (f.chapter === "ch01" && !f.ch01_gas_choice && f.ch01_lolo_talked) {
      if (f.ch01_asked_gil_for_pruitt && this._holds("diesel_jug")) {
        takeItem(this.inv, "diesel_jug", 1);
        f.ch01_fuel_to_pruitt = true;
        f.ch01_gas_choice = "pruitt";
        this.hud?.say?.("Gil's diesel goes to Mr. Pruitt's machine.");
        changed = true;
      } else if (f.ch01_fuel_to_pruitt) {
        f.ch01_gas_choice = "pruitt";
        changed = true;
      }
    }
    // Lootable containers / props that declare a flag (setsFlag / setFlag / onLoot.setFlag).
    for (const L of this.world.loot || []) {
      if (!L.taken) continue;
      for (const fl of [L.setsFlag, L.setFlag, L.onLoot?.setFlag, L.onLoot?.setsFlag].filter(Boolean)) {
        if (!f[fl]) { f[fl] = true; changed = true; }
      }
    }
    return changed;
  }

  /** Item id that satisfies an item-gated flag, or null. */
  _itemForFlag(flag) {
    if (!flag || typeof flag !== "string") return null;
    const R = this._itemFlagRules();
    if (R[flag]) {
      if (this._ifrSoft?.has(flag) && !((this._acquired || {})[R[flag]] > 0)) return null;
      return R[flag];
    }
    const items = this.systems?.items || {};
    const base = flag.replace(/^ch\d+b?_/, "");
    let m = base.match(/^(?:has|got|found|picked_up|have)_(.+)$/);
    let cand = m ? m[1] : null;
    if (!cand) { m = base.match(/^(.+?)_(?:found|taken|secured|collected|picked_up|got|obtained)$/); cand = m ? m[1] : null; }
    if (!cand) return null;
    if (items[cand]) return cand;
    const al = aliasItem(cand);
    if (al && items[al]) return al;
    return null;
  }

  _holds(id) {
    if (!id) return false;
    if ((this.inv[id] || 0) > 0) return true;
    const al = aliasItem(id);
    if (al !== id && (this.inv[al] || 0) > 0) return true;
    const gear = this.player?.gear || {};
    for (const v of Object.values(gear)) {
      const gid = v && typeof v === "object" ? v.id : v;
      if (gid === id || gid === al) return true;
    }
    return false;
  }

  /** Every flag a live objective / hook could be waiting on. */
  _gatedFlagsInPlay() {
    const out = new Set(Object.keys(this._itemFlagRules()));
    const walk = (c) => {
      if (!c) return;
      if (Array.isArray(c)) return c.forEach(walk);
      if (typeof c !== "object") return;
      if (typeof c.flag === "string") out.add(c.flag);
      for (const k of ["all", "any", "and", "or", "not"]) if (c[k]) walk(c[k]);
    };
    for (const o of this.levelRuntime?.L?.objectives || []) { walk(o.completeWhen); walk(o.startWhen); }
    for (const t of this.levelRuntime?.L?.triggers || []) walk(t.when);
    const hooks = this.story?.hooks || {};
    const ch = hooks.chapters?.[this.flags.chapter] || hooks[this.flags.chapter];
    if (ch && typeof ch === "object") walk(ch.objectives || ch.end_conditions || null);
    return out;
  }

  /**
   * Holding an item satisfies any "picked up X" condition, no matter the order it happened in.
   * Runs on objective activation, dialogue close, chapter load/restore, pickup, craft and trade.
   */
  reconcileInventoryObjectives(reason = "") {
    if (this._reconciling || !this.flags) return [];
    this._reconciling = true;
    const set = [];
    try {
      const before = this.objectiveText();
      if (this._resolveObjectiveRoutes()) set.push("route");
      for (const f of this._gatedFlagsInPlay()) {
        if (this.flags[f]) continue;
        const item = this._itemForFlag(f);
        if (item && this._holds(item)) { this.flags[f] = true; set.push(f); }
      }
      if (set.length) {
        const after = this.objectiveText();
        if (this.hud) this.hud.objText = after;
        if (after !== before) {
          const done = String(before).replace(/^OBJECTIVE\s+/, "");
          this.hud?.say?.("OBJECTIVE COMPLETE — " + done);
          try { this._audioEngine()?.play?.("ui_objective") || this._audioEngine()?.play?.("ui_confirm"); } catch {}
        }
        try { this._checkObjectiveCraftUnlock(); } catch {}
      }
      this._lastReconcile = { reason, set, t: Date.now() };
    } catch (err) {
      console.warn("[reconcile]", err);
    } finally {
      this._reconciling = false;
    }
    return set;
  }

  /** Items gained during play (loot, craft, trade, NPC gifts) — starting stock never counts. */
  noteAcquired(id, n = 1) {
    if (!id || !(n > 0)) return;
    this._acquired = this._acquired || {};
    id = aliasItem(id);
    this._acquired[id] = (this._acquired[id] || 0) + n;
  }

  /** Called after any inventory gain (pickup / craft / trade / give). */
  onItemsChanged(reason) {
    this.reconcileInventoryObjectives(reason || "items");
  }

  _syncAliveFromFlags() {
    for (const n of this.world.npcs) {
      const key = n.id + "_alive";
      if (this.flags[key] === false || this.alive[n.id] === false) {
        n.alive = false;
        if (n.mesh) n.mesh.visible = false;
      }
    }
  }

  _chapterNum(id) {
    return parseInt(String(id || "ch01").replace(/\D/g, ""), 10) || 1;
  }

  _syncEnemiesForChapter(id) {
    const n = this._chapterNum(id);
    // Ambient spawns are chapter-gated: army Ch5–6, dogs from Ch7, husks from Ch8.
    this.enemies.clearAmbient?.() || this.enemies.despawnAmbient?.();
    this.enemies.syncForChapter?.(n, this.world, {
      list: this.story.chapterEnemies(id),
    });
  }


  _pendingTalkChoices(npcId) {
    return mergeActionChoices(
      collectCompanionCommands(this, npcId),
      collectPendingActions(this, npcId)
    );
  }

  _openNpcTalk(id, picked) {
    this._talkNpc = id;
    const dlg = picked !== undefined ? picked : this.story.pickDialogue(id, this._storyCtx());
    if (dlg) { this.openDialogue(dlg); return dlg.id || true; }
    const authored = authoredRevisit((this.story.dialogues || []).find((d) => d.npc === id && this.seen[d.id]));
    if (authored) { this.openDialogue(authored); return authored.id || true; }
    const extras = this._pendingTalkChoices(id);
    const rev = makeRevisitDialogue(this, id, this.objectiveText(), extras);
    this.openDialogue(rev);
    return "revisit_" + id;
  }

  _measureMove(seconds = 1.4, fps = 60, sprint = false) {
    const p = this.player, world = this.world;
    if (!p || !world) return { ok: false };
    const dt = 1 / Math.max(1, fps);
    const steps = Math.max(1, Math.round(seconds * fps));
    const x0 = p.x, z0 = p.z, vx0 = p.vx || 0, vz0 = p.vz || 0, stam = p.stats.stamina;
    p.vx = 0; p.vz = 0;
    const input = { moveX: 0, moveZ: -1, sprint: !!sprint };
    const settle = Math.min(0.45, seconds * 0.3);
    let sx = p.x, sz = p.z, started = false;
    for (let i = 0; i < steps; i++) {
      p.move(dt, input, world, true);
      const t = (i + 1) * dt;
      if (!started && t >= settle) { sx = p.x; sz = p.z; started = true; }
    }
    const time = Math.max(1e-4, seconds - settle);
    const dist = Math.hypot(p.x - sx, p.z - sz);
    const out = {
      ok: true,
      mps: dist / time,
      dist,
      time,
      fps,
      sprint: !!sprint,
      walk: 3.62,
      sprintSpd: 5.58,
      settled: started,
    };
    p.x = x0; p.z = z0; p.vx = vx0; p.vz = vz0; p.stats.stamina = stam;
    return out;
  }

  openDialogue(dlg) {
    if (!dlg) return;
    if (this._talkLockUntil && performance.now() < this._talkLockUntil) return;
    this.dialogueMem = this.dialogueMem || emptyDialogueMem();
    this.dlg = dlg;
    this._talkNpc = this._talkNpc || dlg.npc || dlg.npc_id || null;
    const talking = findNpc(this.world, this._talkNpc);
    if (talking) haltForTalk(talking, this.player);
    const resume = !dlg.revisit ? resumeNodeId(dlg, this.dialogueMem, dlg.npc) : null;
    this.dlgId = resume || dlg.start || "start";
    this._dlgWalk = new Set();
    this.mode = "dialogue";
    setMenuOpen(true);
    if (!dlg.revisit) this.seen[dlg.id] = true;
    this._showNode(true);
  }

  _lockTalk(ms = 600) {
    this._talkLockUntil = performance.now() + ms;
    try { this.input.interact = false; } catch {}
  }

  leaveDialogue() {
    this._lockTalk(700);
    return this._finishDialogue({ left: true });
  }

  _showNode(entering) {
    if (!this.dlg) return;
    let id = this.dlgId;
    let node = this.dlg.nodes[id];
    if (!node) { this._lockTalk(); this.closePanel(); return; }
    this._dlgWalk = this._dlgWalk || new Set();
    if (entering && this._dlgWalk.has(id) && node.branches && !node.text) {
      return this._finishDialogue(node);
    }
    if (entering) this._dlgWalk.add(id);
    if (entering && node.branches && !node.text) {
      const nxt = resolveBranches(node.branches, this._storyCtx());
      if (nxt && nxt !== id) { this.dlgId = nxt; return this._showNode(true); }
      if (!nxt) return this._finishDialogue(node);
    }
    if (entering && node.effects) applyEffects(node.effects, this._ctxFx());
    if (entering) {
      markNode(this.dialogueMem || (this.dialogueMem = emptyDialogueMem()), this.dlg.npc, this.dlg.id, id, node.text);
      if (looksLikeFeedNode(id, node)) this._markWraithFed();
    }
    if (entering && this._pendingEvent && (this._pendingEvent.name === "encounter" || this._pendingEvent.name === "minigame") && !node.text && !node.choices?.length) {
      this._encResumeNext = node.next;
      return this._finishDialogue(node);
    }
    const who = node.speaker && node.speaker !== "narrator"
      ? this.story.npcName(node.speaker) || node.speaker
      : (node.speaker === "narrator" ? "" : this.story.npcName(this.dlg.npc));
    const rawChoices = (node.choices || []).filter((c) => !c.conditions || evalCondition(c.conditions, this._storyCtx()));
    let choices = filterChoices(rawChoices, this.dialogueMem, this.dlg.npc, this.dlg.id, id);
    if (this.dlg?.npc) {
      const cmds = collectCompanionCommands(this, this.dlg.npc);
      const pending = (this.dlg.revisit || /^revisit_/.test(this.dlg.id || ""))
        ? collectPendingActions(this, this.dlg.npc) : [];
      choices = mergeActionChoices(choices, cmds.concat(pending));
    }
    if (entering && (node.choices || []).length && !choices.length && !node.end && (node.next || node.branches)) {
      return this._advanceNode(node);
    }
    const canContinue = !choices.length && (node.next || node.branches || node.end || true);
    let html = `<div class="dlg-bar"><button type="button" data-a="leave">LEAVE</button></div>`;
    if (who) html += `<div class="who">${escapeHtml(String(who).toUpperCase())}</div>`;
    html += `<p class="line">${escapeHtml(node.text || "")}</p><div class="choices">`;
    if (choices.length) {
      choices.forEach((c, i) => {
        html += `<button data-i="${i}">${escapeHtml(c.text)}</button>`;
      });
    } else {
      html += `<button data-i="next">${node.end ? "[Close]" : "[Continue]"}</button>`;
    }
    html += "</div>";
    panel.innerHTML = html;
    panel.classList.add("show");
    panel.querySelectorAll("button").forEach((btn) => {
      let locked = false;
      const go = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (locked) return;
        locked = true;
        this.audio.ui();
        if (btn.dataset.a === "leave") return this.leaveDialogue();
        if (btn.dataset.i === "next") this._advanceNode(node);
        else this._pickChoice(choices[+btn.dataset.i], node);
      };
      btn.addEventListener("pointerup", go);
      btn.onclick = go;
    });
  }

  _advanceNode(node) {
    if (this._pendingEvent && (this._pendingEvent.name === "encounter" || this._pendingEvent.name === "minigame" || this._pendingEvent.name === "play_epilogue")) {
      this._encResumeNext = node.next || resolveBranches(node.branches || [], this._storyCtx());
      return this._finishDialogue(node);
    }
    if (node.branches) {
      const nxt = resolveBranches(node.branches, this._storyCtx());
      if (nxt) { this.dlgId = nxt; return this._showNode(true); }
    }
    if (node.next && !node.end && node.next !== this.dlgId) { this.dlgId = node.next; return this._showNode(true); }
    this._finishDialogue(node);
  }

  _pickChoice(c) {
    if (!c) return;
    if (c.require_item && !((this.inv[aliasItem(c.require_item)] || 0) > 0)) {
      this.hud.say("You don't have that.");
      return;
    }
    const nodeId = this.dlgId;
    const key = markChoice(this.dialogueMem || (this.dialogueMem = emptyDialogueMem()), this.dlg?.npc, this.dlg?.id, nodeId, c);
    if (this.dlg?.id) setFlag(this.flags, choiceFlagName(this.dlg.id, nodeId, key), true);
    if (c.flag) setFlag(this.flags, c.flag, true);
    if (looksLikeFeedChoice(c)) this._markWraithFed();
    if (typeof c._run === "function") {
      try { c._run(this, c); } catch (err) { console.warn("[cmd]", err); }
    }
    if (c.command === "track" && !c._run) startTracking(this);
    if (c.effects) applyEffects(c.effects, this._ctxFx());
    // Placeholder-format fields
    if (c.set_flags) for (const f of (Array.isArray(c.set_flags) ? c.set_flags : [c.set_flags])) {
      if (typeof f === "string") setFlag(this.flags, f, true);
    }
    if (c.unset_flags) for (const f of c.unset_flags) setFlag(this.flags, f, false);
    if (c.add_item) addItem(this.inv, aliasItem(c.add_item), 1);
    if (c.remove_item) takeItem(this.inv, aliasItem(c.remove_item), 1);
    if (c.kindness) this.flags.kindness = (this.flags.kindness || 0) + c.kindness;
    if (c.trust) for (const [k, v] of Object.entries(c.trust)) this.trust[k] = (this.trust[k] || 0) + v;
    if (c.complete_quest) this.quests[c.complete_quest] = "done";
    if (c.start_quest) this.quests[c.start_quest] = "active";
    if (c.set_ending) this.flags.ending = c.set_ending;
    const pending = this._pendingEvent;
    if (pending?.name === "encounter" || pending?.name === "minigame" || pending?.name === "play_epilogue") {
      this._encResumeNext = c.next;
      return this._finishDialogue(c);
    }
    if (this.flags.ending && !this._ended) {
      if (this.dlg?.on_end) applyEffects(this.dlg.on_end, this._ctxFx());
      this.closePanel();
      return this.showEnding(this.flags.ending);
    }
    if (c.end || !c.next) this._finishDialogue(c);
    else { this.dlgId = c.next; this._showNode(true); }
  }

  _dialogueReachedBeat(dlg) {
    if (!dlg) return false;
    const walk = this._dlgWalk || new Set();
    const beatIds = new Set(["lake", "end_hint", "help", "alone", "brave", "stay", "give"]);
    for (const id of walk) {
      if (beatIds.has(id)) return true;
      const n = dlg.nodes?.[id];
      if (n && n.end) return true;
    }
    if (this.flags.ch01_theo_talked || this.flags.theo_talked || this.flags.theo_helped_cooler) return true;
    if (this.quests && this.quests.q_cooler) return true;
    return false;
  }

  _completeDialogueObjectives(dlg) {
    if (!dlg) return;
    for (const f of dialogueCompleteFlags(dlg)) setFlag(this.flags, f, true);
    this.refreshObjective();
  }

  refreshObjective() {
    const beforeSide = this._lastSideText || "";
    const main = this.objectiveText();
    const side = this.sideObjectiveText();
    if (this.hud) {
      this.hud.objText = main;
      this.hud.sideText = side;
    }
    const ch = this.flags?.chapter || "";
    if (this._sideReady && beforeSide !== side && this._sideChapter === ch) {
      noteSideQuestUpdate(this, beforeSide, side);
    }
    this._sideReady = true;
    this._sideChapter = ch;
    this._lastSideText = side;
    if (!this._reconciling) this.reconcileInventoryObjectives("objective");
    try { this._checkObjectiveCraftUnlock(); } catch (_) { /* never block the HUD */ }
  }

  _finishDialogue(node) {
    this._lockTalk(700);
    if (this.dlg?.on_end) applyEffects(this.dlg.on_end, this._ctxFx());
    const left = !!(node && node.left);
    const dlg = this.dlg;
    const leftover = dlg && !dlg.revisit ? resumeNodeId(dlg, this.dialogueMem, dlg.npc) : null;
    if (dlg && !dlg.revisit && !leftover) {
      markComplete(this.dialogueMem || (this.dialogueMem = emptyDialogueMem()), dlg.npc, dlg.id);
      if (dlg.npc) setFlag(this.flags, "talked_" + dlg.npc, true);
    }
    if (!left || this._dialogueReachedBeat(this.dlg)) this._completeDialogueObjectives(this.dlg);
    else this.refreshObjective();
    const pending = this._pendingEvent;
    this._pendingEvent = null;
    const resumeDlg = this.dlg;
    this.closePanel();
    this.reconcileInventoryObjectives("dialogue");
    if (pending?.name === "encounter") return this._runEncounter(pending.ev, resumeDlg);
    if (pending?.name === "minigame") return this._runMinigame(pending.ev, resumeDlg);
    if (pending?.name === "play_epilogue") {
      const epi = this.story.dialogues.find((d) => d.id === "ch10_epilogue");
      if (epi) return this.openDialogue(epi);
    }
    if (this.flags.ending && !this._ended) this.showEnding(this.flags.ending);
    try { this._flushPendingChapter(); } catch (err) { console.warn("[chapter] flush after dialogue", err); }
  }


  _runEncounter(ev, resumeDlg) {
    const id = ev?.id || "enc_unknown";
    const types = this.story.encounterTypes(id);
    const p = this.player;
    this._enc = [];
    this._encResume = { dlg: resumeDlg, next: this._encResumeNext || null, id };
    this._encResumeNext = null;
    let i = 0;
    for (const spec of types) {
      const kind = this.enemies.mapType(spec.type || spec.kind);
      const count = spec.count || 1;
      for (let k = 0; k < count; k++) {
        const ang = (i / Math.max(1, types.length * (spec.count || 1))) * Math.PI - 0.4;
        const dist = 4.2 + (i % 3) * 0.7;
        const x = p.x - Math.sin(p.yaw + ang) * dist;
        const z = p.z - Math.cos(p.yaw + ang) * dist;
        const e = this.enemies.spawn(kind, x, z, { encounter: id, ambient: false });
        if (e) this._enc.push(e);
        i++;
      }
    }
    if (this._currentShelterId() && this._sealPct(this._currentShelterId()) > 0) {
      this._damageShelterSeal(18, "break-in");
    }
    this.hud.say("Get through it.");
    this.mode = "play";
    setMenuOpen(false);
    if (!this._enc.length) this._resolveEncounter(true);
  }

  _tickEncounter() {
    if (!this._enc) return;
    const live = this._enc.filter((e) => e.alive);
    if (!live.length) this._resolveEncounter(true);
  }

  _resolveEncounter(won) {
    const rec = this._encResume;
    this._enc = null;
    this._encResume = null;
    if (!rec) return;
    this.hud.say(won ? "It's over." : "You break off.");
    if (rec.dlg && rec.next) {
      this.dlg = rec.dlg;
      this.dlgId = rec.next;
      this.mode = "dialogue";
      setMenuOpen(true);
      this._showNode(true);
    } else if (rec.dlg && !this.flags.ending) {
      // encounter fired from an end node — just return to play
      this.enterPlay();
    }
    if (this.flags.ending && !this._ended) this.showEnding(this.flags.ending);
  }

  _runMinigame(ev, resumeDlg) {
    const id = ev?.id || "mg";
    this.mode = "minigame";
    setMenuOpen(true);
    const title = id === "mg_jumper_bridge" ? "THE JUMP" : id === "mg_black_start" ? "BLACK START" : "HOLD STEADY";
    const hint = id === "mg_jumper_bridge"
      ? "Hit the mark when the needle is in the band."
      : "Hold the breaker when the lamps line up.";
    panel.innerHTML = `<h2>${title}</h2><p class="line">${hint}</p>
      <div class="searching" id="mg-bar" style="position:relative;height:18px;border:1px solid #e8eef4;margin:10px 0;">
        <div style="position:absolute;left:55%;width:18%;top:0;bottom:0;background:rgba(232,238,244,0.3);"></div>
        <div id="mg-needle" style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#e8eef4;"></div>
      </div>
      <div class="choices"><button id="mg-go">NOW</button></div>`;
    panel.classList.add("show");
    let x = 0, dir = 1, live = true;
    const needle = panel.querySelector("#mg-needle");
    const tick = () => {
      if (!live) return;
      x += dir * 1.8;
      if (x > 100) { x = 100; dir = -1; }
      if (x < 0) { x = 0; dir = 1; }
      if (needle) needle.style.left = x + "%";
      this._mgRaf = requestAnimationFrame(tick);
    };
    this._mgRaf = requestAnimationFrame(tick);
    const finish = (ok) => {
      live = false;
      if (this._mgRaf) cancelAnimationFrame(this._mgRaf);
      if (ok) this.hud.say("Clean.");
      else {
        this.hud.say("You miss it.");
        this.player.damage(12, "fall");
      }
      if (id === "mg_black_start" && ok) this.flags.dam_running = true;
      if (id === "mg_jumper_bridge") this.flags.jumper_ok = ok;
      panel.classList.remove("show", "char-sheet");
      const next = this._encResumeNext;
      this._encResumeNext = null;
      if (resumeDlg && next) {
        this.dlg = resumeDlg;
        this.dlgId = next;
        this.mode = "dialogue";
        this._showNode(true);
      } else this.enterPlay();
    };
    panel.querySelector("#mg-go").onclick = () => finish(x >= 55 && x <= 73);
  }

  closePanel() {
    stopDoll3D();
    panel.classList.remove("show", "char-sheet");
    document.body.classList.remove("char-sheet-open");
    panel.innerHTML = "";
    this.lootOpen = null;
    this.dlg = null;
    this._talkNpc = null;
    if (this.mode === "dialogue" || this.mode === "loot" || this.mode === "searching"
      || this.mode === "inventory" || this.mode === "craft" || this.mode === "notes") {
      this.enterPlay();
    }
    this.refreshObjective();
  }

  _dropEnemyLoot(e) {
    const pack = this.systems?.enemies;
    const list = pack?.enemies || pack || [];
    const arr = Array.isArray(list) ? list : [];
    const def = arr.find((x) => x.id === e.kind) || arr.find((x) => x.id === e.levelRef?.type);
    if (!def || !def.drops) return;
    const loc = this.world.locationAt?.(e.x, e.z)?.id || this.world.locationAt?.(e.x, e.z);
    const items = rollDrops(def.drops, loc, this.flags.chapter, this.systems, "drop:" + e.kind + ":" + Math.round(e.x) + ":" + Math.round(e.z));
    if (!items || !Object.keys(items).length) return;
    const rec = {
      id: "body_" + (e.kind || "e") + "_" + Date.now().toString(36),
      x: e.x, z: e.z, label: "Body", container: "body",
      items, remaining: { ...items }, taken: false,
    };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.9 })
    );
    mesh.position.set(e.x, 0.1, e.z);
    (this.world.levelGroup || this.world.scene || this.enemies.scene).add(mesh);
    rec.mesh = mesh;
    this.world.loot.push(rec);
  }

  beginSearch(L) {
    if (L.taken) { this.hud.say("Already picked over."); return; }
    const isSafe = L.container === "gun_safe" || /gun safe|prepper locker/i.test(L.label || "");
    if (isSafe) {
      const canPry = (this.inv.crowbar || 0) > 0 || (this.inv.bolt_cutters || 0) > 0;
      if (!canPry) {
        this.hud.say("Locked. Need a crowbar or bolt cutters.");
        this._playUi("ui_error");
        return;
      }
    }
    this.mode = "searching";
    setMenuOpen(true);
    this.lootOpen = L;
    this.searchT = 0.42;
    this.audio.rummage();
    panel.innerHTML = `<h2>${escapeHtml(cleanLabel(L.label || "Container").toUpperCase())}</h2><div class="searching">SEARCHING…</div>`;
    panel.classList.add("show");
  }

  revealLoot(L) {
    this.mode = "loot";
    const left = { ...(L.remaining || L.items || {}) };
    // optional table extras already baked into items at apply-time
    const entries = Object.entries(left).filter(([, n]) => n > 0);
    L.remaining = left;
    let html = `<h2>${escapeHtml(cleanLabel(L.label || "Container").toUpperCase())}</h2>`;
    if (!entries.length) {
      html += `<p class="line">Empty. Whoever was here got here first.</p><div class="choices"><button data-a="leave">[Leave]</button></div>`;
    } else {
      html += `<div class="loot-list">`;
      entries.forEach(([id, n], i) => {
        const name = this.systems.items[id]?.name || id;
        html += `<div class="item-row reveal" style="animation-delay:${i * 0.09}s"><span>${escapeHtml(name)}${n > 1 ? "  ×" + n : ""}</span><button data-take="${id}">TAKE</button></div>`;
      });
      html += `</div><div class="inv-actions"><button data-a="all">TAKE ALL</button><button data-a="leave">LEAVE</button></div>`;
    }
    panel.innerHTML = html;
    panel.classList.add("show");
    panel.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.a === "leave") return this._closeLoot();
        if (btn.dataset.a === "all") {
          const left = { ...(L.remaining || {}) };
          const accepted = {};
          for (const [id, n] of Object.entries(left)) {
            if (this.tryGive(id, n)) { accepted[id] = n; delete L.remaining[id]; }
          }
          const got = Object.entries(accepted).map(([id, n]) => (this.systems.items[id]?.name || id) + (n > 1 ? " ×" + n : ""));
          if (Object.keys(L.remaining || {}).some((k) => L.remaining[k] > 0)) {
            this.hud.say((got.length ? got.join(", ") + ". " : "") + "Some items are too heavy.");
            return this.revealLoot(L);
          }
          L.taken = true;
          if (L.mesh) L.mesh.visible = false;
          if (L.note) this._foundNote(L.note);
          this.audio.pickup();
          this.hud.say(got.length ? got.join(", ") : "Nothing.");
          this._onLootFlags(L, true);
          return this._closeLoot();
        }
        if (btn.dataset.take) {
          const id = btn.dataset.take;
          const n = L.remaining[id] || 0;
          if (n) {
            if (!this.tryGive(id, n)) return;
            delete L.remaining[id];
            this.audio.pickup();
            this.hud.say((this.systems.items[id]?.name || id) + (n > 1 ? " ×" + n : ""));
            this._onLootFlags(L, false);
            if (L.note) this._foundNote(L.note);
            if (!Object.values(L.remaining).some((v) => v > 0)) {
              L.taken = true;
              if (L.mesh) L.mesh.visible = false;
              return this._closeLoot();
            }
            this.revealLoot(L);
          }
        }
      };
    });
  }

  _onLootFlags(L, all) {
    const rem = L.remaining || {};
    const got = (id) => (L.items?.[id] || 0) > 0 && !rem[id];
    if (got("gas_can") || got("fuel")) this.flags.got_fuel = true;
    const emptied = all || !Object.values(rem).some((v) => v > 0);
    for (const fl of [L.setFlag, L.setsFlag, L.onLoot?.setFlag, L.onLoot?.setsFlag].filter(Boolean)) {
      if (emptied || Object.keys(L.items || {}).some((id) => got(id))) this.flags[fl] = true;
    }
    this.reconcileInventoryObjectives("pickup");
  }

  _foundNote(id) {
    const n = (this.story.notesCatalog || []).find((x) => x.id === id);
    if (n && !this.notes.some((x) => x.id === n.id)) this.notes.push(n);
  }

  _closeLoot() { this.closePanel(); }

  tryGive(id, n = 1) {
    id = aliasItem(id);
    if (!canAddWeight(this.inv, this.player.gear, this.systems.items, this.systems.carry, id, n)) {
      this.hud.say("Too heavy.");
      return false;
    }
    const ok = addItem(this.inv, id, n);
    if (ok) { this.noteAcquired(id, n); this.reconcileInventoryObjectives("give"); }
    return ok;
  }

  openInventory(tab = "bag") {
    this.mode = tab === "craft" ? "craft" : "inventory";
    this._sheetTab = tab === "craft" ? "craft" : (tab === "quests" ? "quests" : "bag");
    setMenuOpen(true);
    showScreen(null);
    this.player.gear = this.player.gear || emptyGear();
    openCharacterSheet(this, panel, this._sheetTab);
  }

  openCraft() {
    this.openInventory("craft");
  }

  /** Live MAIN objectives (side quests stay off the HUD). The first one is the HUD objective. */
  activeObjectives(opts = {}) {
    const includeSide = !!opts.includeSide;
    const objs = (this.levelRuntime?.L?.objectives || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const ctx = this._storyCtx();
    const out = [];
    for (const o of objs) {
      if (o.startWhen && !evalCondition(o.startWhen, ctx)) continue;
      if (o.completeWhen && evalCondition(o.completeWhen, ctx)) continue;
      if (!includeSide && isSideObjective(o)) continue;
      if (o.text) out.push(o);
    }
    return out;
  }

  sideObjectiveText() {
    const o = currentSideObjective(this);
    return o?.text || "";
  }

  /**
   * Standard recipes plus chapter story/objective craftables (systems story_recipes,
   * level type:"craft" interactives, gameplay_hooks crafting). Objective recipes are pinned first.
   */
  activeCraftRecipes() {
    const base = this.systems.recipes || [];
    const items = this.systems.items || {};
    const ch = String(this.flags.chapter || "ch01").replace(/_.*$/, "") || "ch01";
    const chOk = (r) => !r.chapters || !r.chapters.length || r.chapters.includes(ch) || r.chapters.includes(this.flags.chapter);
    const L = this.levelRuntime?.L || null;
    const objectives = L?.objectives || [];
    const flagsOf = (when) => {
      const out = [];
      const walk = (w) => {
        if (!w) return;
        if (Array.isArray(w)) return w.forEach(walk);
        if (typeof w === "string") return out.push(w);
        if (typeof w === "object") {
          if (w.flag) out.push(w.flag);
          for (const k of ["all", "any", "and", "or"]) if (w[k]) walk(w[k]);
        }
      };
      walk(when);
      return out;
    };
    const objForFlag = (f) => objectives.find((o) => flagsOf(o.completeWhen).includes(f));
    const story = [];
    const findSame = (r) => story.find((x) => x.id === r.id || (x.out?.id && x.out.id === r.out?.id)
      || (r.set_flags || []).some((f) => (x.set_flags || []).includes(f)));
    const merge = (r) => {
      const prev = findSame(r);
      if (!prev) { story.push({ ...r, in: { ...(r.in || {}) }, set_flags: r.set_flags ? r.set_flags.slice() : [] }); return; }
      if (!Object.keys(prev.in || {}).length && r.in) prev.in = { ...r.in };
      prev.set_flags = [...new Set([...(prev.set_flags || []), ...(r.set_flags || [])])];
      if (!prev.name && r.name) prev.name = r.name;
      if (!prev.showWhen && r.showWhen) prev.showWhen = r.showWhen;
      if (!prev.interactive && r.interactive) prev.interactive = r.interactive;
    };
    // a. systems story_recipes
    for (const r of this.systems.storyRecipes || []) if (chOk(r)) merge({ ...r, story: true });
    // b. level craft interactives
    for (const it of (L?.interactives || [])) {
      if (it.type !== "craft") continue;
      const m = /craft\s+([a-z0-9_]+)/i.exec(it.label || "");
      const outId = aliasItem(it.output || it.result || it.craft || (m && m[1]) || it.id);
      const req = Array.isArray(it.requiresItems)
        ? Object.fromEntries(it.requiresItems.map((id) => [aliasItem(id), 1]))
        : { ...(it.requiresItems || {}) };
      const set = it.setsFlag ? [it.setsFlag] : [];
      const label = String(it.label || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
      merge({ id: outId, name: items[outId]?.name || objForFlag(it.setsFlag)?.text || label || null,
        out: { id: outId, n: 1 }, in: req, set_flags: set, story: true, interactive: it.id, showWhen: it.showWhen });
    }
    // c. gameplay_hooks chapter crafting
    const hookCh = (this.story?.hooks?.chapters || []).find((c) => c.id === ch || c.chapter === ch);
    for (const c of hookCh?.crafting || []) {
      const outId = aliasItem(c.result || c.id);
      if (!outId) continue;
      const set = (c.effects || []).filter((e) => e && e.set && e.value !== false).map((e) => e.set);
      const inn = Object.fromEntries(Object.entries(c.inputs || {}).map(([k, v]) => [aliasItem(k), v]));
      merge({ id: outId, name: items[outId]?.name || null, out: { id: outId, n: 1 }, in: inn, set_flags: set, story: true });
    }
    const ctx = this._storyCtx();
    const current = this.activeObjectives()[0] || null;
    const currentFlags = current ? flagsOf(current.completeWhen) : [];
    const pinned = [];
    for (const r of story) {
      const sf = r.set_flags || [];
      if (sf.length && sf.every((f) => !!this.flags[f])) continue; // one-off already done
      const linked = sf.map(objForFlag).filter(Boolean);
      const isCurrent = sf.some((f) => currentFlags.includes(f));
      let show = isCurrent;
      if (!show && r.showWhen) { try { show = !!evalCondition(r.showWhen, ctx); } catch (_) { show = false; } }
      if (!show && !linked.length && !r.showWhen) show = true; // chapter story recipe with no objective gate
      if (!show) continue;
      const outId = r.out?.id || r.id;
      pinned.push({
        ...r,
        name: items[outId]?.name || r.name || outId,
        note: r.note || (isCurrent && current ? "Objective: " + current.text : null),
        isObjective: isCurrent || !!r.showWhen,
      });
    }
    pinned.sort((a, b) => (b.isObjective ? 1 : 0) - (a.isObjective ? 1 : 0));
    const pinnedIds = new Set(pinned.map((r) => r.id));
    const rest = base.filter((r) => !pinnedIds.has(r.id) && !(r.out?.id && pinned.some((p) => p.out?.id === r.out.id)));
    // Report newly unlocked objective recipes once (toast hint).
    this._seenObjRecipes = this._seenObjRecipes || new Set();
    for (const r of pinned) if (r.isObjective && !this._seenObjRecipes.has(r.id)) { this._seenObjRecipes.add(r.id); r.isNew = true; }
    return [...pinned, ...rest];
  }

  /** Called whenever the objective may have changed: hint when a new objective recipe unlocks. */
  _checkObjectiveCraftUnlock() {
    if (!this.levelRuntime?.L) return;
    const before = new Set(this._seenObjRecipes || []);
    let list;
    try { list = this.activeCraftRecipes(); } catch (_) { return; }
    const fresh = list.filter((r) => r.isObjective && !before.has(r.id));
    if (fresh.length && this.hud) {
      this.hud.say?.("New recipe in CRAFT: " + fresh.map((r) => r.name).join(", "));
      this._craftHint = true;
    }
  }

  doCraft(r) {
    const res = craft(this.inv, r, this.world, this.player);
    if (res.ok) {
      this.audio.craft?.();
      const outId = r.out?.id || r.id;
      this.noteAcquired(outId, r.out?.n || r.out?.qty || 1);
      if (r.set_flags) for (const f of r.set_flags) this.flags[f] = true;
      if (typeof r.setsFlag === "string") this.flags[r.setsFlag] = true;
      const nm = this.systems.items?.[outId]?.name;
      if (nm && r.special !== "campfire") res.msg = "Made " + nm;
      this.refreshObjective();
      this.reconcileInventoryObjectives("craft");
    }
    return res;
  }

  equipWeapon(id) {
    if (!id) return false;
    const ok = this.player.tryEquip(id, this.inv);
    if (ok) {
      const def = (this.systems.items && this.systems.items[id]) || {};
      this.player.gear = this.player.gear || emptyGear();
      this.player.gear.main_hand = { id, durability: this.player.wDur[id] ?? def.durability ?? 100 };
      this.hud.showWeaponName?.(2.0);
      this._syncWeaponChrome?.();
    }
    return ok;
  }

  cycleWeapon() {
    const items = this.systems.items || {};
    const held = this.player.equipped;
    const ids = new Set();
    for (const id of WEAPONS_ORDER) {
      if ((this.inv[id] || 0) > 0 || id === held) ids.add(id);
    }
    for (const [id, n] of Object.entries(this.inv)) {
      if (!n) continue;
      const d = items[id] || {};
      if (d.kind === "gun" || d.kind === "melee" || d.kind === "throw" || d.type === "ranged" || d.type === "melee") ids.add(id);
    }
    const list = [...ids];
    if (!list.length) return false;
    const i = Math.max(0, list.indexOf(held));
    const next = list[(i + 1) % list.length];
    this.equipWeapon(next);
    this.hud.showWeaponName(2.0);
    this._syncWeaponChrome?.();
    this.audio.ui?.();
    return true;
  }

  unstuck() {
    const p = this.player;
    const spawn = this.levelRuntime?.spawn || { x: p.x, z: p.z };
    const res = this.world.unstuckFrom(p.x, p.z, 0.42, spawn);
    p.x = res.x;
    p.z = res.z;
    if (this.input) this.input.resetTouch?.();
    p.syncCamera?.();
    this.hud.say("Moved to clear ground");
    if (this.mode === "pause") this.resume();
    return res;
  }

  openNotes(fromTitle) {
    try {
      this.mode = "notes";
      setPlaying(false);
      setMenuOpen(true);
      showScreen(null);
      if (!Array.isArray(this.notes)) this.notes = [];
      let html = `<h2>FIELD NOTES</h2>`;
      if (fromTitle) {
        html += `<p class="line" style="color:#8a9aaa;font-size:11px;">On a phone: put your left thumb down anywhere bottom-left and drag to walk; keep pushing forward for a moment to sprint. Look on the right. Tap the hand to search and talk. On a keyboard, hold Shift to sprint.</p>`;
      }
      if (!this.notes.length) html += `<p class="line">Nothing written down yet.</p>`;
      for (const n of this.notes) {
        const title = (n && n.title) || "Note";
        const body = (n && n.body) || "";
        html += `<div class="item-row" style="flex-direction:column;align-items:flex-start;gap:4px;"><strong>${escapeHtml(title)}</strong><span style="color:#c5d0da;font-size:11px;">${escapeHtml(body)}</span></div>`;
      }
      html += `<div class="inv-actions"><button data-a="close">CLOSE</button></div>`;
      panel.innerHTML = html;
      panel.classList.add("show");
      const close = panel.querySelector("button");
      if (close) {
        close.onclick = () => {
          this.closePanel();
          if (fromTitle) { this.mode = "title"; setMenuOpen(false); showScreen("title"); }
        };
      }
    } catch (err) {
      showError(err);
    }
  }

  showEnding(id) {
    this._ended = true;
    this.mode = "ending";
    setMenuOpen(true);
    panel.classList.remove("show", "char-sheet");
    const e = this.story.endingText(id);
    $("ending-title").textContent = (e.title || id).toUpperCase();
    $("ending-body").textContent = e.body || "";
    showScreen("ending");
    this.save();
  }

  die() {
    this.mode = "dead";
    setMenuOpen(true);
    const why = {
      hypothermia: "The cold finished the work the year started.",
      starvation: "There was nothing left to burn.",
      radiation: "The ash got in and stayed.",
      husk: "It did not look like a person when it was done.",
      raider: "Someone wanted what you were carrying.",
      dog: "The dogs got there first.",
    }[this.player.lastReason] || "You did not get up.";
    $("dead-reason").textContent = why;
    showScreen("dead");
  }

  interact() {
    const p = this.player;
    const hit = this.world.nearestInteract(p.x, p.z, 2.3);
    if (!hit) { this.hud.say("Nothing."); return; }
    if (hit.type === "loot") return this.beginSearch(hit.obj);
    if (hit.type === "npc") {
      if (this.alive[hit.obj.id] === false) { this.hud.say("They're gone."); return; }
      if (this._talkLockUntil && performance.now() < this._talkLockUntil) return;
      const dlg = this.story.pickDialogue(hit.obj.id, this._storyCtx());
      if (hit.obj.trader && this.story.traderById?.(hit.obj.trader)) return this.openTrade(hit.obj, dlg);
      // OR-route re-entry: the porch choice can be revisited until the fuel objective resolves.
      if (!dlg && hit.obj.id === "lolo" && this.flags.chapter === "ch01" && this.flags.ch01_lolo_talked && !this.flags.ch01_gas_choice) {
        const porch = this.story.dialogues.find((d) => d.id === "ch01_lolo_porch");
        if (porch) { this.openDialogue(porch); if (porch.nodes?.l4) this.dlgId = "l4"; this._showNode(true); return; }
      }
      return this._openNpcTalk(hit.obj.id, dlg);
    }
    if (hit.type === "console" || hit.obj?.id === "dam_console") {
      this.flags.at_dam = true;
      const dlg = this.story.pickDialogue("dam_console", this._storyCtx())
        || this.story.dialogues.find((d) => d.id === "dam_choice" || d.npc === "dam_console");
      if (dlg) return this.openDialogue(dlg);
    }
    if (this.levelRuntime && hit.obj && this.world.interactives.includes(hit.obj)) {
      this.levelRuntime.useInteractive(hit.obj, this);
    }
    this.levelRuntime?.interactTriggers?.(this);
  }

  openTrade(rec, dlg) {
    this.input?.resetTouch?.();
    const ok = openTradeModal(this, panel, rec.trader, {
      setMenuOpen,
      onTalk: dlg ? () => { this.closePanel(); this.openDialogue(dlg); } : null,
      onClose: () => { this._lockTalk(600); this.closePanel(); this.reconcileInventoryObjectives("trade"); },
    });
    if (!ok) { this.closePanel(); if (dlg) this.openDialogue(dlg); }
  }

  _wep(id) { return getWeapon(this.systems, id || this.player.equipped); }

  _playUi(name) {
    const A = this.audio?.impl?.engine || this.audio?.impl?.a || window.GameAudio;
    A?.play?.(name);
  }

  tryFire() {
    const p = this.player;
    if (p.attackCD > 0 || p.reloadT > 0) return;
    const id = p.equipped;
    const w = this._wep(id);
    const origin = p.camera.position;
    const dir = new THREE.Vector3();
    p.camera.getWorldDirection(dir);
    const typ = w.type || (w.kind === "gun" ? "ranged" : w.kind === "throw" ? "thrown" : "melee");

    if (typ === "ranged" || w.kind === "gun") {
      if (p.jammed[id]) {
        this._playUi("ui_error");
        this.hud.say("Jammed — hold RELOAD to clear.");
        p.attackCD = 0.25;
        return;
      }
      const maxDur = w.durability || 400;
      const dur = p.wDur[id] ?? maxDur;
      if (dur <= 0) {
        this._playUi("ui_error");
        this.hud.say("Broken — needs a repair kit.");
        p.attackCD = 0.3;
        return;
      }
      if ((p.mags[id] || 0) <= 0) {
        if (!(this.inv[w.ammo] || 0)) {
          this._playUi("dry_fire"); this._playUi("ui_error");
          this.hud.say("Empty.");
          p.attackCD = 0.25;
          return;
        }
        return this.tryReload();
      }
      const jamP = (w.jam_chance || 0) + ((dur / maxDur) < 0.5 ? (w.jam_chance_below_50pct_durability || 0) : 0);
      if (jamP > 0 && Math.random() < jamP) {
        p.jammed[id] = true;
        this._playUi("ui_error"); this._playUi("dry_fire");
        this.hud.say("JAMMED — press RELOAD to clear the action.");
        p.attackCD = 0.4;
        return;
      }
      p.mags[id]--;
      p.wDur[id] = dur - (w.wear_per_shot || 1);
      const modes = w.fire_modes || ["semi"];
      const mode = p.fireMode[id] || modes[0];
      const sps = (mode === "auto" && w.auto_shots_per_second) ? w.auto_shots_per_second : (w.shots_per_second || 2.5);
      p.attackCD = 1 / Math.max(0.4, sps);
      p.recoil = mode === "auto" ? 0.55 : 0.85;
      p.flashT = 0.05;
      this.audio.gunshot(id === "blaster" || w.pellets);
      this._noteGunfire();
      if (this._currentShelterId() && this.shelterSeals[this._currentShelterId()] > 0 && this._breakInCd <= 0) {
        this._damageShelterSeal(8, "window");
        this._breakInCd = 3;
      }
      let spread = (w.spread_deg || 1) * Math.PI / 180;
      if (p.aiming) spread *= (w.ads_spread_mult ?? 0.5);
      const pellets = w.pellets || 1;
      const dmgEach = (w.damage || w.dmg || 18) / (pellets > 1 ? Math.sqrt(pellets) : 1);
      let any = false;
      for (let i = 0; i < pellets; i++) {
        const d = dir.clone();
        if (spread) {
          d.x += (Math.random() - 0.5) * 2 * spread;
          d.y += (Math.random() - 0.5) * 2 * spread * 0.5;
          d.z += (Math.random() - 0.5) * 2 * spread;
          d.normalize();
        }
        const hit = this.enemies.hitScan(origin, d, w.range_m || w.range || 18, dmgEach);
        if (hit) any = true;
      }
      if (any) this.audio.hit();
      return;
    }

    if (typ === "thrown" || typ === "held_offhand" || w.kind === "throw" || id === "molotov" || id === "flare") {
      if (!takeItem(this.inv, id, 1)) return;
      if (/flare/.test(id) && String(this.flags.chapter) === "ch05") this.flags.ch05_flare_fired = true;
      p.attackCD = 0.7;
      this.audio.gunshot(false);
      const tx = p.x - Math.sin(p.yaw) * 4;
      const tz = p.z - Math.cos(p.yaw) * 4;
      const rad = w.area_radius_m || 3.2;
      const dmg = w.impact_damage || 40;
      for (const e of this.enemies.living()) {
        if (Math.hypot(e.x - tx, e.z - tz) < rad) {
          e.hp -= dmg;
          if (e.hp <= 0) this.enemies.kill(e);
        }
      }
      if ((this.inv[id] || 0) <= 0) p.tryEquip("knife", this.inv);
      return;
    }
    // melee
    const maxDur = w.durability || 200;
    const dur = p.wDur[id] ?? maxDur;
    if (dur <= 0) { this.hud.say("Broken."); p.attackCD = 0.3; return; }
    p.wDur[id] = dur - (w.wear_per_hit || 1);
    p.attackCD = 1 / (w.attacks_per_second || 1.6);
    p.recoil = 0.4;
    p.startSwing?.();
    this.audio.melee();
    const hit = this.enemies.hitScan(origin, dir, w.range_m || w.range || 1.7, w.damage || w.dmg || 16);
    if (hit) this.audio.hit();
  }

  tryReload() {
    const p = this.player;
    const id = p.equipped;
    const w = this._wep(id);
    if (p.jammed[id]) {
      p.jammed[id] = false;
      p.reloadT = 0.85;
      p.attackCD = 0.85;
      this.audio.ui();
      this.hud.say("Action cleared.");
      return;
    }
    if ((w.type || w.kind) !== "ranged" && w.kind !== "gun") return;
    const ammo = w.ammo;
    const mag = w.magazine ?? w.mag ?? 6;
    const have = this.inv[ammo] || 0;
    if (have <= 0) {
      this._playUi("dry_fire"); this._playUi("ui_error");
      this.hud.say("No ammo.");
      return;
    }
    const cur = p.mags[id] || 0;
    if (cur >= mag) return;
    if (w.reload_per_shell) {
      takeItem(this.inv, ammo, 1);
      p.mags[id] = cur + 1;
      p.reloadT = w.reload_real_seconds || 0.7;
      p.attackCD = p.reloadT;
      this.audio.ui();
      this.hud.say("Shell " + p.mags[id] + "/" + mag);
      return;
    }
    const take = Math.min(mag - cur, have);
    takeItem(this.inv, ammo, take);
    p.mags[id] = cur + take;
    p.reloadT = w.reload_real_seconds || 1.6;
    p.attackCD = p.reloadT;
    this.audio.ui();
    this.hud.say("Reload.");
  }

  toggleFireMode() {
    const w = this._wep();
    const modes = w.fire_modes || ["semi"];
    if (modes.length < 2) { this.hud.say((modes[0] || "semi").toUpperCase()); return; }
    const next = this.player.toggleFireMode(modes);
    this.hud.say("Fire mode: " + next.toUpperCase());
    this._syncFireModeBtn();
    this.audio.ui();
  }

  _syncWeaponChrome() {
    const id = this.player?.equipped;
    let kind = "unarmed";
    if (id) {
      const k = weaponKind(id);
      kind = k === "melee" ? "melee" : k === "thrown" || k === "held_offhand" ? "thrown" : "gun";
    }
    const body = document.body;
    body.classList.toggle("wield-melee", kind === "melee");
    body.classList.toggle("wield-gun", kind === "gun");
    body.classList.toggle("wield-thrown", kind === "thrown");
    body.classList.toggle("wield-unarmed", kind === "unarmed");
    const melee = document.getElementById("btn-melee");
    if (melee) {
      const isKnife = !id || /knife|blade|machete/.test(String(id));
      melee.classList.toggle("is-melee", kind === "melee" && !isKnife);
      melee.setAttribute("aria-label", isKnife || kind === "unarmed" ? "Knife" : "Attack");
    }
    const btn = document.getElementById("btn-mode");
    if (btn) {
      const w = this._wep();
      const modes = (w && w.fire_modes) || [];
      btn.style.display = (kind === "gun" && modes.length > 1) ? "" : "none";
      const cur = this.player.fireMode[id] || modes[0] || "semi";
      btn.textContent = String(cur).toUpperCase();
    }
    return kind;
  }

  _syncFireModeBtn() { this._syncWeaponChrome(); }

  objectiveText() {
    if (this.flags?.ch01_scarf_found) {
      if (this.world?.companion) this.world.companion._trackHint = null;
    } else {
      const hint = this.world?.companion?._trackHint;
      if (hint) return "OBJECTIVE  " + hint;
    }
    const o = currentMainObjective(this);
    if (o?.text) return "OBJECTIVE  " + o.text;
    const ch = this.flags.chapter || "ch01";
    const def = this.story.chapterDef?.(ch);
    if (def?.objective) return "OBJECTIVE  " + def.objective;
    return this._chapterNum(ch) <= 2 ? "OBJECTIVE  Scavenge Sparks. Stay hydrated." : "OBJECTIVE  Keep moving. Stay alive.";
  }

  update(dt) {
    this.hud.tick(dt);
    this.input.sample();
    const canAutoSprint = this.mode === "play"
      && !this.input.aim
      && this.player.stats.stamina > 2
      && !this.player.carryState?.overSoft
      && !this.player.carryState?.overHard;
    this.input.tickAutoSprint(dt, canAutoSprint);
    if (this.input.consume("pause") && this.mode === "play") return this.pause();
    if (this.mode === "pause" && this.input.consume("pause")) return this.resume();

    if (this.mode === "searching") {
      this.searchT -= dt;
      if (this.searchT <= 0 && this.lootOpen) this.revealLoot(this.lootOpen);
      this._render(dt);
      return;
    }

    if (this.mode !== "play") {
      // still let menus close on I/C/E/Esc appropriately
      if (this.mode === "inventory" && this.input.consume("inv")) this.closePanel();
      else if (this.mode === "inventory" && this.input.consume("craft")) this.openCraft();
      if (this.mode === "craft" && this.input.consume("craft")) this.closePanel();
      else if (this.mode === "craft" && this.input.consume("inv")) this.openInventory("bag");
      if (this.mode === "dialogue" && this.input.consume("interact")) {
        const btn = panel.querySelector("button");
        btn?.click();
      }
      // Keep NPC mixers and the talking face/idle alive while the sim is paused.
      if (this.mode === "dialogue") this.world.tickPeople?.(dt, this.player, this);
      this._render(dt);
      return;
    }

    if (this.input.consume("inv")) return this.openInventory("bag");
    if (this.input.consume("craft")) return this.openCraft();
    if (this.input.consume("swap") || this.input.swap) { this.input.swap = false; this.cycleWeapon(); }
    if (this.input.consume("interact")) this.interact();
    if (this.input.consume("reload") || this.input.reload) { this.input.reload = false; this.tryReload(); }
    if (this.input.consume("fireMode") || this.input.fireMode) { this.input.fireMode = false; this.toggleFireMode(); }
    this.player.aiming = !!this.input.aim;
    this._syncFireModeBtn();
    if (this.input.slot) {
      const w = WEAPONS_ORDER[this.input.slot - 1];
      if (w) this.equipWeapon(w);
      this.input.slot = 0;
    }
    if (this.input.keys["KeyF"] && !this._fLatch) {
      this.player.flashlight = !this.player.flashlight;
      this._fLatch = true;
    }
    if (!this.input.keys["KeyF"]) this._fLatch = false;

    const look = this.input.consumeLook(this.input.touch);
    this.player.applyLook(look.x, look.y);
    this.player.carryState = carryState(this.inv, this.player.gear, this.systems.items, this.systems.carry);
    const sprintOk = this.player.stats.stamina > 2 && !this.player.carryState.overSoft;
    const { moving, sprint } = this.player.move(dt, this.input, this.world, sprintOk);
    this.audio.maybeFoot(dt, moving, sprint);

    if (this.input.fire && this.player.attackCD <= 0) this.tryFire();
    this.input.fireDown = false;
    // hold-to-fire only for guns; clear click-latch
    if (!this.input.touch) {
      // desktop: fire stays while button held (input.fire)
    }

    let night = this._night();
    const blizzard = this.blizzard;
    const inFire = this.world.inFire(this.player.x, this.player.z);
    const loc = this.world.locationAt(this.player.x, this.player.z);
    const indoor = !!(inFire || (loc && loc.safe) || this.world.isIndoor?.(this.player.x, this.player.z));
    const shelterId = this._currentShelterId();
    const seal = this._sealPct(shelterId);
    const radZone = (loc && /dam|dock|lift|river_ice|jay_cooke/.test(loc.id || "")) || (this.flags.chapter || "") >= "ch08" || this.player.z < -78;
    this.player.tickSurvival(dt, {
      blizzard, night, inFire, radZone, indoor, seal,
      hasGasMask: !!this.flags.has_gas_mask,
      sprinting: sprint,
      weather: this._weather || (blizzard ? "blizzard" : "overcast"),
      chapter: this.flags.chapter || "ch01",
      survival: this.systems?.survival,
      difficulty: this.systems?.difficultyMode,
      items: this.systems?.items,
    });

    // Break-ins and broken windows eat SEAL on the shelter you're in.
    this._breakInCd = Math.max(0, this._breakInCd - dt);
    if (shelterId && this.shelterSeals[shelterId] > 0 && this._breakInCd <= 0) {
      const nearHostile = (this.enemies.list || []).some((e) => e.alive && e.state === "attack" && Math.hypot(e.x - this.player.x, e.z - this.player.z) < 5);
      if (nearHostile) {
        this._damageShelterSeal(12, "break-in");
        this._breakInCd = 5;
      }
    }

    this.timeOfDay += dt / CFG.dayLenSec;
    if (this.timeOfDay >= 1) { this.timeOfDay -= 1; this.dayN++; }
    // Echoes/Lumen: blizzards exist only in nuclear winter (or where the chapter climate allows them).
    const climate = this._chapterClimate();
    const bzAllowed = this._isWinter() || (climate.blizzard_chance || 0) > 0;
    if (!this._lockWeather) {
      if (bzAllowed) {
        this.blizzardT += dt;
        const cycle = this.blizzardT % (CFG.blizzardPeriod + CFG.blizzardLen);
        this.blizzard = cycle > CFG.blizzardPeriod;
      } else this.blizzard = false;
    }
    if (this.blizzard !== this._bzWas) {
      this._bzWas = this.blizzard;
      try { this._audioEngine()?.setWeatherType?.(this.blizzard ? "blizzard" : this._weather); } catch {}
    }

    const sky = this.world.setSky(this.timeOfDay, this.blizzard);
    if (this.sky) {
      const st = this.sky.update(dt, {
        timeOfDay: hudHour(this.timeOfDay),
        weather: this.blizzard ? "blizzard" : (this._weather || "clear"),
        environment: this._envCfg?.id,
        pipeline: this.pipeline,
      });
      this.sky.applyTo({
        sun: this.world.lights.sun,
        hemi: this.world.lights.hemi,
        amb: this.world.lights.amb,
        fog: this.world.scene.fog,
        scene: this.world.scene,
      });
      sky.day = st.day;
      sky.night = st.night;
    }
    night = this._night();
    this._syncPipeline(sky, night);
    this.world.cull?.(this.player.camera, this.blizzard ? 28 : 42);
    this.world.updateParticles(dt, this.player.camera, this.blizzard);
    this.audio.setWind(this.blizzard ? 1 : (this._isWinter() ? 0.35 : 0.18) + (night ? 0.12 : 0));

    this.enemies.update(dt, this.player, this.world, this.audio);
    this.player.syncCamera();
    this.world.tickPeople?.(dt, this.player, this);
    this.enemies.tickActors?.(dt, this.player);
    try { tickCompanion(this, dt); } catch (err) { if (!this._compWarned) { this._compWarned = true; console.warn("[wraith]", err); } }
    this._tickBreath(dt, night);

    // Flashlight follows camera if we own one (Lumen owns its own)
    if (this.world.lights.flash && !this.pipeline) {
      const fl = this.world.lights.flash;
      const on = this.player.flashlight || night;
      fl.intensity = on ? 18 : 0;
      this.player.camera.getWorldPosition(fl.position);
      const d = new THREE.Vector3();
      this.player.camera.getWorldDirection(d);
      fl.target.position.copy(fl.position).add(d);
    }

    const near = this.world.nearestInteract(this.player.x, this.player.z, 2.3);
    if (near) {
      const raw = near.type === "loot" ? (near.obj.label || "Search")
        : near.type === "npc" ? (this.story.npcName?.(near.obj.id) || near.obj.name || "Talk")
        : (near.obj.label || "Use");
      // Touch: the hand button is the action, so lead with a verb instead of "USE".
      const verb = near.type === "loot" ? "SEARCH  " : near.type === "npc" ? "TALK  " : "";
      this.hud.prompt = (this.input.touch ? verb : "E  ") + cleanLabel(raw);
    } else this.hud.prompt = "";

    if (loc?.id === "loc_thomson_dam") this.flags.at_dam = true;
    this.levelRuntime?.tick(dt, this);
    const nextCh = advanceChapter(this.flags.chapter || "ch01", this.flags, this.levels.chapters, this.levels.storyVersion ?? 2);
    if (nextCh && nextCh !== this.flags.chapter && !this._loadingLevel) this.setChapter(nextCh);
    if (this._enc) this._tickEncounter();

    // one-shot location scenes
    if (loc && !this._locSeen) this._locSeen = {};
    if (loc && !this._locSeen[loc.id + this.flags.chapter]) {
      const sceneDlg = this.story.pickLocationDialogue(loc.id, this._storyCtx());
      if (sceneDlg) {
        this._locSeen[loc.id + this.flags.chapter] = true;
        this.openDialogue(sceneDlg);
      } else this._locSeen[loc.id + this.flags.chapter] = true;
    }

    this.saveAcc += dt;
    if (this.saveAcc > 20) { this.saveAcc = 0; this.save(); }

    if (!this.player.alive) this.die();

    this._render(dt);
  }

  _syncPipeline(sky, night) {
    const p = this.pipeline;
    if (!p) return;
    // Lumen: modulate the ACTIVE seasonal preset (never force winter defaults).
    const E = this._envCfg || (p.getEnvironmentConfig ? (this._envCfg = p.getEnvironmentConfig()) : null);
    const bz = !!this.blizzard && this._isWinter();
    const fogCol = this.world.scene.background;
    if (typeof p.setFog === "function" && E?.fog) {
      const n = sky?.night ?? (night ? 1 : 0);
      const fogArgs = {
        color: fogCol,
        density: bz ? Math.max(0.085, E.fog.density * 6) : E.fog.density * (1 + n * 2.2),
        maxDist: bz ? 16 : E.fog.maxDist * (1 - n * 0.45),
        falloff: bz ? 0.04 : E.fog.falloff,
      };
      p.setFog(fogArgs);
      this.sky?.setFogParams(fogArgs);
    }
    if (typeof p.setSun === "function") {
      const sun = this.world.lights.sun;
      this._sunDir = this._sunDir || new THREE.Vector3();
      const dir = this._sunDir.copy(sun.position).sub(sun.target.position).normalize();
      const sc = E?.sun?.scatter ?? 0.05;
      p.setSun({ intensity: sun.intensity, color: sun.color, direction: dir, scatter: bz ? Math.max(0.09, sc * 1.8) : sc });
    }
    if (typeof p.setFlashlight === "function") {
      p.setFlashlight(this.player.flashlight || night);
    }
    if (typeof p.setWeather === "function") {
      p.setWeather({ blizzard: bz, timeOfDay: this.timeOfDay, flashlight: this.player.flashlight || night });
    }
  }

  _noteGunfire() {
    // Cartographer: gunfire inside the Dixie Valley den wakes it.
    if (String(this.flags.chapter) !== "ch07b" || this.flags.ch07b_den_shot) return;
    const p = this.player;
    if (p.x >= -48 && p.x <= 18 && p.z >= -14 && p.z <= 6) this.flags.ch07b_den_shot = true;
  }

  _tickBreath(dt, night) {
    if (!this.breath) return;
    const c = this._chapterClimate();
    const t = night ? (c.ambient_temp_c_night ?? c.night_temp_c) : (c.ambient_temp_c_day ?? c.ambient_temp_c_night);
    const def = this.story.chapterDef?.(this.flags.chapter);
    const temp = typeof t === "number" ? t : (night && typeof def?.night_temp_c === "number" ? def.night_temp_c : (this._isWinter() ? -12 : 20));
    const cold = this.mode === "play" && temp <= 0;
    const src = this._breathSrc || (this._breathSrc = []);
    src.length = 0;
    if (cold) {
      for (const n of this.world.npcs || []) {
        if (!n.mesh || n.alive === false || n.companion || !n.mesh.visible) continue;
        n._b = n._b || { x: 0, z: 0, y: 1.55, yaw: 0, kind: "npc" };
        n._b.x = n.mesh.position.x; n._b.z = n.mesh.position.z; n._b.yaw = n.mesh.rotation.y;
        src.push(n._b);
      }
      for (const e of this.enemies.list || []) {
        if (!e.alive || e.hollow || e.creature || e.kind === "husk" || e.dormant) continue;
        e._b = e._b || { y: 1.55 };
        e._b.x = e.x; e._b.z = e.z; e._b.yaw = e.mesh?.rotation?.y || 0; e._b.kind = e.kind;
        src.push(e._b);
      }
    }
    this.breath.update(dt, cold, src, this.player.camera);
  }

  _render(dt) {
    const p = this.player;
    const loc = this.world.locationAt(p.x, p.z);
    this.hud.loc = loc?.name || "Sparks";
    const hour = (this.timeOfDay * 24 + 6) % 24;
    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    this.hud.clock = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
    const wxName = this.blizzard ? "blizzard" : (this._weather || (this._night() ? "night" : "overcast"));
    this.hud.weather = String(wxName).replace(/_/g, " ").toUpperCase();
    this.hud.objText = this.objectiveText();
    this.hud.sideText = this.sideObjectiveText();
    const playing = this.mode === "play" || this.mode === "inventory" || this.mode === "craft"
      || this.mode === "dialogue" || this.mode === "loot" || this.mode === "searching";
    if (playing) this.hud.draw(p, this.inv, "play", {
      reloading: p.reloadT > 0,
      unlocks: this.hudUnlocks,
      filter: this.flags.has_gas_mask ? (p.filterCharge || 0) : 0,
      seal: this._sealPct(this._currentShelterId() || Object.keys(this.shelterSeals)[0]),
      sprinting: !!this.input.sprint && this.mode === "play",
    });
    else this.hud.ctx.clearRect(0, 0, this.hud.w, this.hud.h);

    try { this.minimap?.tick(this, performance.now()); } catch (err) {
      if (!this._minimapWarn) { this._minimapWarn = true; console.warn("[minimap]", err); }
    }

    // The pipeline owns shadow scheduling (T.shadow.updateEvery). Do not
    // fight it with autoUpdate/needsUpdate here — that desyncs the shadow matrix.
    if (!this.pipeline && this.renderer.shadowMap) {
      this.renderer.shadowMap.autoUpdate = false;
      this._shadowFrame = (this._shadowFrame || 0) + 1;
      if (this._shadowFrame <= 12 || this._shadowFrame % 3 === 0) this.renderer.shadowMap.needsUpdate = true;
    }

    if (this.pipeline && typeof this.pipeline.render === "function") {
      try { this.pipeline.render(dt); }
      catch (err) {
        console.warn("[render] fallback", err);
        try { this.pipeline.dispose?.(); } catch {}
        this.pipeline = null;
        this.world?.bindPipeline?.(null);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.player.camera);
      }
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.player.camera);
    }
  }

  loop = (now) => {
    const t = now || performance.now();
    let dt = Math.max(0, Math.min(0.05, (t - this.last) / 1000));
    this.last = t;
    this._frames++;
    this._fpsT += dt;
    if (this._fpsT >= 0.5) { this.fps = this._frames / this._fpsT; this._frames = 0; this._fpsT = 0; }
    try { this.update(dt); } catch (e) {
      console.error(e);
      window.__ERROR = String(e && e.stack || e);
      if (!this._errShown) { this._errShown = true; showError(e); }
    }
    requestAnimationFrame(this.loop);
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function crateMesh() {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1, emissive: 0x1a1408, emissiveIntensity: 0.3 })
  );
  return m;
}

function applyLevelData(world, scene, levels, systems, rollTable) {
  const lvl = levels.world;
  if (levels.locations) world.setLocations?.(levels.locations);
  if (lvl.bounds) world.bounds = { ...world.bounds, ...lvl.bounds };
  const have = new Map(world.loot.map((l) => [l.id, l]));
  for (const src of (lvl.loot || [])) {
    let L = have.get(src.id);
    if (!L) {
      L = { ...src, taken: false };
      const mesh = crateMesh();
      mesh.position.set(src.x, 0.28, src.z);
      scene.add(mesh);
      L.mesh = mesh;
      world.loot.push(L);
      have.set(src.id, L);
    } else {
      Object.assign(L, { label: src.label || L.label, x: src.x, z: src.z, r: src.r || L.r, note: src.note || L.note, table: src.table });
    }
    const items = { ...(src.items || {}) };
    if (src.table && systems.loot?.[src.table]) {
      let h = 2166136261;
      for (const c of src.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
      const rng = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
      const extra = rollTable(systems.loot[src.table], rng);
      for (const [k, v] of Object.entries(extra)) items[k] = (items[k] || 0) + v;
    }
    L.items = items;
    L.remaining = { ...items };
    if (L.mesh) L.mesh.position.set(L.x, 0.28, L.z);
  }
  // NPC positions from level
  if (lvl.npcs) {
    for (const n of lvl.npcs) {
      const e = world.npcs.find((x) => x.id === n.id);
      if (e) {
        e.x = n.x; e.z = n.z;
        if (e.mesh) e.mesh.position.set(n.x, 0, n.z);
      }
    }
  }
}

function sizeView(renderer, pipeline) {
  const r = frame.getBoundingClientRect();
  // Cap DPR: iPhone @3 would allocate a 1170×2532 canvas plus postprocess FBOs.
  const dpr = canvasDpr();
  const cssW = Math.max(180, Math.round(r.width) || 360);
  const cssH = Math.max(320, Math.round(r.height) || 640);
  const w = Math.max(180, Math.round(cssW * dpr));
  const h = Math.max(320, Math.round(cssH * dpr));
  if (view.width !== w || view.height !== h) {
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    view.width = w;
    view.height = h;
    if (pipeline && typeof pipeline.resize === "function") pipeline.resize(w, h);
  }
  return { w, h };
}

function gameHudResize(hud, pipeline, size) {
  if (!hud) return;
  // Keep HUD typography on a 360×640 design grid. The 3D view may render at a
  // much lower internal size (≈243×432 on the mobile tier); stretching that
  // buffer made OBJECTIVE text dominate the iPhone viewport.
  const w = 360;
  const h = 640;
  if (hud.c.width !== w || hud.c.height !== h) {
    hud.c.width = w;
    hud.c.height = h;
    hud.w = w;
    hud.h = h;
  }
}

async function boot() {
  window.__READY = false;
  window.__ERROR = "";
  try {
    const story = new StorySystem();
    await story.load();
    const systems = await loadSystems();
    const levels = await loadLevels();
    const { rollTable } = await import("./systems.js?v=r15");

    const renderer = new THREE.WebGLRenderer({
      canvas: view, antialias: false, alpha: false, powerPreference: "high-performance",
    });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isMobileClient();
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x9aa8b8, 1);
    sizeView(renderer, null);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc5d0da, 8, 55);
    const camera = new THREE.PerspectiveCamera(CFG.fov, 9 / 16, CFG.near, CFG.far);
    camera.rotation.order = "YXZ";

    const world = new World();
    const hasChapterLevels = !!(levels.perChapter && (levels.perChapter.ch01 || Object.values(levels.perChapter).some((l) => (l.chapter || l.id || "").startsWith("ch01"))));
    world._skipPlaceholder = hasChapterLevels;
    await world.build(scene, renderer, story);
    if (!hasChapterLevels) applyLevelData(world, scene, levels, systems, rollTable);

    const player = new Player(camera, scene, world.gunModels);
    player.attachWeaponLibrary?.(world.gunModels);
    scene.add(camera);
    player.x = levels.world.spawn?.x ?? 0;
    player.z = levels.world.spawn?.z ?? 8;
    player.syncCamera();

    const enemies = new EnemySystem(scene, world.zombieGltf);
    // assigned after Game is constructed; see boot hook below.
    // Ambient enemies are chapter-gated (army Ch5–6, dogs Ch7+, husks Ch8+).
    // Spawned in setChapter / newGame, not at boot.

    const hud = new HUD(hudCanvas);
    const audio = await attachAudio({ THREE, scene, camera });
    world.bindAudio(audio);
    const input = new Input(frame, () => audio.unlock());
    bindTouchInput(input);

    let pipeline = null;
    let renderInfo = { source: "builtin", url: null, tried: [] };
    const params = new URLSearchParams(location.search);
    const crt = params.get("crt") || localStorage.getItem("ashfall.crt") || "low";
    const tier = params.get("tier") || "auto";
    const pixel = await loadLumenPixelOverrides();
    const lookParam = params.get("look") || params.get("pixel") || localStorage.getItem("ashfall.look") || pixel.look || "refined";
    const look = (lookParam === "old" || lookParam === "coarse" || lookParam === "classic") ? "classic" : "refined";
    try {
      // INTEGRATION.md: look 'refined' (default) or 'classic'; CRT 'low'.
      // Lumen INTEGRATION.md §0 recommended boot call. tier 'auto' resolves to
      // the 'mobile' preset on every phone/iPad (clamped unless allowHeavyOnMobile).
      // forceLDR is a test-only 8-bit fallback, not the production mobile path.
      pipeline = createRenderPipeline({
        renderer, scene, camera,
        sun: world.lights.sun,
        hemiLight: world.lights.hemi,
        ambientLight: world.lights.amb,
        environment: environmentForChapter("ch01"),
        tier, look, crt, targetFps: 30, adaptive: true,
        particles: true, takeOverFog: true, updateCamera: true, flashlight: true,
        mobile: isMobileClient(),
      });
      // Lumen: no hard-coded winter sun — the active preset owns direction/colour.
      // HUD stays a crisp 9:16 overlay at internalSize (afterCRT). beforeCRT would curve it with the screen.
      pipeline.hooks.afterCRT = () => { gameHudResize(hud, pipeline); };
      pipeline.hooks.beforeCRT = null;
      world.bindPipeline(pipeline);
      for (const f of world.fires) {
        if (f.lumen) continue;
        if (typeof pipeline.addCampfire === "function") {
          f.lumen = pipeline.addCampfire([f.x, 0.02, f.z]);
          world.stripHostFireLight(f);
        } else if (typeof pipeline.addPointLight === "function" && f.light) {
          pipeline.addPointLight(f.light, { glow: 1.1 });
        }
      }
      const tierNow = pipeline.getTier?.() || tier;
      renderInfo = { source: "lumen", url: "../render/index.js", api: Object.keys(pipeline), crt, tier: tierNow, requestedTier: tier, look, internal: pipeline.internalSize, caps: pipeline.caps || null };
      sizeView(renderer, pipeline);
      gameHudResize(hud, pipeline);
    } catch (err) {
      console.warn("[boot] createRenderPipeline failed, probing hook", err);
      renderInfo.error = String(err && err.message || err);
      const disc = await discoverRenderModule();
      renderInfo.tried = disc.tried;
      if (disc.mod) {
        try {
          pipeline = await attachRenderModule(disc.mod, {
            THREE, renderer, scene, camera, canvas: view,
            tier, targetFps: 30, adaptive: true,
            crt, particles: true, takeOverFog: true, updateCamera: true, flashlight: true, sun: world.lights.sun,
          });
          if (pipeline) {
            renderInfo = { source: "lumen", url: disc.url, api: Object.keys(pipeline) };
            sizeView(renderer, pipeline);
          }
        } catch (err2) {
          renderInfo.error = String(err2 && err2.message || err2);
        }
      }
    }


    enemies.setAudio?.(audio);
    const game = new Game({
      story, systems, levels, world, player, enemies, hud, audio, input,
      renderer, scene, pipeline, renderInfo, crt, look, pixel,
    });
    game.levelRuntime = new LevelRuntime({
      world, enemies, scene, systems, story,
      flags: game.flags, inv: game.inv, maxEnemies: CFG.maxEnemies,
    });
    game.levelRuntime.levels = levels;
    game.levelRuntime.bind(game);
    game.sky = createSky({
      scene, camera: player.camera, renderer,
      pipeline,
      environment: game._envCfg?.id || "summer",
      weather: game._weather || "heat_haze",
    });
    // Ch1 geometry is built when the player taps NEW GAME, behind a loading bar.
    // Preloading it here doubled the work on iPhone and exhausted Safari's RAM.
    window.addEventListener("resize", () => { sizeView(renderer, pipeline); gameHudResize(hud, pipeline); });
    const rawJump = (params.get("chapter") || "").trim();
    if (/^ch\s*0*\d/i.test(rawJump)) {
      // Dev / rescue jump: start that chapter with Ch1-complete flags (does not use the stuck save).
      game.newGame({ chapter: normalizeChapter(rawJump) });
    }
    game.loop();
    window.__READY = true;
    window.__ASHFALL_BOOTED = true;
    window.__ASHFALL_BUILD = "r15";
    const banner = $("boot-banner");
    if (banner) banner.classList.remove("show");
    window.__INTEGRATION = {
      story: story.loadedFiles,
      storySource: story.source,
      systems: systems.loadedFiles,
      levels: levels.loadedFiles,
      levelsSource: levels.source,
      render: renderInfo,
      pixel,
      audio: { source: audio.source, discovered: audio.discovered },
    };
    console.info("[ashfall] ready", window.__INTEGRATION);
  } catch (err) {
    console.error(err);
    window.__ERROR = String(err && err.stack || err);
    window.__READY = "error";
    showError(err);
  }
}

boot();
