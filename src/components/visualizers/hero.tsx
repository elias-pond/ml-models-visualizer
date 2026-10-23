"use client";

// Local copies of the credit logos with transparent backgrounds
// (processed by scripts/make-logos-transparent.ts).
const CREDIT_LOGOS = [
  { alt: "UCF", src: "/logos/logo-1.png", h: "h-7" },
  { alt: "UCF", src: "/logos/logo-2.png", h: "h-10" },
  { alt: "UBC", src: "/logos/logo-3.png", h: "h-11" },
  { alt: "Z.ai", src: "/logos/logo-4.png", h: "h-10" },
  { alt: "Anthropic", src: "/logos/logo-5-anthropic.png", h: "h-7" },
  { alt: "IBM", src: "/logos/logo-6-ibm.png", h: "h-7" },
];

function LogoCarousel() {
  // Duplicate the list so the track can loop seamlessly (-50% translate).
  const items = [...CREDIT_LOGOS, ...CREDIT_LOGOS];
  return (
    // Fills the absolute-positioned parent box (which extends ~16px past the
    // label on each side). Fade mask hides the wrap-around duplicate logos.
    <div className="marquee-mask h-full w-full overflow-hidden">
      <div className="animate-marquee flex h-full w-max items-center gap-8 pr-8">
        {items.map((logo, i) => (
          <div
            key={`${logo.alt}-${i}`}
            className={`flex ${logo.h} shrink-0 items-center`}
            title={logo.alt}
          >
            <img
              src={logo.src}
              alt={logo.alt}
              loading="lazy"
              decoding="async"
              className={`${logo.h} w-auto opacity-70 transition-opacity hover:opacity-100`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      data-section
      className="relative flex min-h-[44vh] items-center justify-center overflow-hidden px-4 pt-16 pb-4 sm:min-h-[62vh] sm:pt-20 sm:pb-6"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-1 text-center">
        <h1 className="text-balance text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
          ML Models Visualizer
        </h1>
        <p className="mt-4 text-sm font-medium tracking-wide text-muted-foreground sm:text-base">
          By Elias Pond
        </p>

        <div className="mt-16 w-full sm:mt-20">
          {/* `w-fit` shrinks to the label's text width. The carousel sits in an
              absolutely-positioned box that extends 16px (≈ 4 spacebar presses)
              past the label on each side, symmetrically, without inflating the
              parent's measured width. */}
          <div className="relative mx-auto flex w-fit flex-col items-center">
            <p className="mb-5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Made possible with resources from
            </p>
            <div className="absolute inset-x-[-5rem] bottom-0 h-12">
              <LogoCarousel />
            </div>
            <div className="h-12" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
