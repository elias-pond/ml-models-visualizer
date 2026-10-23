// Math helpers shared by all visualizers.

// Approx Gaussian via central limit (sum of 3 uniforms).
export function randn(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Framerate-independent exponential approach. `rate` ~ speed per second.
// dt in seconds. Returns a value moved fractionally toward target.
export function approach(current: number, target: number, dt: number, rate = 8): number {
  const t = 1 - Math.exp(-rate * dt);
  return current + (target - current) * t;
}

export function approachColor(
  cur: string,
  target: string,
  dt: number,
  rate = 6
): string {
  const a = parseColor(cur);
  const b = parseColor(target);
  const t = 1 - Math.exp(-rate * dt);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseColor(c: string) {
  if (c.startsWith("rgb")) {
    const m = c.match(/\d+/g);
    if (m) return { r: +m[0], g: +m[1], b: +m[2] };
  }
  let h = c.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

// Standard Gaussian PDF.
export function gaussian(x: number, mu: number, sigma: number): number {
  const s = sigma * sigma;
  return Math.exp(-((x - mu) ** 2) / (2 * s)) / Math.sqrt(2 * Math.PI * s);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function smooth(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
