import type { NextConfig } from "next";

// Set NEXT_BASE_PATH (e.g. "/careers") when deploying under a subpath,
// such as on cPanel alongside an existing site at the domain root.
// Leave unset for local dev and root-domain deploys.
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  // Mirrors basePath into the client bundle so hardcoded fetch() calls
  // (which, unlike <Link>/router, aren't auto-prefixed by basePath) can prepend it.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
