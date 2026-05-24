import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // This allows the build to complete even if TypeScript finds errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Optional: This also ignores ESLint errors during build if needed
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;