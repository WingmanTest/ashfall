// One AnimationMixer per rigged instance. Clips are in-place; locomotion
// is driven by the object's path speed via clipTimeScale().
import * as THREE from "three";
import { playClip, clipTimeScale, getClips, isRigged } from "../models/registry.js?v=r15";

export { isRigged, playClip, clipTimeScale, getClips };

export function fadeFor(from, to) {
  if (to === "sit" || from === "sit") return 0.4;
  if ((from === "walk" && (to === "run" || to === "trot")) || ((from === "run" || from === "trot") && to === "walk")) return 0.2;
  return 0.25;
}

export function attachMixer(root, modelId) {
  if (!root) return null;
  const id = modelId || root.userData.model || root.userData.modelId;
  if (!isRigged(id)) return null;
  if (root.userData.mixer) return root.userData.mixer;
  const mixer = new THREE.AnimationMixer(root);
  root.userData.mixer = mixer;
  root.userData.modelId = id;
  root.userData.animClip = null;
  playClip(mixer, root, "idle", { fade: 0, offset: Math.random() * 4 });
  root.userData.animClip = "idle";
  return mixer;
}

export function disposeMixer(root) {
  const m = root?.userData?.mixer;
  if (!m) return;
  try { m.stopAllAction(); m.uncacheRoot?.(root); } catch {}
  if (root.userData) {
    root.userData.mixer = null;
    root.userData._clipAction = null;
    root.userData.animClip = null;
  }
}

export function setLocomotion(root, speed, { sit = false, modelId } = {}) {
  const id = modelId || root?.userData?.modelId || root?.userData?.model;
  const mixer = root?.userData?.mixer;
  if (!mixer || !isRigged(id)) return null;
  const clips = getClips(id);
  const from = root.userData.animClip;
  let name = "idle";
  if (sit && clips.includes("sit")) name = "sit";
  else if (Math.abs(speed) > 0.05) {
    if (clips.includes("trot") && speed >= 1.45) name = "trot";
    else if (clips.includes("run") && speed >= 1.6) name = "run";
    else if (clips.includes("walk")) name = "walk";
  }
  const fade = from ? fadeFor(from, name) : 0;
  const a = playClip(mixer, root, name, { fade, offset: from ? 0 : Math.random() * 2 });
  if (a && (name === "walk" || name === "run" || name === "trot")) {
    a.timeScale = clipTimeScale(id, name, Math.max(0.05, speed));
  } else if (a) {
    a.timeScale = 1;
  }
  root.userData.animClip = name;
  return a;
}

/** Update a mixer. Off-screen / distant instances are throttled and hold their pose. */
export function updateMixer(root, dt, { dist = 0, visible = true } = {}) {
  const m = root?.userData?.mixer;
  if (!m) return;
  if (!visible && dist > 28) return;
  if (!visible && dist > 16) {
    root.userData._mixSkip = (root.userData._mixSkip || 0) + 1;
    if (root.userData._mixSkip % 3) return;
    m.update(dt * 3);
    return;
  }
  m.update(dt);
}

export function faceToward(root, x, z, dt, rate = 8) {
  if (!root) return;
  const dx = x - root.position.x, dz = z - root.position.z;
  if (Math.hypot(dx, dz) < 0.02) return;
  const want = Math.atan2(dx, dz);
  let dy = want - root.rotation.y;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  root.rotation.y += dy * Math.min(1, dt * rate);
}

/** Place or bump a nameplate just above the (possibly taller) head. */
export function refreshNameplate(root, fallbackY = 1.95) {
  if (!root) return;
  let y = fallbackY;
  try {
    const box = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(box.max.y)) y = Math.min(2.15, Math.max(1.7, box.max.y + 0.14));
  } catch {}
  root.traverse((o) => {
    if (o.isSprite) o.position.y = y;
  });
}
