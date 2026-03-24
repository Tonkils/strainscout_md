import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — required for Ionos web hosting (no Node.js server)
  // This generates a plain HTML/CSS/JS site in the `out/` folder
  output: "export",

  // Disable image optimization (requires a server, not compatible with static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
