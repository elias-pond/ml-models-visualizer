"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B } from "@/lib/viz/colors";
import { clamp } from "@/lib/viz/math";

// ---------------------------------------------------------------------------
// Gradient Descent — minimization of a 1-D parabola  f(x) = a·x².
// A ball starts on the curve and rolls down to the minimum (x = 0) following
// the gradient:  x ← x − lr · f'(x) = x − lr · 2a·x.
// Shows: the parabola curve (blue), the ball (red) on the curve, the tangent
// line at the ball (red dashed, slope = 2a·x), a gradient arrow pointing
// downhill, and a live loss sparkline of f(x).
// ---------------------------------------------------------------------------

interface State {
  x: number; // current parameter, ∈ [-1, 1]
  a: number; // parabola coefficient
  lr: number; // learning rate
  vu: number; // velocity (for a touch of momentum, smoother roll)
  lossHist: number[];
  iter: number;
  settleT: number;
  done: boolean;
}

const A = 1.0; // f(x) = x²
const LR = 1.6;
const MOMENTUM = 0.7;

function init(w: number, h: number): State {
  const s: State = {
    x: 0.78 * (Math.random() > 0.5 ? 1 : -1) + (Math.random() - 0.5) * 0.1,
    a: A,
    lr: LR,
    vu: 0,
    lossHist: [],
    iter: 0,
    settleT: 0,
    done: false,
  };
  return s;
}

function f(s: State, x: number): number {
  return s.a * x * x;
}
function grad(s: State, x: number): number {
  return 2 * s.a * x;
}

function step(s: State, w: number, h: number, dt: number) {
  if (s.done) return;
  const sub = 3;
  const hdt = dt / sub;
  for (let i = 0; i < sub; i++) {
    const g = grad(s, s.x);
    s.vu = MOMENTUM * s.vu - s.lr * g * hdt;
    s.x = clamp(s.x + s.vu * hdt, -1, 1);
  }
  s.iter += 1;
  s.lossHist.push(f(s, s.x));
  if (s.lossHist.length > 90) s.lossHist.shift();
  const speed = Math.abs(s.vu) + Math.abs(grad(s, s.x));
  if (speed < 0.01) s.settleT += dt;
  else s.settleT = 0;
  if (s.settleT > 0.8) s.done = true;
}

// Map parameter x ∈ [-1,1] → canvas px. Vertex (x=0) sits at bottom-center.
const MARGIN_X = 28;
const MARGIN_Y = 40;
function mapX(x: number, w: number): number {
  return MARGIN_X + ((x + 1) / 2) * (w - 2 * MARGIN_X);
}
function mapY(x: number, h: number, s: State): number {
  const ymax = s.a; // f(±1) = a
  const yv = f(s, x);
  return h - MARGIN_Y - (yv / ymax) * (h - 2 * MARGIN_Y);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: State,
  time: number,
  dt: number
) {
  drawBackdrop(ctx, w, h, time);

  // --- faint axes ---
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  // x-axis (the parameter axis) at the bottom
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, h - MARGIN_Y);
  ctx.lineTo(w - MARGIN_X, h - MARGIN_Y);
  ctx.stroke();
  // y-axis (loss axis) on the left
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, MARGIN_Y);
  ctx.lineTo(MARGIN_X, h - MARGIN_Y);
  ctx.stroke();
  ctx.restore();

  // --- the parabola curve (blue) ---
  ctx.save();
  ctx.strokeStyle = CLASS_B;
  ctx.shadowBlur = 12;
  ctx.shadowColor = CLASS_B;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const x = -1 + (i / N) * 2;
    const px = mapX(x, w);
    const py = mapY(x, h, s);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // --- minimum marker (where x = 0) ---
  const mx = mapX(0, w);
  const my = mapY(0, h, s);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(mx, my, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText("min", mx, my + 18);
  ctx.restore();

  // --- ball position on the curve ---
  const bx = mapX(s.x, w);
  const by = mapY(s.x, h, s);

  // --- tangent line at the ball (red dashed) — slope = 2a·x ---
  // y = f(x) + slope·(x − x0); draw across ±0.35 in x using a custom y-map.
  const slope = grad(s, s.x); // dy/dx in math space
  {
    const tx0 = s.x - 0.35;
    const tx1 = s.x + 0.35;
    const ty0 = f(s, s.x) + slope * (tx0 - s.x);
    const ty1 = f(s, s.x) + slope * (tx1 - s.x);
    const ymax = s.a;
    const mapAnyY = (yv: number) =>
      h - MARGIN_Y - (yv / ymax) * (h - 2 * MARGIN_Y);
    const px0 = mapX(tx0, w);
    const py0 = mapAnyY(ty0);
    const px1 = mapX(tx1, w);
    const py1 = mapAnyY(ty1);
    ctx.save();
    ctx.strokeStyle = CLASS_A;
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = 8;
    ctx.shadowColor = CLASS_A;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -time * 20;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px1, py1);
    ctx.stroke();
    ctx.restore();
  }

  // --- gradient arrow: pointing downhill (toward x = 0) ---
  if (Math.abs(s.x) > 0.02) {
    const dir = -Math.sign(s.x); // downhill direction
    const ax = bx + dir * 26;
    const ay = by;
    ctx.save();
    ctx.strokeStyle = CLASS_A;
    ctx.shadowBlur = 8;
    ctx.shadowColor = CLASS_A;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    // arrowhead
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - dir * 6, ay - 4);
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - dir * 6, ay + 4);
    ctx.stroke();
    ctx.restore();
  }

  // --- the ball (red glowing) on the curve ---
  drawGlowPoint(ctx, bx, by, 7, CLASS_A, 22);

  // --- live loss sparkline (top-left, below the status chip) ---
  if (s.lossHist.length > 2) {
    const sw = 150;
    const shh = 44;
    const sx = 16;
    const sy = 52;
    ctx.save();
    ctx.fillStyle = "rgba(15,15,17,0.6)";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, sw, shh, 8);
    ctx.fill();
    ctx.stroke();
    const maxL = Math.max(...s.lossHist, 0.0001);
    const minL = Math.min(...s.lossHist, 0);
    const span = Math.max(maxL - minL, 0.0001);
    ctx.beginPath();
    s.lossHist.forEach((l, i) => {
      const px = sx + 8 + (i / (s.lossHist.length - 1)) * (sw - 16);
      const py = sy + shh - 6 - ((l - minL) / span) * (shh - 14);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = CLASS_A;
    ctx.shadowBlur = 6;
    ctx.shadowColor = CLASS_A;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "10px ui-monospace, monospace";
    const cur = s.lossHist[s.lossHist.length - 1];
    ctx.fillText(`loss ${cur.toFixed(3)}`, sx + 8, sy + 13);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`iter ${s.iter}`, sx + sw - 50, sy + 13);
    ctx.restore();
  }

  // --- axis labels ---
  ctx.save();
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText("x", w - MARGIN_X + 6, h - MARGIN_Y + 4);
  ctx.textAlign = "left";
  ctx.fillText("f(x)", MARGIN_X - 18, MARGIN_Y + 4);
  ctx.fillText(`x = ${s.x.toFixed(3)}`, 16, h - 14);
  ctx.restore();

  if (s.done) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("converged — press Reset to restart", w / 2, h - 14);
    ctx.restore();
  }
}

export function GradientDescentViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    mode: "continuous",
    isDone: (s) => s.done,
    getStatus: (s) =>
      s.done
        ? "converged"
        : `f(x) ${f(s, s.x).toFixed(3)} · lr ${LR} · β ${MOMENTUM}`,
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      hint="Press Run — the ball rolls down the parabola"
    />
  );
}
