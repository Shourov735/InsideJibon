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
    // Clerk profile photos, YouTube oEmbed thumbnails, and R2 CDN public assets
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "cdn.insidejibon.com.bd" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
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
          // CSP — enforced starting R1. The policy was promoted from
          // `Content-Security-Policy-Report-Only` after R0 gave us
          // enough signal to trust the allowed origins cover Clerk,
          // YouTube (R2), Cloudflare Turnstile (R3 live class), and
          // Cloudflare R2 (R3 media). Violations are reported to
          // /api/csp-report; if you change CSP origins, verify the
          // report endpoint is still reachable or violations will be
          // silently dropped.
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
          //   tooling rely on it. Will tighten in a follow-up.
          // - R3 (live class) and R2 (YouTube embeds) require the
          //   YouTube IFrame API; we pre-allow it here so R1 / R2
          //   re-headers don't churn.
          // - Cloudflare Turnstile widget loads from
          //   `https://challenges.cloudflare.com`; also pre-allowed.
          // - R9 Web Push: outbound dispatches target the device-
          //   specific subscription endpoint, which is one of Mozilla
          //   (push.services.mozilla.com), Apple (push.apple.com /
          //   *.push.apple.com) or Google (fcm.googleapis.com). We
          //   allowlist the hostnames so service-worker `fetch()`
          //   calls to those origins are not blocked by CSP.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.youtube.com https://www.youtube.com/iframe_api https://s.ytimg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' blob: https://*.r2.dev https://cdn.insidejibon.com.bd",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.neon.tech https://api.cloudflare.com https://*.r2.dev https://cdn.insidejibon.com.bd https://*.push.apple.com https://fcm.googleapis.com https://updates.push.services.mozilla.com https://www.youtube.com",
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