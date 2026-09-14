import type { NextConfig } from "next";

// Set NEXT_BASE_PATH (e.g. "/careers") when deploying under a subpath,
// such as on cPanel alongside an existing site at the domain root.
// Leave unset for local dev and root-domain deploys.
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
