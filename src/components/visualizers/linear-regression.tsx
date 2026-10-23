"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint, drawGlowLine } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B } from "@/lib/viz/colors";
import { randn } from "@/lib/viz/math";

interface Pt {
  x: number; // normalized in [0,1]
  y: number; // normalized in [0,1]
}

interface State {
  pts: Pt[];
  m: number; // fitted slope (normalized space)
  b: number; // fitted intercept (normalized space)
  tm: number; // true slope (for label "truth")
  tb: number; // true intercept
  lossHist: number[];
  epoch: number;
  settleT: number;
  done: boolean;
}

const N = 24;

function init(_w: number, _h: number): State {
  const tm = 0.7;
  const tb = 0.15;
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    const y = tm * x + tb + randn() * 0.04;
    pts.push({ x, y });
  }
  return {
    pts,
    m: 0,
    b: 0.5,
    tm,
    tb,
    lossHist: [],
    epoch: 0,
    settleT: 0,
    done: false,
  };
}

function mse(s: State): number {
  let sum = 0;
  for (const p of s.pts) {
    const d = s.m * p.x + s.b - p.y;
    sum += d * d;
  }
  return sum / s.pts.length;
}

// Per-frame gradient descent on m, b. dt-scaled for framerate independence
// and tuned so the line visibly swings from horizontal to the best fit in
// roughly 3-5 seconds (lr ≈ 1.5 with 3 sub-steps gives τ ≈ 1s).
function step(s: State, _w: number, _h: number, dt: number) {
  if (s.done || dt <= 0) return;
  const lr = 1.5;
  const sub = 3;
  const hdt = dt / sub;
  let dmLast = 0;
  let dbLast = 0;
  for (let i = 0; i < sub; i++) {
    let dm = 0;
    let db = 0;
    for (const p of s.pts) {
      const err = s.m * p.x + s.b - p.y;
      dm += err * p.x;
      db += err;
    }
    dm = (2 * dm) / s.pts.length;
    db = (2 * db) / s.pts.length;
    s.m -= lr * dm * hdt;
    s.b -= lr * db * hdt;
    dmLast = dm;
    dbLast = db;
  }
  // NaN guard — re-init params if anything diverged.
  if (!Number.isFinite(s.m) || !Number.isFinite(s.b)) {
    s.m = 0;
    s.b = 0.5;
    s.settleT = 0;
    return;
  }
  s.epoch += 1;
  s.lossHist.push(mse(s));
  if (s.lossHist.length > 90) s.lossHist.shift();

  // convergence: tiny gradient OR negligible MSE change for a while.
  const gradMag = Math.abs(dmLast) + Math.abs(dbLast);
  const last = s.lossHist[s.lossHist.length - 1];
  const prev = s.lossHist[s.lossHist.length - 2] ?? last;
  const delta = Math.abs(last - prev);
  if (gradMag < 1e-4 || delta < 1e-5) s.settleT += dt;
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
  _dt: number
) {
  drawBackdrop(ctx, w, h, time);

  // Faint axes: a subtle mid line at y=0.5*h and the x-axis at the bottom.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.moveTo(0, h - 1);
  ctx.lineTo(w, h - 1);
  ctx.stroke();
  ctx.restore();

  // Residual dashed lines (rose, thin, animated dashes) from each point
  // straight up/down to the current fitted line.
  for (const p of s.pts) {
    const px = p.x * w;
    const py = (1 - p.y) * h;
    const ly = (1 - (s.m * p.x + s.b)) * h;
    drawGlowLine(ctx, px, py, px, ly, "rgba(255,255,255,0.45)", 1, 0.4, time * 18);
  }

  // Fitted line: emerald body with teal glow, from (0, b) to (1, m+b).
  const y0 = (1 - s.b) * h;
  const y1 = (1 - (s.m + s.b)) * h;
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = CLASS_A;
  ctx.strokeStyle = CLASS_A;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(w, y1);
  ctx.stroke();
  ctx.restore();

  // Data points (cyan, gentle per-point pulse via time).
  for (const p of s.pts) {
    const px = p.x * w;
    const py = (1 - p.y) * h;
    const pulse = 10 + 2 * Math.sin(time * 2 + p.x * 6);
    drawGlowPoint(ctx, px, py, 4, CLASS_B, pulse);
  }

  // Live MSE sparkline (top-left), styled like gradient-descent.tsx.
  if (s.lossHist.length > 2) {
    const sw = 158;
    const shh = 46;
    const sx = 16;
    const sy = 52;
    ctx.save();
    ctx.fillStyle = "rgba(15,15,17,0.6)";
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
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
      const py = sy + shh - 8 - ((l - minL) / span) * (shh - 16);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = CLASS_A;
    ctx.shadowBlur = 6;
    ctx.shadowColor = CLASS_A;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const cur = s.lossHist[s.lossHist.length - 1];
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(`loss ${cur.toFixed(3)}`, sx + 8, sy + 13);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`epoch ${s.epoch}`, sx + sw - 64, sy + 13);
    ctx.restore();
  }

  // Bottom-left labels: fitted coefficients (primary) + true target (faint).
  ctx.save();
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(
    `y = m·x + b   m=${s.m.toFixed(2)}   b=${s.b.toFixed(2)}`,
    16,
    h - 16
  );
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(
    `target  m=${s.tm.toFixed(2)}   b=${s.tb.toFixed(2)}`,
    16,
    h - 32
  );
  ctx.restore();

  // Converged hint centered, stacked just above the bottom-left labels.
  if (s.done) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("converged — press Reset to restart", w / 2, h - 50);
    ctx.restore();
  }
}

export function LinearRegressionViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    mode: "continuous",
    isDone: (s) => s.done,
    getStatus: (s) =>
      s.done ? "converged" : `epoch ${s.epoch} · MSE ${mse(s).toFixed(3)}`,
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      hint="Press Run to fit the line"
    />
  );
}
