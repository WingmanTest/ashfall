// 32x32 blue-noise tile (void-and-cluster ranking, sigma 1.6, seed 1234567), R8.
// Pre-baked (was generated at boot: ~2M ops, ~10 ms desktop / more on phones). 1 KB.
// generateBlueNoise() below reproduces B64 exactly (dev only; not called at runtime).
import * as THREE from 'three';

const B64 = 'FLFVm9RL5zVTfT4JUOK2A8usbroxnRw3defHT9uSd6TkaQb7KRlrt5rWsI3CfkBk/zeIDO7QVfi1XyqFP/8gNYJDwHWpj8kE/idj6S8Y0pEdoVfISo5xCEKYGNQEumDFlRzfXDrvV4BGcw+gWfWpTtt45ymvF9ynwnrzqm2MSfLRLbOED9kio+KQ0Di8hgptLbQGZn/0M2ch3zVWyiylC1Fs95tLr8Y9Fr5S7HYj4clD95TUP51ZzIZMDZTrGd57rDkCwil4XfluKq4CRpVcsIMbVb4S5LUB+qO9ZYFAXr/mj9Ni7Y4ImdODYdim/TYQnOxwL4xMJ5U7c+YmsfyYEiRNfxlE3DWxSxHzihtxxeVgOsup/Gp80l4T1EgFzjRyxKj7t5dowCHloi1At1MofLgDgR/XC7zvpjCQeqJVifEJPm8uDemFWHnFbM/qCpHVQqXgSF2fQRxPxu1h4RiyZZzMVtahSBf9PQaVW36q+Foc7miPwyzhiWmvDCe9PNcq4o0d83bIrpLZsyXeFEcvyXeaMw70d7UE/31DmfRtg0wRebZiAzdeKG9Q9jm/nWy0CU/NrR5gSpw2zd1TjAGr7r5DLJbeg/HQDYejZYLyH4ra/oBB45LawCJiEqgxyiFnoP/PT7AWpEq95B3SAFLjYTwmpGm7Mg5z8oi5dfpb2jZUCHEj7TxmlC52QrIzx6cQmMFWAvaGWaw7TeMdQbWRfMTiq43BeM0H+1ua64t0RNV76BrXniLO55cFx59qC+kaiWM+DVgr5YSo1w5pGfAouWYwjnA+UHoVZ9svgPBOojL2Id2g+LYbUT8luE3Cn1gH+kmy76fD/Te9h16yI8puukeAxnJGk2rdw3SQ+TGE36l/yRBfKQiRrR9E+A+TO9sDllwWMtYCrogT6GIE00YVYySXOtGF4GtX7JvLU+F6V6vP8biH7WA4/iuhPK14mfSz2FTodLZHFNZ9AG4wpxj5JjkLbKQkyn1Nu1nZIMxqK0CHAaAbNPWeLME95rmEw2iKs91SPb4SnNUKk4LxVAzF6nG7/WSQyHJSrItfIEkH6E52H5rrdVr1KG/qFES5i6MaTjLOSa8H5B7zDp382JMwocT+iwbSR4qxOsRkqDP6Wn7clBOBKluGQdF5xzhzWs8RSDZhtC2lF+VWmyLedAXTJ6tr47jy2J+0ZytRqha38Gum2RV/4GjNewD8gchMmbtF9gk7VBpvNBPgmAXrfEIlhfW6UJf3PyWWRbwxEelmF4lfwXmmjstL8IK8Y8yN354BLnIgxgpdv9xtpVyPrjnQ7i6W1ST7AKpdJkX5HjRYwGXRjOo4e62IEO8ezvdwI553URXmRWR+v9qSDKJwsA/sSg==';

let cached = null;
function decode(b64) {
  if (typeof atob === 'function') {
    const s = atob(b64); const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64')); // node
}
export function getBlueNoiseTexture() {
  if (cached) return cached;
  const tex = new THREE.DataTexture(decode(B64), 32, 32, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

/** Dev only: regenerate the tile (returns Uint8Array(size*size)). */
export function generateBlueNoise(size = 32, sigma = 1.6) {
  const N = size * size;
  const kernel = new Float32Array(N);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = Math.min(x, size - x), dy = Math.min(y, size - y);
    kernel[y * size + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
  }
  let s = 1234567;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const energy = new Float32Array(N);
  for (let i = 0; i < N; i++) energy[i] = rnd() * 1e-3;
  const filled = new Uint8Array(N), rank = new Uint16Array(N);
  for (let r = 0; r < N; r++) {
    let best = -1, bestE = Infinity;
    for (let i = 0; i < N; i++) if (!filled[i] && energy[i] < bestE) { bestE = energy[i]; best = i; }
    filled[best] = 1; rank[best] = r;
    const bx = best % size, by = (best / size) | 0;
    for (let y = 0; y < size; y++) {
      const ky = ((y - by + size) % size) * size, row = y * size;
      for (let x = 0; x < size; x++) energy[row + x] += kernel[ky + ((x - bx + size) % size)];
    }
  }
  const data = new Uint8Array(N);
  for (let i = 0; i < N; i++) data[i] = Math.floor((rank[i] / N) * 256);
  return data;
}
