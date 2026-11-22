import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      { source: "/projects", destination: "/?section=project", permanent: false },
      { source: "/studies/work-index/:path*", destination: "/?section=project", permanent: false },
    ];
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  reactCompiler: true,
  devIndicators: false,
  allowedDevOrigins: ["*.trycloudflare.com", "trycloudflare.com"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
