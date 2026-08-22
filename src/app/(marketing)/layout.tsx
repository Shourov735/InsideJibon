import { MarketingHeader } from "@/components/public/marketing-header";
import { MarketingFooter } from "@/components/public/marketing-footer";
import { getCurrentUser } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Resolves the signed-in role (if any) so the header can link each role
  // to its own workspace. Anonymous visitors simply get null.
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader role={user?.role ?? null} />
      <div className="flex-1 pt-16">{children}</div>
      <MarketingFooter role={user?.role ?? null} />
    </div>
  );
}