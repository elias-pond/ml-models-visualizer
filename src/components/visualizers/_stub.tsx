"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint } from "@/lib/viz/canvas";
import { CLASS } from "@/lib/viz/colors";

interface P {
  x: number;
  y: number;
  cls: number;
  phase: number;
}
interface S {
  pts: P[];
}

function init(w: number, h: number): S {
  const pts: P[] = [];
  for (let i = 0; i < 24; i++)
    pts.push({
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.6,
      y: h * 0.5 + (Math.random() - 0.5) * h * 0.6,
      cls: i % 2,
      phase: Math.random() * Math.PI * 2,
    });
  return { pts };
}

function step(s: S) {
  // gentle drift
  for (const p of s.pts) p.phase += 0.2;
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: S,
  time: number,
  dt: number
) {
  drawBackdrop(ctx, w, h, time);
  for (const p of s.pts) {
    p.phase += dt * 1.5;
    const ox = Math.sin(p.phase) * 6;
    const oy = Math.cos(p.phase * 0.8) * 6;
    drawGlowPoint(ctx, p.x + ox, p.y + oy, 4, p.cls === 0 ? CLASS[0] : CLASS[1], 12);
  }
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "13px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("building this visualizer…", w / 2, h / 2);
  ctx.restore();
}

export function PlaceholderStage() {
  const [canvasRef, viz] = useViz<S>({ init, step, draw, mode: "continuous" });
  return <VizStage canvasRef={canvasRef} viz={viz} />;
}
