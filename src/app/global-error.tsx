"use client";

/**
 * Root error boundary for client-side rendering errors. Without this,
 * an uncaught hydration/render exception leaves a fully blank page.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf9f5",
          color: "#1c1b19",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong / কিছু একটা ভুল হয়েছে
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#57534e", marginBottom: "1rem" }}>
            An unexpected error occurred. Please try again. / অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.7rem", color: "#a8a29e", marginBottom: "1rem" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#2f6f4f",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.6rem 1.25rem",
              fontWeight: 600,
              cursor: "pointer",
              marginRight: "0.5rem",
            }}
          >
            Try again / আবার চেষ্টা করুন
          </button>
          {/* Plain anchor intentionally: global-error renders outside the
              app router context where next/link cannot be relied on. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ fontSize: "0.875rem", color: "#2f6f4f", fontWeight: 600 }}>
            Go home / হোমপেজে যান
          </a>
        </div>
      </body>
    </html>
  );
}
