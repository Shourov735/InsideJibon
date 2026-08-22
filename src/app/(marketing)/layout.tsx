import { MarketingHeader } from "@/components/public/marketing-header";
import { MarketingFooter } from "@/components/public/marketing-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <div className="flex-1 pt-16">{children}</div>
      <MarketingFooter />
    </div>
  );
}