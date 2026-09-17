import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#003555",
};

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
  const locale = await getLocale();
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/continue"
      signUpFallbackRedirectUrl="/continue"
    >
      <html
        lang={locale}
        className={`${jakartaSans.variable} ${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-surface text-on-surface font-sans">
          <LanguageProvider locale={locale}>{children}</LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}