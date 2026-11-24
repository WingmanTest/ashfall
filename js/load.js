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
  // Prefer a folder index.json (GitHub Pages has no directory listing).
  const dir = url.endsWith("/") ? url : url + "/";
  try {
    const href = new URL(dir + "index.json", document.baseURI).href;
    const r = await fetch(href, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.files || j.items || j.entries || []);
      return arr.map((x) => (typeof x === "string" ? x : x.file || x.path || x.name || x.id)).filter(Boolean);
    }
  } catch {}
  // Local static servers may still expose a directory listing. Never probe
  // the bare folder on github.io — that 404s and shows up in iOS consoles.
  if (/github\.io$/i.test(location.hostname)) return [];
  try {
    const r = await fetch(dir, { cache: "no-store" });
    if (!r.ok) return [];
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.files || j.items || j.entries || []);
      return arr.map((x) => (typeof x === "string" ? x : x.file || x.path || x.name || x.id)).filter(Boolean);
    }
    const html = await r.text();
    const names = [];
    const re = /href\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      let href = m[1].split("?")[0].split("#")[0];
      if (!href || href.startsWith("?") || href === "/" || href === "../" || href === "./") continue;
      const base = href.replace(/\/$/, "").split("/").pop();
      if (base && !base.startsWith(".")) names.push(decodeURIComponent(base));
    }
    return [...new Set(names)];
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
