import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import "./globals.css";

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
  title: {
    default: "InsideJibon | Academic Excellence",
    template: "%s | InsideJibon",
  },
  description:
    "InsideJibon — structured academic learning, exams, assignments and progress tracking for Physics, Chemistry, Biology, ICT & Mathematics.",
  icons: {
    icon: "/images/logo-icon.jpg",
    shortcut: "/images/logo-icon.jpg",
    apple: "/images/logo-icon.jpg",
  },
  openGraph: {
    title: "InsideJibon | Academic Excellence",
    description: "Structured academic learning, exams and assignments for Physics, Chemistry, Biology, ICT & Mathematics.",
    url: "https://insidejibon.com",
    siteName: "InsideJibon",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "InsideJibon Platform Banner",
      },
    ],
    locale: "bn_BD",
    type: "website",
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