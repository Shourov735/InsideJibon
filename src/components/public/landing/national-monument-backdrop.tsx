/**
 * NationalMonumentBackdrop
 *
 * Vector illustration of the National Martyrs' Memorial (জাতীয় স্মৃতিসৌধ - Jatiyo Sriti Soudho)
 * at Savar, Dhaka, with layered lush foliage, misty horizon, and soaring birds.
 * Gives InsideJibon an authentic, proud Bangladeshi cultural aesthetic.
 */

import React from "react";

interface NationalMonumentBackdropProps {
  className?: string;
}

export function NationalMonumentBackdrop({ className = "" }: NationalMonumentBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 1440 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full opacity-85 dark:opacity-35 transition-opacity duration-300"
      >
        <defs>
          {/* Sky / Mist Gradient */}
          <linearGradient id="monumentSkyMist" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="var(--color-surface-0)" stopOpacity="0" />
            <stop offset="60%" stopColor="var(--color-surface-1)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-surface-2)" stopOpacity="0.9" />
          </linearGradient>

          {/* Monument Wall Shading Gradients */}
          <linearGradient id="pylonLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="pylonRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.25" />
          </linearGradient>

          <linearGradient id="pylonCenter" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.6" />
          </linearGradient>

          {/* Foliage Gradients */}
          <linearGradient id="foliageFar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a7c4bc" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#688f82" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="foliageMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#688f82" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#43685c" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="foliageNear" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4b7264" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2d4a3e" stopOpacity="0.95" />
          </linearGradient>

          {/* Water reflection */}
          <linearGradient id="waterReflect" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Ambient Mist Backdrop */}
        <rect width="1440" height="420" fill="url(#monumentSkyMist)" />

        {/* Soaring Birds (Gentle V-shaped flock across sky) */}
        <g stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.65">
          {/* Bird 1 */}
          <path d="M 610 185 Q 618 178 626 186 Q 634 178 642 185" />
          {/* Bird 2 */}
          <path d="M 648 160 Q 654 154 660 161 Q 666 154 672 160" transform="scale(0.85) translate(120, 20)" />
          {/* Bird 3 */}
          <path d="M 570 200 Q 576 195 582 201 Q 588 195 594 200" transform="scale(0.75) translate(195, 65)" />
          {/* Bird 4 */}
          <path d="M 685 195 Q 692 189 699 196 Q 706 189 713 195" transform="scale(0.9) translate(75, 20)" />
          {/* Bird 5 */}
          <path d="M 725 170 Q 731 165 737 171 Q 743 165 749 170" transform="scale(0.7) translate(310, 70)" />
        </g>

        {/* Distant Tree Line (Hazy Green Horizon) */}
        <path
          d="M0 340 
             Q 60 332 120 338 Q 180 328 240 335 Q 300 326 360 334 
             Q 420 328 480 335 Q 540 330 600 336 Q 660 329 720 334
             Q 780 328 840 335 Q 900 326 960 334 Q 1020 328 1080 336
             Q 1140 326 1200 333 Q 1260 328 1320 336 Q 1380 330 1440 335
             L 1440 420 L 0 420 Z"
          fill="url(#foliageFar)"
        />

        {/* Jatiyo Sriti Soudho (National Martyrs' Memorial) Center Landmark */}
        {/* The memorial has 7 pairs of triangular prism pylons converging at apex (720, 160) */}
        <g id="sriti-soudho" transform="translate(0, 0)">
          {/* Outermost Pair 7 (Widest, lowest) */}
          <polygon points="720,285 580,365 720,365" fill="url(#pylonLeft)" opacity="0.6" />
          <polygon points="720,285 860,365 720,365" fill="url(#pylonRight)" opacity="0.6" />

          {/* Pair 6 */}
          <polygon points="720,265 605,365 720,365" fill="url(#pylonLeft)" opacity="0.7" />
          <polygon points="720,265 835,365 720,365" fill="url(#pylonRight)" opacity="0.7" />

          {/* Pair 5 */}
          <polygon points="720,245 630,365 720,365" fill="url(#pylonLeft)" opacity="0.75" />
          <polygon points="720,245 810,365 720,365" fill="url(#pylonRight)" opacity="0.75" />

          {/* Pair 4 */}
          <polygon points="720,225 655,365 720,365" fill="url(#pylonLeft)" opacity="0.8" />
          <polygon points="720,225 785,365 720,365" fill="url(#pylonRight)" opacity="0.8" />

          {/* Pair 3 */}
          <polygon points="720,205 675,365 720,365" fill="url(#pylonLeft)" opacity="0.85" />
          <polygon points="720,205 765,365 720,365" fill="url(#pylonRight)" opacity="0.85" />

          {/* Pair 2 */}
          <polygon points="720,185 695,365 720,365" fill="url(#pylonLeft)" opacity="0.9" />
          <polygon points="720,185 745,365 720,365" fill="url(#pylonRight)" opacity="0.9" />

          {/* Center Tallest Spire 1 (Apex at 720, 160) */}
          <polygon points="720,158 708,365 720,365" fill="url(#pylonCenter)" />
          <polygon points="720,158 732,365 720,365" fill="url(#pylonRight)" />

          {/* Memorial Reflection in Pool */}
          <polygon points="720,365 712,410 720,410" fill="url(#waterReflect)" opacity="0.4" />
          <polygon points="720,365 728,410 720,410" fill="url(#waterReflect)" opacity="0.4" />
        </g>

        {/* Mid-ground Layered Canopy Left */}
        <path
          d="M -20 365 
             Q 25 320 70 345 Q 115 315 160 340 Q 210 325 260 350 
             Q 310 330 360 355 Q 410 338 460 360 Q 510 348 555 365 
             L 555 420 L -20 420 Z"
          fill="url(#foliageMid)"
        />

        {/* Mid-ground Layered Canopy Right */}
        <path
          d="M 885 365 
             Q 930 345 980 358 Q 1030 335 1080 352 Q 1130 325 1180 345 
             Q 1230 318 1280 342 Q 1330 328 1380 350 Q 1420 335 1460 365 
             L 1460 420 L 885 420 Z"
          fill="url(#foliageMid)"
        />

        {/* Foreground Lush Trees and Shrubbery Left Edge */}
        <path
          d="M -10 375 
             C 15 330 65 330 90 365 
             C 120 335 170 340 195 375 
             C 230 350 280 355 310 380 
             L 310 420 L -10 420 Z"
          fill="url(#foliageNear)"
          opacity="0.8"
        />

        {/* Foreground Lush Trees and Shrubbery Right Edge */}
        <path
          d="M 1130 380 
             C 1160 355 1210 350 1245 375 
             C 1270 340 1320 335 1350 365 
             C 1375 330 1425 330 1450 375 
             L 1450 420 L 1130 420 Z"
          fill="url(#foliageNear)"
          opacity="0.8"
        />

        {/* Soft Ground Blend to match page background seamlessly */}
        <rect
          x="0"
          y="385"
          width="1440"
          height="35"
          fill="url(#monumentSkyMist)"
        />
      </svg>
    </div>
  );
}
