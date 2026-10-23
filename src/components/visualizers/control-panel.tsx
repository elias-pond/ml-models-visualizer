"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipForward, RotateCcw, Gauge } from "lucide-react";
import type { VizHandle } from "@/lib/viz/use-viz";

const SPEEDS = [0.5, 1, 2, 4];

export function ControlPanel<T>({
  viz,
  className,
}: {
  viz: VizHandle<T>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3 px-1 py-1", className)}>
      {/* Play / Pause — neutral, terracotta only while playing */}
      <Button
        size="sm"
        onClick={viz.toggle}
        className={cn(
          "h-9 gap-2 rounded-md font-semibold tracking-wide transition-all",
          viz.playing
            ? "bg-[#c96442] text-white hover:bg-[#b5573a] shadow-[0_0_18px_-6px] shadow-[#c96442]/70"
            : "bg-white text-foreground hover:bg-white/90"
        )}
      >
        {viz.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        <span className="hidden sm:inline">
          {viz.playing ? "Pause" : viz.done ? "Replay" : "Run"}
        </span>
      </Button>

      {/* Step */}
      <Button
        size="sm"
        variant="outline"
        onClick={viz.stepOnce}
        disabled={viz.playing || viz.done}
        className="h-9 gap-1.5 rounded-md border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <SkipForward className="size-4" />
        <span className="hidden sm:inline">Step</span>
      </Button>

      {/* Reset */}
      <Button
        size="sm"
        variant="outline"
        onClick={viz.reset}
        className="h-9 gap-1.5 rounded-md border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="size-4" />
        <span className="hidden sm:inline">Reset</span>
      </Button>

      {/* Speed segmented control */}
      <div className="ml-auto flex items-center gap-2">
        <Gauge className="size-4 text-white/40" />
        <div className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => viz.setSpeed(s)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-[5px] transition-all",
                viz.speed === s
                  ? "bg-white text-foreground"
                  : "text-white/40 hover:text-white/80"
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
