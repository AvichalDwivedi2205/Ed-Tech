import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack configuration (for dev)
  turbopack: {
    resolveAlias: {
      // Alias convex/_generated/* to the actual directory
      // This allows frontend code to import convex/_generated/api
      // Note: convex/server and convex/react are packages and will resolve from node_modules
      "convex/_generated": path.resolve(__dirname, "../convex/_generated"),
    },
    // Ensure proper module resolution
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  // Webpack configuration (for production builds)  
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "convex/_generated": path.resolve(__dirname, "../convex/_generated"),
    };
    // Ensure node_modules is checked before aliases for package imports
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      "node_modules",
    ];
    return config;
  },
};

export default nextConfig;