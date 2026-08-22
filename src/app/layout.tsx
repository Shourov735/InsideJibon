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
    default: "InsideJibon",
    template: "%s | InsideJibon",
  },
  description:
    "InsideJibon — an educational platform for courses, exams, assignments and student progress tracking.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <ClerkProvider>
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