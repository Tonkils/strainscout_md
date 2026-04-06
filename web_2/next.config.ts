import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — required for Ionos web hosting (no Node.js server)
  // This generates a plain HTML/CSS/JS site in the `out/` folder
  output: "export",

  // Emit /route/index.html instead of /route.html so Apache can serve
  // clean URLs natively (looks for index.html in the directory).
  // Without this, Apache resolves /cheapest to a directory with no index → 403.
  trailingSlash: true,

  // Disable image optimization (requires a server, not compatible with static export)
  images: {
    unoptimized: true,
  },

  // Pin Turbopack's root to this project directory.
  // Without this, Turbopack may detect multiple package-lock.json files across
  // the filesystem and pick the wrong one as the workspace root, causing worker
  // processes to crash when resolving modules for dynamically-compiled routes
  // (e.g. /dispensary/[slug]).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
