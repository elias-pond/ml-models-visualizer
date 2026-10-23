"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B, withAlpha, hexToRgb } from "@/lib/viz/colors";
import { clamp, lerp, approach } from "@/lib/viz/math";

// ---------------------------------------------------------------------------
// Random Forest — ensemble of shallow randomized decision trees.
//
// Each step grows ONE new tree (3 random axis-aligned splits, bootstrapped
// sample). The per-cell majority vote is accumulated into two vote grids
// (votesA / votesB). A cached offscreen consensus heatmap is rebuilt every
// time a tree is added and blitted with imageSmoothingEnabled so the final
// ensemble boundary looks noticeably SMOOTHER than the single-tree visualizer.
// ---------------------------------------------------------------------------

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
}

interface Node extends Region {
  axis?: "x" | "y";
  val?: number;
  left?: Node;
  right?: Node;
  label?: number; // leaf majority class
  depth: number;
}

interface Tree {
  root: Node;
  appear: number; // 0..1 sweep-in animation
}

interface State {
  points: Pt[];
  trees: Tree[];
  votesA: Int8Array;
  votesB: Int8Array;
  treeCount: number;
  // cached offscreen consensus heatmap (rebuilt whenever a tree is added)
  heat: HTMLCanvasElement | null;
  heatDirty: boolean;
  pctA: number;
  pctB: number;
  targetPctA: number;
  targetPctB: number;
}

const GW = 72;
const GH = 44;
const MAX_TREES = 8;
const SPLITS_PER_TREE = 3;

function inRegion(p: Pt, r: Region) {
  return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
}

function giniOf(pts: Pt[]): number {
  if (pts.length === 0) return 0;
  const c0 = pts.filter((p) => p.cls === 0).length;
  const p0 = c0 / pts.length;
  return 1 - p0 * p0 - (1 - p0) * (1 - p0);
}

function classify(node: Node, x: number, y: number): number {
  if (node.label !== undefined) return node.label;
  if (node.axis === "x")
    return x <= (node.val as number)
      ? classify(node.left as Node, x, y)
      : classify(node.right as Node, x, y);
  return y <= (node.val as number)
    ? classify(node.left as Node, x, y)
    : classify(node.right as Node, x, y);
}

// Build a single shallow randomized tree: greedily split the leaf with the
// highest Gini impurity among its bootstrap points, choosing a random axis
// and a random split value inside the points' spread along that axis.
function buildTree(points: Pt[], root: Region): Node {
  const rootNode: Node = { ...root, depth: 0 };
  const leaves: Node[] = [rootNode];
  for (let i = 0; i < SPLITS_PER_TREE; i++) {
    let targetIdx = -1;
    let worst = -1;
    leaves.forEach((leaf, idx) => {
      const pts = points.filter((p) => inRegion(p, leaf));
      if (pts.length < 2) return;
      const g = giniOf(pts);
      if (g > worst) {
        worst = g;
        targetIdx = idx;
      }
    });
    if (targetIdx < 0) break;
    const target = leaves[targetIdx];
    const pts = points.filter((p) => inRegion(p, target));
    if (pts.length < 2) break;
    const axis: "x" | "y" = Math.random() < 0.5 ? "x" : "y";
    let vMin: number;
    let vMax: number;
    if (axis === "x") {
      const xs = pts.map((p) => p.x).sort((a, b) => a - b);
      vMin = xs[Math.max(0, Math.floor(xs.length * 0.2))];
      vMax = xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.8))];
      if (!(vMin < vMax)) {
        vMin = target.x0 + 4;
        vMax = target.x1 - 4;
      }
    } else {
      const ys = pts.map((p) => p.y).sort((a, b) => a - b);
      vMin = ys[Math.max(0, Math.floor(ys.length * 0.2))];
      vMax = ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.8))];
      if (!(vMin < vMax)) {
        vMin = target.y0 + 4;
        vMax = target.y1 - 4;
      }
    }
    const val = lerp(vMin, vMax, 0.25 + Math.random() * 0.5);
    target.axis = axis;
    target.val = val;
    if (axis === "x") {
      target.left = {
        x0: target.x0,
        y0: target.y0,
        x1: val,
        y1: target.y1,
        depth: target.depth + 1,
      };
      target.right = {
        x0: val,
        y0: target.y0,
        x1: target.x1,
        y1: target.y1,
        depth: target.depth + 1,
      };
    } else {
      target.left = {
        x0: target.x0,
        y0: target.y0,
        x1: target.x1,
        y1: val,
        depth: target.depth + 1,
      };
      target.right = {
        x0: target.x0,
        y0: val,
        x1: target.x1,
        y1: target.y1,
        depth: target.depth + 1,
      };
    }
    leaves.splice(targetIdx, 1, target.left, target.right);
  }
  for (const leaf of leaves) {
    const pts = points.filter((p) => inRegion(p, leaf));
    if (pts.length === 0) leaf.label = 0;
    else {
      const c0 = pts.filter((p) => p.cls === 0).length;
      leaf.label = c0 >= pts.length / 2 ? 0 : 1;
    }
  }
  return rootNode;
}

// Render the consensus vote grid into a small offscreen canvas. Each pixel
// = one grid cell. When blitted up to full canvas size with smoothing enabled
// the browser bilinearly interpolates RGBA → a smooth gradient boundary.
function buildHeat(s: State) {
  if (!s.heat) s.heat = document.createElement("canvas");
  if (s.heat.width !== GW || s.heat.height !== GH) {
    s.heat.width = GW;
    s.heat.height = GH;
  }
  const x = s.heat.getContext("2d");
  if (!x) return;
  const img = x.createImageData(GW, GH);
  const rgbA = hexToRgb(CLASS_A);
  const rgbB = hexToRgb(CLASS_B);
  for (let cy = 0; cy < GH; cy++) {
    for (let cx = 0; cx < GW; cx++) {
      const idx = cy * GW + cx;
      const a = s.votesA[idx];
      const b = s.votesB[idx];
      const px = idx * 4;
      if (a + b === 0) {
        img.data[px] = 0;
        img.data[px + 1] = 0;
        img.data[px + 2] = 0;
        img.data[px + 3] = 0;
        continue;
      }
      const c = a > b ? rgbA : rgbB;
      // alpha ~0.45 scaled by |votesA-votesB| / MAX_TREES — clear majority color
      const alpha = (0.45 * Math.abs(a - b)) / MAX_TREES;
      img.data[px] = c.r;
      img.data[px + 1] = c.g;
      img.data[px + 2] = c.b;
      img.data[px + 3] = Math.round(alpha * 255);
    }
  }
  x.putImageData(img, 0, 0);
  s.heatDirty = false;
}

function init(w: number, h: number): State {
  const points: Pt[] = [];
  // Class A blob (rose)
  for (let i = 0; i < 28; i++)
    points.push({
      x: w * 0.32 + (Math.random() + Math.random() + Math.random() - 1.5) * 30,
      y: h * 0.35 + (Math.random() + Math.random() + Math.random() - 1.5) * 30,
      cls: 0,
      r: 4,
      pulse: Math.random() * Math.PI * 2,
    });
  // Class B blob (emerald)
  for (let i = 0; i < 28; i++)
    points.push({
      x: w * 0.68 + (Math.random() + Math.random() + Math.random() - 1.5) * 32,
      y: h * 0.65 + (Math.random() + Math.random() + Math.random() - 1.5) * 32,
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
  return {
    points,
    trees: [],
    votesA: new Int8Array(GW * GH),
    votesB: new Int8Array(GW * GH),
    treeCount: 0,
    heat: null,
    heatDirty: false,
    pctA: 0.5,
    pctB: 0.5,
    targetPctA: 0.5,
    targetPctB: 0.5,
  };
}

function step(s: State, w: number, h: number) {
  if (s.treeCount >= MAX_TREES) return;
  // bootstrap: ~70% of points sampled with replacement
  const n = Math.floor(s.points.length * 0.7);
  const sample: Pt[] = [];
  for (let i = 0; i < n; i++)
    sample.push(s.points[Math.floor(Math.random() * s.points.length)]);
  const rootRegion: Region = { x0: 6, y0: 6, x1: w - 6, y1: h - 6 };
  const rootNode = buildTree(sample, rootRegion);
  s.trees.push({ root: rootNode, appear: 0 });
  // accumulate this tree's per-cell vote into the ensemble grids
  for (let cy = 0; cy < GH; cy++) {
    const py = ((cy + 0.5) / GH) * h;
    for (let cx = 0; cx < GW; cx++) {
      const px = ((cx + 0.5) / GW) * w;
      const label = classify(rootNode, px, py);
      const idx = cy * GW + cx;
      if (label === 0) s.votesA[idx] += 1;
      else s.votesB[idx] += 1;
    }
  }
  s.treeCount += 1;
  s.heatDirty = true;
  // recompute HUD vote-share targets
  let totalA = 0;
  let totalB = 0;
  for (let i = 0; i < s.votesA.length; i++) {
    totalA += s.votesA[i];
    totalB += s.votesB[i];
  }
  const tot = totalA + totalB;
  if (tot > 0) {
    s.targetPctA = totalA / tot;
    s.targetPctB = totalB / tot;
  }
}

function drawSplitsForTree(
  ctx: CanvasRenderingContext2D,
  node: Node,
  appear: number,
  time: number
) {
  if (node.axis && node.val !== undefined) {
    // stagger each split's sweep by depth for a cascade feel
    const start = node.depth * 0.22;
    const span = 0.5;
    const t = clamp((appear - start) / span, 0, 1);
    if (t > 0.01) {
      ctx.save();
      const alpha = 0.12 + 0.1 * (1 - t); // a touch brighter while sweeping
      ctx.strokeStyle = withAlpha("#d97757", alpha);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 12;
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#d97757";
      ctx.beginPath();
      if (node.axis === "x") {
        const yEnd = node.y0 + (node.y1 - node.y0) * t;
        ctx.moveTo(node.val, node.y0);
        ctx.lineTo(node.val, yEnd);
      } else {
        const xEnd = node.x0 + (node.x1 - node.x0) * t;
        ctx.moveTo(node.x0, node.val);
        ctx.lineTo(xEnd, node.val);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  if (node.left) drawSplitsForTree(ctx, node.left, appear, time);
  if (node.right) drawSplitsForTree(ctx, node.right, appear, time);
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

  // animate HUD vote-share toward target
  s.pctA = approach(s.pctA, s.targetPctA, dt, 4);
  s.pctB = approach(s.pctB, s.targetPctB, dt, 4);

  // rebuild consensus heatmap only when votes change
  if (s.heatDirty || !s.heat) buildHeat(s);

  // blit consensus heatmap (smooth interpolation up to full canvas size)
  if (s.heat && s.treeCount > 0) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(s.heat, 0, 0, w, h);
  }

  // soft overlay so the backdrop grid peeks through subtly
  ctx.fillStyle = "rgba(20,18,15,0.20)";
  ctx.fillRect(0, 0, w, h);

  // draw every tree's split lines faintly, with sweep-in animation
  for (const t of s.trees) {
    t.appear = approach(t.appear, 1, dt, 2.5);
    drawSplitsForTree(ctx, t.root, t.appear, time);
  }

  // class points
  for (const p of s.points) {
    p.pulse += dt * 2;
    const glow = 10 + 2 * Math.sin(p.pulse);
    drawGlowPoint(ctx, p.x, p.y, p.r, p.cls === 0 ? CLASS_A : CLASS_B, glow);
  }

  // legend (top-left, below the VizStage badge)
  ctx.save();
  ctx.font = "11px ui-monospace, monospace";
  for (let i = 0; i < 2; i++) {
    const col = i === 0 ? CLASS_A : CLASS_B;
    const label = i === 0 ? "Class A" : "Class B";
    const ly = 52 + i * 16;
    ctx.fillStyle = col;
    ctx.shadowBlur = 8;
    ctx.shadowColor = col;
    ctx.beginPath();
    ctx.arc(20, ly - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(label, 32, ly);
  }
  ctx.restore();

  // HUD bottom-left: tree count + ensemble vote tally
  const k = s.treeCount;
  const pa = Math.round(s.pctA * 100);
  const pb = Math.round(s.pctB * 100);
  ctx.save();
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(`tree ${k} / ${MAX_TREES}`, 16, h - 32);
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("ENSEMBLE VOTE", 16, h - 14);
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = CLASS_A;
  ctx.fillText(`A ${pa}%`, 110, h - 14);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(":", 150, h - 14);
  ctx.fillStyle = CLASS_B;
  ctx.fillText(`${pb}% B`, 156, h - 14);
  ctx.restore();
}

export function RandomForestViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    maxSteps: MAX_TREES,
    stepInterval: 650,
    getStatus: (_s, i) =>
      i >= MAX_TREES
        ? "ensemble ready"
        : `tree ${Math.min(i, MAX_TREES)} / ${MAX_TREES}`,
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      maxSteps={MAX_TREES}
      hint="Press Run to grow the forest"
    />
  );
}
