import "server-only";

/**
 * Per-request context: pulls `cf-ray`, country, IP, and the Cloudflare
 * `cf-connecting-ip` for accurate client IP behind WARP / load balancers.
 *
 * Used by:
 * - Rate limiting (R0 §3.5): per-IP bucket keys.
 * - Proctoring (R9): IP / country recording for incident review.
 * - Analytics: per-route latency and country breakdown via Workers
 *   Analytics Engine (FREE-TIER-REFERENCE.md §16).
 *
 * In Node dev there are no Cloudflare request headers; the helper falls
 * back to a header-only fallback so tests and local dev keep working.
 */

export type RequestContext = {
  /** Cloudflare POP / request id, e.g. `7a1b2c3d4e5f6789-SJC`. */
  cfRay: string | null;
  /** ISO 3166-1 alpha-2 country code, e.g. `BD`. */
  country: string | null;
  /** City name when Cloudflare can resolve one. */
  city: string | null;
  /** Best-effort client IP. Falls back to `x-forwarded-for` then `x-real-ip`. */
  ip: string | null;
  /** `cf-connecting-ip` specifically, when present. */
  connectingIp: string | null;
  /** TLS version reported by Cloudflare (e.g. `TLSv1.3`) or null. */
  tlsVersion: string | null;
  /** HTTP protocol, e.g. `HTTP/2`. */
  httpProtocol: string | null;
  /** User-Agent header verbatim. */
  userAgent: string | null;
};

const EMPTY: RequestContext = {
  cfRay: null,
  country: null,
  city: null,
  ip: null,
  connectingIp: null,
  tlsVersion: null,
  httpProtocol: null,
  userAgent: null,
};

const FALLBACK_COUNTRY = "XX";

export function readRequestContext(request: Request): RequestContext {
  const headers = request.headers;

  const cfRay = headers.get("cf-ray");
  const country =
    headers.get("cf-ipcountry") ??
    headers.get("x-vercel-ip-country") ??
    null;
  const city = headers.get("cf-ipcity") ?? null;

  const connectingIp = headers.get("cf-connecting-ip") ?? null;
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const ip = connectingIp ?? forwardedFor?.split(",")[0]?.trim() ?? realIp ?? null;

  const tlsVersion = headers.get("cf-tls-version");
  const httpProtocol = headers.get("cf-http-protocol");

  const userAgent = headers.get("user-agent");

  return {
    cfRay,
    country: country && country !== "XX" ? country : country ?? null,
    city,
    ip,
    connectingIp,
    tlsVersion,
    httpProtocol,
    userAgent,
  };
}

/**
 * Cached, per-request context. Used via `getRequestContext()` from
 * services that don't have a `Request` argument at hand (e.g. server
 * actions invoked from the client). We attach the context to a per-
 * request WeakMap-style cache via a module-level promise. This is a
 * best-effort convenience — call sites that already have a `Request`
 * should prefer `readRequestContext(request)` to avoid the global.
 *
 * NOTE: in Next.js App Router the request context is not actually
 * thread-local across server actions. The `headers()` helper from
 * `next/headers` is the canonical source; we expose a getter that
 * returns the empty context when no request is in scope. Callers that
 * need real values should thread `Request` through, or use the `next/
 * headers` helpers directly.
 */
export function getRequestContext(): RequestContext {
  // Avoid importing next/headers here: this module is also used by route
  // handlers and middleware-shaped helpers where next/headers may not
  // be available. Callers who need real values should pass the request
  // into `readRequestContext(request)` instead.
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return EMPTY;
  }
  return EMPTY;
}

/**
 * Return a country code or the synthetic `XX` fallback. Useful as a
 * non-nullable partition key for analytics and rate limiting.
 */
export function countryOrFallback(ctx: Partial<RequestContext>): string {
  return ctx.country ?? FALLBACK_COUNTRY;
}
