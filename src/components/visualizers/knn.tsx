"use client";

import { useEffect } from "react";
import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint, drawGlowRing, getMousePos } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B, withAlpha } from "@/lib/viz/colors";
import { approach, approachColor, dist, clamp } from "@/lib/viz/math";

interface Pt {
  x: number;
  y: number;
  cls: number; // 0 rose, 1 emerald
  lit: number; // 0..1 brightness when revealed
  pulse: number;
}

interface Query {
  placed: boolean;
  x: number;
  y: number;
  color: string;
  target: string;
}

interface State {
  points: Pt[];
  query: Query;
  nearest: { idx: number; d: number }[];
  revealed: number;
  classified: boolean;
  sweepR: number;
  sweepAngle: number;
  burst: number;
  voteRose: number;
  voteEmerald: number;
}

function init(w: number, h: number): State {
  const points: Pt[] = [];
  for (let i = 0; i < 28; i++)
    points.push({
      x: w * 0.32 + (Math.random() + Math.random() + Math.random() - 1.5) * w * 0.28,
      y: h * 0.34 + (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.28,
      cls: 0,
      lit: 0,
      pulse: Math.random() * Math.PI * 2,
    });
  for (let i = 0; i < 28; i++)
    points.push({
      x: w * 0.66 + (Math.random() + Math.random() + Math.random() - 1.5) * w * 0.28,
      y: h * 0.64 + (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.28,
      cls: 1,
      lit: 0,
      pulse: Math.random() * Math.PI * 2,
    });
  return {
    points,
    query: { placed: false, x: w / 2, y: h / 2, color: "#fbf6ee", target: "#fbf6ee" },
    nearest: [],
    revealed: 0,
    classified: false,
    sweepR: 0,
    sweepAngle: 0,
    burst: 0,
    voteRose: 0,
    voteEmerald: 0,
  };
}

function step(s: State, w: number, h: number) {
  if (!s.query.placed || s.revealed >= 5) {
    if (s.revealed >= 5 && !s.classified) {
      // classify
      const top = s.nearest.slice(0, 5);
      const r = top.filter((n) => s.points[n.idx].cls === 0).length;
      s.voteRose = r;
      s.voteEmerald = 5 - r;
      s.query.target = r >= 3 ? CLASS_A : CLASS_B;
      s.classified = true;
      s.burst = 0;
    }
    return;
  }
  s.revealed += 1;
  // light up the next nearest neighbor
  const n = s.nearest[s.revealed - 1];
  if (n) s.points[n.idx].lit = 1;
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

  // ambient sonar sweep angle
  s.sweepAngle += dt * 1.4;

  // animate sweep radius toward the furthest revealed neighbor distance
  const targetR =
    s.revealed > 0 && s.nearest[s.revealed - 1]
      ? s.nearest[s.revealed - 1].d + 6
      : s.sweepR;
  s.sweepR = approach(s.sweepR, s.query.placed ? targetR : 0, dt, 4);
  s.sweepR = clamp(s.sweepR, 0, Math.hypot(w, h));

  // fade out lit brightness slowly if reset
  for (const p of s.points) p.lit = approach(p.lit, p.lit, dt, 0); // no-op keep

  // draw training points
  for (const p of s.points) {
    p.pulse += dt * 2;
    const baseColor = p.cls === 0 ? CLASS_A : CLASS_B;
    if (p.lit > 0.02) {
      drawGlowPoint(ctx, p.x, p.y, 5 + p.lit * 2, baseColor, 18 + p.lit * 10);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawGlowPoint(ctx, p.x, p.y, 3.5, baseColor, 6);
      ctx.restore();
    }
  }

  if (!s.query.placed) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "13px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("Click anywhere to drop a query point", w / 2, h / 2 - 10);
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("then press Run to find its 5 nearest neighbors", w / 2, h / 2 + 10);
    ctx.restore();
    return;
  }

  const q = s.query;

  // radar sweep rings (concentric, fading)
  for (let k = 0; k < 3; k++) {
    const rr = (s.sweepR + k * 40) % 220;
    if (rr < 2) continue;
    drawGlowRing(ctx, q.x, q.y, rr, "#e89b7a", 0.18 - k * 0.05, 1.5);
  }
  // rotating sonar beam
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(s.sweepAngle);
  const grad = ctx.createLinearGradient(0, 0, 220, 0);
  grad.addColorStop(0, "rgba(232,155,122,0.0)");
  grad.addColorStop(1, "rgba(232,155,122,0.18)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 220, -0.25, 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // beams to revealed neighbors
  for (let i = 0; i < s.revealed && i < s.nearest.length; i++) {
    const n = s.nearest[i];
    const p = s.points[n.idx];
    const col = p.cls === 0 ? CLASS_A : CLASS_B;
    const offset = time * 30;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.shadowBlur = 10;
    ctx.shadowColor = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -offset;
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }

  // query dot (color lerps to target on classify)
  q.color = approachColor(q.color, q.target, dt, 6);
  if (s.classified) {
    s.burst = approach(s.burst, 1, dt, 2.5);
    // expanding burst ring
    drawGlowRing(ctx, q.x, q.y, 8 + s.burst * 60, q.target, 0.5 * (1 - s.burst), 2.5);
  }
  drawGlowPoint(ctx, q.x, q.y, 7, q.color, 22);

  // vote tally
  if (s.revealed > 0) {
    ctx.save();
    ctx.font = "12px ui-monospace, monospace";
    const tx = 16;
    const ty = h - 40;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("VOTES", tx, ty);
    // red
    ctx.fillStyle = CLASS_A;
    ctx.beginPath();
    ctx.arc(tx + 8, ty + 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${Math.min(s.voteRose || countClass(s, 0, 5), 5)}`, tx + 20, ty + 22);
    ctx.fillStyle = CLASS_B;
    ctx.beginPath();
    ctx.arc(tx + 50, ty + 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${Math.min(s.voteEmerald || countClass(s, 1, 5), 5)}`, tx + 62, ty + 22);
    if (s.classified) {
      ctx.fillStyle = withAlpha(q.target, 0.95);
      ctx.font = "bold 12px ui-monospace, monospace";
      ctx.fillText(`→ classified`, tx + 96, ty + 22);
    }
    ctx.restore();
  }
}

function countClass(s: State, cls: number, n: number) {
  return s.nearest.slice(0, n).filter((x) => s.points[x.idx].cls === cls).length;
}

export function KnnViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    maxSteps: 6,
    stepInterval: 620,
    getStatus: (s, i) =>
      !s.query.placed
        ? "awaiting query"
        : s.classified
        ? "classified"
        : `${s.revealed}/5 neighbors`,
  });
  const getState = viz.getState;

  // attach click handler to place the query
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: MouseEvent) => {
      const p = getMousePos(canvas, e);
      const s = getState();
      if (!s) return;
      s.query.placed = true;
      s.query.x = p.x;
      s.query.y = p.y;
      s.query.color = "#fbf6ee";
      s.query.target = "#fbf6ee";
      s.revealed = 0;
      s.classified = false;
      s.sweepR = 0;
      s.burst = 0;
      s.voteRose = 0;
      s.voteEmerald = 0;
      for (const pt of s.points) pt.lit = 0;
      s.nearest = s.points
        .map((pt, idx) => ({ idx, d: dist(p.x, p.y, pt.x, pt.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 5);
    };
    canvas.addEventListener("click", handler);
    return () => canvas.removeEventListener("click", handler);
  }, [canvasRef, getState]);

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      maxSteps={6}
      hint="Click to place a query point, then Run"
    />
  );
}
