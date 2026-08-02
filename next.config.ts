import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  // Offline/PWA enabled for production builds (next build --webpack regenerates sw.js);
  // disabled in dev to avoid stale service-worker caching while iterating.
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // Keep next-pwa's own default caching rules (static assets, pages, …) and ADD ours (below) on
  // top — without this flag, providing any runtimeCaching array REPLACES the defaults entirely.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Bypass the service worker entirely for the local print-agent (loopback — a different
        // origin/scheme than this app, http vs https). The generated workbox SW intercepting
        // this fetch was breaking it with a CORS error (confirmed via DevTools: the failing
        // /health and /printers requests showed initiator "workbox-…" instead of the page
        // script itself) even though the exact same fetch succeeds when the SW isn't in the
        // way — see lib/library/print-agent.ts. NetworkOnly here means "don't touch this
        // request at all, just pass it straight to the network," which matches how the print
        // agent's own CORS headers (reflects any Origin) already expect to be called.
        urlPattern: /^http:\/\/127\.0\.0\.1(:\d+)?\//,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  ...(process.env.SKIP_STANDALONE !== 'true' && { output: 'standalone' as const }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "libraryapi.codevertexafrica.com",
      },
      {
        protocol: "https",
        hostname: "accounts.codevertexafrica.com",
      },
      {
        protocol: "https",
        hostname: "sso.codevertexafrica.com",
      },
    ],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
