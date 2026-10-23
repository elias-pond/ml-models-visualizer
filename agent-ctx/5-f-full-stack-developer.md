# Task 5-f — Nonlinear Regression visualizer

## What I built
`src/components/visualizers/nonlinear-regression.tsx` — a continuous-mode
visualizer that fits a degree-3 polynomial to 28 noisy points via gradient
descent with momentum. The curve visibly WARPS from a flat line (c=[0.5,0,0,0])
to a cubic that hugs the data over ~3-5 s.

## Key design choices
- **True curve**: `y = 0.05 + 1.8x − 5x² + 4x³` — clear rise→dip→rise shape
  spanning most of [0,1] so the polynomial advantage over a line is obvious.
- **Optimizer**: plain GD + momentum (lr=0.3, β=0.85, 3 sub-steps/frame).
  Momentum flattens the conditioning of the Vandermonde-like Hessian so all
  four coefficients converge at a visible pace rather than c0 settling first.
- **NaN guard**: if any coefficient goes non-finite, reset to flat line.
- **Convergence**: gradient norm < 0.01 sustained for 1 s → `done = true`.

## Draw order (per spec)
1. `drawBackdrop(ctx, w, h, time)` first
2. Faint axes (dashed mid line at y=0.5, solid x/y axes, very dim)
3. Rose dashed vertical residual lines from each point to current curve
4. Fitted curve: 90 samples, emerald→teal→cyan gradient, shadowBlur 14,
   lineWidth 3, lineJoin/Cap round
5. 4 amber control knot rings (drawGlowRing r≈5 + white core dot, gentle
   pulse via `time`) at x=0.15, 0.4, 0.6, 0.85
6. Cyan data points with gentle `time`-based glow pulse
7. MSE sparkline top-left (rounded rect, glowing teal line, "loss X" +
   "epoch N" labels) — copied from gradient-descent.tsx
8. Bottom-left label "degree 3 polynomial · MSE X"
9. Centered bottom "converged — press Reset to restart" when done

## Palette
emerald/teal/cyan (curve + points + sparkline) + amber (knots) + rose
(residuals). No blue/indigo primary.

## Verification
- `bun run lint` → clean (0 errors / 0 warnings)
- dev.log → clean recompiles, no runtime errors
- Page imports `NonlinearRegressionViz` — exact name preserved

## Status string
`epoch ${epoch} · MSE ${mse.toFixed(3)}` or `converged`.

## Notes for downstream agents
- The polynomial is evaluated as `c0 + c1*x + c2*x^2 + c3*x^3` in normalized
  x∈[0,1] / y∈[0,1] space, then mapped to canvas pixels with margin-aware
  `mapX` / `mapY` helpers (ML=36, MR=24, MT=60, MB=40).
- Reset (via VizStage controls) re-runs `init`, which regenerates the noise
  sample too — so each run shows a fresh dataset.
