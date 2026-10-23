"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B, withAlpha } from "@/lib/viz/colors";
import { clamp } from "@/lib/viz/math";

interface Pt {
  x: number;
  y: number;
  cls: number; // 0 rose, 1 emerald
  r: number;
  pulse: number;
}

interface Region {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  depth: number;
  splitAxis?: "x" | "y";
  splitVal?: number;
  left?: Region;
  right?: Region;
  appear: number; // 0..1 split-line sweep
  shade: number; // 0..1 fill fade
}

interface State {
  points: Pt[];
  root: Region;
  lastSplitLabel: string;
}

function gini(points: Pt[]): number {
  if (points.length === 0) return 0;
  const c0 = points.filter((p) => p.cls === 0).length;
  const p0 = c0 / points.length;
  const p1 = 1 - p0;
  return 1 - p0 * p0 - p1 * p1;
}

function inRegion(p: Pt, r: Region) {
  return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
}

function leaves(r: Region): Region[] {
  if (!r.left && !r.right) return [r];
  return [...leaves(r.left!), ...leaves(r.right!)];
}

function bestSplit(pts: Pt[], r: Region) {
  let best = { axis: "x" as "x" | "y", val: 0, gini: Infinity };
  for (const axis of ["x", "y"] as const) {
    for (let f = 0.18; f <= 0.82; f += 0.08) {
      const val = axis === "x" ? r.x0 + (r.x1 - r.x0) * f : r.y0 + (r.y1 - r.y0) * f;
      const left = pts.filter((p) => (axis === "x" ? p.x : p.y) <= val);
      const right = pts.filter((p) => (axis === "x" ? p.x : p.y) > val);
      if (left.length < 3 || right.length < 3) continue;
      const wg = (left.length * gini(left) + right.length * gini(right)) / pts.length;
      if (wg < best.gini) best = { axis, val, gini: wg };
    }
  }
  return best;
}

function init(w: number, h: number): State {
  const points: Pt[] = [];
  // two gaussian-ish blobs
  for (let i = 0; i < 26; i++)
    points.push({
      x: w * 0.32 + (Math.random() + Math.random() + Math.random() - 1.5) * 28,
      y: h * 0.34 + (Math.random() + Math.random() + Math.random() - 1.5) * 28,
      cls: 0,
      r: 4,
      pulse: Math.random() * Math.PI * 2,
    });
  for (let i = 0; i < 26; i++)
    points.push({
      x: w * 0.68 + (Math.random() + Math.random() + Math.random() - 1.5) * 32,
      y: h * 0.66 + (Math.random() + Math.random() + Math.random() - 1.5) * 32,
      cls: 1,
      r: 4,
      pulse: Math.random() * Math.PI * 2,
    });
  // a few noisy points to make splits interesting
  for (let i = 0; i < 6; i++)
    points.push({
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.7,
      y: h * 0.5 + (Math.random() - 0.5) * h * 0.7,
      cls: Math.random() > 0.5 ? 1 : 0,
      r: 4,
      pulse: Math.random() * Math.PI * 2,
    });

  const root: Region = {
    x0: 8,
    y0: 8,
    x1: w - 8,
    y1: h - 8,
    depth: 0,
    appear: 1,
    shade: 1,
  };
  return { points, root, lastSplitLabel: "Root region" };
}

function step(s: State) {
  const all = leaves(s.root);
  let target: Region | null = null;
  let worst = -1;
  for (const l of all) {
    const pts = s.points.filter((p) => inRegion(p, l));
    if (pts.length < 6) continue;
    const g = gini(pts);
    if (g > worst) {
      worst = g;
      target = l;
    }
  }
  if (!target) return;
  const pts = s.points.filter((p) => inRegion(p, target));
  const bs = bestSplit(pts, target);
  if (bs.gini === Infinity) return;
  target.splitAxis = bs.axis;
  target.splitVal = bs.val;
  target.appear = 0; // animate the new sweep
  if (bs.axis === "x") {
    target.left = {
      x0: target.x0,
      y0: target.y0,
      x1: bs.val,
      y1: target.y1,
      depth: target.depth + 1,
      appear: 1,
      shade: 0,
    };
    target.right = {
      x0: bs.val,
      y0: target.y0,
      x1: target.x1,
      y1: target.y1,
      depth: target.depth + 1,
      appear: 1,
      shade: 0,
    };
  } else {
    target.left = {
      x0: target.x0,
      y0: target.y0,
      x1: target.x1,
      y1: bs.val,
      depth: target.depth + 1,
      appear: 1,
      shade: 0,
    };
    target.right = {
      x0: target.x0,
      y0: bs.val,
      x1: target.x1,
      y1: target.y1,
      depth: target.depth + 1,
      appear: 1,
      shade: 0,
    };
  }
  const axisName = bs.axis === "x" ? "x₁" : "x₂";
  s.lastSplitLabel = `${axisName} ≤ ${(bs.val / (bs.axis === "x" ? (target.x1 - target.x0) : (target.y1 - target.y0))).toFixed(2)}  ·  Gini ${bs.gini.toFixed(2)}`;
}

function walkAnimate(r: Region, dt: number) {
  if (r.splitAxis) r.appear = clamp(r.appear + dt * 2.2, 0, 1);
  const isLeaf = !r.left && !r.right;
  r.shade += ((isLeaf ? 1 : 0) - r.shade) * (1 - Math.exp(-dt * 3));
  if (r.left) walkAnimate(r.left, dt);
  if (r.right) walkAnimate(r.right, dt);
}

function drawSplitLine(ctx: CanvasRenderingContext2D, r: Region) {
  if (!r.splitAxis || !r.splitVal) return;
  const t = r.appear;
  const color = "#d97757";
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (r.splitAxis === "x") {
    const yEnd = r.y0 + (r.y1 - r.y0) * t;
    ctx.beginPath();
    ctx.moveTo(r.splitVal, r.y0);
    ctx.lineTo(r.splitVal, yEnd);
    ctx.stroke();
    // head dot
    if (t < 1) {
      ctx.fillStyle = "#f0c9a8";
      ctx.beginPath();
      ctx.arc(r.splitVal, yEnd, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const xEnd = r.x0 + (r.x1 - r.x0) * t;
    ctx.beginPath();
    ctx.moveTo(r.x0, r.splitVal);
    ctx.lineTo(xEnd, r.splitVal);
    ctx.stroke();
    if (t < 1) {
      ctx.fillStyle = "#f0c9a8";
      ctx.beginPath();
      ctx.arc(xEnd, r.splitVal, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function shadeLeaf(ctx: CanvasRenderingContext2D, r: Region, pts: Pt[]) {
  if (pts.length === 0) return;
  const c0 = pts.filter((p) => p.cls === 0).length;
  const color = c0 >= pts.length / 2 ? CLASS_A : CLASS_B;
  // Strong fill so the decision region reads clearly as one class.
  const a = 0.42 * r.shade;
  const g = ctx.createLinearGradient(r.x0, r.y0, r.x1, r.y1);
  g.addColorStop(0, withAlpha(color, a * 0.6));
  g.addColorStop(1, withAlpha(color, a));
  ctx.fillStyle = g;
  ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  // region border — brighter so boundaries are obvious
  ctx.strokeStyle = withAlpha(color, 0.55 * r.shade);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x0 + 0.5, r.y0 + 0.5, r.x1 - r.x0 - 1, r.y1 - r.y0 - 1);
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
  walkAnimate(s.root, dt);

  // shade leaves
  for (const l of leaves(s.root)) {
    const pts = s.points.filter((p) => inRegion(p, l));
    shadeLeaf(ctx, l, pts);
  }

  // split lines
  function drawLines(r: Region) {
    drawSplitLine(ctx, r);
    if (r.left) drawLines(r.left);
    if (r.right) drawLines(r.right);
  }
  drawLines(s.root);

  // points
  for (const p of s.points) {
    p.pulse += dt * 2;
    const glow = 10 + 2 * Math.sin(p.pulse);
    drawGlowPoint(ctx, p.x, p.y, p.r, p.cls === 0 ? CLASS_A : CLASS_B, glow);
  }

  // legend (bottom-right, clear of the VizStage overlays) — clear red/blue
  ctx.save();
  ctx.font = "11px ui-monospace, monospace";
  const lx = w - 116;
  for (let i = 0; i < 2; i++) {
    const col = i === 0 ? CLASS_A : CLASS_B;
    const label = i === 0 ? "Class A" : "Class B";
    const ly = h - 42 + i * 16;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(lx, ly - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(label, lx + 10, ly);
  }
  ctx.restore();

  // current decision label (bottom-left)
  ctx.save();
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(s.lastSplitLabel, 16, h - 16);
  ctx.restore();
}

export function DecisionTreesViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    maxSteps: 6,
    stepInterval: 850,
    getStatus: (s, i) => (i === 0 ? "root" : `split ${i} · Gini↓`),
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      maxSteps={6}
      hint="Press Run to grow the tree"
    />
  );
}
