// Shared canvas drawing primitives so every visualizer shares the same
// high-tech backdrop (grid + radial vignette + corner glow) and reusable
// "glow point" / "glow ring" helpers.

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time = 0
) {
  // Base near-black radial gradient.
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "#15151a");
  g.addColorStop(1, "#08080a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Grid.
  const step = 32;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  ctx.beginPath();
  for (let x = step; x < w; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = step; y < h; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();

  // Subtle drifting terracotta accent glow (top-left + bottom-right).
  const a = 0.05 + 0.02 * Math.sin(time * 0.6);
  const gl = ctx.createRadialGradient(w * 0.2, h * 0.25, 0, w * 0.2, h * 0.25, w * 0.55);
  gl.addColorStop(0, `rgba(217, 119, 87, ${a})`);
  gl.addColorStop(1, "rgba(217, 119, 87, 0)");
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, w, h);

  const gl2 = ctx.createRadialGradient(w * 0.85, h * 0.8, 0, w * 0.85, h * 0.8, w * 0.5);
  gl2.addColorStop(0, `rgba(201, 100, 66, ${a * 0.7})`);
  gl2.addColorStop(1, "rgba(201, 100, 66, 0)");
  ctx.fillStyle = gl2;
  ctx.fillRect(0, 0, w, h);

  // Vignette.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

// A glowing data point: soft halo + crisp core.
export function drawGlowPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow = 14
) {
  ctx.save();
  ctx.shadowBlur = glow;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // bright core
  ctx.fillStyle = "rgba(255,250,242,0.88)";
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r * 0.35), 0, Math.PI * 2);
  ctx.fill();
}

// Stroked glowing ring.
export function drawGlowRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 0.8,
  width = 2,
  dash?: number[]
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Animated dashed line (offset by time) with glow.
export function drawGlowLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
  alpha = 0.9,
  dashOffset = 0
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashOffset) {
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -dashOffset;
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function getMousePos(canvas: HTMLCanvasElement, evt: { clientX: number; clientY: number }) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}
