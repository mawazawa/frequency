import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Fix for R3F/Drei createRoot double-mount issue in Dev
  reactCompiler: true,
};

export default nextConfig;