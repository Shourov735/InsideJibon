import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandProvider } from "@/components/shared/command";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();
  return (
    <div data-role="admin" className="flex min-h-dvh flex-col bg-surface">
      <AdminNav user={user} />
      <div className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <CommandProvider role="admin" />
    </div>
  );
}
