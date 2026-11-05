import type { NextConfig } from "next";
import { getFrameOrigins } from "./src/lib/shops";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/play",
        headers: [
          { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${getFrameOrigins().join(" ")}` },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/embed.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
