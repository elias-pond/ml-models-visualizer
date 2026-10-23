# Task 5-d — DBSCAN visualizer

## What I built
`src/components/visualizers/dbscan.tsx` — a **steps-mode** density-based
clustering visualizer. A cursor sweeps all 70 points one-by-one (~220ms each,
~15.4s total). Core points emit glowing ripples that spread the cluster color
outward; isolated points fade to near-black with a white "X" — the noise
marker. Final image: one vivid chartreuse cluster shaped like a "tadpole"
(dense blob + curved Bezier tail — clearly non-spherical, the DBSCAN
signature vs. K-Means' round centroids) plus 18 scattered dark X's.

## State shape (per spec)
```ts
interface Pt { x, y, curColor, targetColor, cluster, noise, visited }
// cluster: -1 unvisited · -2 noise · >=0 cluster id
```
- `cursor`: next unvisited index
- `ripples: {x, y, r, maxR, color, a}[]`
- `clusterCount`

## Algorithm (per spec)
- `eps = 26`, `minPts = 4`.
- Each step: advance cursor past visited, mark visited, compute neighbors
  within `eps`.
- If `neighbors.length >= minPts` → CORE:
  - adopt an existing neighbor cluster if any (else current point's cluster
    if pre-assigned, else create new: `clusterCount++`).
  - color = `hsl((clusterCount*67)%360, 70%, 62%)` (rendered as `rgb()` —
    see below).
  - **single-hop expansion**: assign cluster id + targetColor to unvisited
    neighbors only (not marked visited — cursor still visits them in turn,
    which spreads ripples one-by-one rather than the whole cluster flashing
    at once).
  - push ripple `{r:0, maxR:eps*2.2, color, a:1}`.
- Else if `p.cluster < 0` → NOISE: `noise=true`, `targetColor=#0f172a`,
  `cluster=-2`.
  - Border points (cluster pre-assigned via expansion) keep their cluster.

## Cluster color rendering
The spec formula `hsl((k*67)%360, 70%, 62%)` would not parse through shared
`approachColor` (which only handles `rgb()`/`#hex`). Added a `hslToRgb`
helper that converts the HSL triple to an `rgb(r, g, b)` string so smooth
color lerping works for every point.

## Distribution
- 22 points: dense gaussian blob at center (spread 28) — all core.
- 30 points: quadratic Bezier tail from inside the blob up-right to
  `(cx+100, cy-50)`, with `±2` jitter. Bezier sampling gives uniform-ish
  spacing (~4px) so every tail point has 8+ neighbors → core.
- 18 points: noise scattered with `≥55px` buffer (>2·eps, prevents any
  accidental mini-cluster) from every other point. 80 retries; falls back
  to placement-without-buffer on very small canvases (rare edge case the
  algorithm still handles gracefully).

Total = 70 points → `MAX_STEPS = 70`, ~15.4s at 220ms/step.

## Draw order (per spec)
1. `drawBackdrop(ctx, w, h, time)` first.
2. Animate ripples (`r += 110·dt`, `a = 1 - r/maxR`, cull dead), draw via
   `drawGlowRing` (alpha scales with fade).
3. Faint pulsing eps ring (dashed cyan, `sin(time·4)`) around the
   next-to-visit point — shows what density is being measured.
4. Points: `curColor = approachColor(curColor, targetColor, dt)` then
   `drawGlowPoint` (cluster points) or dark dot + white X (noise).
5. HUD bottom-left: `visited X / N` (slate), `clusters: K` (emerald),
   `noise: M` (rose). HUD bottom-right: `eps=26 · minPts=4` (slate-dim).

## Status
`scanning… clusters K · noise M` while running; `done · K cluster(s)` when
the cursor has swept all points.

## Palette
emerald/teal/cyan accents (eps ring, HUD labels) + rose (noise HUD label) +
vivid HSL cluster hues (first cluster = chartreuse `hsl(67,70%,62%)`).
No blue/indigo primary.

## Fluidity
- Point colors fade smoothly via `approachColor` (rate 6) — never snap.
- Ripples expand at 110 px/s and alpha-fade as they grow — never snap.
- The eps ring pulses continuously so the "currently scanning" cue reads
  even while paused.

## Verification
- `bun run lint` → clean (0 errors / 0 warnings).
- dev.log → multiple `✓ Compiled` after write, no runtime errors.
- Page already imports `DbscanViz` from `@/components/visualizers/dbscan`
  — exact export name preserved.

## Notes for downstream agents
- `MAX_STEPS` is a `const` computed from `N_BLOB + N_TAIL + N_NOISE` (70) —
  no module-level `let` needed since the point count is fixed at init time
  (the simplest pattern the spec allowed).
- `step(s)` intentionally takes only `s` (TS allows fewer params; matches
  the `decision-trees.tsx` exemplar).
- Reset (VizStage controls) calls `init` again, which regenerates the
  scatter — each run shows a fresh dataset.
