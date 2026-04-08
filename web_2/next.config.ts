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

  // ---------------------------------------------------------------------------
  // Bundle splitting — keep the main chunk under 500 KB by extracting heavy
  // vendor libraries into dedicated, long-cacheable chunks.
  // We extend (not replace) Next.js's built-in splitChunks config so its own
  // framework/shared chunks continue to work normally.
  // ---------------------------------------------------------------------------
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const existingCacheGroups =
        config.optimization.splitChunks?.cacheGroups ?? {};

      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...existingCacheGroups,

          // React core — changes rarely, cached across every page
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: "vendor-react",
            chunks: "all" as const,
            priority: 40,
            enforce: true,
          },

          // Supabase client SDK (auth-helpers, ssr, supabase-js + transitive deps)
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: "vendor-supabase",
            chunks: "all" as const,
            priority: 30,
            enforce: true,
          },

          // PostHog analytics — not needed for first paint
          posthog: {
            test: /[\\/]node_modules[\\/]posthog-js[\\/]/,
            name: "vendor-posthog",
            chunks: "all" as const,
            priority: 30,
            enforce: true,
          },

          // tRPC + React Query + SuperJSON — data-fetching layer
          trpc: {
            test: /[\\/]node_modules[\\/](@trpc|@tanstack[\\/]react-query|superjson)[\\/]/,
            name: "vendor-trpc",
            chunks: "all" as const,
            priority: 30,
            enforce: true,
          },

          // Lucide icons — tree-shaken but still substantial
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: "vendor-lucide",
            chunks: "all" as const,
            priority: 30,
            enforce: true,
          },

          // Zod validation — used widely but independent
          zod: {
            test: /[\\/]node_modules[\\/]zod[\\/]/,
            name: "vendor-zod",
            chunks: "all" as const,
            priority: 30,
            enforce: true,
          },

          // Catch-all for remaining node_modules (keeps the main chunk lean)
          vendorMisc: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor-misc",
            chunks: "all" as const,
            priority: 10,
            enforce: true,
            // Only create this chunk when shared by 2+ entry points
            minChunks: 2,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
