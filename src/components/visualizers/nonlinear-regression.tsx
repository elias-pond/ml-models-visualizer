"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint, drawGlowRing } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B } from "@/lib/viz/colors";
import { clamp, randn } from "@/lib/viz/math";

interface Pt {
  x: number; // normalized [0,1]
  y: number; // normalized [0,1]
  pulse: number;
}

interface State {
  points: Pt[];
  // polynomial coefficients c0 + c1*x + c2*x^2 + c3*x^3
  c: [number, number, number, number];
  // momentum velocities for gradient descent
  v: [number, number, number, number];
  lossHist: number[];
  epoch: number;
  settleT: number;
  done: boolean;
}

// True curve: a cubic with a clear "rise → dip → rise" shape that spans most
// of the [0,1] vertical range so the fit is visually obvious. Starts low,
// peaks at x≈0.27, dips at x≈0.57, then climbs sharply to the right edge —
// clearly NOT something a straight line can capture.
function trueCurve(x: number): number {
  return 0.05 + 1.8 * x - 5.0 * x * x + 4.0 * x * x * x;
}

function predict(c: State["c"], x: number): number {
  return c[0] + c[1] * x + c[2] * x * x + c[3] * x * x * x;
}

const KNOTS = [0.15, 0.4, 0.6, 0.85];

// Plot margins in CSS pixels.
const ML = 36;
const MR = 24;
const MT = 60;
const MB = 40;

function mapX(x: number, w: number): number {
  return ML + x * (w - ML - MR);
}
function mapY(y: number, h: number): number {
  return h - MB - y * (h - MT - MB);
}

function init(w: number, h: number): State {
  const n = 28;
  const points: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const y = trueCurve(x) + randn() * 0.035;
    points.push({ x, y, pulse: Math.random() * Math.PI * 2 });
  }
  return {
    points,
    c: [0.5, 0, 0, 0], // start as a flat line at y = 0.5
    v: [0, 0, 0, 0],
    lossHist: [],
    epoch: 0,
    settleT: 0,
    done: false,
  };
}

function mse(s: State): number {
  let sum = 0;
  for (const p of s.points) {
    const e = predict(s.c, p.x) - p.y;
    sum += e * e;
  }
  return sum / s.points.length;
}

// Per-frame gradient descent on the 4 polynomial coefficients with momentum.
// 3 sub-steps per frame for stability; momentum flattens the conditioning of
// the Vandermonde-like Hessian so all four coefficients converge at a visible
// pace (~3–5 s) and the curve visibly WARPS rather than snapping.
function step(s: State, w: number, h: number, dt: number) {
  if (s.done) return;
  const lr = 0.3;
  const momentum = 0.85;
  const sub = 3;
  const n = s.points.length;
  let gn = 0;
  for (let k = 0; k < sub; k++) {
    let g0 = 0,
      g1 = 0,
      g2 = 0,
      g3 = 0;
    for (const p of s.points) {
      const e = predict(s.c, p.x) - p.y;
      g0 += e;
      g1 += e * p.x;
      g2 += e * p.x * p.x;
      g3 += e * p.x * p.x * p.x;
    }
    g0 = (2 * g0) / n;
    g1 = (2 * g1) / n;
    g2 = (2 * g2) / n;
    g3 = (2 * g3) / n;
    s.v[0] = momentum * s.v[0] - lr * g0;
    s.v[1] = momentum * s.v[1] - lr * g1;
    s.v[2] = momentum * s.v[2] - lr * g2;
    s.v[3] = momentum * s.v[3] - lr * g3;
    s.c[0] += s.v[0];
    s.c[1] += s.v[1];
    s.c[2] += s.v[2];
    s.c[3] += s.v[3];
    gn = Math.hypot(g0, g1, g2, g3);
    // guard: if anything goes non-finite, restart from the flat line
    if (
      !isFinite(s.c[0]) ||
      !isFinite(s.c[1]) ||
      !isFinite(s.c[2]) ||
      !isFinite(s.c[3])
    ) {
      s.c = [0.5, 0, 0, 0];
      s.v = [0, 0, 0, 0];
      s.lossHist = [];
      s.epoch = 0;
      s.settleT = 0;
      return;
    }
  }
  s.epoch += 1;
  s.lossHist.push(mse(s));
  if (s.lossHist.length > 90) s.lossHist.shift();

  // convergence: gradient norm small for a sustained window
  if (gn < 0.01) s.settleT += dt;
  else s.settleT = 0;
  if (s.settleT > 1.0) s.done = true;
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

  // --- faint axes: dim mid line + x-axis + y-axis ---
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(120,160,170,0.13)";
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(ML, mapY(0.5, h));
  ctx.lineTo(w - MR, mapY(0.5, h));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(120,160,170,0.18)";
  ctx.beginPath();
  ctx.moveTo(ML, MT);
  ctx.lineTo(ML, h - MB);
  ctx.moveTo(ML, h - MB);
  ctx.lineTo(w - MR, h - MB);
  ctx.stroke();
  ctx.restore();

  // --- residual dashed lines (neutral, vertical from point to current curve) ---
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  for (const p of s.points) {
    const cy = predict(s.c, p.x);
    const x = mapX(p.x, w);
    const y1 = mapY(p.y, h);
    const y2 = mapY(clamp(cy, -0.1, 1.1), h);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
  }
  ctx.restore();

  // --- fitted curve: emerald → teal → cyan glowing path, 90 samples ---
  const SAMPLES = 90;
  ctx.save();
  const grad = ctx.createLinearGradient(ML, 0, w - MR, 0);
  grad.addColorStop(0, CLASS_A);
  grad.addColorStop(0.5, CLASS_A);
  grad.addColorStop(1, CLASS_A);
  ctx.strokeStyle = grad;
  ctx.shadowBlur = 14;
  ctx.shadowColor = CLASS_A;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES;
    const y = clamp(predict(s.c, x), -0.1, 1.1);
    const px = mapX(x, w);
    const py = mapY(y, h);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // --- control knot rings on the curve at 4 fixed x positions ---
  const knotPulse = 0.5 + 0.5 * Math.sin(time * 2.2);
  for (const kx of KNOTS) {
    const y = clamp(predict(s.c, kx), -0.1, 1.1);
    const px = mapX(kx, w);
    const py = mapY(y, h);
    drawGlowRing(ctx, px, py, 5 + knotPulse * 1.2, "rgba(255,255,255,0.7)", 0.85, 2);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- data points (cyan, gentle pulse) ---
  for (const p of s.points) {
    p.pulse += dt * 1.8;
    const px = mapX(p.x, w);
    const py = mapY(clamp(p.y, -0.1, 1.1), h);
    const glow = 12 + 2 * Math.sin(p.pulse);
    drawGlowPoint(ctx, px, py, 4, CLASS_B, glow);
  }

  // --- live MSE sparkline (top-left), styled like gradient-descent.tsx ---
  if (s.lossHist.length > 2) {
    const sw = 160;
    const shh = 46;
    const sx = 16;
    const sy = 52;
    ctx.save();
    ctx.fillStyle = "rgba(6,10,12,0.6)";
    ctx.strokeStyle = "rgba(45,212,191,0.25)";
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
    ctx.fillText(`epoch ${s.epoch}`, sx + sw - 60, sy + 13);
    ctx.restore();
  }

  // --- bottom-left label: "degree 3 polynomial · MSE X" ---
  ctx.save();
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const mseNow = s.lossHist.length > 0 ? s.lossHist[s.lossHist.length - 1] : mse(s);
  ctx.fillText(`degree 3 polynomial  ·  MSE ${mseNow.toFixed(3)}`, 16, h - 14);
  ctx.restore();

  // --- converged banner (centered bottom) ---
  if (s.done) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("converged — press Reset to restart", w / 2, h - 14);
    ctx.restore();
  }
}

export function NonlinearRegressionViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    mode: "continuous",
    isDone: (s) => s.done,
    getStatus: (s) => {
      if (s.done) return "converged";
      const m = s.lossHist.length > 0 ? s.lossHist[s.lossHist.length - 1] : 0;
      return `epoch ${s.epoch} · MSE ${m.toFixed(3)}`;
    },
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      hint="Press Run to fit the cubic"
    />
  );
}
