import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // The dev badge sits on top of the phone tab bar.
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
