"use client";

import { useViz } from "@/lib/viz/use-viz";
import { VizStage } from "./viz-stage";
import { drawBackdrop, drawGlowPoint, drawGlowRing } from "@/lib/viz/canvas";
import { CLASS_A, CLASS_B, hexToRgb } from "@/lib/viz/colors";
import { approach, approachColor, clamp, easeOutCubic, randn } from "@/lib/viz/math";

// ---------------------------------------------------------------------------
// Gaussian Naive Bayes (2 classes, 2 features) — visualizes the per-feature
// Gaussian likelihood "blooms" and the resulting curved quadratic decision
// boundary where the two class posteriors are equal.
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
  cls: number; // 0 rose, 1 emerald
  pulse: number;
}

interface TestPt {
  x: number;
  y: number;
  color: string; // current (lerped each frame)
  target: string; // morph target after classification
  revealed: boolean;
  burst: number; // 0..1 expanding ring progress (current)
  burstTarget: number;
  predicted: number; // -1 until classified
  pulse: number;
}

interface ClassModel {
  muX: number; // normalized [0,1]
  muY: number;
  sx: number; // per-feature std (normalized)
  sy: number;
  prior: number;
}

interface State {
  points: Pt[];
  models: ClassModel[];
  testPoints: TestPt[];
  reveal: number; // 0..6 discrete step counter
  ringScaleCur: number[]; // per-class current ring sigma (lerped)
  ringScaleTarget: number[];
  // precomputed posterior heatmap (offscreen) — built once per size at step 4
  heat: HTMLCanvasElement | null;
  heatW: number;
  heatH: number;
  heatAlpha: number;
  heatAlphaTarget: number;
  formulaFade: number;
  formulaFadeTarget: number;
}

const HEAT_W = 256; // offscreen heatmap width (rebuilt only when size changes)

// Two blobs with *orthogonal* anisotropy (class A wide-x, class B wide-y) so
// the per-feature Gaussian assumption produces a visibly curved (hyperbolic)
// decision boundary rather than a straight diagonal split.
function makeBlob(
  w: number,
  h: number,
  cx: number,
  cy: number,
  sdx: number,
  sdy: number,
  cls: number,
  n: number
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const x = clamp(cx * w + randn() * sdx * w, 6, w - 6);
    const y = clamp(cy * h + randn() * sdy * h, 6, h - 6);
    pts.push({ x, y, cls, pulse: Math.random() * Math.PI * 2 });
  }
  return pts;
}

function init(w: number, h: number): State {
  const ptsA = makeBlob(w, h, 0.35, 0.4, 0.14, 0.04, 0, 30);
  const ptsB = makeBlob(w, h, 0.65, 0.6, 0.04, 0.14, 1, 30);
  const points = [...ptsA, ...ptsB];

  // Fit per-feature Gaussian parameters from the training points (normalized).
  const models: ClassModel[] = [];
  for (let c = 0; c < 2; c++) {
    const cp = points.filter((p) => p.cls === c);
    const n = cp.length;
    const muX = cp.reduce((s, p) => s + p.x / w, 0) / n;
    const muY = cp.reduce((s, p) => s + p.y / h, 0) / n;
    const sx = Math.sqrt(cp.reduce((s, p) => s + (p.x / w - muX) ** 2, 0) / n);
    const sy = Math.sqrt(cp.reduce((s, p) => s + (p.y / h - muY) ** 2, 0) / n);
    models.push({
      muX,
      muY,
      sx: Math.max(sx, 0.02),
      sy: Math.max(sy, 0.02),
      prior: 0.5,
    });
  }

  // Two amber test points placed on opposite sides of the expected boundary.
  const testPoints: TestPt[] = [
    {
      x: w * 0.5,
      y: h * 0.28,
      color: "#f59e0b",
      target: "#f59e0b",
      revealed: false,
      burst: 0,
      burstTarget: 0,
      predicted: -1,
      pulse: 0,
    },
    {
      x: w * 0.52,
      y: h * 0.72,
      color: "#f59e0b",
      target: "#f59e0b",
      revealed: false,
      burst: 0,
      burstTarget: 0,
      predicted: -1,
      pulse: 0,
    },
  ];

  return {
    points,
    models,
    testPoints,
    reveal: 0,
    ringScaleCur: [0, 0],
    ringScaleTarget: [0, 0],
    heat: null,
    heatW: 0,
    heatH: 0,
    heatAlpha: 0,
    heatAlphaTarget: 0,
    formulaFade: 0,
    formulaFadeTarget: 0,
  };
}

// log P(y|x) ∝ log P(y) + log N(x₁|μₓ,σₓ) + log N(x₂|μ_y,σ_y)
function logPosterior(m: ClassModel, u: number, v: number): number {
  return (
    Math.log(m.prior) -
    ((u - m.muX) ** 2) / (2 * m.sx * m.sx) -
    ((v - m.muY) ** 2) / (2 * m.sy * m.sy) -
    Math.log(m.sx * m.sy)
  );
}

function predict(s: State, u: number, v: number): number {
  return logPosterior(s.models[0], u, v) >= logPosterior(s.models[1], u, v)
    ? 0
    : 1;
}

// Precompute the posterior surface into an offscreen canvas (256 wide, aspect-
// matched). For each pixel: pick argmax class color and shade alpha by the
// confidence margin (transparent near the boundary, opaque far from it).
// Blitting this each frame keeps the draw cheap and crisp.
function buildHeatmap(s: State, w: number, h: number) {
  const iw = HEAT_W;
  const ih = Math.max(1, Math.round((iw * h) / w));
  const c = document.createElement("canvas");
  c.width = iw;
  c.height = ih;
  const x = c.getContext("2d");
  if (!x) return;
  const img = x.createImageData(iw, ih);
  const rgbA = hexToRgb(CLASS_A);
  const rgbB = hexToRgb(CLASS_B);
  for (let j = 0; j < ih; j++) {
    for (let i = 0; i < iw; i++) {
      const u = (i + 0.5) / iw;
      const v = (j + 0.5) / ih;
      const lA = logPosterior(s.models[0], u, v);
      const lB = logPosterior(s.models[1], u, v);
      const diff = lA - lB;
      const cls = diff > 0 ? 0 : 1;
      const margin = 1 - Math.exp(-Math.abs(diff) * 0.45);
      const alpha = 0.50 * margin; // strong so the boundary region reads clearly
      const rgb = cls === 0 ? rgbA : rgbB;
      const idx = (j * iw + i) * 4;
      img.data[idx] = rgb.r;
      img.data[idx + 1] = rgb.g;
      img.data[idx + 2] = rgb.b;
      img.data[idx + 3] = Math.round(alpha * 255);
    }
  }
  x.putImageData(img, 0, 0);
  s.heat = c;
  s.heatW = w;
  s.heatH = h;
}

function step(s: State, w: number, h: number) {
  if (s.reveal >= 6) return;
  s.reveal += 1;
  if (s.reveal <= 3) {
    // steps 1-3: Gaussian likelihood "blooms" expand outward (1, 2, 3 σ).
    s.ringScaleTarget[0] = s.reveal;
    s.ringScaleTarget[1] = s.reveal;
    s.formulaFadeTarget = 1;
  } else if (s.reveal === 4) {
    // step 4: compute posterior surface — build heatmap once per size.
    if (!s.heat || s.heatW !== w || s.heatH !== h) buildHeatmap(s, w, h);
    s.heatAlphaTarget = 1;
  } else if (s.reveal === 5) {
    // step 5: drop the two amber test points and classify each.
    for (const tp of s.testPoints) {
      if (!tp.revealed) {
        tp.revealed = true;
        tp.predicted = predict(s, tp.x / w, tp.y / h);
        tp.target = tp.predicted === 0 ? CLASS_A : CLASS_B;
        tp.burstTarget = 1;
      }
    }
  }
  // reveal === 6: done — boundary ready.
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

  // Approach current → target every frame (framerate-independent smoothing).
  s.heatAlpha = approach(s.heatAlpha, s.heatAlphaTarget, dt, 3);
  s.formulaFade = approach(s.formulaFade, s.formulaFadeTarget, dt, 3);
  for (let c = 0; c < 2; c++) {
    s.ringScaleCur[c] = approach(
      s.ringScaleCur[c],
      s.ringScaleTarget[c],
      dt,
      4
    );
  }
  for (const tp of s.testPoints) {
    tp.color = approachColor(tp.color, tp.target, dt, 5);
    tp.burst = approach(tp.burst, tp.burstTarget, dt, 2);
    tp.pulse += dt;
  }

  // Rebuild the heatmap lazily if the canvas resized after step 4.
  if (
    s.reveal >= 4 &&
    s.heatAlphaTarget > 0 &&
    (!s.heat || s.heatW !== w || s.heatH !== h)
  ) {
    buildHeatmap(s, w, h);
  }

  // Blit the decision-boundary heatmap (fade in via heatAlpha).
  if (s.heat && s.heatAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.heatAlpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s.heat, 0, 0, w, h);
    ctx.restore();
  }

  // Gaussian bloom rings — five concentric anisotropic ellipses per class,
  // alpha fading outward, subtly pulsing via time.
  for (let c = 0; c < 2; c++) {
    const m = s.models[c];
    const color = c === 0 ? CLASS_A : CLASS_B;
    const cx = m.muX * w;
    const cy = m.muY * h;
    const scale = s.ringScaleCur[c];
    if (scale < 0.05) continue;
    const fracs = [0.3, 0.5, 0.7, 0.88, 1.0];
    const grow = Math.min(scale, 3) / 3;
    for (let k = 0; k < fracs.length; k++) {
      const sigma = scale * fracs[k];
      const rx = sigma * m.sx * w;
      const ry = sigma * m.sy * h;
      if (rx < 1 || ry < 1) continue;
      const alpha = 0.34 * (1 - k / 6) * grow;
      const pulse = 1 + 0.04 * Math.sin(time * 2 + c * 1.3 + k * 0.5);
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // class mean marker — small bright core
    drawGlowPoint(ctx, cx, cy, 3, color, 14);
  }

  // Training points (soft pulsing).
  for (const p of s.points) {
    p.pulse += dt * 2;
    const baseColor = p.cls === 0 ? CLASS_A : CLASS_B;
    const glow = 8 + 1.5 * Math.sin(p.pulse);
    drawGlowPoint(ctx, p.x, p.y, 3.5, baseColor, glow);
  }

  // Test points — revealed at step 5 with an expanding burst ring; the dot
  // color morphs from amber to the predicted class color via approachColor.
  for (const tp of s.testPoints) {
    if (!tp.revealed) continue;
    if (tp.burst > 0.01 && tp.burst < 0.99) {
      const br = 8 + easeOutCubic(tp.burst) * 50;
      const ba = 0.55 * (1 - tp.burst);
      drawGlowRing(ctx, tp.x, tp.y, br, tp.target, ba, 2.2);
    }
    drawGlowPoint(ctx, tp.x, tp.y, 6, tp.color, 22);
  }

  // Legend (bottom-right, clear of the VizStage overlays).
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

  // Formula hint (bottom-left, monospace).
  if (s.formulaFade > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.formulaFade;
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("P(y|x) ∝ P(x₁|y)·P(x₂|y)·P(y)", 16, h - 16);
    ctx.restore();
  }
}

export function NaiveBayesViz() {
  const [canvasRef, viz] = useViz<State>({
    init,
    step,
    draw,
    maxSteps: 6,
    stepInterval: 750,
    getStatus: (_s, i) =>
      i === 0
        ? "ready"
        : i <= 3
        ? "fitting Gaussians…"
        : i === 4
        ? "computing posteriors…"
        : i === 5
        ? "classifying test points"
        : "decision boundary ready",
  });

  return (
    <VizStage
      canvasRef={canvasRef}
      viz={viz}
      maxSteps={6}
      hint="Press Run to fit the Gaussian model"
    />
  );
}
