import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Plus_Jakarta_Sans, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { getStoredThemePreference, resolveThemeFromPreference } from "@/lib/theme";
import { ToastViewport } from "@/components/shared/feedback/toast-viewport";
import { PwaBoot } from "@/components/shared/pwa-boot";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

// R1 §3 — Hind Siliguri is the Bangla-first display + body font.
// We keep Inter and Plus Jakarta Sans for any legacy utilities that
// still bind to --font-jakarta / --font-inter.
const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["latin", "bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://insidejibon.com"),
  title: {
    default: "InsideJibon | Science, ICT & Academic Learning Platform",
    template: "%s | InsideJibon",
  },
  description:
    "InsideJibon — structured academic learning, exams, assignments and progress tracking for Physics, Chemistry, Biology, ICT & Mathematics.",
  keywords: [
    "InsideJibon",
    "Tanvir Hasan Jibon",
    "HSC Physics",
    "HSC Chemistry",
    "HSC Biology",
    "HSC ICT",
    "HSC Higher Math",
    "SSC Science",
    "Admission Preparation Bangladesh",
    "ইনসাইড জীবন",
    "তানভীর হাসান জীবন",
    "এইচএসসি পদার্থবিজ্ঞান",
    "রসায়ন",
    "জীববিজ্ঞান",
    "উচ্চতর গণিত",
    "আইসিটি",
  ],
  authors: [{ name: "Tanvir Hasan Jibon", url: "https://insidejibon.com/#instructor" }],
  creator: "Tanvir Hasan Jibon",
  publisher: "InsideJibon",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://insidejibon.com",
    languages: {
      "bn-BD": "https://insidejibon.com",
      "en-US": "https://insidejibon.com",
      "x-default": "https://insidejibon.com",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "InsideJibon | Science, ICT & Academic Learning Platform",
    description:
      "Structured academic learning, exams and assignments for Physics, Chemistry, Biology, ICT & Mathematics.",
    url: "https://insidejibon.com",
    siteName: "InsideJibon",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "InsideJibon Platform — Academic Excellence",
      },
    ],
    locale: "bn_BD",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InsideJibon | Science, ICT & Academic Learning Platform",
    description:
      "Structured academic learning, exams and assignments for Physics, Chemistry, Biology, ICT & Mathematics.",
    images: ["/images/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, themePreference] = await Promise.all([
    getLocale(),
    getStoredThemePreference(),
  ]);
  const resolvedTheme = resolveThemeFromPreference(themePreference);

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/continue"
      signUpFallbackRedirectUrl="/continue"
    >
      <html
        lang={locale}
        data-theme={resolvedTheme ?? undefined}
        // System preference is honored via tokens.css media query when
        // data-theme is unset. We attach an inline script that flips
        // the attribute before paint if the cookie is missing —
        // matching the cookie value on subsequent loads.
        suppressHydrationWarning
        className={`${hind.variable} ${jakartaSans.variable} ${inter.variable} h-full antialiased`}
      >
        <head>
          <script
            // Inline pre-paint theme resolver. Reads the cookie and
            // applies `data-theme` so the dark-mode tokens apply on
            // first paint. Idempotent — the server already set it if
            // a cookie was present.
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var m=document.cookie.match(/(?:^|; )ij_theme=([^;]+)/);var v=m?m[1]:'system';if(v==='dark'||v==='light'){document.documentElement.setAttribute('data-theme',v);}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
            }}
          />
        </head>
        <body className="min-h-full flex flex-col bg-surface text-on-surface font-sans">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-primary focus:shadow-lg"
          >
            Skip to main content
          </a>
          <LanguageProvider locale={locale}>
            <ToastViewport />
            {/* R9 — service worker, install banner, offline pill */}
            <PwaBoot />
            {children}
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
