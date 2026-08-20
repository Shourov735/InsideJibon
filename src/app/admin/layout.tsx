import { requireAdmin } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}