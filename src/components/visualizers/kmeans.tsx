"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint, drawGlowRing } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B, withAlpha } from "@/lib/viz/colors";
import { approach, approachColor, clamp, dist, rand, randn } from "@/lib/viz/math";

// Points start as neutral slate; their `curColor` smoothly lerps toward the
// `targetColor` of whichever centroid they were just assigned to.
const GRAY = "#6b7280";

interface Pt {
  x: number;
  y: number;
  curColor: string; // smoothly lerped (rgb(...) once animating)
  targetColor: string; // hex color of the assigned centroid
  pulse: number;
}

interface Centroid {
  x: number; // current (animated)
  y: number;
  tx: number; // target mean
  ty: number;
  color: string;
  pulse: number;
}

interface State {
  points: Pt[];
  centroids: Centroid[];
  phase: "assign" | "update";
  iter: number;
}

// 2 well-separated gaussian blobs of ~26 points each — k=2 keeps the
// red/blue binary theme consistent with the classification visualizers.
const BLOBS: ReadonlyArray<readonly [number, number]> = [
  [0.3, 0.36],
  [0.7, 0.64],
];

// Red + blue centroids — same two class colors used across the site.
const CENTROID_COLORS = [CLASS_A, CLASS_B];

function init(w: number, h: number): State {
  const points: Pt[] = [];
  for (const [fx, fy] of BLOBS) {
    const cx = fx * w;
    const cy = fy * h;
    for (let i = 0; i < 26; i++) {
      points.push({
        x: clamp(cx + randn() * 30, 10, w - 10),
        y: clamp(cy + randn() * 30, 10, h - 10),
        curColor: GRAY,
        targetColor: GRAY,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  // Centroids start at RANDOM positions (NOT at the true blob centers, so they
  // have to visibly glide to their cluster means over the first iterations).
  const centroids: Centroid[] = [];
  for (let i = 0; i < 2; i++) {
    const x = rand(0.18 * w, 0.82 * w);
    const y = rand(0.18 * h, 0.82 * h);
    centroids.push({
      x,
      y,
      tx: x,
      ty: y,
      color: CENTROID_COLORS[i],
      pulse: Math.random() * Math.PI * 2,
    });
  }

  return { points, centroids, phase: "assign", iter: 1 };
}

function step(s: State) {
  if (s.phase === "assign") {
    // ASSIGN — recolor every point to its nearest centroid (by current x,y).
    for (const p of s.points) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < s.centroids.length; i++) {
        const c = s.centroids[i];
        const d = dist(p.x, p.y, c.x, c.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      p.targetColor = s.centroids[best].color;
    }
    s.phase = "update";
  } else {
    // UPDATE — glide each centroid to the mean of its assigned points.
    for (const c of s.centroids) {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const p of s.points) {
        if (p.targetColor === c.color) {
          sx += p.x;
          sy += p.y;
          n += 1;
        }
      }
      if (n > 0) {
        c.tx = sx / n;
        c.ty = sy / n;
      }
    }
    s.phase = "assign";
    s.iter += 1;
  }
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

  // --- Faint Voronoi region shading (per-frame 64×40 grid of cells).
  // Each cell is colored by its nearest centroid so the partition is visible
  // even before/after a step. As centroids glide, the regions glide with them.
  const cellsX = 64;
  const cellsY = 40;
  const cw = w / cellsX;
  const ch = h / cellsY;
  const cellColors = s.centroids.map((c) => withAlpha(c.color, 0.1));
  for (let j = 0; j < cellsY; j++) {
    const py = (j + 0.5) * ch;
    for (let i = 0; i < cellsX; i++) {
      const px = (i + 0.5) * cw;
      let best = 0;
      let bestD = Infinity;
      for (let k = 0; k < s.centroids.length; k++) {
        const c = s.centroids[k];
        const d = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      ctx.fillStyle = cellColors[best];
      // +0.6 overlap so neighbouring cells leave no hairline seams.
      ctx.fillRect(i * cw, j * ch, cw + 0.6, ch + 0.6);
    }
  }

  // --- Points: curColor smoothly fades toward targetColor each frame.
  for (const p of s.points) {
    p.pulse += dt * 1.6;
    p.curColor = approachColor(p.curColor, p.targetColor, dt, 5);
    const glow = 9 + 2 * Math.sin(p.pulse);
    drawGlowPoint(ctx, p.x, p.y, 4, p.curColor, glow);
  }

  // --- Centroids: glide x,y toward (tx,ty), then render the marker.
  for (const c of s.centroids) {
    c.x = approach(c.x, c.tx, dt, 3);
    c.y = approach(c.y, c.ty, dt, 3);
    c.pulse += dt * 2;

    // Dashed motion line from current → target, hinting the centroid is gliding.
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    if (Math.hypot(dx, dy) > 1.5) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.shadowBlur = 8;
      ctx.shadowColor = c.color;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 28;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.tx, c.ty);
      ctx.stroke();
      ctx.restore();
    }

    // Pulsing glowing ring (class color).
    const pulse = 0.5 + 0.5 * Math.sin(c.pulse);
    drawGlowRing(ctx, c.x, c.y, 9 + pulse * 1.6, c.color, 0.85, 1.8);

    // Filled diamond (square rotated 45°) in the centroid color.
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowBlur = 14;
    ctx.shadowColor = c.color;
    ctx.fillStyle = c.color;
    const sz = 5.2;
    ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
    ctx.restore();

    // White core.
    ctx.fillStyle = "rgba(255,250,242,0.95)";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- HUD bottom-left.
  ctx.save();
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(
    `k = 2 · phase: ${s.phase} · iter ${s.iter}`,
    16,
    h - 16
  );
  ctx.restore();
}

export function KMeansViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    maxSteps: 8,
    stepInterval: 700,
    mode: "steps",
    getStatus: (s, i) => {
      if (i === 0) return "ready";
      // After an assign step phase flips to "update"; after an update it
      // flips to "assign". The status text describes what just happened.
      return s.phase === "update"
        ? "assigning points to nearest centroid"
        : "moving centroids to cluster means";
    },
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      maxSteps={8}
      hint="Press Run to cluster into k=2"
    />
  );
}
