"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/sidebar";
import { Socials } from "@/components/layout/socials";
import { Hero } from "@/components/visualizers/hero";
import { AlgoSection } from "@/components/visualizers/algo-section";
import { ALGORITHMS } from "@/components/visualizers/algorithms";
import { LazyViz, VizSkeleton } from "@/components/visualizers/lazy-viz";

// Each visualizer is split into its own JS chunk and loaded on demand only
// when its section scrolls near the viewport (DHH/HEY-style lightweighting).
// The hero + nav ship in the initial load; the 9 visualizers stream in later.
const DecisionTreesViz = dynamic(
  () =>
    import("@/components/visualizers/decision-trees").then(
      (m) => m.DecisionTreesViz
    ),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const NaiveBayesViz = dynamic(
  () =>
    import("@/components/visualizers/naive-bayes").then((m) => m.NaiveBayesViz),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const KnnViz = dynamic(
  () => import("@/components/visualizers/knn").then((m) => m.KnnViz),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const RandomForestViz = dynamic(
  () =>
    import("@/components/visualizers/random-forest").then(
      (m) => m.RandomForestViz
    ),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const KMeansViz = dynamic(
  () => import("@/components/visualizers/kmeans").then((m) => m.KMeansViz),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const DbscanViz = dynamic(
  () => import("@/components/visualizers/dbscan").then((m) => m.DbscanViz),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const LinearRegressionViz = dynamic(
  () =>
    import("@/components/visualizers/linear-regression").then(
      (m) => m.LinearRegressionViz
    ),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const NonlinearRegressionViz = dynamic(
  () =>
    import("@/components/visualizers/nonlinear-regression").then(
      (m) => m.NonlinearRegressionViz
    ),
  { ssr: false, loading: () => <VizSkeleton /> }
);
const GradientDescentViz = dynamic(
  () =>
    import("@/components/visualizers/gradient-descent").then(
      (m) => m.GradientDescentViz
    ),
  { ssr: false, loading: () => <VizSkeleton /> }
);

const VIZ: Record<string, () => JSX.Element> = {
  "decision-trees": DecisionTreesViz,
  "naive-bayes": NaiveBayesViz,
  knn: KnnViz,
  "random-forest": RandomForestViz,
  kmeans: KMeansViz,
  dbscan: DbscanViz,
  "linear-regression": LinearRegressionViz,
  "nonlinear-regression": NonlinearRegressionViz,
  "gradient-descent": GradientDescentViz,
};

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1">
          <Hero />
          <section
            id="intro"
            data-section
            className="px-4 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32"
          >
            <div className="mx-auto max-w-3xl">
              <p className="text-pretty text-lg leading-relaxed text-foreground/80 sm:text-xl">
                Hi, my name is Elias. I am a Computer Engineering Student at the
                University of Central Florida. I created this website as a
                study tool for my Algorithms for Machine Learning class here at
                UCF because I struggled at first to conceptualize these
                foundational machine learning models. When I did a quick Google
                search to find visualizers for these algorithms, I found the
                results to be either outside the scope of my class or a bit
                counterintuitive. This gave me the idea: &ldquo;why don&rsquo;t
                I just build my own visualizer?&rdquo;, and now here we are.
                Scroll down and take a look!
              </p>
              <p className="mt-8 text-xs italic text-muted-foreground/70">
                *Model Descriptions 100% human generated, verified by AI
              </p>
              {/* Headshot below the paragraph, bigger and centered.
                  WebP (9.5KB) with PNG fallback (88KB) for older browsers. */}
              <div className="mt-12 flex justify-center">
                <picture>
                  <source srcSet="/headshot.webp" type="image/webp" />
                  <img
                    src="/headshot-opt.png"
                    alt="Elias Pond"
                    loading="lazy"
                    decoding="async"
                    className="h-64 w-64 rounded-2xl border border-border object-cover sm:h-80 sm:w-80"
                  />
                </picture>
              </div>
              {/* Connect button — scrolls to the socials section at the bottom */}
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("socials")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Connect with me
                </button>
              </div>
            </div>
          </section>
          {ALGORITHMS.map((algo, i) => {
            const Viz = VIZ[algo.id];
            return (
              <AlgoSection key={algo.id} algo={algo} index={i}>
                <div className="mx-auto max-w-5xl">
                  <LazyViz Comp={Viz} />
                </div>
              </AlgoSection>
            );
          })}
          <Socials />
        </main>
      </div>
    </div>
  );
}
