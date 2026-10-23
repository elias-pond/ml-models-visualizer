// High-tech canvas color system for ML visualizers.
// Barebones black/white theme with terracotta as the sole page accent.
// Inside the dark canvas "screens" we use warm terracotta/amber for UI
// accents, and the classification visualizers use RED/BLUE for the two
// classes so the decision regions read clearly at a glance.

export const C = {
  bg: "#0c0c0e", // near-black canvas screen
  bgDeep: "#08080a",
  grid: "rgba(255, 255, 255, 0.05)",
  gridStrong: "rgba(255, 255, 255, 0.10)",
  text: "#f4f4f3",
  textDim: "#a1a1aa",
  primary: "#c96442", // terracotta accent
  primaryGlow: "#d97757", // peach-orange
  teal: "#d97757", // (kept name for ref compat)
  cyan: "#e89b7a", // (kept name for ref compat)
  amber: "#f59e0b", // amber (highlight / trail)
  rose: "#e06960",
  violet: "#8c5a3c",
  line: "#d97757",
  white: "#fbfafa",
};

// Two-class palette for CLASSIFICATION visualizers — high-contrast red/blue
// so users can clearly see which class a region/point belongs to.
export const CLASS_A = "#ef4444"; // red — Class A
export const CLASS_B = "#3b82f6"; // blue — Class B

// Multi-class palette — warm hues (used by K-Means for 3 centroids; DBSCAN
// uses its own clusterColor). Kept warm so clustering reads as "natural
// groupings" while classification reads as "binary decision".
export const CLASS = [
  "#e06960", // warm rose
  "#c96442", // terracotta
  "#f59e0b", // amber
  "#e89b7a", // peach
  "#8c5a3c", // rust
  "#d97757", // peach-orange
];

// Returns an rgba string with the given alpha from any hex/css color.
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba")) return color;
  if (color.startsWith("rgb")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// Build a radial gradient suitable for canvas backgrounds (warm charcoal).
export function bgGradient(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "#221f1b");
  g.addColorStop(1, "#15120f");
  return g;
}
