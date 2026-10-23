"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint, drawGlowRing } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B } from "@/lib/viz/colors";
import { approachColor, dist, rand, randn } from "@/lib/viz/math";

interface Pt {
  x: number;
  y: number;
  curColor: string;
  targetColor: string;
  cluster: number; // -1 unvisited, -2 noise, >=0 cluster id
  noise: boolean;
  visited: boolean;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  a: number;
}

interface State {
  points: Pt[];
  cursor: number;
  ripples: Ripple[];
  clusterCount: number;
}

const EPS = 26;
const MIN_PTS = 4;
const N_BLOB = 22;
const N_TAIL = 30;
const N_NOISE = 18;
const MAX_STEPS = N_BLOB + N_TAIL + N_NOISE; // 70 → ~15.4s at 220ms
const BASE_COLOR = "#6b7280"; // neutral grey — unvisited
const NOISE_COLOR = CLASS_B; // blue — outliers (red/blue theme)
const RIPPLE_SPEED = 110; // px / second

// Single cluster color (red) — the dense blob is ONE cluster; noise is
// blue. Keeps the red/blue binary theme consistent across the site.
function clusterColor(_k: number): string {
  return CLASS_A;
}

function makePt(x: number, y: number): Pt {
  return {
    x,
    y,
    curColor: BASE_COLOR,
    targetColor: BASE_COLOR,
    cluster: -1,
    noise: false,
    visited: false,
  };
}

function init(w: number, h: number): State {
  const points: Pt[] = [];
  const cx = w * 0.5;
  const cy = h * 0.5;

  // Dense gaussian blob — cluster core (every point is a core point)
  for (let i = 0; i < N_BLOB; i++) {
    points.push(makePt(cx + randn() * 28, cy + randn() * 28));
  }

  // Curved tail (quadratic Bezier) extending up-right — makes the cluster
  // visibly non-spherical, unlike K-Means' spherical centroids.
  const p0x = cx + 15;
  const p0y = cy;
  const p1x = cx + 50;
  const p1y = cy - 80;
  const p2x = cx + 100;
  const p2y = cy - 50;
  for (let i = 0; i < N_TAIL; i++) {
    const t = i / (N_TAIL - 1);
    const u = 1 - t;
    const x = u * u * p0x + 2 * u * t * p1x + t * t * p2x + rand(-2, 2);
    const y = u * u * p0y + 2 * u * t * p1y + t * t * p2y + rand(-2, 2);
    points.push(makePt(x, y));
  }

  // Scattered noise points — kept at least 55px (> 2·eps) from any other
  // point so no accidental mini-cluster can form.
  for (let i = 0; i < N_NOISE; i++) {
    let x = 0;
    let y = 0;
    let ok = false;
    let tries = 0;
    while (!ok && tries < 80) {
      x = rand(20, w - 20);
      y = rand(20, h - 20);
      ok = true;
      for (const p of points) {
        if (dist(x, y, p.x, p.y) < 55) {
          ok = false;
          break;
        }
      }
      tries++;
    }
    points.push(makePt(x, y));
  }

  return { points, cursor: 0, ripples: [], clusterCount: 0 };
}

function step(s: State) {
  // Advance cursor past any points already visited (defensive — under
  // single-hop expansion each step still processes exactly one new point).
  while (s.cursor < s.points.length && s.points[s.cursor].visited) {
    s.cursor++;
  }
  if (s.cursor >= s.points.length) return;

  const p = s.points[s.cursor];
  p.visited = true;

  const neighbors = s.points.filter(
    (q) => q !== p && dist(p.x, p.y, q.x, q.y) <= EPS
  );

  if (neighbors.length >= MIN_PTS) {
    // CORE point — adopt an existing neighbor cluster, else spin up a new one
    let clusterId = -1;
    for (const n of neighbors) {
      if (n.cluster >= 0) {
        clusterId = n.cluster;
        break;
      }
    }
    if (clusterId < 0 && p.cluster >= 0) clusterId = p.cluster;
    if (clusterId < 0) {
      s.clusterCount++;
      clusterId = s.clusterCount;
    }
    const color = clusterColor(clusterId);
    p.cluster = clusterId;
    p.targetColor = color;
    p.noise = false;

    // Single-hop expansion: paint unvisited neighbors so the cluster visibly
    // grows. (Full recursive expansion would finish too fast.)
    for (const n of neighbors) {
      if (!n.visited && n.cluster < 0) {
        n.cluster = clusterId;
        n.targetColor = color;
      }
    }

    s.ripples.push({ x: p.x, y: p.y, r: 0, maxR: EPS * 2.2, color, a: 1 });
  } else if (p.cluster < 0) {
    // NOISE — border points (cluster already assigned via neighbor expansion)
    // keep their cluster; truly unvisited isolated points become noise.
    p.noise = true;
    p.targetColor = NOISE_COLOR;
    p.cluster = -2;
  }

  s.cursor++;
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

  // Animate ripples — expand outward and fade as they reach maxR
  for (const r of s.ripples) {
    r.r += RIPPLE_SPEED * dt;
    r.a = Math.max(0, 1 - r.r / r.maxR);
  }
  s.ripples = s.ripples.filter((r) => r.a > 0.02 && r.r < r.maxR);
  for (const r of s.ripples) {
    drawGlowRing(ctx, r.x, r.y, r.r, r.color, r.a * 0.55, 2);
  }

  // Faint pulsing eps ring around the next point to be visited — shows
  // the "density" being measured.
  if (s.cursor < s.points.length) {
    const p = s.points[s.cursor];
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    drawGlowRing(
      ctx,
      p.x,
      p.y,
      EPS,
      "rgba(255,255,255,0.9)",
      0.22 + pulse * 0.18,
      1.2,
      [4, 4]
    );
  }

  // Points — colors smoothly fade toward their target
  for (const p of s.points) {
    p.curColor = approachColor(p.curColor, p.targetColor, dt);
    if (p.noise) {
      // Dark dot with dim glow
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = p.curColor;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.curColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Small white X overlay — the noise marker
      ctx.save();
      ctx.strokeStyle = "rgba(255,250,242,0.85)";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      const sz = 4;
      ctx.beginPath();
      ctx.moveTo(p.x - sz, p.y - sz);
      ctx.lineTo(p.x + sz, p.y + sz);
      ctx.moveTo(p.x + sz, p.y - sz);
      ctx.lineTo(p.x - sz, p.y + sz);
      ctx.stroke();
      ctx.restore();
    } else {
      drawGlowPoint(ctx, p.x, p.y, 4, p.curColor, 12);
    }
  }

  // HUD bottom-left
  const visitedCount = s.points.filter((p) => p.visited).length;
  const noiseCount = s.points.filter((p) => p.noise).length;
  ctx.save();
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`visited ${visitedCount} / ${s.points.length}`, 16, h - 42);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`clusters: ${s.clusterCount}`, 16, h - 26);
  ctx.fillStyle = CLASS_B;
  ctx.fillText(`noise: ${noiseCount}`, 16, h - 10);
  // HUD bottom-right
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(`eps=${EPS} · minPts=${MIN_PTS}`, w - 16, h - 10);
  ctx.restore();
}

function getStatus(s: State, stepCount: number): string {
  if (stepCount >= s.points.length) {
    return `done · ${s.clusterCount} cluster${s.clusterCount !== 1 ? "s" : ""}`;
  }
  const noiseCount = s.points.filter((p) => p.noise).length;
  return `scanning… clusters ${s.clusterCount} · noise ${noiseCount}`;
}

export function DbscanViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    maxSteps: MAX_STEPS,
    stepInterval: 220,
    getStatus,
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      maxSteps={MAX_STEPS}
      hint="Press Run to discover clusters by density"
    />
  );
}
