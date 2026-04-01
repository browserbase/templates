import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@browserbasehq/stagehand"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
