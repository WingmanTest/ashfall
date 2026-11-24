// Walkable scent-trail routing for Wraith. Authored waypoints are hints;
// the actual path is a grid BFS that goes around cars and other colliders.
const RAD = 0.34;
const CELL = 0.7;

export function walkable(world, x, z, rad = RAD) {
  if (!world || typeof world.blocked !== "function") return true;
  return !world.blocked(x, z, rad);
}

export function nudgeWalkable(world, x, z, rad = RAD, prefer = null) {
  if (walkable(world, x, z, rad)) return { x, z };
  const dirs = [];
  if (prefer && (prefer.x !== x || prefer.z !== z)) {
    const d = Math.hypot(prefer.x - x, prefer.z - z) || 1;
    dirs.push({ x: (prefer.x - x) / d, z: (prefer.z - z) / d });
    dirs.push({ x: -dirs[0].z, z: dirs[0].x });
    dirs.push({ x: dirs[0].z, z: -dirs[0].x });
    dirs.push({ x: -dirs[0].x, z: -dirs[0].z });
  }
  for (const r of [1.2, 1.8, 2.4, 3.2, 4.2, 5.5, 7]) {
    const tries = [];
    for (const d of dirs) tries.push({ x: x + d.x * r, z: z + d.z * r });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      tries.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r });
    }
    for (const p of tries) if (walkable(world, p.x, p.z, rad)) return p;
  }
  if (world.unstuckFrom) {
    const u = world.unstuckFrom(x, z, rad, prefer || { x, z });
    return { x: u.x, z: u.z };
  }
  return { x, z };
}

export function lineWalkable(world, a, b, rad = RAD) {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(2, Math.ceil(d / 0.4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!walkable(world, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, rad)) return false;
  }
  return true;
}

function simplify(world, pts, rad = RAD) {
  if (!pts || pts.length <= 2) return pts || [];
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !lineWalkable(world, pts[i], pts[j], rad)) j--;
    const n = { ...pts[j] };
    out.push(n);
    i = j;
  }
  return out;
}

export function bfsPath(world, a, b, rad = RAD) {
  const start = nudgeWalkable(world, a.x, a.z, rad, b);
  const goal = nudgeWalkable(world, b.x, b.z, rad, start);
  if (lineWalkable(world, start, goal, rad)) return [start, goal];
  const bounds = world?.bounds || { minX: -80, maxX: 80, minZ: -160, maxZ: 40 };
  const key = (ix, iz) => ix + ":" + iz;
  const toCell = (x, z) => [Math.round(x / CELL), Math.round(z / CELL)];
  const toWorld = (ix, iz) => ({ x: ix * CELL, z: iz * CELL });
  const [sx, sz] = toCell(start.x, start.z);
  const [gx, gz] = toCell(goal.x, goal.z);
  const minIX = Math.floor((bounds.minX || -80) / CELL) - 2;
  const maxIX = Math.ceil((bounds.maxX || 80) / CELL) + 2;
  const minIZ = Math.floor((bounds.minZ || -160) / CELL) - 2;
  const maxIZ = Math.ceil((bounds.maxZ || 40) / CELL) + 2;
  const okCell = (ix, iz) => {
    if (ix < minIX || ix > maxIX || iz < minIZ || iz > maxIZ) return false;
    const p = toWorld(ix, iz);
    return walkable(world, p.x, p.z, rad);
  };
  const q = [[sx, sz]];
  const came = new Map();
  came.set(key(sx, sz), null);
  const neigh = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = false;
  const cap = 8000;
  for (let n = 0; n < q.length && n < cap; n++) {
    const [ix, iz] = q[n];
    if (ix === gx && iz === gz) { found = true; break; }
    for (const [dx, dz] of neigh) {
      const nx = ix + dx, nz = iz + dz;
      const k = key(nx, nz);
      if (came.has(k)) continue;
      if (!okCell(nx, nz)) continue;
      came.set(k, [ix, iz]);
      q.push([nx, nz]);
    }
  }
  if (!found) return [start, goal];
  const cells = [];
  let cur = [gx, gz];
  while (cur) {
    cells.push(cur);
    cur = came.get(key(cur[0], cur[1]));
  }
  cells.reverse();
  const pts = [start, ...cells.map(([ix, iz]) => toWorld(ix, iz)), goal];
  return simplify(world, pts, rad);
}

export function authoredPoints(raw) {
  return (raw || []).map((p) => {
    if (Array.isArray(p)) return { x: p[0], z: p[1] };
    return {
      x: p.x, z: p.z,
      beat: p.beat || null,
      toast: p.toast || null,
      prop: p.prop || null,
    };
  }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z));
}

export function colliderAt(world, x, z) {
  for (const c of world?.colliders || []) {
    if (c.walkable || c.ghost) continue;
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) return c;
  }
  return null;
}

function sniffToast(kind) {
  if (kind === "car" || /car|sedan/.test(String(kind || ""))) {
    return "Wraith sniffs the car... the trail continues toward the canal.";
  }
  return "Wraith has the scent... the trail continues.";
}

export function decorateBeat(world, pt, original) {
  const hit = colliderAt(world, original.x, original.z);
  const kind = (hit && (hit.kind || hit.src)) || original.prop || "";
  if (original.beat || /car|sedan/.test(String(kind))) {
    return {
      ...pt,
      beat: original.beat || "sniff",
      prop: original.prop || (/car|sedan/.test(String(kind)) ? "car" : kind),
      toast: original.toast || sniffToast(kind),
    };
  }
  return pt;
}

export function pickStartIndex(from, pts) {
  if (!pts.length) return 0;
  let bestI = 0, best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = Math.hypot(from.x - pts[i].x, from.z - pts[i].z);
    const score = d - i * 1.2;
    if (score < best) { best = score; bestI = i; }
  }
  if (Math.hypot(from.x - pts[bestI].x, from.z - pts[bestI].z) < 1.7 && bestI < pts.length - 1) {
    bestI += 1;
  }
  return bestI;
}

/** Route from `from` along the remaining authored trail, around colliders.
 *  opts.minIndex: do not go back to earlier authored stops already completed. */
export function routeTrack(world, from, authored, opts = {}) {
  const raw = authoredPoints(authored);
  if (!raw.length) return [{ x: from.x, z: from.z }];
  const cleaned = raw.map((p, i) => {
    const nxt = raw[i + 1] || p;
    const nudged = nudgeWalkable(world, p.x, p.z, RAD, nxt);
    return decorateBeat(world, { x: nudged.x, z: nudged.z, authoredI: i }, p);
  });
  let i0 = pickStartIndex(from, cleaned);
  if (opts.minIndex != null) i0 = Math.max(i0, opts.minIndex);
  i0 = Math.max(0, Math.min(i0, cleaned.length - 1));
  const nodes = [];
  let cur = { x: from.x, z: from.z };
  nodes.push({ x: cur.x, z: cur.z });
  for (let i = i0; i < cleaned.length; i++) {
    const dest = cleaned[i];
    const seg = bfsPath(world, cur, dest);
    for (let k = 1; k < seg.length; k++) {
      const last = k === seg.length - 1;
      nodes.push(last
        ? { ...dest, x: seg[k].x, z: seg[k].z, authoredI: i }
        : { x: seg[k].x, z: seg[k].z });
    }
    cur = { x: dest.x, z: dest.z };
  }
  if (nodes.length === 1) nodes.push({ ...cleaned[cleaned.length - 1], authoredI: cleaned.length - 1 });
  return nodes;
}

export { RAD as NAV_RAD };
