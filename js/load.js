// Shared fetch helpers. Never writes. Used to load story/, systems/, levels/, audio/, render/.

export async function tryFetch(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const text = await r.text();
    if (!text || !text.trim()) return null;
    if (url.split("?")[0].endsWith(".json") || (r.headers.get("content-type") || "").includes("json")) {
      try { return JSON.parse(text); } catch { return null; }
    }
    return text;
  } catch {
    return null;
  }
}

export function resolveModuleUrl(url) {
  const href = new URL(url, document.baseURI).href;
  return href + (href.includes("?") ? "&" : "?") + "t=" + Date.now();
}

export async function tryImport(url) {
  try {
    const href = new URL(url, document.baseURI).href;
    const r = await fetch(href, { cache: "no-store" });
    if (!r.ok) return null;
    const text = await r.text();
    if (!text || !text.trim()) return null;
    // import() is resolved against this module (js/load.js). Use the document base
    // so './audio/audio.js' and './render/index.js' hit the project root, not /js/.
    return await import(href + (href.includes("?") ? "&" : "?") + "t=" + Date.now());
  } catch {
    return null;
  }
}

export async function listDir(url) {
  // GitHub Pages has no directory listing. Read a relative index.json in the folder.
  try {
    const dir = url.endsWith("/") ? url : url + "/";
    const href = new URL(dir + "index.json", document.baseURI).href;
    const r = await fetch(href, { cache: "no-store" });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j) ? j : (j.files || j.items || j.entries || []);
    return arr.map((x) => (typeof x === "string" ? x : x.file || x.path || x.name || x.id)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function loadJsonDir(dir, ext = ".json") {
  const names = await listDir(dir);
  const out = [];
  const root = dir.endsWith("/") ? dir : dir + "/";
  for (const n of names) {
    if (!n.endsWith(ext)) continue;
    const data = await tryFetch(root + n);
    if (data != null) out.push({ name: n, data });
  }
  return out;
}
