import { cookies } from "next/headers";
import { MarketingHeader } from "@/components/public/marketing-header";
import { MarketingFooter } from "@/components/public/marketing-footer";
import { getCurrentUser } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Resolves the signed-in role (if any) so the header can link each role
  // to its own workspace. Anonymous visitors skip token verification and DB lookup.
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get("__session")?.value);
  const user = hasSession ? await getCurrentUser() : null;

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader role={user?.role ?? null} />
      <div className="flex-1">{children}</div>
      <MarketingFooter role={user?.role ?? null} />
    </div>
  );
}