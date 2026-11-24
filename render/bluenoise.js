// Tiny procedural blue-noise tile (void-and-cluster style ranking), 32x32, R8.
import * as THREE from 'three';

let cached = null;
export function getBlueNoiseTexture(size = 32) {
  if (cached) return cached;
  const N = size * size;
  const sigma = 1.6;
  const kernel = new Float32Array(N);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.min(x, size - x);
      const dy = Math.min(y, size - y);
      kernel[y * size + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }
  // deterministic PRNG so screenshots are reproducible
  let s = 1234567;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const energy = new Float32Array(N);
  for (let i = 0; i < N; i++) energy[i] = rnd() * 1e-3;
  const filled = new Uint8Array(N);
  const rank = new Uint16Array(N);
  for (let r = 0; r < N; r++) {
    let best = -1, bestE = Infinity;
    for (let i = 0; i < N; i++) if (!filled[i] && energy[i] < bestE) { bestE = energy[i]; best = i; }
    filled[best] = 1;
    rank[best] = r;
    const bx = best % size, by = (best / size) | 0;
    for (let y = 0; y < size; y++) {
      const ky = ((y - by + size) % size) * size;
      const row = y * size;
      for (let x = 0; x < size; x++) energy[row + x] += kernel[ky + ((x - bx + size) % size)];
    }
  }
  const data = new Uint8Array(N);
  for (let i = 0; i < N; i++) data[i] = Math.floor((rank[i] / N) * 256);
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
