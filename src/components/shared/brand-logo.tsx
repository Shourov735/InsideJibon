import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  badge?: string;
}

const sizeConfig = {
  sm: {
    iconSize: 32,
    iconClass: "h-8 w-8",
    textSize: "text-lg",
    badgeSize: "text-[10px] px-1.5 py-0.5",
  },
  md: {
    iconSize: 40,
    iconClass: "h-10 w-10",
    textSize: "text-xl",
    badgeSize: "text-xs px-2 py-0.5",
  },
  lg: {
    iconSize: 48,
    iconClass: "h-12 w-12",
    textSize: "text-2xl",
    badgeSize: "text-xs px-2.5 py-1",
  },
};

export function BrandLogo({
  href = "/",
  size = "sm",
  showText = true,
  className = "",
  badge,
}: BrandLogoProps) {
  const config = sizeConfig[size];

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      <div className={`relative ${config.iconClass} rounded-xl overflow-hidden shadow-sm ring-1 ring-primary/20 bg-primary/10 shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <Image
          src="/images/logo-icon.jpg"
          alt="InsideJibon Logo"
          width={config.iconSize}
          height={config.iconSize}
          className="h-full w-full object-cover"
          priority
        />
      </div>

      {showText && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`font-display ${config.textSize} font-bold tracking-tight text-primary transition-colors group-hover:text-primary-container`}>
            Inside<span className="text-primary-container">Jibon</span>
          </span>
          {badge && (
            <span className={`ml-1 rounded-full bg-primary-container font-bold text-on-primary-container uppercase tracking-wider ${config.badgeSize}`}>
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
