import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    // Inlined into client bundles at build time — tells clerk-js where the
    // dedicated auth pages live so component path inference cannot fail
    // on Workers deployments.
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: "/continue",
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: "/continue",
  },
  images: {
    // Clerk profile photos are served from img.clerk.com and rendered
    // through next/image (e.g. the admin user directory avatars).
    remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;