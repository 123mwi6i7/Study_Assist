import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Allow access from your local network during development
  allowedDevOrigins: ["192.168.100.10"],

  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;