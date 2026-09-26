import Link from "next/link";
import type { Metadata } from "next";

import { resolveCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { Container } from "@/components/shared/ui/container";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import {
  ArrowRightIcon,
  HomeIcon,
  LogInIcon,
} from "@/components/shared/ui/icons";

export const metadata: Metadata = {
  title: "Access Restricted (403) | InsideJibon",
  robots: { index: false, follow: false },
};

interface UnauthorizedPageProps {
  searchParams: Promise<{
    required?: string;
    current?: string;
  }>;
}

export default async function UnauthorizedPage({
  searchParams,
}: UnauthorizedPageProps) {
  const { user } = await resolveCurrentUser();
  const params = await searchParams;

  const currentRole = user?.role ?? params.current ?? "guest";
  const requiredRoles = params.required ? params.required.split(",") : ["admin"];

  const roleLabels: Record<string, { en: string; bn: string }> = {
    student: { en: "Student", bn: "শিক্ষার্থী" },
    teacher: { en: "Educator / Teacher", bn: "শিক্ষক" },
    admin: { en: "Administrator", bn: "অ্যাডমিনিস্ট্রেটর" },
    parent: { en: "Parent", bn: "অভিভাবক" },
    guest: { en: "Guest", bn: "অতিথি" },
  };

  const currentLabel = roleLabels[currentRole] ?? { en: currentRole, bn: currentRole };
  const requiredLabel = requiredRoles
    .map((r) => roleLabels[r]?.en ?? r)
    .join(" or ");
  const requiredLabelBn = requiredRoles
    .map((r) => roleLabels[r]?.bn ?? r)
    .join(" অথবা ");

  const userDashboard = user ? dashboardPathForRole(user.role) : "/";

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-surface p-4 sm:p-6">
      <Container size="sm" className="w-full">
        <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 p-6 shadow-academic sm:p-10 text-center">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge tone="warning" size="sm" className="gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              403 FORBIDDEN · প্রবেশাধিকার সীমাবদ্ধ
            </Badge>
          </div>

          {/* Heading */}
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Access Restricted
          </h1>
          <p className="mt-1 text-sm font-semibold text-primary">
            প্রবেশাধিকার সংরক্ষিত
          </p>

          {/* Detailed explanation */}
          <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-1 p-4 sm:p-5 text-left text-xs sm:text-sm space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-outline-variant pb-3">
              <span className="text-ink-500 uppercase tracking-wider text-[11px] font-semibold">
                Your Account / আপনার অ্যাকাউন্ট
              </span>
              <span className="font-semibold text-ink-900 text-right">
                {user ? `${user.name || user.email} (${currentLabel.en})` : currentLabel.en}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2 border-b border-outline-variant pb-3">
              <span className="text-ink-500 uppercase tracking-wider text-[11px] font-semibold">
                Your Role / বর্তমান রোল
              </span>
              <span className="font-bold text-ink-900 capitalize">
                {currentLabel.en} ({currentLabel.bn})
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-ink-500 uppercase tracking-wider text-[11px] font-semibold">
                Required Role / প্রয়োজনীয় রোল
              </span>
              <span className="font-bold text-[color:var(--color-warning)]">
                {requiredLabel} ({requiredLabelBn})
              </span>
            </div>
          </div>

          <p className="mt-5 text-xs text-ink-500 leading-relaxed sm:text-sm">
            You do not have administrative privileges to view this section. To prevent unauthorized changes, this area is restricted to verified {requiredLabel} accounts.
            <br className="hidden sm:inline" />
            <span className="mt-1 block text-ink-300 text-xs">
              এই সেকশনে প্রবেশের জন্য আপনার অ্যাকাউন্টে প্রয়োজনীয় অনুমতি নেই।
            </span>
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {user ? (
              <Link href={userDashboard} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  trailingIcon={<ArrowRightIcon size={16} />}
                >
                  Go to {currentLabel.en} Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/sign-in" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  leadingIcon={<LogInIcon size={16} />}
                >
                  Sign In
                </Button>
              </Link>
            )}

            <Link href="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center"
                leadingIcon={<HomeIcon size={16} />}
              >
                Home / হোম
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
