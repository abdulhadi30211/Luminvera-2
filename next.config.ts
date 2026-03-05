import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove output: "standalone" for Vercel - it handles this automatically
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure proper handling of src directory
  experimental: {
    // Enable if needed
  },
};

export default nextConfig;
