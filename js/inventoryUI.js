import { CFG } from "./config.js?v=r8";
import {
  GEAR_SLOTS, WEAPON_SLOTS, ALL_SLOTS, SLOT_LABELS, SLOT_COLORS,
  itemSlot, combinedInsulation, combinedWetResist, carryState,
  resolveDollLayers, wearItem, removeGear, emptyGear, canAddWeight,
} from "./equipment.js?v=r8";
import { mountDoll3D, stopDoll3D, doll3DWasDrag } from "./doll3d.js?v=r8";

const cache = new Map();
function loadImg(src) {
  if (cache.has(src)) return cache.get(src);
  const img = new Image();
  img.src = "./" + src.replace(/^\.\//, "");
  const rec = { img, ok: false, fail: false };
  img.onload = () => { rec.ok = true; };
  img.onerror = () => { rec.fail = true; };
  cache.set(src, rec);
  return rec;
}

function hexToRgb(h) {
  const n = h.replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function drawPaperDoll(canvas, layers, scale = 4) {
  const w = 48, h = 96;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext("2d");
  for (const L of layers) {
    tctx.clearRect(0, 0, w, h);
    const rec = loadImg(L.src);
    if (rec.ok) {
      tctx.drawImage(rec.img, 0, 0);
      if (L.tint) applyTint(tctx, L.tint, w, h);
    } else if (rec.fail) {
      // Slot-colored placeholder — never skip silently.
      tctx.fillStyle = SLOT_COLORS[L.slot] || "#596b7a";
      const band = { body: [16, 6, 16, 84], base: [16, 24, 16, 56], legs: [16, 48, 16, 32],
        feet: [14, 78, 20, 14], torso: [14, 22, 20, 36], hands: [6, 48, 36, 12],
        wrap: [10, 22, 28, 20], face: [17, 10, 14, 16], head: [16, 2, 16, 14],
        main_hand: [32, 40, 14, 24], off_hand: [2, 40, 12, 20] }[L.slot] || [18, 20, 12, 20];
      tctx.fillRect(band[0], band[1], band[2], band[3]);
    }
    ctx.drawImage(tmp, 0, 0, w, h, 0, 0, w * scale, h * scale);
  }
}

function applyTint(ctx, tint, w, h) {
  const [tr, tg, tb] = hexToRgb(tint);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    d[i] = (d[i] * tr) / 255;
    d[i + 1] = (d[i + 1] * tg) / 255;
    d[i + 2] = (d[i + 2] * tb) / 255;
  }
  ctx.putImageData(img, 0, 0);
}


function sheetTabs(active) {
  return `<div class="sheet-tabs">
    <button type="button" data-tab="bag" class="${active === "bag" ? "on" : ""}">BAG</button>
    <button type="button" data-tab="craft" class="${active === "craft" ? "on" : ""}">CRAFT</button>
    <button type="button" data-a="close" class="tab-close">CLOSE</button>
  </div>`;
}

function bindSheetTabs(game, panel, active) {
  panel.querySelectorAll(".sheet-tabs button").forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.a === "close") {
        if (panel._dollTimer) clearInterval(panel._dollTimer);
        stopDoll3D();
        return game.closePanel();
      }
      const tab = btn.dataset.tab;
      if (!tab || tab === active) return;
      if (panel._dollTimer) clearInterval(panel._dollTimer);
      stopDoll3D();
      if (tab === "craft") return game.openCraft();
      return game.openInventory("bag");
    };
  });
}

function renderCraftTab(game, panel) {
  stopDoll3D();
  const recipes = game.activeCraftRecipes ? game.activeCraftRecipes() : (game.systems.recipes || []);
  const items = game.systems.items || {};
  const nearFire = !!(game.world && (
    (game.world.inFire && game.world.inFire(game.player.x, game.player.z))
    || (game.world.fires || []).some((f) => f.on && Math.hypot(game.player.x - f.x, game.player.z - f.z) < 3.6)
  ));
  document.body.classList.add("char-sheet-open");
  panel.classList.add("char-sheet", "show");
  const cards = recipes.map((r) => {
    const outId = r.out?.id || r.id;
    const outName = r.special === "campfire" ? "Campfire" : (r.name || items[outId]?.name || r.id);
    const note = r.note || items[outId]?.desc || (r.special === "campfire" ? "A fire you can warm up next to." : "");
    const station = r.requires === "near_campfire" || r.requires === "campfire" || r.special === "campfire";
    const need = Object.entries(r.in || {});
    const haveAll = need.every(([id, n]) => (game.inv[id] || 0) >= n);
    const stationOk = !station || r.special === "campfire" || nearFire;
    const can = haveAll && stationOk;
    const ing = need.map(([id, n]) => {
      const have = game.inv[id] || 0;
      const ok = have >= n;
      return `<li class="${ok ? "have" : "need"}">${esc(items[id]?.name || id)} <span>${have} / ${n}</span></li>`;
    }).join("");
    const badge = station ? (r.special === "campfire" ? "FIRE" : "CAMPFIRE") : "HAND";
    const obj = r.isObjective ? `<span class="badge obj">OBJECTIVE</span>` : "";
    const fresh = r.isObjective && r.isNew ? `<span class="badge new">NEW</span>` : "";
    return `<article class="craft-card${r.isObjective ? " obj-card" : ""}${can ? "" : " cant"}" data-recipe="${esc(r.id)}">
      <div class="craft-head">${obj}<span class="badge">${badge}</span><strong>${esc(outName)}</strong>${fresh}</div>
      ${note ? `<p class="craft-note">${esc(note)}</p>` : ""}
      <ul class="craft-ing">${ing || "<li class='have'>No ingredients</li>"}</ul>
      ${station && r.special !== "campfire" ? `<div class="craft-station${nearFire ? " ok" : ""}">${nearFire ? "Campfire in reach" : "Needs a campfire"}</div>` : ""}
      <button data-r="${r.id}" ${can ? "" : "disabled"}>CRAFT</button>
    </article>`;
  }).join("");
  panel.innerHTML = `
    ${sheetTabs("craft")}
    <div class="craft-list">${cards || '<p class="line">No recipes yet.</p>'}</div>
    <div id="craft-confirm" class="craft-confirm" hidden></div>
  `;
  bindSheetTabs(game, panel, "craft");
  panel.querySelectorAll(".craft-list button[data-r]").forEach((btn) => {
    btn.onclick = () => {
      const r = recipes.find((x) => x.id === btn.dataset.r);
      if (!r) return;
      const res = game.doCraft ? game.doCraft(r) : null;
      const box = panel.querySelector("#craft-confirm");
      if (res && res.ok) {
        if (box) { box.hidden = false; box.textContent = res.msg || "Crafted."; }
        game.hud.say(res.msg);
        renderCraftTab(game, panel);
        const again = panel.querySelector("#craft-confirm");
        if (again) { again.hidden = false; again.textContent = res.msg || "Crafted."; }
      } else {
        game.hud.say((res && res.msg) || "Can't.");
      }
    };
  });
}

export function openCharacterSheet(game, panel, tab = "bag") {
  if (tab === "craft") return renderCraftTab(game, panel);
  const items = game.systems.items;
  const paperdoll = game.systems.paperdoll;
  const flags = game.flags;
  game.player.gear = game.player.gear || emptyGear();
  // Main-hand tracks the equipped weapon.
  if (game.player.equipped) {
    const def = items[game.player.equipped];
    if (def && itemSlot(def, game.player.equipped) === "main_hand") {
      game.player.gear.main_hand = game.player.gear.main_hand || {
        id: game.player.equipped,
        durability: game.player.wDur[game.player.equipped] ?? def.durability ?? 100,
      };
    }
  }
  if (flags.has_gas_mask && !game.player.gear.face) {
    game.player.gear.face = { id: "__gas_mask", durability: 100, virtual: true };
  }

  const ins = combinedInsulation(game.player.gear, items);
  const wet = combinedWetResist(game.player.gear, items);
  const carry = carryState(game.inv, game.player.gear, items, game.systems.carry);

  const slotBtn = (s) => {
    const piece = game.player.gear[s];
    const locked = s === "face" && !flags.has_gas_mask;
    const def = piece && !piece.virtual ? items[piece.id] : null;
    const name = locked ? "LOCKED" : piece?.virtual ? "Gas mask" : (def?.name || "—");
    const dur = piece && def?.durability ? Math.round((piece.durability / (def.durability || 100)) * 100) : null;
    return `<button class="slot" data-slot="${s}" ${locked ? "disabled" : ""}>
      <span class="slot-k">${SLOT_LABELS[s]}</span>
      <span class="slot-v">${esc(name)}</span>
      ${dur != null ? `<span class="slot-d">${dur}%</span>` : ""}
    </button>`;
  };

  const bag = Object.entries(game.player.inv || game.inv || {}).filter(([, n]) => n > 0);
  // inv lives on game.inv
  const rows = Object.entries(game.inv).filter(([, n]) => n > 0);
  const cells = rows.map(([id, n]) => {
    const def = items[id] || {};
    return `<button class="cell" data-id="${id}" draggable="true" title="${esc(def.name || id)}">
      <span class="cn">${esc(def.name || id)}</span>
      ${n > 1 ? `<span class="cq">×${n}</span>` : ""}
    </button>`;
  }).join("");

  document.body.classList.add("char-sheet-open");
  panel.classList.add("char-sheet", "show");
  panel.innerHTML = `
    ${sheetTabs("bag")}
    <div class="char-top">
      <div class="char-doll" id="doll-wrap"></div>
      <div class="char-slots">
        ${[...GEAR_SLOTS, ...WEAPON_SLOTS].map(slotBtn).join("")}
      </div>
    </div>
    <div class="char-stats">
      <div class="wbar"><span>WEIGHT ${carry.kg.toFixed(1)} / ${carry.soft} kg</span>
        <div class="wtrack"><div class="wfill${carry.overSoft ? " over" : ""}" style="width:${Math.min(100, (carry.kg / carry.hard) * 100)}%"></div></div>
        <span class="wcap">HARD ${carry.hard}</span></div>
      <div class="insul">INSUL ${(ins * 100).toFixed(0)}% · WET RES ${(wet * 100).toFixed(0)}%</div>
    </div>
    <div class="char-bottom">
      <div class="satchel-label">SATCHEL</div>
      <div class="satchel" id="satchel">${cells || '<div class="empty">The bag is empty.</div>'}</div>
      <div class="inv-actions">
        <button data-a="use">USE</button>
        <button data-a="equip">EQUIP</button>
        <button data-a="close">CLOSE</button>
      </div>
    </div>
    <div id="inv-ghost" class="inv-ghost" hidden></div>
    <div id="inv-picker" class="inv-picker" hidden></div>
  `;

  const wrap = panel.querySelector("#doll-wrap");
  let canvas = null;
  let paint = () => {};
  try {
    canvas = mountDoll3D(wrap, game);
    paint = () => {};
    panel._dollTimer = null;
  } catch (err) {
    // WebGL unavailable — fall back to the 2D paper doll.
    console.warn("[doll3d] fallback to 2D", err && err.message);
    canvas = document.createElement("canvas");
    canvas.id = "doll-canvas"; canvas.width = 192; canvas.height = 384;
    wrap.appendChild(canvas);
    paint = () => drawPaperDoll(canvas, resolveDollLayers(game.player, flags, items, paperdoll), 4);
    paint();
    const t = setInterval(() => { if (panel.classList.contains("show")) paint(); else clearInterval(t); }, 200);
    panel._dollTimer = t;
  }
  bindSheetTabs(game, panel, "bag");

  let selected = null;
  const selectCell = (id) => {
    selected = id;
    panel.querySelectorAll(".cell").forEach((c) => c.classList.toggle("on", c.dataset.id === id));
  };

  panel.querySelectorAll(".cell").forEach((cell) => {
    cell.onclick = () => selectCell(cell.dataset.id);
    cell.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", cell.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      const g = panel.querySelector("#inv-ghost");
      g.hidden = false; g.textContent = (items[cell.dataset.id]?.name || cell.dataset.id);
      game._invDrag = cell.dataset.id;
    });
    cell.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") {
        selected = cell.dataset.id;
        game._invDrag = cell.dataset.id;
        const g = panel.querySelector("#inv-ghost");
        g.hidden = false; g.textContent = (items[cell.dataset.id]?.name || cell.dataset.id);
        const move = (ev) => { g.style.left = ev.clientX + "px"; g.style.top = ev.clientY + "px"; };
        const up = (ev) => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
          g.hidden = true;
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const slot = el?.closest?.("[data-slot]");
          if (slot) tryEquipTo(slot.dataset.slot, cell.dataset.id);
          game._invDrag = null;
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
        g.style.left = e.clientX + "px"; g.style.top = e.clientY + "px";
      }
    });
  });

  const tryEquipTo = (slot, id) => {
    const def = items[id];
    if (!def) return;
    if (slot === "face" && !flags.has_gas_mask) { game.hud.say("No mask yet."); return; }
    const want = itemSlot(def, id);
    if (want !== slot && !(slot === "off_hand" && want === "off_hand") && !(slot === "main_hand" && want === "main_hand")) {
      game.hud.say("Doesn't fit the " + (SLOT_LABELS[slot] || slot) + " slot.");
      return;
    }
    if (slot === "main_hand" || def.kind === "gun" || def.kind === "melee" || def.kind === "throw") {
      if (game.equipWeapon) game.equipWeapon(id); else game.player.tryEquip(id, game.inv);
      game.player.gear.main_hand = { id, durability: game.player.wDur[id] ?? def.durability ?? 100 };
      paint();
      openCharacterSheet(game, panel);
      return;
    }
    const res = wearItem(game.player, game.inv, id, items, flags);
    game.hud.say(res.ok ? "Equipped " + (def.name || id) : res.msg);
    game.audio.ui();
    openCharacterSheet(game, panel);
  };

  panel.querySelectorAll(".slot").forEach((btn) => {
    btn.ondragover = (e) => { e.preventDefault(); btn.classList.add("drop"); };
    btn.ondragleave = () => btn.classList.remove("drop");
    btn.ondrop = (e) => {
      e.preventDefault(); btn.classList.remove("drop");
      const id = e.dataTransfer.getData("text/plain") || game._invDrag;
      if (id) tryEquipTo(btn.dataset.slot, id);
    };
    btn.onclick = () => {
      const s = btn.dataset.slot;
      if (s === "face" && !flags.has_gas_mask) { game.hud.say("No mask yet."); return; }
      const piece = game.player.gear[s];
      const fits = Object.entries(game.inv).filter(([id, n]) => n > 0 && itemSlot(items[id], id) === s);
      const picker = panel.querySelector("#inv-picker");
      picker.hidden = false;
      picker.innerHTML = `<div class="ph">${SLOT_LABELS[s]}</div>` +
        (piece && !piece.virtual ? `<button data-off="${s}">Unequip ${esc(items[piece.id]?.name || piece.id)}</button>` : "") +
        fits.map(([id]) => `<button data-on="${id}" data-slot="${s}">${esc(items[id]?.name || id)}</button>`).join("") +
        (fits.length || piece ? "" : `<div class="empty">Nothing that fits.</div>`) +
        `<button data-x="1">Cancel</button>`;
      picker.querySelectorAll("button").forEach((b) => {
        b.onclick = () => {
          if (b.dataset.x) { picker.hidden = true; return; }
          if (b.dataset.off) { removeGear(game.player, game.inv, b.dataset.off); game.audio.ui(); openCharacterSheet(game, panel); return; }
          if (b.dataset.on) tryEquipTo(b.dataset.slot, b.dataset.on);
        };
      });
    };
  });

  // Tap the doll: map y to a slot and open the picker.
  canvas.onclick = (e) => {
    if (doll3DWasDrag()) return;
    const r = canvas.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const slot = y < 0.18 ? "head" : y < 0.26 ? "face" : y < 0.48 ? "torso" : y < 0.58 ? "hands" : y < 0.82 ? "legs" : "feet";
    panel.querySelector(`.slot[data-slot="${slot}"]`)?.click();
  };

  panel.querySelectorAll(".inv-actions button").forEach((btn) => {
    btn.onclick = () => {
      const a = btn.dataset.a;
      if (a === "close") { clearInterval(panel._dollTimer); stopDoll3D(); return game.closePanel(); }
      if (a === "craft") { clearInterval(panel._dollTimer); stopDoll3D(); return game.openCraft(); }
      if (!selected) { game.hud.say("Pick an item first."); return; }
      const def = items[selected] || {};
      if (a === "equip") {
        const slot = itemSlot(def, selected);
        if (slot) tryEquipTo(slot, selected);
        else game.hud.say("Can't equip that.");
        return;
      }
      if (a === "use") {
        if (def.kind === "wear" || itemSlot(def, selected)) return tryEquipTo(itemSlot(def, selected), selected);
        game.player._allowFilter = !!flags.has_gas_mask;
        if (game.player.useItem(selected, game.inv)) game.hud.say("Used " + (def.name || selected));
        else game.hud.say("Can't use that.");
        openCharacterSheet(game, panel);
      }
    };
  });

  // Test hook for a mid-drag screenshot.
  game.beginInvDrag = (id) => {
    const g = panel.querySelector("#inv-ghost");
    const cell = panel.querySelector(`.cell[data-id="${id}"]`);
    if (!g || !cell) return false;
    selectCell(id);
    g.hidden = false;
    g.textContent = items[id]?.name || id;
    const cr = cell.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const slot = panel.querySelector(`.slot[data-slot="${itemSlot(items[id], id) || "torso"}"]`);
    const sr = slot?.getBoundingClientRect();
    const x = sr ? (sr.left + cr.left) / 2 - pr.left : cr.left - pr.left;
    const y = sr ? (sr.top + cr.top) / 2 - pr.top : cr.top - pr.top;
    g.style.left = x + "px";
    g.style.top = y + "px";
    slot?.classList.add("drop");
    return true;
  };
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
