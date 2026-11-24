// Rev 2 traders (npcs.json traders[] + gameplay_hooks.barter): compact mobile trade modal.
// Prices = items.json value × price_mult_by_act[act]. Payment is auto-barter from the bag:
// wanted goods count at value / 0.7 (the "x0.7 price when paying in a wanted good" rule).
import { addItem, takeItem } from "./inventory.js?v=r16";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NEVER_PAY = new Set(["quest", "key"]);

export function actForChapter(game, ch) {
  const def = game.story?.chapterDef?.(ch);
  if (def && def.act) return Number(def.act) || 1;
  const n = parseInt(String(ch || "ch01").replace(/\D/g, ""), 10) || 1;
  return n <= 3 ? 1 : n <= 7 ? 2 : 3;
}

function itemDef(game, id) { return game.systems?.items?.[id] || null; }
function itemName(game, id) { return itemDef(game, id)?.name || String(id).replace(/_/g, " "); }
function itemValue(game, id) { const v = Number(itemDef(game, id)?.value); return Number.isFinite(v) && v > 0 ? v : 5; }

function wanted(game, trader, id) {
  const def = itemDef(game, id) || {};
  const cat = String(def.category || "");
  return (trader.wants || []).some((w) => {
    const k = String(w).toLowerCase();
    return k === id || id.includes(k.replace(/s$/, "")) || k === cat || (k === "ammo" && cat === "ammo");
  });
}

export function traderOffer(game, traderId) {
  const tr = game.story?.traderById?.(traderId);
  if (!tr) return null;
  const act = actForChapter(game, game.flags?.chapter);
  const mult = tr.price_mult_by_act?.[act] ?? game.story?.hooks?.barter?.price_mult_by_act?.[act] ?? 1;
  if (mult == null) return { tr, act, closed: true, rows: [] };
  game.traderStock = game.traderStock || {};
  const key = `${traderId}@${act}`;
  if (!game.traderStock[key]) game.traderStock[key] = { ...(tr.stock_by_act?.[act] || tr.stock_by_act?.[String(act)] || {}) };
  const stock = game.traderStock[key];
  const rows = Object.entries(stock)
    .filter(([id]) => itemDef(game, id) || game.systems?.items?.[id] !== undefined || true)
    .map(([id, qty]) => ({ id, qty: qty | 0, price: Math.max(1, Math.round(itemValue(game, id) * mult)) }));
  return { tr, act, mult, stock, rows, closed: false };
}

/** Pick bag items worth >= price. Returns {pay:{id:n}, worth} or null. */
export function planPayment(game, trader, price) {
  const inv = game.inv || {};
  const eq = game.player?.gear ? new Set(Object.values(game.player.gear).filter(Boolean)) : new Set();
  const cands = [];
  for (const [id, n] of Object.entries(inv)) {
    if (!(n > 0)) continue;
    const def = itemDef(game, id);
    if (!def || NEVER_PAY.has(def.category) || def.kind === "quest") continue;
    if (eq.has(id) && n <= 1) continue;
    if (id === game.player?.equipped) continue;
    const w = wanted(game, trader, id);
    const unit = itemValue(game, id) / (w ? 0.7 : 1);
    cands.push({ id, n: eq.has(id) ? n - 1 : n, unit, w });
  }
  // Wanted goods first, then cheapest units so we don't overpay with a big-ticket item.
  cands.sort((a, b) => (b.w - a.w) || (a.unit - b.unit));
  const pay = {};
  let worth = 0;
  for (const c of cands) {
    while (c.n > 0 && worth < price) { pay[c.id] = (pay[c.id] || 0) + 1; c.n--; worth += c.unit; }
    if (worth >= price) break;
  }
  return worth >= price ? { pay, worth: Math.round(worth) } : null;
}

export function bagWorth(game, trader) {
  const p = planPayment(game, trader, 1e9);
  if (p) return p.worth;
  let w = 0;
  for (const [id, n] of Object.entries(game.inv || {})) {
    const def = itemDef(game, id);
    if (!def || NEVER_PAY.has(def.category) || !(n > 0)) continue;
    w += n * itemValue(game, id) / (wanted(game, trader, id) ? 0.7 : 1);
  }
  return Math.round(w);
}

export function buy(game, traderId, itemId) {
  const off = traderOffer(game, traderId);
  if (!off || off.closed) return { ok: false, why: "closed" };
  const row = off.rows.find((r) => r.id === itemId);
  if (!row || row.qty <= 0) return { ok: false, why: "sold out" };
  const plan = planPayment(game, off.tr, row.price);
  if (!plan) return { ok: false, why: "short" };
  for (const [id, n] of Object.entries(plan.pay)) takeItem(game.inv, id, n);
  addItem(game.inv, itemId, 1);
  game.noteAcquired?.(itemId, 1);
  off.stock[itemId] = row.qty - 1;
  const rf = off.tr.rep_flag || `${traderId}_rep`;
  if (game.flags) game.flags[rf] = (Number(game.flags[rf]) || 0) + (plan.worth <= row.price * 1.25 ? 1 : 0);
  return { ok: true, paid: plan.pay };
}

/** Render the trade modal into #panel. onTalk opens the trader's dialogue (if any). */
export function openTradeModal(game, panel, traderId, { onTalk, onClose, setMenuOpen } = {}) {
  const render = (msg = "") => {
    const off = traderOffer(game, traderId);
    if (!off) return false;
    const { tr } = off;
    const worth = bagWorth(game, tr);
    let html = `<div class="dlg-bar"><button type="button" data-a="leave">LEAVE</button></div>`;
    html += `<div class="who">${esc(String(tr.name || traderId).toUpperCase())} · TRADE</div>`;
    if (off.closed) {
      html += `<p class="line">${esc(tr.act_shift?.[off.act] || "Nothing to sell.")}</p>`;
    } else {
      html += `<p class="line" style="font-size:11px;opacity:.8;margin-bottom:6px">Barter value in bag: <b>${worth}</b>${tr.wants?.length ? ` · wants ${esc(tr.wants.slice(0, 3).join(", "))}` : ""}</p>`;
      html += `<div class="trade-list" style="display:flex;flex-direction:column;gap:5px;max-height:38vh;overflow-y:auto;-webkit-overflow-scrolling:touch">`;
      for (const r of off.rows) {
        const can = r.qty > 0 && !!planPayment(game, tr, r.price);
        html += `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(itemName(game, r.id))} <span style="opacity:.6">×${r.qty}</span></span>
          <span style="opacity:.8;min-width:34px;text-align:right">${r.price}</span>
          <button type="button" data-buy="${esc(r.id)}" ${can ? "" : "disabled"} style="width:auto;min-width:64px;padding:6px 10px;${can ? "" : "opacity:.4"}">${r.qty > 0 ? "BUY" : "SOLD"}</button></div>`;
      }
      if (!off.rows.length) html += `<p class="line">Shelves are bare today.</p>`;
      html += `</div>`;
    }
    if (msg) html += `<p class="line trade-msg" style="font-size:11px;margin:6px 0 0">${esc(msg)}</p>`;
    html += `<div class="choices" style="margin-top:8px">`;
    if (onTalk) html += `<button type="button" data-a="talk">TALK</button>`;
    html += `<button type="button" data-a="leave2">DONE</button></div>`;
    panel.innerHTML = html;
    panel.classList.add("show");
    let locked = false;
    panel.querySelectorAll("button").forEach((b) => {
      const go = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (b.disabled || locked) return;
        locked = true;
        game.audio?.ui?.();
        if (b.dataset.buy) {
          const r = buy(game, traderId, b.dataset.buy);
          if (r.ok) {
            const paid = Object.entries(r.paid).map(([id, n]) => `${n}× ${itemName(game, id)}`).join(", ");
            game.onItemsChanged?.("trade");
            render(`Got ${itemName(game, b.dataset.buy)} for ${paid}.`);
          } else render(r.why === "short" ? "Not enough to trade." : "Sold out.");
          return;
        }
        if (b.dataset.a === "talk") return onTalk?.();
        onClose?.();
      };
      b.addEventListener("pointerup", go);
      b.onclick = go;
    });
    return true;
  };
  game.mode = "dialogue";
  setMenuOpen?.(true);
  game.input?.resetTouch?.();
  return render();
}
