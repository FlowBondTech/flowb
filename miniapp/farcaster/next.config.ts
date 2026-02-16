import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  skipTrailingSlashRedirect: true,
  distDir: ".next",
};

export default nextConfig;
