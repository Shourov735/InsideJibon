import Link from "next/link";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-primary"
          >
            InsideJibon
          </Link>
          <p className="hidden text-sm text-on-surface-variant sm:block">
            শেখা, অনুশীলন, সাফল্য
          </p>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-outline-variant bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-on-surface-variant sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} InsideJibon</span>
          <span>শেখার যাত্রা শুরু হোক আজ</span>
        </div>
      </footer>
    </div>
  );
}