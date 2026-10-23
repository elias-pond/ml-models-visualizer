"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VizCtx = CanvasRenderingContext2D;

export interface VizConfig<T> {
  /** Build fresh state for canvas of size w×h (CSS pixels). */
  init: (w: number, h: number) => T;
  /** Advance logic by one discrete step (steps mode) or per-frame (continuous). */
  step: (state: T, w: number, h: number, dt: number) => void;
  /** Render the current state. dt is real frame delta in seconds (for interpolation). */
  draw: (
    ctx: VizCtx,
    w: number,
    h: number,
    state: T,
    time: number,
    dt: number
  ) => void;
  /** Discrete steps stop after this many. Omit for free-running continuous sims. */
  maxSteps?: number;
  /** Base ms between steps at 1× speed (steps mode). Default 700. */
  stepInterval?: number;
  /** "steps" (default) or "continuous" (step every frame with real dt). */
  mode?: "steps" | "continuous";
  /** For continuous mode: predicate signaling the sim has converged.
   *  When true, useViz stops playback and marks the handle as `done`
   *  (so the Run button becomes "Replay"). Omit for free-running sims. */
  isDone?: (state: T) => boolean;
  /** Human-readable status for the current state/step. */
  getStatus?: (state: T, step: number) => string;
}

export interface VizHandle<T> {
  playing: boolean;
  stepCount: number;
  status: string;
  speed: number;
  done: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  stepOnce: () => void;
  setSpeed: (s: number) => void;
  /** Direct accessor to live state (read-only by convention). */
  getState: () => T | null;
}

/**
 * useViz drives a single <canvas> with a RAF loop, DPR scaling, resize handling,
 * and standard play/pause/step/reset/speed controls. It returns a tuple
 * `[canvasRef, handle]` so the ref (used only by <canvas>/effects) stays
 * separate from the render-time handle (playing/stepCount/controls).
 *
 * Visualizers keep "current" animated values plus "target" values in state;
 * `draw` lerps current→target using dt so motion stays smooth at any
 * framerate, while a discrete `step` only sets new targets — that combination
 * is what makes every visualizer feel fluid.
 *
 * Performance: an IntersectionObserver cancels the RAF loop entirely when the
 * canvas scrolls off-screen (zero CPU for off-screen visualizers) and restarts
 * it on return. `reset()` stops playback so continuous-mode sims (e.g. gradient
 * descent) don't immediately re-converge after a reset.
 */
export function useViz<T>(
  config: VizConfig<T>
): readonly [React.RefObject<HTMLCanvasElement | null>, VizHandle<T>] {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const configRef = useRef(config);

  // Keep configRef in sync with the latest config outside of render so the
  // RAF loop always uses the freshest init/step/draw closures.
  useEffect(() => {
    configRef.current = config;
  });

  const stateRef = useRef<T | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumRef = useRef<number>(0);
  const stepRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);
  const speedRef = useRef<number>(1);
  const timeRef = useRef<number>(0);
  const visibleRef = useRef<boolean>(true);

  const [playing, setPlaying] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [speed, setSpeedState] = useState(1);
  const [done, setDone] = useState(false);

  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeedState(s);
  }, []);

  const applyStatus = useCallback(() => {
    const cfg = configRef.current;
    if (cfg.getStatus && stateRef.current) {
      setStatus(cfg.getStatus(stateRef.current, stepRef.current));
    }
  }, []);

  const doStep = useCallback(() => {
    const cfg = configRef.current;
    const st = stateRef.current;
    const { w, h } = sizeRef.current;
    if (!st || w === 0) return;
    cfg.step(st, w, h, 0);
    stepRef.current += 1;
    setStepCount(stepRef.current);
    needsRedrawRef.current = true;
    applyStatus();
    if (cfg.maxSteps !== undefined && stepRef.current >= cfg.maxSteps) {
      playingRef.current = false;
      setPlaying(false);
      setDone(true);
    }
  }, [applyStatus]);

  const reset = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    // Stop playback so continuous-mode sims don't immediately re-converge;
    // the fresh state stays put until the user presses Run again.
    playingRef.current = false;
    setPlaying(false);
    stateRef.current = configRef.current.init(w, h);
    stepRef.current = 0;
    accumRef.current = 0;
    lastTimeRef.current = 0; // avoid a dt jump on the next frame
    setStepCount(0);
    setDone(false);
    setStatus("Ready");
    applyStatus();
  }, [applyStatus]);

  const stepOnce = useCallback(() => {
    if (done) return;
    playingRef.current = false;
    setPlaying(false);
    doStep();
  }, [doStep, done]);

  const play = useCallback(() => {
    if (done) {
      // reset() already stops playback + re-inits; restart it here.
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      stateRef.current = configRef.current.init(w, h);
      stepRef.current = 0;
      accumRef.current = 0;
      lastTimeRef.current = 0;
      setStepCount(0);
      setDone(false);
    }
    playingRef.current = true;
    setPlaying(true);
  }, [done]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const getState = useCallback(() => stateRef.current, []);

  // Mount: set up canvas + RAF loop + off-screen pausing (runs once).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
      if (!stateRef.current) {
        stateRef.current = configRef.current.init(rect.width, rect.height);
        applyStatus();
      }
    };
    setup();

    const ro = new ResizeObserver(() => setup());
    ro.observe(canvas);

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      // Skip all work when the canvas is off-screen (perf).
      if (!visibleRef.current) {
        lastTimeRef.current = 0; // reset dt so we don't jump on return
        return;
      }

      const dt = lastTimeRef.current
        ? Math.min((now - lastTimeRef.current) / 1000, 0.05)
        : 0;
      lastTimeRef.current = now;
      timeRef.current += dt;

      const cfg = configRef.current;
      const st = stateRef.current;
      const { w, h } = sizeRef.current;

      if (st && w > 0 && h > 0) {
        if (playingRef.current) {
          const mode = cfg.mode ?? "steps";
          if (mode === "continuous") {
            cfg.step(st, w, h, dt);
            stepRef.current += 1;
            // Check convergence for continuous sims so the handle reports
            // `done` and the Run button becomes "Replay".
            if (cfg.isDone && cfg.isDone(st)) {
              playingRef.current = false;
              setPlaying(false);
              setDone(true);
            }
          } else {
            const interval = (cfg.stepInterval ?? 700) / speedRef.current;
            accumRef.current += dt * 1000;
            let guard = 0;
            while (
              accumRef.current >= interval &&
              playingRef.current &&
              guard < 8
            ) {
              accumRef.current -= interval;
              cfg.step(st, w, h, 0);
              stepRef.current += 1;
              guard += 1;
              if (
                cfg.maxSteps !== undefined &&
                stepRef.current >= cfg.maxSteps
              ) {
                playingRef.current = false;
                setPlaying(false);
                setDone(true);
                accumRef.current = 0;
                break;
              }
            }
          }
          setStepCount(stepRef.current);
          applyStatus();
        }
        // Always draw when visible — many visualizers lerp current→target
        // in draw() (e.g. K-Means centroids gliding after a step), so they
        // need per-frame rendering even while "paused" to finish animating.
        cfg.draw(ctx, w, h, st, timeRef.current, dt);
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    // Skip all work when the canvas is off-screen (perf). The RAF keeps
    // rescheduling (essentially free) and resumes drawing on return.
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const wasVisible = visibleRef.current;
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !wasVisible) {
          // coming back on-screen: reset dt so we don't jump
          lastTimeRef.current = 0;
        }
      },
      { rootMargin: "100px 0px" }
    );
    visibilityObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      ro.disconnect();
      visibilityObserver.disconnect();
      lastTimeRef.current = 0;
    };
    // Mount once.
  }, [applyStatus]);

  const handle: VizHandle<T> = {
    playing,
    stepCount,
    status,
    speed,
    done,
    play,
    pause,
    toggle,
    reset,
    stepOnce,
    setSpeed,
    getState,
  };

  return [canvasRef, handle] as const;
}
