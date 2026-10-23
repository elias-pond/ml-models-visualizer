"use client";

import { useEffect, useState } from "react";
import { ALGORITHMS } from "@/components/visualizers/algorithms";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [active, setActive] = useState<string>(ALGORITHMS[0].id);

  // Scroll spy.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section]")
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="border-b border-border px-5 py-5">
          <div className="text-base font-bold tracking-tight text-foreground">
            ML Models Visualizer
          </div>
          <div className="mt-1 text-xs text-muted-foreground">By Elias Pond</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 pl-5 pr-3">
          <ul className="flex flex-col gap-0.5">
            {ALGORITHMS.map((a) => {
              const isActive = active === a.id;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => scrollTo(a.id)}
                    className={cn(
                      "group relative w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                      isActive
                        ? "font-semibold text-foreground"
                        : "font-normal text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute -left-5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#c96442]" />
                    )}
                    {a.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile top bar: 2 rows — brand, then full-width scrollable chips */}
      <div className="sticky top-0 z-50 flex w-full flex-col gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur md:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="shrink-0 text-sm font-bold text-foreground">
            ML Models Visualizer
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            By Elias Pond
          </span>
        </div>
        <nav className="no-scrollbar flex w-full gap-1.5 overflow-x-auto pb-0.5">
          {ALGORITHMS.map((a) => (
            <button
              key={a.id}
              onClick={() => scrollTo(a.id)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                active === a.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              )}
            >
              {a.name.replace(" Clustering", "").replace(" (KNN)", "")}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
