"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LazyViz — DHH/HEY-style lightweighting.
 *
 * Each algorithm visualizer is a client component carrying a fair amount of
 * JS (canvas + per-algo logic). Importing all 9 statically would bundle them
 * into the initial page load. Instead we:
 *   1. Pass in a `next/dynamic`-wrapped component (ssr:false) — that splits it
 *      into its own chunk loaded only when this wrapper mounts it.
 *   2. Gate mounting with an IntersectionObserver so the chunk only fetches
 *      when the section is about to scroll into view (rootMargin 300px).
 *
 * Net effect: the initial HTML+JS is just the hero + nav. Each visualizer's
 * code streams in on demand as the user scrolls — no functionality lost.
 */
export function LazyViz({
  Comp,
  fallback,
}: {
  Comp: React.ComponentType;
  fallback?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // SSR/old-browser fallback: show on next tick (avoid synchronous setState).
      const id = window.setTimeout(() => setShow(true), 0);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={show ? undefined : "min-h-[460px] sm:min-h-[560px]"}>
      {show ? <Comp /> : <>{fallback ?? <VizSkeleton />}</>}
    </div>
  );
}

/** Lightweight placeholder matching the stage height so layout doesn't jump. */
export function VizSkeleton() {
  return (
    <div className="relative h-[320px] w-full animate-pulse rounded-2xl border border-border bg-[#0c0c0e] sm:h-[420px]">
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-[#9c9387] backdrop-blur">
        <span className="size-3 rounded-full bg-[#c96442]/40" />
        loading…
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c96442]/30 border-t-[#c96442]" />
      </div>
    </div>
  );
}
