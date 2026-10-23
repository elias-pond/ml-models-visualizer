import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → produces a fully static `out/` directory that any static
  // host (Cloudflare Pages, Netlify, GitHub Pages, Vercel) can serve directly.
  // The site is 100% client-side (canvas visualizers + static content), so no
  // server runtime is needed. This is the fastest, most compatible deploy mode.
  output: "export",
  // next/image's default loader needs a server API; with static export we use
  // plain <img>/<picture> tags (already the case here), so disable the optimizer.
  images: {
    unoptimized: true,
  },
  // Don't expose the X-Powered-By header.
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Trailing slashes so every route resolves to a directory/index.html —
  // friendlier on static hosts that serve /dbscan/ → /dbscan/index.html.
  trailingSlash: true,
};

export default nextConfig;
