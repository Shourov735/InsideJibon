import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  /**
   * "auto": renders mark on mobile (<640px) and full logo on desktop (>=640px)
   * "full": always renders full horizontal logo
   * "mark": always renders standalone symbol mark
   */
  variant?: "auto" | "full" | "mark";
  showText?: boolean;
  className?: string;
  badge?: string;
  /**
   * Tailwind classes for the badge background + text colours when
   * a non-default (primary-container) badge is required — e.g. parent
   * (rose) or admin (slate). Must include `font-bold` and
   * `uppercase tracking-wider` if you override the look fully.
   */
  badgeClassName?: string;
  priority?: boolean;
}

const sizeConfig = {
  sm: {
    markSize: 32,
    markClass: "h-8 w-8",
    fullHeight: 32,
    fullWidth: 113,
    fullClass: "h-8 w-auto",
    badgeSize: "text-[10px] px-1.5 py-0.5",
  },
  md: {
    markSize: 40,
    markClass: "h-10 w-10",
    fullHeight: 40,
    fullWidth: 141,
    fullClass: "h-10 w-auto",
    badgeSize: "text-xs px-2 py-0.5",
  },
  lg: {
    markSize: 48,
    markClass: "h-12 w-12",
    fullHeight: 48,
    fullWidth: 170,
    fullClass: "h-12 w-auto",
    badgeSize: "text-xs px-2.5 py-1",
  },
};

export function BrandLogo({
  href = "/",
  size = "sm",
  variant = "auto",
  showText = true,
  className = "",
  badge,
  badgeClassName,
  priority = true,
}: BrandLogoProps) {
  const config = sizeConfig[size];
  const badgeClasses =
    badgeClassName ?? "bg-primary-container text-on-primary-container";

  // If showText is explicitly false, force mark variant
  const effectiveVariant = !showText ? "mark" : variant;

  const renderMark = () => (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105",
        config.markClass,
      )}
    >
      <Image
        src="/images/logo-icon.png"
        alt="InsideJibon Logo"
        width={config.markSize}
        height={config.markSize}
        className="h-full w-full object-contain brand-logo-light"
        priority={priority}
      />
      <Image
        src="/images/logo-icon-dark.png"
        alt="InsideJibon Logo"
        width={config.markSize}
        height={config.markSize}
        className="h-full w-full object-contain brand-logo-dark"
        priority={priority}
      />
    </div>
  );

  const renderFull = (displayClass: string = "inline-flex") => (
    <div
      className={cn(
        "relative shrink-0 items-center transition-transform duration-300 group-hover:scale-[1.02]",
        displayClass,
      )}
    >
      <Image
        src="/images/logo.png"
        alt="InsideJibon — Learn · Practice · Grow"
        width={config.fullWidth}
        height={config.fullHeight}
        className={cn(config.fullClass, "object-contain brand-logo-light")}
        priority={priority}
      />
      <Image
        src="/images/logo-dark.png"
        alt="InsideJibon — Learn · Practice · Grow"
        width={config.fullWidth}
        height={config.fullHeight}
        className={cn(config.fullClass, "object-contain brand-logo-dark")}
        priority={priority}
      />
    </div>
  );

  const renderBadge = () =>
    badge ? (
      <span
        className={cn(
          "shrink-0 rounded-full font-bold uppercase tracking-wider whitespace-nowrap",
          config.badgeSize,
          badgeClasses,
        )}
      >
        {badge}
      </span>
    ) : null;

  let logoElement: React.ReactNode;

  if (effectiveVariant === "mark") {
    logoElement = (
      <div className="flex shrink-0 items-center gap-2">
        {renderMark()}
        {renderBadge()}
      </div>
    );
  } else if (effectiveVariant === "full") {
    logoElement = (
      <div className="flex shrink-0 items-center gap-2.5">
        {renderFull("inline-flex")}
        {renderBadge()}
      </div>
    );
  } else {
    // "auto" mode: compact symbol mark on mobile (<640px), full logo on desktop (>=640px)
    logoElement = (
      <>
        <div className="flex shrink-0 items-center gap-2 sm:hidden">
          {renderMark()}
          {renderBadge()}
        </div>
        <div className="hidden shrink-0 items-center gap-2.5 sm:inline-flex">
          {renderFull("inline-flex")}
          {renderBadge()}
        </div>
      </>
    );
  }

  const content = (
    <div
      className={cn(
        "group flex shrink-0 items-center select-none",
        className,
      )}
    >
      {logoElement}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2"
        aria-label="InsideJibon Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}

