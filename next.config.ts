import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // The dev badge sits on top of the phone tab bar.
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No other site can show the app inside a frame (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          // The browser must not guess content types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera for scanning codes, only from this site; no microphone or location.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          // Behind HTTPS (Coolify), browsers keep using HTTPS for a year.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
