"use client";

import { ArrowUpRight } from "lucide-react";
import type { Algorithm } from "./algorithms";

export function AlgoSection({
  algo,
  children,
}: {
  algo: Algorithm;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={algo.id}
      data-section
      className="scroll-mt-6 border-t border-border px-4 py-16 sm:px-8 sm:py-24"
    >
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
        {/* header — barebones: just the name */}
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {algo.name}
          </h2>
        </div>

        {/* stage */}
        {children}

        {/* description — half the default gap from the stage */}
        <p className="-mt-4 max-w-3xl text-base leading-relaxed text-foreground/80 sm:text-lg">
          {algo.desc}
        </p>

        {/* applications — same distance from the description as stage→desc */}
        <div className="-mt-4 rounded-xl border border-border bg-secondary p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Real-world applications
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {algo.apps.map((app) => (
              <div
                key={app.title}
                className="group relative rounded-lg border border-border bg-background p-4 transition-all hover:border-foreground/20 hover:bg-foreground/[0.02]"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {app.title}
                  </h4>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {app.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
