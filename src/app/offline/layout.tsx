import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline | InsideJibon",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflineLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
