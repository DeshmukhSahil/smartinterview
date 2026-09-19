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
  // The careers page moved from /apply to the site root, and the candidate
  // portal from the root to /portal. Old bookmarks and already-sent invitation
  // emails still point at the previous paths, so keep them working. Order
  // matters: the literal /interview/create|preview must precede /interview/:id.
  // /interview/:id/:token (the emailed sign-in link) is a real page, not a
  // redirect; only its literal "feedback" form is legacy.
  async redirects() {
    return [
      { source: "/apply", destination: "/", permanent: false },
      { source: "/profile", destination: "/portal/profile", permanent: false },
      { source: "/allinterviews", destination: "/portal/allinterviews", permanent: false },
      { source: "/interview", destination: "/portal/interview", permanent: false },
      { source: "/interview/create", destination: "/portal/interview/create", permanent: false },
      { source: "/interview/preview", destination: "/portal/interview/preview", permanent: false },
      { source: "/interview/:id/feedback", destination: "/portal/interview/:id/feedback", permanent: false },
      { source: "/interview/:id", destination: "/portal/interview/:id", permanent: false },
    ];
  },
};

export default nextConfig;
