"use client";

import { cn } from "@/lib/utils";
import { ControlPanel } from "./control-panel";
import type { VizHandle } from "@/lib/viz/use-viz";
import { Activity } from "lucide-react";

export function VizStage<T>({
  canvasRef,
  viz,
  maxSteps,
  hint,
  className,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viz: VizHandle<T>;
  maxSteps?: number;
  hint?: string;
  className?: string;
}) {
  const denom = maxSteps ?? 0;
  const progress = denom > 0 ? Math.min(1, viz.stepCount / denom) : 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-[#0c0c0e] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {/* progress ribbon — neutral with terracotta fill */}
      <div className="absolute left-0 right-0 top-0 z-20 h-0.5 bg-white/5">
        <div
          className="h-full bg-[#c96442] transition-[width] duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* top overlay: step counter + status (no category badge) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-end p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[11px] text-white/70 backdrop-blur">
          <Activity className="size-3 text-[#d97757]" />
          {denom > 0 ? `${viz.stepCount}/${denom}` : `step ${viz.stepCount}`}
          <span className="mx-1 h-3 w-px bg-white/10" />
          <span className="text-white/50">{viz.status}</span>
        </div>
      </div>

      {/* canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block h-[320px] w-full sm:h-[420px]"
        />
        {hint && !viz.playing && viz.stepCount === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs text-white/70 backdrop-blur">
              {hint}
            </span>
          </div>
        ) : null}
      </div>

      {/* controls */}
      <div className="border-t border-white/10 bg-black/40 px-3 py-2.5 backdrop-blur">
        <ControlPanel viz={viz} />
      </div>
    </div>
  );
}
