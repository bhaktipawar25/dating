"use client";

import React from "react";
import Image from "next/image";

interface Date2LogoProps {
  /** Pixel height of the rendered wordmark image. */
  height?: number;
  /** Whether to wrap the official wordmark inside the Midnight Indigo badge card (matching Flutter's Date2LogoWidget). */
  showContainer?: boolean;
  /** Render flat without outer box shadow when showContainer is true. */
  flat?: boolean;
  className?: string;
}

/**
 * Official Date² wordmark component mirroring Flutter's Date2LogoWidget
 * using the brand PNG asset extracted from assets/images/date2_logo.png.
 */
export function Date2Logo({
  height = 44,
  showContainer = false,
  flat = false,
  className = "",
}: Date2LogoProps) {
  const imgWidth = Math.round(height * (711 / 281));

  if (!showContainer) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <span className="inline-flex items-center justify-center rounded-xl bg-date2-midnight px-3 py-1.5 shadow-indigoSoft">
          <Image
            src="/images/date2_logo.png"
            alt="Date²"
            width={imgWidth}
            height={height}
            priority
            className="h-auto w-auto object-contain"
            style={{ height }}
          />
        </span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-[20px] bg-date2-midnight px-6 py-4 ${
        flat ? "border border-date2-deepIndigo/30" : "shadow-indigoCard"
      } ${className}`}
    >
      <Image
        src="/images/date2_logo.png"
        alt="Date²"
        width={imgWidth}
        height={height}
        priority
        className="h-auto w-auto object-contain"
        style={{ height }}
      />
    </div>
  );
}
