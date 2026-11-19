"use client";

import React from "react";

interface AuthMonumentSilhouetteProps {
  className?: string;
}

export function AuthMonumentSilhouette({ className = "" }: AuthMonumentSilhouetteProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 600 120"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full opacity-80 dark:opacity-40"
      >
        <defs>
          {/* Subtle gradient for distant cityscape buildings */}
          <linearGradient id="skylineFar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C9DCF2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#DCE9F8" stopOpacity="0.8" />
          </linearGradient>

          {/* Monument Spire Gradient */}
          <linearGradient id="authMonumentCenter" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9ABFE0" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#BBD5EE" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#8EAFD2" stopOpacity="0.75" />
          </linearGradient>

          {/* Foliage and foreground hills */}
          <linearGradient id="authFoliage" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B3CFEC" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#CFE2F6" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Far Background: Soft Dhaka Architectural Silhouettes (Left) */}
        <g fill="url(#skylineFar)">
          {/* Curzon Hall Domes & Towers Silhouette Left */}
          <path d="M 30 120 L 30 92 Q 40 82 50 92 L 50 120 Z" />
          <path d="M 52 120 L 52 85 Q 65 72 78 85 L 78 120 Z" />
          <path d="M 80 120 L 80 96 L 95 96 L 95 120 Z" />
          <path d="M 100 120 L 100 88 Q 110 78 120 88 L 120 120 Z" />
          <path d="M 125 120 L 125 78 L 132 72 L 139 78 L 139 120 Z" />
          {/* Shahid Minar Pillars Left of Monument */}
          <path d="M 155 120 L 155 68 L 160 68 L 160 120 Z" />
          <path d="M 163 120 L 163 56 L 168 56 L 168 120 Z" />
          <path d="M 171 120 L 171 68 L 176 68 L 176 120 Z" />
        </g>

        {/* Far Background: Historic Heritage & Campus Silhouette (Right) */}
        <g fill="url(#skylineFar)">
          {/* Historic Ahsan Manzil / Lalbagh Fort Domes Right */}
          <path d="M 430 120 L 430 84 Q 445 70 460 84 L 460 120 Z" />
          <path d="M 465 120 L 465 90 L 485 90 L 485 120 Z" />
          <path d="M 490 120 L 490 82 Q 505 68 520 82 L 520 120 Z" />
          <path d="M 525 120 L 525 75 L 532 68 L 539 75 L 539 120 Z" />
          <path d="M 545 120 L 545 88 Q 555 78 565 88 L 565 120 Z" />
        </g>

        {/* Center: Jatiyo Sriti Soudho (National Martyrs' Memorial) */}
        {/* Apex at (300, 24), base from 230 to 370 */}
        <g id="auth-sriti-soudho">
          {/* Outermost Tier 4 */}
          <polygon points="300,65 240,118 360,118" fill="#C5DAF0" opacity="0.6" />
          {/* Tier 3 */}
          <polygon points="300,50 258,118 342,118" fill="#B2CEE8" opacity="0.75" />
          {/* Tier 2 */}
          <polygon points="300,36 274,118 326,118" fill="#9FC3E4" opacity="0.85" />
          {/* Center Main Pylon Tier 1 */}
          <polygon points="300,20 286,118 300,118" fill="url(#authMonumentCenter)" />
          <polygon points="300,20 314,118 300,118" fill="#88AED4" />
        </g>

        {/* Foreground Layered Lush Foliage (Trees flanking the memorial) */}
        <g fill="url(#authFoliage)">
          {/* Trees Left */}
          <path d="M 0 120 Q 25 95 60 102 Q 105 88 150 100 Q 195 90 235 108 Q 260 115 270 120 Z" />
          {/* Trees Right */}
          <path d="M 330 120 Q 345 112 375 106 Q 415 88 460 98 Q 510 88 550 104 Q 580 98 600 120 Z" />
        </g>

        {/* Base blend gradient into bottom of card */}
        <rect x="0" y="105" width="600" height="15" fill="#FAF8F5" opacity="0.8" />
      </svg>
    </div>
  );
}
