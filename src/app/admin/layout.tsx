import { requireAdmin } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AdminNav user={admin} />
      {children}
    </div>
  );
}