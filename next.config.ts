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
            // camera/microphone allowed on same-origin for R9 proctoring
            // (webcam). Geolocation and FLoC/Topics remain off.
            value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
          },
          // Strict-Transport-Security — 2 years, include subdomains,
          // preload-ready. Applied on every response; safe once TLS is
          // in place (Cloudflare Universal SSL on workers.dev domains).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // CSP — REPORT-ONLY during R0. The strict policy below will be
          // promoted to an enforced `Content-Security-Policy` after R1
          // lands (when we have real insight into script/style sources).
          //
          // Notes:
          // - Clerk injects its hosted sign-in/up pages via the `__session`
          //   cookie flow; we must allow `https://*.clerk.accounts.dev` for
          //   frames and connect, and Clerk telemetry script via the same
          //   origin. Clerk also requires `https://img.clerk.com` for
          //   avatars (covered by `img-src https:`).
          // - Tailwind v4 + Next 16 emit inline styles in some hot paths,
          //   so `style-src 'unsafe-inline'` is intentionally permitted.
          //   Scripts are still hashed by Next.js at build time; we keep
          //   `'unsafe-inline'` for scripts ONLY because Clerk + Next dev
          //   tooling rely on it. Will tighten in R1.
          // - R3 (live class) and R2 (YouTube embeds) require the
          //   YouTube IFrame API; we pre-allow it here so R1 / R2
          //   re-headers don't churn.
          // - Cloudflare Turnstile widget loads from
          //   `https://challenges.cloudflare.com`; also pre-allowed.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.youtube.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' blob: https://*.r2.dev",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.neon.tech https://api.cloudflare.com https://*.r2.dev",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com",
              "worker-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "report-uri /api/csp-report",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;