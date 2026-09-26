/**
 * Icons — minimal inline SVG icon set.
 *
 * Single-color, stroke-based, sized via className. Avoids the
 * bundle weight of a full icon library and renders crisply on
 * mobile. Add new icons here as needed (keep strokes consistent).
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function withDefaults({ size = 18, strokeWidth = 2, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 15 1.5-4.5L15 9l-1.5 4.5Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M6 6l12 12M6 18 18 6" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M8 5v14l11-7Z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="m4 12 5 5 11-12" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0Z" />
      <path d="M4 4h4v3a3 3 0 0 1-3 3H4Z" />
      <path d="M16 4h4v3a3 3 0 0 1-3 3h-1Z" />
      <path d="M10 12v4h4v-4M8 20h8M10 16h4v4" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg
      {...withDefaults(props)}
      fill="currentColor"
      stroke="none"
    >
      <path d="M12 2c1.5 4-3 5-3 9a3 3 0 0 0 5 2 4 4 0 1 1-7-2c1-4 5-5 5-9z" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="m17 10 4-2v8l-4-2Z" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9Z" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M4 20h16" />
      <rect x="6" y="11" width="3" height="7" />
      <rect x="11" y="6" width="3" height="12" />
      <rect x="16" y="14" width="3" height="4" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 19c0-2 2-3 4-3s2 1 2 3" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.2-.8.2-1.2Z" />
    </svg>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

export function LogInIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M10 17v2a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v2" />
      <path d="M3 12h12M11 8l4 4-4 4" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4Z" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function AwardIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <circle cx="12" cy="9" r="6" />
      <path d="m9 14-2 7 5-3 5 3-2-7" />
    </svg>
  );
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <svg {...withDefaults(props)}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8a4 4 0 0 1 0 8" />
      <path d="M18 5a8 8 0 0 1 0 14" />
    </svg>
  );
}
