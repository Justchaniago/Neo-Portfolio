import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    const section = { type: "query" as const, key: "section", value: "project" };
    return [
      { source: "/", has: [section, { type: "query", key: "project", value: "(?<slug>[a-z0-9-]+)" }],
        destination: "/projects#:slug", permanent: false },
      { source: "/", has: [section], destination: "/projects", permanent: false },
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
