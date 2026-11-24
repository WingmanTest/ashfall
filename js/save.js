import { CFG } from "./config.js";

export function loadSave() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSave() {
  return !!loadSave();
}

export function writeSave(data) {
  try {
    localStorage.setItem(CFG.saveKey, JSON.stringify({ ...data, ts: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(CFG.saveKey); } catch {}
}
