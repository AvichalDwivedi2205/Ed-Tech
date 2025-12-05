import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack configuration (for dev)
  turbopack: {
    resolveAlias: {
      "convex": path.resolve(__dirname, "../convex"),
    },
  },
  // Webpack configuration (for production builds)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "convex": path.resolve(__dirname, "../convex"),
    };
    return config;
  },
};

export default nextConfig;
