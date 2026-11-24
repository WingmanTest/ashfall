/** Device / quality helpers shared by the boot path and the world loader. */

export function isMobileClient() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1) return true;
  if (("ontouchstart" in window) && Math.min(screen.width, screen.height) <= 920) return true;
  return false;
}

/** Cap backing-store DPR. iPhone Retina is 3×; a 390×844 CSS canvas would become 1170×2532. */
export function canvasDpr() {
  const raw = window.devicePixelRatio || 1;
  if (isMobileClient()) return 1;
  return Math.min(raw, 1.5);
}

export function preferredTier() {
  if (isMobileClient()) return "mobile";
  const params = new URLSearchParams(location.search);
  return params.get("tier") || "auto";
}
